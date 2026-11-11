#!/usr/bin/env bash
# Đặt 4 secret ký iOS cố định từ artifact "ios-signing-public" (lượt Apple signing → create-dist) + khoá riêng trên máy.
#   bash scripts/native/ios-signing-secrets.sh <thư mục artifact đã giải nén> [khoá riêng, mặc định ~/.config/lexkite/ios-dist.key]
# Cần: gh đã đăng nhập (quyền secrets repo), openssl. Việc nhẹ (vài giây), không build. Không in bí mật ra màn hình.
set -euo pipefail
DIR=${1:?thư mục artifact ios-signing-public}; KEY=${2:-$HOME/.config/lexkite/ios-dist.key}
REPO=lexkiteapp/lexkiteapp.github.io
for f in "$DIR/dist.cer" "$DIR/com.lexkite.app.mobileprovision" "$DIR/com.lexkite.app.widget.mobileprovision" "$KEY"; do [ -f "$f" ] || { echo "thiếu $f"; exit 1; }; done
W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
openssl x509 -inform DER -in "$DIR/dist.cer" -out "$W/dist.pem"
# khoá riêng phải khớp chứng chỉ (CSR tạo từ đúng khoá này)
[ "$(openssl x509 -in "$W/dist.pem" -noout -pubkey | openssl sha256)" = "$(openssl pkey -in "$KEY" -pubout | openssl sha256)" ] || { echo "khoá riêng không khớp chứng chỉ"; exit 1; }
PASS=$(openssl rand -hex 24)
# 3DES/SHA1: định dạng p12 mà `security import` của macOS luôn đọc được
openssl pkcs12 -export -legacy -inkey "$KEY" -in "$W/dist.pem" -name "LexKite CI Distribution" -passout "pass:$PASS" -out "$W/dist.p12" 2>/dev/null \
  || openssl pkcs12 -export -inkey "$KEY" -in "$W/dist.pem" -name "LexKite CI Distribution" -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES -macalg sha1 -passout "pass:$PASS" -out "$W/dist.p12"
base64 < "$W/dist.p12" | tr -d '\n' | gh secret set IOS_DIST_P12_BASE64 -R "$REPO"
printf '%s' "$PASS" | gh secret set IOS_DIST_P12_PASSWORD -R "$REPO"
base64 < "$DIR/com.lexkite.app.mobileprovision" | tr -d '\n' | gh secret set IOS_PROFILE_APP_BASE64 -R "$REPO"
base64 < "$DIR/com.lexkite.app.widget.mobileprovision" | tr -d '\n' | gh secret set IOS_PROFILE_WIDGET_BASE64 -R "$REPO"
echo "✓ Đã đặt IOS_DIST_P12_BASE64, IOS_DIST_P12_PASSWORD, IOS_PROFILE_APP_BASE64, IOS_PROFILE_WIDGET_BASE64 cho $REPO"
