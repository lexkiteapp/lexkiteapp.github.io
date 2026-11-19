#!/usr/bin/env bash
# Cài công cụ CHỈ dùng khi làm ảnh blog (không cần cho build/Cloudflare): sharp + playwright-core + Chromium vào .tools/ (git bỏ qua)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .tools && cd .tools
[ -f package.json ] || echo '{"private":true}' > package.json
npm i --no-audit --no-fund sharp@0.33.5 playwright-core@1.48.2
PLAYWRIGHT_BROWSERS_PATH="$PWD/pw" node node_modules/playwright-core/cli.js install chromium
echo "✓ .tools sẵn sàng: node scripts/blog-shots.mjs → node scripts/blog-media.mjs [--push]"
