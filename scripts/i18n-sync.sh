#!/usr/bin/env bash
# Dịch máy ngay các khóa mới còn thiếu cho mọi ngôn ngữ (chỉ khóa mới), áp bản dịch tay, rồi kiểm chất lượng.
# Chạy trong quy trình đưa lên – không phải chờ GitHub Action.
set -e
cd "$(dirname "$0")/.."
bash scripts/build-i18n.sh >/dev/null 2>&1  # gộp en/*.js → en.js trước
if node scripts/i18n-qa.mjs | grep -q "thiếu [1-9]"; then
  for l in $(grep -v '^#' scripts/i18n-langs.txt); do node --require ./scripts/lib-curl-fetch.cjs scripts/gen-i18n.mjs "$l" >/dev/null 2>&1 || true; done
  node scripts/i18n-fix.mjs >/dev/null
fi
node scripts/i18n-qa.mjs | tail -1
