# 📋 Bảng giao việc Claude ⇄ Antigravity

> Tiêu credit: `docs/CREDIT-RULES.md`. Thẻ đã xong + thread đã đóng: `docs/agents/BOARD-ARCHIVE.md` (chỉ tra cứu).

Quy trình (2 chiều):
- Anh Quyền giao **Claude** → Claude thêm thẻ TODO (`@antigravity`/`@claude`), duyệt, commit.
- Anh Quyền giao **Antigravity** → ghi thẻ **HỎI CLAUDE** (yêu cầu + kế hoạch + file) rồi commit; Claude trả lời trong thẻ (✅/✏️/⚠️). Việc nhỏ trong vùng Antigravity → cứ làm, ghi CHỜ DUYỆT.
1. **Antigravity**: `git pull` → nhận thẻ `@antigravity` đầu TODO → **ĐANG LÀM** (commit) → làm trong worktree `../lexkite-ag` (COORDINATION quy tắc 0) → **CHỜ DUYỆT** + *Báo cáo* (commit, file, lệnh kiểm + kết quả) → push.
2. **Claude** mỗi vòng: kiểm CHỜ DUYỆT (diff, `npm test`, live) → chuyển BOARD-ARCHIVE (nhận xét) hoặc trả TODO + *Cần sửa*.
3. Chỉ sửa/`git add` file của thẻ. Antigravity chỉ sửa trạng thái + Báo cáo. Không ghi khóa/bí mật.

Mẫu thẻ:
```
### [ID] Tiêu đề ngắn · @antigravity · ưu tiên: cao|vừa|thấp
- Mục tiêu: …
- File/khu vực: …
- Tiêu chí xong: …
- Báo cáo: (người làm điền)
- Cần sửa / Nhận xét: (Claude điền)
```

---


## HỎI CLAUDE
(Antigravity hỏi ở đây · Claude trả lời trong thẻ.) Kế hoạch UI/UX GĐ0–GĐ3 đã duyệt ("mục 3" của G2): BOARD-ARCHIVE.md [HỎI DUYỆT].

## TODO

### [N4] Email cảnh báo đọc cài đặt quản trị (`adm_pref`) · @antigravity · ưu tiên: vừa (làm sau B5 đợt này)
- Phần còn thiếu của N3 (Claude 23/10): `workers/mail/index.js` (thư cảnh báo/bản tin) phải tôn trọng `adm_pref:<email>` – loại cảnh báo bật/tắt và ngưỡng của từng quản trị viên; thiếu cài đặt = mặc định hiện tại.
- Đọc 1 lần/lượt gửi (không đọc mỗi thư), truy vấn theo khóa (không quét bảng). Test trong `scripts/test/` + cập nhật docs. Không đụng `functions/api/_d1guard.js`, `_d1b.js`.


### [B5] Nhịp nội dung 15 nước theo `docs/SEO-GROWTH-PLAN.md` · @antigravity · ưu tiên: RẤT CAO
- **Gấp:** sau 24/10 có 9 ngôn ngữ (ar, de, fr, hi, ko, ru, th, tr, zh) hết bài, pt hết 27/10 → làm **B3 đợt 3** trước: ưu tiên 6 bài/ngôn ngữ cho 9 ngôn ngữ này, xong trước 24/10 (để trống `publishAt`, Claude xếp lịch).
- Sau đó giữ nhịp tháng 1: **3 bài/tuần/ngôn ngữ** cho 13 ngôn ngữ (≈ 39 bài/tuần); tháng 2–3: 4–5 bài/tuần (bảng §2 của kế hoạch). vi/en Claude lo.
- Nội dung theo bảng §3 (kỳ thi & nhu cầu từng nước), cụm trụ cột + 6–10 vệ tinh, cơ cấu evergreen/luyện thi/giao tiếp; giữ đủ cổng chất lượng của B3/B4.
- Báo cáo mỗi đợt: bảng bài (ngôn ngữ, từ khóa, cụm, bài liên kết). Làm trong worktree `../lexkite-ag`, mỗi bài 1 commit.
- 🔴 **Claude 22/10, anh chủ yêu cầu: làm B5 NGAY, ưu tiên trước GĐ3.**
  - Hệ thống đăng không lỗi: cron blog-publish chạy hằng giờ, đều thành công. 13 ngôn ngữ mới live 2–3 bài vì kho ít (mỗi ngôn ngữ ~12 bài, rải tới đầu 11).
  - **Đợt này: mỗi ngôn ngữ thêm 10 bài** (ar, de, fr, hi, ko, ru, th, tr, zh, pt, es, id, ja = 130 bài). Nộp theo lô 2 ngôn ngữ/lần để Claude duyệt dần, không dồn một cục.
  - Giữ đủ cổng chất lượng B3/B4/B5: từ khóa bản địa trong briefs.json, qualityScore ≥ 92, blog-check 0/0, blog-captions 0 lỗi, ≥ 2 link nội bộ + CTA đúng ý định, bản địa (không dịch thô).
  - Để trống `publishAt`, Claude xếp lịch.
  - Rebase lên main mới nhất của lexkiteapp trước mỗi lô.
  - GĐ3 (âm thanh/lửa/lấp lánh) làm sau.
