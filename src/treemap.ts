import { FileNode } from "./types";

export interface TreemapRect {
  node: FileNode;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function worst(row: number[], length: number): number {
  let max = -Infinity;
  let min = Infinity;
  let sum = 0;
  for (const r of row) {
    if (r > max) max = r;
    if (r < min) min = r;
    sum += r;
  }
  const s2 = sum * sum;
  const l2 = length * length;
  return Math.max((l2 * max) / s2, s2 / (l2 * min));
}

function layoutRow(row: { node: FileNode; value: number }[], box: Box, horizontal: boolean, out: TreemapRect[]) {
  const rowSum = row.reduce((s, r) => s + r.value, 0);
  if (horizontal) {
    // row occupies full width, stacked vertically inside a horizontal strip along x
    const rowHeight = box.w > 0 ? rowSum / box.w : 0;
    let cx = box.x;
    for (const r of row) {
      const w = rowSum > 0 ? (r.value / rowSum) * box.w : 0;
      out.push({ node: r.node, x: cx, y: box.y, w, h: rowHeight });
      cx += w;
    }
  } else {
    const rowWidth = box.h > 0 ? rowSum / box.h : 0;
    let cy = box.y;
    for (const r of row) {
      const h = rowSum > 0 ? (r.value / rowSum) * box.h : 0;
      out.push({ node: r.node, x: box.x, y: cy, w: rowWidth, h });
      cy += h;
    }
  }
}

// Squarified treemap (Bruls, Huizing, van Wijk)
export function squarify(nodes: FileNode[], box: Box): TreemapRect[] {
  const items = nodes.filter((n) => n.size > 0);
  const total = items.reduce((s, n) => s + n.size, 0);
  if (total <= 0 || box.w <= 0 || box.h <= 0) return [];

  const scale = (box.w * box.h) / total;
  const values = items.map((n) => ({ node: n, value: n.size * scale }));

  const out: TreemapRect[] = [];
  let remaining = values.slice();
  let curBox = { ...box };

  while (remaining.length > 0) {
    const horizontal = curBox.w >= curBox.h;
    const length = horizontal ? curBox.w : curBox.h;

    let row: number[] = [];
    let rowItems: { node: FileNode; value: number }[] = [];
    let i = 0;
    while (i < remaining.length) {
      const candidateRow = [...row, remaining[i].value];
      if (row.length === 0 || worst(row, length) >= worst(candidateRow, length)) {
        row = candidateRow;
        rowItems.push(remaining[i]);
        i++;
      } else {
        break;
      }
    }

    layoutRow(rowItems, curBox, horizontal, out);

    const rowSum = row.reduce((s, v) => s + v, 0);
    if (horizontal) {
      const rowHeight = curBox.w > 0 ? rowSum / curBox.w : 0;
      curBox = { x: curBox.x, y: curBox.y + rowHeight, w: curBox.w, h: curBox.h - rowHeight };
    } else {
      const rowWidth = curBox.h > 0 ? rowSum / curBox.h : 0;
      curBox = { x: curBox.x + rowWidth, y: curBox.y, w: curBox.w - rowWidth, h: curBox.h };
    }

    remaining = remaining.slice(rowItems.length);
  }

  return out;
}
