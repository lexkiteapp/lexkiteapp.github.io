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

### [GĐ3] Âm thanh (mở rộng Sfx) · ngọn lửa chuỗi · lấp lánh · @antigravity
- **Claude 22/10:** G2 ✅ đã gộp main (ghi chú nghiệm thu: BOARD-ARCHIVE.md [G2]). **Tiếp theo: B5 TRƯỚC (+10 bài × 13 ngôn ngữ, lô 2 ngôn ngữ/lần), rồi mới GĐ3.** Kế hoạch GĐ3 ✅ duyệt, bắt đầu khi B5 xong:
  - Âm thanh = **mở rộng `Sfx` trong `web/js/game.js`** (không module âm thanh thứ 2), tôn trọng tắt tiếng, chỉ phát sau thao tác người dùng (iOS); ngọn lửa + lấp lánh tắt khi `prefers-reduced-motion`.
  - Khung app **≤ 375 KB gz** (hiện 374,8 – đo byte thật bằng `gzip -9`). Mọi UI/CSS mới **tải lười** (bundle trong `App.need`), giống `study-swipe.js`.
  - **Luôn rebase lên main mới nhất của lexkiteapp** trước mỗi lô/commit nộp.
  - **Không đụng file của các agent đang làm:** add-on CTA / landing / blog build / `extension/**`; `native.js` / widget (`widget-feed.js`); `classroom.js`, `functions/api/class*`; `lesson-fx.js`.

## TODO

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
- Cần sửa / Nhận xét:

### [B3] Blog 15 ngôn ngữ – bài vệ tinh theo cụm (lượt 3) · @antigravity · ưu tiên: cao
- Trạng thái: đợt 1–2 + đợt 3 phần 1 (ko/zh/de/fr) đã gộp. Phần còn lại của đợt 3 (ar, hi, ru, th, tr, pt, es, id, ja) **làm theo B5** (10 bài/ngôn ngữ).
- Cổng: `docs/BLOG-RUNBOOK.md`, `content/blog/WRITING-GUIDE.md`, từ khóa bản địa trong `briefs.json`, qualityScore ≥ 92, `blog-check` 0/0, alt/chú thích đúng `shots.json`, ≥ 2 link nội bộ + CTA đúng ý định, để trống `publishAt`. Vùng file: chỉ `content/blog/**`.
- Toàn văn thẻ (cơ cấu nội dung, đợt 3, nghiệm thu): BOARD-ARCHIVE.md [B3].
- Cần sửa / Nhận xét:

### [C1] Nút kêu gọi thông minh trên blog & trang từ vựng tĩnh (phễu về add-on / app) · @antigravity · ưu tiên: vừa
- Phạm vi còn lại (Claude 17/10): **chỉ phần blog** (`scripts/build-blog.mjs`, khối `{{cta}}` + cuối bài); dùng lại `extBox`/`ctaBox` trong `scripts/lib/site-layout.mjs`, KHÔNG sửa `build-samples*.mjs` (Claude đã làm trang tĩnh).
- Theo thiết bị: Chrome/Edge máy tính chưa cài add-on → mời cài add-on; điện thoại → thêm vào màn hình chính/app store; mọi thiết bị → "＋ Lưu bộ từ này vào thẻ ôn" (`/#/topic/<id>`). Không pop-up chặn đọc, tắt được 7 ngày, đo qua `/api/hit`, chữ 15 ngôn ngữ.
- Tiêu chí: `npm test` PASS (blog-check, crawl), LCP không tăng. Toàn văn: BOARD-ARCHIVE.md [C1].
- Báo cáo:
- Cần sửa / Nhận xét:

### [S1] Đóng băng chuỗi (Streak Freeze) – giao diện (logic đã xong) · @antigravity · ưu tiên: cao (làm sau L1)
- ⚠️ Phạm vi này nay nằm trong **[G2]** (UI Streak Freeze) – làm theo G2, không làm riêng (verify với Claude nếu khác). Logic: `Core.Stats.freezeInfo(state.game)` (+1 lượt mỗi 7 ngày chuỗi, tối đa 2) – KHÔNG sửa logic. Toàn văn cũ: BOARD-ARCHIVE.md [S1 freeze].
- Báo cáo:
- Cần sửa / Nhận xét:

### [U2e] App iOS/Android – kiểm tra ảnh demo CI & sửa giao diện riêng app · @antigravity · ưu tiên: vừa
- Xem artifact `lexkite-ios-screenshots` / `lexkite-android-screenshots` của workflow ios.yml / android.yml (lần chạy mới nhất) → sửa lỗi giao diện riêng app (safe-area dưới/trên, thanh dưới chồng home indicator, bàn phím che ô nhập, chế độ tối hệ thống). Selector dùng `html.native`.
- File: `web/css/style.css`. Báo cáo kèm tên ảnh đã kiểm.
- Báo cáo:
- Cần sửa / Nhận xét:

### [U1] Rà ảnh chụp giao diện tự động – sửa lỗi bố cục mobile/dark · @antigravity · ưu tiên: vừa
- Mục tiêu: xem ảnh trong nhánh `screens` (workflow `screens.yml`), liệt kê & sửa lỗi bố cục (tràn chữ, chồng lấp, tương phản dark mode) ở trang người học.
- File/khu vực: `web/css/style.css` (+ markup trang liên quan nếu bắt buộc, ghi rõ).
- Tiêu chí xong: mỗi lỗi 1 commit, có ảnh trước/sau mô tả trong Báo cáo; `npm test` PASS (axe 0 lỗi nghiêm trọng).
- Báo cáo:
- Cần sửa / Nhận xét:

### [N3] Cài đặt nâng cao cho tài khoản quản trị · @antigravity · ưu tiên: thấp (làm sau N2)
- Mục tiêu: trong tab Cài đặt thêm khối **"🛡️ Tài khoản quản trị"**: tab mặc định khi mở, ngôn ngữ & giao diện mặc định (đồng bộ theo email admin, lưu D1 `config` khóa `adm_pref:<email>`), chọn **loại cảnh báo nhận qua email** (lỗi JS, workflow, hộp thư, chất lượng, bản dịch), ngưỡng cảnh báo, **tự đăng xuất sau N phút không thao tác**, xuất nhật ký quản trị CSV, danh sách phiên/thiết bị gần đây của admin (từ `admin_log`).
- File/khu vực: `web/js/admin.js`, `web/css/admin.css`, `functions/api/admin.js`, `workers/mail/index.js` (chỉ phần đọc lựa chọn loại cảnh báo – Claude triển khai worker).
- Báo cáo:
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
→ `docs/agents/BOARD-ARCHIVE.md` (G2 22/10, G1, G0, W1, U3, U2d, P1, S1 thẻ khoe, X1, L1, B4, DUO1, B2 … – nguyên văn).
