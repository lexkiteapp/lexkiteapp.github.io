#!/usr/bin/env bash
# Build bản web tối ưu vào dist/: rút gọn (minify) JS/CSS bằng esbuild, giữ nguyên cấu trúc file (script cổ điển, không bundle)
bash "$(dirname "$0")/build-i18n.sh"
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/build-notes.mjs
rm -rf dist && cp -R web dist
# Dùng cache npm riêng (tránh lỗi quyền của ~/.npm)
export npm_config_cache="${TMPDIR:-/tmp}/vocaband-npm-cache"
FILES=$(cd web && find js css sw.js -type f \( -name '*.js' -o -name '*.css' \) | sort)
before=$(cd web && cat $FILES | wc -c)
(cd web && npx -y esbuild@0.24.0 $FILES --minify --charset=utf8 --log-level=warning --outdir=../dist --outbase=. --allow-overwrite)
after=$(cd dist && cat $FILES | wc -c)
gz=$(cd dist && cat $FILES | gzip -9 | wc -c)
echo "✓ dist/: JS+CSS $((before/1024))KB → $((after/1024))KB (gzip ~$((gz/1024))KB tổng; trang đầu chỉ tải phần lõi)"

node scripts/build-seo.mjs && node scripts/build-samples.mjs && node scripts/build-samples-en.mjs
