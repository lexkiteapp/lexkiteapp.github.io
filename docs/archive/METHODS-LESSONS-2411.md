# METHODS – lỗi đã mắc cũ (tháng 10, nhật ký cũ)

> Tách nguyên văn từ `docs/METHODS.md` §8 (24/11/2026). Chỉ để tra cứu.

## 8. Lỗi đã mắc – dòng cũ

- Gộp nguyên nhánh Antigravity cũ → ghi đè bản sửa mới (alt ảnh, iPhone hover); nhánh làm trên khung cũ (`web/index.html` nay là landing, app ở `web/app/index.html`).
- Add-on: Chrome của anh nạp bản giải nén từ **thư mục dự án chính** `addon dictionary/extension` (ID lgjmm…), KHÔNG phải `~/lexkite-ext-live` → sau mỗi lần đẩy add-on: `git merge --ff-only` bản checkout chính rồi báo anh bấm ↻. Lỗi "Errors" cũ đến từ tab mở trước khi cập nhật (code mồ côi) → đóng tab cũ + Clear all.
- Credit: 20/10 phí ~1.100 cr do làm cả lô trước khi duyệt định dạng → chỉ chi khi anh ghi rõ số cho đúng việc; trần từng hạng mục.
- CDN media.lexkite.com đệm bản cũ, bỏ qua `?v=` → fetch theo `gitSha`.
- Không đăng nhập tài khoản thật để test; dùng `?sandbox=1`, fixture CI.
- Không in/lưu token/khóa/mật khẩu; secret đổ thẳng từ file (`wrangler pages secret put`, GitHub API libsodium). Repo công khai.
- Worktree agent có thể bắt đầu từ lịch sử CŨ (origin cũ) → brief luôn ghi "làm trên main mới nhất của lexkiteapp".
