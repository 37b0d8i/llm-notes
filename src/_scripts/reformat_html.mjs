#!/usr/bin/env node
/** 
 * Reformat all HTML files with consistent typography and branding.
 * Applies a standardized template while preserving content.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, relative, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "../..");

// Files to ignore
const IGNORE = new Set([
  ".git",
  ".github",
  "index.html",
  "index.json",
  "generate_index.mjs",
  "README.md",
  ".gitignore",
]);

// Read template
const TEMPLATE_PATH = join(__dirname, "../_templates/html_template.html");
const template = readFileSync(TEMPLATE_PATH, "utf8");

// Extract content from various possible structures
function extractContent(html) {
  // Try main.content first
  const mainContentMatch = html.match(/<main class="content">(.*?)<\/main>/s);
  if (mainContentMatch) {
    return mainContentMatch[1].trim();
  }
  
  // Try container div
  const containerMatch = html.match(/<div class="container">(.*?)<\/div>/s);
  if (containerMatch) {
    return containerMatch[1].trim();
  }
  
  // Try cards-grid structure
  const cardsGridMatch = html.match(/<div class="cards-grid">(.*?)<\/div>/s);
  if (cardsGridMatch) {
    return `<div class="cards-grid">${cardsGridMatch[1]}</div>`;
  }
  
  // Try content div
  const contentDivMatch = html.match(/<div class="content">(.*?)<\/div>/s);
  if (contentDivMatch) {
    return contentDivMatch[1].trim();
  }
  
  // Try to extract body content (everything between body tags, excluding header/footer)
  const bodyMatch = html.match(/<body[^>]*>(.*?)<\/body>/s);
  if (bodyMatch) {
    let bodyContent = bodyMatch[1];
    // Remove header if present
    bodyContent = bodyContent.replace(/<header[^>]*>.*?<\/header>/s, '');
    // Remove footer if present
    bodyContent = bodyContent.replace(/<footer[^>]*>.*?<\/footer>/s, '');
    // Remove script tags
    bodyContent = bodyContent.replace(/<script[^>]*>.*?<\/script>/gs, '');
    return bodyContent.trim();
  }
  
  return null;
}

// Extract title from <title> tag or from <h1> tag
function extractTitle(html) {
  // Try title tag first
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (titleMatch && titleMatch[1] !== "HTML Template") {
    return titleMatch[1];
  }
  
  // Try h1 tag
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1Match) {
    return h1Match[1];
  }
  
  return "Untitled Document";
}

// Extract header subtitle from .subtitle class
function extractSubtitle(html) {
  const subtitleMatch = html.match(/<p class="subtitle">(.*?)<\/p>/i);
  return subtitleMatch ? subtitleMatch[1] : "";
}

// Apply new template with extracted content
function reformatFile(filePath, content, title, subtitle) {
  // Skip template file itself
  if (filePath.includes("_templates")) {
    return;
  }
  
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const pathParts = filePath.split('/');
  const category = pathParts.length > 2 ? pathParts[pathParts.length - 2] : "documents"; // e.g., "prompt" or "ts"
  
  // Use original title if available, otherwise use a default
  const displayTitle = title && title !== "HTML Template" ? title : pathParts[pathParts.length - 1].replace('.html', '').replace(/_/g, ' ');
  
  let newHtml = template
    .replace("Document Title", displayTitle)
    .replace("Brief description of the document", subtitle)
    .replace("{{DATE}}", date)
    .replace("{{CATEGORY}}", category)
    .replace(
      '<div class="section">\n      <h2>Section Title</h2>\n      <p>This is a paragraph with some sample text to demonstrate the typography. The font is Crimson Pro, which provides excellent readability for long-form content.</p>\n      \n      <h3>Subsection Title</h3>\n      <p>Another paragraph with more content to show how the text flows and how the spacing works between different elements.</p>\n      \n      <pre><code>// Sample code block\nfunction example() {\n  const message = "Hello, world!";\n  console.log(message);\n}</code></pre>\n      \n      <ul>\n        <li>Bullet point one</li>\n        <li>Bullet point two</li>\n        <li>Bullet point three</li>\n      </ul>\n    </div>',
      content
    );
  
  writeFileSync(filePath, newHtml);
  console.log(`Reformatted: ${filePath}`);
}

// Process HTML files
function processHtmlFiles(dir) {
  for (const entry of readdirSync(dir).sort()) {
    if (IGNORE.has(entry) || entry.startsWith(".")) continue;
    
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      processHtmlFiles(fullPath);
    } else if (extname(entry) === ".html" && entry !== "index.html") {
      try {
        const html = readFileSync(fullPath, "utf8");
        const content = extractContent(html);
        const title = extractTitle(html);
        const subtitle = extractSubtitle(html);
        
        if (content) {
          reformatFile(fullPath, content, title, subtitle);
        } else {
          console.warn(`Could not extract content from ${fullPath}`);
        }
      } catch (err) {
        console.error(`Error processing ${fullPath}: ${err.message}`);
      }
    }
  }
}

processHtmlFiles(join(REPO_ROOT, "src"));
console.log("HTML reformatting complete.");