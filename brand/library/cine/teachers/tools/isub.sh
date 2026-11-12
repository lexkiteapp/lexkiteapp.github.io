#!/bin/bash
# isub.sh <name> <count> <ratio> <prompt> <ref1.png> [ref2.png ...] : kling-image-v3_0 image_to_image (refs from lexkite-media local files) -> ledger
cd "$(dirname "$0")"; n=$1; c=$2; ar=$3; p=$4; shift 4; args=()
for r in "$@"; do args+=(--image "$r"); done
if [ -n "$DRY" ]; then printf '%q ' kling image_to_image --model ${MODEL:-kling-image-v3_0} "${args[@]}" --img_resolution ${RES:-2k} --aspect_ratio $ar --imageCount $c --prompt "$p"; echo; exit 0; fi
KLING_HOME=~/.config/kling NODE_USE_ENV_PROXY=1 kling image_to_image --model ${MODEL:-kling-image-v3_0} "${args[@]}" --img_resolution ${RES:-2k} --aspect_ratio $ar --imageCount $c --prompt "$p" > raw/img_$n.raw 2>&1
id=$(grep -o '"generationId": "[^"]*"' raw/img_$n.raw | head -1 | cut -d'"' -f4); cr=$(grep -o '"creditsConsumed": [0-9.]*' raw/img_$n.raw | head -1 | grep -o '[0-9.]*$')
echo "img $n ${cr:-?} $id" | tee -a ledger.txt; [ -z "$id" ] && tail -5 raw/img_$n.raw
exit 0
