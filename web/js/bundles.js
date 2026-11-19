/* 📦 Đăng ký gói tải lười: tên gói → danh sách tệp (js/… · cpack/…), nạp theo thứ tự này. TẠI ĐÂY (không phải app.js) để PR thêm nội dung không làm phình khung app (trần 374 KB gz).
 * app.js nạp tệp này LƯỜI lần đầu có App.need(...) (và lúc rảnh); mọi tệp test/công cụ đọc qua scripts/lib/bundles.mjs. Thêm tệp nội dung → thêm vào ĐÚNG gói ở đây. Một gói một dòng. */
(function (g) {
  const G = 'js/grammar/';
  g.LK_BUNDLES = {
    demo: ['js/app-demo.js'],
    mvar: ['js/mistake-variant.js'], // Mini-test biến thể từ Sổ lỗi sai (#/mistakes?variant=1 + gợi ý trên Hôm nay)
    grammar: ['js/i18n/en/arrange.js', 'js/word-arrange.js', 'js/structures.js', ...['tenses', 'verbs', 'sentences', 'foundation', 'cpack/grammar/starter.js', 'cpack/grammar/lazy-a1.js', 'cpack/grammar/academic.js', 'cpack/grammar/lazy-c2.js', 'chapters', 'cpack/grammar/book2.js', 'drills-a', 'drills-b', 'cpack/grammar/drills-c.js', 'cpack/grammar/drills-own.js', 'bank-gen', 'check'].map(f => f.startsWith('cpack/') ? f : G + f + '.js'), 'js/grammar.js'],
    // 12 bài A1 / 10 bài C2 (~29 KB nén mỗi gói): chỉ tải khi mở bài của cấp đó; gói 'grammar' mang mục lục gọn lazy-a1/c2.js (scripts/grammar/build-lazy-idx.mjs)
    grammarA1: ['cpack/grammar/starter2.js'],
    grammarC2: ['cpack/grammar/mastery.js'],
    pas: ['js/i18n/en/v2.js', 'js/i18n/en/speak.js', 'js/st/common.js', 'js/st/v2/runtime.js', 'js/st/v2/pas-sit.js', 'js/st/v2/pas-drill.js', 'js/characters.js', 'js/speak/data.js', 'js/speak/score.js', 'js/speak/app.js'], // 🎙️ Play & Speak (cờ speak_pack, docs/specs/play-and-speak.md)
    pron: ['js/i18n/en/pron.js', 'cpack/pron/sounds.js', 'cpack/pron/skills.js', 'js/pron/pairs.js', 'js/pron/sayit.js', 'js/pron/coach.js', 'js/pron/rhythm.js', 'js/st/v2/runtime.js', 'js/st/v2/pron-hub.js', 'js/pron.js'],
    shadow: ['js/speak/score.js', 'js/pron/shadow.js'], // Nói đuổi liên tục (nút trong pron/rhythm.js)
    words: ['js/lib/topics-more.js', 'js/lib/skills.js', 'js/lib/awl.js', 'js/lib/ngsl.js', 'js/lib/ngsl2.js', 'js/lib/office.js', 'js/distract.js'], // 4 kho từ (~145 KB nén) – không chặn trang đầu, tải khi cần/lúc rảnh
    readings: ['js/reading.js', 'js/readings.js', 'cpack/readings/more.js', 'js/choice-kit.js', 'js/exam-clock.js', 'js/cbt.js', 'js/method.js'], // 30 bài đọc – chỉ tải khi cần (trang chủ tự điền mục "Bài đọc hôm nay")
    l1: ['cpack/grammar-l1/ar.js', 'cpack/grammar-l1/de.js', 'cpack/grammar-l1/es.js', 'cpack/grammar-l1/fr.js', 'cpack/grammar-l1/hi.js', 'cpack/grammar-l1/id.js', 'cpack/grammar-l1/ja.js', 'cpack/grammar-l1/ko.js', 'cpack/grammar-l1/pt.js', 'cpack/grammar-l1/ru.js', 'cpack/grammar-l1/th.js', 'cpack/grammar-l1/tr.js', 'cpack/grammar-l1/vi.js', 'cpack/grammar-l1/zh.js'], // ghi chú "vì sao sai" theo tiếng mẹ đẻ – grammar.js nạp đúng 1 gói theo ngôn ngữ giao diện (L1_PACK), KHÔNG prefetch cả 14
    klocal: ['js/klocal.js'], // Kokoro trên máy cho chữ chưa có file dựng sẵn (docs/specs/kokoro-on-device.md) – tự quyết có nạp mô hình hay không
    voice: ['js/listen/kvoice.js', 'js/listen/audio-index.js'], // danh mục giọng Kokoro: mọi lần phát âm từ/câu dùng giọng chất lượng cao nếu có
    handsfree: ['js/handsfree.js'],
    reflex: ['js/reflex.js'],
    watch: ['js/i18n/en/watch.js', 'js/watch-topics.js', 'js/watch.js'], // 🎬 Học qua video (#/watch) – docs/specs/video-learn.md
    handoff: ['js/lib/qr.js', 'js/handoff.js'], // 📲 chuyển dữ liệu bằng mã QR, không cần đăng nhập (mã hóa trên máy)
    roleplay: ['js/i18n/en/rpbasic.js', 'js/roleplay/data-everyday.js', 'js/roleplay/data-a.js', 'js/roleplay/data-b.js', 'cpack/roleplay/data-lot1.js', 'cpack/roleplay/data-lot2.js', 'js/roleplay.js'], // Roleplay: 6 tình huống hằng ngày A1–A2 + 10 kịch bản công sở
    say: ['js/i18n/en/v2.js', 'js/i18n/en/say.js', 'js/i18n/en/share.js', 'js/st/v2/runtime.js', 'js/st/v2/shell.js', 'js/st/v2/say-front.js', 'js/st/v2/say-back.js', 'js/say.js'], // 🗣️ Say it like a native: thẻ phản xạ 2 mặt, khung Stitch v2 say-front/back (docs/SAY-NATIVE.md)
    call: ['js/i18n/en/v2.js', 'js/st/v2/runtime.js', 'js/st/v2/teacher-call.js', 'js/pron/pairs.js', 'js/listen/kvoice.js', 'js/lesson/engine.js', 'js/say-text.js', 'js/lesson/teacher.js', 'js/call/calls.js', 'js/call/calls-exam.js', 'js/call/calls-lot1.js', 'js/call/calls-lot2.js', 'cpack/call/calls-lot3.js', 'cpack/call/calls-lot4.js', 'js/call/engine.js', 'js/call/endpoint.js', 'js/call/fillers.js', 'js/call/rt.js', 'js/call.js'], // Call Ama/Carlos: cuộc gọi luyện nói rẽ nhánh, giáo viên khớp môi (docs/CALL.md); khung Stitch v2 teacher-call
    ai: ['js/ai.js'], // AI chấm bài/giải thích (15 KB gz) – tải lười ngay lần gọi AI đầu tiên; shim window.AI trong app.js giữ mọi chỗ dò `window.AI`
    struct: ['js/structures.js'], // VBStruct cho popup dịch (phrases.js) – thiếu khóa này App.need('struct') ném TypeError
    // Mục tiêu & kế hoạch: tải lười (khung app chạm trần 380 KB)
    courses: ['js/courses.js'],
    goal: ['js/i18n/en/goal.js', 'js/st/common.js', 'js/st/goal.js', 'js/goal.js'],
    paraphrase: ['js/lib/paraphrase-data.js', 'js/paraphrase.js'],
    listening: ['js/choice-kit.js', 'js/qengine.js', 'js/i18n/en/qtips.js', 'js/qtips.js', ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => `js/listen/test${n}.js`), 'cpack/listen/test9.js', 'cpack/listen/test10.js', 'cpack/listen/test11.js', 'js/listen/kvoice.js', 'js/listen/audio-index.js', 'js/exam-clock.js', 'js/listening.js'],
    writing: ['js/i18n/en/ideast.js', 'cpack/write/task2-more.js', 'cpack/write/task2-more4.js', 'cpack/write/task1-more.js', 'js/write/task1-more2.js', 'cpack/write/task1-more3.js', 'cpack/write/ideas.js', 'js/write.js', 'js/task1.js', 'cpack/write/models.js', 'cpack/write/models2.js', 'cpack/write/models3.js', 'cpack/write/models4.js', 'cpack/write/models5.js', 'cpack/write/models8.js', 'js/write/gt-letters.js', 'js/letters.js', 'js/ideas.js', 'js/phrases-model.js'],
    mock: ['js/choice-kit.js', 'js/qengine.js', 'js/i18n/en/qtips.js', 'js/qtips.js', 'js/readtest/_i.js', 'js/readtest/test1.js', 'js/readtest/test2.js', 'js/readtest/test3.js', 'js/readtest/test4.js', 'js/readtest/test5.js', 'js/readtest/test6.js', 'js/readtest/test7.js', 'js/readtest/test8.js', 'js/readtest/test9.js', 'js/readtest/test10.js', 'js/readtest/explain-a.js', 'js/readtest/explain-b.js', 'js/readtest/explain-c.js', 'js/readtest/explain-d.js', 'js/readtest/explain-e.js', 'js/readtest/explain-f.js', 'js/readtest/explain-g.js', 'js/readtest/gt1.js', 'js/readtest/gt2.js', 'js/readtest/explain-gt.js', 'cpack/readtest/gt3.js', 'cpack/readtest/gt6.js', 'cpack/readtest/rt11.js', 'cpack/readtest/rt12.js', 'js/mock.js', 'js/rtype.js', 'js/speech-session.js'],
    dist: ['js/distract.js'],
    lcard: ['cpack/lesson/why.js', 'cpack/lesson/card.js'],
    tsl: ['js/lib/tsl-a.js', 'js/lib/tsl-b.js', 'js/lib/domain-a.js', 'js/lib/domain-b.js', 'js/lib/exam-vocab.js', 'js/lib/exam-vocab2.js', 'js/lib/exam-vocab3.js', 'js/lib/nawl.js', 'js/lib/bsl.js'],
    speak: ['js/i18n/en/speakt.js', 'js/listen/kvoice.js', 'js/listen/audio-index.js', 'cpack/speak/samples.js', 'cpack/speak/samples2.js', 'cpack/speak/more2.js', 'cpack/speak/more3.js', 'cpack/speak/more4.js', 'js/speak/more.js', 'js/speech-session.js', 'js/speaking.js'],
    qstats: ['js/qengine.js', 'js/i18n/en/qtips.js', 'js/qtips.js', 'cpack/qstats/week.js'],
    pbook: ['cpack/framework/functions.js', 'cpack/framework/phrase-book.js'], // 🗣️ Sổ mẫu câu theo chức năng: nạp khi mở mục trong #/phrases lần đầu (scripts/framework/build-functions.mjs)
    mediate: ['js/i18n/en/mediate.js', 'js/characters.js', 'js/listen/kvoice.js', 'js/listen/audio-index.js', 'js/mediate-core.js', 'cpack/mediation/index.js', 'js/mediate.js'], // 🤝 Trung gian (docs/specs/mediation.md §2): bài mở thêm cpack/mediation/<id>.js lúc vào
    retcards: ['cpack/ret-app/cards.js'], // thẻ quay lại + tuần qua của trang chủ (retention.js Ret.home)
    cambridge: ['js/i18n/en/cambridge.js', 'js/choice-kit.js', 'js/qengine.js', 'cpack/cambridge/rubric.js', 'cpack/cambridge/a2/t1.js', 'cpack/cambridge/a2/t2.js', 'cpack/cambridge/a2/t3.js', 'cpack/cambridge/b1/t1.js', 'cpack/cambridge/b1/t2.js', 'cpack/cambridge/b1/t3.js', 'cpack/cambridge/b2/t1.js', 'cpack/cambridge/b2/t2.js', 'cpack/cambridge/b2/t3.js', 'cpack/cambridge/c1/t1.js', 'cpack/cambridge/c1/t2.js', 'cpack/cambridge/c2/t1.js', 'cpack/cambridge/c2/t2.js', 'js/cambridge.js'], // Cambridge A2–C2 (docs/specs/cambridge.md): thêm đề mới = thêm 1 đường dẫn ở đây
    toefl: ['js/i18n/en/arrange.js', 'js/word-arrange.js', 'js/choice-kit.js', 'js/qengine.js', 'js/i18n/en/qtips.js', 'js/qtips.js', 'cpack/toefl/data1.js', 'cpack/toefl/data2.js', 'cpack/toefl/data3.js', 'cpack/toefl/data4.js', 'cpack/toefl/data5.js', 'cpack/toefl/data6.js', 'cpack/toefl/data7.js', 'cpack/toefl/data8.js', 'cpack/toefl/data9.js', 'cpack/toefl/data10.js', 'cpack/toefl/data11.js', 'js/toefl.js'],
    toeic: ['js/choice-kit.js', 'js/qengine.js', 'js/i18n/en/qtips.js', 'js/qtips.js', 'js/toeic/reading1.js', 'js/toeic/reading2.js', 'js/toeic/listening1.js', 'js/toeic/listening2.js', 'js/toeic/reading3.js', 'js/toeic/listening3.js', 'js/toeic/reading4.js', 'js/toeic/listening4.js', 'js/toeic/reading5.js', 'js/toeic/listening5.js', 'js/toeic/reading6.js', 'js/toeic/listening6.js', 'js/toeic/reading7.js', 'js/toeic/listening7.js', 'cpack/toeic/reading8.js', 'cpack/toeic/listening8.js', 'cpack/toeic/reading9.js', 'cpack/toeic/listening9.js', 'cpack/toeic/reading10.js', 'cpack/toeic/listening10.js', 'js/toeic/sw1.js', 'cpack/toeic/sw2.js', 'js/toeic.js'],
    // 🏫 Lớp học (giáo viên/học sinh)
    nxs: ['js/i18n/en/nextstep.js', 'js/next-step.js'],
    league: ['js/league.js'],
    classroom: ['js/i18n/en/classroom.js', 'js/classroom.js'],
    criteria: ['js/i18n/en/criteria.js', 'js/criteria.js'],
    resources: ['js/i18n/en/resources.js', 'js/resources.js'], // 🌐 Tài nguyên miễn phí (tách khỏi khung)
    pnodes: ['js/i18n/en/pathn.js', 'cpack/lesson/path-nodes.js'], // nội dung nút Lộ trình (dữ liệu + bản dịch lười, ngoài gói ngôn ngữ web/js)
    psheet: ['js/st/v2/path-sheet.js'],
    // 🚀 thiết lập lần đầu từng bước (chuỗi ở en/pathx.js) // 🏁 Màn thưởng cuối bước lộ trình (path.js gọi khi xong lượt)
    pathx: ['js/i18n/en/pathx.js', 'js/path-reward.js', 'js/tracks.js', 'js/path-mix.js', 'js/path-day.js'],
    onb: ['js/i18n/en/v2.js', 'js/st/common.js', 'js/st/v2/runtime.js', 'js/st/v2/onb-goal.js', 'js/st/v2/onb-lang.js', 'js/st/v2/onb-level.js', 'js/st/v2/onb-target.js', 'js/st/v2/onb-pace.js', 'js/st/v2/onb-ready.js', 'js/characters.js', 'js/onboard.js'],
    welcome: ['js/i18n/en/v2.js', 'js/st/common.js', 'js/st/v2/runtime.js', 'js/st/v2/welcome.js', 'js/st/v2/welcome-desk.js', 'js/characters.js', 'js/welcome.js'],
    notices: ['js/i18n/en/notices.js', 'js/notices.js'], // 🔔 Chuông thông báo người học (tải lười sau khi vẽ trang) // 📋 Tiêu chí chấm IELTS Writing & Speaking
    ota: ['js/i18n/en/ota.js', 'js/ota-key.js', 'js/ota.js'], // 🔄 cập nhật OTA + nhắc cập nhật app (chỉ app gốc, docs/OTA.md)
    // ⚙️ Cài đặt (tách khỏi khung 23/10)
    remind: ['js/i18n/en/remind.js', 'js/remind.js'],
    mail: ['cpack/mail-app/mail.js'], // email nhắc học (remind.js mailSync)
    install: ['js/i18n/en/install.js', 'js/install-sheet.js'], // 📲 mời cài app ở khoảnh khắc giá trị (docs/INSTALL-GROWTH.md)
    settings: ['js/settings.js'],
    // 🔥 lớp giữ thói quen – luôn nạp cùng gói 'streak' (mỗi file chỉ thuộc 1 gói) struct: ['js/structures.js'], // 🧩 nhận diện cấu trúc (tải lười, ra khỏi khung app 20/10)
    streak: ['js/streak-ui.js'],
    ret: ['js/i18n/en/ret.js', 'js/retention.js'],
    // 📖 trang Từ điển #/dict (tách khỏi app.js 01/11)
    dictp: ['js/i18n/en/v2.js', 'js/st/v2/runtime.js', 'js/st/v2/dict.js', 'js/dict-page.js'],
    statsp: ['js/stats-page.js'],
    // 🔤 Chia động từ · ✍️ Sửa ngữ pháp
    vcore: ['js/verbs-core.js'],
    verbs: ['js/verbs.js'],
    irregular: ['js/i18n/en/v2.js', 'js/characters.js', 'js/st/v2/runtime.js', 'js/st/v2/shell.js', 'cpack/irregular/table.js'],
    irvdrill: ['cpack/irregular/drill.js'],
    fixer: ['js/writecheck-rules.js', 'js/fixer.js'],
    // 📘 Cách dùng từ (dữ liệu theo nhóm, usage.js tự gọi App.need)
    uidx: ['js/usage-index.js'],
    usage: ['js/i18n/en/usage.js', 'js/choice-kit.js', 'js/usage-core.js', 'js/usage.js'],
    uP: ['js/usage/prep-adj.js', 'js/usage/prep-verb.js', 'js/usage/prep-noun.js'],
    uV: ['js/usage/verb.js'],
    uA: ['js/usage/adv.js'],
    uS: ['js/usage/struct.js'],
    uC: ['js/usage/pair.js'],
    placement: ['js/placement.js'], // 🧭 Kiểm tra đầu vào thích ứng (ước tính band + khoảng tin cậy)
    outcome: ['js/i18n/en/outcomes.js', 'js/writecheck-rules.js', 'cpack/outcomes/forms.js', 'cpack/outcomes-app/outcomes-core.js', 'cpack/outcomes-app/outcomes.js'],
    // 🇪🇸 Luyện tiếng TBN (spanish-course.md W2b); dữ liệu cpack/es
    espr: ['js/i18n/en/espr.js', 'js/i18n/en/lesson.js', 'js/i18n/en/v2.js', 'js/st/common.js', 'js/st/lesson.js', 'js/st/v2/runtime.js', 'js/st/v2/lesson-question.js', 'js/st/v2/feedback-correct.js', 'js/st/v2/feedback-wrong.js', 'js/st/v2/lesson-complete.js', 'js/qengine.js', 'cpack/es/dr.js', 'cpack/es/px.js', 'js/espr.js', 'cpack/es-app/pron-ui.js'],
    calles: ['cpack/es/cl.js'],
    esx: ['cpack/es-app/exam-ui.js'],
    esday: ['cpack/es/dy.js', 'cpack/es/wd.js', 'cpack/es-app/day-ui.js'],
    lvideo: ['js/i18n/en/lvideo.js', 'js/lib/video-rank.js', 'js/lesson-video.js'], // 🎬 Video bài học (thẻ từ, ngữ pháp, ngày học) – docs/VIDEO-SCALE-PLAN.md §10
    vimg: ['js/vocab-img.js'], // 🖼️ Ảnh minh họa theo nghĩa – CHỈ tải khi cờ vocab_img bật (App.vimgReady), khung app +0
    wordcard: ['js/wordcard.js'], // 🧠 Khối "Hiểu sâu" của thẻ từ (mẹo nhớ · lỗi sai/đúng · dùng khi thi · họ từ)
    ailocal: ['js/ai-local.js'], // 🔒 AI trên máy (Chrome/Edge built-in AI) – chỉ tải khi một tính năng AI cần, xem docs/AI-LOCAL.md
    anki: ['js/lib/save-file.js', 'js/anki.js'], // 🃏 Xuất/nhập Anki (.apkg/.txt/.csv) – chỉ tải khi mở hộp thoại Anki
    impdeck: ['cpack/importdeck-app/freq-rank.js', 'cpack/importdeck-app/importdeck.js'], // 📥 cờ importdeck
    share: ['js/lib/qr.js', 'js/lib/save-file.js', 'js/share-card.js'],
    xport: ['js/export.js'],
    file: ['js/lib/save-file.js'],
    lsw: ['js/lang-menu.js'],
    quick: ['js/i18n/en/quick.js', 'js/quick.js'],
    pgames: ['js/i18n/en/rhythm.js', 'js/study-games.js', 'js/pron/coach.js', 'cpack/play-app/play-blitz.js', 'cpack/play-app/play-rhythm.js'], // ⚡ Thử thách 60 giây (docs/specs/play-learn.md)
    rmodes: ['js/i18n/en/rmodes.js', 'js/study-modes.js'], // 🔁 Ôn tập đa chế độ (Gõ phản xạ · Nghe chọn nghĩa) + ✍️ thẻ "Câu của bạn" [P2-1.2/P2-1.1-UI]
    swipe: ['js/study-swipe.js'], // ⚡ Ghép thẻ + 🎙️ Phát âm · 👆 vuốt thẻ + 🐦 Kit mini (G2)
    wfeed: ['js/i18n/en/wfeed.js', 'js/widget-feed.js'], // 📱 widget "Từ mỗi giờ" (chỉ app gốc – native.js nạp)
    lfx: ['js/i18n/en/lfx.js', 'js/choice-kit.js', 'js/lesson-fx.js'],
    adoffer: ['js/i18n/en/adoffer.js', 'js/ad-offers.js'], // 🎁 Cơ hội 2 · x2 XP ở thẻ kết quả (docs/ADS.md §1c)
    i18nx: ['structs', 'toefl', 'league', 'call', 'handoff'].map(n => `js/i18n/en/${n}.js`), // chuỗi giao diện trang tải lười (xem App.need)
    i18nl: ['verbs', 'exams', 'skills', 'lazyui'].map(n => `js/i18n/en/${n}.js`), // chuỗi Chia động từ/Sửa ngữ pháp, đề thi, Ngữ pháp/Speaking/Phát âm (ra khỏi en.js 27/10; add-on không cần nên tách khỏi i18nx)
    skillsv2: ['js/st/v2/skills.js', 'js/skills-hub.js'], // 🎯 tab Kỹ năng (Stitch v2), ngoài khung app
    // 🧩 Bài học trộn bài tập nhỏ (cờ lesson_mix, docs/LESSON-ENGINE.md) · gold bank cho "Giải thích"
    ux1: ['js/i18n/en/ux1.js', 'js/say-text.js', 'js/i18n/en/v2.js', 'js/st/common.js', 'js/st/home.js', 'js/st/v2/runtime.js', 'js/st/v2/shell.js', 'js/path-trail.js', 'js/st/v2/path.js', 'js/st/v2/review.js', 'js/st/v2/practice.js', 'js/st/v2/leagues.js', 'js/st/v2/me.js', 'js/st/v2/streak.js', 'js/st/v2/exam-readiness.js', 'js/st/v2/today.js', 'js/st/v2/today-new.js', 'js/st/v2/today-desk.js', 'js/st/v2/today-rail.js', 'js/ux1.js', 'js/ux1-me.js'],
    lesson: ['js/i18n/en/lesson.js', 'js/i18n/en/v2.js', 'js/st/common.js', 'js/st/lesson.js', 'js/st/v2/runtime.js', 'js/st/v2/lesson-question.js', 'js/st/v2/feedback-correct.js', 'js/st/v2/feedback-wrong.js', 'js/st/v2/lesson-complete.js', 'js/st/v2/story-duo.js', 'js/listen/kvoice.js', 'js/lesson/engine.js', 'js/i18n/en/arrange.js', 'js/word-arrange.js', 'js/lesson/teacher.js', 'cpack/lesson/stories.js', 'cpack/lesson/path-nodes.js', 'js/lesson/ui.js'],
    lgold: ['cpack/lesson/gold.js'],
    dayv2: ['js/i18n/en/v2.js', 'js/st/v2/runtime.js', 'js/st/v2/day.js', 'js/characters.js'], // 📅 Khung Stitch v2 của trang buổi học #/day/N (path-day.js page)
    vhub: ['js/st/v2/vocab-hub.js', 'js/vocab-hub.js'], // 📚 Tab Từ vựng
    ghub: ['js/i18n/en/v2.js', 'js/st/v2/runtime.js', 'js/st/v2/grammar.js'], // 📐 Hub Ngữ pháp (khung Stitch v2 grammar; mã dựng dữ liệu nằm trong gói grammar)
    confidence: ['js/i18n/en/confidence.js', 'cpack/confidence/data.js', 'js/speech-session.js', 'js/confidence.js'], // 🔥 Nhịp buổi học: chuỗi đúng liền, lỗi chính tả nhỏ, Giải thích, thẻ số liệu cuối lượt, tạm tắt nghe/nói, chế độ khó
  };
})(window);
