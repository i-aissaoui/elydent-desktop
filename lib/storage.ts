import fs from "fs";
import path from "path";

export function getStorageRoot() {
  const custom = String(process.env.DENTIT_STORAGE_DIR || "").trim();
  if (custom) {
    if (!fs.existsSync(custom)) fs.mkdirSync(custom, { recursive: true });
    return custom;
  }

  const fallback = path.join(process.cwd(), "storage");
  if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
  return fallback;
}

export function getUploadsDir() {
  const dir = path.join(getStorageRoot(), "uploads");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getSessionDocumentsDir() {
  const dir = path.join(getStorageRoot(), "session-documents");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}
