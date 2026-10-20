# Danh sách từ nguồn mở (đầu vào cho scripts/gen-wordlist.mjs)

| File | Danh sách | Giấy phép | Dùng cho |
|---|---|---|---|
| nawl-1.2.csv | New Academic Word List 1.2 © Browne, Culligan & Phillips (newgeneralservicelist.com) | CC BY-SA 4.0 | IELTS Academic, TOEFL |
| bsl-1.20.csv | Business Service List 1.20 © Browne & Culligan (newgeneralservicelist.com) | CC BY-SA 4.0 | TOEIC |

Pipeline (GitHub Action `wordlists.yml` + biên soạn tay):
1. `gen-wordlist.mjs`: lọc từ đã có trong app → phiên âm (Wiktionary, CC BY-SA) → gợi ý nghĩa tiếng Việt đúng từ loại → kiểm tra chất lượng → `web/js/lib/nawl.js`, `web/js/lib/bsl.js` (bộ 100 từ).
2. **Định nghĩa tiếng Anh và câu ví dụ do Lexkite tự biên soạn** (CONTENT-RULES §1) trong `<id>.edit.json` (`{ "từ": { def, ex, pos, vi } }`), ghi bằng `node scripts/add-defs.mjs file.txt <id>` (mỗi dòng `từ|định nghĩa|ví dụ`, có kiểm tự động). Từ chưa có định nghĩa tự viết **không** được xuất vào app.
3. `<id>.fix.json`: sửa nghĩa tiếng Việt sau khi duyệt, hoặc `"-"` để loại từ không phù hợp.
4. `fill-vocab.mjs` (chạy hằng đêm): điền phiên âm còn thiếu cho các kho khác từ Wiktionary; không lấy câu ví dụ bên ngoài.
5. `cefr-oxford.json`: cấp độ CEFR theo danh sách công khai Oxford 3000/5000 (chỉ từ + từ loại → cấp, không chép định nghĩa), giới hạn ở các từ của NAWL/BSL; `gen-wordlist.mjs` dùng khi sinh lại (`level` trong `<id>.edit.json` thắng). Từ ngoài Oxford 5000 giữ cấp mặc định của bộ.
6. `core.gloss.json`: nghĩa viết tay 13 ngôn ngữ cho từ A1–A2 đa nghĩa/dễ dịch sai từ loại – luôn thắng dịch máy, áp bằng `node scripts/gen-word-packs.mjs all --gloss-only`.
