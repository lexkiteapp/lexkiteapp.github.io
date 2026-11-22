# Spec: Khóa học tiếng Pháp (tl `fr`) cho 14 ngôn ngữ giao diện

> TL;DR: Dạy tiếng Pháp A1→C2 bằng ĐÚNG engine và nền `Target`/`tl` đã chạy cho es (`spanish-course.md`) – thêm 1 dòng bảng + dữ liệu, không nhánh code mới. 8 đợt (W0–W7) song song khung W0→W7 của es, cờ `fr_course` + `fr_course_pct` + `fr_kill` mặc định TẮT. Chưa có dòng code nào: spec này chờ chủ duyệt (mục 9), `fr` không bật cho người dùng trước khi #1340 (es tú) live và es lên 100 %.
> Đọc khi: thêm ngôn ngữ đích thứ ba, đụng `content/target/fr/`, hoặc bất kỳ chỗ nào giả định "chỉ en/pt/es". Soạn 15/11/2026. Mọi điểm không nêu ở đây = theo `spanish-course.md` (một nguồn, không chép lại).

## 1. Mục tiêu
Người nói vi, en, ar, de, es, hi, id, ja, ko, pt_BR, ru, th, tr, zh_CN (giao diện `fr` → không chào khóa này) học tiếng Pháp đủ mọi phần như khóa tiếng Anh/TBN: từ điển/Sổ từ/SRS, ngữ pháp + drills, lộ trình ngày, phát âm, nghe/nói, gọi điện AI, thi thử, video Teach2D, ảnh từ vựng, add-on tra từ. Tiếng Anh và TBN giữ nguyên từng byte (test hồi quy `target-lang`).

## 2. Khác với es – chỉ những chỗ phải làm riêng
- **Một bảng, không nhánh code**: dòng `fr` ở `web/js/target.js` (`speech` `fr-FR`, `rec` `fr-FR`, dự phòng `fr-CA`; Kokoro `ff_siwis` là giọng nữ duy nhất có sẵn → xem rủi ro §7), dòng `TL_GEN.fr` (`scripts/target/tl-gen.mjs`), `TL_RULES.fr` (`lib.mjs`), `tl-voices.json`. Test `target-lang` chặn mọi `if (tl==='fr')`.
- **Nội dung riêng của tiếng Pháp** (schema mở rộng, cùng mẫu es): giống (m/f), số nhiều (kể cả bất quy tắc: -al→-aux, -eau→-eaux), mạo từ xác định/bất định, **liaison/elision** (l'ami, j'ai), **h muet / h aspiré** (cờ trên từ), dấu (é è ê ç œ), chia động từ (bộ chia `scripts/target/conjugate.mjs` thêm bảng `fr`: 3 nhóm, être/avoir/aller/faire…, passé composé với être/avoir, accord du participe, subjonctif, plus-que-parfait).
- **Chuẩn ngôn ngữ** (chốt ở §8): tiếng Pháp chuẩn quốc tế/Pháp, trung tính; từ Québec/Bỉ/Thụy Sĩ chỉ ở ghi chú "Ở Canada/Bỉ".
- **Phát âm** (W3): nguyên âm mũi (an/on/in/un), u /y/ vs ou /u/, r uvula /ʁ/, e câm, liaison và enchaînement, nguyên âm /ø œ/, /ɥ/. Cặp tối thiểu THẬT SỰ khác âm (dessus/dessous; pain/peint là đồng âm → làm bài chính tả, không làm cặp; test chặn như es).
- **Thi thử** (W5): định dạng **DELF A1–B2 / DALF C1–C2** và **TEF / TCF** tự soạn, nhãn "Luyện theo định dạng", không liên kết France Éducation international/CCI Paris, không đề thật (tên thi là nhãn hiệu – chỉ mô tả).
- **Add-on** (W6): nhận câu tiếng Pháp (nhận diện bằng dấu + từ chức năng, không quyền mới – `permissions.lock`).
- Phần còn lại (kiến trúc engine tham số hoá `tl`, giải thích bản ngữ en→14, giao diện chỉ màn Stitch, một giọng xuyên suốt, video Teach2D) = `spanish-course.md` §2, không đổi.

