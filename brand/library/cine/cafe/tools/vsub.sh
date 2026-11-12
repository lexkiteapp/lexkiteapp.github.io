#!/bin/bash
# vsub.sh <clipid> <firstframe-name-in-cine/cafe> <prompt>  -> raw/<clipid>.raw + ledger line
cd "$(dirname "$0")"; mkdir -p raw
KLING_HOME=~/.config/kling NODE_USE_ENV_PROXY=1 kling image_to_video --model kling-video-v2_5 --image https://raw.githubusercontent.com/lexkiteapp/lexkite-media/main/cine/cafe/$2 --duration 5 --resolution 1080p --enable_audio false --prompt "$3" > raw/$1.raw 2>&1
id=$(grep -o '"generationId": "[^"]*"' raw/$1.raw | head -1 | cut -d'"' -f4); cr=$(grep -o '"creditsConsumed": [0-9.]*' raw/$1.raw | head -1 | grep -o '[0-9.]*$')
echo "video $1 $2 ${cr:-0} $id" | tee -a ledger.txt; [ -z "$id" ] && grep -i -o '"message": "[^"]*"\|error.*' raw/$1.raw | head -3
