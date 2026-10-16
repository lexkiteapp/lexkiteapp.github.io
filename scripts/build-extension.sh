#!/usr/bin/env bash
# Chép web app vào extension/app để add-on dùng chung mã nguồn với bản web.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Đồng bộ tại chỗ (rsync ghi file tạm rồi đổi tên, xóa file thừa sau cùng): thư mục app không bao giờ trống,
# nên Chrome khởi động lại service worker giữa lúc build cũng không gặp lỗi importScripts.
mkdir -p "$ROOT/extension/app" "$ROOT/extension/icons"
rsync -a --delete-after --exclude '.*' --exclude 'admin.js' --exclude 'admin.css' --exclude 'vendor/jsvectormap' --exclude 'jsvectormap.min.css' "$ROOT/web/index.html" "$ROOT/web/manifest.webmanifest" "$ROOT/web/css" "$ROOT/web/js" "$ROOT/web/icons" "$ROOT/extension/app/"
perl -0pi -e 's#<!--hero-->.*?<!--/hero-->##s; s#\s*<script type="speculationrules">.*?</script>##s' "$ROOT/extension/app/index.html"  # add-on MV3 cấm script nội tuyến – bỏ khung dựng sẵn & speculation rules
rsync -a "$ROOT"/web/icons/icon-{16,32,48,128}.png "$ROOT/web/icons/icon.svg" "$ROOT/extension/icons/"
node "$ROOT/scripts/gen-academic.mjs" >/dev/null  # danh sách từ học thuật B2–C2 cho gạch chân trên trang
echo "✓ Đã build add-on vào $ROOT/extension"
if [[ "${1:-}" == "--zip" ]]; then
  (cd "$ROOT/extension" && rm -f ../lexkite-extension.zip && zip -qr ../lexkite-extension.zip . -x '.*')
  mkdir -p "$ROOT/store" && cp "$ROOT/lexkite-extension.zip" "$ROOT/store/lexkite-extension.zip"
  echo "✓ Đã tạo lexkite-extension.zip (Chrome Web Store / Edge Add-ons) – bản sao trong store/"
fi
