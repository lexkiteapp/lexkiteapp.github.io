# docs/ – đọc trước

> TL;DR: Đầu phiên đọc `README` + `TOKEN-RULES` + `METHODS` + `agents/BOARD`; còn lại mở theo bảng chủ đề → file sở hữu dưới đây. Mô tả từng file: [INDEX.md](INDEX.md).
> Đọc khi: đầu phiên.

**Luật:** một chủ đề = một file sở hữu; nơi khác chỉ link `docs/X.md §n`, không chép lại. Cũ/lịch sử → `archive/`. Thêm doc mới = 1 dòng ở INDEX + khối `> TL;DR:` (test `docs-budget`: ≤ 45 KB/file, METHODS ≤ 20 KB).
**Sổ tay khôi phục – có sự cố → `ROLLBACK.md` mục 0** (`bash scripts/ops/rollback-pages.sh` → `git revert`; D1 Time Travel; bản mã hoá Kho Drive; KHÔNG tự rollback, cần chủ OK).

## Chủ đề → file sở hữu
| Chủ đề | File (đọc khi đụng tới) |
|---|---|
| Luật lõi, ship/test, remote thật, ngân sách, lỗi đã mắc | `METHODS.md` |
| Tiết kiệm token · tiêu credit (BẮT BUỘC) | `TOKEN-RULES.md` · `CREDIT-RULES.md` |
| Việc Antigravity ⇄ Claude · phân vùng file | `agents/BOARD.md` (xong: `BOARD-ARCHIVE.md`) · `COORDINATION.md` |
| Runner GitHub / CI · việc nền, lịch, lease | `CI-RUNNERS.md` · `JOBS.md` (sinh từ `infra/jobs.json`) · `QUALITY-SWEEP.md` · bot QA `QA-BOT.md` |
| Bàn giao việc đang chạy · việc tồn · chọn công nghệ | `HANDOFF.md` · `BACKLOG.md` · `TECH-RADAR.md` |
| i18n 15 ngôn ngữ | `I18N-PIPELINE.md` |
| Nội dung học: quy trình · chuẩn · cổng QA · lộ trình | `CONTENT-PIPELINE.md` · `CONTENT-RULES.md` · `CONTENT-QA.md` · `CONTENT-ROADMAP.md` |
| Lời giải đáp án · kho từ vựng · ảnh từ vựng · giọng từ | `EXPLAIN.md` · `LEXICON.md` · `VOCAB-IMG-STYLE.md` · `WORD-AUDIO.md` |
| Giao tiếp tự tin · nhắc học · lớp học · giáo viên trong app | `CONFIDENCE.md` · `REMINDERS.md` · `RETENTION.md` · `CLASSROOM.md` · `VIDEO-TEACHERS.md` |
| Thương hiệu (brand-check đọc – giữ mã màu) · hệ thiết kế · UX · port Stitch v2 | `BRAND-RULES.md` · `DESIGN-SYSTEM.md` · `UX-PUBLIC.md` · `UX-BENCHMARK.md` · `STITCH-V2-PORT.md` |
| Game feel: âm thanh, rung, chuyển động phản hồi, nhân vật phản ứng (pilot sau cờ `?feel=1`) | `GAME-FEEL.md` |
| Báo lỗi người dùng LX-xxxx · hạn mức & chống lạm dụng | `REPORTS.md` · `QUOTAS.md` |
| Chi phí/trần DAU · free-tier guard · mở rộng · dung lượng repo | `CAPACITY.md` · `FREE-TIER.md` · `SCALING-PLAN.md` · `STORAGE.md` |
| Đồng bộ Drive · AI trên máy · OTA | `SYNC-DRIVE.md` · `AI-LOCAL.md` · `OTA.md` |
| Add-on Chrome / Edge | `CWS-RULES.md` (+ `CWS-FEATURED.md`) · `EDGE-SUBMIT.md` |
| Mobile & cửa hàng · quảng cáo | `STORE-READINESS.md` · `ADS.md` |
| Video: nguồn sự thật (+ luật dựng §9) | `VIDEO.md` · `VIDEO-QC.md` · `VIDEO-SCALE-PLAN.md` · `VIDEO-SERIES.md` · `VIDEO-TEMPLATES.md` · `AUTOMATION.md` |
| Video: lưu trữ · kho tài nguyên · chấm điểm · xem trong admin · YouTube | `VIDEO-STORAGE.md` · `ASSET-LIBRARY.md` · `MEDIA-QA-RUBRIC.md` · `SHORTS-ACCESS.md` · `YOUTUBE-SETUP.md` |
| Blog | `BLOG-RUNBOOK.md` |
| SEO: kỹ thuật · tăng trưởng · trang tĩnh · từ điển · công cụ · uy tín | `SEO-PLAN.md` · `SEO-GROWTH-PLAN.md` · `SEO-ARCH.md` · `SEO-DICT-PAGES.md` · `SEO-TOOLS.md` · `SEO-AUTHORITY.md` |
| Social / phân phối / GrabCast | `DISTRIBUTION.md` · `GRABCAST-API-REQUESTS.md` |
| PR/backlink (pr-check đọc bảng: `node scripts/pr-check.mjs --table`) | `PR-PLATFORMS.md` · `BACKLINKS.md` |
| Hạ tầng: sổ tài nguyên · khóa API · bảo vệ admin/nội dung · giấy phép dữ liệu | `INFRA-RULES.md` · `API-KEYS.md` · `ADMIN-SECURITY.md` · `CONTENT-PROTECTION.md` · `CREDITS.md` |
| Sao lưu & khôi phục | `ROLLBACK.md` |
| Audit / nghiên cứu (tham khảo) | `AUDIT-2026-10.md` · `CONTENT-AUDIT-2026-10-25.md` · `audits/` · `research/` · `legal/DMCA-KIT.md` · `agents/DUO-GAP.md` |
| Lưu trữ (chỉ tra cứu) | `archive/` – METHODS-HISTORY, PLAYBOOK, STORE-READINESS-HISTORY, video cũ. Stub 1 dòng → `VIDEO.md`: VIDEO-PIPELINE, VIDEO-SYSTEM-PLAN, CINE-SCENE-STANDARD, KLING-PLAN, LISTENING-CHANNEL-PLAN, VIDEO-CONTENT-PLAN |
