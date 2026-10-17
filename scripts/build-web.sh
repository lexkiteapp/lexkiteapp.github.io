#!/usr/bin/env bash
# Build bản web tối ưu vào dist/: rút gọn (minify) JS/CSS bằng esbuild, giữ nguyên cấu trúc file (script cổ điển, không bundle)
bash "$(dirname "$0")/build-i18n.sh"
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/build-notes.mjs
node scripts/build-landing.mjs  # trang giới thiệu tĩnh / + /<lang>/ (app học ở /app/)
rm -rf dist && cp -R web dist
rm -rf dist/audio  # âm thanh phục vụ từ CDN riêng lexkiteapp.github.io (workflow pages.yml) → gói Cloudflare nhẹ, trả chỗ cho blog
# Dùng cache npm riêng (tránh lỗi quyền của ~/.npm)
export npm_config_cache="${TMPDIR:-/tmp}/lexkite-npm-cache"
FILES=$(cd web && find js css sw.js -type f \( -name '*.js' -o -name '*.css' \) | sort)
before=$(cd web && cat $FILES | wc -c)
(cd web && npx -y esbuild@0.24.0 $FILES --minify --charset=utf8 --log-level=warning --outdir=../dist --outbase=. --allow-overwrite)
# Phiên bản bộ nhớ đệm (service worker) theo NỘI DUNG: ai đẩy code (phiên chính, phiên phụ, bot dịch) cũng tự làm mới cache người dùng
H=$(cd web && find js css app/index.html i18n -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.json' \) | sort | xargs cat | shasum | cut -c1-10)
perl -0pi -e "s/(lexkite-\d+)(-[0-9a-f]+)?(['\"])/\1-$H\3/" dist/sw.js
grep -q "lexkite-[0-9]*-$H" dist/sw.js && echo "✓ sw cache: …-$H" || { echo "✗ không gắn được phiên bản cache vào dist/sw.js"; exit 1; }
after=$(cd dist && cat $FILES | wc -c)
gz=$(cd dist && cat $FILES | gzip -9 | wc -c)
echo "✓ dist/: JS+CSS $((before/1024))KB → $((after/1024))KB (gzip ~$((gz/1024))KB tổng; trang đầu chỉ tải phần lõi)"

node scripts/build-seo.mjs && node scripts/build-samples.mjs && node scripts/build-samples-en.mjs && node scripts/build-ads.mjs && node scripts/build-blog.mjs && node scripts/build-sitemap-index.mjs
# Giới hạn Cloudflare Pages miễn phí: 20.000 file/lần deploy → cảnh báo sớm (xem docs/SEO-PLAN.md §12)
n=$(find dist -type f | wc -l | tr -d ' ')
if [ "$n" -gt 19500 ]; then echo "✗ dist có $n file (> 19.500, sát giới hạn 20.000 của Cloudflare Pages) – chuyển blog sang shard riêng theo §12"; exit 1; fi
[ "$n" -gt 15000 ] && echo "⚠ dist có $n file – đã quá 75% giới hạn 20.000 file của Cloudflare Pages, lên kế hoạch tách shard (§12)" || echo "✓ dist: $n file (giới hạn Pages 20.000)"
