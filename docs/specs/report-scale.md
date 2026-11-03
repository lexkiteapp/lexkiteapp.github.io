# Báo lỗi ở quy mô triệu người (spec 1 trang, hạng mục 8–11, 2/11)
> TL;DR: Gom phiếu thành **cụm** (chữ ký ngữ cảnh + embedding), chỉ phiếu đầu cụm gọi LLM, trần neuron riêng cho báo lỗi; Turnstile bắt buộc khi có khóa + hạn mức uid/thiết bị/toàn hệ thống + chế độ bão; repro Playwright trên Actions và tự resolve/mở lại sau khi bản sửa live. $0, không cắt tính năng nào đang có.
> Đọc khi: sửa gom trùng, AI phân loại, chống spam hay workflow repro của báo lỗi. Luồng chung: `docs/REPORTS.md` (cập nhật khi từng mục gộp).

## Mục tiêu đo được
- 1 lỗi thật = 1 phiếu gốc + "n người gặp", kể cả khi `errs=[]` (vd. LX-1001). Đo: bộ mẫu `scripts/test/fixtures/report-clusters.json` (cặp cùng/khác lỗi, 15 ngôn ngữ) – precision ≥ 0,95, recall ≥ 0,85; chỉ được siết.
- Tốn AI ≈ số **cụm mới**/ngày, không theo số phiếu. Báo lỗi không bao giờ đẩy pool Workers AI chung quá cầu dao 80 %.
- 1 triệu người, bão 10k phiếu/phút: endpoint vẫn trả mã < 300 ms p95, D1 không phình (không ảnh, chỉ đếm).

## 8. Cụm lỗi
- **Chữ ký ngữ cảnh** `csig = sha(route chuẩn hóa · area · bước bài/story id/item type · ver major.minor)`; route chuẩn hóa bỏ id động (`#/story/123` → `#/story/:id`). Giữ `sig` console cũ: cụm = cùng `sig` (nếu có) HOẶC cùng `csig` + gần nghĩa.
- **Embedding**: Workers AI `@cf/baai/bge-m3` (đa ngôn ngữ; `bge-small-en` chỉ tiếng Anh nên không đạt 15 ngôn ngữ – giữ `bge-small` làm phương án khi m3 lỗi, chỉ so trong cùng ngôn ngữ). Vector lượng tử int8, lưu cột `emb` của phiếu gốc (≈1 KB). So cosine với phiếu gốc **đang mở ≤ 14 ngày cùng `csig` hoặc cùng area** (≤ 50 ứng viên, có chỉ mục `(csig, at)`), không cần Vectorize. Ngưỡng `report_cluster` trong config (mặc định 0,86 cùng csig / 0,92 khác csig), chỉnh ở admin.
- Phiếu sau: `dup_of` = gốc, `status='dup'`, gốc tăng "n người gặp"; resolve gốc → báo **tất cả** phiếu trong cụm (thư/push/trạng thái theo kênh từng người đã chọn).
- **Ưu tiên** = trọng số mức (P0 8 · P1 4 · P2 2 · P3 1) × log2(1 + số người) × độ mới (nửa đời 3 ngày); `queue` sắp theo điểm này, đề xuất vẫn luôn sau lỗi.

## 9. Tiết kiệm AI
- Chỉ phiếu **đầu cụm** gọi LLM; phiếu trùng chép `ai` của gốc (ghi `by: 'cluster'`), chỉ chạy lại khi phiếu mới có ảnh/lỗi console mà gốc không có (tối đa 1 lần/cụm).
- Trần riêng `report_ai` (mặc định 2.000 neuron/ngày ≈ 20 % pool, `infra/resources.json` + `_quota.js` provider con) đếm cả LLM lẫn embedding; ≥ 80 % trần → luật từ khóa + gom theo `sig`/`csig` (không embedding); thẻ Chất lượng hiện "% hạn mức AI báo lỗi hôm nay" và số phiếu đã rơi về luật.

## 10. Spam quy mô
- **Turnstile invisible**: có `TURNSTILE_SECRET_KEY` → bắt buộc (thiếu token/sai → 403, lỗi mạng siteverify → cho qua nhưng đánh `ts=0` để soi). Thiếu khóa → chạy như cũ + thẻ Chất lượng đỏ "Chưa bật Turnstile". Add-on/app native gửi token từ widget trong trang báo lỗi.
- **Hạn mức** theo uid (đăng nhập) → theo id thiết bị (`lk.dev`) → theo IP băm với hệ số NAT (VN/CN di động: IP chung ⇒ trần IP = 20× trần thiết bị, không chặn cả nhà mạng). Giữ ≤ 5/giờ cho cặp IP+thiết bị.
- **Toàn hệ thống**: bộ đếm/phút trong `config` (KV-less). Vượt `report_storm` (mặc định 300/phút) → **chế độ bão**: vẫn trả mã, chỉ lưu tóm tắt (msg ≤ 500, ctx, errs), bỏ ảnh, không AI/thư; phiếu khớp cụm chỉ +1 đếm. Hết bão → AI chạy bù cho gốc chưa phân loại (cron, theo lô).
- **Low-signal**: msg < 20 ký tự có nghĩa, lặp ký tự, không chữ, hoặc điểm "vô nghĩa" của luật → cờ `low=1`, mục riêng trong admin, không gọi AI, không Issue; vẫn tính vào cụm nếu khớp `sig`.
- **Trang admin "Bão lỗi"**: cụm có số phiếu/giờ ≥ 5× trung bình 7 ngày trong 6 giờ sau một deploy (`CF_PAGES_COMMIT_SHA`/`ver`) → cảnh báo P0 kèm phiên bản trước/sau = tín hiệu rollback (thư P0 + dòng đỏ đầu tab Báo lỗi).

## 11. Tự kiểm / tự sửa trên Actions
- P0/P1 gốc → Issue như nay; thiếu `GH_ISSUES_TOKEN` → thẻ Chất lượng ghi rõ "Không tạo Issue (thiếu khóa)" + phiếu ghi event `issue-skipped`.
- `report-repro.yml`: kích hoạt bởi nhãn `bug-report` trên Issue (không cron); concurrency `repro-<cụm>` (≤ 1 run/cụm), timeout 10 phút, paths không áp dụng. Lấy ctx đã làm sạch qua `report-cli.mjs ctx LX-xxxx` (op CLI mới, HMAC) → Playwright dựng route/bước/ngôn ngữ/viewport/theme → chụp + bắt lỗi console → bình luận ảnh + nhãn `repro-ok` hoặc `needs-info`. Không đăng nhập tài khoản thật.
- PR có "LX-xxxx" live (hạng mục 4 phát `resolve`) → `report-verify` chạy lại đúng kịch bản repro: xanh → resolve + báo cả cụm; đỏ → mở lại (`status=prog`, event `reopen`, bình luận PR). Mọi PR fix phải kèm test hồi quy (ci-policy kiểm PR có "LX-" chạm `scripts/test/`).

## Thứ tự & phụ thuộc
Spec (PR này) → 8 → 9 → 10 → 11, mỗi mục 1 nhánh + 1 PR + test trong `scripts/test/report*.mjs`, CI-only. 8–10 sửa `functions/api/report.js`/`_triage.js` → chỉ bắt đầu sau khi #455/#456/#457 (và PR hạng mục 4–7 chạm file đó) đã gộp; 11 phụ thuộc hạng mục 4 (op `progress`/`resolve` tự động). Migration D1 (cột `csig`, `emb`, `low`, `ts`; chỉ mục) qua `setup()` idempotent + `infra/schema.lock.json`.
