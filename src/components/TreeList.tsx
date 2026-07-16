import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { FileNode, SortDir, SortKey } from "../types";
import { categorize, CATEGORY_COLOR } from "../categorize";
import { formatBytes } from "../format";
import { ancestorChain } from "../ancestor";

interface Props {
  root: FileNode;
  focusPath: string;
  selectedPath: string | null;
  onSelect: (node: FileNode) => void;
}

interface FlatRow {
  node: FileNode;
  depth: number;
}

const ROW_HEIGHT = 27;

function sortChildren(children: FileNode[], key: SortKey, dir: SortDir): FileNode[] {
  const factor = dir === "asc" ? 1 : -1;
  const sorted = [...children].sort((a, b) => {
    if (key === "size") return (a.size - b.size) * factor;
    if (key === "name") return a.name.localeCompare(b.name) * factor;
    // type: dirs first grouped, then by category name, then by name
    const ca = categorize(a.name, a.is_dir);
    const cb = categorize(b.name, b.is_dir);
    if (ca !== cb) return ca.localeCompare(cb) * factor;
    return a.name.localeCompare(b.name) * factor;
  });
  return sorted;
}

function flatten(
  node: FileNode,
  depth: number,
  expanded: Set<string>,
  key: SortKey,
  dir: SortDir,
  out: FlatRow[]
) {
  out.push({ node, depth });
  if (node.is_dir && expanded.has(node.path) && node.children.length > 0) {
    for (const child of sortChildren(node.children, key, dir)) {
      flatten(child, depth + 1, expanded, key, dir, out);
    }
  }
}

export function TreeList({ root, focusPath, selectedPath, onSelect }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([root.path]));
  const [sortKey, setSortKey] = useState<SortKey>("size");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chain = ancestorChain(root, focusPath);
    if (!chain) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const n of chain) if (n.is_dir) next.add(n.path);
      return next;
    });
  }, [focusPath, root]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setViewportH(entries[0].contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const flatRows = useMemo(() => {
    const out: FlatRow[] = [];
    flatten(root, 0, expanded, sortKey, sortDir, out);
    return out;
  }, [root, expanded, sortKey, sortDir]);

  useEffect(() => {
    const idx = flatRows.findIndex((r) => r.node.path === focusPath);
    const el = containerRef.current;
    if (idx >= 0 && el) {
      const rowTop = idx * ROW_HEIGHT;
      if (rowTop < el.scrollTop || rowTop + ROW_HEIGHT > el.scrollTop + el.clientHeight) {
        el.scrollTop = Math.max(0, rowTop - el.clientHeight / 3);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPath]);

  const toggle = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const totalHeight = flatRows.length * ROW_HEIGHT;
  const buffer = 6;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - buffer);
  const endIdx = Math.min(flatRows.length, Math.ceil((scrollTop + viewportH) / ROW_HEIGHT) + buffer);
  const visible = flatRows.slice(startIdx, endIdx);
  const rootTotal = root.size || 1;

  return (
    <div className="tree-list glass-panel">
      <div className="tree-list-header">
        <div className="col col-name sortable" onClick={() => toggleSort("name")}>
          Name {sortKey === "name" && (sortDir === "asc" ? "▲" : "▼")}
        </div>
        <div className="col col-type sortable" onClick={() => toggleSort("type")}>
          Type {sortKey === "type" && (sortDir === "asc" ? "▲" : "▼")}
        </div>
        <div className="col col-size sortable" onClick={() => toggleSort("size")}>
          Size {sortKey === "size" && (sortDir === "asc" ? "▲" : "▼")}
        </div>
      </div>
      <div
        className="tree-list-scroll"
        ref={containerRef}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        <div style={{ height: totalHeight, position: "relative" }}>
          {visible.map((row, i) => {
            const idx = startIdx + i;
            const cat = categorize(row.node.name, row.node.is_dir);
            const color = CATEGORY_COLOR[cat];
            const pct = Math.min(100, (row.node.size / rootTotal) * 100);
            const isSelected = selectedPath === row.node.path;
            const isExpanded = expanded.has(row.node.path);
            const hasChildren = row.node.is_dir && row.node.children.length > 0;

            return (
              <div
                key={row.node.path}
                className={`tree-row${isSelected ? " selected" : ""}`}
                style={{ top: idx * ROW_HEIGHT, height: ROW_HEIGHT }}
                onClick={() => onSelect(row.node)}
              >
                <div className="row-bar" style={{ width: `${pct}%`, background: color }} />
                <div className="col col-name" style={{ paddingLeft: row.depth * 16 }}>
                  {hasChildren ? (
                    <span
                      className="chevron"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(row.node.path);
                      }}
                    >
                      {isExpanded ? "▾" : "▸"}
                    </span>
                  ) : (
                    <span className="chevron chevron-empty" />
                  )}
                  <span className="dot" style={{ background: color }} />
                  <span className="name-text">{row.node.name}</span>
                </div>
                <div className="col col-type">{cat}</div>
                <div className="col col-size">{formatBytes(row.node.size)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
