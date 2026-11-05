# iOS M1 – string IDs to add to `native/shared/strings.json`

Owner of the file: Node/coordinator (iOS agent does not edit `native/shared/**`). Append these entries, then run
`node scripts/native/gen.mjs` – it regenerates `L10nKey.swift/.kt` + 15 language JSONs.

**Every Vietnamese key below already exists in the web i18n pipeline with all 15 languages** (checked 05/11 by loading
`web/js/i18n/en.js` + `web/js/i18n/en/*.js` + `i18n/ui/<lang>{.js,/}` exactly like gen.mjs does; 0 missing). No new copy, no translation
written by hand. The Swift code in `native/ios/LexkiteKit/Sources/LKFeatures` already references these typed cases
(`L10nKey.todayFocus`, …) – **it does not compile until gen has run with this list** (one-source rule: no literals in views).

```json
  "action.cancel": "Hủy",
  "action.retry": "Thử lại",
  "action.later": "Để sau",
  "action.loading": "Đang tải…",
  "today.target": "Mục tiêu điểm",
  "today.setGoal": "Đặt mục tiêu",
  "today.streakDays": "Số ngày chuỗi",
  "today.xp": "XP",
  "today.goalShort": "Mục tiêu",
  "today.focus": "Trọng tâm hôm nay",
  "today.plan": "Kế hoạch hôm nay",
  "today.review": "Ôn tập",
  "today.quick": "Luyện nhanh · 1 phút",
  "today.allDrills": "Mọi bài luyện",
  "today.mistakes": "Lỗi sai",
  "today.words": "Từ vựng cần ôn",
  "today.listening": "Nghe hiểu",
  "today.audioSprint": "Nghe nhanh",
  "today.speaking": "Nói",
  "today.pronDrill": "Bài luyện phát âm",
  "today.readinessLevel": "Mức sẵn sàng",
  "today.stories": "Truyện & âm thanh",
  "today.viewLibrary": "Xem thư viện",
  "today.path": "Lộ trình học của bạn",
  "today.toCurrent": "Tới bài hiện tại →",
  "today.lookUp": "Tra từ",
  "today.greetMorning": "Chào buổi sáng!",
  "today.greetAfternoon": "Chào buổi chiều!",
  "today.greetEvening": "Chào buổi tối!",
  "today.sayPlanDue": "{g} Hôm nay còn {a} việc trong kế hoạch và {b} từ cần ôn.",
  "today.sayPlan": "{g} Hôm nay còn {a} việc trong kế hoạch.",
  "today.sayDue": "{g} Hôm nay có {b} từ cần ôn.",
  "today.sayDone": "{g} Bạn đã xong kế hoạch hôm nay – tuyệt vời!",
  "today.fading": "{n} từ đang phai dần",
  "today.reviewNow": "Ôn ngay ({m} phút)",
  "today.toFix": "{n} cần sửa",
  "today.dueN": "{n} đến hạn",
  "today.minutes": "{n} phút",
  "today.lessonOf": "Bài {a}/{b}",
  "today.unitN": "Chặng học {n}",
  "today.weekDone": "{a}/7 đã xong",
  "today.streakOn": "Chuỗi đang cháy",
  "today.streakStart": "Học hôm nay để bắt đầu chuỗi",
  "today.goalReached": "Đã đạt mục tiêu ngày",
  "today.cardsLeft": "Còn {n} thẻ",
  "today.ready": "Sẵn sàng {p}%",
  "today.noPrediction": "Chưa có điểm dự đoán",
  "today.start": "Bắt đầu",
  "today.goalsN": "{n} mục tiêu",
  "today.current": "Việc hiện tại",
  "today.inProgress": "Đang làm",
  "path.done": "Đã xong",
  "path.learning": "Đang học",
  "path.locked": "Đã khóa",
  "path.milestone": "Mốc",
  "path.lesson": "Bài học",
  "auth.google": "Đăng nhập với Google",
  "auth.apple": "Đăng nhập với Apple",
  "auth.signIn": "Đăng nhập",
  "auth.signOut": "Đăng xuất",
  "auth.pitch": "Đăng nhập miễn phí để giữ chuỗi ngày, XP và từ đã học – học tiếp trên mọi thiết bị.",
  "auth.failed": "Không đăng nhập được: {msg}",
  "auth.switchAccount": "Máy này đang có dữ liệu học của tài khoản khác.\n\nOK = gộp dữ liệu trên máy vào tài khoản này\nHủy = chỉ dùng dữ liệu của tài khoản này",
  "auth.delete": "Xóa tài khoản",
  "auth.deleteTitle": "Xóa tài khoản Lexkite?",
  "auth.deleteWhat": "Những gì sẽ bị xóa vĩnh viễn trên máy chủ:",
  "auth.deleteData": "Dữ liệu học đã đồng bộ (flashcard, tiến độ, XP, chuỗi ngày học)",
  "auth.deleteProfile": "Hồ sơ tài khoản (tên, email) và tài khoản đăng nhập Lexkite",
  "auth.deleteLeague": "Dữ liệu bảng xếp hạng",
  "auth.deleteLocal": "Xóa cả dữ liệu học trên máy này",
  "auth.deleteSure": "Tôi hiểu thao tác này không thể hoàn tác",
  "auth.deleteGo": "Xóa vĩnh viễn",
  "auth.deleteReauth": "Để bảo mật, hãy đăng nhập lại một lần nữa để xác nhận.",
  "auth.deleting": "Đang xóa…",
  "auth.deleted": "Đã xóa tài khoản của bạn.",
  "sync.synced": "Đã đồng bộ dữ liệu học",
  "sync.paused": "Đồng bộ tạm nghỉ – dữ liệu vẫn trên máy.",
  "sync.syncing": "Đang đồng bộ…",
  "sync.now": "Đồng bộ ngay",
  "sync.backedUp": "Đã sao lưu dữ liệu lên tài khoản"
```

