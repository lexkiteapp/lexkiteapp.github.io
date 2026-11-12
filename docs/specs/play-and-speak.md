# Play & Speak: vừa học vừa chơi, luyện nói theo tình huống (spec v2.2, chủ đã duyệt 31/10 – đang ở M0)

> TL;DR: Gom các phần đã có (Call, Roleplay, Confidence, Pron, game/league/streak) thành MỘT vòng: Tình huống → Nghe → Nói theo 3 nhịp → Nhập vai có nhiệm vụ → Chơi → Ôn lại theo FSRS. Chấm ngay trên máy, $0, offline. Ưu thế duy nhất cả thị trường: một app gom đủ nhập vai bằng giọng + chấm âm vị + chạy offline, miễn phí hết, lại nối với add-on. P0 = F1 (thử 5 tình huống), F2, F4 + **cơ chế chủ lực F7-lite** (từ vừa tra trên add-on thành câu để nói ngay trong buổi hôm đó), đo bằng A/B có nhóm đối chứng và tiêu chí dừng. Viết 31/10/2026 (QC độc lập: v1 49 → v2 77 → v2.1 84 → v2.2, xem §8). Chưa có code.
> Đọc khi: duyệt hoặc giao việc luyện nói theo tình huống, mini-game nói, nhập vai AI, chấm nói.

## 1. Đã có gì, còn yếu chỗ nào (main de5b6c45b)
| Phần (doc sở hữu) | Đã có | Yếu |
|---|---|---|
| Call Ama/Carlos ([CALL.md](../CALL.md)) | Cuộc gọi rẽ nhánh, khép môi khớp tiếng, tổng kết lỗi + nói lại câu yếu | Chỉ 11 kịch bản cố định |
| Roleplay ([CONFIDENCE.md](../CONFIDENCE.md), [AI-LOCAL.md](../AI-LOCAL.md)) | 16 kịch bản; AI chấm 4 tiêu chí | Gemini Nano chỉ có trên Chrome máy tính; Gemini ≈ 20 lượt/key/ngày |
| Confidence | 24 bài, 169 mẫu câu, đo wpm/ngừng/từ đệm | Chỉ 2 đề/ngày; điểm chỉ lưu localStorage |
| Pron | 44 âm, cặp tối thiểu, Say it, nói đuổi; Web Speech + Whisper tiny.en q8 (~40 MB) | Chấm theo chữ (`UI.recognize`); GOP mới ở R&D ([pron-phoneme-plan.md](../research/pron-phoneme-plan.md)), #281/#286 |
| Bài trộn ([LESSON-ENGINE.md](../LESSON-ENGINE.md)) | Nói theo, nhìn hình nói từ | Chỉ ở mức từ |
| game, league, streak ([GAME-FEEL.md](../GAME-FEEL.md), [RETENTION.md](../RETENTION.md)) | XP, nhiệm vụ (chỉ số `spoken`), 6 hạng league, freeze | Lớp cảm giác chơi đang tắt; `ret_pct` = 10 |

Khoảng trống: thiếu một vòng nói theo tình huống liền mạch; mới có khoảng 27 kịch bản và 169 câu.

## 2. App top (kiểm lại 31/10/2026) và chỗ mình hơn
| App | Luyện nói và chấm | Giữ chân | Lỗ hổng mình khai thác |
|---|---|---|---|
| Duolingo | Video Call, Roleplay (gói Max, trả phí); Adventures (truyện nhập vai) | Streak, league, nhiệm vụ, nhân vật | Phần nói hay nằm trong gói trả phí; chấm đạt/không đạt |
| Speak | Free Talk, roleplay, chấm âm vị, tự tạo bài | Lặp nhiều lần theo chủ đề | Trả phí; chạy trên cloud |
| ELSA | Chấm âm vị tô màu; roleplay và tự tạo tình huống (bản free bị giới hạn); Speech Analyzer 5 chiều | Mục tiêu theo ngày | Ít yếu tố chơi; phần lớn sau paywall |
| Praktika | Avatar AI có **nhớ** ngữ cảnh người học | Quan hệ với tutor | Trả phí; cần cloud |
| Cake | Nói theo clip; AI tutor | Clip ngắn, phần lõi free | Chấm lỏng; thiếu lộ trình |
| Babbel | Babbel Speak (beta 9/2025): kịch bản AI ngắn 5–6 lượt | Bài theo giáo trình | Hội thoại ngắn; ít yếu tố chơi |
| Busuu | AI Conversations theo CEFR (từ 10/2024) + cộng đồng chấm | Cộng đồng | Người thật chấm chậm |
| Memrise | Clip người bản ngữ, bài nói lặp lại; MemBot chỉ chat chữ | Video bản ngữ | Chat AI không có giọng, chấm nói lỏng |

