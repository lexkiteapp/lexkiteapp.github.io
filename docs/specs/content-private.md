# Nội dung sang repo private `lexkiteapp/lexkite-content` – spec (owner duyệt 3/11)
> TL;DR: Đề, lời giải, bài học, kho từ rời repo public; code/engine/test ở lại, chạy trên fixtures giả. Build/deploy và job sinh nội dung vẫn chạy trên runner **public miễn phí**, lấy/ghi nội dung bằng khoá chỉ dành cho repo private; cổng test chặn lộ qua artifact/log/cache/comment. Làm theo lô, mỗi lô 1 PR, có cờ quay lại.
> Đọc khi: thêm/sửa dữ liệu nội dung, sửa workflow sinh nội dung, build/deploy, hoặc job đỏ `content-leak`.
> Liên quan: chống cào/DMCA/LICENSE → `docs/CONTENT-PROTECTION.md` (phiên content-ip-protect). Spec này chỉ lo "nguồn nằm ở đâu".

## 0. Nói thẳng cái gì được và không được bảo vệ
- **Được:** không còn "1 cú `git clone`" lấy trọn nguồn (gồm cả thứ không bao giờ lên site: `content/qa`, `notes-src`, ngân hàng gold, nguồn dịch lời giải, prompt/lô); nội dung MỚI không vào lịch sử public; giấy phép rõ (LICENSE của content-ip-protect).
- **Không:** dữ liệu app đang phục vụ (`lexkite.com/js/toeic/…`, add-on trên CWS, APK) vẫn tải được từ trình duyệt — bản chất web app. Lớp đó do WAF/rate-limit/canary ở `CONTENT-PROTECTION.md` lo, không thuộc spec này.

## 1. Phạm vi (danh sách theo **từng file**, nguồn sự thật = `content-private.json` ở repo public, chỉ chứa đường dẫn/glob, không chứa nội dung)
**Chuyển (dữ liệu):**
- Đề thi: `web/js/{toeic,toefl,readtest,listen}/*` (trừ `listen/kvoice.js`, `listen/audio-index.js` nếu là code → rà ở lô), `web/js/write/*`, `web/js/speak/{data,more,more2,more3,samples}.js`, `web/js/tools/{level-test,toeic5}.js`, `web/js/readings-more.js`, `content/exams/`.
- Lời giải: `web/js/explain/`, `web/js/readtest/explain-*.js`, lời giải dịch trong `web/js/i18n/<lang>/explain.js`, `content/qa/`, `content/i18n-backcheck-cache.json`.
- Bài học: `web/js/grammar/*` (dữ liệu), `web/js/lesson/{gold,stories}.js`, `web/js/roleplay/`, `web/js/call/calls*.js`, `web/js/confidence/`, `web/js/pron/{pairs,rhythm,sounds,sayit}.js`, `web/js/usage/`, `content/{situations,say-native,video/scripts,confidence,framework,target}/`.
- Kho từ: `content/{lexicon,dict,wordlists,notes-src}/`, `web/js/notes/`, `web/js/vimg/`, `web/js/lib/{awl,bsl,nawl,ngsl,ngsl2,office,domain-*,tsl-*,exam-vocab*,topics-more,paraphrase-data}.js`.
- Bản sao đã commit: `extension/app/**` (1.152 file, chép từ `web/`) → thôi commit, dựng lúc phát hành.
**Ở lại public:** mọi engine/UI (`app.js`, `ui.js`, `lesson/engine.js`, `call/engine.js`, `speak/app.js`, `tools/cefr-engine.js`, …), chuỗi giao diện i18n (trừ lời giải), scripts, test, workflow, `content/protection/` (sổ băm phải public mới làm bằng chứng), `content/legal`, landing/SEO code.
**Hỏi owner sau (không nằm trong lô 1–5):** nguồn blog `content/blog` (19 MB, vốn đăng công khai), audio ở `lexkite-media*` (CDN công khai theo bản chất).
**Fixtures:** `fixtures/content/` mirror đúng đường dẫn, 1–3 mục **giả tự viết** mỗi file, đủ để engine + test public chạy. File `fixtures/content/.fixture` là dấu nhận biết.

