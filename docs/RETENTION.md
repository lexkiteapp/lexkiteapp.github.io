# Lớp giữ thói quen (retention) – học từ Duolingo, 100 % miễn phí

> TL;DR: Thêm lịch tuần, mốc chuỗi 3/7/14/30/50/100/180/365 kèm màn chúc mừng Ama/Carlos, nghi thức "chạm 3 lần để rã băng", sự kiện mùa
> (gom 5 mảnh), rương mỹ phẩm (khung ảnh đại diện, nhãn dán), widget Android có giáo viên phản ứng. Tất cả **kiếm bằng việc học, không bán**.
> Quảng cáo có thưởng chỉ cho thêm mỹ phẩm, tự chọn, không bao giờ chặn học. MVP sau cờ `ret` (tắt mặc định) – **chờ anh duyệt** mới bật.
> Code: `web/js/retention.js` (gói lười `ret`, 0 byte vào khung app) · test `scripts/test/retention.mjs` · chủ 27/10 (ảnh Duolingo).

## INDEX
1. Đã có sẵn – không viết lại · 2. Thêm mới (MVP) · 3. Luật chống dark pattern · 4. Dữ liệu & đồng bộ · 5. Cờ & cách bật · 6. Quảng cáo
· 7. Ngân sách · 8. Giai đoạn 2 · 9. Việc chờ anh quyết

## 1. Đã có sẵn (audit 27/10) – tái dùng, không viết trùng
| Tính năng | Ở đâu |
|---|---|
| Chuỗi ngày (`activeDays`, `streak`) | `web/js/app.js` (App.activeDays/App.streak) |
| Đóng băng: +1 mỗi 7 ngày (tối đa 2), tự dùng khi lỡ 1 ngày | `app.js` applyFreeze/reward · `Core.Stats.freezeInfo` · `streak-ui.js` |
| Cứu chuỗi khi hết lượt (khiên/quảng cáo) | `app.js` offerRescue |
| Huy hiệu streak3/7/30, nhiệm vụ ngày, cấp độ | `web/js/game.js` |
| Giải đấu tuần | `web/js/league.js` |
| Nhắc học thông minh (local notif, Web Push, PWA) | `web/js/remind.js`, `docs/REMINDERS.md` |
| Widget Android (từ đến hạn + 🔥) | `native.js` widgetSnapshot · `LexkiteWidget.kt` |

## 2. Thêm mới (MVP, `retention.js`)
- **Lịch tuần** T2→CN trên trang chủ (🔥 đã học · 🧊 đóng băng · ô viền = hôm nay) → chạm mở `#/streak`. Bấm 🔥 ở thanh trên cũng mở `#/streak`.
- **Mốc** 3/7/14/30/50/100/180/365: màn chúc mừng có Ama (mốc lẻ) / Carlos (mốc chẵn), lời khen thật, +1 rương; nếu mốc trùng lượt đóng băng vừa kiếm (mỗi 7 ngày, logic cũ) thì hiện "+1 lượt đóng băng". Nhảy nhiều mốc (đồng bộ máy khác) → 1 màn duy nhất.
- **Rã băng**: khi lượt đóng băng tự cứu chuỗi, thay màn "đã cứu chuỗi" bằng khối băng → chạm 3 lần → lửa cháy lại + giáo viên nhắc "học vài phút". Cùng cờ đã xem `streak_saved_seen`.
- **Sự kiện mùa** (`EVENTS`): Thu 27/10–30/11/2026 🍂, Đông 15/12–15/1 ❄️, Xuân 15/3–15/4/2027 🌸. Mỗi ngày có học (không tính ngày đóng băng) = 1 mảnh; **không cần liên tiếp**; đủ 5 → khung riêng sự kiện + 1 rương.
- **Rương**: số rương = mốc + sự kiện xong − đã mở. Quà theo thứ tự cố định `POOL` (món đầu tiên chưa có) → minh bạch, **không may rủi**.
- **Bộ sưu tập** ở `#/streak`: khung ảnh đại diện (đổi viền `.avatar` toàn app) + nhãn dán.
- **Widget**: snapshot thêm `tch {who, sd, ok, risk}`; widget vừa hiện mặt Ama/Carlos cạnh 🔥, thêm ✓ (đã học hôm nay) hoặc ⏳ (từ 18 h chưa học); tự đổi khi qua ngày, không cần mở app.
- **Nhắc học**: dùng `remind.js` sẵn có (loại `streak`, Web Push/PWA) – không thêm kênh mới.

