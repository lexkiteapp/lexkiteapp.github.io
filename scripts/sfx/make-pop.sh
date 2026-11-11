#!/usr/bin/env bash
# Sinh web/sfx/pop.mp3 – tiếng "bốp" mềm khi bong bóng giáo viên hiện (docs/specs/teacher-bubble.md). Tự tổng hợp (CC0), 0,18 s, mono, ≤ 6 KB,
# chuẩn hóa −16 LUFS (đo trên bản lặp 10× vì clip < 0,4 s không đủ cửa sổ ebur128; đo lại SAU khi nén mp3 và chỉnh lần 2). Cần ffmpeg.
# Chạy: bash scripts/sfx/make-pop.sh [đường-dẫn-ra]
set -euo pipefail
OUT="${1:-web/sfx/pop.mp3}"; T="$(mktemp -d "${TMPDIR:-/tmp}/pop.XXXXXX")"; trap 'rm -rf "$T"' EXIT
# sin quét 620→420 Hz (pha = 2π(620t − 555,6t²)), tắt dần mũ; vào 4 ms, ra 30 ms (không click)
ffmpeg -v error -y -f lavfi -i "aevalsrc='0.9*sin(2*PI*(620*t-555.6*t*t))*exp(-t*22)':d=0.18:s=44100" -af "afade=t=in:d=0.004,afade=t=out:st=0.15:d=0.03" "$T/raw.wav"
LOUD() { ffmpeg -nostats -stream_loop 9 -i "$1" -af ebur128 -f null - 2>&1 | awk '/^ *I:/{v=$2} END{print v}'; }
enc() { ffmpeg -v error -y -i "$T/raw.wav" -af "volume=${1}dB,alimiter=limit=0.89" -ac 1 -ar 44100 -c:a libmp3lame -b:a 64k "$OUT"; }
G="$(awk -v l="$(LOUD "$T/raw.wav")" 'BEGIN{printf "%.2f", -16 - l}')"; enc "$G"
G="$(awk -v g="$G" -v l="$(LOUD "$OUT")" 'BEGIN{printf "%.2f", g + (-16 - l)}')"; enc "$G"
echo "pop: gain ${G} dB → $(LOUD "$OUT") LUFS, $(wc -c < "$OUT") bytes"
