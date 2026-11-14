#!/bin/bash
# usage: .runwait.sh RUN_ID [max_iter] – wait for a workflow run to complete (4 s steps)
T=$(gh auth token)
for i in $(seq 1 ${2:-40}); do
  S=$(curl -s -H "Authorization: Bearer $T" https://api.github.com/repos/lexkiteapp/lexkiteapp.github.io/actions/runs/$1 | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['status'],d['conclusion'])")
  case "$S" in completed*) break;; esac
  sleep 20
done
echo "$S"
