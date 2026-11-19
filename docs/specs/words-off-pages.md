# Trang từ 13 ngôn ngữ ra khỏi Pages → R2 (để nâng 650 → 1.000) – spec-lite 05/11/2026

> TL;DR: Giữ URL `/<lang>/words/<slug>` trên lexkite.com, nhưng file của 13 ngôn ngữ (ngoài en, vi) nằm ở R2 `lexkite-words`, Pages Function đọc ra. Dist giảm ≈ 6.450 file, đủ chỗ nâng de/fr/ja/ko/ar lên 1.000 và 8 ngôn ngữ khác lên 1.000 sau khi GSC đạt (SEO-ARCH §5).
> Đọc khi: làm bước chuyển trang từ (SEO-ARCH § Ngân sách file).

## 0. Cập nhật 14/11/2026 – xin coordinator duyệt trước khi code
**Vì sao bây giờ:** lô làm giàu 1–4 (SEO-DICT-PAGES §11) đang đưa trang /words/ qua ngưỡng độ dày (sitemap-words, đo 14/11 trước lô 4: en 314, de 162, fr 162, ja 176, ko 175). Phần trang mỏng còn lại chỉ tăng index được nếu có thêm từ (650 → 1.000 cho de/fr/ja/ko/ar = +1.750 file) và nội dung riêng. Cả hai đều cần chỗ trong ngân sách 20k file/deploy.
**Chọn phương án (so 3 đường):**
| Đường | Chi phí | Rủi ro | Kết luận |
|---|---|---|---|
| A. Giữ trong Pages, hạ file khác (blog) | 0 | blog tăng ≈100 file/ngày → hết chỗ trong vài tuần | Không bền |
| B. **R2 + Pages Function (spec này, §1–§3)** | 0 đồng (R2 Free; ≪ 5 % trần 100k Functions/ngày) | thêm 1 hop; cầu dao `WORDS_R2=0` | **Chọn** |
| C. Tên miền con / repo ngoài | 0 | mất uy tín tên miền, URL đổi | Loại |
**Việc đo lại trước PR 1 (CI, không chạy trên Mac):** (1) số file `dist` hiện tại và tốc độ tăng/ngày; (2) lượt Functions/ngày hiện có (`free-tier`); (3) kích thước TB một trang words (để chốt ≈ 50 KB × số trang).
**Thứ tự & công tắc:** giữ §2 (3 PR). Thêm điều kiện dừng: sau PR 2 (ko) nếu live-audit hoặc crawl GSC xấu hơn trong 3 ngày → `SEO_WORDS_R2=0` + revert. Không đổi URL, không noindex mới, DEPTH_MIN giữ nguyên.
**Xin duyệt:** (a) đi theo B; (b) PR 2 bật cho `ko` trước; (c) chạm `pages-deploy.yml` (điều phối CI ký trước theo ci-policy).

## 1. Thiết kế 10 dòng
1. **Mục tiêu đo được:** `dist` ≤ 12.000 file sau chuyển (đo 4/11: 13.696); SEO_N_PRIORITY 1.000; 0 URL đổi; seo-pages + live-audit xanh.
2. **Không đổi URL** (subdomain sẽ mất uy tín domain): `web/_routes.json` thêm `"/<lang>/words/*"` cho 13 ngôn ngữ; `functions/[lang]/words/[[path]].js` → `env.WORDS.get('<lang>/words/<slug>.html')`; không có → `context.next()` (Pages tĩnh/404 như cũ). en, vi giữ trên Pages (lưu lượng lớn nhất, không phụ thuộc Function).
3. **Tài nguyên:** R2 ≈ 8.200 × 50 KB ≈ 0,4 GB / 10 GB; ghi Class A chỉ khi băm đổi (sổ `_words/manifest.json`, như `scripts/cdn/mirror.mjs`); đọc Class B ≪ 10 triệu/tháng. Functions: +1 lượt/lượt xem trang từ 13 ngôn ngữ (ước < 5.000/ngày, ≈ 5 % trần 100k chung) – `free-tier` đo mỗi giờ.
4. **Header:** `content-type text/html; charset=utf-8`, `cache-control: public, max-age=0, s-maxage=3600, stale-while-revalidate=86400`, Cache API theo băm build → lượt lặp không đọc R2.
5. **Dựng:** `build-seo-pages.mjs --out` đã tách; `SEO_WORDS_R2=1` ghi 13 ngôn ngữ vào `dist-words/` thay vì `dist/`. Sitemap, hreflang, seo-urls.txt (IndexNow) vẫn sinh như cũ trong `dist/`.
6. **Đẩy:** `pages-deploy.yml` (Direct Upload) đồng bộ `dist-words/` lên R2 TRƯỚC `wrangler pages deploy` (creds `scripts/cdn/creds.mjs`); đường deploy hook (máy dựng Cloudflare, không có khoá R2) bỏ bước đồng bộ – Function vẫn đọc bản R2 lần trước, nên phải để build hook dựng cùng `dist-words/` nhưng không xoá đối tượng R2.
7. **Cổng:** `seo-pages.mjs` quét `dist` + `dist-words` (canonical, hreflang hai chiều, độ dày, mồ côi); test Function (thiếu đối tượng → next, ngôn ngữ lạ → next, header đúng); live-audit lấy mẫu 3 URL/ngôn ngữ R2.
8. **Điểm hỏng & chặn:** hết trần Functions trong ngày → trang từ 13 ngôn ngữ lỗi (en/vi, blog vẫn sống) – cầu dao: biến `WORDS_R2=0` → Function `next()`, và bản tĩnh dự phòng không có nên phải đổi `_routes.json` + build lại; R2 thiếu đối tượng sau deploy → live-audit đỏ → ci-triage.
9. **Công tắc tắt / quay lại:** `SEO_WORDS_R2=0` → build ghi lại vào `dist/` như cũ (cần N ≤ 650 cho vừa ngân sách file); revert PR.
10. **Ai giữ:** mảng SEO (generator, Function, cổng); `pages-deploy.yml` sửa cùng điều phối CI (ci-policy).

