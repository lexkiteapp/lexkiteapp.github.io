#!/usr/bin/env bash
# Deploy web app lên Cloudflare Pages (băng thông không giới hạn, miễn phí) – dành cho khi có lượng người dùng lớn.
# Lần đầu: chạy `npx wrangler login` (mở trình duyệt để đăng nhập tài khoản Cloudflare của bạn).
set -euo pipefail
cd "$(dirname "$0")/.."
npx --yes wrangler@3 pages deploy web --project-name vocaband --branch main --commit-dirty=true
