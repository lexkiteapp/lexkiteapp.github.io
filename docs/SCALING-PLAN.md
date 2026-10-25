# Kế hoạch mở rộng hạ tầng Cloudflare Workers (> 100k người học/ngày)

> TL;DR: Kế hoạch mở rộng Cloudflare Workers > 100k người học/ngày: giới hạn gói miễn phí, chốt phòng thủ, lộ trình nâng cấp, bước bật gói Paid. Edge-first, local-first.
> Đọc khi: cân nhắc nâng gói.

> Tài liệu kỹ thuật vận hành và mở rộng cho **Lexkite**. Thiết kế theo triết lý Edge-first & Local-first: tối đa xử lý trên thiết bị người dùng và tại biên CDN, giữ chi phí tiệm cận 0 đồng kể cả khi quy mô người dùng tăng vọt.

---

## 1. Giới hạn gói miễn phí hiện tại (Cloudflare Free Tier)

| Thành phần | Hạn mức gói Free | Trạng thái hiện tại của Lexkite |
|---|---|---|
| **Cloudflare Pages + Functions** | 100.000 requests/ngày | ~3.000 – 12.000 req/ngày |
| **Cloudflare D1 (Database)** | 5.000.000 lượt đọc/ngày<br>100.000 lượt ghi/ngày<br>5 GB lưu trữ | Lượt ghi: ~2.000 – 5.000/ngày<br>Lưu trữ: < 50 MB |
| **Workers AI** | 10.000 neurons/ngày | Đang dùng cho chấm Speaking/Writing |
| **Email Routing** | Miễn phí không giới hạn forward | support@lexkite.com |
| **Cloudflare Turnstile** | Không giới hạn số lần xác thực | Form liên hệ (#/contact) |

---

## 2. Các chốt phòng thủ tự động đã cài đặt (Client & Edge Guards)

Hệ thống đã được tích hợp sẵn 4 cơ chế bảo vệ tài nguyên ngay trong mã nguồn để không bị tràn hạn mức:

1. **Lấy mẫu thống kê ngẫu nhiên theo người dùng (`hit_rate`):**
   - Đặt trong **Quản trị → Cài đặt website** (`hit_rate`).
   - Client hash mã `vid` theo xác suất `(parseInt(vid.slice(0, 6), 36) % 1000) < hit_rate * 1000`.
   - Khi lượng người dùng tăng lên 50.000 người/ngày: Quản trị viên chỉ cần chỉnh `hit_rate = 0.2` (lấy mẫu 20%).
   - Khi đạt 200.000 người/ngày: đặt `hit_rate = 0.05` (5%). Mọi số liệu tỷ lệ %, trung bình thời gian học và xu hướng vẫn chính xác 100% trong khi lượt ghi D1 sessions luôn nằm dưới 10.000/ngày.

2. **Chặn ghi trùng lặp phiên (Throttle 60s & `pagehide`):**
   - Trong `web/js/app.js`: phiên học chỉ gửi tối đa 1 lần mỗi 60 giây và gửi lần cuối khi tắt tab (`pagehide`).
   - Giảm 90% số request `hit` không cần thiết khi người dùng chuyển qua lại các tab.

3. **Bộ đệm thông minh 2 lớp (Client Storage & Edge Cache):**
   - Cấu hình chung (`/api/config`): Client đệm trong `localStorage` 1 giờ (`lk.cfg`). Mỗi người dùng mở app nhiều lần trong ngày chỉ gọi server đúng 1 lần.
   - Ảnh minh họa Openverse (`/api/img`): Đệm tại Cache API biên Cloudflare (30 ngày cho ảnh hợp lệ, 7 ngày cho từ không có ảnh). Hàng triệu người tra cùng một từ vựng đều lấy từ cache, không tốn thêm request về server gốc.

4. **Tách biệt dữ liệu tĩnh nặng (CDN Pinning):**
   - Dữ liệu đề thi, kho từ vựng (AWL, NGSL, TOEIC) và âm thanh được phục vụ qua CDN GitHub Pages / jsDelivr miễn phí, không tiêu tốn băng thông của Cloudflare Pages/Functions.

---

## 3. Lộ trình nâng cấp khi vượt mốc 100.000 người dùng/ngày

### Khi nào cần nâng gói trả phí?
Khi người dùng hoạt động hằng ngày (**DAU**) vượt quá **100.000** và tổng số lượt ghi D1 (đồng bộ thẻ từ vựng + thống kê) chạm ngưỡng **80.000 lượt/ngày**.

### Gói đề xuất: **Cloudflare Workers Paid**
- **Chi phí cố định:** **5 USD/tháng** (~125.000 VNĐ/tháng).
- **Hạn mức bao gồm:**
  - **10.000.000 requests/tháng** (vượt ngưỡng: chỉ tính **0.30 USD** cho mỗi 1.000.000 request tiếp theo).
  - **Cloudflare D1 Paid:**
    - **25.000.000.000 lượt đọc/tháng** (25 tỷ).
    - **50.000.000 lượt ghi/tháng** (50 triệu, đủ cho 1.5 triệu lượt đồng bộ mỗi ngày).
    - Lưu trữ: 50 GB.
  - **CPU time:** Nâng từ 10ms lên tới 50ms cho mỗi invocation (thoải mái xử lý mã hóa, JWT, nén chuỗi).

### Dự toán chi phí theo quy mô người dùng:

| Quy mô DAU (Người/ngày) | Thiết lập `hit_rate` | Gói Cloudflare | Chi phí dự kiến/tháng |
|---|---|---|---|
| **1.000 – 30.000** | `1.0` (100%) | **Free Tier** | **0 USD** |
| **30.000 – 100.000** | `0.3` (30%) | **Free Tier** | **0 USD** |
| **100.000 – 500.000** | `0.1` (10%) | **Workers Paid ($5)** | **~5 – 8 USD** (~125k – 200k đ) |
| **1.000.000+** | `0.05` (5%) | **Workers Paid ($5)** + overage | **~15 – 25 USD** (~375k – 625k đ) |

*(So sánh: Một cụm VPS / Kubernetes trên AWS/GCP để tải 1 triệu người dùng/ngày tốn tối thiểu 200 – 500 USD/tháng. Kiến trúc Serverless Edge của Lexkite tiết kiệm hơn 95% chi phí).*

---

## 4. Các bước kỹ thuật kích hoạt gói Paid (Khi có nhu cầu)

1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Vào mục **Workers & Pages** → **Plans** → Chọn **Workers Paid** ($5/month).
3. Thêm phương thức thanh toán quốc tế (Visa/Mastercard hoặc PayPal doanh nghiệp).
4. Trong Cloudflare Pages của Lexkite:
   - Đảm bảo bindings `DB` (D1 Database) đang liên kết đúng database `lexkite-db`.
   - Cấu hình biến môi trường `GEMINI_KEY` (để dùng API Gemini trực tiếp nếu cần vượt ngưỡng Workers AI).
5. Truy cập trang Quản trị Lexkite (`/#/admin/settings`):
   - Đặt `hit_rate = 0.1` hoặc phù hợp với lượng truy cập.
   - Tăng `ai_global` lên `2000` hoặc `5000` theo nhu cầu học viên.
