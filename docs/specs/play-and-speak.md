# Play & Speak: vừa học vừa chơi, luyện nói theo tình huống (spec-lite, CHỜ CHỦ DUYỆT)

> TL;DR: Gom các phần đã có (Call, Roleplay, Confidence, Pron, game/league/streak) thành MỘT vòng "Tình huống → Nói theo → Nhập vai → Chơi", chấm điểm ngay trên máy, $0. P0 gồm 3 việc: (1) bộ 40 tình huống × 12 mẫu câu, (2) bài "Nói theo 3 nhịp" chấm tức thì, (3) nhiệm vụ "Nói mỗi ngày" nối vào streak và league. Spec chưa có code. Viết 31/10/2026.
> Đọc khi: duyệt hoặc giao việc luyện nói theo tình huống, mini-game nói, hay nhập vai AI.

## 1. Đã có gì, còn yếu chỗ nào (main de5b6c45b)
| Phần (doc sở hữu) | Đã có | Yếu |
|---|---|---|
| Call Ama/Carlos ([CALL.md](../CALL.md)) | Cuộc gọi rẽ nhánh, khẩu hình, tóm tắt cuối buổi kèm sửa lỗi và câu cần nói lại | Chỉ có 11 kịch bản cố định; không chấm theo âm vị |
| Roleplay công việc ([CONFIDENCE.md](../CONFIDENCE.md), [AI-LOCAL.md](../AI-LOCAL.md)) | 16 kịch bản; AI đóng vai, chấm 4 tiêu chí, viết lại 3 câu | AI miễn phí ít: Nano chỉ có trên Chrome máy tính, Gemini khoảng 20 lượt/key/ngày; không chấm phát âm |
| Confidence | 24 bài, 169 mẫu câu, thử thách nói 2 phút mỗi ngày (đo tốc độ, chỗ ngừng, từ đệm) | Chỉ có 2 đề mỗi ngày; điểm chỉ lưu localStorage |
| Pron (44 âm, cặp tối thiểu, "Say it", nhịp, nói đuổi) | Web Speech + Whisper wasm làm dự phòng | Mới chấm theo chữ (`UI.recognize`); GOP vẫn là R&D ([pron-phoneme-plan.md](../research/pron-phoneme-plan.md)), PR #281/#286 đang làm |
| Bài trộn ([LESSON-ENGINE.md](../LESSON-ENGINE.md)) | Có dạng "nói theo" và "nhìn hình nói từ" | Chỉ ở mức từ; PR #277 đang giữ `web/js/lesson/*` |
| game.js, league, streak ([GAME-FEEL.md](../GAME-FEEL.md), [RETENTION.md](../RETENTION.md)) | XP, nhiệm vụ (có chỉ số `spoken`), 6 hạng league, streak freeze | Lớp cảm giác chơi đang tắt (`?feel=1`); streak mới bật cho 10% |

**Khoảng trống lớn nhất:** đã có đủ mảnh nhưng chưa có một vòng luyện nói theo tình huống liền mạch. Nội dung giao tiếp hằng ngày còn mỏng: khoảng 27 kịch bản và 169 mẫu câu, chưa gom theo tình huống.

## 2. App top làm gì, mình hơn ở đâu
| App | Giữ chân | Luyện nói | Chấm | Điểm yếu mình tận dụng |
|---|---|---|---|---|
| Duolingo | Streak, league, nhiệm vụ, nhân vật | Video Call với Lily, Roleplay | Đạt/không đạt, AI tóm tắt | Video Call và Roleplay chỉ có trong gói Max trả phí; luyện nói ngắn |
| Speak | Bài theo chủ đề, lặp nhiều lần | Lặp mẫu câu rồi nói tự do với AI tutor | Phản hồi phát âm và ngữ pháp | Trả phí; chạy trên cloud |
| ELSA | Mục tiêu và điểm theo ngày | Từ, câu, AI hội thoại | Theo âm vị, tô màu từng âm | Ít yếu tố chơi; phần lớn khoá sau paywall |
| Praktika | Avatar AI như người thật | Nói tự do với avatar | AI nhận xét | Trả phí; avatar 3D |
| Cake | Clip ngắn kiểu mạng xã hội | Nói theo câu trong clip | Nhận dạng giọng nói | Chấm lỏng; nội dung không theo lộ trình |
| Babbel | Hội thoại theo bài | Nhận dạng câu, Babbel Speak | Đúng/sai | Ít yếu tố chơi |
| Busuu | Cộng đồng sửa bài cho nhau | Ghi âm để người bản ngữ chấm | Người thật chấm (chậm) | Phải chờ lâu |
| Memrise | Clip người bản ngữ, MemBot | Nói theo clip, chat AI | Lỏng | Chấm phát âm yếu |

