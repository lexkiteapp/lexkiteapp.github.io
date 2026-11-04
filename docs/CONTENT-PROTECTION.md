# Bảo vệ nội dung Lexkite – chống cào, chứng minh đăng trước, xử lý DMCA

> TL;DR: Bảo vệ nội dung chống cào: luật Cloudflare WAF, "được lập chỉ mục trước", sổ băm, OpenTimestamps, tem RFC 3161/Wayback/Software Heritage/Zenodo, nhật ký nhãn hiệu, giám sát bản sao + canary, LICENSE/điều khoản/robots chặn AI, kiểm tra ngược nguồn & giấy phép, xử lý DMCA.
> Đọc khi: xử lý sao chép/DMCA, sửa WAF/robots, thêm tài sản bên thứ ba (ảnh, font, âm thanh, dữ liệu).
Cập nhật 03/11/2026 (§4c, §8–§10). Phía máy chủ/Cloudflare (phiên chính). Thẻ P1 Antigravity (thủy ấn tàng hình `content/protection/watermark.mjs` + `scripts/decode-watermark.mjs` ở blog/bài mẫu, `canaries.json`) đã xong, lưu ở `docs/agents/BOARD-ARCHIVE.md`. Hồ sơ pháp lý: `docs/legal/DMCA-KIT.md`. Không chứa khóa/mật khẩu.

## 1. Mục tiêu & nguyên tắc
- Kẻ cào chép bài blog (15 ngôn ngữ) và ~2.784 câu hỏi luyện thi, đăng lại sớm hơn, thậm chí gửi DMCA giả nhắm vào Lexkite.
- Phòng thủ 3 lớp: **(a) làm khó cào** bằng WAF Cloudflare; **(b) được lập chỉ mục trước** (IndexNow + WebSub + sitemap ngay khi đăng); **(c) bằng chứng tác quyền** chống giả mạo (sổ băm nối chuỗi + lịch sử git + Wayback).
- KHÔNG được làm hỏng: người đọc thật, SEO (Googlebot/Bingbot luôn qua), app & add-on, GitHub Actions gọi `/api/*`.

## 2. Luật Cloudflare (mã: `scripts/cf-waf.mjs`, luật: `scripts/lib/cf-waf-rules.mjs`)
| Ref | Phase | Hành động | Phạm vi |
|---|---|---|---|
| `lexkite_scraper_ua` | Custom rule | Block | Host lexkite.com/www, đường dẫn nội dung (dưới), không phải `.xml`, UA trống hoặc chứa `python-requests`, `python-urllib`, `python-httpx`, `aiohttp`, `scrapy`, `go-http-client`, `httrack`, `wget`, `libwww`, `okhttp`, `colly` |
| `lexkite_headless` | Custom rule | Managed challenge | Như trên nhưng chỉ trang HTML (không `/packs/`), UA `HeadlessChrome`/`PhantomJS` |
| `lexkite_content_rl` | Rate limiting | Block 10 s | > **100 request / 10 s / IP** vào trang HTML nội dung (không `/packs/`) **+ đúng 4 API công khai** `/api/ai`, `/api/contact`, `/api/report`, `/api/handoff` (`API_RL`, từ 2/11/2026; gói Free chỉ 1 luật RL → chung bộ đếm) |

**Đường dẫn nội dung:** `/<lang>/blog/` (15 ngôn ngữ), `/blog/` (301 cũ), `/tu-vung/`, `/ngu-phap/`, `/samples/`, `/speaking/`, `/viet-thu/`, `/en/vocabulary/`, `/en/samples/`, `/en/speaking/`, `/packs/` (gói nghĩa app tải lười).
**Không bao giờ nằm trong phạm vi** (trừ 4 API khớp đúng đường dẫn ở luật RL): `/api/*`, `/sw.js`, `/js/`, `/css/`, `/icons/`, `/audio/`, `/img/`, `/i18n/`, `/screenshots/`, RSS/sitemap (`*.xml`), `media.lexkite.com`, `audio.lexkite.com` (test `scripts/test/protection.mjs` chặn hồi quy).
**Miễn trừ mọi luật:** `cf.client.bot` (bot đã xác minh: Googlebot, Bingbot, Applebot, DuckDuckBot, Yandex, facebookexternalhit…). Luật custom còn miễn **header `X-Lexkite-CI`** = secret GitHub `LEXKITE_CI_HEADER` (bản sao `~/.config/lexkite/ci-header`, chmod 600; đã tạo 17/10/2026).

