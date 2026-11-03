# 4 khuôn Reels "đọc theo" (học từ trang FB "Tiếng Anh Cho Người Mất Gốc", 02/11)

> TL;DR: 4 khuôn ngắn có tiếng (họ chỉ có ảnh tĩnh, không có tiếng). Ama/Carlos đọc mẫu bằng Kokoro ≤150 wpm, sau mỗi câu có khoảng lặng để người xem đọc theo. IPA lấy từ kho từ. Tiêu đề, dòng nghĩa, "Đến lượt bạn!", "Hãy đọc theo nhé!" là chữ bản địa viết tay, qua native-qa. Dựng trên CI `social-clips.yml`, 0 credit. Mỗi khuôn có 1 mẫu tiếng Việt chờ anh duyệt trước khi làm hàng loạt. Không tự đăng.

**Số liệu của họ:** "X nói sao?" 4 câu 279K view · cụm từ 174K · từ hay đọc sai 145K · bộ từ gần âm 1,5–7K. Ta giữ cái họ làm đúng (câu hỏi tiếng mẹ đẻ ở 1/3 trên, khung 01–04 gồm câu EN + IPA + nghĩa, CTA đọc theo) và thêm tiếng, miệng khớp, khoảng lặng có đếm lùi.

**Spec:** `content/video/rig/reels/<lang>/<slug>.json`. Giống clip L1 (docs/specs/social-l1-clips.md), cộng thêm:
- `template`: `say4` | `mispron` | `phrase` | `minpair`
- `items[]` {en, native, gloss_en?}: `native` là dòng nghĩa/mẹo bằng tiếng mẹ đẻ. `gloss_en` là nghĩa tiếng Anh dùng để dịch ngược đối chiếu (mặc định = en).
- `segments[].item` (mục đang đọc) hoặc `.pair` (minpair), `.repeat: true` để chừa lặng đọc theo. `repeat` {min, k}: lặng = max(min, k × độ dài câu mẫu). tts.py ghi `turn` = [đầu, cuối].
- `native.turn`, `native.cta`

| khuôn | bố cục | lời giáo viên |
|---|---|---|
| say4 | thẻ hook (hook bản địa · "đọc theo" ↔ viên đến lượt bạn · CTA) · 4 dòng 01–04 (EN karaoke · IPA · nghĩa) · giáo viên 1:1 dưới danh sách, thân quá mép đáy | mở bài + 4 câu, mỗi câu có lặng |
| mispron | như say4, mỗi dòng 1 từ + mẹo bản địa | mỗi từ đọc 2 lần, có lặng |
| phrase | thẻ lớn: hook · cụm EN 120 px · IPA · nghĩa | cụm → nghĩa → ví dụ → "Repeat after me", cụm nói ≥3 lần |
| minpair | 4 từ + IPA, từ đang đọc sáng · khung cận cảnh miệng 1,33× ở vai phải | cả bộ → từng cặp có lặng → cả bộ |

**Cổng:** đủ 13 cổng rig, cổng clip L1 và native-qa, không bỏ cổng nào. Thêm:
- `ipa_from_lexicon`: mỗi từ có IPA trong kho (loadAllPlus; dùng ipaUS nếu có vì giọng Kokoro là 'a')
- `ipa_glyphs`: phông Noto Sans có đủ glyph IPA
- `items_native_glyphs`
- `turn_contrast` ≥4.5
- native-qa: `items_native` (chữ viết, BAD, độ dài) và `items_backcheck` (dịch ngược gtx ≥0.3 so với gloss_en)
- `teacher_full_1x` (mọi khuôn, đo điểm ảnh khung chính): giáo viên 1:1, thấy ≥ 55 % thân; đoạn mờ dần/hàng cắt luôn khuất. Test `scripts/test/rig-figure.py` tiêm lỗi (0,62×, cắt còn đầu, thẻ đè ngực) phải đỏ. Lỗi 03/11: say4/mispron chỉ còn đầu nhỏ.
- `script_logic` theo khuôn: say4 đúng 4 câu đúng thứ tự · mispron mỗi từ ≥2 lần · phrase ≥3 lần · minpair các từ có IPA khác nhau

**Mẫu vi (chờ anh duyệt):**
- say4-order: gọi món, Ama
- mispron-4: island/recipe/vegetable/comfortable, Carlos
- phrase-same-here: Ama
- minpair-sheep: sheep/ship/cheap/chip, Ama

**Sau khi anh duyệt:** viết spec cho 15 ngôn ngữ và đăng ký vào `infra/ci-backlog.json`. Hook viết lại theo từng ngôn ngữ (không dịch máy).
