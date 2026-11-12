#!/bin/bash
# clips.sh <id:still-path-in-media> ... – v4 gesture clips one by one (first = tail = locked o3 ref, keyframe_1 = approved still), qc_green each;
# 2 consecutive gate FAILs → stop (docs/CREDIT-RULES.md §6). Eye sheet review stays mandatory before banking.
T="$(cd "$(dirname "$0")" && pwd)"; M=https://raw.githubusercontent.com/lexkiteapp/lexkite-media/main/cine/teachers; fails=0
for a in "$@"; do id=${a%%:*}; st=${a#*:}; who=ama; [[ $id == gc* ]] && who=carlos
  out=$(KEY=$M/$st VMODEL=kling-video-v4_0 "$T/bank.sh" clip "$id" $M/green_${who}_o3_ref.png $M/green_${who}_o3_ref.png "$REFDIR/green_${who}_o3_ref.png" "$REFDIR/green_${who}_o3_ref.png" 2>&1)
  echo "$out" | tail -3; echo "$out" | grep -q "RESULT PASS" && fails=0 || fails=$((fails+1))
  [ $fails -ge 2 ] && { echo "STOP: 2 consecutive fails"; exit 3; }
done
