#!/usr/bin/env bash
# Upload a trained pron model dir (ONNX + vocab/preprocessor/meta/train_report) as assets of a GitHub prerelease.
#   bash scripts/pron/train/publish.sh [DIR=out/pron-model-a] [TAG=pron-model-a-YYYYMMDD-HHMM]
# Token: $GH_TOKEN / $GITHUB_TOKEN (CI) or `gh auth token`; never printed. Prints model_url=<release download base> (also to $GITHUB_OUTPUT).
set -euo pipefail
DIR=${1:-out/pron-model-a}; TAG=${2:-pron-model-a-$(date -u +%Y%m%d-%H%M)}
REPO=${GITHUB_REPOSITORY:-lexkiteapp/lexkiteapp.github.io}
TOKEN=${GH_TOKEN:-${GITHUB_TOKEN:-$(gh auth token)}}
[ -f "$DIR/meta.json" ] && [ -f "$DIR/vocab.json" ] || { echo "no model in $DIR (meta.json/vocab.json missing)" >&2; exit 1; }
H=(-H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json")
body=$(python3 -c 'import json,sys;print(json.dumps({"tag_name":sys.argv[1],"target_commitish":"main","name":sys.argv[1],"prerelease":True,"body":"Pron candidate A (wav2vec2-base CTC ARPA39), trained on Modal by pron-train.yml. Not shipped until pron-eval gates pass."}))' "$TAG")
rel=$(curl -fsS "${H[@]}" -X POST "https://api.github.com/repos/$REPO/releases" -d "$body")
id=$(printf '%s' "$rel" | python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')
for f in "$DIR"/*.onnx "$DIR"/*.json; do
  [ -f "$f" ] || continue
  curl -fsS "${H[@]}" -H "Content-Type: application/octet-stream" --data-binary @"$f" \
    "https://uploads.github.com/repos/$REPO/releases/$id/assets?name=$(basename "$f")" -o /dev/null
  echo "uploaded $(basename "$f") ($(du -h "$f" | cut -f1))"
done
URL="https://github.com/$REPO/releases/download/$TAG"
echo "model_url=$URL"; [ -n "${GITHUB_OUTPUT:-}" ] && echo "model_url=$URL" >> "$GITHUB_OUTPUT"; true
