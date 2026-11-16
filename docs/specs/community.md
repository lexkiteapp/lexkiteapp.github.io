# Cộng đồng người học (#/community) – spec-lite (03/11/2026)

> TL;DR: Phòng học nhóm + chat + phòng nói (gọi thoại P2P) + học chung (bộ thẻ, thử thách, xếp hạng tuần), $0, an toàn trước tiên. Cờ `community` mặc định TẮT, 7 đợt / 7 PR.
> Đọc khi: làm bất kỳ phần nào của Cộng đồng. Ref Stitch: `brand/stitch/community/*` (mục 2).

## 1. Mục tiêu
Người học thấy mình có bạn đồng hành, rủ được bạn bè học chung: vào phòng cùng mục tiêu (IELTS 7, TOEIC 800, giao tiếp…), học chung mỗi ngày, nói thật với người thật, đỡ nhàm. Đo: tỉ lệ quay lại D7 của người vào phòng cao hơn người không vào ≥ +15 %; báo cáo vi phạm được xử lý trong 24 h ≥ 95 %; 0 lộ email/SĐT.

## 2. Màn (Lexkite Kit, khung §5d, 390 px, tối/sáng) – mở từ thẻ "Cộng đồng" ở Hôm nay + Tôi, không thêm tab
| Màn | Route | Nội dung |
|---|---|---|
| Vào cộng đồng | `#/community/join` | quy tắc 4 dòng, biệt danh + màu avatar chữ cái, năm sinh (xếp nhóm tuổi), công tắc hiện trình độ / cho gọi / tin riêng (mặc định tắt) |
| Trung tâm | `#/community` | phòng của tôi, thử thách nhóm tuần, phòng nói đang mở theo chủ đề + trình độ, xếp hạng phòng tuần, "Tìm phòng" |
| Phòng học | `#/community/r/<id>` | mục tiêu, thành viên, chuỗi ngày của phòng; tab Hoạt động · Chat · Thành viên; bộ thẻ chung, vòng thử thách, lịch buổi nói |
| Chat phòng | `…/chat` | ghim quy tắc, chip từ vựng (thêm vào bộ thẻ 1 chạm), chip mẹo ngữ pháp, giữ để báo cáo/chặn, chip nhanh, "dịch" 1 chạm |
| Phòng nói | `#/community/speak/<id>` | chỉ thoại, ≤ 4 người, 10 phút, thẻ đề + cụm câu hay, lượt nói, tắt mic/giơ tay/đề tiếp/báo cáo; Ama/Carlos ở teacher-slot gợi đề |
| Mời bạn & bạn học | `#/community/invite/<mã>` · `#/community/friends` | tạo phòng rồi mời bằng link/mã 6 ký tự/QR (`js/lib/qr.js` có sẵn, Web Share API → Zalo/Messenger/Gmail…); danh sách bạn học (kết bạn 2 chiều, mời bạn vào phòng 1 chạm, xem bạn đang học gì nếu bạn cho phép); "Thêm vào nhóm" từ thành viên cùng phòng; người được mời chưa có app → trang mời 15 ngôn ngữ → đăng nhập → vào thẳng phòng |
| Ôn chung | `…/review` | dùng engine Ôn có sẵn (`study.js`) trên bộ thẻ của phòng, kết quả cộng vào thử thách |

Stitch 03/11: 6 màn sáng + tối ở `brand/stitch/v3/app/community-*` (hub, room, chat, speak, join, invite), verdict `QC` tới khi CI Stitch quality QC chấm; còn thiếu (members, review-result, report-sheet, friends) vẽ ở đợt UI tương ứng – chỉ vẽ màn chưa có ref.

## 3. Dữ liệu
**D1 `lexkite-sync`** (bảng `cm_*`, ghi gộp, trong `_d1guard`): `cm_profile(uid PK, nick, color, band 'u13|13-17|18+', trust 0–3, dm, voice, level, created)` · `cm_room(id, name, topic, level, kind study|speak, band, cap ≤ 30, owner, vis public|code, created)` · `cm_member(room, uid, role owner|mod|member, joined, mute_until)` · `cm_week(room, week, xp, goal, prog)` · `cm_deck(room, deck)` · `cm_block(uid, other)` · `cm_friend(a, b, state pending|ok, at)` · `cm_invite(code PK, room, by, uses, max ≤ 30, exp 7 ngày)` · `cm_report(id, kind msg|user|room|voice, target, by, reason, at, status, action)`.
**Durable Object `RoomDO`** (1 DO/phòng, SQLite, WebSocket Hibernation, Worker mới `lexkite-community`): tin nhắn (giữ 30 ngày, ≤ 500 chữ), hiện diện, tín hiệu WebRTC. Không lưu email; chỉ `uid` nội bộ + biệt danh. Xếp hạng tuần dùng lại khung `league.js` (cộng XP thành viên theo phòng).

## 4. Hạ tầng $0 (thêm vào `infra/resources.json` + `free-tier-guard` trước khi bật)
- Cloudflare Workers + Durable Objects gói Free (SQLite DO, hibernation để không tính giờ chờ) · D1 sẵn có · Firebase Auth sẵn có (bắt buộc đăng nhập).
- Gọi thoại: WebRTC mesh ≤ 4 người (Opus 24 kbps), tín hiệu qua `RoomDO`. STUN `stun.cloudflare.com` + `stun.l.google.com`. TURN: Cloudflare Realtime TURN (khoá ngắn hạn cấp từ Worker), `iceTransportPolicy:'relay'` để **không lộ IP** cho người lạ. Đã kiểm 03/11: TURN + SFU chung 1.000 GB/tháng free rồi 0,05 USD/GB; DO Free 100k lượt + 100k dòng ghi SQLite/ngày, chỉ DO SQLite (ghi ở `infra/resources.json`, trần ở `scripts/free-tier/limits.mjs`); `free-tier-guard` đo GB/tháng, chạm 70 % → tự tắt phòng nói (chat vẫn chạy), không bao giờ sang trả phí.
- AI kiểm duyệt: Workers AI (Llama Guard) trong hạn mức free + `_abuse.js` 15 ngôn ngữ; hết hạn mức → chặn tin từ người trust 0, không bỏ kiểm.

