# Clip mạng xã hội theo lỗi L1 của từng ngôn ngữ (thử 10 clip, chờ anh duyệt)

> TL;DR: Mỗi clip nhắm vào một lỗi điển hình của người học nói một ngôn ngữ, do ảnh hưởng tiếng mẹ đẻ. Ama/Carlos 2D vẫn nói tiếng Anh ≤B1 (≤150 wpm, phụ đề tiếng Anh). Tiêu đề và chú thích bài đăng viết bằng tiếng mẹ đẻ. Clip render trên CI `social-clips.yml` và lưu theo ngôn ngữ ở `content/social/videos/`. Không tự đăng: anh tự đăng.

**Nguồn.** Lệnh anh chủ 01/11: "làm thêm clip tối ưu riêng việc dạy cho từng ngôn ngữ và chia ra lưu trữ minh bạch, sau anh đăng social". Lệnh này mở rộng luật "một bản tiếng Anh cho mọi nước" (docs/VIDEO-SERIES.md): lời nói vẫn là tiếng Anh, chỉ chủ đề, tiêu đề và chú thích đổi theo ngôn ngữ.

**Spec.** File `content/video/rig/l1/<lang>/<slug>.json`, dùng engine rig (docs/specs/rig-2d-video.md) và thêm các trường:
- `lang`
- `mistake` {en, l1}
- `template`: `stop` (thẻ "câu sai ✗" chuyển sang "câu đúng ✓", có gạch chữ thừa và gạch dưới phần thêm) hoặc `pair` (X vs Y, từ đang được đọc sáng màu)
- `deeplink`: route app có thật
- `native` {hook, caption, hashtags}
- `en` {hook, caption}: bản tiếng Anh gốc

**Chữ bản địa** (theo docs/I18N-PIPELINE.md):
- `native.*` là bản tay ở tầng i18n-fixed, luôn thắng dịch máy.
- `{m:từ#n}` lấy nghĩa trong kho: vi dùng cột nghĩa của kho từ, ngôn ngữ khác dùng `web/packs/<lang>.json`. Không dịch rời từng từ.
- `scripts/rig/native-qa.mjs` kiểm theo luật của `i18n-qa`: không lẫn tiếng Việt, không có lỗi dịch máy đã biết, câu tiếng Anh mẫu giữ nguyên văn, đúng chữ viết, hashtag có `#lexkite`, độ dài.
- Dịch ngược bằng gtx để so nghĩa với bản tiếng Anh. Nghĩa `{m:}` dịch ngược phải ra đúng từ gốc hoặc từ đồng nghĩa trong WordNet.

**Cổng QC.**
- Điểm = % cổng đạt. Mỗi clip cần 100 %, tức không cổng nào đỏ.
- Gồm 13 cổng rig, cộng thêm:
  - vùng an toàn 9:16 (220 px trên / 380 px dưới / 40 px hai bên)
  - phụ đề khớp từng từ Kokoro
  - chính tả (aspell)
  - từ ≤B1 (cefr-oxford)
  - deep-link là route có thật
  - logic kịch bản (câu sai/đúng nằm trong lời nói, có "Repeat after me", tay chỉ cho người đã có màu tay)
  - native-qa
  - đủ glyph trong phông bản địa (Noto qua fc-match; Devanagari/Thai/Arabic cần raqm)
  - tờ khung hình `frames.jpg` (`scripts/rig/framecheck.py`, ~1 khung/s + khung cuối): không chữ thừa (OCR ⊂ chữ khuôn vẽ + từ của spec), đúng giáo viên 2D theo câu (điểm ảnh khớp rig Ama/Carlos), vùng an toàn từng khung. Test `scripts/test/rig-framecheck.py`.
  - tiếng Ả Rập: dòng bản địa nhiều phông theo bidi (`scripts/rig/bidi.py`, test `rig-bidi.mjs`).

**Lưu trữ** (miễn phí, công khai, không bí mật):
- Thư mục `content/social/videos/<lang>/<YYYY-MM-DD>-<slug>/` chứa:
  - `caption.txt`: bài đăng + hashtag
  - `meta.json`: lỗi nhắm tới, giáo viên, thời lượng, điểm QC, deep-link có utm, `status` draft/approved/posted
  - `qc.json`
- `video.mp4` và `cover.jpg` nằm ở Release `social-<lang>`, tên tài sản `<ngày>-<slug>-video.mp4` / `-cover.jpg`.
- `manifest.json` và `README.md` (mục lục theo ngôn ngữ) do `scripts/rig/store.mjs` sinh.
- Chạy lại cùng slug thì giữ ngày và trạng thái cũ.
- Clip trượt bất kỳ cổng nào không xuất (không kho, không Release) → `rejected.json` (spec_sha); bản đạt cũ giữ nguyên. Test `rig-store.mjs`.

**CI.**
- `social-clips.yml`: plan → render (matrix, `max_parallel` = min(10, 40 − đang bận − 8)) → store (release + commit về nhánh đã chạy).
- `concurrency` xếp hàng, mỗi job có `timeout-minutes`.
- Trên nhánh PR: push spec/engine thì dựng lại cả lô.
- Hàng loạt: `infra/ci-backlog.json` mục `social-clips` (ci-filler, `specs=todo`): chỉ spec L1/Reels chưa có clip đạt ở nội dung hiện tại (`scripts/rig/todo.mjs`).

**Lô thử (01/11).** 10 clip: vi (-s ngôi 3, âm cuối white/why) · ja (L/R, mạo từ a) · es (tuổi với be, library ≠ librería) · hi (I am knowing, good name) · pt_BR (actually ≠ atualmente, people are).

**Sau khi anh duyệt.**
- Đăng ký vào `infra/ci-backlog.json` (ci-filler) để runner rảnh sinh tiếp cho đủ 15 ngôn ngữ.
- Spec mới cũng viết như trên (en: lỗi phổ biến của người bản ngữ).
- Vẫn không tự đăng.
