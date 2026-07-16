export interface FileNode {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  children: FileNode[];
}

export interface VolumeInfo {
  name: string;
  mount_point: string;
  total_space: number;
  available_space: number;
  is_removable: boolean;
}

export type SortKey = "size" | "name" | "type";
export type SortDir = "asc" | "desc";
