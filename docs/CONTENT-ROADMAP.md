# Lộ trình nội dung (audit 24/10/2026): lỗ hổng → cách sửa → ai làm

Điểm audit (/10): từ vựng 7 · ngữ pháp 7 · phát âm 6 · lớp học 4 · lộ trình 6 · đọc 7 · nghe 7.5 · viết 6 · nói 5.5 · TOEIC 7 · TOEFL 6.5 · roleplay 5 · tự tin 6.5 · luyện cách dùng 4.

**Ai làm (chỉ 3 loại chủ):**
- **Claude**: mã, cổng, test, duyệt lô.
- **AG** (Antigravity): nội dung số lượng lớn, theo thẻ trong `docs/agents/BOARD.md`.
- **CI-gen**: sinh lời giải và bản dịch miễn phí.
  - Chỉ dùng kho khóa Gemini (`gemini`) hoặc Workers AI tài khoản 2 (`workers_ai_b`); **không bao giờ dùng AI tài khoản chính**.
  - Mỗi job phải đăng ký trong `infra/jobs.json`.

**Luật chung:** mọi nguồn đi qua cổng QA (`docs/CONTENT-QA.md`) trước khi xuất ra web; quy trình theo METHODS "Làm đúng 1 lần": thử 1 lô nhỏ → đo → mới nhân rộng.

Ký hiệu trạng thái: ✅ xong 24/10 · ⏳ đang làm/thẻ đã giao · ☐ chưa làm.

## 1. Lỗi chặn (sửa ngay)
| Lỗ hổng | Cách sửa | Chủ | TT |
|---|---|---|---|
| Roleplay bài B2 của "Tự tin" chạy ở mức A1 (`confidence.js` thiếu khóa B2) | `rpLevel()`: B2 → mức 2, nhãn A2/B1/B2. Test `confidence.mjs` | Claude | ✅ |
| Lộ trình chỉ có từ vựng; hết lộ trình là ngõ cụt | Mỗi ngày thêm 1 bài ngữ pháp + 1 bài phát âm đúng CEFR chặng (`web/js/path-mix.js`, sinh bởi `scripts/path/build-mix.mjs`, có `--check`). Hết lộ trình → màn "Tiếp theo học gì?" (gói khác, khóa học, nói tự tin, ôn tập). Test `learn-flow.mjs` | Claude | ✅ |
| Cuối bài đọc / phần nghe không có bước tiếp | Gói lười `nxs` (`web/js/next-step.js`): phần kế tiếp + 2 kỹ năng khác. Test `next-step.mjs` | Claude | ✅ |
| ExplainCard không có dữ liệu (`content/explain/usage.json = {}`, `web/js/explain/` rỗng) | Chạy `explain.yml` (id `explain`, Gemini) **sau khi** có giám khảo B (dòng kế). Lô đầu 60 mục → soát 5% → mới chạy hết | CI-gen + Claude | ☐ |
| Chỉ có 1 giám khảo; nhánh dự phòng của `/api/lexai` xjudge gọi `env.AI` (cần xác nhận là tài khoản 2) | Thêm giám khảo B: Workers AI tài khoản 2 qua REST (secret CI, tài nguyên `workers_ai_b`), ghi `qa[l].j['llama:…']` + dịch ngược `qa[l].bt`. Gỡ nhánh dự phòng `env.AI` nếu là tài khoản chính. Đăng ký `explain-judge-b` trong `infra/jobs.json` | Claude | ☐ |

