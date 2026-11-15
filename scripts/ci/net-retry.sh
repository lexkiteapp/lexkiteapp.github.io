#!/usr/bin/env bash
# Chạy một lệnh mạng (gh/curl/git/npx…); lỗi TẠM THỜI thì thử lại tối đa 3 lần (chờ 3s, 9s): HTTP 5xx của GitHub/Cloudflare và lỗi
# socket/DNS/timeout (curl mã 6/7/28/35/52/55/56, "other side closed", "Connection reset", "RPC failed", "early EOF"…).
# Lỗi 4xx hay lỗi khác: thoát ngay với mã gốc (vẫn đỏ). Dùng: bash scripts/ci/net-retry.sh curl -fsS https://…
# Cùng luật với scripts/lib/retry5xx.mjs (retry5xx/fetchRetry); test: scripts/test/retry5xx.mjs. gh-retry.sh = tên cũ, gọi file này.
set -u
SLEEPS=(${NET_RETRY_SLEEPS:-${GH_RETRY_SLEEPS:-3 9}})
N=$((${#SLEEPS[@]} + 1))
out=$(mktemp "${TMPDIR:-/tmp}/netr.XXXXXX"); trap 'rm -f "$out"' EXIT
TRANSIENT='HTTP 5[0-9][0-9]|error: 5[0-9][0-9]|returned error: 5[0-9][0-9]|Server Error|Bad Gateway|Service Unavailable|Gateway Time-?out|\b52[0-4]\b.*(Cloudflare|origin)|other side closed|socket hang up|ECONNRESET|ETIMEDOUT|EAI_AGAIN|Connection reset|Connection timed out|Operation timed out|Could not resolve host|Failed to connect|Empty reply from server|Recv failure|RPC failed|early EOF|unexpected disconnect|remote end hung up unexpectedly|TLS handshake timeout|i/o timeout|fetch failed'
for i in $(seq 0 $((N - 1))); do
  "$@" >"$out" 2>&1; rc=$?
  cat "$out"
  [ "$rc" -eq 0 ] && exit 0
  case "$rc" in 6|7|28|35|52|55|56) ;; *) grep -qE "$TRANSIENT" "$out" || exit "$rc";; esac
  [ "$i" -lt $((N - 1)) ] || exit "$rc"
  echo "::warning::lỗi mạng/5xx tạm thời (mã $rc) – thử lại lần $((i + 2))/$N sau ${SLEEPS[$i]}s" >&2
  sleep "${SLEEPS[$i]}"
done
