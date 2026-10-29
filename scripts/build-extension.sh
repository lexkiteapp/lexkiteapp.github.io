#!/usr/bin/env bash
# Chép web app vào extension/app để add-on dùng chung mã nguồn với bản web.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# --check: dựng extension/app vào thư mục tạm rồi so với bản đã commit – lệch (web sửa mà quên build add-on) → exit 1.
# Chạy trong npm test (scripts/test/ext-sync.mjs) để extension/app không bao giờ trôi khỏi web/.
APP="$ROOT/extension/app"
if [[ "${1:-}" == "--check" ]]; then TMP="$(mktemp -d "${TMPDIR:-/tmp}/extchk.XXXXXX")"; trap 'rm -rf "$TMP"' EXIT; APP="$TMP/app"; fi
# Đồng bộ tại chỗ (rsync ghi file tạm rồi đổi tên, xóa file thừa sau cùng): thư mục app không bao giờ trống,
# nên Chrome khởi động lại service worker giữa lúc build cũng không gặp lỗi importScripts.
mkdir -p "$APP" "$ROOT/extension/icons"
rsync -a --delete-after --delete-excluded --exclude '.*' --exclude 'admin.js' --exclude 'sync-drive.js' --exclude 'admin-*.js' --exclude 'admin-growth.js' --exclude 'admin-social.js' --exclude 'admin-studio.js' --exclude 'admin-drive.js' --exclude 'admin-reports.js' --exclude 'admin-quota.js' --exclude 'admin-drive.js' --exclude 'admin.css' --exclude 'vendor/jsvectormap' --exclude 'jsvectormap.min.css' --exclude '/js/ads/' --exclude '/js/i18n/*/ads.js' --exclude '/teach/*/*-hd.mp4' "$ROOT/web/app/index.html" "$ROOT/web/manifest.webmanifest" "$ROOT/web/css" "$ROOT/web/js" "$ROOT/web/icons" "$ROOT/web/teach" "$ROOT/web/sfx" "$APP/"
# Nhân vật: cùng bộ 2D duy nhất với web (web/teach/, registry characters.json) – add-on trông y hệt web, không giấu giáo viên (docs/CHARACTERS.md)
# App web nằm ở /app/ (web/app/index.html, <base href="/"> + chặn liên kết "#…") – add-on có gốc riêng extension/app/ → bỏ khối <!--base-->
perl -0pi -e 's#<!--base-->.*?<!--/base-->##s; s# media="print" onload="this\.media=.all."##; s# onclick="event\.preventDefault\(\);document\.getElementById\(.view.\)\.focus\(\)"##; s#<!--hero-->.*?<!--/hero-->##s; s#\s*<script type="speculationrules">.*?</script>##s' "$APP/index.html"  # add-on MV3 cấm script nội tuyến – bỏ khung dựng sẵn & speculation rules
# Quảng cáo: add-on KHÔNG BAO GIỜ có quảng cáo (CWS + docs/ADS.md) – js/ads/ (AdSense/AdMob) và chuỗi nhóm 'ads' bị loại khỏi gói; js/ads.js chỉ là vỏ tự tắt trên chrome-extension:.
# Chrome Web Store cấm mã tải từ xa: xóa URL thư viện ngoài (Firebase SDK, AdSense, Turnstile, transformers.js) khỏi bản add-on.
# Các nhánh này vốn đã bị tắt trong add-on (Store.isExtension / CSP), nhưng để nguyên URL thì bản duyệt tự động vẫn gắn cờ.
perl -pi -e 's#https://(?:www\.gstatic\.com/firebasejs/[\d.]+/|pagead2\.googlesyndication\.com/pagead/js/adsbygoogle\.js|challenges\.cloudflare\.com/turnstile/v0/api\.js\?render=explicit|cdn\.jsdelivr\.net/npm/\@huggingface/transformers\@[\d.]+/dist/transformers\.min\.js|www\.youtube\.com/iframe_api)##g' "$APP"/js/*.js
if grep -nE "(import\(|\.src *=|importScripts\().{0,4}['\"\`]https?://" "$ROOT"/extension/*.js "$APP"/js/*.js; then echo "✗ Còn mã tải từ xa trong add-on (xem dòng trên)" >&2; exit 1; fi
if [[ "${1:-}" == "--check" ]]; then
  # So danh sách file + sha (bỏ qua thư mục rỗng: git không lưu chúng, CI checkout không có – vd css/vendor sau khi loại jsvectormap)
  sums() { (cd "$1" && find . -type f -print0 | LC_ALL=C sort -z | xargs -0 shasum -a 256); }
  sums "$APP" > "$TMP/a.sum"; sums "$ROOT/extension/app" > "$TMP/b.sum"
  if ! diff "$TMP/a.sum" "$TMP/b.sum" >&2; then echo "✗ extension/app lệch web/ (dòng trên) → chạy: bash scripts/build-extension.sh rồi commit" >&2; exit 1; fi
  echo "✓ extension/app khớp web/"; exit 0
fi
rsync -a "$ROOT"/web/icons/icon-{16,32,48,128}.png "$ROOT/web/icons/icon.svg" "$ROOT/extension/icons/"
node "$ROOT/scripts/gen-academic.mjs" >/dev/null  # danh sách từ học thuật B2–C2 cho gạch chân trên trang
node "$ROOT/scripts/gen-newtab.mjs" >/dev/null    # dữ liệu thẻ từ ở tab mới (extension/nt/*.json – chỉ dữ liệu thật trong kho)
echo "✓ Đã build add-on vào $ROOT/extension"
if [[ "${1:-}" == "--zip" ]]; then
  (cd "$ROOT/extension" && rm -f ../lexkite-extension.zip && zip -qrX ../lexkite-extension.zip . -x '.*' '*/.*' '*.map' '*.md' '*.local*' '*.zip')
  mkdir -p "$ROOT/store" && cp "$ROOT/lexkite-extension.zip" "$ROOT/store/lexkite-extension.zip"
  echo "✓ Đã tạo lexkite-extension.zip (Chrome Web Store / Edge Add-ons) – bản sao trong store/"
fi
