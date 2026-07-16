export type Category =
  | "folder"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "code"
  | "archive"
  | "app"
  | "system"
  | "other";

const EXT_MAP: Record<string, Category> = {
  // images
  jpg: "image", jpeg: "image", png: "image", gif: "image", bmp: "image",
  webp: "image", heic: "image", heif: "image", svg: "image", tiff: "image",
  raw: "image", psd: "image",
  // video
  mp4: "video", mov: "video", mkv: "video", avi: "video", webm: "video",
  m4v: "video", flv: "video", wmv: "video",
  // audio
  mp3: "audio", wav: "audio", flac: "audio", aac: "audio", m4a: "audio",
  ogg: "audio", aiff: "audio",
  // documents
  pdf: "document", doc: "document", docx: "document", xls: "document",
  xlsx: "document", ppt: "document", pptx: "document", txt: "document",
  md: "document", pages: "document", numbers: "document", key: "document",
  rtf: "document", csv: "document",
  // code
  js: "code", ts: "code", tsx: "code", jsx: "code", rs: "code", py: "code",
  go: "code", java: "code", c: "code", cpp: "code", h: "code", hpp: "code",
  swift: "code", rb: "code", php: "code", html: "code", css: "code",
  json: "code", yaml: "code", yml: "code", sh: "code", sql: "code",
  // archives
  zip: "archive", rar: "archive", tar: "archive", gz: "archive", "7z": "archive",
  bz2: "archive", xz: "archive", dmg: "archive", iso: "archive",
  // apps / binaries
  app: "app", exe: "app", pkg: "app", so: "app", dylib: "app", a: "app",
  // system
  plist: "system", log: "system", cache: "system", tmp: "system",
};

export function categorize(name: string, isDir: boolean): Category {
  if (isDir) return "folder";
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return "other";
  const ext = name.slice(dot + 1).toLowerCase();
  return EXT_MAP[ext] ?? "other";
}

export const CATEGORY_COLOR: Record<Category, string> = {
  folder: "#5E7CE2",
  image: "#FF6B9D",
  video: "#C77DFF",
  audio: "#4CC9F0",
  document: "#FFD60A",
  code: "#06FFA5",
  archive: "#FF9F1C",
  app: "#EF476F",
  system: "#8D99AE",
  other: "#A78BFA",
};
