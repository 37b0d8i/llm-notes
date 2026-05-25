#!/usr/bin/env python3
"""Generate index.json for the repository — file listing with sizes."""

import json, os, sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent.resolve()
OUT_FILE = REPO_ROOT / "index.json"
IGNORE = {".git", ".github", "index.html", "index.json", "generate_index.py", "README.md", ".gitignore"}

def files_json(path=REPO_ROOT, prefix=""):
    entries = []
    for entry in sorted(path.iterdir()):
        name = entry.name
        if name in IGNORE or name.startswith("."):
            continue
        rel = (prefix + name) if prefix else name
        if entry.is_dir():
            entries.append({"name": rel + "/", "type": "dir", "size": None})
            entries.extend(files_json(entry, rel + "/"))
        else:
            entries.append({"name": rel, "type": "file", "size": entry.stat().st_size})
    return entries

def main():
    entries = files_json()
    with open(OUT_FILE, "w") as f:
        json.dump(entries, f, indent=2)
    print(f"index.json written ({len(entries)} entries)", file=sys.stderr)

if __name__ == "__main__":
    main()