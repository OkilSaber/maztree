import { VolumeInfo } from "../types";
import { formatBytes } from "../format";

interface Props {
  volumes: VolumeInfo[];
  activeMount: string | null;
  onScan: (mountPoint: string) => void;
  scanning: boolean;
}

export function Sidebar({ volumes, activeMount, onScan, scanning }: Props) {
  return (
    <div className="sidebar glass-panel">
      <div className="sidebar-title">Volumes</div>
      <div className="volume-list">
        {volumes.map((v) => {
          const used = v.total_space - v.available_space;
          const pct = v.total_space > 0 ? (used / v.total_space) * 100 : 0;
          const isActive = activeMount === v.mount_point;
          return (
            <button
              key={v.mount_point}
              className={`volume-item${isActive ? " active" : ""}`}
              onClick={() => onScan(v.mount_point)}
              disabled={scanning}
            >
              <div className="volume-name">
                <span className="volume-dot" />
                {v.name}
              </div>
              <div className="volume-bar-track">
                <div className="volume-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="volume-meta">
                {formatBytes(used)} of {formatBytes(v.total_space)}
              </div>
            </button>
          );
        })}
        {volumes.length === 0 && <div className="volume-empty">No volumes found</div>}
      </div>
    </div>
  );
}