## 3. Nguồn MIỄN PHÍ (giấy phép)
| Phần | Nguồn / cách làm | Giấy phép – lưu ý |
|---|---|---|
| Khung cấp độ | CEFR; chuẩn tham chiếu "Référentiels CECRL" của Hội đồng châu Âu chỉ để đối chiếu danh mục, không chép chữ | dùng tự do |
| Tần suất từ | FrequencyWords `fr` (OpenSubtitles 2018) – chỉ thứ hạng | CC BY-SA 4.0, ghi công |
| Lemma, giống, chia động từ, IPA đối chiếu | Wiktionary qua kaikki.org (`French`) – kiểm chéo trên CI, không ship dữ liệu dẫn xuất | CC BY-SA |
| IPA | espeak-ng `fr-fr` sinh + chuẩn hoá (`ipa.mjs` thêm bảng fr: /ʁ/, nguyên âm mũi, e câm) | GPL công cụ, đầu ra tự do |
| Câu ví dụ | Tự soạn qua ai-pool; Tatoeba (fra) chỉ để đo độ tự nhiên và làm câu NGƯỜI VIẾT cho đề thi | CC BY 2.0 FR |
| Kiểm ngữ pháp | LanguageTool `fr` tự chạy trên runner (`lt-up.sh`) + treebank UD French-GSD/Sequoia thử cổng | LGPL / CC BY-SA |
| Giọng (MỘT giọng) | Kokoro-82M `ff_siwis` (nữ) + âm vị espeak `fr-fr`; dự phòng Piper `fr_FR-siwis-medium` | Apache-2.0 / MIT |
| Nhận giọng | Whisper small đa ngôn ngữ (CI), máy người dùng theo tầng thiết bị | MIT |
| Ảnh từ vựng | Tái dùng `img.json` khi trùng nghĩa `từ#loại`; thiếu → `vocab-img-free.yml` | không chữ trong ảnh |
| Video | Teach2D, Ama + Carlos 2D đọc fr, ≤ 150 wpm, chủ duyệt mẫu | 0 credit |

## 4. Đợt (mỗi đợt = 1 PR + cờ tắt; mở PR khi đợt xong)
| Đợt | Nội dung | Phút CI |
|---|---|---|
| W0 | Spec này; dòng `fr` ở `Target`/`TL_GEN`/`TL_RULES`/`tl-voices.json`; cờ `fr_course`/`fr_course_pct`/`fr_kill`; seed 30 từ soát tay; lượt mẫu giọng (`word-audio-fr`: Kokoro `ff_siwis` vs Piper) + cổng IPA | 60 |
| W1 | Từ vựng A1–B2 3.000 lemma (giống, số nhiều, h muet/aspiré, IPA, nghĩa 14 ngôn ngữ, ví dụ, audio, `img` khi đúng nghĩa) theo lô 300 | 1.500 |
| W2 | Ngữ pháp A1–C2 (~220 điểm), bộ chia động từ fr + kiểm chéo Wiktionary 100 %, drills qua qengine, giải thích en→14 | 1.200 |
| W3 | Phát âm (§2), cặp tối thiểu, nghe chính tả (dấu: thiếu accent vẫn đúng kèm nhắc), nói theo; Whisper đa ngôn ngữ tầng thiết bị | 600 |
| W4 | Lộ trình ngày + bài học + ≥ 24 cuộc gọi AI A1–C1 | 500 |
| W5 | Thi thử DELF A1–B2 + DALF C1–C2 + TEF/TCF: spec định dạng, ≥ 2 đề/cấp, chấm nói/viết qua ai-pool + rubric | 700 |
| W6 | Video Teach2D fr + ảnh từ vựng còn thiếu + add-on nhận câu Pháp | 1.000 |
| W7 | Màn Stitch (chọn ngôn ngữ học, nhãn tl), bật theo bậc `fr_course_pct` 10→50→100, rà chỗ giả định en/es, bản native, kiểm live có ảnh | 300 |

## 5. Cổng QC trên CI (trượt 1 = không gộp; không nới ngưỡng)
Giống `spanish-course.md` §5 với `fr`: LanguageTool fr 0 lỗi mọi câu Pháp; 2 giám khảo AI + dịch ngược; bảng chia khớp Wiktionary 100 %; IPA espeak ↔ Wiktionary; `i18n-missing/qa --strict`; Whisper small fr WER mục từ = 0; −16 LUFS; visual-qa; content-gate ≥ 95; soát tay mẫu ≥ 5 %; không hồi quy en/es. Thêm: **lint trộn tu/vous** trong câu chính (một bài một xưng: `tu` ở bài đời thường, `vous` ở bài trang trọng/gọi điện công việc; trộn trong một lời thoại = đỏ) – dùng lại máy gác de+fr của #1324 (`scripts/lib/i18n-rules.mjs`) và mở rộng cho nội dung `content/target/fr/`.

