#!/bin/bash
# putmedia.sh <local file> <path in lexkite-media> : GitHub contents API PUT (creates/updates) -> prints raw URL (Kling cannot upload local files from the sandbox)
f=$1; p=$2; TK=$(gh auth token); A=https://api.github.com/repos/lexkiteapp/lexkite-media/contents/$p
sha=$(curl -s -H "Authorization: Bearer $TK" "$A" | python3 -c "import json,sys;print(json.load(sys.stdin).get('sha',''))" 2>/dev/null)
python3 -c "import base64,json,sys;d={'message':'teachers bank ref '+sys.argv[2],'content':base64.b64encode(open(sys.argv[1],'rb').read()).decode()}
if sys.argv[3]: d['sha']=sys.argv[3]
json.dump(d,open('/tmp/claude-501/pm.json','w'))" "$f" "$p" "$sha"
code=$(curl -s -o /tmp/claude-501/pm.out -w '%{http_code}' -X PUT -H "Authorization: Bearer $TK" -H "Content-Type: application/json" --data-binary @/tmp/claude-501/pm.json "$A"); rm -f /tmp/claude-501/pm.json
[ "$code" = 200 -o "$code" = 201 ] && echo "https://raw.githubusercontent.com/lexkiteapp/lexkite-media/main/$p" || { echo "PUT $code"; head -c 300 /tmp/claude-501/pm.out; exit 1; }
