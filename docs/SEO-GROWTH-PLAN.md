# Kế hoạch tăng trưởng SEO – một nguồn (cập nhật 22/11/2026)

> TL;DR: Vì sao Google gần như chưa mang người dùng tới (số thật GSC + site live 22/11), mục tiêu theo tuần (bấm/ngày, trang index, hạng TB), đòn bẩy xếp theo tác động/công sức, nguồn đo, chủ việc, máy gác. Bản cũ 17/10 + 14/11: docs/archive/SEO-GROWTH-PLAN-1710.md.
> Đọc khi: chọn hoặc làm bất kỳ việc SEO nào (kỹ thuật, nội dung, backlink). Chi tiết kỹ thuật ở doc chuyên đề – link, không chép: SEO-ARCH (trang tĩnh), SEO-DICT-PAGES (trang từ), SEO-PLAN (blog), SEO-AUTHORITY, SEO-TOOLS, BACKLINKS.

## 1. Chẩn đoán (số thật, không đoán)
Nguồn: `reports/seo/gsc-2026-11-17.{md,json}` (sc-domain:lexkite.com, 18/10→14/11) + đo live lexkite.com 22/11 (curl).

| Chỉ số | 28 ngày tới 14/11 | 28 ngày trước đó |
|---|---|---|
| Lượt bấm | 71 (≈ 2,5/ngày; 40 là truy vấn thương hiệu về trang chủ) | 4 |
| Hiển thị | 10.826 | 40 |
| CTR / hạng TB | 0,7 % / 33,8 | 10 % / 34,7 |
| Trang có ≥ 1 hiển thị | 2.881 | 25 |
| URL trong 40 sitemap | ≈ 19.850 (words 16.800 · pages 708 · conversations 375 · blog 563 · tools 120 · authority 105 · …) | – |

**Vì sao gần như không ai tới từ Google – 5 nguyên nhân, xếp theo sức nặng:**
1. **Tên miền còn quá mới với Google.** Hiển thị đi từ 40 → 10.826 chỉ trong một kỳ 28 ngày: Google mới bắt đầu thử site từ giữa tháng 10. Site mới chưa có backlink nên Google index chậm và để hạng thấp. Việc này chỉ tự cải thiện theo thời gian, cộng với tín hiệu uy tín (§3 L6).
2. **Phần lớn trang đang cố ý `noindex`.** Đây là cổng độ dày ≥ 5 khối và ≥ 100 chữ riêng (`scripts/lib/word-depth.mjs`), đặt ra vì AdSense. Ví dụ live: `/en/words/detect`, `/es/…`, `/ja/…` là `noindex,follow`, trong khi `detect` là từ người ta tra nhiều nhất (81 hiển thị, chỉ có ở th/ar/vi/hi). Không hạ ngưỡng. Cách đúng là làm giàu đúng những từ có cầu (SEO-DICT-PAGES §11).
3. **Th/Ar đứng hạng 10–12 nên gần như không có lượt bấm.** TH 1.455 hiển thị ở hạng 11,7 và EG 1.431 hiển thị ở hạng 12,1, cả hai 0 bấm. Hạng 11–12 là đầu trang 2, nơi CTR thực tế ≈ 0. Tiêu đề và mô tả **đã bản địa hoá và khớp truy vấn**. Đo live: `Detect แปลว่า ตรวจจับ, สืบหา คำอ่าน ตัวอย่างประโยค | Lexkite`, `معنى Relevant بالعربية: ذو صلة والنطق`, có đủ DefinedTerm + FAQPage + BreadcrumbList + speakable. Vậy việc phải làm là **đẩy hạng 10 → ≤ 5**, sửa tiêu đề thêm thì không giải quyết được. Người tìm tiếng Thái/Ả Rập đã thấy đúng trang tiếng Thái/Ả Rập, không phải trang tiếng Anh.
4. **Trang tiếng Anh đấu thẳng với Cambridge/Oxford/MW.** EN có 270 trang, 2.531 hiển thị, hạng TB 57. US 1.040 hiển thị ở hạng 57,6, GB 614 ở hạng 67,5. Truy vấn "X meaning" không thắng được bằng thêm chữ. Chỗ thắng là cụm học thuật và luyện thi (IELTS/TOEIC) cùng truy vấn bằng tiếng mẹ đẻ.
5. **Lỗi kỹ thuật làm Google mất tin lastmod.** 1.146 URL ở 6 sitemap tĩnh luôn ghi `lastmod = ngày build` (đo live 22/11; lỗi đã nêu từ audit 12/11 và 15/11 nhưng chưa sửa). Google vì thế có thể bỏ qua lastmod của cả site, kể cả 16k trang words đang có ngày đúng. **Đã sửa ở PR #1806.**

