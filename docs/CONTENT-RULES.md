# Quy tắc & pipeline nội dung học (từ vựng · bài tập · đề thi)

> Quy trình sản xuất từng lô (hàng đợi, brief, cổng kiểm, nghiệm thu): **`docs/CONTENT-PIPELINE.md`**.

Áp dụng cho mọi người/agent thêm hoặc sửa nội dung (Claude, Antigravity, phiên phụ). Mục tiêu: **chất lượng top 1, nhẹ, mượt mọi thiết bị, 100% miễn phí, không bản quyền.**

## 1. Nguồn & bản quyền
- 100% tự biên soạn. Không chép đề/sách (Cambridge, ETS, British Council, IDP…), không gọi là "đề thật".
- Danh sách từ mở (NGSL/NAWL/TSL/BSL – CC BY-SA) được dùng làm *danh mục từ*; nghĩa, ví dụ, ghi chú phải tự viết.
- Không bịa số liệu/nghiên cứu trong bài đọc; tên người/công ty là hư cấu.

## 2. Chuẩn từng loại
| Loại | Bắt buộc |
|---|---|
| Từ vựng | từ, từ loại, phiên âm IPA, nghĩa tiếng Việt (khóa gốc), định nghĩa tiếng Anh đơn giản, ≥ 1 ví dụ tự nhiên, cấp CEFR; không trùng mục |
| Trắc nghiệm | đúng 1 đáp án, phương án khác nhau & cùng loại ngữ pháp, đáp án trỏ đúng phương án, lời giải tiếng Việt giải thích **vì sao đúng và vì sao các phương án khác sai**, cấp CEFR |
| Tự luận / viết lại câu | đáp án mẫu + các đáp án chấp nhận được, lời giải, tiêu chí chấm |
| Đề thi | đúng cấu trúc phần/thời gian của kỳ thi công khai; đủ kịch bản nghe (để sinh giọng đọc), lời giải từng câu |
| Bài viết/nói tự chấm | tiêu chí chấm tự diễn đạt theo thang điểm công khai (IELTS 0–9, TOEIC, TOEFL), có ví dụ mức điểm |

## 3. Đa ngôn ngữ
- Lời giải & giao diện viết tiếng Việt (khóa gốc) + tiếng Anh; 13 ngôn ngữ còn lại do pipeline (`scripts/gen-explain.mjs`, `scripts/gen-i18n.mjs` trên GitHub Actions) – **không dịch tay hàng loạt**.
- Nhãn ngắn dễ dịch sai → thêm bản dịch tay vào `scripts/i18n-fixed.json`.
- Không để tiếng Việt lọt vào dữ liệu hiển thị cho ngôn ngữ khác (ví dụ, câu hỏi, phương án là tiếng Anh).

## 4. Dung lượng & tốc độ (bắt buộc – `scripts/test/size-budget.mjs`)
- Dữ liệu **tải lười theo trang** (`BUNDLES` trong `web/js/app.js`), không thêm vào khung app (`SHELL` trong `web/sw.js`).
- Mỗi file dữ liệu ≤ **160 KB gzip**; lớn hơn thì tách lô (`data1.js`, `data2.js`…). Khung app ≤ 380 KB gzip, tổng `web/js` ≤ 15 MB.
- Không nhúng ảnh/âm thanh vào JS/JSON: âm thanh qua pipeline `audio.yml` (CDN lexkiteapp.github.io), ảnh qua repo `lexkite-media` (AVIF/WebP nhiều cỡ).
- Không lặp dữ liệu giữa các file; dùng khóa tham chiếu.
- Nâng ngân sách (`scripts/test/budget.json`) chỉ khi có lý do ghi rõ trong commit.

## 5. Cổng kiểm tự động (chặn ship nếu lỗi)
`npm test` gồm: `content-check` (đáp án/phương án/lời giải/lỗi tiếng Anh dễ bắt), `size-budget` (dung lượng + **cảnh báo nội dung chỉ được giảm**), `explain-check` (lời giải đủ 15 ngôn ngữ), `vi-lint`, `i18n-qa`, `i18n-leak`, smoke, crawl. Hằng ngày `health.yml` chạy thêm e2e Chromium thật 15 ngôn ngữ.

