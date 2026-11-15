# Đầu ra 3–6 tháng: nói + viết tự tin, đo được (spec, 03/11/2026)

> TL;DR: Hệ thống học để sau 12–24 tuần người học **nói và viết được thật**: vòng ngày 15–20' luôn có nói + viết, nhiệm vụ đầu ra mỗi tuần, phản hồi lỗi → ôn SRS, bài đo 4 tuần/lần (ghi âm + bài viết, rubric CEFR, nghe lại tháng 1 vs tháng 3), thưởng cho đầu ra. Mốc 1 (PR này): `#/outcome` – bài đo đầu vào + bản ghi tiến bộ.
> Đọc khi: làm lộ trình, nhiệm vụ nói/viết, phản hồi lỗi, đo tiến bộ, phần thưởng. Không lặp: khung Can-do → `content/framework/lkf.json`; thang 6 khía cạnh → `CURRICULUM-PLAN.md` §11; Call/roleplay → `CURRICULUM-PLAN.md` §4; nhịp lộ trình → `LEARNING-PATH.md`; luật nội dung → `CONTENT-WORLD-PLAN.md`; lô viết → `content-lots.md` § Đầu ra.

## 1. Vì sao người học app lớn "học xong không nói được"
| Gốc lỗi | Bằng chứng / nguyên lý | Luật của Lexkite |
|---|---|---|
| Nhận diện quá nhiều, sản sinh quá ít (chạm chọn đáp án) | Output hypothesis (Swain): chỉ khi phải nói/viết mới thấy "lỗ hổng"; retrieval practice (Roediger & Karpicke) mạnh hơn đọc lại | Mỗi buổi ≥ 40 % thời gian là **sản sinh** (nói to, gõ câu tự đặt); trắc nghiệm chỉ làm khởi động |
| Không có phản hồi lỗi | Deliberate practice (Ericsson): phản hồi ngay + lặp có chủ đích | Sau mỗi lượt nói/viết: tối đa 3 điểm sửa, có câu đúng để nói lại ngay |
| Không tái dùng trong ngữ cảnh mới | Transfer-appropriate processing; interleaving | Cụm vừa học phải xuất hiện lại ở nhiệm vụ tuần (tình huống khác) |
| Không có nhiệm vụ thật | TBLT (Ellis, Willis): nhiệm vụ có kết quả ngoài ngôn ngữ | Mỗi tuần 1 nhiệm vụ: gọi đặt lịch, kể chuyện 2', email công việc, trình bày 1' |
| Học từ rời, thiếu cụm | Lexical approach (Lewis), formulaic sequences | Dạy theo **chunk** (cụm chức năng), không từ đơn trơ trọi |
| Không đo đầu ra, chỉ đo XP | Goodhart: thưởng chạm → tối ưu chạm | Đo bằng ghi âm + bài viết 4 tuần/lần; XP tính theo **từ đã nói/viết** |
| Nói chậm, đứt quãng | 4/3/2 (Nation), shadowing | Lặp cùng câu chuyện 3 lần thời lượng giảm dần; shadowing câu mẫu |
Chỉ lấy phương pháp (không chép nội dung): Cambly/Babbel Live (nói với người thật → Lexkite: Call Ama/Carlos), Speak (lặp nói khối lượng lớn + nhắc câu), ELSA (phản hồi âm vị), Busuu (bài viết được sửa → Lexkite: writecheck + mẫu), Pimsleur (nhớ lại có giãn cách bằng lời nói).

## 2. Vòng học ngày 15–20 phút (buổi nào cũng nói + viết thật)
| Bước | Phút | Việc | Dùng lại |
|---|---|---|---|
| 1 Khởi động nhớ lại | 3 | Ôn SRS đến hạn, ưu tiên **thẻ lỗi của mình** (§4) | `study.js`, FSRS |
| 2 Chunk mới | 3 | 4–6 cụm chức năng của tuần: nghe → nói lại (shadowing) | `phrases.js`, Kokoro, `UI.recognize` |
| 3 Nói có nhiệm vụ | 5 | Call/roleplay/tình huống dùng đúng cụm; 4/3/2 vào thứ 5–7 | `call/`, `roleplay/`, `situations/` |
| 4 Viết ngắn | 4 | 3–5 câu tự đặt hoặc tin nhắn/email theo nhiệm vụ | `writecheck-rules.js`, `fixer.js` |
| 5 Sửa + đưa lỗi vào ôn | 2 | ≤ 3 điểm sửa, nói/gõ lại câu đúng | §4 (mới) |
Ngày bận: chế độ 7' = bước 1 + 3 + 5. Không có ngày "chỉ chạm".

