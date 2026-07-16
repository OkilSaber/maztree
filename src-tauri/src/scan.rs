use rayon::prelude::*;
use serde::Serialize;
use std::os::unix::fs::MetadataExt;
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::Emitter;

#[derive(Serialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub children: Vec<FileNode>,
}

fn alloc_size(meta: &std::fs::Metadata) -> u64 {
    // Real allocated size on disk (like WizTree's "Size"), not the logical/apparent length.
    meta.blocks() * 512
}

pub fn scan_dir(path: &Path, dev: u64, counter: &AtomicU64, cancelled: &AtomicBool) -> FileNode {
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_string_lossy().into_owned());

    // Bail out early (without reading this directory) once cancellation is
    // requested, so an abort propagates in roughly one directory's worth of
    // latency instead of waiting for the whole subtree to finish.
    if cancelled.load(Ordering::Relaxed) {
        return FileNode {
            name,
            path: path.to_string_lossy().into_owned(),
            size: 0,
            is_dir: true,
            children: Vec::new(),
        };
    }

    let entries: Vec<std::fs::DirEntry> = match std::fs::read_dir(path) {
        Ok(rd) => rd.filter_map(|e| e.ok()).collect(),
        Err(_) => Vec::new(),
    };

    // Stat files/symlinks inline (cheap, no point forking a rayon task per
    // leaf) and only fan out in parallel over subdirectories, where the
    // concurrent I/O actually pays off. Spawning a task per *file* here was
    // the main reason large trees crawled: millions of near-instant leaf
    // stats each paid full task-scheduling overhead.
    let mut leaves: Vec<FileNode> = Vec::new();
    let mut subdirs: Vec<std::path::PathBuf> = Vec::new();

    for entry in &entries {
        if cancelled.load(Ordering::Relaxed) {
            break;
        }
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let entry_path = entry.path();

        if meta.file_type().is_symlink() {
            counter.fetch_add(1, Ordering::Relaxed);
            leaves.push(FileNode {
                name: entry.file_name().to_string_lossy().into_owned(),
                path: entry_path.to_string_lossy().into_owned(),
                size: alloc_size(&meta),
                is_dir: false,
                children: Vec::new(),
            });
            continue;
        }

        if meta.is_dir() {
            if meta.dev() != dev {
                // Don't cross into other mounted filesystems.
                continue;
            }
            subdirs.push(entry_path);
            continue;
        }

        counter.fetch_add(1, Ordering::Relaxed);
        leaves.push(FileNode {
            name: entry.file_name().to_string_lossy().into_owned(),
            path: entry_path.to_string_lossy().into_owned(),
            size: alloc_size(&meta),
            is_dir: false,
            children: Vec::new(),
        });
    }

    let mut children: Vec<FileNode> = subdirs
        .into_par_iter()
        .map(|p| scan_dir(&p, dev, counter, cancelled))
        .collect();
    children.extend(leaves);

    children.sort_by(|a, b| b.size.cmp(&a.size));
    let total: u64 = children.iter().map(|c| c.size).sum();

    FileNode {
        name,
        path: path.to_string_lossy().into_owned(),
        size: total,
        is_dir: true,
        children,
    }
}

pub struct ScanState(pub Arc<AtomicBool>);

impl Default for ScanState {
    fn default() -> Self {
        Self(Arc::new(AtomicBool::new(false)))
    }
}

#[tauri::command]
pub async fn scan_path(
    path: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, ScanState>,
) -> Result<FileNode, String> {
    let root = std::path::PathBuf::from(&path);
    let dev = std::fs::metadata(&root).map_err(|e| e.to_string())?.dev();

    let cancelled = state.0.clone();
    cancelled.store(false, Ordering::Relaxed);

    let counter = Arc::new(AtomicU64::new(0));
    let done = Arc::new(AtomicBool::new(false));

    {
        let counter = counter.clone();
        let done = done.clone();
        let app = app.clone();
        std::thread::spawn(move || {
            while !done.load(Ordering::Relaxed) {
                let _ = app.emit("scan-progress", counter.load(Ordering::Relaxed));
                std::thread::sleep(Duration::from_millis(150));
            }
        });
    }

    let counter2 = counter.clone();
    let cancelled2 = cancelled.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        scan_dir(&root, dev, &counter2, &cancelled2)
    })
    .await
    .map_err(|e| e.to_string())?;

    done.store(true, Ordering::Relaxed);
    let _ = app.emit("scan-progress", counter.load(Ordering::Relaxed));
    let _ = app.emit("scan-done", ());

    if cancelled.load(Ordering::Relaxed) {
        return Err("cancelled".to_string());
    }

    Ok(result)
}

#[tauri::command]
pub fn cancel_scan(state: tauri::State<'_, ScanState>) {
    state.0.store(true, Ordering::Relaxed);
}

#[derive(Serialize, Clone)]
pub struct VolumeInfo {
    pub name: String,
    pub mount_point: String,
    pub total_space: u64,
    pub available_space: u64,
    pub is_removable: bool,
}

#[tauri::command]
pub fn list_volumes() -> Vec<VolumeInfo> {
    let disks = sysinfo::Disks::new_with_refreshed_list();
    disks
        .iter()
        .filter(|d| {
            let mp = d.mount_point().to_string_lossy();
            // Hide macOS internal APFS volumes (System/VM/Preboot/Data/Update/...);
            // "/" already reaches user data through firmlinks, and real external
            // drives live under /Volumes.
            mp == "/" || mp.starts_with("/Volumes/")
        })
        .map(|d| VolumeInfo {
            name: {
                let n = d.name().to_string_lossy().into_owned();
                if n.trim().is_empty() {
                    d.mount_point().to_string_lossy().into_owned()
                } else {
                    n
                }
            },
            mount_point: d.mount_point().to_string_lossy().into_owned(),
            total_space: d.total_space(),
            available_space: d.available_space(),
            is_removable: d.is_removable(),
        })
        .collect()
}