**Vì sao các con số này:**
- Mở 1 bài `/vi/blog/<bài>/` = **1 request** vào đường dẫn nội dung (CSS nội tuyến, icon ở `/icons/`, ảnh ở `media.lexkite.com`, đã đo 17/10).
- **Ngưỡng tính cho nhiều người chung 1 IP, không phải 1 người** (rà 3/11, `RL_BUDGET` trong `cf-waf-rules.mjs`): người dùng di động VN/ID/IN sau **CGNAT** nhà mạng, Wi-Fi trường/lớp học, văn phòng dùng chung 1 IP công khai. Ca xấu nhất có thật: giáo viên gửi link, **cả lớp ~50 em mở trong vài giây** → 50 request/10 s từ 1 IP. Ngưỡng cũ 40 chặn đúng ca này → nâng **100** (dư ×2). Vẫn chặn được kẻ cào thật đã gặp: **2/11 03:26 UTC, 1 IP VPS Đức (AS208137) giả UA Android, 257 request/10 s vào `/samples/`** – lọt UA rule, chỉ RL bắt được; ở ngưỡng 100 nó vẫn bị chặn sau 1 giây. Scrapy mặc định (16 luồng song song) cũng vượt 100 ngay giây đầu. Kẻ cào tự giãn < 10 req/s thì không ngưỡng nào của gói Free chặn được (ở 40 là < 4 req/s) – lớp chặn chính là luật UA/headless, ngưỡng 100 không làm yếu lớp đó.
- **Block chứ không managed challenge:** luật chung bộ đếm với API `fetch()` (challenge trả trang HTML → app hỏng y như block), và gói Free chỉ có thời gian chặn 10 s → người thật chỉ phải chờ 10 s, không bị khóa lâu.
- **`/packs/` không bị đếm RL** (vẫn nằm trong luật chặn UA công cụ): app `fetch('/packs/<lang>.json')` 1 lần, bị chặn thì `app.js` nhận `{}` và giữ suốt phiên → mất bản dịch; chỉ ~14 tệp nên RL vốn không chặn kịp kẻ cào nào (test kiểm số tệp < ngưỡng).
- **Đo chặn nhầm thật:** `node scripts/cf-waf.mjs events 7` – liệt kê IP bị RL chặn theo ASN/quốc gia/UA. Dấu hiệu CGNAT: ASN nhà mạng di động (Viettel AS7552, VNPT AS45899, Mobifone AS131429, Telkomsel AS23693, Jio AS55836, Airtel AS45609) với **nhiều UA trình duyệt khác nhau** trên 1 IP → nâng `--rl-requests` (tối đa 200). Scraper: 1 UA, ASN hosting, hàng trăm request/10 s. Rà 3/11 (29/10–2/11): 240 request bị chặn, 217 là VPS Đức trên, còn lại là audit của chính mình (curl/`lexkite-live-audit` từ VNPT) – **0 người dùng thật**.
- **Audit/crawler của mình** (SEO, `content-registry record`) không miễn được bằng header ở RL gói Free → tự giãn **≤ 5 req/s** (dưới ½ ngưỡng); 429 ở audit 2/11 là do audit chạy nhanh hơn ngưỡng cũ 40, không phải người dùng.
- Rate limit gói Free chỉ cho dùng **đường dẫn + cf.client.bot** trong biểu thức (không host/header) → không miễn CI bằng header được; vì vậy CI tự giãn (`content-registry record` 1,5 s/request) và RL **không** tính `/blog/` trơn (trùng đường dẫn ảnh `media.lexkite.com/blog/…`).
- **Không bật Bot Fight Mode:** gói Free không có luật bỏ qua → sẽ chặn GitHub Actions (`/api/studio`, `/api/drive` CLI, `/api/report` CLI), health check và add-on.
- **Hotlink Protection: để TẮT.** Nó chỉ áp cho `.gif .ico .jpg .jpeg .png` trên zone, còn ảnh blog là WebP/AVIF ở `media.lexkite.com` → không bảo vệ được gì, chỉ thêm rủi ro cho `og-default.png`/icon khi hiển thị ở Google Images. Đã kiểm 17/10.

