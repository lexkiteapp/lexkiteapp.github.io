#!/usr/bin/env bash
# prep_scene.sh <footage-root> <scene>  -> prints the scene dir to use as CINE_SCENE_DIR (= <footage-root>/<scene>/tools)
# The footage backup (lexkiteapp/lexkite-footage, private) keeps bank data at the scene root (meta/ dl24/ visemes|vis3/)
# and builder inputs under tools/ (lessons/ lines.json|ci/lines.json end/ foley/ amb_*.wav). lesson5/qa5 expect one flat dir,
# so this links whatever is missing into tools/ (CI checkout only - nothing is copied into the public repo).
set -euo pipefail
F="$(cd "$1" && pwd)"; S="$2"; T="$F/$S/tools"
[ -d "$T/lessons" ] || { echo "no $S/tools/lessons in footage" >&2; exit 1; }
link() {   # link <name> <candidate>...  (first existing candidate wins; existing real entries are kept)
  local n="$1"; shift; [ -e "$T/$n" ] && return 0
  for c in "$@"; do [ -e "$c" ] && { mkdir -p "$(dirname "$T/$n")"; ln -s "$c" "$T/$n"; return 0; }; done; return 0; }
link meta     "$F/$S/meta"
link dl24     "$F/$S/dl24"
link dl       "$F/$S/dl"
link vis3     "$F/$S/vis3" "$F/$S/visemes"
link ci/lines.json "$T/lines.json"
link end      "$F/hotel/tools/end"      # shared Kit end card (non-viral lessons)
link foley    "$F/hotel/tools/foley"    # shared SFX: tone0 / pop / whoosh ...
for n in meta dl24 vis3 ci/lines.json; do [ -e "$T/$n" ] || { echo "missing $S/$n" >&2; exit 1; }; done
ls "$T"/amb_*.wav >/dev/null 2>&1 || echo "warn: no amb_*.wav in $S/tools (lesson must set AMB)" >&2
echo "$T"
