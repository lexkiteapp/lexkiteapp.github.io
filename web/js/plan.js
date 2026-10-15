/* Học thích ứng (kiểu Mochi IELTS): kiểm tra đầu vào, kế hoạch hôm nay theo điểm yếu, sổ lỗi sai, tài nguyên miễn phí chính thống. */
(function () {
  const { $, $$, esc, shuffle, toast, ring } = UI;
  const { Store, Golden, SRS, todayKey } = Core;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;

  // ================= SỔ LỖI SAI =================
  // App.logMistake({ kind: 'vocab'|'grammar'|'reading', q, answer, given, explain, ref })
  let mLock = Promise.resolve();
  App.logMistake = m => (mLock = mLock.then(async () => {
    const list = await Store.get('mistakes', []);
    const key = m.kind + '|' + m.q;
    const old = list.find(x => x.key === key);
    if (old) { old.n = (old.n || 1) + 1; old.at = Date.now(); old.fixed = false; }
    else list.unshift({ ...m, key, n: 1, at: Date.now(), fixed: false });
    await Store.set('mistakes', list.slice(0, 300));
  }));
  const KIND = { vocab: ['🔤', t('Từ vựng')], grammar: ['📐', t('Ngữ pháp')], reading: ['📖', t('Đọc hiểu')], listening: ['🎧', t('Nghe')] };

  routes.mistakes = async function (arg, query) {
    const retry = !!(query && query.get && query.get('retry'));
    const list = await Store.get('mistakes', []);
    const open = list.filter(x => !x.fixed);
    view.innerHTML = `
      <div class="page-head"><div><h1>📕 ${t('Sổ lỗi sai')}</h1><p class="muted">${t('Mọi câu bạn làm sai đều được ghi lại tự động. Ôn lại lỗi sai là cách tăng điểm nhanh nhất – xem lại vì sao sai rồi đánh dấu “Đã hiểu”.')}</p></div>
        <div class="row">${open.length ? (retry ? `<a class="btn" href="#/mistakes">📋 ${t('Xem danh sách')}</a>` : `<a class="btn primary" href="#/mistakes?retry=1">🔁 ${t('Làm lại lỗi sai')}</a>`) : ''}${open.length ? `<a class="btn" href="#/practice/learn?src=forgetting">🧠 ${t('Ôn từ sắp quên')}</a>` : ''}<button class="btn sm" id="clearFixed">${t('Dọn lỗi đã sửa')}</button></div></div>
      <div class="tabs" style="display:inline-flex;margin-bottom:1rem" id="mTabs"><button class="on" data-k="">${t('Tất cả ({n})', { n: open.length })}</button>${Object.entries(KIND).map(([k, [e, n]]) => `<button data-k="${k}">${e} ${n} (${open.filter(x => x.kind === k).length})</button>`).join('')}</div>
      <div id="mList"></div>`;
    const draw = k => {
      const rows = open.filter(x => !k || x.kind === k);
      if (retry) rows.sort((a, b) => (b.n || 1) - (a.n || 1)); // làm lại: câu sai nhiều lần nhất lên trước
      $('#mList').innerHTML = rows.length ? rows.map((x, i) => `<div class="card" style="margin-bottom:.7rem">
        <div class="row between"><span class="chip">${KIND[x.kind] ? KIND[x.kind][0] + ' ' + KIND[x.kind][1] : x.kind}</span><span class="tiny muted">${t('sai {n} lần', { n: x.n })} · ${new Date(x.at).toLocaleDateString(I18N.lang())}</span></div>
        <div style="margin-top:.4rem;font-weight:600">${esc(x.q)}</div>
        ${retry ? `<div class="row" style="margin-top:.5rem;gap:.4rem" data-rt="${esc(x.key)}">${String(x.answer || '').split(/\s+/).length <= 4 ? `<input class="input" style="flex:1;min-width:0" placeholder="${t('Gõ đáp án của bạn')}" data-in><button class="btn sm primary" data-chk>${t('Kiểm tra')}</button>` : `<button class="btn sm primary" data-show>${t('Hiện đáp án')}</button>`}</div><div data-ans hidden>` : '<div>'}
        ${x.given ? `<div class="small" style="margin-top:.3rem"><span style="color:var(--again)">✗ ${esc(x.given)}</span></div>` : ''}
        <div class="small"><span style="color:var(--good)">✓ ${esc(x.answer)}</span></div>
        ${x.explain ? `<div class="small muted" style="margin-top:.3rem">💡 ${esc(x.explain)}</div>` : ''}
        ${retry ? `<div class="row" style="margin-top:.4rem" data-self><button class="btn sm" data-ok>✅ ${t('Mình làm đúng')}</button><button class="btn sm ghost" data-no>✗ ${t('Vẫn sai')}</button></div>` : ''}</div>
        <div class="row" style="margin-top:.6rem"><button class="btn sm" data-fix="${esc(x.key)}">✓ ${t('Đã hiểu')}</button>
          ${x.kind === 'grammar' && x.ref ? `<a class="btn sm ghost" href="#/grammar/${esc(x.ref)}">📐 ${t('Xem lại bài')}</a>` : ''}
          ${x.kind === 'vocab' && x.ref ? `<a class="btn sm ghost" href="#/dict/${encodeURIComponent(x.ref)}">🔎 ${t('Tra lại từ')}</a>${App.inDeck(x.ref) ? '' : `<button class="btn sm ghost" data-add-seed="${esc(x.ref)}">+ Flashcard</button>`}` : ''}
          ${x.kind === 'reading' && x.ref ? `<a class="btn sm ghost" href="#/read/${esc(x.ref)}">📖 ${t('Đọc lại bài')}</a>` : ''}
          ${x.kind === 'listening' && x.ref ? `<a class="btn sm ghost" href="#/listen/${esc(x.ref)}">🎧 ${t('Nghe lại phần này')}</a>` : ''}</div></div>`).join('')
        : `<div class="card empty"><div class="em">🎉</div>${t('Không có lỗi sai nào cần xem lại.')}</div>`;
      App.bindCommon();
      // Làm lại: tự nhớ đáp án trước khi xem (active recall) → đúng thì gỡ khỏi sổ, sai thì tăng số lần sai
      const settle = async (card, key, ok) => {
        const all = await Store.get('mistakes', []); const it = all.find(x => x.key === key);
        if (it) { if (ok) it.fixed = true; else it.n = (it.n || 1) + 1; }
        await Store.set('mistakes', all);
        if (ok) { App.reward({ xp: 3 }, card); Sfx.correct(); card.style.opacity = '.5'; setTimeout(() => card.remove(), 600); } else Sfx.wrong();
      };
      $$('[data-rt]').forEach(box => {
        const card = box.closest('.card'), key = box.dataset.rt, ans = $('[data-ans]', card), it = rows.find(x => x.key === key);
        const reveal = () => { ans.hidden = false; box.hidden = true; };
        const show = $('[data-show]', box); if (show) show.onclick = reveal;
        const chk = $('[data-chk]', box), inp = $('[data-in]', box);
        if (chk) { const go = () => { const ok = window.QE && QE.norm ? QE.norm(inp.value) === QE.norm(it.answer) : inp.value.trim().toLowerCase() === String(it.answer).trim().toLowerCase(); reveal(); const self = $('[data-self]', card); if (self) self.hidden = true; settle(card, key, ok); }; chk.onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); }; }
        const okB = $('[data-ok]', card), noB = $('[data-no]', card);
        if (okB) okB.onclick = () => settle(card, key, true);
        if (noB) noB.onclick = () => { settle(card, key, false); $('[data-self]', card).hidden = true; };
      });
      $$('[data-fix]').forEach(b => b.onclick = async () => {
        const all = await Store.get('mistakes', []); const it = all.find(x => x.key === b.dataset.fix); if (it) it.fixed = true;
        await Store.set('mistakes', all); App.reward({ xp: 2 }, b); b.closest('.card').remove();
      });
    };
    draw('');
    $$('#mTabs button').forEach(b => b.onclick = () => { $$('#mTabs button').forEach(x => x.classList.toggle('on', x === b)); draw(b.dataset.k); });
    $('#clearFixed').onclick = async () => { await Store.set('mistakes', (await Store.get('mistakes', [])).filter(x => !x.fixed)); toast(t('Đã dọn')); };
  };

  // ================= KIỂM TRA ĐẦU VÀO =================
  routes.placement = function () {
    const lib = IELTS_DATA.TOPICS.filter(t => t.group === 'topics' || t.group === 'awl').flatMap(t => t.words).filter(w => w.vi && w.level);
    const pickW = (lv, n) => shuffle(lib.filter(w => w.level === lv)).slice(0, n).map(w => ({ kind: 'vocab', lv, w }));
    const G = (window.GRAMMAR || []);
    const pickG = (lv, n) => shuffle(G.filter(l => l.level === lv)).slice(0, n).map(l => ({ kind: 'grammar', lv, l, q: l.quiz[Math.floor(Math.random() * l.quiz.length)] }));
    const qs = shuffle([...pickW('B1', 3), ...pickW('B2', 4), ...pickW('C1', 3), ...pickG('A2', 2), ...pickG('B1', 4), ...pickG('B2', 3), ...pickG('C1', 1)]);
    const W = { A2: 1, B1: 1.5, B2: 2, C1: 2.6, C2: 3 };
    let i = 0, got = 0, max = 0;
    const res = { vocab: [0, 0], grammar: [0, 0] };
    const next = () => {
      if (i >= qs.length) return finish();
      const q = qs[i];
      let opts, prompt, correct;
      if (q.kind === 'vocab') {
        const others = shuffle(lib.filter(x => x.word !== q.w.word && x.vi !== q.w.vi)).slice(0, 3);
        opts = shuffle([q.w, ...others]).map(x => x.vi); correct = opts.indexOf(q.w.vi);
        prompt = `<div class="tiny muted">${t('TỪ VỰNG')} · ${q.lv}</div><div class="entry-word" style="margin:.3rem 0">${esc(q.w.word)}</div><div class="muted">${t('Chọn nghĩa đúng')}</div>`;
      } else {
        opts = q.q.options; correct = q.q.answer;
        prompt = `<div class="tiny muted">${t('NGỮ PHÁP')} · ${q.lv}</div><div style="font-size:1.15rem;font-weight:700;margin-top:.4rem">${esc(q.q.q)}</div>`;
      }
      view.innerHTML = `<div class="study-wrap"><div class="study-top"><a class="icon-btn" href="#/home">✕</a><div class="progress"><i style="width:${i / qs.length * 100}%"></i></div><span class="small muted">${i + 1}/${qs.length}</span></div>
        <div class="card q-card">${prompt}</div>
        <div class="options">${opts.map((o, k) => `<button class="option" data-k="${k}"><span class="kbd">${k + 1}</span>${esc(o)}</button>`).join('')}<button class="option" data-k="-1" style="color:var(--muted)">🤷 ${t('Tôi không biết')}</button></div></div>`;
      $$('.option').forEach(b => b.onclick = () => {
        const ok = +b.dataset.k === correct;
        const w = W[q.lv] || 1.5;
        max += w; if (ok) got += w;
        res[q.kind][1]++; if (ok) res[q.kind][0]++;
        i++; next();
      });
    };
    const finish = async () => {
      const pct = Math.round(got / Math.max(1, max) * 100);
      const band = pct >= 88 ? '7.5+' : pct >= 75 ? '7.0' : pct >= 62 ? '6.5' : pct >= 50 ? '6.0' : pct >= 38 ? '5.5' : pct >= 25 ? '5.0' : '4.5';
      const stage = pct >= 75 ? 's3' : pct >= 50 ? 's2' : pct >= 30 ? 's1' : 's0';
      const vp = Math.round(res.vocab[0] / Math.max(1, res.vocab[1]) * 100), gp = Math.round(res.grammar[0] / Math.max(1, res.grammar[1]) * 100);
      state.settings.placement = { band, pct, vocab: vp, grammar: gp, stage, at: Date.now() };
      await App.saveSettings();
      App.reward({ quizzes: 1, xp: 20 }); Sfx.win(); confetti();
      const weak = vp < gp ? t('từ vựng') : t('ngữ pháp');
      view.innerHTML = `<div class="study-wrap"><div class="card celebrate empty">
        <div class="em">🎯</div><h2>${t('Trình độ ước tính: Band {band}', { band })}</h2>
        <div class="row center" style="gap:2rem;margin:1rem 0">${ring(vp, vp + '%', 'var(--primary)')}<div class="small">${t('Từ vựng')}</div>${ring(gp, gp + '%', 'var(--accent)')}<div class="small">${t('Ngữ pháp')}</div></div>
        <p>${t('Điểm cần ưu tiên: <b>{weak}</b>. Kế hoạch hôm nay trên trang chủ đã được điều chỉnh theo kết quả này.', { weak })}</p>
        <p class="small muted">${t('Gợi ý bắt đầu lộ trình từ <b>{stage}</b>.', { stage: { s0: t('Chặng 0 · Từ cốt lõi'), s1: t('Chặng 1 · Nền tảng'), s2: t('Chặng 2 · Mở rộng chủ đề'), s3: t('Chặng 3 · Học thuật') }[stage] })} ${t('Kết quả chỉ để tham khảo, không thay thế bài thi thật.')}</p>
        <div class="row center"><a class="btn primary" href="#/home">${t('Xem kế hoạch hôm nay →')}</a><a class="btn" href="#/path">🗺️ ${t('Lộ trình')}</a></div></div></div>`;
    };
    view.innerHTML = `<div class="study-wrap"><div class="card celebrate empty"><div class="em">🧭</div><h2>${t('Kiểm tra đầu vào (5 phút)')}</h2>
      <p>${t('20 câu từ vựng và ngữ pháp từ A2 đến C1. Lexkite dùng kết quả để <b>ước tính band</b>, tìm <b>điểm yếu</b> và cá nhân hóa kế hoạch học mỗi ngày.')}</p>
      <p class="small muted">${t('Không biết thì chọn “Tôi không biết” – đừng đoán, kết quả sẽ chính xác hơn.')}</p>
      <button class="btn primary lg" id="go">${t('Bắt đầu →')}</button></div></div>`;
    $('#go').onclick = next;
  };

  // ================= KẾ HOẠCH HÔM NAY (thích ứng) =================
  App.todayPlan = async function () {
    if (App.need) await App.need('grammar', 'pron', 'listening');
    const s = state.settings, g = state.game, d = g.days[todayKey()] || {};
    const tasks = [];
    const dueNow = Golden.dueNow(state.cards);
    const doneReviews = (state.stats.days[todayKey()] || 0);
    if (!s.placement) tasks.push({ em: '🧭', t: t('Làm bài kiểm tra đầu vào (5 phút)'), sub: t('Để Lexkite cá nhân hóa lộ trình cho bạn'), href: '#/placement', done: false });
    if (dueNow || doneReviews) tasks.push({ em: '🔁', t: dueNow ? t('Ôn {n} thẻ đang đến thời điểm vàng', { n: dueNow }) : t('Ôn tập thẻ đến hạn'), sub: t('Lặp lại ngắt quãng – ưu tiên số 1'), href: '#/review', done: !dueNow && doneReviews > 0 });
    const cur = App.pathCurrent && App.pathCurrent();
    if (cur) tasks.push({ em: cur.topic.emoji, t: t('Lộ trình: {name}', { name: cur.topic.name }), sub: `${cur.stage.name} · ${t('đã học {pct}%', { pct: Math.round(cur.pct * 100) })}`, href: '#/path', done: false });
    // Ngữ pháp: bài chưa đạt / bài kế tiếp phù hợp trình độ
    const G = window.GRAMMAR || [], gd = g.grammarDone || {};
    const weakG = G.find(l => gd[l.id] != null && gd[l.id] < 80) || G.find(l => gd[l.id] == null && (!s.placement || s.placement.grammar < 70 || l.level !== 'A2'));
    if (weakG) tasks.push({ em: '📐', t: t('Ngữ pháp: {title}', { title: weakG.title }), sub: gd[weakG.id] != null ? t('Lần trước {pct}% – làm lại cho chắc', { pct: gd[weakG.id] }) : t('Học từng bước + {n} câu luyện tập', { n: weakG.quiz.length }), href: `#/grammar/${weakG.id}`, done: (d.quizzes || 0) > 0 && gd[weakG.id] >= 80 });
    // Nghe: phần chưa làm / làm chưa tốt (mỗi ngày 1 phần ~8 phút)
    const LS = window.LISTENING || [], ld = g.listenDone || {};
    const nextL = LS.find(p => ld[p.id] == null) || LS.find(p => ld[p.id] < 8);
    if (nextL) tasks.push({ em: '🎧', t: t('Nghe: Test {test} · Part {part}', { test: nextL.test, part: nextL.part }), sub: ld[nextL.id] != null ? t('Lần trước {score}/10 – nghe lại có lời thoại', { score: ld[nextL.id] }) : `${nextL.title} · ${t('10 câu')}`, href: `#/listen/${nextL.id}`, done: false });
    // Phát âm
    const PR = window.PRON || [], pd = g.pronDone || {};
    const nextP = PR.find(p => pd[p.id] == null);
    if (nextP) tasks.push({ em: '🔤', t: t('Phát âm: {title}', { title: nextP.title }), sub: t('Khẩu hình → nghe phân biệt → nói & chấm điểm'), href: `#/pron/${encodeURIComponent(nextP.id)}`, done: false });
    // Lỗi sai
    const mistakes = (await Store.get('mistakes', [])).filter(x => !x.fixed).length;
    if (mistakes) tasks.splice(2, 0, { em: '📕', t: t('Làm lại {n} lỗi sai', { n: mistakes }), sub: t('Tự nhớ lại đáp án – sửa lỗi = tăng điểm nhanh nhất'), href: '#/mistakes?retry=1', done: false }); // ưu tiên cao: ngay sau ôn thẻ
    // Kỹ năng xoay vòng theo ngày: Đọc → Nói → Viết
    const dow = new Date().getDay();
    const essays = await Store.get('essays', []);
    if (dow % 3 === 0) tasks.push({ em: '📖', t: t('Đọc 1 bài IELTS & lưu từ mới'), sub: t('Ngữ liệu dễ hiểu – học từ trong ngữ cảnh'), href: '#/reading', done: (d.readings || 0) > 0 });
    else if (dow % 3 === 1) tasks.push({ em: '🗣️', t: t('Luyện Speaking 1 câu hỏi'), sub: t('Ghi âm, nghe lại, xem phân tích từ vựng'), href: '#/speaking', done: (d.spoken || 0) >= 3 });
    else tasks.push({ em: '✍️', t: t('Viết 1 đoạn Task 2'), sub: essays.length ? t('Dùng lại từ vựng đã học') : t('Thử Phòng viết lần đầu'), href: '#/write', done: essays.some(e => todayKey(new Date(e.at)) === todayKey()) });
    return tasks.slice(0, 6);
  };

  // ================= TÀI NGUYÊN MIỄN PHÍ CHÍNH THỐNG =================
  const RES = [
    ['📝', t('Đề mẫu chính thức IELTS'), 'ielts.org – Sample test questions', 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions', t('Đề mẫu cả 4 kỹ năng từ đơn vị tổ chức thi – dùng để làm quen dạng bài thật.')],
    ['🖥️', t('Làm quen thi trên máy tính'), 'British Council – Computer-delivered IELTS', 'https://www.britishcouncil.vn/thi/ielts/chuan-bi', t('Bài làm quen giao diện thi trên máy (Familiarisation test) và tài liệu ôn miễn phí của Hội đồng Anh.')],
    ['🎓', 'IDP IELTS Prepare', 'ielts.idp.com/prepare', 'https://ielts.idp.com/prepare', t('Bài luyện, mẹo và video miễn phí từ IDP.')],
    ['📚', 'LearnEnglish (British Council)', 'learnenglish.britishcouncil.org', 'https://learnenglish.britishcouncil.org/', t('Bài đọc, nghe, ngữ pháp theo trình độ A1–C1 – có bài tập tương tác.')],
    ['📻', 'BBC Learning English', 'bbc.co.uk/learningenglish', 'https://www.bbc.co.uk/learningenglish/', t('“6 Minute English”, tin tức chậm – tuyệt vời để “tắm ngôn ngữ” mỗi ngày.')],
    ['🎬', 'TED & TED-Ed', 'ted.com', 'https://www.ted.com/talks', t('Bài nói chủ đề học thuật có phụ đề – bật add-on Lexkite trên YouTube để tra từ trong phụ đề.')],
    ['🗽', 'VOA Learning English', 'learningenglish.voanews.com', 'https://learningenglish.voanews.com/', t('Tin tức đọc chậm, rõ (giọng Mỹ) kèm bản chữ.')],
    ['🔊', 'YouGlish', 'youglish.com', 'https://youglish.com/', t('Nghe một từ được người bản xứ phát âm trong hàng nghìn video thật.')],
    ['✍️', 'Write & Improve', 'Cambridge English', 'https://writeandimprove.com/', t('Nộp đoạn viết để nhận phản hồi tự động miễn phí (cấp độ CEFR).')],
    ['📖', 'Oxford Learner’s Dictionaries', 'oxfordlearnersdictionaries.com', 'https://www.oxfordlearnersdictionaries.com/', t('Từ điển cho người học – tra thêm ví dụ, collocation; add-on Lexkite hoạt động ngay trên trang này.')],
  ];
  routes.resources = function () {
    view.innerHTML = `
      <div class="page-head"><div><h1>🌐 ${t('Tài nguyên miễn phí chính thống')}</h1><p class="muted">${t('Đã chọn lọc từ các nguồn uy tín, hợp pháp. Mẹo: mở trang và dùng add-on Lexkite để <b>bấm đúp tra từ, bôi đen dịch câu</b> – mọi từ mới tự vào thư viện “Từ trang web”.')}</p></div></div>
      <div class="grid auto">${RES.map(([em, ti, sub, url, d]) => `<a class="card hover topic-card" href="${url}" target="_blank" rel="noopener" style="color:var(--text)">
        <span class="em">${em}</span><h3>${esc(ti)}</h3><div class="tiny muted" style="font-weight:700">${esc(sub)} ↗</div><div class="muted small">${esc(d)}</div></a>`).join('')}</div>
      <div class="card" style="margin-top:1rem"><h3>📅 ${t('Thói quen “tắm ngôn ngữ” 20 phút/ngày')}</h3>
        <ol style="padding-left:1.2rem;line-height:1.9"><li>${t('Nghe 1 bài BBC 6 Minute English hoặc 1 video TED có phụ đề – tra từ trong phụ đề bằng add-on.')}</li>
        <li>${t('Đọc 1 bài trong Lexkite hoặc LearnEnglish – lưu 3–5 từ kèm câu gốc.')}</li><li>${t('Ôn flashcard đúng thời điểm vàng.')}</li><li>${t('Nói lại nội dung vừa nghe/đọc trong 1 phút ở Phòng Speaking.')}</li></ol></div>`;
  };
})();
