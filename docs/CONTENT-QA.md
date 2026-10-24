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
| 3 | **2 giám khảo độc lập** | `qa[lang].j = { '<họ>:<mô hình>': điểm }` – ≥ 2 HỌ mô hình khác nhau (gemini · llama/Workers AI tk2 · qwen…) **hoặc** cặp duy nhất gpt-oss-120b + gpt-oss-20b (xem dưới), mọi điểm ≥ 4, lệch ≤ 1. Không đạt → `content/qa/review-queue.json` (hoặc `content/explain/review.json`), **không xuất** | CỨNG |
| 4 | CEFR | cấp bài hợp lệ; từ trong câu cao hơn cấp bài > 1 bậc (theo CEFR kho từ) → đánh dấu | cũ → baseline |
| 5 | Dịch | giữ `{biến}`, `[đáp án]`, số; không lẫn tiếng Việt; đúng chữ viết bản địa (th/zh/ja/ko/hi/ar/ru ≥ 50% ký tự); không chép nguyên bản gốc; nội dung sinh: dịch ngược `qa.bt ≥ 0.8` | CỨNG (sinh) / baseline (cũ) |
| 6 | Kiểm mẫu lô | mỗi lô `content/qa/batches/<id>.json` `{ id, source, n, checked:[{id, ok, note}], status }`: soát ≥ 5% (≥ 1 mục); sai > 2% → `status: "rejected"` + gỡ cả lô | CỨNG |
| 7 | Báo lỗi tự ẩn | phiếu "Nội dung sai" có `cid` → `content_flags` (1 phiếu/thiết bị/mục); đủ **N = 3** thiết bị (env `CONTENT_HIDE_N`) → `config.content_hidden`; `op:'hidden'` công khai (cache 10'), thẻ lời giải lọc; quản trị `op:'unhide'` sau khi sửa | CỨNG (cơ chế phải còn) |

### Đánh đổi lớp 3 (25/10): hai giám khảo cùng họ gpt-oss
Neuron Cloudflare của bể GrabCast (~70 tài khoản × 10k/ngày) để dành cho ẢNH → văn bản CF tắt (`AI_POOL_CF_TEXT`, mặc định tắt), mặc định cả hai giám khảo chạy Groq:
A = `gpt-oss-120b` (lời nhắn chấm gốc), B = `gpt-oss-20b` + lời nhắn KHÁC (`JUDGE_B_SYS`: người soát thứ hai, phải tìm lỗi cụ thể trước khi cho 4–5). `ai-pool` bắt buộc B khác MÔ HÌNH A; `agree()` chỉ tính cặp này là 2 giám khảo (cùng mô hình hoặc cặp cùng họ khác thì không).
- **Mất:** độc lập theo họ – 120b và 20b chung dữ liệu huấn luyện/cách hiểu, dễ cùng sai một kiểu (đồng ý sai). 20b yếu hơn 120b nên B có thể bỏ sót lỗi tinh, hoặc chấm lệch > 1 → nhiều mục vào hàng duyệt hơn.
- **Bù:** lời nhắn B đối nghịch (giảm "đồng ý dễ dãi"); ngưỡng không đổi (≥ 4, lệch ≤ 1); kiểm mẫu lô ≥ 5 % (lớp 6) và báo lỗi tự ẩn (lớp 7) vẫn chạy. Khi Gemini kho Lexkite có khóa sống, `lexai` vẫn có thể làm B (khác họ thật).
- **Theo dõi:** tỉ lệ sai ở lớp 6 của lô chấm bằng cặp gpt-oss; nếu > 2 % → bật lại một giám khảo khác họ (Gemini/Workers AI tk2) cho B.

## 3. Baseline – chỉ được giảm
Nội dung soạn tay trước cổng (24/10/2026) có 2.183 lỗi cũ / 49 loại (`content/qa/baseline.json`). Cổng đỏ khi một loại TĂNG. Sửa xong → `node scripts/content-qa/gate.mjs --lower-baseline` (không bao giờ nâng; `--init-baseline` chỉ chạy khi chưa có file).

## 4. Luồng cho nội dung sinh tự động / số lượng lớn
1. Soạn qua `scripts/lib/ai-pool.mjs` (Gemini kho Lexkite → GrabCast Groq gpt-oss-120b → Workers AI tài khoản 2 → GrabCast Gemini; GrabCast Cloudflare chỉ khi `AI_POOL_CF_TEXT=1`; chỉ mô hình đủ chuẩn – docs/API-KEYS.md §8; KHÔNG AI tài khoản chính) → kiểm khuôn trong job.
2. Giám khảo A + giám khảo B khác họ hoặc cặp gpt-oss 120b/20b với lời nhắn khác (`judgePair`; thiếu giám khảo thứ 2 = bỏ qua trung tính, không xuất) → ghi `qa.j` (mô hình hạng S không được tính); dịch → dịch ngược → `qa.bt`.
3. Không đồng ý → hàng duyệt. Đồng ý → vào nguồn kèm 1 tệp lô.
4. Claude/Antigravity soát ≥ 5% mẫu, ghi `checked` → cổng quyết định xuất hay loại lô.
5. Sau khi lên: báo lỗi của học viên tự ẩn mục; sửa → `unhide`.

## 5. Lệnh
`node scripts/content-qa/gate.mjs [--json]` · `node scripts/test/content-qa.mjs` · `npm run content:gate`.
