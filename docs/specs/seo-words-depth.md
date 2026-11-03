# Spec: độ dày trang từ /<lang>/words/<slug> (3/11/2026)

> TL;DR: Trang /words/ (≈ 80 % lượt hiển thị site, hạng TB ≈ 34, CTR 0,4 %, `/en/words/detect` ≈ 214 chữ) được làm dày bằng dữ liệu THẬT đã có trong repo – nhiều nghĩa theo từ loại, 3–5 ví dụ, collocation + cấu trúc, đồng/trái nghĩa có link, họ từ, từ dễ nhầm, lỗi hay gặp, FAQ, blog/công cụ liên quan – cho cả 15 ngôn ngữ. Khối nào thiếu dữ liệu thì không hiện. Cổng độ dày: trang dưới ngưỡng → `noindex,follow` (không xoá).
> Đọc khi: sửa `scripts/build-seo-pages.mjs`, `scripts/lib/word-depth.mjs`, cổng `scripts/test/seo-pages.mjs`.

## 1. Mục tiêu đo được
- GSC 28 ngày sau deploy, thư mục `/*/words/`: vị trí TB 34 → ≤ 20, CTR 0,4 % → ≥ 1 %, số trang có hiển thị không giảm. Đo bằng vòng GSC có sẵn (`reports/seo/gsc-*.json`).
- Trang được index: ≥ `DEPTH_MIN` (5 khối nội dung riêng, 30 chữ nội dung riêng – không tính khung, menu, CTA, tiêu đề, WordNet, FAQ).
- Đo 3/11 (dựng thật, 8.200 trang): chữ trong bài (cả trang) trung vị en 99 → 196, vi 195 → 271, es 99 → 201, ja 60 → 150, ar 89 → 189; khối riêng trung vị en 6 → 7. HTML +≈ 3 KB/trang.

## 2. Nguồn (chỉ đọc – không bịa, không sinh nội dung mới)
| Khối | Nguồn | Ngôn ngữ chữ |
|---|---|---|
| Nghĩa theo từ loại | mục kho từ + `more[]` (từ loại khác, 149 mục) · nghĩa bản địa `web/packs/<lang>.json` (`từ#loại`) | vi/en soạn tay; 13 ngôn ngữ = gói nghĩa (cờ 0 → nhãn "Bản dịch máy", trang noindex như cũ) |
| Phát âm UK/US + nút nghe | `ipa`, `ipaUS` (bù `wordnet.json › us`), `audioKey` (file Kokoro/ASR đã có) | – |
| Ví dụ 3–5 | `ex`, `ex2`, ví dụ "Cách dùng từ" (`web/js/usage`), ví dụ của cụm trong kho, kho câu tự soạn (cùng logic `scripts/dict/build.mjs › enrich`) | en |
| Collocation + cấu trúc | `col` + `usage.col` + cụm nhiều chữ chứa từ + mẫu giới từ/động từ (`usage` p/v) | en (+ nghĩa vi/en) |
| Lỗi hay gặp (mọi ngôn ngữ) + họ từ có từ loại | ghi chú tự soạn `web/js/notes`: cặp "Sai: … → Đúng: …" là câu tiếng Anh (6.307 từ) – trang ≠ vi chỉ lấy cặp câu, không lấy giải thích tiếng Việt; `f` = họ từ "x (n), y (adj)" (6.880 từ) | en |
| Ví dụ thêm | bài mẫu IELTS Writing `web/js/models.js` + câu trả lời mẫu Speaking `web/js/speak/samples.js` (tự soạn), 25–130 ký tự | en |
| Đồng nghĩa / trái nghĩa / họ từ | `syn` + WordNet (`content/dict/wordnet.json`, CC BY 4.0) – chip có link nội bộ nếu từ có trang cùng ngôn ngữ | en |
| Từ dễ nhầm + lỗi hay gặp | `usage` cặp c + `mis` · ghi chú vi `web/js/notes` | vi: chữ vi; ngôn ngữ khác: chữ en |
| Nghĩa khác (WordNet) | `wordnet.json › s` – khối riêng ghi nguồn + link giấy phép | en |
| FAQ | câu hỏi cố định (dịch tay 15 ngôn ngữ), trả lời = đúng chữ đang hiện trên trang | – |
| Bài blog liên quan ≤ 3 | `content/blog/<lang>/*.md` đã đăng (`status: ready`, `publishAt` ≤ lúc dựng) – cùng luật khớp như trang từ điển | ngôn ngữ trang |
| Luyện tiếp (công cụ) | `scripts/lib/tools-links.mjs`: trang cấp CEFR + bài test trình độ + TOEIC | ngôn ngữ trang |

Một nguồn logic làm giàu: `enrich()` export từ `scripts/dict/build.mjs` (trang từ điển `/vi/tu-dien/` dùng chung, đầu ra JSON không đổi byte).
Một nguồn chọn trang + dựng nội dung: `scripts/lib/seo-words.mjs` (`setOf`, `idxW`, `bodyOf`, `indexable`) – `build-seo-pages.mjs` sinh trang từ đây (đầu ra trùng byte trước khi tách), `build-blog.mjs` (chạy TRƯỚC) dùng `indexable()` = đúng điều kiện robots của builder.