- **Alt/caption ảnh:** chỉ tả đúng `desc` trong `content/blog/shots.json` (không bấm giờ, không ngữ pháp trên quiz từ vựng, không "không bao giờ quên"; màn IELTS trong bài TOEIC/TOEFL/Cambridge phải ghi "IELTS") – chạy `node scripts/blog-captions.mjs <file.md>` = 0 lỗi trước khi nộp (luật: `docs/CONTENT-RULES.md` §8).
- Cần sửa / Nhận xét: ✅ **DONE/REVIEWED (Claude 23/10): Lô 1–7 = 130 bài (13 ngôn ngữ × 10) đã gộp main.** Cổng blog-pipeline gate ĐẠT (blog-check 0 lỗi, captions 0 lỗi, dupes 0, brand-check OK). Đã sửa: 3 cặp bài trùng ví dụ tiếng Anh giữa ngôn ngữ (id~th, ko~zh, id~th CV) bằng cách diễn đạt lại; alt es "Dicionario…UK e US" → tiếng Tây Ban Nha, alt id lẫn "và", alt th TOEFL "mức khó 1-6". Lịch: 23/10–10/11/2026, ≤1 bài/ngôn ngữ/ngày. Cảnh báo còn lại: 114 [inbound] (<3 link trỏ tới) – thêm link chéo để sau.

### [B3] Blog 15 ngôn ngữ – bài vệ tinh theo cụm (lượt 3) · @antigravity · ưu tiên: cao
- Trạng thái: đợt 1–2 + đợt 3 phần 1 (ko/zh/de/fr) đã gộp. Phần còn lại của đợt 3 (ar, hi, ru, th, tr, pt, es, id, ja) **làm theo B5** (10 bài/ngôn ngữ).
- Cổng: `docs/BLOG-RUNBOOK.md`, `content/blog/WRITING-GUIDE.md`, từ khóa bản địa trong `briefs.json`, qualityScore ≥ 92, `blog-check` 0/0, alt/chú thích đúng `shots.json`, ≥ 2 link nội bộ + CTA đúng ý định, để trống `publishAt`. Vùng file: chỉ `content/blog/**`.
- Toàn văn thẻ (cơ cấu nội dung, đợt 3, nghiệm thu): BOARD-ARCHIVE.md [B3].
- Cần sửa / Nhận xét:


## ĐANG LÀM

### [CL1] Lớp học (Teacher/Classroom mode) · @claude (phiên gifted-cori) · ĐÃ LIVE 22/10
- File riêng: `functions/api/class.js`, `web/js/classroom.js`, `web/js/i18n/*/classroom.js`, `scripts/test/classroom.mjs`, `content/legal/{en,vi}/schools.html` (→ `/<lang>/schools`), `docs/CLASSROOM.md` (kèm ước tính chi phí D1).
- Móc tối thiểu: `app.js` (BUNDLES/ROUTE_BUNDLE `classroom`), `sync.js` (1 dòng nạp module cho học sinh), `qtips.js` (phát `lexkite:test-done`), `ads.js` (tắt quảng cáo khi `lk.edu`), `hubs.js` (1 hàng "Lớp học"), `account.js` (DELETE_SQL), `_quota.js`, privacy mục 2/8/10, `build-legal.mjs`/`build-seo.mjs` (trang `schools`), `gen-i18n.mjs` (dịch khóa lười còn tiếng Anh tạm).
- KHÔNG đụng: extension/, web/index.html, landing/blog, native.js, widget-feed.js, lesson-fx/path-*/study.js, swipe/Kit/streak-freeze.

## CHỜ DUYỆT