## 2. Kiến trúc
- Repo private `lexkiteapp/lexkite-content`, **cùng đường dẫn** như repo public (`web/js/toeic/…`, `content/qa/…`) → ghép = chép đè, patch áp nguyên.
- `scripts/content/link.mjs`: `LEXKITE_CONTENT_DIR` có → chép đè nội dung thật vào cây làm việc; không có → chép fixtures. Các đường dẫn chuyển nằm trong `.gitignore` public → không thể lỡ commit lại.
- Cờ `CONTENT_SOURCE` (biến repo): `public` (mặc định, như hôm nay) | `private`. Build prod với `private` mà thiếu nội dung hoặc thấy `.fixture` → **build fail**, không bao giờ deploy fixtures.
- Khoá: deploy key SSH **chỉ đọc** `CONTENT_RO_KEY` (build/deploy/gate) và deploy key **ghi** `CONTENT_RW_KEY` (job sinh nội dung); 1 PAT fine-grained chỉ repo private (statuses + PR) cho CI của PR nội dung. Đặt trong GitHub Environment `content-ro`/`content-rw`, chỉ nhánh `main` (+ nhánh cùng repo cho PR, xác minh ở lô 0); PR từ fork không bao giờ có secret.
- Deploy: Cloudflare git-build chỉ clone repo public → phải chuyển `PAGES_DEPLOY=direct` (dựng trên Actions + `wrangler pages deploy`, đã có sẵn trong `scripts/pages/deploy.mjs`) **trước** lô xoá đầu tiên. Cùng cách cho `preview-site`, `dict-pages`, `tools-pages`, `authority-pages`, `cws-publish`, `android`/`ios*`.
- Dev/phiên: clone private vào `../lexkite-content` + `npm run content:link`. Phiên viết lô nội dung commit/PR ở repo private.

## 3. CI và cổng chống lộ
- **Ràng buộc cứng owner: $0, repo private gần như KHÔNG chạy workflow.** Repo private **tắt Actions** (Settings › Actions › Disable) và không có `.github/workflows/`. Mọi job (build, test, gate, audio, lexicon, explain, lô Sonnet, xưởng) chạy runner public miễn phí, chỉ checkout repo private bằng deploy key RO/RW.
  - CI cho PR nội dung ở private: phiên gọi `content-ci.yml` ở repo public (workflow_dispatch, `pr=N`) + cron 15 phút quét PR mở → gate chạy runner public → đặt commit status ở repo private qua PAT. Không cần workflow nào ở private.
  - Nếu sau này buộc phải có job ở private: chỉ việc nhẹ (< 2 phút/lượt), ngân sách ≤ 300 / 3.000 phút/tháng của gói Pro, phải sửa spec này trước.
  - **Giám sát phút:** `free-tier-guard.yml` (đã có, runner public) thêm bước đọc `GET /users/lexkiteapp/settings/billing/usage` (PAT quyền *Plan: read*), lọc `repositoryName=lexkite-content`, product Actions → cảnh báo (issue + push owner) khi ≥ 50 % của 3.000 phút, lỗi đỏ khi ≥ 80 %. Thêm cổng: test `ci-policy` fail nếu repo private có workflow hoặc Actions đang bật (`GET /repos/lexkiteapp/lexkite-content/actions/permissions` phải `enabled:false`).
  - **Spending limit $0:** tài khoản cá nhân không có API đặt budget (chỉ org/enterprise có) → checklist owner bấm 1 lần ở lô 0: (1) github.com/settings/billing › Budgets and alerts → Actions = **$0**, bật "Stop usage when budget limit is reached"; (2) cùng chỗ cho Packages/Codespaces/Git LFS = $0; (3) repo `lexkite-content` › Settings › Actions › **Disable actions**. Em kiểm lại bằng API (permissions + usage) và ghi kết quả vào `owner-pending`.
- **Cổng `scripts/test/content-leak.mjs` (trong `npm test`, không cần secret):**
  1. Không file tracked nào ở public khớp `content-private.json` (trừ `fixtures/`); `.gitignore` có đủ.
  2. Dấu vân tay: job đêm tạo Bloom filter từ băm câu chuẩn hoá (≥ 8 từ) của nội dung private → `fixtures/content-bloom.bin` (không đảo ngược được). Diff public nào chứa câu trúng Bloom → fail, chỉ in `file:dòng`.
  3. Canary của content-ip-protect không được xuất hiện trong cây public.
