#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  rename_github_repo.sh NEW_REPO_NAME [options]

Options:
  --remote NAME       Git remote to read/update. Default: origin
  --owner OWNER       Override GitHub owner parsed from remote URL
  --rename-dir        Rename the local repository directory after remote update
  --yes               Required to perform the GitHub rename
  --dry-run           Print planned actions without changing anything
  -h, --help          Show this help

Examples:
  scripts/rename_github_repo.sh llm-notes-v2 --dry-run
  scripts/rename_github_repo.sh llm-notes-v2 --yes
  scripts/rename_github_repo.sh llm-notes-v2 --yes --rename-dir
EOF
}

die() {
  echo "rename_github_repo: $*" >&2
  exit 1
}

remote="origin"
owner_override=""
rename_dir=0
assume_yes=0
dry_run=0

if [[ $# -eq 0 ]]; then
  usage
  exit 1
fi

new_name="$1"
shift

while [[ $# -gt 0 ]]; do
  case "$1" in
    --remote)
      [[ $# -ge 2 ]] || die "--remote requires a value"
      remote="$2"
      shift 2
      ;;
    --owner)
      [[ $# -ge 2 ]] || die "--owner requires a value"
      owner_override="$2"
      shift 2
      ;;
    --rename-dir)
      rename_dir=1
      shift
      ;;
    --yes)
      assume_yes=1
      shift
      ;;
    --dry-run)
      dry_run=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown option: $1"
      ;;
  esac
done

[[ "$new_name" =~ ^[A-Za-z0-9._-]+$ ]] || die "new repo name may only contain letters, numbers, dot, underscore, and dash"
[[ "$new_name" != "." && "$new_name" != ".." ]] || die "invalid repo name: $new_name"

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$repo_root" ]] || die "run this from inside a git repository"
cd "$repo_root"

remote_url="$(git remote get-url "$remote" 2>/dev/null || true)"
[[ -n "$remote_url" ]] || die "remote '$remote' does not exist"

parse_remote() {
  local url="$1"
  local parsed_owner=""
  local parsed_repo=""

  case "$url" in
    git@github.com:*.git|git@github.com:*)
      local path="${url#git@github.com:}"
      path="${path%.git}"
      parsed_owner="${path%%/*}"
      parsed_repo="${path#*/}"
      ;;
    https://github.com/*.git|https://github.com/*)
      local path="${url#https://github.com/}"
      path="${path%.git}"
      parsed_owner="${path%%/*}"
      parsed_repo="${path#*/}"
      ;;
    ssh://git@github.com/*.git|ssh://git@github.com/*)
      local path="${url#ssh://git@github.com/}"
      path="${path%.git}"
      parsed_owner="${path%%/*}"
      parsed_repo="${path#*/}"
      ;;
    *)
      return 1
      ;;
  esac

  [[ -n "$parsed_owner" && -n "$parsed_repo" && "$parsed_owner" != "$parsed_repo" ]] || return 1
  printf '%s %s\n' "$parsed_owner" "$parsed_repo"
}

remote_parts="$(parse_remote "$remote_url")" || die "remote '$remote' is not a supported GitHub URL: $remote_url"
read -r parsed_owner parsed_repo <<< "$remote_parts"
owner="${owner_override:-$parsed_owner}"
old_name="$parsed_repo"

[[ "$new_name" != "$old_name" ]] || die "new repo name is already the current remote repo name"

case "$remote_url" in
  git@github.com:*) new_url="git@github.com:${owner}/${new_name}.git" ;;
  https://github.com/*) new_url="https://github.com/${owner}/${new_name}.git" ;;
  ssh://git@github.com/*) new_url="ssh://git@github.com/${owner}/${new_name}.git" ;;
  *) die "unsupported remote URL: $remote_url" ;;
esac

repo_parent="$(dirname "$repo_root")"
repo_dir="$(basename "$repo_root")"
new_repo_root="${repo_parent}/${new_name}"

if [[ $rename_dir -eq 1 && "$repo_dir" != "$new_name" && -e "$new_repo_root" ]]; then
  die "cannot rename local directory; target already exists: $new_repo_root"
fi

echo "Remote:      $remote"
echo "GitHub repo: ${owner}/${old_name} -> ${owner}/${new_name}"
echo "Remote URL:  $remote_url -> $new_url"
if [[ $rename_dir -eq 1 ]]; then
  echo "Local dir:   $repo_root -> $new_repo_root"
fi

if [[ $dry_run -eq 1 ]]; then
  echo "Dry run only. No changes made."
  exit 0
fi

[[ $assume_yes -eq 1 ]] || die "refusing to rename GitHub repository without --yes"
command -v gh >/dev/null 2>&1 || die "GitHub CLI 'gh' is required"
gh auth status -h github.com >/dev/null

gh api \
  --method PATCH \
  "repos/${owner}/${old_name}" \
  -f "name=${new_name}" \
  >/dev/null

git remote set-url "$remote" "$new_url"
git ls-remote --exit-code "$remote" >/dev/null

if [[ $rename_dir -eq 1 && "$repo_dir" != "$new_name" ]]; then
  cd "$repo_parent"
  mv "$repo_dir" "$new_name"
  echo "Renamed local directory to: $new_repo_root"
fi

echo "Repository rename complete."
