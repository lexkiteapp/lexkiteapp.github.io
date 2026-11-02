# Chương trình A1→C2 + Call/Hội thoại – kiểm kê, khoảng cách, kế hoạch (02/11/2026)

> TL;DR: Nội dung nói/hội thoại là mảng yếu nhất (bảng điểm Giao tiếp 14,1/100: 11 cuộc gọi, 16 roleplay, 1 tình huống, 0 sổ mẫu câu trên main). Tài liệu này đặt **khung chương trình A1→C2 = kỹ năng × chủ đề × chức năng**, một **kho kịch bản dùng chung** (`sc:` id) để Call / Roleplay / Play & Speak / sổ mẫu câu không làm trùng nhau, **thiết kế lại Call** (độ khó thích ứng, nhánh theo ý định, sự cố bất ngờ, roleplay vô hạn có rào), cơ chế chống nhàm + nhớ lâu, quy trình sản xuất giá rẻ qua Xưởng nội dung, mốc đo "nói như bản xứ", và **bảng giai đoạn 1** (§12) làm được ngay.
> Đọc khi: thêm/sửa cuộc gọi, roleplay, tình huống nói, sổ mẫu câu, chủ đề từ vựng, hoặc chọn việc nội dung tiếp theo.

Không lặp lại tài liệu khác – chỉ trỏ tới: chuẩn đích + pha P0–P2 (từ, ngữ pháp, đề thi, i18n) → `CONTENT-WORLD-PLAN.md` · khung Can-do 585 mục → `content/framework/lkf.json` (+ `lo-map.json`) · 300 điểm ngữ pháp → `content/framework/grammar-inventory.json` · xưởng lô đêm → `CONTENT-FACTORY.md` (PR #429) · thước đo dễ học 12 tiêu chí → `docs/specs/learnability.md` (PR #427/#430) · bảng World → `WORLD-SCORECARD.md` (PR #431) · Call hiện tại → `CALL.md` · Call thời gian thực M1–M3 → `docs/specs/call-realtime.md` (PR #311) · lộ trình chặng → `LEARNING-PATH.md` · bài học → `LESSON-ENGINE.md` · quy trình lô + chuẩn → `CONTENT-PIPELINE.md`, `CONTENT-RULES.md`, `CONTENT-QA.md` · i18n → `I18N-PIPELINE.md`.

Luật áp cho mọi PR theo kế hoạch này: không cắt tính năng/nội dung/test/ngưỡng; nguyên nhân gốc + test hồi quy; việc nặng trên CI; $0 (credit trả phí cần anh ghi rõ số); nhân vật 2D, chỉ Ama + Carlos làm giáo viên/người đóng vai, một giọng Kokoro thống nhất cho mỗi người; video chỉ tiếng Anh; mọi chữ giao diện mới đủ 15 ngôn ngữ qua G0; **>15 PR mở → chỉ PR dữ liệu/cổng, không UI mới** (02/11 đang mở 61 PR).

---

## 1. Kiểm kê (main `1427c0fba`, 02/11)

### 1.1 Gọi điện `#/call` (`web/js/call/calls.js`, `calls-exam.js`, `engine.js`, `call.js`)
| id | cấp | loại | giáo viên | lượt | nhánh | cụm |
|---|---|---|---|---|---|---|
| coffee | A2 | đời sống (công sở) | Ama | 6 | 13 | 5 |
| weekend | A2 | đời sống | Carlos | 6 | 14 | 5 |
| bakery | A2 | đời sống | Carlos | 5 | 9 | 5 |
| first-day | B1 | công sở | Ama | 6 | 13 | 5 |
| standup | B1 | công sở | Carlos | 6 | 8 | 5 |
| doctor | B1 | y tế | Ama | 6 | 10 | 5 |
| toeic-reschedule | B1 | TOEIC | Ama | 5 | 7 | 5 |
| ielts-p1-home | B1 | IELTS P1 | Ama | 9 | 7 | 5 |
| apartment | B2 | nhà ở | Carlos | 6 | 12 | 5 |
| ielts-p2-place | B2 | IELTS P2 | Carlos | 4 | 1 | 5 |
| ielts-p3-tech | B2 | IELTS P3 | Carlos | 4 | 3 | 5 |

Tổng: **11 cuộc gọi · 63 lượt · 97 nhánh · 55 cụm**. Cấp: A1 0 · A2 3 · B1 5 · B2 3 · C1 0 · C2 0. Lĩnh vực: công sở 4, ăn uống 2, y tế 1, nhà ở 1, thi 3 – **không có** du lịch, mua sắm, ngân hàng, dịch vụ công, học đường, công nghệ, quan hệ xã hội, tranh luận/ý kiến, thương lượng.
Cơ chế đã có (giữ nguyên, nâng cấp): đồ thị `nodes` + `br` regex, `min` từ, Part 2 có `prep/cue`, sửa ngữ pháp `E.correct`, nhầm cặp âm `E.slips`, `E.fluency` (số từ), tổng kết `recap` + luyện lại câu yếu `retry`, cụm → thẻ ôn, nhận dạng trên máy trước, lọc câu không an toàn. Đang chờ gộp: khớp miệng (#293), thời gian thực VAD/nói chen/câu đệm (#311 M1; M2 `call/native.js`, M3 câu hỏi nối tiếp AI theo bậc máy).
Hạn chế: câu giáo viên **một phiên bản duy nhất** (gọi lần 2 = y hệt lần 1); `o[]` cố định; không có mục tiêu nhiệm vụ (đặt được lịch chưa?); không thích ứng độ khó trong cuộc gọi; nhánh chỉ regex; tổng kết không đo tốc độ nói/độ trễ phản xạ/ngữ điệu; không có sự cố bất ngờ (nghe không rõ, đổi giờ, phàn nàn).

### 1.2 Mảng nói/hội thoại khác
| Mảng | Có | Ghi chú |
|---|---|---|
| Roleplay `web/js/roleplay/data-*.js` | 16 (10 công sở: phỏng vấn ×2, lương, trễ hạn, gọi khách, phàn nàn, thuyết trình, small talk, xin nghỉ, sếp · 6 đời sống A1/A2/B1 3 bậc: hàng xóm, café, cửa hàng, hỏi đường, khách sạn, bác sĩ) | **10 bài công sở không có `lv`**; não hội thoại Nano → `/api/ai` → kịch bản ($0) |
| Play & Speak `content/situations/*.json` | 1 (cafe) | test `situations.mjs` cứng vai customer/barista |
| Speak cũ `web/js/speak/data.js` (`SPK`) | 1 (cafe A2) | |
| Nói IELTS `speak/more*.js`, `samples.js` | 32 chủ đề, 343 câu trả lời mẫu | chỉ phục vụ thi, B1+ |
| Say it like a native `web/data/say.json` | 4 loạt / 29 thẻ (say-no, not-fine, disagree, office) | #306 đã gộp |
| Sổ mẫu câu chức năng | 0 trên main; 100 hạt giống A1–C2 trong #429 (`content/framework/functions.json`, chưa có màn) | chuẩn 100 |
| Gold (vì sao/cách dùng) | 228 / 1.000 | |
| Phát âm | 44 bài + `pron/coach.js`, `pron/rhythm.js` (dạng yếu UK/US, shadowing) | chưa chấm âm vị GOP |

**Trùng lặp:** café/đồ uống xuất hiện ở **5 nơi** (call coffee, call bakery, roleplay cafe, situation cafe, SPK cafe), bác sĩ 2 nơi, phỏng vấn 2 nơi – mỗi nơi tự soạn, không chung id, không dùng lại cụm/âm thanh, không nối tiến độ. Ngược lại 9/12 lĩnh vực đời sống chưa có bài nói nào.

### 1.3 Ngữ pháp, từ vựng, khung
- Ngữ pháp: 77 bài (A1 0 · A2 14 · B1 30 · B2 27 · C1 6 · C2 0), 1.020 trắc nghiệm + 920 tự luận; kho 300 điểm, đã dạy đúng cấp A1 0/40 · A2 28/55 · B1 53/64 · B2 46/50 · C1 23/48 · C2 0/43; hàng chờ 150 điểm. Đang chờ gộp: A1 lô 1 (#410), drill `own` + vì sao (#430), trắc nghiệm xưởng (#429).
- Từ vựng: 8.812 từ#loại (chuẩn 20k), collocation 23 %, đồng nghĩa 13 %, ảnh theo nghĩa 15 %, C2 255; 10 chủ đề chặng lộ trình (Giáo dục, Môi trường, Công nghệ, Sức khỏe, Công việc, Xã hội, Truyền thông, Đô thị, Du lịch, Tội phạm) – thiên IELTS, thiếu chủ đề đời sống A1–A2 (gia đình, nhà, ăn uống, mua sắm, thời gian, cảm xúc…).
- Khung Can-do: 585 mục (6 kỹ năng), **471 chưa có nội dung**; mỏng nhất: tương tác (I), trung gian (M), A1, C2.
- Bảng điểm (SCORE.md): tổng 47,3 · Kho từ 45,2 · Ngữ pháp 51,4 · **Giao tiếp 14,1** · 4 kỹ năng 48,2 · Đề thi 30,4 · Can-do 79,1 · i18n 62,7.

## 2. So với chuẩn thế giới → danh sách thiếu
Nguồn phương pháp (không chép nội dung): CEFR Companion Volume 2020 (thang tương tác hội thoại, chiến lược tương tác, trung gian, các khía cạnh định tính của nói: range/accuracy/fluency/interaction/coherence/phonology), British Council/Threshold-style danh mục chức năng × khái niệm, Cambridge EVP (cụm/thành ngữ theo cấp), các danh sách cụm công thức (PHRASE List, Academic Formulas List), ngữ pháp khẩu ngữ (Carter & McCarthy), mô tả band IELTS Speaking (FC/LR/GRA/P), nghiên cứu độ trôi chảy (tốc độ nói, độ dài đoạn không ngắt, vị trí ngắt).

| # | Thiếu | Chuẩn | Hiện tại |
|---|---|---|---|
| G1 | Phủ 4 lĩnh vực CEFR (cá nhân · công cộng · nghề nghiệp · học thuật) × cấp | mỗi cấp có tình huống ở cả 4 | công cộng/học thuật gần như 0, A1 & C1–C2 = 0 |
| G2 | Chức năng giao tiếp có bậc trang trọng | ~100 chức năng × 3 bậc | 0 trên main (#429 chờ) |
| G3 | **Chiến lược tương tác**: xin nhắc lại, kiểm tra hiểu, sửa lời mình, giữ lượt/nhường lượt, phản hồi ngắn (backchannel), câu đệm suy nghĩ, rào đón (hedging), đổi chủ đề | dạy + luyện có mục tiêu | chỉ câu đệm của giáo viên (#311) |
| G4 | Ngữ pháp khẩu ngữ: tỉnh lược ("Sounds good"), từ mơ hồ ("sort of", "and stuff"), câu hỏi đuôi, từ nối hội thoại ("Anyway", "Right, so…") | điểm riêng B1–C1 | không có |
| G5 | Cụm công thức/chunk theo chức năng + collocation khẩu ngữ, phrasal verb, thành ngữ C1–C2 | ~3.000 cụm có cấp | 55 cụm call + rải rác |
| G6 | Ngữ điệu, trọng âm câu, nối âm trong hội thoại thật (không chỉ bài phát âm rời) | phản hồi theo câu | rhythm.js chỉ ở bài phát âm |
| G7 | Đo độ trôi chảy: tốc độ, độ trễ phản xạ, đoạn nói dài nhất không ngắt | số đo theo cấp | chỉ đếm số từ |
| G8 | Nhiệm vụ có kết quả (đặt lịch, thương lượng giá, giải quyết vấn đề) | task-based | trả lời câu hỏi lần lượt |
| G9 | Sự cố & biến thể (chống thuộc lòng) | mỗi lần gọi khác | gọi lại y hệt |
| G10 | Độ khó thích ứng trong 1 cuộc gọi | i+1, đích 80–85 % | cố định theo bài |
| G11 | Ngữ dụng/văn hoá: lịch sự, gián tiếp, từ chối khéo, phàn nàn lịch sự | theo bậc | Say-native 29 thẻ |
| G12 | Trung gian (mediation): giải thích lại, tóm tắt cho người khác, phiên dịch tình huống | CEFR CV 2020 | 0 |
| G13 | Nghe đa giọng | ≥ 4 giọng | 2 giọng (đúng luật một giọng/giáo viên – giọng phụ chỉ ở bài nghe, không ở Call) |
| G14 | Câu chuyện xuyên suốt (nhân vật có đời sống, nhớ người học) | giữ chân dài hạn | mỗi cuộc gọi rời rạc |
| G15 | Kho kịch bản chung, chống trùng | 1 id/tình huống | 5 bản café rời nhau |

## 3. Khung chương trình A1→C2

### 3.1 Ba trục
- **Chủ đề (cây `sc:`)** – 12 lĩnh vực × ~8 tiểu chủ đề ≈ 96 chủ đề, mỗi chủ đề có dải cấp:
  1 Bản thân & gia đình · 2 Nhà & khu phố · 3 Ăn uống · 4 Mua sắm & tiền · 5 Đi lại & du lịch · 6 Sức khỏe & cơ thể · 7 Thời gian rảnh, thể thao, giải trí · 8 Học tập & trường lớp · 9 Công việc & sự nghiệp · 10 Dịch vụ công & giấy tờ (ngân hàng, bưu điện, visa, cảnh sát) · 11 Công nghệ & truyền thông · 12 Xã hội, môi trường, ý kiến & tranh luận (B2+ học thuật).
  10 chủ đề chặng hiện có ánh xạ vào 5, 6, 8, 9, 11, 12 (không đổi id cũ).
- **Chức năng** – `content/framework/functions.json` (#429, 100 mục) + 12 chức năng chiến lược tương tác (G3) thêm mới.
- **Kỹ năng** – 6 kỹ năng LKF (R, L, S, W, I, M). Mỗi đơn vị gắn `lo` LKF; kịch bản gắn cả `fn` (chức năng) và `gp` (điểm ngữ pháp trong `grammar-inventory.json`).

### 3.2 Đích theo cấp (phần nói/tương tác)
| Cấp | Tình huống điển hình | Chức năng trọng tâm | Ngữ pháp mồi (từ kho 300 điểm) | Chiến lược tương tác | Đích Call (đề xuất, hiệu chỉnh bằng dữ liệu) |
|---|---|---|---|---|---|
| A1 | chào, giới thiệu, gọi món, hỏi giá, hỏi giờ/đường đơn giản | chào/tạm biệt, hỏi–đáp thông tin cá nhân, yêu cầu đơn giản | be, hiện tại đơn, can, there is, wh- | xin nhắc lại, "Sorry?", "Slowly, please" | 3–5 lượt; câu 3–6 từ; có gợi ý; trễ ≤ 6 s |
| A2 | mua sắm, đặt bàn, hẹn gặp, kể cuối tuần, hỏi đường | mời/nhận/từ chối, đề nghị, xin phép, mô tả đơn giản | quá khứ đơn, going to, so sánh, would like | kiểm tra hiểu, câu đệm "Let me see…" | 5–7 lượt; 5–10 từ; trễ ≤ 4 s; ~80–100 wpm |
| B1 | khám bệnh, thuê nhà, đổi trả, phỏng vấn đơn giản, sự cố du lịch | phàn nàn lịch sự, giải thích vấn đề, xin/cho lời khuyên, kể chuyện | hiện tại hoàn thành, điều kiện 1–2, bị động cơ bản, câu hỏi gián tiếp | giữ lượt, sửa lời mình, backchannel | 6–9 lượt; 8–15 từ; trễ ≤ 3 s; ~100–120 wpm |
| B2 | thương lượng, họp nhóm, phỏng vấn việc, tranh luận nhẹ, chăm sóc khách hàng | thuyết phục, nhượng bộ, đồng ý/phản đối có rào, tóm tắt | điều kiện hỗn hợp, modal quá khứ, mệnh đề quan hệ rút gọn | rào đón, đổi chủ đề, ngắt lời lịch sự | 8–12 lượt; trả lời 2–3 câu; trễ ≤ 2 s; ~120–140 wpm |
| C1 | đàm phán hợp đồng, seminar học thuật, xử lý khủng hoảng, phản hồi cho cấp dưới | lập luận, phản biện, giảm nhẹ/nhấn mạnh, trung gian | đảo ngữ, cleft, nominalisation nói, giả định | điều phối thảo luận, tóm ý người khác (M) | 10–15 lượt; nói dài 60–90 s; trễ ≤ 1,5 s; ~130–150 wpm |
| C2 | đàm phán khó, phỏng vấn truyền thông, hài hước/ẩn ý, diễn thuyết ứng biến | sắc thái, mỉa nhẹ, ngoại giao, ứng biến | ngữ pháp sắc thái, ellipsis nâng cao, end-weight | xử lý xung đột, chuyển giọng trang trọng ↔ thân mật | không giới hạn; trễ ≈ người bản xứ (≤ 1 s); ~150–180 wpm |

### 3.3 Đơn vị học (dùng lại 6 nút chặng, `LEARNING-PATH.md` §2)
Mỗi **đơn vị = chủ đề × cấp**, chứa 2–3 kịch bản `sc:` và đi theo chu trình: **nghe mẫu** (hội thoại ngắn của Ama ↔ Carlos) → **chú ý** (cụm + 1 điểm ngữ pháp + 1 chiến lược) → **luyện có kiểm soát** (drill, sổ mẫu câu, shadowing) → **Call** (nút Nói của chặng) → **ôn** (FSRS cụm) → **thử thách** (Call chế độ Thử thách/roleplay vô hạn).
Khối lượng đích toàn chương trình: ≈ 96 chủ đề × trung bình 3 cấp = **~290 đơn vị**, ~600 kịch bản `sc:`; một kịch bản sinh ra Call + roleplay + tình huống Play & Speak + bài nghe từ CÙNG nguồn (mục 4.1) – không soạn 4 lần.

## 4. Thiết kế lại Call

### 4.1 Kho kịch bản chung `content/framework/scenarios.json`
```
{ id: "sc:food.cafe.order", domain: "food", topic: "cafe", levels: ["A1","A2","B1"],
  setting, goal_en, slots: {drink:[…], size:[…], name:[…]},     // ô biến thiên
  roles: [{who:"ama"|"carlos", role_en}], fn: ["fn:request", …], gp: ["gp:…"], lo: ["…"],
  chunks: ["for here or to go", …], events: ["ev:out-of-stock", "ev:mishear"],
  uses: {call:["coffee"], roleplay:["cafe"], situation:["cafe"], speak:["cafe"]} }
```
`uses` gom 5 bản café hiện có vào 1 kịch bản (không xoá bản nào – chỉ liên kết; cụm, âm thanh, tiến độ dùng chung). Cổng `scenario-check`: id duy nhất, mọi `uses` tồn tại, mọi call/roleplay/situation thuộc ≥ 1 kịch bản, báo ô trống lĩnh vực × cấp.

### 4.2 Đồ thị Call v2 (tương thích ngược `nodes` hiện tại)
Thêm trường tuỳ chọn, engine bỏ qua khi thiếu → 11 cuộc gọi cũ chạy y nguyên:
- `sc` (kịch bản), `goal: {slots:[…], done}` – nhiệm vụ có kết quả, tổng kết ghi "Đã đặt lịch 3 pm thứ Ba ✓".
- Mỗi nút: `mv: {A2:[…], B1:[…], B2:[…]}` – 3–5 biến thể câu giáo viên theo cấp (chọn ngẫu nhiên có hạt giống, không lặp 2 lần liền với cùng người học); `ov` gợi ý theo cấp; `fn`, `gp`.
- `ev` – sự cố chèn ngẫu nhiên có xác suất theo cấp (A1 0 %, A2 10 %, B1 25 %, B2+ 40 %): đường truyền kém ("Sorry, you're breaking up"), hết hàng, đổi giờ, nghe nhầm tên, người gọi vội, khách khó tính. Kho sự cố dùng chung mọi kịch bản (`content/framework/events.json`).
- `intent` – nhánh theo ý định (đồng ý/từ chối/hỏi lại/không hiểu/lạc đề): tầng 0 regex hiện có → tầng 1 phân loại trên máy (bậc máy A/B/C của #311 M3) → `/api/ai` có hạn mức → mặc định `re`.

### 4.3 Bốn chế độ + roleplay vô hạn có rào
1. **Có hướng dẫn** – hiện `o[]` (như nay).
2. **Gợi ý từ khoá** – chỉ hiện 2–3 từ khoá/cụm, người học tự đặt câu.
3. **Tự do** – không gợi ý, gợi ý mở sau 6 s im lặng (A2) / 4 s (B1) / không (B2+).
4. **Thử thách** – bật sự cố, giáo viên nói nhanh hơn (Kokoro speed 1,0–1,1), đếm ngược phản xạ.
5. **Roleplay vô hạn** (sau #311 M3): AI chỉ sinh **câu hỏi/đáp nối tiếp ≤ 20 từ** từ thẻ kịch bản (setting, goal, slots, chunks, cấp). Rào máy kiểm mỗi câu trước khi nói: mọi từ ∈ kho từ với CEFR ≤ cấp + 1, độ dài theo cấp, lọc an toàn (`UNSAFE` hiện có), phải tiến về `goal` trong ≤ 3 lượt, không lặp câu trước; trượt → câu kịch bản. $0: Nano/model trên máy → `/api/ai` (hạn mức) → kịch bản.

### 4.4 Độ khó thích ứng trong cuộc gọi
Ước lượng mỗi lượt: số từ so với `min`, độ trễ phản xạ (CallEP #311), số lỗi `E.correct`, độ tin nhận dạng, có dùng cụm mục tiêu không. Đích thành công 80–85 % (`LEARNING-PATH.md` §1): 2 lượt yếu liền → hạ biến thể câu (`mv` cấp dưới), chậm giọng 0,9×, mở gợi ý; 3 lượt tốt liền → biến thể cấp trên, bật 1 sự cố. Lưu `lk.call.lvl` theo kịch bản → lần gọi sau bắt đầu đúng chỗ.

### 4.5 Phản hồi sau cuộc gọi (tối đa 3 điểm sửa – tránh quá tải)
- **Ngữ pháp**: `E.correct` + `GRAMMAR_CHECK` (đã có ở #430) → trỏ bài ngữ pháp qua `gp`.
- **Nói tự nhiên hơn**: `call/native.js` (#311 M2) – câu của người học → bản tự nhiên + vì sao (15 ngôn ngữ) + bậc trang trọng; kho sinh sẵn trên CI cho mọi `o[]`.
- **Phát âm**: `E.slips` (cặp âm) + `pron/rhythm.js` cho 1 câu yếu nhất (trọng âm câu, dạng yếu, nối âm) + nghe lại giọng mình 0,75× (đã có); GOP khi mô hình qua cổng `research/pron-phoneme-plan.md`.
- **Độ trôi chảy** (mới, thuần engine): tốc độ nói (wpm), độ trễ p50, đoạn nói dài nhất, tỉ lệ dùng cụm mục tiêu, số chiến lược tương tác đã dùng → so với đích cấp §3.2 và lần gọi trước.
- **Nhiệm vụ**: `goal` đạt/chưa.

### 4.6 Nhân vật & câu chuyện (chống rời rạc, G14)
Chỉ Ama + Carlos (2D, giọng Kokoro riêng mỗi người). Họ **đóng vai** (lễ tân, sếp, bác sĩ…) – thẻ vai ghi "Ama plays: the receptionist". Mạch "mùa" xuyên suốt: Ama mở studio thiết kế nhỏ (công sở, khách hàng, thương lượng), Carlos đi làm xa và du lịch (đi lại, sức khỏe, dịch vụ công) – mỗi đơn vị là một "tập", có chi tiết nối (tên đồng nghiệp, việc lần trước). Trí nhớ người học `call/memory.js` (#311 spec, IndexedDB, ≤ 300 token, người học xem/xoá được) để chào hỏi có nhắc lại ("How did the interview go?").

## 5. Luyện nói/hội thoại ngoài Call
- **Sổ mẫu câu theo chức năng** (dữ liệu #429): màn 4 bước nghe → ngôn ngữ chính → luyện → nhập vai (mở Call/roleplay của kịch bản cùng `fn`). UI khi PR mở ≤ 15.
- **Chiến lược tương tác** (G3): 12 thẻ kỹ năng + drill phản xạ 10 giây (nghe câu khó → nói "Sorry, could you say that again?"), chèn vào Call như sự cố `ev:mishear`.
- **Ngữ pháp khẩu ngữ** (G4): ~12 điểm mới B1–C1 thêm vào `grammar-inventory.json` (nhóm `spoken`), dạy bằng đoạn hội thoại Ama ↔ Carlos.
- **Say it like a native**: 4 → 20 loạt (mỗi chức năng khó về ngữ dụng một loạt: từ chối, phàn nàn, nhờ vả, xin lỗi, khen, ngắt lời…), dùng lại xưởng thẻ #306.
- **Play & Speak**: sinh tình huống từ `scenarios.json`; nới test `situations.mjs` để nhận vai theo kịch bản (giữ toàn bộ kiểm tra hiện có, chỉ thay danh sách vai cứng bằng `roles` của kịch bản).
- **Trung gian** (G12): "giải thích cho bạn" – nghe đoạn Ama nói, tóm lại cho Carlos (B1+); "phiên dịch tình huống" L1 → en (B2+).
- **Shadowing hội thoại**: mỗi Call có bản nghe mẫu → shadowing 1 lượt với `pron/rhythm.js`.

## 6. Ngữ pháp (dùng kho 300 điểm, không làm lại)
Hàng chờ giữ nguyên thứ tự `QUEUE.md`: A1 15 (lô 1 #410), C2 10, C1 +9, A2 +4, B1 +3, B2 +2. Bổ sung theo kế hoạch này: (a) mỗi điểm A1–B2 có `fn`/`sc` "dùng trong hội thoại" – 1 đoạn hội thoại mẫu + 1 nút Call tới kịch bản dùng điểm đó; (b) nhóm `spoken` (§5); (c) drill `own`/`say` của #430 nhận câu nói (nhận dạng) bên cạnh câu gõ.

## 7. Từ vựng & chủ đề
- Cây 96 chủ đề (§3.1) là trục chung cho bộ từ, kịch bản, bài nghe/đọc. Bổ sung **bộ từ đời sống A1–A2** cho lĩnh vực 1–4, 7, 10 (hiện thiên IELTS).
- **Kho cụm** `content/framework/chunks.json` (~3.000 mục): cụm của `functions.json` + `phrases` của call/roleplay + collocation khẩu ngữ + phrasal verb + thành ngữ C1–C2; mỗi cụm `{id, text, lvl, fn?, sc[], register, sense?}`. Tách nghĩa theo `từ#loại#n` khi P0-E (`CONTENT-WORLD-PLAN.md`) xong.
- Mỗi chủ đề × cấp: từ lõi (kho từ), 10–20 cụm, 2–3 kịch bản, 1 Call.

## 8. Chống nhàm chán (đo được)
| Cơ chế | Cách làm | Số đo |
|---|---|---|
| Biến thể câu | `mv` 3–5 bản/nút/cấp + ô `slots` (tên, giờ, giá, món) | tỉ lệ câu giáo viên trùng hệt lần gọi trước ≤ 20 % |
| Sự cố | kho `events.json` ≥ 40 sự cố dùng chung | ≥ 1 sự cố/cuộc gọi B1+ |
| Câu chuyện "mùa" | §4.6 | tỉ lệ gọi tập kế tiếp D1/D7 |
| Đổi chế độ | 4 chế độ §4.3, không cùng chế độ 3 lần liền (luật chặng hiện có) | phân bố chế độ |
| Vai & lĩnh vực xoay | không cùng lĩnh vực 3 cuộc liền | |
| Thưởng thay đổi công bằng | dùng hệ XP/COMBO hiện có, không trừ điểm | |
| Gọi ngày | "Call of the day" từ kịch bản đến hạn ôn + chủ đề mới | tỉ lệ hoàn thành |

## 9. Nhớ lâu
- Cụm của cuộc gọi → thẻ FSRS (đã có) **gắn `sc`**: lần ôn cụm hiện đúng ngữ cảnh cuộc gọi đã gặp.
- **Gợi nhớ trong hội thoại**: cụm đến hạn ôn được chèn làm ô `slot`/câu hỏi ở cuộc gọi khác cùng chức năng → truy xuất chủ động trong ngữ cảnh mới (lặp có biến thể: 1 cụm ≥ 3 ngữ cảnh khác nhau).
- Truy xuất trước, nhìn sau: chế độ 2–3 bắt nói trước khi hiện gợi ý.
- Xen kẽ: Call ôn trộn 2–3 chức năng cũ.
- Thước đo: độ chính xác ôn cụm D1/D7/D30, tỉ lệ dùng lại cụm đã học trong Call tự do (đo bằng khớp chuỗi trong bản ghi nhận dạng, lưu trên máy).

## 10. Sản xuất nội dung giá rẻ (qua Xưởng nội dung #429)
Thêm kind (mỗi kind = 1 object `KINDS`, xem `CONTENT-FACTORY.md` §2):
| kind | Hạt giống | Tầng 0 (0 token) | Tầng 1–2 | Cổng tự động |
|---|---|---|---|---|
| `scenario` | lĩnh vực × chủ đề × cấp còn trống | khung từ cây chủ đề + `functions` + `grammar-inventory` | 1 lần gọi viết setting/goal/slots/chunks; 2 giám khảo | `scenario-check` |
| `call` | kịch bản chưa có Call ở cấp đó | đồ thị mẫu theo cấp (số lượt, `min`, vị trí sự cố), điền ô | viết câu giáo viên + `o[]`; 2 giám khảo (tự nhiên, đúng cấp, đúng chức năng) | `call-lint` (dưới) + `call-engine.mjs` |
| `variants` | nút Call thiếu `mv` | – | 3–5 bản/nút/cấp theo lô 25 nút | cùng nghĩa (giám khảo), khác ≥ 30 % từ, cấp đúng |
| `event` | thiếu sự cố theo lĩnh vực | mẫu sự cố có ô | 1 lần gọi/lô | lint + an toàn |
| `roleplay` | kịch bản chưa có roleplay | chuyển từ đồ thị Call (turns a[3]/h[3]) | tip/cando qua G0 | test roleplay hiện có |

`call-lint` (mới, 0 token): đồ thị tới được mọi nút và có đường kết thúc; `o[0]` ≥ `min`; câu giáo viên: từ CEFR ≤ cấp + 1 theo kho từ, độ dài câu theo cấp (A1 ≤ 8 từ … C1 ≤ 25), tốc độ đọc dự kiến ≤ trần cấp; regex `br` biên dịch được và không bắt câu rỗng; không trùng n-gram ≥ 8 với cuộc gọi khác; mọi cụm có trong `chunks.json`; giáo viên ∈ {ama, carlos}; `lo`/`fn`/`sc` tồn tại.
Âm thanh: câu tiếng Anh mới render Kokoro trên CI (`audio.yml`), ≤ 25 câu thiếu/nhóm/đêm cho tới khi xưởng render trong bước collect. Chữ giao diện (chế độ, tổng kết, tip) → 15 ngôn ngữ G0; nội dung hội thoại giữ tiếng Anh; "vì sao" qua pipeline explain.
Ước lượng chi phí: 1 Call ≈ 1 lần gọi soạn + 2 giám khảo + 0,05 soát; 230 Call ≈ 700 lần gọi; biến thể 230 × 8 nút ÷ 25 ≈ 75 lô × 3 ≈ 225 lần gọi; kịch bản 600 ÷ 25 × 3 ≈ 75. Tổng < 1.500 lần gọi cho cả chương trình nói – vài đêm trong hạn mức pool (GrabCast ≤ 10k/ngày), **$0**. Phiên Claude chỉ viết mẫu chuẩn mỗi cấp (1 Call mẫu/cấp) + trọng tài mục giám khảo bất đồng.

## 11. Mốc đo "nói như bản xứ"
Thang 6 khía cạnh định tính của CEFR (range, accuracy, fluency, interaction, coherence, phonology) chấm từ dữ liệu Call, lưu trên máy, hiện ở hồ sơ người học:
| Khía cạnh | Số đo máy | Đích C1 → "gần bản xứ" C2 |
|---|---|---|
| Fluency | wpm, độ trễ p50, đoạn nói dài nhất | ≥ 130 → 150–180 wpm; trễ ≤ 1,5 → ≤ 1 s |
| Range | số cụm mục tiêu đã dùng, đa dạng từ (MATTR), cấp CEFR trung bình từ dùng | ≥ 30 % từ B2+ |
| Accuracy | lỗi ngữ pháp/100 từ (`GRAMMAR_CHECK`) | ≤ 3 → ≤ 1 |
| Interaction | số chiến lược tương tác, tỉ lệ nhiệm vụ `goal` đạt | 100 % nhiệm vụ, ≥ 3 chiến lược/cuộc |
| Coherence | từ nối hội thoại/discourse marker mỗi lượt dài | |
| Phonology | độ hiểu được = khớp chữ của Whisper với câu định nói; khớp trọng âm câu (rhythm.js) | ≥ 95 % khớp; GOP sau |
Kiểm định thang: mẫu chuẩn espeak/Kokoro + bản ghi thử trên CI (`call-qa.yml`), không dùng tài khoản thật. Quy đổi tham khảo band IELTS Speaking (FC/LR/GRA/P) chỉ hiển thị là "ước lượng".

## 12. Ưu tiên, khối lượng, chia PR

### 12.1 Điều kiện bắt đầu
61 PR đang mở > 15 → giai đoạn 1 chỉ gồm **dữ liệu + cổng + engine thuần**, không màn mới. Chờ gộp trước khi đụng file chung: #429 (xưởng, `functions.json`), #410 (A1), #427/#430 (dễ học), #293 + #311 (call.js, engine CallEP). PR đụng `web/js/call/engine.js` mở **sau** #311.

### 12.2 Giai đoạn 1 – bắt tay ngay (≤ 2 phiên chạy cùng lúc, mỗi phiên một vùng file)
| # | PR | Vùng file | Xong khi | Phụ thuộc | Khối lượng |
|---|---|---|---|---|---|
| C1 | Kho kịch bản + cây chủ đề + `scenario-check` (gom 11 call/16 roleplay/1 situation/1 SPK vào `sc:`, báo ô trống lĩnh vực × cấp) | `content/framework/scenarios.json`, `topics.json`, `scripts/content-qa/scenario-check.mjs`, test | 100 % nội dung nói thuộc ≥ 1 kịch bản; bảng ô trống vào `targets.json`; vào `content:gate` | không | S–M, 0 token (tầng 0 + rà tay) |
| C2 | `call-lint` + sửa mọi lỗi nó tìm ra trên 11 cuộc gọi (gốc rễ, không nới ngưỡng) + gắn `lv` cho 10 roleplay công sở | `scripts/content-qa/call-lint.mjs`, `calls*.js` (chỉ dữ liệu), `roleplay/data-a,b.js` (chỉ `lv`), test | lint xanh, chạy trong `content:gate`; bảng điểm Giao tiếp thêm chỉ số "phủ lĩnh vực × cấp" | không (dữ liệu call.js – không đụng UI) | S, 0 token |
| C3 | Chiến lược tương tác + ngữ pháp khẩu ngữ vào khung: 12 chức năng `fn:strat-*`, ~12 điểm `spoken` | `functions.json` (sau #429), `grammar-inventory.json`, `targets.json` | grammar-map-check + lkf-check xanh, hàng chờ cập nhật | #429 | S, Claude soạn mẫu |
| C4 | Engine Call v2 thuần: `mv`, `ov`, `goal`, `ev`, chọn biến thể có hạt giống, thích ứng §4.4, số đo trôi chảy §4.5 (chưa hiện UI) | `web/js/call/engine.js`, `scripts/test/call-engine.mjs` | 11 cuộc gọi cũ chạy y nguyên (test hồi quy); test mới cho biến thể/sự cố/thích ứng/số đo | #311 gộp | M |
| C5 | Kind xưởng `variants` + lô thử: 3 biến thể/nút cho 11 cuộc gọi | `scripts/factory/call.mjs`, `content/factory/*` | lô CI xanh qua 2 giám khảo; `call-lint` xanh; Kokoro render | #429, C2, C4 | M, ~30 lần gọi |
| C6 | Kind xưởng `call` + `event`; lô thử 12 cuộc gọi lấp ô trống lớn nhất (A1 ×4, C1 ×4, du lịch/mua sắm/dịch vụ công ×4) + 40 sự cố | như trên + `events.json` | lô xanh, mẫu 10 % Claude soát, bảng điểm Giao tiếp tăng, sàn `--bump` | C1, C5 | M, ~80 lần gọi |

Sau giai đoạn 1 (khi PR mở ≤ 15) – **giai đoạn 2 UI**: màn chế độ Call (4.3) + tổng kết số đo (4.5) + Call of the day; màn sổ mẫu câu 4 bước; Play & Speak sinh từ kịch bản; trung gian. Mỗi màn: Stitch, đủ 15 ngôn ngữ, ảnh 1280/375 qua `call-qa.yml`.
**Giai đoạn 3 – quy mô**: xưởng chạy đêm tới đích; roleplay vô hạn (sau #311 M3); câu chuyện "mùa" + trí nhớ người học; Say-native 20 loạt; GOP phát âm.

### 12.3 Đích khối lượng (nâng chỉ tiêu `content-score.mjs` khi đạt – chỉ tăng)
| Hạng mục | Nay | Chuẩn bảng điểm hiện tại | Đích kế hoạch này |
|---|---|---|---|
| Cuộc gọi | 11 | 60 | 60 (gđ 2) → 230 (≈ 96 chủ đề × 2–3 cấp chính) |
| Biến thể câu giáo viên | 0 | – | 3–5/nút/cấp cho 100 % nút |
| Roleplay | 16 | 60 | 60 → 200 (sinh từ kịch bản) |
| Tình huống Play & Speak | 1 | 40 | 40 → 120 |
| Sổ mẫu câu | 0 (100 hạt giống) | 100 | 112 (+12 chiến lược) |
| Kịch bản `sc:` | 0 | – | ~600 |
| Sự cố | 0 | – | ≥ 40 → 120 |
| Kho cụm | ~55 call + rải rác | – | ~3.000 |
| Bài ngữ pháp | 77 | ~140 (`CONTENT-WORLD-PLAN.md`) | +12 `spoken` |
Nâng chuẩn trong `content-score.mjs` chỉ trong cùng PR với lô nội dung đủ bù để điểm mảng không giảm – không bao giờ hạ sàn `score.budget.json`.
