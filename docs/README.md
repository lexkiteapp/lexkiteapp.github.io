# docs/ – mục lục (đọc file này trước, chỉ mở file cần cho việc đang làm)

> TL;DR: Thứ tự đọc đầu phiên (README + TOKEN-RULES + METHODS + agents/BOARD) và nhóm tài liệu theo vùng việc. Mục lục chuẩn đầy đủ từng file: [INDEX.md](INDEX.md).
> Đọc khi: đầu phiên.

> TL;DR: Mục lục đọc-trước của docs/: thứ tự đầu phiên và mô tả nhóm tài liệu. Bản đầy đủ từng file ở INDEX.md.
> Đọc khi: đầu phiên.

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
- `EXPLAIN.md` – thẻ giải thích đáp án dùng chung + sinh lời giải 15 ngôn ngữ (CI). Khi sửa phản hồi bài luyện.
- `BRAND-RULES.md` – nguồn màu/Kit/nhãn hiệu (brand-check ĐỌC file này – giữ mã màu). Khi đụng giao diện/ảnh.
- `REPORTS.md` – luồng báo lỗi người dùng. Khi xử lý LX-xxxx.
- `QUOTAS.md` – hạn mức & chống lạm dụng. Khi đụng API/AI.
- `CONFIDENCE.md` – 🗣️ Giao tiếp tự tin (#/confidence): nguồn content/confidence, build, id vĩnh viễn cho video, QA. Khi sửa bài nói/cụm câu.
- `CAPACITY.md` – chi phí D1/Functions mỗi người dùng, trần DAU gói Free/Paid, ngưỡng nâng gói, cảnh báo hằng ngày. Khi thêm truy vấn/endpoint.
- `SYNC-DRIVE.md` – đồng bộ local-first qua Google Drive appDataFolder (0 USD ở mọi quy mô), di chuyển từ D1, việc chủ duyệt. Khi sửa đồng bộ/đăng nhập.
- `FREE-TIER.md` – free-tier-guard hằng ngày: số dùng thật so với trần gói miễn phí, chế độ shed của Worker, ngưỡng nâng Workers Paid. Khi thêm Worker/trang tự sinh/việc nền.
- `REMINDERS.md` – nhắc học thông minh: lịch cục bộ, Web Push (VAPID), FCM, cờ PUSH_PCT/FCM_ON, việc của chủ. Khi đụng thông báo/nhắc học.
- `i18n-review-2026-10-16.md` – rà dịch 16/10. Tham khảo.

## Add-on Chrome
- `CWS-RULES.md` – luật Chrome Web Store, permissions.lock, phát hành. Chỉ khi đụng `extension/`.

## Mobile & cửa hàng
- `STORE-READINESS.md` – trạng thái iOS/Android/CWS + việc 👤 còn mở (mục đầu). Khi đụng mobile/niêm yết.
- `ADS.md` – quảng cáo (AdSense web / AdMob app, add-on không bao giờ): vị trí cho phép, tần suất, đồng ý TCF/UMP, cờ + công tắc khẩn cấp, cổng giữ chân, Quản trị › Quảng cáo. Khi đụng quảng cáo/kiếm tiền.

## Video
- `VIDEO.md` – nguồn sự thật video (news-anchor, builder, CI, lưu trữ, bank). Khi làm video.
- `VIDEO-SCALE-PLAN.md` – kế hoạch kho video đa dạng chống trùng + thang 100 điểm. Khi làm template/scale video.
- `VIDEO-QC.md` – bảng cổng QC trước/sau cho nhân vật, nền, kịch bản, nội dung, giọng, phụ đề, video, web/YouTube (bắt buộc).
- `AUTOMATION.md` – quy trình tự động A→Z 15 bước (điểm học → dựng → QC → duyệt → định tuyến → đăng → đồng bộ → nhúng → đo).
- `MEDIA-QA-RUBRIC.md` – thang chấm ảnh/clip (≥ 90). Khi chấm tài sản.
- `SHORTS-ACCESS.md` – quyền đọc kho `lexkite-shorts` cho tab 🎬. Khi đụng admin video.
- `VIDEO-STORAGE.md` – lưu short theo công thức (repo chỉ giữ recipe), master trên Kho Drive, luật 2 bản/30 ngày/cân bằng, dựng lại, R2. Khi đụng lưu trữ/di trú short.
- `YOUTUBE-SETUP.md` – tải short đã duyệt lên YouTube (OAuth của chủ, hạn mức, kiểm định API). Khi đụng YouTube.
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

## Sổ tay khôi phục
**Có sự cố → mở `ROLLBACK.md` mục 0.** Bản web xấu: `bash scripts/ops/rollback-pages.sh` (quay về bản deploy trước, vài giây; tag `prod-YYYYMMDD-HHMM-<sha7>` / `prod-good` đánh dấu từng bản) rồi `git revert` · dữ liệu hỏng: D1 Time Travel (Free 7 ngày) hoặc bản xuất mã hoá trên Kho Drive (`d1-restore.mjs`) · mất repo: `git bundle` hằng tuần · app/add-on: 3 bản đã ký gần nhất + cách quay lại trên Play / App Store / CWS.
- [`ROLLBACK.md`](ROLLBACK.md) – lệnh từng bước, lịch sao lưu, diễn tập khôi phục, vì sao không tự rollback.

## Lưu trữ (`archive/`, chỉ tra cứu)
- `archive/METHODS-HISTORY.md` – METHODS cũ toàn văn (bài học theo ngày 17–22/10).
- `archive/STORE-READINESS-HISTORY.md` – mục cửa hàng đã xong.
- `archive/VIDEO-*.md`, `CINE-SCENE-STANDARD.md`, `KLING-PLAN.md`, `LISTENING-CHANNEL-PLAN.md` – video cũ (mã nguồn còn dẫn §).
