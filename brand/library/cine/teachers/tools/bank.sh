#!/bin/bash
# bank.sh – gesture bank (docs/specs/teacher-rive-rig.md, docs/CREDIT-RULES.md §1.4): approved still FIRST, then the clip is made FROM it.
#   bank.sh still <id> <ref-url> [pose-ref-url]        -> N stills (9:16 2k) -> $W/out/<id>_s1..N.png + qc_green still each
#        MODEL=kling-image-v3_0 (default) | gemini-3-pro-image | gpt-image-2.5 ; N=2 ; pose-ref = 2nd image showing ONLY the pose
#   bank.sh clip  <id> <first-url> <tail-url> <first.png> <tail.png>
#        VMODEL=kling-video-v2_5 (default) | kling-video-v3_0 | kling-video-v4_0 -> 1080p 5 s first→tail -> $W/out/<id>.mp4 + qc_green clip + sheet
# Dry-run unless GO=1 (prints the exact command). Every real call logs credits (balance before -> after) to ledger.txt.
# W = work dir for raw/out (default: here; put it OUTSIDE the repo, e.g. the session scratchpad).
T="$(cd "$(dirname "$0")" && pwd)"; W=${W:-$T}; mkdir -p "$W/raw" "$W/out"
export KLING_HOME=~/.config/kling NODE_USE_ENV_PROXY=1
PY="$HOME/.config/lexkite/venv312/bin/python"; QC="$T/../../../../../scripts/video/bank3d/qc_green.py"
bal() { kling account 2>&1 | grep -o '"availableRemainCredits": *[0-9]*' | grep -o '[0-9]*$'; }
m=$1; id=$2; MODEL=${MODEL:-kling-image-v3_0}; VMODEL=${VMODEL:-kling-video-v2_5}; N=${N:-2}
if [ "$m" = still ]; then
  p=$(cat "$T/prompts/bank/$id.still.txt")
  cmd=(kling image_to_image --model "$MODEL" --image "$3"); [ -n "$4" ] && cmd+=(--image "$4")
  case $MODEL in kling-*) cmd+=(--imageCount "$N");; *) cmd+=(--image_count "$N");; esac
  cmd+=(--img_resolution 2k --aspect_ratio 9:16 --prompt "$p" --poll=600)
else
  p=$(cat "$T/prompts/bank/$id.clip.txt")
  cmd=(kling image_to_video --model "$VMODEL" --image "$3" --tailImage "$4" --duration 5 --resolution 1080p --enable_audio false --prompt "$p" --poll=1800)
fi
[ "$GO" = 1 ] || { printf '%q ' "${cmd[@]}"; echo; exit 0; }
B=$(bal); [ -n "$CAPMIN" ] && [ "$B" -gt "$CAPMIN" ] || { echo "CAP: balance $B floor $CAPMIN"; exit 9; }
"${cmd[@]}" > "$W/raw/bank_$id.$m.raw" 2>&1
A=$(bal); grep -o '"url_without_watermark": *"[^"]*"\|"urlWithoutWatermark": *"[^"]*"' "$W/raw/bank_$id.$m.raw" | sed 's/.*: *"//;s/"$//' | sort -u > "$W/raw/bank_$id.$m.urls"
if [ "$m" = still ]; then
  i=0; while read u; do i=$((i+1)); curl -s -o "$W/out/${id}_s$i.png" "$u"; echo "== s$i"; "$PY" "$QC" still "$W/out/${id}_s$i.png" "$REFPNG" | tail -2; done < "$W/raw/bank_$id.$m.urls"
else
  u=$(head -1 "$W/raw/bank_$id.$m.urls"); [ -n "$u" ] && curl -s -o "$W/out/$id.mp4" "$u" && "$PY" "$QC" clip "$W/out/$id.mp4" "$5" "$6" "$W/out/${id}_sheet.jpg"
fi
MD=$MODEL; [ "$m" = still ] || MD=$VMODEL
echo "bank $m $id $MD $((B - A)) cr ($B->$A) n=$(wc -l < "$W/raw/bank_$id.$m.urls" | tr -d ' ')" | tee -a "$T/ledger.txt"
