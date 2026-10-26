# Lexkite Blog & SEO – sổ tay vận hành (repo, dịch vụ, phương pháp)

> TL;DR: Sổ tay vận hành blog & SEO: repo/dịch vụ, 15 ngôn ngữ và cụm bài, lịch đăng thông minh, workflow tự động, vòng dữ liệu GSC hằng tuần (gsc-priority.json), 6 bước viết bài. Không chứa bí mật; kỹ thuật chi tiết ở SEO-PLAN.md.
> Đọc khi: viết/lên lịch/sửa bài blog hoặc ảnh blog.
> **Trước mỗi lần push:** chạy `node scripts/vi-lint.mjs` (dấu kiểu mới: khóa, hòa, thủy – không "khoá") và `node scripts/test/docs-budget.mjs` nếu sửa docs; 2 test này nằm trong npm test, lỗi là Prod release đỏ (26/10: "khoá" trong content/blog/prompts/1-brief.md).
Cập nhật 15/10/2026. Không chứa mật khẩu/khóa bí mật. Chi tiết kỹ thuật: docs/SEO-PLAN.md.

## Repo & dịch vụ
| Thứ | Ở đâu | Dùng để |
|---|---|---|
| Mã nguồn + bài viết | GitHub `lexkiteapp/lexkiteapp.github.io` (nhánh `main`; local `lexkite-main`) | Markdown bài ở `content/blog/<lang>/`, engine `scripts/build-blog.mjs` |
| Website | Cloudflare Pages dự án `lexkite` (tài khoản vintagezulilyjewelry@gmail.com) → https://lexkite.com | Tự build `bash scripts/build-web.sh` → `dist/` mỗi lần push |
| Deploy hook | Cloudflare Pages → lexkite → Settings → Builds → Deploy hooks → `blog-cron` (nhánh main) | Cron GitHub gọi để đăng bài đúng giờ |
| Secret | GitHub repo trên → Settings → Secrets → Actions → `CF_PAGES_DEPLOY_HOOK` | URL deploy hook (không commit) |
| Ảnh blog | GitHub `lexkiteapp/lexkite-media` + GitHub Pages https://lexkiteapp.github.io/lexkite-media/blog/ | Ảnh chụp app giao diện TIẾNG ANH, AVIF/WebP 480/960/1440, dùng chung mọi ngôn ngữ |
| Ảnh RIÊNG từng bài | Cloudflare R2 `lexkite-blog-media` → https://media.lexkite.com/blog/p/… (Worker `lexkite-media`, binding `BLOG_MEDIA`); dự phòng repo `lexkite-media/blog/p/` | Ảnh bìa + ảnh chụp app theo từng bài – xem § Ảnh riêng từng bài |
| Google Search Console | Thuộc tính miền `lexkite.com` (tài khoản vintagezulilyjewelry@gmail.com), xác minh TXT qua Cloudflare | Đã gửi https://lexkite.com/sitemap.xml |
| IndexNow (Bing, Yandex…) | Khóa công khai `web/24d0ecfb2b8806b6577efab517b6b28d.txt` + `content/blog/config.json` | `scripts/indexnow.mjs`, tự chạy sau mỗi lần đăng |
| Video | Kênh YouTube Lexkite (chưa có) | Điền ID vào `{{youtube: ID | …}}` trong bài |
| Lịch viết bài | Claude desktop → Scheduled → "Lexkite: viết lô bài blog hằng tuần" (thứ Hai 9h) | ~15 bài/tuần, hỏi anh trước khi gộp/đẩy |


## 15 ngôn ngữ & cấu trúc cụm bài (17/10/2026)
- Mở đủ 15 ngôn ngữ của app: vi, en, es, ja, id, pt (Brazil), fr, de, tr, ru, ar (phải→trái), hi, ko, zh (giản thể), th. Chữ giao diện, chuyên mục, og:locale, hreflang, RSS `/<lang>/blog/rss.xml`, trang giới thiệu đều theo ngôn ngữ; `ar` có `dir="rtl"` + CSS đảo chiều.
- **Trụ cột – vệ tinh:** mỗi ngôn ngữ 1 bài trụ cột (brief `role: pillar`, hướng dẫn tổng quan) + các bài vệ tinh (`role: satellite`, `pillar: <slug>`) đi sâu từng ý; trụ cột trỏ tới mọi vệ tinh, vệ tinh trỏ về trụ cột và lẫn nhau. Các bản cùng chủ đề ở ngôn ngữ khác nối bằng `translationKey` → hreflang + x-default (en).
- **Từ khóa bản địa:** brief viết theo cách người học nước đó tìm (vd. ko "토익 공부법", pt "como aprender inglês sozinho", zh "背单词的方法"), không dịch máy từ khóa tiếng Việt. Tiếng Nhật/Trung/Thái đếm từ theo ký tự (2 ký tự Hán/Kana hoặc 5 ký tự Thái ≈ 1 từ).
- Lệnh chuẩn cho tác tử: `content/blog/prompts/agent-pillar.md` (mở ngôn ngữ), `agent-write.md` (viết 1 bài), `agent-review.md` (chấm độc lập ≥ 92).

