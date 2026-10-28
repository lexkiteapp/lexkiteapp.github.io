/* Học thích ứng (kiểu Mochi IELTS): kiểm tra đầu vào, kế hoạch hôm nay theo điểm yếu, sổ lỗi sai, tài nguyên miễn phí chính thống. */
(function () {
  const { $, $$, esc, toast } = UI;
  const { Store, Golden, SRS, Cards, todayKey } = Core;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;

  // ================= SỔ LỖI SAI =================
  // App.logMistake({ kind: 'vocab'|'grammar'|'reading', q, answer, given, explain, ref })
  let mLock = Promise.resolve();
  // q/given/explain có thể là I18N.tk('khóa', {biến}) → lưu KHÓA (qK…) và dịch lúc vẽ: đổi ngôn ngữ giao diện không còn lẫn chữ cũ.
  // Vẫn lưu kèm bản đã dịch (q…) cho mã cũ đọc chuỗi.
  const LZ = ['q', 'given', 'explain'];
  const tr = (x, f) => (x[f + 'K'] ? t(x[f + 'K'].k, x[f + 'K'].v) : x[f]);
  // Bản ghi cũ (lưu chữ đã dịch): nhận lại khóa từ mẫu tiếng Việt / tiếng Anh / ngôn ngữ hiện tại
  const MK = ['{title} – câu {n}: {q}', '{title} – Câu {n}: {q}', 'Test {t} – Câu {n}: {q}', 'Thi thử – câu {n}: {q}', 'Từ tiếng Anh nghĩa là “{vi}”?', 'Điền từ: {sentence}', 'Nghĩa của “{word}”?', '(bỏ trống)', 'Nghe: “…{cue}…”', 'Tham khảo: “…{cue}…”'];
  const unkey = s => {
    const D = window.I18N_DICT || {};
    for (const k of MK) for (const pat of new Set([k, D.en && D.en[k], D[I18N.lang()] && D[I18N.lang()][k]].filter(Boolean))) {
      const names = []; const re = new RegExp('^' + pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{(\w+)\\\}/g, (m, n) => { names.push(n); return '([\\s\\S]*?)'; }) + '$');
      const m = re.exec(s); if (m) return { k, v: Object.fromEntries(names.map((n, i) => [n, m[i + 1]])) };
    }
    return null;
  };
  const migrate = list => { let ch = 0; for (const x of list) for (const f of LZ) if (typeof x[f] === 'string' && !x[f + 'K']) { const o = unkey(x[f]); if (o) { x[f + 'K'] = o; ch++; } } return ch; };
  App.logMistake = m => (mLock = mLock.then(async () => {
    const list = await Store.get('mistakes', []);
    m = { ...m }; for (const f of LZ) if (m[f] && typeof m[f] === 'object') { m[f + 'K'] = m[f]; m[f] = t(m[f].k, m[f].v); }
    const key = m.kind + '|' + (m.qK ? m.qK.k + JSON.stringify(m.qK.v) : m.q);
    const old = list.find(x => x.key === key);
    if (old) { old.n = (old.n || 1) + 1; old.at = Date.now(); old.fixed = false; }
    else list.unshift({ ...m, key, n: 1, at: Date.now(), fixed: false });
    await Store.set('mistakes', list.slice(0, 300));
  }));
  const KIND = () => ({ vocab: [UI.icon('a-large-small'), t('Từ vựng')], grammar: [UI.icon('ruler'), t('Ngữ pháp')], reading: [UI.icon('book-open'), t('Đọc hiểu')], listening: [UI.icon('headphones'), t('Nghe')] });

  // Loa + IPA (owner 28/10): từ ở câu hỏi "Nghĩa của …?" (không lộ đáp án) · từ/đáp án tiếng Anh trong phần đáp án (ẩn tới khi lộ ở chế độ làm lại)
  const vWord = x => (x.kind === 'vocab' && x.ref && /^[a-z][a-z' .-]*$/i.test(x.ref) ? x.ref : '');
  const qWord = x => (x.qK && x.qK.k === 'Nghĩa của “{word}”?' && x.qK.v && x.qK.v.word) || '';
  const isEn = s => /[a-z]{2}/i.test(s) && /^[\x20-\x7E‘’“”–—…]+$/.test(s) && !/_{2,}/.test(s);
  const ansSay = x => { const a = String(x.answer || '').trim(); if (!a || !isEn(a)) return ''; if (x.kind === 'vocab') return ''; /* từ vựng: loa + IPA ở dòng giải thích bên dưới */ return ' ' + UI.sayBtn(a); };
  routes.mistakes = App.guard(async function (arg, query) {
    const w = App.W;
    const retry = !!(query && query.get && query.get('retry'));
    const list = await w(Store.get('mistakes', []));
    if (migrate(list)) await w(Store.set('mistakes', list));
    const open = list.filter(x => !x.fixed);
    view.innerHTML = `
      <div class="page-head"><div><h1>${UI.icon('book-x')} ${t('Sổ lỗi sai')}</h1><p class="muted">${t('Mọi câu bạn làm sai đều được ghi lại tự động. Ôn lại lỗi sai là cách tăng điểm nhanh nhất – xem lại vì sao sai rồi đánh dấu “Đã hiểu”.')}</p></div>
        <div class="row">${open.length ? (retry ? `<a class="btn" href="#/mistakes">${UI.icon('clipboard-list')} ${t('Xem danh sách')}</a>` : `<a class="btn primary" href="#/mistakes?retry=1">${UI.icon('repeat')} ${t('Làm lại lỗi sai')}</a>`) : ''}${open.length ? `<a class="btn" href="#/practice/learn?src=forgetting">🧠 ${t('Ôn từ sắp quên')}</a>` : ''}<button class="btn sm" id="clearFixed">${t('Dọn lỗi đã sửa')}</button></div></div>
      <div class="tabs" style="display:inline-flex;margin-bottom:1rem" id="mTabs"><button class="on" data-k="">${t('Tất cả ({n})', { n: open.length })}</button>${Object.entries(KIND()).map(([k, [e, n]]) => `<button data-k="${k}">${e} ${n} (${open.filter(x => x.kind === k).length})</button>`).join('')}</div>
      <div id="mList"></div>`;
    const draw = k => {
      const rows = open.filter(x => !k || x.kind === k);
      if (retry) rows.sort((a, b) => (b.n || 1) - (a.n || 1)); // làm lại: câu sai nhiều lần nhất lên trước
      $('#mList').innerHTML = rows.length ? rows.map((x, i) => `<div class="card" style="margin-bottom:.7rem">
        <div class="row between"><span class="chip">${KIND()[x.kind] ? KIND()[x.kind][0] + ' ' + KIND()[x.kind][1] : x.kind}</span><span class="tiny muted">${t('sai {n} lần', { n: x.n })} · ${new Date(x.at).toLocaleDateString(I18N.lang())}</span></div>
        <div style="margin-top:.4rem;font-weight:600">${esc(tr(x, 'q'))}${qWord(x) ? ` ${UI.ipaTag(qWord(x))}${UI.sayBtn(qWord(x))}` : ''}</div>
        ${retry ? `<div class="row" style="margin-top:.5rem;gap:.4rem" data-rt="${esc(x.key)}">${String(x.answer || '').split(/\s+/).length <= 4 ? `<input class="input" style="flex:1;min-width:0" placeholder="${t('Gõ đáp án của bạn')}" data-in><button class="btn sm primary" data-chk>${t('Kiểm tra')}</button>` : `<button class="btn sm primary" data-show>${t('Hiện đáp án')}</button>`}</div><div data-ans hidden>` : '<div>'}
        ${x.given ? `<div class="small" style="margin-top:.3rem"><span style="color:var(--again-text)">✗ ${esc(tr(x, 'given'))}</span></div>` : ''}
        <div class="small"><span style="color:var(--good-text)">✓ ${esc(x.answer)}</span>${ansSay(x)}</div>
        ${x.explain ? `<div class="small muted" style="margin-top:.3rem">${UI.icon('lightbulb')} ${esc(tr(x, 'explain'))}${vWord(x) ? (/\//.test(tr(x, 'explain')) ? '' : ' ' + UI.ipaTag(vWord(x))) + ' ' + UI.sayBtn(vWord(x)) : ''}</div>` : vWord(x) ? `<div class="small" style="margin-top:.3rem" lang="en"><b>${esc(vWord(x))}</b> ${UI.ipaTag(vWord(x))}${UI.sayBtn(vWord(x))}</div>` : ''}
        ${retry ? `<div class="row" style="margin-top:.4rem" data-self><button class="btn sm" data-ok>${UI.icon('circle-check')} ${t('Mình làm đúng')}</button><button class="btn sm ghost" data-no>✗ ${t('Vẫn sai')}</button></div>` : ''}</div>
        <div class="row" style="margin-top:.6rem"><button class="btn sm" data-fix="${esc(x.key)}">✓ ${t('Đã hiểu')}</button>
          ${x.kind === 'grammar' && x.ref ? `<a class="btn sm ghost" href="#/grammar/${esc(x.ref)}">${UI.icon('ruler')} ${t('Xem lại bài')}</a>` : ''}
          ${x.kind === 'vocab' && x.ref ? `<a class="btn sm ghost" href="#/dict/${encodeURIComponent(x.ref)}">${UI.icon('search')} ${t('Tra lại từ')}</a>${App.inDeck(x.ref) ? '' : `<button class="btn sm ghost" data-add-seed="${esc(x.ref)}">+ Flashcard</button>`}` : ''}
          ${x.kind === 'reading' && x.ref ? `<a class="btn sm ghost" href="#/read/${esc(x.ref)}">${UI.icon('book-open')} ${t('Đọc lại bài')}</a>` : ''}
          ${x.kind === 'listening' && x.ref ? `<a class="btn sm ghost" href="#/listen/${esc(x.ref)}">${UI.icon('headphones')} ${t('Nghe lại phần này')}</a>` : ''}</div></div>`).join('')
        : `<div class="card empty"><div class="em">${UI.icon('party-popper')}</div>${t('Không có lỗi sai nào cần xem lại.')}</div>`;
      App.bindCommon(); UI.fillIpa($('#mList'));
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
  });

  // KIỂM TRA ĐẦU VÀO (#/placement): js/placement.js – tải lười, ước tính thích ứng + khoảng band.

  // ================= KẾ HOẠCH HÔM NAY (1 kế hoạch duy nhất, theo kỳ thi) =================
  // Thứ tự ưu tiên: Ngày N của lộ trình (gồm ôn nhanh từ đến hạn) → kiểm tra đầu vào (nhảy cóc) → ôn thẻ đến hạn → sửa lỗi sai → 1 bài kỹ năng theo kỳ thi (xoay vòng theo ngày).
  // Không tải gói nặng ở trang chủ: dữ liệu có sẵn thì gợi ý đúng bài, chưa có thì dẫn tới trang danh sách.
  App.todayPlan = async function () {
    const s = state.settings, g = state.game, d = g.days[todayKey()] || {};
    const ex = App.exam ? App.exam() : 'ielts', dow = new Date().getDay();
    const tasks = [];
    if (!s.placement) tasks.push({ em: '🧭', t: t('Làm bài kiểm tra đầu vào (5 phút)'), sub: t('Để Lexkite cá nhân hóa lộ trình cho bạn'), href: '#/placement', mins: 5, done: false });
    const { total } = Cards.dueCount(state.cards, s, state.stats);
    const gold = Golden.dueNow(state.cards), doneReviews = state.stats.days[todayKey()] || 0;
    if (total || doneReviews) tasks.push({ em: '🔁', t: total ? t('Ôn {n} thẻ', { n: total }) : t('Ôn tập thẻ đến hạn'), sub: gold ? t('{n} thẻ đang ở thời điểm vàng – sắp quên', { n: gold }) : t('Lặp lại ngắt quãng – ưu tiên số 1'), href: '#/review', mins: Math.max(2, Math.ceil(total / 6)), done: !total && doneReviews > 0 });
    // Sau kiểm tra đầu vào: kỹ năng yếu hơn được ưu tiên ngay sau ôn tập (lộ trình đã mở từ chặng gợi ý – path.js)
    const pl = s.placement, why = t('Ưu tiên theo bài kiểm tra đầu vào');
    const weak = !pl ? '' : pl.weak || (pl.vocab != null && pl.grammar != null ? (pl.vocab <= pl.grammar ? 'vocab' : 'grammar') : ''); // bản ghi cũ (v1): % đúng từng kỹ năng
    if (weak === 'grammar') {
      const G = window.GRAMMAR || [], gd = g.grammarDone || {}, lv = pl.gCefr === 'A2' || pl.gCefr === 'B1' || pl.gCefr === 'B2' || pl.gCefr === 'C1' ? pl.gCefr : 'B1';
      const l = G.find(x => gd[x.id] == null && x.level === lv) || G.find(x => gd[x.id] == null);
      tasks.push({ em: '📐', t: l ? t('Ngữ pháp: {title}', { title: l.title }) : t('Học 1 bài ngữ pháp'), sub: `${lv} · ${why}`, href: l ? '#/grammar/' + l.id : '#/grammar', mins: 10, done: (d.grammar || 0) > 0, focus: 'grammar' });
    }
    // Lộ trình theo NGÀY (path-day.js, tải lười): "Ngày N" = 1 buổi 5–10 phút trộn nhiều dạng bài – việc chính, đứng ĐẦU kế hoạch (nút lớn "Bắt đầu Ngày N")
    const dt = await App.lazy('pathx').then(() => window.DayPath && DayPath.todayTask()).catch(() => null);
    if (dt) tasks.unshift({ ...dt, sub: weak === 'vocab' ? `${dt.sub} · ${why}` : dt.sub, focus: weak === 'vocab' ? 'vocab' : '' });
    else { const pn = App.pathNext ? await App.pathNext() : null, cur = pn && pn.unit; // dự phòng: không tải được gói lộ trình theo ngày
      if (cur) tasks.push({ em: cur.topic.emoji, t: t('Học bài: {name}', { name: cur.topic.name }), sub: `${cur.stage.name} · ${t('đã học {pct}%', { pct: Math.round(cur.pct * 100) })}`, href: pn.href, mins: 8, done: (d.newWords || 0) >= 5, focus: weak === 'vocab' ? 'vocab' : '' }); }
    const mistakes = (await Store.get('mistakes', [])).filter(x => !x.fixed).length;
    if (mistakes) tasks.push({ em: '📕', t: t('Làm lại {n} lỗi sai', { n: mistakes }), sub: t('Tự nhớ lại đáp án – sửa lỗi = tăng điểm nhanh nhất'), href: '#/mistakes?retry=1', mins: Math.min(10, 2 + mistakes), done: false });
    const sk = await skillTask(ex, dow, d);
    if (sk && !tasks.some(x => x.href === sk.href)) tasks.push(sk);
    return tasks.slice(0, 5);
  };
  const TOEFL_ROT = [['response', UI.icon('headphones'), 'Listen and Choose a Response'], ['cw', UI.icon('puzzle'), 'Complete the Words'], ['email', UI.icon('mail'), 'Write an Email'], ['repeat', UI.icon('repeat'), 'Listen and Repeat'], ['conversation', UI.icon('users'), 'Listen to a Conversation'], ['daily', UI.icon('smartphone'), 'Read in Daily Life'], ['sentence', UI.icon('brick-wall'), 'Build a Sentence'], ['interview', UI.icon('mic'), 'Take an Interview'], ['announcement', '📢', 'Listen to an Announcement'], ['academic', UI.icon('library'), 'Read an Academic Passage'], ['discussion', UI.icon('message-circle'), 'Write for an Academic Discussion'], ['talk', UI.icon('graduation-cap'), 'Listen to an Academic Talk']];
  async function skillTask(ex, dow, d) {
    const g = state.game;
    if (ex === 'toefl') { const [k, em, n] = TOEFL_ROT[Math.floor(Date.now() / Core.DAY) % TOEFL_ROT.length]; return { em, t: 'TOEFL · ' + n, sub: t('Bài luyện hôm nay theo đúng dạng đề 2026'), href: '#/toefl-p/' + k, mins: 10, done: false }; }
    if (ex === 'toeic') return dow % 2 ? { em: '🎧', t: t('TOEIC Listening: 1 Part'), sub: t('Mô tả tranh, hỏi – đáp, hội thoại, bài nói'), href: '#/toeic', mins: 10, done: (d.listens || 0) > 0 } : { em: '📰', t: t('TOEIC Reading: 1 Part'), sub: t('Điền câu, điền đoạn, đọc hiểu'), href: '#/toeic', mins: 12, done: (d.quizzes || 0) > 0 };
    if (ex === 'general') {
      const r = dow % 3;
      if (r === 0) return { em: '📰', t: t('Đọc 1 bài & lưu từ mới'), sub: t('Ngữ liệu vừa sức – học từ trong ngữ cảnh'), href: '#/reading', mins: 12, done: (d.readings || 0) > 0 };
      if (r === 1) { const PR = window.PRON || [], pd = g.pronDone || {}, p = PR.find(x => pd[x.id] == null); return { em: '🔤', t: p ? t('Phát âm: {title}', { title: p.title }) : t('Luyện phát âm 1 âm'), sub: t('Khẩu hình → nghe phân biệt → nói & chấm điểm'), href: p ? '#/pron/' + encodeURIComponent(p.id) : '#/pron', mins: 8, done: false }; }
      const G = window.GRAMMAR || [], gd = g.grammarDone || {}, l = G.find(x => gd[x.id] == null);
      return { em: '📐', t: l ? t('Ngữ pháp: {title}', { title: l.title }) : t('Học 1 bài ngữ pháp'), sub: t('Bài học ngắn kèm bài tập'), href: l ? '#/grammar/' + l.id : '#/grammar', mins: 10, done: false };
    }
    // IELTS (Academic / General Training): Nghe → Đọc → Nói → Viết, xoay vòng theo ngày
    const r = dow % 4;
    if (r === 0) { const LS = window.LISTENING || [], ld = g.listenDone || {}, p = LS.find(x => ld[x.id] == null) || LS.find(x => ld[x.id] < 8);
      return { em: '🎧', t: p ? t('Nghe: Test {test} · Part {part}', { test: p.test, part: p.part }) : t('Nghe 1 phần IELTS'), sub: p && ld[p.id] != null ? t('Lần trước {score}/10 – nghe lại có lời thoại', { score: ld[p.id] }) : t('10 câu, có transcript và giải thích'), href: p ? '#/listen/' + p.id : '#/listening', mins: 10, done: (d.listens || 0) > 0 }; }
    if (r === 1) return { em: '📰', t: t('Đọc 1 bài IELTS & lưu từ mới'), sub: t('Ngữ liệu dễ hiểu – học từ trong ngữ cảnh'), href: '#/reading', mins: 15, done: (d.readings || 0) > 0 };
    if (r === 2) return { em: '🗣️', t: t('Luyện Speaking 1 câu hỏi'), sub: t('Ghi âm, nghe lại, xem phân tích từ vựng'), href: '#/speaking', mins: 8, done: (d.spoken || 0) >= 3 };
    const essays = await Store.get('essays', []), wroteToday = essays.some(e => todayKey(new Date(e.at)) === todayKey());
    return ex === 'ieltsgt' ? { em: '✉️', t: t('Viết 1 lá thư Task 1'), sub: t('Thư trang trọng, bán trang trọng, thân mật'), href: '#/letters', mins: 20, done: wroteToday }
      : { em: '✍️', t: t('Viết 1 đoạn Task 2'), sub: essays.length ? t('Dùng lại từ vựng đã học') : t('Thử Phòng viết lần đầu'), href: '#/write', mins: 20, done: wroteToday };
  }
})();