**Đã đúng, không cần sửa (đo live 22/11):** robots.txt cho Googlebot vào cả site; canonical tuyệt đối trỏ về chính trang; hreflang hai chiều + x-default; `<html lang>`/`dir="rtl"` đúng; 404 thật; http/www 301 về https gốc; IndexNow chạy theo push (Bing/Yandex/Naver). Google không dùng IndexNow, Google đọc sitemap. `live-audit.mjs` kiểm những mục này mỗi tuần.
**Số index thật (URL Inspection, `reports/seo/index-2026-11-22.md`, mẫu 343/19.979 URL):** đã index **4 (1,2 %)** · *URL is unknown to Google* **238 (69 %)** · *Crawled – currently not indexed* 66 (19 %) · *Discovered – currently not indexed* 35 (10 %). Không trang nào có canonical Google chọn khác canonical của mình. GSC ghi sitemap được đọc lần cuối 21/11, đã gửi 13.239 URL. Khớp với GSC: riêng `/words/` chỉ 449 / 16.800 URL (≈ 2,7 %) từng có hiển thị → **nút thắt là Google chưa thu thập (crawl).** Google mới phát hiện tới ~1/3 kho, và ~2/3 số trang đã thu thập thì Google chọn chưa index. Nguyên nhân là site mới, uy tín thấp (nguyên nhân 1): Google đặt hạn mức crawl thấp. Vì vậy L6 (uy tín/backlink) và L7 (liên kết nội bộ từ trang đã index tới trang mới) đứng ngay sau L3. CWV: site nhỏ chưa có dữ liệu trường CrUX, chỉ có Lighthouse trong CI (lcp-mobile #1770).

## 2. Mục tiêu theo tuần (đo mỗi thứ Hai, 28 ngày trượt, `reports/seo/`)
| Tuần (thứ Hai) | Bấm/ngày | Trang có hiển thị | Trang index (URL Inspection, ước tính) | Hạng TB | Mốc việc |
|---|---|---|---|---|---|
| 16/11 (gốc) | 2,5 | 2.881 | – | 33,8 | – |
| 22/11 (đo) | 3,2 (89/28 ngày) | – | 1,2 % mẫu (≈ 156 ước tính; 69 % Google chưa biết) | 33,7 | #1805, #1806, #1815 live |
| 30/11 | 4 | 3.600 | ≥ 3 % mẫu, "unknown" ≤ 60 % | 31 | lô làm giàu theo dictQueue |
| 07/12 | 6 | 4.000 | ≥ 5 %, "unknown" ≤ 50 % | 29 | th/ar hạng 8–12 → ≤ 7 (20 trang) |
| 21/12 | 10 | 5.000 | ≥ 10 % | 26 | 2 cụm bài GSC (a) mỗi ngôn ngữ th/ar/vi |
| 18/01 | 25 | 7.000 | ≥ 20 % | 22 | backlink edu/cộng đồng ≥ 15 nơi live |
| 15/03 | 100 | 10.000 | ≥ 50 % URL sitemap | 18 | – |
Lệch ≥ 25 % so với mục tiêu 2 tuần liền thì xem lại đòn bẩy ở §3, không hạ mục tiêu. Máy gác (§4) đỏ khi số **tụt**, không phải khi chậm.

## 3. Đòn bẩy (xếp theo tác động ÷ công sức)
| # | Đòn bẩy | Tác động | Công sức | Trạng thái / PR | Chủ |
|---|---|---|---|---|---|
| L1 | **Gỡ chặn index kỹ thuật:** lastmod thật cho 6 sitemap tĩnh | Cao: tin lastmod cả site | Nhỏ | #1806 | seo-growth |
| L2 | **Đo index thật + máy gác tụt** (URL Inspection, sitemap đã đọc, canonical Google chọn) | Cao: biết chính xác trang nào bị loại và vì sao | Nhỏ | #1805 | seo-growth |
| L3 | **Làm giàu đúng từ có cầu** (`dictQueue` GSC: detect, volume, secure, found, vision, status, criteria, mode…) để mở index ở en/es/ja/de/fr/ko (ngôn ngữ CPM cao) theo SEO-DICT-PAGES §11. Ngưỡng giữ nguyên | Rất cao: 90 % kho đang noindex | Vừa, theo lô 60 từ | hàng đợi `enrich-queue.mjs` | content (Sonnet) + chấm độc lập ≥ 90 |
| L4 | **Đẩy th/ar hạng 8–12 lên ≤ 5:** 29 trang ở mục (b) của báo cáo. Mỗi trang thêm 1 khối trả lời thẳng truy vấn bản địa (`… แปลว่า`, `معنى …`), ví dụ bản ngữ, liên kết nội bộ từ hub chủ đề + 3–5 từ cùng cụm. Không đổi slug | Cao: 2.900 hiển thị đang 0 bấm | Vừa | theo `gsc-priority.json` | content |
| L5 | **Cụm nội dung cho truy vấn chưa có bài** (mục (a): `relevant معنى`, `criteria แปล`, `ielts speaking topics`, `this is because`…). Lượt viết thứ Hai đã đọc `content/blog/plan/gsc-priority.json` trước mọi brief | Vừa | Vừa | chạy hằng tuần | blog writer |
| L6 | **Uy tín / backlink miễn phí hợp lệ:** danh bạ edu, kho học liệu mở, cộng đồng giáo viên, listing cửa hàng (CWS, App Store, Play: link về web), bộ dữ liệu CC BY `/en/research/confused-words/` (Dataset Search), widget nhúng. Không mua, không đổi link, không spam diễn đàn | Rất cao về lâu dài (nguyên nhân 1) | Owner dán (bot không tạo tài khoản) | danh sách điền sẵn: docs/BACKLINKS.md §1 + docs/PR-PLATFORMS.md; ghi `content/pr/placements.json` | owner bấm, coordinator nhắc |
| L7 | **Liên kết nội bộ tới trang index được:** trang chủ 13 ngôn ngữ đã có 10 liên kết sâu (#1533); hub `/<lang>/words/` + "từ cùng chủ đề" (13 link/trang). Còn thiếu: link từ bài blog tới `/words/` cùng cụm (SEO-PLAN), hub chủ đề theo kỳ thi | Vừa | Nhỏ | nối vào L4/L5 | content |
| L8 | **Sitemap phân đoạn:** đã có 40 file (words/blog theo ngôn ngữ, loại trang) nên GSC đo được theo từng nhóm. IndexNow chạy theo push cho Bing/Yandex/Naver | Đã xong | – | – | – |
| L9 | **EN "X meaning"** – không đầu tư thêm (thua từ điển lớn). Chuyển sức sang IELTS/TOEIC + tiếng mẹ đẻ | – | – | quyết định | – |

**Không làm:** hạ ngưỡng độ dày, sinh trang mỏng hàng loạt, dịch máy, mua link, nhồi anchor, cloaking. Quy tắc trong docs/BACKLINKS.md vẫn giữ.

## 4. Đo & máy gác
- **Thứ Hai 00:00Z `seo-gsc.yml`:** `scripts/seo/gsc.mjs` ghi `reports/seo/gsc-<ngày>.md` gồm (a) truy vấn chưa có bài, (b) hạng 8–30 CTR thấp, (c) ăn thịt nhau, (d) tụt, theo nhóm CPM. Sau đó `scripts/seo/index-coverage.mjs` ghi `reports/seo/index-<ngày>.md` gồm ước tính trang index theo nhóm sitemap, trạng thái phủ và sitemap Google đã đọc. Cuối cùng là `live-audit.mjs` (canonical/hreflang/noindex/404).
- **Máy gác (đỏ, ci-triage mở issue)** khi: index ước tính, bấm 28 ngày hoặc số trang có hiển thị tụt ≥ 25 % so với tuần trước; hoặc báo cáo GSC cũ > 9 ngày. Riêng lịch không chạy thì `cron-watch` canh (ngưỡng lịch tuần 7 ngày + 6 giờ).
- Ghi chú 22/11: báo cáo "dừng từ 17/11" là do lịch hằng tuần. Lượt 16/11 chạy theo lịch, 17/11 là 2 lượt chạy tay, lượt kế 23/11. Workflow active, không lỗi.
- **Báo cáo cho điều phối:** mỗi thứ Hai so cột §2 (trước → sau) kèm PR đã live.

## 5. Chủ việc
- **seo-growth (phiên này):** L1, L2, máy gác, cập nhật §2 mỗi tuần.
- **content (Sonnet, chấm độc lập):** L3, L4, L7 theo lô và theo `gsc-priority.json`. **Blog writer:** L5.
- **Owner:** L6 (dán hồ sơ, bấm gửi; em soạn sẵn).
- File code: `scripts/seo/*`, `scripts/build-sitemap-index.mjs` thuộc seo-growth. Trang từ (`scripts/lib/seo-words.mjs`, `content/dict/**`) thuộc mảng từ điển.
