/* 🧭 Gói học (tải lười – gói 'pathx'): 5 gói, mỗi gói có chặng CEFR + công thức buổi "Ngày N" riêng, chỉ dùng nội dung CÓ SẴN.
 * 🗣️ Giao tiếp · 🎓 IELTS (Academic/GT) · 💼 TOEIC (L&R / S&W) · 🇺🇸 TOEFL 2026 · 🏢 Công sở.
 * settings.tracks = { cur, on: [gói theo dõi], legacy: gói nhận tiến độ cũ, lv: { gói: { s: chặng, at } }, v: { ielts: 'ac'|'gt', toeic: 'lr'|'sw' }, goals: { gói: goal } }
 * Tiến độ ngày lưu chung kho 'pathDays': gói legacy dùng khóa cũ "bộ~N" (không mất gì), gói khác "gói:bộ~N" → mỗi gói giữ tiến độ riêng.
 * XP, chuỗi ngày, thẻ từ dùng chung. Đạt bài kiểm tra cuối bài (unitDone) = đã thuộc bộ từ → tính ở mọi gói có bộ đó. */
(function (g) {
  const App = g.App, { state } = App, { esc } = UI;
  const P = () => App.PathAPI;
  const CE = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const COL = ['#17595A', '#1E7A4C', '#B7472A', '#9A5B00', '#A8324F'];
  const EX2T = { ielts: 'ielts', ieltsgt: 'ielts', toeic: 'toeic', toefl: 'toefl', general: 'comm' };
  const ngsl = re => () => P().STAGES[0].units.filter(id => re.test(id));
  // Chặng của gói: tên "Chặng N · CEFR", mô tả = 3 bộ từ đầu (tên bộ đã có bản dịch), mục tiêu = lợi ích của gói
  const ST = (tid, i, cefr, lo, units) => ({ id: tid + (i + 1), cefr, lo, color: COL[i], band: '',
    get name() { return t('Chặng {n}', { n: i + 1 }) + ' · ' + cefr; },
    get units() { return typeof units === 'function' ? units() : units; },
    get desc() { return this.units.slice(0, 3).map(u => (App.topicOf(u) || {}).name).filter(Boolean).join(' · '); },
    get cando() { return TR[tid].benefit; } });
  const TR = {
    comm: { id: 'comm', em: '🗣️', get name() { return t('Giao tiếp hằng ngày'); }, get benefit() { return t('Nói tự tin ở quán cà phê, sân bay, khách sạn, cửa hàng, phòng khám…'); }, exam: () => 'general',
      stages: [ST('comm', 0, 'A1 – A2', 1, ngsl(/^ngsl[12]\./)), ST('comm', 1, 'A2 – B1', 2, () => [...ngsl(/^ngsl3\./)(), 'us-housing', 'us-money', 'food', 'travel']),
        ST('comm', 2, 'B1 – B2', 3, () => [...ngsl(/^ngsl[45]\./)(), 'health', 'us-health', 'office-service']), ST('comm', 3, 'B2 – C1', 4, ['phrasal', 'idioms', 'collocations'])] },
    ielts: { id: 'ielts', em: '🎓', name: 'IELTS', get benefit() { return t('Từ học thuật, dạng câu Reading & Listening, Writing Task 1–2, Speaking Part 1–3'); }, exam: v => (v === 'gt' ? 'ieltsgt' : 'ielts'),
      vs: [['ac', 'Academic'], ['gt', 'General Training']], get stages() { return P().STAGES; } }, // lộ trình IELTS gốc (path.js) – giữ nguyên
    toeic: { id: 'toeic', em: '💼', name: 'TOEIC', tsl: 1, get benefit() { return t('Luyện Part 1–7, từ vựng công sở TSL và các bẫy hay gặp'); }, exam: () => 'toeic',
      vs: [['lr', 'Listening & Reading'], ['sw', 'Speaking & Writing']],
      stages: [ST('toeic', 0, 'A2 – B1', 2, ['toeic1', 'toeic2', 'ex-toeic-office', 'toeic3', 'ex-toeic-travel']), ST('toeic', 1, 'B1', 3, ['toeic4', 'toeic5', 'ex-toeic-l', 'toeic6', 'toeic7', 'ex-toeic-r']),
        ST('toeic', 2, 'B2', 4, ['toeic8', 'toeic9', 'toeic10', 'bsl1', 'bsl2']), ST('toeic', 3, 'B2 – C1', 5, ['bsl3', 'bsl4', 'bsl5', 'bsl6', 'dom-biz'])] },
    toefl: { id: 'toefl', em: '🇺🇸', name: 'TOEFL 2026', tsl: 1, benefit: 'Complete the Words · Build a Sentence · Listen and Choose a Response', exam: () => 'toefl', // lợi ích = tên dạng bài chính thức (giữ tiếng Anh)
      stages: [ST('toefl', 0, 'B1', 3, ['ex-toefl-campus', 'nawl1', 'awl1', 'nawl2']), ST('toefl', 1, 'B2', 4, ['ex-toefl', 'ex-toefl-lecture', 'awl2', 'nawl3', 'linking', 'awl3']),
        ST('toefl', 2, 'C1', 5, ['nawl4', 'awl4', 'science', 'awl5', 'nawl5', 'awl6', 'space'])] },
    work: { id: 'work', em: '🏢', get name() { return t('Tiếng Anh công sở'); }, tsl: 1, get benefit() { return t('Email, họp, gọi điện, phỏng vấn và cách đề nghị lịch sự'); }, exam: () => 'general',
      stages: [ST('work', 0, 'A2 – B1', 2, ['office-email', 'office-meeting', 'office-service']), ST('work', 1, 'B1', 3, ['office-interview', 'office-hr', 'office-it', 'bsl1', 'bsl2']),
        ST('work', 2, 'B2', 4, ['bsl3', 'bsl4', 'dom-biz', 'dom-mkt', 'dom-it']), ST('work', 3, 'C1', 5, ['bsl5', 'bsl6', 'dom-law', 'dom-log', 'collocations'])] },
  };
  const IDS = Object.keys(TR);

  // ---------- Cấu hình + chuyển dữ liệu người dùng cũ (kỳ thi đang chọn → gói tương ứng, general → Giao tiếp) ----------
  function cfg() {
    const s = state.settings || (state.settings = {}); let c = s.tracks;
    if (c && TR[c.cur]) { c.on = (c.on || []).filter(x => TR[x]); if (!c.on.includes(c.cur)) c.on.unshift(c.cur); c.lv = c.lv || {}; c.v = c.v || {}; c.goals = c.goals || {}; return c; }
    const ex = App.exam ? App.exam() : 'ielts', id = EX2T[ex] || 'comm';
    c = s.tracks = { cur: id, on: [id], legacy: id, lv: {}, v: { ielts: ex === 'ieltsgt' ? 'gt' : 'ac', toeic: 'lr' }, goals: {} };
    if (App.saveSettings) App.saveSettings().catch(() => {});
    return c;
  }
  const cur = () => TR[cfg().cur];
  const variant = tr => { const c = cfg(); return tr.id === 'ielts' ? (c.cur === 'ielts' && App.exam && App.exam() === 'ieltsgt' ? 'gt' : c.v.ielts || 'ac') : tr.id === 'toeic' ? c.v.toeic || 'lr' : ''; };
  const examOf = (tr, v) => tr.exam(v === undefined ? variant(tr) : v);
  const isLegacy = tr => cfg().legacy === tr.id;
  const key = (tr, id) => (isLegacy(tr) ? id : tr.id + ':' + id);
  const readsOld = tr => isLegacy(tr) || tr.id === 'ielts'; // bản ghi trước khi có gói học được ghi trên lộ trình IELTS gốc
  const ready = tr => (tr.tsl && !App.loaded('tsl') ? App.need('tsl').catch(() => {}) : Promise.resolve());
  const cefrN = pl => { const a = CE.indexOf(pl.vCefr) + 1, b = CE.indexOf(pl.gCefr) + 1; if (a || b) return a && b ? Math.round((a + b) / 2) : a || b;
    const bd = parseFloat(pl.band); return !bd ? 0 : bd < 4 ? 2 : bd < 5.5 ? 3 : bd < 7 ? 4 : 5; };
  // Chặng bắt đầu: trình độ chọn tay (mới hơn) → kết quả kiểm tra đầu vào (IELTS: chặng gợi ý; gói khác: theo CEFR) → chặng đầu
  function start(tr) {
    const lv = cfg().lv[tr.id], pl = state.settings.placement;
    if (lv && lv.s && (!pl || !pl.at || (lv.at || 0) >= pl.at)) return lv.s;
    if (!pl) return '';
    if (tr.id === 'ielts') return pl.stage || '';
    const n = cefrN(pl); let best = tr.stages[0];
    for (const s of tr.stages) if (n && s.lo <= n) best = s;
    return best.id;
  }
  const tierOf = (tr, st) => (tr.id === 'ielts' ? { s0: 0, s1: 1 }[st.id] ?? 2 : st.lo <= 2 ? 0 : st.lo === 3 ? 1 : 2);

  // ---------- Công thức buổi học: phần kỹ năng riêng của từng gói (sau phần từ vựng dễ → khó) ----------
  const at = (a, i) => a[((i % a.length) + a.length) % a.length];
  const QS = () => t('Câu hỏi kiểu đề thi, có giải thích ngay');
  const RK = [['tfng', 'True / False / Not Given'], ['completion', 'Sentence Completion'], ['mcq', 'Multiple Choice'], ['headings', 'Matching Headings'], ['ynng', 'Yes / No / Not Given'], ['info', 'Matching Information'], ['features', 'Matching Features'], ['multi', 'Multiple Answers']];
  const T1 = ['energy', 'leisure', 'spending', 'students', 'museums', 'commute'];
  const RP_DAY = ['cafe', 'shop', 'directions', 'hotel', 'doctor', 'neighbour'], CALL_DAY = ['coffee', 'weekend', 'apartment', 'doctor'];
  const RP_WORK = ['small-talk', 'manager', 'delay', 'client-call', 'complaint', 'presentation', 'leave', 'salary', 'dev-interview', 'marketing-interview'], CALL_WORK = ['first-day', 'standup'];
  const TF = [['cw', 'Complete the Words'], ['response', 'Listen and Choose a Response'], ['sentence', 'Build a Sentence'], ['daily', 'Read in Daily Life'], ['repeat', 'Listen and Repeat'], ['email', 'Write an Email'],
    ['conversation', 'Listen to a Conversation'], ['academic', 'Read an Academic Passage'], ['announcement', 'Listen to an Announcement'], ['interview', 'Take an Interview'], ['talk', 'Listen to an Academic Talk'], ['discussion', 'Writing for an Academic Discussion']];
  const SW = [['read', 'Read a Text Aloud'], ['respond', 'Respond to Questions'], ['info', 'Respond Using Information'], ['opinion', 'Express an Opinion'], ['request', 'Respond to a Written Request'], ['essay', 'Write an Opinion Essay']];
  const LR = [['l', 1], ['r', 5], ['l', 2], ['r', 6], ['l', 3], ['r', 7], ['l', 4]];
  const R = { // (d, tier, X, v) → [bước]; X(k, em, tên, mô tả, phút, href, bộ đếm hôm nay | null = xong khi mở)
    comm(d, tier, X) {
      const i = Math.floor((d.n - 1) / 4);
      const rp = () => X('rp', '🎭', t('Hội thoại ngắn'), t('Dùng từ vừa học trong tình huống thật'), 3, '#/roleplay/' + at(RP_DAY, i * 2 + (d.n % 2 ? 0 : 1)), 'spoken');
      return [[rp, () => X('pron', '🎙️', t('Luyện phát âm'), t('Nghe rồi nói lại'), 2, '#/pron', 'pron'),
        () => X('call', '📞', t('Cuộc gọi luyện nói'), t('Trả lời theo kịch bản, có gợi ý'), 3, '#/call/' + at(CALL_DAY, i), 'spoken'),
        () => (tier ? X('gram', '📐', t('Ngữ pháp nhanh'), t('{n} câu ngữ pháp ngắn', { n: 5 }), 2, '#/grammar/mix?n=5', 'grammar') : rp())][(d.n - 1) % 4]()];
    },
    ielts(d, tier, X, v) {
      const i = Math.floor((d.n - 1) / 4);
      if (d.n % 10 === 0) return [X('mock', '🏆', t('Thi thử định kỳ'), QS(), 15, '#/mock', 'quizzes')];
      const rk = at(RK, i), p = 1 + (i % 4), sp = 1 + (i % 3);
      return [[() => X('rt', '📖', 'IELTS Reading · ' + rk[1], QS(), 3, '#/rtype/' + rk[0], 'readings'),
        () => X('il', '🎧', 'IELTS Listening · Part ' + p, QS(), 4, `#/listen/t${1 + Math.floor(i / 4) % 10}p${p}`, 'listens'),
        () => X('is', '🗣️', 'IELTS Speaking · Part ' + sp, t('Nghe rồi nói lại'), 3, '#/speaking/p' + sp, 'spoken'),
        () => tier === 0 ? X('gram', '📐', t('Ngữ pháp nhanh'), t('{n} câu ngữ pháp ngắn', { n: 6 }), 2, '#/grammar/mix?n=6', 'grammar')
          : tier === 2 && i % 3 === 2 ? X('use', '🏗️', t('Collocation & cấu trúc học thuật'), QS(), 3, '#/usage?c=' + at(['struct', 'pair', 'prep', 'verb'], i), 'xp')
            : v === 'gt' ? X('iw', '✍️', 'Writing Task 1 · General Training', t('Viết theo mẫu, có bài mẫu tham khảo'), 5, '#/letters/gt' + (1 + (i % 12)), null)
              : i % 2 ? X('iw', '✍️', 'Writing Task 2', t('Viết theo mẫu, có bài mẫu tham khảo'), 6, '#/write/p' + (1 + (i % 30)), 'writes')
                : X('iw', '✍️', 'Writing Task 1', t('Viết theo mẫu, có bài mẫu tham khảo'), 5, '#/task1/' + at(T1, i), 'writes')][(d.n - 1) % 4]()];
    },
    toeic(d, tier, X, v) {
      const tt = 1 + Math.floor((d.n - 1) / 7) % 7;
      if (d.n % 10 === 0) return [X('mock', '🏆', t('Thi thử định kỳ'), QS(), 15, '#/toeic-test/' + tt, 'quizzes')];
      if (d.n % 8 === 0) return [X('trap', '🪤', t('Mẹo & bẫy hay gặp'), t('Xem dạng câu hay sai và mẹo tránh bẫy'), 2, '#/qstats', null)];
      if (v === 'sw' && d.n % 3) { const s = at(SW, Math.floor(d.n * 2 / 3)); return [X('tsw', s[0] === 'essay' || s[0] === 'request' ? '✍️' : '🎙️', 'TOEIC S&W · ' + s[1], QS(), 4, '#/toeic-sw/' + s[0], 'xp')]; }
      const [k, part] = at(LR, d.n - 1);
      return [k === 'l' ? X('tp', '🎧', 'TOEIC · Part ' + part, QS(), 3, `#/listen/tl${tt}p${part}`, 'listens') : X('tp', '📄', 'TOEIC · Part ' + part, QS(), 4, `#/toeic-r/tr${tt}?part=${part}`, 'quizzes')];
    },
    toefl(d, tier, X) {
      const pool = tier ? TF : TF.slice(0, 6), x = at(pool, d.n - 1);
      return [X('tf', /response|repeat|conversation|announcement|talk/.test(x[0]) ? '🎧' : x[0] === 'interview' ? '🎙️' : /email|discussion/.test(x[0]) ? '✍️' : '🧩', 'TOEFL · ' + x[1], QS(), 3, '#/toefl-p/' + x[0], /repeat|interview/.test(x[0]) ? 'spoken' : 'xp')];
    },
    work(d, tier, X) {
      const i = Math.floor((d.n - 1) / 4);
      return [[() => X('call', '📞', t('Cuộc gọi luyện nói'), t('Trả lời theo kịch bản, có gợi ý'), 3, '#/call/' + at(CALL_WORK, i), 'spoken'),
        () => (i % 2 ? X('rp', '🎭', t('Hội thoại ngắn'), t('Dùng từ vừa học trong tình huống thật'), 3, '#/roleplay/' + at(RP_WORK, i), 'spoken')
          : X('pol', '🙏', t('Đề nghị lịch sự'), t('can / could / may – xin phép và nhờ giúp'), 2, '#/grammar/modals-ability-permission', 'grammar')),
        () => X('mail', '📧', t('Email & thư công việc'), t('Viết theo mẫu, có bài mẫu tham khảo'), 4, '#/letters/gt' + (1 + (i % 12)), null),
        () => X('rp', '🎭', t('Hội thoại ngắn'), t('Dùng từ vừa học trong tình huống thật'), 3, '#/roleplay/' + at(RP_WORK, i * 2 + 1), 'spoken')][(d.n - 1) % 4]()];
    },
  };
  const skill = (tr, d, tier, X) => R[tr.id](d, tier, X, variant(tr));

  // ---------- Chuyển gói / theo dõi nhiều gói / đổi trình độ – mỗi gói giữ mục tiêu riêng (goal.js) ----------
  async function use(id, v) {
    const c = cfg(), s = state.settings, tr = TR[id]; if (!tr) return;
    if (!c.on.includes(id)) c.on.push(id);
    if (v && tr.vs && tr.vs.some(x => x[0] === v)) c.v[id] = v;
    if (c.cur !== id && s.goal) c.goals[c.cur] = s.goal;
    c.cur = id;
    const ex = examOf(tr, c.v[id] || (id === 'ielts' ? 'ac' : 'lr'));
    s.exam = ex;
    const gl = c.goals[id];
    if (s.goal && s.goal.exam !== ex) { if (gl && gl.exam === ex) s.goal = gl; else delete s.goal; }
    else if (!s.goal && gl && gl.exam === ex) s.goal = gl;
    if (s.goal) s.examTarget = ex === 'general' ? CE[s.goal.target - 1] || '' : String(s.goal.target);
    await App.saveSettings();
  }
  async function unfollow(id) {
    const c = cfg(); if (c.on.length < 2) return;
    c.on = c.on.filter(x => x !== id);
    if (c.cur === id) await use(c.on[0]); else await App.saveSettings();
  }
  async function setLevel(id, sid) { const c = cfg(); c.lv[id] = { s: sid, at: Date.now() }; await App.saveSettings(); }

  function css() {
    if (document.getElementById('trkCss')) return;
    const s = document.createElement('style'); s.id = 'trkCss';
    s.textContent = `.trk-list{display:grid;gap:.6rem;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));margin-top:.6rem}
.trk-opt{display:flex;gap:.7rem;align-items:flex-start;text-align:start;width:100%;min-height:64px;padding:.75rem .85rem;border:2px solid var(--line);border-radius:16px;background:var(--surface);color:var(--text);font:inherit;cursor:pointer}
.trk-opt[aria-pressed=true],.trk-card.on{border-color:var(--primary);background:var(--primary-soft)}.trk-opt:focus-visible,.trk-sw a:focus-visible{outline:3px solid var(--primary);outline-offset:2px}
.trk-em{font-size:1.7rem;line-height:1;flex:none}.trk-opt b,.trk-card b{display:block}.trk-opt .small,.trk-card .small{color:var(--muted)}
.trk-vs{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.5rem}.trk-vs button,.trk-lv button{min-height:44px;padding:.35rem .8rem;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--text);font:inherit;cursor:pointer}
.trk-vs button[aria-pressed=true],.trk-lv button[aria-pressed=true]{border-color:var(--primary);background:var(--primary);color:var(--primary-ink)}
.trk-lv{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.6rem}
.trk-sw{display:flex;flex-wrap:wrap;gap:.4rem;margin:.6rem 0 0}.trk-sw a{display:inline-flex;align-items:center;justify-content:center;gap:.3rem;min-height:44px;min-width:44px;padding:.25rem .8rem;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--text);text-decoration:none;font-size:.88rem;font-weight:600}
.trk-sw a[aria-current]{border-color:var(--primary);background:var(--primary-soft);color:var(--primary-text,var(--text))}
.trk-card{border:2px solid var(--line);border-radius:16px;padding:.85rem;background:var(--surface)}.trk-card .row{margin-top:.6rem}
.trk-card .trk-h{display:flex;gap:.7rem;align-items:flex-start}.trk-card select{min-height:44px;max-width:100%}`;
    document.head.appendChild(s);
  }
  // Thanh đổi gói nhỏ (trang chủ + đầu lộ trình): các gói đang theo dõi + "＋"
  function switcher(to) {
    css(); const c = cfg();
    return `<nav class="trk-sw" aria-label="${esc(t('Gói học'))}">${c.on.map(id => `<a href="#/tracks?use=${id}&to=${to}"${id === c.cur ? ' aria-current="true"' : ''}><span aria-hidden="true">${TR[id].em}</span>${esc(TR[id].name)}</a>`).join('')}<a href="#/tracks" aria-label="${esc(t('Theo dõi thêm'))}"><span aria-hidden="true">＋</span></a></nav>`;
  }

  // ---------- Thiết lập lần đầu (app.js setup): "Mục tiêu của bạn là gì?" → trình độ → Ngày 1 ----------
  const lvBtns = (tr, sel) => tr.stages.map((s, i) => `<button type="button" data-lv="${s.id}" aria-pressed="${sel === s.id || (!sel && !i)}">${esc(tr.id === 'ielts' ? s.cefr + ' · ' + s.band : 'CEFR ' + s.cefr)}</button>`).join('');
  const vsBtns = (tr, v) => (tr.vs ? `<div class="trk-vs" role="group" aria-label="${esc(tr.name)}">${tr.vs.map(([k, n]) => `<button type="button" data-tv="${k}" aria-pressed="${v === k}">${n}</button>`).join('')}</div>` : '');
  function setupCards(pick) {
    css(); if (!pick) pick = {}; if (!pick.v) pick.v = {}; const tr = TR[pick.track] || TR[(cfg() || {}).cur] || TR[IDS[0]]; // mở lần đầu / gói lạ: không để tr undefined (lỗi 'stages')
    return `<div class="card"><h2>🎯 ${t('Mục tiêu của bạn là gì?')}</h2><p class="muted small">${t('Chọn 1 gói – có thể học thêm gói khác sau.')}</p>
      <div class="trk-list">${IDS.map(id => { const x = TR[id], on = id === pick.track;
        return `<div><button type="button" class="trk-opt" data-track="${id}" aria-pressed="${on}"><span class="trk-em" aria-hidden="true">${x.em}</span><span><b>${esc(x.name)}</b><span class="small">${esc(x.benefit)}</span></span></button>${on ? vsBtns(x, pick.v[id]) : ''}</div>`; }).join('')}</div></div>
      <div class="card"><h2>📶 ${t('Trình độ hiện tại của bạn?')}</h2><div class="trk-lv" role="group">${lvBtns(tr, pick.lv)}<button type="button" data-lv="test" aria-pressed="${pick.lv === 'test'}">🧭 ${t('Làm bài kiểm tra đầu vào')}</button></div></div>`;
  }
  function bindSetup(root, pick, onTrack, draw) {
    root.querySelectorAll('[data-track]').forEach(b => b.onclick = () => { if (b.dataset.track !== pick.track) { pick.lv = ''; onTrack(b.dataset.track); } });
    root.querySelectorAll('[data-tv]').forEach(b => b.onclick = () => { pick.v[pick.track] = b.dataset.tv; onTrack(pick.track); });
    root.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { pick.lv = b.dataset.lv; draw(); });
  }
  const pickExam = pick => examOf(TR[pick.track], pick.v[pick.track] || '');
  async function startSetup(pick) {
    const id = pick.track, v = pick.v || {};
    state.settings.tracks = { cur: id, on: [id], legacy: id, lv: {}, v: { ielts: v.ielts || 'ac', toeic: v.toeic || 'lr' }, goals: {} };
    if (pick.lv && pick.lv !== 'test') state.settings.tracks.lv[id] = { s: pick.lv, at: Date.now() };
    await App.saveSettings();
    return pick.lv === 'test' ? '#/placement' : '#/day';
  }

  // ---------- Trang #/tracks: chọn gói, theo dõi nhiều gói, đổi biến thể/trình độ ----------
  async function page(arg, query) {
    const q = query && query.get ? query : new URLSearchParams('');
    const u = q.get('use');
    if (u && TR[u]) { await use(u); location.hash = q.get('to') === 'home' ? '#/home' : '#/path'; return; }
    await App.need('words').catch(() => {});
    const c = cfg(); css();
    await Promise.all(c.on.map(id => ready(TR[id])));
    const info = {};
    for (const id of c.on) { const ds = await g.DayPath.daysOf(TR[id]), k = ds.find(d => d.status === 'current'); info[id] = { k, n: ds.filter(d => d.done).length, of: ds.length }; }
    const view = App.view;
    view.innerHTML = `<div class="page-head"><div><h1>🧭 ${t('Gói học')}</h1><p class="muted">${t('Mỗi gói giữ tiến độ riêng – XP và chuỗi ngày dùng chung.')}</p></div></div>
      <div class="trk-list">${IDS.map(id => { const x = TR[id], on = c.on.includes(id), me = id === c.cur, f = info[id], sid = start(x);
        return `<section class="trk-card${me ? ' on' : ''}" aria-labelledby="trk-${id}"><div class="trk-h"><span class="trk-em" aria-hidden="true">${x.em}</span><div><b id="trk-${id}">${esc(x.name)}</b><span class="small">${esc(x.benefit)}</span>
          ${f ? `<span class="small" style="display:block;margin-top:.3rem">${f.k ? t('Ngày {n}', { n: f.k.n }) + ' · ' : ''}${t('{a}/{b} ngày', { a: f.n, b: f.of })}</span>` : ''}</div></div>
          ${on && x.vs ? `<div data-for="${id}">${vsBtns(x, variant(x))}</div>` : ''}
          ${on ? `<label class="small" style="display:block;margin-top:.6rem">${t('Trình độ hiện tại của bạn?')}<select class="input" data-lvsel="${id}">${x.stages.map(s => `<option value="${s.id}"${s.id === (sid || x.stages[0].id) ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>` : ''}
          <div class="row">${me ? `<a class="btn primary" href="#/path">${f && f.k ? t('Bắt đầu Ngày {n}', { n: f.k.n }) : t('Gói học')} →</a>` : `<a class="btn${on ? ' primary' : ''}" href="#/tracks?use=${id}">${on ? t('Học gói này') : '＋ ' + t('Theo dõi thêm')}</a>`}
          ${on && !me && c.on.length > 1 ? `<button type="button" class="btn ghost sm" data-unf="${id}">${t('Bỏ theo dõi')}</button>` : ''}</div></section>`; }).join('')}</div>
      <p class="small muted" style="margin-top:1rem"><a href="#/placement">🧭 ${t('Làm bài kiểm tra đầu vào')}</a> · <a href="#/goal">🚩 ${t('Mục tiêu & kế hoạch')}</a></p>`;
    view.querySelectorAll('[data-unf]').forEach(b => b.onclick = async () => { await unfollow(b.dataset.unf); page(); });
    view.querySelectorAll('[data-lvsel]').forEach(s => s.onchange = async () => { await setLevel(s.dataset.lvsel, s.value); page(); });
    view.querySelectorAll('[data-for] [data-tv]').forEach(b => b.onclick = async () => { const id = b.closest('[data-for]').dataset.for, c2 = cfg(); c2.v[id] = b.dataset.tv;
      if (c2.cur === id) await use(id, b.dataset.tv); else await App.saveSettings(); page(); });
  }

  g.Tracks = { TR, IDS, cfg, cur, variant, examOf, isLegacy, key, readsOld, ready, start, tierOf, skill, use, unfollow, setLevel, switcher, setupCards, bindSetup, pickExam, startSetup, page, EX2T };
})(self);
