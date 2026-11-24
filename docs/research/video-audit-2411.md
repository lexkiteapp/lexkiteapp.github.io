# Kiểm thật video LexKite 24/11/2026 (bước 1 pipeline v3)

> TL;DR: 18 bản render CI gần nhất (khuôn teach2d), chấm bằng mắt trên 8 khung/video theo MEDIA-QA-RUBRIC thang C (chỉ phần nhìn được). Điểm TB ≈ 71, cao nhất 82, KHÔNG video nào ≥ 90. 10 lỗi lặp nhiều nhất bên dưới là đầu vào thiết kế engine v3.
> Đọc khi: thiết kế khuôn/QC video, trước khi chạm TeachShort.jsx hay qc.py.

## Phạm vi và giới hạn
- Mẫu: 18 artifact `tv-*` / `motion-drill` mới nhất (11/24, nhánh main + 3 nhánh pilot), 8 khung/video (5 %…97 % thời lượng) ghép 1 ảnh, chấm bởi 3 agent Sonnet + 1 lượt tự chấm. Không chấm âm thanh, kiến thức, nhạc, giọng (nhóm 4, 8 chưa đo).
- KHÔNG phải video đã đăng: danh sách đã đăng cần API `social-auto` có khóa `LEXKITE_DRIVE_CLI_KEY`; còn artifact chỉ phủ khuôn teach2d (news/cine/motion đã hết hạn artifact). Việc nên làm tiếp: lấy id/URL công khai thật hoặc dựng bản mẫu mới cho các khuôn kia.
- Điểm các video: 60–82 (v02 60, v03 62 thấp nhất = scorecard pilot, khung cuối trống).

## 10 lỗi lặp nhiều nhất (xếp theo số video dính)
| # | Lỗi | Dính | Biểu hiện | Hướng v3 |
|---|---|---|---|---|
| 1 | Nhân vật đứng im | 17/17 | một tư thế suốt, chỉ đổi miệng; có chỗ nhỏ, sát mép | cử chỉ theo nhịp câu (beat → pose), vào/ra cảnh, nhấn mạnh bằng tay |
| 2 | CTA yếu | 14/17 | thẻ "Lexkite 100% FREE" rỗng nửa dưới, "Next step →" không nút/QR/URL (chỉ ~4 video có nút+QR) | màn kết chuẩn một mẫu: logo + nút + QR + lexkite.com, luôn đủ ở mọi khổ |
| 3 | Nền trống / khoảng chết | 14/17 | nửa dưới hoặc giữa khung trống, khung cuối chỉ có nhân vật | bố cục lấp khung (thẻ lớn, nhân vật to, cảnh nền có chuyển động), cổng "vùng trống ≤ X %" |
| 4 | Chữ nhỏ / sát vùng an toàn | 14/17 | thẻ giải thích đa ngữ, quiz, nhãn, thanh tiến độ nhỏ; phụ đề và avatar sát đáy | cỡ chữ tối thiểu theo khổ, safe-box 9:16 / 16:9 / 1:1 do cổng số kiểm |
| 5 | Phụ đề thiếu / cắt / mờ | 11/17 | bản wide không có dải phụ đề; câu bị cắt lửng; khung ghost tương phản thấp; nhân vật đè phụ đề | phụ đề bám mốc từ của Kokoro, tương phản ≥ 4,5:1, không bao giờ cắt câu |
| 6 | Hook 2 giây đầu phẳng | 12/17 | chữ nhỏ/lệch trái, cam-hồng trên teal, f0≈f1 đứng yên, chỉ vài bản có câu hỏi bằng tiếng mẹ đẻ | hook ≤ 1,5 s: chữ lớn giữa khung, pop + chuyển động ngay khung đầu, câu hỏi bản ngữ |
| 7 | Nhịp / khung gần giống nhau | 8/17 | f1–f2 gần y hệt, chuyển cảnh ghost lỗi, chữ gạch nhòe | cắt cảnh 2–4 s, hiệu ứng chuyển có chủ đích, riser/ding theo đáp án |
| 8 | Chữ đa ngữ lỗi hiển thị | 4/17 | Ả Rập RTL lẫn Latin, tiếng Nga lệch font (serif), Nhật quá nhỏ | RTL + phông CJK/Cyrillic chuẩn trong khuôn tham số hoá |
| 9 | Chồng lớp | 4/17 | nhân vật đè phụ đề / thẻ | cổng `layout` mở rộng: không chồng bất kỳ hai khối chữ/nhân vật |
| 10 | Chuyển động tổng thể ít | 17/17 | không có zoom-punch, không drift cảnh, thẻ hiện thô | Motion v2 (đã có caption pop, drift) + hue theo cảnh |

