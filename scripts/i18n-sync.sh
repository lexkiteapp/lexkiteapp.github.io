#!/usr/bin/env bash
# Dịch máy ngay các khóa mới còn thiếu cho mọi ngôn ngữ (chỉ khóa mới), áp bản dịch tay, rồi kiểm chất lượng.
# Chạy trong quy trình đưa lên – không phải chờ GitHub Action.
set -e
cd "$(dirname "$0")/.."
bash scripts/build-i18n.sh >/dev/null 2>&1  # gộp en/*.js → en.js trước
# Google Translate tạm chặn IP máy này (trang "Sorry…") → bỏ qua, GitHub Action i18n.yml sẽ dịch (khóa thiếu tạm hiện tiếng Anh)
if ! curl -s -m 8 "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=hello" | grep -q '^\[\['; then
  echo "⚠ i18n-sync: Google Translate đang chặn máy này – để GitHub Action dịch"; node scripts/i18n-qa.mjs | tail -1; exit 0
fi
if node scripts/i18n-qa.mjs | grep -q "thiếu [1-9]"; then
  for l in $(grep -v '^#' scripts/i18n-langs.txt); do node --require ./scripts/lib-curl-fetch.cjs scripts/gen-i18n.mjs "$l" >/dev/null 2>&1 || true; done
  node scripts/i18n-fix.mjs >/dev/null
fi
node scripts/i18n-qa.mjs | tail -1
