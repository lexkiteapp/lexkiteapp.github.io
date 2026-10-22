# Nguồn dữ liệu & giấy phép (từ điển)

| Dữ liệu | Nguồn | Giấy phép | Dùng ở |
|---|---|---|---|
| IPA Anh–Mỹ (ô `ipaUS`) | CMU Pronouncing Dictionary – github.com/cmusphinx/cmudict | BSD-2-Clause, © 1993-2015 Carnegie Mellon University | `content/lexicon/cmudict-subset.txt` → `scripts/build-lexicon.mjs` (ARPAbet → IPA kiểu Oxford) |
| NGSL, NAWL, TSL, BSL | Browne, Culligan & Phillips | CC BY-SA 4.0 | `web/js/lib/*.js` (ghi ở đầu file) |
| AWL | Coxhead (2000) | danh sách từ học thuật công khai | `web/js/lib/awl.js` |
| Giọng đọc từ (Kokoro) | hexgrad/Kokoro-82M | Apache-2.0 | `audio.lexkite.com/w/…` (CI `word-audio.yml`) |
| Nghĩa 13 ngôn ngữ | Lexkite tự dịch (Gemini/Cloudflare AI gói miễn phí, có duyệt AI + bảng tay) | CC BY-SA 4.0 (Lexkite) | `web/packs/<lang>.json` |

Định nghĩa Anh, ví dụ, nghĩa tiếng Việt: Lexkite tự soạn. Không chép Oxford/Cambridge (chỉ tham khảo quy ước ký hiệu).
