# CODEMAP – bản đồ mã nguồn (SINH TỰ ĐỘNG, đừng sửa tay)

> TL;DR: Đọc file này ĐẦU PHIÊN thay vì khám phá repo; tra chính xác bằng `docs/codemap.json` (`node -e` / jq); chỉ grep/mở file mà bản đồ trỏ tới. Sinh bởi `node scripts/codemap.mjs` (workflow codemap.yml). Luật: TOKEN-RULES.md §1.
> Đọc khi: ĐẦU MỖI PHIÊN, trước khi tìm code.

Tra json: `node -e "const g=require('./docs/codemap.json');console.log(g.nodes['web/js/app.js'])"` · `g.routes` · `g.workflows` · `g.tests` · `g.god`. Mỗi node: exports, imports, importedBy.

## Khu vực
- `web/` (2864 file): App (SPA) + landing: shell web/app/index.html nạp web/js/*.js bằng <script> (toàn cục App/UI/Chars, KHÔNG import); lazy bundle: BUNDLES trong web/js/app.js; css web/css; trang tĩnh sinh bởi scripts/build-*.mjs → dist
- `extension/` (2165 file): Add-on Chrome/Edge (background/content/popup/newtab). extension/app là BẢN SAO dựng từ web/ (scripts/build-extension.sh) – KHÔNG sửa tay, bị bỏ khỏi map
- `functions/` (93 file): Cloudflare Pages Functions = backend /api/* (file _*.js là helper dùng chung)
- `workers/` (19 file): Cloudflare Workers riêng: audio, dict, gemini (AI), mail, media; workers/lib dùng chung
- `scripts/` (1327 file): Công cụ build/gen/ops (mjs); scripts/test = chuỗi `npm test`; thư mục con theo mảng (video, lexicon, dict, ops, jobs, ci, social, seo…)
- `.github/workflows/` (202 file): CI/CD + việc nền theo lịch (xem mục Workflows)
- `infra/` (10 file): Sổ hạ tầng JSON: resources, jobs (nguồn của docs/JOBS.md), media-repos, schema.lock
- `brand/` (1755 file): tokens.json (màu), logo, stitch/ (ref + DTCG), library/ (kho cảnh/clip video)
- `content/` (3889 file): Nội dung nguồn: blog, authority, dict, confidence, explain, brand (dữ liệu lớn – bỏ khỏi map)
- `mobile/` (216 file): Capacitor iOS/Android (ios/ android/ bỏ khỏi map)
- `store/` (44 file): Hồ sơ listing Chrome/Edge/Apple/Play
- `docs/` (231 file): Luật + tài liệu chủ đề (docs/README.md → INDEX.md); lịch sử ở docs/archive
- API `/api/*` (43): account,admin,admin-accounts,admin-clips,admin-prefs,admin-shared,admin-shorts,ads-report,ads-reward,ai,aiearn,backlinks,capacity,class,community,config,contact,cron-kick,dictlookup,distribution,drive,duel,growth,handoff…
- Thư mục con (số file; js/=web/js, s/=scripts): js/i18n:728 s/test:538 s/video:116 s/stitch:70 js/vimg:64 s/lib:60 s/cine:51 s/lexicon:37 js/st:37 s/ci:33 s/vocab-img:33 s/native:30 js/notes:27 js/grammar:26 js/readtest:22 js/lib:20 s/pron:19 s/target:17 s/lesson:15 js/get-app:15 js/toeic:15 s/word-audio:13 s/lipsync:12 s/ops:12

## Sửa ở đâu (tác vụ → file)
- **Chuỗi i18n (15 ngôn ngữ)**: Khóa = câu tiếng Việt trong t('…'). Bản dịch web/js/i18n/<lang>.js + web/js/i18n/en/*.js (nhóm theo tính năng); add-on extension/_locales/<lang>/messages.json. Tool: scripts/i18n-missing.mjs, i18n-qa.mjs, gen-i18n.mjs, i18n-sync.sh. Luật: docs/I18N-PIPELINE.md
- **Design token / màu**: brand/tokens.json → scripts/build-tokens.mjs → :root trong web/css/style.css (+ scripts/lib/site-layout.mjs). Stitch: brand/stitch/tokens.dtcg.json, scripts/build-stitch-css.mjs → web/css/st-*.css. Luật: docs/DESIGN-SYSTEM.md, docs/BRAND-RULES.md
- **Giáo viên Ama/Carlos**: Registry web/teach/characters.json (+ ama/ carlos/); API Chars.* ở web/js/characters.js; lời/khẩu hình web/js/lesson/teacher.js, web/js/st/v2/teacher-call.js; tool scripts/teach, scripts/teacher; luật docs/CHARACTERS.md
- **Luồng bài học**: web/js/lesson/{engine,ui,stories,gold,teacher}.js; màn st: web/js/st/lesson.js, web/js/st/v2/lesson-question.js, lesson-complete.js; lộ trình web/js/path.js, plan.js, next-step.js; build scripts/lesson/; docs/LESSON-ENGINE.md, docs/LEARNING-PATH.md
- **Từ điển / từ vựng**: web/js/dictionary.js (route #/dict), lexis.js, lex.js, wordcard.js, vocab-img.js; dữ liệu sinh: scripts/build-lexicon.mjs, scripts/lexicon/, scripts/dict/, workers/dict; docs/LEXICON.md
- **Cổng Stitch v2**: scripts/stitch-v2-convert.mjs (HTML Stitch → module) → web/js/st/v2/*.js + web/css/st-v2-*.css; ref brand/stitch/v2; docs/STITCH-V2-PORT.md; CI so ảnh (workflow nav-render, dist-ui)
- **Pipeline video**: scripts/video/{render,auto,synth,motion}.mjs + remotion/ + motion/; cảnh cine scripts/cine; footage scripts/footage; kho brand/library/cine; docs/VIDEO.md, docs/VIDEO-MOTION.md, docs/CREDIT-RULES.md (tiêu credit: đọc trước); workflow cine-render, footage-*
- **Route / màn hình app**: routes.<tên> = … rải ở web/js/*.js (bảng Routes dưới); alias + lazy bundle ở web/js/app.js (ROUTE_ALIAS, ROUTE_BUNDLE, BUNDLES); thêm script toàn cục → web/app/index.html
- **API backend**: functions/api/<tên>.js = /api/<tên>; helper functions/api/_*.js (quota, abuse…)
- **Add-on**: extension/{manifest.json,background.js,content.js,popup.js,newtab.js}; build scripts/build-extension.sh (web → extension/app)
- **Blog / SEO**: content/blog + scripts/blog-pipeline.mjs, build-blog.mjs, build-seo.mjs; workflow blog-daily; docs/BLOG-RUNBOOK.md
- **CI / việc nền**: infra/jobs.json → docs/JOBS.md (node scripts/jobs/gen.mjs); lease scripts/jobs/lease.mjs; chuỗi test = scripts/test/suite.txt (npm test → run-suite.mjs); scripts/prepush.sh; docs/CI-RUNNERS.md

## God nodes (15 module được import/nạp nhiều nhất; không tính test)
1. `web/js/app.js` ←103 · App,LK_GETAPP_T,accountMenu,retArm…
2. `web/js/st/common.js` ←49 · ST
3. `functions/api/sync.js` ←34 · cors,json,claims,verify…
4. `scripts/lexicon/lib.mjs` ←26 · ROOT,rd,wr,PRIORITY…
5. `scripts/video/library.mjs` ←21 · ROOT,LIB,CAND,MANIFEST…
6. `web/js/sync.js` ←21 · Sync,VBBridge
7. `functions/api/_d1guard.js` ←20 · D1_LIMITS,GUARD_PCT,WARN_PCTS,GQL_TIMEOUT_MS…
8. `web/js/ai.js` ←20 · AI
9. `functions/api/admin.js` ←19 · adminAudit,adminCors,ghApi,_resetAdminMem…
10. `web/js/data.js` ←19 · script
11. `functions/api/_quota.js` ←18 · DEFAULTS,PROVIDERS,BREAKER,STRIKE…
12. `functions/api/_schema.js` ←15 · once,_resetSchema
13. `scripts/lexicon/expand/lib.mjs` ←15 · LANGS,QUEUE,TOPIC_CHOICES,btMatch…
14. `scripts/lib/ai-pool.mjs` ←15 · modelInfo,familyOf,pickModels,judgeKey…
15. `scripts/lib/blog-content.mjs` ←14 · ROOT,CATEGORIES,config,parse…

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

## Workflows (202) theo trigger: tên: việc kiểm/làm
- [cron,manual] ads-revenue-hourly: Doanh thu THẬT · ads-revenue: Doanh thu… · blog-daily: Việc blog tự… · blog-publish: Tự đăng blog… · capacity-watch: Hạn mức… · cdn-mirror: media.lexkite.… · cf-pool-probe: Dò kho… · ci-autopilot: ci-autopilot… · ci-filler: 02/11: chạm… · ci-queue-report: Đo hàng chờ… · ci-triage: Tự phân loại… · code-bundle: Sao lưu mã… · contrast: Kiểm độ tương… · d1-backup: Sao lưu D1… · d1-usage-watch: D1 trong ngày… · d1b-migrate: Sao các bảng… · dict-stage: Tự mở index… · drive-repair: Chép bù file… · explain: Lời giải đáp… · footage-archive: Lưu kho… · footage-verify: Kiểm kho… · free-tier-guard: 02/11: chạm… · health: Rà soát lỗi… · lexicon-expand: Mở rộng kho… · lexicon-i18n: Nghĩa 13 ngôn… · nav-render: Chuyển trang… · news-auto: A->Z driver… · pr-check · preview-site: Site PREVIEW… · quality-sweep: Quét lỗi tiềm… · required-gate: MỘT commit… · script-bank: Kho kịch bản… · sentence-audio-asr: Cổng ASR cho… · seo-gsc: Vòng dữ liệu… · social-auto: Autopilot… · storage-watch: Giám sát dung… · upgrade-audit: Kiểm toán… · video-auto: Video tự động… · vocab-img-free: Ảnh từ vựng · vocab-img-scene: Ảnh cho MỌI… · vocab-img: Ảnh minh hoạ… · web-merge-daily: 06/11 chỉ số… · word-audio: Giọng đọc từ… · youtube-manual: Manual… · youtube-upload: Upload…
- [manual] apple-signing: Bảo trì ký… · bg-gates: Cổng tự động… · bg-v4: sharper wide… · chroma-batch: Tách nền… · chroma-test: Thử tách nền… · confidence-shots: Ảnh trước/sau… · cws-media: Media Chrome… · cws-publish: Đăng bản mới… · exam-es-build: Dựng nguồn… · explain-shots: Ảnh trước/sau… · footage-reel: owner review… · green-prep: Chuẩn bị clip… · i18n-native-score: O5… · ios-testflight: Ký + tải bản… · library-build: Kho dựng video · library-ingest: Nhập clip mới… · matte-pro · news-voice · ota-rollback: Quay bản web… · pron-distill · pron-train · review-shots: Ảnh trước/sau… · shorts-migrate: One-time… · shorts-rebuild: Re-render… · stitch-fonts: Dựng lại… · tts-ab: Phép thử A/B… · ux-public: UX audit of… · video-pilot5: ONE lesson… · video-pilot6: ONE… · video-pilot7: ONE "news +… · video-pilot8: ONE… · video-sample: Dựng video… · video-series: render… · video-stress: Dựng thử ĐA… · video-templates · video-templates9: ONE sample… · video-tpl1b-samples: render a FEW… · video-tpl1b: gold scripts… · video: Dựng 1 video… · vocab-img-publish: Đăng lại ảnh… · word-audio-lab: Thí nghiệm…
- [pr,manual] call-qa: QA cuộc gọi… · content-judge: Chấm 2 giám… · grammar-lazy-e2e: Trình duyệt… · icon-flash: Chữ ligature… · journey-matrix: Ma trận hành… · lesson-embed: Video nhúng… · lexicon-gpl-probe: ĐO THỬ nguồn… · native-visual: Native ↔ web… · phrasebook-shots: Ảnh thật sổ… · review-taps-stability: Chứng minh… · review-taps: Màn Ôn… · shell-responsive: Vỏ app đáp… · social-channel-kit · stitch-diff: Bám mẫu… · stitch-refs-qc: QC kho mẫu… · stitch-web: Trang web… · storage-audit: Lưu trữ phía… · story-stage · target-content: Sinh bộ từ… · teach-video: Teach2D… · teacher-bubble · teacher-native: Cổng… · teacher-rig · theme-qa: Nút giao diện… · topbar-lang: Một nút đổi… · video-e2e: end-to-end… · video-motion: Stitch… · web-sweep: Cổng "lỗi ẩn"… · word-arrange-e2e: Xếp câu… · word-audio-tl: Giọng từ đơn… · workflow-yaml
- [push:main,manual] admin-video-ui: Quản trị →… · android: Tự build app… · blog-images: Ảnh RIÊNG… · ci: Kiểm thử tự… · clips-perf: Ngân sách… · codemap: Bản đồ mã… · dict-perf: Hiệu năng +… · dist-ui: (Ảnh Quản trị… · ext-e2e: Kiểm thử… · ios-e2e: Kiểm thử app… · ios: Tự build app… · kokoro-model: Chép mô hình… · native-auth-e2e: Kiểm đăng… · native-content: Nội dung… · prod-release: Mỗi lần đẩy… · seo-indexnow: Báo IndexNow… · store-shots: Bộ ảnh +… · store-video-viral: Video quảng… · store-video: Video giới…
- [push:main,cron,manual] audio: Tạo giọng đọc… · audit-all: Audit tổng… · capacity-sim: Mô phỏng chi… · content-evidence: Bằng chứng… · content-protect: Bảo vệ nội… · i18n-leak: Rà soát LẪN… · i18n · lighthouse: Đo tốc độ &… · pages-deploy: Cổng deploy… · screens: Chụp ảnh giao… · sent-packs · word-packs: Gói nghĩa từ… · wordlists: Kho từ theo… · world-scorecard: Bảng World…
- [push:main,pr,manual] admin-ads-ui: Quản trị ›… · admin-guard: Gác bố cục… · audio-play: Phát audio ổn… · authority-pages: Uy tín /… · dict-pages: Trang từ điển… · figure-layout: Cổng bố cục… · frame-consistency: Một khung… · native-android: App Android… · native-ios: App iOS… · push-fcm: Báo đẩy app… · size-guard: Cổng dung… · stitch-quality-qc: QC mẫu Stitch… · teacher-quality: Cổng giáo… · tools-pages: Công cụ miễn…
- [push,manual] app-lcp: Đo LCP/perf… · ios-shots: Ảnh App Store… · native-release: Bản thử app… · perf-profile: Hồ sơ CPU lần… · say-native: Say it like a… · teach-build: Dựng bộ nhân… · ux-shots: Ảnh trước/sau… · video-shard-equiv: Equivalence…
- [pr,cron,manual] ads-demo: Quảng cáo… · content-factory: Xưởng nội… · font-audit: Rà font chữ… · main-red-sweep: Máy gác "main… · report-shots: Ảnh chụp báo… · store-reviews: Đánh giá App… · visual-qa: Soát giao…
- [cron,manual,after-wf] drive-shorts: Sao lưu… · release-archive: Giữ 3 bản… · video-web: Bản WEB của…
- [push,pr,manual] characters-shots: Kiểm hình "1… · scroll-perf: Cuộn mượt: cử… · ux-cards: Ảnh trước/sau…
- [?] merge-queue: Merge queue… · wip-guard: 06/11 máy gác…
- [manual,call] cine-render: Dựng video… · pron-eval
- [push] brand-build: Dựng tài sản… · hair-try: Thử đổi màu…
- [push:main,pr,cron,manual] content-qa: Cổng QA nội… · mobile-qa: Soát web…
- [after-wf] qa-backlog: Mỗi lượt QA…
- [manual,after-wf] pages: Kiểm CDN âm…
- [manual,after-wf,call] post-deploy-check: Soát bản LIVE…
- [pr] samples-visual: Cổng họ trang…
- [pr,call] npm-test: Bộ kiểm `npm…
- [pr,cron,manual,after-wf] report-autofix: Báo lỗi tự…
- [pr,manual,after-wf,call] qa-bot: QA bot…
- [push,pr,manual,call] journey-e2e: Hành trình…
- [push:main,cron,manual,after-wf] pr-unconflict: Tự gỡ xung…

## Test (454) → vùng phủ (file đích chi tiết: json `tests`)
- `web/js`: account-delete account-flow account-ui admin-flow admin-gate admin-metrics admin-share admin-tabs admin-ui ads-admin ads-cls ads-revenue ads anki audio-play audio-voice big-data call-e2e call-engine cambridge choice-kit client-security clips-perf comment-code confidence criteria datamuse-resilience dict-entry-layout dict-sent-lang dictlookup drive-ui es-practice exit-guard ext-selection facade-perf feel focus-early focus-targets get-app haptics home-logic inline-box ios-audio-unlock ipa-accent js-budget klocal landing-routing late-insert league learn-flow lesson-drag lex lip-clock lipsync-lesson lipsync mediation mic-exclusive mistake-variant mobile-guards mobile-qa native-auth native-m2-vectors next-step notify-ux probe-cta pron-coach pron-pairs pron-shadow quick-ui readtest-dedupe reminders report-ui retention say-text scroll-boot sel-translate settings-subpages shell-lazy shell-size social-ui speak-ipa speak-split speak st-web-i18n st2-href stories story-stage streak-flame streak-ui sync-cross-client sync-drive sync-ext-drive target-lang teacher-loop teacher-native teacher-rig today-debt today-mobile-actions tutor unit usage verbs video-web vocab-hub watch welcome-flow word-arrange-e2e
- `(không rõ)`: a11y admin-video-shots ads-demo-android ads-demo app-lcp-probe clutter confidence-shots content-check contrast crawl d1-scan dispatch-guard docs-budget e2e explain-shots ffmpeg-setup-policy figure-layout final-qc i18n-switch icon-flash ios-audio-e2e ios-driver-watchdog lazyfix lip-shots listing-check mobile-nav mobile-qa-keyboard native-facade native-parity nav-render no-url-pathname perf-median phrasebook-shots profile-route pron-read qa-bot-diff review-done review-lookup review-modes-e2e review-modes-ui review-modes review-shots review-taps route-race route-vitals run-suite samples-seo-parity samples-visual screens seo-pages seo-sitemap seo-words-shots serve-web shell-responsive side-menu size-guard-pr smoke storage-audit suite-shards teacher-native-shots teacher-rig-browser theme-default toeic-read-e2e tools-ui topbar-lang tsc-check ux-cards ux-guard-lib ux-guard ux-public ux-shots ux-sweep ux1-guard video-web-e2e visual-qa web-sweep welcome-journey workflow-call-perms workflow-yaml
- `functions/api`: accounts admin-ads-shots admin-dist-shots admin-gh admin-guard admin-prefs admin-rollup ai-pool aiearn analytics api-security capacity classroom clip-bulk community-api d1-cap dist-channels dist-roles distribution drive-repair drive hit-retry img-api importdeck jobs keys live-check notices play-duel post-deploy-check pr-check quota report retention-admin root-lang schema-lock sessions-scan-gate social-admin social-auto social-first-comment social-meta-oauth social-meta social-mgr social-preview social-proxy static-routes sync-ctx sync-pack user-mgmt users-bulk ux1-rollout voice-source yt-manual
- `scripts`: authority-pages axe blog-images blog-lang-gates blog-youtube bot-push-key brand-check build-hash codemap-budget cpack explain-check explain-let ext-version fmt-stable frame-consistency gen-guard i18n-english i18n-single journey-e2e lesson-content links-js mobile-polish mqa-parity-self mqa-parity native-strings-locked origin-fetch pack-gloss pages-lag pages-skip pr-unconflict protection samples-ui scan-roots self-fonts sentence-asr sw-cache-fixed teacher-mood theme-switch token-drift tools-pages ux1 word-ipa world-scorecard
- `scripts/ci`: apt-install audio-coverage audio-pr-branch busy-gate ci-guards ci-hog ci-policy ci-queue-gate ci-shards-busy ci-triage cron-watch gh-api heavy-rerun no-pr-branch-push npm-retry-policy push-main qa-fill queue-report required-gate-stale retry5xx sparse-imports vimg-watch workflow-cd-paths zombie-pages
- `brand/stitch`: landing-v3 layout-guards stitch-coverage stitch-diff stitch-quality-qc stitch-refs-qc stitch-render stitch-screens stitch-today-contrast stitch-web-diff
- `scripts/lib`: ci-header-scope font-audit is-main-guard json-dupkeys lastmod qa-classify syntax-check theme-static word-depth
- `web`: adsense-hygiene brand-logo-stitch deep-links headers seo-twin site-footer size-budget skills-hub sw-storage
- `content/video`: characters-gate library studio teach2d-l1 video-layout video-pron video-templates video
- `scripts/quality`: exit-sweep journey-matrix landing-cls nav-sweep qa-bot qs-fix-queue scroll-perf today-fold
- `scripts/video`: capsplit motion-core motion overlay-gates put-session shorts-scale teach2d-rig tpl1b-pipeline
- `extension`: ext-newtab-quiz ext-orphan ext-popup i18n-pack infra-check word-audio-s2
- `extension/app`: ext-bundles ext-dict-i18n ext-sync i18n-leak main-red-sweep teacher-bubble
- `scripts/native`: asc-signing ios-sign-patch native-compat native-one-source native-pick-sim native-visual
- `web/cpack`: es-exam grammar-lazy-e2e i18n-native-score outcomes phrasebook play-blitz
- `web/css`: admin-map-colors card-actions cls-chrome css-lazy wordcard-ui
- `content/blog`: blog-captions cpm-plan gsc
- `infra`: ci-filler no-prod-hosts size-guard
- `mobile/android`: android-ime android-xml-comments token-contrast
- `scripts/vocab-img`: vocab-img-judge-budget vocab-img-worth vocab-img
- `.github/workflows`: ci-autopilot required-gate
- `brand`: brand-shots png-rgba
- `content/framework`: grammar-inventory lkf
- `scripts/cine`: publish-meta whisper-det
- `scripts/content-qa`: content-qa sense-check
- `scripts/lexicon`: dict-perf lexicon-expand
- `scripts/ops`: ledger-merge rollback
- `scripts/target`: es-conjugate es-path
- `scripts/teach`: characters-shots teacher-quality
- `scripts/top1`: logic-invariants top1-score
- `web/app`: bundle-names v2pre-ring
- `content/legal`: legal-i18n
- `content/lesson`: learnability
- `content/lexicon`: vocab-img-strict
- `content/protection`: commit-regen
- `content/situations`: situations
- `content/target`: es-pron
- `mobile`: crashlytics
- `mobile/ios`: ai-local
- `scripts/audio`: tts-sites
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
- `scripts/store`: store-reviews
- `scripts/test`: suite-guard
- `web/blog`: quiz
- `web/data`: lesson-embed-e2e
- `web/icons`: ext-e2e
- `web/img`: toeic-photos
- `workers/cronkick`: cron-kick
- `workers/dict`: dict-pages
- `workers/mail`: mail-prefs
- `workers/push`: fcm-push

## Mô-đun JS chính (16/2183, ngoài god nodes; phần còn lại trong json) – tên: export →nạp/import ←số nơi dùng
- `functions/api/` drive.js: isFootageRow,isBackupRow,isShortsRow,shortsCapacity,sha256Hex… →_backup.js,_d1b.js,_d1guard.js ←8 (admin-shorts.js,capacity.js,callback.js)
- `scripts/lexicon/` ipa.mjs: ALLOWED,badChars,ukStyle,ukStyleBad,fixBroken… →- ←12 (build-lexicon.mjs,gate.mjs,gen-wordlist.mjs) · shards.mjs: loadBrowserIndex,mergeExpand,buildShards,writeShards →lib.mjs,lib.mjs,app.js ←9 (build.mjs,wordnet.mjs,gen-newtab.mjs)
- `scripts/lib/` i18n-pack.mjs: ROOT,SRC,OUT,LANGS,LAZY… →- ←11 (preview-resolve.mjs,build.mjs,fmt-stable.mjs) · is-main.mjs: isMain →- ←11 (build-hash.mjs,creds.mjs,cutover.mjs) · site-layout.mjs: EXT_STORE,EXT_JS,GETAPP_JS,LSW_CSS,LSW_JS… →authority-links.mjs,samples-visual.mjs,seo-pages-i18n.mjs ←13 (build-authority.mjs,build-blog.mjs,build-landing.mjs)
- `scripts/native/` gen-skills.mjs: hubVectors,listenVectors,playerVectors,sharedVectors,listenTestVectors… →gen-teach.mjs,gen-vocab.mjs,test10.js ←5 (gen-call.mjs,gen-learn.mjs,gen-speak.mjs) · gen-speak.mjs: content,SPEAK_PACK_PATH,speakPack,speakStarter,STRING_FILES… →gen-skills.mjs,gen-teach.mjs,gen-vocab.mjs ←1 (gen.mjs) · gen-vocab.mjs: NOW,slice,miniData,mkEnv,mkApp… →fake-idb.mjs,gen-teach.mjs,web-ref.mjs ←4 (gen-call.mjs,gen-skills.mjs,gen-speak.mjs)
- `scripts/sentence-audio/` corpus.mjs: collect →scan-roots.mjs,gold.js,stories.js ←5 (coverage.mjs,gen-audio.mjs,merge.mjs)
- `scripts/target/` lib.mjs: ROOT,MEAN_LANGS,POS,seedPath,coreFiles… →- ←14 (grammar-map-check.mjs,build.mjs,calls-check.mjs)
- `scripts/vocab-img/` style.mjs: STYLE,PEOPLE,fnv,promptFor,altFor… →- ←12 (cards.mjs,concept.mjs,gen.mjs)
- `web/js/` core.js →app.js ←9 (content-pack.mjs,gen-lesson.mjs,gen-sync.mjs) · heal.js →app.js ←1 (sw.js) · ui.js →app.js ←9 (ipa-audit.mjs,gen-audio.mjs,gen-call.mjs)
- `web/js/speak/` data.js →airport-checkin.js,ask-directions.js,bank.js ←3 (gen-speak.mjs,build.mjs,app.js)
