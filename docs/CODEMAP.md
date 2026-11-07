# CODEMAP – bản đồ mã nguồn (SINH TỰ ĐỘNG, đừng sửa tay)

> TL;DR: Đọc file này ĐẦU PHIÊN thay vì khám phá repo; tra chính xác bằng `docs/codemap.json` (`node -e` / jq); chỉ grep/mở file mà bản đồ trỏ tới. Sinh bởi `node scripts/codemap.mjs` (workflow codemap.yml). Luật: TOKEN-RULES.md §1.
> Đọc khi: ĐẦU MỖI PHIÊN, trước khi tìm code.

Tra json: `node -e "const g=require('./docs/codemap.json');console.log(g.nodes['web/js/app.js'])"` · `g.routes` · `g.workflows` · `g.tests` · `g.god`. Mỗi node: exports, imports, importedBy.

## Khu vực
- `web/` (2035 file): App (SPA) + landing: shell web/app/index.html nạp web/js/*.js bằng <script> (toàn cục App/UI/Chars, KHÔNG import); lazy bundle: BUNDLES trong web/js/app.js; css web/css; trang tĩnh sinh bởi scripts/build-*.mjs → dist
- `extension/` (1348 file): Add-on Chrome/Edge (background/content/popup/newtab). extension/app là BẢN SAO dựng từ web/ (scripts/build-extension.sh) – KHÔNG sửa tay, bị bỏ khỏi map
- `functions/` (89 file): Cloudflare Pages Functions = backend /api/* (file _*.js là helper dùng chung)
- `workers/` (19 file): Cloudflare Workers riêng: audio, dict, gemini (AI), mail, media; workers/lib dùng chung
- `scripts/` (1109 file): Công cụ build/gen/ops (mjs); scripts/test = chuỗi `npm test`; thư mục con theo mảng (video, lexicon, dict, ops, jobs, ci, social, seo…)
- `.github/workflows/` (187 file): CI/CD + việc nền theo lịch (xem mục Workflows)
- `infra/` (10 file): Sổ hạ tầng JSON: resources, jobs (nguồn của docs/JOBS.md), media-repos, schema.lock
- `brand/` (1526 file): tokens.json (màu), logo, stitch/ (ref + DTCG), library/ (kho cảnh/clip video)
- `content/` (3095 file): Nội dung nguồn: blog, authority, dict, confidence, explain, brand (dữ liệu lớn – bỏ khỏi map)
- `mobile/` (216 file): Capacitor iOS/Android (ios/ android/ bỏ khỏi map)
- `store/` (43 file): Hồ sơ listing Chrome/Edge/Apple/Play
- `docs/` (209 file): Luật + tài liệu chủ đề (docs/README.md → INDEX.md); lịch sử ở docs/archive
- API `/api/*` (41): account,admin,admin-accounts,admin-clips,admin-prefs,admin-shared,admin-shorts,ads-report,ads-reward,ai,aiearn,backlinks,capacity,class,config,contact,cron-kick,dictlookup,distribution,drive,growth,handoff,hit,i18nfix…
- Thư mục con (số file; js/=web/js, s/=scripts): js/i18n:697 s/test:453 s/video:104 js/vimg:64 s/lib:52 s/cine:51 js/st:34 s/lexicon:33 s/vocab-img:33 js/grammar:27 js/notes:27 s/stitch:26 s/ci:24 js/readtest:22 js/speak:22 js/lib:20 s/pron:19 s/native:16 js/get-app:15 js/toeic:15 s/word-audio:13 s/lipsync:12 s/ops:12 js/listen:12

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
1. `web/js/app.js` ←91 · App,LK_GETAPP_T,accountMenu,retArm…
2. `web/js/st/common.js` ←44 · ST
3. `functions/api/sync.js` ←32 · cors,json,claims,verify…
4. `scripts/lexicon/lib.mjs` ←22 · ROOT,rd,wr,PRIORITY…
5. `functions/api/_d1guard.js` ←20 · D1_LIMITS,GUARD_PCT,WARN_PCTS,GQL_TIMEOUT_MS…
6. `scripts/video/library.mjs` ←20 · ROOT,LIB,CAND,MANIFEST…
7. `web/js/sync.js` ←20 · Sync,VBBridge
8. `web/js/ai.js` ←19 · AI
9. `functions/api/admin.js` ←18 · adminAudit,adminCors,ghApi,_resetAdminMem…
10. `web/js/data.js` ←18 · script
11. `functions/api/_quota.js` ←16 · DEFAULTS,PROVIDERS,BREAKER,STRIKE…
12. `scripts/lib/blog-content.mjs` ←14 · ROOT,CATEGORIES,config,parse…
13. `functions/api/_schema.js` ←13 · once,_resetSchema
14. `scripts/lexicon/expand/lib.mjs` ←13 · LANGS,QUEUE,TOPIC_CHOICES,btMatch…
15. `scripts/lib/site-layout.mjs` ←13 · EXT_STORE,EXT_JS,GETAPP_JS,LSW_CSS…

## Routes `#/…` → file xử lý (74)
- `app.js`: contact deck home library topic welcome
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
- `stats-page.js`: stats
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

## Workflows (187) theo trigger: tên: việc kiểm/làm
- [cron,manual] ads-revenue-hourly: Doanh thu THẬT · ads-revenue: Doanh thu THẬT từ… · blog-daily: Việc blog tự động… · blog-publish: Tự đăng blog: mỗi 3… · capacity-watch: Hạn mức Cloudflare… · cdn-mirror: media.lexkite.com +… · cf-pool-probe: Dò kho CF_POOL ngay… · ci-filler: 02/11: chạm file để… · ci-queue-report: Đo hàng chờ CI mỗi… · ci-triage: Tự phân loại… · code-bundle: Sao lưu mã nguồn… · contrast: Kiểm độ tương phản… · d1-backup: Sao lưu D1 chính… · d1-usage-watch: D1 trong ngày (sự… · d1b-migrate: Sao các bảng nội bộ… · dict-stage: Tự mở index trang… · drive-repair: Chép bù file thiếu… · explain: Lời giải đáp án… · footage-archive: Lưu kho footage… · footage-verify: Kiểm kho footage… · free-tier-guard: 02/11: chạm file để… · health: Rà soát lỗi tiềm ẩn… · lexicon-expand: Mở rộng kho từ tới… · lexicon-i18n: Nghĩa 13 ngôn ngữ… · nav-render: Chuyển trang & Quay… · news-auto: A->Z driver for the… · pr-check · preview-site: Site PREVIEW cho… · quality-sweep: Quét lỗi tiềm ẩn… · required-gate: MỘT commit status… · script-bank: Kho kịch bản video… · sentence-audio-asr: Cổng ASR cho audio… · seo-gsc: Vòng dữ liệu Google… · social-auto: Autopilot social… · storage-watch: Giám sát dung lượng… · upgrade-audit: Kiểm toán nâng cấp… · video-auto: Video tự động hằng… · vocab-img-free: Ảnh từ vựng · vocab-img-scene: Ảnh cho MỌI nghĩa… · vocab-img: Ảnh minh hoạ từ… · web-merge-daily: 06/11 chỉ số: số PR… · word-audio: Giọng đọc từ đơn… · youtube-manual: Manual YouTube path… · youtube-upload: Upload…
- [manual] bg-gates: Cổng tự động cho… · bg-v4: sharper wide… · chroma-batch: Tách nền PHÔNG XANH… · chroma-test: Thử tách nền PHÔNG… · confidence-shots: Ảnh trước/sau Giao… · cws-media: Media Chrome Web… · cws-publish: Đăng bản mới của… · explain-shots: Ảnh trước/sau của… · footage-reel: owner review of the… · green-prep: Chuẩn bị clip phông… · ios-testflight: Ký + tải bản iOS… · library-build: Kho dựng video · library-ingest: Nhập clip mới vào… · matte-pro · news-voice · ota-rollback: Quay bản web OTA về… · pron-distill · pron-train · review-shots: Ảnh trước/sau ôn… · shorts-migrate: One-time… · shorts-rebuild: Re-render shorts… · stitch-fonts: Dựng lại phông icon… · tts-ab: Phép thử A/B giọng… · ux-public: UX audit of the… · video-pilot5: ONE lesson… · video-pilot6: ONE presenter-show… · video-pilot7: ONE "news + scene"… · video-pilot8: ONE "continuous… · video-sample: Dựng video MẪU từ… · video-series: render numbered… · video-stress: Dựng thử ĐA DẠNG… · video-templates · video-templates9: ONE sample per v9… · video-tpl1b-samples: render a FEW… · video-tpl1b: gold scripts →… · video: Dựng 1 video cho… · vocab-img-publish: Đăng lại ảnh minh… · word-audio-lab: Thí nghiệm giọng từ…
- [pr,manual] call-qa: QA cuộc gọi… · lesson-embed: Video nhúng một… · native-visual: Native ↔ web visual… · review-taps-stability: Chứng minh `taps`… · review-taps: Màn Ôn (Stitch v2)… · shell-responsive: Vỏ app đáp ứng một… · social-channel-kit · stitch-diff: Bám mẫu Stitch: vẽ… · stitch-refs-qc: QC kho mẫu Stitch… · stitch-web: Trang web tĩnh theo… · storage-audit: Lưu trữ phía máy… · target-content: Sinh bộ từ lõi ngôn… · teach-video: Teach2D templates… · teacher-bubble · teacher-native: Cổng teacher-native… · teacher-rig · theme-qa: Nút giao diện… · topbar-lang: Một nút đổi ngôn… · video-e2e: end-to-end DRY RUN… · video-motion: Stitch overlay… · web-sweep: Cổng "lỗi ẩn" mọi… · word-arrange-e2e: Xếp câu… · word-audio-tl: Giọng từ đơn ngôn… · workflow-yaml
- [push:main,manual] admin-video-ui: Quản trị → Video… · android: Tự build app… · blog-images: Ảnh RIÊNG từng bài… · ci: Kiểm thử tự động… · clips-perf: Ngân sách hiệu năng… · codemap: Bản đồ mã nguồn… · dict-perf: Hiệu năng + nhất… · dist-ui: Kênh & phân phối… · ext-e2e: Kiểm thử đầu-cuối… · ios-e2e: Kiểm thử app iOS… · ios: Tự build app iOS… · kokoro-model: Chép mô hình… · native-auth-e2e: Kiểm đăng nhập gốc… · native-content: Nội dung… · play-shots: Ảnh Google Play… · prod-release: Mỗi lần đẩy main =… · seo-indexnow: Báo IndexNow (Bing… · store-shots: Ảnh Chrome Web… · store-video-viral: Video quảng cáo bản… · store-video: Video giới thiệu…
- [push:main,cron,manual] audio: Tạo giọng đọc… · capacity-sim: Mô phỏng chi phí D1… · content-evidence: Bằng chứng tác… · content-protect: Bảo vệ nội dung… · i18n-leak: Rà soát LẪN TIẾNG… · i18n · lighthouse: Đo tốc độ & chất… · pages-deploy: Cổng deploy… · screens: Chụp ảnh giao diện… · sent-packs · word-packs: Gói nghĩa từ vựng… · wordlists: Kho từ theo kỳ thi… · world-scorecard: Bảng World: Lexkite…
- [push:main,pr,manual] admin-guard: Gác bố cục mọi… · audio-play: Phát audio ổn định… · authority-pages: Uy tín / E-E-A-T… · dict-pages: Trang từ điển… · figure-layout: Cổng bố cục hình đề… · frame-consistency: Một khung app: mọi… · native-android: App Android NATIVE… · native-ios: App iOS NATIVE… · size-guard: Cổng dung lượng… · stitch-quality-qc: QC mẫu Stitch "nâng… · teacher-quality: Cổng giáo viên… · tools-pages: Công cụ miễn phí…
- [push,manual] app-lcp: Đo LCP/perf màn đầu… · ios-shots: Ảnh App Store… · native-release: Bản thử app NATIVE… · perf-profile: Hồ sơ CPU lần tải… · say-native: Say it like a native · teach-build: Dựng bộ nhân vật… · ux-shots: Ảnh trước/sau các… · video-shard-equiv: Equivalence proof…
- [pr,cron,manual] ads-demo: Quảng cáo DEMO/THỬ… · content-factory: Xưởng nội dung… · font-audit: Rà font chữ… · main-red-sweep: Máy gác "main luôn… · report-shots: Ảnh chụp báo lỗi… · visual-qa: Soát giao diện tự…
- [cron,manual,after-wf] drive-shorts: Sao lưu shorts ĐẠT… · release-archive: Giữ 3 bản phát hành… · video-web: Bản WEB của short…
- [push,pr,manual] characters-shots: Kiểm hình "1 bộ… · scroll-perf: Cuộn mượt: cử chỉ… · ux-cards: Ảnh trước/sau các…
- [manual,call] cine-render: Dựng video điện ảnh… · pron-eval
- [push] brand-build: Dựng tài sản thương… · hair-try: Thử đổi màu tóc…
- [push:main,pr,cron,manual] content-qa: Cổng QA nội dung… · mobile-qa: Soát web mobile…
- [?] wip-guard: 06/11 máy gác WIP…
- [after-wf] qa-backlog: Mỗi lượt QA đỏ trên…
- [manual,after-wf] pages: Kiểm CDN âm thanh…
- [manual,after-wf,call] post-deploy-check: Soát bản LIVE…
- [pr] samples-visual: Cổng họ trang thư…
- [pr,call] npm-test: Bộ kiểm `npm test`…
- [pr,cron,manual,after-wf] report-autofix: Báo lỗi tự chuyển…
- [pr,manual,after-wf,call] qa-bot: QA bot…
- [push,pr,manual,call] journey-e2e: Hành trình người…
- [push:main,cron,manual,after-wf] pr-unconflict: Tự gỡ xung đột ở…

## Test (381) → vùng phủ (file đích chi tiết: json `tests`)
- `web/js`: account-delete account-flow account-ui admin-gate admin-metrics admin-share admin-tabs admin-ui ads-admin ads-cls ads anki audio-play audio-voice call-e2e call-engine choice-kit client-security clips-perf comment-code confidence criteria datamuse-resilience dict-entry-layout dict-sent-lang dictlookup drive-ui exit-guard ext-selection facade-perf feel focus-targets get-app haptics inline-box ios-audio-unlock ipa-accent js-budget klocal landing-routing league learn-flow lesson-drag lex lip-clock lipsync-lesson lipsync mobile-guards mobile-qa native-auth next-step notify-ux pron-coach pron-pairs quick-ui readtest-dedupe reminders report-ui retention say-text scroll-boot sel-translate settings-subpages shell-lazy shell-size social-ui speak-ipa speak-split speak st-web-i18n st2-href stories streak-flame streak-ui sync-cross-client sync-drive sync-ext-drive target-lang teacher-loop teacher-native teacher-rig today-mobile-actions tutor unit usage verbs video-web watch welcome-flow word-arrange-e2e
- `(không rõ)`: a11y admin-video-shots ads-demo-android ads-demo app-lcp-probe clutter confidence-shots content-check contrast crawl d1-scan dispatch-guard docs-budget e2e explain-shots ffmpeg-setup-policy figure-layout final-qc i18n-switch ios-audio-e2e ios-driver-watchdog lazyfix lip-shots listing-check native-facade native-parity nav-render no-url-pathname profile-route pron-read qa-bot-diff review-done review-lookup review-modes-e2e review-modes-ui review-modes review-shots review-taps route-race route-vitals run-suite samples-seo-parity samples-visual screens seo-pages seo-sitemap seo-words-shots serve-web shell-responsive side-menu smoke storage-audit teacher-native-shots teacher-rig-browser toeic-read-e2e tools-ui topbar-lang tsc-check ux-cards ux-guard-lib ux-guard ux-public ux-shots ux-sweep ux1-guard video-web-e2e visual-qa web-sweep welcome-journey workflow-yaml
- `functions/api`: accounts admin-ads-shots admin-dist-shots admin-gh admin-guard admin-prefs admin-rollup ads-revenue ai-pool aiearn analytics api-security capacity classroom clip-bulk d1-cap dist-roles distribution drive-repair drive hit-retry img-api jobs keys live-check notices post-deploy-check pr-check quota report root-lang schema-lock sessions-scan-gate social-admin social-auto social-first-comment social-meta-oauth social-meta social-mgr social-preview social-proxy static-routes sync-ctx sync-pack user-mgmt users-bulk ux1-rollout voice-source yt-manual
- `scripts`: authority-pages axe blog-images blog-lang-gates blog-youtube bot-push-key brand-check build-hash ci-triage codemap-budget cpack explain-check explain-let frame-consistency i18n-english i18n-single journey-e2e lesson-content links-js mobile-polish mqa-parity-self mqa-parity origin-fetch pack-gloss pages-skip pr-unconflict protection samples-ui self-fonts sentence-asr sw-cache-fixed theme-switch token-drift tools-pages ux1 word-ipa world-scorecard
- `scripts/ci`: audio-coverage audio-pr-branch ci-guards ci-hog ci-policy ci-queue-gate commit-regen cron-watch gh-api no-pr-branch-push qa-fill queue-report required-gate-stale retry5xx sparse-imports zombie-pages
- `brand/stitch`: landing-v3 layout-guards stitch-coverage stitch-diff stitch-quality-qc stitch-refs-qc stitch-render stitch-screens stitch-web-diff
- `content/video`: characters-gate library studio video-layout video-pron video-templates video
- `scripts/lib`: ci-header-scope font-audit lastmod qa-classify syntax-check theme-static word-depth
- `scripts/video`: capsplit motion-core motion overlay-gates put-session shorts-scale tpl1b-pipeline
- `web`: brand-logo-stitch deep-links headers seo-twin site-footer size-budget sw-storage
- `extension`: ext-newtab-quiz ext-orphan ext-popup i18n-pack infra-check word-audio-s2
- `extension/app`: ext-bundles ext-dict-i18n ext-sync i18n-leak main-red-sweep teacher-bubble
- `scripts/quality`: exit-sweep landing-cls nav-sweep qa-bot qs-fix-queue scroll-perf
- `scripts/native`: native-compat native-one-source native-pick-sim native-visual
- `web/css`: admin-map-colors card-actions css-lazy wordcard-ui
- `content/blog`: blog-captions cpm-plan gsc
- `infra`: ci-filler no-prod-hosts size-guard
- `brand`: brand-shots png-rgba
- `content/framework`: grammar-inventory lkf
- `mobile/android`: android-xml-comments token-contrast
- `scripts/cine`: publish-meta whisper-det
- `scripts/content-qa`: content-qa sense-check
- `scripts/lexicon`: dict-perf lexicon-expand
- `scripts/ops`: ledger-merge rollback
- `scripts/teach`: characters-shots teacher-quality
- `scripts/top1`: logic-invariants top1-score
- `scripts/vocab-img`: vocab-img-judge-budget vocab-img
- `web/app`: bundle-names v2pre-ring
- `.github/workflows`: required-gate
- `content/legal`: legal-i18n
- `content/lexicon`: vocab-img-strict
- `content/mediation`: mediation
- `content/situations`: situations
- `mobile/ios`: ai-local
- `scripts/audio`: tts-sites
- `scripts/cdn`: cdn-r2
- `scripts/dict`: dict-stage
- `scripts/explain`: explain
- `scripts/factory`: content-factory
- `scripts/feedback`: feedback-eval
- `scripts/free-tier`: free-tier
- `scripts/jobs`: jobs-check
- `scripts/lesson`: lesson
- `scripts/lipsync`: lipsync-cross
- `scripts/ota`: ota
- `scripts/pron`: pron-gop
- `scripts/scriptbank`: script-bank
- `scripts/target`: es-conjugate
- `scripts/test`: suite-guard
- `scripts/world`: probe-cta
- `web/blog`: quiz
- `web/data`: lesson-embed-e2e
- `web/icons`: ext-e2e
- `workers/cronkick`: cron-kick
- `workers/dict`: dict-pages
- `workers/mail`: mail-prefs

## Mô-đun JS chính (19/1268, ngoài god nodes; phần còn lại trong json) – tên: export →nạp/import ←số nơi dùng
- `functions/api/` _d1b.js: D1B_DEFAULT_DB,d1bMode,d1bReady,REST_TIMEOUT_MS,restDb… →- ←7 (_jobs.js,admin-shared.js,drive.js) · _keys.js: ALERT_MIN,MAIL_GAP,PROVIDERS,PROVIDER_IDS,cleanKey… →_quota.js,_schema.js ←7 (_meta_oauth.js,_meta_tokens.js,_social_auto.js) · _social_auto.js: AUTO_PLATS,AUTO_DEFAULT,PROVIDERS,cleanAuto,ytViaGc… →_clip_logic.js,_distribution.js,_first_comment.js ←4 (social-auto.js,social.js,callback.js) · admin-shorts.js: MANIFEST,okPath,signedPack,signed,_memo… →_d1guard.js,_shorts_data.js,admin.js ←6 (_social_auto.js,_social_mgr.js,admin-clips.js) · drive.js: isFootageRow,isBackupRow,isShortsRow,shortsCapacity,sha256Hex… →_backup.js,_d1b.js,_d1guard.js ←8 (admin-shorts.js,capacity.js,callback.js)
- `scripts/footage/` lib.mjs: ROOT,DEFAULT_ROOT,MANIFEST_NAME,WANT,mimeOf… →library.mjs ←7 (archive.mjs,fetch.mjs,repo-size.mjs)
- `scripts/lexicon/` ipa.mjs: ALLOWED,badChars,ukStyle,ukStyleBad,fixBroken… →- ←12 (build-lexicon.mjs,gate.mjs,gen-wordlist.mjs) · shards.mjs: loadBrowserIndex,mergeExpand,buildShards,writeShards →lib.mjs,lib.mjs,app.js ←8 (build.mjs,wordnet.mjs,gen-newtab.mjs)
- `scripts/lib/` ai-pool.mjs: modelInfo,familyOf,pickModels,judgeKey,TASKS… →lexai.js,cf-pool.mjs,key-pool.mjs ←12 (lib.mjs,job.mjs,lib.mjs) · content-registry.mjs: REGISTRY,GENESIS,sha256,entryHash,readRegistry… →- ←8 (content-registry.mjs,evidence.mjs,ots.mjs)
- `scripts/ops/` lib.mjs: arg,sleep,distinctDrives,sha256File,downloadCopy… →lib.mjs,library.mjs ←8 (code-bundle.mjs,d1-backup.mjs,d1-restore.mjs)
- `scripts/scriptbank/` lib.mjs: DIR,h8,TYPES,CAT,HOOK_TYPES… →lib.mjs,ipa.mjs,lib.mjs ←7 (build.mjs,build.mjs,translate.mjs)
- `scripts/sentence-audio/` corpus.mjs: collect →calls-exam.js,calls-lot1.js,calls-lot2.js ←5 (coverage.mjs,gen-audio.mjs,merge.mjs) · lib.mjs: IDX,S2,readIndex,writeIndex,readLedger… →keyset.mjs,audio-index.js ←7 (audio-cdn-check.mjs,coverage.mjs,gen-audio.mjs)
- `scripts/vocab-img/` strict.mjs: fnv,STRICT_V,COLORS,SHAPES,ICONIC… →style.mjs ←8 (cards.mjs,gen.mjs,icons.mjs) · style.mjs: STYLE,PEOPLE,fnv,promptFor,altFor… →- ←12 (cards.mjs,concept.mjs,gen.mjs)
- `web/` sw.js →ads.js,ai.js,app.js ←1 (world-scorecard.mjs)
- `web/js/` export.js →app.js ←1 (app.js) · ux1.js: Ux1,teacherImg,navOf,crumb,afterRoute… →app.js,league.js,common.js ←6 (build-stitch-css.mjs,app.js,ui.js)