## Lịch đăng thông minh (`scripts/blog-schedule.mjs`)
- Tối đa **1 bài/ngôn ngữ/ngày** (`--per`), giờ ngẫu nhiên 07:00–21:59 theo **múi giờ nước đó** (`config.json → timezones`, tính cả giờ mùa hè; en theo Ấn Độ, es theo Mexico, pt theo Brazil…).
- **Chống ăn thịt từ khóa:** bài cùng cụm (`cluster` trong brief, mặc định `translationKey`) trong cùng ngôn ngữ cách nhau **≥ 7 ngày**.
- Xếp theo thứ tự briefs.json (trụ cột trước), lấp ngày trống sớm nhất; `--reflow` xếp lại các bài chưa đăng theo luật mới; `--verify` kiểm toàn bộ lịch (chạy trong `blog-pipeline gate` và CI) – vi phạm → lỗi.

## Đường dẫn
- Bài: `/<lang>/blog/<slug>/` (vi, en…) · danh sách `/<lang>/blog/` · chuyên mục `/vi/blog/chu-de/<cat>/` (`/en/blog/topic/`) · thẻ `/vi/blog/the/<tag>/` (`/en/blog/tag/`) · RSS `/<lang>/blog/rss.xml` · giới thiệu `/vi/blog/gioi-thieu/`, `/en/blog/about/`.
- `/blog/*` → 301 `/vi/blog/*` (`web/_redirects`). Sitemap index `/sitemap.xml` → `sitemap-pages.xml` + `sitemap-blog-<lang>.xml`.

## Tự động (GitHub Actions, miễn phí)
- `blog-publish.yml` – mỗi giờ: có bài đến giờ → gọi deploy hook → IndexNow.
- `blog-daily.yml` – 06:30 VN: xếp lịch bài `status: ready` chưa có giờ (2–3 bài/ngày/ngôn ngữ) + commit; mở issue `blog-health` khi < 7 ngày bài chờ hoặc bài kiểm chứng > 12 tháng.
- `seo-gsc.yml` – thứ Hai 07:00 VN (trước lượt viết 9h): `scripts/seo/gsc.mjs` kéo Search Console 28 ngày → `reports/seo/gsc-<ngày>.{json,md}` + `content/blog/plan/gsc-priority.json` (commit `[CF-Pages-Skip]`) + issue `seo-weekly`. Xem § Vòng dữ liệu GSC.
- Build Cloudflare tự chạy `blog-check` → bài lỗi làm build dừng (site giữ bản cũ).

## Vòng dữ liệu GSC (26/10/2026)
- **Đọc gì:** lượt viết hằng tuần đọc `content/blog/plan/gsc-priority.json` TRƯỚC `2026-11-seo-program.json` / `briefs.json`. Mỗi mục có `type`: `write-brief` (brief có sẵn chưa viết) · `new-brief` (soạn brief mới, 1 từ khoá chính/bài) · `enrich` (đã có bài nhưng hạng > 30 → làm giàu bài cũ, KHÔNG viết bài thứ 2) · `refresh-title` (hạng 8–30, CTR thấp → sửa title/description theo truy vấn, không đổi slug) · `cannibal` (2 URL cùng truy vấn → phân vai/link/301) · `decline` (trang tụt ≥ 40 % hiển thị). `gain` = ước tính thêm lượt bấm/28 ngày, xếp giảm dần. Không tự đổi lịch đăng – `blog-schedule.mjs` vẫn giữ luật ≤ 1 bài/ngôn ngữ/ngày, cụm cách ≥ 7 ngày.
- **Báo cáo:** `reports/seo/gsc-<ngày>.json` (chi tiết, giữ 26 tuần) + `.md` (tóm tắt 4 phần a–d, cũng là nội dung issue `seo-weekly`). Chỉ số tổng hợp của GSC, không dữ liệu cá nhân.
- **Ngưỡng** (hằng `T` đầu `scripts/seo/gsc.mjs`, chỉ được chặt hơn): cụm truy vấn ≥ 50 hiển thị · striking 8–30 & ≥ 100 hiển thị & CTR < 75 % đường CTR tự nhiên · cannibal ≥ 50 hiển thị, mỗi URL ≥ 10 % · tụt ≥ 40 % và ≥ 50 hiển thị so với 28 ngày trước. Test: `scripts/test/gsc.mjs` (dữ liệu giả, trong `npm test`).
- **Chạy tay:** GitHub → Actions → "SEO GSC weekly" → Run workflow. Thiếu secret → xanh kèm cảnh báo, không báo cáo; khoá sai / 0 dòng → đỏ.

