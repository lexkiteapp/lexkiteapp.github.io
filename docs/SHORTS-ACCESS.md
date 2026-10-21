# Thư viện video quản trị – quyền đọc kho riêng `lexkite-shorts`

Quản trị → **🎬 Thư viện video** (`web/js/admin-video.js`) gọi `functions/api/admin-shorts.js` (sau `adminGate`).
Bìa và video nằm trong repo **riêng tư** `lexkiteapp/lexkite-shorts`; máy chủ đọc bằng một token chỉ-đọc rồi phát lại qua URL ký
ngắn hạn (HMAC, ≤ 2 giờ, hỗ trợ HTTP Range). Token không bao giờ tới trình duyệt.

Chưa có token → trang vẫn chạy với manifest gói sẵn `functions/api/_shorts_data.js` (lọc, thống kê, chép tiêu đề/mô tả đều dùng được);
ô bìa/video hiện "Cần token".

## Việc của chủ (một lần, ~3 phút)

- [ ] 1. GitHub → Settings → Developer settings → **Fine-grained tokens** → *Generate new token*
  (https://github.com/settings/personal-access-tokens/new)
  - Token name: `lexkite-admin-shorts-read`
  - Resource owner: **lexkiteapp**
  - Expiration: 1 năm (đặt nhắc gia hạn)
  - Repository access: **Only select repositories → `lexkiteapp/lexkite-shorts`** (chỉ repo này)
  - Permissions → Repository permissions → **Contents: Read-only** (Metadata: Read-only tự bật). Không cấp quyền nào khác.
  - Nếu tổ chức bật duyệt token: vào lexkiteapp → Settings → Personal access tokens → Pending requests → Approve.
- [ ] 2. Cloudflare → Workers & Pages → **lexkite** → Settings → Variables and Secrets → *Add* (môi trường **Production**,
  thêm cả Preview nếu muốn xem trên bản xem trước): Type **Secret**, Name **`SHORTS_READ_TOKEN`**, Value = token vừa tạo.
- [ ] 3. Deployments → *Retry deployment* bản mới nhất (secret chỉ có hiệu lực sau khi triển khai lại).
- [ ] 4. Mở `/admin.html#video`: dòng nguồn phải là "repo riêng lexkite-shorts (trực tiếp)", bìa hiện, bấm một video phát được.

Không dùng token `gh` cá nhân hay token có quyền ghi làm secret máy chủ. Thu hồi: xóa token trên GitHub → trang tự quay về chế độ manifest.

## Dữ liệu

| Nguồn | Tạo bởi | Ghi chú |
|---|---|---|
| `shorts/index.json` (repo riêng) | `scripts/cine/store_shorts.py` mỗi lần CI lưu bản đạt QA; dựng lại toàn bộ: `scripts/cine/shorts_index.py full <checkout>` | id, cảnh/định dạng, mẫu, lĩnh vực, CEFR, điểm học, thời lượng, QA + số đo, ngày dựng, lịch đăng, dung lượng, đường dẫn bìa/video |
| `functions/api/_shorts_data.js` (repo công khai, chỉ phục vụ sau adminGate) | `python3 scripts/cine/shorts_index.py public <index.json>` | bản sao manifest + `coverage.json` + lịch đăng + tóm tắt credit; không media |
| `content/video/cine/credits.json` | `python3 scripts/cine/credits_summary.py "<thư mục repo chính>"` | chỉ tổng credit theo kho/ngày; sổ `ledger.txt` (có mã tác vụ Kling) không commit |

Làm mới bản gói sẵn sau một đợt dựng mới: tải `shorts/index.json` của repo riêng → chạy lệnh `public` → commit.
