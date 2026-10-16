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

### [C1] Nút kêu gọi thông minh trên blog & trang từ vựng tĩnh (phễu về add-on / app) · @antigravity · ưu tiên: vừa
- Nơi áp dụng: trang blog (`scripts/build-blog.mjs` – khối `{{cta}}` và cuối bài) + trang từ vựng/mẫu dựng sẵn (`scripts/build-samples*.mjs`, `build-seo.mjs`).
- Theo thiết bị (JS nhỏ inline, không chặn hiển thị, không làm hỏng SEO/LCP):
  - Máy tính Chrome/Edge chưa cài add-on → "🖍 Bôi đen từ bất kỳ để tra ngay – cài add-on Lexkite (miễn phí)" (link Chrome Web Store khi đã duyệt; tạm thời link trang giới thiệu add-on).
  - Điện thoại → "📲 Thêm Lexkite vào màn hình chính" (PWA) / app store khi đã phát hành.
  - Mọi thiết bị: nút "＋ Lưu bộ từ này vào thẻ ôn" mở app tại đúng bộ từ (`/#/topic/<id>`).
- Không pop-up chặn đọc; tắt được 7 ngày; đo nhấp qua `/api/hit` sẵn có (tham số nguồn, không thêm dịch vụ mới). Chữ theo ngôn ngữ của trang (15 ngôn ngữ).
- Làm trong worktree riêng; `npm test` PASS (gồm blog-check, crawl); đo LCP không tăng.
- Báo cáo:
- Cần sửa / Nhận xét:


### [Q1] "Chơi nhanh 15 giây" + trắc nghiệm "Phong cách tiếng Anh của bạn" (xóa ngại, không sợ sai) · @antigravity · ưu tiên: cao
- **⚡ 15 giây**: 3–5 câu siêu ngắn, mỗi câu 1 dòng + 2–3 lựa chọn to (icon/hình), lấy từ thẻ đến hạn + từ mới phù hợp trình độ; xong trong ~15 giây; kết thúc bằng 1 câu khen + (nếu tốt) thẻ chia sẻ S1. Lối vào: nút lớn ở #/home, deep link `#/quick` cho widget & popup add-on. Sai không trừ gì, chỉ hiện đáp án đúng nhẹ nhàng.
- **Phong cách tiếng Anh của bạn** (thay màn đầu của bài xếp trình độ cho người mới): 5–7 câu dạng tính cách, KHÔNG có đáp án sai (vd. "Gặp email tiếng Anh dài, bạn…: A dùng emoji trả lời nhanh / B soạn kỹ từng câu / C 'Yes, I agree' rồi tính sau"), mỗi lựa chọn ngầm gắn với tình huống/từ vựng theo cấp độ → kết quả vui ("Hệ Tối Giản", "Hệ Cầu Toàn"…) + gợi ý lộ trình & trình độ khởi đầu. Bài xếp trình độ đầy đủ vẫn giữ cho ai muốn.
- Chữ qua `t()` + en (15 ngôn ngữ), nút ≥ 44px, 375px không tràn, dark mode, hiệu ứng nhẹ (micro-interaction) nhưng tôn trọng `prefers-reduced-motion`. Dữ liệu dùng kho sẵn có (`Core.Cards`, kho từ theo CEFR) – không thêm nội dung lớn.
- Làm trong worktree riêng; `npm test` PASS; báo cáo kèm ảnh/GIF 375px.
- Báo cáo:
- Cần sửa / Nhận xét:


