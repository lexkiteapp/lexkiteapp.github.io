#!/bin/bash
# getall.sh name... : poll qget for ledger entries (img -> png, video -> mp4) until all COMPLETED (max ~8 min)
cd "$(dirname "$0")"
for t in $(seq 1 40); do left=0
  for n in "$@"; do l=$(grep -E "^(img|video) $n " ledger.txt | tail -1); id=${l##* }; ext=mp4; [[ $l == img* ]] && ext=png
    [ -f done_$n ] && continue; r=$(./qget.sh $n $id $ext 2>&1); if echo "$r" | grep -q -E "COMPLETED|SUCCEED"; then touch done_$n; echo "$r"; elif echo "$r" | grep -q -i fail; then echo "$r"; touch done_$n; else left=1; fi; sleep 1; done
  [ $left = 0 ] && break; sleep 12; done
