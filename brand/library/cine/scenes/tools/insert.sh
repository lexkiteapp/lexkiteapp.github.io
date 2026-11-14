#!/bin/bash
# insert.sh <sit> <plate-id e.g. v_1> – v4 1080p 5 s AMBIENT LOOP of an approved empty plate (first = tail = plate → seamless loop, 0-cr splicing in reels).
# Motion from ambient.json (key "<sit>_<plate>" overrides "<sit>"; phrases may name ONLY things visible in the plate, or the model invents them); static camera; no people/text. Dry-run unless GO=1. CAPMIN = balance floor. W = work dir outside the repo.
T="$(cd "$(dirname "$0")" && pwd)"; W=${W:-$TMPDIR/inserts}; mkdir -p "$W/raw" "$W/out"
export KLING_HOME=~/.config/kling NODE_USE_ENV_PROXY=1
bal() { kling account 2>&1 | grep -o '"availableRemainCredits": *[0-9]*' | grep -o '[0-9]*$'; }
s=$1; pl=$2; id=${s}_amb_$pl; U=https://raw.githubusercontent.com/lexkiteapp/lexkite-media/main/cine/scenes/$s/plates/${s}_$pl.png
m=${M:-$(python3 -c "import json;d=json.load(open('$T/ambient.json'));print(d.get('${s}_$pl',d['$s']))")} || exit 2
p="2D flat vector cartoon animation in exactly the art style of the image, STATIC LOCKED CAMERA (no zoom, no pan, no camera movement). The place stays exactly the same; only small ambient motion: $m. Calm, smooth, subtle, natural motion; at the end everything returns exactly to the first frame so the clip loops seamlessly. Absolutely no people, no hands, no animals appearing, no text, letters, numbers or logos, no new objects, no flicker."
cmd=(kling image_to_video --model kling-video-v4_0 --input first_image="$U" --input tail_image="$U" --duration 5 --resolution 1080p --prompt "$p" --poll=1800)
[ "$GO" = 1 ] || { printf '%q ' "${cmd[@]}" | cut -c1-400; echo; exit 0; }
B=$(bal); [ -n "$CAPMIN" ] && [ "$B" -gt "$CAPMIN" ] || { echo "CAP: balance $B floor $CAPMIN"; exit 9; }
"${cmd[@]}" > "$W/raw/$id.raw" 2>&1
A=$(bal); u=$(grep -o '"url_without_watermark": *"[^"]*"' "$W/raw/$id.raw" | head -1 | sed 's/.*: *"//;s/"$//')
[ -n "$u" ] && curl -s -o "$W/out/$id.mp4" "$u"
echo "insert $id kling-video-v4_0 $((B - A)) cr ($B->$A) ok=$([ -s "$W/out/$id.mp4" ] && echo 1 || echo 0)" | tee -a "$T/ledger.txt"
