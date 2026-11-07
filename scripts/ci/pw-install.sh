#!/usr/bin/env bash
# Cài trình duyệt Playwright trên runner, có trần + thử lại (dùng chung cho mọi workflow – thay `timeout 600 npx playwright install …`).
# Vì sao: `playwright install --with-deps` đôi khi treo ở apt (05–06/11: webkit 20 phút, run 42059013822; stitch-web hết 600 s, #780) →
# một lượt treo làm cả job đỏ. Ở đây mỗi lượt ≤ 4 phút, tối đa 3 lượt, giữa các lượt giết apt treo; log lượt lỗi được in để biết treo ở đâu.
# Dùng: bash scripts/ci/pw-install.sh [--with-deps] chromium [webkit …]   (tham số chuyển nguyên cho `npx playwright install`)
set -u
log=$(mktemp)
for i in 1 2 3; do
  if timeout 240 npx playwright install "$@" >"$log" 2>&1; then echo "✓ playwright install $* (lượt $i)"; exit 0; fi
  echo "::warning::playwright install $* lượt $i lỗi/treo quá 4 phút – thử lại"; tail -25 "$log"
  sudo pkill -f apt-get >/dev/null 2>&1 || true; sudo pkill -f dpkg >/dev/null 2>&1 || true; sleep 5
done
echo "::error::playwright install $* thất bại 3 lượt"; exit 1