## 6. Tiêu chí xong
Như `spanish-course.md` §6 cho fr: mọi phần ở §1 đủ A1→C2, qua 6 cổng ở 14 ngôn ngữ, giáo viên dạy bằng giọng fr, chạy web/add-on/iOS/Android, cờ bật 100 % sau 1 tuần nhóm thử không lỗi chặn.

## 7. Rủi ro
- **Giọng Kokoro fr chỉ có 1 giọng nữ** (`ff_siwis`): Ama dùng nó; Carlos cần giọng nam → lượt mẫu W0 thử Piper `fr_FR-gilles`/`tom`; chưa có giọng nam đạt (−16 LUFS, WER) thì Carlos tạm dùng cùng giọng với màu khác (pitch ±) hoặc video fr chỉ có Ama. Không dùng dịch vụ trả phí.
- **Hạn mức ai-pool** (≈ 3.000 từ × 14 ngôn ngữ): chạy đêm, nối tiếp; không chuyển sang trả phí khi chưa hỏi chủ.
- **CC BY-SA lan truyền**: chỉ thứ hạng/kiểm chéo, không ship dữ liệu dẫn xuất.
- **Dung lượng**: `web/cpack` đang sát trần 3 MB (es W4) → dữ liệu fr đưa ra CDN/lazy ngay từ W1; size-budget chặn. Không nâng trần nếu chưa có đo.
- **Tu/vous và chính tả**: đáp án nhận cả dạng thiếu accent kèm nhắc (như tilde ở es); không chấm sai vì bàn phím.
- **Chồng chéo với es**: es đang bật theo bậc → fr không bật cho người dùng trước khi es 100 % và #1340 live.

## 8. Quyết định chuẩn ngôn ngữ (đề xuất, chờ chủ)
**Tiếng Pháp chuẩn của Pháp, trung tính** là chuẩn duy nhất cho giọng, IPA, ví dụ, đáp án và chấm điểm; từ vùng (Québec: char, dépanneur; Bỉ: septante, nonante; Thụy Sĩ: huitante) chỉ ở khối ghi chú nhận biết, không bắt buộc trong đáp án (septante/nonante chấp nhận). DELF/TEF/TCF đều chấp nhận chuẩn này. Cổng lint: câu chính không có dạng vùng hay thông tục nặng (bagnole, boulot) trừ khối ghi chú/bài "langue familière".

## 9. Điểm cần chủ quyết
1. Chuẩn Pháp (đề xuất) hay Canada? Ảnh hưởng giọng, IPA và thi (DELF Pháp vs TEF Canada).
2. Đồng ý nhãn "Luyện định dạng DELF/DALF · TEF/TCF" (không liên kết cơ quan cấp chứng chỉ).
3. Carlos/giọng nam fr: chấp nhận "chỉ Ama" ở fr nếu lượt mẫu W0 không có giọng nam đạt?

