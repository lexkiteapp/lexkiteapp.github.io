#!/bin/bash
# Commit tệp SINH RA dùng chung (chỉ mục 1 dòng như web/js/listen/audio-index.js) lên main: mỗi lần thử lấy main mới nhất rồi chạy lại lệnh
# sinh (idempotent, đọc kết quả còn trên đĩa: .media-out, .sa/res-*.json) + build add-on (bản add-on phải khớp web/, scripts/test/ext-sync.mjs).
# Vòng thử/backoff/reset/[skip ci]: scripts/ci/push-main.sh (một nơi duy nhất). COMMIT_REGEN_NO_EXT=1 = tệp sinh không thuộc web/ (sổ đăng ký).
#   bash scripts/ci/commit-regen.sh "<thông điệp>" "<lệnh sinh>" <tệp/thư mục…>
set -u
MSG=$1; REGEN=$2; shift 2
[ "${COMMIT_REGEN_NO_EXT:-}" = 1 ] || REGEN="($REGEN) && bash scripts/build-extension.sh >/dev/null"
PUSH_MAIN_REGEN="$REGEN" exec bash "$(dirname "$0")/push-main.sh" "$MSG" "$@"
