#!/usr/bin/env bash
# Tải trước MỌI .deb (kể cả phụ thuộc) của gói apt yêu cầu, KHÔNG qua mirror mặc định treo: apt tự liệt kê URI + SHA-256 (`apt-get install --print-uris`,
# nguồn tin cậy là chỉ mục apt, không ghim tay → không lỗi thời), mỗi tệp thử mirror gốc rồi mirror dự phòng, mỗi lần có trần chậm/treo
# (< 200 KB/s trong 15 s → bỏ), kiểm SHA-256, ghi vào APT_CACHE_DIR (cache chung actions/cache). `apt-get install` sau đó chỉ giải nén .deb có sẵn.
# Mở rộng cơ chế fonts-install.sh (ghim tay, chỉ font) cho imagemagick/tesseract/librsvg/espeak/libgl*/webkit-deps… Gọi từ scripts/ci/apt-install.sh.
#   APT_CACHE_DIR=~/.cache/apt-debs bash scripts/ci/apt-prefetch.sh imagemagick tesseract-ocr
# Không bao giờ làm đỏ job (exit 0): thiếu tệp nào thì apt tải nốt như trước. Biến: APT_CACHE_DIR (bắt buộc) · APT_SUDO · APT_GET · APT_MIRRORS · APT_FETCH_MAX_TIME (120 s/tệp/mirror).
# Test: scripts/test/apt-install.mjs (apt-get/curl giả: cache, mirror treo → mirror kế, SHA sai → bỏ, tệp có sẵn không tải lại).
set -u
CACHE=${APT_CACHE_DIR:-}; [ -n "$CACHE" ] && [ $# -gt 0 ] || exit 0
SUDO=${APT_SUDO-sudo}; APT=${APT_GET:-apt-get}; MAXT=${APT_FETCH_MAX_TIME:-120}
MIRRORS=${APT_MIRRORS:-"http://archive.ubuntu.com/ubuntu http://mirrors.kernel.org/ubuntu http://mirror.math.princeton.edu/pub/ubuntu http://azure.archive.ubuntu.com/ubuntu"}
mkdir -p "$CACHE/partial"
if command -v sha256sum >/dev/null 2>&1; then sha() { sha256sum "$1" | cut -d' ' -f1; }; else sha() { shasum -a 256 "$1" | cut -d' ' -f1; }; fi
uris=$($SUDO "$APT" install --print-uris -qq -y --no-install-recommends "$@" 2>/dev/null | grep "^'") || true
[ -n "$uris" ] || { echo "apt-prefetch: không có URI để tải (đã đủ gói hoặc chỉ mục trống)" >&2; exit 0; }
got=0; miss=0
while IFS= read -r line; do
  url=$(echo "$line" | cut -d"'" -f2); name=$(echo "$line" | cut -d' ' -f2); want=$(echo "$line" | grep -o 'SHA256:[0-9a-f]*' | cut -d: -f2)
  [ -n "$url" ] && [ -n "$name" ] && [ -n "$want" ] || continue
  f="$CACHE/$name"
  if [ -f "$f" ] && [ "$(sha "$f")" = "$want" ]; then got=$((got + 1)); continue; fi
  rel=${url#*://*/}; case "$url" in *archive.ubuntu.com/ubuntu/*|*/ubuntu/pool/*) rel=pool/${url#*/pool/};; esac
  ok=""; for cand in "$url" $(for m in $MIRRORS; do echo "$m/$rel"; done); do
    rm -f "$f.part"
    if curl -fsSL --connect-timeout 10 --max-time "$MAXT" --speed-limit 200000 --speed-time 15 -o "$f.part" "$cand" 2>/dev/null && [ "$(sha "$f.part")" = "$want" ]; then mv "$f.part" "$f"; ok=1; break; fi
  done; rm -f "$f.part"
  if [ -n "$ok" ]; then got=$((got + 1)); else miss=$((miss + 1)); echo "::warning::apt-prefetch: không tải được $name từ mirror nào → apt tải nốt" >&2; fi
done <<< "$uris"
echo "✓ apt-prefetch: $got .deb sẵn trong cache, $miss để apt tải" >&2
exit 0