**Lợi thế thật (không phải "chỉ mình free"):**
1. Trong một app: nhập vai bằng giọng + chấm âm vị + chơi + chạy offline, 0 đồng, không trần lượt nói. Mỗi đối thủ chỉ có một phần.
2. Riêng tư: âm thanh không rời máy (mặc định).
3. Lỗi theo tiếng mẹ đẻ của 15 ngôn ngữ giao diện, không chỉ người Việt.
4. Cầu nối add-on (F7): từ người học tra trên web hôm nay thành câu để nói tối nay.
5. **Trí nhớ tutor kiểu Praktika nhưng $0:** Ama/Carlos nhớ tên, mục tiêu, lỗi cũ của người học (lưu trên máy) và gọi lại trong cuộc sau.

## 3. Phương pháp (cơ sở nghiên cứu → luật thiết kế)
- **Học theo cụm từ** (Lewis 1993; Boers & Lindstromberg 2009): đơn vị dạy là mẫu câu, không phải từ rời.
- **Nói đuổi** (shadowing, Hamada 2016): nhịp 2 cải thiện ngữ điệu và khả năng nghe.
- **Nhớ lại có chủ đích** (Roediger & Karpicke 2006) + **giãn cách** (Cepeda 2006): nhịp 3 che câu đi; mỗi câu F1 là một thẻ FSRS (không chỉ âm lỗi).
- **Phải nói ra + nhận phản hồi** (Swain 1985; Lyster & Ranta 1997): sửa bằng cách nhắc lại câu đúng (recast) cho ngữ pháp, sửa trực tiếp cho âm. Mỗi lần tối đa 1–2 lỗi.
- **Tách trôi chảy và chính xác** (Nation, 4/3/2): vòng "Nói thoải mái" không sửa lỗi, chỉ đo wpm và độ ngừng; vòng "Nói chuẩn" chấm từng từ.
- **Gợi ý mờ dần trong buổi**: đủ chữ → chữ cái đầu → trống. **Thời lượng nói tăng theo CEFR**: A1 câu ≤ 6 từ; B2 trả lời mở 30–45 s.
- **Câu trả lời mở**: mỗi tình huống có 2 câu "trả lời theo ý bạn", chấm bằng ý định + từ khoá, không bắt khớp nguyên văn.

## 4. Tính năng (đều $0; độ hút trên thang 5)
| # | Tính năng | Ưu | Nhược / rủi ro → cách chặn | Hút | Khó | P |
|---|---|---|---|---|---|---|
| F1 | **Gói tình huống**: P0 thử 5 → P1 40 → P2 120 | Nền cho mọi phần | Văn phong không tự nhiên → cổng 2 giám khảo (§6) | 4 | TB | P0 |
| F2 | **Nói theo 3 nhịp** (nghe → đuổi → che câu) + vòng trôi chảy/chính xác, tô màu từ sai | Lặp có chủ đích, thấy tiến bộ ngay | iOS Web Speech yếu → Whisper (§5) | 5 | TB | P0 |
| F4 | **Nói mỗi ngày** 3 phút, kèm "câu cho ngày mai" | Thói quen hằng ngày; dùng `spoken` sẵn có | Trùng nhóm `ret` → chia nhóm riêng (§7) | 4 | Thấp | P0 |
| F3 | **Nhiệm vụ nhập vai** (danh sách việc cần làm, Ama/Carlos nhớ người học) | Ngang Speak/Duolingo Max, mà free | Ít quota → nhận ý định trên máy, LLM chỉ tổng kết (§5) | 5 | Cao | P1 |
| F5 | **Thả diều**: nói đúng thì diều lên, đua với bóng ma điểm hôm qua | Vui, chơi lại nhiều | Độ trễ → ngân sách ≤300 ms phản hồi | 5 | TB | P1 |
| F6 | **Bản đồ âm khó** → bài riêng theo FSRS | Cá nhân hoá kiểu ELSA | Chờ GOP #286 | 4 | TB | P1 |
| F7 | **Nói từ vừa tra** (add-on → app). Bản lite ở M1: chỉ ghép từ đã lưu với câu F1 có sẵn, không cần sinh câu mới | Chỉ mình có; là cơ chế chủ lực, được đo trong A/B | Câu ghép phải qua QA; không thêm quyền add-on (permissions.lock) | 5 | TB | P0 lite / P1 đủ |
| F9 | **Đua với bạn** qua link (chỉ gửi điểm, không gửi âm thanh) | Lan truyền tự nhiên | Gian lận → máy chủ ký điểm (HMAC theo phiên), trần XP/ngày, giới hạn tốc độ theo IP băm | 4 | TB | P1 |
| F8 | **Ngữ điệu karaoke** (đường cao độ chồng lên nhau) | Đẹp, dễ hiểu | Nhiễu trên máy yếu → tự tắt khi độ tin < 0,6 | 3 | Cao | P2 |
| F10 | **Nói thoải mái kiểu IELTS** (Speech Analyzer miễn phí: wpm, ngừng, đa dạng từ, độ dài câu, ý định) | Đối đầu ELSA Speech Analyzer | Không có band thật → ghi "ước lượng" | 4 | TB | P2 |

