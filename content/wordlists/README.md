# Danh sách từ nguồn mở (đầu vào cho scripts/gen-wordlist.mjs)

| File | Danh sách | Giấy phép | Dùng cho |
|---|---|---|---|
| nawl-1.2.csv | New Academic Word List 1.2 © Browne, Culligan & Phillips (newgeneralservicelist.com) | CC BY-SA 4.0 | IELTS Academic, TOEFL |
| bsl-1.20.csv | Business Service List 1.20 © Browne & Culligan (newgeneralservicelist.com) | CC BY-SA 4.0 | TOEIC |

Pipeline tự động (GitHub Action `wordlists.yml`): lọc từ đã có trong app → phiên âm/định nghĩa/ví dụ từ Free Dictionary API (Wiktionary, CC BY-SA) và Tatoeba (CC BY 2.0 FR) → nghĩa tiếng Việt đúng từ loại (Google Translate) → kiểm tra chất lượng → `web/js/lib/nawl.js`, `web/js/lib/bsl.js` (bộ 100 từ). Mục thiếu dữ liệu bị loại, không đưa vào app.
