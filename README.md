# 🔮 MazTree

## A blazing-fast disk usage analyzer with a stunning glass UI

Built with Tauri · React · Rust

[![Version](https://img.shields.io/badge/version-0.1.0-7c5eee.svg)](https://github.com/OkilSaber/maztree)
[![Platform](https://img.shields.io/badge/platform-macOS-222.svg)](https://github.com/OkilSaber/maztree)
[![License](https://img.shields.io/badge/license-GPL--3.0-06FFA5.svg)](https://github.com/OkilSaber/maztree/blob/main/LICENSE)

---

MazTree is a native desktop application that visualizes disk usage through an interactive **squarified treemap** and a sortable **file tree**. Inspired by [WizTree](https://www.diskanalyzer.com/), it scans entire volumes in seconds using a multi-threaded Rust backend — then renders the results in a glassmorphism-styled React frontend that feels right at home on macOS.

## ✨ Features

| Feature | Description |
| --- | --- |
| 🗺️ **Interactive Treemap** | Squarified layout (Bruls, Huizing & van Wijk) rendered on `<canvas>` — click any block to drill in |
| 📂 **Sortable File Tree** | Virtualized list with sort-by-name, size, or type; expand/collapse folders inline |
| 💾 **Volume Sidebar** | Auto-detects mounted drives and shows used/free space at a glance |
| 🧭 **Breadcrumb Navigation** | Full path breadcrumbs with back-button and click-to-jump |
| 🎨 **Category Coloring** | Files color-coded by type — images, video, audio, documents, code, archives, and more |
| ⚡ **Parallel Scanning** | Rust + Rayon fan-out across subdirectories; leaf files stat'd inline to avoid task overhead |
| 🔄 **Live Progress** | Real-time file count updates during scan, with cancel support |
| 🪟 **Glass UI** | macOS vibrancy, translucent panels, gradient backgrounds, and smooth micro-animations |

## 🏗️ Architecture

```text
┌──────────────────────────────────────────────────────┐
│                    Tauri (Rust)                      │
│                                                      │
│  scan.rs ── parallel directory walker (rayon)        │
│           ├─ alloc_size() → real on-disk bytes       │
│           ├─ scan_dir()   → recursive FileNode tree  │
│           ├─ scan_path()  → Tauri command + progress │
│           └─ list_volumes() → sysinfo disk list      │
│                                                      │
│  Events: scan-progress (u64), scan-done              │
└──────────────┬───────────────────────────────────────┘
               │  IPC (invoke / listen)
┌──────────────▼───────────────────────────────────────┐
│                  React (TypeScript)                  │
│                                                      │
│  App.tsx ────── state management + layout            │
│  Sidebar ────── volume picker                        │
│  Toolbar ────── breadcrumbs, rescan, cancel          │
│  Treemap ────── <canvas> squarified treemap          │
│  TreeList ───── virtualized sortable file list       │
│                                                      │
│  treemap.ts ─── squarify algorithm                   │
│  categorize.ts ─ file-type → color mapping           │
│  ancestor.ts ── path → ancestor chain resolution     │
│  format.ts ──── byte formatting                      │
└──────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

| Layer | Technology |
| ------- | ----------- |
| **Desktop Shell** | [Tauri v2](https://v2.tauri.app/) — lightweight, secure native wrapper |
| **Backend** | Rust with [Rayon](https://docs.rs/rayon) for parallel I/O |
| **Frontend** | React 19 + TypeScript + Vite 7 |
| **System Info** | [sysinfo](https://docs.rs/sysinfo) for volume detection |
| **Rendering** | Canvas 2D for treemap, virtualized DOM for file list |

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Rust** (latest stable) — install via [rustup](https://rustup.rs/)
- **Tauri CLI** — included as a dev dependency, or install globally:

  ```bash
  cargo install tauri-cli --version "^2"
  ```

- **macOS** with Xcode Command Line Tools

### Development

```bash
# Clone the repo
git clone https://github.com/OkilSaber/maztree.git
cd maztree

# Install frontend dependencies
npm install

# Run in development mode (launches the native window)
npm run tauri dev
```

> [!NOTE]
> The Rust `[profile.dev]` is set to `opt-level = 2` so disk scanning stays responsive even in debug builds. Full-disk scans at opt-level 0 can be 10–30× slower.

### Production Build

```bash
npm run tauri build
```

The `.app` bundle will be output to `src-tauri/target/release/bundle/`.

## 📁 Project Structure

```text
maztree/
├── src/                    # React frontend
│   ├── App.tsx             # Root component & state
│   ├── App.css             # Full design system (glass panels, layout, colors)
│   ├── components/
│   │   ├── Sidebar.tsx     # Volume list sidebar
│   │   ├── Toolbar.tsx     # Breadcrumbs & scan controls
│   │   ├── Treemap.tsx     # Canvas-based squarified treemap
│   │   └── TreeList.tsx    # Virtualized sortable file list
│   ├── treemap.ts          # Squarify layout algorithm
│   ├── categorize.ts       # File extension → category + color map
│   ├── ancestor.ts         # Path ancestry resolution
│   ├── format.ts           # Byte formatting utilities
│   └── types.ts            # Shared TypeScript interfaces
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── lib.rs          # Plugin registration & state setup
│   │   ├── main.rs         # Entry point
│   │   └── scan.rs         # Parallel scanner, volume lister, Tauri commands
│   ├── tauri.conf.json     # Window config, vibrancy, bundling
│   └── Cargo.toml          # Rust dependencies
├── index.html              # Vite entry point
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 👤 Contributors

- [OkilSaber](https://github.com/OkilSaber)

## 📝 License

[GPL-3.0](./LICENSE)
