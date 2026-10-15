#!/usr/bin/env bash
# Tạo repo GitHub, đẩy code, bật GitHub Pages (deploy thư mục web/ qua GitHub Actions).
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="${1:-ielts-lexi}"
LOGIN="$(gh api user -q .login)"
ID="$(gh api user -q .id)"

if [ ! -d .git ]; then
  git init -q -b main
  git config user.name "$LOGIN"
  git config user.email "$ID+$LOGIN@users.noreply.github.com"
fi
git add -A
git diff --cached --quiet || git commit -q -m "IELTS Lexi: web app luyện từ vựng IELTS + add-on Chrome

Từ điển phiên âm UK/US, 144 từ IELTS theo 12 chủ đề, flashcard SRS,
từ gắn ngữ cảnh, luyện tập, nhắc học hằng ngày.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

if ! git remote get-url origin >/dev/null 2>&1; then
  gh repo create "$REPO" --public --source . --remote origin --description "Từ điển & flashcard luyện từ vựng IELTS (web app + Chrome add-on)"
fi
git push -u origin main

gh api -X POST "repos/$LOGIN/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 || gh api -X PUT "repos/$LOGIN/$REPO/pages" -f build_type=workflow >/dev/null
sleep 3
gh workflow run pages.yml -R "$LOGIN/$REPO" || true
echo "REPO: https://github.com/$LOGIN/$REPO"
echo "WEB:  https://$LOGIN.github.io/$REPO/"
