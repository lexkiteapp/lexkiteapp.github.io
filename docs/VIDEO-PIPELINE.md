# Pipeline video hội thoại tiếng Anh tự động (nhân vật ảo · khớp miệng · phụ đề karaoke)

Mục tiêu: mỗi ngày tự sinh video ngắn (Shorts/Reels/TikTok 9:16) + bài học dài (YouTube 16:9) với dàn nhân vật Lexkite đồng nhất, giọng chuẩn, khớp miệng, phụ đề karaoke tiếng Anh (+ dòng dịch theo ngôn ngữ người xem), đăng social, nhúng vào app. **Chi phí vận hành $0** (Kling chỉ dùng 1 lần để thiết kế nhân vật).

## 0. Nguyên tắc
- **Nhân vật đồng nhất tuyệt đối** = rig 2D (ảnh tách lớp + bộ khẩu hình + bộ biểu cảm), KHÔNG vẽ lại bằng AI mỗi clip (AI video mỗi lần một khác, tốn credit, không chạy trên CI miễn phí).
- Nội dung lấy từ kho học của Lexkite (từ vựng, cụm từ, ngữ pháp, roleplay công sở) → mỗi video dẫn về đúng bài trong app.
- Mọi bước có **cổng kiểm tự động**; chỉ video qua cổng mới được đăng. Không bịa số liệu, không dùng nhạc/ảnh có bản quyền.
- Nguồn thương hiệu: `docs/BRAND-RULES.md` (Kit = linh vật; nhân vật người dùng chung bảng màu).

## 1. Dàn nhân vật (thiết kế 1 lần trên Kling – dùng tài khoản anh đã đăng nhập)
| Nhân vật | Vai | Tính cách | Giọng (Kokoro) |
|---|---|---|---|
| **Mia** (nữ, ~24, nhân viên văn phòng, tóc ngắn, áo cam Lexkite) | "Lily" của Lexkite – thẳng thắn, hài khô, hay bối rối khi gặp tiếng Anh công sở | châm biếm nhẹ, đáng yêu | `af_heart` (Mỹ) |
| **Leo** (nam, ~28, đồng nghiệp người Anh, áo teal) | người giải thích, hay dùng thành ngữ | nhiệt tình, hơi "quá đà" | `bm_george` (Anh) |
| **Kit** (linh vật diều/én – `web/js/kit.js`) | người dẫn, chốt "mẹo nhớ" cuối clip | lém lỉnh | hiệu ứng ngắn, không thoại dài |

Quy trình trên Kling (Claude điều khiển Chrome của anh, **anh xác nhận trước mỗi lần tiêu credit**):
1. Tạo **ảnh gốc** mỗi nhân vật (toàn thân, nền trơn, phong cách phẳng 2D giống app – flat vector, viền mềm, bảng màu Lexkite).
2. Dùng ảnh gốc làm **ảnh tham chiếu khóa nhân vật** (character/element reference) để tạo: bảng xoay (chính diện, ¾, nghiêng), **8 biểu cảm** (vui, cười lớn, ngạc nhiên, suy nghĩ, bối rối, tự hào, buồn cười ngượng, đồng ý), **6 cử chỉ** (vẫy tay, chỉ tay, giơ ngón cái, khoanh tay, ôm đầu, vỗ tay).
3. Tải về → lưu `brand/characters/<tên>/source/` (PNG lớn).
4. Tách lớp (đầu, thân, tay, mắt, **miệng**) + vẽ **bộ khẩu hình 9 viseme** (A, B, C, D, E, F, G, H, X theo chuẩn Rhubarb) ⇒ `brand/characters/<tên>/rig/` (SVG/PNG). Làm 1 lần (Claude + chỉnh tay nếu cần); kiểm đồng nhất bằng script so màu/khung.

