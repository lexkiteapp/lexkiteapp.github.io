#!/bin/bash
# usage: .joblog.sh RUN_ID GREP_PATTERN [job_index]
T=$(gh auth token)
J=$(curl -s -H "Authorization: Bearer $T" https://api.github.com/repos/lexkiteapp/lexkiteapp.github.io/actions/runs/$1/jobs | python3 -c "import sys,json;print(json.load(sys.stdin)['jobs'][${3:-0}]['id'])")
echo job $J
curl -sL -H "Authorization: Bearer $T" https://api.github.com/repos/lexkiteapp/lexkiteapp.github.io/actions/jobs/$J/logs | grep -i -E "$2" | cut -c1-300 | head -40