**Lệnh:**
```
node scripts/cf-waf.mjs dry-run        # in luật (che header bí mật), không cần token
node scripts/cf-waf.mjs perms          # token làm được gì
node scripts/cf-waf.mjs apply          # ghi luật (idempotent; giữ luật khác không phải lexkite_*); gói Free từ chối challenge cho RL → thêm --rl-action block
node scripts/cf-waf.mjs verify --live  # so luật đang chạy + request thử thật (python-requests → 403, + header CI → 200, RSS/sw.js/api không bị chặn)
node scripts/cf-waf.mjs live           # chỉ request thử (CI hằng tuần, không cần token)
node scripts/cf-waf.mjs events 7       # ai bị rate limit chặn 7 ngày qua (ASN/quốc gia/UA) – soi chặn nhầm CGNAT
```
Token áp luật: biến `CF_WAF_TOKEN` hoặc file `~/.config/lexkite/cf-waf-token` (dự phòng `cf-token`, nhưng token đó **không** có quyền WAF – xem §6).

## 3. "Được lập chỉ mục trước" (`.github/workflows/blog-publish.yml`, mỗi giờ phút 7)
Bài đến giờ (`blog-due --since 70`, mọi ngôn ngữ) → deploy hook Cloudflare (build lại, sitemap `lastmod` cập nhật) → **IndexNow** (URL bài + trang danh sách blog từng ngôn ngữ) → **WebSub** ping `https://pubsubhubbub.appspot.com/` cho `/<lang>/blog/rss.xml` (feed khai báo `<atom:link rel="hub">`) → **sổ băm** → commit.
- **Không dùng Google Indexing API** – Google chỉ cho phép với trang JobPosting/BroadcastEvent; dùng cho blog là vi phạm chính sách.
- Không còn "ping sitemap" của Google (đã ngừng 2023) – Google đọc sitemap trong Search Console + `lastmod`.
- Trang bài có sẵn: `<link rel="canonical">`, `<meta name="author" content="Lexkite">`, `article:published_time`/`article:modified_time`, JSON-LD BlogPosting `datePublished`/`dateModified`/author/publisher, ngày đăng hiển thị `<time datetime>` + "Cập nhật" khi sửa, dòng © tác quyền cuối bài.
- Cron `blog-daily` chỉ xếp lịch; việc báo tìm kiếm chạy ở `blog-publish` đúng giờ bài lên (cả khi chạy tay `force`).

## 4. Sổ băm nội dung (`content/protection/registry.jsonl`)
- Chỉ ghi thêm, mỗi dòng 1 JSON: `seq, type, at, …, prev, hash` với `hash = sha256(prev + JSON chuẩn hóa)` → sửa/xóa dòng cũ là lộ (`verify`). Commit bởi CI (`[CF-Pages-Skip]` – không tốn build) → GitHub giữ dấu thời gian.
- `publish`: `sha256` HTML đang phục vụ thật (lấy qua header CI) + `sha256` nguồn `.md`, `publishedAt`, commit. Ghi lại khi nguồn đổi (cập nhật bài).
- `dataset` (hằng tuần, `content-protect.yml`): gốc băm `git ls-files -s web/js content` (trừ blog) – phủ đề, lời giải, ngữ pháp, từ vựng (~2.784 câu hỏi).
- `archive`: URL bản lưu Wayback. **API cho Antigravity:** `import { recordArchive } from './lib/content-registry.mjs'; recordArchive({ url, archiveUrl })` (hoặc CLI `node scripts/content-registry.mjs archive <url> <archiveUrl>`); chèn bước Wayback ở chỗ đánh dấu trong `blog-publish.yml`, trước bước "Commit sổ đăng ký", gửi header CI khi đọc trang lexkite.com.
- `release` (add-on lên phiên bản / landing dựng lại, `content-protect.yml` khi push): gốc băm `git ls-files -s` mã phát hành + phiên bản.
- Lệnh: `record [url…]` · `snapshot` · `release addon|landing` · `verify` (cũng trong `npm test`) · `evidence <url>` (gom bằng chứng cho DMCA). Đã ghi sẵn 16 bài đang live + 1 ảnh chụp kho (17/10).