### Việc anh chủ làm 1 lần – GSC (≈ 10 phút, 0 đồng)
> ⚠️ Dùng tài khoản **vintagezulilyjewelry@gmail.com**. KHÔNG dùng khieudinhthong – tài khoản đó bị cấm GCP.
1. https://console.cloud.google.com → chọn/tạo dự án (vd. `lexkite-seo`) → *APIs & Services → Library* → tìm **Google Search Console API** → **Enable**.
2. *IAM & Admin → Service accounts → Create service account* (tên `gsc-reader`, **không** cấp vai trò nào) → mở service account → *Keys → Add key → Create new key → JSON* → file tải về máy anh. Không gửi file/nội dung vào chat, issue, email.
3. https://search.google.com/search-console → thuộc tính **lexkite.com** (miền) → *Cài đặt → Người dùng và quyền → Thêm người dùng* → dán email service account (`gsc-reader@<dự án>.iam.gserviceaccount.com`) → quyền **Bị hạn chế (Restricted)** = chỉ đọc.
4. GitHub `lexkiteapp/lexkiteapp.github.io` → *Settings → Secrets and variables → Actions → New repository secret* → tên **`GSC_SA_JSON`**, giá trị = toàn bộ nội dung file JSON → Add. Xoá file JSON khỏi máy nếu không cần nữa.
5. Actions → "SEO GSC weekly" → Run workflow → xem issue `seo-weekly`. Lỗi `HTTP 403` = chưa thêm email ở bước 3 hoặc chưa bật API ở bước 1.

## Phương pháp viết (6 bước, mẫu ở `content/blog/prompts/`)
1 brief từ khóa bản địa & đối thủ top 10 → 2 dàn ý → 3 viết (chuyên gia, tự viết 100%) → 4 kiểm chứng (nguồn chính thức) → 5 bản địa hóa (không dịch máy) → 6 chấm 100 điểm, **≥ 90** mới `status: ready`.
Chuẩn bài: tiêu đề 30–65 ký tự, mô tả 110–160, ≥ 1.200 từ (evergreen 1.800–2.500), từ khóa ở tiêu đề/120 từ đầu/H2, ≥ 4 H2, ảnh bìa riêng (tự động) + ≥ 2 hình riêng thân bài (`shots:` → `media:@s1`, `diagrams:` → `{{diagram: d1}}`, chú thích riêng từng bài), ≥ 4 link bài khác + ≥ 2 link app + CTA, FAQ, slot YouTube để trống.

## Ảnh riêng từng bài (17/10/2026)
Mục tiêu: mỗi bài có ảnh CỦA NÓ (không dùng chung 31 ảnh), nhanh, không phình bản deploy kể cả 100k+ bài. Mọi việc nặng chạy trên GitHub Actions `blog-images.yml`; máy chỉ chạy lệnh nhẹ (`status`, `suggest`, test).

