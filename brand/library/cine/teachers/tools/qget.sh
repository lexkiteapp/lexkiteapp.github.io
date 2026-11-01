#!/bin/bash
# qget.sh <name> <generationId> <ext> : download all works to dl/<name>[-i].<ext>; prints status
cd "$(dirname "$0")"; mkdir -p dl raw
KLING_HOME=~/.config/kling NODE_USE_ENV_PROXY=1 kling query_tasks "$2" > raw/q_$1.json 2>&1
us=$(grep -o '"urlWithoutWatermark": "[^"]*' raw/q_$1.json | cut -d'"' -f4); st=$(grep -o '"status": "[^"]*' raw/q_$1.json | head -1 | cut -d'"' -f4)
[ -z "$us" ] && { echo "$1 $st (no urls)"; exit 1; }
n=$(echo "$us" | wc -l | tr -d ' '); i=1
for u in $us; do f=dl/$1.$3; [ $n -gt 1 ] && f=dl/$1-$i.$3; [ -s $f ] || curl -s -o $f "$u"; i=$((i+1)); done; echo "$1 $st $n file(s)"
