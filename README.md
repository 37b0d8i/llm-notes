# LLM Notes — File Hub

A self-hosting, auto-indexed file hub powered by GitHub Pages and GitHub Actions. Drop files into category folders, push, and the page updates automatically — no manual index maintenance ever.

**Live page**: https://37b0d8i.github.io/llm-notes/

**Repository**: https://github.com/37b0d8i/llm-notes

---

## Architecture

```
User pushes file
      │
      ▼
┌─────────────────────────┐
│   GitHub Actions        │
│   generate-index.yml    │
│   (Node.js 20)          │
└───────────┬─────────────┘
            │ runs generate_index.mjs
            ▼
┌─────────────────────────┐
│   index.json            │
│   (canonical file list) │
└───────────┬─────────────┘
            │ fetched by index.html
            ▼
┌─────────────────────────┐
│   GitHub Pages         │
│   index.html           │
│   (search + categories) │
└─────────────────────────┘
```

1. **File drop** — user commits a file to `src/<category>/`
2. **Trigger** — `push` event fires the `Generate Index` workflow
3. **Index** — `generate_index.mjs` walks the repo and writes `index.json`
4. **Commit** — the workflow commits the new `index.json` back to the branch
5. **Deploy** — GitHub Pages serves the updated `index.html`

---

## File Structure

```
llm_notes/
├── index.html                        # GitHub Pages entry point
├── index.json                        # Auto-generated file manifest
├── README.md                         # This file
│
├── .github/
│   └── workflows/
│       └── generate-index.yml        # CI: regenerate index on every push
│
└── src/
    ├── _scripts/
    │   └── generate_index.mjs        # File indexer (ESM, no build needed)
    │
    ├── documents/                    # 📄 .html .htm .md .txt .pdf .doc .docx
    ├── images/                       # 🖼️ .png .jpg .jpeg .gif .svg .webp .ico
    ├── audio/                        # 🎵 .mp3 .wav .ogg .flac .aac .m4a
    ├── video/                        # 🎬 .mp4 .webm .mkv .avi .mov
    ├── data/                         # 📦 .json .yaml .yml .xml .csv .tsv
    ├── code/                         # 🧩 .js .ts .py .sh .bash .css .sql
    └── archives/                     # 🗜️ .zip .tar .gz .rar .7z
```

---

## Usage

### Adding a file

1. **Choose the right category folder** (`src/documents/`, `src/images/`, etc.)
2. **Place the file** there and push:

```bash
# Example: add an image
cp my-diagram.png llm_notes/src/images/
cd llm_notes
git add src/images/my-diagram.png
git commit -m "Add my-diagram.png"
git push
```

3. Within ~30 seconds:
   - The workflow runs and regenerates `index.json`
   - GitHub Pages redeploys with the updated index
   - The file appears on the page in its category with a working link

### How the indexer categorises files

| Category | Extensions |
|---|---|
| documents | html, htm, md, txt, pdf, doc, docx |
| images | png, jpg, jpeg, gif, svg, webp, ico |
| audio | mp3, wav, ogg, flac, aac, m4a |
| video | mp4, webm, mkv, avi, mov |
| data | json, yaml, yml, xml, csv, tsv |
| code | js, ts, py, sh, bash, css, sql |
| archives | zip, tar, gz, rar, 7z |

Files with unknown extensions fall back to **documents**.

### Manual trigger

If the workflow didn't fire (e.g. a draft push), trigger it manually:

```
https://github.com/37b0d8i/llm-notes/actions → "Generate Index" → Run workflow
```

---

## Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Hosting** | GitHub Pages | Serves static files, HTTPS, CDN |
| **CI/CD** | GitHub Actions | Runs indexer on every push |
| **Validation** | GitHub Actions | Fails PRs if `index.json` is stale |
| **Indexer** | Node.js 20 (ESM `.mjs`) | Walks repo, emits `index.json` — no build step |
| **Frontend** | Vanilla HTML/CSS/JS | Dark-themed, search, category grouping |
| **Auth (push)** | Git SSH | `git@github.com:` for git operations |
| **Auth (API)** | gh CLI + HTTPS token | Repo management, workflow triggers |

### Why no build step for the indexer?

`generate_index.mjs` uses native ES modules and Node.js built-ins only (`fs`, `path`, `url`). GitHub Actions runs it directly with `node src/_scripts/generate_index.mjs` — no `npm install`, no `tsc`, no bundler.

### Why no `package.json`?

The indexer has zero npm dependencies. Adding one would require `npm install` in CI, which is unnecessary overhead for a script that only needs the standard library.

---

## Design Decisions

- **Virtual categorisation**: files live in `src/<category>/` but the URL path is preserved in `index.json` so links always point to the correct location
- **`index.json` committed back to repo**: ensures the source of truth is version-controlled alongside the files; page is rebuildable from any commit
- **PR validation**: `validate-index.yml` regenerates the manifest into a temp file and fails if the committed `index.json` is out of date
- **Client-side search**: no server needed — `index.html` fetches `index.json` and filters in-browser; fast for repos up to a few thousand files
- **Dark theme**: GitHub-dark palette for low-eye-strain browsing of code/doc resources