## 4b. OpenTimestamps – bằng chứng tồn tại neo vào Bitcoin (miễn phí, `scripts/ots.mjs`)
- **Cái gì được đóng dấu:** mỗi mục của sổ băm (bài blog mới `publish`, mốc phát hành `release` – add-on lên phiên bản (`extension/manifest.json`) / landing dựng lại, ảnh chụp kho `dataset`, `archive`). Tệp đóng dấu = **đúng dòng JSON** của mục trong `registry.jsonl` (không `\n` cuối). Mục chứa `hash` nối chuỗi → dấu của mục *n* chứng minh mọi mục 1…*n* (và các sha256 HTML/nguồn bên trong) đã tồn tại lúc đó.
- **Không bao giờ đóng dấu dữ liệu riêng:** chỉ loại mục công khai, URL lexkite.com; dòng có email/khóa/token bị bỏ qua (`stampable()`). Lịch công khai chỉ nhận **SHA-256** (kèm nonce), không nhận nội dung.
- **Ở đâu:** `content/protection/ots/<hash của mục>.ots` (0,5–5 KB/mục; test chặn file lạ hoặc > 20 KB).
- **Khi nào (chỉ CI, không chạy trên máy):** `blog-publish.yml` sau bước sổ băm + Wayback (`ots.mjs stamp` + `upgrade`); `content-protect.yml` hằng tuần và khi push đổi `extension/manifest.json`, `content/landing/**`, `scripts/build-landing.mjs`, `scripts/lib/site-layout.mjs` (`content-registry.mjs release addon|landing` → `stamp` → `upgrade` → commit `[CF-Pages-Skip]`). Bước OTS `continue-on-error` + `::warning::` – lịch công khai lỗi không bao giờ chặn đăng bài; lần sau tự thử lại.
- **Pending → Bitcoin:** `ots stamp` trả bằng chứng *pending* ngay; sau ~1–12 giờ lịch neo vào 1 khối Bitcoin, `ots upgrade` (lần chạy kế tiếp) gắn xác nhận vào tệp. `node scripts/ots.mjs status` đếm bitcoin/pending/thiếu.

**Cách chứng minh (hồ sơ DMCA, tranh chấp):**
```
node scripts/ots.mjs export <seq|hash|url> --out bang-chung/   # ghi lexkite-registry-<seq>.json + .ots
# Cách 1 (không cài gì): mở https://opentimestamps.org → Verify → kéo cả 2 tệp vào → hiện "Bitcoin block #… attests existence as of …"
# Cách 2: pip install opentimestamps-client
ots verify -f bang-chung/lexkite-registry-<seq>.json bang-chung/lexkite-registry-<seq>.json.ots   # cần Bitcoin Core để tự kiểm khối
ots info bang-chung/lexkite-registry-<seq>.json.ots                                                # không có node: đối chiếu merkle root khối ở block explorer
node scripts/ots.mjs verify <seq>                                                                  # gói 2 lệnh trên
```
Kèm theo: `node scripts/content-registry.mjs evidence <url>` (mục sổ + lịch sử git) – bên thứ ba tính lại `sha256` HTML/nguồn, khớp dòng JSON đã đóng dấu, khớp khối Bitcoin → thời điểm tồn tại không thể làm giả.

