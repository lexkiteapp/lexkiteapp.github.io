#!/bin/bash
# usage: .joblog2.sh JOB_ID GREP_PATTERN
T=$(gh auth token)
curl -sL -H "Authorization: Bearer $T" https://api.github.com/repos/lexkiteapp/lexkiteapp.github.io/actions/jobs/$1/logs | grep -i -E "$2" | cut -c1-400 | head -${3:-30}
