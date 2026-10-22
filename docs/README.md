# docs/ – mục lục (đọc file này trước, chỉ mở file cần cho việc đang làm)

**Đầu mỗi phiên:** `README.md` + `TOKEN-RULES.md` + `METHODS.md` + `agents/BOARD.md`. Còn lại: đọc khi đụng tới vùng đó. "Tham khảo" = chỉ đọc khi cần tra.

## Lõi
- `METHODS.md` – luật lõi, lệnh ship/test, remote thật, ngân sách, lỗi đã mắc. Mỗi phiên.
- `agents/BOARD.md` – thẻ việc Antigravity ⇄ Claude (đang làm/chờ duyệt/TODO, HỎI CLAUDE). Mỗi vòng lặp. Thẻ đã xong: `agents/BOARD-ARCHIVE.md`.
- `COORDINATION.md` – phân vùng file Claude ⇄ Antigravity + nhật ký. Khi sửa ngoài vùng / gộp nhánh.
- `TOKEN-RULES.md` – luật tiết kiệm token (đọc/giao việc/chờ/gộp/báo cáo). BẮT BUỘC, áp cho mọi agent.
- `CREDIT-RULES.md` – luật tiêu credit. BẮT BUỘC trước mọi việc tốn credit.
- `PLAYBOOK.md` – sổ tay vận hành cũ (15/10). Tham khảo; METHODS thắng khi lệch.
- `BACKLOG.md` – việc tồn đọng (cập nhật 16/10, có thể cũ). Khi chọn việc mới.
- `TECH-RADAR.md` – chuẩn chọn công nghệ. Khi thêm thư viện/dịch vụ.
- `agents/DUO-GAP.md` – khoảng trống UX kiểu Duolingo. Khi làm UX bài học.

## Web, nội dung & i18n
- `I18N-PIPELINE.md` – quy trình 15 ngôn ngữ. Mọi việc thêm chữ giao diện.
- `CONTENT-PIPELINE.md` + `CONTENT-RULES.md` – sản xuất & chuẩn nội dung học. Khi thêm đề/từ/ngữ pháp/blog caption.
- `BRAND-RULES.md` – nguồn màu/Kit/nhãn hiệu (brand-check ĐỌC file này – giữ mã màu). Khi đụng giao diện/ảnh.
- `REPORTS.md` – luồng báo lỗi người dùng. Khi xử lý LX-xxxx.
- `QUOTAS.md` – hạn mức & chống lạm dụng. Khi đụng API/AI.
- `i18n-review-2026-10-16.md` – rà dịch 16/10. Tham khảo.

## Add-on Chrome
- `CWS-RULES.md` – luật Chrome Web Store, permissions.lock, phát hành. Chỉ khi đụng `extension/`.

## Mobile & cửa hàng
- `STORE-READINESS.md` – trạng thái iOS/Android/CWS + việc 👤 còn mở (mục đầu). Khi đụng mobile/niêm yết.

## Video
- `VIDEO.md` – nguồn sự thật video (news-anchor, builder, CI, lưu trữ, bank). Khi làm video.
- `VIDEO-SCALE-PLAN.md` – kế hoạch kho video đa dạng chống trùng + thang 100 điểm. Khi làm template/scale video.
- `MEDIA-QA-RUBRIC.md` – thang chấm ảnh/clip (≥ 90). Khi chấm tài sản.
- `SHORTS-ACCESS.md` – quyền đọc kho `lexkite-shorts` cho tab 🎬. Khi đụng admin video.
- `ASSET-LIBRARY.md` – kho tài nguyên & Kho Drive (§8.6). Tham khảo.
- Stub 1 dòng → `VIDEO.md`: `VIDEO-PIPELINE`, `VIDEO-SYSTEM-PLAN`, `CINE-SCENE-STANDARD`, `KLING-PLAN`, `LISTENING-CHANNEL-PLAN`, `VIDEO-CONTENT-PLAN` (toàn văn ở `archive/`).

## Blog & SEO
- `BLOG-RUNBOOK.md` – vận hành blog 15 ngôn ngữ, ảnh, deploy hook. Khi viết/đăng blog.
- `SEO-PLAN.md` – SEO kỹ thuật. Tham khảo.
- `SEO-GROWTH-PLAN.md` – kế hoạch tăng trưởng 6 tháng. Tham khảo.
- `PR-PLATFORMS.md` – nền tảng PR/backlink (pr-check ĐỌC bảng – sinh bằng `node scripts/pr-check.mjs --table`). Tham khảo.

## Hạ tầng, tài khoản, bảo vệ
- `INFRA-RULES.md` – sổ `infra/resources.json`, mail, dịch vụ ngoài. Khi thêm dịch vụ/host.
- `API-KEYS.md` – kho khóa API mã hoá. Khi đụng khóa nhà cung cấp.
- `SCALING-PLAN.md` – mở rộng Workers > 100k/ngày. Tham khảo.
- `CONTENT-PROTECTION.md` – chống cào, chứng minh đăng trước, DMCA. Khi đụng WAF/registry.

## Pháp lý
- `legal/DMCA-KIT.md` – mẫu hồ sơ DMCA. Tham khảo.

## Nghiên cứu & rà soát (tham khảo, đọc khi cần)
- `AUDIT-2026-10.md` – audit SEO/pháp lý/bảo mật 17/10.
- `audits/{exams,grammar,path,vocabulary}-2026-10.md` – rà soát nội dung 10/2026.
- `research/study4-{courses,syllabi}.md` – nghiên cứu Study4.

## Lưu trữ (`archive/`, chỉ tra cứu)
- `archive/METHODS-HISTORY.md` – METHODS cũ toàn văn (bài học theo ngày 17–22/10).
- `archive/STORE-READINESS-HISTORY.md` – mục cửa hàng đã xong.
- `archive/VIDEO-*.md`, `CINE-SCENE-STANDARD.md`, `KLING-PLAN.md`, `LISTENING-CHANNEL-PLAN.md` – video cũ (mã nguồn còn dẫn §).
