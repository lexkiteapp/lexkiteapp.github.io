# Lô clip phông xanh 17/10 (Kling 2.5 Turbo · 1080p · 5 s · 25 credit/clip)

Khung đầu: `brand/library/chars/<id>/green.png` (chọn từ Assets trong Kling, phông sáng, không bóng). Tách nền: `chroma-test.yml` / `library-build.yml` → `scripts/video/chroma_key.py`.
Mỗi clip 2 hành động → cắt đôi thành 2 đoạn trong thư viện. Chấm theo `docs/MEDIA-QA-RUBRIC.md`, chỉ dùng ≥ 90; ghi `qa-log.md`.

## Khung prompt chung
```
Static locked-off camera, full body always in frame. The cartoon {man|woman|girl} from the first frame keeps the exact same {NHẬN DIỆN} and the same flat 2D vector style with clean outlines. First half: {HÀNH ĐỘNG 1}, big clear motion. Second half: {HÀNH ĐỘNG 2}. Feet stay planted on the same spot, no walking. Background stays one perfectly flat uniform chroma-key green (#00B140) the whole time: no shadow, no floor, no objects, no lighting change. Smooth 2D cartoon animation.
```

## Nhận diện (nhắc trong mọi prompt)
| id | nhận diện |
|---|---|
| mia | short black bob with bangs, yellow hair clip, orange knit sweater over white collar, ID lanyard badge, dark teal trousers, white sneakers |
| leo | messy brown hair, short beard, round black glasses, teal cardigan over mustard tee, lanyard badge, beige chinos, orange sneakers |
| ama | curly black puff hair with yellow headband, coral hoodie, dark teal denim overall dress, black leggings, white sneakers, backpack straps |
| diane | deep brown skin, short black coily curls with a silver streak, thin dark-red glasses, gold stud earrings, mustard blazer over cream blouse, charcoal trousers, brown loafers, wristwatch |
| carlos | warm tan skin, short dark wavy hair, mustache, olive henley with rolled sleeves, navy apron, light jeans, white-and-red sneakers |

## 5 hành động / nhân vật (vai nói + vai nghe)
| mã | nửa đầu | nửa sau | vai |
|---|---|---|---|
| talk | talks warmly to someone off-screen on the right with clear lip-sync mouth movement, gesturing with the open right hand | points forward confidently, then nods with a friendly smile | nói |
| listen | listens attentively to someone off-screen on the right, nodding slowly twice | smiles and gives a thumbs up | nghe |
| greet | waves hello with the right hand, smiling | places both hands together happily in front of the chest | chào/mở đầu |
| think | rests a finger on the chin, looking up thinking | raises the index finger with an excited "aha" expression | suy nghĩ → ý tưởng |
| react | looks surprised with both hands on the cheeks, mouth open | laughs with eyes closed and shoulders bouncing (head stays upright) | cảm xúc |

**Leo:** không ngả đầu ra sau (Kling biến tóc thành đuôi ngựa) – mọi prompt Leo thêm "head stays upright, short messy hair unchanged".

## Tiến độ
| clip | trạng thái | điểm |
|---|---|---|
| carlos_talk | đã gửi 17/10 – kiểm tách nền trước khi chạy cả lô | |

## Clip nghiêng ¾ (nhìn nhau) – bài học thử 17/10
- KHÔNG viết "talks to a person off-screen on the right" → Kling vẽ thêm tay/người ở mép (Ama ¾, Diane). Viết: "talks toward the right side of the frame; no other person, hands or objects ever enter the frame".
- Khoá hướng: "stays in the same three-quarter view facing RIGHT for the whole clip; never turns to face the camera or the left" (Carlos đổi hướng giữa clip khi không khoá).
- Khung đầu phải nghiêng rõ ~40° (ảnh 3/4 thật, không gần chính diện, không mặt nghiêng hẳn). Nhân vật có chi tiết lệch một bên (Mia kẹp tóc, Diane lọn tóc bạc) cần cả hai hướng – không lật gương.
- Bộ tách nền đã tự loại mảng rời ở mép (tay lạ), nhưng vẫn soi bảng soi magenta trước khi nhập.
