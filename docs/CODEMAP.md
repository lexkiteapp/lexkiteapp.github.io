# CODEMAP – bản đồ mã nguồn (SINH TỰ ĐỘNG, đừng sửa tay)

> TL;DR: Đọc file này ĐẦU PHIÊN thay vì khám phá repo; tra chính xác bằng `docs/codemap.json` (`node -e` / jq); chỉ grep/mở file mà bản đồ trỏ tới. Sinh bởi `node scripts/codemap.mjs` (workflow codemap.yml). Luật: TOKEN-RULES.md §1.
> Đọc khi: ĐẦU MỖI PHIÊN, trước khi tìm code.

Tra json: `node -e "const g=require('./docs/codemap.json');console.log(g.nodes['web/js/app.js'])"` · `g.routes` · `g.workflows` · `g.tests` · `g.god`. Mỗi node: exports, imports, importedBy.

## Khu vực
- `web/` (3085 file): App (SPA) + landing: shell web/app/index.html nạp web/js/*.js bằng <script> (toàn cục App/UI/Chars, KHÔNG import); lazy: BUNDLES ở web/js/bundles.js; css web/css; trang tĩnh sinh bởi scripts/build-*.mjs → dist
- `extension/` (2330 file): Add-on Chrome/Edge (background/content/popup/newtab). extension/app là BẢN SAO dựng từ web/ (scripts/build-extension.sh) – KHÔNG sửa tay, bị bỏ khỏi map
- `functions/` (112 file): Cloudflare Pages Functions = backend /api/* (file _*.js là helper dùng chung)
- `workers/` (19 file): Cloudflare Workers riêng: audio, dict, gemini (AI), mail, media; workers/lib dùng chung
- `scripts/` (1590 file): Công cụ build/gen/ops (mjs); scripts/test = chuỗi `npm test`; thư mục con theo mảng (video, lexicon, dict, ops, jobs, ci, social, seo…)
- `.github/workflows/` (243 file): CI/CD + việc nền theo lịch (xem mục Workflows)
- `infra/` (15 file): Sổ hạ tầng JSON: resources, jobs (nguồn của docs/JOBS.md), media-repos, schema.lock
- `brand/` (1920 file): tokens.json (màu), logo, stitch/ (ref + DTCG), library/ (kho cảnh/clip video)
- `content/` (6037 file): Nội dung nguồn: blog, authority, dict, confidence, explain, brand (dữ liệu lớn – bỏ khỏi map)
- `mobile/` (217 file): Capacitor iOS/Android (ios/ android/ bỏ khỏi map)
- `store/` (47 file): Hồ sơ listing Chrome/Edge/Apple/Play
- `docs/` (263 file): Luật + tài liệu chủ đề (README.md → INDEX.md); cũ: docs/archive
- API `/api/*` (50): account,admin,admin-accounts,admin-clips,admin-prefs,admin-shared,admin-shorts,ads-report,ads-reward,ai,aiearn,backlinks,capacity,class…
- Thư mục con (số file; js/=web/js, s/=scripts): js/i18n:746 s/test:677 s/video:131 s/stitch:93 s/lib:74 js/vimg:64 s/cine:54 s/ci:53 js/st:44 s/lexicon:39 s/vocab-img:33 s/native:30 js/notes:27 js/readtest:21 s/pron:20 s/target:17 s/lesson:16 js/get-app:15 js/irv:15 js/lib:15 js/toeic:15 s/content-qa:14 s/ops:14 js/call:14 s/word-audio:13 s/lipsync:12

## Sửa ở đâu (tác vụ → file)
- **Chuỗi i18n (15 ngôn ngữ)**: Khóa = câu tiếng Việt trong t('…'). Bản dịch web/js/i18n/<lang>.js + web/js/i18n/en/*.js; add-on extension/_locales/<lang>/messages.json. Tool: scripts/i18n-missing.mjs, i18n-qa.mjs, gen-i18n.mjs, i18n-sync.sh. Luật: docs/I18N-PIPELINE.md
- **Design token / màu**: brand/tokens.json → scripts/build-tokens.mjs → :root trong web/css/style.css (+ scripts/lib/site-layout.mjs). Stitch: brand/stitch/tokens.dtcg.json, scripts/build-stitch-css.mjs → web/css/st-*.css. Luật: docs/DESIGN-SYSTEM.md, docs/BRAND-RULES.md
- **Giáo viên Ama/Carlos**: Registry web/teach/characters.json (+ ama/ carlos/); API Chars.* ở web/js/characters.js; lời/khẩu hình web/js/lesson/teacher.js, web/js/st/v2/teacher-call.js; tool scripts/teach, scripts/teacher; luật docs/CHARACTERS.md
- **Luồng bài học**: web/js/lesson/{engine,ui,stories,gold,teacher}.js; màn st: web/js/st/lesson.js, web/js/st/v2/lesson-question.js, lesson-complete.js; lộ trình web/js/path.js, plan.js, next-step.js; build scripts/lesson/; docs/LESSON-ENGINE.md, docs/LEARNING-PATH.md
- **Từ điển / từ vựng**: web/js/dictionary.js (route #/dict), lexis.js, lex.js, wordcard.js, vocab-img.js; dữ liệu sinh: scripts/build-lexicon.mjs, scripts/lexicon/, scripts/dict/, workers/dict; docs/LEXICON.md
- **Cổng Stitch v2**: scripts/stitch-v2-convert.mjs (HTML Stitch → module) → web/js/st/v2/*.js + web/css/st-v2-*.css; ref brand/stitch/v2; docs/STITCH-V2-PORT.md; CI so ảnh: nav-render, dist-ui
- **Pipeline video**: scripts/video/{render,auto,synth,motion}.mjs + remotion/ + motion/; cảnh cine scripts/cine; footage scripts/footage; kho brand/library/cine; docs/VIDEO.md, docs/VIDEO-MOTION.md, docs/CREDIT-RULES.md (tiêu credit); workflow cine-render, footage-*
- **Route / màn hình app**: routes.<tên> = … rải ở web/js/*.js (bảng Routes dưới); alias + route→gói ở web/js/app.js (ROUTE_ALIAS, ROUTE_BUNDLE), đăng ký gói ở web/js/bundles.js (BUNDLES); script toàn cục → web/app/index.html
- **API backend**: functions/api/<tên>.js = /api/<tên>; helper functions/api/_*.js (quota…)
- **Add-on**: extension/{manifest.json,background.js,content.js,popup.js,newtab.js}; build scripts/build-extension.sh (web → extension/app)
- **Blog / SEO**: content/blog + scripts/blog-pipeline.mjs, build-blog.mjs, build-seo.mjs; workflow blog-daily; docs/BLOG-RUNBOOK.md
- **CI / việc nền**: infra/jobs.json → docs/JOBS.md (node scripts/jobs/gen.mjs); lease scripts/jobs/lease.mjs; chuỗi test = scripts/test/suite.txt (npm test → run-suite.mjs); scripts/prepush.sh; docs/CI-RUNNERS.md

## God nodes (15 module được import/nạp nhiều nhất; không tính test)
1. `web/js/app.js` ←105 · App,AI,LK_GETAPP_T,accountMenu…
2. `web/js/st/common.js` ←56 · ST
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
14. `scripts/lib/ai-pool.mjs` ←16 · modelInfo,familyOf,pickModels,judgeKey…
15. `scripts/lib/site-layout.mjs` ←16 · EXT_STORE,EXT_JS,GETAPP_JS,LSW_CSS…

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
- `ux1-lib.js`: library
- `ux1-me.js`: me
- `ux1.js`: train
- `verbs.js`: verb
- `vocab-hub.js`: vocab
- `watch.js`: watch
- `write.js`: write

## Workflows (243) theo trigger – tên + mô tả đủ: json `workflows`
Tra: `node -e "const g=require('./docs/codemap.json');console.log(g.workflows.filter(w=>/regex/.test(w.file)).map(w=>w.file+' ['+w.triggers+'] '+w.desc).join('\n'))"`
[cron,manual] 55 · [push:main,pr,manual] 51 · [manual] 50 · [push:main,manual] 21 · [push:main,cron,manual] 15 · [push,manual] 10 · [pr,manual] 9 · [pr,cron,manual] 5 · [push:main,pr,cron,manual] 5 · [cron,manual,after-wf] 3 · [?] 2 · [call] 2 · [manual,call] 2 · [pr] 2 · [push] 2 · [after-wf] 1 · [manual,after-wf] 1 · [manual,after-wf,call] 1 · [pr,call] 1 · [pr,cron,manual,after-wf] 1 · [push:main,cron,manual,after-wf] 1 · [push:main,pr] 1 · [push:main,pr,manual,after-wf,call] 1 · [push:main,pr,manual,call] 1

## Test (578) → vùng phủ – tên + file đích đủ: json `tests`
Tra: `node -e "const g=require('./docs/codemap.json');console.log(g.tests.filter(t=>/regex|vùng/.test(t.test+t.area)).map(t=>t.file+' → '+t.targets).join('\n'))"`
`web/js` 143 · `(không rõ)` 97 · `functions/api` 69 · `scripts` 47 · `scripts/ci` 34 · `scripts/lib` 12 · `web` 12 · `web/cpack` 12 · `brand/stitch` 11 · `content/video` 9 · `scripts/quality` 9 · `scripts/video` 9 · `web/css` 8 · `extension` 7 · `scripts/native` 7 · `extension/app` 6 · `infra` 4 · `scripts/vocab-img` 4 · `.github/workflows` 3 · `brand` 3 · `content/blog` 3 · `mobile/android` 3 · `scripts/content-qa` 3 · `content/dict` 2 · `content/framework` 2 · `content/seo` 2 · `scripts/audio` 2 · `scripts/cine` 2 · `scripts/lexicon` 2 · `scripts/ops` 2 · `scripts/pron` 2 · `scripts/social` 2 · `scripts/store` 2 · `scripts/target` 2 · `scripts/teach` 2 · `scripts/top1` 2 · `web/app` 2 · `content` 1 · `content/legal` 1 · `content/lesson` 1 · `content/lexicon` 1 · `content/protection` 1 · `content/qa` 1 · `content/situations` 1 · `content/target` 1 · `mobile` 1 · `mobile/ios` 1 · `scripts/ai-golden` 1 · `scripts/cdn` 1 · `scripts/dict` 1 · `scripts/explain` 1 · `scripts/factory` 1 · `scripts/feedback` 1 · `scripts/free-tier` 1 · `scripts/grammar` 1 · `scripts/jobs` 1 · `scripts/lesson` 1 · `scripts/lipsync` 1 · `scripts/ota` 1 · `scripts/scriptbank` 1 · `scripts/sfx` 1 · `scripts/test` 1 · `web/blog` 1 · `web/data` 1 · `web/go` 1 · `web/i18n` 1 · `web/icons` 1 · `web/img` 1 · `workers/cronkick` 1 · `workers/dict` 1 · `workers/mail` 1 · `workers/push` 1

## Mô-đun JS chính (112/2531, ngoài god nodes; phần còn lại trong json) – tên: export →nạp/import ←số nơi dùng
- `functions/api/` _abuse.js: abuse,isAbusive,mask,links,riskyLinks… →- ←6 (_cm.js,_triage.js,class.js) · _clip_logic.js: STATUS,SORTS,CTYPES,SECTIONS,TEXT_KEYS… →_taxonomy.js ←5 (_social_auto.js,_social_mgr.js,admin-clips.js) · _cpm.js: HIGH_CPM,PRIORITY_LANGS,CPM_W,tierOf,tierShare… →- ←5 (admin.js,hit.js,seo-visits.js) · _d1b.js: D1B_DEFAULT_DB,d1bMode,d1bReady,REST_TIMEOUT_MS,restDb… →- ←8 (_jobs.js,admin-shared.js,drive.js) · _distribution.js: SOCIAL_DAY_MAX,MAIN_DAY,isMainLang,dayCapOf,capCfg… →- ←6 (_social_auto.js,_social_cover.js,_social_mgr.js) · _first_comment.js: SITE,FC_MODE,FC_CODE,CODE_PLAT,FC_MAX… →- ←5 (_role_meta.js,_social_auto.js,_social_preview.js) · _install_links.js: INSTALL,liveChannels,trackUrl,shortUrl,ctaLabel… →_install_data.js ←9 (_role_meta.js,_social_mgr.js,build-landing.mjs) · _keys.js: ALERT_MIN,MAIL_GAP,PROVIDERS,PROVIDER_IDS,cleanKey… →_aimix.js,_quota.js,_schema.js ←11 (_aichain.js,_meta_oauth.js,_meta_tokens.js) · _role_meta.js: SITE,PLATFORMS,fit,keywordOf,lessonUrl… →_first_comment.js,_install_links.js ←4 (_social_mgr.js,_social_preview.js,distribution.js) · _schema.js: once,_resetSchema →- ←15 (_keys.js,_meta_oauth.js,_quota.js) · _social_auto.js: AUTO_PLATS,AUTO_DEFAULT,PROVIDERS,POLICY,ownerPolicy… →_clip_logic.js,_distribution.js,_drive_state.js ←4 (social-auto.js,social.js,callback.js) · _social_mgr.js: STATES,PLAT,platOf,healthOf,contentKey… →_clip_logic.js,_distribution.js,_install_links.js ←4 (_social_auto.js,_social_preview.js,social.js) · admin-shorts.js: MANIFEST,okPath,signedPack,signed,_memo… →_body.js,_d1guard.js,_shorts_data.js ←7 (_social_auto.js,_social_mgr.js,admin-clips.js) · ai.js: gemFetch,geminiKeys,resetGeminiCache,isCooling,gemDiag… →_aichain.js,_aimix.js,_aitask.js ←3 (_social_mgr.js,admin.js,studio.js) · distribution.js: avatarUrl,AV_HOST,fetchAvatar,setupDist,clipOf… →_body.js,_clip_logic.js,_d1guard.js ←3 (_social_auto.js,social-auto.js,dryrun.mjs) · drive.js: isFootageRow,isBackupRow,isShortsRow,shortsCapacity,sha256Hex… →_backup.js,_body.js,_d1b.js ←8 (admin-shorts.js,capacity.js,callback.js) · hit.js: VO_KEYS,voRows,aeReadable,hitMode,aeHit… →_ads.js,_body.js,_cpm.js ←7 (_retention.js,admin.js,[[path]].js) · report.js: STATUSES,CATS,AREAS,LIM,tid… →_abuse.js,_body.js,_d1b.js ←2 (report-shot.js,gate.mjs) · youtube.js: REDIRECT,SCOPE_UP,SCOPE,MODES,scopeFor… →_body.js,_d1guard.js,_d1limit.js ←4 (_social_auto.js,admin-clips.js,distribution.js)
- `scripts/` build-blog.mjs: toApp,_LK_QZ_S →blog-check.mjs,links.mjs,ads-static.mjs ←1 (surfaces.mjs) · build-landing.mjs: storeHref,LANGS,copyOf,pageUrl,ROUTE_JS… →home.js,_geo.gen.js,_install_links.js ←3 (build-seo.mjs,build-stitch-css.mjs,content-registry.mjs) · build-lexicon.mjs →lib.mjs,img.mjs,ipa.mjs ←4 (content-score.mjs,publish-free.mjs,publish.mjs) · build-stitch-css.mjs: default,logical →chrome.js,build-landing.mjs,samples-ui.mjs ←2 (fmt-registry.mjs,pr-unconflict.mjs) · content-score.mjs →build-lexicon.mjs,bank-audit.mjs,grammar-map-check.mjs ←2 (merge.mjs,promote.mjs) · i18n-english.mjs: VI_ALL,has,isEnglishKey,englishSegments,missingSegments… →- ←6 (build.mjs,gen-i18n.mjs,i18n-qa.mjs) · pr-unconflict.mjs: TAKE_MAIN,LEGAL_PAGE,REGEN,UNION,GENERATED… →build-legal.mjs,build-stitch-css.mjs,build-tokens.mjs ←2 (autopilot.mjs,regen-conflicts.mjs) · world-scorecard.mjs: AXES,UXB,NOISE,parseTotal,shellScore… →content.js,i18n-qa.mjs,scan-roots.mjs ←2 (score.mjs,duolingo-lh.mjs)
- `scripts/cdn/` hosts.mjs: ACCOUNT,YEAR,IMMUTABLE,LIBRARY_CC,TYPES… →media-repos.mjs ←5 (creds.mjs,cutover.mjs,kokoro-model.mjs)
- `scripts/ci/` gh-api.mjs: FLOOR,REPO,isRateLimited,waitSeconds,ghApi →- ←8 (busy-gate.mjs,flake-tracker.mjs,prwatch.mjs)
- `scripts/content-qa/` lib.mjs: CE,VI,SCRIPT,norm,lvOk… →ai-pool.mjs ←6 (gate.mjs,build.mjs,grammar.mjs)
- `scripts/dict/` build.mjs: QUALITY_MIN,POOL,loadSources,dictPool,enrich… →content.js,shards.mjs,ads-static.mjs ←4 (build-seo-pages.mjs,links.mjs,metrics.mjs)
- `scripts/factory/` lib.mjs: STATE,rd,wj,h8,words… →ai-pool.mjs ←6 (judge-bank.mjs,comm.mjs,grammar.mjs)
- `scripts/footage/` lib.mjs: ROOT,DEFAULT_ROOT,MANIFEST_NAME,WANT,mimeOf… →library.mjs ←7 (archive.mjs,fetch.mjs,repo-size.mjs)
- `scripts/lexicon/` ipa.mjs: ALLOWED,badChars,ukStyle,ukStyleBad,fixBroken… →- ←12 (build-lexicon.mjs,gate.mjs,gen-wordlist.mjs) · shards.mjs: loadBrowserIndex,mergeExpand,buildShards,writeShards →lib.mjs,lib.mjs,bundles.js ←9 (build.mjs,wordnet.mjs,gen-newtab.mjs)
- `scripts/lib/` authority-links.mjs: AUTH_LANGS,SITE,AUTH_SLUGS,authPath,DATASET… →_install_links.js ←4 (build-authority.mjs,build-blog.mjs,build-landing.mjs) · blog-content.mjs: ROOT,CATEGORIES,config,parse,setField… →blog-images.mjs,url-guard.mjs ←14 (blog-captions.mjs,blog-check.mjs,blog-due.mjs) · blog-images.mjs: LANGS,RTL,TEMPLATE,W,BRAND… →kit.js ←4 (blog-check.mjs,blog-images.mjs,build-blog.mjs) · content-load.mjs: ROOT,DATA_DIRS,loadContent →scan-roots.mjs ←11 (bank-audit.mjs,exam-format-check.mjs,gate.mjs) · content-registry.mjs: REGISTRY,GENESIS,sha256,entryHash,readRegistry… →- ←8 (content-registry.mjs,evidence.mjs,ots.mjs) · fixed-json.mjs: fixedText,writeFixed →- ←5 (build.mjs,fmt-stable.mjs,i18n-native-score.mjs) · http.mjs: UA,ciHeaderValue,request,sameOrigin,routeCiHeader… →- ←6 (content-registry.mjs,copy-watch.mjs,swh-save.mjs) · i18n-pack.mjs: ROOT,SRC,OUT,LANGS,LAZY… →- ←14 (preview-resolve.mjs,regen-generated.mjs,build.mjs) · i18n-rules.mjs: VI,BAD,BAD_ES,INFORMAL →- ←6 (i18n-qa.mjs,i18n-rewrite.mjs,lib.mjs) · lex-files.mjs: LEX_DIRS,lexFiles,lexPath →scan-roots.mjs ←9 (fill-vocab.mjs,gen-academic.mjs,gen-newtab.mjs) · media-repos.mjs: fnv,loadRepos,openRepos,pickRepo,servingRepos →- ←5 (audio-cdn-check.mjs,hosts.mjs,forecast.mjs) · media-store.mjs: DEFAULT_ACCOUNT,TYPES,IMMUTABLE,r2Config,sha256hex… →r2-freeze.mjs ←6 (blog-images.mjs,kokoro-model.mjs,mirror.mjs) · retry5xx.mjs: BACKOFF_MS,is5xx,isNetErr,retry5xx,fetchRetry →- ←5 (mirror.mjs,autopilot.mjs,filler.mjs) · samples-visual.mjs: VIS_S,scrollBtns,art,typeArt,topicArt… →st-web.mjs ←4 (build-samples-en.mjs,build-samples.mjs,samples-ui.mjs) · scan-roots.mjs: SCAN_ROOTS,dataFiles →- ←8 (tts-sites.mjs,gate.mjs,i18n-missing.mjs) · seo-data.mjs: loadWriting,loadSpeaking,loadVocab,vocabMeta,relatedOf… →grammar.js,speaking.js,task1.js ←5 (build-samples-en.mjs,build-samples.mjs,build.mjs) · seo-pages-i18n.mjs: LANGS,S,POS,fill,YOU →- ←7 (build-authority.mjs,build-seo-pages.mjs,build-seo-verbs.mjs) · seo-words.mjs: setOf,idxW,inSet,slug,gloss… →_cpm.js,build-go.mjs,build.mjs ←6 (build-seo-pages.mjs,build-tools.mjs,enrich-queue.mjs) · st-theme-snap.mjs: oklab,roleHex,pick,snapCss,loadTokens →- ←5 (build-stitch-css.mjs,build-stitch-design-md.mjs,build-tokens.mjs) · tools-links.mjs: TOOL_LANGS,TOOL_SLUGS,toolPath,toolStrings,toolFoot… →- ←7 (build-authority.mjs,build-blog.mjs,build-seo-pages.mjs) · video-web.mjs: LANGS,MANIFEST,CAPTIONS_DIR,APPROVED,CDN… →- ←8 (build-blog.mjs,build-video-pages.mjs,embed-publish.mjs)
- `scripts/native/` gen-call.mjs: content,engineVectors,pageVectors,flow,cpg… →gen-skills.mjs,gen-teach.mjs,gen-vocab.mjs ←1 (gen.mjs) · gen-skills.mjs: hubVectors,listenVectors,playerVectors,sharedVectors,listenTestVectors… →gen-teach.mjs,gen-vocab.mjs,test10.js ←5 (gen-call.mjs,gen-learn.mjs,gen-speak.mjs) · gen-speak.mjs: content,SPEAK_PACK_PATH,speakPack,speakStarter,STRING_FILES… →_aitask.js,gen-skills.mjs,gen-teach.mjs ←1 (gen.mjs) · gen-teach.mjs: TEACHERS,BUNDLED_POSES,HEAD_FILE,rigVectorText,teachGen… →cues.js,lipsync.js,characters.js ←7 (gen-call.mjs,gen-learn.mjs,gen-skills.mjs) · gen-vocab.mjs: NOW,slice,miniData,mkEnv,mkApp… →fake-idb.mjs,gen-teach.mjs,web-ref.mjs ←4 (gen-call.mjs,gen-skills.mjs,gen-speak.mjs) · gen.mjs →content-pack.mjs,content-schema.mjs,gen-audio.mjs ←0
- `scripts/ops/` lib.mjs: arg,sleep,distinctDrives,sha256File,downloadCopy… →lib.mjs,library.mjs ←8 (code-bundle.mjs,d1-backup.mjs,d1-restore.mjs)
- `scripts/scriptbank/` lib.mjs: DIR,h8,TYPES,CAT,HOOK_TYPES… →lib.mjs,ipa.mjs,lib.mjs ←7 (build.mjs,build.mjs,translate.mjs)
- `scripts/sentence-audio/` corpus.mjs: collect →lex-files.mjs,scan-roots.mjs,calls-lot3.js ←5 (coverage.mjs,gen-audio.mjs,merge.mjs) · lib.mjs: IDX,S2,readIndex,writeIndex,readLedger… →keyset.mjs,audio-index.js ←8 (audio-cdn-check.mjs,coverage.mjs,learnability.mjs)
- `scripts/target/` lib.mjs: ROOT,MEAN_LANGS,POS,seedPath,coreFiles… →i18n-rules.mjs ←14 (grammar-map-check.mjs,build.mjs,calls-check.mjs) · tl-gen.mjs: TL_GEN →- ←5 (grammar-map-check.mjs,conj-check.mjs,drill-pack.mjs)
- `scripts/video/` lib.mjs: tokens,norm,evenTiming,matchWords,layoutLines… →_install_links.js ←4 (motion.mjs,render.mjs,template.mjs)
- `scripts/vocab-img/` gen.mjs: slug,NEURONS_PER_IMG,PROVIDERS,Safety,MODELS… →cf-direct.mjs,strict.mjs,style.mjs ←4 (judge.mjs,photo.mjs,scene-gen.mjs) · strict.mjs: fnv,STRICT_V,COLORS,SHAPES,ICONIC… →style.mjs ←8 (cards.mjs,gen.mjs,icons.mjs) · style.mjs: STYLE,PEOPLE,fnv,promptFor,altFor… →- ←12 (cards.mjs,concept.mjs,gen.mjs)
- `scripts/word-audio/` kokoro.mjs: SR,DTYPE,loadKokoro,clip,trim… →- ←6 (gen-word-audio.mjs,render-es.mjs,render.mjs)
- `web/` sw.js →ads.js,app.js,assist.js ←1 (world-scorecard.mjs)
- `web/cpack/es-app/` day-ui.js: esDayMark,esday →dy-ar.js,dy-de.js,dy-en.js ←1 (bundles.js)
- `web/cpack/mediation/` index.js →m01.js,m02.js,m03.js ←1 (bundles.js)
- `web/cpack/speak/s/` airport-checkin.js →airport-checkin.ar.js,airport-checkin.de.js,airport-checkin.es.js ←1 (data.js) · ask-directions.js →ask-directions.ar.js,ask-directions.de.js,ask-directions.es.js ←1 (data.js) · bank.js →bank.ar.js,bank.de.js,bank.es.js ←1 (data.js) · bus-ticket.js →bus-ticket.ar.js,bus-ticket.de.js,bus-ticket.es.js ←1 (data.js) · cafe.js →cafe.ar.js,cafe.de.js,cafe.es.js ←1 (data.js) · car-rental.js →car-rental.ar.js,car-rental.de.js,car-rental.es.js ←1 (data.js) · cinema-tickets.js →cinema-tickets.ar.js,cinema-tickets.de.js,cinema-tickets.es.js ←1 (data.js) · client-complaint.js →client-complaint.ar.js,client-complaint.de.js,client-complaint.es.js ←1 (data.js) · deadline-extension.js →deadline-extension.ar.js,deadline-extension.de.js,deadline-extension.es.js ←1 (data.js) · dentist.js →dentist.ar.js,dentist.de.js,dentist.es.js ←1 (data.js) · emergency-room.js →emergency-room.ar.js,emergency-room.de.js,emergency-room.es.js ←1 (data.js) · flat-viewing.js →flat-viewing.ar.js,flat-viewing.de.js,flat-viewing.es.js ←1 (data.js) · group-project.js →group-project.ar.js,group-project.de.js,group-project.es.js ←1 (data.js) · gym-signup.js →gym-signup.ar.js,gym-signup.de.js,gym-signup.es.js ←1 (data.js) · hairdresser.js →hairdresser.ar.js,hairdresser.de.js,hairdresser.es.js ←1 (data.js) · it-helpdesk.js →it-helpdesk.ar.js,it-helpdesk.de.js,it-helpdesk.es.js ←1 (data.js) · job-interview.js →job-interview.ar.js,job-interview.de.js,job-interview.es.js ←1 (data.js) · landlord-repair.js →landlord-repair.ar.js,landlord-repair.de.js,landlord-repair.es.js ←1 (data.js) · laundry.js →laundry.ar.js,laundry.de.js,laundry.es.js ←1 (data.js) · library.js →library.ar.js,library.de.js,library.es.js ←1 (data.js)
- `web/js/` admin-chart.js: AdminChart →- ←6 (admin.html,admin-ads.js,admin-growth.js) · admin-sync.js: AdminSync →- ←6 (admin-accounts.js,admin-clips.js,admin-drive.js) · admin.js: AdminUI →admin-accounts.js,admin-ads.js,admin-backlinks.js ←1 (admin.html) · bundles.js →calls-lot3.js,calls-lot4.js,t1.js ←5 (shards.mjs,bundles.mjs,fmt-registry.mjs) · core.js →app.js ←9 (content-pack.mjs,gen-lesson.mjs,gen-sync.mjs) · grammar.js: grammar →ar.js,de.js,es.js ←4 (build-icons.mjs,seo-data.mjs,gen-learn.mjs) · roleplay.js: RP,roleplay →app.js,sync.js ←5 (client.mjs,gen-speak.mjs,bundles.js) · speaking.js: SPEAK_MORE,speakBank,speakMerge,cleanup,speaking →app.js ←6 (build-samples-en.mjs,build-samples.mjs,seo-data.mjs) · task1.js: TASK1_MORE,task1,cleanup →app.js,assist.js ←5 (build-samples-en.mjs,seo-data.mjs,gen-vocab.mjs) · ui.js →app.js,human.js ←9 (ipa-audit.mjs,gen-audio.mjs,gen-call.mjs) · ux1.js: Ux1,teacherImg,navOf,crumb,afterRoute… →app.js,league.js,common.js ←7 (build-stitch-css.mjs,app.js,bundles.js) · write.js: WRITE_MORE,WRITE_PROMPTS,cleanup,write →app.js,assist.js ←6 (build-samples-en.mjs,build-samples.mjs,seo-data.mjs)
- `web/js/call/` lipsync.js: default →- ←7 (call_cues.mjs,cues_cli.mjs,drawn_frames.mjs)
- `web/js/lib/` qr.js: LKQR →- ←5 (bundles.js,handoff.js,install-sheet.js)
- `web/js/speak/` data.js →airport-checkin.js,ask-directions.js,bank.js ←3 (gen-speak.mjs,build.mjs,bundles.js)
- `workers/dict/` render.mjs: SITE,DICT_PATH,ENABLED,hubPath,wordPath… →ad-slot.mjs ←5 (build.mjs,links.mjs,metrics.mjs)
