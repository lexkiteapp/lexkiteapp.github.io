# 5 mẫu bài cine MỚI (dùng với MỌI bank cảnh – không cần clip mới)

Bổ sung cho 4 mẫu sẵn có (sai→sửa, A/B, luyện nói, series). Chỉ dùng loại clip của khuôn 15 clip (`docs/CINE-SCENE-STANDARD.md`): **M** toàn cảnh (1) · **OB** qua vai B nói (2–3) · **OA** qua vai A nói (4–5, chỉ khung 0–36) · **CU** Ama cận (6) · **OOP** oops (7) · **TY** cảm ơn (8) · **BR** B phản ứng (9) · **G** cử chỉ B (10) · **I1/I2** cận đạo cụ (11–12) · **IN/OUT** vào/ra (13–14).
Luật chung (qa5): ≤ 40 s, LUFS −16 ± 1, `-nostdin`, tone0 −60 dB ở 0 s, phụ đề ≤ 15 ký tự/giây, chữ trong x[60,940] y[230,1500], không đè mặt (bank có mặt cao → HOOK_Y/BADGE_Y theo bank), tiếng động chỉ khi thấy sự kiện, màn kết im, Badge (CEFR | mục tiêu) từ 0 s. **Hook 2 s đầu**: mẫu sai→sửa giữ thẻ Contrast; 5 mẫu dưới dùng hook câu hỏi riêng → qa5 cần cờ `HOOK_KIND` ∈ {contrast, question, pov} (thêm vào qa5: question/pov = phải có Hook hoặc overlay mới trong ≤ 2,0 s).

## Overlay MỚI cần thêm vào lesson5.py `png()`
| Style | Nội dung `txt` | Spec chính xác (khung 1080×1920) |
|---|---|---|
| **Choice** | `"Q|A text|B text|C text|đáp án"` + `sub` = 0 (chưa lộ) / 1 (lộ) | Thẻ kem (255,247,234,248) bo 30, rộng MAXW, y0 = CHOICE_Y (mặc định 1040; bank mặt cao giữ ≥ 1000). Câu hỏi FONT_EN 48 đậm, tối đa 2 dòng. 3 dòng lựa chọn cao 96, cách 18: chip chữ cái vàng (255,201,74) 72×72 bo 20 + chữ FONT_EN 44. `sub=1`: dòng đúng nền xanh (225,245,232) viền (23,120,70) 5 px + ✓; dòng sai mờ 45 % opacity. Không có dòng dịch (bài nghe) – dịch câu hỏi đặt ở Sub sau khi lộ. |
| **Gap** | như Sub `"EN với ___||NAT"`, `sub` = 0 trống / 1 điền | Giống Sub (cùng neo y), từ cần điền thay bằng hộp gạch chân rộng = độ dài từ thật + 24 px, viền vàng 6 px. `sub=1`: điền từ màu vàng (255,201,74) cùng stroke 7; cấm đổi vị trí các từ khác (đo bbox 2 trạng thái lệch ≤ 2 px). |
| **Ladder** | `"câu 1|câu 2|câu 3"` + `sub` = số bậc đã hiện (1–3) | 3 thẻ xếp dọc y0 = LADDER_Y (mặc định 980), mỗi thẻ cao 132, cách 16; bên trái chip nhãn 150 px chữ "POLITE" (teal 15,61,62), "NEUTRAL" (xám 90,96,110), "CASUAL" (cam 229,80,47) FONT_EN 30 trắng; câu FONT_EN 42 tối, ≤ 2 dòng. Bậc chưa hiện = không vẽ (không mờ). |
| **Strike** | `"câu đúng thứ tự|từ sai|từ đúng|NAT"` + `sub` 0/1/2 | Vị trí như Sub. sub 0: câu nguyên văn có lỗi, chữ trắng thường (KHÔNG gợi ý). sub 1: thêm sticker "Spot the mistake!" (không emoji – font không có) thẻ vàng bo 28, FONT_H 46, y = HOOK_Y. sub 2: từ sai gạch ngang đỏ (229,80,47) 6 px, từ đúng màu xanh (60,200,120) FONT_EN 46 đặt ngay TRÊN từ sai (cách 8 px), dòng dịch hiện. |
| **Pov** | `"POV: …"` | Chip đen bán trong (20,24,32,200) bo 30, FONT_H 44 trắng, góc trên trái y = 240 (thay chỗ Badge – Badge dời xuống y + 76). Hiện suốt bài. |

## T1 – Listen & choose (Nghe & chọn)
Mục tiêu: hiểu thông tin cụ thể (giờ, số, nơi chốn). 22–28 s.
Nhịp: M 0–2 s (Hook câu hỏi + Choice sub 0) → OB B nói câu chứa đáp án, **Sub tắt** (chỉ nghe) → BR 2,5 s Ring "Choose A, B or C" → Choice sub 1 (không tiếng UI – không có sự kiện trong hình) → OB lặp lại câu, Sub bật + Karaoke từ khoá → TY → kết.
QA: đáp án nằm nguyên văn trong câu B nói; 2 phương án sai phải hợp lý (cùng loại thông tin, có trong câu hoặc gần nghĩa); câu B ≥ 2 s; vị trí đáp án đúng xoay vòng A/B/C giữa các bài.
**Ví dụ (khách sạn):** Hook "When does breakfast end?|<dịch>" · Choice "When does breakfast end?|7:00|10:00|11:00|B" · h01 0–2 s → h02 D: "Breakfast is from seven to ten, in the restaurant." (không Sub) → h09 Ring 2,5 s → lộ B → h03 lặp câu, Karaoke "ten" → h08 A: "Thank you!" → kết.