## 5. An toàn (bắt buộc, có test từng dòng)
- **Tuổi**: dưới 13 không vào cộng đồng; 13–17 chỉ phòng nhóm 13–17, không tin riêng, không gọi với người 18+; 18+ không vào phòng 13–17. Phòng nói chỉ cùng nhóm tuổi.
- **Kiểm duyệt tin**: lọc trên máy (nhanh) + máy chủ (`_abuse` + Llama Guard); chặn thông tin liên lạc (email, SĐT, link, @mạng xã hội, mã QR) cho mọi người; người mới (trust 0) slow-mode 1 tin/10 s, ≤ 50 tin/ngày, không link.
- **Báo cáo/chặn**: giữ tin hoặc ⚑ trên người/phòng/buổi nói; 2 báo cáo độc lập → tự ẩn chờ duyệt; chặn = ẩn 2 chiều, không thể gọi/nhắn nhau; hàng duyệt trong Quản trị (dùng lại `report.js`/`quota_flag` đánh gậy: 1 cảnh cáo → 24 h câm → 7 ngày → khoá).
- **Phòng nói**: không ghi âm; báo cáo gửi siêu dữ liệu (ai, lúc nào), chủ phòng/mod tắt mic hoặc mời ra; ≥ 2 người bỏ phiếu → người bị mời ra rời phòng ngay; chỉ trust ≥ 1 (≥ 3 ngày học, 0 gậy).
- **Mời & kết bạn**: link mời hết hạn 7 ngày, thu hồi được, ≤ 20 lời mời/ngày/người, dò mã sai 10/10 phút → chặn; kết bạn cần người kia đồng ý, chặn = huỷ bạn; 13–17 chỉ kết bạn/mời trong nhóm 13–17, link mời của 18+ không mở được cho 13–17 (và ngược lại); không gợi ý bạn từ danh bạ/email.
- **Riêng tư**: chỉ biệt danh + avatar chữ cái (không ảnh), không hiện email/tên thật/quốc gia chính xác; xoá tài khoản xoá cả `cm_*` + tin trong DO; chính sách `/privacy` thêm mục Cộng đồng (15 ngôn ngữ).
- **Quy tắc cộng đồng** `/community-rules` 15 ngôn ngữ; đồng ý một lần, xem lại từ icon khiên.

## 6. Thông báo (chuẩn `docs/specs/notifications.md`)
Mặc định chỉ trong app (chuông 🔔 `notices.js`). Push chỉ khi người dùng bấm "Nhắc tôi" cho một buổi nói hoặc bật trong Cài đặt → loại `community`; chung trần ≤ 1 push/ngày với nhắc học, giờ yên lặng địa phương, không câu thúc ép ("cả phòng đang chờ bạn" bị `push-copy --check` chặn). @nhắc tên gộp thành 1 bản tin.

## 7. i18n
Mọi chữ giao diện qua `t()`, nhóm lười `community` (G0), dịch tay 15 ngôn ngữ; nội dung chat giữ nguyên (luyện tiếng Anh), có nút dịch 1 chạm bằng đường dịch sẵn có.

## 8. Tiêu chí xong & cổng CI
`npm test` xanh; test mới: `community-api` (quyền, nhóm tuổi, chặn, báo cáo, trust, rate limit, PII), `community-do` (DO bằng Miniflare), `community-e2e` (2 Chromium, `--use-fake-device-for-media-stream`, gọi được qua TURN relay, chat + báo cáo + chặn); `api-security`, `infra-check`, `size-budget` (shell không tăng – bundle lười), `stitch-diff` SSIM, contrast, `exit-sweep`, `frame-consistency`, axe, `i18n-missing --strict` + `i18n-qa --strict`, `push-copy --check`, visual-qa 390 px sáng/tối en/vi/ar. Mượt: mở hub < 1 s trên CPU 4×, chat 60 fps khi 500 tin.

## 9. Đợt (mỗi đợt 1 PR, cờ `community` tắt tới đợt 7)
0. Spec + ref Stitch (PR này). 1. ✅ Backend (`functions/api/community.js` + `_cm.js`, test `community-api.mjs`): schema `cm_*`, hồ sơ/quy tắc/nhóm tuổi, chặn/báo cáo, lọc nội dung, hàng duyệt Quản trị, resources.json. 2. Hub + phòng học (tạo/tìm/vào, thành viên, hoạt động) + mời bằng link/mã/QR + bạn học. 3. Chat (`RoomDO`, WebSocket, kiểm duyệt). 4. Học chung: bộ thẻ phòng + ôn chung, thử thách tuần, xếp hạng phòng. 5. Phòng nói WebRTC + TURN + e2e 2 trình duyệt. 6. Thông báo, add-on (`build-extension.sh`), tin riêng 18+ giữa thành viên cùng phòng (mặc định tắt). 7. Bật cờ trên preview → soát an toàn → bật thật.
