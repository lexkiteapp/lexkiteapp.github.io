# Mô hình nghĩa từ v2 (P0.2 / PR P0-E)

> TL;DR: Mỗi từ#loại có nhiều nghĩa, mỗi nghĩa một cấp CEFR, ≥ 2 ví dụ theo độ dài cấp, collocation, mẫu câu, register, họ từ. Nguồn `content/lexicon/senses.json`, cổng `sense-check`. Lô thử 100 từ lõi viết tay (gold) → sau đó CI sinh 3.000 theo đêm.
> Đọc khi: sửa/sinh dữ liệu nghĩa từ v2. Kế hoạch + trạng thái: `docs/CONTENT-WORLD-PLAN.md` §4 P0.2. Kho từ v1: `docs/LEXICON.md`.

## 1. Mục tiêu đo được
- Lõi 3.000 từ#loại (`scripts/lexicon/core.mjs`: mục duy nhất A1–B2 theo thứ tự ưu tiên kho, NGSL tần suất trước; tất định).
- 100 % mục lõi có trong `senses.json`, qua `sense-check` 0 lỗi; lô thử 100 mục (mẫu phân tầng 1/30) do Claude viết tay = mẫu chuẩn cho tầng 1.
- Chuẩn tham chiếu phương pháp (không chép chữ): English Vocabulary Profile (CEFR theo nghĩa), Oxford 3000/5000 (cấp theo từ loại), Oxford/Cambridge Learner's (định nghĩa giản lược, ví dụ đời thường).

## 2. Lược đồ
```json
{ "entries": { "decide#v": { "fam": ["decision (n)", "decisive (adj)"], "senses": [
  { "n": 1, "def": "to choose what to do after thinking", "lvl": "A2", "reg": "neutral",
    "ex": ["We decided to stay home.", "Have you decided yet?"], "col": ["decide quickly"], "pat": ["decide to do sth"], "src": "gold" } ] } },
  "notes": { "word#pos": "nghi ngờ cấp CEFR của kho / việc cần soát" } }
```
`src`: `gold` (Claude viết tay) · `ai:<họ>` (tầng 1, phải có `qa.j` 2 giám khảo theo `CONTENT-QA.md` lớp 3 trước khi vào file).

## 3. Cổng `scripts/content-qa/sense-check.mjs` (npm test, lỗi CỨNG)
Mục có trong kho · 1–6 nghĩa, `n` liên tục · `lvl` hợp lệ, mọi nghĩa ≥ cấp từ, nghĩa dễ nhất = cấp kho (lệch → sửa kho qua `overrides.json`) · `reg` trong danh sách · `def` 3–25 từ, không vòng (không lặp từ đầu mục với từ nội dung) · ≥ 2 ví dụ/nghĩa chứa đúng dạng từ (`scripts/lib/irregular.mjs`), viết hoa + dấu câu, độ dài A1 ≤ 8 · A2 ≤ 12 · B1 ≤ 16 · B2 ≤ 20 · C1 ≤ 25 · C2 ≤ 30 (≥ 4) · không trùng ví dụ toàn file · ≥ 3 collocation/mục chứa dạng từ, ≥ 1 cái minh hoạ trong ví dụ · pattern có chỗ trống (sb/sth/do/doing/that/wh-) · `fam` không chứa chính từ. Test: `scripts/test/sense-check.mjs` (16 loại lỗi).

**Chưa có (lô sau, không bỏ):** tần suất collocation trong corpus mở (cần kho corpus CC BY trên CI – Tatoeba/OEWN) · 2 giám khảo cho mục `ai:*` · dịch theo nghĩa `từ#loại#n` cho 13 gói (`lexicon-i18n.yml`, cờ 2) · hiển thị nhiều nghĩa trong app (sau P0, khi PR mở ≤ 15) · 280 cờ CEFR `content/lexicon/cefr-flags.json`.

## 4. Thang sinh (CONTENT-WORLD-PLAN §3.3)
Tầng 0: danh sách lõi + ứng viên nghĩa từ OEWN (`content/dict/wordnet.json`) · Tầng 1: model miễn phí (ai-pool, lô 25, few-shot = mục gold cùng từ loại/cấp) → cổng · Tầng 2: 2 giám khảo khác họ · Tầng 3: Claude chỉ viết lô gold + trọng tài. $0.
