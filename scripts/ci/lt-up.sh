#!/usr/bin/env bash
# Dựng LanguageTool 6.8 tự chạy trên runner (spanish-course.md §5.1) và ghi LT_URL vào GITHUB_ENV. Dùng: bash scripts/ci/lt-up.sh <mã-lt>
# Mã rỗng → không làm gì (bảng tl-gen.mjs không có lt). Không lên sau 6 phút → thoát 1 (không bỏ cổng).
set -euo pipefail
LT="${1:-}"; [ -z "$LT" ] && exit 0
docker run -d --name lt -p 8010:8010 -e Java_Xmx=2g erikvl87/languagetool:6.8 >/dev/null
for i in $(seq 1 120); do curl -sf "http://localhost:8010/v2/check?language=$LT&text=Hola" >/dev/null && echo "LT_URL=http://localhost:8010" >> "$GITHUB_ENV" && exit 0; sleep 3; done
docker logs lt 2>&1 | tail -30; echo '✗ LanguageTool không lên sau 6 phút'; exit 1
