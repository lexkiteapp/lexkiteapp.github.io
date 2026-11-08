#!/usr/bin/env bash
# Chạy lệnh gh/curl; gặp 5xx tạm thời của GitHub (HTTP 500/502/503/504, "Server Error") thì thử lại tối đa 3 lần (chờ 3s, 9s).
# Lỗi 4xx hay lỗi khác: thoát ngay với mã gốc (vẫn đỏ). Dùng: bash scripts/ci/gh-retry.sh gh workflow run x.yml --ref main -f a=b
# Cùng luật với scripts/lib/retry5xx.mjs; test: scripts/test/retry5xx.mjs.
set -u
SLEEPS=(${GH_RETRY_SLEEPS:-3 9})
out=$(mktemp "${TMPDIR:-/tmp}/ghr.XXXXXX"); trap 'rm -f "$out"' EXIT
for i in 0 1 2; do
  "$@" >"$out" 2>&1; rc=$?
  cat "$out"
  [ "$rc" -eq 0 ] && exit 0
  grep -qE 'HTTP 5[0-9][0-9]|error: 5[0-9][0-9]|Server Error|Bad Gateway|Service Unavailable|Gateway Time-?out' "$out" || exit "$rc"
  [ "$i" -lt 2 ] || exit "$rc"
  echo "::warning::GitHub 5xx tạm thời – thử lại lần $((i + 2))/3 sau ${SLEEPS[$i]}s" >&2
  sleep "${SLEEPS[$i]}"
done
