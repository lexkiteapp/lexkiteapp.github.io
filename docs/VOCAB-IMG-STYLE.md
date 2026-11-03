# Chuẩn ảnh từ vựng Lexkite (VOCAB-IMG-STYLE)

> TL;DR: Chuẩn ảnh từ vựng: nghiên cứu app lớn, khoa học học tập, phong cách nhà duy nhất, khung hình đọc được ở 96-160 px, luật theo lớp từ, dàn nhân vật. Code: scripts/vocab-img/style.mjs.
> Đọc khi: sinh/duyệt ảnh từ vựng.

Mục tiêu (chủ 24/10): ảnh **đẹp, dễ hiểu, dễ nhớ**, cùng một gia đình cho ~20k nghĩa, đọc được ở **96–160 px** trên thẻ học.
Nguồn code: `scripts/vocab-img/style.mjs` (STYLE, PEOPLE, NEG, scrub, classOf) · `scene.mjs` (SCENE_STYLE, SCENE_CLASS, SCENE_SYS) ·
`cards.mjs` (ASK, cleanCard) · `strict.mjs` (promptFromCard). Đổi chuẩn = sửa file này + các hằng trên, KHÔNG viết prompt riêng ở nơi khác.
Ngưỡng giám khảo (`vimg-judge*.json`, `local_judge.py`) **không** đổi theo file này.

## 1. Các app lớn làm gì (nghiên cứu 25/10) – và ta chép gì
| App | Cách minh hoạ từ | Ta chép |
|---|---|---|
| **Drops** | Mỗi từ = 1 icon phẳng sạch, không kèm bản dịch; màu theo chủ đề, nền gradient teal/cam | 1 chủ thể, phẳng, không chữ; bảng màu ít, ấm + teal |
| **Duolingo** | Mọi hình dựng từ 3 khối (chữ nhật bo góc, tròn, tam giác bo); không góc nhọn; phối cảnh phẳng; ít khối nhất có thể; dàn nhân vật cố định, đa dạng, biểu cảm mạnh | Khối tròn bo, phẳng, ít chi tiết; dàn nhân vật cố định (PEOPLE) mặt to, cảm xúc rõ |
| **Lingokids** | Minh hoạ màu tươi, nhân vật dễ thương, trẻ 2–8 tuổi hiểu ngay | "Trẻ 5 tuổi gọi được tên" là phép thử thẻ vật |
| **Memrise** | Ảnh/"mem" kỳ quặc, gây nhớ (mnemonic); video người bản ngữ trong tình huống thật | Phóng đại có chủ đích cho tính từ/động từ; cảnh đời thường thật cho từ trừu tượng |
| **Babbel / Mondly** | Ảnh hỗ trợ quiz ghép từ–hình, ảnh chụp/minh hoạ trung tính | Ảnh phải đủ rõ để làm đáp án ghép hình (không mơ hồ giữa các từ cùng chủ đề – giám khảo dùng `sib`) |
| **Quizlet** | Người dùng chọn ảnh kho (ảnh chụp) – không đồng bộ phong cách | Bài học ngược: KHÔNG trộn ảnh chụp + minh hoạ trong một bộ |
| **Anki / Fluent Forever** | 1 khái niệm/thẻ, ảnh thay bản dịch, chọn ảnh "khác với điều mình đoán"; từ trừu tượng thì ảnh + câu ví dụ | 1 nghĩa = 1 ảnh = 1 ý; từ trừu tượng = cảnh của **câu ví dụ** hiện ngay dưới ảnh |

## 2. Khoa học học tập (vì sao các luật dưới đây)
- **Mã hoá kép (Paivio)** + **ưu thế hình ảnh**: từ đi kèm hình được nhớ tốt hơn; hiệu ứng mạnh nhất với từ **cụ thể**. Từ trừu tượng: một hình chung chung KHÔNG giúp (có nghiên cứu L2 không thấy lợi) → phải là **một tình huống cụ thể** gắn với câu ví dụ.
- **Tính khác biệt (distinctiveness)**: hình nổi bật giữa các hình thường thì được nhớ; hiệu ứng "kỳ quặc" chỉ có khi trộn với hình bình thường → **phóng đại có liều lượng** (tính từ, động từ), không biến mọi ảnh thành quái dị.
- **Cảm xúc**: mặt và dáng người thể hiện cảm xúc rõ giúp nhớ và giúp hiểu từ chỉ cảm xúc/thái độ (fear, nervous, polite).
- **Cặp tương phản**: tính từ/khái niệm so sánh được hiểu nhanh nhất khi thấy CẢ hai phía cạnh nhau (careful ↔ careless, equal = hai phần bằng nhau).
- **Tải nhận thức thấp**: ở 96–160 px chỉ đọc được 1 chủ thể + 1 hành động; mỗi chi tiết thừa là nhiễu.

