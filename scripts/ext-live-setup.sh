#!/usr/bin/env bash
# Add-on "Load unpacked" luôn là bản mới nhất trên GitHub main – chạy 1 lần trên máy Mac:
#   bash scripts/ext-live-setup.sh
# Tạo ~/lexkite-ext-live (chỉ thư mục extension/ của main, ~20 MB, không ai sửa tay) + tác vụ nền macOS (launchd) cứ 60 giây
# kéo main mới nhất về. Add-on trong Chrome trỏ vào ~/lexkite-ext-live/extension; devAutoReload trong background.js
# thấy version đổi là tự nạp lại → mọi phiên (Claude chính, phiên phụ, Antigravity) đẩy lên main là Chrome có bản mới sau ~1–2 phút.
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"
LIVE="$HOME/lexkite-ext-live"
REPO="https://github.com/lexkiteapp/lexkiteapp.github.io.git"
PLIST="$HOME/Library/LaunchAgents/com.lexkite.ext-live.plist"

if [ ! -d "$LIVE/.git" ]; then
  echo "→ Tạo $LIVE – chỉ thư mục extension/, chỉ bản mới nhất (~20 MB, không tải lịch sử hay phần web/âm thanh)…"
  git clone -q --depth 1 --filter=blob:none --sparse "$REPO" "$LIVE"
  git -C "$LIVE" sparse-checkout set extension
fi
cat > "$LIVE/.sync.sh" <<'SH'
#!/bin/bash
# Đồng bộ ~/lexkite-ext-live với origin/main (thư mục chỉ để Chrome đọc – được phép ghi đè)
cd "$HOME/lexkite-ext-live" || exit 0
git fetch -q --depth 1 origin main 2>/dev/null || exit 0
[ "$(git rev-parse HEAD)" = "$(git rev-parse FETCH_HEAD)" ] && exit 0
git reset -q --hard FETCH_HEAD && git clean -qfd extension/ && echo "$(date '+%F %T') → $(git rev-parse --short HEAD) $(grep -o '"version": "[^"]*"' extension/manifest.json)"
git gc -q --prune=now 2>/dev/null || true   # bỏ bản cũ – thư mục luôn ~20 MB
SH
chmod +x "$LIVE/.sync.sh"

mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<XML
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.lexkite.ext-live</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$LIVE/.sync.sh</string></array>
  <key>StartInterval</key><integer>60</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$LIVE/.sync.log</string>
  <key>StandardErrorPath</key><string>$LIVE/.sync.log</string>
</dict></plist>
XML
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
bash "$LIVE/.sync.sh" || true

echo
echo "✓ Xong. Bước cuối (1 lần): chrome://extensions → Remove bản Lexkite đang Load unpacked →"
echo "  Load unpacked → chọn thư mục:  $LIVE/extension"
echo "  (Từ nay add-on tự lên bản mới ~1–2 phút sau mỗi lần đẩy main. Nhật ký: $LIVE/.sync.log)"
open "$LIVE" 2>/dev/null || true
