# Nguồn dữ liệu & giấy phép (từ điển)

> TL;DR: Bảng nguồn dữ liệu và giấy phép (từ điển, mô hình/thư viện tách nền video). Kiểm giấy phép thương mại trước khi thêm nguồn.
> Đọc khi: thêm dữ liệu/mô hình/giọng mới.

| Dữ liệu | Nguồn | Giấy phép | Dùng ở |
|---|---|---|---|
| IPA Anh–Mỹ (ô `ipaUS`) | CMU Pronouncing Dictionary – github.com/cmusphinx/cmudict | BSD-2-Clause, © 1993-2015 Carnegie Mellon University | `content/lexicon/cmudict-subset.txt` → `scripts/build-lexicon.mjs` (ARPAbet → IPA kiểu Oxford) |
| Kiểm IPA Anh (chỉ để kiểm, không hiển thị) | Britfone 3.0.1 – github.com/JoseLlarena/Britfone | MIT, © 2017 Jose Llarena | `content/lexicon/britfone-subset.txt` (kèm giấy phép) → `scripts/lexicon/ipa-audit.mjs` |
| Dạng yếu/mạnh hư từ | Cambridge Dictionary, Longman Pronunciation Dictionary (J. C. Wells), Wikipedia "Weak and strong forms in English" (CC BY-SA 4.0) – dữ kiện ngữ âm, bảng tự soạn | – | `web/js/ui.js` `LK_WEAK` |
| NGSL, NAWL, TSL, BSL | Browne, Culligan & Phillips | CC BY-SA 4.0 | `web/js/lib/*.js` (ghi ở đầu file) |
| AWL | Coxhead (2000) | danh sách từ học thuật công khai | `web/js/lib/awl.js` |
| Giọng đọc từ (Kokoro) | hexgrad/Kokoro-82M | Apache-2.0 | `audio.lexkite.com/w/…` (CI `word-audio.yml`) |
| Nghĩa 13 ngôn ngữ | Lexkite tự dịch (Gemini/Cloudflare AI gói miễn phí, có duyệt AI + bảng tay) | CC BY-SA 4.0 (Lexkite) | `web/packs/<lang>.json` |

Định nghĩa Anh, ví dụ, nghĩa tiếng Việt: Lexkite tự soạn. Không chép Oxford/Cambridge (chỉ tham khảo quy ước ký hiệu).

## Video – mô hình & thư viện tách nền host (PRO matte, `scripts/video/matte_pro.py`, CI `matte-pro.yml`; chỉ chạy trên CI, không phân phối mô hình)

| Thành phần | Nguồn | Giấy phép | Ghi chú |
|---|---|---|---|
| ViTMatte-S (code) | github.com/hustvl/ViTMatte | MIT | qua `transformers` (Apache-2.0) |
| ViTMatte-S (trọng số) | huggingface.co/hustvl/vitmatte-small-composition-1k | Apache-2.0 (thẻ mô hình) | huấn luyện trên Composition-1k (bộ dữ liệu Adobe chỉ cho nghiên cứu) → trọng số chỉ dùng làm bước xử lý trên CI, không đóng gói/phân phối; dự phòng thuần thuật toán `--engine cf` |
| pymatting (closed-form alpha, `estimate_foreground_ml`) | github.com/pymatting/pymatting | MIT | tách màu tiền cảnh (khử viền xanh/đen) |
| OpenCV (DIS optical flow) | opencv.org | Apache-2.0 | ổn định alpha theo thời gian |
| PyTorch CPU | pytorch.org | BSD-3-Clause | |