**Mình làm HƠN được 5 điểm:**
1. Mọi phần (nhập vai, gọi giáo viên, chấm âm) miễn phí 100%, trong khi app khác bắt trả tiền.
2. Chấm ngay trên máy: chạy offline, giọng không rời máy người học.
3. Sửa lỗi theo tiếng mẹ đẻ: cặp âm dễ nhầm riêng cho người Việt, mẹo bằng 15 ngôn ngữ giao diện.
4. Nối với add-on: từ người học vừa tra trên web thành câu để luyện nói. App khác không có kênh này.
5. Một cặp giáo viên 2D đồng nhất ở mọi nơi.

## 3. Tính năng đề xuất (chi phí đều $0; "hút" tính trên thang 1–5)
| # | Tính năng | Ưu | Nhược / rủi ro | Hút | Khó | Chạy bằng gì | Xung đột |
|---|---|---|---|---|---|---|---|
| F1 | **Gói tình huống** (40 tình huống × 12 mẫu câu × 2 biến thể, A1–B2) | Nền nội dung cho mọi phần khác | Viết và kiểm tốn công; có thể sai văn phong bản ngữ | 4 | TB | Kho Gemini + Workers AI tài khoản 2 ([CONTENT-QA.md](../CONTENT-QA.md)); audio TTS theo [WORD-AUDIO.md](../WORD-AUDIO.md) | Không. Thư mục mới `content/situations/` |
| F2 | **Nói theo 3 nhịp**: nghe → nói đuổi → che câu tự nói, chấm từng câu, tô màu từ sai | Lặp có chủ đích, thấy ngay mình tiến bộ | Web Speech trên iOS kém → dùng Whisper wasm dự phòng | 5 | TB | `UI.recognize`; GOP khi #286 gộp (cùng API, chỉ bật cờ) | Dùng API chấm của #281/#286, không sửa file của PR đó; dạng bài mới chỉ đăng ký vào lesson engine SAU khi #277 gộp |
| F3 | **Nhiệm vụ nhập vai**: Call/Roleplay theo tình huống, có danh sách việc cần làm ("gọi món, hỏi giá, đổi món") | Giống Speak và Duolingo Max nhưng miễn phí | AI ít quota → mỗi lượt nói nhận ý định ngay trên máy (từ khoá + mẫu câu F1, Nano nếu có); LLM chỉ dùng cho tóm tắt cuối buổi, có trần | 5 | Cao | `call/engine.js` + bộ khớp ý định cục bộ; `/api/ai` có giới hạn | Mở rộng dữ liệu Call/Roleplay, không đổi engine |
| F4 | **Nói mỗi ngày** (3 phút, 1 tình huống/ngày), tính vào nhiệm vụ, streak, league | Thói quen hằng ngày, tận dụng chỉ số `spoken` sẵn có | Phụ thuộc cờ `ret` đang bật 10% | 4 | Thấp | game.js QUEST_POOL + Confidence daily | Thẻ trên Home chỉ thêm sau khi #284 gộp; giao diện qua ref Stitch, chờ chủ duyệt |
| F5 | **Mini-game nói** "Thả diều" (nói đúng câu → diều bay cao, đua với bóng ma điểm hôm qua) | Vui, ngắn, chơi lại nhiều lần | Phải để ý độ trễ chấm; game cần chủ duyệt hình | 5 | TB | Canvas + Web Audio Sfx; chấm như F2 | Lớp game-feel tự duyệt khi ≥95; hình mới vẫn cần chủ OK |
| F6 | **Bản đồ âm khó của bạn**: lỗi âm gom lại → bài luyện riêng, lên lịch theo FSRS | Cá nhân hoá kiểu ELSA | Cần GOP để đủ chính xác | 4 | TB | Dữ liệu chấm F2 + `pron/skills.js` | Chờ #286 |
| F7 | **Nói từ vừa tra** (add-on → app): từ đã lưu tự sinh câu mẫu từ F1 để luyện nói | Riêng mình có; kéo người dùng add-on sang app | Câu ghép phải qua cổng QA | 4 | TB | Danh sách từ đã lưu + kho câu F1 | Add-on đồng bộ cả khối ([CWS-RULES.md](../CWS-RULES.md)) |
| F8 | **Ngữ điệu karaoke**: đường cao độ của giáo viên chồng lên đường của người học | Không app nào trong bảng có, nhìn đẹp | Đo cao độ trên điện thoại yếu bị nhiễu | 3 | Cao | Web Audio autocorrelation, chạy trên máy | Không |
| F9 | **Thách bạn** qua link: gửi điểm (không gửi âm thanh), đua bất đồng bộ | Lan truyền tự nhiên | Có thể bị gian lận → máy chủ chỉ lưu điểm tổng, có giới hạn | 3 | TB | D1 ghi nhỏ, nằm trong 100k/ngày | Tính XP theo league hiện có |

