#!/usr/bin/env bash
# Usage: ./create-pr.sh [base-branch]
# Creates a PR from the current branch into base-branch (default: main).
# Commits any staged/unstaged changes, pushes the branch, and opens the PR.
set -euo pipefail

BASE="${1:-main}"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

if [[ "$BRANCH" == "$BASE" ]]; then
  echo "Error: already on '$BASE'. Switch to a feature branch first." >&2
  exit 1
fi

# Derive a human-readable title from the branch name
# e.g. feature/TASK-004-ai-agent-backend -> TASK-004: Ai Agent Backend
RAW="${BRANCH#*/}"                        # strip leading "feature/", "fix/", etc.
TICKET="${RAW%%-*}"                       # first segment is the ticket ID
DESCRIPTION="${RAW#*-}"                   # everything after the first dash
TITLE_DESC="$(echo "$DESCRIPTION" | tr '-' ' ' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2)); print}')"
PR_TITLE="${TICKET}: ${TITLE_DESC}"

# Commit any uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  echo "Uncommitted changes detected. Staging and committing..."
  git add -A
  git commit -m "$(cat <<EOF
${PR_TITLE}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
fi

# Push branch (set upstream if needed)
git push -u origin "$BRANCH"

# Open the PR
gh pr create \
  --base "$BASE" \
  --head "$BRANCH" \
  --title "$PR_TITLE" \
  --body "$(cat <<EOF
## Summary

<!-- Add bullet points describing what this PR does -->

## Test plan

- [ ] Tests pass locally
- [ ] No unintended file changes

EOF
)"