## 3. Phong cách nhà (MỘT cho mọi ảnh)
- Minh hoạ **vector phẳng**, khối hình học bo tròn, viền teal đậm sạch, bóng phẳng hoặc không bóng, không gradient phức tạp, không 3D/ảnh chụp.
- Bảng màu theo `docs/BRAND-RULES.md` / `web/js/kit.js`: teal đậm #0F3D3E (viền, chủ đạo), teal phụ #17595A, cam #E5502F, vàng cam #FFB054,
  vàng #FFC94A, hồng má #FF8FA3, **nền kem trơn #FFF7EA**. Trong prompt gọi bằng tên màu (FLUX không hiểu mã hex): *deep teal, warm orange, golden yellow, soft pink, cream*.
- **Không chữ** dưới mọi hình thức: chữ, số, biển, nhãn, logo, cờ, màn hình có nội dung, bong bóng thoại/suy nghĩ.
- Không dùng màu xanh dương Kit cũ #2F62C0 (brand-check chặn).

## 4. Khung hình (đọc được ở 96–160 px)
1. **Một chủ thể**, ở giữa, chiếm 60–80 % khung, nhìn thấy trọn vẹn (vật) hoặc trọn người (động từ).
2. Nền **trơn hoặc rất mềm** (kem), không cảnh phố/phòng nhiều đồ; tối đa 2 người, tối đa 3 vật phụ cần cho nghĩa.
3. **Tương phản cao**: chủ thể đậm trên nền sáng, bóng dáng (silhouette) nhận ra được khi thu nhỏ.
4. Khung: medium shot / close medium shot / medium close-up. **Không** wide shot (người thành chấm ở 96 px – đã bỏ khỏi FRAMES e3).
5. Kiểm nhanh: thu ảnh về 96 px, che câu ví dụ – vẫn nói được "ai đang làm gì / vật gì".

## 5. Luật theo lớp từ
| Lớp | Cách vẽ | Khuôn (code) |
|---|---|---|
| **Danh từ cụ thể** (apple, map, nurse) | Ví dụ điển hình nhất, màu/dáng thường gặp, góc dễ nhận nhất, trọn vật, không bao bì/nhãn hiệu. Nghề = người + đồ nghề + trang phục | `cards.mjs` ASK → `promptFromCard` |
| **Động từ hành động** (kick, carry) | Một người ở **khoảnh khắc rõ nhất** của hành động, thấy cả thân và tay, vật bị tác động to; không vệt chuyển động/mũi tên | ASK (verb) · SCENE_CLASS.verb |
| **Động từ trừu tượng** (consider, avoid, refuse) | Cảnh của câu ví dụ; hành động cụ thể đại diện (refuse = đẩy đĩa ra, lắc đầu) | SCENE_CLASS.verb |
| **Tính từ** | **Phóng đại** (enormous = vật khổng lồ cạnh người tí hon) **hoặc cặp tương phản** đặt cạnh nhau (careful ↔ careless; empty ↔ full) | SCENE_CLASS.adj · ASK (adj: color/shape) |
| **Trạng từ** | Cách làm phóng đại bằng dáng/tốc độ/nét mặt | SCENE_CLASS.adv |
| **Danh từ trừu tượng** (fear, habit, decision) | **MỘT cảnh đời thường** mà ý tưởng hiện rõ trên mặt + hành động; không ẩn dụ biểu tượng | SCENE_CLASS.noun · SCENE_SYS (6)(7) |
| **Hư từ** (the, of, although) | **Không vẽ AI**: ô SVG khái niệm tất định (`concept.mjs`), icon/sơ đồ đơn giản; không vẽ được → bỏ ảnh | `kind() → 'concept'` |

Không có câu ví dụ nào vẽ được mà không cần chữ/biểu tượng → thẻ `skip` → ô chữ khái niệm. **Ảnh sai còn tệ hơn không ảnh.**

