# LEARN-UX-GAP – học trên web vs chuẩn "hấp dẫn + thực tế" (27/11/2026)

Yêu cầu owner 27/11: "học trên web chưa hấp dẫn, chưa thực tế bằng Duolingo". Tài liệu này = bảng điểm + top 10 PR nhỏ. Kế thừa `docs/agents/DUO-GAP.md` (21/10, đã làm: combo, chấp nhận lỗi nhỏ, câu khó, tắt mic/âm, bảng phản hồi, màn cuối) – KHÔNG lặp lại các mục đó.

## 0. Ràng buộc & phương pháp
- KHÔNG cài/tự động hoá app Duolingo (ToS, APK ngoài store). Chỉ dùng nguồn công khai bên dưới. Không chép thương hiệu/nhân vật/giao diện: dùng Stitch design system + nhân vật 2D (Kit) của mình.
- Chấm điểm hiện tại = **đọc code luồng thật** (`app.js` welcome/setup, `path-day.js`, `path-reward.js`, `study.js`, `lesson-fx.js`, `streak-ui.js`, `call/calls.js`, SRS `core.js`) + `learn-flow.mjs`. **Chưa** có lượt Playwright thật ngày 1→ngày 2 → đó là PR #1 (CI, không chạy trên Mac); điểm dưới đây là ước lượng, sẽ chốt bằng lượt đó.

