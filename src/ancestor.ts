import { FileNode } from "./types";

export function ancestorChain(node: FileNode, targetPath: string): FileNode[] | null {
  if (node.path === targetPath) return [node];
  const prefix = node.path.endsWith("/") ? node.path : node.path + "/";
  if (!targetPath.startsWith(prefix)) return null;
  for (const child of node.children) {
    const rest = ancestorChain(child, targetPath);
    if (rest) return [node, ...rest];
  }
  return null;
}
