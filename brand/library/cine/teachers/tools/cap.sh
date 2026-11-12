#!/bin/bash
# cap.sh <next_cost> : refuse when ledger sum + next > CAP (650 task 25/10; 754 = 524 + 230 board-v2 task 26/10)
cd "$(dirname "$0")"; S=$(awk '$1=="img"{s+=$3} $1=="video"{s+=$4} END{print s+0}' ledger.txt); echo "spent=$S next=$1 cap=${CAP:-754}"; [ $((S+$1)) -le ${CAP:-754} ]
