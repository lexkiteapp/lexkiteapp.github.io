# Spec: Mini-test 10 phút + ôn dạng yếu (qstats)

Trạng thái: ĐÃ DUYỆT (chủ 14/11, kèm bổ sung coordinator). Chủ: exam-bank. Liên quan: `web/js/qtips.js` (`#/qstats`), `web/js/plan.js` (Sổ lỗi sai), `docs/audits/exams-2026-11.md` §4.

## Vấn đề
`#/qstats` chỉ liệt kê tỉ lệ đúng cộng dồn. Người học không thấy xu hướng theo tuần, và "Nên luyện tiếp" chỉ là một đường dẫn, không thành một phiên ôn ngắn có đồng hồ. Cambridge đã vào qstat + Sổ lỗi sai (PR #1281).

## Phạm vi MVP (3 phần nhỏ, đều lazy, một màn: `#/qstats`)
1. **Xu hướng tuần**: `gs.qstat` thêm `qwk[YYYY-Www] = {r,t}` cộng cùng lúc với `save()`; giữ 8 tuần gần nhất. Thẻ mỗi kỹ năng thêm dải 8 cột (tỉ lệ đúng theo tuần), kèm ước tính band theo tuần qua `QE.bandOf` — luôn gắn nhãn "ước tính, không phải điểm thi chính thức".
2. **Thẻ "Dạng yếu nhất → ôn 10 phút"** đầu trang: chọn dạng có t ≥ 3 và tỉ lệ đúng thấp nhất trên mọi kỹ năng.
3. **Mini-test 10 phút**: nút vào bài luyện của dạng yếu đó với `?mini=10`: đồng hồ đếm ngược 10′ (nhẹ, dùng lại đồng hồ phòng thi sẵn có nếu có), hết giờ tự nộp; kết quả đi qua `QT.record` như thường và câu sai vào Sổ lỗi sai (SRS ôn lại qua `#/mistakes` sẵn có, không thêm bộ nhớ lặp mới).

## Không làm (cố ý)
Không bộ SRS riêng, không dịch vụ máy chủ, không điểm band "chính thức". Không đổi dữ liệu bài.

## Ràng buộc đã biết
- Ngân sách `web/js` chỉ còn ~13 KB (size-budget): mã mới ≤ 3 KB, ưu tiên tái dùng `QT`/`QE`; nếu vượt thì đưa phần thẻ xu hướng sang tệp lazy.
- Parity native: vectors `write.json`/`write-pack.json` (`scripts/native/gen.mjs`) + test Android `EssayVectorsTest.kt` / iOS `WriteVectorTests.swift` phụ thuộc đầu ra `#/qstats`; đổi bố cục thẻ thì phải cập nhật vectors và Compose/SwiftUI cùng PR, hoặc giữ phần mới sau cờ chỉ web ở bước 1 và đưa native vào PR riêng.
- i18n: mọi chuỗi mới qua `t()` + `en.json` + `gen-i18n` 13 ngôn ngữ; thay đổi giao diện cần ảnh QC của CI.
- Chia 3 PR: (1) `qwk` + dải tuần, (2) thẻ dạng yếu nhất, (3) `?mini=10` + đồng hồ.

## Xong khi
Làm 1 bài Cambridge/IELTS/TOEIC → thấy cột tuần tăng; thẻ yếu nhất trỏ đúng dạng; mini-test tự nộp ở 10′ và câu sai xuất hiện ở `#/mistakes`; mọi gate xanh, kiểm live.

## Bổ sung (coordinator, chủ đã duyệt 14/11)
1. **Thiết kế khoá ở nguồn**: dải tuần + thẻ dạng yếu dựng trên Stitch design system hiện có (token màu/font, cổng font/colour) TRƯỚC khi code UI; PR kèm ảnh QC sáng/tối + RTL.
2. **Đồng hồ**: mini-test tái dùng đúng đồng hồ phòng thi (#512 nếu đã merge), không viết bản thứ hai.
3. **Native**: PR 1–3 giữ web-only sau cờ; vectors/Compose/SwiftUI vào PR riêng ngay sau, không lệch quá 1 PR. Mã mới ≤3 KB vào `web/js`, phần dư lazy.
