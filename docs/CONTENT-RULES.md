# Quy tắc & pipeline nội dung học (từ vựng · bài tập · đề thi)

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
- `notes-more.js` (314 KB gz), `notes-ngsl.js` (291 KB gz) vượt ngân sách file → tách theo chữ cái/lô khi sửa tới.
