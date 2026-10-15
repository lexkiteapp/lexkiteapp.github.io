#!/usr/bin/env bash
# Tạo ảnh cho Chrome Web Store bằng Chrome chạy ngầm (headless): promo tiles + 5 ảnh chụp màn hình 1280×800.
set -euo pipefail
cd "$(dirname "$0")/.."
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
APP="${APP:-https://vocaband.web.app}"
PROFILE="$(mktemp -d)"
shot() { # file  w,h  url
  "$CH" --headless=new --disable-gpu --hide-scrollbars --no-first-run --user-data-dir="$PROFILE" \
    --window-size="$2" --virtual-time-budget=12000 --force-prefers-reduced-motion --lang=vi \
    --screenshot="$1" "$3" >/dev/null 2>&1
  echo "✓ $1"
}
shot store/promo-small-440x280.png 440,280 "file://$PWD/store/promo.html?w=440&h=280"
shot store/promo-marquee-1400x560.png 1400,560 "file://$PWD/store/promo.html?w=1400&h=560"
shot store/tmp-seed.png 1280,800 "$APP/?demo=1#/home"   # nạp dữ liệu mẫu vào profile tạm
shot store/screenshot-1.png 1280,800 "$APP/?demo=1#/home"
shot store/screenshot-2.png 1280,800 "$APP/?demo=1#/dict/resilient"
shot store/screenshot-3.png 1280,800 "$APP/?demo=1#/library"
shot store/screenshot-4.png 1280,800 "$APP/?demo=1#/stats"
shot store/screenshot-5.png 1280,800 "$APP/?demo=1#/read/space-debris"
rm -f store/tmp-seed.png; rm -rf "$PROFILE"
cp web/icons/icon-128-store.png store/icon-128.png
echo "Xong – ảnh nằm trong thư mục store/"