Luật chung: không dùng tim hay năng lượng; không tự gửi audio lên máy chủ (chỉ gửi khi có đồng ý và người học bấm "AI nhận xét"); mỗi tính năng có công tắc ở Quản trị; tôn trọng reduced-motion.

## 4. Ưu tiên và lộ trình
- **P0:** F1 (bản thử: 5 tình huống), F2, F4.
- **P1:** F1 đủ 40 tình huống, F3, F5, F6.
- **P2:** F7, F8, F9.

| Mốc | Giao | Điều kiện qua |
|---|---|---|
| M0 | Chủ duyệt spec này và 2 ref Stitch (màn "Nói theo 3 nhịp", màn tình huống; sáng và tối) | Chủ OK trên ảnh |
| M1 (thử nhỏ) | 5 tình huống × 12 câu, F2 và F4 sau cờ `speak_pack`, bật cho 10% | Qua cổng QA; ≥60% người mở xong 1 tình huống; tỉ lệ nhận dạng ≥85% với câu đúng |
| M2 | Đủ 40 tình huống, F3 nhiệm vụ, F6 (nếu #286 đã gộp) | D7 của nhóm dùng F2 ≥ nhóm không dùng +5 điểm % |
| M3 | F5 mini-game, F7 | Game-feel ≥95; chủ duyệt hình |
| M4 | F8, F9 | Đo nhiễu cao độ trên Android tầm trung |

## 5. Kế hoạch nội dung và cổng chất lượng
- **40 tình huống, chia 8 nhóm** (mỗi nhóm 5): ăn uống (gọi món, đặt bàn, thanh toán…); mua sắm; đi lại và sân bay; khách sạn và thuê nhà; sức khoẻ và nhà thuốc; công việc (phỏng vấn, họp, email nói, gọi khách); giao tiếp xã hội (làm quen, mời, xin lỗi, small talk); sự cố (mất đồ, khiếu nại, hỏi đường, gọi cấp cứu).
- **Mỗi tình huống:** 12 mẫu câu (6 người học nói, 6 người kia nói), mỗi câu 2 biến thể lịch sự/thân mật; tổng 480 câu gốc, 960 biến thể. Đi kèm 1 hội thoại mẫu 8–10 lượt, 1 nhiệm vụ F3 và 3 câu "bẫy" cho người Việt (âm cuối, nối âm, trọng âm).
- **Ghi chú nghĩa bản ngữ** đủ 15 ngôn ngữ qua [I18N-PIPELINE.md](../I18N-PIPELINE.md) và i18n-qa.
- **Cổng chất lượng:** `content/situations/` đăng ký vào `content/qa/sources.json`; qua 7 lớp của gate. Mỗi câu được 2 giám khảo khác họ chấm: độ tự nhiên ≥4/5, đúng CEFR, độ dài ≤12 từ ở A1–A2; hai giám khảo lệch ≤1. Baseline chỉ được giảm.
- **Audio:** giọng nữ Ama, giọng nam Carlos (CI kiểm), chuẩn hoá −16 LUFS, tốc độ ≤150 wpm, kèm bản chậm.
- **Chấm điểm:** điểm câu = khớp chữ (Web Speech hoặc Whisper) × 0,6 + GOP × 0,4 khi có GOP; nếu không, dùng 100% khớp chữ. Kết quả "không rõ" thì không trừ điểm. Hiệu chuẩn trên 50 bản ghi thật của người dùng thử nội bộ (không dùng tài khoản thật); đặt ngưỡng đạt sao cho tỉ lệ đạt rơi vào khoảng 80–85% ([LEARNING-PATH.md](../LEARNING-PATH.md)).

## 6. Definition of Done (theo METHODS "Làm đúng 1 lần")
Khung app ≤377 KB gz: phần mới tải lười theo route. Chạy offline. Nhãn a11y đầy đủ, mục bấm ≥44 px. Tương phản đạt cổng CI. Có cờ tắt và cách quay lại. Có test (unit cho chấm điểm và khớp ý định, learn-flow cho F2). Giao diện port trung thành từ ref Stitch (Kit, khung 390 px), giáo viên lấy qua `Chars.*`. Không bỏ hay nới bất kỳ test, ngưỡng hay nội dung nào.
