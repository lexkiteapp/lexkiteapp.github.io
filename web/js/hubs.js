/* Trung tâm điều hướng: 5 mục chính trên mọi nền tảng (Hôm nay · Từ vựng · Kỹ năng · Thi thử · Tôi),
 * chọn kỳ thi (IELTS / IELTS General / TOEIC / TOEFL / Tiếng Anh nền tảng) → các trang trung tâm tự lọc nội dung theo kỳ thi.
 * Trang trung tâm chỉ dẫn đường (không tải gói nặng) → mở tức thì. Mọi đường dẫn cũ vẫn giữ nguyên. */
(function () {
  const { $, $$, esc, toast } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;

  const EXAMS = {
    ielts: { short: 'IELTS', name: 'IELTS Academic', ic: '🎓' },
    ieltsgt: { short: 'IELTS GT', name: 'IELTS General Training', ic: '🧳' },
    toeic: { short: 'TOEIC', name: 'TOEIC Listening & Reading', ic: '💼' },
    toefl: { short: 'TOEFL', name: 'TOEFL iBT', ic: '🏛️' },
    general: { short: 'General', get name() { return t('Tiếng Anh nền tảng'); }, ic: '🌱' },
  };
  // Kỳ thi đang chọn: cài đặt → mục tiêu đã đặt → đã làm bài kiểm tra IELTS → mặc định IELTS
  App.exam = () => { const s = state.settings; const e = s.exam || (s.goal && s.goal.exam) || 'ielts'; return EXAMS[e] ? e : 'ielts'; };
  App.EXAMS = EXAMS;
  App.setExam = async e => { if (!EXAMS[e]) return; state.settings.exam = e; await App.saveSettings(); if (window.Sync) Sync.schedule(); App.updateExamChip(); toast(EXAMS[e].ic + ' ' + EXAMS[e].name); App.route(); };
  App.updateExamChip = () => { const b = document.getElementById('examChip'); if (!b) return; const x = EXAMS[App.exam()]; b.innerHTML = `<span aria-hidden="true">${x.ic}</span> ${esc(x.short)} <span class="chev" aria-hidden="true">▾</span>`; b.title = t('Kỳ thi của bạn') + ': ' + x.name; };
  App.examPicker = () => {
    const cur = App.exam();
    UI.modal(`<h2 style="margin-top:0">${t('Bạn đang luyện kỳ thi nào?')}</h2><p class="muted small">${t('Nội dung Kỹ năng, Thi thử và kế hoạch hôm nay sẽ theo kỳ thi này. Đổi kỳ thi không xóa dữ liệu.')}</p>
      <div class="exam-list">${Object.entries(EXAMS).map(([k, x]) => `<button type="button" class="exam-opt ${k === cur ? 'on' : ''}" data-exam="${k}"><span class="em" aria-hidden="true">${x.ic}</span><span><b>${esc(x.name)}</b><small>${esc(EXAM_DESC()[k])}</small></span>${k === cur ? '<span class="tick" aria-hidden="true">✓</span>' : ''}</button>`).join('')}</div>`);
    $$('.exam-opt').forEach(b => b.onclick = () => { UI.closeModal(); if (b.dataset.exam !== cur) App.setExam(b.dataset.exam); });
  };
  const EXAM_DESC = () => ({ ielts: t('Du học, định cư – 4 kỹ năng, band 0–9'), ieltsgt: t('Định cư, làm việc – viết thư ở Task 1'), toeic: t('Công sở – Nghe & Đọc, 10–990 điểm'), toefl: t('Du học Mỹ – bản 2026, band 1–6'), general: t('Giao tiếp & nền tảng, chưa thi chứng chỉ') });
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#examChip')) App.examPicker(); });

  // ---------- Khối dựng dùng chung ----------
  const card = (href, ic, title, desc, meta = '') => `<a class="card hover hub-card" href="${href}"><span class="hub-ic" aria-hidden="true">${ic}</span><span class="hub-tx"><b>${title}</b><small>${desc}</small></span>${meta ? `<span class="hub-meta">${meta}</span>` : ''}</a>`;
  const head = (h1, sub, extra = '') => `<div class="page-head"><div><h1>${h1}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div>${extra}</div>`;
  const sect = (title, html) => `<h3 class="set-h hub-h">${title}</h3><div class="hub-grid">${html}</div>`;
  const examBtn = () => `<button type="button" class="btn sm ghost" data-exam-pick>${EXAMS[App.exam()].ic} ${esc(EXAMS[App.exam()].short)} · ${t('Đổi')}</button>`;
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-exam-pick]')) App.examPicker(); });
  const cnt = o => Object.keys(o || {}).length;

  // ---------- Từ vựng ----------
  routes.vocab = function () {
    const { total } = Core.Cards.dueCount(state.cards, state.settings, state.stats);
    const deck = Object.values(state.cards), mastered = deck.filter(c => c.srs && c.srs.interval >= 21).length;
    const ex = App.exam();
    view.innerHTML = head('📚 ' + t('Từ vựng'), t('Học từ mới, ôn đúng lúc sắp quên và tra cứu nhanh.'))
      + `<a class="card hover hub-hero" href="#/review"><span class="hub-ic" aria-hidden="true">🃏</span><span class="hub-tx"><b>${total ? t('Ôn {n} thẻ hôm nay', { n: total }) : t('Không còn thẻ cần ôn – học từ mới nhé')}</b><small>${t('Ôn đúng lúc sắp quên giúp nhớ lâu gấp nhiều lần')}</small></span><span class="btn primary sm">${total ? t('Ôn ngay') : t('Học từ mới')} →</span></a>`
      + sect(t('Học & ôn'), card('#/path', '🗺️', t('Lộ trình từ vựng'), t('Từng chặng nhỏ, mở khóa dần theo trình độ'))
        + card('#/library' + (ex === 'toeic' ? '?g=toeic' : ''), '📖', t('Thư viện từ'), t('Bộ từ theo chủ đề, kỳ thi và trình độ'))
        + card('#/deck', '📒', t('Sổ từ của tôi'), t('{n} từ · {m} từ đã thuộc', { n: deck.length, m: mastered }))
        + card('#/practice', '⚡', t('Trò chơi từ vựng'), t('Ghép thẻ, gõ từ, nghe – gõ, trắc nghiệm')))
      + sect(t('Tra cứu'), card('#/dict', '🔎', t('Từ điển'), t('Phát âm, nghĩa, ví dụ, lưu thành thẻ'))
        + card('#/verb', '🔤', t('Chia động từ'), t('Mọi thì, bị động, cách đọc -ed/-s'))
        + card('#/usage', '📘', t('Cách dùng từ'), t('Giới từ đi kèm, to-V/V-ing, trạng từ, từ dễ nhầm'))
        + card('#/phrases', '🧩', t('Cụm từ & cấu trúc'), t('Collocation và cấu trúc ăn điểm')));
  };

  // ---------- Kỹ năng ----------
  const SK = {
    listening: { ic: '🎧', name: () => t('Nghe hiểu') },
    reading: { ic: '📰', name: () => t('Đọc hiểu') },
    writing: { ic: '✍️', name: () => t('Viết') },
    speaking: { ic: '🗣️', name: () => t('Nói') },
  };
  // Nội dung từng kỹ năng theo kỳ thi: [đường dẫn, biểu tượng, tên, mô tả]
  const TOEFL_T = (k, ic, n, d) => ['#/toefl-p/' + k, ic, n, d];
  const CONTENT = {
    listening: {
      ielts: () => [['#/listening', '🎧', t('Luyện theo phần'), t('Part 1–4, có transcript và giải thích')], ['#/practice/listen', '⌨️', t('Nghe – gõ từ'), t('Nghe từ trong sổ và gõ lại')]],
      toeic: () => [['#/toeic', '💼', t('TOEIC Part 1–4'), t('Mô tả tranh, hỏi – đáp, hội thoại, bài nói')]],
      toefl: () => [TOEFL_T('response', '💬', 'Listen and Choose a Response', t('Chọn câu đáp phù hợp')), TOEFL_T('conversation', '👥', 'Listen to a Conversation', t('Hội thoại đời sống')), TOEFL_T('announcement', '📢', 'Listen to an Announcement', t('Thông báo trong trường')), TOEFL_T('talk', '🎓', 'Listen to an Academic Talk', t('Bài giảng ngắn'))],
      general: () => [['#/listening', '🎧', t('Luyện nghe'), t('Bài nghe theo trình độ, có transcript')], ['#/practice/listen', '⌨️', t('Nghe – gõ từ'), t('Nghe từ trong sổ và gõ lại')]],
    },
    reading: {
      ielts: () => [['#/reading', '📰', t('Bài đọc theo trình độ'), t('30 bài, có thể làm ở chế độ thi trên máy')], ['#/rtype', '🎯', t('Luyện theo dạng câu hỏi'), t('True/False/Not Given, Matching, điền từ…')], ['#/paraphrase', '🔁', t('Luyện paraphrase'), t('Nhận ra cách bài đọc diễn đạt lại từ khóa câu hỏi')], ['#/cbt', '🖥️', t('Đọc trên máy tính'), t('Giao diện như thi IELTS trên máy')]],
      toeic: () => [['#/toeic', '💼', t('TOEIC Part 5–7'), t('Điền câu, điền đoạn, đọc hiểu')]],
      toefl: () => [TOEFL_T('cw', '🧩', 'Complete the Words', t('Điền chữ còn thiếu')), TOEFL_T('daily', '📱', 'Read in Daily Life', t('Tin nhắn, thông báo, email')), TOEFL_T('academic', '📚', 'Read an Academic Passage', t('Đoạn văn học thuật ngắn'))],
      general: () => [['#/reading', '📰', t('Bài đọc theo trình độ'), t('Đọc vừa sức, lưu từ mới kèm câu gốc')]],
    },
    writing: {
      ielts: () => [['#/task1', '📈', t('Task 1 – Biểu đồ'), t('Mô tả số liệu, có bài mẫu')], ['#/write', '✍️', 'Writing Task 2', t('Viết luận, AI chấm theo 4 tiêu chí')], ['#/ideas', '💡', t('Ngân hàng ý tưởng'), t('Ý tưởng và từ vựng theo chủ đề')], ['#/models', '📄', t('Bài mẫu band 8'), t('Có đánh dấu cụm từ hay và từ nối')]],
      ieltsgt: () => [['#/letters', '✉️', t('Task 1 – Viết thư'), t('Thư trang trọng, bán trang trọng, thân mật')], ['#/write', '✍️', 'Writing Task 2', t('Viết luận, AI chấm theo 4 tiêu chí')], ['#/ideas', '💡', t('Ngân hàng ý tưởng'), t('Ý tưởng và từ vựng theo chủ đề')], ['#/models?t=gt', '📄', t('Thư mẫu band 8'), t('Có đánh dấu cụm từ hay và từ nối')]],
      toefl: () => [TOEFL_T('sentence', '🧱', 'Build a Sentence', t('Sắp xếp từ thành câu')), TOEFL_T('email', '📧', 'Write an Email', t('Viết email theo tình huống')), TOEFL_T('discussion', '💬', 'Write for an Academic Discussion', t('Thảo luận trên lớp học trực tuyến'))],
      general: () => [['#/write', '✍️', t('Luyện viết'), t('Viết đoạn văn, AI sửa lỗi và gợi ý')], ['#/phrases', '🧩', t('Cụm từ & cấu trúc'), t('Cấu trúc hay dùng')]],
    },
    speaking: {
      ielts: () => [['#/speaking/p1', '🙂', 'Speaking Part 1', t('Câu hỏi quen thuộc về bản thân')], ['#/speaking/p2', '⏱️', 'Speaking Part 2', t('Nói 2 phút theo thẻ đề')], ['#/speaking/p3', '🧠', 'Speaking Part 3', t('Thảo luận sâu, nêu quan điểm')]],
      toefl: () => [TOEFL_T('repeat', '🔁', 'Listen and Repeat', t('Nghe và nhắc lại câu')), TOEFL_T('interview', '🎙️', 'Take an Interview', t('Trả lời phỏng vấn ngắn'))],
      general: () => [['#/speaking/p1', '🙂', t('Luyện nói'), t('Trả lời câu hỏi đời thường, ghi âm và nghe lại')], ['#/pron', '🔤', t('Phát âm'), t('Âm khó, trọng âm, nối âm')]],
    },
  };
  CONTENT.listening.ieltsgt = CONTENT.listening.ielts; CONTENT.reading.ieltsgt = CONTENT.reading.ielts; CONTENT.speaking.ieltsgt = CONTENT.speaking.ielts;
  const FIX = () => ['#/fix', '✍️', t('Sửa ngữ pháp'), t('Dán đoạn văn – gạch chân lỗi, sửa 1 chạm')];
  const RP = () => ['#/roleplay', '💼', t('Roleplay công sở'), t('Đóng vai họp, phỏng vấn, đàm phán với AI')], CALL = () => ['#/call', '📞', t('Gọi cho Mia'), t('Cuộc gọi video luyện nói, sửa lỗi nhẹ nhàng')];
  const itemsFor = (sk, ex) => (CONTENT[sk][ex] || (() => null))();
  const tiles = list => list.map(([h, ic, n, d]) => card(h, ic, esc(n), d)).join('');

  routes.skills = function () {
    const ex = App.exam(), g = state.game || {};
    const done = { listening: cnt(g.listenDone), reading: cnt(g.readDone), grammar: cnt(g.grammarDone), pron: cnt(g.pronDone) };
    const skillCard = k => { const list = itemsFor(k, ex); return list ? card('#/skill/' + k, SK[k].ic, SK[k].name(), list.map(x => esc(x[2])).slice(0, 3).join(' · '), done[k] ? t('{n} bài đã làm', { n: done[k] }) : '') : ''; };
    const off = Object.keys(SK).filter(k => !itemsFor(k, ex));
    view.innerHTML = head('🎯 ' + t('Kỹ năng'), t('Luyện từng kỹ năng theo đúng dạng bài của kỳ thi bạn chọn.'), examBtn())
      + `<a class="card hover hub-hero" href="#/courses"><span class="hub-ic" aria-hidden="true">📚</span><span class="hub-tx"><b>${t('Khóa học theo lộ trình')}</b><small>${t('Học theo chương, tự đánh dấu hoàn thành, luôn biết bài tiếp theo')}</small></span><span class="chev" aria-hidden="true">›</span></a>`
      + `<div class="hub-grid">${Object.keys(SK).map(skillCard).join('')}
        ${card('#/grammar', '📐', t('Ngữ pháp'), t('Bài học ngắn kèm bài tập'), done.grammar ? t('{n} bài đã làm', { n: done.grammar }) : '')}
        ${card('#/pron', '🔤', t('Phát âm'), t('Âm khó, trọng âm, chấm phát âm từ'), done.pron ? t('{n} bài đã làm', { n: done.pron }) : '')}</div>`
      + (off.length ? `<p class="small muted" style="margin-top:.8rem">${t('{exam} không thi {skills}.', { exam: EXAMS[ex].short, skills: off.map(k => SK[k].name()).join(', ') })} <a href="#/skill/${off[0]}">${t('Vẫn muốn luyện?')}</a></p>` : '')
      + sect(t('Ôn lại'), card('#/mistakes', '📕', t('Sổ lỗi sai'), t('Làm lại các câu đã sai để không sai lần nữa'))
        + card('#/tests', '🏁', t('Thi thử'), t('Làm đề đầy đủ có tính giờ khi đã sẵn sàng')));
  };

  routes.skill = function (k) {
    if (!SK[k]) { location.replace(location.pathname + location.search + '#/skills'); return; }
    const ex = App.exam(), mine = (x => k === 'speaking' ? [...(x || []), RP(), CALL()] : k === 'writing' && x ? [...x, FIX()] : x)(itemsFor(k, ex));
    const others = Object.keys(EXAMS).filter(e => e !== ex && e !== 'general' && itemsFor(k, e) && !(e === 'ieltsgt' && ex === 'ielts' && k !== 'writing') && !(e === 'ielts' && ex === 'ieltsgt' && k !== 'writing'));
    view.innerHTML = head(SK[k].ic + ' ' + SK[k].name(), mine ? t('Dạng bài {exam}', { exam: EXAMS[ex].name }) : t('{exam} không thi kỹ năng này – bạn vẫn có thể luyện theo kỳ thi khác bên dưới.', { exam: EXAMS[ex].short }), examBtn())
      + (mine ? `<div class="hub-grid">${tiles(mine)}</div>` : '')
      + (others.length ? `<details class="hub-more" ${mine ? '' : 'open'}><summary>${t('Kỳ thi khác')}</summary>${others.map(e => `<h3 class="set-h hub-h">${EXAMS[e].ic} ${esc(EXAMS[e].name)}</h3><div class="hub-grid">${tiles(itemsFor(k, e))}</div>`).join('')}</details>` : '')
      + `<p class="small muted" style="margin-top:1rem">🏁 ${t('Muốn làm đề đầy đủ có tính giờ?')} <a href="#/tests">${t('Đến Thi thử')} →</a></p>`;
  };

  // ---------- Thi thử ----------
  routes.tests = async function () {
    const ex = App.exam(), g = state.game || {};
    const mocks = await Core.Store.get('mocks', []);
    const toeic = (g.toeicTests || []).slice(-5).reverse(), lb = g.listenBest || {};
    const T = {
      ielts: [card('#/mock', '🏁', t('Thi thử IELTS 4 kỹ năng'), t('Nghe – Đọc – Viết – Nói, có quy đổi band')), card('#/listening', '🎧', t('Đề Listening 40 câu'), t('Chọn đề ở trang Luyện nghe, làm như thi thật')), card('#/cbt', '🖥️', t('Đề Reading trên máy (60 phút)'), t('3 passage, giao diện như thi trên máy'))],
      toeic: [card('#/toeic', '💼', t('Đề TOEIC đầy đủ'), t('Listening & Reading, quy đổi điểm 10–990'))],
      toefl: [card('#/toefl', '🏛️', t('Luyện theo phần TOEFL iBT'), t('Reading, Listening, Writing, Speaking theo đúng dạng bài 2026'))],
      general: [card('#/grammar/mix?n=40', '📐', t('Kiểm tra ngữ pháp 40 câu'), t('Trộn mọi chủ điểm, chấm ngay'))],
    };
    T.ieltsgt = T.ielts;
    const rows = [...mocks.slice(0, 5).map(m => [m.date || m.at, 'IELTS', t('Thi thử 4 kỹ năng'), m.overall != null ? 'Band ' + m.overall : '']),
      ...toeic.map(x => [x.at || x.date, 'TOEIC', t('Đề {n}', { n: x.n }), x.total + '/990']),
      ...Object.entries(lb).map(([n, b]) => ['', 'IELTS', 'Listening Test ' + n, 'Band ' + b])].slice(0, 8);
    const fmt = d => { if (!d) return ''; try { return new Date(d).toLocaleDateString(I18N.lang()); } catch (e) { return ''; } };
    view.innerHTML = head('🏁 ' + t('Thi thử'), t('Làm đề đầy đủ có tính giờ để biết mình đang ở đâu.'), examBtn())
      + `<div class="hub-grid">${card('#/placement', '🧭', t('Kiểm tra trình độ (5 phút)'), state.settings.placement ? t('Làm lại để cập nhật trình độ') : t('Biết ngay trình độ để có lộ trình phù hợp'))}${(T[ex] || T.ielts).join('')}</div>`
      + `<h3 class="set-h hub-h" id="history">📈 ${t('Lịch sử điểm')}</h3>`
      + (rows.length ? `<div class="set-list">${rows.map(r => `<div class="set-row"><div class="set-l"><span>${esc(r[2])}</span><small>${esc(r[1])}${fmt(r[0]) ? ' · ' + fmt(r[0]) : ''}</small></div><div class="set-c"><b>${esc(r[3])}</b></div></div>`).join('')}</div>`
        : `<div class="card empty-note"><p class="muted" style="margin:0">${t('Chưa có bài thi nào. Làm bài kiểm tra trình độ 5 phút để bắt đầu.')}</p></div>`)
      + `<details class="hub-more"><summary>${t('Kỳ thi khác')}</summary><div class="hub-grid">${Object.keys(T).filter(e => e !== ex && e !== 'ieltsgt' && !(ex === 'ieltsgt' && e === 'ielts')).map(e => T[e].join('')).join('')}</div></details>`;
  };

  // ---------- Tôi ----------
  // Lối vào trang Quản trị: chỉ hiện khi máy chủ xác nhận email là admin (ADMIN_EMAILS) – người khác không thấy
  // CSS trang Tôi + thẻ tài khoản tải lười (css/me.css) – chờ tối đa 1,5 s để không nháy bố cục, lỗi mạng vẫn vẽ
  let meCssP = null;
  App.meCss = () => meCssP || (meCssP = new Promise(res => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/me.css'; l.dataset.meCss = 1; l.onload = l.onerror = () => res(); setTimeout(res, 1500); document.head.appendChild(l); }));
  routes.me = async function () {
    await App.meCss();
    const u = state.user, g = state.game || {}, cards = state.cards || {};
    const L = Game.levelOf(g.xp || 0), streak = App.streak();
    const fi = (window.Core && Core.Stats) ? Core.Stats.freezeInfo(g) : { left: +g.freezes || 0, max: 2 };
    const freezeLeft = fi.left;
    const totalC = Object.keys(cards).length;
    // Từ vựng: Đã lưu / Đang học / Đã thuộc (khoảng ôn ≥ 21 ngày – cùng thước đo trang Từ vựng) / Cần ôn hôm nay
    const deck = Object.values(cards).filter(c => c && c.srs);
    const masteredC = deck.filter(c => c.srs.interval >= 21).length;
    const learningC = deck.filter(c => (c.srs.reps > 0 || c.srs.last) && !(c.srs.interval >= 21)).length;
    const dueC = totalC ? Core.Cards.dueCount(cards, state.settings, state.stats).due : 0;
    const forgettingC = (App.forgetting ? App.forgetting() : []).length;
    const exKey = App.exam ? App.exam() : 'ielts';
    const examObj = EXAMS[exKey] || { ic: '🎓', short: 'IELTS', name: 'IELTS Academic' };
    const xpPct = Math.min(100, Math.max(4, Math.round(L.into / L.need * 100)));

    let openMistakes = 0;
    try {
      const list = (window.Core && Core.Store) ? await Core.Store.get('mistakes', []) : [];
      openMistakes = (list || []).filter(x => !x.fixed).length;
    } catch (e) { openMistakes = 0; }

    // Không để mạng chậm chặn hiển thị: chờ tối đa 0,5 s (kết quả đã đệm theo phiên nên lần sau tức thì)
    const cap = p => Promise.race([p, new Promise(r => setTimeout(() => r(false), 500))]);
    const [isAdmin, blogOn] = await Promise.all([
      cap(App.isAdmin ? App.isAdmin().catch(() => false) : false),
      cap(App.blogLive ? App.blogLive().catch(() => false) : false)
    ]);

    const row = (href, ic, label, hint = '', ext = false, badge = '') => `
      <a class="set-row me-row" href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>
        <div class="me-row-left">
          <span class="me-icon-box" aria-hidden="true">${ic}</span>
          <div class="set-l">
            <span class="me-row-title">${label}</span>
            ${hint ? `<small>${hint}</small>` : ''}
          </div>
        </div>
        <div class="me-row-right">
          ${badge ? badge : ''}
          <span class="chev" aria-hidden="true">${ext ? '↗' : '›'}</span>
        </div>
      </a>`;

    view.innerHTML = `<div class="set-wrap">` + head(t('Tôi'), '')
      + `<div class="card me-head">
          <div class="me-avatar-wrap">
            <span class="avatar lg">${u && u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc(((u && (u.displayName || u.email)) || 'L')[0].toUpperCase())}</span>
            ${streak > 0 ? `<span class="me-streak-flame" role="img" aria-label="${t('Chuỗi {n} ngày', { n: streak })}" title="${t('Chuỗi {n} ngày', { n: streak })}"><span aria-hidden="true">🔥 ${streak}</span></span>` : ''}${freezeLeft ? `<button type="button" class="streak-freeze-badge" data-streak-freeze aria-label="${t('{n} lượt đóng băng chuỗi', { n: freezeLeft })}" title="${t('Đóng băng chuỗi: còn {n}/{max} lượt', { n: freezeLeft, max: fi.max || 2 })}">🧊×${freezeLeft}</button>` : ''}
          </div>
          <div class="me-tx">
            <div class="me-name-row">
              <b class="me-name" title="${esc((u && u.displayName) || '')}">${esc(window.Sync && Sync.nice ? Sync.nice((u && u.displayName) || t('Bạn')) : (u && u.displayName) || t('Bạn'))}</b>
              <span class="me-exam-badge">${examObj.ic} ${esc(examObj.short)}</span>
            </div>
            <div class="me-title-chip"><span aria-hidden="true">👑</span><span>${esc(L.title || '')}</span><span class="me-lv">${t('Cấp {n}', { n: L.level || 1 })}</span></div>
            <div class="me-xp-container">
              <div class="me-xp-bar"><div class="me-xp-fill" style="width:${xpPct}%"></div></div>
              <div class="me-xp-sub">
                <span>${t('{a}/{b} XP tới cấp {n}', { a: L.into, b: L.need, n: L.level + 1 })}</span>
                <span>⭐ ${t('Tổng {xp} XP', { xp: (g.xp || 0).toLocaleString(I18N.lang()) })}</span>
              </div>
            </div>
          </div>
        </div>
${window.Sync && Sync.renderBox ? `<section class="card me-acct" id="meAcct" aria-label="${esc(t('Tài khoản & đồng bộ'))}"></section>` : ''}
        <section class="card me-vocab" aria-labelledby="meVocH">
          <div class="me-vocab-head"><h2 id="meVocH">📚 ${t('Từ vựng')}</h2>${totalC ? `<a class="me-more" href="#/deck">${t('Sổ từ của tôi')} <span aria-hidden="true">›</span></a>` : ''}</div>
          ${totalC ? `<ul class="me-stats">
            <li><a class="me-stat" href="#/deck"><b>${totalC.toLocaleString(I18N.lang())}</b><span>${t('Đã lưu')}</span></a></li>
            <li><a class="me-stat" href="#/deck"><b>${learningC.toLocaleString(I18N.lang())}</b><span>${t('Đang học')}</span></a></li>
            <li><a class="me-stat good" href="#/deck"><b>${masteredC.toLocaleString(I18N.lang())}</b><span>${t('Đã thuộc')}</span></a></li>
            <li><a class="me-stat${dueC ? ' due' : ''}" href="#/review"><b>${dueC.toLocaleString(I18N.lang())}</b><span>${t('Cần ôn hôm nay')}</span></a></li>
          </ul>` : `<div class="me-empty"><p class="muted small">${t('Lưu từ khi tra cứu hoặc học theo lộ trình – Lexkite nhắc bạn ôn đúng lúc sắp quên.')}</p><a class="btn primary me-cta" href="#/path"><span aria-hidden="true">✨</span> ${t('Bắt đầu học {n} từ đầu tiên', { n: 10 })}</a></div>`}
        </section>
        <div class="me-bento">

          <a class="me-card" href="#/stats">
            <div class="me-card-head"><span class="me-card-lbl">🔥 ${t('Chuỗi ngày')}</span></div>
            <div class="me-card-val">${streak || 0}</div>
            <div class="me-card-sub">${freezeLeft ? '🧊 ' + t('{n}/{max} lượt', { n: freezeLeft, max: fi.max || 2 }) : t('{n} ngày', { n: streak || 0 })}</div>
          </a>

          <a class="me-card" href="#/review?src=forgetting">
            <div class="me-card-head"><span class="me-card-lbl">⏰ ${t('Thời điểm vàng')}</span></div>
            <div class="me-card-val${forgettingC ? ' warn' : ''}">${forgettingC}</div>
            <div class="me-card-sub">${forgettingC ? t('{n} từ đang sắp quên', { n: forgettingC }) : t('Chưa có từ sắp quên')}</div>
          </a>
        </div>

        <h3 class="set-h">${t('Việc học')}</h3><div class="set-list">`
      + row('#/goal', '🚩', t('Mục tiêu & kế hoạch'), t('Kỳ thi, điểm mục tiêu, ngày thi'))
      + row('#/stats', '📊', t('Tiến độ & huy hiệu'), t('Chuỗi {n} ngày · {xp} XP', { n: streak || 0, xp: (g.xp || 0).toLocaleString(I18N.lang()) }))
      + row('#/league', '🏆', t('Giải đấu tuần'), t('Bảng xếp hạng 30 người học, thăng hạng mỗi tuần'))
      + row('#/mistakes', '📕', t('Sổ lỗi sai'), t('Làm lại các câu đã sai'), false, openMistakes ? `<span class="pill-count warn">${openMistakes}</span>` : '')
      + `</div><h3 class="set-h">${t('Ứng dụng')}</h3><div class="set-list">`
      + (isAdmin ? row(App.adminUrl(), '🛡️', t('Quản trị hệ thống'), t('Người dùng, hộp thư, phân tích, chất lượng, Gemini API'), true) : '')
      + row('#/settings', '⚙️', t('Cài đặt'), t('Tài khoản, nhắc học, âm thanh, giao diện'))
      + `<button type="button" class="set-row me-row" data-exam-pick>
          <div class="me-row-left">
            <span class="me-icon-box" aria-hidden="true">${examObj.ic}</span>
            <div class="set-l">
              <span class="me-row-title">${t('Kỳ thi của bạn')}</span>
              <small>${esc(examObj.name)}</small>
            </div>
          </div>
          <div class="me-row-right">
            <span class="me-badge">${esc(examObj.short)}</span>
            <span class="chev" aria-hidden="true">›</span>
          </div>
        </button>`
      + `</div><h3 class="set-h">${t('Tìm hiểu thêm')}</h3><div class="set-list">`
      + row('#/method', '🧪', t('Cách Lexkite giúp bạn nhớ lâu'))
      + (blogOn ? row(App.blogUrl(), '📰', t('Blog học tiếng Anh'), t('Mẹo thi, từ vựng theo chủ đề, phương pháp học')) : '')
      + row('#/resources', '🌐', t('Tài nguyên miễn phí'))
      + (I18N.lang() === 'vi' ? [['samples', '📄', 'Bài mẫu Writing Task 2'], ['speaking', '🗣️', 'Chủ đề Speaking'], ['tu-vung', '📚', 'Từ vựng theo chủ đề'], ['ngu-phap', '🧠', 'Ngữ pháp tiếng Anh'], ['viet-thu', '✉️', 'Thư mẫu IELTS General']].map(([p, ic, l]) => row('https://lexkite.com/' + p + '/', ic, l, '', true)).join('') : '')
      + `</div></div>`;
    const acct = view.querySelector('#meAcct'); if (acct) Sync.renderBox(acct); // thẻ tài khoản dùng chung với Cài đặt (sync.js) – tự cập nhật trạng thái
  };

  // ---------- Blog (trang tĩnh /blog/ – tạo lúc build): chỉ hiện lối vào khi blog đã có trên máy chủ ----------
  // Blog chia theo ngôn ngữ: /vi/blog/, /en/blog/… – ngôn ngữ giao diện chưa có blog thì ẩn lối vào (không lẫn tiếng)
  const sameSite = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname);
  const BLOG = 'https://lexkite.com/' + I18N.lang() + '/blog/';
  App.blogUrl = () => (sameSite ? '/' + I18N.lang() + '/blog/' : BLOG);
  App.blogLive = async () => {
    try { const c = JSON.parse(localStorage.getItem('vb.blog.' + I18N.lang()) || 'null'); if (c && Date.now() - c.at < (c.on ? 864e5 : 3 * 3600e3)) return c.on; /* chưa có bài → kiểm tra lại sau 3 giờ */ } catch (e) { /* bỏ qua */ }
    let on = false;
    try { const r = await fetch((sameSite ? '' : 'https://lexkite.com') + '/blog-langs.json', { cache: 'no-store' }); on = r.ok && (await r.json()).includes(I18N.lang()); } /* danh sách ngôn ngữ đã có bài (build-blog) – không dò rss 404 */
    catch (e) { try { const r = await fetch(App.blogUrl() + 'rss.xml', { cache: 'no-store' }); on = r.ok && /xml/.test(r.headers.get('content-type') || '') && (await r.text()).includes('<item'); } catch (x) { on = false; } }
    try { localStorage.setItem('vb.blog.' + I18N.lang(), JSON.stringify({ on, at: Date.now() })); } catch (e) { /* bỏ qua */ }
    return on;
  };
  // App iOS/Android & add-on: mở blog bằng trình duyệt (blog cần mạng); web: mở cùng tab
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[data-blog]'); if (!a || sameSite) return;
    e.preventDefault(); window.open(BLOG, '_blank', 'noopener');
  });
  // Chân thanh bên (index.html .side-foot): link trang tĩnh theo ngôn ngữ giao diện lúc bấm; add-on/app mở lexkite.com ở tab mới
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('.side-foot a[data-l]'); if (!a) return;
    const k = a.dataset.l, vi = I18N.lang() === 'vi', u = k === 'privacy' || k === 'terms' ? App.legalUrl(k) : (sameSite ? '' : 'https://lexkite.com') + (k === 'about' ? (vi ? '/' : '/' + I18N.lang() + '/') + '?home=1' : k === 'vocab' ? (vi ? '/tu-vung/' : '/en/vocabulary/') : (vi ? '/samples/' : '/en/samples/')); // about: trang giới thiệu đúng ngôn ngữ, ?home=1 = không tự quay lại app
    if (sameSite) { a.href = u; return; } e.preventDefault(); window.open(u, '_blank', 'noopener');
  });
  App.blogLive().then(on => { if (on) document.querySelectorAll('#nav a[data-blog]').forEach(a => { a.hidden = false; a.href = App.blogUrl(); }); });

  // ---------- Bản đồ điều hướng: trang → [mục chính, mục con] (đánh dấu menu, đường dẫn "Kỹ năng › Nghe") ----------
  const SKILL_OF = { listening: 'listening', listen: 'listening', dictation: 'listening', reading: 'reading', read: 'reading', rtype: 'reading', cbt: 'reading', 'toeic-r': 'reading', write: 'writing', task1: 'writing', letters: 'writing', ideas: 'writing', model: 'writing', models: 'writing', speaking: 'speaking', roleplay: 'speaking', call: 'speaking', fix: 'writing' };
  const TOEFL_SK = { cw: 'reading', daily: 'reading', academic: 'reading', response: 'listening', conversation: 'listening', announcement: 'listening', talk: 'listening', sentence: 'writing', email: 'writing', discussion: 'writing', repeat: 'speaking', interview: 'speaking' };
  App.navOf = (name, arg) => {
    if (!name || name === 'home') return ['home', 'home'];
    if (['vocab', 'review', 'path', 'library', 'topic', 'deck', 'phrases', 'dict', 'verb', 'usage'].includes(name)) return ['vocab', name === 'topic' ? 'library' : name === 'verb' || name === 'usage' ? 'dict' : name];
    if (name === 'practice') return arg === 'speak' ? ['skills', 'pron'] : ['vocab', 'practice'];
    if (name === 'skill') return ['skills', 'skill-' + arg];
    if (name === 'cbt' && arg && arg.includes(',')) return ['tests', 'tests'];
    if (SKILL_OF[name]) return ['skills', 'skill-' + SKILL_OF[name]];
    if (name === 'toefl-p') return ['skills', 'skill-' + (TOEFL_SK[arg] || 'reading')];
    if (['skills', 'grammar', 'pron', 'toeic', 'toefl'].includes(name)) return ['skills', name];
    if (['tests', 'mock', 'listen-test', 'toeic-test', 'placement'].includes(name)) return ['tests', name === 'placement' ? 'placement' : 'tests'];
    if (['me', 'goal', 'stats', 'league', 'mistakes', 'settings', 'method', 'resources'].includes(name)) return ['me', name];
    return [null, null];
  };
  const TAB = { vocab: ['📚', () => t('Từ vựng')], skills: ['🎯', () => t('Kỹ năng')], tests: ['🏁', () => t('Thi thử')], me: ['👤', () => t('Tôi')] };
  // Đường dẫn ngược (breadcrumb) trên các trang con – chèn tự động vào đầu tiêu đề trang
  App.crumb = (name, arg) => {
    const [tab, item] = App.navOf(name, arg);
    if (!TAB[tab] || name === tab) return '';
    const parts = [`<a href="#/${tab}">${TAB[tab][1]()}</a>`];
    if (/^skill-/.test(item) && name !== 'skill') { const k = item.slice(6); if (SK[k]) parts.push(`<a href="#/skill/${k}">${SK[k].name()}</a>`); }
    return `<nav class="crumb small" aria-label="${t('Đường dẫn')}">${parts.join('<span aria-hidden="true">›</span>')}</nav>`;
  };
})();
