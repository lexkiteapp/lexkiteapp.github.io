#!/usr/bin/env bash
# Rollback production Cloudflare Pages (lexkite.com) về bản deploy trước. MỘT LỆNH:
#   bash scripts/ops/rollback-pages.sh [--dry-run] [--list] [previous | good | prod-YYYYMMDD-HHMM-<sha7> | <sha7+> | <deployment id>]
# Mặc định "previous". --list = liệt kê 25 bản deploy production gần nhất. Token: CLOUDFLARE_API_TOKEN hoặc ~/.config/lexkite/cf-token. Chi tiết: docs/ROLLBACK.md
set -euo pipefail
exec node "$(cd "$(dirname "$0")" && pwd)/pages-rollback.mjs" "$@"
