#!/bin/bash
# usage: .jobwait.sh JOB_ID [iters] – wait for a job to complete, print conclusion
T=$(gh auth token)
for i in $(seq 1 ${2:-8}); do
  S=$(curl -s -H "Authorization: Bearer $T" https://api.github.com/repos/lexkiteapp/lexkiteapp.github.io/actions/jobs/$1 | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['status'],d['conclusion'])")
  case "$S" in completed*) break;; esac
  sleep 20
done
echo "$S"