## 4c. Bằng chứng ở bên thứ ba (3/11/2026, `content-evidence.yml`, chỉ CI, $0)
Mọi kết quả ghi vào sổ băm §4 (mục mới → OTS §4b phủ). Bước nào lỗi chỉ `::warning::`, lần sau tự thử lại.
| Bên thứ ba | Khi nào | Lưu gì | Kiểm |
|---|---|---|---|
| **RFC 3161** – DigiCert, Sectigo, FreeTSA (`scripts/tsa.mjs`) | hằng ngày, mục đầu sổ chưa có tem | `content/protection/tsa/<hash mục>.<tsa>.tsr` – chỉ gửi SHA-256 dòng JSON của mục (kho private sau này: ghi gốc băm vào sổ rồi đóng tem, không gửi nội dung). Tem mục *n* phủ mục 1…*n* qua chuỗi | `node scripts/tsa.mjs verify <seq>` (openssl ts -verify; CA FreeTSA ở `tsa/certs/`) |
| **Wayback** Save Page Now (`scripts/lib/wayback.mjs`) | bài mới (`blog-publish.yml`) + hằng ngày ≤ 120 trang sitemap mới/đổi (`wayback-snapshot.mjs --sitemap`) | mục `archive` | URL bản lưu |
| **Software Heritage** save code now (`scripts/swh-save.mjs`) | thứ Hai + mỗi lần phát hành add-on/landing | mục `swh` (yêu cầu → trạng thái succeeded + ngày lưu) | archive.softwareheritage.org |
| **Zenodo** (CERN) restricted access (`scripts/zenodo-deposit.mjs`) | ngày 1 hằng tháng – **tắt tới khi có secret `ZENODO_TOKEN`** | tar.gz kho nội dung (web/js + content trừ protection, ~21 MB) + manifest sha256 → DOI; tệp không công khai, metadata + ngày công khai. Mục `deposit` | DOI; gốc băm manifest tính lại được |
| **Nhãn hiệu** (`scripts/tm-evidence.mjs`) | ≤ 1 lần/30 ngày/nơi | mục `tm-use` + `content/protection/trademark-use.json`: web, Chrome Web Store, Google Play, App Store, logo – ngày dùng công khai sớm nhất (Wayback CDX; chưa có thì commit git, ghi rõ), bản lưu Wayback mới, băm thiết kế logo | quyền nhãn hiệu thông thường (chưa đăng ký) → chỉ dùng ™, không ® |

**Gom hồ sơ:** `node scripts/content-registry.mjs evidence <url|seq|hash|canary-id>` → băm, OTS (Bitcoin), tem RFC 3161, DOI Zenodo, Wayback, Software Heritage, commit + lịch sử git (không cần mạng).
**Token Zenodo (owner, miễn phí):** zenodo.org → đăng nhập (GitHub/ORCID) → avatar → *Applications* → *Personal access tokens* → *New token*, scope `deposit:write` + `deposit:actions` → GitHub repo → Settings → Secrets → Actions → `ZENODO_TOKEN`. Thử trước: secret `ZENODO_SANDBOX=1` + token sandbox.zenodo.org. Lưu ý: Zenodo dành cho kết quả nghiên cứu/giáo dục; bản ghi có thể bị xem xét lại – các lớp khác (RFC 3161, OTS, Wayback, SWH) không phụ thuộc Zenodo.
**Lỗi đã sửa 3/11:** `wayback-snapshot.mjs` gọi `saveSnapshot`/`sleep` chưa định nghĩa từ khi tạo → bước Wayback trong `blog-publish.yml` luôn ném lỗi, `continue-on-error` che → sổ có **0** mục `archive`. Test chặn hồi quy (`protection.mjs`) + cảnh báo khi lưu 0/N trang.

