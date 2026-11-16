#!/usr/bin/env bash
# Chọn Xcode 26 + đích iOS Simulator cho native-ios.yml (chạy trong native/ios/LexkiteKit). In "platform=iOS Simulator,id=…" ra stdout.
# Vì sao: ảnh macos-15 không đồng nhất – có máy Xcode mới nhất KHÔNG có runtime iOS (xcodebuild chỉ thấy "Any iOS Simulator Device"),
# có máy simctl liệt kê runtime cũ Xcode không chạy được (exit 70). Thứ tự: mỗi Xcode_26* từ mới → cũ, lấy đích từ CHÍNH xcodebuild
# (pick-sim.py); không có → tạo máy giả lập (simctl create) trên runtime iOS mới nhất rồi thử lại. Hết cách → rỗng (workflow đỏ rõ ràng).
# Dùng: DEST=$(bash scripts/native/ios-sim.sh [--name "<máy>"])   – mặc định iPhone 17 > 16 > 15.
set -o pipefail   # không -u: bash 3.2 của macOS coi mảng rỗng là unbound
HERE="$(cd "$(dirname "$0")" && pwd)"
NAME_ARGS=("$@")
WANT="iPhone 17"; [ "${1:-}" = "--name" ] && WANT="${2%\*}"
scheme() { xcodebuild -list -json 2>/dev/null | python3 -c 'import json,sys;s=json.load(sys.stdin)["workspace"]["schemes"];print(next((x for x in s if x.endswith("-Package")),s[0]))'; }
pick() { xcodebuild -showdestinations -scheme "$1" 2>/dev/null | python3 "$HERE/pick-sim.py" "${NAME_ARGS[@]}"; }
for X in $(ls -d /Applications/Xcode_26*.app 2>/dev/null | sort -Vr); do
  sudo xcode-select -s "$X/Contents/Developer" || continue
  S=$(scheme); [ -n "$S" ] || continue
  D=$(pick "$S"); if [ -n "$D" ]; then echo "Xcode: $X · $D" >&2; echo "$D"; exit 0; fi
  # Không có máy hợp lệ: tạo trên runtime iOS mới nhất mà Xcode này thấy
  RT=$(xcrun simctl list runtimes -j 2>/dev/null | python3 -c 'import json,sys;r=[x for x in json.load(sys.stdin)["runtimes"] if x.get("isAvailable") and x["identifier"].split(".")[-1].startswith("iOS")];r.sort(key=lambda x:[int(p) for p in x["version"].split(".")]);print(r[-1]["identifier"] if r else "")')
  if [ -n "$RT" ]; then
    for T in "$WANT" "iPhone 17" "iPhone 16"; do
      DT=$(xcrun simctl list devicetypes -j | python3 -c "import json,sys;t=[x['identifier'] for x in json.load(sys.stdin)['devicetypes'] if x['name'].startswith('''$T''')];print(t[0] if t else '')")
      [ -n "$DT" ] && xcrun simctl create "$T" "$DT" "$RT" >/dev/null 2>&1 && break
    done
    D=$(pick "$S"); if [ -n "$D" ]; then echo "Xcode: $X · tạo máy trên $RT · $D" >&2; echo "$D"; exit 0; fi
  fi
  echo "::warning::$X: không có đích iOS Simulator hợp lệ" >&2
done
exit 1
