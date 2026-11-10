# Merge queue – spec-lite (chủ 10/11: "không để PR xung đột")
> TL;DR: PR xanh → bấm "Merge when ready" → GitHub xếp hàng, chạy `npm test` trên bản đã gộp với main (+ PR xếp trước), xanh thì gộp tuần tự. Hết cảnh update-branch hàng loạt và "xanh riêng, đỏ khi gộp". Chủ bấm 1 lần trong ruleset.
> Đọc khi: sửa `.github/workflows/merge-queue.yml`, `required-gate`, cách tự gộp của merge-captain, hoặc PR kẹt trong hàng.

## Vấn đề
- Ruleset main chỉ yêu cầu status `required-gate` trên **head PR**. PR A và B cùng xanh, gộp A xong thì B chưa từng được kiểm trên main mới → main đỏ, hoặc phải update-branch rồi chạy lại cả CI cho mọi PR (#934, #971, #983 ngày 10/11).
- Merge queue không gỡ được xung đột nội dung (PR dirty vẫn không vào hàng) – phần đó do định dạng ổn định + bot `pr-unconflict` (`docs/METHODS.md` › Chống xung đột).

## Cách chạy
1. PR có `required-gate` xanh trên head → được xếp hàng (`gh pr merge --auto --squash` / nút "Merge when ready" / GraphQL `enqueuePullRequest`).
2. GitHub dựng `gh-readonly-queue/main/pr-N-…` và phát sự kiện `merge_group`.
3. `merge-queue.yml` gọi đúng `npm-test.yml` (một định nghĩa bộ test) trên sha hàng đợi, rồi tự ghi status `required-gate` = success/failure cho sha đó.
4. Xanh → GitHub squash vào main theo thứ tự. Đỏ → PR bị rút khỏi hàng, các PR sau được dựng lại không có nó.
- Chi phí: 1 lượt `npm test` (~10–15 phút, 1 runner) cho mỗi PR vào hàng; việc nặng (E2E, Stitch, native) đã chạy trên head PR, không chạy lại. `merge_group` không có `paths` nên chỉ một workflow nghe sự kiện này.
- Bộ canh `required-gate.yml` giữ nguyên (đánh giá head PR); không workflow nào khác cần `merge_group`.

## Chủ cần bấm (một lần, ~1 phút)
Settings → Rules → Rulesets → ruleset của `main` (id 26316463) → bật **Require merge queue**:
- Merge method: **Squash**; Build concurrency: **5**; Minimum group size **1**, Maximum **5**; Wait time **1 phút**.
- "Only merge non-failing pull requests": **bật**; Status check timeout: **45 phút** (bằng timeout `npm test`).
- Giữ nguyên "Require status checks: required-gate" và quyền bypass của khoá deploy bot (bot vẫn đẩy thẳng `[skip ci]`).
Trước khi chủ bấm: workflow đã có sẵn, không ảnh hưởng gì (chưa có sự kiện `merge_group`).

## Sau khi bật
- merge-captain / phiên tự gộp: thay `PUT /pulls/N/merge` bằng `gh pr merge N --squash --auto` (hoặc GraphQL `enqueuePullRequest`); API gộp thẳng sẽ bị ruleset từ chối.
- `pr-unconflict` vẫn chạy cho PR dirty (hàng đợi chỉ nhận PR gộp sạch).
- Đo: số lần PR thành dirty / update-branch trong 24 giờ (báo cáo chống xung đột 11/11), số lượt main đỏ sau gộp.

## Tệp sinh đang commit – cách gỡ khi PR dirty (`scripts/pr-unconflict.mjs`)
| Tệp | Sinh bởi | Gỡ |
|---|---|---|
| `docs/CODEMAP.md`, `docs/codemap.json` | bot codemap trên main | lấy main |
| `content/pipeline/SCORE.md`, `LEARN.md`, `WORLD.md`, `reports/content-score.json`, `reports/learnability.json` | content:score đêm, world-scorecard | lấy main (bot sinh lại sau gộp; PR không có cổng khớp) |
| `docs/QA-BACKLOG.md` | qa-backlog | lấy main |
| `docs/JOBS.md`, `infra/jobs.json`, `infra/lexicon-consumers.json` | `jobs/gen.mjs --write` | lấy main + sinh lại (cổng jobs-check) |
| `docs/DESIGN-SYSTEM.md` | `build-tokens.mjs` | lấy main + sinh lại |
| `web/js/i18n/<lang≠en>`, `web/cpack/lesson/pn-*` | `i18n-pack.mjs` | lấy main + sinh lại |
| `extension/app/**` | `build-extension.sh` | lấy main + sinh lại |
| `web/css/st-*.css` | `build-stitch-css.mjs` | lấy main + sinh lại |
| `scripts/test/suite.txt`, `docs/INDEX.md` | người, chỉ thêm dòng | union + khử trùng |
| `i18n/ui/**` | người/bot dịch | gộp 3 bên theo khóa (`merge3`); cùng sửa một khóa → người gỡ |
| registry (`REGISTRIES`) | người | giữ dòng mục cả hai phía; trùng khóa → người gỡ |
Chưa tự gỡ (xung đột hiếm, cần người): `content/pipeline/score.budget.json`, `targets.json` (sàn chỉ tăng). Tệp sinh mới → thêm vào `TAKE_MAIN`/`REGEN`/`GENERATED` cùng PR.

## Rủi ro
- Hàng đợi dừng nếu `npm test` chập chờn → lỗi chập chờn phải sửa gốc (ci-triage), không tắt queue.
- Status `required-gate` trên sha hàng đợi do `GITHUB_TOKEN` của workflow ghi: ruleset không giới hạn nguồn status (đúng như hiện nay), nên được chấp nhận.