**3 loại hình**
1. **Ảnh bìa riêng** (tự động, không cần viết gì): mẫu SVG thương hiệu (teal #0F3D3E, cam #E5502F→#FFB054, Kit từ `web/js/kit.js`, logo `brand/lexkite-mark.svg`) + tiêu đề bản địa + icon chủ đề + thẻ kỳ thi/chuyên mục. Phông Noto (OFL) cài trong CI (`fonts-noto-core`, `fonts-noto-cjk`) + Be Vietnam Pro/Bricolage ở `brand/social/src/fonts` – KHÔNG vào app. `ar` canh phải, `hi`/`th`/`zh`/`ja`/`ko` ngắt dòng theo `Intl.Segmenter`. Dùng cho ảnh đầu bài, thẻ danh sách, `og:image` (bản JPEG 1200×630), `twitter:image`, JSON-LD `image`. Tùy chỉnh: `coverArt: {mood: think, icon: blocks, chip: IELTS, title: 'tiêu đề ngắn'}`.
2. **Ảnh chụp app theo ngữ cảnh**: front matter `shots:` → Playwright mở app thật `https://lexkite.com/app/?sandbox=1&demo=1&hl=<ngôn ngữ bài><route>` (giao diện đúng ngôn ngữ bài, dữ liệu mẫu, không tài khoản thật), cắt `viewport | main | full | {selector} | {x,y,w,h}`. Lúc chụp ghi **bản ghi** (route + tiêu đề + chữ thấy trong vùng cắt) vào sổ → **alt tự sinh** từ bản ghi. Trong bài: `![](media:@s1 "chú thích theo ngữ cảnh bài")` (alt để trống = tự sinh). Viết alt riêng thì blog-check `[alt-truth]` chặn mọi số / cụm trong ngoặc kép / từ Latin (ở bài chữ không Latin) không có trên ảnh chụp.
3. **Sơ đồ nhẹ** `diagrams:` (timeline thì, hộp cấu trúc câu, bảng so sánh) → build nhúng thẳng SVG/HTML vào bài (chữ chọn được, máy tìm kiếm đọc được, 0 file, 0 lượt tải): `{{diagram: d1 | chú thích}}`.

**Tên & lưu trữ:** file = mã băm nội dung `blog/p/<hash16>-<480|960|1440>.<avif|webp>` (+ `-og.jpg` cho bìa) → giống nhau thì 1 file (khử trùng), cache `immutable` 1 năm. Sổ: `content/blog/media/<lang>.json` (1 mục/dòng; khóa `<lang>-<slug>--cover|s1|…`; `in` = mã băm đầu vào → chỉ render lại khi tiêu đề/đặc tả/mẫu đổi). Ảnh KHÔNG nằm trong bản deploy Pages (trần 20.000 file). Trần: AVIF bản rộng nhất ≤ **60 KB** (`config.json → images.budgetKB`; CI tự hạ chất lượng, vẫn vượt → lỗi, không ghi sổ) – test `scripts/test/blog-images.mjs` kiểm schema + trần mọi bản ghi. `<img>` giữ width/height, `loading="lazy"` trừ ảnh bìa (`fetchpriority="high"`).

**Bật bắt buộc (feature flag)** `content/blog/config.json → images`: `enforce: false` (mặc định tới khi R2 chạy) → `true` thì bài mới (`factChecked ≥ enforceFrom`) phải có ≥ 1 `shots:` + ≥ 2 hình riêng trong bài, mọi shots/diagrams khai báo phải được dùng, và ảnh phải render xong trước giờ đăng `leadHours` (36) giờ – thiếu → build dừng. Bài cũ không bị bắt (có ảnh bìa riêng qua backfill; ảnh thân bài cũ đổi dần khi làm mới bài).

**Chạy**
- Tự động: push bài `.md` lên `main` → `Blog images` (mode `changed`: bài vừa sửa + bài đăng trong 7 ngày) → đẩy ảnh → commit sổ `[CF-Pages-Skip]` → bài đã đăng có ảnh mới thì gọi deploy hook.
- **Thử trước (bắt buộc trước lô đầu):** Actions → Blog images → Run workflow → mode `pilot` → tải artifact `blog-images-pilot` (bảng soi `pilot-sheet.jpg` 1 bìa/ngôn ngữ + ảnh chụp bài mẫu `en/present-perfect-vs-past-simple`) → soi chữ ar/hi/th/zh/ja/ko, Kit, cắt ảnh. Không đẩy, không commit.
- **Backfill** (234 bài hiện có, sau khi pilot đạt): mode `backfill`, limit 40, chain ✓ → mỗi lô xong tự gọi lô sau tới khi hết; dừng giữa chừng/chạy lại an toàn (bỏ mục đã có `in` khớp, R2 bỏ file đã có). Lô cuối gọi deploy hook. Chỉ 1 ngôn ngữ: ô `lang`; vài bài: ô `posts` (`en/a,vi/b`).
- Bằng dòng lệnh (máy có `gh`): `gh workflow run blog-images.yml -f mode=backfill -f limit=40` (môi trường sandbox: dùng curl + `gh auth token`, xem memory github-api-via-curl).
- Nhẹ, chạy máy được: `node scripts/blog-images.mjs status` (đếm bìa/ảnh còn thiếu theo ngôn ngữ) · `suggest content/blog/<lang>/<slug>.md` (gợi ý `shots:` từ bài ngữ pháp/từ in nghiêng/ảnh cũ) · `plan --mode backfill` (xem lô kế tiếp).
- Dọn file mồ côi: `node scripts/blog-images.mjs gc` (CHỈ liệt kê; `--apply` mới xoá, chỉ file cũ hơn `--min-age-days 14`; cần secret R2_* hoặc `--dir <bản sao lexkite-media>/blog/p`).

**Ước tính dung lượng & chi phí** (ước lượng: bìa ≈ 0,2 MB/7 file gồm og JPEG; mỗi ảnh chụp ≈ 0,25 MB/6 file; 3 ảnh chụp/bài; sơ đồ 0 file; chưa trừ khử trùng). R2: 10 GB + 1 triệu lượt ghi (Class A) + 10 triệu lượt đọc (Class B)/tháng miễn phí; sau đó $0,015/GB-tháng, $4,50/triệu ghi, $0,36/triệu đọc; **băng thông ra miễn phí**.
| Số bài | Dung lượng | Số file | Lượt ghi (1 lần) | Chi phí R2/tháng | Sổ JSON trong git |
|---|---|---|---|---|---|
| 1.000 | ≈ 0,95 GB | ≈ 25k | 25k | $0 | ≈ 3 MB |
| 10.000 | ≈ 9,5 GB | ≈ 250k | 250k | ≈ $0 (sát 10 GB; vượt ≈ $0,01) | ≈ 30 MB |
| 100.000 | ≈ 95 GB | ≈ 2,5 triệu | 2,5 triệu (rải nhiều tháng → $0; dồn 1 tháng ≈ $6,75 một lần) | ≈ $1,3 | ≈ 300 MB → chia shard theo `<lang>-<xx>.json` (loader đã gộp mọi file trong `media/`) |
Lượt đọc: Worker cache biên trước R2 + trình duyệt cache immutable → Class B gần như chỉ khi trượt cache (trong 10 triệu miễn phí). Giới hạn thật ở quy mô lớn là **Worker 100k lượt/ngày** (≈ 25k lượt xem trang/ngày × 4 ảnh) → nâng Workers Paid $5/tháng (10 triệu lượt) hoặc gắn tên miền riêng thẳng vào bucket. Repo dự phòng `lexkite-media` chỉ hợp tới ~1 GB (≈ 1.000 bài) – phải chuyển R2 trước đó.

**Việc anh chủ cần làm 1 lần (chưa xong thì CI chỉ cảnh báo, không lỗi):**
1. Cloudflare → R2 → Create bucket `lexkite-blog-media` (hoặc `wrangler r2 bucket create lexkite-blog-media`).
2. `workers/media/wrangler.toml`: bỏ dấu `#` ở khối `[[r2_buckets]]` (binding `BLOG_MEDIA`) → `wrangler deploy` trong `workers/media`.
3. R2 → Manage API tokens → token **Object Read & Write chỉ bucket lexkite-blog-media** → GitHub repo → Settings → Secrets → Actions: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (đổ thẳng, không dán vào chat/file). `CF_ACCOUNT_ID` đã có. Chưa có R2 mà có `LEXKITE_MEDIA_TOKEN` → CI tạm đẩy vào repo `lexkite-media/blog/p/` (vẫn chạy qua media.lexkite.com).
4. Chạy `pilot` → soi → `backfill` → khi ổn đặt `images.enforce: true`.

## Lệnh hay dùng
```
node scripts/blog-pipeline.mjs status | health | links | gate | queue
node scripts/blog-pipeline.mjs new <slug>                      # khung bài từ briefs.json
node scripts/blog-pipeline.mjs localize <slug> --to en --as <slug-en>
node scripts/blog-shots.mjs <id> && node scripts/blog-media.mjs --push   # ảnh mới (cần bash scripts/setup-media-tools.sh)
node scripts/blog-images.mjs status | suggest <file.md> | plan   # ảnh riêng từng bài (dựng thật: workflow Blog images trên CI)
bash scripts/build-web.sh                                      # build đầy đủ (chặn > 19.500 file)
```

## Giới hạn miễn phí cần nhớ
Cloudflare Pages 20.000 file/deploy (app ~690 file; âm thanh đã ra CDN) · 500 build/tháng · GitHub Pages ~1 GB/kho ảnh · Kế hoạch mở rộng: docs/SEO-PLAN.md §12.
