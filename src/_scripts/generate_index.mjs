#!/usr/bin/env node
/** Generate index.json — file listing with sizes, by category. */

import { writeFileSync, readdirSync, statSync } from "fs";
import { join, relative, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "../..");
const OUT_FILE = join(REPO_ROOT, "index.json");

const IGNORE = new Set([
  ".git",
  ".github",
  "index.html",
  "index.json",
  "generate_index.mjs",
  "README.md",
  ".gitignore",
  "_scripts",
  "_templates",
  "node_modules",
]);

const CATEGORIES = {
  documents: ["html", "htm", "md", "txt", "pdf", "doc", "docx"],
  images: ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"],
  audio: ["mp3", "wav", "ogg", "flac", "aac", "m4a"],
  video: ["mp4", "webm", "mkv", "avi", "mov"],
  data: ["json", "yaml", "yml", "xml", "csv", "tsv"],
  code: ["js", "ts", "py", "sh", "bash", "css", "sql"],
  archives: ["zip", "tar", "gz", "rar", "7z"],
};

/** @returns {string} */
function getCategory(ext) {
  for (const [cat, exts] of Object.entries(CATEGORIES)) {
    if (exts.includes(ext)) return cat;
  }
  return "documents";
}

/** @param {string} dir @param {string} [prefix] @returns {any[]} */
function walk(dir, prefix = "") {
  const entries = [];
  for (const entry of readdirSync(dir).sort()) {
    if (IGNORE.has(entry) || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      entries.push(...walk(full, rel));
    } else {
      const ext = extname(entry).replace(".", "").toLowerCase() || "txt";
      // Derive category from the directory immediately under src/
      // e.g. src/documents/prompt/foo.html → "prompt"
      const parts = rel.split("/");
      const dirCategory = parts.length > 2 ? parts[2] : (parts.length > 1 ? parts[1] : "documents");
      entries.push({
        name: entry.replace(/\.[^.]+$/, ""),
        path: rel,
        category: dirCategory,
        ext,
        size: stat.size,
      });
    }
  }
  return entries;
}

const files = walk(REPO_ROOT);
writeFileSync(OUT_FILE, JSON.stringify(files, null, 2));
console.error(`index.json written (${files.length} entries)`);