## 1. Nguồn công khai (tóm tắt, đã tìm 27/11)
- Birdbrain: mô hình kiểu IRT/logistic ước năng lực người học + độ khó từng bài tập, chọn bài tập kế tiếp theo năng lực – [IEEE Spectrum](https://spectrum.ieee.org/duolingo), [blog Duolingo](https://blog.duolingo.com/how-we-learn-how-you-learn).
- Half-life regression: ước "nửa đời" trí nhớ từng từ để lên lịch ôn – [Settles & Meeder 2016](https://preview.aclanthology.org/fix_video/P16-1174.pdf). Mình đã có SRS retention-target (`core.js`); khác biệt: HLR học từ log người dùng.
- Streak: chuỗi 7 ngày → 2,4× khả năng quay lại hôm sau; **tách mục tiêu ngày khỏi streak: +3,3% D14, +1% DAU** (A/B) – [improving the streak](https://blog.duolingo.com/improving-the-streak), [how streak builds habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit). Cảnh báo: "streak creep" / áp lực khi đứt chuỗi – [Decision Lab](https://thedecisionlab.com/es-ES/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification).
- Thời lượng/độ hiệu quả: [time spent learning well](https://blog.duolingo.com/time-spent-learning-well). Phần số liệu leaderboard/D1 thứ cấp chưa kiểm được → không dựa vào.

## 1b. Luồng Duolingo quan sát được (từ nguồn công khai ĐỌC được)
Giới hạn trung thực: em đọc teardown/blog/báo chí, **không xem video frame-by-frame, không tải APK, không scrape**. Thời lượng và số tương tác từng màn = **chưa đo** (ghi "?"); cần người xem video công khai/ảnh store để điền. Nguồn onboarding thứ cấp, các bản khác nhau theo thời gian và A/B → chỉ lấy mẫu chung.

| Màn | Quan sát (nguồn) | Thời lượng / tương tác | Phản hồi / âm / animation | Giữ chân | Map sang LexKite |
|---|---|---|---|---|---|
| Mở đầu + chọn ngôn ngữ | Linh vật + splash → chọn ngôn ngữ (cờ) → câu hỏi nguồn biết app ([ScreensDesign](https://screensdesign.com/explore/apps/duolingo/onboarding/), [UX review](https://uxdesign.cc/the-duolingo-diaries-an-honest-ux-review-part-1-onboarding-ed0165d44c58)) | ? / 2–3 chạm | linh vật vui | cá nhân hoá sớm | PR #2: nếm bài trước, hỏi sau |
| Mục tiêu ngày | Chọn 5/10/15 phút + nút "cam kết"; streak cần có mục tiêu ([Appcues](https://goodux.appcues.com/blog/duolingo-user-onboarding)) | ? / 1–2 chạm | nút cam kết | sở hữu mục tiêu | PR #3 (mình đã có 3 cường độ ở setup) |
| Xếp trình độ | Người mới vào thẳng mức đầu; người biết rồi làm placement thích ứng bằng bài thật ([Reteno](https://gallery.reteno.com/flows/web-screens-duolingo)) | ? | bài thật thay bảng hỏi | không bắt khai báo | mình có `placement.js`; đặt thành lựa chọn, không chặn bài đầu |
| Bài đầu | Vào bài ngay trong onboarding, trước tạo tài khoản (nhiều teardown) | ~vài phút / nhiều chạm | đúng/sai tức thì | cam kết sau khi đã "thắng" | PR #2 |
| Phản hồi sai | Bảng đúng/sai tức thì, sửa trong cùng lượt (blog [time spent learning well](https://blog.duolingo.com/time-spent-learning-well)) | ? | âm + màu | câu sai quay lại | PR #6, #9 |
| Ôn/thích ứng | Birdbrain chọn bài kế theo năng lực ([IEEE](https://spectrum.ieee.org/duolingo)) | – | – | độ khó vừa sức | PR #7 |
| Streak | Streak + mục tiêu tách riêng +3,3% D14 ([blog](https://blog.duolingo.com/improving-the-streak)) | – | lửa, mốc | thói quen | PR #3 |
| Hội thoại / Video Call | Gọi 1-1 với nhân vật AI, không phạt lỗi, nhờ lặp/nói chậm, **phản hồi sau cuộc gọi**, độ khó theo trình ([blog](https://blog.duolingo.com/video-call), [heise](https://heise.de/-9951940)); gói trả phí, ít ngôn ngữ | ? | nhân vật nói, không chấm giữa chừng | nói thật, ít áp lực | PR #5: mình đã có `call/` → đưa vào luồng ngày, phản hồi cuối cuộc, nút "chậm/lặp lại" |
| Âm thanh/animation cuối bài | **Chưa tìm được nguồn chữ đáng tin** (không dựa trí nhớ) | ? | ? | ? | cần xem video công khai thủ công trước PR #10 |

Việc cần người: xem 3 video công khai (onboarding, bài 1, Video Call) và điền cột "?" – hoặc giao job tải ảnh store công khai bằng tay.

## 2. Bảng điểm (0–10; hiện tại ước lượng → mục tiêu)
| Nguyên tắc | Hiện có (bằng chứng code) | Điểm | Mục tiêu | Khoảng trống chính |
|---|---|---|---|---|
| Bài 3–5 phút | Ngày = 5–10 phút (`path-day.js`), nhiều dạng | 6 | 9 | Không có "bài mini 3 phút" cho người bận; không báo thời lượng còn lại |
| Phản hồi tức thì + giải thích | `.sheet` đúng/sai, 💡 Hiểu sâu (ẩn nếu thiếu ghi chú), ngữ pháp có lời giải | 6 | 9 | Giải thích vắng với từ không có note; chưa "vì sao sai" theo loại lỗi |
| Độ khó thích ứng | Combo 8 đúng → câu gõ; placement đầu vào | 5 | 8 | Thích ứng chỉ trong 1 buổi, không giữa các ngày/bài (không ước năng lực từng kỹ năng) |
| Nói/nghe thật, tình huống đời thực | roleplay, `call/`, pron mic, nghe&chép | 6 | 9 | Hội thoại nằm ngoài luồng ngày (chỉ là "phần thưởng cuối"); thiếu nghe-hiểu hội thoại ngắn có câu hỏi |
| Ôn ngắt quãng | SRS retention 0.9, "từ sắp quên", thẻ đến hạn; ôn nhanh đầu ngày | 7 | 9 | "Ôn nhanh" từng mở màn rỗng (đã fix 5cbf0c7b48); chưa có "ôn sửa lỗi" cuối bài từ câu vừa sai |
| Path rõ | Chặng CEFR → bài → ngày, hộp mục tiêu can-do | 7 | 9 | Hub nhiều lối vào cạnh tranh (Practice/Courses/Path/Plan); ngày 2 không gợi bước tiếp rõ |
| Streak/XP/mục tiêu ngày không áp lực | streak tách khỏi mục tiêu, 3 cường độ, freeze tự động (đã có trên main) | 7 | 9 | Mục tiêu tính theo lượt ôn, chưa theo phút/XP; chưa "sửa chuỗi" bằng bài ngắn |
| Cảm giác tiến bộ | Màn cuối: XP, vòng %, từ cần ôn | 6 | 9 | Chưa có "bạn nhớ N từ tuần này / từ mới biết nói được câu gì" – tiến bộ cụ thể |
| Âm thanh/animation nhẹ | Sfx correct/wrong/win, lesson-fx | 7 | 8 | Chưa có haptic mobile, âm tiến độ theo nhịp, tôn trọng reduced-motion cần kiểm |
| Onboarding → bài đầu | welcome → setup → vào học; demo thẻ ở welcome | 6 | 9 | Phải qua setup trước khi nếm bài; chưa "bài đầu 60 giây trước khi hỏi gì" |

## 3. Top 10 PR nhỏ (xếp theo tác động D1/D7 + đầu ra nói/viết)
Mỗi mục: 1 PR, ship 100% + kill switch (cờ `vb.flag.*`), i18n 15 ngôn ngữ, lazy chunk, đo bằng retention events (xem §4).

| # | PR | Tác động | Đo |
|---|---|---|---|
| 1 | **CI walkthrough** `learn-walk` (Playwright, người mới: welcome→bài đầu→ôn→ngày 2, ảnh + chấm theo bảng §2, 390/1280px) | Chốt điểm thật, chặn thoái lui | job xanh + báo cáo artifact |
| 2 | **Bài đầu 60 giây** trước setup: 5 thẻ nhận diện + 1 câu nói, rồi mới hỏi mục tiêu/trình độ | D1 | `ob_first_lesson_done`, D1 |
| 3 | ~~Mục tiêu ngày tách khỏi streak + cường độ~~ → **ĐÃ CÓ trên main (kiểm 27/11 trên code):** chuỗi = có XP/ôn thẻ trong ngày (`Core.Stats.streak`, `retention.js` helpHtml) KHÔNG phụ thuộc `dailyGoal`; 3 cường độ nhẹ/đều/tăng tốc ở `onboard.js` + `GOALS` ở `retention.js`; đóng băng tự động; lời nhắc không dọa. **Còn lại (gộp vào #8):** mục tiêu đo bằng *lượt ôn* chứ chưa theo *phút/XP*; chưa có "sửa chuỗi bằng 1 bài ngắn" | – | – |
| 4 | **Bài mini 3 phút** ("Ôn nhanh 3 phút"/"1 tình huống") ngay trên Hôm nay | D1–D7 người bận | `mini_start/done` |
| 5 | **Hội thoại vào luồng ngày**: 1 tình huống 4–6 lượt nghe-hiểu + trả lời nói, thay "phần thưởng" tuỳ chọn | Đầu ra nói | `dialog_done`, điểm nói |
| 6 | **Ôn sửa lỗi cuối bài**: câu sai trong lượt hiện lại 1 lần ở cuối (xen kẽ), tính vào SRS | Giữ nhớ, cảm giác tiến bộ | tỉ lệ đúng lần 2 |
| 7 | **Thích ứng giữa các ngày**: ước năng lực theo kỹ năng (nghe/đọc/nói/viết) từ log câu → chọn độ khó/dạng ngày kế (Birdbrain-lite, logistic nhẹ client-side) | D7, đầu ra | `acc_by_skill`, drop-off bài |
| 8 | **Màn "tiến bộ cụ thể"**: "tuần này nhớ N từ · nói được M câu mới", biểu đồ 7 ngày | D7 | `progress_view` → quay lại |
| 9 | **Giải thích mọi câu sai** theo loại lỗi (chính tả/nghĩa/từ loại/nghe) bằng mẫu + dữ liệu có sẵn, không cần note riêng | Phản hồi | `explain_open` |
| 10 | **Haptic + âm nhịp tiến độ + reduced-motion audit** (nhẹ, tắt được) | Cảm giác "sướng" | `fx_off_rate` |

Ghi chú: "sửa chuỗi nhẹ" (đứt chuỗi → khôi phục bằng 1 bài ngắn, không phạt) đưa vào PR #3 nếu còn dư ngân sách; theo Decision Lab, tránh gây áp lực.

## 4. Đo lường
Sự kiện retention tối thiểu (ẩn danh, đã có `core` tracking cần kiểm tên): `ob_first_lesson_done`, `session_start/finish` (+ thời lượng), `goal_set`, `mini_*`, `dialog_done`, `explain_open`. Báo hàng tuần: D1/D7 theo nhóm cờ bật/tắt (kill switch cho phép A/B). Chưa kiểm: tên sự kiện đang có trong code → PR #1 liệt kê.

## 5. Luật mọi PR
Không cắt tính năng/test/ngưỡng; i18n 15 ngôn ngữ; ngân sách khung ≤ 380 KB gz (lazy); visual-qa + learn-flow xanh; nhân vật 2D + Stitch DS của mình; không chép tài sản Duolingo.
