# VIDEO-QC – chuẩn kiểm tra trước & sau, tự động trên GitHub (chủ 22/10/2026)

> TL;DR: Chuẩn QC video trước & sau, tự động trên CI: trượt 1 cổng là không dùng/không đăng; kết quả qc/<id>.json + điểm 100. Chủ 22/10/2026.
> Đọc khi: kiểm tài nguyên/clip video.

Nguyên tắc: **mọi tài nguyên và mọi clip đi qua cổng QC tự động trên CI; trượt 1 cổng = không dùng / không đăng.** Kết quả ghi `qc/<id>.json` + điểm 100 (VIDEO-SCALE-PLAN §3). Không có cổng nào "chỉ cảnh báo" ở bước đăng.

| Đối tượng | QC TRƯỚC (trước khi tốn credit / trước khi dựng) | QC SAU (khi nhận vào kho / sau render) | Công cụ |
|---|---|---|---|
| **Nhân vật (ảnh mẫu)** | phiếu phân tích + dry-run lệnh (refsub.sh); prompt ngắn, đúng tư thế; trần credit | đúng danh tính (so ảnh mẫu); tay 5 ngón (MediaPipe + phóng to); nền xanh phẳng; đủ khoảng trống đầu; chấm rubric ≥ 90 | `anchor/tools/ref_qc.py`, ledger |
| **Clip nhân vật** | khung đầu qua ref_qc (PASS/dấu kiểm người) – clip1.sh chặn nếu chưa | tách nền (matte_qa: viền, ám xanh, quầng, nhấp nháy); tay trong vùng an toàn; máy không chạy; khẩu hình ghép được; biểu cảm không trùng clip cũ | `gesture_qc.py`, `scripts/video/matte_qa.py` |
| **Ảnh nền** | kế hoạch đa dạng (plan_1000.json); prompt có sàn trống, máy ngang mắt | OCR = không chữ; không người/động vật; không nước/mặt bàn ở chỗ đứng; zones hợp lệ cả 2 khung cắt; nét/sáng; cùng phong cách; không trùng (CLIP > 0,92 / pHash) | `bgqc.py`, `bg_zones.py`, dedupe index |
| **Kịch bản** | 1 ý; sai→đúng + vì sao; tiếng Anh ≤ B1 (NGSL 2k) ngoài cụm dạy; hook ≤ 5 từ; 18–28 s | AI judge: đúng ngữ pháp/nghĩa, ✗ sai thật ✓ đúng thật, mẹo không sai, hợp CEFR, trung tính văn hoá; không trùng nội dung đã đăng | `gen_news.py` + judge |
| **Nội dung học** | điểm học lấy từ lexicon 1 nguồn | khớp lexicon (nghĩa/IPA/ví dụ); câu đố web đúng đáp án | `dict-consistency`, video-web test |
| **Giọng** | từ điển phát âm (IPA Mỹ); tốc độ 150–165 wpm | −14 LUFS, nền −40 dB, nền ồn khoảng lặng ≤ −50 dBFS; ASR so kịch bản (sai từ khoá = 0) | `qa_news.py` |
| **Phụ đề** | cụm 2 dòng, không kết hư từ, ≥ 0,8 s | khớp từng từ ±80 ms; trong vùng an toàn; tương phản AA; chữ thẻ = câu giọng đọc | `qa_news.py` |
| **Video sau render** | – | 1 nền/1 địa điểm/clip, khung mỗi người ±5 %; đầu 2 người ±5 %; 180°; khớp bối cảnh (zones + AI nhìn khung); không khung đen; độ nét ≥ 90 % nguồn; SSIM ≥ 0,97; vùng an toàn; chống trùng (pHash/chromaprint/chữ ký dựng 30 clip); điểm ≥ 90 | `qa_news.py`, `matte_qa.py`, AI vision gate |
| **Bản web / YouTube** | chỉ clip đã duyệt | bản web chạy (E2E), phụ đề EN, câu đố; metadata YouTube đủ, nhãn AI, riêng tư/hẹn giờ | `video-web-e2e.mjs`, `youtube.js` |

**Luồng CI**: dựng → `qc-gate` (gom mọi cổng trên, 1 báo cáo) → trượt: tự đổi tổ hợp/nền tối đa 2 lần → vẫn trượt: bỏ + ghi sổ → đạt: lưu Drive + chờ duyệt. Báo cáo QC hằng ngày hiện ở Quản trị › Video.
**Cổng duyệt của chủ** (METHODS): mẫu mới/template mới → gửi mẫu + báo cáo → chờ OK mới bật tự động.
