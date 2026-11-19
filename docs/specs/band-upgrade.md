# Series "Band 5→7→9" – spec 1 trang, 20/11/2026
> TL;DR: biến thể của `T_level` (đường 3 bước): MỘT ý nâng ba bậc IELTS, mỗi bậc một thẻ + một lý do ≤ 6 từ gắn tiêu chí chấm. Dữ liệu tay một lần (`bands.json`), 0 credit, 0 token AI mỗi tập.
> Đọc khi: thêm chủ đề band, đổi lý do / bảng L1, sửa mẫu `band`.

**Không có template mới:** `build.py` `T_band` dùng lại đường tiến độ 3 bước, `Card`, `chip`, `runs_hl` của `T_level` / `T_rule`; `gen.py` thêm `band()` + `plan_bands`. Bố cục `corner`, cổng vùng nền tảng giống `rule` (`qc.py` platform_zones, ≤ 6 hàng, không chạm 14 % lề phải).

## Dữ liệu (`content/video/teach2d/bands.json`)
- `topics` (14, ≥ 12): `id`, `skill` (writing → CTA `#/write`, speaking → `#/speaking`), `steps` band 5 / 7 / 9. Câu mẫu tự viết theo mô tả band IELTS công khai, ≤ 14 từ, ba câu khác nhau; mỗi bậc 7 / 9 có `mark` (cụm được nâng, tô màu, phải nằm trong câu) và `why`.
- `reasons` (6): `precise`, `collocation`, `nuance` → Lexical Resource; `complex` → Grammatical Range; `link` → Coherence & Cohesion; `balance` → Task Response. `en` ≤ 6 từ là câu giáo viên đọc; `criterion` hiện trên thẻ.
- `langs`: hook + mẹo mỗi lý do cho 14 ngôn ngữ + en (tầng i18n-fixed, `docs/I18N-PIPELINE.md`; de = Sie, fr = vous, es = tú). Cổng `scripts/video/teach2d/band-l1-qa.mjs` (teach-video, tĩnh): đủ ngôn ngữ × lý do, luật `i18n-rules`, "Band 5 → 7 → 9" còn nguyên, độ dài, không còn là tiếng Anh. Lượt review bản địa độc lập vẫn chờ (như `rule-l1.json`); nối hook bản địa vào bản dựng là bước sau.

## Tập (`gen.py --band-eps N`)
Một tập mỗi chủ đề: hook "Band five to nine!" → câu band 5 → câu band 7 + lý do → câu band 9 + lý do → CTA. Cổng máy như `rule`: data (câu == `bands.json`, mark trong câu, lý do có thật), level (khung nói ≤ B1 NGSL; câu band 7 / 9 là bài học nên miễn), hook, dup (mỗi chủ đề một lần), **thời lượng đã hiệu chuẩn** `18 ≤ short_secs + BAND_BIAS ≤ 27`. Câu quá dài thì rút câu, không bỏ chủ đề. Test: `scripts/test/teach2d-band.py`.

## Duyệt
`approved.json` `band` = draft tới khi 3 tập thử có short + wide QC ≥ 90 (điều phối lật).
