# Nhập PDF / ePub / link / phụ đề → bộ thẻ FSRS riêng – spec-lite (05/11/2026)

> TL;DR: Người học thả 1 tệp hoặc dán 1 link; app đọc trên máy, chọn từ đáng học, AI miễn phí gắn nghĩa + ví dụ có trần/ngày, rồi tạo bộ thẻ riêng vào FSRS. $0, không tải nội dung người dùng lên máy chủ trừ đoạn nhỏ gửi AI. Đợt 3 #5 của [upgrade-2026-11.md](upgrade-2026-11.md); cờ `importdeck` mặc định TẮT tới khi qua cổng.
> Đọc khi: làm `anki.js` (nhập txt/csv/tsv/apkg có sẵn), `watch.js` (phụ đề), `api/ai.js`, hoặc bộ thẻ riêng.

## 1. Mục tiêu và ngoài phạm vi
- Nguồn: **PDF** (có chữ), **ePub**, **link bài viết**, **phụ đề** (.srt/.vtt hoặc YouTube sẵn có trong `watch.js`), dán văn bản.
- Kết quả: 1 bộ thẻ riêng (không lẫn bộ gốc), thẻ vào FSRS như thẻ thường, kèm câu gốc làm ngữ cảnh (không sinh ví dụ mới nếu câu gốc đủ ngắn).
- Ngoài phạm vi: PDF quét ảnh (OCR – để sau, chạy máy khi có), sách có DRM, tải video, đồng bộ nội dung nguồn lên đám mây.

## 2. Luồng (≤4 bước, 360 px, nút ≥44 px)
1. **Chọn nguồn** (1 màn: thả/chọn tệp · dán link · dán chữ). Hiện cỡ tệp, tối đa 20 MB / 200 trang.
2. **Đọc trên máy** → tách câu, đếm từ, lọc: bỏ từ đã có trong thẻ, từ rất phổ biến (top 1000), tên riêng, số. Xếp theo tần suất trong văn bản × độ hiếm. Mặc định chọn sẵn 30 từ; người học bỏ chọn/chọn thêm.
3. **Gắn nghĩa**: từ điển có sẵn trước (0 chi phí); từ thiếu → AI (mục 4). Mỗi từ lấy 1 câu gốc ≤25 từ làm ví dụ.
4. **Tạo bộ** đặt tên (mặc định = tên tệp), xem trước 5 thẻ, lưu. Nút "Hoàn tác" 10 s. Nếu AI hết lượt: vẫn lưu thẻ có nghĩa từ từ điển, đánh dấu "chưa có nghĩa" để điền sau.

## 3. Xử lý trên máy (mặc định)
- **PDF**: pdf.js tải lười (~300 KB gz, chỉ khi chọn PDF), đọc trong Web Worker, trang-theo-trang, dừng được. **ePub**: giải zip bằng `zipOpen` sẵn trong `anki.js`, đọc XHTML. **Link**: trình duyệt không đọc được chéo miền → qua endpoint `/api/readable` (tải trang, rút nội dung chính, giới hạn 1 MB, chặn IP nội bộ/localhost, không lưu). **Phụ đề**: parser SRT/VTT thuần JS.
- Không đưa gì vào khung chính: module mới `web/js/importdeck.js` + thư viện lười; shell ≤377 KB giữ nguyên (size-budget không nâng).
- Máy yếu: xử lý theo mẻ 50 trang, nhường luồng chính (không giật >50 ms), huỷ được.

## 4. AI miễn phí có trần
- Dùng pool miễn phí sẵn có qua `api/ai.js` (Gemini free → Workers AI hạ cấp), tính năng mới `import` trong `_quota.js`: ví dụ khách 0 (cần đăng nhập), free 120 từ/ngày, 20 lời gọi/phút. Số cụ thể ghi vào `infra/resources.json` (test `quota.mjs` buộc khớp).
- Gom 20 từ/lời gọi, chỉ gửi **từ + câu gốc** (không gửi cả tài liệu). Gần trần → hạ cấp Workers AI, hết → thông báo `quota.daily` + đường "ôn thẻ mở thêm lượt" (#10) nếu đã có. Kết quả nhớ theo từ để không hỏi lại.
- Nếu máy có mô hình trên máy thì dùng trước, 0 lời gọi.

## 5. Dữ liệu và riêng tư
- Chỉ lưu thẻ + câu gốc (≤25 từ) + tên nguồn; **không lưu tệp/văn bản gốc**. Bộ thẻ đồng bộ như thẻ khác (D1/Drive). Xoá bộ = xoá thẻ.
- Bản quyền: người dùng tự chịu trách nhiệm nguồn; câu gốc ngắn dùng cho học cá nhân, không có nút chia sẻ công khai bộ nhập (chia sẻ chỉ qua lớp, theo [community.md](community.md)).
- Link: không gửi cookie/tài khoản; chặn miền cấm, không theo chuyển hướng ra IP riêng.

## 6. Cổng "xong"
- Test: parser SRT/VTT/ePub/PDF mẫu (tệp nhỏ trong `scripts/test/fixtures`), lọc từ, trần quota, `/api/readable` chặn SSRF (localhost, 169.254, IPv6 nội bộ, chuyển hướng), 15 ngôn ngữ đủ chuỗi.
- CI: ext-e2e/journey đi hết luồng ở 360 px sáng/tối, tương phản AA, không lỗi console; hiệu năng: PDF 100 trang không chặn luồng chính >50 ms.
- Giao diện vẽ Stitch (Lexkite Kit) 1 khung, port đúng mẫu; không đụng logo.
- PR chia lát: (a) SRT/VTT + dán chữ + tạo bộ, (b) ePub, (c) PDF, (d) link + `/api/readable`, (e) AI gắn nghĩa + quota. Mỗi lát độc lập, cờ tắt cho tới (e).

## 7. Rủi ro
PDF nhiều cột sai thứ tự → hiện xem trước đoạn để người học loại bỏ; tệp lớn → giới hạn trang; AI sai nghĩa → ưu tiên từ điển, nút "Báo sai" ghi vào `mistakes`.
