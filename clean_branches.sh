#!/usr/bin/env bash
set -euo pipefail

KEEP="main"

echo "Switching to $KEEP..."
git checkout "$KEEP"

echo ""
echo "Local branches to delete:"
git branch | grep -v "^\*\|$KEEP" | sed 's/^[[:space:]]*//'

echo ""
read -r -p "Delete all local branches except '$KEEP'? [y/N] " confirm
if [[ "$confirm" =~ ^[Yy]$ ]]; then
  git branch | grep -v "^\*\|$KEEP" | xargs -r git branch -D
  echo "Local branches deleted."
fi

echo ""
echo "Remote feature branches to delete:"
git branch -r | grep "origin/feature/" | sed 's/[[:space:]]*origin\///'

echo ""
read -r -p "Delete all remote feature/* branches? [y/N] " confirm_remote
if [[ "$confirm_remote" =~ ^[Yy]$ ]]; then
  git branch -r | grep "origin/feature/" | sed 's/[[:space:]]*origin\///' | xargs -r -I {} git push origin --delete {}
  echo "Remote branches deleted."
fi

echo ""
echo "Done. Current branches:"
git branch -a
