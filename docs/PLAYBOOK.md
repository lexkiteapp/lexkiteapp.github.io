# Sổ tay vận hành Lexkite (nguồn chuẩn duy nhất)

> Nguyên tắc: **cái gì đã chuẩn thì làm theo đúng quy trình ở đây**. Có tính năng / pipeline mới → **bổ sung vào file này trong cùng commit**. Không làm khác quy trình mà không cập nhật sổ tay.
> Chi tiết riêng: [I18N-PIPELINE.md](I18N-PIPELINE.md) (đa ngôn ngữ) · [BLOG-RUNBOOK.md](BLOG-RUNBOOK.md) (blog) · [SEO-PLAN.md](SEO-PLAN.md) · [../content/wordlists/README.md](../content/wordlists/README.md) (kho từ nguồn mở).

## 1. Kiến trúc & hạ tầng (100% miễn phí)
| Phần | Ở đâu | Ghi chú |
|---|---|---|
| Web/PWA | Cloudflare Pages `lexkite` ← GitHub `lexkiteapp/lexkiteapp.github.io` (nhánh main) | build `scripts/build-web.sh` → `dist/` |
| API | `functions/api/*.js` (Pages Functions) | sync, ai, contact, admin, hit (thống kê), config |
| Dữ liệu | Cloudflare D1 `lexkite-sync` | docs, users, sessions, errors, contact_msgs, config, services, ai_quota, ai_cache |
| Đăng nhập | Firebase Auth `lexkite-app` (chỉ xác thực) | token xác minh tại `functions/api/sync.js` (`claims`) |
| Email | Cloudflare Email Routing (support@/contact@ → Gmail) + Worker `workers/mail` | form liên hệ + email cảnh báo 08:00 |
| Âm thanh | GitHub Pages `lexkiteapp.github.io/audio/l/*.mp3` (Kokoro) | sinh hằng đêm `audio.yml` |
| Quản trị | `/admin.html` + `/api/admin` | quyền: biến bí mật `ADMIN_EMAILS` (Pages) |

Bí mật (khóa, mật khẩu) **không bao giờ** nằm trong repo (repo công khai). Biến bí mật: Cloudflare Pages → Settings → Variables and Secrets. Danh bạ dịch vụ + tài khoản: tab **Dịch vụ & API** trong trang quản trị (lưu D1, không lưu giá trị khóa).

## 2. Quy trình đưa lên (ship) – luôn theo thứ tự
1. Sửa code + `en/*.js` (chuỗi mới) + `scripts/i18n-fixed.json` (nhãn ≤ 3 từ, đủ 13 ngôn ngữ).
2. `npm test` phải xanh: vi-lint (chính tả tiếng Việt) → i18n-missing → i18n-qa → unit → smoke → **i18n-leak (en, zh, ar)** → a11y → crawl. Đủ 14 ngôn ngữ: `npm run test:leak`.
3. **Kiểm thử thật trên trình duyệt** cho tính năng có tương tác (bấm chuột thật, không chỉ đọc code): mở `https://lexkite.com/?sandbox=1#/…` sau khi lên, thao tác đúng như người dùng, đọc lỗi console. Chỉ báo "xong" khi đã thấy chạy đúng.
4. Ship: `ship2.sh "<mô tả>"` = smoke → vi-lint → i18n-sync (tự bỏ qua nếu Google chặn) → gen-hero → tăng phiên bản SW + add-on → commit → merge main (không rebase) → push → chờ bản live khớp phiên bản.
5. JS trên bản live **đã được nén** (tên hàm bị đổi) – kiểm tra hành vi, đừng grep tên hàm.
6. Mỗi lần chỉ chạy **một** ship; ship chạy nền phải theo dõi tới khi xong.

## 3. Pipeline tự động (GitHub Actions)
| Workflow | Khi chạy | Làm gì | Đầu ra |
|---|---|---|---|
| `ci.yml` | mỗi push | kiểm thử | – |
| `i18n-leak.yml` | 05:00 hằng đêm, đổi `web/js` | **rà soát lẫn tiếng**: chạy app ở 14 ngôn ngữ ≠ vi qua mọi trang chính, báo mọi chữ tiếng Việt còn sót (chữ, tooltip, aria-label, placeholder) | đỏ → email cảnh báo |
| `i18n.yml` | đổi `en.js`, `i18n-fixed.json`, `content/legal/{en,vi}` | dịch khóa mới 13 ngôn ngữ → áp bản dịch tay → **trang pháp lý 15 ngôn ngữ** (`build-legal.mjs`) → khung chào mừng (`gen-hero.mjs`) → i18n-qa | `web/js/i18n/*.js`, `web/<lang>/{privacy,terms}.html`, `web/index.html` |
| `word-packs.yml` | 03:30 hằng đêm | gói nghĩa từ vựng 13 ngôn ngữ: dịch nhanh + tinh chỉnh 450 từ/đêm theo đúng từ loại | `web/packs/<lang>.json` |
| `wordlists.yml` | 04:00 hằng đêm, đổi CSV/script | kho từ theo kỳ thi từ danh sách nguồn mở (NAWL, BSL): lọc trùng → phiên âm/định nghĩa/ví dụ → nghĩa Việt đúng từ loại → kiểm chất lượng | `web/js/lib/{nawl,bsl}.js` |
| `audio.yml` | 02:00 hằng đêm | giọng Kokoro chất lượng cao | `audio/l/*.mp3` |
| `blog-publish.yml`, `blog-daily.yml` | theo lịch | đăng bài blog theo ngôn ngữ | `/<lang>/blog/` |
| `lighthouse.yml` | thứ Hai, đổi file workflow | đo tốc độ (3 lần, trung vị) | `reports/lighthouse.json` |
| `screens.yml` | theo lịch | chụp giao diện tự động | nhánh `screens` |
| `android.yml` | push | build APK | Release `android-latest` |

