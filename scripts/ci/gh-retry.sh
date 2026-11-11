#!/usr/bin/env bash
# Tên cũ của scripts/ci/net-retry.sh (thử lại 5xx + lỗi mạng tạm thời, 4xx đỏ ngay). Giữ để các workflow đang gọi không phải đổi.
exec bash "$(dirname "$0")/net-retry.sh" "$@"
