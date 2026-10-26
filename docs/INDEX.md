# docs/ – INDEX (mục lục chuẩn, một dòng mỗi tài liệu)

> TL;DR: Mỗi tài liệu trong `docs/` (kể cả `archive/` và thư mục con) có đúng một dòng ở đây: nó là gì và khi nào đọc. `docs/README.md` giữ thứ tự đọc đầu phiên; file này là danh mục đầy đủ.
> Test `scripts/test/docs-budget.mjs` (chạy trong `npm test`) FAIL nếu tài liệu thiếu ở đây hoặc vượt ngân sách dung lượng. Thêm doc mới = thêm 1 dòng vào đây.

## Tài liệu hiện hành (docs/)
- [ADMIN-SECURITY.md](ADMIN-SECURITY.md) — Các lớp bảo vệ trang /admin: adminGate ở API (Origin, rate-limit, Firebase token + email_verified + ADMIN_EMAILS), cổng whoami ở trình duyệt, lớp biên Cloudflare Access (chưa bật). Người lạ nhận 403 và bị ghi admin_log; đọc khi: sửa trang/API quản trị hoặc bật Cloudflare Access
- [ADS.md](ADS.md) — Thiết kế quảng cáo một lần, mọi cờ TẮT: AdMob (app), AdSense (web), add-on Chrome không bao giờ; chỉ đặt ở điểm nghỉ của bài học. Cờ ở Quản trị, đồng ý/quyền riêng tư, đo lường và cổng giữ chân; code xong, chờ chủ tạo tài khoản; đọc khi: đụng tới quảng cáo, đồng ý, hoặc bật nền tảng quảng cáo mới
- [API-KEYS.md](API-KEYS.md) — Bộ quản lý khóa API (Gemini, Groq, OpenRouter, Anthropic, OpenAI, Resend, Brevo, Cloudflare) trong một kho mã hóa, tự xoay vòng và báo sức khỏe. Gồm thiết lập một lần, lưu trữ, API quản trị /api/keys, cảnh báo, checklist bảo mật; đọc khi: thêm/xoay khóa hoặc sửa _keys.js
- [ASSET-LIBRARY.md](ASSET-LIBRARY.md) — Kho tài nguyên hình ảnh mô-đun (nhân vật, biểu cảm, phòng, đạo cụ…) để ghép tổ hợp vô hạn cho video, Call Mia, roleplay, bài học. Luật chống "lơ lửng", quy chuẩn chung, danh mục P1-P3, quy trình lô, bộ ghép, prompt khuôn Kling; đọc khi: sản xuất hoặc ghép tài nguyên ảnh/nhân vật
- [AUDIT-2026-10.md](AUDIT-2026-10.md) — Audit 17/10/2026 về SEO, pháp lý, khung trang, bảo mật (Critical/High/Medium/Low) cùng các sửa đã làm và đề xuất còn mở. Là báo cáo tại thời điểm đó, đối chiếu với mã hiện hành trước khi tin; đọc khi: tra lại vì sao một lỗi/chính sách được sửa
- [AUTOMATION.md](AUTOMATION.md) — Quy trình tự động A→Z cho video học + phân phối trên GitHub Actions và Cloudflare ($0), mỗi bước có cổng QC; người chỉ duyệt ở 2 điểm. Có phần triển khai tin ngắn (news) 23/10; đọc khi: sửa đường ống tự động video/phân phối
- [BACKLOG.md](BACKLOG.md) — Việc tồn đọng theo thứ tự ưu tiên: đang làm, chờ anh chủ; việc xong chuyển xuống mục đã xong. Số liệu mốc 15-16/10 có thể cũ; mục đã xong lưu ở archive/BACKLOG-DONE.md; đọc khi: chọn việc mới cần làm
- [BLOG-RUNBOOK.md](BLOG-RUNBOOK.md) — Sổ tay vận hành blog & SEO: repo/dịch vụ, 15 ngôn ngữ và cụm bài, lịch đăng thông minh, workflow tự động, 6 bước viết bài. Không chứa bí mật; kỹ thuật chi tiết ở SEO-PLAN.md; đọc khi: viết/lên lịch/sửa bài blog hoặc ảnh blog
- [BRAND-RULES.md](BRAND-RULES.md) — Nguồn thương hiệu duy nhất cho Lexkite: bảng màu (Kit chỉ từ web/js/kit.js, teal), thứ đã bỏ (xanh cũ #2F62C0), đổi tên thương hiệu, watermark video. brand-check chặn lệch; đọc khi: đụng logo, màu, tên, watermark
- [CAPACITY.md](CAPACITY.md) — Chi phí Cloudflare theo người dùng (đo bằng Miniflare, không dội production), kiến trúc mở rộng, hạn mức và trần DAU. Có ngưỡng hành động cho chủ khi nào nâng gói; đọc khi: lập kế hoạch tải/chi phí hoặc thêm endpoint đọc/ghi D1
- [FREE-TIER.md](FREE-TIER.md) — Free-tier guard hằng ngày: số dùng thật so với trần gói miễn phí (Workers, D1, R2, Pages build, repo), chế độ shed của Worker, ngưỡng nâng Workers Paid 5 USD; đọc khi: thêm Worker/trang tự sinh/việc nền hoặc có issue free-tier
- [CLASSROOM.md](CLASSROOM.md) — Chế độ lớp học (giáo viên/học sinh): tạo lớp, giao bài qua Google Classroom, dữ liệu tối thiểu, chi phí D1 và giới hạn. Bài giao chỉ tham chiếu nội dung có sẵn; đọc khi: sửa tính năng lớp học
- [CONFIDENCE.md](CONFIDENCE.md) — Lộ trình Giao tiếp tự tin (#/confidence) A1→B2: bài 5-8 phút, bộ công cụ tự tin, thử thách 2 phút/ngày, điểm tự tin. Tái dùng roleplay.js, UI.tts/recognize; AI có ngân sách; đọc khi: sửa/nối tính năng tự tin hoặc video liên quan
- [CONTENT-AUDIT-2026-10-25.md](CONTENT-AUDIT-2026-10-25.md) — Kiểm định nội dung học 25/10: mẫu ngẫu nhiên, lớp lỗi toàn kho 9.588 dòng, sửa tại nguồn, cổng mới và hàng sinh lại. Không xóa nội dung để giấu lỗi; đọc khi: tra lịch sử sửa lỗi nội dung
- [CONTENT-PIPELINE.md](CONTENT-PIPELINE.md) — Quy trình sản xuất lô nội dung học: hàng đợi tự động, brief ≤15 dòng, viết, cổng tự động xanh, nghiệm thu. Chất lượng nằm ở CONTENT-RULES.md; đọc khi: giao/viết một lô nội dung
- [CONTENT-PROTECTION.md](CONTENT-PROTECTION.md) — Bảo vệ nội dung chống cào: luật Cloudflare WAF, "được lập chỉ mục trước", sổ băm, OpenTimestamps, giám sát bản sao, xử lý DMCA. Phần build/giao diện do Antigravity (thẻ P1 trên BOARD); đọc khi: xử lý sao chép/DMCA hoặc sửa WAF
- [CONTENT-QA.md](CONTENT-QA.md) — Cổng QA nội dung bắt buộc cho mọi nguồn: sổ nguồn, bảy lớp kiểm, baseline chỉ được giảm, luồng cho nội dung sinh tự động. Mã ở scripts/content-qa/ và content/qa/; đọc khi: thêm/sinh nội dung học hàng loạt
- [CONTENT-ROADMAP.md](CONTENT-ROADMAP.md) — Lộ trình nội dung (audit 24/10): điểm từng mảng, lỗi chặn, cách sửa, thứ tự làm và ai làm. Điểm /10: từ vựng 7, ngữ pháp 7, nói 5,5, lớp học 4…; đọc khi: chọn mảng nội dung cần nâng
- [CONTENT-RULES.md](CONTENT-RULES.md) — Quy tắc nội dung học (từ vựng, bài tập, đề thi): nguồn & bản quyền, chuẩn từng loại, đa ngôn ngữ, dung lượng/tốc độ, cổng kiểm. Quy trình lô ở CONTENT-PIPELINE.md; đọc khi: thêm hoặc sửa bất kỳ nội dung học
- [COORDINATION.md](COORDINATION.md) — Phối hợp Claude ⇄ Antigravity: quy tắc vàng, phân vùng file, việc mở, phân vùng đang giữ. Giao việc hằng ngày ở agents/BOARD.md; nhật ký bàn giao cũ ở archive/COORDINATION-LOG.md; đọc khi: sửa ngoài vùng của mình hoặc gộp nhánh
- [CREDIT-RULES.md](CREDIT-RULES.md) — Luật bắt buộc khi tiêu credit (Kling/dịch vụ trả phí): làm hết phần 0 credit trước, phân tích, dry-run, thử 1 cái, hỏng 2 lần thì dừng. Chủ duyệt 20/10/2026; đọc khi: TRƯỚC mọi việc tốn credit
- [CREDITS.md](CREDITS.md) — Bảng nguồn dữ liệu và giấy phép (từ điển, mô hình/thư viện tách nền video). Kiểm giấy phép thương mại trước khi thêm nguồn; đọc khi: thêm dữ liệu/mô hình/giọng mới
- [CWS-FEATURED.md](CWS-FEATURED.md) — Checklist huy hiệu Featured trên Chrome Web Store: kỹ thuật & tuân thủ, listing & trải nghiệm, cách gửi xét, cách giữ huy hiệu. Huy hiệu do CWS xét tay; anh chủ tự gửi; đọc khi: chuẩn bị listing add-on
- [CWS-RULES.md](CWS-RULES.md) — Quy tắc Chrome Web Store và quy trình phát hành add-on: không mã từ xa, giới hạn cửa hàng, phát hành tự động, thiết lập workflow, kiểm thử. cws-check.mjs trong npm test tự kiểm; đọc khi: sửa extension/ hoặc phát hành add-on
- [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) — Hệ thiết kế web app + add-on: một họ icon Lucide, token, chuyển động, vi hiệu ứng, thành phần, kiểm tra trước khi ship UI. Chất lượng chỉ đi lên, không bỏ tính năng; đọc khi: mọi thay đổi giao diện
- [DISTRIBUTION.md](DISTRIBUTION.md) — Kênh & phân phối (nhúng + social): vai trò kênh, định tuyến, hợp đồng cho tác tử social (GrabCast), hệ thống web/app. Admin › Kênh & phân phối, /api/distribution; đọc khi: sửa phân phối/social
- [EDGE-SUBMIT.md](EDGE-SUBMIT.md) — Gói hồ sơ đăng Lexkite lên Microsoft Edge Add-ons: dùng chung zip Chrome, các bước trên Partner Center, lưu ý chính sách. Anh chủ tự làm phần tài khoản và bấm gửi; đọc khi: đăng/cập nhật add-on trên Edge
- [EXPLAIN.md](EXPLAIN.md) — Lược đồ lời giải đáp án: một thẻ dùng chung explain-card.js, dữ liệu web/js/explain/<bộ>/<lang>.json, mặc định hiện Cấu trúc + Vì sao. Cổng explain-check trong npm test; đọc khi: sửa phản hồi bài luyện
- [GRABCAST-API-REQUESTS.md](GRABCAST-API-REQUESTS.md) — Danh sách endpoint GrabCast cần mở cho khóa API workspace để Lexkite quản lý 100% (connect, insights, comments, inbox…). Khóa workspace 4 đang bị chặn các endpoint này; đọc khi: làm việc với GrabCast API
- [HANDOFF.md](HANDOFF.md) — Bàn giao ngắn: việc nền đang chạy (ảnh từ vựng hàng loạt qua kho CF, kho từ 20k), số liệu mới nhất, việc tiếp theo, việc chờ chủ; đọc khi: đầu phiên, trước khi nhận việc ảnh từ vựng / kho từ
- [I18N-PIPELINE.md](I18N-PIPELINE.md) — Quy trình 15 ngôn ngữ giao diện: nguồn chuẩn duy nhất, quy tắc thêm chữ mới, kiểm tra tự động, mở thêm ngôn ngữ, SEO/blog theo ngôn ngữ. Không lẫn tiếng, không sót; đọc khi: MỌI việc thêm chữ giao diện
- [AI-LOCAL.md](AI-LOCAL.md) — AI có sẵn trong trình duyệt (Prompt/Translator/Detector/Proofreader…): trạng thái API, quy tắc tải, fallback máy chủ; đọc khi: thêm/sửa tính năng AI
- [INFRA-RULES.md](INFRA-RULES.md) — Quy tắc tài nguyên hệ thống: mọi dịch vụ/Worker/lưu trữ phải đăng ký ở infra/resources.json; hiện trạng lưu trữ, ngưỡng nâng cấp, mail. Sổ không ghi khóa/mật khẩu; đọc khi: thêm dịch vụ/host/Worker/lưu trữ mới
- [INDEX.md](INDEX.md) — mục lục chuẩn này; đọc khi: tìm tài liệu hoặc thêm doc mới (phải thêm 1 dòng ở đây)
- [JOBS.md](JOBS.md) — Sổ việc nền & điều phối, SINH TỰ ĐỘNG từ infra/jobs.json (không sửa tay): luật, tài nguyên, lịch UTC, đồ thị kho từ. Sinh lại: node scripts/jobs/gen.mjs --write; jobs-check chặn lệch; đọc khi: thêm cron/CI nền
- [LEXICON.md](LEXICON.md) — Kho từ vựng một nguồn sự thật: quy tắc chuẩn hóa build-lexicon, CEFR, nghĩa 13 ngôn ngữ, giọng đọc, hiển thị, ảnh minh họa. Không sửa tay extension/app/js/**; đọc khi: sửa từ vựng/nghĩa/ảnh từ
- [MEDIA-QA-RUBRIC.md](MEDIA-QA-RUBRIC.md) — Thang chấm 100 cho tài nguyên nhân vật & video: ảnh nhân vật, bối cảnh, video, Call Mia, vòng lặp sau đăng; chỉ dùng khi ≥ 90. Ghi điểm vào content/video/qa-log.md; đọc khi: chấm lô ảnh/video
- [METHODS.md](METHODS.md) — Luật lõi: điều phối, repo/remote/ship, ngân sách, việc nặng = CI, i18n, nội dung, video, lỗi đã mắc, tài khoản & hạ tầng. Lịch sử và bài học dài đã chuyển sang archive/METHODS-HISTORY.md (không bỏ luật nào); đọc khi: ĐẦU MỖI PHIÊN
- [PLAYBOOK.md](PLAYBOOK.md) — Sổ tay vận hành cũ (15/10): kiến trúc 0 đồng, thứ tự ship, pipeline GitHub Actions, nội dung/bản quyền, giọng đọc. METHODS.md thắng khi lệch; đọc khi: tra quy trình cũ
- [PR-PLATFORMS.md](PR-PLATFORMS.md) — Nền tảng PR & backlink miễn phí: tiến độ đăng, thay đổi 2026, danh sách xếp hạng 32 mục, cảnh báo, lộ trình 4 tuần. Chỉ gói miễn phí; anh chủ tự đăng ký/đăng bài; đọc khi: làm PR/backlink
- [QUALITY-SWEEP.md](QUALITY-SWEEP.md) — quality-sweep: quét lỗi tiềm ẩn hằng đêm (22:40 UTC, 0 token LLM) và journey-e2e; mở 1 issue + 1 dòng bản tin. Chạy tay: Actions → Quality sweep; đọc khi: sửa/đọc kết quả quét đêm
- [QUOTAS.md](QUOTAS.md) — Hạn mức & chống lạm dụng: rà endpoint, danh tính/bậc, hạn mức mặc định, cầu dao nhà cung cấp (≤80% gói miễn phí), phản hồi 429. Mọi thứ tĩnh vẫn miễn phí; đọc khi: thêm endpoint tốn tài nguyên
- [README.md](README.md) — Mục lục đọc-trước của docs/: thứ tự đầu phiên và mô tả nhóm tài liệu. Bản đầy đủ từng file ở INDEX.md; đọc khi: đầu phiên
- [REMINDERS.md](REMINDERS.md) — Nhắc học thông minh: một nguồn lập lịch, máy chủ push.js (D1 nội bộ), hỏi quyền không dark pattern, cờ, FCM, test. Mục tiêu đồng ý ≥40%, CTR ≥8%, hủy <5%/tháng; đọc khi: sửa nhắc học/push
- [REPORTS.md](REPORTS.md) — Báo lỗi người dùng (Report a problem): mã LX-xxxx, link #/report/<mã>, AI phân loại nền, ưu tiên và Claude Code xử lý. Chống lạm dụng; không sửa app.js; đọc khi: sửa luồng báo lỗi
- [ROLLBACK.md](ROLLBACK.md) — Sao lưu & khôi phục nhanh: mục 0 làm đúng thứ tự khi có sự cố; rollback Pages, git, D1 Time Travel, app/add-on, kho âm thanh. Mục 0 khi sự cố; còn lại tra cứu; đọc khi: CÓ SỰ CỐ hoặc cần khôi phục
- [SCALING-PLAN.md](SCALING-PLAN.md) — Kế hoạch mở rộng Cloudflare Workers > 100k người học/ngày: giới hạn gói miễn phí, chốt phòng thủ, lộ trình nâng cấp, bước bật gói Paid. Edge-first, local-first; đọc khi: cân nhắc nâng gói
- [SEO-ARCH.md](SEO-ARCH.md) — Biến nội dung công khai của app thành trang tĩnh index được: kiểm kê, mô hình trang tĩnh, sitemap/hreflang/IndexNow, cổng, nhân rộng. Nguồn: scripts/build-seo-pages.mjs; đọc khi: sửa SEO twin/trang tĩnh
- [SEO-DICT-PAGES.md](SEO-DICT-PAGES.md) — Trang từ điển tự sinh /vi/tu-dien/, /en/dictionary/: URL bản địa, nội dung độc nhất, schema/hreflang/sitemap shard, ngưỡng index + mở dần, Worker + R2 miễn phí, giấy phép dữ liệu, thiết kế vòng dữ liệu GSC; đọc khi: sửa trang từ điển, mở index, làm script GSC
- [SEO-TOOLS.md](SEO-TOOLS.md) — Công cụ miễn phí 15 ngôn ngữ: bài kiểm tra trình độ CEFR thích ứng, trang cấp độ A1–C2, quiz TOEIC Part 5; URL, ngân hàng câu, engine, SEO, CI Lighthouse; đọc khi: sửa công cụ/chuỗi/câu hỏi
- [SEO-GROWTH-PLAN.md](SEO-GROWTH-PLAN.md) — Kế hoạch tăng trưởng SEO 15 quốc gia 6 tháng (17/10/2026→04/2027): mục tiêu, nhịp đăng, nội dung theo nước, trang công cụ, đo lường. Bổ sung SEO-PLAN.md; đọc khi: lên kế hoạch nội dung SEO
- [SEO-PLAN.md](SEO-PLAN.md) — SEO kỹ thuật và blog tự đăng: kiến trúc, rà soát & sửa, blog engine, lịch đăng, quy trình viết 7 bước, đặc tả định dạng bài. Mục tiêu top tìm kiếm tiếng Việt; đọc khi: sửa SEO kỹ thuật/blog engine
- [SHORTS-ACCESS.md](SHORTS-ACCESS.md) — Thư viện video quản trị phát từ Kho Drive riêng (repo riêng tư lexkite-shorts), không cần token GitHub; luồng và dữ liệu. Việc của chủ: không còn; đọc khi: sửa thư viện video
- [STORAGE.md](STORAGE.md) — Dung lượng repo chính và kho media (24/10): số đo trước→sau, âm thanh ở kho media, không viết lại lịch sử git, cổng size-guard. Số đo ở infra/storage-forecast.json; đọc khi: thêm file lớn/media
- [STORE-READINESS.md](STORE-READINESS.md) — Sẵn sàng lên Google Play & App Store (com.lexkite.app): trạng thái hiện tại, checklist Play, App Store, chung, và khi bật AdMob. Mục đã xong/cũ ở archive/STORE-READINESS-HISTORY.md; đọc khi: nộp/cập nhật app lên store
- [TECH-RADAR.md](TECH-RADAR.md) — Tech radar: chuẩn chọn công nghệ (miễn phí, tiên tiến, chạy ở máy người dùng/biên); danh sách áp dụng, theo dõi, không dùng và lý do. Ghi kết quả mỗi lần nâng cấp; đọc khi: thêm thư viện/dịch vụ
- [TOKEN-RULES.md](TOKEN-RULES.md) — Luật tiết kiệm token: đọc ít, giao việc cho agent ngắn, không chờ/poll, gộp kiểm thử, nội dung hàng loạt, báo cáo ngắn. BẮT BUỘC cho mọi agent; đọc khi: ĐẦU MỖI PHIÊN và khi giao việc
- [UX-BENCHMARK.md](UX-BENCHMARK.md) — So sánh UX web app với Duolingo, Babbel, Busuu, Speak, Elsa, Anki/Quizlet: scorecard, tiêu chí, top 10 cải tiến, UX v3 (icon + token). Bằng chứng ảnh CI ux-shots.yml; đọc khi: cải tiến UX
- [UX-PUBLIC.md](UX-PUBLIC.md) — Audit UX trang vào cửa + app (24/10): lỗi nặng nhất, token vai trò, mẫu lỗi toàn app, Lighthouse trước→sau, LCP màn đầu. So với Duolingo/Babbel/Cambridge/Quizlet; đọc khi: sửa landing/UX công khai
- [VIDEO-QC.md](VIDEO-QC.md) — Chuẩn QC video trước & sau, tự động trên CI: trượt 1 cổng là không dùng/không đăng; kết quả qc/<id>.json + điểm 100. Chủ 22/10/2026; đọc khi: kiểm tài nguyên/clip video
- [VIDEO-SCALE-PLAN.md](VIDEO-SCALE-PLAN.md) — Kho video đa dạng + chuẩn 100/100: tránh bị nền tảng coi trùng lặp, bảy trục đa dạng, thang 100 điểm, đường ống 0 credit. Hàng nghìn short bản tin Ama/Carlos; đọc khi: nhân rộng video
- [VIDEO-STORAGE.md](VIDEO-STORAGE.md) — Lưu trữ short theo công thức (recipe-first) $0, mở rộng tới 100k clip: nơi lưu, luồng, dựng lại từ công thức, di trú repo cũ. Duyệt 22/10/2026; đọc khi: lưu/dựng lại short
- [VIDEO-TEACHERS.md](VIDEO-TEACHERS.md) — Giáo viên video, bộ cảnh và clip nói (họ template v9): clip dùng ngay 0 credit, mặt nạ đầu, thêm giáo viên, bank CLASSROOM, chữ trên bảng. Nguồn: content/video/cine/teachers.json; đọc khi: sửa giáo viên/cảnh video
- [VIDEO-TEMPLATES.md](VIDEO-TEMPLATES.md) — Template video v1 (24/10) nhất quán theo thiết kế: lưới, thang chữ, màu từ kit.js, token chuyển động, luật, cấu trúc beat. Thay cách dựng cine/news bị chủ bác; đọc khi: sửa template video
- [VIDEO-SERIES.md](VIDEO-SERIES.md) — 6 series video đánh số + bộ lọc chủ đề máy làm tốt + chuẩn pipeline quy mô lớn: lý do save/share, kho 10 tập đầu mỗi series, luật series, nhịp giảng; đọc khi: lên nội dung video
- [VIDEO.md](VIDEO.md) — Nguồn sự thật video hiện hành: chiến lược (NEWS-ANCHOR), look v5, builder scripts/cine/, CI cine-render, lưu trữ, kho footage. Tài liệu video cũ toàn văn ở archive/; đọc khi: mọi việc video
- [VISUAL-LEARNING-PLAN.md](VISUAL-LEARNING-PLAN.md) — Kế hoạch ảnh học ngoài thẻ từ vựng: các ứng viên theo giá trị/công sức, giai đoạn 1 (24/10), luật cho mọi giai đoạn. Dùng chung pipeline ảnh từ vựng; đọc khi: thêm ảnh minh họa mới
- [VOCAB-IMG-STYLE.md](VOCAB-IMG-STYLE.md) — Chuẩn ảnh từ vựng: nghiên cứu app lớn, khoa học học tập, phong cách nhà duy nhất, khung hình đọc được ở 96-160 px, luật theo lớp từ, dàn nhân vật. Code: scripts/vocab-img/style.mjs; đọc khi: sinh/duyệt ảnh từ vựng
- [WORD-AUDIO.md](WORD-AUDIO.md) — Giọng đọc từ đơn (audio/w) bản s3: vấn đề, thí nghiệm word-audio-lab, cách làm hiện tại, giấy phép, kết quả. Không nới ASR; từ không đạt dùng giọng máy; đọc khi: sửa âm thanh từ
- [YOUTUBE-SETUP.md](YOUTUBE-SETUP.md) — Tải short đã duyệt lên YouTube ($0): hiện đăng tay qua Studio, thiết lập một lần, dùng hằng ngày, kiểm định API compliance, bảo mật, nhiều kênh. Code: functions/api/youtube.js; đọc khi: đăng video lên YouTube
- [i18n-review-2026-10-16.md](i18n-review-2026-10-16.md) — Nhật ký rà soát bản dịch 16/10/2026 cho các chuỗi bị back-translation gắn cờ (OK/WRONG). Đã chuyển sang archive/i18n-review-2026-10-16.md; đọc khi: tra quyết định dịch cũ

## Con trỏ tới tài liệu đã chuyển (stub trong docs/)
- [CINE-SCENE-STANDARD.md](CINE-SCENE-STANDARD.md) — Con trỏ → VIDEO.md (toàn văn cũ ở archive/); đọc khi: cần biết nó đã chuyển đi đâu
- [KLING-PLAN.md](KLING-PLAN.md) — Con trỏ → VIDEO.md (toàn văn cũ ở archive/); đọc khi: cần biết nó đã chuyển đi đâu
- [LISTENING-CHANNEL-PLAN.md](LISTENING-CHANNEL-PLAN.md) — Con trỏ → VIDEO.md (toàn văn cũ ở archive/); đọc khi: cần biết nó đã chuyển đi đâu
- [VIDEO-CONTENT-PLAN.md](VIDEO-CONTENT-PLAN.md) — Con trỏ → VIDEO.md (toàn văn cũ ở archive/); đọc khi: cần biết nó đã chuyển đi đâu
- [VIDEO-PIPELINE.md](VIDEO-PIPELINE.md) — Con trỏ → VIDEO.md (toàn văn cũ ở archive/); đọc khi: cần biết nó đã chuyển đi đâu
- [VIDEO-SYSTEM-PLAN.md](VIDEO-SYSTEM-PLAN.md) — Con trỏ → VIDEO.md (toàn văn cũ ở archive/); đọc khi: cần biết nó đã chuyển đi đâu

## Thư mục con
- [BOARD-ARCHIVE.md](agents/BOARD-ARCHIVE.md) — Lưu trữ BOARD: thẻ đã xong, thread đã đóng, toàn văn thẻ đã rút gọn (nguyên văn, chỉ để tra). Chỉ tra cứu; đọc khi: tra thẻ cũ
- [BOARD.md](agents/BOARD.md) — Bảng giao việc Claude ⇄ Antigravity: TODO → ĐANG LÀM → CHỜ DUYỆT → ĐÃ XONG, mục HỎI CLAUDE. Thẻ đã xong ở BOARD-ARCHIVE.md; đọc khi: MỖI vòng lặp
- [DUO-GAP.md](agents/DUO-GAP.md) — Bảng khoảng trống UX bài học kiểu Duolingo (21/10): chỉ học mẫu tương tác, không chép tài sản/chữ. Của @claude; đọc khi: làm UX bài học
- [dictionary-quality-2026-10.md](audits/dictionary-quality-2026-10.md) — Audit chất lượng từ điển 10/2026. Báo cáo tại thời điểm đó; đọc khi: tra chất lượng từ điển
- [exams-2026-10.md](audits/exams-2026-10.md) — Audit đề thi 10/2026. Báo cáo tại thời điểm đó; đọc khi: tra chất lượng đề thi
- [grammar-2026-10.md](audits/grammar-2026-10.md) — Audit ngữ pháp 10/2026. Báo cáo tại thời điểm đó; đọc khi: tra chất lượng ngữ pháp
- [path-2026-10.md](audits/path-2026-10.md) — Audit lộ trình học 10/2026. Báo cáo tại thời điểm đó; đọc khi: tra chất lượng lộ trình
- [vocabulary-2026-10.md](audits/vocabulary-2026-10.md) — Audit từ vựng 10/2026. Báo cáo tại thời điểm đó; đọc khi: tra chất lượng từ vựng
- [DMCA-KIT.md](legal/DMCA-KIT.md) — Bộ hồ sơ DMCA mẫu của Lexkite (không phải tư vấn pháp lý): thông báo và phản thông báo. Điều chỉnh theo từng vụ việc; đọc khi: xử lý DMCA
- [study4-courses.md](research/study4-courses.md) — Ghi chú nghiên cứu cấu trúc khóa học & bài tập của Study4 (15/10/2026, duyệt chỉ đọc). Chỉ học mẫu, không chép; đọc khi: thiết kế khóa học/bài tập
- [study4-syllabi.md](research/study4-syllabi.md) — Ghi chú nghiên cứu giáo trình Study4. Chỉ học mẫu, không chép; đọc khi: thiết kế giáo trình
- [pron-phoneme-plan.md](research/pron-phoneme-plan.md) — Kế hoạch R&D chấm phát âm từng âm vị kiểu ELSA, 100% miễn phí (wav2vec2 ONNX trên máy, GOP, P0–P3 + ước lượng token); đọc khi: làm chấm phát âm

## Lưu trữ (docs/archive/ – nguyên văn, chỉ để tra cứu)
- [BACKLOG-DONE.md](archive/BACKLOG-DONE.md) — Việc đã xong 15/10/2026 (tách từ BACKLOG.md, nguyên văn); đọc khi: tra việc đã xong
- [CINE-SCENE-STANDARD.md](archive/CINE-SCENE-STANDARD.md) — Toàn văn cũ chuẩn cảnh footage điện ảnh (giữ số §); bản hiện hành VIDEO.md; đọc khi: cần số § cũ
- [COORDINATION-LOG.md](archive/COORDINATION-LOG.md) — Nhật ký bàn giao Claude ⇄ Antigravity (tách từ COORDINATION.md, nguyên văn); đọc khi: tra lịch sử bàn giao
- [KLING-PLAN.md](archive/KLING-PLAN.md) — Toàn văn cũ kế hoạch Kling; bản hiện hành VIDEO.md; đọc khi: tra kế hoạch Kling cũ
- [LISTENING-CHANNEL-PLAN.md](archive/LISTENING-CHANNEL-PLAN.md) — Toàn văn cũ kế hoạch kênh nghe; bản hiện hành VIDEO.md; đọc khi: tra kế hoạch kênh nghe cũ
- [METHODS-HISTORY.md](archive/METHODS-HISTORY.md) — Toàn văn METHODS.md trước khi rút gọn (22/10) và các bài học dài đã chuyển ra sau đó; đọc khi: tra bài học chi tiết (footage, matting, D1, điều phối)
- [STORE-READINESS-HISTORY.md](archive/STORE-READINESS-HISTORY.md) — Mục đã xong/cũ của STORE-READINESS.md (nguyên văn 22/10); đọc khi: tra checklist store cũ
- [VIDEO-CONTENT-PLAN.md](archive/VIDEO-CONTENT-PLAN.md) — Toàn văn cũ kế hoạch nội dung video; bản hiện hành VIDEO.md; đọc khi: tra kế hoạch nội dung cũ
- [VIDEO-PIPELINE.md](archive/VIDEO-PIPELINE.md) — Toàn văn cũ pipeline video; bản hiện hành VIDEO.md; đọc khi: tra pipeline cũ
- [VIDEO-SYSTEM-PLAN.md](archive/VIDEO-SYSTEM-PLAN.md) — Toàn văn cũ kế hoạch hệ video; bản hiện hành VIDEO.md; đọc khi: tra kế hoạch hệ video cũ
- [i18n-review-2026-10-16.md](archive/i18n-review-2026-10-16.md) — Nhật ký rà soát bản dịch 16/10 (chuyển từ docs/, nguyên văn); đọc khi: tra quyết định dịch