Màu teal/tím/cam đúng bộ Kit: không thấy lỗi lệch màu. Nhạc/giọng chưa đo.

## Điểm tốt đáng giữ
- Màu và typography Kit nhất quán; thẻ có hierarchy rõ; v04 (motion-drill) 82 và v05, v09 80 có CTA đầy đủ logo+nút+QR.

## Việc kế tiếp (đã giao điều phối)
Engine v3: kịch bản JSON chuẩn → 5–6 khuôn tham số hoá khoá theo Stitch → sinh hàng loạt CI → cổng số cho mọi video + agent chấm mẫu (đầu mỗi khuôn × ngôn ngữ, sau đó 1/20) → gom 15 khuôn cũ về spec.

## Sau v3 (engine `video/v3-engine`, 3 pilot CI: slang EN `t2s_ace`, l1 vi `t2_l1_vi_a_little`, scorecard `t2sc_001`)
> Chấm bằng mắt 8 khung/video (5 %…97 %) trên artifact CI run 45342244509/45385591136, đối chiếu 10 lỗi của bản kiểm. Kết quả QC: xem docs/VIDEO-V3.md (cổng).
| # | Lỗi | Sau v3 |
|---|---|---|
| 1 Đứng im | Cải thiện một phần: mỗi nhịp đổi nét mặt + gật/lắc đầu, có cử chỉ tay (thumbs-up) ở khoảng lặng; thân vẫn một tư thế phần lớn video (ảnh tay che miệng nên chỉ dùng khi im). Cổng `pose_variety` đo nét mặt/tư thế, chưa đo thân. |
| 2 CTA yếu | Đã sửa: màn kết duy nhất đủ icon + "Practice…" + QR + lexkite.com ở short/wide, mọi khuôn (kể cả scorecard, trước đó trống). Lỗi mới bắt được và sửa: nhãn nút bị cắt ("Practice and find your level"). |
| 3 Nền trống | Cải thiện: hook là thẻ poster lớn, chữ thẻ +25 % ở reel; cổng `layout_fill`. Còn: thẻ giữa video vẫn nhỏ so với khung ở slang/l1, vùng phải-dưới còn trống. |
| 4 Chữ nhỏ | Cải thiện ở reel (+25 %); phụ đề vẫn nhỏ (58 px) và cạnh giáo viên. |
| 5 Phụ đề | Đã sửa: wide có phụ đề đốt vào, bám từ, không đè đầu; cổng `caption_full` + `caption_sync` cả wide. |
| 6 Hook | Hook là thẻ lớn từ khung 0; chưa là chữ giữa khung "pop" theo spec riêng. |
| 7–10 | Không đụng (nhịp cảnh, đa ngữ RTL/CJK, chồng lớp ổn ở 3 pilot; Motion v2 có sẵn). |
Kết quả cổng (CI run 45404319164 slang + scorecard, 45415702359 l1; commit fabe3e7ae0): 6/6 bản (3 pilot × short + wide) score 100, `viral_score` 100, `ypp` pass (giống nhất 0,03–0,20). l1 vi short phải đổi bố cục T_l1 (bong bóng sai/đúng rời khi thẻ mẹo vào, thẻ đầu cao ≥ 45 % vùng) để qua `layout_fill`.
Còn hạn chế nhìn thấy (8 khung l1 short): vùng phải-dưới trống dưới thẻ, thẻ quiz vẫn nhỏ, giáo viên một tư thế thân (chỉ đổi mặt/gật đầu), phụ đề nhỏ cạnh giáo viên. Việc tiếp: thân nhân vật động (cử chỉ tay trong khi nói cần ảnh không che miệng), lấp vùng phải-dưới.
