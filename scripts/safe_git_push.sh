#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  safe_git_push.sh [commit message [pathspec ...]]

Behavior:
  - If the working tree is dirty, a commit message is required.
  - If pathspecs are provided, only those paths are staged.
  - The current branch is rebased onto its remote tracking branch before push.
  - No force push is used.
EOF
}

die() {
  echo "safe_git_push: $*" >&2
  exit 1
}

if [[ ${1:-} == "-h" || ${1:-} == "--help" ]]; then
  usage
  exit 0
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$repo_root" ]] || die "run this from inside a git repository"
cd "$repo_root"

branch="$(git branch --show-current)"
[[ -n "$branch" ]] || die "detached HEAD detected; checkout a branch before pushing"

commit_message=""
if [[ $# -gt 0 ]]; then
  commit_message="$1"
  shift
fi

has_worktree_changes=0
if ! git diff --quiet || ! git diff --cached --quiet || [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
  has_worktree_changes=1
fi

if [[ $has_worktree_changes -eq 1 && -z "$commit_message" ]]; then
  die "uncommitted changes detected; provide a commit message to create a commit"
fi

if [[ -n "$commit_message" ]]; then
  if [[ $# -gt 0 ]]; then
    git add -- "$@"
  else
    git add -A
  fi

  if git diff --cached --quiet; then
    if [[ $has_worktree_changes -eq 1 ]]; then
      die "nothing staged after add; check the provided pathspecs"
    fi
  else
    git commit -m "$commit_message"
  fi
fi

remote_exists=0
if git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
  remote_exists=1
fi

if [[ $remote_exists -eq 1 ]]; then
  git pull --rebase --autostash origin "$branch"
  git push origin HEAD:"$branch"
else
  git push -u origin HEAD:"$branch"
fi
