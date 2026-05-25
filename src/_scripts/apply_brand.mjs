#!/usr/bin/env node
/**
 * Apply brand CSS variables to all HTML files.
 * Only replaces :root block — preserves all fonts, structure, and content.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "../..");

const BRAND_CSS = `:root {
  --bg: #faf9f7;
  --surface: #f0ede8;
  --border: #d4cfc6;
  --text: #1a1814;
  --text-muted: #6b6560;
  --accent: #3d5a80;
}`;

const IGNORE = new Set([".git", ".github", "index.html", "index.json", "generate_index.mjs", "README.md", ".gitignore"]);

function applyBrand(filePath) {
  let html = readFileSync(filePath, "utf8");
  const before = html;

  // Replace :root block (multiline, across potentially multiple style blocks)
  html = html.replace(/:root\s*\{[\s\S]*?\}/gi, BRAND_CSS);

  if (html !== before) {
    writeFileSync(filePath, html);
    console.log(`Branded: ${filePath}`);
  }
}

function processDir(dir) {
  for (const entry of readdirSync(dir).sort()) {
    if (IGNORE.has(entry) || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      processDir(full);
    } else if (extname(entry) === ".html" && entry !== "index.html") {
      applyBrand(full);
    }
  }
}

processDir(join(REPO_ROOT, "src"));
console.log("Done.");