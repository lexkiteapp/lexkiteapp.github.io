#!/usr/bin/env bash
# Tạo bản AVIF (đúng cỡ gốc ≤ 800w) cho ảnh TOEIC Part 1, giữ nguyên .jpg làm dự phòng (không xoá gì).
# Tuỳ chọn: SMALL=480 thêm bản -480 (ít khi được chọn: thẻ ~340 px × DPR 2–3 ≥ 680 px); WEBP=1 thêm .webp (~3 % trình duyệt không có AVIF đã có .jpg).
# Mỗi bản: dò mức nén NHỎ NHẤT mà SSIM so với ảnh gốc cùng cỡ vẫn ≥ $MIN (mặc định 0.975) → chất lượng không giảm thấy được.
#   bash scripts/toeic/photo-variants.sh web/img/toeic/t6-p1-*.jpg
# Cần: ffmpeg (libsvtav1), cwebp, dwebp (brew install webp). In bảng: tệp · cỡ · kb · ssim; cuối in "w h" để chép vào dữ liệu (imgW/imgH).
set -euo pipefail
MIN=${MIN:-0.975}
TMP=$(mktemp -d "${TMPDIR:-/tmp}/pv.XXXXXX"); trap 'rm -rf "$TMP"' EXIT
ssim() { ffmpeg -nostdin -v error -i "$1" -i "$2" -lavfi "[0]format=yuv420p[a];[1]format=yuv420p[b];[a][b]ssim=stats_file=-" -f null - 2>/dev/null | awk -F'All:' 'NF>1{split($2,a," "); s+=a[1]; n++} END{printf "%.4f", (n?s/n:0)}'; }
for src in "$@"; do
  base=${src%.jpg}
  W0=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$src")
  H0=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$src")
  for w in ${SMALL:-} "$W0"; do
    [ "$w" -gt "$W0" ] && continue
    h=$(( (H0 * w / W0 + 1) / 2 * 2 ))
    ref="$TMP/ref.png"; ffmpeg -nostdin -v error -y -i "$src" -vf "scale=$w:$h:flags=lanczos" "$ref"
    tag=$([ "$w" = "$W0" ] && echo "" || echo "-$w")
    best=""; for crf in 40 38 36 34 32 30 28 26 24 22; do
      ffmpeg -nostdin -v error -y -i "$ref" -vf format=yuv420p -c:v libsvtav1 -svtav1-params "tune=0" -crf $crf -preset 4 -frames:v 1 "$TMP/o.avif" 2>/dev/null
      s=$(ssim "$TMP/o.avif" "$ref"); if awk "BEGIN{exit !($s >= $MIN)}"; then best=$crf; cp "$TMP/o.avif" "$base$tag.avif"; break; fi
    done
    [ -n "$best" ] || { echo "✗ $src $w: AVIF không đạt SSIM $MIN" >&2; exit 1; }
    bq="-"; s2="-"; [ -n "${WEBP:-}" ] && { bq=""; for q in 60 65 70 75 80 85 90 95; do
      cwebp -quiet -q $q -m 6 -sharp_yuv "$ref" -o "$TMP/o.webp"; dwebp -quiet "$TMP/o.webp" -o "$TMP/o.png"
      s2=$(ssim "$TMP/o.png" "$ref"); if awk "BEGIN{exit !($s2 >= $MIN)}"; then bq=$q; cp "$TMP/o.webp" "$base$tag.webp"; break; fi
    done
    [ -n "$bq" ] || { echo "✗ $src $w: WebP không đạt SSIM $MIN" >&2; exit 1; }; }
    printf '%s %sx%s avif crf%s %s KB ssim %s · webp q%s %s KB ssim %s\n' "$(basename "$base")$tag" "$w" "$h" "$best" $(( $(stat -f%z "$base$tag.avif" 2>/dev/null || stat -c%s "$base$tag.avif") / 1024 )) "$s" "$bq" $(( $( [ -f "$base$tag.webp" ] && { stat -f%z "$base$tag.webp" 2>/dev/null || stat -c%s "$base$tag.webp"; } || echo 0) / 1024 )) "$s2"
  done
  echo "  → $(basename "$src") imgW: $W0, imgH: $H0"
done