## 5. Giám sát bản sao (`content-protect.yml`, Chủ nhật 02:17 UTC)
Kiểm chuỗi băm → ảnh chụp kho → `cf-waf live` (cảnh báo nếu WAF chưa hoạt động) → `copy-watch.mjs`: 1 câu đặc trưng/bài × 6 bài mới nhất, tìm nguyên văn qua **Brave Search API** (gói Free ~2.000 lượt/tháng – chỉ chạy khi có secret `BRAVE_SEARCH_KEY`) **+ mọi canary kho đề/từ (§9)** qua Brave và **GitHub code search** (`GITHUB_TOKEN` của Actions, miễn phí, không cần khóa) → kết quả lên Quản trị (Cảnh báo "Nghi bị chép nội dung" + tab Backlink, PR & Thương hiệu) và có trang lạ thì mở issue `content-copy`. Google/Bing không còn API tìm kiếm miễn phí cho dự án mới.
**Tra tay (không có khóa):** `node scripts/copy-watch.mjs` in sẵn các câu → dán từng câu **trong ngoặc kép** vào Google và Bing; thêm `-site:lexkite.com`. Mỗi tháng 1 lần là đủ. Có thể đặt Google Alerts (google.com/alerts) với 2–3 câu đặc trưng trong ngoặc kép.

## 6. Việc của chủ site (token hiện tại `lexkite-claude` chỉ có D1/Workers/Pages/AI – **không** đọc/ghi được WAF, Bot, Hotlink; đã kiểm `perms` 17/10)
1. **Tạo token WAF** (≈2 phút): dash.cloudflare.com → ảnh đại diện góc phải → **My Profile** → **API Tokens** → **Create Token** → **Custom token – Get started** → Token name `lexkite-waf` → Permissions (bấm *+ Add more* cho từng dòng):
   - `Zone` · `Zone WAF` · `Edit`
   - `Zone` · `Zone Settings` · `Read`
   - `Zone` · `Bot Management` · `Read`
   - `Zone` · `Zone` · `Read`
   → Zone Resources: `Include` · `Specific zone` · `lexkite.com` → **Continue to summary** → **Create Token** → bấm Copy. Trong Terminal: `pbpaste > ~/.config/lexkite/cf-waf-token && chmod 600 ~/.config/lexkite/cf-waf-token` rồi nhắn Claude "đã lưu token WAF" (Claude chạy `apply` + `verify --live`). Không dán token vào chat.
2. **Bot Fight Mode phải TẮT:** dash → lexkite.com → **Security** → **Settings** → mục *Bot traffic* → **Bot fight mode** = Off (giao diện cũ: Security → Bots → Bot Fight Mode → Off). Sau khi có token, `perms` sẽ báo trạng thái.
3. **Hotlink Protection để TẮT:** Scrape Shield (Security → Settings → *Hotlink protection*) – giữ Off (lý do §2).
4. *(Tùy chọn)* **Block AI bots** của Cloudflare: từ 3/11 `robots.txt` đã chặn bot **huấn luyện** AI (§8) nhưng vẫn cho bot tìm kiếm/trả lời có dẫn link (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, PerplexityBot) → Lexkite vẫn xuất hiện trong câu trả lời AI. Nút Cloudflare chặn cứng ở biên (cả bot không tôn trọng robots) nhưng có thể chặn luôn bot trả lời → mặc định để Off.
5. *(Tùy chọn)* **Brave Search API:** api-dashboard.search.brave.com → Sign up → chọn gói **Free** → API Keys → Add → copy → GitHub repo → Settings → Secrets and variables → Actions → **New repository secret** `BRAVE_SEARCH_KEY` (hoặc lưu `~/.config/lexkite/brave-key` và nhờ Claude đặt secret).
6. Nếu `apply` báo gói Free không cho *managed challenge* ở rate limit: chạy lại với `--rl-action block` (chặn 10 s).

