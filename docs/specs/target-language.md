# Spec-lite: Ngôn ngữ đích (học tiếng Bồ Đào Nha pt-BR – thử)

> TL;DR: Thêm khái niệm "ngôn ngữ đang học" (target language, `tl`) bên cạnh ngôn ngữ nghĩa; lát 1 = nền (Target, khóa thẻ `pt:`, giọng theo bảng) + 30 từ mẫu, cờ `pt_pilot` mặc định TẮT.
> Đọc khi: đụng thẻ/SRS, giọng đọc, nhận giọng, hoặc nội dung ngôn ngữ đích. Chủ duyệt 2/11/2026.

**Mục tiêu.** Người dùng học được tiếng Bồ Đào Nha (Brazil) bằng cùng SRS/Ôn/Sổ từ; tiếng Anh giữ nguyên từng byte. Thuật ngữ: `tl` = ngôn ngữ ĐÍCH (đang học) – KHÁC `I18N.learnLang()/meanLang()` = ngôn ngữ NGHĨA.

**Thiết kế (lát 1 – đã làm).**
- `web/js/target.js` (`Target`): `cur()` 'en'|'pt', `set()`, `enabled()` = cờ công khai `pt_pilot` (config/admin) HOẶC `localStorage lk.pt='1'`; bảng theo ngôn ngữ: lang speechSynthesis, lang nhận giọng, giọng Kokoro, giọng giáo viên (Ama nữ / Carlos nam), tiền tố lọc giọng máy, có file từ dựng sẵn chưa. 'en' tái tạo đúng hành vi cũ.
- Thẻ: khóa tiếng Anh không đổi (không di chuyển); thẻ pt = khóa `pt:`+từ + trường `tl:'pt'` (`Core.tlKey/cardKey`). `App.state.cards` = `Cards.mine()` = thẻ của `Target.cur()` (khóa = từ như cũ) → Ôn/Luyện/Sổ từ chỉ thấy ngôn ngữ đang học; thẻ không có tl = 'en'. Đồng bộ mang thẻ nguyên vẹn (sync-pack §9: không rút gọn/bơm thẻ pt theo kho tiếng Anh).
- Bộ phận chỉ-tiếng-Anh bỏ qua thẻ pt: tra từ điển/IPA/âm thanh tiếng Anh, Whisper on-device (`whisper-tiny.en`), nghĩa bản ngữ theo từ tiếng Anh, ảnh (chỉ trường `img` = khóa tiếng Anh `từ#loại` đúng nghĩa).
- Cài đặt › Mục tiêu học: hàng "Ngôn ngữ đang học" (English / Português (beta)) + nút "Thêm 30 từ cơ bản" – chỉ khi cờ bật. Không màn mới.

**Giọng (quyết định).** Luật chủ: MỘT giọng miễn phí nhất quán mỗi ngôn ngữ, dựng sẵn trên CI, speechSynthesis chỉ là dự phòng cuối. Cùng mô hình Kokoro-82M (Apache-2.0) với tiếng Anh; âm vị pt-br từ G2P chính thức của Kokoro (misaki `EspeakG2P`, `scripts/word-audio/pt_g2p.py` – gói phonemizer kèm kokoro-js chỉ có espeak tiếng Anh); giọng `pf_dora` (Ama, nữ) / `pm_alex` (Carlos, nam). Piper `pt_BR` (dự phòng trong spec) chỉ có giọng NAM và đạt kém hơn → không dùng. Cổng `pt_gate.py` (không nới: khớp đúng chữ, −16 LUFS ±1, ≥ 80 % mỗi giọng): từ đơn đọc trong câu mang "A palavra é: …" rồi cắt theo mốc Whisper (như tiếng Anh), nghe bằng Whisper large-v3-turbo sau câu mang của chính giọng (Whisper bịa chữ khi nghe từ tiếng Bồ trơ trọi), chuẩn hoá độ to lặp, bỏ tiếng xì /s/ Kokoro sinh cuối phát ngôn (đo ZCR; trừ chữ tận cùng s/z/x/r).

**Nội dung.** `content/target/pt/` = `schema.json` + `seed.json` (30 từ soát tay: lemma, loại, giống, IPA pt-BR, nghĩa 15 ngôn ngữ, ví dụ pt+en, `img` chỉ khi đúng nghĩa). Bộ lõi ~300 từ: `scripts/target/gen.mjs` (CI `target-content.yml`) – ai-pool chung, 2 giám khảo khác họ + dịch ngược + cổng `validate()` + mẫu soát ≥ 5 %; đăng ký `content/qa/sources.json` (`target-lang`). Nguồn tần suất: FrequencyWords (OpenSubtitles 2018 pt_br, CC BY-SA 4.0 – chỉ dùng thứ hạng, ghi công ở đây).

**Tiêu chí xong (lát 1).** Cờ tắt → không thay đổi gì với người dùng; `scripts/test/target-lang.mjs` + `sync-pack` xanh; i18n-qa xanh (chuỗi mới đủ 15 ngôn ngữ); khung ≤ 374 KB gz; lượt mẫu giọng đã chạy (run id ghi dưới).

**Cổng.** `npm test` (target-lang: cờ, bảng giọng, khóa, lọc hàng ôn, seed), content-qa, i18n-missing/qa, shell-size, sync-pack; CI word-audio-pt (ASR + LUFS).

**Lát 2 (chưa làm).** (1) Dựng file từ pt cả bộ (`audio/w`, `wordFiles:true`) sau khi lượt mẫu đạt; (2) chạy `target-content` thật → soát mẫu → gộp `core.json` + thêm vào Thư viện/Bộ từ; (3) gán `img` tay cho bộ lõi; (4) giáo viên Ama/Carlos đọc pt (lời bài, `Target.teacherVoice`); (5) bật cờ cho nhóm thử + đo; (6) màn chọn ngôn ngữ lúc bắt đầu (từ Stitch); (7) rà nốt chỗ còn giả định tiếng Anh (gợi ý từ/collocation, mini-game, xuất Anki/CSV có trường tl).

**Trạng thái.** Lát 1 gộp 2/11 (#445). Lượt mẫu giọng ĐẠT: run 41452436213 – Ama 19/20, Carlos 17/20 (Piper đối chứng 13/20). Chuỗi gốc lỗi: 41428871761 (espeak chỉ tiếng Anh) → 41430778545 (7/20, từ trơ + Whisper small) → 41444914173 (15/20) → 41449289253 (18/20 · 15/20, đuôi /s/).
Lát 2 (PR riêng): `word-audio-pt.yml` `all=1` dựng cả bộ (từ + câu ví dụ, seed + core) → chỉ file đạt lên kho media `audio/w/<fnv(giọng|chữ|s3)>.mp3`, chỉ mục `web/js/target-pt-audio.json` (`Target.fileKey/voiceFor`, `ui.js` `tlFile`: Ama/Carlos đọc pt đúng giọng nữ/nam); `web/js/target-lib.js` (gói `tlib`): Thư viện pt (bộ 30 từ/bộ theo tần suất), gợi ý ô tìm kiếm, câu nhiễu mini-game từ bộ pt; Anki/CSV nhãn `lang:pt` + nghĩa câu ví dụ; nghĩa thẻ pt theo ngôn ngữ giao diện; `?pt=1` bật thử (preview), cờ production vẫn TẮT. Lát 3: màn chọn ngôn ngữ lúc bắt đầu (từ Stitch) – chưa làm.