## 3. Lộ trình 12 / 24 tuần theo CEFR + nhánh mục tiêu
- 12 tuần = 1 bậc "+" (A2→B1, B1→B1+); 24 tuần = 1 bậc đầy đủ (A2→B1+, B1→B2). Mỗi tuần: chủ đề + 1 nhiệm vụ đầu ra + Can-do (`lkf.json`, kỹ năng S/W/I).
- Nhánh `gen` (giao tiếp), `work` (công việc), `ielts` – cùng khung tuần, khác nhiệm vụ. Ví dụ B1→B2 (tuần: gen / work / ielts):
| Tuần | Nhiệm vụ đầu ra |
|---|---|
| 1 | Bài đo đầu vào (mọi nhánh) |
| 2–3 | Gọi đặt lịch hẹn / gọi dời cuộc họp / Part 1 trả lời mở rộng |
| 4 | Kể chuyện 2' về một chuyến đi / kể một sự cố công việc / Part 2 cue card |
| 5 | **Đo tháng 1** |
| 6–8 | Phàn nàn lịch sự + đề nghị / email công việc 120 từ / Task 2 đoạn thân bài |
| 9 | **Đo tháng 2** · thuyết trình 1' / cập nhật dự án 1' / Part 3 bàn luận |
| 10–12 | Thương lượng / họp nhóm qua Call / Task 1 + Speaking full |
| 13 | **Đo tháng 3** + nghe lại tháng 1 (mốc 12 tuần) |
| 14–24 | Lặp chu kỳ 4 tuần ở bậc kế: lập luận, kể dài 3', email khó (từ chối, xin lỗi), thuyết trình 3', đo tuần 17/21/25 |
Danh mục nhiệm vụ = lô S-OUT-TASK (§7). Lộ trình chọn theo kết quả bài đo đầu vào + `settings.placement`; người học đổi nhánh lúc nào cũng được.

