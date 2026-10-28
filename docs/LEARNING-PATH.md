# Lộ trình học (bản đồ chặng ux1) – tâm lý người học → luật cụ thể

> TL;DR: Bản đồ #/home (cờ `ux1`) xếp chặng theo **mục tiêu thi + trình độ**: CEFR A1→C1, mỗi chặng = chủ đề + câu "Bạn sẽ…", 6 nút trộn (từ mới → luyện → truyện/radio → ôn → kiểm tra kỹ năng thi). Nút BẮT ĐẦU tự chọn nút vừa sức. Mã: `web/js/ux1.js` (`Ux1.units`, `Ux1.next`), `LessonEngine.unitPlan`. Tinh chỉnh sâu: giai đoạn 3.

INDEX: §1 Tâm lý → luật · §2 Cấu trúc lộ trình · §3 Đa dạng & không cạn nội dung · §4 Đã làm ở giai đoạn 1 · §5 Để giai đoạn 3

## 1. Tâm lý người học → luật cụ thể
| Nguyên lý | Luật trong app |
|---|---|
| Tự quyết (SDT – autonomy) | Người học tự chọn mục tiêu 1 chạm (IELTS / TOEIC / TOEFL / Giao tiếp + điểm). Thứ tự chặng theo mục tiêu đó. Đổi lúc nào cũng được, không mất dữ liệu. |
| Năng lực (SDT – competence) | Đích tỉ lệ đúng **80–85 %**. Bài trước < 60 % → nút kế tiếp nhẹ hơn (Ôn lỗi thay cho Nói/Radio). Bài trước ≥ 95 % và không còn thẻ đến hạn → bỏ nút Ôn, học tiếp. |
| Gắn kết (SDT – relatedness) | Giáo viên Ama/Carlos đứng cạnh nút hiện tại và dẫn bài; Giải đấu tuần là 1 trong 5 tab. |
| Dòng chảy (Flow) | Độ khó theo trình độ ước tính (bài kiểm tra trình độ → mục tiêu → A2). Không chán: không cùng dạng bài 3 lần liền. Không kẹt: luôn có gợi ý "Vì sao?". |
| Lặp lại ngắt quãng + xen kẽ | FSRS chọn từ đến hạn trước (`pickWords`); mỗi chặng có ít nhất 1 nút Ôn; các dạng bài xen kẽ trong 1 bài. |
| Đầu vào i+1 (Krashen) | Từ chủ đề chỉ lấy cấp ≤ trình độ + 1 bậc CEFR. |
| Thưởng thay đổi nhưng công bằng | XP cố định theo câu đúng; COMBO, rương, pháo giấy thay đổi. Không bao giờ trừ điểm. |
| Chống nản | Không 3 câu khó liền nhau. Sai 2 lần → câu dễ hơn hoặc gợi ý. Không tim, không phạt. Bài 3–5 phút. Kết bài rõ ràng: "Bạn đã học: …" (các từ của bài). |

## 2. Cấu trúc lộ trình
- **Giai đoạn CEFR A1→C1.** Chặng khởi động "Tiếng Anh hằng ngày" (A1–A2, bộ từ khởi đầu), rồi 10 chặng chủ đề của kho (Giáo dục, Môi trường, Công nghệ, Sức khỏe, Công việc, Xã hội, Truyền thông, Đô thị, Du lịch, Tội phạm; từ B1–C1).
- **Thứ tự theo mục tiêu**:
  - IELTS / TOEFL: học thuật trước (Giáo dục, Môi trường, Công nghệ…).
  - TOEIC: công sở trước (Công việc, Du lịch, Công nghệ…).
  - Giao tiếp: đời sống trước (Du lịch, Sức khỏe, Công việc…).
- **Mỗi chặng**: chủ đề + mục tiêu "Bạn sẽ…" ở băng tiêu đề, màu riêng theo bảng màu Kit.
- **6 nút**: Bài học (từ mới) → Nghe → Nói → Truyện/Radio → Ôn lỗi → **Kiểm tra kỹ năng thi**. Nút cuối mở module thi có sẵn theo mục tiêu, xoay vòng theo chặng:
  - IELTS: Listening / Reading / Speaking / Writing;
  - TOEIC: Listening / Reading;
  - TOEFL: 4 phần;
  - Giao tiếp: ngữ pháp / nghe.
- **Không ai bắt đầu quá dễ.** Đã làm bài kiểm tra trình độ ≥ B1 → bỏ chặng khởi động. Chưa làm → băng tiêu đề có lối "Kiểm tra trình độ".
- **Kiến thức đã có**: băng tiêu đề hiện số từ của chủ đề đã có trong sổ (x/y).

## 3. Đa dạng & không cạn nội dung
- Dạng bài xoay vòng (`LessonEngine.build` + `adapt`): không cùng dạng 3 lần liền.
- Nguồn: thẻ FSRS của người học, từ chủ đề (`IELTS_DATA.TOPICS`), gold bank (Vì sao?), truyện/radio, và module thi có sẵn (Listening, Reading, TOEIC, TOEFL, Speaking).
- Bài sinh ngay trên máy từ các kho đó, nên không bao giờ hết bài. Hết 10 chủ đề thì quay vòng, dùng từ mới đến hạn.
- Độ khó gắn theo từng mục (cấp CEFR của từ). Từ được khớp với trình độ ước tính (i+1).

## 4. Đã làm ở giai đoạn 1 (cờ `ux1`, mặc định TẮT)
- `Ux1.units(goal, level)`: thứ tự chặng theo mục tiêu + trình độ, cùng câu "Bạn sẽ…".
- `LessonEngine.unitPlan`: 6 nút theo §2. Có luật thích nghi cho nút hiện tại: dễ hơn sau bài < 60 %, bỏ Ôn khi đã thuộc hết.
- Bộ khởi đầu của bài = từ chủ đề vừa sức (khi sổ chưa đủ 4 từ).
- Màn kết bài ghi `lk.lsn.acc` (độ chính xác) để chọn nút sau.

## 5. Để giai đoạn 3
- Ước lượng trình độ liên tục (IRT theo từng câu) thay cho bài kiểm tra trình độ.
- Chọn dạng bài theo xác suất đúng 80–85 % cho từng dạng.
- Gắn câu thi thật vào nút, kèm dự đoán điểm.
- Thêm video vào nút.
- Tách nghĩa từ chủ đề theo 13 ngôn ngữ (hiện dùng `App.meanOf`).
