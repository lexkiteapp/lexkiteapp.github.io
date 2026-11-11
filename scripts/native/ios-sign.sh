#!/usr/bin/env bash
# Ký iOS CỐ ĐỊNH trên CI (Manual): chứng chỉ Apple Distribution (.p12) + hồ sơ App Store từ secret – không tạo chứng chỉ mới mỗi lượt
# (ký Automatic + -allowProvisioningUpdates tạo 1 chứng chỉ Development / máy CI → đầy hạn mức, native-m1 08/11; ci-policy luật 13 chặn).
# Dùng chung: native-release.yml (native/ios) + ios-testflight.yml (Capacitor). Cách tạo/gia hạn secret: docs/CI-SIGNING-IOS.md.
#   ios-sign.sh <project.pbxproj> <bundle>:<TÊN_SECRET_HỒ_SƠ> [...]
# Env: IOS_DIST_P12_BASE64, IOS_DIST_P12_PASSWORD, TEAM, RUNNER_TEMP. Ghi: keychain tạm, hồ sơ đã cài, Release của từng bundle → Manual,
# $RUNNER_TEMP/ExportOptions.plist (app-store-connect, upload, manual). Không in bí mật.
set -euo pipefail
PBX=$1; shift
DOC='xem docs/CI-SIGNING-IOS.md'
: "${IOS_DIST_P12_BASE64:?thiếu secret IOS_DIST_P12_BASE64 – $DOC}" "${IOS_DIST_P12_PASSWORD:?thiếu secret IOS_DIST_P12_PASSWORD – $DOC}" "${TEAM:?}" "${RUNNER_TEMP:?}"

KC="$RUNNER_TEMP/lk-sign.keychain-db"; KP=$(openssl rand -hex 16)
security create-keychain -p "$KP" "$KC"
security set-keychain-settings -lut 3600 "$KC"
security unlock-keychain -p "$KP" "$KC"
printf '%s' "$IOS_DIST_P12_BASE64" | base64 --decode > "$RUNNER_TEMP/dist.p12"
security import "$RUNNER_TEMP/dist.p12" -P "$IOS_DIST_P12_PASSWORD" -A -t cert -f pkcs12 -k "$KC" >/dev/null
rm -f "$RUNNER_TEMP/dist.p12"
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KP" "$KC" >/dev/null
# shellcheck disable=SC2046
security list-keychains -d user -s "$KC" $(security list-keychains -d user | tr -d '"')
security find-identity -v -p codesigning "$KC" | grep -q '"Apple Distribution' || { echo "::error::p12 không chứa danh tính Apple Distribution – $DOC"; exit 1; }

D="$HOME/Library/MobileDevice/Provisioning Profiles"; mkdir -p "$D"
MAP=""; PROF=""
for pair; do
  B=${pair%%:*}; V=${pair#*:}; VAL=${!V:-}
  [ -n "$VAL" ] || { echo "::error::thiếu secret $V (hồ sơ App Store cho $B) – $DOC"; exit 1; }
  P="$RUNNER_TEMP/$B.mobileprovision"; printf '%s' "$VAL" | base64 --decode > "$P"
  security cms -D -i "$P" > "$P.plist"
  U=$(/usr/libexec/PlistBuddy -c 'Print :UUID' "$P.plist"); N=$(/usr/libexec/PlistBuddy -c 'Print :Name' "$P.plist")
  AID=$(/usr/libexec/PlistBuddy -c 'Print :Entitlements:application-identifier' "$P.plist")
  [ "$AID" = "$TEAM.$B" ] || { echo "::error::$V là hồ sơ của $AID, không phải $TEAM.$B"; exit 1; }
  EXP=$(/usr/libexec/PlistBuddy -c 'Print :ExpirationDate' "$P.plist")
  cp "$P" "$D/$U.mobileprovision"; MAP+="$B=$N"$'\n'; PROF+="$B=$P.plist"$'\n'
  echo "hồ sơ $B: $N (hết hạn $EXP)"
done

# Chỉ cấu hình Release của đúng các target có bundle id đã khai (target gói SPM/test không bị gán hồ sơ).
# Trước khi archive: hồ sơ phải có mọi entitlement của target (CODE_SIGN_ENTITLEMENTS) – thiếu thì báo đúng tên, cách sửa ở $DOC.
MAP="$MAP" PROF="$PROF" DOC="$DOC" python3 "$(dirname "$0")/ios-sign-patch.py" "$PBX"

{ echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">'
  echo '<plist version="1.0"><dict>'
  echo '  <key>method</key><string>app-store-connect</string><key>destination</key><string>upload</string>'
  echo "  <key>teamID</key><string>$TEAM</string><key>signingStyle</key><string>manual</string>"
  echo '  <key>signingCertificate</key><string>Apple Distribution</string>'
  echo '  <key>manageAppVersionAndBuildNumber</key><false/><key>uploadSymbols</key><true/>'
  echo '  <key>provisioningProfiles</key><dict>'
  while IFS='=' read -r B N; do [ -n "$B" ] && echo "    <key>$B</key><string>$N</string>"; done <<< "$MAP"
  echo '  </dict>'
  echo '</dict></plist>'; } > "$RUNNER_TEMP/ExportOptions.plist"
plutil -lint "$RUNNER_TEMP/ExportOptions.plist" >/dev/null
