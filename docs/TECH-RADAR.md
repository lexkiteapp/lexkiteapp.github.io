# Tech radar Lexkite – chuẩn đầu vào khi nâng cấp

> Nguyên tắc: ưu tiên công nghệ **miễn phí, tiên tiến, được các hãng lớn chia sẻ** (Google/Chrome, Cloudflare, Mozilla, Hugging Face, W3C), chạy **trên máy người dùng hoặc ở biên** để nhanh, rẻ, riêng tư và scale toàn cầu.
> Mỗi lần nâng cấp: đối chiếu radar → chọn mục "Áp dụng ngay" có giá trị nhất → ghi kết quả vào đây. Thêm công nghệ mới: ghi tên, lợi ích, giới hạn miễn phí, trạng thái.

Trạng thái: **Đang dùng** · **Áp dụng ngay** (đã duyệt, chờ làm) · **Thử nghiệm** · **Không dùng** (kèm lý do)

## Học & AI
| Công nghệ | Của | Dùng cho | Miễn phí | Trạng thái |
|---|---|---|---|---|
| FSRS (thuật toán lặp lại ngắt quãng) | open-spaced-repetition | lịch ôn thẻ | mã mở | Đang dùng |
| Chrome Built-in AI – Prompt API (Gemini Nano) | Google | giải thích, gợi ý trên máy | trên máy | Đang dùng (dự phòng) |
| **Chrome Translator API + Language Detector API** | Google | dịch nghĩa/câu **trên máy**, không giới hạn lượt, offline | trên máy | **Áp dụng ngay** – thay dần Google Translate gtx ở client |
| Chrome Summarizer / Rewriter / Proofreader API | Google | tóm tắt bài đọc, gợi ý viết lại, sửa lỗi bài viết | trên máy | Thử nghiệm |
| Cloudflare Workers AI (Llama 3.1 8B) | Cloudflare | chấm Writing/Speaking | 10.000 neurons/ngày | Đang dùng |
| **Cloudflare Workers AI – m2m100 (dịch máy)** | Meta/Cloudflare | dịch trong pipeline khi Google gtx bị chặn | trong 10.000 neurons/ngày | **Áp dụng ngay** – nguồn dịch dự phòng cho CI |
| Whisper (transformers.js, WebGPU) | OpenAI/Hugging Face | nhận dạng giọng nói trên máy | trên máy | Đang dùng |
| Kokoro-82M TTS | Hugging Face | giọng đọc chất lượng cao (sinh sẵn) | mã mở | Đang dùng |
| Web Speech API (SpeechSynthesis / Recognition) | W3C/trình duyệt | đọc & nghe dự phòng | trên máy | Đang dùng |

## Web nền tảng (Baseline)
| Công nghệ | Dùng cho | Trạng thái |
|---|---|---|
| PWA + Service Worker (cache có kiểm soát) | offline, cài như app | Đang dùng |
| View Transitions API | chuyển trang mượt | Đang dùng |
| `defer`, nạp lười theo route, khung HTML dựng sẵn | tốc độ (LCP) | Đang dùng |
| **Speculation Rules API (prefetch/prerender)** | mở trang kế tiếp tức thì (blog, trang pháp lý) | **Áp dụng ngay** |
| **`content-visibility: auto`** | danh sách dài (thư viện từ) cuộn mượt | **Áp dụng ngay** |
| Web Push + Notification Triggers | nhắc ôn đúng "thời điểm vàng" | Thử nghiệm |
| File System Access / Web Share API | xuất/chia sẻ sổ từ | Thử nghiệm |
| WebGPU | chạy mô hình AI nhanh trên máy | Thử nghiệm |

## Hạ tầng (gói miễn phí)
| Công nghệ | Dùng cho | Trạng thái |
|---|---|---|
| Cloudflare Pages + Functions | web + API ở biên | Đang dùng |
| Cloudflare D1 | dữ liệu đồng bộ, thống kê, quản trị | Đang dùng |
| Cloudflare Email Routing + Workers | email tên miền, form liên hệ, cảnh báo | Đang dùng |
| Cloudflare `/cdn-cgi/trace` | nhận quốc gia để chọn ngôn ngữ, không tốn lượt | Đang dùng |
| **Cloudflare Turnstile** | chống spam form liên hệ (thay CAPTCHA) | **Áp dụng ngay** |
| Cloudflare Web Analytics | chỉ số tốc độ thật (Core Web Vitals) từ người dùng | Thử nghiệm (bổ sung cho thống kê tự xây) |
| Firebase Authentication | đăng nhập Google | Đang dùng |
| GitHub Actions + Pages | pipeline tự động, CDN âm thanh | Đang dùng |

## Chất lượng & tự động hóa
| Công nghệ | Dùng cho | Trạng thái |
|---|---|---|
| Lighthouse (Google) | đo tốc độ/a11y/SEO hằng tuần | Đang dùng |
| Playwright (Microsoft) | chụp giao diện tự động | Đang dùng |
| jsdom | kiểm thử khói, crawl, **rà lẫn tiếng 14 ngôn ngữ** | Đang dùng |
| TypeScript `checkJs` | bắt lỗi kiểu trong JS | Đang dùng (một phần) |
| **axe-core (Deque)** | kiểm tra trợ năng WCAG 2.2 sâu hơn | **Áp dụng ngay** |
| IndexNow + Search Console + hreflang + schema.org | SEO đa ngôn ngữ | Đang dùng |

## Không dùng (và lý do)
- Thư viện UI nặng (React/Angular) cho app chính: tăng tải, chậm trên máy yếu; giữ JS thuần + nạp lười.
- API trả phí theo lượt khi chưa có doanh thu (OpenAI, DeepL Pro…): vi phạm nguyên tắc 100% miễn phí.
- Dịch vụ theo dõi bên thứ ba có cookie (Google Analytics): ảnh hưởng quyền riêng tư; đã có thống kê ẩn danh tự xây.
- Nội dung/đề có bản quyền: chỉ tự biên soạn hoặc giấy phép mở.
