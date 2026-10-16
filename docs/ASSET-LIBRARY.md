# Kho tài nguyên hình ảnh Lexkite – thiết kế để ghép tổ hợp vô hạn

Mục tiêu: một kho **mô-đun** (nhân vật, biểu cảm, cử chỉ, phòng trống, đạo cụ, phương tiện, hiệu ứng) đủ phủ mọi nơi dùng trong hệ sinh thái – video Shorts/YouTube, "Call Mia", roleplay, bài học trong app, thumbnail, social, blog, email, thông báo, cửa hàng ứng dụng – và **ghép bằng script** thành hàng nghìn khung hình khác nhau mà vẫn đồng nhất phong cách. Ảnh AI (Kling) chỉ là **nguyên liệu**; sản phẩm cuối do máy dựng (SVG/Remotion) → $0/khung hình.

Liên quan: `docs/VIDEO-PIPELINE.md` (dựng video), `docs/VIDEO-CONTENT-PLAN.md` (nội dung), `docs/MEDIA-QA-RUBRIC.md` (chấm điểm), `content/video/assets.json` (danh mục máy đọc), `docs/BRAND-RULES.md`.

## 1. Quy chuẩn chung (bắt buộc để ghép không lệch)
| Quy chuẩn | Giá trị |
|---|---|
| Phong cách | phẳng 2D vector, viền nâu đậm mềm, đổ bóng cel 1 tầng, bảng màu ấm + điểm nhấn teal/cam thương hiệu |
| Góc nhìn | **chính diện (front elevation)** như game cuộn ngang; nhân vật thêm ¾ và nghiêng |
| Thang đo | 1 m = 220 px ở canvas chuẩn 1080×1920; nhân vật cao ~1,65–1,85 m; mỗi đạo cụ ghi `heightM` |
| Đường sàn | 9:16: y = 1500 px; 16:9: y = 900 px – mọi phòng và đạo cụ đặt chân lên đường này |
| Tầm mắt | 1,5 m trên sàn (phòng vẽ theo tầm mắt này) |
| Vùng an toàn | 9:16: 1/3 dưới để phụ đề; 16:9: 15% dưới |
| Định dạng lưu | `svg` (chuẩn), `png` 2× dự phòng; nền trong suốt; tên `kind/slug@variant.svg` |
| Nguồn gốc | ghi `source` (kling task id / prompt / ngày) + `qa` điểm – thiếu thì cổng chặn |

## 2. Danh mục cần phủ (ưu tiên P1 → P3)
### 2.1 Nhân vật
| Nhóm | Số lượng | Bộ mỗi nhân vật |
|---|---|---|
| Chính: Mia, Leo, Ama (P1, có) · Diane – quản lý ~50 · Carlos – người Mỹ gốc Latinh ~30, dịch vụ/đời sống (P1) | 5 | 12 biểu cảm · 10 cử chỉ toàn thân · 3 góc · 3 trang phục (công sở/đời thường/sự kiện) · tư thế ngồi · 9 khẩu hình (tách lớp) · chớp mắt |
| Vai phụ: người phỏng vấn, thu ngân, bác sĩ, nhân viên sân bay, lễ tân khách sạn, cảnh sát/an ninh, giáo viên, bạn cùng lớp, đồng nghiệp ×2, khách hàng (P2) | 11 | ảnh gốc + 4 biểu cảm + 2 cử chỉ |
| Đám đông/hậu cảnh: bóng người đơn sắc (P2) | 20 dáng | 1 màu, để làm nền đông người |
| Kit (linh vật) | – | **chỉ từ `web/js/kit.js`**, không tạo bằng AI |