### [E1] Email "Báo cáo não bộ" hằng tuần · @antigravity · ưu tiên: thấp
- Giao diện + template `web/templates/weekly-digest.html` + i18n đã đạt (Claude 16/10); mặc định **TẮT (opt-in)** `emailDigest: false`.
- ⏸️ Chờ anh Quyền chọn dịch vụ gửi mail cho người dùng (đề xuất Resend free 3.000 mail/tháng) + DNS SPF/DKIM + `/api/unsub` – Cloudflare Email Routing chỉ gửi tới địa chỉ đã xác minh. **Claude triển khai worker**, Antigravity không deploy.
- Báo cáo đầy đủ (truy vấn D1, placeholder): BOARD-ARCHIVE.md [E1].
- Cần sửa / Nhận xét:

## ĐÃ XONG

### [N3] Cài đặt nâng cao cho tài khoản quản trị · @antigravity · ✅ Claude duyệt & gộp main 23/10
- Mục tiêu: trong tab Cài đặt thêm khối **"🛡️ Tài khoản quản trị"**: tab mặc định, ngôn ngữ & giao diện mặc định, loại cảnh báo email (lỗi JS, workflow, hộp thư, chất lượng, bản dịch), ngưỡng cảnh báo, tự đăng xuất sau N phút, xuất nhật ký quản trị CSV, phiên gần đây.
- **Claude 23/10:** Antigravity làm **TOÀN BỘ N3 gồm cả API** (tránh hỏi qua lại).
  - **Server:** file MỚI `functions/api/admin-prefs.js` (POST `op: get|set`), đặt sau `adminGate` import từ `admin.js`. KHÔNG sửa logic server của `admin.js` (tối đa 1 dòng route nếu cần).
  - **Lưu trữ:** D1 chính, bảng `config`, khóa `adm_pref:<email>`, blob JSON ≤ 4 KB, **whitelist trường có kiểm schema** (từ chối trường lạ/kiểu sai). Đọc 1 lần lúc tải, cache vào `sessionStorage`.
  - **Client:** CHỈ mở rộng phần tab Cài đặt của `web/js/admin.js`, hoặc tốt hơn là file lười mới `web/js/admin-prefs.js` gắn từ tab Cài đặt.
  - **Tính năng:** tab mặc định, ngôn ngữ/giao diện mặc định, bật/tắt từng loại cảnh báo email, ngưỡng, tự đăng xuất sau N phút.
  - "Phiên gần đây" và "xuất CSV nhật ký" **chỉ đọc dữ liệu có sẵn**. `admin_log` có thể chuyển sang D1 nội bộ (`functions/api/_d1b.js`) → dùng helper đó, truy vấn có **LIMIT** và theo chỉ mục thời gian.
  - Kèm: test, từ điển EN của admin, ảnh trước/sau. `workers/mail/index.js` (đọc loại cảnh báo): Claude triển khai sau.
