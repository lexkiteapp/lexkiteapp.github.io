#!/bin/bash
# cap.sh <next_cost> : refuse when ledger sum + next > 650 (hard cap, teachers task 25/10)
cd "$(dirname "$0")"; S=$(awk '$1=="img"{s+=$3} $1=="video"{s+=$4} END{print s+0}' ledger.txt); echo "spent=$S next=$1 cap=650"; [ $((S+$1)) -le 650 ]
