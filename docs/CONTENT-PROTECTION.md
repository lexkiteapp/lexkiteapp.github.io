# Bảo vệ nội dung Lexkite – chống cào, chứng minh đăng trước, xử lý DMCA

> TL;DR: Bảo vệ nội dung chống cào: luật Cloudflare WAF, "được lập chỉ mục trước", sổ băm, OpenTimestamps, giám sát bản sao, xử lý DMCA. Phần build/giao diện do Antigravity (thẻ P1 trên BOARD).
> Đọc khi: xử lý sao chép/DMCA hoặc sửa WAF.
Cập nhật 17/10/2026. Phía máy chủ/Cloudflare (phiên chính). Phía build & giao diện (Wayback, gắn nguồn khi chép, canary) do Antigravity làm – thẻ P1 trong `docs/agents/BOARD.md`. Hồ sơ pháp lý: `docs/legal/DMCA-KIT.md`. Không chứa khóa/mật khẩu.

## 1. Mục tiêu & nguyên tắc
- Kẻ cào chép bài blog (15 ngôn ngữ) và ~2.784 câu hỏi luyện thi, đăng lại sớm hơn, thậm chí gửi DMCA giả nhắm vào Lexkite.
- Phòng thủ 3 lớp: **(a) làm khó cào** bằng WAF Cloudflare; **(b) được lập chỉ mục trước** (IndexNow + WebSub + sitemap ngay khi đăng); **(c) bằng chứng tác quyền** chống giả mạo (sổ băm nối chuỗi + lịch sử git + Wayback).
- KHÔNG được làm hỏng: người đọc thật, SEO (Googlebot/Bingbot luôn qua), app & add-on, GitHub Actions gọi `/api/*`.

## 2. Luật Cloudflare (mã: `scripts/cf-waf.mjs`, luật: `scripts/lib/cf-waf-rules.mjs`)
| Ref | Phase | Hành động | Phạm vi |
|---|---|---|---|
| `lexkite_scraper_ua` | Custom rule | Block | Host lexkite.com/www, đường dẫn nội dung (dưới), không phải `.xml`, UA trống hoặc chứa `python-requests`, `python-urllib`, `python-httpx`, `aiohttp`, `scrapy`, `go-http-client`, `httrack`, `wget`, `libwww`, `okhttp`, `colly` |
| `lexkite_headless` | Custom rule | Managed challenge | Như trên nhưng chỉ trang HTML (không `/packs/`), UA `HeadlessChrome`/`PhantomJS` |
| `lexkite_content_rl` | Rate limiting | Managed challenge | > **40 request / 10 s / IP** vào đường dẫn nội dung |

**Đường dẫn nội dung:** `/<lang>/blog/` (15 ngôn ngữ), `/blog/` (301 cũ), `/tu-vung/`, `/ngu-phap/`, `/samples/`, `/speaking/`, `/viet-thu/`, `/en/vocabulary/`, `/en/samples/`, `/en/speaking/`, `/packs/` (gói nghĩa app tải lười).
**Không bao giờ nằm trong phạm vi:** `/api/*`, `/sw.js`, `/js/`, `/css/`, `/icons/`, `/audio/`, `/img/`, `/i18n/`, `/screenshots/`, RSS/sitemap (`*.xml`), `media.lexkite.com`, `audio.lexkite.com` (test `scripts/test/protection.mjs` chặn hồi quy).
**Miễn trừ mọi luật:** `cf.client.bot` (bot đã xác minh: Googlebot, Bingbot, Applebot, DuckDuckBot, Yandex, facebookexternalhit…). Luật custom còn miễn **header `X-Lexkite-CI`** = secret GitHub `LEXKITE_CI_HEADER` (bản sao `~/.config/lexkite/ci-header`, chmod 600; đã tạo 17/10/2026).

**Vì sao các con số này:**
- Mở 1 bài `/vi/blog/<bài>/` = **1 request** vào đường dẫn nội dung (CSS nội tuyến, icon ở `/icons/`, ảnh ở `media.lexkite.com`, đã đo 17/10). App chỉ tải `/packs/<lang>.json` 1 lần. Người đọc nhanh nhất ~1 trang/giây = 10/10 s → 40 dư ×4, đủ cho nhiều người chung IP (CGNAT nhà mạng, lớp học). Vượt ngưỡng chỉ bị *managed challenge* (thường tự qua), không bị chặn cứng.
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

## 5. Giám sát bản sao (`content-protect.yml`, Chủ nhật 02:17 UTC)
Kiểm chuỗi băm → ảnh chụp kho → `cf-waf live` (cảnh báo nếu WAF chưa hoạt động) → `copy-watch.mjs`: 1 câu đặc trưng/bài × 6 bài mới nhất, tìm nguyên văn qua **Brave Search API** (gói Free ~2.000 lượt/tháng – chỉ chạy khi có secret `BRAVE_SEARCH_KEY`) → có trang lạ thì mở issue `content-copy`. Google/Bing không còn API tìm kiếm miễn phí cho dự án mới.
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
4. *(Tùy chọn, quyết định kinh doanh)* **Block AI bots** (Security → Settings → *Block AI bots*): chặn GPTBot, CCBot… – không ảnh hưởng Googlebot/Bingbot nhưng làm Lexkite biến mất khỏi câu trả lời của trợ lý AI. Mặc định để như hiện tại.
5. *(Tùy chọn)* **Brave Search API:** api-dashboard.search.brave.com → Sign up → chọn gói **Free** → API Keys → Add → copy → GitHub repo → Settings → Secrets and variables → Actions → **New repository secret** `BRAVE_SEARCH_KEY` (hoặc lưu `~/.config/lexkite/brave-key` và nhờ Claude đặt secret).
6. Nếu `apply` báo gói Free không cho *managed challenge* ở rate limit: chạy lại với `--rl-action block` (chặn 10 s).

## 7. Đổi/gỡ khi cần
- Đổi header CI: tạo giá trị mới → cập nhật `~/.config/lexkite/ci-header` + secret GitHub `LEXKITE_CI_HEADER` → `cf-waf apply`.
- Tắt khẩn cấp: dash → Security → Security rules → tắt các luật tên `[lexkite] …` (hoặc xóa; `apply` tạo lại).
- Người dùng thật kêu bị chặn: xem Security → Events, lọc `ref lexkite_*`; nâng `--rl-requests` (20–200).