### 2.2 Phòng trống / nền (không người, không đồ rời)
| Nhóm | Phòng (mỗi phòng: ngày + tối, 9:16 + 16:9) |
|---|---|
| Công sở (P1) | open office, phòng họp kính, văn phòng sếp, pantry, sảnh lễ tân, thang máy, phòng phỏng vấn, coworking, phòng thuyết trình |
| Học tập (P1) | lớp học, giảng đường, thư viện, phòng ký túc, phòng thi, hành lang trường |
| Đời sống (P1–P2) | căn hộ (phòng khách, bếp, phòng ngủ), quán cà phê, diner, siêu thị, phòng khám, ngân hàng, tiệm tóc, gym, công viên, phố (mặt tiền), ga tàu điện ngầm |
| Du lịch (P2) | quầy check-in sân bay, cửa an ninh, cổng lên máy bay, sảnh khách sạn, phòng khách sạn, nhà hàng sang, ga tàu |
| Thương hiệu (P1) | gradient cam–teal, bảng đen, nền quiz, nền "studio" trơn, nền video call (khung cửa sổ) |
| Mùa/lễ (P3) | Halloween, Thanksgiving, Giáng sinh, năm mới, mùa thi, mùa hè – dạng **lớp phủ đạo cụ** lên phòng có sẵn, không vẽ lại phòng |

### 2.3 Đạo cụ (sprite tách nền, chính diện, có `heightM`, `anchor`)
| Bộ | Món |
|---|---|
| Văn phòng (P1) | bàn làm việc, ghế xoay, kệ sách, tủ hồ sơ, bàn họp tròn/dài, bảng trắng, máy nước, máy in, vách ngăn |
| Công nghệ (P1) | laptop (mở/đóng), màn hình, điện thoại (cầm tay + để bàn), tai nghe, máy chiếu, TV/màn họp online |
| Nội thất nhà (P1) | sofa, bàn trà, giường, tủ bếp, tủ lạnh, bàn ăn, ghế ăn, thảm, rèm, kệ TV |
| Đèn (P1) | đèn cây, đèn bàn, đèn trần, đèn thả, đèn dây trang trí |
| Cây & trang trí (P1) | monstera, cây treo, xương rồng, tranh khung, đồng hồ, lịch, bảng ghim, gương |
| Đồ cầm tay (P1) | cốc cà phê, sách, vở, bút, ba lô, túi xách, vali, ô, hộ chiếu, thẻ lên máy bay, khay đồ ăn |
| Quán & cửa hàng (P2) | quầy pha chế, máy pha cà phê, bảng menu (trống chữ), kệ hàng, xe đẩy, quầy thu ngân |
| Trường học (P2) | bàn học sinh, bục giảng, bảng đen, tủ locker, quả địa cầu |
| Đường phố (P2) | cây, cột đèn, ghế công viên, trạm xe buýt, biển báo (không chữ), vạch qua đường, hydrant |
| Phương tiện, vẽ nhìn ngang (P2) | xe hơi sedan, SUV, taxi vàng, xe buýt, xe đạp, xe tay ga, máy bay (xa), tàu điện |
| Đồ ăn uống (P2) | burger, pizza, salad, bánh donut, ly nước, cà phê take-away |
| Mùa/lễ (P3) | bí ngô, cây thông, quà, pháo giấy, bóng bay |

### 2.4 Lớp hiệu ứng & giao diện (dựng bằng code – không dùng AI)
Bong bóng thoại, mũi tên, khung câu hỏi, dấu ✓/✗, thanh tiến độ, lower-third, khung "Don't say / Say", sticker cảm xúc (giọt mồ hôi, tim, dấu hỏi), ánh sáng ngày/tối (lớp màu), mưa/tuyết, zoom/pan camera → SVG + Remotion, theo màu thương hiệu.

## 3. Quy trình sản xuất (mỗi lô)
1. **Tạo** trên Kling: nhân vật dùng Element đã khóa (Lexkite Mia/Leo/Ama…); đạo cụ & phòng dùng prompt khuôn (mục 5). 2K, 2 ảnh/lần.
2. **Chấm trước** theo `MEDIA-QA-RUBRIC.md` – chấm **từng ô** (lưới biểu cảm/đạo cụ); ô < 90 bỏ, chỉ tạo lại phần thiếu.
3. **Tải bản gốc PNG** (đường dẫn kimg bỏ hậu tố `:WxH.webp`) → `brand/characters/_candidates/` (không commit).
4. **Xử lý tự động** (`scripts/video/vectorize.py`, chạy được trên máy và GitHub Actions):
   cắt ô theo lưới / theo vùng liền khối → xoá nền + viền trắng kiểu sticker (lấp màu từ mép, loại mảng gần trắng chạm nền) → **vtracer → SVG** → tối giản đường (giảm điểm, gộp màu về bảng màu chuẩn) → tính khung bao & `anchor` (giữa đáy) → xuất `svg` + `png@2x`.
