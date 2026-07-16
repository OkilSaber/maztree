import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { FileNode, VolumeInfo } from "./types";
import { ancestorChain } from "./ancestor";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { Treemap } from "./components/Treemap";
import { TreeList } from "./components/TreeList";
import "./App.css";

function App() {
  const [volumes, setVolumes] = useState<VolumeInfo[]>([]);
  const [root, setRoot] = useState<FileNode | null>(null);
  const [crumbs, setCrumbs] = useState<FileNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [filesScanned, setFilesScanned] = useState(0);
  const [activeMount, setActiveMount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<VolumeInfo[]>("list_volumes")
      .then(setVolumes)
      .catch((e) => setError(String(e)));
  }, []);

  const scan = useCallback(async (mountPoint: string) => {
    setScanning(true);
    setFilesScanned(0);
    setError(null);
    setActiveMount(mountPoint);

    const unlisten = await listen<number>("scan-progress", (event) => {
      setFilesScanned(event.payload);
    });

    try {
      const tree = await invoke<FileNode>("scan_path", { path: mountPoint });
      setRoot(tree);
      setCrumbs([tree]);
      setSelectedPath(null);
    } catch (e) {
      if (String(e) !== "cancelled") setError(String(e));
    } finally {
      unlisten();
      setScanning(false);
    }
  }, []);

  const cancelScan = useCallback(() => {
    invoke("cancel_scan").catch(() => {});
  }, []);

  const navigateTo = useCallback((node: FileNode) => {
    setCrumbs((prev) => {
      const idx = prev.findIndex((c) => c.path === node.path);
      if (idx >= 0) return prev.slice(0, idx + 1);
      return [...prev, node];
    });
    setSelectedPath(node.path);
  }, []);

  const handleSelect = useCallback(
    (node: FileNode) => {
      setSelectedPath(node.path);
      if (node.is_dir && root) {
        const chain = ancestorChain(root, node.path);
        if (chain) setCrumbs(chain);
      }
    },
    [root]
  );

  const handleCrumbClick = (index: number) => {
    setCrumbs((prev) => prev.slice(0, index + 1));
  };

  const handleBack = () => {
    setCrumbs((prev) => (prev.length > 1 ? prev.slice(0, prev.length - 1) : prev));
  };

  const focusNode = crumbs.length > 0 ? crumbs[crumbs.length - 1] : null;

  return (
    <div className="app">
      <Sidebar volumes={volumes} activeMount={activeMount} onScan={scan} scanning={scanning} />
      <div className="main-panel">
        <Toolbar
          crumbs={crumbs}
          onCrumbClick={handleCrumbClick}
          onBack={handleBack}
          onRescan={() => activeMount && scan(activeMount)}
          onCancel={cancelScan}
          scanning={scanning}
          filesScanned={filesScanned}
        />
        {error && <div className="error-banner">{error}</div>}
        {!root && !scanning && (
          <div className="empty-state glass-panel">
            <div className="empty-title">Select a volume to scan</div>
            <div className="empty-sub">Pick a drive on the left to map its disk usage.</div>
          </div>
        )}
        {scanning && !root && (
          <div className="empty-state glass-panel">
            <div className="empty-title">Scanning…</div>
            <div className="empty-sub">{filesScanned.toLocaleString()} files found so far</div>
          </div>
        )}
        {root && focusNode && (
          <div className="content-split">
            <Treemap node={focusNode} onNavigate={navigateTo} selectedPath={selectedPath} />
            <TreeList
              root={root}
              focusPath={focusNode.path}
              selectedPath={selectedPath}
              onSelect={handleSelect}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