## 2. Pipeline tự động (GitHub Actions `video.yml`, chạy theo lịch + chạy tay)
```
chọn chủ đề → kịch bản (JSON) → kiểm kịch bản → giọng đọc → mốc thời gian từng từ → khẩu hình → dựng khung → ghép video → phụ đề karaoke → kiểm chất lượng → xuất bản
```
| Bước | Công cụ (miễn phí) | Đầu ra |
|---|---|---|
| 1. Chọn chủ đề | hàng đợi `content/video/queue.json` (từ vựng IELTS/TOEIC, cụm công sở, lỗi hay gặp, roleplay) | 1 chủ đề / video |
| 2. Kịch bản | Gemini (khóa xoay vòng sẵn có) theo khuôn: hook ≤ 2 s → tình huống hài → giải thích → câu mẫu → "Kit's tip" → CTA lexkite.com | `script.json` (lượt thoại, nhân vật, biểu cảm, cử chỉ, từ khóa nhấn) |
| 3. Kiểm kịch bản | LanguageTool + `content-check` + luật riêng (CEFR, ≤ 60 s, không bịa số, không nhãn hiệu đối thủ) | qua/không qua |
| 4. Giọng | Kokoro (pipeline `audio.yml` sẵn có), mỗi nhân vật 1 giọng, chuẩn hóa âm lượng `ffmpeg loudnorm -16 LUFS` | `line-*.wav` |
| 5. Mốc thời gian từng từ | forced alignment (whisper.cpp/`stable-ts` CPU) | `words.json` |
| 6. Khẩu hình | **Rhubarb Lip Sync** (CPU, nhanh) | `visemes.json` |
| 7. Dựng & ghép | **Remotion** (React → video) hoặc ffmpeg + SVG rig: nhân vật, biểu cảm đổi theo kịch bản, chớp mắt ngẫu nhiên, nhún nhẹ, zoom cắt cảnh | `video.mp4` 1080×1920 (+ 1920×1080) |
| 8. Phụ đề karaoke | ASS `\k` theo `words.json`: chữ tiếng Anh sáng dần từng từ, từ khóa tô cam; dòng dịch nhỏ bên dưới (15 ngôn ngữ = 15 bản) | burn-in + file `.srt/.vtt` riêng |
| 9. Kiểm chất lượng | độ dài, âm lượng, lệch khẩu hình < 80 ms, phụ đề trong vùng an toàn của từng nền tảng, chữ đủ tương phản, không khung đen | báo cáo + ảnh xem trước |
| 10. Xuất bản | **GrabCast** (backend của chính chủ, workspace Lexkite = 4): CI chạy `node scripts/video/publish-grabcast.mjs --file video.mp4 --meta script.json [--at ISO] [--accounts id,id] [--dry-run]` → tải vào kho Drive (pool bulk) → `use` → validate → tạo bài (Idempotency-Key ổn định) → lên lịch; không có `--at` = để nháp. Quản lý tay: **Quản trị → Video & Social** (Drive + cảnh báo 80/90/95%, kênh, bài đăng lên lịch/đăng ngay/hủy lịch/thử lại/hủy, tạo bài, giờ vàng Mỹ 7·8·12·19·20 giờ New York) qua proxy `/api/social` (`functions/api/social.js`, chỉ admin, whitelist endpoint). Kết nối kênh/Drive chỉ làm trên grabcast.click/scheduler.html | link bài đăng trên từng kênh |
| 11. Nhúng vào app | trang `#/videos` + gắn video vào đúng bài/từ (từ điển, chủ đề, roleplay); phụ đề chạm-để-tra như YouTube học hiện có | người học xem trong app |

## 3. Định dạng nội dung
- **Shorts 9:16 (30–45 s)**: "Đừng nói X, hãy nói Y", "3 cụm sếp nước ngoài hay dùng", "IELTS Speaking: nâng band 1 câu", hội thoại hài Mia–Leo.
- **Bài học YouTube 16:9 (5–8 phút)**: ghép 6–8 tình huống cùng chủ đề + ôn tập + câu đố cuối; chương (chapters) tự sinh.
- **Thumbnail**: khuôn cố định từ `brand/social` + biểu cảm nhân vật + 3–5 chữ.

## 4. Cổng chất lượng (chặn đăng nếu sai)
1. Kịch bản: 0 lỗi LanguageTool mức nặng, CEFR đúng nhãn, có nguồn bài học trong app.
2. Âm thanh: −16 LUFS ±1, không rè, không cắt chữ.
3. Khớp miệng: lệch < 80 ms (đo từ visemes vs. mốc từ).
4. Phụ đề: đúng chính tả với kịch bản 100%, nằm trong vùng an toàn, tương phản ≥ 4.5:1.
5. Thương hiệu: chỉ dùng nhân vật trong `brand/characters`, màu theo BRAND-RULES; không logo/nhãn hiệu bên thứ ba.
6. Người duyệt: 5 video đầu anh xem trước khi bật tự đăng hoàn toàn.

## 5. Lộ trình
| Giai đoạn | Việc | Ai | Chi phí |
|---|---|---|---|
| G1 (1–2 ngày) | Thiết kế 3 nhân vật trên Kling + bộ biểu cảm/cử chỉ; tách lớp + 9 khẩu hình | Claude điều khiển Chrome (anh duyệt credit) + phiên phụ tách lớp | credit Kling của anh (1 lần) |
| G2 (2–3 ngày) | Dựng `video.yml`: kịch bản → giọng → khẩu hình → Remotion → phụ đề karaoke → cổng kiểm; xuất 3 video mẫu | phiên phụ | $0 |
| G3 (1 ngày) | YouTube API tự đăng (anh tạo khóa OAuth như CWS) + trang `#/videos` trong app | phiên phụ + Antigravity (UI) | $0 |
| G4 | Lịch đăng: 1 Short/ngày, 1 bài dài/tuần; đo lượt xem → ưu tiên chủ đề hiệu quả | tự động | $0 |

## 6. Việc anh cần làm
- GrabCast: tạo khóa API tại grabcast.click/account.html#api (quyền social:read/write + storage:read/write) → đặt secret `GRABCAST_API_KEY` trên Cloudflare Pages và GitHub Actions; `GRABCAST_WORKSPACE=4` (mặc định sẵn trong code), `GRABCAST_API_BASE` mặc định `https://grabcast-api-342720596878.us-central1.run.app`. Kết nối kênh + Drive trên grabcast.click/scheduler.html (chọn workspace Lexkite). Giới hạn 60 lượt/phút, 3.000/ngày.
- Duyệt từng lần dùng credit Kling ở G1 (Claude báo số credit dự kiến trước).
- Tạo khóa OAuth YouTube (giống CWS, Claude mở sẵn trang).
- Xem & duyệt 5 video đầu.