## 7. Đổi/gỡ khi cần
- Đổi header CI: tạo giá trị mới → cập nhật `~/.config/lexkite/ci-header` + secret GitHub `LEXKITE_CI_HEADER` → `cf-waf apply`.
- Tắt khẩn cấp: dash → Security → Security rules → tắt các luật tên `[lexkite] …` (hoặc xóa; `apply` tạo lại).
- Người dùng thật kêu bị chặn: `node scripts/cf-waf.mjs events 7` (hoặc Security → Events, lọc `ref lexkite_*`); nếu là CGNAT/trường học → sửa `RL_BUDGET` (hoặc `--rl-requests`, 20–200) rồi `apply`.

## 8. Thông báo quyền & chặn huấn luyện AI (3/11/2026)
- **`LICENSE`** (gốc repo): mã + nội dung © MODIAN LUXURY JEWELRY LLC (Lexkite), *All rights reserved*, không giấy phép mở; repo công khai chỉ để chạy CI; cấm sao chép/đăng lại/đưa vào app–sách–bộ dữ liệu khác; **cấm dùng huấn luyện/đánh giá AI**; bảo lưu TDM theo EU 2019/790 Điều 4(3). **`NOTICE`**: tài sản bên thứ ba + giấy phép (khớp §10). Chuyển nội dung sang repo private: chờ owner quyết.
- **Điều khoản** (`content/legal/{en,vi}/terms.html` §9, neo `#content-rights`, `#ai-training`, `#dmca`, `#repeat-infringers`): quyền nội dung, cấm cào/AI, quy trình thông báo DMCA §512(c)(3) + phản thông báo §512(g)(3) + §512(f), chính sách người vi phạm nhiều lần (theo mẫu Quizlet/Duolingo). en/vi viết tay; 13 ngôn ngữ còn lại `i18n.yml` dịch tự động khi merge (`build-legal.mjs --translate`). Ghi công công khai: `privacy.html#credits`.
- **Máy đọc được:** `web/robots.txt` chặn bot **huấn luyện** (GPTBot, CCBot, ClaudeBot, anthropic-ai, Google-Extended, Applebot-Extended, Bytespider, meta-externalagent, Amazonbot, cohere, Diffbot, img2dataset, AI2Bot, DeepSeekBot…); **không** có nhóm riêng cho Googlebot/Bingbot/Applebot/DuckDuckBot/Yandex/PetalBot → SEO giữ nguyên. `web/ai.txt` (cấm mọi loại tệp cho AI), `web/.well-known/tdmrep.json` + `<meta name="tdm-reservation" content="1">` trên mọi trang tĩnh và app (`IP_META` trong `themeHead`, `scripts/lib/site-layout.mjs`). Dòng © hiển thị: chân mọi trang tĩnh (`siteFooter`) và app (`app.js`). Không thêm meta copyright (trang giới thiệu sát ngân sách gzip).
- **Test** (`scripts/test/protection.mjs`, trong `npm test`): bộ đọc robots theo RFC 9309 kiểm 16 bot tìm kiếm/trả lời được vào `/`, blog, `/tu-vung/`, `/samples/`, sitemap và vẫn tránh `/admin`; 12 bot huấn luyện bị chặn; ai.txt/TDMRep/LICENSE/NOTICE/mục điều khoản tồn tại; meta TDM không chứa noindex.
- Robots chỉ là lời yêu cầu: bot không tuân thủ → WAF §2 (UA/headless/rate limit) + bằng chứng §4 + canary §9.

## 9. Canary kho đề/từ (`content/protection/canaries.json`)
- Canary = câu **đúng và tự nhiên**, chỉ có tên riêng hư cấu độc nhất (Quillmere Riverside Hotel, Hollin Crest Hotel, Quellsby, Marrowick Point, Velden Hollow, Brannoch Quay…) → không đổi đáp án/lời giải, không hại người học. 8 mục đề TOEIC Speaking/Reading (5 có cụm tìm) + 4 câu ví dụ từ vựng. Trường `q` = cụm tìm nguyên văn.
- **Không** dùng ký tự tàng hình trong dữ liệu đề (hỏng khóa băm bản dịch, TTS, chấm điểm – lý do ở BOARD-ARCHIVE P1); thủy ấn tàng hình chỉ ở HTML blog/bài mẫu lúc dựng.
- Thêm canary: sửa câu trong `web/js/...` (và bản chép `extension/app/js/...`), thêm mục `{id, kind: exam|vocab, module, task, token, q, context}`. Test chặn: `q` phải còn nguyên văn trong `module` (sửa đề mà quên canary → đỏ), ≥ 3 canary mỗi loại. Không công khai danh sách ngoài repo.
- Thấy canary ở nơi khác = bằng chứng chép kho (xác suất trùng ngẫu nhiên ≈ 0) → DMCA-KIT §1–§2.

