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

### [U1] Rà ảnh chụp giao diện tự động – sửa lỗi bố cục mobile/dark · @antigravity · ưu tiên: vừa
- Mục tiêu: xem ảnh trong nhánh `screens` (workflow `screens.yml`), liệt kê & sửa lỗi bố cục (tràn chữ, chồng lấp, tương phản dark mode) ở trang người học.
- File/khu vực: `web/css/style.css` (+ markup trang liên quan nếu bắt buộc, ghi rõ).
- Tiêu chí xong: mỗi lỗi 1 commit, có ảnh trước/sau mô tả trong Báo cáo; `npm test` PASS (axe 0 lỗi nghiêm trọng).
- Báo cáo:
- Cần sửa / Nhận xét:

## ĐANG LÀM

### [B1] Blog chuẩn SEO đa ngôn ngữ – LƯỢT THỬ 4 bài xen kẽ · @antigravity · ưu tiên: cao
- Mục tiêu: 4 bài, mỗi ngôn ngữ 1 bài, rải xen kẽ: **en → es → ja → id** (blog đang bật 5 ngôn ngữ; hiện vi 80 · en 24 · es 2 · ja 2 · id 2). Chọn chủ đề từ `content/blog/briefs.json` mà ngôn ngữ đó chưa có, ưu tiên evergreen người học nước đó hay tìm (vd. es: vocabulario IELTS, ja: TOEIC 単語 覚え方, id: tips belajar kosakata).
- Viết **bản địa hóa thật** (người bản ngữ đọc tự nhiên, ví dụ hợp người học nước đó – lỗi hay gặp của người Nhật/Indonesia/Tây Ban Nha khi học tiếng Anh), KHÔNG dịch máy từng câu từ bài vi.
- File/khu vực: `content/blog/<lang>/<slug>.md` (front matter đúng §5, `lang:` đúng, `publishAt:` trống, `status: ready`, `translationOf:` nếu là bản của bài vi), `content/blog/shots.json`/`media.json` nếu thêm ảnh.
- Chuẩn SEO (rule đã xây – `content/blog/WRITING-GUIDE.md`, `docs/SEO-PLAN.md`): tiêu đề 30–65 ký tự có từ khóa chính (với ja: 20–40 ký tự), mô tả 110–160 ký tự (ja: 60–120), ≥ 1.200 từ (ja ≥ 3.000 ký tự), ≥ 4 H2, từ khóa trong 120 từ đầu, 2–3 ảnh app thật `media:<id>` alt đúng, ≥ 2 link app `/#/…`, ≥ 1 link bài khác cùng ngôn ngữ, đúng 1 `{{cta}}`, mục FAQ 3–4 câu.
- Kiểm: `node scripts/blog-check.mjs <file>` 0 lỗi · `node scripts/blog-dupes.mjs` 0 lỗi · `npm test` PASS · `node scripts/blog-schedule.mjs` (xếp lịch).
- Commit: 1 commit cho cả lượt (chỉ các file bài + media/shots), push, chuyển thẻ sang CHỜ DUYỆT với Báo cáo: slug từng bài, từ khóa chính, số từ, ảnh dùng, kết quả lệnh kiểm.
- Claude duyệt (đọc mẫu, kiểm SEO, xem bản dựng) → đạt thì mở thẻ B2 (5 bài/lượt, xoay vòng en/es/ja/id/vi).
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
- [A0] Nhắc học thông minh (0e7c6c3c) · [A1] Giao diện Admin bento (trong c0e088db) · [A2] Trang Tôi (868e44cb) – Claude đã duyệt 16/10.
