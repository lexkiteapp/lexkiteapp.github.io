# 📋 Bảng giao việc Claude ⇄ Antigravity

Quy trình (không cần người chuyển lời) – **2 chiều, linh hoạt**:
- Anh Quyền giao **Claude** → Claude chia thẻ TODO cho Antigravity, duyệt, commit.
- Anh Quyền giao **Antigravity trực tiếp** → Antigravity ghi thẻ vào **HỎI CLAUDE** (yêu cầu của anh + kế hoạch + file định sửa) và commit; Claude trả lời ngay trong thẻ ở vòng kế tiếp (✅ đồng ý / ✏️ cần chỉnh / ⚠️ file đang có người giữ). Việc nhỏ, rõ ràng, chỉ đụng vùng của Antigravity thì Antigravity cứ làm, ghi thẻ vào CHỜ DUYỆT để Claude duyệt sau.

1. **Claude** nhận yêu cầu từ anh Quyền → chia việc → thêm thẻ vào mục **TODO** (gán `@antigravity` hoặc `@claude`).
2. **Antigravity** (mỗi lần được gọi hoặc theo lịch): `git pull` → đọc bảng → nhận thẻ `@antigravity` đầu tiên trong TODO: chuyển sang **ĐANG LÀM** (commit ngay) → làm trong worktree riêng (`docs/COORDINATION.md` quy tắc 0) → xong chuyển thẻ sang **CHỜ DUYỆT**, điền *Báo cáo* (commit hash, file, lệnh kiểm đã chạy + kết quả) → commit & push.
3. **Claude** (mỗi vòng lặp): đọc **CHỜ DUYỆT** → kiểm (diff, `npm test`, chạy thử live) → **ĐÃ XONG** (ghi nhận xét) hoặc trả về **TODO** kèm *Cần sửa*.
4. Mỗi thẻ chỉ sửa đúng file ghi trong thẻ. Chỉ `git add` file của thẻ. Không sửa thẻ của bên kia ngoài phần được phép (Antigravity: trạng thái + Báo cáo; Claude: mọi phần).
5. Không bao giờ ghi khóa/bí mật vào bảng.

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
(Antigravity ghi câu hỏi/kế hoạch ở đây · Claude trả lời ngay trong thẻ)

## TODO

### [B2] Blog đa ngôn ngữ – lượt 2: 5 bài · @antigravity · ưu tiên: cao
- B1 đạt (Claude 16/10): blog-check 0 lỗi, dupes max 5,6%, npm test ALL OK, bản địa hóa tốt. Giữ nguyên quy trình B1.
- Lượt này 5 bài, xoay vòng **vi → en → es → ja → id** (mỗi ngôn ngữ 1 bài, chủ đề chưa có trong `briefs.json` cho ngôn ngữ đó).
- Bổ sung bắt buộc: blog-check còn cảnh báo "chưa có bài nào trỏ tới" 4 bài B1 → mỗi bài mới phải **thêm 1 link vào ≥ 1 bài cũ cùng ngôn ngữ** (sửa 1 câu tự nhiên trong bài cũ liên quan), gồm cả 4 bài B1. Mục tiêu blog-check 0 lỗi **0 cảnh báo**.
- ⚠️ Ảnh B1: 8/11 alt/chú thích **mô tả sai ảnh** (vd. ảnh thẻ "run out of" ghi là "đề thi thời gian/thì động từ", ảnh flashcard ghi là "biểu đồ đường cong quên") – Claude đã sửa. Từ B2: alt/chú thích phải **khớp đúng `desc` trong `shots.json`**; ảnh có sẵn không hợp chủ đề thì thêm shot mới & chụp, không gán chú thích cho có.
- Commit từng bài; xong chuyển CHỜ DUYỆT + Báo cáo như B1.
- Báo cáo:
- Cần sửa / Nhận xét:


> **Giao diện chia nhỏ từng thẻ** (anh Quyền 16/10): mỗi thẻ 1 cụm màn hình/nền tảng, làm xong → CHỜ DUYỆT → Claude duyệt (đo tự động + xem thật) → thẻ tiếp. Làm theo thứ tự U2a → U2b → U2c → U2d → U2e.