## T2 – Fill the gap (Điền từ)
Mục tiêu: từ khoá/collocation. 20–26 s.
Nhịp: M Hook (câu có ___) → OA/CU A nói câu, **âm cắt im 0,6 s đúng chỗ từ khoá** (Gap sub 0, miệng giữ X trong đoạn im) → Ring 2 s "Say the missing word" → phát lại nguyên câu, Gap sub 1 + Karaoke từ khoá → bản chậm 0,8× trên CU → BR → kết.
QA: chỗ cắt phải rơi đúng biên từ theo cue Rhubarb (± 40 ms), không lộ phụ âm đầu; chỉ 1 chỗ trống; từ chỗ trống là từ nội dung (không phải *a/the*).
**Ví dụ:** Gap "Could I have a ___ checkout, please?||<dịch>" (late) · h01 Hook → h06 A: "Could I have a … checkout, please?" (im 0,6 s ở "late") → h06 Ring 2 s → h06 câu đầy đủ, "late" vàng → h06 chậm 0,8× → h02 D: "Of course. Twelve o'clock is fine." → h08 → kết.

## T3 – 3 ways to say it (3 cách nói)
Mục tiêu: sắc thái lịch sự. 28–34 s.
Nhịp: M Hook "3 ways to ask for…" → CU câu POLITE (Ladder sub 1) → OA (≤ khung 36) câu NEUTRAL (sub 2) → CU câu CASUAL (sub 3) → BR (B mỉm cười = phản ứng xã giao) → Ring 2 s "Which one would you use with a hotel receptionist?" → Recap câu nên dùng → kết.
QA: cả 3 câu đúng ngữ pháp và tự nhiên (casual vẫn là tiếng Anh chuẩn, không tiếng lóng thô); nhãn khớp mức trang trọng thực; câu OA ≤ 1,5 s (giới hạn khẩu hình) – nếu dài hơn thì đặt cả 3 trên CU, nối bằng cắt thẳng (không chớp trắng).
**Ví dụ:** Ladder "Could I possibly have a late checkout?|Can I have a late checkout?|Any chance of a late checkout?" · h01 Hook "3 ways to ask for a late checkout" → h06 POLITE → h04 (0–36) NEUTRAL "Can I have a late checkout?" → h06 CASUAL → h09 → Ring "Which is best at a hotel desk?" → Recap "Could I possibly have a late checkout?|<dịch>" → h02 D: "Of course. Twelve o'clock is fine." → kết.

## T4 – Spot the mistake (Tìm lỗi sai – mồi bình luận)
Mục tiêu: lỗi phổ biến + tương tác bình luận. 18–24 s (ngắn để xem lại).
Nhịp: M 0–2 s Strike sub 1 sticker "Spot the mistake!" (hook) → OA/CU A nói câu SAI, Strike sub 0 (không gợi ý) → OOP (A nhận ra) → BR + Ring 3 s "Comment the mistake" → Strike sub 2 (lộ) → A nói câu đúng trên CU, Karaoke từ sửa → kết (thẻ kết: "Did you get it?").
QA: câu sai chỉ có ĐÚNG 1 lỗi; lỗi là lỗi người học thật (lấy từ cột hook ✗ của bài sai→sửa); TTS câu sai đọc tự nhiên (không nhấn vào lỗi); phần lộ đáp án ở ≥ 60 % thời lượng (giữ người xem tới cuối). Không dùng chữ "wrong" trên khung trước khi lộ.
**Ví dụ:** Strike "Is breakfast included?|include|included|<dịch>" · h01 sticker → h04 (0–36) A: "Is breakfast include?" → h07 → h09 Ring 3 s "Comment the mistake" → lộ include → included → h06 A: "Is breakfast included?" (Karaoke "included") → h02 D: "Yes, it's included in your rate." → kết.

## T5 – POV: you are the customer (Bạn là khách)
Mục tiêu: phản xạ trả lời. 26–34 s. Pov chip suốt bài.
Nhịp: OB B hỏi người xem (Pov "POV: you're checking in") → Ring 3 s "Your answer?" (Sub tắt, Badge hiện) → CU Ama nói câu mẫu ("Here's one way:") → OB câu hỏi 2 → Ring 3 s → CU câu mẫu 2 → BR → kết.
QA: B phải gần chính diện (≤ 20°); vai Ama ở tiền cảnh OB chấp nhận được – bank sau nên dùng **clip 15 = B nói thẳng vào ống kính** (khi không phải làm lại clip lỗi) để POV chuẩn; mỗi câu hỏi có ≥ 1 câu trả lời ngắn (≤ 8 từ) người xem nói kịp trong 3 s; câu mẫu không phải câu duy nhất đúng → thẻ ghi "One possible answer".
**Ví dụ:** Pov "POV: you're checking in" · h02 D: "Good evening! How can I help?" → Ring 3 s → h06 A: "I have a reservation under Ama Mensah." → h03 D: "Could I see your passport, please?" → Ring 3 s → h06 A: "Here you are." → h09 → h10 (0–56) phong bì + trượt → h14 → kết.

## Thứ tự làm
Thêm 5 style vào lesson5.py + cờ HOOK_KIND vào qa5 → dựng 5 ví dụ khách sạn trên CI → chấm MEDIA-QA-RUBRIC ≥ 90 → nhân sang mọi bank (mỗi cảnh: 1 bài/mẫu). Thoại mới chỉ cần TTS: câu hỏi T1, câu ladder T3, câu POV T5 (thêm vào lines.json 1 lượt cho cả 6 cảnh).
