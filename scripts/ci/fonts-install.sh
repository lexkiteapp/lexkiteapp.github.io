#!/usr/bin/env bash
# Cài fonts-noto-* KHÔNG qua `apt-get install` (apt treo cả 3 lượt/762 s: job teach-video 135452033221, 135383745870 – 19/11): tải THẲNG đúng tệp .deb
# (bản noble, ghim SHA-256 trong scripts/ci/fonts-debs.tsv – cùng bit với apt) từ nhiều mirror Ubuntu, mỗi mirror có trần chậm/treo (tốc độ < 200 KB/s
# trong 15 s → bỏ, qua mirror kế), rồi `dpkg -i`. Tệp lưu ở FONTS_CACHE_DIR (composite .github/actions/apt gắn actions/cache theo băm của .tsv) → lượt sau không tải.
# Gọi từ scripts/ci/apt-install.sh: in ra stdout CHỈ tên gói chưa xử lý được (không phải font hoặc mọi mirror lỗi) để apt làm đường dự phòng – không bỏ font nào.
#   bash scripts/ci/fonts-install.sh fonts-noto-core fonts-noto-cjk imagemagick   → in "imagemagick"
# Biến: FONTS_CACHE_DIR (~/.cache/lk-fonts) · FONTS_MIRRORS (danh sách URL gốc, cách dấu cách) · FONTS_MAX_TIME (240 s/tệp/mirror) · APT_SUDO (sudo) · FONTS_DPKG (dpkg) · FONTS_TSV.
# Test: scripts/test/apt-install.mjs (curl/dpkg giả: cache, mirror treo → mirror kế, SHA sai → bỏ, hết mirror → trả gói cho apt).
set -u
DIR=$(cd "$(dirname "$0")" && pwd); TSV=${FONTS_TSV:-$DIR/fonts-debs.tsv}; CACHE=${FONTS_CACHE_DIR:-$HOME/.cache/lk-fonts}; SUDO=${APT_SUDO-sudo}; DPKG=${FONTS_DPKG:-dpkg}; MAXT=${FONTS_MAX_TIME:-240}
MIRRORS=${FONTS_MIRRORS:-"http://archive.ubuntu.com/ubuntu http://mirrors.kernel.org/ubuntu http://mirror.math.princeton.edu/pub/ubuntu http://azure.archive.ubuntu.com/ubuntu"}
mkdir -p "$CACHE"; rest=()
if command -v sha256sum >/dev/null 2>&1; then sha() { sha256sum "$1" | cut -d' ' -f1; }; else sha() { shasum -a 256 "$1" | cut -d' ' -f1; }; fi
# Phụ thuộc giữa các .deb (apt tự kéo, dpkg -i thì không): fonts-noto-core cần fonts-noto-mono (19/11: thiếu → dpkg "dependency problems" → apt cũng hỏng "Unmet dependencies").
want_pkgs=(); for p in "$@"; do want_pkgs+=("$p"); case "$p" in fonts-noto-core) want_pkgs+=(fonts-noto-mono);; esac; done
debs=(); names=()
for p in "${want_pkgs[@]}"; do
  row=$(awk -F'\t' -v p="$p" '$1 == p' "$TSV"); [ -n "$row" ] || { rest+=("$p"); continue; }
  rel=$(echo "$row" | cut -f2); want=$(echo "$row" | cut -f3); f="$CACHE/$(basename "$rel")"; got=""
  [ -f "$f" ] && [ "$(sha "$f")" = "$want" ] && got=cache
  if [ -z "$got" ]; then
    for m in $MIRRORS; do
      rm -f "$f.part"
      if curl -fsSL --connect-timeout 15 --max-time "$MAXT" --speed-limit 200000 --speed-time 15 --retry 1 -o "$f.part" "$m/$rel" 2>/dev/null && [ "$(sha "$f.part")" = "$want" ]; then mv "$f.part" "$f"; got=$m; break; fi
      echo "fonts: $p lỗi/chậm/SHA sai ở $m" >&2
    done
    rm -f "$f.part"
  fi
  if [ -n "$got" ]; then debs+=("$f"); names+=("$p"); else echo "::warning::fonts: không tải được $p bằng .deb trực tiếp → để apt thử" >&2; rest+=("$p"); fi
done
# MỘT lệnh dpkg cho cả bộ → tự xếp thứ tự phụ thuộc; hỏng thì gỡ bộ vừa cài dở để apt dự phòng không gặp "Unmet dependencies".
if [ ${#debs[@]} -gt 0 ]; then
  if $SUDO "$DPKG" -i "${debs[@]}" >&2; then echo "✓ fonts: ${names[*]}" >&2
  else echo "::warning::fonts: dpkg -i lỗi → gỡ dở, để apt thử" >&2; $SUDO "$DPKG" --purge --force-depends "${names[@]}" >&2 || true; for n in "${names[@]}"; do case " ${rest[*]:-} " in *" $n "*) ;; *) [ "$n" = fonts-noto-mono ] || rest+=("$n");; esac; done; fi
fi
[ ${#rest[@]} -eq 0 ] || printf '%s\n' "${rest[@]}"
exit 0