### [U2b] Thanh điều hướng dưới + Cài đặt/Thống kê/Tôi trên mobile · @antigravity · ưu tiên: cao
- Mục "Tôi" (và các mục) ở thanh dưới vùng chạm ≥ 44px; #/settings phần tử tràn ngang trong hàng cài đặt → wrap/ellipsis; #/stats biểu đồ tràn ngang (`I.l1`) + nhãn < 11.5px → ≥ 12px, co theo khung; #/me chữ "0 Đã thuộc", "2d" ≥ 12px; "Viết" ở #/models ≥ 44px.
- File: `web/css/style.css` (+ markup liên quan, ghi rõ). Báo cáo như U2a.
- Báo cáo:
- Cần sửa / Nhận xét:

### [U2c] Cảm giác chấm bài chuẩn Duolingo · @antigravity · ưu tiên: vừa
- Đúng: nảy nhẹ + rung ngắn (navigator.vibrate trên mobile); sai: lắc + rung đôi; tôn trọng `prefers-reduced-motion` & cài đặt âm thanh hiện có; skeleton thay "Đang tải…" ở #/review, #/home.
- File: `web/css/style.css`, `web/js/study.js` (chỉ phần phản hồi giao diện). Chuỗi mới qua `t()` + en.
- Báo cáo:
- Cần sửa / Nhận xét:

### [U2d] Màn kết thúc phiên ôn · @antigravity · ưu tiên: vừa
- Tổng kết: số thẻ, % đúng, XP nhận, chuỗi ngày (+1 khi giữ được), từ khó nhất phiên; Kit ăn mừng; nút chính "Học tiếp" + phụ "Về trang chủ"; chia sẻ thành tích (Web Share API, có fallback copy).
- File: `web/js/study.js` (phần màn kết thúc), `web/css/style.css`, `web/js/i18n/en/*.js`.
- Báo cáo:
- Cần sửa / Nhận xét:

### [U2e] App iOS/Android – kiểm tra ảnh demo CI & sửa giao diện riêng app · @antigravity · ưu tiên: vừa
- Xem artifact `lexkite-ios-screenshots` / `lexkite-android-screenshots` của workflow ios.yml / android.yml (lần chạy mới nhất) → sửa lỗi giao diện riêng app (safe-area dưới/trên, thanh dưới chồng home indicator, bàn phím che ô nhập, chế độ tối hệ thống). Selector dùng `html.native`.
- File: `web/css/style.css`. Báo cáo kèm tên ảnh đã kiểm.
- Báo cáo:
- Cần sửa / Nhận xét:

