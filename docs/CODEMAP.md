# CODEMAP – bản đồ mã nguồn (SINH TỰ ĐỘNG, đừng sửa tay)

> TL;DR: Đọc file này ĐẦU PHIÊN thay vì khám phá repo; tra chính xác bằng `docs/codemap.json` (`node -e` / jq); chỉ grep/mở file mà bản đồ trỏ tới. Sinh bởi `node scripts/codemap.mjs` (workflow codemap.yml). Luật: TOKEN-RULES.md §1.
> Đọc khi: ĐẦU MỖI PHIÊN, trước khi tìm code.

Tra json: `node -e "const g=require('./docs/codemap.json');console.log(g.nodes['web/js/app.js'])"` · `g.routes` · `g.workflows` · `g.tests` · `g.god`. Mỗi node: exports, imports, importedBy.

## Khu vực
- `web/` (3059 file): App (SPA) + landing: shell web/app/index.html nạp web/js/*.js bằng <script> (toàn cục App/UI/Chars, KHÔNG import); lazy bundle: BUNDLES trong web/js/bundles.js (nạp lười); css web/css; trang tĩnh sinh bởi scripts/build-*.mjs → dist
- `extension/` (2305 file): Add-on Chrome/Edge (background/content/popup/newtab). extension/app là BẢN SAO dựng từ web/ (scripts/build-extension.sh) – KHÔNG sửa tay, bị bỏ khỏi map
- `functions/` (112 file): Cloudflare Pages Functions = backend /api/* (file _*.js là helper dùng chung)
- `workers/` (19 file): Cloudflare Workers riêng: audio, dict, gemini (AI), mail, media; workers/lib dùng chung
- `scripts/` (1566 file): Công cụ build/gen/ops (mjs); scripts/test = chuỗi `npm test`; thư mục con theo mảng (video, lexicon, dict, ops, jobs, ci, social, seo…)
- `.github/workflows/` (237 file): CI/CD + việc nền theo lịch (xem mục Workflows)
- `infra/` (15 file): Sổ hạ tầng JSON: resources, jobs (nguồn của docs/JOBS.md), media-repos, schema.lock
- `brand/` (1913 file): tokens.json (màu), logo, stitch/ (ref + DTCG), library/ (kho cảnh/clip video)
- `content/` (6017 file): Nội dung nguồn: blog, authority, dict, confidence, explain, brand (dữ liệu lớn – bỏ khỏi map)
- `mobile/` (216 file): Capacitor iOS/Android (ios/ android/ bỏ khỏi map)
- `store/` (47 file): Hồ sơ listing Chrome/Edge/Apple/Play
- `docs/` (259 file): Luật + tài liệu chủ đề (docs/README.md → INDEX.md); lịch sử ở docs/archive
- API `/api/*` (50): account,admin,admin-accounts,admin-clips,admin-prefs,admin-shared,admin-shorts,ads-report,ads-reward,ai,aiearn,backlinks,capacity,class,community,config,contact,cron-kick,dictlookup,distribution,drive,duel,funnel-digest,growth…
- Thư mục con (số file; js/=web/js, s/=scripts): js/i18n:745 s/test:662 s/video:128 s/stitch:92 s/lib:73 js/vimg:64 s/cine:54 s/ci:53 js/st:42 s/lexicon:39 s/vocab-img:33 s/native:30 js/notes:27 js/readtest:21 s/pron:19 s/target:17 s/lesson:16 js/get-app:15 js/irv:15 js/lib:15 js/toeic:15 s/ops:14 js/call:14 s/word-audio:13 s/content-qa:12 s/lipsync:12

## Sửa ở đâu (tác vụ → file)
- **Chuỗi i18n (15 ngôn ngữ)**: Khóa = câu tiếng Việt trong t('…'). Bản dịch web/js/i18n/<lang>.js + web/js/i18n/en/*.js (nhóm theo tính năng); add-on extension/_locales/<lang>/messages.json. Tool: scripts/i18n-missing.mjs, i18n-qa.mjs, gen-i18n.mjs, i18n-sync.sh. Luật: docs/I18N-PIPELINE.md
- **Design token / màu**: brand/tokens.json → scripts/build-tokens.mjs → :root trong web/css/style.css (+ scripts/lib/site-layout.mjs). Stitch: brand/stitch/tokens.dtcg.json, scripts/build-stitch-css.mjs → web/css/st-*.css. Luật: docs/DESIGN-SYSTEM.md, docs/BRAND-RULES.md
- **Giáo viên Ama/Carlos**: Registry web/teach/characters.json (+ ama/ carlos/); API Chars.* ở web/js/characters.js; lời/khẩu hình web/js/lesson/teacher.js, web/js/st/v2/teacher-call.js; tool scripts/teach, scripts/teacher; luật docs/CHARACTERS.md
- **Luồng bài học**: web/js/lesson/{engine,ui,stories,gold,teacher}.js; màn st: web/js/st/lesson.js, web/js/st/v2/lesson-question.js, lesson-complete.js; lộ trình web/js/path.js, plan.js, next-step.js; build scripts/lesson/; docs/LESSON-ENGINE.md, docs/LEARNING-PATH.md
- **Từ điển / từ vựng**: web/js/dictionary.js (route #/dict), lexis.js, lex.js, wordcard.js, vocab-img.js; dữ liệu sinh: scripts/build-lexicon.mjs, scripts/lexicon/, scripts/dict/, workers/dict; docs/LEXICON.md
- **Cổng Stitch v2**: scripts/stitch-v2-convert.mjs (HTML Stitch → module) → web/js/st/v2/*.js + web/css/st-v2-*.css; ref brand/stitch/v2; docs/STITCH-V2-PORT.md; CI so ảnh (workflow nav-render, dist-ui)
- **Pipeline video**: scripts/video/{render,auto,synth,motion}.mjs + remotion/ + motion/; cảnh cine scripts/cine; footage scripts/footage; kho brand/library/cine; docs/VIDEO.md, docs/VIDEO-MOTION.md, docs/CREDIT-RULES.md (tiêu credit: đọc trước); workflow cine-render, footage-*
- **Route / màn hình app**: routes.<tên> = … rải ở web/js/*.js (bảng Routes dưới); alias + route→gói ở web/js/app.js (ROUTE_ALIAS, ROUTE_BUNDLE), đăng ký gói ở web/js/bundles.js (BUNDLES); thêm script toàn cục → web/app/index.html
- **API backend**: functions/api/<tên>.js = /api/<tên>; helper functions/api/_*.js (quota, abuse…)
- **Add-on**: extension/{manifest.json,background.js,content.js,popup.js,newtab.js}; build scripts/build-extension.sh (web → extension/app)
- **Blog / SEO**: content/blog + scripts/blog-pipeline.mjs, build-blog.mjs, build-seo.mjs; workflow blog-daily; docs/BLOG-RUNBOOK.md
- **CI / việc nền**: infra/jobs.json → docs/JOBS.md (node scripts/jobs/gen.mjs); lease scripts/jobs/lease.mjs; chuỗi test = scripts/test/suite.txt (npm test → run-suite.mjs); scripts/prepush.sh; docs/CI-RUNNERS.md

## God nodes (15 module được import/nạp nhiều nhất; không tính test)
1. `web/js/app.js` ←104 · App,AI,LK_GETAPP_T,accountMenu…
2. `web/js/st/common.js` ←54 · ST
3. `functions/api/_body.js` ←39 · BodyError,readBytes,readText,readJSON…
4. `functions/api/sync.js` ←39 · SHRINK_MIN,cors,json,claims…
5. `scripts/lexicon/lib.mjs` ←28 · ROOT,rd,wr,PRIORITY…
6. `scripts/video/library.mjs` ←25 · ROOT,LIB,CAND,MANIFEST…
7. `functions/api/_d1guard.js` ←21 · D1_LIMITS,GUARD_PCT,WARN_PCTS,GQL_TIMEOUT_MS…
8. `web/js/sync.js` ←21 · Sync,VBBridge
9. `web/js/data.js` ←20 · script
10. `functions/api/_quota.js` ←19 · DEFAULTS,PROVIDERS,BREAKER,STRIKE…
11. `functions/api/admin.js` ←19 · adminAudit,adminCors,ghApi,_resetAdminMem…
12. `scripts/lib/is-main.mjs` ←17 · isMain
13. `scripts/lexicon/expand/lib.mjs` ←16 · LANGS,QUEUE,TOPIC_CHOICES,btMatch…
14. `scripts/lib/site-layout.mjs` ←16 · EXT_STORE,EXT_JS,GETAPP_JS,LSW_CSS…
15. `functions/api/_schema.js` ←15 · once,_resetSchema

## Routes `#/…` → file xử lý (76)
- `app.js`: contact deck home library topic welcome
- `call.js`: call
- `cambridge.js`: cambridge
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
- `hubs.js`: me skill skills tests
- `ideas.js`: ideas
- `league.js`: league
- `lesson/ui.js`: lesson
- `letters.js`: letters
- `listening.js`: dictation listen listen-test listening
- `mediate.js`: mediate
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
- `stats-page.js`: stats
- `study.js`: practice review
- `task1.js`: task1
- `toefl.js`: toefl toefl-p
- `toeic.js`: toeic toeic-r toeic-sw toeic-test
- `usage.js`: usage
- `ux1-me.js`: me
- `ux1.js`: train
- `verbs.js`: verb
- `vocab-hub.js`: vocab
- `watch.js`: watch
- `write.js`: write

## Workflows (237) theo trigger: tên: việc kiểm/làm
- [cron,manual] ads-revenue-hourly: Doanh… · ads-revenue: Doanh… · ai-keys-sync: Đồng bộ… · blog-daily: Việc… · blog-publish: Tự đăng… · capacity-watch: Hạn mức… · cdn-mirror: … · cf-pool-probe: Dò kho… · ci-autopilot: … · ci-filler: 02/11… · ci-queue-report: Đo hàng… · ci-triage: Tự phân… · code-bundle: Sao lưu… · contrast: Kiểm độ… · d1-backup: Sao lưu… · d1-usage-watch: D1 trong… · d1b-migrate: Sao các… · dict-stage: Tự mở… · drive-repair: Chép bù… · drive-tidy: Tự dọn… · explain: Lời giải… · footage-archive: Lưu kho… · footage-verify: Kiểm kho… · free-tier-guard: 02/11… · funnel-digest: Tóm tắt… · health-board: Bảng sức… · health: Rà soát… · lexicon-expand: Mở rộng… · lexicon-i18n: Nghĩa 13… · native-qa-nightly: Kiểm đủ… · nav-render: Chuyển… · news-auto: A->Z… · perf-flake-report: Báo cáo… · pr-check · preview-site: Site… · quality-sweep: Quét lỗi… · required-gate: MỘT… · script-bank: Kho kịch… · sentence-audio-asr: Cổng ASR… · seo-gsc: Vòng dữ… · social-auto: … · social-coverage: Máy gác… · social-metrics: Số liệu… · storage-watch: Giám sát… · store-rollout: Tăng dần… · upgrade-audit: Kiểm… · video-auto: Video tự… · video-junk: Dọn… · vocab-img-free: Ảnh từ… · vocab-img-scene: Ảnh cho… · vocab-img: Ảnh minh… · web-merge-daily: 06/11… · word-audio: Giọng… · youtube-manual: Manual… · youtube-upload: Upload…
- [push:main,pr,manual] admin-ads-ui: Quản trị… · admin-drive-ui: Quản trị… · admin-guard: Gác bố… · audio-play: Phát… · authority-pages: Uy tín /… · call-qa: QA cuộc… · call-rt: Call… · characters-shots: Kiểm… · dict-pages: Trang từ… · figure-layout: Cổng bố… · frame-consistency: Một… · grammar-lazy-e2e: Trình… · icon-flash: Chữ… · journey-matrix: Ma trận… · lcard-shots: Ảnh… · lesson-complete: Màn… · lesson-embed: Video… · native-android: App… · native-ios: App iOS… · native-visual: Native ↔… · phrasebook-shots: Ảnh thật… · play-rhythm-ui: Nhịp… · push-fcm: Báo đẩy… · review-taps-stability: Chứng… · review-taps: Màn Ôn… · scroll-perf: Cuộn… · shell-responsive: Vỏ app… · size-guard: Cổng… · social-channel-kit · stitch-diff: Bám mẫu… · stitch-quality-qc: QC mẫu… · stitch-refs-qc: QC kho… · stitch-web: Trang… · storage-audit: Lưu trữ… · story-stage · teach-video: Teach2D… · teacher-bubble · teacher-native: Cổng… · teacher-quality: Cổng… · teacher-rig · theme-qa: Nút giao… · tools-pages: Công cụ… · topbar-lang: Một nút… · ux-cards: Ảnh… · video-e2e: … · video-motion: Stitch… · web-sweep: Cổng… · word-arrange-e2e: Xếp câu… · word-audio-tl: Giọng từ…
- [manual] apple-signing: Bảo trì… · asc-release: Nộp bản… · bg-gates: Cổng tự… · bg-v4: sharper… · chroma-batch: Tách nền… · chroma-test: Thử tách… · confidence-shots: Ảnh… · csp-probe: Dò nguồn… · cws-media: Media… · cws-publish: Đăng bản… · embed-publish: Video… · exam-es-build: Dựng… · explain-shots: Ảnh… · footage-reel: owner… · gate-retest: … · green-prep: Chuẩn bị… · i18n-native-score: O5… · ios-testflight: Ký + tải… · library-build: Kho dựng… · library-ingest: Nhập… · matte-pro · new-ui-qa: Chạy tay… · news-voice · ota-rollback: Quay bản… · perf-baseline: Đo tốc… · pron-distill · pron-train · review-shots: Ảnh… · shorts-migrate: One-time… · shorts-rebuild: … · stitch-fonts: Dựng lại… · store-submit: NỘP… · tts-ab: Phép thử… · ux-public: UX audit… · video-pilot5: ONE… · video-pilot6: ONE… · video-pilot7: ONE… · video-pilot8: ONE… · video-sample: Dựng… · video-series: render… · video-stress: Dựng thử… · video-templates · video-templates9: ONE… · video-tpl1b-samples: render a… · video-tpl1b: gold… · video: Dựng 1… · vocab-img-publish: Đăng lại… · word-audio-lab: Thí…
- [push:main,manual] admin-video-ui: Quản trị… · android: Tự build… · blog-images: Ảnh… · ci: Kiểm thử… · clips-perf: Ngân… · codemap: Bản đồ… · dict-perf: Hiệu… · dist-ui: (Ảnh… · ext-e2e: Kiểm thử… · gen-sync: Bản sinh… · ios-e2e: Kiểm thử… · ios: Tự build… · kokoro-model: Chép mô… · native-auth-e2e: Kiểm… · native-content: Nội dung… · prod-release: Mỗi lần… · seo-indexnow: Báo… · store-shots: Bộ ảnh +… · store-video-viral: Video… · store-video: Video… · words-edge-cache: HOTFIX…
- [push:main,cron,manual] audio: Tạo… · audit-all: Audit… · capacity-sim: Mô phỏng… · content-evidence: Bằng… · content-protect: Bảo vệ… · i18n-leak: Rà soát… · i18n · lighthouse: Đo tốc… · pages-deploy: Cổng… · screens: Chụp ảnh… · sent-packs · word-packs: Gói… · wordlists: Kho từ… · words-r2-sync: Trang từ… · world-scorecard: Bảng…
- [push,manual] app-lcp: Đo… · ios-shots: Ảnh App… · native-release: Bản thử… · perf-profile: Hồ sơ… · say-native: Say it… · teach-build: Dựng bộ… · ux-measure: Đo UX… · ux-shots: Ảnh… · video-shard-equiv: … · words-r2-measure: Đo ngân…
- [pr,manual] audio-loudness · content-judge: Chấm 2… · learn-flow-stress: Soi chập… · lexicon-gpl-probe: ĐO THỬ… · scene-fit: Thầy cô… · target-content: Sinh bộ… · workflow-yaml
- [pr,cron,manual] ai-golden: Cổng… · content-factory: Xưởng… · main-red-sweep: Máy gác… · report-shots: Ảnh chụp… · store-reviews: Đánh giá…
- [push:main,pr,cron,manual] ads-demo: Quảng… · content-qa: Cổng QA… · font-audit: Rà font… · mobile-qa: Soát web… · visual-qa: Soát…
- [cron,manual,after-wf] drive-shorts: Sao lưu… · release-archive: Giữ 3… · video-web: Bản WEB…
- [?] merge-queue: Merge… · wip-guard: 06/11…
- [call] store-build-android: Workflow… · store-build-ios: Workflow…
- [manual,call] cine-render: Dựng… · pron-eval
- [pr] budget-comment: … · gate-impact: …
- [push] brand-build: Dựng tài… · hair-try: Thử đổi…
- [after-wf] qa-backlog: Mỗi lượt…
- [manual,after-wf] pages: Kiểm CDN…
- [manual,after-wf,call] post-deploy-check: Soát bản…
- [pr,call] npm-test: Bộ kiểm…
- [pr,cron,manual,after-wf] report-autofix: Báo lỗi…
- [push:main,cron,manual,after-wf] pr-unconflict: Tự gỡ…
- [push:main,pr] samples-visual: Cổng họ…
- [push:main,pr,manual,after-wf,call] qa-bot: QA bot…
- [push:main,pr,manual,call] journey-e2e: Hành…

## Test (565) → vùng phủ (file đích chi tiết: json `tests`)
- `web/js`: account-delete account-flow account-ui admin-flow admin-gate admin-metrics admin-plat admin-reports-ui admin-series admin-share admin-tabs admin-ui ads-admin ads-cls ads-revenue ads ai-local ai-shim ai-task anki audio-heal audio-play audio-voice big-data bundles-manifest call-e2e call-engine call-rt cambridge choice-kit client-security clips-perf comment-code confidence core-day cpack criteria datamuse-resilience dict-entry-layout dict-hub dict-sent-lang dictlookup drive-ui es-practice exam-clock exit-guard ext-bundles ext-selection facade-perf feel firestore-rules focus-early focus-targets gate-relevance get-app grammar-hub haptics home-logic i18n-pack inline-box install-sheet ios-audio-unlock ipa-accent js-budget klocal landing-routing late-insert lazyfix league learn-flow lesson-card lesson-drag lesson-lang lex lip-clock lipsync-lesson lipsync mediation mic-exclusive mistake-variant mobile-guards mobile-qa native-auth native-m2-vectors next-step notify-ux outcomes p0-top1 path3 pr-scope-carry probe-cta pron-coach pron-hub pron-shadow qengine-flag quick-ui qwk readtest-dedupe reminders report-ui required-gate retention say-text scroll-boot sel-translate sentence-punct settings-subpages share-link shell-lazy size-budget social-stats-ui social-ui speak-ipa speak-split speak st-web-i18n st2-href stories story-stage streak-flame streak-ui sync-cross-client sync-drive sync-ext-drive target-lang teacher-loop teacher-native teacher-rig today-debt today-mobile-actions tutor unit usage verbs video-web vocab-hub watch welcome-flow word-arrange-e2e
- `(không rõ)`: a11y admin-drive-shots admin-video-shots ads-demo-android ads-demo app-lcp-probe call-rt-e2e clutter confidence-shots content-check contrast crawl d1-scan dispatch-guard docs-budget e2e explain-shots ffmpeg-setup-policy figure-layout final-qc floor-guard icon-flash ios-audio-e2e ios-driver-watchdog irregular-ui lcard-shots lesson-complete-geometry lip-shots listing-check live-csp-safe live-lesson-lang mobile-nav mobile-qa-keyboard native-facade native-parity nav-render new-ui-sheets no-url-pathname perf-baseline perf-calibrate perf-median phrasebook-shots profile-route pron-read pwa-installable qa-bot-diff rate-prompt read-highlight review-done review-lookup review-modes-e2e review-modes-ui review-modes review-shots review-taps round-clip route-race route-vitals run-suite-annotate run-suite samples-visual screens seo-pages seo-sitemap seo-words-shots serve-web shell-responsive side-menu size-guard-pr smoke storage-audit suite-shards teacher-native-shots teacher-rig-browser theme-default toeic-read-e2e tools-ui topbar-lang tsc-check ux-cards ux-guard-lib ux-guard ux-public ux-shots ux-sweep ux1-guard video-junk video-web-e2e visual-qa web-sweep welcome-journey workflow-call-perms workflow-yaml
- `functions/api`: accounts admin-ads-shots admin-dist-shots admin-gh admin-guard admin-prefs admin-rollup ai-pool aiearn analytics api-security body-limit capacity classroom clip-bulk community-api d1-cap dist-channels dist-roles dist-roundtrips distribution drive-repair drive-state drive funnel-digest funnel hit-retry img-api importdeck install-links jobs keys league-xp lexai-oidc live-check mail-digest notices play-duel post-deploy-check pr-check quota readable referral report retention-admin root-lang schema-lock sessions-scan-gate share-measure social-admin social-auto social-coverage social-first-comment social-ledger social-meta-oauth social-meta social-mgr social-preview social-proxy static-routes sync-ctx sync-pack user-mgmt users-bulk ux1-rollout voice-source yt-manual yt-stats-op
- `scripts`: authority-pages axe blog-images blog-lang-gates blog-thumbs blog-youtube bot-push-key brand-check build-hash cf-words-cache codemap-budget explain-check explain-let ext-version fmt-stable frame-consistency gen-guard i18n-english i18n-single journey-e2e landing-fonts lesson-content links-js mobile-polish mobile-www-slim mqa-parity-self mqa-parity native-strings-locked origin-fetch pack-gloss pages-lag pages-skip pr-unconflict protection quote-english regen-conflicts samples-ui scan-roots self-fonts sentence-asr sw-cache-fixed teacher-mood theme-switch token-drift tools-pages word-ipa world-scorecard
- `scripts/ci`: apt-install audio-coverage audio-pr-branch audio-shard-equiv budget-comment busy-gate ci-guards ci-hog ci-policy ci-portable ci-queue-gate ci-shards-busy ci-triage cron-watch flake-tracker gate-impact gate-retest gh-api health-board heavy-main no-pr-branch-push npm-retry-policy perf-flake prwatch push-main qa-fill queue-report red-report required-gate-stale retry5xx sparse-imports stitch-shard workflow-cd-paths zombie-pages
- `scripts/lib`: csp-probe font-audit gh-tree i18n-switch is-main-guard json-dupkeys lastmod qa-classify rig-live syntax-check theme-static word-depth
- `web`: admin-analytics-mobile admin-plat-shots adsense-hygiene brand-logo-stitch ci-header-scope deep-links headers seo-twin site-footer skills-hub sw-reminder-day sw-storage
- `web/cpack`: es-exam es-native-bundle gen-pr-clean grammar-lazy-e2e i18n-native-score l1-notes lesson-why phrasebook play-blitz play-rhythm-run play-rhythm pron-pairs
- `brand/stitch`: landing-v3 layout-guards stitch-coverage stitch-diff stitch-quality-qc stitch-refs-qc stitch-render stitch-screens stitch-theme-lint stitch-today-contrast stitch-web-diff
- `content/video`: characters-gate embed-publish library studio teach2d-l1 video-layout video-pron video-templates video
- `scripts/quality`: exit-sweep journey-matrix landing-cls nav-sweep new-ui-qa qa-bot qs-fix-queue scroll-perf today-fold
- `scripts/video`: capsplit motion-core motion native-qa-scope overlay-gates put-session shorts-scale teach2d-rig tpl1b-pipeline
- `web/css`: admin-map-colors card-actions cls-chrome css-lazy css-notes play-rhythm-shots sr-only wordcard-ui
- `extension`: addon-listings ext-imgdata ext-newtab-quiz ext-orphan ext-popup infra-check word-audio-s2
- `scripts/native`: asc-signing ios-sign-patch native-compat native-ios-paths native-one-source native-pick-sim native-visual
- `extension/app`: ext-dict-i18n ext-sync i18n-leak main-red-sweep shell-size teacher-bubble
- `infra`: ci-filler dns-security no-prod-hosts size-guard
- `scripts/vocab-img`: vocab-img-free-sheet vocab-img-judge-budget vocab-img-worth vocab-img
- `brand`: brand-shots png-rgba ux1
- `content/blog`: blog-captions cpm-plan gsc
- `mobile/android`: android-ime android-xml-comments token-contrast
- `.github/workflows`: ci-autopilot heavy-rerun
- `content/dict`: dict-add dict-enrich
- `content/framework`: grammar-inventory lkf
- `content/seo`: home-words words-r2-fn
- `scripts/audio`: audio-loudness tts-sites
- `scripts/cine`: publish-meta whisper-det
- `scripts/content-qa`: content-qa sense-check
- `scripts/lexicon`: dict-perf lexicon-expand
- `scripts/ops`: ledger-merge rollback
- `scripts/social`: yt-fill yt-stats
- `scripts/store`: store-reviews store-submit
- `scripts/target`: es-conjugate es-path
- `scripts/teach`: characters-shots teacher-quality
- `scripts/top1`: logic-invariants top1-score
- `web/app`: bundle-names v2pre-ring
- `content`: samples-seo-parity
- `content/legal`: legal-i18n
- `content/lesson`: learnability
- `content/lexicon`: vocab-img-strict
- `content/protection`: commit-regen
- `content/qa`: vimg-watch
- `content/situations`: situations
- `content/target`: es-pron
- `mobile`: crashlytics
- `scripts/ai-golden`: ai-chain
- `scripts/cdn`: cdn-r2
- `scripts/dict`: dict-stage
- `scripts/explain`: explain
- `scripts/factory`: content-factory
- `scripts/feedback`: feedback-eval
- `scripts/free-tier`: free-tier
- `scripts/grammar`: grammar-lazy
- `scripts/jobs`: jobs-check
- `scripts/lesson`: lesson
- `scripts/lipsync`: lipsync-cross
- `scripts/ota`: ota
- `scripts/pron`: pron-gop
- `scripts/scriptbank`: script-bank
- `scripts/sfx`: sfx-loudness
- `scripts/test`: suite-guard
- `web/blog`: quiz
- `web/data`: lesson-embed-e2e
- `web/go`: go-landing
- `web/i18n`: bot-test-gate
- `web/icons`: ext-e2e
- `web/img`: toeic-photos
- `workers/cronkick`: cron-kick
- `workers/dict`: dict-pages
- `workers/mail`: mail-prefs
- `workers/push`: fcm-push

## Mô-đun JS chính (3/2493, ngoài god nodes; phần còn lại trong json) – tên: export →nạp/import ←số nơi dùng
- `scripts/lib/` ai-pool.mjs: modelInfo,familyOf,pickModels,judgeKey,TASKS… →lexai.js,cf-pool.mjs,key-pool.mjs ←15 (judge.mjs,lib.mjs,job.mjs) · i18n-pack.mjs: ROOT,SRC,OUT,LANGS,LAZY… →- ←14 (preview-resolve.mjs,regen-generated.mjs,build.mjs)
- `web/js/` bundles.js →calls-lot3.js,calls-lot4.js,t1.js ←5 (shards.mjs,bundles.mjs,fmt-registry.mjs)
