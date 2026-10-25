# Phối hợp Claude ⇄ Antigravity (chia việc, tránh chồng chéo)

> TL;DR: Phối hợp Claude ⇄ Antigravity: quy tắc vàng, phân vùng file, việc mở, phân vùng đang giữ. Giao việc hằng ngày ở agents/BOARD.md; nhật ký bàn giao cũ ở archive/COORDINATION-LOG.md.
> Đọc khi: sửa ngoài vùng của mình hoặc gộp nhánh.

Mục đích: chia tải để không ai chạm giới hạn token, không sửa đè lên nhau.

**➡️ Giao việc & báo cáo hằng ngày ở `docs/agents/BOARD.md`** (TODO → ĐANG LÀM → CHỜ DUYỆT → ĐÃ XONG). File này chỉ giữ quy tắc chung.

## Quy tắc vàng
0. **Mỗi bên một thư mục làm việc** (bắt buộc – dùng chung 1 thư mục thì lệnh ship của bên này sẽ gom luôn file bên kia đang sửa dở, như đã xảy ra ở commit c0e088db). Antigravity làm trong worktree riêng:
   `git worktree add ../lexkite-ag -b antigravity origin/main` → làm & commit ở `../lexkite-ag` → `git push <remote> antigravity:main` (hoặc rebase lên main rồi đẩy). Claude làm ở thư mục gốc.
1. **Trước khi làm**: `git pull` (nhánh `lexkite-main`), đọc mục *Đang làm* bên dưới – file nào đang có người giữ thì **không sửa**.
2. **Nhận việc** = ghi 1 dòng vào *Đang làm* (tên – việc – file/khu vực) và commit ngay.
3. **Chỉ commit file của việc mình** (`git add <file>` cụ thể, **không** `git add -A`) – tránh gom phần người kia đang sửa dở.
3b. **Nội dung học** (từ vựng/bài tập/đề thi): theo `docs/CONTENT-RULES.md` – nguồn, chuẩn từng loại, ngân sách dung lượng, cổng kiểm.
3c. **Tài nguyên hệ thống** (dịch vụ, Worker, kho lưu trữ, tên miền, API ngoài, mail): ghi vào `infra/resources.json` theo `docs/INFRA-RULES.md` – `npm test` chặn nếu thiếu.
3d. **Thương hiệu** (Kit, logo, màu, ảnh mạng xã hội): chỉ lấy từ nguồn ghi trong `docs/BRAND-RULES.md` (Kit = `web/js/kit.js`), không vẽ lại.
4. **Trước khi commit**: `npm test` phải PASS (chính tả, i18n 15 ngôn ngữ, unit, smoke, lẫn tiếng, lời giải, axe, crawl).
5. **Chuỗi giao diện mới** luôn qua `t('…')` (khóa tiếng Việt) + thêm tiếng Anh vào `web/js/i18n/en/*.js`.
6. **Xong việc**: xóa dòng ở *Đang làm*, thêm 2–4 dòng vào *Nhật ký bàn giao* (đã làm gì, file nào, cần bên kia kiểm gì).
7. Không đụng: khóa/bí mật, cấu hình Cloudflare/GitHub secrets, `functions/api/admin.js` & `web/js/admin.js` (Claude giữ), `scripts/ship2.sh` của Claude.
8. **Add-on Chrome** (`extension/`, mã web chép vào `extension/app/`): giữ đúng `docs/CWS-RULES.md` – không mã tải từ xa, không thêm quyền/host/dữ liệu gửi đi khi chưa cập nhật lock + chính sách; `npm test` có `cws-check`. Đăng bản mới qua workflow "Đăng add-on Chrome Web Store".

## Phân vùng mặc định
| Khu vực | Người giữ chính |
|---|---|
| Máy chủ (`functions/`, `workers/`), bảo mật, quản trị, CI/workflow, pipeline dịch/giọng đọc | **Claude** |
| Giao diện & CSS (`web/css/`, bố cục trang người học), thông báo/nhắc học, email mẫu, blog/SEO nội dung | **Antigravity** |
| Nội dung đề thi, từ vựng | Ai nhận trước ghi ở *Đang làm* |

## Đang làm
- (trống)

