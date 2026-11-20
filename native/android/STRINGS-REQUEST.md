# Android M1 – new string IDs (merge into native/shared/strings.json, then `node scripts/native/gen.mjs`)

Every Vietnamese key below is copied from web code that already calls `t()` with it (web/js/st/v2/today.js + brand/stitch/v2/bind/today.json,
web/js/ux1.js home2/homeBase, web/js/sync.js) – so the web i18n pipeline already has the 14 translations; no new copy.
The Kotlin code already uses the generated enum names (`today.sayDue` → `L10nKey.todaySayDue`), so `:design` compiles only after this merge.
If gen reports a key missing in a language, add it via the web pipeline (docs/I18N-PIPELINE.md) – do not rename the id.

```json
{
  "app.name": "Lexkite",
  "top.search": "Tra từ",
  "top.notifications": "Thông báo",
  "top.language": "Chọn ngôn ngữ giao diện",
  "today.target": "Mục tiêu điểm",
  "today.setGoal": "Đặt mục tiêu",
  "today.streakDays": "Số ngày chuỗi",
  "today.xp": "XP",
  "today.goalShort": "Mục tiêu",
  "today.focus": "Trọng tâm hôm nay",
  "today.morning": "Chào buổi sáng!",
  "today.afternoon": "Chào buổi chiều!",
  "today.evening": "Chào buổi tối!",
  "today.sayDue": "{g} Hôm nay có {b} từ cần ôn.",
  "today.sayDone": "{g} Bạn đã xong kế hoạch hôm nay – tuyệt vời!",
  "today.lesson": "Bài học",
  "today.plan": "Kế hoạch hôm nay",
  "today.review": "Ôn tập",
  "today.reviewCards": "Ôn {a}/{b} thẻ",
  "today.fading": "{n} từ đang phai dần",
  "today.reviewNow": "Ôn ngay ({m} phút)",
  "today.quick": "Luyện nhanh · 1 phút",
  "today.allDrills": "Mọi bài luyện",
  "today.mistakes": "Lỗi sai",
  "today.toFix": "{n} cần sửa",
  "today.words": "Từ vựng cần ôn",
  "today.dueN": "{n} đến hạn",
  "today.listening": "Nghe hiểu",
  "today.audioSprint": "Nghe nhanh",
  "today.speaking": "Nói",
  "today.pronDrill": "Bài luyện phát âm",
  "today.week": "Chuỗi 7 ngày",
  "acct.title": "Tài khoản & đồng bộ",
  "acct.pitch": "Sao lưu flashcard, XP, chuỗi ngày học và học tiếp trên mọi thiết bị.",
  "acct.google": "Tiếp tục với Google",
  "acct.apple": "Tiếp tục với Apple",
  "acct.free": "Miễn phí · chỉ lưu dữ liệu học của bạn · có thể đăng xuất bất cứ lúc nào",
  "acct.signedIn": "Tài khoản: {name}",
  "acct.signOut": "Đăng xuất",
  "acct.signedOut": "Đã đăng xuất – dữ liệu vẫn còn trên máy này",
  "acct.signInFail": "Không đăng nhập được: {msg}",
  "acct.otherAccount": "Máy này đang có dữ liệu học của tài khoản khác.\n\nOK = gộp dữ liệu trên máy vào tài khoản này\nHủy = chỉ dùng dữ liệu của tài khoản này",
  "action.ok": "OK",
  "action.cancel": "Hủy",
  "sync.now": "Đồng bộ ngay",
  "sync.running": "Đang đồng bộ…",
  "sync.done": "Đã đồng bộ {time}",
  "sync.paused": "Đồng bộ tạm nghỉ – dữ liệu vẫn trên máy.",
  "sync.offline": "Ngoại tuyến – sẽ tự đồng bộ khi có mạng",
  "sync.error": "Lỗi đồng bộ: {msg}",
  "sync.justNow": "vừa xong"
}
```

---

# Android C17 (first-run onboarding) – ids for `native/shared/strings.json`

Same ids as `native/ios/STRINGS-REQUEST.md` (iOS C17) so both apps share one table; only the three marked NEW are Android-only additions.
Already existing, reused (not added again): `action.continue`, `action.back`, `me.progress`, `today.goalShort`, `today.target`, `app.name`.
`:feature-onboarding` does not compile before the merge + `node scripts/native/gen.mjs`. Every Vietnamese value below is an existing web key (web #608 / tracks.js / lazyui.js), except `onb.lang.*`, `onb.welcome.start`, `onb.ready.cta`, copied from `brand/stitch/v3/app/onboarding-README.md`.

```json
  "onb.lang.title": "Ngôn ngữ mẹ đẻ của bạn?",
  "onb.lang.sub": "Chúng tôi sẽ giải nghĩa và hướng dẫn bằng ngôn ngữ này.",
  "onb.lang.search": "Tìm ngôn ngữ",
  "onb.welcome.start": "Bắt đầu",
  "onb.ready.cta": "Vào bài học đầu tiên",
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
  "onb.ready.sayTest": "Lộ trình đã sẵn sàng! Làm bài kiểm tra 5 phút rồi học Ngày 1 – không cần tài khoản.",
  "onb.welcome.lead": "Học 15 phút mỗi ngày với flashcard thông minh, trò chơi, bài đọc và luyện phát âm. Mọi từ đều có phiên âm chuẩn Anh–Anh, nghĩa tiếng Việt và câu ví dụ IELTS.",
  "onb.say.goalPick": "Tuyệt! Mình sẽ chọn bài hợp với mục tiêu {name}.",
  "onb.say.levelPick": "Được rồi, mình bắt đầu từ {lv} nhé."
```
NEW (Android only, last three: `onb.welcome.lead`, `onb.say.goalPick`, `onb.say.levelPick`). Brand names (IELTS, TOEIC, TOEFL 2026), the TOEFL task names, exam variant chips (Academic, General Training, Listening & Reading, Speaking & Writing), CEFR and Band labels are data in `OnboardingModel.kt` (identical in every language, as on web), not string ids.
