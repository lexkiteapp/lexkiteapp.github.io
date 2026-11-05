#!/bin/bash
# bank.sh – gesture bank (docs/specs/teacher-rive-rig.md, docs/CREDIT-RULES.md §1.4): approved still FIRST, then the clip is made FROM it.
#   bank.sh still <id> <ref-url>                       -> 2 stills (kling-image-v3_0 2k 9:16) -> out/<id>_s1/2.png + qc_green still each
#   bank.sh clip  <id> <first-url> <tail-url> <first.png> <tail.png>
#                                                      -> v2_5 1080p 5 s with --tailImage -> out/<id>.mp4 + qc_green clip + sheet
# Dry-run unless GO=1 (prints the exact command). Every real call logs credits (balance before -> after) to ledger.txt.
cd "$(dirname "$0")"; mkdir -p raw out
export KLING_HOME=~/.config/kling NODE_USE_ENV_PROXY=1
PY="$HOME/.config/lexkite/venv312/bin/python"; QC=../../../../../scripts/video/bank3d/qc_green.py
bal() { kling account 2>&1 | grep -o '"availableRemainCredits": *[0-9]*' | grep -o '[0-9]*$'; }
m=$1; id=$2
if [ "$m" = still ]; then
  p=$(cat prompts/bank/$id.still.txt)
  cmd=(kling image_to_image --model kling-image-v3_0 --image "$3" --img_resolution 2k --aspect_ratio 9:16 --imageCount 2 --prompt "$p" --poll=300)
else
  p=$(cat prompts/bank/$id.clip.txt)
  cmd=(kling image_to_video --model kling-video-v2_5 --image "$3" --tailImage "$4" --duration 5 --resolution 1080p --enable_audio false --prompt "$p" --poll=1200)
fi
[ "$GO" = 1 ] || { printf '%q ' "${cmd[@]}"; echo; exit 0; }
B=$(bal); [ -n "$CAPMIN" ] && [ "$B" -gt "$CAPMIN" ] || { echo "CAP: balance $B floor $CAPMIN"; exit 9; }
"${cmd[@]}" > raw/bank_$id.$m.raw 2>&1
A=$(bal); grep -o '"url_without_watermark": *"[^"]*"' raw/bank_$id.$m.raw | sed 's/.*: *"//;s/"$//' | sort -u > raw/bank_$id.$m.urls
if [ "$m" = still ]; then
  i=0; while read u; do i=$((i+1)); curl -s -o out/${id}_s$i.png "$u"; echo "== s$i"; "$PY" $QC still out/${id}_s$i.png "$REFPNG" | tail -2; done < raw/bank_$id.$m.urls
else
  u=$(head -1 raw/bank_$id.$m.urls); [ -n "$u" ] && curl -s -o out/$id.mp4 "$u" && "$PY" $QC clip out/$id.mp4 "$5" "$6" out/${id}_sheet.jpg
fi
echo "bank $m $id $((B - A)) cr ($B->$A) n=$(wc -l < raw/bank_$id.$m.urls | tr -d ' ')" | tee -a ledger.txt