- Báo cáo:
- Cần sửa / Nhận xét:
- Báo cáo (Claude 23/10): cherry-pick 06419c2f lên main mới (xung đột package.json: giữ test của main + thêm admin-prefs.mjs). Đạt: admin-prefs/admin-ui/api-security/size-budget (khung 374/377 KB, client lười nên +0)/brand/infra/client-security/smoke/a11y/i18n. adminGate + khóa `adm_pref:<email>` whitelist ≤4 KB, XSS-safe (esc + bảng cố định), tự logout an toàn, CSV chống công thức.
- Claude đã sửa: (1) `logs` đọc `admin_log` ở **D1 chính** (adminAudit ghi env.DB, không phải D1 nội bộ – bản gốc dễ đọc nhầm khi D1B=1); (2) lọc theo email chỉ quét tối đa 2000 dòng mới nhất (không có chỉ mục email → tránh quét toàn bảng); (3) `admin.js` op `config` đọc `WHERE k IN (CONFIG_KEYS)` thay vì quét cả bảng (có thêm hàng adm_pref:*).
- Còn lại (Claude): `workers/mail/index.js` đọc `alertTypes`/ngưỡng từ adm_pref. Ghi chú: `admin-gate.mjs` đang FAIL ở main từ 2ac7f4c5 (nút #swAcc) – không do N3.


### [GĐ3] Âm thanh (mở rộng Sfx) · ngọn lửa chuỗi · lấp lánh · @antigravity · ✅ Claude duyệt & gộp main 23/10
- Gộp `68040109` (feat fx) + `8f737278` (fix CSS.escape), bỏ commit BOARD. Đạt: mở rộng `Sfx` trong `game.js` (không module thứ 2), `isMuted()` + `actx.resume()`; lửa/lấp lánh CSS nằm trong `streak-ui.js` (bundle lười), tắt khi `prefers-reduced-motion`; không đụng file của agent khác; `CSS.escape` là vá phòng vệ đúng + mock test.
- Đo: smoke, size-budget, learn-flow, unit, streak-ui, shorts-scale, a11y (0 NOLABEL), axe 46 màn, i18n-switch/qa/missing, brand-check đều đạt. ⚠️ Khung app 379 → **380/380 KB gz** (`game.js` +~0,2 KB gz): hết dư địa, thay đổi khung sau phải bớt byte trước.
- Lưu ý: `decorate()` chạy lúc `streak-ui.js` nạp nên lửa/shimmer chỉ hiện khi bundle `streak` đã tải; `Sfx.tap/combo/shimmer` chưa được gọi ở đâu (để sẵn).

### [C1b] Smart CTA trang từ vựng tĩnh + đo riêng từng nút · @antigravity · ✅ Claude duyệt & gộp main 23/10
- Đạt: add-on chỉ Chrome/Edge máy tính, PWA chỉ di động chưa cài, Ẩn nhớ 7 ngày (`lk.extHide`/`lk.pwaHide`), không popup/PII, deep link chỉ khi topic có thật (TOPIC_IDS = 83 bộ, khớp `loadVocab().TOPICS`). Sự kiện `cta_addon_view/click`, `cta_pwa_view/click`, `cta_topic_click` (tổng + theo ngôn ngữ + theo trang) → Quản trị › Phân tích. Khung app không đổi (chỉ trang tĩnh + admin lười). i18n 15 ngôn ngữ (`SMART_CTA_I18N`).
- Claude sửa khi gộp: `hit.js` chặn lang/page bằng danh sách cho phép (15 ngôn ngữ; vocab/samples/speaking/grammar/letters/blog) thay vì regex tự do (tránh phình `ext_events`); bỏ hunk `lesson-video.js` (không cần). Rate-limit 60/giờ/IP giữ nguyên.
- Lưu ý: `TOPIC_IDS` là danh sách cứng – khi thêm bộ từ mới cần cập nhật (hoặc suy ra từ `loadVocab()`).

### [U2e] Giao diện riêng app iOS/Android qua `html.native` · @antigravity · ✅ Claude duyệt & gộp main 23/10
- Đạt: safe-area trên/dưới, thanh dưới không chồng home indicator, màn toàn màn hình, bàn phím/scroll-margin, nền tối hệ thống – toàn bộ dưới `html.native`.
- Claude sửa khi gộp: quy tắc `body.bare .view` bản gốc được giữ nguyên cho web (bản của Antigravity làm web đổi padding-bottom); phần chồng nằm dưới `html.native`.

### [A1] Quản trị – làm đẹp & thống nhất giao diện các tab (trừ tab Video) · @antigravity · ưu tiên: cao
- Yêu cầu (anh Quyền 23/10): giao diện admin "còn củ chuối" → chuyên nghiệp, trực quan, gọn. Tab **Video** do Claude đang làm lại (đừng sửa `admin-video.js`, `admin-clips.js`); khi Claude xong, theo đúng mẫu đó (thanh mục con cố định, thẻ KPI, chip trạng thái màu+chữ, 1 kiểu nút/vai trò, trạng thái rỗng/tải/lỗi).
- Phạm vi: Tổng quan, Người dùng, Hộp thư, Cảnh báo, Báo cáo, Chất lượng, Kênh & phân phối, Video & Social, Khoá API, Kho Drive, Hạn mức. Dùng token/thành phần admin sẵn có + `docs/BRAND-RULES.md` (Kit teal); không đổi logic máy chủ.
- Kiểm: ảnh chụp trước/sau (desktop + mobile, sáng/tối) bằng fixture CI (không đăng nhập tài khoản thật), a11y AA, không giật layout, test admin hiện có xanh; từ điển EN admin cho chuỗi mới.
- Làm theo từng tab, mỗi tab 1 commit → CHỜ DUYỆT.
- ✅ Claude duyệt 23/10: gộp 11 commit CSS (chỉ `web/css/admin.css`, không đổi JS/backend/Video hub/dist/quota/drive logic) lên main mới. Test admin-ui, api-security, drive-ui, quota, yt-manual, report-ui, admin-gate, brand-check, size-budget, axe/a11y đều xanh. Chưa có ảnh sau do sandbox chặn Chrome/cổng cục bộ – cần chụp lại khi có CI.

- [C1] + [U1] ✅ Claude duyệt & gộp 23/10 (4b03701b): CTA blog + 5 sửa CSS mobile/dark. Chi tiết: BOARD-ARCHIVE.md.
→ `docs/agents/BOARD-ARCHIVE.md` (G2 22/10, G1, G0, W1, U3, U2d, P1, S1 thẻ khoe, X1, L1, B4, DUO1, B2 … – nguyên văn).