Note for gen.mjs: `auth.switchAccount` contains real newlines (`\n` in JSON) – the web key is the same string with newlines.

---

# iOS C17 (first-run onboarding) – string IDs to add to `native/shared/strings.json`

Same procedure as above (coordinator appends, runs `node scripts/native/gen.mjs`; `LKFeatures/Onboarding/*` does not compile before that).
Reused existing ids (do NOT add again): `action.continue` (Tiếp tục), `action.back` (Quay lại), `me.progress` (Tiến độ), `today.goalShort` (Mục tiêu), `app.name`.

NEW copy (vi source from `brand/stitch/v3/app/onboarding-README.md`; needs the i18n pipeline for the 14 other languages):
```json
  "onb.lang.title": "Ngôn ngữ mẹ đẻ của bạn?",
  "onb.lang.sub": "Chúng tôi sẽ giải nghĩa và hướng dẫn bằng ngôn ngữ này.",
  "onb.lang.search": "Tìm ngôn ngữ",
  "onb.welcome.start": "Bắt đầu",
  "onb.ready.cta": "Vào bài học đầu tiên"
```
Web keys that already exist in all 15 languages (web #608 / tracks.js / lazyui.js; the Vietnamese key IS the web key):
```json
  "onb.common.skip": "Bỏ qua",
  "onb.welcome.haveAccount": "Tôi đã có tài khoản",
  "onb.welcome.kicker": "Nền tảng học từ vựng IELTS, TOEIC & tiếng Anh thực chiến",
  "onb.welcome.h1a": "Từ vựng vững,",
  "onb.welcome.h1b": "band điểm bứt phá.",
  "onb.welcome.hello": "Chào bạn, mình là Ama! Vài câu hỏi nhanh để mình lên lộ trình riêng cho bạn nhé.",
  "onb.free": "Miễn phí · Dữ liệu học thuộc về bạn",
  "onb.goal.q": "Mục tiêu của bạn là gì?",
  "onb.goal.sub": "Chọn 1 gói – có thể học thêm gói khác sau.",
  "onb.track.comm": "Giao tiếp hằng ngày",
  "onb.track.commSub": "Nói tự tin ở quán cà phê, sân bay, khách sạn, cửa hàng, phòng khám…",
  "onb.track.ieltsSub": "Từ học thuật, dạng câu Reading & Listening, Writing Task 1–2, Speaking Part 1–3",
  "onb.track.toeicSub": "Luyện Part 1–7, từ vựng công sở TSL và các bẫy hay gặp",
  "onb.track.work": "Tiếng Anh công sở",
  "onb.track.workSub": "Email, họp, gọi điện, phỏng vấn và cách đề nghị lịch sự",
  "onb.level.q": "Trình độ hiện tại của bạn?",
  "onb.level.say": "Chưa chắc trình độ? Làm bài kiểm tra 5 phút để mình xếp đúng chặng.",
  "onb.level.test": "Làm bài kiểm tra đầu vào",
  "onb.level.word": "Trình độ",
  "onb.pace.q": "Bạn muốn học với cường độ nào?",
  "onb.pace.say": "Đều đặn mỗi ngày là bí quyết nhớ lâu!",
  "onb.pace.easy": "Nhẹ nhàng",
  "onb.pace.easySub": "5 phút/ngày · 5 từ mới",
  "onb.pace.steady": "Đều đặn",
  "onb.pace.steadySub": "10–15 phút/ngày · 10 từ mới",
  "onb.pace.fast": "Tăng tốc",
  "onb.pace.fastSub": "25 phút/ngày · 20 từ mới",
  "onb.ready.q": "Lộ trình của bạn",
  "onb.ready.say": "Lộ trình của bạn đã sẵn sàng! Học Ngày 1 ngay – không cần tài khoản.",
  "onb.ready.sayTest": "Lộ trình đã sẵn sàng! Làm bài kiểm tra 5 phút rồi học Ngày 1 – không cần tài khoản."
```
Notes: the native Ready step drops the web reminder-time row (notification permission is asked after the first lesson – hook `OnboardingFlow.askNotificationsAfterFirstLessonKey`);
the web "target score" step is not a native step (default `examTarget` per exam is written, changeable later in Goal). Brand names (IELTS/TOEIC/TOEFL 2026), language endonyms and CEFR/Band labels are data, not strings.
Art (no SF-symbol fallbacks any more): `LexkiteMark` = the exact brand mark, generated into `LKDesign/Resources/Assets.xcassets` from `brand/lexkite-mark.svg`; the teacher is the web Ama still (`TeacherStill`, bundled poses generated from `web/teach/ama`, other poses from the CDN + disk cache). Both come from `node scripts/native/gen.mjs`.