## 2. Theo từng mảng
| Mảng (điểm) | Lỗ hổng | Cách sửa | Chủ |
|---|---|---|---|
| Luyện cách dùng (4) | 69% mục không có ghi chú/lỗi hay gặp (cổng đo: có ghi chú 31%); 195 từ đầu mục không có trong kho từ | **[CQ1]** thêm `#` ghi chú + `!` cặp ✗/✓ cho 300 mục ưu tiên. Bổ sung kho từ cho từ đầu mục thiếu | AG + Claude (kho từ) |
| Lời giải (mọi mảng) | Lời giải, ghi chú và checklist chỉ có tiếng Việt ở: TOEIC S&W, TOEFL Complete the Words, luyện đọc, thông báo writecheck, ghi chú sâu từ vựng, lời giải quiz ngữ pháp | Tách chữ ra khóa dịch được, rồi CI-gen dịch 13 ngôn ngữ (`i18n.yml` / `explain.yml`) qua cổng dịch. Mã: Claude, **[CQ5]**. Nội dung: CI-gen | Claude + CI-gen |
| Roleplay (5) | 75% lượt thoại không có nhánh kịch bản (offline / hết lượt AI thì hội thoại cụt) | **[CQ2]** viết `br` (2–3 nhánh theo ý người học) cho mọi lượt của 24 bài "Tự tin" + 16 kịch bản roleplay | AG |
| Viết (6) | Mọi bài mẫu đều band 8 → người học band 5–6 không có bậc thang | **[CQ3]** mỗi đề Task 1/Task 2 thêm bài band 6 và band 7, kèm chú thích "vì sao lên band" | AG |
| Lớp học (4) | Giáo viên chỉ giao được 4 loại nội dung | Mở rộng loại bài giao: ngữ pháp, phát âm, đọc, nghe, roleplay/tự tin, đề TOEIC/TOEFL (mã `classroom.js` + `functions/api/class.js` + test) | Claude |
| Phát âm (6) | Tên bài và hướng dẫn chỉ có tiếng Việt; 42 từ ví dụ không có trong kho từ | **[CQ4]** dịch `title`/`how`/`tip` sang khóa tiếng Anh, CI-gen dịch 13 ngôn ngữ; Claude bổ sung kho từ | AG + CI-gen + Claude |
| Ngữ pháp (7) | 15 câu quiz hỏng lược đồ (phương án trùng / thiếu đáp án); lời giải chỉ tiếng Việt | Sửa 15 câu rồi hạ baseline; dịch lời giải qua `explain` bộ `grammar` | Claude + CI-gen |
| Nói (5.5) | Ít đề theo CEFR, thiếu phản hồi theo tiêu chí | Gắn CEFR cho `SPEAK_MORE`, thêm câu trả lời mẫu theo band (cùng cách làm [CQ3]) | AG |
| Lộ trình (6) | Thiếu kỹ năng ở chặng C2; phát âm hết bài từ B2 trở lên | Viết bài phát âm B2–C1 (nối âm, ngữ điệu câu phức) | AG |
| Từ vựng (7) | 280 cờ CEFR cần duyệt (`content/lexicon/cefr-flags.json`) | Duyệt cờ qua `overrides.json` | Claude |
| Đọc (7) / Nghe (7.5) | Bước tiếp theo đã có ✅; giải thích chỉ một ngôn ngữ ở luyện đọc | Như dòng "Lời giải" | CI-gen |
| TOEIC (7) / TOEFL (6.5) | Checklist S&W và ghi chú Complete the Words chỉ tiếng Việt | Như dòng "Lời giải" | Claude + CI-gen |
| Tự tin (6.5) | Đã sửa B2 ✅; nhánh kịch bản còn thiếu | [CQ2] | AG |

## 3. Dịch lời giải đề thi (`web/i18n/explain/*.json`, bot đêm)
Cổng đo lỗi cũ: số không khớp, mất `{biến}` (33 mục ở mọi ngôn ngữ), sai chữ viết (th/zh: 26 mục).
- Cách sửa: dịch lại các mục bị cờ, ưu tiên những mục lỗi ở mọi ngôn ngữ, qua `explain.yml` với cổng dịch, rồi hạ baseline.
- Chủ: CI-gen (Gemini). Claude chỉnh job.

## 4. Thứ tự làm
1. Giám khảo B → 2. lô thử ExplainCard 60 mục → 3. [CQ1], [CQ2] → 4. tách chữ để dịch được, kèm [CQ5] → 5. [CQ3] → 6. lớp học → 7. [CQ4].