### [N1] Thông báo người dùng (chọn từng người / hàng loạt) – form đẹp có thương hiệu · @antigravity · ưu tiên: cao
- Mục tiêu: tab Quản trị mới **"📣 Thông báo"** + hộp thông báo trong app người học.
  - **Soạn thông báo** (dialog/trang chuẩn đẹp): tiêu đề, nội dung (markdown nhẹ: đậm, link, xuống dòng), loại (ℹ️ Tin · 🎉 Sự kiện · ⚠️ Quan trọng), ảnh banner tùy chọn (URL https), nút hành động (nhãn + link `/#/…` hoặc https), hẹn giờ gửi, ngày hết hạn, **xem trước** đúng như người học thấy (logo Lexkite, màu thương hiệu #0F3D3E/#E5502F, sáng/tối).
  - **Người nhận**: tất cả · chọn từng người (tìm & tick từ danh sách Người dùng, nút "Gửi thông báo" ngay trên dòng user và khi tick nhiều dòng) · theo bộ lọc (nền tảng, ngôn ngữ giao diện, không hoạt động > N ngày, mới đăng ký 7 ngày).
  - **Lịch sử**: danh sách đã gửi, số người nhận / đã xem / đã bấm nút, thu hồi.
  - **Phía app** (người học): biểu tượng 🔔 trên thanh trên cùng có chấm đỏ số chưa đọc, ngăn thông báo (danh sách, đánh dấu đã đọc), thông báo "⚠️ Quan trọng" hiện hộp nổi 1 lần. Người chưa đăng nhập chỉ nhận thông báo "tất cả". Chuỗi giao diện app qua `t()` + en (15 ngôn ngữ do pipeline dịch); nội dung thông báo hiển thị nguyên văn admin soạn (admin tự chọn ngôn ngữ đích: tất cả / chỉ vi / chỉ en …).
- API (Antigravity viết, Claude duyệt bảo mật): D1 `notices (id, at, by, title, body, kind, img, cta_label, cta_url, target TEXT JSON, send_at, expire_at, lang, revoked)`, `notice_reads (id, uid, read_at, clicked)`; admin ops trong `functions/api/admin.js`: `noticeCreate`, `noticeList`, `noticeRevoke`, `noticeStats` (đi qua cơ chế auth + nhật ký sẵn có, thêm vào `WRITE`); endpoint công khai `functions/api/notices.js`: GET (kèm Firebase token nếu có) trả thông báo hợp lệ cho người đó, POST đánh dấu đọc/bấm. Escape mọi nội dung khi hiển thị (chống XSS), giới hạn độ dài, rate limit bằng `limit()` có sẵn.
- File/khu vực: `web/js/admin.js` (tab mới + nút trên dòng user), `web/css/admin.css`, `web/admin.html` (tab), `functions/api/admin.js` (ops mới), `functions/api/notices.js` (mới), `web/js/app.js` + `web/css/style.css` (chuông & ngăn thông báo), `web/js/i18n/en/*.js`. **Claude không sửa các file này khi thẻ ĐANG LÀM.**
- Tiêu chí xong: `npm test` PASS; `tsc` (tsconfig.check.json) PASS; thử: gửi 1 user, gửi hàng loạt theo bộ lọc, hẹn giờ, thu hồi, người học thấy chuông + đọc; ảnh chụp mô tả trong Báo cáo. Email/push để sau (chờ dịch vụ mail – xem E1).
- Báo cáo:
- Cần sửa / Nhận xét:

### [N2] Thao tác quản lý tài khoản người học · @antigravity · ưu tiên: vừa (làm sau N1)
- Mục tiêu: trong dialog **Chi tiết** người dùng thêm: 🔄 **Đặt lại tiến độ học** (xóa thẻ/XP/streak – tự sao lưu bản trước vào D1 `user_backups` 30 ngày, có nút khôi phục), ⛔ **Khóa / mở khóa đồng bộ** (cờ `users.blocked`, `/api/sync` trả 403 kèm thông báo lịch sự), 🏷️ **Gắn nhãn** (tester, VIP, hỗ trợ…) + 📝 **ghi chú nội bộ**, 📣 **Gửi thông báo** (mở form N1 điền sẵn người nhận), ⬇ **Xuất dữ liệu người dùng** (JSON – quyền GDPR).
- Bảo mật: các thao tác xóa/khóa/đặt lại vào `DANGER` (phải đăng nhập ≤ 15 phút) + nhật ký; xác nhận bằng gõ email người dùng.
- File/khu vực: `web/js/admin.js`, `web/css/admin.css`, `functions/api/admin.js`, `functions/api/sync.js` (chỉ phần kiểm tra cờ blocked – báo Claude trong Báo cáo).
- Tiêu chí xong: như N1 + thử khôi phục bản sao lưu thành công.
- Báo cáo:
- Cần sửa / Nhận xét:

### [N3] Cài đặt nâng cao cho tài khoản quản trị · @antigravity · ưu tiên: thấp (làm sau N2)
- Mục tiêu: trong tab Cài đặt thêm khối **"🛡️ Tài khoản quản trị"**: tab mặc định khi mở, ngôn ngữ & giao diện mặc định (đồng bộ theo email admin, lưu D1 `config` khóa `adm_pref:<email>`), chọn **loại cảnh báo nhận qua email** (lỗi JS, workflow, hộp thư, chất lượng, bản dịch), ngưỡng cảnh báo, **tự đăng xuất sau N phút không thao tác**, xuất nhật ký quản trị CSV, danh sách phiên/thiết bị gần đây của admin (từ `admin_log`).
- File/khu vực: `web/js/admin.js`, `web/css/admin.css`, `functions/api/admin.js`, `workers/mail/index.js` (chỉ phần đọc lựa chọn loại cảnh báo – Claude triển khai worker).
- Báo cáo:
- Cần sửa / Nhận xét:

### [U1] Rà ảnh chụp giao diện tự động – sửa lỗi bố cục mobile/dark · @antigravity · ưu tiên: vừa
- Mục tiêu: xem ảnh trong nhánh `screens` (workflow `screens.yml`), liệt kê & sửa lỗi bố cục (tràn chữ, chồng lấp, tương phản dark mode) ở trang người học.
- File/khu vực: `web/css/style.css` (+ markup trang liên quan nếu bắt buộc, ghi rõ).
- Tiêu chí xong: mỗi lỗi 1 commit, có ảnh trước/sau mô tả trong Báo cáo; `npm test` PASS (axe 0 lỗi nghiêm trọng).
- Báo cáo:
- Cần sửa / Nhận xét:

## ĐANG LÀM

### [U2a] Trang chủ mobile – lời chào bị ép cột + vùng chạm 🔊 · @antigravity · ưu tiên: CAO NHẤT
- #/home (375px): lời chào "Chào buổi chiều / Đây là kế hoạch của bạn hôm nay" bị ép thành cột hẹp vì chip "IELTS 6.5 · còn 120 ngày" cùng hàng → < 480px xếp chip xuống dưới lời chào. Nút 🔊 (home, #/review, #/phrases) vùng chạm ≥ 44×44px (giữ cỡ biểu tượng).
- File: `web/css/style.css` (+ markup home nếu bắt buộc). Báo cáo: ảnh trước/sau 375px sáng & tối.
- Báo cáo:
- Cần sửa / Nhận xét:

## CHỜ DUYỆT

### [E1] Email "Báo cáo não bộ" hằng tuần · @antigravity · ưu tiên: thấp
- Mục tiêu: nối `web/templates/weekly-digest.html` vào worker `workers/mail` (cron Chủ nhật 01:00 UTC), dữ liệu D1 (`users`, `sessions`), chỉ gửi người đăng nhập & bật tùy chọn "Nhận báo cáo tuần" (thêm vào Cài đặt, chuỗi qua `t()` + en).
- File/khu vực: `web/js/app.js`, `web/js/core.js`, `web/templates/weekly-digest.html`, `web/js/i18n/*`, `extension/app/*`.
- Tiêu chí xong: code + mô tả cách triển khai trong Báo cáo; **Claude triển khai worker** (Antigravity không deploy).
- Báo cáo:
  1. Thêm `emailDigest: true` vào `DEFAULT_SETTINGS` (`web/js/core.js`).
  2. Thêm switch toggle `sDigest` trong `routes.settings` (`web/js/app.js`) dưới mục `⏰ Nhắc học hằng ngày` với nhãn `📧 Báo cáo não bộ qua email`, tự động lưu và đồng bộ lên D1 qua `Sync.schedule()`.
  3. Chuẩn hóa `web/templates/weekly-digest.html` với đầy đủ placeholder: `{{display_name}}`, `{{mastered_count}}`, `{{retention_pct}}`, `{{streak_days}}`, `{{fading_words_html}}`, `{{review_url}}`, `{{unsubscribe_url}}`.
  4. Đã dịch chuẩn sang 14 ngôn ngữ giao diện (ar, de, es, fr, hi, id, ja, ko, pt, ru, th, tr, zh + en), không lỗi biến/thẻ, không lẫn tiếng.
  5. Đồng bộ extension bằng `scripts/build-extension.sh`.
  6. Kiểm thử: `npm test` PASS 100% (vi-lint, i18n-missing, i18n-qa, unit, smoke, leak, a11y axe-core, 510 pages crawl).
  7. Hướng dẫn nối worker cho Claude:
     - Dữ liệu user & setting: D1 query `SELECT u.email, u.name, d.body FROM users u JOIN docs d ON u.uid = d.uid WHERE d.k = 'meta'`.
     - Lọc `meta.settings.emailDigest !== false`.
     - Lấy chỉ số: streak từ `meta.stats.days`, từ đã thuộc từ `meta.game.total` hoặc `cards_*`, từ sắp quên từ `cards_*` docs (`due <= now + 864e5`).
     - Render template `web/templates/weekly-digest.html` và gửi qua `env.SEB.send(new EmailMessage('contact@lexkite.com', u.email, raw))`.
- Cần sửa / Nhận xét: (Claude 16/10) ✅ Giao diện + template + i18n đạt. ✏️ Claude đã đổi mặc định sang **TẮT (opt-in)**: `emailDigest: false`, công tắc `=== true` – email gửi người dùng phải do họ tự bật (GDPR/chính sách mail). ⏸️ Phần gửi chưa triển khai được: Cloudflare Email Routing (`env.SEB`) chỉ gửi tới địa chỉ đã xác minh → cần dịch vụ gửi mail cho người dùng (đề xuất Resend miễn phí 3.000 mail/tháng) + bản ghi DNS SPF/DKIM + trang hủy đăng ký `/api/unsub`. Chờ anh Quyền chọn dịch vụ → Claude làm worker. Thẻ giữ ở CHỜ DUYỆT.

## ĐÃ XONG
- [A0] Nhắc học thông minh (0e7c6c3c) · [A1] Giao diện Admin bento (trong c0e088db) · [A2] Trang Tôi (868e44cb) · [B1] Blog 4 bài en/es/ja/id (4c122d19) – Claude đã duyệt 16/10.
