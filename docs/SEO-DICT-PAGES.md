# SEO-DICT-PAGES – trang từ điển tự sinh (programmatic SEO) + vòng dữ liệu Search Console (26/10/2026)

> TL;DR: Trang từ điển theo truy vấn bản địa (/vi/tu-dien/<từ>/ "X là gì", /en/dictionary/<từ>/ "X meaning"), nội dung độc nhất từ dữ liệu tự soạn của app, phục vụ bằng Worker lexkite-dict (asset tĩnh miễn phí + JSON trên R2), noindex mặc định, mở index dần TỰ ĐỘNG hằng tuần theo cổng chất lượng và số đo GSC (§5b, dict-stage.yml). Thí điểm 200 từ vi/en; bản xem thử lexkite-dict.vintagezulilyjewelry.workers.dev. §9 vòng GSC (PR #60).
> Đọc khi: sửa trang từ điển, mở index, mở thêm ngôn ngữ, làm vòng dữ liệu GSC.

Nguồn: `workers/dict/render.mjs` (dựng HTML, thuần – chạy cả trong Worker lẫn CI) · `workers/dict/index.mjs` (Worker) · `scripts/dict/build.mjs` (dữ liệu + tầng tĩnh) · `scripts/test/dict-pages.mjs` (cổng, trong `npm test`) · `.github/workflows/dict-pages.yml` (CI: cổng + Lighthouse + ảnh chụp).
Đọc kèm: `docs/SEO-ARCH.md` (trang tĩnh `/<lang>/words/` đang có), `docs/SEO-PLAN.md` §12, `docs/LEXICON.md`, `docs/I18N-PIPELINE.md`, `docs/QUOTAS.md`.

## 0. Thiết kế 10 dòng
1. **Mục tiêu đo được:** truy vấn tra từ ("make là gì", "advice meaning", "achieve 뜻") là nhu cầu lớn nhất, lặp hằng ngày của người học – blog không thể phủ. Đích: số trang "Đã index" + lượt hiển thị theo shard sitemap, rồi lượt bấm "Mở trong app".
2. **Tài nguyên:** 0 đồng. Pages: **+0 file** (không chạm trần 20.000). Worker: asset tĩnh không tính lượt; script chỉ chạy cho đuôi dài. D1/KV/AI: **0 lượt**. Khung app: +0 byte.
3. **Điểm hỏng & chặn:** trang mỏng, trùng tiêu đề, hreflang một chiều, JSON-LD sai, link hỏng, chữ Việt lọt trang en, trang > 16 KB gzip → `scripts/test/dict-pages.mjs` đỏ. Lighthouse dưới ngưỡng → CI đỏ.
4. **Ai giữ file nào:** generator/Worker/cổng = mảng SEO. Dữ liệu vẫn của chủ mảng (kho từ, "Cách dùng từ", ghi chú) – generator chỉ ĐỌC.
5. **Công tắc:** `DICT_INDEX=""` (mặc định) = noindex toàn bộ; gỡ route Worker = trang biến mất, site còn nguyên. Không có bước nào sửa Pages.

## 1. Vì sao trang từ điển, và quan hệ với `/<lang>/words/`
- Blog (522 bài) chỉ phủ chủ đề; tra từ là truy vấn đuôi dài khối lượng lớn nhất của ngành (mỗi từ × mỗi ngôn ngữ × "là gì/meaning/significado/뜻/意味"). Đối thủ trên các truy vấn này là từ điển lớn → muốn thắng phải có thứ họ không có: **lỗi người học theo tiếng mẹ đẻ, cặp từ dễ nhầm, bài tự kiểm tra, audio, đường vào app ôn lặp lại**.
- `/<lang>/words/<slug>` (SEO-ARCH, trang tĩnh trong Pages, ~8.000 file) đã có. Trang từ điển mới **thay thế dần** nó, không chạy song song khi index:
  - Thí điểm (noindex) không cạnh tranh với `/words/`.
  - Khi một từ được mở index ở `/vi/tu-dien/<từ>/` thì `/vi/words/<từ>` phải **301** sang URL mới trong cùng lần deploy (generator `build-seo-pages.mjs` đọc `manifest.json` + `DICT_INDEX` → bỏ trang đó khỏi `/words/` + sitemap-words, ghi dòng `_redirects`). Không bao giờ để 2 URL index được cho cùng 1 từ cùng ngôn ngữ.
  - Lợi ích phụ: mỗi từ chuyển đi trả lại 1 file cho Pages (trần 20.000) → blog có thêm chỗ.

## 2. Kiểu URL theo truy vấn bản địa
Một URL chuẩn: chữ thường, gạch chéo cuối, slug ASCII của từ tiếng Anh (`slugOf`, trùng quy tắc `/words/`). Biến thể (hoa, thiếu `/`) → 301 trong Worker. Thư mục con cùng tên miền (không subdomain) để hưởng uy tín lexkite.com.

| Ngôn ngữ | Đường dẫn | Truy vấn đích (tiêu đề bắt đầu bằng) | Trạng thái |
|---|---|---|---|
| vi | `/vi/tu-dien/<từ>/` | "{Từ} là gì? Nghĩa, phát âm và ví dụ" | thí điểm |
| en | `/en/dictionary/<từ>/` | "{Word} meaning, pronunciation and examples" | thí điểm |
| es | `/es/diccionario/<w>/` | "{w} significado" | kế hoạch |
| pt | `/pt/dicionario/<w>/` | "{w} significado / tradução" | kế hoạch |
| fr | `/fr/dictionnaire/<w>/` | "{w} signification / traduction" | kế hoạch |
| de | `/de/woerterbuch/<w>/` | "{w} Bedeutung / Übersetzung" | kế hoạch |
| id | `/id/kamus/<w>/` | "{w} artinya" | kế hoạch |
| tr | `/tr/sozluk/<w>/` | "{w} ne demek" | kế hoạch |
| ru | `/ru/slovar/<w>/` | "{w} перевод" | kế hoạch |
| ja | `/ja/jisho/<w>/` | "{w} 意味" | kế hoạch |
| ko | `/ko/sajeon/<w>/` | "{w} 뜻" | kế hoạch |
| zh | `/zh/cidian/<w>/` | "{w} 什么意思" | kế hoạch |
| th | `/th/photchananukrom/<w>/` | "{w} แปลว่า" | kế hoạch |
| hi | `/hi/shabdkosh/<w>/` | "{w} meaning in Hindi" | kế hoạch |
| ar | `/ar/qamus/<w>/` | "معنى {w}" (dir=rtl) | kế hoạch |

Nguồn duy nhất: `DICT_PATH`/`ENABLED` trong `render.mjs`. Mở một ngôn ngữ mới cần: nhãn giao diện `T[lang]` **dịch thật, người duyệt** (I18N-PIPELINE – không dịch máy hàng loạt), nghĩa bản địa cờ ≥ 1 trong `web/packs/<lang>.json`, mẫu tiêu đề viết theo cách người nước đó gõ (kiểm bằng GSC §9 trước khi chốt), rồi mới thêm vào `ENABLED`.

## 3. Nội dung độc nhất mỗi trang (chống thin content)
Mỗi phần chỉ hiện khi có dữ liệu thật; không phần nào là chữ lấp chỗ.

| Phần | Nguồn (chỉ đọc) | Ghi chú |
|---|---|---|
| Nghĩa (vi) / định nghĩa (en) | kho từ `web/js/data.js` + `web/js/lib/*` (Lexkite tự soạn – CONTENT-RULES) | vi kèm định nghĩa tiếng Anh |
| IPA Anh–Anh + Anh–Mỹ, nút audio | kho từ (`ipa`, `ipaUS` từ CMUdict/viết tay) · `audio.lexkite.com/audio/…` qua `audioKey` | chỉ chọn từ CÓ audio đã qua ASR (WORD-AUDIO) |
| Ví dụ (1–4) | ví dụ kho từ + "Cách dùng từ" + cụm có chứa từ | câu tự viết, không chép từ điển khác |
| Collocation, cấu trúc đi kèm | `col` kho từ + `web/js/usage/*` (p: giới từ, v: mẫu động từ) + cụm nhiều chữ trong kho | |
| Từ dễ nhầm + mẹo | `web/js/usage/pair.js` (cặp c) | phần đối thủ hiếm có |
| Lỗi hay gặp (sai → đúng + vì sao) | `mis` trong "Cách dùng từ"; ghi chú vi `web/js/notes/*.json` | trang vi có lỗi riêng của người Việt |
| Kiểm tra nhanh (3 câu) | sinh tất định: nghĩa (4 lựa chọn) · điền chỗ trống · câu đúng | 0 JS: đáp án trong `<details>` |
| CTA deep-link | `/app/#/dict/<từ>` (vi) · `/app/?hl=en#/dict/<từ>` | đúng màn hình tra từ trong app |
| Bài blog liên quan (≤ 3) | `content/blog/<lang>/*.md` đã đăng (`status: ready`, `publishAt` ≤ lúc dựng) | khớp tiêu đề/từ khoá/thẻ/nhấn `*từ*`; không bao giờ link bài chưa đăng |
| Từ liên quan (≤ 8) | cùng chủ đề trong tập, rồi lân cận | liên kết nội bộ, không trang mồ côi |
| FAQ | nghĩa · phát âm · khác nhau giữa cặp dễ nhầm | chữ FAQ = đúng chữ trên trang |

Thí điểm 26/10 (200 từ): vi điểm trung vị 73 · en 67; 54 từ có cặp dễ nhầm; 69 từ đủ 3 câu kiểm tra; 29 (vi)/20 (en) từ có bài blog liên quan. Trang ≈ 12–13 KB gzip, 0 JS ngoài nút audio/chọn ngôn ngữ dùng chung.

## 4. Structured data, hreflang, sitemap
- **JSON-LD** mỗi trang từ: `DefinedTerm` (name, description, inLanguage, url, termCode, `inDefinedTermSet` → hub `DefinedTermSet`) + `FAQPage` (câu hỏi/đáp án = chữ hiển thị – cổng kiểm) + `BreadcrumbList`. Hub: `DefinedTermSet` + `BreadcrumbList`. Google không còn hiện rich result FAQ cho site thường (từ 8/2023) – giữ vì hợp lệ, giúp máy hiểu trang, không đặt cược thứ hạng vào nó.
- **hreflang:** chỉ giữa các bản **đều index được** của cùng từ, có chính nó + `x-default` → bản en. Trang noindex không có hreflang và không nằm trong cụm của trang khác. Cổng kiểm hai chiều.
- **Sitemap shard:** `sitemap-dict-<lang>-<n>.xml`, ≤ 10.000 URL/file (nhỏ hơn trần 50.000 để GSC báo tỷ lệ index theo từng lô, đo được giai đoạn mở), mỗi `<url>` kèm `xhtml:link` như `<head>`, `lastmod` = ngày git của nguồn dữ liệu (không đổi vô cớ). Chỉ trang index được. Gom vào `/sitemap.xml` bằng 1 dòng trong `build-sitemap-index.mjs` khi mở index (Worker phục vụ file shard qua route `lexkite.com/sitemap-dict-*`). IndexNow: dùng lại `scripts/indexnow.mjs` với URL mới mở.

## 5. Ngưỡng chất lượng, mở index dần
**Điểm 0–100** (`quality()` trong `build.mjs`): lõi nghĩa+định nghĩa+ví dụ 20 · IPA 8 · IPA Mỹ 4 · audio 8 · ≥ 2 ví dụ 8 · collocation/cấu trúc ≥ 3 → 10 (≥ 1 → 5) · cặp dễ nhầm 10 · lỗi hay gặp/ghi chú 10 · 3 câu kiểm tra 8 (2 → 5) · blog 6 · từ gần nghĩa 4 · ≥ 4 từ liên quan 4.
**Ứng viên index** = điểm ≥ `QUALITY_MIN` 70 **và** ≥ `WORDS_MIN` 150 chữ nội dung riêng (không tính khung/menu). Ngưỡng chỉ được TĂNG. Thí điểm: vi 97/200 ứng viên, en 43/200 (en thiếu ghi chú riêng – xem bước làm giàu bên dưới).

**Giai đoạn (mỗi bước chủ duyệt, đo ≥ 28 ngày GSC – dữ liệu trễ 2–3 ngày):**

| Bước | DICT_INDEX | Mở | Sang bước sau khi | Lùi lại khi |
|---|---|---|---|---|
| S0 (nay) | `""` | 0 – noindex hết | chủ duyệt bản xem thử (ảnh CI + URL workers.dev) | – |
| S1 | `{"vi":50,"en":30}` | 50/30 ứng viên điểm cao nhất | shard đạt ≥ 60 % "Đã index" · CTR trung vị ≥ 1 % · LCP/INP/CLS "Tốt" · "Đã thu thập – chưa index" < 30 % | < 30 % index sau 6 tuần, hoặc hiển thị blog toàn site giảm > 20 % → về `""` |
| S2 | `all` | mọi ứng viên của 200 từ | như S1 trên toàn tập | như S1 |
| S3 | `all`, `DICT_N` 1.000 → 5.000 → 20.000 | nhân ×5 mỗi lần | như S1 cho shard mới | dừng nhân, làm giàu nội dung |
| S4 | thêm ngôn ngữ (§2) | 400 → 1.000 từ/ngôn ngữ | như S1 | như S1 |

## 5b. Tự động hoá giai đoạn (không cần ai nhớ)
- Trạng thái: `content/dict/stage.json` (chỉ bot sửa). Bậc + luật: `LADDER`/`RULES` trong `scripts/dict/stage.mjs` (test `scripts/test/dict-stage.mjs`, trong `npm test`).
- `.github/workflows/dict-stage.yml` – thứ Ba 09:00 VN (sau vòng GSC thứ Hai):
  1. Kiểm route `lexkite.com/vi/tu-dien/` đã do Worker phục vụ chưa (S0 → S1 tự xảy ra ngay tuần route chạy).
  2. `scripts/dict/metrics.mjs` (dùng lại `scripts/seo/gsc.mjs`): hiển thị/bấm theo thư mục từ điển + **URL Inspection mẫu 60 URL/ngôn ngữ** → tỷ lệ index thật (Sitemaps API không còn trả số "indexed") + biến động hiển thị toàn site → `reports/seo/dict-metrics.json`.
  3. `stage.mjs` quyết: **lên bậc** khi ≥ 28 ngày + mọi ngôn ngữ đạt ngưỡng; **giữ** khi thiếu số đo (không mở mù); **lùi** (về noindex/bậc trước) khi sau 6 tuần index < 30 % hoặc hiển thị toàn site giảm ≥ 20 %; **dừng chờ người** ở S4 (ngôn ngữ mới cần nhãn dịch thật) và khi bậc kế vượt 19.000 trang tĩnh mà chưa có R2 (biến repo `DICT_R2=1`).
  4. Đổi bậc → commit `stage.json` → dựng + cổng `dict-pages` → `wrangler deploy --var DICT_INDEX:…` (khi có secret `CLOUDFLARE_API_TOKEN`) → Pages build lại theo push: `/sitemap.xml` tự thêm shard `sitemap-dict-*` khi đã mở (`build-sitemap-index.mjs`), trang `/words/` của từ đã mở tự noindex + rời sitemap/hreflang (`build-seo-pages.mjs`), Worker trả 301 `/<lang>/words/<từ>` → trang từ điển (asset `dict-open.json`; từ chưa mở đi tiếp tới Pages).
  5. Mỗi lần chạy ghi 1 dòng vào issue `dict-stage` (lý do lên/giữ/lùi, thiếu gì).

Làm giàu trước khi nhân (không hạ ngưỡng): thêm cặp dễ nhầm/lỗi hay gặp cho từ dưới ngưỡng (danh sách `report.json → below`), ghi chú tiếng Anh cho trang en (lỗi theo L1 phổ biến), đồng nghĩa/trái nghĩa từ Open English WordNet (§7), thêm từ có truy vấn GSC thật (§9).

## 6. Kiến trúc phục vụ – trong giới hạn miễn phí
```
trình duyệt / Googlebot ──► lexkite.com/vi/tu-dien/<từ>/   (route Worker lexkite-dict; mọi đường dẫn khác vẫn là Pages)
   ├─ có trong Static Assets?  ─► trả HTML dựng sẵn (KHÔNG chạy script, KHÔNG tính lượt)          ← tầng 1: K trang nóng nhất/ngôn ngữ
   └─ không ─► script: Cache API (trúng → trả) ─► R2 lexkite-dict-data v1/<lang>/<slug>.json ─► render.mjs ─► cache 1 ngày  ← tầng 2: đuôi dài
```
- **Không thành file trong Pages** (trần 20.000 file/deploy giữ cho app + blog). Asset tĩnh của Worker là trần riêng: **20.000 file/phiên bản Worker (Free)**.
- **Một bộ dựng** (`render.mjs`) cho cả 2 tầng → HTML tầng 2 trùng từng byte tầng 1 (cổng kiểm). Đổi giao diện = deploy lại Worker + asset; R2 chỉ ghi khi JSON đổi (`manifest.json` băm từng file).
- **CPU:** dựng 1 trang ≈ 0,03 ms (đo 26/10) ≪ trần 10 ms/lượt gói Free. JSON ≈ 1,9 KB/từ.
- **Trần 100.000 lượt/ngày** là của **cả tài khoản** (audio, media, Pages Functions `/api/*`… dùng chung) và tính cả lượt trúng Cache API. Chỉ lượt vào **script** bị tính; lượt trúng asset tĩnh thì không. Phân bổ: trang từ điển ≤ 40.000 lượt script/ngày (đối chiếu `docs/QUOTAS.md` + Cloudflare Analytics trước khi gắn route).
- **Tính toán:** lượt xem từ điển theo phân phối Zipf – K trang đầu chiếm gần hết lượt. Ví dụ 1 triệu lượt xem/ngày (vi+en), K = 20.000/ngôn ngữ ở tầng tĩnh, đuôi dài 3–5 % → 30–50k lượt script. Vượt thì **không trả tiền** mà tăng K: tách Worker theo ngôn ngữ (`lexkite-dict-vi`, `lexkite-dict-en`…, mỗi Worker 20.000 asset, route riêng) → 15 × 20.000 = 300.000 trang tĩnh miễn phí; còn vượt nữa mới cân nhắc Workers Paid 5 USD/tháng (10 triệu lượt + 100.000 asset/Worker) – khi đó doanh thu quảng cáo đã dư.
- **Bot:** Googlebot ưu tiên URL trong sitemap = trang tầng 1 → crawl hầu như không tốn lượt script. `Cache-Control: max-age=3600, s-maxage=86400`, ETag theo phiên bản JSON.
- **R2:** 10 GB / 1 triệu ghi / 10 triệu đọc mỗi tháng miễn phí. Đọc R2 ≈ số trang khác nhau × số điểm biên mỗi ngày (Cache API), không phải số lượt xem. 100.000 từ × 15 ngôn ngữ × 1,9 KB ≈ 2,9 GB. Dựng lại toàn bộ 1,5 triệu JSON vượt 1 triệu ghi/tháng → luôn đẩy theo băm, mở ngôn ngữ theo đợt.
- **D1:** 0 lượt – không truy vấn, không full-scan, không poll (d1-quota-isolation). Không KV.
- **Khi hết lượt script:** route đặt *fail open* → yêu cầu rơi về Pages → trang đuôi dài 404 (noindex) tạm thời; tầng 1 không phụ thuộc lượt script (kiểm lại hành vi trên tài liệu Cloudflare "Static Assets – billing and limitations" ngay trước khi gắn route, ghi kết quả vào đây).

## 7. Nguồn dữ liệu và giấy phép
| Nguồn | Giấy phép | Dùng thế nào |
|---|---|---|
| Kho từ app (định nghĩa, ví dụ, nghĩa vi, ghi chú, "Cách dùng từ") | Lexkite tự soạn (CONTENT-RULES §1) | nguồn chính; 26/10 kiểm: 0/200 định nghĩa trùng nguyên văn NGSL defs |
| NGSL / NAWL / BSL (danh sách từ) | CC BY-SA 4.0 | chỉ danh sách + thứ tự tần suất (chọn từ), ghi công ở `/credits`; không chép định nghĩa |
| CMUdict | BSD-2-Clause | IPA Mỹ (qua build-lexicon) |
| Wiktionary | CC BY-SA 4.0 (+ GFDL) | chỉ dữ kiện (IPA, từ loại, dạng biến đổi). **Không** chép định nghĩa/ví dụ: share-alike sẽ buộc cả trang theo CC BY-SA. Nếu buộc phải dùng: khối riêng có ghi công + link bản gốc |
| Open English WordNet (2024) / Princeton WordNet 3.0 | CC BY 4.0 / giấy phép WordNet (cho phép, cần ghi công) | đồng nghĩa, trái nghĩa, quan hệ nghĩa, thứ tự nghĩa – làm giàu trang en (§5); ghi công ở `/credits` |
| Tatoeba (tuỳ chọn) | CC BY 2.0 FR | ví dụ bổ sung, ghi tác giả từng câu; ưu tiên câu tự viết |
| Âm thanh `audio.lexkite.com` | giọng TTS tự dựng (WORD-AUDIO, giấy phép thương mại đã kiểm) | chỉ từ đã qua ASR |
| **Cấm** | – | Oxford/Cambridge/Longman/Collins, kết quả Google Dịch, nội dung AI chưa duyệt |

## 7b. Cổng & CI
- `scripts/test/dict-pages.mjs` (trong `npm test`, ≈ 1 s): 2 chế độ (noindex mặc định · mở `all`) × vi/en × 200 từ + Worker với R2 giả: canonical, tiêu đề/mô tả duy nhất, h1, JSON-LD (trường bắt buộc, FAQ khớp chữ hiển thị), hreflang hai chiều + x-default, sitemap = đúng tập index được, link nội bộ/blog tồn tại, audio/IPA/ví dụ có thật, quiz 1 đáp án, chữ Việt không lọt trang en, ≤ 16 KB gzip, Worker 200/301/404/x-robots-tag.
- `.github/workflows/dict-pages.yml`: dựng → cổng → bản xem thử chế độ mở (không deploy) → Lighthouse điện thoại trên 4 trang (ngưỡng perf 90 · a11y 95 · best-practices 90 · SEO 95) → ảnh chụp (`shots/`) → `wrangler deploy --dry-run` (bundle được) → artifact `dict-pages` 14 ngày. Kết quả 0 trang → đỏ.

## 8. Việc chủ app cần làm (một lần – sau đó tự động)
Đã xong 26/10: bản xem thử noindex `https://lexkite-dict.vintagezulilyjewelry.workers.dev/vi/tu-dien/advice/` (tầng tĩnh, chưa R2, chưa route).
1. Duyệt giao diện/nội dung (bản xem thử + artifact CI `dict-pages`), merge PR #59 và #60.
2. GitHub → Secrets: `CLOUDFLARE_API_TOKEN` (token chỉ *Workers Scripts: Edit* + *Workers Routes: Edit* zone lexkite.com, thêm *R2: Edit* khi bật R2) và `GSC_SA_JSON` (§9). Dán thẳng vào ô secret trên GitHub, không qua chat/file.
3. Gắn route (bỏ `#` khối `routes` trong `workers/dict/wrangler.toml` hoặc Cloudflare → Workers → lexkite-dict → Domains & Routes, chế độ fail open). Tuần sau đó bot tự sang S1.
4. Chỉ khi bot báo cần (S3c, > 19.000 trang tĩnh): bật R2 (trang R2 đòi "Add R2 subscription" gắn thẻ đã có – 0 đồng trong hạn mức, nhưng vượt hạn mức sẽ tính tiền: đặt cảnh báo Billing), tạo bucket `lexkite-dict-data`, đặt biến repo `DICT_R2=1`.

## 9. Vòng dữ liệu Search Console (thiết kế – chưa làm)
**Mục tiêu:** xếp lại thứ tự viết blog và mở trang từ điển theo cầu thật: (a) truy vấn có hiển thị mà chưa có bài đúng ý, (b) trang đang ở hạng 8–30 ("striking distance") cần làm mới, (c) từ người ta tra mà tập từ điển chưa có.

**Xác thực (0 đồng, không khoá trong repo/chat):**
- Chủ tạo service account trong một dự án Google Cloud của tài khoản vintagezulilyjewelry@gmail.com (KHÔNG dùng khieudinhthong – bị khoá GCP), bật *Google Search Console API*, tải khoá JSON **về máy của chủ**, thêm email service account vào GSC thuộc tính `sc-domain:lexkite.com` quyền *Restricted* (chỉ đọc).
- Khoá vào secret GitHub `GSC_SA_JSON` qua giao diện GitHub (hoặc API libsodium đọc thẳng từ file – không in). Không bao giờ dán vào chat, issue, log, file.
- Script ký JWT RS256 bằng `node:crypto` (0 thư viện) → `oauth2.googleapis.com/token` (scope `webmasters.readonly`) → token 1 giờ trong bộ nhớ. Đăng ký `searchconsole.googleapis.com` + `oauth2.googleapis.com` vào `infra/resources.json` khi làm.

**Script `scripts/seo/gsc-pull.mjs` + workflow `gsc-weekly.yml` (thứ Hai, sau `lighthouse.yml`):**
1. `searchanalytics.query` 28 ngày gần nhất (kết thúc D-3), `dataState: final`, dimensions `[query, page]` rồi `[query, country]`, `rowLimit` 25.000, phân trang `startRow` tới khi hết; type `web`. Hạn mức API (1.200 truy vấn/phút/site, 30 triệu/ngày/dự án) – mỗi tuần dùng < 50 lượt.
2. Chỉ lưu tổng hợp, không dữ liệu cá nhân (GSC đã ẩn truy vấn hiếm): `reports/gsc/<yyyy-ww>.json` (gzip, ≤ 1 MB, giữ 26 tuần, cắt bớt tuần cũ) – theo dõi xu hướng.
3. **Cơ hội chủ đề (a):** chuẩn hoá truy vấn (bỏ dấu, gộp biến thể, tách ngôn ngữ theo `country` + chữ viết) → gom cụm theo token chính → cụm nào hiển thị ≥ 50/28 ngày mà trang nhận hiển thị KHÔNG phải bài blog đúng chủ đề (landing, `/words/`, trang khác) hoặc hạng > 30 → ứng viên. Điểm = hiển thị × (1 − CTR) × trọng số ý định (học/thi > tra cứu) × trọng số ngôn ngữ đang thiếu bài. Khớp với `content/blog/briefs.json` (brief chưa viết → đưa lên đầu; chưa có brief → đề xuất brief mới, gắn `cluster`).
4. **Striking distance (b):** cặp (trang, truy vấn) hạng trung bình 8–30, hiển thị ≥ 100 → danh sách làm mới: tiêu đề/mô tả theo đúng truy vấn, thêm mục trả lời, liên kết nội bộ từ trang từ điển + bài cùng cụm. Không đổi slug (slug vĩnh viễn).
5. **Từ điển (c):** truy vấn dạng "X là gì / X meaning / X 뜻…" với X ∉ tập → hàng đợi `DICT_N` lần nhân sau; theo dõi tỷ lệ index từng shard `sitemap-dict-*` qua *Sitemaps API* + mẫu 100 URL/tuần qua *URL Inspection API* (trần 2.000/ngày/thuộc tính) → số đo mở bước §5.
6. **Đầu ra:** `content/blog/gsc-priority.json` (danh sách brief đã xếp + lý do + số liệu) – lịch viết bài hằng tuần đọc file này trước `briefs.json`; issue `gsc-weekly` tóm tắt 10 cơ hội đầu + 10 trang striking distance. **Không tự sửa lịch đăng** – `blog-schedule.mjs --reflow` vẫn do người chạy, giữ luật ≤ 1 bài/ngôn ngữ/ngày và cách cụm ≥ 7 ngày.
7. **Tự đỏ:** 0 dòng trả về, token lỗi, hay thiếu secret → workflow đỏ kèm hướng dẫn (không im lặng xanh).
8. **Test:** `scripts/test/gsc-pull.mjs` với dữ liệu giả (fixture) – kiểm gom cụm, chấm điểm, khớp brief, không ghi khoá ra file.
