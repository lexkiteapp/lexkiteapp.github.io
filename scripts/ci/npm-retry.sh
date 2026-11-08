#!/usr/bin/env bash
# `npm <lệnh…>` thử lại tối đa 3 lần (nghỉ 10 s, 20 s) – CHỖ DUY NHẤT CI cài gói có postinstall tải nhị phân (sharp, onnxruntime-node, playwright…).
# Lý do (08/11): sharp 504 làm iOS E2E + Build Android đỏ, onnxruntime-node làm Kokoro rớt 2/6 shard – đều là mạng chập chờn một lần, không phải lỗi mã.
# Dùng: bash scripts/ci/npm-retry.sh ci --prefix mobile --no-audit --no-fund   (luật: scripts/test/npm-retry-policy.mjs)
set -uo pipefail
for i in 1 2 3; do
  npm "$@" && exit 0
  [ "$i" = 3 ] && break
  echo "::warning::npm $1 lỗi lần $i/3 – thử lại sau $((i * 10)) s"; sleep $((i * 10))
done
echo "::error::npm $1 lỗi sau 3 lần thử"; exit 1
