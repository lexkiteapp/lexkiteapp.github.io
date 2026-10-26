# SEO-TOOLS – công cụ miễn phí 15 ngôn ngữ (hạng mục 2 lộ trình SEO, 26/10/2026)

> TL;DR: Bài kiểm tra trình độ CEFR A1–C2 thích ứng (~15 phút) + 6 trang cấp độ (đích chia sẻ, og:image theo cấp) + quiz TOEIC Part 5, 15 ngôn ngữ, 100 % tĩnh (0 D1/Worker/AI). Nguồn: scripts/build-tools.mjs. Cổng: scripts/test/tools-pages.mjs.
> Đọc khi: sửa câu hỏi, chuỗi, URL hoặc giao diện công cụ.

## 0. Thiết kế 10 dòng
1. **Mục tiêu đo được:** trang công cụ có giá trị tự nhiên (backlink, trích dẫn) → GSC: hiển thị/nhấp sitemap-tools.xml; nhấp deep-link `data-hit="tool_plan_*"`, `tool_toeic_app`.
2. **Tài nguyên:** 0 đồng. Pages +120 HTML +16 JSON +8 PNG (≈ 0,45 MB). D1/Worker/AI: 0. Khung app: +0 byte (JS công cụ chỉ nạp ở trang công cụ). JS trang đầu ≈ 3 KB; lõi + câu hỏi tải lười khi bấm Bắt đầu.
3. **Điểm hỏng & chặn:** đáp án sai/trùng phương án, engine lệch, thiếu/lẫn ngôn ngữ, hreflang một chiều, deep-link chết, og:image thiếu → `tools-pages.mjs` đỏ (npm test). Lighthouse < ngưỡng → `tools-pages.yml` đỏ.
4. **Chủ file:** phiên seo-free-tools (xem memory seo-top1-roadmap › Ownership). Dữ liệu TOEIC Part 5 + lời giải đã dịch vẫn của mảng TOEIC (`web/js/toeic/`, `web/i18n/explain/`) – generator chỉ ĐỌC.
5. **Công tắc tắt:** `TOOLS_PAGES=0` trong build → trang biến mất ở lần deploy sau, sitemap tự bỏ. Quay lại: revert commit.

## 1. URL (vĩnh viễn – `scripts/lib/tools-links.mjs`)
- Bài test: `/vi/kiem-tra-trinh-do-tieng-anh/`, `/en/english-level-test/`, `/es/test-de-nivel-de-ingles/`, `/pt/teste-de-nivel-de-ingles/`, `/fr/test-de-niveau-anglais/`, `/de/englisch-einstufungstest/`, `/id/tes-level-bahasa-inggris/`, `/tr/ingilizce-seviye-testi/`, `/ru/test-na-uroven-angliyskogo/`, ngôn ngữ chữ khác `/<lang>/english-level-test/`.
- Cấp độ: `<bài test>/a1/ … /c2/` (trang nội dung index được + đích link chia sẻ kết quả, og:image `og-cefr-<cấp>.png`).
- TOEIC Part 5: `/vi/luyen-toeic-part-5/`, `/en/toeic-part-5-practice/`, … (bảng trong tools-links.mjs).

## 2. Bài test CEFR
- Ngân hàng `content/tools/cefr-bank.json`: 78 câu tự soạn (13/cấp: 6 ngữ pháp, 4 từ vựng, 3 đọc), đáp án đúng viết ĐẦU; build xáo theo băm id (A–D đều). Không chép đề có bản quyền.
- Engine `web/js/tools/cefr-engine.js` (IRT 3 tham số rút gọn, EAP, "Tôi không biết" = sai không đoán; dừng 26–32 câu khi SE < 0,4). Mô phỏng: đúng cấp ≈ 77 %, lệch ≤ 1 cấp ≈ 99,7 %.
- Kết quả: cấp + khoảng (θ ± SE), đúng theo kỹ năng, quy đổi IELTS/TOEIC gần đúng (Cambridge/ETS), 4 bước lộ trình deep-link `/app/#/<route>` (PLAN trong build-tools.mjs; test kiểm route có thật), nút chia sẻ (Web Share/ sao chép) → trang cấp độ.
- Lưu bài dở/kết quả ở localStorage (try/catch). Không gửi dữ liệu đi đâu.

## 3. Quiz TOEIC Part 5
- 210 câu Part 5 tự soạn của app (`web/js/toeic/reading*.js`) + lời giải theo ngôn ngữ (`web/i18n/explain/<lang>.json`, vi = gốc) → `dist/data/tools/toeic5-<lang>.json`. Lượt 10 câu, ưu tiên câu chưa gặp.

## 4. SEO
- JSON-LD: bài test = WebApplication + Quiz (educationalAlignment CEFR); cấp độ = WebPage + DefinedTerm; TOEIC = Quiz (3 câu mẫu, acceptedAnswer + giải thích) + WebApplication; mọi trang BreadcrumbList. Không FAQPage (SEO-ARCH §2).
- hreflang 15 + x-default (en) hai chiều; `sitemap-tools.xml` (tự vào sitemap index).
- Liên kết nội bộ: chân trang mọi trang tĩnh (`toolFoot`), hộp công cụ trong bài blog cùng chủ đề (`blogToolBox`, chèn lúc dựng – không sửa .md), trang từ `/<lang>/words/` (`toolLine`). Trang từ điển Worker (`workers/dict/`) – chủ mảng dict thêm khi tiện (link tới `toolPath(lang,'test')`).
- og:image: `node scripts/tools-og.mjs` (resvg, Kit từ web/js/kit.js) → `web/img/tools/*.png` (commit sẵn, ~60 KB/ảnh).

## 5. Chuỗi 15 ngôn ngữ
- `content/tools/i18n/<lang>.json` (en nguồn, vi + 13 ngôn ngữ bản địa hoá tay). Thêm khóa: thêm đủ 15 file – `tools-pages.mjs` kiểm cấu trúc, {biến}, thẻ <i>, chữ Việt lọt, chuỗi chưa dịch.
- Câu hỏi giữ tiếng Anh (bài test tiếng Anh); giao diện, giải thích, mô tả cấp theo ngôn ngữ trang.

## 6. CI
- `npm test` → `scripts/test/tools-pages.mjs`. PR chạm công cụ → `.github/workflows/tools-pages.yml`: build + cổng + Lighthouse điện thoại (median 3 lần; performance ≥ 90, accessibility ≥ 95, best-practices ≥ 90, SEO ≥ 95) trên vi/en/ja/ar.
