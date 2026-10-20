#!/usr/bin/env bash
# Chèn harness kiểm thử vào gói web ĐÃ SAO CHÉP vào app iOS (mobile/ios/App/App/public) – chỉ dùng trong workflow ios-e2e.yml,
# không bao giờ chạy trước khi build bản phát hành (ios-testflight.yml chạy build-mobile.sh riêng, sạch).
set -euo pipefail
cd "$(dirname "$0")/../../.."
PUB=mobile/ios/App/App/public
test -f "$PUB/index.html" || { echo "✗ thiếu $PUB/index.html – chạy scripts/build-mobile.sh trước"; exit 1; }
cp scripts/test/ios-e2e/harness.js "$PUB/e2e-harness.js"
# app gốc: build-mobile.sh chép app học (dist/app/index.html) thành www/index.html
for f in "$PUB/index.html"; do
  perl -0pi -e 's#<head>#<head><script src="/e2e-harness.js"></script>#i' "$f"
  grep -q 'e2e-harness.js' "$f" && echo "✓ harness → $f" || { echo "✗ không chèn được harness vào $f"; exit 1; }
done
