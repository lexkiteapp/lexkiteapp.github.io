#!/usr/bin/env bash
# `npm <lệnh…>` thử lại tối đa 3 lần (nghỉ 30 s, 60 s – mạng chập chờn thường kéo vài chục giây; 09/11 nghỉ 10/20 s vẫn trùng đợt lỗi) – CHỖ DUY NHẤT CI cài gói có postinstall tải nhị phân (sharp, onnxruntime-node, playwright…).
# Lý do (08/11): sharp 504 làm iOS E2E + Build Android đỏ, onnxruntime-node làm Kokoro rớt 2/6 shard – đều là mạng chập chờn một lần, không phải lỗi mã.
# Dùng: bash scripts/ci/npm-retry.sh ci --prefix mobile --no-audit --no-fund   (luật: scripts/test/npm-retry-policy.mjs)
# onnxruntime-node (kokoro-js) mặc định tải THÊM bản GPU/CUDA (~hàng trăm MB, onnxruntime-linux-x64-gpu) từ GitHub releases → 504 cả 3 lần thử (08/11);
# runner không có GPU, Kokoro chạy CPU → bỏ hẳn lượt tải CUDA (khuyến nghị của chính install.js). Gói khác bỏ qua biến này.
export ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm_config_onnxruntime_node_install_cuda=skip
set -uo pipefail
for i in 1 2 3; do
  npm "$@" && exit 0
  [ "$i" = 3 ] && break
  echo "::warning::npm $1 lỗi lần $i/3 – thử lại sau $((i * 30)) s"; sleep $((i * 30))
done
echo "::error::npm $1 lỗi sau 3 lần thử"; exit 1