## 4. Phản hồi lỗi cá nhân → ôn SRS
- Ngữ pháp/chính tả: `LK_WRITE.check` (offline) trên bài viết **và** bản ghi chữ của bài nói. Phát âm: khớp chữ (`Speak.align`) + GOP khi có (#286). Trôi chảy: wpm, lượt dài nhất. Từ vựng: MATTR, gợi ý `LK_WRITE.UPG`.
- Mỗi lần chỉ hiện ≤ 3 lỗi ưu tiên (tần suất × mức ảnh hưởng). Lỗi cùng `rule` lặp ≥ 2 lần trong 7 ngày → tạo **thẻ lỗi** (câu sai của chính mình → câu đúng, nói lại) vào FSRS (mốc 2). Mốc 1 đã lưu bảng đếm `errs{rule:n}` mỗi lần đo.

## 5. Đo tiến bộ (mốc 1 – đã làm)
- Bài đo ~12': (1) đọc to đoạn 40–60 từ → **độ rõ** (% từ máy nghe đúng) + wpm; (2) nói tự do 1–2' theo đề → wpm, tổng từ, MATTR, lỗi/100 từ; (3) viết 10' (80–150 từ) → số từ, độ dài câu TB, lỗi/100 từ, MATTR, từ nối/100 từ.
- Rubric minh bạch, mỗi khía cạnh quy ra CEFR (bảng ngưỡng trong `web/cpack/outcomes-app/outcomes-core.js`, test khóa), tổng = trung vị thấp; luôn ghi "ước tính, không phải chứng chỉ". Trần: Chính xác/Vốn từ ≤ B2 (máy chỉ bắt lỗi phổ biến, MATTR-50 không đo độ tinh của từ), các khía cạnh khác ≤ C1; nói < 10 giây hoặc < 20 từ, viết < 30 từ, vốn từ < 50 từ → "chưa chấm", không ra A1. Hiệu chuẩn lại bằng mẫu CI như `CURRICULUM-PLAN.md` §11 (mốc 3).
- Đề song song theo cấp (a = A1–A2, b = B1–B2, c = C1+), mỗi lần đo lấy đề **khác** lần trước để không học thuộc nhưng so được.
- 4 tuần/lần: trang `#/outcome` báo đến hạn, biểu đồ từng chỉ số theo thời gian, **nghe lại bản ghi lần đầu cạnh bản mới nhất**, đọc 2 bài viết cạnh nhau.
- Lưu: chỉ số + bài viết trong `settings.outcomes` (đồng bộ D1/Drive sẵn có, gộp hợp theo id, không mất lần đo khi 2 máy cùng làm). **Âm thanh chỉ ở máy** (IndexedDB `lexkite-voice`, không gửi đi đâu) – quyền riêng tư; người học xóa được.
- Đầu ra cấp app (mốc 3): tỉ lệ người học đo lần 2 có tăng ≥ 1 khía cạnh; trung vị Δwpm, Δlỗi/100 từ sau 12 tuần – báo cáo tổng hợp ẩn danh, không gửi ghi âm.

## 6. Game & phần thưởng: thưởng đầu ra, không thưởng chạm
- XP bài đo = theo số từ đã nói + viết (trần 60), không theo số lần bấm. Mốc 2: "phút nói" và "từ đã viết" là chỉ số tuần trên Hôm nay; giải đấu tuần cộng theo đầu ra; huy hiệu "nói 2 phút liền", "email đầu tiên", "lỗi X đã hết 3 tuần".
- Không phạt, không tim/năng lượng (luật GAME-FEEL); chuỗi ngày chỉ tính khi có ≥ 1 lượt nói hoặc viết thật.

## 7. Có sẵn vs thiếu
| Mảng | Dùng lại | Thiếu → ai làm |
|---|---|---|
| Nhận dạng nói | `UI.recognize`, Web Speech liên tục (`speaking.js`), Whisper trên máy, `Speak.align` | GOP (#286) |
| Soát viết | `LK_WRITE.check`, `fixer.js`, UPG | luật lỗi theo L1 (S-L1-*) |
| Khung | LKF 585 Can-do, 300 điểm ngữ pháp, placement | danh mục nhiệm vụ tuần → **S-OUT-TASK** |
| Nói theo nhiệm vụ | 11 Call, 16 roleplay, tình huống P&S | lô S-CALL/S-RP/S-SIT đang chạy |
| Đề bài đo | 6 đề song song (mốc 1, `web/cpack/outcomes/forms.js`) | thêm tới 6 đề/cấp → **S-OUT-CHECK** |
| Thẻ lỗi | FSRS, `App.addWord` | drill cho mỗi luật lỗi → **S-OUT-DRILL** |
| Chunk / 4-3-2 / shadowing | `phrases.js`, Kokoro | kịch bản 4/3/2 + shadowing → **S-OUT-FLU** |

## 8. Mốc
| Mốc | Nội dung | Trạng thái |
|---|---|---|
| 1 | `#/outcome`: bài đo đầu vào 3 phần, rubric, lưu + đồng bộ, lịch 4 tuần, biểu đồ, nghe lại, XP theo đầu ra; i18n 15; test `outcomes.mjs` | PR này |
| 2 | Thẻ lỗi → FSRS; vòng ngày 15–20' trên Hôm nay (sau khi #284 gộp); nhiệm vụ tuần đọc từ S-OUT-TASK | sau khi lô S-OUT-TASK-1 gộp |
| 3 | Hiệu chuẩn rubric trên CI, báo cáo đầu ra ẩn danh, nhánh work/ielts đầy đủ | sau mốc 2 |

## 9. Stitch (cho phiên stitch-factory)
Chưa có ref: **outcome-hub** (lịch đo + biểu đồ + so sánh lần đầu/mới nhất), **outcome-run** (3 bước: đọc to, nói, viết – có đồng hồ + bản ghi chữ trực tiếp), **outcome-result** (5 khía cạnh CEFR + ≤ 3 điểm sửa). Khung 390 px, sáng + tối, Back ≥ 44 px, tương phản ≥ 4,5:1. Mốc 1 dùng lớp sẵn có (`card`, `btn`, `study-wrap`); port sang ref khi có, không đổi dữ liệu.