5. **Chấm sau**: hiển thị lên phòng mẫu ở đúng thang đo; kiểm viền sáng, màu ngoài bảng, nét đứt, kích thước file (≤ 80 KB/sprite, ≤ 250 KB/phòng).
6. **Đăng ký** vào `content/video/assets.json` (id, kind, tags, heightM, anchor, variants, source, qa) → commit vào `brand/library/`.

## 4. Bộ ghép (composer)
- Đầu vào: `scene` JSON `{room, time:"day|night", props:[{id,x,depth}], cast:[{who,pose,expr,x,facing}], fx:[…]}`.
- Luật tự động: xếp lớp theo `depth` (tường → đồ sát tường → nhân vật → tiền cảnh bàn/quầy); chân nhân vật & đạo cụ trên đường sàn; không chồng lấn vùng mặt; chừa vùng phụ đề; ≤ 6 đạo cụ/khung để gọn mắt.
- **Bộ sinh biến thể**: với mỗi phòng có danh sách "khe đặt đồ" (slot) → script chọn ngẫu nhiên có trọng số theo tag (vd. `office` + `morning`) → mỗi video khác nhau nhưng hợp ngữ cảnh. Có `seed` để tái tạo y hệt.
- Dùng chung cho: Remotion (video), trang `#/videos` và "Call Mia" (nền cuộc gọi), thumbnail, ảnh blog/social, ảnh minh hoạ bài học trong app.

## 5. Prompt khuôn (Kling)
- **Đạo cụ**: `2D game sprite asset sheet of <set>, flat vector cartoon, clean soft dark-brown outlines, simple flat cel shading, warm muted palette with teal and orange accents. Strict straight-on front elevation view, no perspective. Each object on plain solid off-white background, generous empty space, neat grid. Objects: <list>. No text, no logos, no people.` (viền trắng nếu có sẽ bị xoá ở bước 4 – không tạo lại vì lý do này).
- **Phòng trống**: `Empty <room> interior, flat 2D vector cartoon, same outline and palette as above, straight-on front view, eye level 1.5 m, visible floor line in the lower third, back wall with windows, NO furniture in the middle area, no people, no text, soft daylight.` + biến thể `night, warm lamp light, dark blue windows`.
- **Biểu cảm**: Element nhân vật + lưới 2×2 đầu-vai, ẩn tay, nhắc phụ kiện nhận diện "in every panel", cấm ký hiệu/chữ (xem qa-log 2026-10-16).

## 6. Ngân sách credit (1 credit = 1 ảnh)
| Hạng mục | Ước tính |
|---|---|
| 5 nhân vật chính × (biểu cảm 6 + cử chỉ 10 + trang phục 6 + ngồi 4 + làm lại) | ~200 |
| 11 vai phụ × 8 | ~90 |
| Phòng trống ~40 × 2 giờ × 2 khổ × 1,5 lần thử | ~240 |
| Đạo cụ ~15 bảng × 2 × 1,5 | ~45 |
| Mùa/lễ (lớp phủ) | ~40 |
| Clip chuyển động Kling (đặc biệt: intro, thumbnail động) | ~200 |
| Dự phòng xu hướng | còn lại (~500) |

## 7. Cổng chất lượng (chặn nhập kho)
- Điểm rubric ≥ 90 (từng ô) · đúng thang đo ±5% · không viền sáng (alpha mép) · màu trong bảng (ΔE ≤ 8 sau gộp) · SVG hợp lệ, ≤ kích thước trần · có `source` + `qa` · không chữ/logo/thương hiệu bên thứ ba · nhân vật chỉ từ Element đã khóa.