**Liên kết vào (blog → /words/, 13 ngôn ngữ es/pt/fr/de/id/th/zh/ja/ko/hi/ar/ru/tr):** `scripts/lib/blog-words.mjs › blogWordsBox` – từ nhấn `*từ*` trong bài (cả dạng biến tố -s/-es/-ed/-ing) + thẻ/từ khoá một chữ → ≤ 8 link `/<lang>/words/<slug>` CHỈ tới trang `indexable` (không mỏng, đạt `DEPTH_MIN`); nhãn hộp dịch tay 13 ngôn ngữ; `SEO_PAGES=0` → không hộp. vi/en đã có hộp sang trang từ điển (`scripts/dict/links.mjs › blogDictBox`, SEO-DICT-PAGES §3b). Đo 3/11: bài đã đăng – 17/194 bài có hộp (10/13 ngôn ngữ; de/hi/id chưa có bài trùng), tính cả bài hẹn giờ – 4–11 bài/ngôn ngữ, ≈ 100 link – giới hạn bởi giao giữa từ nhấn trong bài và 400 trang /words/ mỗi ngôn ngữ (`SEO_N_OTHER`).

## 3. Trình bày & tốc độ
- HTML tĩnh, 0 JS mới (FAQ = `<details>`), CSS thêm < 1 KB trong `<style>` sẵn có. Ảnh minh hoạ giữ `loading="lazy"` + `width/height` → CLS 0.
- Chữ tiếng Anh bọc `lang="en" dir="ltr"` (RTL ar đúng hướng). Mọi nhãn mới ở `S[lang]` (`scripts/lib/seo-pages-i18n.mjs`) viết tay đủ 15 ngôn ngữ – cổng thiếu khóa có sẵn bắt.
- JSON-LD: `DefinedTerm` (+ `alternateName` khi có nghĩa theo từ loại khác) + `BreadcrumbList`; `FAQPage` CHỈ khi khối FAQ có ≥ 2 câu và chữ = chữ hiển thị (cổng kiểm). Google không hiện rich result FAQ cho site thường – giữ vì hợp lệ, không cược thứ hạng (như SEO-DICT-PAGES §4).

## 4. Cổng độ dày (một nguồn: `scripts/lib/word-depth.mjs › measure(html)`)
- Khối nội dung = `<section data-d="…">`; chữ = chữ trong các khối đó trừ `data-d="wn"` (WordNet) và `data-d="faq"` (lặp lại). Đếm chữ: token chữ cái; chữ CJK/Thái tính 1 chữ / 2 ký tự.
- Builder: trang mỏng cũ (`thin()`) HOẶC dưới `DEPTH_MIN` → `noindex,follow`, rời sitemap/hreflang, vẫn sinh + vẫn có link (không xoá trang).
- `scripts/test/seo-pages.mjs` (npm test, trên dist): mọi trang `/<lang>/words/<slug>` index được phải đạt `DEPTH_MIN`; FAQPage khớp chữ `<details>`; giữ nguyên các cổng cũ (canonical, tiêu đề/mô tả không trùng, hreflang hai chiều, không mồ côi).
- Ngưỡng chỉ được TĂNG. Chốt 5/30 theo số đo thật: sau làm giàu, en trung vị 7 khối/51 chữ riêng, p10 37 chữ; 5/30 chặn 33/8.138 trang đang index (chỉ có nghĩa + 1 câu), trong đó 4 trang có hiển thị GSC (30 lượt/28 ngày, 0 lượt bấm). Mức 250 chữ riêng (dự kiến ban đầu) cần dữ liệu chưa có – ghi chú tiếng Anh theo L1 do người soạn (SEO-DICT-PAGES §10); nâng ngưỡng khi kho có thêm.
- `scripts/test/seo-pages.mjs` §8: link trong hộp từ của blog 13 ngôn ngữ phải tới trang `/<lang>/words/` có thật, không noindex; blog 13 ngôn ngữ có ≥ 1 bài có hộp (chống mất tính năng – có hộp hay không tuỳ bài đã đăng).
- Unit test thước đo: `scripts/test/word-depth.mjs` (npm test).
- IndexNow (`.github/workflows/seo-indexnow.yml`) chạy khi đổi bất kỳ nguồn nào ở §2 (gồm `web/js/usage/**`, WordNet, `models.js`, `speak/samples.js`, `word-depth.mjs`, `scripts/dict/build.mjs`, `scripts/lib/seo-words.mjs`).

## 5. Không làm / ranh giới
- Không đụng `content/dict/stage.json` và thứ tự mở index trang từ điển (từ đã mở ở `/tu-dien/` vẫn noindex ở `/words/`).
- Giữ lời gọi `LM.date/LM.hash` của PR #517 (rebase sau khi #517 gộp).
- Không chép Oxford/Cambridge/Wiktionary; không dịch máy hàng loạt chữ mới; không thêm câu do AI viết.

## 6. Kiểm chứng
npm test trên CI (seo-pages + dict-pages + i18n) · ảnh trước/sau `/en/words/detect`, `/vi/words/detect` ở 390/1280 px qua `visual-qa.yml` (input `seo_words`) · số liệu trước/sau (chữ/khối trung vị, số trang index) ghi vào PR.
