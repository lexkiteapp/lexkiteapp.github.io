# CODEMAP – bản đồ mã nguồn (SINH TỰ ĐỘNG, đừng sửa tay)

> TL;DR: Đọc file này ĐẦU PHIÊN thay vì khám phá repo; tra chính xác bằng `docs/codemap.json` (`node -e` / jq); chỉ grep/mở file mà bản đồ trỏ tới. Sinh bởi `node scripts/codemap.mjs` (workflow codemap.yml). Luật: TOKEN-RULES.md §1.
> Đọc khi: ĐẦU MỖI PHIÊN, trước khi tìm code.

Tra json: `node -e "const g=require('./docs/codemap.json');console.log(g.nodes['web/js/app.js'])"` · `g.routes` · `g.workflows` · `g.tests` · `g.god`. Mỗi node: exports, imports, importedBy.

## Khu vực
- `web/` (1976 file): App (SPA) + landing: shell web/app/index.html nạp web/js/*.js bằng <script> (toàn cục App/UI/Chars, KHÔNG import); lazy bundle: BUNDLES trong web/js/app.js; css web/css; trang tĩnh sinh bởi scripts/build-*.mjs → dist
- `extension/` (1285 file): Add-on Chrome/Edge (background/content/popup/newtab). extension/app là BẢN SAO dựng từ web/ (scripts/build-extension.sh) – KHÔNG sửa tay, bị bỏ khỏi map
- `functions/` (85 file): Cloudflare Pages Functions = backend /api/* (file _*.js là helper dùng chung)
- `workers/` (19 file): Cloudflare Workers riêng: audio, dict, gemini (AI), mail, media; workers/lib dùng chung
- `scripts/` (963 file): Công cụ build/gen/ops (mjs); scripts/test = chuỗi `npm test`; thư mục con theo mảng (video, lexicon, dict, ops, jobs, ci, social, seo…)
- `.github/workflows/` (169 file): CI/CD + việc nền theo lịch (xem mục Workflows)
- `infra/` (10 file): Sổ hạ tầng JSON: resources, jobs (nguồn của docs/JOBS.md), media-repos, schema.lock
- `brand/` (1479 file): tokens.json (màu), logo, stitch/ (ref + DTCG), library/ (kho cảnh/clip video)
- `content/` (2867 file): Nội dung nguồn: blog, authority, dict, confidence, explain, brand (dữ liệu lớn – bỏ khỏi map)
- `mobile/` (214 file): Capacitor iOS/Android (ios/ android/ bỏ khỏi map)
- `store/` (43 file): Hồ sơ listing Chrome/Edge/Apple/Play
- `docs/` (195 file): Luật + tài liệu chủ đề (docs/README.md → INDEX.md); lịch sử ở docs/archive
- API `/api/*` (40): account,admin,admin-accounts,admin-clips,admin-prefs,admin-shared,admin-shorts,ads-report,ads-reward,ai,backlinks,capacity,class,config,contact,cron-kick,dictlookup,distribution,drive,growth,handoff,hit,i18nfix,img,jobs,keys,league,lexai,notices,ota,push,quota,report,report-shot,social,social-auto,studio,sync,watch,youtube
- Thư mục con (số file; js/=web/js, s/=scripts): js/i18n:697 s/test:366 s/video:103 js/vimg:64 s/cine:50 s/lib:47 s/lexicon:31 s/vocab-img:31 js/grammar:27 js/notes:27 js/st:27 s/stitch:22 js/speak:22 js/readtest:21 js/lib:20 s/pron:19 s/ci:17 js/get-app:15 js/toeic:15 s/word-audio:13 s/lipsync:12 s/ops:12 js/listen:12 s/tts-ab:9 js/call:9 js/write:9 s/capacity:8 s/footage:8 s/teach:8 s/factory:7 js/usage:7 s/content-qa:6 s/dict:6 s/sentence-audio:6 js/pron:6 s/cdn:5 s/quality:5 js/lesson:5 s/audio:4 s/teacher:4 js/ads:4 js/roleplay:4 js/toefl:4 js/vendor:4 s/explain:3 s/free-tier:3 s/media:3 s/ota:3 s/scriptbank:3 s/target:3 s/world:3 js/tools:3

## Sửa ở đâu (tác vụ → file)
- **Chuỗi i18n (15 ngôn ngữ)**: Khóa = câu tiếng Việt trong t('…'). Bản dịch web/js/i18n/<lang>.js + web/js/i18n/en/*.js (nhóm theo tính năng); add-on extension/_locales/<lang>/messages.json. Tool: scripts/i18n-missing.mjs, i18n-qa.mjs, gen-i18n.mjs, i18n-sync.sh. Luật: docs/I18N-PIPELINE.md. Test: scripts/test/i18n-*.mjs
- **Design token / màu**: brand/tokens.json → scripts/build-tokens.mjs → :root trong web/css/style.css (+ scripts/lib/site-layout.mjs). Stitch: brand/stitch/tokens.dtcg.json, scripts/build-stitch-css.mjs → web/css/st-*.css. Luật: docs/DESIGN-SYSTEM.md, docs/BRAND-RULES.md; test brand-check.mjs
- **Giáo viên Ama/Carlos**: Registry web/teach/characters.json (+ ama/ carlos/); API Chars.* ở web/js/characters.js; lời/khẩu hình web/js/lesson/teacher.js, web/js/st/v2/teacher-call.js; tool scripts/teach, scripts/teacher; luật docs/CHARACTERS.md; test characters-gate.mjs
- **Luồng bài học**: web/js/lesson/{engine,ui,stories,gold,teacher}.js; màn st: web/js/st/lesson.js, web/js/st/v2/lesson-question.js, lesson-complete.js; lộ trình web/js/path.js, plan.js, next-step.js; build scripts/lesson/; docs/LESSON-ENGINE.md, docs/LEARNING-PATH.md; test lesson.mjs, learn-flow.mjs
- **Từ điển / từ vựng**: web/js/dictionary.js (route #/dict), lexis.js, lex.js, wordcard.js, vocab-img.js; dữ liệu sinh: scripts/build-lexicon.mjs, scripts/lexicon/, scripts/dict/, workers/dict; docs/LEXICON.md; test lex.mjs, dict-pages.mjs
- **Cổng Stitch v2**: scripts/stitch-v2-convert.mjs (HTML Stitch → module) → web/js/st/v2/*.js + web/css/st-v2-*.css; ref brand/stitch/v2; docs/STITCH-V2-PORT.md; CI so ảnh (workflow nav-render, dist-ui)
- **Pipeline video**: scripts/video/{render,auto,synth,motion}.mjs + remotion/ + motion/; cảnh cine scripts/cine; footage scripts/footage; kho brand/library/cine; docs/VIDEO.md, docs/VIDEO-MOTION.md, docs/CREDIT-RULES.md (tiêu credit: đọc trước); workflow cine-render, footage-*
- **Route / màn hình app**: routes.<tên> = … rải ở web/js/*.js (bảng Routes dưới); alias + lazy bundle ở web/js/app.js (ROUTE_ALIAS, ROUTE_BUNDLE, BUNDLES); thêm script toàn cục → web/app/index.html
- **API backend**: functions/api/<tên>.js = /api/<tên>; helper functions/api/_*.js (quota, abuse…); test api-security.mjs
- **Add-on**: extension/{manifest.json,background.js,content.js,popup.js,newtab.js}; build scripts/build-extension.sh (web → extension/app); test ext-*.mjs; docs/CWS-RULES.md
- **Blog / SEO**: content/blog + scripts/blog-pipeline.mjs, build-blog.mjs, build-seo.mjs; workflow blog-daily; docs/BLOG-RUNBOOK.md
- **CI / việc nền**: infra/jobs.json → docs/JOBS.md (node scripts/jobs/gen.mjs); lease scripts/jobs/lease.mjs; chuỗi test = scripts/test/suite.txt (npm test → run-suite.mjs); scripts/prepush.sh; docs/CI-RUNNERS.md

## God nodes (15 module được import/nạp nhiều nhất; không tính test)
1. `web/js/app.js` ←87 · App,LK_GETAPP_T,retArm,retOn,retTrack,parseHash…
2. `web/js/st/common.js` ←37 · ST
3. `functions/api/sync.js` ←30 · claims,verify,limit,PACK_MAX,viewOf,userDocs…
4. `scripts/lexicon/lib.mjs` ←22 · ROOT,rd,wr,PRIORITY,SOURCES,parseRow…
5. `functions/api/_d1guard.js` ←20 · D1_LIMITS,GUARD_PCT,WARN_PCTS,GQL_TIMEOUT_MS,CI_FRESH_MS,day…
6. `scripts/video/library.mjs` ←20 · ROOT,LIB,CAND,MANIFEST,CDN,parseName…
7. `web/js/ai.js` ←19 · AI
8. `functions/api/admin.js` ←18 · adminAudit,adminCors,_resetAdminMem,cached,LEGACY,onRequestOptions…
9. `web/js/sync.js` ←17 · Sync,VBBridge
10. `functions/api/_quota.js` ←15 · DEFAULTS,PROVIDERS,BREAKER,STRIKE,dayKey,nextMidnight…
11. `web/js/data.js` ←15 · script
12. `scripts/lib/blog-content.mjs` ←14 · ROOT,CATEGORIES,config,parse,setField,loadPosts…
13. `functions/api/_schema.js` ←13 · once,_resetSchema
14. `scripts/lexicon/expand/lib.mjs` ←13 · LANGS,QUEUE,TOPIC_CHOICES,btMatch,BT_LOOSE,btOk…
15. `scripts/lib/site-layout.mjs` ←13 · EXT_STORE,EXT_JS,GETAPP_JS,LSW_CSS,LSW_JS,THEME_KEY…

## Routes `#/…` → file xử lý (74)
- `app.js`: contact deck home library stats topic welcome
- `call.js`: call
- `cbt.js`: cbt
- `classroom.js`: class
- `confidence.js`: confidence
- `courses.js`: course courses
- `criteria.js`: criteria
- `dict-page.js`: dict
- `fixer.js`: fix
- `goal.js`: goal
- `grammar.js`: grammar
- `handoff.js`: handoff
- `handsfree.js`: handsfree
- `hubs.js`: me skill skills tests vocab
- `ideas.js`: ideas
- `league.js`: league
- `lesson/ui.js`: lesson
- `letters.js`: letters
- `listening.js`: dictation listen listen-test listening
- `method.js`: method
- `mock.js`: mock
- `paraphrase.js`: paraphrase
- `path.js`: day path tracks
- `phrases-model.js`: model models phrases
- `placement.js`: placement
- `plan.js`: mistakes
- `pron.js`: pron
- `qtips.js`: qstats
- `quick.js`: quick style
- `reading.js`: read reading
- `reflex.js`: reflex
- `report-pill.js`: report
- `resources.js`: resources
- `retention.js`: streak
- `roleplay.js`: roleplay
- `rtype.js`: rtype
- `say.js`: say
- `settings.js`: settings
- `speak/app.js`: speak
- `speaking.js`: speaking
- `study.js`: practice review
- `task1.js`: task1
- `toefl.js`: toefl toefl-p
- `toeic.js`: toeic toeic-r toeic-sw toeic-test
- `usage.js`: usage
- `ux1-me.js`: me
- `ux1.js`: train
- `verbs.js`: verb
- `watch.js`: watch
- `write.js`: write

## Workflows (169) theo trigger: tên: việc kiểm/làm
- [cron,manual] ads-revenue-hourly: Doanh thu THẬT · ads-revenue: Doanh thu THẬT từ Google (docs/ADS.md… · blog-daily: Việc blog tự động mỗi sáng (06:30 giờ… · blog-publish: Tự đăng blog: mỗi 3 giờ (phút 7, trùng… · capacity-watch: Hạn mức Cloudflare hằng ngày… · cdn-mirror: media.lexkite.com + audio.lexkite.com… · cf-pool-probe: Dò kho CF_POOL ngay sau giờ nạp neuron… · ci-filler: 02/11: chạm file để GitHub đăng ký lại… · ci-triage: Tự phân loại workflow đỏ… · code-bundle: Sao lưu mã nguồn hằng tuần: git bundle… · contrast: Kiểm độ tương phản chữ/nền (WCAG AA)… · d1-backup: Sao lưu D1 chính (bảng người dùng) ra… · d1-usage-watch: D1 trong ngày (sự cố 03/11 · d1b-migrate: Sao các bảng nội bộ (drive*) từ D1… · dict-stage: Tự mở index trang từ điển theo giai… · drive-repair: Chép bù file thiếu bản sao / chỉ 1 bản… · explain: Lời giải đáp án (mẫu · vì sao · vì sao… · footage-archive: Lưu kho footage (repo riêng… · footage-verify: Kiểm kho footage trên Kho Drive HẰNG… · free-tier-guard: 02/11: chạm file để GitHub đăng ký cron… · health: Rà soát lỗi tiềm ẩn HẰNG NGÀY trên toàn… · lexicon-expand: Mở rộng kho từ tới 20k (docs/LEXICON.md… · lexicon-i18n: Nghĩa 13 ngôn ngữ theo NGHĨA + TỪ LOẠI… · nav-render: Chuyển trang & Quay lại trên… · news-auto: A->Z driver for the news shorts… · pr-check · preview-site: Site PREVIEW cho chủ duyệt redesign… · quality-sweep: Quét lỗi tiềm ẩn hằng đêm, 0 token LLM… · required-gate: MỘT commit status tổng hợp cho mỗi PR · script-bank: Kho kịch bản video ngắn · sentence-audio-asr: Cổng ASR cho audio câu Kokoro (audio/l… · seo-gsc: Vòng dữ liệu Google Search Console · social-auto: Autopilot social (docs/DISTRIBUTION.md… · storage-watch: Giám sát dung lượng git hằng tuần: repo… · upgrade-audit: Kiểm toán nâng cấp hằng tuần: làm mới… · video-auto: Video tự động hằng ngày… · visual-qa: Soát giao diện tự động (tràn chữ, nút… · vocab-img-free: Ảnh từ vựng · vocab-img-scene: Ảnh cho MỌI nghĩa (~20k từ) + ảnh bài… · vocab-img: Ảnh minh hoạ từ vựng (dual coding) · word-audio: Giọng đọc từ đơn Anh + Mỹ (Kokoro-82M… · youtube-manual: Manual YouTube path… · youtube-upload: Upload owner-approved shorts to YouTube…
- [manual] bg-gates: Cổng tự động cho ảnh nền bản tin (BG… · bg-v4: sharper wide backgrounds + one shared… · chroma-batch: Tách nền PHÔNG XANH cả lô clip Kling… · chroma-test: Thử tách nền PHÔNG XANH cho 1 clip… · confidence-shots: Ảnh trước/sau Giao tiếp tự tin (điện… · cws-media: Media Chrome Web Store (video 1080p + 5… · cws-publish: Đăng bản mới của add-on lên Chrome Web… · explain-shots: Ảnh trước/sau của thẻ giải thích đáp án… · footage-reel: owner review of the footage banks… · green-prep: Chuẩn bị clip phông xanh mới trên CI… · ios-testflight: Ký + tải bản iOS lên TestFlight (App… · library-build: Kho dựng video · library-ingest: Nhập clip mới vào kho dựng video · matte-pro · news-voice · ota-rollback: Quay bản web OTA về bản trước (hoặc bản… · pron-distill · pron-train · review-shots: Ảnh trước/sau ôn tập đa chế độ + thẻ… · shorts-migrate: One-time (re-runnable) migration of… · shorts-rebuild: Re-render shorts from their RECIPES… · stitch-fonts: Dựng lại phông icon Material Symbols… · tts-ab: Phép thử A/B giọng Kokoro ↔ ElevenLabs… · ux-public: UX audit of the public entry pages… · video-pilot5: ONE lesson (tpl1b_airport_gate_cc6fbe)… · video-pilot6: ONE presenter-show pilot… · video-pilot7: ONE "news + scene" pilot… · video-pilot8: ONE "continuous talking head" pilot… · video-sample: Dựng video MẪU từ kịch bản… · video-series: render numbered series episodes… · video-stress: Dựng thử ĐA DẠNG trên CI (không chạy… · video-templates · video-templates9: ONE sample per v9 template… · video-tpl1b-samples: render a FEW hand-picked tpl1b lessons… · video-tpl1b: gold scripts → template-1b shorts in… · video: Dựng 1 video cho Video Studio (Quản trị… · vocab-img-publish: Đăng lại ảnh minh hoạ đã QC từ artifact… · word-audio-lab: Thí nghiệm giọng từ đơn (chỉ chạy tay)…
- [push:main,manual] admin-video-ui: Quản trị → Video (#video): ảnh giao… · android: Tự build app Android (APK) trên máy chủ… · blog-images: Ảnh RIÊNG từng bài blog… · ci: Kiểm thử tự động mỗi lần đẩy code (miễn… · clips-perf: Ngân sách hiệu năng lưới clip quản trị… · codemap: Bản đồ mã nguồn: sinh lại… · dict-perf: Hiệu năng + nhất quán từ điển trên di… · dist-ui: Kênh & phân phối: ảnh kiểm tra giao… · ext-e2e: Kiểm thử đầu-cuối add-on thật · ios-e2e: Kiểm thử app iOS từng tính năng trên… · ios: Tự build app iOS cho Simulator trên máy… · kokoro-model: Chép mô hình Kokoro-82M q8 + giọng app… · native-auth-e2e: Kiểm đăng nhập gốc (Firebase Auth · play-shots: Ảnh Google Play (app Android… · prod-release: Mỗi lần đẩy main = Cloudflare Pages tự… · seo-indexnow: Báo IndexNow (Bing, Yandex, Naver…) các… · store-shots: Ảnh Chrome Web Store chụp từ add-on… · store-video-viral: Video quảng cáo bản quốc tế… · store-video: Video giới thiệu add-on…
- [pr,manual] call-qa: QA cuộc gọi Ama/Carlos + phát âm: e2e… · lesson-embed: Video nhúng một bước #/lesson (cờ… · review-taps-stability: Chứng minh `taps` (WebKit iPhone, tối)… · review-taps: Màn Ôn (Stitch v2) trên điện thoại: mọi… · stitch-diff: Bám mẫu Stitch: vẽ 4 màn (Học · Bài học… · stitch-refs-qc: QC kho mẫu Stitch v2.1 vẽ trước (web… · stitch-web: Trang web tĩnh theo Stitch v2.1: build… · target-content: Sinh bộ từ lõi ngôn ngữ đích (pt-BR… · teach-video: Teach2D templates… · teacher-native: Cổng teacher-native (runtime): giáo… · theme-qa: Nút giao diện Sáng/Tối/Tự động trên… · topbar-lang: Một nút đổi ngôn ngữ, thanh trên thẳng… · video-e2e: end-to-end DRY RUN of the news pipeline… · video-motion: Stitch overlay shorts… · web-sweep: Cổng "lỗi ẩn" mọi loại trang công khai… · word-arrange-e2e: Xếp câu (web/js/word-arrange.js): chèn… · word-audio-tl: Giọng từ đơn ngôn ngữ đích (pt-BR…
- [push:main,cron,manual] audio: Tạo giọng đọc Kokoro (AI giọng tự… · capacity-sim: Mô phỏng chi phí D1 / Functions theo… · content-evidence: Bằng chứng tác quyền ở BÊN THỨ BA (miễn… · content-protect: Bảo vệ nội dung hằng tuần (miễn phí)… · i18n-leak: Rà soát LẪN TIẾNG tự động: chạy app ở… · i18n · lighthouse: Đo tốc độ & chất lượng lexkite.com bằng… · pages-deploy: Cổng deploy Cloudflare Pages duy nhất… · screens: Chụp ảnh giao diện tự động (điện… · sent-packs · word-packs: Gói nghĩa từ vựng dịch sẵn 13 ngôn ngữ… · wordlists: Kho từ theo kỳ thi từ danh sách nguồn… · world-scorecard: Bảng World: Lexkite vs Duolingo theo…
- [push:main,pr,manual] admin-guard: Gác bố cục mọi trang quản trị: khung… · audio-play: Phát audio ổn định mọi máy… · authority-pages: Uy tín / E-E-A-T… · dict-pages: Trang từ điển (docs/SEO-DICT-PAGES.md)… · figure-layout: Cổng bố cục hình đề (Writing Task 1… · frame-consistency: Một khung app: mọi route của app thật… · size-guard: Cổng dung lượng repo chính… · tools-pages: Công cụ miễn phí (docs/SEO-TOOLS.md)…
- [push,manual] app-lcp: Đo LCP/perf màn đầu app (/app/) · ios-shots: Ảnh App Store (iPhone 6.9" 1320×2868 +… · perf-profile: Hồ sơ CPU lần tải lạnh (CPU 4×) cho 1… · say-native: Say it like a native · teach-build: Dựng bộ nhân vật DUY NHẤT (web/teach/… · ux-shots: Ảnh trước/sau các luồng chính của app… · video-shard-equiv: Equivalence proof of the sharded…
- [pr,cron,manual] ads-demo: Quảng cáo DEMO/THỬ chính thức của… · content-factory: Xưởng nội dung… · font-audit: Rà font chữ web/app/add-on từng phần… · report-shots: Ảnh chụp báo lỗi trên R2…
- [cron,manual,after-wf] drive-shorts: Sao lưu shorts ĐẠT… · release-archive: Giữ 3 bản phát hành đã ký gần nhất của… · video-web: Bản WEB của short bản tin
- [push,pr,manual] characters-shots: Kiểm hình "1 bộ nhân vật"… · stitch-quality-qc: QC mẫu Stitch "nâng chất lượng" (báo… · ux-cards: Ảnh trước/sau các thẻ học có dữ liệu…
- [manual,call] cine-render: Dựng video điện ảnh (cine) trên CI · pron-eval
- [push] brand-build: Dựng tài sản thương hiệu từ… · hair-try: Thử đổi màu tóc trên 1 clip/người (0…
- [push:main,pr,cron,manual] content-qa: Cổng QA nội dung hằng đêm… · mobile-qa: Soát web mobile (360/390/412 px): tràn…
- [after-wf] qa-backlog: Mỗi lượt QA đỏ trên main (do ci-filler…
- [manual,after-wf] pages: Kiểm CDN âm thanh sau mỗi lượt tạo…
- [manual,after-wf,call] post-deploy-check: Soát bản LIVE lexkite.com sau mỗi lượt…
- [pr] samples-visual: Cổng họ trang thư viện…
- [pr,call] npm-test: Bộ kiểm `npm test` DUY NHẤT (một định…
- [pr,cron,manual,after-wf] report-autofix: Báo lỗi tự chuyển trạng thái theo PR…
- [pr,manual,after-wf,call] qa-bot: QA bot (scripts/test/qa-bot.mjs ·…
- [push,pr,manual,call] journey-e2e: Hành trình người dùng đầu-cuối…

## Test (308) → vùng phủ (file đích chi tiết: json `tests`)
- `web/js`: account-delete account-flow account-ui admin-gate admin-share admin-ui ads-admin ads-cls ads anki audio-play audio-voice call-e2e call-engine choice-kit client-security clips-perf comment-code confidence criteria datamuse-resilience dict-sent-lang dictlookup drive-ui exit-guard ext-selection facade-perf feel focus-targets get-app ipa-accent js-budget landing-routing league learn-flow lesson-drag lex lipsync-lesson lipsync mobile-guards mobile-qa native-auth next-step notify-ux pron-coach pron-pairs quick-ui reminders report-ui retention say-text sel-translate shell-size social-ui speak-ipa speak-split speak st2-href streak-flame streak-ui sync-drive target-lang teacher-loop teacher-native theme-switch today-mobile-actions tutor unit usage verbs video-web watch word-arrange-e2e
- `(không rõ)`: a11y admin-video-shots ads-demo-android ads-demo app-lcp-probe ci-policy clutter confidence-shots content-check contrast crawl d1-scan docs-budget e2e explain-shots figure-layout final-qc i18n-switch ios-driver-watchdog lazyfix lip-shots listing-check native-facade nav-render no-url-pathname profile-route pron-read qa-bot-diff review-done review-lookup review-modes-e2e review-modes-ui review-modes review-shots review-taps route-race run-suite samples-seo-parity samples-visual screens seo-pages seo-sitemap seo-words-shots serve-web smoke teacher-native-shots toeic-read-e2e tools-ui topbar-lang tsc-check ux-cards ux-guard-lib ux-guard ux-public ux-shots ux-sweep ux1-guard video-web-e2e visual-qa web-sweep
- `functions/api`: accounts admin-ads-shots admin-dist-shots admin-guard admin-prefs admin-rollup ads-revenue ai-pool analytics api-security capacity classroom clip-bulk d1-cap dist-roles distribution drive-repair drive hit-retry img-api jobs keys live-check notices post-deploy-check pr-check quota report root-lang schema-lock sessions-scan-gate social-auto social-meta-oauth social-meta social-mgr social-proxy static-routes sync-ctx sync-pack user-mgmt users-bulk ux1-rollout yt-manual
- `scripts`: authority-pages axe blog-images bot-push-key brand-check ci-triage codemap-budget explain-check explain-let frame-consistency i18n-english i18n-single journey-e2e lesson-content links-js mobile-polish mqa-parity-self mqa-parity pack-gloss pages-skip protection samples-ui sentence-asr sw-cache-fixed tools-pages ux1 word-ipa world-scorecard
- `brand/stitch`: landing-v3 layout-guards stitch-coverage stitch-diff stitch-quality-qc stitch-refs-qc stitch-render stitch-screens stitch-web-diff
- `content/video`: characters-gate library studio video-layout video-pron video-templates video
- `scripts/ci`: audio-coverage ci-hog commit-regen cron-watch gh-api no-pr-branch-push qa-fill
- `scripts/lib`: ci-header-scope font-audit lastmod qa-classify syntax-check theme-static word-depth
- `scripts/video`: capsplit motion-core motion overlay-gates put-session shorts-scale tpl1b-pipeline
- `extension`: ext-orphan ext-popup i18n-pack infra-check word-audio-s2
- `scripts/quality`: exit-sweep landing-cls nav-sweep qa-bot qs-fix-queue
- `extension/app`: ext-bundles ext-dict-i18n ext-sync i18n-leak
- `web`: brand-logo-stitch headers seo-twin size-budget
- `content/blog`: blog-captions cpm-plan gsc
- `infra`: ci-filler no-prod-hosts size-guard
- `brand`: brand-shots png-rgba
- `content/framework`: grammar-inventory lkf
- `scripts/cdn`: cdn-r2 klocal
- `scripts/content-qa`: content-qa sense-check
- `scripts/lexicon`: dict-perf lexicon-expand
- `scripts/ops`: ledger-merge rollback
- `scripts/top1`: logic-invariants top1-score
- `web/app`: bundle-names shell-lazy
- `web/css`: card-actions wordcard-ui
- `.github/workflows`: required-gate
- `content/lexicon`: vocab-img-strict
- `content/situations`: situations
- `mobile/ios`: ai-local
- `scripts/audio`: tts-sites
- `scripts/cine`: whisper-det
- `scripts/dict`: dict-stage
- `scripts/explain`: explain
- `scripts/factory`: content-factory
- `scripts/free-tier`: free-tier
- `scripts/jobs`: jobs-check
- `scripts/lesson`: lesson
- `scripts/lipsync`: lipsync-cross
- `scripts/ota`: ota
- `scripts/pron`: pron-gop
- `scripts/scriptbank`: script-bank
- `scripts/teach`: characters-shots
- `scripts/test`: suite-guard
- `scripts/vocab-img`: vocab-img
- `web/blog`: quiz
- `web/data`: lesson-embed-e2e
- `web/icons`: ext-e2e
- `workers/cronkick`: cron-kick
- `workers/dict`: dict-pages
- `workers/mail`: mail-prefs

## Mô-đun JS chính (3/1134, ngoài god nodes; phần còn lại trong json) – tên: export →nạp/import ←số nơi dùng
- `scripts/lexicon/` ipa.mjs: ALLOWED,badChars,ukStyle,ukStyleBad,fixBroken… →- ←12 (build-lexicon.mjs,gate.mjs,gen-wordlist.mjs)
- `scripts/lib/` ai-pool.mjs: modelInfo,familyOf,pickModels,judgeKey,TASKS… →lexai.js,cf-pool.mjs,key-pool.mjs ←12 (lib.mjs,job.mjs,lib.mjs) · is-main.mjs: isMain →- ←2 (creds.mjs,cutover.mjs)
