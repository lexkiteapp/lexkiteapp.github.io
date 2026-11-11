# Quyết định của chủ (sổ tra nhanh)

> TL;DR: Sổ tra nhanh các quyết định quan trọng của chủ, mỗi dòng có ngày và link tới doc gốc. Gồm pháp nhân, bản quyền/nhãn hiệu, nội dung, chi phí, CI, thiết kế. Không chứa khóa, email hay ID riêng tư.
> Đọc khi: cần biết "chủ đã chốt gì" trước khi đề xuất hoặc làm việc lớn. Thêm quyết định mới = thêm 1 dòng, mới nhất ở trên mỗi mục, chi tiết để ở doc gốc.

## Pháp nhân
- **03/11/2026** – Lexkite đứng tên một **LLC bang Wyoming, Hoa Kỳ**. Hồ sơ nhãn hiệu gốc (khi làm) nộp ở **USPTO**, sau đó mở rộng qua **Madrid (WIPO)**.

## Bản quyền & nhãn hiệu
- **03/11** – Giai đoạn này **100 % miễn phí**. Bằng chứng tác quyền lưu ở bên thứ ba và chạy tự động trên CI: sổ băm, OpenTimestamps, tem RFC 3161 (DigiCert/FreeTSA), Zenodo (lưu kín, có DOI), Software Heritage, Wayback, nhật ký "dùng lần đầu" tên/logo (™). Chi tiết: [CONTENT-PROTECTION.md](CONTENT-PROTECTION.md), [legal/DMCA-KIT.md](legal/DMCA-KIT.md).
- **03/11** – Các khoản **tốn phí để sau khi có doanh thu** (chỉ giữ checklist, ước tính, tra lại phí trước khi nộp):
  - Nhãn hiệu "Lexkite": nhóm Nice 9 (app) + 41 (giáo dục). USPTO khoảng $350/nhóm, rồi Madrid: phí cơ bản khoảng 650 CHF cộng phí từng nước. Thị trường ưu tiên theo 15 ngôn ngữ: EU, UK, JP, KR, CN, IN, ID, TH, TR, BR, UAE/SA, VN. Tổng khoảng $6–10k cho 12 thị trường. Phải nộp Madrid trong 6 tháng kể từ hồ sơ gốc để giữ ngày ưu tiên.
  - DMCA designated agent (US Copyright Office): $6/3 năm.
  - Đăng ký quyền tác giả Mỹ ($45–65/tác phẩm): chỉ làm khi cần kiện ở Mỹ.
- **03/11** – Đề, lời giải và bài học chuyển sang **repo private** `lexkiteapp/lexkite-content`, code vẫn public. Chi phí **$0**: repo private không chạy workflow, mọi job chạy trên runner public qua deploy key, không để nội dung lọt qua artifact hay log. Spec: `docs/specs/content-private.md` (PR #538).

## Nội dung học
- **03/11** – Mục tiêu điểm nội dung **> 95/100** (`content/pipeline/SCORE.md`). Chuẩn đích là [CONTENT-WORLD-PLAN.md](CONTENT-WORLD-PLAN.md) (Cambridge EVP/EGP, Oxford 3000/5000, CEFR, GSE), đã duyệt 01/11. Chỉ tăng độ phủ thật, không hạ chuẩn hay đổi trọng số.
- **03/11** – Nội dung dạy do **phiên Claude Sonnet viết**; Opus điều phối, viết mẫu chuẩn và soát 10 %. AI miễn phí chỉ dùng cho tầng 0, nháp dịch và giám khảo thứ hai. Lô viết: `docs/content-lots.md`.
- **03/11** – AI trong app (chấm bài, roleplay) phải dùng model đủ mạnh (Gemini Flash → Groq gpt-oss-120b). Không trả lời người học bằng model yếu, có bộ test vàng trên CI (PR #535).

## Chi phí, CI, cách làm
- **03/11** – Báo cáo ngắn, tiết kiệm token. Việc nào chạy được trên CI thì chạy CI, không chạy nặng trên Mac.
- **03/11** – Stitch: chỉ vẽ màn chưa có hoặc chưa đạt QC, không vẽ lại màn đã đạt. Dùng hết 5 key mỗi ngày (reset 07:00 giờ VN).
- **01/11** – GitHub Pro, 40 runner, repo public. Chỉ một giọng đọc miễn phí xuyên suốt (Kokoro). Mọi thứ phải $0 trừ khi chủ duyệt khoản chi.
- Luật chung (no-cuts, finish-before-start, quality bar): [METHODS.md](METHODS.md).
