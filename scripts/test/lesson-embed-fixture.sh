#!/usr/bin/env bash
# 🎞️ Fixture cho lesson-embed-e2e: lấy bản nhúng mẫu THẬT từ artifact video-motion `motion-<t>-embed-<run>` (PR #191) → <out>/{sq45,wide}.{mp4,poster.jpg,en.vtt,chapters.vtt}.
# Ưu tiên RUN_ID (nếu có) → lượt video-motion mới nhất còn artifact embed (ưu tiên mẫu 'tip'). Không có artifact nào → clip tổng hợp ffmpeg
# CÙNG tên/kích thước (ghi rõ source=synthetic trong fixture.json + cảnh báo CI) để gác web vẫn chạy; khi có artifact thật thì luôn dùng bản thật.
#   GH_TOKEN=… REPO=owner/name [RUN_ID=…] bash scripts/test/lesson-embed-fixture.sh <out>
set -euo pipefail
OUT=${1:-out/lv-fixture}; mkdir -p "$OUT"; API=https://api.github.com/repos/${REPO:-lexkiteapp/lexkiteapp.github.io}
H=(-sSL -H "Authorization: Bearer ${GH_TOKEN:-}" -H "Accept: application/vnd.github+json")
pick() {  # → "<artifact_id> <name>" của artifact embed tốt nhất
  local runs; if [ -n "${RUN_ID:-}" ]; then runs=$RUN_ID; else runs=$(curl "${H[@]}" "$API/actions/workflows/video-motion.yml/runs?per_page=20&status=completed" | python3 -c "import json,sys;print(' '.join(str(r['id']) for r in json.load(sys.stdin).get('workflow_runs',[])))"); fi
  for r in $runs; do
    curl "${H[@]}" "$API/actions/runs/$r/artifacts?per_page=100" | python3 -c "
import json,sys;a=[x for x in json.load(sys.stdin).get('artifacts',[]) if x['name'].startswith('motion-') and '-embed-' in x['name'] and not x['expired']]
a.sort(key=lambda x:(not x['name'].startswith('motion-tip-'),x['name']));print(f\"{a[0]['id']} {a[0]['name']}\" if a else '')" | grep . && return 0
  done; return 1
}
SRC=synthetic
if [ -n "${GH_TOKEN:-}" ] && P=$(pick); then
  ID=${P%% *}; NAME=${P#* }; T=$(mktemp -d); curl "${H[@]}" -o "$T/a.zip" "$API/actions/artifacts/$ID/zip"; (cd "$T" && unzip -q a.zip)
  ok=1; for f in sq45 wide; do
    mp4=$(find "$T" -name "*-$f.mp4" | head -1); jpg=$(find "$T" -name "*-$f.poster.jpg" | head -1)
    cap=$(find "$T" -name "$f.en.vtt" | head -1); chp=$(find "$T" -name "$f.chapters.vtt" | head -1)
    if [ -n "$mp4" ] && [ -n "$jpg" ] && [ -n "$cap" ] && [ -n "$chp" ]; then cp "$mp4" "$OUT/$f.mp4"; cp "$jpg" "$OUT/$f.poster.jpg"; cp "$cap" "$OUT/$f.en.vtt"; cp "$chp" "$OUT/$f.chapters.vtt"; else ok=0; fi
  done
  [ $ok = 1 ] && SRC="artifact:$NAME" || echo "::warning::artifact $NAME thiếu file nhúng – dùng clip tổng hợp"
fi
if [ "$SRC" = synthetic ]; then
  echo "::warning::Chưa có artifact video-motion embed (PR #191) – dùng clip tổng hợp cùng định dạng; chạy lại khi video-motion xong"
  command -v ffmpeg >/dev/null || sudo apt-get install -y -qq ffmpeg >/dev/null
  cap='WEBVTT\n\n00:00:00.300 --> 00:00:03.000\nWe use for with a length of time.\n\n00:00:03.200 --> 00:00:07.500\nWe use since with a starting point.\n\n00:00:07.700 --> 00:00:11.600\nNext step: practice since and for.\n'
  chp='WEBVTT\n\n00:00:00.000 --> 00:00:03.100\nFOR + length of time\n\n00:00:03.100 --> 00:00:07.600\nSINCE + starting point\n\n00:00:07.600 --> 00:00:12.000\nUp next\n'
  for x in "sq45 1080x1350" "wide 1920x1080"; do f=${x% *}; s=${x#* }
    ffmpeg -nostdin -v error -y -f lavfi -i "testsrc2=size=$s:rate=30:duration=12" -f lavfi -i "sine=frequency=440:duration=12" -c:v libx264 -pix_fmt yuv420p -crf 32 -c:a aac -b:a 64k -movflags +faststart -shortest "$OUT/$f.mp4"
    ffmpeg -nostdin -v error -y -ss 4 -i "$OUT/$f.mp4" -frames:v 1 -q:v 4 "$OUT/$f.poster.jpg"
    printf "$cap" > "$OUT/$f.en.vtt"; printf "$chp" > "$OUT/$f.chapters.vtt"
  done
fi
printf '{"source":"%s"}\n' "$SRC" > "$OUT/fixture.json"; ls -la "$OUT"; echo "fixture: $SRC"
