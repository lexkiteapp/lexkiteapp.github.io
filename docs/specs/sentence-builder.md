# Xếp câu + "Vì sao?" theo câu – spec-lite (01/11/2026)

> TL;DR: Bài "Xếp câu tiếng Anh" vừa chạm vừa kéo-chèn; "Vì sao?" giải thích đúng vào câu (trật tự, lỗi vừa mắc, từ nhiễu, ví dụ MỚI) bằng luật, 0 lượt AI, một hàm dùng chung cho mọi dạng bài.
> Đọc khi: sửa bài xếp câu/dịch ô chữ, phản hồi "Vì sao?" của #/lesson.

## Mục tiêu & tiêu chí xong
| # | Tiêu chí | Kiểm |
|---|---|---|
| 1 | "Vì sao?" khi sai nêu: lỗi của người học (so câu xếp với đáp án: từ sai chỗ, từ thừa, từ thiếu), luật trật tự (trạng từ tần suất, V + to + V, modal + V, cụm danh từ bổ nghĩa), vì sao từng từ nhiễu sai (nghĩa theo ngôn ngữ người học), 1–2 ví dụ MỚI | `scripts/test/lesson-why.mjs` |
| 2 | Ví dụ không bao giờ trùng (hay gần trùng ≥ 80 % từ) câu bài tập | test chặn |
| 3 | Dùng chung cho build/tr, gap, mean/pic, type (nghe-chép); phần trọng âm/IPA/định nghĩa giữ nguyên, xếp sau | test + jsdom |
| 4 | Chữ qua `t()`, đủ 15 ngôn ngữ (docs/I18N-PIPELINE.md, i18n-qa) | npm test |
| 5 | Kéo-thả (pointer events: chuột + cảm ứng) chèn vào vị trí bất kỳ, đổi chỗ, kéo ra để gỡ; chạm vẫn như cũ; bàn phím (←/→ đổi chỗ, Delete gỡ) + aria-live; prefers-reduced-motion | test jsdom + ảnh trước/sau → owner duyệt |

## Thiết kế
- `web/js/lesson/why.js` (`self.LessonWhy`, thuần, không DOM): `diff(ans, answer)` (LCS → sai chỗ/thừa/thiếu) · `rules(toks)` (từ điển nhỏ: tần suất, động từ + to-V, modal) · `explain(it, ans, deps)` → dữ liệu · `html(r, t, esc)` → HTML. ui.js chỉ gọi.
- Ví dụ: kho mẫu theo luật (câu tiếng Anh viết tay) + `LESSON_GOLD.ex` + câu khác của thẻ; lọc trùng câu bài tập.
- Tiết kiệm token: không AI lúc dùng. Bước sau (PR riêng): bộ `build` trong `scripts/explain/sets.mjs` sinh lô trên CI (`explain.yml`, cache theo câu) cho mẫu/ví dụ phong phú hơn.

## Việc (mỗi việc 1 nhánh 1 PR)
1. why.js + test + i18n + gắn vào explain (logic, gộp khi xanh).
2. Kéo-thả + bàn phím (giao diện → ảnh trước/sau lên trang Duyệt hình, chờ owner).
3. (sau) Bộ `build` sinh lô CI.

## Cổng
prepush, `npm test` (lesson.mjs, lesson-why.mjs, i18n-qa --strict, ext-sync), không hạ ngưỡng (no-cuts).
