#!/bin/bash
# poll CI of a commit until all check-runs done (max ~50 min); print summary
T=$(gh auth token)
SHA=$1
for i in $(seq 1 50); do
  J=$(curl -s -H "Authorization: Bearer $T" "https://api.github.com/repos/lexkiteapp/lexkiteapp.github.io/commits/$SHA/check-runs?per_page=100")
  P=$(echo "$J" | python3 -c "
import sys,json
d=json.load(sys.stdin)
r=d.get('check_runs',[])
print(sum(1 for c in r if c['status']!='completed'), len(r))
")
  set -- $SHA
  PEND=${P% *}
  TOT=${P#* }
  if [ "$PEND" = "0" ] && [ "$TOT" != "0" ]; then break; fi
  sleep 60
done
echo "$J" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for c in d.get('check_runs',[]):
    if c['conclusion'] not in ('success','skipped','neutral'): print('BAD',c['name'],c['status'],c['conclusion'])
print('total',len(d.get('check_runs',[])))
"
curl -s -H "Authorization: Bearer $T" "https://api.github.com/repos/lexkiteapp/lexkiteapp.github.io/commits/$SHA/status" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('status',d.get('state'))
for s in d.get('statuses',[]): print(s['context'],s['state'])
"