## 3. Luật chống dark pattern (bắt buộc)
- Không bán đóng băng, không bán rương, không tiền ảo, không đếm ngược gây áp lực, không phạt khi mất chuỗi (không "mất hết").
- Không quảng cáo để học tiếp; không khóa bài học sau mỹ phẩm. Màn chúc mừng luôn có nút "Tiếp tục".
- Sự kiện không đòi liên tiếp; ngày đóng băng không tính mảnh (khỏi "lách"), nhưng cũng không trừ gì.
- Tôn trọng `prefers-reduced-motion` (tắt pháo giấy/hiệu ứng), nút ≥ 44 px, có `aria-label`.
- Lớp học / dưới 13 tuổi: quảng cáo đã tắt sẵn (`ads.js`); mỹ phẩm vẫn kiếm bằng học.

## 4. Dữ liệu & đồng bộ (local-first, PR #146)
`game.ret = { ms:{mốc:ts}, opened, own:{'f:ice':ts}, frame, frameAt, ev:{id:[ngày]}, evDone:{id:ts} }` – nằm trong `game` nên đi cùng Drive appData + D1 dự phòng.
Gộp: `sync.js mergeRet` (hợp mốc/đồ/sự kiện, `opened` = max, khung = bản chọn sau cùng) → không mất dữ liệu, giao hoán qua `ord()`. Không thêm dòng/bảng D1.

## 5. Cờ & cách bật
`App.retOn()`: `?ret=1` / `?ret=0` (ghi `lk.ret`, chỉ máy này) → ưu tiên; không có thì `/api/config` `ret = '1'` (bật cho mọi người qua admin cấu hình).
Cờ tắt: không tải `retention.js`, giao diện như cũ. Thử: `https://lexkite.com/app/?ret=1#/streak`.

## 6. Quảng cáo (AdMob, `docs/ADS.md`)
Lý do có thưởng mới `cosmetic` (1 lần/ngày/máy, `ads/policy.js`), chỉ app gốc, chỉ khi người học tự bấm sau khi mở rương. Web/add-on: không có.
Lưu ý: cứu chuỗi bằng video (offerRescue) đã có từ trước – xem §9.

## 7. Ngân sách
Khung app +~0,4 KB (cờ + 3 dòng). Gói lười: `retention.js` ~19 KB thô, ảnh giáo viên 2×(3–5) KB, i18n `ret` 15 ngôn ngữ. Android +5 KB drawable. Máy chủ: 0 request mới → $0 ở 1M DAU.

## 8. Giai đoạn 2 (sau khi anh duyệt MVP)
Widget riêng 2×2 "chuỗi + giáo viên" với 3 biểu cảm (vui/lo/ngủ) · ảnh 3D Ama/Carlos cho màn mốc · thẻ chia sẻ mốc (`share-card.js`) · nhiệm vụ bạn bè (league) · admin sửa `EVENTS` qua `/api/config` · lịch tháng.

## 9. Việc chờ anh quyết
1. Bật cờ `ret` cho bao nhiêu % người dùng (đề xuất: 10 % → đo chuỗi D7/D30 → 100 %).
2. Cứu chuỗi bằng video quảng cáo (có sẵn) có trái luật "quảng cáo chỉ cho mỹ phẩm" không? Đề xuất: giữ khiên miễn phí, bỏ đường quảng cáo khi bật `ret` (cần anh OK vì là đổi tính năng cũ).
