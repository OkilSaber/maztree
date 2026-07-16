import { useEffect, useRef, useState, useCallback } from "react";
import { FileNode } from "../types";
import { squarify, TreemapRect } from "../treemap";
import { categorize, CATEGORY_COLOR } from "../categorize";
import { formatBytes } from "../format";

interface Props {
  node: FileNode;
  onNavigate: (node: FileNode) => void;
  selectedPath: string | null;
}

function shade(hex: string, amt: number): string {
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r}, ${g}, ${b})`;
}

export function Treemap({ node, onNavigate, selectedPath }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rectsRef = useRef<TreemapRect[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<{ rect: TreemapRect; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0 || size.h === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size.w, size.h);

    const rects = squarify(node.children, { x: 0, y: 0, w: size.w, h: size.h });
    rectsRef.current = rects;

    for (const r of rects) {
      const cat = categorize(r.node.name, r.node.is_dir);
      const base = CATEGORY_COLOR[cat];
      const isSelected = selectedPath === r.node.path;

      const grad = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
      grad.addColorStop(0, shade(base, 28));
      grad.addColorStop(1, shade(base, -18));
      ctx.fillStyle = grad;
      ctx.fillRect(r.x, r.y, r.w, r.h);

      ctx.strokeStyle = isSelected ? "rgba(255,255,255,0.95)" : "rgba(10,12,20,0.55)";
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

      // subtle inner highlight for glass feel
      if (r.w > 4 && r.h > 4) {
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, Math.min(6, r.h / 3));
      }

      if (r.w > 46 && r.h > 22) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.font = "600 12px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.textBaseline = "top";
        const label = r.node.name;
        const maxChars = Math.floor((r.w - 10) / 6.5);
        const truncated = label.length > maxChars ? label.slice(0, Math.max(0, maxChars - 1)) + "…" : label;
        ctx.fillText(truncated, r.x + 7, r.y + 7, r.w - 12);
        if (r.h > 40) {
          ctx.font = "500 11px -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.fillStyle = "rgba(0,0,0,0.42)";
          ctx.fillText(formatBytes(r.node.size), r.x + 7, r.y + 23, r.w - 12);
        }
      }
    }
  }, [node, size, selectedPath]);

  useEffect(() => {
    draw();
  }, [draw]);

  function hitTest(clientX: number, clientY: number): TreemapRect | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    const x = clientX - bounds.left;
    const y = clientY - bounds.top;
    for (const r of rectsRef.current) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
    }
    return null;
  }

  return (
    <div className="treemap-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        onMouseMove={(e) => {
          const r = hitTest(e.clientX, e.clientY);
          setHover(r ? { rect: r, x: e.clientX, y: e.clientY } : null);
        }}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => {
          const r = hitTest(e.clientX, e.clientY);
          if (r && r.node.is_dir) onNavigate(r.node);
        }}
      />
      {hover && (
        <div
          className="treemap-tooltip glass-panel"
          style={{ left: hover.x + 16, top: hover.y + 16 }}
        >
          <div className="tooltip-name">{hover.rect.node.name}</div>
          <div className="tooltip-size">{formatBytes(hover.rect.node.size)}</div>
        </div>
      )}
    </div>
  );
}
