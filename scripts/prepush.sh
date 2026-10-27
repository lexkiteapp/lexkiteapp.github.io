#!/usr/bin/env bash
# Trước mỗi lần push (mọi luồng/session): tự dựng lại các file sinh ra hay bị quên + kiểm nhanh các cổng hay làm đỏ Prod release.
# Dùng: npm run prepush → xem `git status`, commit các file được dựng lại. Bộ test đầy đủ để CI chạy.
set -e
cd "$(dirname "$0")/.."
node scripts/ci/sync-triage.mjs          # workflow mới → ci-triage.yml
node scripts/path/build-mix.mjs          # sửa ngữ pháp/phát âm → web/js/path-mix.js
node scripts/confidence/build.mjs        # sửa content/confidence → web/js/confidence/data.js
node scripts/lesson/build-gold.mjs       # sửa gold bank → web/js/lesson/gold.js (Giải thích của #/lesson)
node scripts/lesson/build-stories.mjs    # sửa content/lesson/stories.json → web/js/lesson/stories.js (Truyện + Radio)
bash scripts/build-extension.sh >/dev/null && git checkout -q -- extension/academic.json 2>/dev/null || true   # web/ → extension/app (bỏ thay đổi phụ academic.json)
node scripts/test/ext-sync.mjs
node scripts/vi-lint.mjs
node scripts/test/docs-budget.mjs
node scripts/test/infra-check.mjs
node scripts/test/no-url-pathname.mjs
node scripts/test/ci-triage.mjs
node scripts/content-qa/gate.mjs     # thư mục content/ mới → content/qa/sources.json
node scripts/jobs/gen.mjs --write >/dev/null && node scripts/jobs/gen.mjs && node scripts/test/jobs-check.mjs   # workflow có lịch → infra/jobs.json
git status --short