- **Luật workflow (mở rộng `ci-policy`):** job nào dùng `CONTENT_*` thì: cấm `upload-artifact` (trừ allowlist báo cáo chỉ số đếm, có test kiểm nội dung), cấm `actions/cache`/cache setup-* trên đường dẫn nội dung, cấm đăng comment PR/summary có văn bản nội dung, mọi bước chạy qua `scripts/ci/redact.sh` (lọc dòng trúng Bloom → `[ẩn]`), test gate in `id + luật` khi `LEXKITE_REDACT=1`; bước cuối `guard-push.sh` chặn đẩy file nội dung lên public. Build bundle (dist/zip/APK/IPA) không bao giờ thành artifact; e2e dựng và test trong cùng job.
- Hiện có 17 workflow `git add` nội dung và 52 workflow đụng nội dung + artifact → mỗi lô sửa đúng các workflow của khu vực mình, lô cuối kiểm 0 vi phạm.

## 4. Lịch sử git public cũ
- Mọi commit cũ (và `refs/pull/*`) vẫn chứa nội dung tới ngày chuyển; forks = 0 (3/11).
- **Khuyến nghị: KHÔNG viết lại lịch sử.** Lý do: phá SHA mà `content/protection/registry.jsonl` + OpenTimestamps dùng làm bằng chứng tác quyền; GitHub vẫn giữ `refs/pull` và cache; mọi PR/worktree đang mở vỡ. Nội dung cũ vẫn "mọi quyền được bảo lưu" (không có LICENSE mở = không ai được phép dùng).
- Phương án nếu owner muốn: `git filter-repo` xoá các đường dẫn ở §1 + nhờ GitHub Support xoá cache/`refs/pull`. **Chỉ làm khi owner duyệt riêng.** Nội dung MỚI từ lô tương ứng trở đi chỉ vào private.

## 5. Các phiên đang viết lô (PR #429, #430, #412, #527, #529, #530–#537)
- Thứ tự: trưởng gộp gộp **hết PR mở của khu vực** trước lô chuyển khu vực đó; khu vực còn PR mở thì đẩy lô xuống cuối.
- PR còn mở sau khi chuyển: `scripts/content/retarget.mjs <PR>` lấy diff đường dẫn đã chuyển → nhánh cùng tên ở private + mở PR ở đó, phần code ở lại PR public. Không mất việc.
- Báo các phiên qua SendMessage khi khu vực của họ đổi đích (1 dòng: "từ giờ commit ở ../lexkite-content").

## 6. Lô (mỗi lô 1 PR, CI xanh → tự gộp, kiểm live sau lô)
| Lô | Việc | Thay đổi người dùng thấy |
|---|---|---|
| 0 | Tạo repo private (rỗng), key/env, `link.mjs`, `content-private.json`, fixtures cho khu vực lô 2, `content-leak` (chế độ cảnh báo), `redact.sh`, `guard-push.sh` | Không |
| 1 | Bơm bản sao nội dung hiện tại sang private + đồng bộ 1 chiều public→private (đêm). `PAGES_DEPLOY=direct`, `CONTENT_SOURCE=private`: build từ private. **So `dist` byte-for-byte** với build từ public (`scripts/content/dist-diff.mjs`) = phải bằng nhau | Không |
| 2 | Đề thi: xoá khỏi public + `.gitignore`, fixtures, sửa workflow đề | Không |
| 3 | Lời giải (+ `explain.yml`, i18n lời giải ghi sang private) | Không |
| 4 | Bài học (grammar/lesson/roleplay/call/…; xưởng nội dung, script-bank ghi private) | Không |
| 5 | Kho từ (lexicon-expand, wordlists, notes, vimg, dict) + `extension/app` thôi commit; `content-leak` sang chế độ chặn; tắt đồng bộ 1 chiều | Không |
**Kiểm sau mỗi lô:** `dist-diff` = 0 khác biệt ngoài ý muốn; live: đề (IELTS/TOEIC/TOEFL), bài học, từ vựng mở được ở 15 ngôn ngữ (visual-qa + `post-deploy-check`), add-on build + ext-e2e, android/ios build xanh.

## 7. Quay lại
- Lô 0–1: đặt `CONTENT_SOURCE=public` (+ `PAGES_DEPLOY` về giá trị cũ) → như hôm nay, không cần commit.
- Lô 2–5: tag `pre-content-lot-N` trước mỗi lô; `scripts/content/restore.mjs --area <khu>` chép file từ private về 1 PR public + đặt cờ `public`. Có test chạy thử restore trên fixtures.

## 8. Chi phí
**$0 (ràng buộc cứng):** repo private + deploy key + Environments miễn phí ở gói Pro; Actions ở private tắt, budget $0 (checklist §3), giám sát 50 %; runner public như cũ. Không cần mua gì. Rủi ro chính: PAT hết hạn → monitor `free-tier-guard` báo trước 14 ngày.
