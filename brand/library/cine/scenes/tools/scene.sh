#!/bin/bash
# scene.sh <sit> <frame 1-5> <ref1-url> [ref2-url] – one dialogue-scene image (beats.json, prompt.py). Dry-run unless GO=1.
#   f1: ref1 = Ama locked ref, ref2 = Carlos locked ref · f2..f5: ref1 = approved f1 of this situation (same set + cast).
#   MODEL=gemini-3-pro-image (default) · N=1 · AR=16:9 · W = work dir outside the repo · CAPMIN = balance floor (docs/CREDIT-RULES.md)
T="$(cd "$(dirname "$0")" && pwd)"; W=${W:-$TMPDIR/scenes}; mkdir -p "$W/raw" "$W/out"
export KLING_HOME=~/.config/kling NODE_USE_ENV_PROXY=1
bal() { kling account 2>&1 | grep -o '"availableRemainCredits": *[0-9]*' | grep -o '[0-9]*$'; }
s=$1; k=$2; id=${s}_f$k; MODEL=${MODEL:-gemini-3-pro-image}; N=${N:-1}
p=$(python3 "$T/prompt.py" "$s" "$k") || exit 2
cmd=(kling image_to_image --model "$MODEL" --image "$3"); [ -n "$4" ] && cmd+=(--image "$4")
case $MODEL in kling-*) cmd+=(--imageCount "$N");; *) cmd+=(--image_count "$N");; esac
cmd+=(--img_resolution 2k --aspect_ratio "${AR:-16:9}" --prompt "$p" --poll=600)
[ "$GO" = 1 ] || { printf '%q ' "${cmd[@]}"; echo; exit 0; }
B=$(bal); [ -n "$CAPMIN" ] && [ "$B" -gt "$CAPMIN" ] || { echo "CAP: balance $B floor $CAPMIN"; exit 9; }
"${cmd[@]}" > "$W/raw/$id.raw" 2>&1
A=$(bal); grep -o '"url_without_watermark": *"[^"]*"' "$W/raw/$id.raw" | sed 's/.*: *"//;s/"$//' | sort -u > "$W/raw/$id.urls"
i=0; while read u; do i=$((i+1)); curl -s -o "$W/out/${id}_s$i.png" "$u"; done < "$W/raw/$id.urls"
echo "scene $id $MODEL $((B - A)) cr ($B->$A) n=$i" | tee -a "$T/ledger.txt"
