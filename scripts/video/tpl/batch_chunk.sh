#!/bin/bash
# One matrix job of video-tpl1b.yml (docs/VIDEO-TEMPLATES.md §9): for each lesson id → voice (Kokoro, host voice; Rhubarb; word times)
# → render_tpl.py (tpl 1b, lossless master → CRF 18 with the tokens.VIDEO 8 Mbps floor) → qc_tpl.py → rubric_tpl.py (accept = all gates + score ≥ 90).
# Rejected → ONE automatic fix (fix_tpl.py: remux / re-encode / re-render with another plate / host / shorter formula) → qc + rubric again.
# usage: batch_chunk.sh <id,id,...> <out-dir>   env: TD (lessons dir), ND (voice work dir), RHUBARB, KOKORO_NODE_PATH; footage/ = sparse bank
#   NO_AUTOFIX=1 (video-tpl1b-samples.yml): no automatic fix – a rejected sample is fixed by hand at the real cause (host/plate stay as chosen)
set -u
IDS="$1"; OUT="$2"; mkdir -p "$OUT"; : > "$OUT/results.txt"
voice() {   # voice <nd> <lesson.json...> : lines of these lessons in their host's voice → <nd>/vis3
  local nd="$1"; shift; mkdir -p "$nd/ci" "$nd/lessons"
  python3 - "$nd" "$@" <<'PY'
import json, os, sys
nd, files = sys.argv[1], sys.argv[2:]; TD = os.environ['TD']; L = json.load(open(f'{TD}/lines.json')); lines = []
for f in files:
    sp = json.load(open(f)); h6 = sp['hook']['line'][2:8]
    ls = [dict(l, who=sp['host']) for l in L['lines'] if l['id'].startswith(f'n_{h6}_')]; ids = [l['id'] for l in ls]
    sp['recap']['line'] = sp['end_line'] = ids[0]; sp['beats'] = [dict(line=i) for i in ids]   # news_voice.py reads hook/recap/end/beat lines
    json.dump(sp, open(f"{nd}/lessons/{sp['id']}.json", 'w')); lines += ls
json.dump(dict(voices=L['voices'], speed=L.get('speed', 0.88), lines=lines), open(f'{nd}/ci/lines.json', 'w'), indent=1)
print(len(lines), 'lines for', len(files), 'lessons')
PY
  python3 scripts/cine/news_voice.py "$nd" "$(for f in "$@"; do basename "$f" .json; done | paste -sd, -)"
}
render() {   # render <lesson.json> <nd> <out.mp4>
  python3 scripts/video/tpl/render_tpl.py --tpl 1 --crf 18 --lesson "$1" --lines "$2/ci/lines.json" --vo "$2/vis3" \
    --lib footage/anchor --icons icons --fonts brand/social/src/fonts --out "$3" > "$3.render.log" 2>&1 || { tail -5 "$3.render.log"; return 1; }
  ffmpeg -nostdin -v error -y -ss 9 -i "$3" -frames:v 1 -q:v 3 "$3.cover.jpg" || true
}
check() {   # check <out.mp4> → 0 when accepted
  python3 scripts/video/tpl/qc_tpl.py "$1" > "$1.qc.log" 2>&1; python3 scripts/video/tpl/rubric_tpl.py "$1"
}
LF=(); for i in ${IDS//,/ }; do LF+=("$TD/$i.json"); done
voice "$ND" "${LF[@]}" || { for i in ${IDS//,/ }; do echo "$i reject voice-failed" >> "$OUT/results.txt"; done; exit 1; }
for i in ${IDS//,/ }; do
  V="$OUT/$i.mp4"; st=reject; fix=-
  if render "$TD/$i.json" "$ND" "$V" && check "$V"; then st=accept
  else
    if [ -n "${NO_AUTOFIX:-}" ]; then fix=manual
    elif [ -f "$V.rubric.json" ]; then
      A=$(python3 scripts/video/tpl/fix_tpl.py "$V" "$TD/$i.json" "$OUT/fix"); fix=$(echo "$A" | cut -d' ' -f1); echo "fix $i: $A"
      case "$fix" in
        remux|reencode) check "$V" && st=accept ;;
        rerender) NL=$(echo "$A" | cut -d' ' -f2); fix="rerender:$(echo "$A" | cut -d' ' -f3-)"
                  voice "$ND/fix_$i" "$NL" && render "$NL" "$ND/fix_$i" "$V" && check "$V" && st=accept ;;
      esac
    else fix=render-failed; fi
  fi
  sc=$(python3 -c "import json;print(json.load(open('$V.rubric.json'))['score'])" 2>/dev/null || echo 0)
  echo "$i $st $sc $fix" | tee -a "$OUT/results.txt" > "$OUT/$i.result.txt"
done
rm -f "$OUT"/*.mix.wav
grep -q " accept " "$OUT/results.txt"
