#!/bin/bash
# putmedia.sh <localfile> <name> : PUT to lexkite-media cine/cafe/<name> (creates or updates)
T=$(gh auth token); U=https://api.github.com/repos/lexkiteapp/lexkite-media/contents/cine/cafe/$2
sha=$(curl -s -H "Authorization: Bearer $T" "$U" | grep -o '"sha": "[^"]*' | head -1 | cut -d'"' -f4)
{ printf '{"message":"cine cafe: %s [CF-Pages-Skip]",' "$2"; [ -n "$sha" ] && printf '"sha":"%s",' "$sha"; printf '"content":"'; base64 -i "$1" | tr -d '\n'; printf '"}'; } > $TMPDIR/pm.json
curl -s -X PUT -H "Authorization: Bearer $T" "$U" --data @$TMPDIR/pm.json | grep -o '"path": "[^"]*' | head -1