## 10. Kiểm tra ngược: nguồn & giấy phép (rà 3/11/2026)
| Tài sản | Nguồn / giấy phép | Ghi công |
|---|---|---|
| NGSL, NAWL, BSL, TSL | Browne, Culligan & Phillips – CC BY-SA 4.0 (bản dịch Lexkite cùng giấy phép) | privacy#credits, NOTICE, `toeic.js` |
| AWL | © Averil Coxhead | privacy#credits |
| Open English WordNet | CC BY 4.0 | privacy#credits + từng trang /words/ |
| Wiktionary (Free Dictionary API), Tatoeba | CC BY-SA; CC BY 2.0 FR | privacy#credits |
| CMU Pronouncing Dictionary | BSD 2-Clause | privacy#credits, NOTICE |
| Kokoro-82M (giọng) | Apache 2.0 | privacy#credits |
| Datamuse, MyMemory | điều khoản dịch vụ (Datamuse xin ghi công) | privacy#credits |
| Noto Emoji, Material Symbols / OpenMoji / Lucide | Apache 2.0 / CC BY-SA 4.0 / ISC | privacy#credits, `/credits` |
| Plus Jakarta Sans, Be Vietnam Pro, Bricolage Grotesque | SIL OFL 1.1 | `web/fonts/OFL.txt`, NOTICE |
| Ảnh Wikimedia/Openverse/Pixabay/Pexels; ảnh TOEIC | từng ảnh; CC0/PD | `/credits` (sinh từ `img.json`), `web/img/toeic/CREDITS.md` |
| fzstd, jsVectorMap (Natural Earth) | MIT; PD | NOTICE |

**Kết quả rà đề/từ:** không có dấu nguồn (Cambridge/Oxford/ETS/"Reproduced"…) trong kho đề; không trùng ~70 tiêu đề bài đọc Cambridge IELTS/TOEFL quen thuộc. 5 định nghĩa sát lời từ điển học thuật (fluctuate, pedestrian, curriculum, perpetual, town) đã viết lại 3/11. Chưa có cổng n-gram so với nguồn có bản quyền (`docs/CONTENT-QA.md` – thiếu kho tham chiếu).
**Còn mở (không tự xóa tính năng – cần phiên riêng):**
1. `web/js/dictionary.js` `fromGoogle()` gọi endpoint không chính thức `translate.googleapis.com … client=gtx` lấy cả định nghĩa/ví dụ/đồng nghĩa (dữ liệu Oxford Languages) – rủi ro điều khoản Google + bản quyền. Hướng: thay phần định nghĩa/ví dụ bằng kho Lexkite + OEWN + Wiktionary, giữ chất lượng tra.
2. `content/wordlists/cefr-oxford.json`: cấp CEFR lấy từ Oxford 3000/5000 (danh sách có bản quyền của OUP) → thay bằng CEFR-J/English Profile tự suy, hoặc tự gán.
3. `content/video/scripts/bank/mixups.jsonl`: ghi chú nói lấy từ Cambridge Dictionary/Swan → rà 9 dòng, viết lại bằng lời của mình.
4. Cổng chồng lấp n-gram (`scripts/content-qa/overlap.mjs`): 6–8-gram đề/lời giải so với nhau + kho tham chiếu cục bộ (không đưa lên repo) + mẫu tra web định kỳ.
5. Phông Google Fonts nạp từ CDN ở `web/app/index.html`, `schools.html` → tự host (đồng nhất, quyền riêng tư).

