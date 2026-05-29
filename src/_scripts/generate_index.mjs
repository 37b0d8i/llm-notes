#!/usr/bin/env node
/** Generate index.json — file listing with sizes, by category. */

import { writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "../..");
const DEFAULT_OUT_FILE = join(REPO_ROOT, "index.json");

const outFlagIndex = process.argv.indexOf("--out");
const OUT_FILE = outFlagIndex >= 0 && process.argv[outFlagIndex + 1]
  ? process.argv[outFlagIndex + 1]
  : DEFAULT_OUT_FILE;

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

/**
 * Keep folder-based categories stable:
 * - src/documents/<group>/file.html -> <group>
 * - src/images/file.png -> images
 */
function inferCategory(relPath) {
  const parts = relPath.split("/");
  const topLevel = parts[1] || "documents";
  if (topLevel === "documents" && parts.length > 3) {
    return parts[2];
  }
  return topLevel;
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
      entries.push({
        name: entry.replace(/\.[^.]+$/, ""),
        path: rel,
        category: inferCategory(rel),
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
