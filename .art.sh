#!/bin/bash
# usage: .art.sh RUN_ID NAME OUTDIR – download artifact NAME of a run and unzip into OUTDIR
T=$(gh auth token)
A=$(curl -s -H "Authorization: Bearer $T" https://api.github.com/repos/lexkiteapp/lexkiteapp.github.io/actions/runs/$1/artifacts | python3 -c "
import sys,json
for a in json.load(sys.stdin)['artifacts']:
    if a['name']=='$2': print(a['id'])")
mkdir -p "$3"
curl -sL -H "Authorization: Bearer $T" -o "$3/a.zip" https://api.github.com/repos/lexkiteapp/lexkiteapp.github.io/actions/artifacts/$A/zip
cd "$3" && unzip -oq a.zip && ls | grep -v "png\|jpg" | head