## 6. Dàn nhân vật (cast)
- Dàn cố định `PEOPLE` (style.mjs): 8 người lớn đa dạng giới/màu da, **kiểu Mỹ hiện đại**, quần áo đời thường; xoay vòng **tất định** theo `fnv(khoá)`.
- Mặt to, mắt/miệng biểu cảm rõ (Duolingo); cảm xúc là kênh chính cho từ trừu tượng. Tối đa 2 người/ảnh.
- An toàn cho trẻ em: không bạo lực, máu, vũ khí, rượu, thuốc, hở hang (`soften` viết lại prompt bị bộ lọc chặn).
- Người giao tiếp bằng **cử chỉ và nét mặt**, không bong bóng thoại, không điện thoại/màn hình trừ khi câu nói về nó.

## 7. Danh sách phủ định (NEG – `style.mjs`)
text, letters, words, writing, caption, label, sign, logo, brand, flag, numbers, clock face, speech/thought bubble, lightbulb, question/exclamation mark,
arrow, heart symbol, emoji, icon, screen with…, chart, graph, calendar, newspaper, book cover, banner, poster, watermark, frame border, collage, split/comic panel.
- **Không bao giờ ghi các từ này vào prompt** (FLUX schnell không có negative prompt; nhắc tên → nó HIỆN ra: lượt e2 có biển HOSPITAL/BANK, bong bóng chữ ở 30/74 ảnh).
- Dùng để: (1) **chặn thẻ** mới (`cleanCard`, `sceneOk` → "sc uses a symbol"); (2) **gọt** mệnh đề chứa chúng khỏi thẻ cũ (`scrub` trong `promptScene`). Ngoại lệ: chính từ đang học (arrow#n, flag#n).
- Thay vào đó mô tả TÍCH CỰC: *plain walls, plain surfaces, people communicate only with faces and hand gestures, purely pictorial*.

## 8. Thế nào là "sai" (loại ảnh, kể cả khi giám khảo cho qua)
1. Có chữ/số/ký tự giả, biển, logo, bong bóng thoại, màn hình có nội dung.
2. Vẽ **nghĩa khác** của từ (bank bờ sông thay cho ngân hàng), hoặc vật **lẫn với từ anh em** cùng chủ đề (cup ↔ mug).
3. Ẩn dụ biểu tượng thay cho tình huống (bóng đèn = idea, trái tim = love, mũi tên đi lên = increase, dấu hỏi = doubt).
4. Chủ thể nhỏ/bị cắt/lẫn trong nền đông; nhiều hơn 2 người; wide shot; nhìn ở 96 px không đoán được.
5. Sai phong cách: ảnh chụp, 3D, gradient đậm, nền tối, màu ngoài bảng (xanh dương Kit cũ).
6. Giải phẫu hỏng (tay 6 ngón, mặt méo), cảm xúc ngược nghĩa (nervous nhưng cười tươi).
7. Không an toàn cho trẻ em, khuôn mẫu văn hoá/giới (chỉ phụ nữ nấu ăn, chỉ đàn ông làm sếp – xoay vòng PEOPLE).
8. Hình không khớp **câu ví dụ** hiện dưới ảnh (từ trừu tượng).

## 9. Sáu ví dụ prompt tốt / xấu
1. **apple (n, cụ thể)**
   - ✗ `An apple with the word APPLE written under it, flashcard` → FLUX viết chữ.
   - ✓ `Illustration of one shiny red apple with a small green leaf, whole and seen from the side. Wordless flat vector icon-style illustration… plain solid light cream background…`
2. **kick (v, hành động)**
   - ✗ `a soccer game in a stadium with players and fans, motion lines` → đông, nhỏ, không rõ ai đá.
   - ✓ `Illustration of a woman with dark brown skin kicking a big orange ball, leg fully extended, whole body visible. …`
3. **careful (adj, tương phản)**
   - ✗ `a careful person` → người đứng yên, không có gì để nhận ra.
   - ✓ `Illustration, medium shot: a man with light skin carries a tall stack of plates slowly with both hands, eyes on the plates, next to a woman with olive skin rushing with a wobbling stack. The quality is exaggerated and obvious at first glance; … one clearly with the quality and one clearly without.`
4. **fear (n, trừu tượng)**
   - ✗ `the concept of fear, dark shadows, a question mark` → biểu tượng, nền tối, NEG.
   - ✓ `Illustration, close medium shot: a man with medium brown skin steps back with wide eyes and raised hands from a big barking dog. The one key moment that shows the idea fills the frame…`
5. **idea / ability (n, trừu tượng)**
   - ✗ `a woman at a whiteboard, a lightbulb glowing above her head` → ẩn dụ bóng đèn (thẻ cũ `ability#n`; `scrub` gọt mệnh đề này).
   - ✓ `Illustration, medium shot: a woman explains with simple hand-drawn shapes while a young man watches and nods, understanding on his face. …`
6. **although (conj, hư từ)**
   - ✗ `Illustration of although` → hình vô nghĩa, gây hiểu lầm.
   - ✓ Không gọi AI: ô SVG khái niệm (`concept.mjs`) + câu ví dụ.

## 10. Pilot A/B mô hình (25/10 07:20)
- Danh sách: `content/visual/pilot-40.json` – 40 nghĩa khó (16 danh từ trừu tượng, 12 động từ, 12 tính từ), đều đã có thẻ cảnh → chỉ mô hình thay đổi.
- Chạy mỗi mô hình một lượt: `vocab-img-scene.yml` `mode=pilot` `only=content/visual/pilot-40.json` `model=<id>` (rỗng = mặc định flux-1-schnell, không gửi trường `model`).
  `only=+a,b` = thêm khoá vào pilot thường (thay input `extra` cũ); `variants=1` = không vẽ lại ảnh trượt (thay `retry`).
- `model` nhận tên ngắn hoặc id `@cf/…` (danh sách cho phép trong `gen.mjs` MODELS: flux-1-schnell, flux-2-klein-4b/9b, flux-2-dev, leonardo/lucid-origin,
  leonardo/phoenix-1.0, sdxl-lightning, sdxl-base-1.0). Gửi kèm `provider: cloudflare`; mô hình ≠ schnell gửi `width/height` 512×512 (ghi đè `VIMG_SIZE=768x512`,
  bội 64, 256–1536); schnell KHÔNG bao giờ gửi cỡ; `steps` để mặc định GrabCast.
- **422** (model_not_allowed / size_not_supported) = lỗi cấu hình → log + dừng, không thử lại. **400** cho trường model (GrabCast cũ) → log, cả lượt gửi không model
  (`gc.model_fallback` ≠ 0 = lượt KHÔNG hợp lệ cho A/B). 503 ai_exhausted = hết bể, dừng sạch như cũ.
- Mỗi ảnh ghi `gc_provider` + `model` thật của job (log `gen.s*.json`); `fill-report.json` có `by_model`, `model_fallback`, `config_err`.
- So sánh: tỷ lệ qua giám khảo cục bộ (ngưỡng giữ nguyên) + chủ duyệt tờ ảnh theo §8. Thắng → ghi mô hình vào workflow fill, tăng `STYLE.v`.

## 11. Vẽ thẳng trên Workers AI (26/10)
- GrabCast trả 500 cho 700/700 ảnh (24/10) → `vocab-img-scene.yml` input `provider` mặc định `cf`: vẽ (`cf-direct.mjs`) và giám khảo thị giác (`local_judge.py` Llama 4 Scout) gọi thẳng REST Workers AI.
- Tài khoản: secret `CF_POOL` (mỗi mục `account_id:token`, ngăn bằng xuống dòng/phẩy; chủ dán, agent không đọc kho khoá), bỏ 5 tài khoản đầu (GrabCast còn dùng), rồi tài khoản 2. Không bao giờ tài khoản chính.
- Trần: `max_gc` (dùng chung) ≤ Σ tài khoản × floor(9.000 neuron / neuron mỗi ảnh `NPI`). `NPI` là ước tính – đo lại bằng analytics trước khi chạy hàng loạt.
- Lịch fill chỉ chạy khi biến repo `VIMG_SCHEDULE=1`.
- **Chốt 26/10 (A/B 40 nghĩa khó):** `flux-2-klein-4b` (phẳng, nền kem, đúng bảng màu); schnell rối hơn; sdxl-lightning loại (gần ảnh chụp, có chữ). Mặc định workflow = klein-4b (ghi đè `vars.VIMG_MODEL`).
- **Vắt hết kho (chủ 26/10, kho chỉ Lexkite dùng):** `VIMG_POOL_SKIP=0`, `VIMG_CF_UNCAPPED=1` – mỗi tài khoản vẽ tới 4006 rồi chuyển. Thẻ cảnh (văn bản) cũng qua kho (ai-pool tuyến cf2 xoay CF_POOL, `scripts/lib/cf-pool.mjs`).
- **Cổng chất lượng tự động (giữ nguyên ngưỡng, không hạ):** OCR chữ · NSFW · tâm phong cách · pHash trùng · CLIP câu ví dụ vs anh em · Llama 4 Scout mô tả mù + hỏi có/không · ≤ 6 KB · tờ ảnh 40 ảnh nhận mỗi lượt · 5 % kiểm mẫu tuần. Trượt hết biến thể → `vimg-scene-queue.json`.
- **Kho ảnh gốc cho video:** mỗi lượt fill tải `vimg-masters-<run>.zip` (≤768 px WebP + manifest.json) lên Release `vimg-masters` (`masters.py`, infra `vimg-masters`).
- **Bài học kho CF (26–27/10, đừng tái phạm):** hạn mức Workers AI là **10.000 neuron / 24 giờ TRƯỢT** mỗi tài khoản (KHÔNG nạp lúc 00:00 UTC) – vắt kho lúc 05–09 UTC thì tới 05–09 UTC hôm sau mới mở lại (dò 27/10: 0/121 lúc 04:09, 107/121 lúc 07:24). Vì vậy: vẽ chỉ nửa đầu kho (`VIMG_DRAW_SHARE` ≤ 0,6, test chặn), giám khảo/kho từ nửa đuôi; giám khảo hết neuron → dừng vẽ; biến repo so trong bash (GitHub coi `''` == `'0'`, test chặn); xem `cf-pool-probe` (mỗi 3 giờ, ~121 neuron) trước khi kết luận "ai đó dùng trộm".
- **Thẻ e4 trong fill (29/10, run 40875877636):** viết lại ~2.000 thẻ TUẦN TỰ → quá giờ job, mất thẻ, 0 ảnh; `scene-publish` chỉ THÊM thẻ → bản e4 viết lại bị bỏ. Nay: lô song song (`VIMG_CARD_CONC`), hạn `VIMG_CARD_MIN` phút, `--prune` chỉ vẽ nghĩa có thẻ e4, `cardWins` đè e3 bằng e4, hỏng 3 lần thì thôi (test chặn).
- **Pilot dò kho + `pool=tail` (31/10):** pilot chạy lúc kho 121/121 báo 4006 → 0 ảnh, job final đỏ. Nay pilot dò kho trước (phần vẽ ≥ 10 và phần viết ≥ 5; `pool=tail` vẽ từ đuôi kho, chừa 10 tài khoản cuối cho giám khảo, chỉ cần đuôi ≥ 15), 0 ảnh thoát sạch. Fill không đổi.
- **Thẻ e5 (PR #243)** không gộp – thay bằng e6 (§12), lấy lại `TEXT_OBJ`, màn hình, `checkEcho`, viết lại thẻ kèm `fix`.

## 12. Thẻ + giám khảo e6 (01/11) – ảnh dùng được ngay, ít neuron
Gốc: lượt fill 41205453283 vẽ 1.469 ảnh, nhận 145 (9,9 %). Trượt đầu tiên: chữ trong ảnh 484, thị giác "no" 450 (nhiều ca chỉ vì tuổi/giới người vẽ), kiểm nghĩa 197; thêm 103 ảnh QUA giám khảo bị bỏ vì > 6 KB. 4.165 lượt thị giác (2,8/ảnh). Thẻ hỏng 80/308 (cap gọi tên từ 47, chữ/biểu tượng 30). Báo cáo ghi 57,6 neuron/ảnh nhưng vẽ klein-4b.
- **Thẻ (`scene.mjs`, `SCENE_V = 'e6'`):** `SCENE_SYS` có mẫu theo loại (danh từ cụ thể / người / trừu tượng, động, tính, trạng) + 7 ví dụ (pencil, duck, hunter, consider, cheap, quickly, agreement), mọi ví dụ phải qua `sceneOk` (test). Cổng: `TEXT_OBJ` (sách, giấy tờ, vé, bảng, quầy, bến xe buýt, tiền giấy…, trừ khi là chính từ học), `SCREEN` (chỉ nhìn từ sau), cap/check gọi tên từ (cả dạng -ing/-s), check "represents/indicates", `checkEcho ≥ 0,75`.
- **Không bỏ thẻ:** trượt cổng → viết lại ngay trong lượt kèm lý do (`fix`, `CARD_TRIES = 3`); cap gọi tên từ → sửa tất định (`repairCard`); thẻ e4 qua cổng e6 → nâng bản tại chỗ (0 lượt AI). Ảnh trượt vì chữ/không thấy nghĩa → `--refix` viết lại thẻ trước biến thể kế (tối đa `VIMG_REFIX_MAX = 2`/nghĩa).
- **Giám khảo (`local_judge.py judge_scene`, ngưỡng giữ nguyên):** cổng cục bộ trượt cứng hoặc nén > 6 KB → không gọi API. Rồi mô tả MÙ (giữ cổng `api_ex`, không thiên vị) → trượt thì dừng → MỘT câu hỏi gộp (cảnh + kiểm nghĩa + câu anh em chống gật bừa). Kiểm nghĩa hỏi CẢ HAI mô hình như e4 (pilot 41274610314: luật tắt "mô hình 1 yes ≥ 90 là đủ" bị mô hình 2 bác 8/32 → bỏ), trừ khi mô hình 1 đã no chắc; đồng thuận mô hình 2 khi cục bộ trượt mềm. Lỗi tạm của thị giác → chuyển tài khoản kế (pilot 1: 33 ảnh 'judge unavailable'). Ảnh gửi 336² (1 ô Llama 4, ~150 token thay ~720). Câu cảnh hỏi giám khảo đổi người thành "a person" trừ khi nghĩa nói về tuổi/giới.
- **Nén:** lùi bước tranh phẳng (`flat`: trung vị 3 px + ≤ 48 màu, cuối cùng 24 màu ở 288 px) sau thang chất lượng cũ, trước khi bỏ ảnh (cứu 14/25 ảnh mẫu > 6 KB).
- **Đo:** `report.mjs` → `fill-report.json` (tỷ lệ đạt theo ảnh + loại từ, neuron vẽ theo `npi` thật – klein-4b 31,4 theo bảng giá – và thị giác theo usage token). Pilot `only=content/visual/pilot-e6.json` (92 nghĩa của lượt 41205453283, trước: 104 ảnh → 19 nhận = 18 %), `variants=2`, `pool=tail`. Pilot 1 (run 41274610314): 34/155 ảnh = 21,9 %, 194 neuron/ảnh nhận (thị giác ~10 neuron/lượt ở 336²).

- **Phong cách lite+ (02/11, mặc định workflow – cả lịch fill; PR #398):** `VIMG_STYLE=liteplus` → `SCENE_STYLE_LITEPLUS` (ít vật, mảng phẳng, chỉ người + chi tiết then chốt) + thẻ có `key` = 1–2 chi tiết mang nghĩa không chữ (cổng `keyOk`; vật thường có chữ → tờ trơn + dấu; `KEY_SYS` chỉ thêm vào lời nhắc khi liteplus; thẻ thiếu key → viết lại kèm lý do). Cổng an toàn `UNSAFE` cho mọi thẻ cảnh (vũ khí, máu trừ y tế, bạo lực, rượu, thuốc lá). Số đo: 18 nghĩa hay trượt e4 22 % / 217 n → lite 33 % / 176 → lite+ 47 % / 122; pilot 92 nghĩa 41396836982 lượt đầu 64,4 % / 146 n mỗi ảnh nhận (mốc #358 53,3 % / 172,5). Quay về: input `style=e4`. Còn lại: "red cross mark" hay bị vẽ thành chữ thập y tế (mistake#n) → đổi ví dụ sang dấu X đỏ cần đo lại.
- **Giữ chỗ kho cho pilot (#400):** biến repo `CF_POOL_HOLD="<n>@<hạn ISO Z>"` → fill/lexicon-expand/giám khảo fill bỏ n tài khoản cuối; job `CF_POOL_ROLE=pilot` dùng; hết hạn tự trả. Sàn pilot `pool=tail` = `pilotFloor` (cf-direct.mjs) theo nghĩa × biến thể.
