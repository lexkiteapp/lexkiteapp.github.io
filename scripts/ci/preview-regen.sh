#!/usr/bin/env bash
# Chạy lại các bộ SINH một lần sau khi gộp mọi PR nhãn preview (preview-site.yml) – cùng thứ tự prepush/build: kết quả gộp từ nhiều PR phải khớp nguồn.
# Dùng: bash scripts/ci/preview-regen.sh [FONTS=1]  (FONTS=1 hoặc PREVIEW_STATE/fonts tồn tại: dựng lại font icon subset – cần mạng tới Google Fonts)
# Mỗi bước lỗi chỉ cảnh báo (không chặn): bước build site phía sau là cổng thật.
cd "$(dirname "$0")/../.."
LOG="${TMPDIR:-/tmp}/regen-step.log"
step() { local n="$1"; shift; if "$@" >"$LOG" 2>&1; then echo "✓ regen: $n"; else echo "::warning::regen '$n' lỗi (bỏ qua)"; tail -5 "$LOG"; fi; }
step sync-triage    node scripts/ci/sync-triage.mjs
step i18n-build     bash scripts/build-i18n.sh
step i18n-fix       node scripts/i18n-fix.mjs
if [ "${FONTS:-}" = 1 ] || [ -s "${PREVIEW_STATE:-/nonexistent}/fonts" ]; then
  [ -d node_modules/tailwindcss ] || npm i --no-save --no-audit --no-fund tailwindcss@3.4.17 >/dev/null 2>&1
  step icon-font    node scripts/build-stitch-css.mjs --fonts   # msym.json/woff2 theo danh sách icon hợp + ghi lại web/css/st-*.css
else
  step stitch-css   node scripts/build-stitch-css.mjs
fi
step extension      bash scripts/build-extension.sh
step jobs           node scripts/jobs/gen.mjs --write
for c in scripts/codemap.mjs scripts/gen-codemap.mjs scripts/docs/codemap.mjs; do [ -f "$c" ] && step codemap node "$c"; done
exit 0
