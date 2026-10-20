#!/usr/bin/env bash
# Build app Android/iOS từ chính bản web (1 bộ mã): web → dist → mobile/www → cap sync (android/, ios/)
set -euo pipefail
cd "$(dirname "$0")/.."
[[ "${1:-}" == "--skip-web" ]] || ./scripts/build-web.sh
mkdir -p mobile/www
# Trong app gốc không dùng service worker (tài nguyên đã nằm sẵn trong app) → bỏ sw.js
# js/i18n/en/ PHẢI có trong app: nhóm dịch tải lười (usage, report, anki, share, export, account…) – thiếu → trang Cách dùng từ trắng, các hộp thoại hiện tiếng Việt
rsync -a --delete --exclude 'sw.js' --exclude 'audio/' --exclude '_headers' --exclude 'admin.html' --exclude 'packs/' --exclude 'js/admin.js' --exclude 'css/admin.css' --exclude 'js/vendor/jsvectormap/' --exclude 'css/vendor/jsvectormap.min.css' --exclude '/app/' dist/ mobile/www/
# App web ở dist/app/index.html (dist/index.html là trang giới thiệu tĩnh) → app gốc mở thẳng app học ở www/index.html; bỏ khối <!--base--> (gốc của app là www/)
cp dist/app/index.html mobile/www/index.html && perl -0pi -e 's#<!--base-->.*?<!--/base-->##s' mobile/www/index.html
cd mobile && npx cap sync >/dev/null && echo "✓ Đã đồng bộ app mobile (android/, ios/) từ bản web mới nhất"
