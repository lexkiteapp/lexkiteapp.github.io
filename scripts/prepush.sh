#!/usr/bin/env bash
# Trước mỗi lần push (mọi luồng/session): tự dựng lại các file sinh ra hay bị quên + kiểm nhanh các cổng hay làm đỏ Prod release.
# Dùng: npm run prepush → xem `git status`, commit các file được dựng lại. Bộ test đầy đủ để CI chạy.
set -e
cd "$(dirname "$0")/.."
node scripts/build-tokens.mjs           # brand/tokens.json → :root CSS, add-on, icon.svg (docs/BRAND-RULES.md)
node scripts/test/native-visual.mjs --self-test --write-fixtures >/dev/null   # token đổi → ảnh mẫu QC native sinh lại (không thì npm test đỏ "fixture lỗi thời")
node scripts/native/gen.mjs >/dev/null && node scripts/native/gen.mjs --check | tail -1   # chuỗi/token web đổi (vd sau merge main) → file sinh native dựng lại; trước đây chỉ CI bắt (#721)
node scripts/test/json-dupkeys.mjs | tail -1   # khoá JSON trùng sau khi gộp tay (bind Stitch…): JSON.parse lặng lẽ lấy khoá sau
node scripts/ci/required-gate.mjs --check  # gate = bộ canh lịch, không quay lại workflow_run (docs/CI-RUNNERS.md)
node scripts/path/build-mix.mjs          # sửa ngữ pháp/phát âm → web/js/path-mix.js
node scripts/grammar/build-lazy-idx.mjs --write >/dev/null   # sửa starter2.js/mastery.js → web/js/grammar/lazy-a1.js, lazy-c2.js (mục lục gói ngữ pháp A1/C2 tải lười)
node scripts/confidence/build.mjs        # sửa content/confidence → web/js/confidence/data.js
node scripts/speak/build.mjs --write    # sửa content/situations → web/js/speak/data.js + s/ (Play & Speak, tải lười theo tình huống × ngôn ngữ)
node scripts/lesson/build-gold.mjs       # sửa gold bank → web/cpack/lesson/gold.js (Giải thích của #/lesson)
node scripts/lesson/build-stories.mjs    # sửa content/lesson/stories.json → web/cpack/lesson/stories.js (Truyện + Radio)
node scripts/lesson/build-path-nodes.mjs   # sửa content/lesson/path-nodes.json → web/cpack/lesson/path-nodes.js (nội dung nút Lộ trình)
bash scripts/build-extension.sh >/dev/null && git checkout -q -- extension/academic.json 2>/dev/null || true   # web/ → extension/app (bỏ thay đổi phụ academic.json)
node scripts/test/ext-sync.mjs
node scripts/vi-lint.mjs
node scripts/test/docs-budget.mjs
node scripts/test/infra-check.mjs
node scripts/test/no-url-pathname.mjs
node scripts/test/ci-triage.mjs
node scripts/test/ci-policy.mjs          # mọi workflow: timeout + concurrency + phạm vi (2/11)
node scripts/content-qa/gate.mjs     # thư mục content/ mới → content/qa/sources.json
node scripts/jobs/gen.mjs --write >/dev/null && node scripts/jobs/gen.mjs && node scripts/test/jobs-check.mjs   # workflow có lịch → infra/jobs.json
git status --short