## 10. Trạng thái
- **W0 spec** (15/11/2026): file này. Chưa code; chờ duyệt §9 rồi mở PR W0 (dòng bảng + cờ + seed + lượt mẫu giọng).
- **Duyệt** (15/11/2026): điều phối duyệt spec + §9 theo mặc định đề xuất (chuẩn Pháp; nhãn 'Luyện định dạng'; chấp nhận 'chỉ Ama' nếu W0 không có giọng nam đạt), theo ủy quyền của chủ 12/11. Cờ `fr_course` giữ 0 % tới khi #1340 live và W7 fr đạt QC.
- **W0 code** (15/11/2026): dòng `fr` ở `web/js/target.js` (+ bản add-on) – `fr-FR`, dự phòng `fr-CA`/`fr-BE`, Kokoro `ff_siwis` (Ama; Carlos tạm cùng giọng cho tới khi lượt mẫu có giọng nam đạt); cờ `fr_course`/`fr_course_pct`/`fr_kill` (PUBLIC_KEYS + CONFIG_KEYS, mặc định TẮT; dùng chung nhóm thiết bị `lk.esb` với es → nhóm fr nằm gọn trong nhóm es); `TL_GEN.fr` + `TL_RULES.fr` (danh từ bắt buộc giống + số nhiều, cờ `h` muet|aspire bắt buộc cho từ mở đầu bằng h, lint từ vùng/thông tục, **lint trộn tu+vous trong một câu** dùng lại `INFORMAL.fr` của #1324); `tl-voices.json` fr (espeak `fr-fr`, Whisper small, Piper `fr_FR-siwis-medium` dự phòng); nhãn `word-audio-fr` + ma trận PR `target-content` thêm fr (IPA espeak + Wiktionary trên seed); seed 30 từ `content/target/fr/` (dùng lại nghĩa 15 ngôn ngữ của seed es cho 28 khái niệm chung + homme/haricot cho h muet/aspiré; ciel→cieux, eau→eaux); chuỗi "Đã thêm {n} từ tiếng Pháp" đủ 15 ngôn ngữ. Trang chủ `home` của fr chờ lộ trình ngày W4.
- **W1 cần**: `lt-up.sh fr`, nguồn FrequencyWords `fr_50k`, chạy `target-content` tl=fr theo lô 300 (shard ≤ 12), gộp lô bằng `bot-output.sh`.
- **W2 ngữ pháp + bộ chia** (22/11/2026): bộ chia `scripts/target/conj-fr.mjs` (quy tắc tự viết: nhóm 1 ç/ge, è, -eler/-eter, -oyer; nhóm 2 -iss-; nhóm 3 theo kiểu partir/ouvrir/-re/-indre/-uire/-aître; ~75 động từ bất quy tắc + phái sinh theo tiền tố; 6 ngôi; 18 khóa thì gồm passé simple, subjonctif imparfait, thì ghép avoir/être có hợp số, futur proche, passé récent) – kiểm chéo Wiktionary `conj-check.mjs --tl fr` **khớp 10 542/10 542 ô** (222 động từ, gồm cả trợ avoir/être; 38 ô Wiktionary trống của falloir/pleuvoir), test 0 mạng `fr-conjugate.mjs`. Kho `content/target/fr/grammar-inventory.json` 233 điểm A1–C2 (38/42/48/40/34/31), `drills.json` 384 câu điền từ (3/điểm A1–B1, soát lại bởi người duyệt thứ hai: bỏ phương án không phải từ thật, bỏ câu hai đáp án) + bài chia động từ sinh từ bộ chia; giải thích `gx/<15 ngôn ngữ>.json`. CÙNG engine es: `drill-lib.mjs` bảng `TLP` theo tl, `drill-pack.mjs --tl fr` → `web/cpack/fr/{dr,gx-*}.js`, màn `web/js/espr.js` bảng `TLC` (`#/practice/fr?lv=A1|A2|B1`, lối vào ở Luyện tập khi cờ `fr_course` bật), test jsdom `fr-practice.mjs`. Cổng CI (target-content, ma trận fr): conj-check fr, LanguageTool fr 0 lỗi trên ví dụ + câu điền từ, một câu một xưng (tu ⟂ vous).
- **W3 phát âm** (22/11/2026): CÙNG engine es, bảng theo tl, không nhánh mới – `scripts/target/px-lib.mjs` bảng `TLX` (`buildPx(tl)`; fr lấy IPA từ bảng `ipa` trong `content/target/fr/pron.json`, thiếu từ nào = lỗi dựng), `drill-lib` `TLP.fr.px`, `drill-pack --tl fr` → `web/cpack/fr/px.js` + `px-<15 ngôn ngữ>.js` (es giữ nguyên từng byte); màn `web/cpack/es-app/pron-ui.js` `App.espron(tp, m, tl)` bảng `TLX` (khoá `lk.fr.px`, giọng/nhận dạng `Target` fr-FR, Whisper đa ngôn ngữ `WLANG.fr`, nhắc thiếu dấu é è ç dùng khoá W2), route `#/practice/frp` (`MODES.frp`, ô lối vào khi cờ `fr_course` bật, `App.frPx`, bundle `frpx`). 8 chủ đề (nguyên âm mũi, u/ou, r, e câm, é/è, eu/œu, liaison, bán nguyên âm) × 3 bài; `eai` không có cặp (é/è trùng ở nhiều người đọc → chỉ chính tả + nói theo). Cổng: test `fr-pron.mjs` (chặn đồng âm pain/peint, vert/verre/vers, sans/cent, ses/ces, mer/mère, ou/où; hai IPA của mỗi cặp khác nhau; jsdom trọn 3 bài) + CI target-content (ma trận fr) `tl_ipa_fill.py --pron` đối chiếu bảng IPA soạn tay với espeak-ng fr-fr (lệch = đỏ) + `drill-pack --tl fr --check` (gói px khớp nguồn). Corpus giọng Kokoro cho từ/cụm (`px-lib.pxLines('fr')`) chờ corpus-fr ở W6.
- **W4 lộ trình ngày + 24 cuộc gọi AI** (22/11/2026): CÙNG engine es – `path-lib.buildPath(pts, px, T)` nhận hàng `TLP` (tl · thư mục · biến gói `FRX`), `drill-pack --tl fr` ghi thêm `web/cpack/fr/{dy,wd,cl}.js` + `dy-/wd-<15 ngôn ngữ>` (es byte-y hệt); 128 ngày = 128 điểm A1–B1, mỗi 5 ngày một cuộc gọi dễ → khó; kho từ chỉ seed 30 + lô `core-NN.json` status reviewed (có lô mới tự dàn đều, ≤ 8 từ/ngày; ngày không có từ mới bỏ bước từ). Bước phát âm: `TLP.fr.px` chưa có (W3 ở nhánh riêng) → chủ đề rỗng, bỏ bước, không liên kết hỏng; khi W3 vào chỉ thêm `px` + `App.frPx`. Màn `#/practice/frd` = `cpack/es-app/day-ui.js` bảng `TLD` (mạo từ le/la/l' theo giống + cờ h aspiré, thẻ `tl:fr` vào Ôn tập), `Target.fr` có `home` + `routes` (vẫn `ready:false`, cờ không đổi), ô "Lộ trình" ở Luyện tập khi `Target.enabled('fr')`. `js/call.js`: id `fr-…` mở thẳng cuộc gọi fr, bảng UNSAFE + câu lái lại theo tl, `engine.js TLX.fr` (đệm euh/ben, liên từ). 24 cuộc A1 4 · A2 5 · B1 6 · B2 5 · C1 4 (Ama/Carlos) soát LanguageTool fr (sửa: serai/regarder/parce que/Comment souhaitez-vous payer/dấu phẩy sau Alors…), `calls-check.mjs --tl fr` = cấu trúc + lệch chuẩn + MỘT xưng hô tu|vous mỗi cuộc, CI target-content (ma trận fr) thêm `--lt`. Test `fr-path.mjs`; `cpackTotal` +118 721 B (`_cpackNote17`).
- **§9 đã quyết** (22/11/2026, điều phối giao toàn quyền): chuẩn Pháp; nhãn "Luyện theo định dạng DELF/DALF · TEF/TCF" không liên kết cơ quan cấp; giọng nam Carlos thử Piper `fr_FR-gilles`/`tom` ở lượt mẫu W6 – đạt −16 LUFS + WER thì dùng, không đạt → video fr chỉ Ama (ghi lý do ở đây).
- **W5 luyện theo định dạng DELF/DALF** (22/11/2026, nhãn "Luyện theo định dạng", không phải đề thật/không liên kết FEI–CCI): CÙNG engine es, không nhánh mới – `scripts/target/exam-es-lib.mjs` bảng `EXT` theo tl (mã Tatoeba `fra`, kho từ seed/core, danh sách cấm, hạn mức cấp, bẫy điền từ fr = đại từ chủ ngữ + dạng cùng động từ ở ngôi khác qua `conj-fr.mjs` và mạo từ giống ngược le/la/un/une, cùng kiểu nguyên/phụ âm), `exam-es-check.mjs --tl fr`, `web/cpack/es-app/exam-ui.js` bảng `TX` (route `#/practice/frx`, `App.frX`, khóa `lk.fr.x`), `exam-es-build.yml` có input `tl`. `content/exams/fr/spec.json`: chỉ quy tắc chung (mỗi phần /25, tổng /100, đạt ≥ 50 và ≥ 5/25) – mọi thời lượng/số bài = `null` (trang chính thức chặn bot lúc soạn, chưa đối chiếu được), UI ẩn chỗ null; điểm phần = ước lượng n/25 từ %. **Chưa có nguồn Tatoeba fr** (`content/exams/fr/src/` do CI dựng: dispatch exam-es-build tl=fr levels=A1…C2, lấy artifact `bot-output-exam-fr`, rồi thêm các dòng gói vào `App.frX`): đến lúc đó route hiện "chưa có bài", tile chỉ hiện khi `App.frX.lv` có gói; bước CI target-content dùng `--require-src` nên đỏ nếu thiếu nguồn sau khi dựng. Test `fr-exam.mjs` (engine với kho nhỏ trong test + jsdom gói tạm).
