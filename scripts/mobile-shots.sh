#!/usr/bin/env bash
# Chụp giao diện điện thoại (390×844) các trang chính bằng Chrome headless, dữ liệu mẫu ?demo=1
set -euo pipefail
cd "$(dirname "$0")/.."
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
APP="${APP:-https://vocaband.web.app}"
OUT="${OUT:-qa/mobile}"; mkdir -p "$OUT"
P="$(mktemp -d)"
shot() { "$CH" --headless=new --disable-gpu --hide-scrollbars --no-first-run --user-data-dir="$P" --window-size=390,844 --force-device-scale-factor=2 \
  --user-agent="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" \
  --virtual-time-budget=10000 --screenshot="$OUT/$1.png" "$APP/?demo=1&m=$RANDOM#/$2" >/dev/null 2>&1; echo "✓ $1"; }
shot 00-seed home
for p in ${PAGES:-home path review "dict/resilient" library "read/four-day-week" "practice/match?src=deck" stats write settings}; do shot "$(echo "$p" | tr '/?=:' '----')" "$p"; done
rm -rf "$P"
