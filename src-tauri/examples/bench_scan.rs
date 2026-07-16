use std::os::unix::fs::MetadataExt;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::time::Instant;
use maztree_lib::scan::scan_dir;

fn main() {
    let path = std::env::args().nth(1).unwrap_or_else(|| "/".to_string());
    let root = PathBuf::from(&path);
    let dev = std::fs::metadata(&root).expect("stat root").dev();

    let counter = AtomicU64::new(0);
    let cancelled = AtomicBool::new(false);

    let start = Instant::now();
    let tree = scan_dir(&root, dev, &counter, &cancelled);
    let elapsed = start.elapsed();

    println!(
        "scanned {} in {:.2}s — {} files, {} bytes ({:.1} GB)",
        path,
        elapsed.as_secs_f64(),
        counter.load(Ordering::Relaxed),
        tree.size,
        tree.size as f64 / 1e9
    );
}
