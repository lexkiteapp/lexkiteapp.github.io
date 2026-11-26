# Spec: chủ đề từ vựng & thư viện "đủ dùng ngoài đời"

> TL;DR: Chủ đề (vd Work) hiện chỉ 12 từ, không có tình huống/hội thoại/mẹo nhớ. Mỗi chủ đề phổ biến được nâng lên 80–150 từ/cụm chia theo CEFR A1→C1 và tiểu chủ đề tình huống, kèm collocation, câu đời thường, hội thoại 2–4 câu, cụm dùng ngay, mini-quiz + SRS ngay trong trang. Dữ liệu = gói LƯỜI mới (không vào web/js), giao diện qua Stitch. Làm theo đợt, mỗi đợt 1 chủ đề + 1 PR.

Trạng thái: ĐỀ XUẤT → tự duyệt (chủ 23/11 giao, "làm tới khi live"). Chủ: content-95. Liên quan: `content/lexicon/topics.json`, `docs/LEXICON.md`, `docs/CONTENT-WORLD-PLAN.md` §7, `web/js/app.js` `routes.topic`.

## Hiện trạng (đo 23/11)
`IELTS_DATA.TOPICS` 80 bộ / 6 550 từ; Work 12, Travel 12, Health 12, Food 20, Shopping ~12. Trang `#/topic/<id>` chỉ liệt kê từ + 4 nút học; không tiểu chủ đề, không hội thoại, không tìm kiếm/lọc mục tiêu. Cây `topics.json` có 50 nút (domain work = 8 nút) nhưng luật nút 10–60 từ.

## Dữ liệu (gói lười, 1 tệp/chủ đề)
`web/cpack/topic/<id>.js` → `LK.topicX[id] = { sub:[{id, name{en,vi}, scene, words:[…]}], phrases:[{en,vi,lv}], dialogs:[{sub, lines:[[who,en,vi]], key:[từ]}], tips:{từ: mẹo nhớ} }`. Mục từ = đúng dạng kho (`word, ipa, pos, vi, def, ex, col, syn, level, emoji`) để Học/Ghép/Kiểm tra/Anki/SRS dùng lại nguyên. Từ lấy ưu tiên từ kho 20k (`topics.json` + `senses.json`, bắt buộc có trong kho để IPA/nghĩa 13 ngôn ngữ/ảnh/âm thanh dùng chung); từ ngoài kho thì thêm vào kho qua đường mở rộng sẵn có, không tạo nguồn thứ hai. Nghĩa 13 ngôn ngữ do pipeline gói nghĩa điền; en/vi viết tay.
Luật: ≥ 80 từ/cụm (mục tiêu 120), CEFR A1→C1 đủ ≥ 3 cấp, ≥ 5 tiểu chủ đề tình huống, mỗi từ có col ≥ 1 + ví dụ đời thường, ≥ 1 hội thoại/tiểu chủ đề, ≥ 12 cụm dùng ngay. Bộ học vẫn 10–20 từ/lượt (nới "nút 10–60" bằng tiểu chủ đề, không cắt).

## Giao diện (Stitch "Lexkite Kit", sáng/tối, 15 ngôn ngữ, RTL)
Trang chủ đề: thẻ tiểu chủ đề (cảnh + ảnh không chữ từ img.json, tiến độ), lọc CEFR/mục tiêu, tìm kiếm, tab Từ · Cụm · Hội thoại · Quiz; mini-quiz + ôn SRS tại chỗ. Thư viện: thẻ chủ đề có ảnh + % tiến độ. Mã khung ≤ 3 KB vào web/js; còn lại lười (byte tải đầu không tăng).

## Cổng chất lượng
Test dữ liệu (đếm, CEFR, col/ex, trùng, từ có trong kho), content-score ≥ 95, native-qa, ảnh CI 390/768 sáng/tối × en/vi/ar/de, i18n 15 ngôn ngữ, TEXT_OBJ cho ảnh. Ngân sách `cpackTotal` bump có ghi chú.

## Đợt
1 Work → 2 Travel → 3 Food → 4 Health → 5 Shopping → … (dữ liệu trước, giao diện chung ở đợt 1). Mỗi đợt: trước/sau (số từ, CEFR, tiểu chủ đề) + ảnh live.
