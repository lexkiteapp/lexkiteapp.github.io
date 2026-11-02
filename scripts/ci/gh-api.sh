#!/usr/bin/env bash
# Vỏ của scripts/ci/gh-api.mjs cho phiên/watcher trên máy: bật proxy môi trường cho fetch của Node (sandbox chỉ ra mạng qua proxy).
# Dùng: bash scripts/ci/gh-api.sh [METHOD] /path [--data json] [--poll] [--repo]   – thoát 75 = hết hạn mức (KHÔNG phải lỗi/PR đóng)
NODE_USE_ENV_PROXY=1 exec node "$(dirname "$0")/gh-api.mjs" "$@"