Quy tắc chung của pipeline: **có bộ đệm** (chỉ xử lý phần mới/đổi) · **chạy dần** khi giới hạn API · **thiếu dữ liệu thì loại**, không đưa vào app · commit bằng `lexkite-bot`, `pull --rebase` thử lại 5 lần.

## 4. Nội dung & bản quyền
- Chỉ dùng nội dung **tự biên soạn** hoặc **giấy phép mở** (CC BY / CC BY-SA / phạm vi công cộng). Không lấy đề, bài, danh sách từ có bản quyền (Barron's, Cambridge, ETS…). Tham khảo trang khác chỉ về **cách trình bày**.
- Mọi nguồn mở phải ghi công ở mục "Ghi công dữ liệu mở" (`content/legal/{en,vi}/privacy.html`).
- Đề thi: đúng định dạng thật (số câu, thời gian, dạng bài), điểm luôn ghi "ước tính tham khảo".

## 5. Đa ngôn ngữ (tóm tắt – chi tiết ở I18N-PIPELINE.md)
- Khóa = tiếng Việt trong `t()`; tiếng Anh viết tay; 13 ngôn ngữ dịch máy + bản dịch tay cho nhãn ngắn và **nhãn cấu trúc** (Mở bài, Thân bài…).
- Nội dung không được dịch máy lúc chạy nếu là nhãn cố định → dùng `t()` + `translate="no"`.
- Không bao giờ hiện tiếng Việt ở giao diện ngôn ngữ khác; thiếu bản dịch → tiếng Anh.
- Nghĩa từ chỉ qua `App.meanOf(w)` (tiếng Việt khi người học chọn; khác → gói nghĩa dịch sẵn → định nghĩa tiếng Anh). Không render `w.vi` trực tiếp.
- Dữ liệu lưu sẵn có chữ (vd. thẻ "Tiếp tục") phải lưu kèm `lang` và chỉ hiện khi trùng ngôn ngữ hiện tại.
- Thêm trang mới → thêm vào `ROUTES` của `scripts/test/i18n-leak.js`.
- Ngôn ngữ mặc định lần đầu: `?hl=` → lựa chọn đã lưu → quốc gia (Cloudflare `/cdn-cgi/trace`, 1 lần) → trình duyệt → English. Đổi bằng nút 🌐 đầu trang.
- Trang theo ngôn ngữ dùng thư mục `/<lang>/…` + hreflang + x-default (blog, privacy, terms).

## 6. Giọng đọc
Một nguồn thống nhất cho mọi chỗ (web, add-on, popup): Kokoro (nếu có) → giọng máy tốt nhất (`bestVoice`, tôn trọng giọng người dùng chọn) → bản ghi âm người thật **chỉ khi máy không có giọng đọc**. Lần đọc đầu chờ danh sách giọng (≤ 0,6 s).

## 7. Tốc độ
- Script `defer`; bộ dữ liệu lớn nạp theo nhu cầu (`BUNDLES`/`ROUTE_BUNDLE`).
- Khung chào mừng dựng sẵn trong `index.html` (sinh từ bản dịch, 15 ngôn ngữ); add-on tự bỏ khối này (MV3 cấm script nội tuyến).
- Đo bằng `lighthouse.yml`, mục tiêu ≥ 90.

## 8. Theo dõi & cảnh báo
- Thống kê ẩn danh `/api/hit` (không cookie, không IP), lỗi JS tự gửi về; xem ở `/admin.html`.
- Email cảnh báo 08:00 khi: lỗi JS vượt ngưỡng, tin nhắn tồn, thư chuyển lỗi, D1 > 70%, workflow thất bại.

## 9. Bài học đã rút ra (không lặp lại)
- Kiểm tra lẫn tiếng Việt chỉ dùng chữ riêng của tiếng Việt (ă đ ơ ư + dấu), không dùng â ê ô (có trong tiếng Pháp/Bồ Đào Nha).
- Không ghi file sinh tự động (trang pháp lý, gói nghĩa) từ máy cục bộ khi thiếu bộ đệm → để Action sinh, tránh xung đột khi merge.
- Gọi hàm phải đúng kiểu tham số (ví dụ `App.isPhrase(card)` nhận thẻ, `App.inDeck(word)` nhận chữ) → luôn bấm thử thật.
- Script dịch cục bộ phải có thoát nhanh khi bị giới hạn (ship không được treo).
- Mã một dòng: chú thích chỉ dùng `/* … */`, không dùng `//` (nuốt phần còn lại của dòng).
- 2.809 từ NGSL từng thiếu định nghĩa tiếng Anh → người học quốc tế bị rơi về tiếng Việt; nay lấy từ bản chính thức NGSL 1.2 with English definitions (`content/wordlists/ngsl-1.2-defs.csv`).