## 6. Quy trình một lô
1. Chọn chỗ mỏng nhất: `node scripts/test/content-check.mjs --stats`.
2. Viết lô nhỏ (≤ 30 câu/≤ 100 từ), đúng định dạng file sẵn có; ưu tiên sinh bằng script/khuôn mẫu, kiểm bằng script thay vì đọc tay.
3. `node scripts/test/content-check.mjs --warn` → 0 lỗi, không thêm cảnh báo; `npm test` PASS.
4. Commit riêng lô đó (chỉ `git add` file của mình), push; CI tự dịch lời giải & sinh giọng đọc.
5. Ghi số lượng trước/sau vào báo cáo (BOARD hoặc báo cáo phiên).

## 7. Nợ chất lượng hiện tại (ưu tiên trả dần)
- ~2.800 từ NGSL thiếu ví dụ/phiên âm trong dữ liệu (cảnh báo `thiếu ví dụ`, `thiếu phiên âm`).
- `content/notes-src/notes-more.js` (nguồn, không còn trong web/js; 314 KB gz), `notes-ngsl.js` (291 KB gz) vượt ngân sách file → tách theo chữ cái/lô khi sửa tới.

## 8. Alt & chú thích ảnh blog – cổng "caption truth" (bắt buộc)
Ảnh chụp app dùng chung trong bài blog (`![alt](media:<id> "chú thích")`) chỉ được nói điều **màn hình thật sự có** – sự thật là `desc` trong `content/blog/shots.json`.
- **Alt** = tả đúng màn hình (dịch `desc` sang ngôn ngữ bài, rút gọn được). **Chú thích** = mô tả đúng + cách dùng màn hình đó cho chủ đề bài; không thêm tính năng, chế độ, kết quả.
- **Cấm** (lỗi, chặn build): bấm giờ/đếm ngược (trừ trò Ghép thẻ), "thời gian thực", "không bao giờ quên", "bảo đảm", "không lặp lại lỗi", AI chấm/chữa, tên app khác (ELSA, Duolingo…); ngữ pháp/dạng đề/thi thử trên màn hình từ vựng (`practice-test` chỉ là trắc nghiệm nghĩa "run out of", `review` chỉ là thẻ "pollution"); collocation/phrasal verb trên thư viện; nối âm/trọng âm/ngữ điệu trên thư viện IPA & màn luyện phát âm; viết/lỗi sai trên trang tiến độ; Task 1/biểu đồ trên phòng viết Task 2.
- **Kỳ thi:** màn hình IELTS (`listening`, `reading`, `read-article`, `grammar`, `write`, `speaking`, `mock`, `path`, `letters`, `task1`) dùng trong bài TOEIC/TOEFL/Cambridge/ЕГЭ/YDS/CET… → alt hoặc chú thích **phải ghi "IELTS"**; alt không được gán kỳ thi khác cho màn hình (vd gọi `practice-test` là "đề TOEIC"). Chú thích kiểu đuôi "– <từ khóa bài>" nhắc kỳ thi khác thì phải ghi rõ IELTS.
- **Dữ liệu:** `content/blog/shot-facts.json` – mỗi ảnh có `features`, `notFeatures` (+ `_default` cho mọi ảnh), `altNotFeatures`, `exam`, `anchors`; mỗi khái niệm có từ khóa đủ 15 ngôn ngữ (vi en es pt fr de id th zh ja ko hi ar ru tr). Gặp kiểu bịa mới → **thêm từ khóa vào khái niệm** (hoặc khái niệm mới + gắn vào ảnh) và thêm caption sai nguyên văn vào `scripts/test/blog-captions.mjs`, đừng chỉ sửa tay.
- **Kiểm:** `node scripts/blog-captions.mjs [file.md…] [--warn]` (nhanh); luật chạy sẵn trong `blog-check` (`[caption-truth]`, `[caption-exam]`; cảnh báo khi alt không có thuật ngữ nào của màn hình) và `npm test` (`scripts/test/blog-captions.mjs`: hồi quy + toàn kho 0 lỗi).
- **Ý kiến thứ hai (tay, không trong npm test):** `node scripts/blog-captions.mjs content/blog/<lang>/*.md --ai` – Gemini (khóa xoay vòng của dự án) so alt/caption với `desc`; kết quả phải duyệt tay rồi sửa theo `shots.json`.
- Ghi chú: app thật có đồng hồ trong bài thi thử (`mock.js`) và nút bấm giờ 40 phút trong phòng viết (`write.js`), nhưng ảnh chụp không thể hiện → caption không nói "bấm giờ". Muốn cho phép thì chuyển `timer` sang `features` của ảnh đó trong `shot-facts.json`.
