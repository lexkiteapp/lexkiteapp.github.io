# Khung học chung: Next/Back/Thoát + xếp câu, điền từ (spec-lite, chủ 2/11)
> TL;DR: Mọi màn học đi cùng một nhịp như Duolingo/Babbel/Busuu: thanh trên = Thoát + tiến độ · thanh dưới vùng ngón cái = Kiểm tra → đúng/sai + vì sao → Tiếp tục · Enter = nút chính · Back chỉ xem lại bước trước (không đổi điểm) · Bỏ qua nghe/nói (đưa câu vào ôn) · lưu chỗ dở · màn kết luôn có bước tiếp. Một khung (`exit-guard.js`) + một bộ tương tác (`choice-kit.js`), đo bằng máy (`nav-sweep`).
> Đọc khi: thêm/sửa màn học, dạng bài xếp câu/điền từ, nav-sweep đỏ.

## Phương pháp các ông lớn (chỉ cách làm)
Duolingo: một nút chính cố định đáy (Kiểm tra → Tiếp tục), tấm phản hồi trượt lên kèm đáp án đúng, Enter = nút chính, "Không nghe/nói được lúc này" tắt 15 phút; ngân hàng thẻ giữ chỗ, chạm để đặt/gỡ, kéo để đổi chỗ; chấp nhận biến thể viết + lỗi gõ nhỏ có ghi chú. Babbel/Busuu: tiến độ theo bước, xem lại bước trước, ôn câu sai cuối bài, màn kết đề xuất bài kế.

## Hiện trạng (đo 2/11 – đọc mã + `nav-sweep` CI; Y đủ · ~ một phần · — thiếu)
| Màn | Tiếp | Back xem lại | Thoát | Kiểm→PH→Tiếp | Bỏ qua | Tiến độ | Chỗ dở | Kết + bước tiếp | Enter |
|---|---|---|---|---|---|---|---|---|---|
| Bài học lộ trình / truyện (lesson/ui.js) | Y | — | Y | Y | Y | Y | — | ~ (không NextStep) | ~ |
| Luyện mcq/cloze/nghe (study.js) | Y | — | Y | Y | ~ | Y | — | ~ | Y |
| Ôn flashcard (review) | Y | ~ (Z hoàn tác) | Y | — | — | Y | — | Y | Y |
| Ngữ pháp bài / drill (grammar.js) | Y | Y / — | ~ / Y | Y | ~ | Y | — | — | ~ |
| quick · reflex · paraphrase · rtype | ~ | — | ~ | ~ | — | Y | — | ~ | ~ |
| Nghe · nghe-test · chép chính tả | ~ | Y | ~ | ~ | — | ~ | ~ | Y (NextStep) | ~ |
| Đọc (read) | — | — | ~ | Y | — | — | — | Y (NextStep) | ~ |
| Nói · phát âm · roleplay · Play&Speak · say | Y | — | ~ | ~ | ~ | ~ | ~ | — | ~ |
| Viết · task1 · thư | — | — | ~ | — | — | ~ | Y (nháp) | — | — |
| Thi thử IELTS / TOEIC / TOEFL / CBT / xếp lớp | Y | Y | Y | ~ (chấm cuối) | ~ | Y | Y (24 h) | ~ | — |
| Call, video học, handsfree | ~ | ~ | ~ | ~ | — | — | ~ | — | — |