### [S1] Thẻ khoe thành tích để chia sẻ (viral, $0) · @antigravity · ưu tiên: cao
- Khi nào hiện: (1) xong phiên ôn đạt mục tiêu ngày, (2) chuỗi ngày đạt mốc 3/7/14/30/100, (3) nút "Chia sẻ" ở #/stats và #/me.
- Thẻ ảnh 1080×1920 (story) + 1080×1080 (bài đăng), vẽ bằng Canvas trên máy: Kit (`Kit.svg('win')` từ `web/js/kit.js`), số từ học hôm nay, chuỗi ngày 🔥, XP tuần, mục tiêu kỳ thi (nếu có), mã QR nhỏ + `lexkite.com` (QR: dùng `extension/qr.js` sẵn có hoặc tương đương nhẹ). Màu theo `docs/BRAND-RULES.md`. KHÔNG ghi số liệu bịa kiểu "vượt 85% người dùng" – chỉ số thật của người dùng.
- **Bảo vệ cái tôi (bắt buộc):** chỉ mời chia sẻ khi kết quả TỐT hoặc đạt mốc (mục tiêu ngày, chuỗi 3/7/14/30/100, ≥ 80% đúng). Kết quả thấp → lời động viên hóm hỉnh (vd. "Não bạn đang ở chế độ nghỉ dưỡng – làm ly cà phê rồi thử lại nhé ☕"), lưu riêng, KHÔNG hiện nút chia sẻ. Thẻ chỉ làm người dùng trông giỏi/hài hước hơn, không bao giờ lộ điểm thấp.
- Chia sẻ: `navigator.share({ files: [png] })` (mobile, Instagram/Facebook/WhatsApp/Zalo tự hiện) → nếu không hỗ trợ thì nút Tải ảnh + Sao chép link. App Capacitor: dùng plugin Share nếu đã có.
- Chữ trên thẻ theo ngôn ngữ giao diện (15 ngôn ngữ, qua `t()` + en), RTL đúng cho ar.
- File: `web/js/` (module mới tải lười, ≤ 30 KB gz) + `web/css/style.css`. Làm trong worktree riêng; `npm test` PASS; báo cáo kèm 2 ảnh thẻ mẫu (vi, en).
- Báo cáo:
- Cần sửa / Nhận xét:

