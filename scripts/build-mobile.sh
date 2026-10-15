#!/usr/bin/env bash
# Build app Android/iOS từ chính bản web (1 bộ mã): web → dist → mobile/www → cap sync (android/, ios/)
set -euo pipefail
cd "$(dirname "$0")/.."
[[ "${1:-}" == "--skip-web" ]] || ./scripts/build-web.sh
mkdir -p mobile/www
# Trong app gốc không dùng service worker (tài nguyên đã nằm sẵn trong app) → bỏ sw.js
rsync -a --delete --exclude 'sw.js' --exclude 'js/i18n/en/' --exclude 'audio/' --exclude '_headers' --exclude 'admin.html' --exclude 'js/admin.js' --exclude 'css/admin.css' dist/ mobile/www/
cd mobile && npx cap sync >/dev/null && echo "✓ Đã đồng bộ app mobile (android/, ios/) từ bản web mới nhất"