## Việc mở – Antigravity nhận được ngay
1. **Email "Báo cáo não bộ" hằng tuần**: nối `web/templates/weekly-digest.html` vào worker `workers/mail` (cron Chủ nhật), dữ liệu từ D1 (`users`, `sessions`), chỉ gửi người đã đăng nhập & bật nhận email (thêm tùy chọn trong Cài đặt). Báo Claude để triển khai worker.
2. **Rà ảnh chụp giao diện tự động** (nhánh `screens`, workflow `screens.yml`): sửa lỗi bố cục mobile/dark mode trong `web/css/style.css`, mỗi lỗi 1 commit.
3. **Blog chuẩn SEO có ảnh chụp app thật** (ưu tiên cao):
   - Đọc **bắt buộc**: `content/blog/WRITING-GUIDE.md`, `docs/SEO-PLAN.md` (§4 quy trình, §5 định dạng, §7 sự thật đã xác minh), `docs/BLOG-RUNBOOK.md`, `content/blog/briefs.json` (chọn brief chưa có bài), `content/blog/shots.json` (ảnh có sẵn + mô tả).
   - Ảnh RIÊNG từng bài (từ 17/10): khai báo `shots:` / `diagrams:` trong front matter, dùng `media:@s1` (alt để trống) và `{{diagram: d1 | …}}` – CI `blog-images.yml` tự chụp/dựng; KHÔNG chạy Playwright/dựng ảnh trên máy. Mẫu ở `content/blog/WRITING-GUIDE.md`.
   - Ảnh: chỉ dùng ảnh app thật. Cần ảnh mới → thêm mục vào `shots.json` (route + mô tả đúng màn hình) → `bash scripts/setup-media-tools.sh` (1 lần) → `node scripts/blog-shots.mjs <id>` (chụp giao diện tiếng Anh, `?sandbox=1&demo=1`) → `node scripts/blog-media.mjs --push` (AVIF/WebP 480/960/1440, đẩy repo `lexkite-media`). Alt/chú thích phải khớp `desc`, không bịa chi tiết (lỗi B1: 8/11 ảnh mô tả sai – xem ví dụ & cách tự kiểm ở WRITING-GUIDE.md).
   - Mỗi bài: `content/blog/<lang>/<slug>.md`, `publishAt:` để trống, `status: ready`; tiêu đề 30–65 ký tự, mô tả 110–160 ký tự, ≥ 1.200 từ (evergreen 1.800–2.500), ≥ 4 H2, 2–3 ảnh `media:<id>`, ≥ 2 link vào app `/#/…`, ≥ 1 link bài khác, đúng 1 `{{cta: …}}`, mục *Câu hỏi thường gặp* 3–4 câu. 100% tự viết, không bịa số liệu/nghiên cứu, không chép đề thi/sách.
   - Kiểm trước khi commit: `node scripts/blog-check.mjs <file>` (0 lỗi) + `node scripts/blog-dupes.mjs` (0 lỗi) + `node scripts/vi-lint.mjs` (bài vi) → `node scripts/blog-schedule.mjs` để xếp lịch.
   - Thứ tự: (a) bù bài tiếng Anh tương ứng các bài vi đã có (hiện vi 80 · en 24); (b) bài mới theo brief evergreen; (c) ngôn ngữ khác (es, ja, id…) khi blog ngôn ngữ đó đã bật.
   - Nhịp: mỗi lượt 3–5 bài, commit theo từng bài (`git add content/blog/<lang>/<slug>.md content/blog/media.json content/blog/shots.json`), ghi Nhật ký bàn giao số bài + slug.
   - 📌 **Thực thi trên BOARD**: Nhận thẻ **[B2]** trên `docs/agents/BOARD.md` – luôn đối chiếu và tuân thủ chặt chẽ mục 3 hướng dẫn trên đây cùng `content/blog/WRITING-GUIDE.md` trước và trong khi viết bài.
4. **Câu hỏi có biểu đồ TOEIC Part 3/4**: đề xuất định dạng dữ liệu `graphic` (bảng HTML đơn giản) + giao diện; Claude duyệt phần `web/js/qengine.js` trước khi sửa.

## Nhật ký bàn giao
Đã chuyển: `docs/archive/COORDINATION-LOG.md` (nguyên văn). Việc hiện hành ở `docs/agents/BOARD.md`.

## Phân vùng file đang giữ (17/10 – nhiều luồng song song)
| Luồng | Được sửa | Không được sửa |
|---|---|---|
| Phiên nội dung | web/js/toefl/*, toeic/*, readtest/*, notes/từ vựng, content/pipeline/*, en/exams.js | app.js (trừ 2 dòng BUNDLES/ROUTE_BUNDLE đã duyệt), admin-* |
| Phiên blog SEO | content/blog/** | mọi thứ ngoài content/blog |
| Agent dịch lời giải | trường bản dịch "why" trong các file đề | câu hỏi/đáp án, app.js |
| Agent test đọc to | scripts/test/* (test mới), sửa nhỏ phần chấm trong web/js/toeic.js | toeic/sw1.js dữ liệu, app.js |
| Agent dựng video | scripts/video/*, .github/workflows/video.yml, content/video/* | web/js/admin-*.js, functions/ |
| Agent khung đăng bài | web/js/admin-social.js, functions/api/social.js | admin-studio.js, app.js |
| Phiên Call Mia | module mới riêng (+2 dòng app.js nếu báo trước) | file của luồng khác |
| Phiên add-on soát lỗi | extension/** | web/** |
| Phiên widget | mobile/**, plugin native | web/js/app.js (báo trước) |
| Phiên brand kit | brand/social/templates/** | web/js/kit.js |
| Antigravity | thẻ trên BOARD, worktree riêng | file luồng khác đang giữ |
Quy tắc: sửa file ngoài vùng → nhắn phiên chính trước; mỗi luồng làm nhánh/worktree riêng hoặc chỉ `git add` đúng file của mình; phiên chính là người duy nhất ship (ship2.sh) sau khi chạy `npm test` toàn bộ.
