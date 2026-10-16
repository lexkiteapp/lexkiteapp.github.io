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

### [B1] Blog chuẩn SEO có ảnh chụp app thật – lượt 1 (bù bài tiếng Anh) · @antigravity · ưu tiên: cao
- Mục tiêu: viết 5 bài tiếng Anh tương ứng 5 bài tiếng Việt đã có nhưng chưa có bản en (so `content/blog/vi` với `content/blog/en`, chọn bài evergreen/lượt xem cao trước).
- File/khu vực: `content/blog/en/<slug>.md`, `content/blog/shots.json`, `content/blog/media.json` (nếu thêm ảnh).
- Quy trình & chuẩn: `docs/COORDINATION.md` mục "Việc mở" số 3 + `content/blog/WRITING-GUIDE.md` (viết lại tự nhiên cho người học quốc tế, không dịch máy từng câu).
- Tiêu chí xong: `node scripts/blog-check.mjs <file>` 0 lỗi; `node scripts/blog-dupes.mjs` 0 lỗi; 2–3 ảnh app thật/bài; `node scripts/blog-schedule.mjs` đã xếp lịch; `npm test` PASS.
- Báo cáo:
- Cần sửa / Nhận xét:

### [U1] Rà ảnh chụp giao diện tự động – sửa lỗi bố cục mobile/dark · @antigravity · ưu tiên: vừa
- Mục tiêu: xem ảnh trong nhánh `screens` (workflow `screens.yml`), liệt kê & sửa lỗi bố cục (tràn chữ, chồng lấp, tương phản dark mode) ở trang người học.
- File/khu vực: `web/css/style.css` (+ markup trang liên quan nếu bắt buộc, ghi rõ).
- Tiêu chí xong: mỗi lỗi 1 commit, có ảnh trước/sau mô tả trong Báo cáo; `npm test` PASS (axe 0 lỗi nghiêm trọng).
- Báo cáo:
- Cần sửa / Nhận xét:

### [E1] Email "Báo cáo não bộ" hằng tuần · @antigravity · ưu tiên: thấp
- Mục tiêu: nối `web/templates/weekly-digest.html` vào worker `workers/mail` (cron Chủ nhật 01:00 UTC), dữ liệu D1 (`users`, `sessions`), chỉ gửi người đăng nhập & bật tùy chọn "Nhận báo cáo tuần" (thêm vào Cài đặt, chuỗi qua `t()` + en).
- File/khu vực: `workers/mail/*`, `web/js/app.js` (chỉ phần Cài đặt tùy chọn email), `web/js/i18n/en/*.js`.
- Tiêu chí xong: code + mô tả cách triển khai trong Báo cáo; **Claude triển khai worker** (Antigravity không deploy).
- Báo cáo:
- Cần sửa / Nhận xét:

## ĐANG LÀM

## CHỜ DUYỆT

## ĐÃ XONG
- [A0] Nhắc học thông minh (0e7c6c3c) · [A1] Giao diện Admin bento (trong c0e088db) · [A2] Trang Tôi (868e44cb) – Claude đã duyệt 16/10.