Tổng ~30 loại màn: thiếu **Back xem lại 23**, **lưu chỗ dở 22**, **màn kết có bước tiếp 24**, **Enter đi tiếp ~18**, **Bỏ qua nghe/nói ở 6/9 màn nghe-nói**. Xếp câu chỉ chạm (không kéo, không phím); điền từ: mỗi màn một kiểu so (QE bỏ the/a/an, lesson bỏ dấu, luyện tha 1 lỗi gõ), không màn nào nhận viết tắt (don't = do not). Bảng máy đo từng màn: artifact `nav-sweep/report.md` (job `nav` của QA bot).

## Khung chung (một chỗ – `web/js/exit-guard.js`, nối `App.afterRoute`)
- Thanh trên FOCUS (Thoát + tiến độ đồng bộ `[role=progressbar]`): **bật mặc định** (exit-sweep xanh, luật 2/11); tắt thử `?exitbar=0` / `lk.exitbar=0`.
- **Enter = nút chính** của bước: `[data-lk-primary]` hoặc id đã biết (`#lsnCheck/#lsnNext/#nextQ/#nx/…`, danh sách `PRIMARY`); không bắt khi đang ở nút/link/ô gõ (màn tự xử lý) hay hộp hỏi mở. `ExitGuard.primary()` cho nav-sweep. Màn mới: gắn `data-lk-primary` vào nút Kiểm tra/Tiếp tục.
- Lát sau (theo thứ tự): thanh dưới cố định vùng ngón cái + tấm phản hồi chung (`.lsn-foot` → mọi màn) · Back xem lại (chỉ xem) · Bỏ qua nghe/nói đưa câu vào ôn · lưu chỗ dở (`ExitGuard.onSave`) · màn kết luôn gọi `NextStep`.

## Bộ tương tác (`web/js/choice-kit.js`, gói lười: readings/listening/mock/toefl/toeic/usage/lfx)
- `WordArrange.bind(o)` (`web/js/word-arrange.js`, gói lesson/grammar/toefl – MỘT component cho mọi màn xếp câu, cấm viết bản riêng): chạm thẻ ngân hàng → nối cuối; chạm thẻ đã đặt → về ĐÚNG ô cũ (ô giữ chỗ); kéo (pointer events: chuột + cảm ứng) chèn vào GIỮA/đổi chỗ/kéo ra để gỡ, Esc hủy; vạch chèn + thẻ dạt bằng transform, hàng đáp án giữ sẵn chiều cao nên thả không xê dịch bố cục; Enter đặt rồi focus sang thẻ đó, ←/→ đổi chỗ (theo RTL), Home/End, Delete gỡ, Backspace gỡ thẻ cuối, số 1–9, Ctrl/⌘+Z hoàn tác; aria-live đọc vị trí; thẻ tiếng Anh luôn đọc trái → phải kể cả giao diện RTL. Test: `lesson-drag.mjs`, `word-arrange-e2e.mjs` (Chromium + WebKit).
- `ChoiceKit.accept(gõ, đáp án, {alts, typo})` – điền từ: hoa/thường, nháy cong, khoảng trắng, dấu câu cuối, viết tắt ↔ đầy đủ, đáp án thay thế; `typo` tha 1 lỗi (kể cả đổi chỗ 2 chữ) ở từ ≥ 5 chữ → `how: 'typo'` để màn gạch chân. `ChoiceKit.hint(đáp án)` = chữ đầu + số ký tự. Ô inline thẳng baseline: CSS `.gap`/`.cw` của #351.
- `ChoiceKit.hints(host, {opener, full, level, onUse})` – thang gợi ý (chủ 2/11) cho Call/nói/viết/điền từ/xếp câu: ẩn mặc định (nút 💡 "Cần gợi ý?"), bậc 1 câu mở đầu (bấm, phím H hoặc im lặng 5–10 s theo A1→C1), bậc 2 câu mẫu; `onUse` → màn ghi "có trợ giúp" (giảm nhẹ XP, đưa câu vào ôn). `ChoiceKit.gloss(el)` – dòng dịch dưới câu giáo viên: ẩn (mờ), chạm/Enter để hiện, nhớ `lk.gloss`. Gắn vào Call sau khi #293 gộp (call/* thuộc lipsync-live).
- Đã áp: Luyện (study.js gõ đáp án); xếp câu: bài học build/tr, ngữ pháp "Xếp câu", TOEFL Build a Sentence ("Ghép công thức" ngữ pháp là trò chọn đúng thứ tự, chọn sai bị từ chối, không phải xếp lại câu). Chờ: QE gap, C-test TOEFL, phrases (điền từ).

## Cổng CI (chỉ siết)
- `scripts/test/nav-sweep.mjs` (job `nav`, qa-bot.yml): mỗi màn học 390 px, chỉ bàn phím (1 = phương án đầu, phím số đặt thẻ, gõ "a"), Enter tới màn kết ≤ 40 bước; đo thoát/tiến độ/Enter/bỏ qua/màn kết/bước tiếp; thiếu sót phải có trong `nav-sweep.known.json` – thiếu MỚI hoặc mục known đã đạt → đỏ (danh sách chỉ thu nhỏ).
- `scripts/test/choice-kit.mjs` (accept/hint/tiles), `scripts/test/exit-guard.mjs` §7 (Enter, FOCUS mặc định), `exit-sweep` (lối thoát).