## 2. Thứ tự PR
1. Function + test + `_routes.json` (chưa bật: đối tượng chưa có → `next()`, không đổi gì live).
2. `dist-words/` + đồng bộ R2 trong pages-deploy + seo-pages quét 2 thư mục; bật cho 1 ngôn ngữ (ko) → đo 3 ngày live-audit + GSC crawl.
3. Bật 13 ngôn ngữ; nâng `SEO_N_PRIORITY` 650 → 1.000 (DEPTH_MIN giữ nguyên – trang mỏng vẫn noindex).

## 4. Trạng thái triển khai (15/11/2026)
- PR 1 (#1322) đã merge: Function `functions/[lang]/words/[[path]].js` (fail-open), `_routes.json`, test `words-r2-fn`; đo CI 15/11: dist 16.483 file (còn 3.517), words 9.465 file, 13 ngôn ngữ ≈ 6.450 trang × 52 KB = 347 MB, blog ≈ 47 bài nguồn/ngày.
- PR 2: bucket `lexkite-words` + binding `WORDS` (wrangler.toml); `content/seo/words-r2.json` (ngôn ngữ bật = `ko`) khớp `_routes.json`; `build-seo-pages` ghi các ngôn ngữ đó ra `dist-words/`; `scripts/seo/words-r2-sync.mjs` đồng bộ theo sổ băm; `words-r2-sync.yml` chạy độc lập (deploy hook không có khoá R2) + bước đồng bộ trong `pages-deploy.yml` (chế độ direct); `seo-pages` quét `dist` + `dist-words`.
- **Thứ tự bật ngôn ngữ mới (bắt buộc):** thêm vào `words-r2.json` + `_routes.json` → dispatch `words-r2-sync.yml` từ nhánh PR (R2 đầy) → mới merge. Merge trước = 404 tới khi đồng bộ xong.
- Cầu dao: `SEO_WORDS_R2=0` (build ghi lại vào `dist/`; cần N ≤ 650) hoặc revert `words-r2.json` + route; Function tắt riêng bằng biến `WORDS_R2=0` trên Pages.
- `free-tier` (intraday) cảnh báo khi Pages Functions > 50 % trần ngày.

## 5. Bật 12 ngôn ngữ còn lại (16/11/2026)
Đo CI 16/11 (`words-r2-measure`): dist 17.981 / 20.000 (còn 2.019), words 10.814 = en 2.500 + vi 2.500 + 12 ngôn ngữ 5.800; blog ≈ +32 file/ngày; lô mở rộng 5–8 mỗi lô +500 file (en/vi). `content/seo/words-r2.json` + `web/_routes.json` thêm 12 ngôn ngữ (es pt fr de id th zh ja hi ar ru tr; ko đã có) → trả ≈ 5.800 file cho Pages, en/vi giữ ở dist (URL, canonical, hreflang, sitemap không đổi). Nhánh `words-r2-all` khớp mẫu `words-r2-**` nên đẩy nhánh = `words-r2-sync` ghi R2 TRƯỚC khi merge (tránh 404). Sau merge: đo lại dist, kiểm 200 + cache header từ R2 và không có đợt 404 trong 1 giờ đầu.
