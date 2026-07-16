import { FileNode } from "../types";
import { formatBytes } from "../format";

interface Props {
  crumbs: FileNode[];
  onCrumbClick: (index: number) => void;
  onBack: () => void;
  onRescan: () => void;
  onCancel: () => void;
  scanning: boolean;
  filesScanned: number;
}

export function Toolbar({
  crumbs,
  onCrumbClick,
  onBack,
  onRescan,
  onCancel,
  scanning,
  filesScanned,
}: Props) {
  const current = crumbs[crumbs.length - 1];

  return (
    <div className="toolbar glass-panel">
      <button className="icon-btn" onClick={onBack} disabled={crumbs.length <= 1 || scanning} title="Back">
        ←
      </button>
      <div className="breadcrumbs">
        {crumbs.map((c, i) => (
          <span key={c.path} className="crumb-group">
            {i > 0 && <span className="crumb-sep">›</span>}
            <button
              className={`crumb${i === crumbs.length - 1 ? " current" : ""}`}
              onClick={() => onCrumbClick(i)}
              disabled={scanning}
            >
              {c.name || c.path}
            </button>
          </span>
        ))}
      </div>
      <div className="toolbar-spacer" />
      {scanning ? (
        <div className="scan-status">
          <span className="spinner" />
          Scanning… {filesScanned.toLocaleString()} files
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      ) : (
        current && <div className="folder-size-badge">{formatBytes(current.size)}</div>
      )}
      <button className="icon-btn" onClick={onRescan} disabled={scanning} title="Rescan">
        ⟲
      </button>
    </div>
  );
}
