#!/bin/zsh
# usage: upload.sh <localpng> <name>  -> prints raw url
T=$(gh auth token); U=https://api.github.com/repos/lexkiteapp/lexkite-media/contents/cine/teachers/$2.png
SHA=$(curl -s -H "Authorization: Bearer $T" $U | python3 -c "import sys,json;print(json.load(sys.stdin).get('sha',''))")
python3 - "$1" "$2" "$SHA" > $TMPDIR/up.json <<'PY'
import sys,base64,json
d={"message":f"cine teachers: {sys.argv[2]} [CF-Pages-Skip]","content":base64.b64encode(open(sys.argv[1],'rb').read()).decode()}
if sys.argv[3]:d["sha"]=sys.argv[3]
print(json.dumps(d))
PY
curl -s -o /dev/null -w "put %{http_code}\n" -X PUT -H "Authorization: Bearer $T" $U --data @$TMPDIR/up.json
R=https://raw.githubusercontent.com/lexkiteapp/lexkite-media/main/cine/teachers/$2.png
sleep 2; curl -s -o /dev/null -w "raw %{http_code}\n" $R; echo $R
