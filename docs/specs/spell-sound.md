# Quy tắc chính tả → âm (series "Spell→Sound") – spec 1 trang, 19/11/2026, chờ duyệt
> TL;DR: một template Teach2D mới `rule` dựng chữ động (kinetic typography) từ ngân hàng luật JSON nhỏ; từ, IPA, nghĩa lấy từ kho của app, 0 credit, 0 token AI mỗi tập, hàng trăm tập.
> Đọc khi: thêm luật phát âm, đổi bảng lỗi L1, sửa vùng an toàn nền tảng cho mẫu `rule`.

**Nguồn ý (chủ 19/11):** reel đối thủ "Quy tắc phát âm #2 · kn-". Chỉ lấy cấu trúc 3 nhịp (hook sai lầm → thẻ luật → danh sách từ), làm bản của ta theo phong cách Stitch Motion; không chép thương hiệu / bố cục.

## Dùng lại, không dựng engine mới
`build.py` + Remotion `TeachShort`, giọng Kokoro, Ama/Carlos, `gen.py` (cổng data · level · hook · dup), `qc.py` ≥90, `mix.py`, `native-qa.mjs`, `publish.py`, `autopub_gate`, `store`, lịch 1 video/kênh/ngày. Khác `pron` / pronunciation-pair: đó là cặp âm; đây là *luật chính tả → âm*.

## Dữ liệu (`content/video/teach2d/rules.json`, nhỏ, viết tay một lần)
Mỗi luật: `id`, `kind` (silent · ed · s · magice · softcg · th · tion · stress · homophone · heteronym), `pattern` (regex chính tả), `effect` (chữ câm / đổi âm), `target` (IPA mục tiêu US), `say` (câu nói ngắn). Từ KHÔNG viết tay: `gen.py --rules` quét từ điển app → từ khớp chính tả + **IPA khớp luật (máy kiểm)** + tần suất NGSL → top 6 từ thông dụng. Nghĩa lấy từ `wd-<lang>` / từ điển có sẵn. Đã nằm trong kho: IPA US duy nhất (cmudict-subset + ipaus-manual) → gate "một giọng".
Ngân hàng luật (mọi luật kiểm được bằng IPA): chữ câm kn/wr/gn/mb/ps/gh(t)/h/l (walk, talk, calm)/b (debt)/t (listen, castle) · -ed 3 âm · -s/-es 3 âm · magic e · c/g mềm · th hữu/vô thanh · -tion/-sion · dịch trọng âm (PHOtograph/phoTOgraphy, dùng lại `stress`) · đồng âm (know/no, knight/night) · từ đồng chữ khác âm (read/read). Mục tiêu ≥ 200 tập (≈ 30 luật × 6–9 biến thể bài).

## Bố cục (≤ 6 hàng/màn, 4 nhịp)
1. **Hook L1 ≤ 2 s**: câu sai điển hình của tiếng mẹ đẻ + ✗ ("Bạn đọc *know* là k-nâu ✗?") – chữ trang bản địa, từ tiếng Anh + giọng vẫn tiếng Anh (video-rules 11/11).
2. **Thẻ luật**: mẫu chữ `kn` → `k` gạch/mờ, `n` = /n/.
3. **Danh sách từ**: mỗi từ vào theo tiếng đọc *chậm rồi thường*, chữ câm bị gạch đúng lúc phát âm; IPA pill; chip nghĩa bản địa.
4. **Lặp theo ("Repeat after me")** → quiz 3 giây ("Chữ nào câm?") → CTA deep link màn phát âm của app; câu "tập sau" lấy từ bình luận (hàng đợi tay/CI, không AI mỗi tập).

## Hook theo L1 (một bảng chuỗi mỗi ngôn ngữ, 1 lượt review bản địa độc lập, không review từng video)
vi bỏ âm cuối · es/pt "e-school" · ja/ko l/r · ar p/b · hi v/w · th phụ âm cuối · zh/ru/tr/fr/de/id lỗi điển hình tương ứng. Chuỗi nằm trong `l1`/i18n pipeline (`docs/I18N-PIPELINE.md`), qua `native-qa.mjs`.

**Bước 3 (đã làm, 19/11):** `content/video/teach2d/rule-l1.json` = một mẫu hook + mẹo mỗi ngôn ngữ (14 + en), điền `{wrong}` / `{show}` / `{silent}` từ `rules.json`; `scripts/video/teach2d/rule-l1-qa.mjs` gác đủ ngôn ngữ × luật, luật i18n chung, độ dài, cách đọc sai còn nguyên văn (PR: tĩnh trong teach-video; đêm: `--online` dịch ngược). Lượt review bản địa độc lập vẫn chờ (người bản ngữ / owner) – máy chỉ kiểm hình thức + dịch ngược.

## Cổng QC mới (thêm, không hạ cổng cũ: ≥90, caption, nhịp, LUFS giữ nguyên)
- IPA mỗi từ == kho (US) và khớp luật (`gen.py` + `qc.py`).
- **Vùng nền tảng**: không phần tử nào trong 12% đầu, 22% cuối, 14% lề phải (khung 1080×1920) – chặn bằng `qc.py` layout từ `SAFE` + 3 dải mới.
- ≤ 6 hàng mỗi màn; chip nghĩa không chạm dải phải / băng caption.

## Làm theo thứ tự (1 PR / bước)
1. Spec này + `rules.json` (10 luật chữ câm) + `gen.py --rules` + test. 2. `T_rule` (build.py) + gate vùng nền tảng + 3 clip thử ≥90 (short+wide). 3. Bảng hook L1 15 ngôn ngữ + review. 4. Mở rộng ngân hàng luật tới ≥ 30 luật. 5. `approved.json` `rule` draft → approved, vào lịch.
Rủi ro: luật đồng âm/dị âm cần cặp IPA xác thực (kho `usuk-pairs.json` làm mẫu); luật nào IPA không khớp → bỏ hàng, không sửa tay IPA.
