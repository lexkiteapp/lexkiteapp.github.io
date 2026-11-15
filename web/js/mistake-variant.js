/* Mini-test biến thể từ Sổ lỗi sai (#/mistakes?variant=1) – tải lười (gói 'mvar').
   Cùng từ / cùng quy tắc ngữ pháp với lỗi đã sai nhưng câu hỏi khác (câu ví dụ khác, phương án khác).
   Lịch: KHÔNG có bộ lập lịch riêng – trạng thái FSRS của từng lỗi (x.vs) chạy bằng Core.SRS.review; từ vựng còn chấm cả thẻ trong sổ từ
   (Cards.update; từ chưa có thẻ mà làm sai → App.addWord). Mỗi lượt tối đa MAX câu, chỉ lỗi đến hạn; làm xong hẹn sang ngày mai. */
(function () {
  const { $, $$, esc, toast } = UI;
  const { Store, SRS, Cards } = Core;
  const App = window.App, DAY = 864e5, MAX = 5, REST = 12 * 36e5; // lỗi mới ghi nghỉ 12 giờ rồi mới được hỏi biến thể
  const nrm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const shuffle = (a, rnd = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const tomorrow = now => { const d = new Date(now); d.setHours(4, 0, 0, 0); return d.getTime() + (d.getTime() <= now ? DAY : 0); };
  const refOk = x => x.ref && (x.kind === 'grammar' || (x.kind === 'vocab' && /^[a-z][a-z' .-]*$/i.test(x.ref)));

  // Đến hạn: chưa có lịch → sau 12 giờ kể từ lúc sai; đã có → theo hạn FSRS. Quá hạn lâu + sai nhiều lần lên trước.
  const due = (list, now = Date.now()) => list.filter(x => !x.fixed && refOk(x) && (x.vs ? x.vs.srs.due <= now : (x.at || 0) + REST <= now))
    .sort((a, b) => ((a.vs ? a.vs.srs.due : a.at) - (b.vs ? b.vs.srs.due : b.at)) || ((b.n || 1) - (a.n || 1)));

  // Thân câu hỏi → { q, sub, options, answer, explain } hoặc null (không đủ dữ liệu → bỏ qua, không đoán).
  // env = { word(ref) → mục từ, pool() → danh sách từ làm phương án nhiễu, lesson(id), meanOf, rnd }
  function make(x, env) {
    const rnd = env.rnd || Math.random;
    if (x.kind === 'grammar') {
      const L = env.lesson(x.ref), cur = nrm(x.q);
      const qs = ((L && L.quiz) || []).filter(q => q && q.options && q.options.length > 1 && nrm(q.q) !== cur);
      if (!qs.length) return null;
      const q = qs[Math.floor(rnd() * qs.length)], opts = shuffle(q.options.map((o, i) => ({ o, ok: i === q.answer })), rnd);
      return { q: q.q, sub: L.emoji || '', options: opts.map(o => o.o), answer: opts.findIndex(o => o.ok), explain: q.explain || '' };
    }
    const w = env.word(x.ref); if (!w) return null;
    const mean = env.meanOf(w), same = c => nrm(c.word) === nrm(w.word);
    if (!mean) return null;
    const others = shuffle(env.pool().filter(c => !same(c) && env.meanOf(c) && nrm(env.meanOf(c)) !== nrm(mean)), rnd).sort((a, b) => (b.pos === w.pos) - (a.pos === w.pos));
    const pick = f => { const out = [], seen = new Set([nrm(f(w))]); for (const c of others) { const v = f(c); if (v && !seen.has(nrm(v))) { seen.add(nrm(v)); out.push(v); } if (out.length >= 3) break; } return out; };
    const sent = [w.ex].concat((w.sentences || []).map(s => s && s.en)).flat().filter(s => typeof s === 'string' && UI.wordRegex(w.word).test(s) && !nrm(x.q).includes(nrm(s.replace(UI.wordRegex(w.word), '___'))))[0]; // câu đã hỏi ở lỗi gốc (đã che từ) thì không lặp lại
    const useCloze = sent && (x.n || 1) % 2 === 1 || !others.length && sent;
    const f = useCloze ? c => c.word : env.meanOf, dis = pick(f);
    if (dis.length < 3) return null;
    const opts = shuffle([f(w)].concat(dis), rnd), ans = opts.indexOf(f(w));
    return useCloze ? { q: t('Điền từ: {sentence}', { sentence: sent.replace(UI.wordRegex(w.word), '___') }), sub: '', options: opts, answer: ans, explain: `${w.word} = ${mean}` }
      : { q: t('Nghĩa của “{word}”?', { word: w.word }), sub: '', options: opts, answer: ans, explain: `${w.word} ${w.ipa || ''}`.trim(), say: w.word };
  }

  // Chấm một lỗi: FSRS của lỗi (khởi tạo như thẻ vừa học xong) + thẻ flashcard cùng từ; hẹn lại không sớm hơn sáng mai; 2 lượt đúng liên tiếp → đã nắm.
  function grade(x, ok, now = Date.now()) {
    const s0 = x.vs ? x.vs.srs : { ...SRS.newState(), reps: 1, S: 1, D: 6, last: x.at || now };
    const s = SRS.review(s0, ok ? 2 : 0, now);
    s.due = Math.max(s.due, tomorrow(now));
    x.vs = { srs: s, at: now };
    if (ok && s.reps >= 3) x.fixed = true;
    return x;
  }
  const settle = async (x, ok, w) => {
    const all = await Store.get('mistakes', []), it = all.find(y => y.key === x.key);
    if (it) { grade(it, ok); await Store.set('mistakes', all); }
    if (x.kind !== 'vocab') return;
    const k = nrm(x.ref), c = App.state.cards[k];
    if (c) { c.srs = SRS.review(c.srs, ok ? 2 : 0); await Cards.update(c); if (window.Sync) Sync.schedule(); } // thẻ flashcard cùng từ: cùng một lịch FSRS
    else if (!ok && w) await App.addWord(w, null, { silent: true });
  };

  const env = () => ({
    word: ref => (window.IELTS_DATA && IELTS_DATA.INDEX[nrm(ref)]) || App.state.cards[nrm(ref)],
    pool: () => Object.values(App.state.cards).concat(App.allWords()),
    lesson: id => (window.GRAMMAR || []).find(g => g.id === id),
    meanOf: App.meanOf,
  });

  async function run() {
    const view = App.view, tok = App.routeToken();
    const list = due(await Store.get('mistakes', []));
    if (list.some(x => x.kind === 'grammar')) { // bài ngữ pháp rút gọn (x.lazy) → nạp gói đủ
      await App.need('grammar').catch(() => {});
      await Promise.all([...new Set((window.GRAMMAR || []).filter(g => g.lazy && list.some(x => x.ref === g.id)).map(g => g.lazy))].map(k => App.need(k).catch(() => {})));
    }
    const E = env(), qs = [];
    for (const x of list) { if (qs.length >= MAX) break; const q = make(x, E); if (q) qs.push({ x, ...q }); }
    if (App.routeStale(tok)) return;
    const back = `<a class="btn primary" href="#/mistakes">${UI.icon('book-x')} ${t('Về Sổ lỗi sai')}</a>`;
    if (!qs.length) { view.innerHTML = `<div class="study-wrap"><div class="card empty"><div class="em">${UI.icon('party-popper')}</div><h2>${t('Hôm nay chưa có câu biến thể nào')}</h2><p class="muted">${t('Khi có lỗi cũ đến lúc ôn, câu hỏi mới sẽ xuất hiện ở đây.')}</p><div class="row center">${back}</div></div></div>`; return; }
    let i = 0, right = 0;
    const next = () => {
      if (i >= qs.length) {
        App.reward({ quizzes: 1, xp: 3 + right * 2 });
        view.innerHTML = `<div class="study-wrap"><div class="card empty celebrate"><div class="em">${UI.icon('party-popper')}</div><h2>${t('{score}/{total} câu đúng', { score: right, total: qs.length })}</h2><p class="muted">${t('Mình sẽ hỏi lại những câu này vào đúng lúc để bạn nhớ lâu.')}</p><div class="row center">${back}</div></div></div>`;
        return;
      }
      const q = qs[i];
      view.innerHTML = `<div class="study-wrap"><div class="study-top"><a class="icon-btn" href="#/mistakes" aria-label="${t('Đóng')}">✕</a><div class="progress"><i style="width:${i / qs.length * 100}%"></i></div><span class="small muted">${i + 1}/${qs.length}</span></div>
        <div class="card q-card"><div class="tiny muted">${UI.icon('puzzle')} ${t('Mini-test biến thể')}</div><div lang="en" style="font-size:1.15rem;font-weight:700;margin-top:.5rem">${esc(q.q)}</div></div>
        <div class="options">${q.options.map((o, k) => `<button class="option" data-k="${k}"><span class="kbd">${k + 1}</span>${esc(o)}</button>`).join('')}</div><div id="fb"></div></div>`;
      $$('.option').forEach(b => b.onclick = async () => {
        if ($('#fb').innerHTML) return;
        const ok = +b.dataset.k === q.answer; $$('.option')[q.answer].classList.add('right'); if (!ok) b.classList.add('wrong');
        if (ok) right++; Sfx.answer(ok, { el: b, answer: q.options[q.answer] });
        $('#fb').innerHTML = `<div class="card mb ${ok ? 'ok' : 'no'}"><p>${ok ? t('Chính xác!') : t('Chưa đúng · Đáp án: {answer}', { answer: esc(q.options[q.answer]) })}</p>${q.explain ? `<p class="mb-tip">${UI.icon('lightbulb')}<span>${esc(q.explain)}</span></p>` : ''}<button class="btn primary" id="mvNext">${t('Tiếp tục')}</button></div>`;
        $('#mvNext').onclick = () => { i++; next(); }; $('#mvNext').focus();
        settle(q.x, ok, q.x.kind === 'vocab' ? E.word(q.x.ref) : null).catch(() => toast(t('Không lưu được')));
      });
    };
    next();
  }

  // Gợi ý trên Hôm nay: 1 việc, giọng nhẹ nhàng (notifications-ux) – hết hạn thì tự biến mất, không thông báo đẩy.
  async function todayTask() {
    const n = due(await Store.get('mistakes', [])).length;
    return n ? { em: '🧩', t: t('Mini-test biến thể'), sub: t('{n} câu ngắn về chỗ hay nhầm, hỏi theo cách mới', { n: Math.min(n, MAX) }), href: '#/mistakes?variant=1', mins: 2, done: false } : null;
  }

  window.MVar = { run, due, make, grade, todayTask };
})();
