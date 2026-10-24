# 🛡️ Cổng QA nội dung (bắt buộc – mọi nguồn nội dung học)

Mục tiêu: không mục nội dung nào tới người học nếu chưa qua cùng một cổng, dù do Claude, Antigravity, bot CI (Gemini / Workers AI tài khoản 2) hay người soạn.
Mã: `scripts/content-qa/lib.mjs` (luật thuần) · `scripts/content-qa/gate.mjs` (cổng) · `content/qa/` (sổ nguồn, baseline, hàng duyệt, lô).
Chạy ở: `npm test` + `ci.yml` (mỗi push) · `explain.yml` trước khi commit nội dung sinh · `content-qa.yml` hằng đêm (bản tin xu hướng, `infra/jobs.json` id `content-qa`).

## 1. Sổ nguồn – `content/qa/sources.json`
Mọi thư mục `content/*` và `web/js/*` (trừ vendor, i18n giao diện) phải là một nguồn có `owner` + `checks`, hoặc nằm trong `skip` kèm lý do. Thư mục mới chưa đăng ký → **CI đỏ**. `delegate` = test chuyên sâu sẵn có (content-check, explain-check, i18n-qa…) phải nằm trong `npm test`.

## 2. Bảy lớp kiểm
| # | Lớp | Luật | Kiểu lỗi |
|---|---|---|---|
| 1 | Lược đồ + kho từ | trường bắt buộc, đáp án trong phạm vi, phương án không trùng; từ đầu mục/ví dụ phát âm có trong kho từ (`scripts/lexicon/lib.mjs`) | cũ → baseline |
| 2 | ✗/✓ | câu sai ≠ câu đúng (sửa dấu câu vẫn hợp lệ), không rỗng, câu đúng chứa cụm đích | cũ → baseline |
| 3 | **2 giám khảo độc lập** | `qa[lang].j = { '<họ>:<mô hình>': điểm }` – ≥ 2 HỌ mô hình khác nhau (gemini · llama/Workers AI tk2 · qwen…), mọi điểm ≥ 4, lệch ≤ 1. Không đạt → `content/qa/review-queue.json` (hoặc `content/explain/review.json`), **không xuất** | CỨNG |
| 4 | CEFR | cấp bài hợp lệ; từ trong câu cao hơn cấp bài > 1 bậc (theo CEFR kho từ) → đánh dấu | cũ → baseline |
| 5 | Dịch | giữ `{biến}`, `[đáp án]`, số; không lẫn tiếng Việt; đúng chữ viết bản địa (th/zh/ja/ko/hi/ar/ru ≥ 50% ký tự); không chép nguyên bản gốc; nội dung sinh: dịch ngược `qa.bt ≥ 0.8` | CỨNG (sinh) / baseline (cũ) |
| 6 | Kiểm mẫu lô | mỗi lô `content/qa/batches/<id>.json` `{ id, source, n, checked:[{id, ok, note}], status }`: soát ≥ 5% (≥ 1 mục); sai > 2% → `status: "rejected"` + gỡ cả lô | CỨNG |
| 7 | Báo lỗi tự ẩn | phiếu "Nội dung sai" có `cid` → `content_flags` (1 phiếu/thiết bị/mục); đủ **N = 3** thiết bị (env `CONTENT_HIDE_N`) → `config.content_hidden`; `op:'hidden'` công khai (cache 10'), thẻ lời giải lọc; quản trị `op:'unhide'` sau khi sửa | CỨNG (cơ chế phải còn) |

## 3. Baseline – chỉ được giảm
Nội dung soạn tay trước cổng (24/10/2026) có 2.183 lỗi cũ / 49 loại (`content/qa/baseline.json`). Cổng đỏ khi một loại TĂNG. Sửa xong → `node scripts/content-qa/gate.mjs --lower-baseline` (không bao giờ nâng; `--init-baseline` chỉ chạy khi chưa có file).

## 4. Luồng cho nội dung sinh tự động / số lượng lớn
1. Soạn qua `scripts/lib/ai-pool.mjs` (Gemini kho Lexkite → GrabCast Cloudflare → Workers AI tài khoản 2 → GrabCast Groq; chỉ mô hình đủ chuẩn – docs/API-KEYS.md §8; KHÔNG AI tài khoản chính) → kiểm khuôn trong job.
2. Giám khảo A + giám khảo B khác họ (`judgePair`; thiếu họ thứ 2 = bỏ qua trung tính, không xuất) → ghi `qa.j` (mô hình hạng S không được tính); dịch → dịch ngược → `qa.bt`.
3. Không đồng ý → hàng duyệt. Đồng ý → vào nguồn kèm 1 tệp lô.
4. Claude/Antigravity soát ≥ 5% mẫu, ghi `checked` → cổng quyết định xuất hay loại lô.
5. Sau khi lên: báo lỗi của học viên tự ẩn mục; sửa → `unhide`.

## 5. Lệnh
`node scripts/content-qa/gate.mjs [--json]` · `node scripts/test/content-qa.mjs` · `npm run content:gate`.
