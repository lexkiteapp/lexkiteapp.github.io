#!/bin/bash
# wait.sh <name> : poll the latest ledger id for <name> until downloaded or failed (max ~15 min)
cd "$(dirname "$0")"; l=$(grep -E "^(img|video) $1 " ledger.txt | tail -1); id=${l##* }; ext=mp4; [[ $l == img* ]] && ext=png
for i in $(seq 1 75); do r=$(./qget.sh $1 $id $ext 2>&1); echo "$r" | grep -qE "^[^ ]+ (SUCCEED|COMPLETED)" && { echo "$r"; exit 0; }; echo "$r" | grep -qE "^[^ ]+ (FAIL|FAILED)" && { echo "$r"; exit 1; }; sleep 12; done; echo "TIMEOUT $r"
