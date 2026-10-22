#!/bin/bash
# CI (cine-render.yml, after store_shorts.py): upload the new masters + covers of <shorts-checkout> to the Drive pool
# (scripts/video/drive-shorts.mjs – pool placement API, dedupe by sha, resume), so lexkite-shorts only commits recipes/manifests.
# Safety net: if the pool is unreachable, the media of items WITHOUT item.drive.video are force-added to git for this run
# (nothing is ever lost; the next shorts-migrate run moves them to Drive and drops them from the tip again).
# usage: archive_new.sh <shorts-checkout>
R="$1"; [ -d "$R/shorts" ] || { echo "archive_new: no $R/shorts"; exit 0; }
if [ -n "$LEXKITE_DRIVE_CLI_KEY" ] && node scripts/video/drive-shorts.mjs --repo "$R" --pause-ms 800; then
  echo "archive_new: media on the Drive pool – git keeps recipes + manifests only"; exit 0
fi
echo "::warning::Drive pool upload failed or LEXKITE_DRIVE_CLI_KEY missing – keeping this run's media in git (shorts-migrate moves it later)"
python3 - "$R" <<'PY'
import json, os, subprocess, sys
r = sys.argv[1]; idx = json.load(open(f'{r}/shorts/index.json'))
for it in idx.get('items', []):
    for k in ('video', 'cover'):
        rel = it.get(k)
        if rel and os.path.exists(f'{r}/{rel}') and not ((it.get('drive') or {}).get(k) or {}).get('fileId'):
            subprocess.run(['git', '-C', r, 'add', '-f', '--sparse', rel], check=False); print('kept in git:', rel)
PY
exit 0
