#!/usr/bin/env bash
# Đóng gói tiện ích cho Firefox Add-ons (đăng miễn phí) từ bản Chrome: đổi background service worker → background scripts.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
"$ROOT/scripts/build-extension.sh" >/dev/null
OUT="$ROOT/dist-firefox"; rm -rf "$OUT"; cp -R "$ROOT/extension" "$OUT"
python3 - "$OUT/manifest.json" <<'PY'
import json, sys
p = sys.argv[1]; m = json.load(open(p))
m['background'] = {'scripts': ['app/js/data.js', 'app/js/core.js', 'app/js/vi-check.js', 'app/js/dictionary.js', 'background.js']}
m['browser_specific_settings'] = {'gecko': {'id': 'lexkite@lexkite.com', 'strict_min_version': '128.0'}}
json.dump(m, open(p, 'w'), ensure_ascii=False, indent=2)
PY
(cd "$OUT" && rm -f "$ROOT/store/vocaband-firefox.zip" && zip -qr "$ROOT/store/vocaband-firefox.zip" . -x '.*')
rm -rf "$OUT"
echo "✓ Đã tạo store/vocaband-firefox.zip (đăng tại addons.mozilla.org – miễn phí)"