**Vòng thưởng (không tim, không năng lượng):**
- Mỗi tình huống có 3 sao: ★ đạt; ★★ không gợi ý; ★★★ nói từ trí nhớ trong giới hạn thời gian.
- Bản đồ tình huống mở dần theo nhóm.
- Rương thưởng ngẫu nhiên sau mỗi lần xong: trang phục cho diều, freeze, sticker Ama/Carlos 2D (thưởng cho việc nói, không bán).
- Huy hiệu "Thạo tình huống".
- Cuối buổi: xem trước tình huống ngày mai.
- **Lý do quay lại giữa tuần**: mục tiêu nói hằng tuần (ví dụ 50 câu; có thể **ghép đôi với 1 bạn**, cùng góp vào một mục tiêu chung, chỉ gửi số câu, M2) và sự kiện chủ đề mỗi tháng (du lịch hè, phỏng vấn mùa tuyển dụng) dùng chung mùa với RETENTION.
- Nhắc học theo [REMINDERS.md](../REMINDERS.md).

## 5. Chấm điểm: hợp đồng, hiệu chuẩn, độ trễ, quota
**Hợp đồng API** (một chỗ duy nhất, bọc `UI.recognize` + GOP của #281/#286, không sửa file của các PR đó):
`Speak.score({target, mode:'drill'|'free'|'game', intents?}) → {engine:'webspeech'|'whisper'|'gop', text:0–1, gop?:0–100, words:[{w,ok,phones?}], fluency:{wpm,pauses}, intent?, conf, ms}`

**Luật đạt:**
- Điểm câu do hồi quy logistic khớp trên tập hiệu chuẩn (không dùng trọng số tự đặt).
- Kết quả "không rõ" được miễn phạt 2 lần đầu. Từ lần thứ 3: gợi ý, cho qua nhưng không được sao (chặn lách bằng cách nói lí nhí).

**Hiệu chuẩn chạy trên CI, dữ liệu miễn phí có giấy phép dùng thương mại:**
- speechocean762 (CC BY 4.0, 5.000 câu có điểm chuyên gia).
- Common Voice English (CC0), lấy ≥ 6 giọng L1 thuộc 15 ngôn ngữ giao diện, ≥ 300 câu.
- Thêm bản ghi người thử nội bộ (không dùng tài khoản thật). Ít nhất nhóm người học Việt: 30 câu × 2 người chấm, báo PCC riêng cho từng L1 có dữ liệu.
- Ngưỡng đạt chuẩn:
  - Tương quan với điểm chuyên gia PCC ≥ 0,6 (GOP).
  - Tỉ lệ chấm sai câu đúng ≤ 10% mỗi nền tảng.
  - **Công bằng (nói rõ phạm vi):** cổng chỉ đo tỉ lệ chấm sai câu đúng giữa các giọng L1 (lệch ≤ 5 điểm %), chưa đo độ chính xác điểm. speechocean762 chỉ có người nói L1 tiếng Trung; nhãn giọng của Common Voice do người nói tự khai. CI liệt kê L1 nào đủ ≥ 30 câu. L1 nào thiếu thì phải thu ≥ 30 câu nội bộ trước khi tuyên bố công bằng. Ghi nguồn speechocean762 theo CC BY.
  - Tỉ lệ đạt mục tiêu 80–85% ([LEARNING-PATH.md](../LEARNING-PATH.md)).

**Chọn bộ chấm theo nền tảng và ngân sách độ trễ** (p75, tính từ lúc dứt câu):
| Nền tảng | Bộ chấm | Độ trễ |
|---|---|---|
| Chrome / Edge | Web Speech (`processLocally` khi có), GOP khi #286 gộp | ≤ 800 ms |
| Safari iOS, Firefox | Whisper tiny.en q8 (~40 MB, tải sau khi đồng ý, chỉ qua Wi-Fi, cache; RAM ≤ 300 MB trên Android tầm trung). Chưa tải được thì dùng chế độ chạm ghép câu, không được sao | ≤ 2,5 s, có hiệu ứng "đang chấm" |
| Android WebView / app | Web Speech nếu có, không thì Whisper | như trên |
| Add-on | Mở tab app (add-on không có mic, không thêm quyền) | — |
| F5 game | Bộ chấm nhanh nhất có sẵn | ≤ 300 ms phản hồi |

**Quota $0:**
- Mỗi lượt nói **không gọi LLM**. Ý định được nhận trên máy, theo thứ tự: từ khoá/mẫu câu F1 → embedding nhỏ nếu đo thấy cần → Gemini Nano nếu có.
- LLM chỉ dùng cho tổng kết F3, tối đa 1 lần/người/ngày. Lọc Llama Guard chỉ chạy khi có chữ tự do gửi lên (≈ +50 neurons/lần, tính vào trần dưới). Embedding ý định (nếu cần) phải ≤ 25 MB, chạy trên máy, tải lười, tính vào ngân sách tải cùng Whisper.
- Chuỗi dự phòng: Nano → kho Gemini (K key × ~20) → Workers AI (≤ 50% của 10k neurons, có cầu dao trong `_quota.js`) → tổng kết từ mẫu, không LLM.
- Trần người dùng AI/ngày ≈ 20K + 5.000 ÷ ~350 neurons (tổng kết + lọc) mỗi lần tổng kết (ước tính) ≈ 20K + 14. Số neurons thật đo ở M1 rồi sửa lại. Quá trần vẫn chơi đủ, chỉ phần tổng kết dùng mẫu. D1: ≤ 3 lượt ghi/người/ngày (điểm, sao, XP), nằm trong 100k ([QUOTAS.md](../QUOTAS.md)).

## 6. Nội dung và cổng chất lượng
**Schema `content/situations/<id>.json`:**
`{id, group, cefr, title{15}, goal{15}, roles, lines:[{id, who, en, variants:{polite,casual}, gloss{15}, audio:{voice,slow}, pitfalls:[{l1,note{15}}], open?}], dialogue[8–10], listening[2], mission:{tasks:[{id,intents[]}]}, culture{15}}`

**Phạm vi:**
- 8 nhóm: ăn uống, mua sắm, đi lại/sân bay, khách sạn/thuê nhà, sức khoẻ, công việc, giao tiếp xã hội, sự cố.
- Mỗi tình huống có:
  - 12 mẫu câu × 2 biến thể (lịch sự/thân mật);
  - 2 câu trả lời mở;
  - 1 hội thoại mẫu;
  - 2 bài nghe tốc độ bản ngữ;
  - 1 ghi chú văn hoá;
  - 3 câu bẫy, mỗi ngôn ngữ giao diện (14 + vi) ≥ 1 bản đồ lỗi L1.
- Tổng: 40 tình huống (P1) = 480 câu gốc + 960 biến thể; 120 tình huống (P2) = 1.440 câu gốc.

**Cổng chất lượng:**
- Sinh bằng kho Gemini / Workers AI tài khoản 2 ([CONTENT-QA.md](../CONTENT-QA.md)).
- Đăng ký `content/qa/sources.json`, qua 7 lớp gate.
- 2 giám khảo khác họ: độ tự nhiên ≥ 4/5, đúng CEFR, ≤ 12 từ ở A1–A2; lệch ≤ 1.
- Baseline chỉ được giảm.
- Bản đồ lỗi L1: ngoài 2 giám khảo AI, mỗi ngôn ngữ có 1 người bản ngữ duyệt (cộng tác viên miễn phí hoặc cờ báo lỗi trong app qua [REPORTS.md](../REPORTS.md)). Chưa duyệt thì ẩn ghi chú đó.
- Ghi chú 15 ngôn ngữ qua [I18N-PIPELINE.md](../I18N-PIPELINE.md) + i18n-qa.
- Audio theo [WORD-AUDIO.md](../WORD-AUDIO.md): Ama nữ, Carlos nam (CI kiểm), −16 LUFS, ≤ 150 wpm + bản chậm.
- Giọng phụ (en-GB/en-AU) cho bài nghe chỉ dùng khi anh duyệt (vẫn không thêm nhân vật).

## 7. Rủi ro, đo lường, thử nghiệm
**Rủi ro:**
- **PR đang mở:** #277/#284/#281 (phiên đã xong; kiểm đã gộp chưa trước khi code): chỉ thêm dạng bài, thẻ Home và đọc API chấm, không sửa file lõi của các phần đó. #286: F6 chờ.
- **Quyền riêng tư:** âm thanh mặc định ở trên máy; chỉ gửi bản chữ khi người học bấm "AI nhận xét". Khai báo Data safety / CWS ghi "xử lý giọng nói trên thiết bị" ([STORE-READINESS.md](../STORE-READINESS.md)).
- **Trẻ vị thành niên:** khi chưa rõ tuổi hoặc dưới 13, tắt nhập vai chữ tự do với LLM, chỉ dùng kịch bản.
- **Lạm dụng:** chữ tự do lọc qua Llama Guard (Workers AI) và lời nhắc chặn lệnh trước khi tới LLM.
- **Người không muốn hoặc không thể nói** (từ chối mic, nơi đông người, khuyết tật): chế độ "chạm ghép câu / gõ". Vẫn giữ streak, được tối đa ★. Điểm đọc qua `aria-live`.

**Thử nghiệm M1 (A/B thật, dùng cơ chế nhóm `lk.rb` của RETENTION):**
- Nhóm: `speak_pct` cho nhóm 90–99 bật, nhóm 80–89 làm đối chứng; không chồng lên nhóm `ret` 0–9.
- Chỉ số chính: **tỉ lệ người nói ≥ 1 câu vào ngày thứ 7**.
- Chỉ số phụ: D7 chung, số câu nói/người.
- Ngưỡng an toàn: D1 chung, lỗi JS, thời gian chạy, tỉ lệ từ chối mic.
- Cỡ mẫu: độ lệch nhỏ nhất cần thấy 3 điểm % trên nền ~20% → ≈ 3.000 người/nhóm, ≥ 14 ngày. Kiểm lưu lượng trước M1: người mới đủ điều kiện mỗi ngày × 10% × 14 phải ≥ 3.000. Thiếu thì kéo dài thử nghiệm hoặc tăng lên 20%/20%.
- **Tiêu chí dừng:** D1 giảm ≥ 1 điểm %, hoặc lỗi JS tăng, hoặc chấm sai câu đúng > 10% → tắt cờ, sửa theo loại lỗi.
- Ghi số liệu: `ext_events` kind `spk:…`, không lưu PII.

## 8. Lộ trình, chủ việc, Definition of Done
| Mốc | Giao | Chủ việc (≤ 2 phiên cùng lúc) | Điều kiện qua |
|---|---|---|---|
| M0 | Anh duyệt spec + 3 ref Stitch (tình huống, Nói theo 3 nhịp, bản đồ/sao), sáng và tối | xưởng Stitch | Anh OK trên ảnh |
| M1 | 5 tình huống; `Speak.score` + hiệu chuẩn CI; F2 + F4 + F7-lite sau cờ | 1 phiên nội dung + 1 phiên code | QA xanh, ngưỡng §5, A/B §7 |
| M2 | 40 tình huống; F3 có trí nhớ; F6; F7 | như trên | A/B thắng, không vi phạm ngưỡng an toàn |
| M3 | F5, F9 | phiên game | game-feel ≥ 95 + anh duyệt hình |
| M4 | F8, F10, 120 tình huống | phiên mới | đo nhiễu Android tầm trung |

**DoD:**
- Khung ≤ 377 KB gz, phần mới tải lười theo route.
- Chạy offline, trừ tổng kết AI.
- a11y: mục bấm ≥ 44 px, `aria-live`, chế độ không mic.
- Tương phản đạt cổng CI.
- i18n 15 ngôn ngữ, CI chặn thiếu khoá.
- Whisper chỉ tải khi người học đồng ý.
- Có cờ tắt + cách quay lại.
- Test: unit `Speak.score`/ý định, hiệu chuẩn, learn-flow F2.
- Port trung thành từ ref Stitch (Kit, khung 390 px); giáo viên qua `Chars.*`.
- Không bỏ/nới test, ngưỡng hay nội dung nào (luật no-cuts).

**QC spec:** giám khảo độc lập, cùng 10 tiêu chí: v1 = 49/100 → v2 = 77/100 → v2.1 84/100 → v2.2 sửa nốt 5 điểm (giám khảo ước +5–6). Lên 95 cần số đo thật từ M1 (PCC theo L1, A/B).