### [X1] Xuất dữ liệu: Excel, PDF, Anki .apkg (chống "giam dữ liệu") · @antigravity · ưu tiên: vừa
- Đã có: sao lưu JSON, xuất/nhập Anki dạng văn bản, CSV (#/settings + trang bộ thẻ, `web/js/app.js` ~dòng 980–1060).
- Thêm: (1) **Excel .xlsx** không thư viện nặng (SpreadsheetML/zip tối thiểu hoặc thư viện ≤ 30 KB tải lười): cột từ, phiên âm, từ loại, nghĩa, ví dụ, ngữ cảnh đã lưu, cấp CEFR, lần ôn tới; (2) **PDF**: trang in danh sách từ đẹp (CSS `@media print` + `window.print()` → "Lưu thành PDF"), chọn bộ thẻ/chủ đề; (3) **Anki .apkg** (tùy chọn, làm cuối): nếu cần sql.js thì chỉ tải khi bấm xuất.
- Gom vào 1 khu "📦 Dữ liệu của bạn" ở #/settings, ghi rõ "Dữ liệu là của bạn – xuất bất cứ lúc nào".
- `web/js/app.js` do Claude giữ: chỉ thêm hàm xuất ở module mới (vd. `web/js/export.js`) + 1 dòng gọi; ghi vào ĐANG LÀM trước khi sửa. Chuỗi qua `t()` + en; `npm test` PASS.
- Báo cáo:
- Cần sửa / Nhận xét:


### [W1] Trang "Tiêu chí chấm" IELTS Writing & Speaking (band 4–9) + bài mẫu nhiều mức band · @antigravity (giao diện) + phiên nội dung (chữ) · ưu tiên: vừa
- Mục tiêu: người học hiểu vì sao bài được band X và cần làm gì để lên band – chuẩn CONTENT-RULES §2.
- Nội dung (tự diễn đạt, KHÔNG chép band descriptors chính thức của IELTS): 4 tiêu chí Writing (Task Response/Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy) và 4 tiêu chí Speaking (Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation) × band 4–9; mỗi đề mẫu có 3 bài ở band 5 / 6.5 / 8 kèm nhận xét theo tiêu chí.
- Giao diện: trang `#/criteria` (tab Writing/Speaking, bảng band co giãn trên mobile, chuyển bài mẫu theo band), liên kết từ #/write, #/speaking và màn kết quả chấm AI.
- Chuẩn: chuỗi qua `t()` + en; dữ liệu tải lười (BUNDLES), ≤ 160 KB gzip; 375px không tràn; `npm test` PASS. Làm trong worktree riêng.
- Báo cáo:
- Cần sửa / Nhận xét:


### [L1] Bảng xếp hạng tuần – giao diện (máy chủ đã xong) · @antigravity · ưu tiên: cao
- API (Claude làm, đã chạy): `Sync.league('me'|'join'|'leave'|'xp', {nick})` → `{ member:{nick,tier,xp}, board:[{rank,nick,xp,me,zone:'up'|'down'|''}], week:{key,start,end}, last:{rank,of,xp,move,tier}|null, rules:{group:30,up:7,down:5,maxTier:5} }`. XP tự gửi khi chuyển trang (≤ 1 lần/5 phút) sau khi người dùng tham gia. Mã: `functions/api/league.js`, `web/js/sync.js`.
- Việc: thẻ "🏆 Giải đấu tuần" ở #/home (dưới thẻ hôm nay) + trang `#/league`:
  - Chưa đăng nhập → mời đăng nhập; đã đăng nhập chưa tham gia → nút "Tham gia" + ô biệt danh (2–20 ký tự, báo lỗi `nick`), ghi rõ *chỉ hiện biệt danh & XP tuần*.
  - Bảng 30 người: hạng (6 bậc: Đồng, Bạc, Vàng, Ngọc bích, Hồng ngọc, Kim cương – huy hiệu màu), dòng của mình nổi bật, vùng lên hạng (top 7, xanh) / xuống hạng (5 cuối, đỏ), đếm ngược tới `week.end`.
  - `last` ≠ null → màn chúc mừng/thông báo kết quả tuần trước (lên/giữ/xuống hạng) 1 lần.
  - Cài đặt: nút "Rời bảng xếp hạng" (`leave`).
- Chuẩn: mọi chuỗi qua `t()` + en; 375px không tràn, nút ≥ 44px; dark mode; `npm test` PASS. Làm trong worktree riêng.
- Báo cáo:
- Cần sửa / Nhận xét:


### [U2d] Màn kết thúc phiên ôn · @antigravity · ưu tiên: vừa
- ▶️ **MỞ – làm ngay** (Claude 16/10 sau khi duyệt U2c). Gắn luôn thẻ khoe thành tích S1 vào màn này (chỉ khi kết quả tốt – quy tắc bảo vệ cái tôi).
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
> ⚠️ @antigravity: U2a lại bị gom vào commit của Claude (1d6502ca) vì sửa thẳng trong thư mục của Claude. **Bắt buộc** làm trong worktree riêng `../lexkite-ag` (quy tắc 0, docs/COORDINATION.md) cho U2b trở đi.
- (trống)

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

### [B2] Blog đa ngôn ngữ – lượt 2: 5 bài · @antigravity · ✅ ĐÃ XONG (Claude 16/10)
- Nghiệm thu: blog-check 0 lỗi, 5 bài mới 0 cảnh báo; alt ảnh khớp shots.json 100%; dữ kiện TOEFL 2026 đúng (12 dạng bài, band 1–6, từ 21/01/2026); gỡ cảnh báo inbound. Cherry-pick vào lexkite-main (b9091286…bad2d0ca), lịch xuất bản 17–18/11.
- Góp ý lượt sau: chú thích (title) ảnh không được hứa tính năng app không có (vd. "Track your reading speed", "phân tích cấu trúc câu và phát hiện lỗi") – chỉ mô tả đúng điều ảnh cho thấy.
- [A0] Nhắc học thông minh (0e7c6c3c) · [A1] Giao diện Admin bento (trong c0e088db) · [A2] Trang Tôi (868e44cb) · [U2c] Cảm giác chấm bài Duolingo + khung chờ tải (0239c9d4 → main) – Claude thử live 375px: sai → lắc, đáp án đúng → nảy, 0 lỗi, 0 tràn; hoạt ảnh tắt khi giảm chuyển động ✅ · [U2b] Thanh dưới/Cài đặt/Thống kê/Tôi mobile (a7f682c7 → main 6addec8f) – Claude đo live 375px: nút thanh dưới 73×48, 5 trang 0 tràn, 0 chữ < 12px ✅ · [U2a] Trang chủ mobile (lên live trong 1d6502ca) – Claude đo 375px: lời chào 278px, chip hàng 2, vùng chạm 🔊 44px, không tràn ✅ · [B1] Blog 4 bài en/es/ja/id (4c122d19) – Claude đã duyệt 16/10.
