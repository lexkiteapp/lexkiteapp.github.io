# Lexkite Blog & SEO – sổ tay vận hành (repo, dịch vụ, phương pháp)
Cập nhật 15/10/2026. Không chứa mật khẩu/khóa bí mật. Chi tiết kỹ thuật: docs/SEO-PLAN.md.

## Repo & dịch vụ
| Thứ | Ở đâu | Dùng để |
|---|---|---|
| Mã nguồn + bài viết | GitHub `lexkiteapp/lexkiteapp.github.io` (nhánh `main`; local `lexkite-main`) | Markdown bài ở `content/blog/<lang>/`, engine `scripts/build-blog.mjs` |
| Website | Cloudflare Pages dự án `lexkite` (tài khoản vintagezulilyjewelry@gmail.com) → https://lexkite.com | Tự build `bash scripts/build-web.sh` → `dist/` mỗi lần push |
| Deploy hook | Cloudflare Pages → lexkite → Settings → Builds → Deploy hooks → `blog-cron` (nhánh main) | Cron GitHub gọi để đăng bài đúng giờ |
| Secret | GitHub repo trên → Settings → Secrets → Actions → `CF_PAGES_DEPLOY_HOOK` | URL deploy hook (không commit) |
| Ảnh blog | GitHub `lexkiteapp/lexkite-media` + GitHub Pages https://lexkiteapp.github.io/lexkite-media/blog/ | Ảnh chụp app giao diện TIẾNG ANH, AVIF/WebP 480/960/1440, dùng chung mọi ngôn ngữ |
| Google Search Console | Thuộc tính miền `lexkite.com` (tài khoản vintagezulilyjewelry@gmail.com), xác minh TXT qua Cloudflare | Đã gửi https://lexkite.com/sitemap.xml |
| IndexNow (Bing, Yandex…) | Khóa công khai `web/24d0ecfb2b8806b6577efab517b6b28d.txt` + `content/blog/config.json` | `scripts/indexnow.mjs`, tự chạy sau mỗi lần đăng |
| Video | Kênh YouTube Lexkite (chưa có) | Điền ID vào `{{youtube: ID | …}}` trong bài |
| Lịch viết bài | Claude desktop → Scheduled → "Lexkite: viết lô bài blog hằng tuần" (thứ Hai 9h) | ~15 bài/tuần, hỏi anh trước khi gộp/đẩy |

## Ngôn ngữ đã mở (16/10/2026)
vi (80 bài), en (24, phủ Ấn Độ/Philippines/Nigeria…), id (2), es (2, trung tính – phủ Mexico/Mỹ Latinh/Tây Ban Nha), ja (2). Mở tiếp: pt (Brazil) → ko → zh → th → ar → tr → fr → de → it/pl. Ngôn ngữ mới: thêm `L.<lang>` trong scripts/build-blog.mjs, blogName/blogDesc trong config.json, trang about trong content/blog/pages/<lang>/, 6 brief.

## Đường dẫn
- Bài: `/<lang>/blog/<slug>/` (vi, en…) · danh sách `/<lang>/blog/` · chuyên mục `/vi/blog/chu-de/<cat>/` (`/en/blog/topic/`) · thẻ `/vi/blog/the/<tag>/` (`/en/blog/tag/`) · RSS `/<lang>/blog/rss.xml` · giới thiệu `/vi/blog/gioi-thieu/`, `/en/blog/about/`.
- `/blog/*` → 301 `/vi/blog/*` (`web/_redirects`). Sitemap index `/sitemap.xml` → `sitemap-pages.xml` + `sitemap-blog-<lang>.xml`.

## Tự động (GitHub Actions, miễn phí)
- `blog-publish.yml` – mỗi giờ: có bài đến giờ → gọi deploy hook → IndexNow.
- `blog-daily.yml` – 06:30 VN: xếp lịch bài `status: ready` chưa có giờ (2–3 bài/ngày/ngôn ngữ) + commit; mở issue `blog-health` khi < 7 ngày bài chờ hoặc bài kiểm chứng > 12 tháng.
- Build Cloudflare tự chạy `blog-check` → bài lỗi làm build dừng (site giữ bản cũ).

## Phương pháp viết (6 bước, mẫu ở `content/blog/prompts/`)
1 brief từ khóa bản địa & đối thủ top 10 → 2 dàn ý → 3 viết (chuyên gia, tự viết 100%) → 4 kiểm chứng (nguồn chính thức) → 5 bản địa hóa (không dịch máy) → 6 chấm 100 điểm, **≥ 90** mới `status: ready`.
Chuẩn bài: tiêu đề 30–65 ký tự, mô tả 110–160, ≥ 1.200 từ (evergreen 1.800–2.500), từ khóa ở tiêu đề/120 từ đầu/H2, ≥ 4 H2, 1 ảnh bìa + ≥ 2 ảnh thân bài (chú thích riêng từng bài), ≥ 4 link bài khác + ≥ 2 link app + CTA, FAQ, slot YouTube để trống.

## Lệnh hay dùng
```
node scripts/blog-pipeline.mjs status | health | links | gate | queue
node scripts/blog-pipeline.mjs new <slug>                      # khung bài từ briefs.json
node scripts/blog-pipeline.mjs localize <slug> --to en --as <slug-en>
node scripts/blog-shots.mjs <id> && node scripts/blog-media.mjs --push   # ảnh mới (cần bash scripts/setup-media-tools.sh)
bash scripts/build-web.sh                                      # build đầy đủ (chặn > 19.500 file)
```

## Giới hạn miễn phí cần nhớ
Cloudflare Pages 20.000 file/deploy (app ~690 file; âm thanh đã ra CDN) · 500 build/tháng · GitHub Pages ~1 GB/kho ảnh · Kế hoạch mở rộng: docs/SEO-PLAN.md §12.
