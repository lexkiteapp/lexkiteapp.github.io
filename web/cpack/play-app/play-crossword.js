/* 🧩 Ô chữ mỗi ngày (game-system P5a, gói lười pxw): khung Stitch game-crossword, SRS chỉ thẻ đến hạn (Good/Hard gợi ý/Again bỏ qua), kết quả GameEnd. */
(function (g) {
  const X = () => g.XwCore, key = w => String(w || '').toLowerCase().trim();
  const day = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
 
  function bank(answer, have, rnd) {
    const need = [...answer].filter((ch, i) => !have[i]), pool = 'eariotnslcudpmhgbfywkvxzjq', out = need.slice();
    while (out.length < 12) { const c = pool[Math.floor(rnd() * (out.length < 9 ? 12 : pool.length))]; if (out.filter(x => x === c).length < 2) out.push(c); }
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out.slice(0, 12);
  }
  function run(H, src) {
    const App = g.App, { state } = App, view = App.view, { Cards, SRS, Stats, endOfToday } = g.Core, { esc, speak } = g.UI, t = g.t, B = g.PlayBlitz && g.PlayBlitz.core;
    const { emptySource, mean, pool, practiceDone, accent } = H;
    const list = (!src || src === 'deck' ? [...pool('due'), ...pool('weak'), ...pool('deck')] : pool(src)).filter(w => mean(w) && /^[a-z]{3,9}$/i.test(String(w.word || '').trim()));
    const seed = day() + '|' + (src || 'deck') + '|' + list.slice(0, 24).map(w => key(w.word)).sort().join(','), rnd = X().rng(seed);
    const P = X().build(list.slice(0, 24), { rnd, size: 9, max: 7 });
    if (P.entries.length < 3) return emptySource(src);
    const N = P.size, E = P.entries, typed = new Map(), st = {}, t0 = Date.now(), hash0 = location.hash;
    let cur = 0, pos = 0, hints = 0, over = false;
    const K = (r, c) => r * N + c, cells = e => X().cellsOf(e), done = e => !!st[e.dir + e.n], solvedAt = (r, c) => E.some(e => done(e) && cells(e).some(([a, b]) => a === r && b === c));
    const letterAt = new Map(P.cells.map(x => [K(x.r, x.c), x.ch]));
    const src0 = (H.srcName && H.srcName(src)) || t('Từ của bạn');
    const exOf = e => { const s = String(e.src.ex || '').replace(/\s+/g, ' ').trim(); if (!s) return ''; return done(e) ? s : s.replace(new RegExp(`\\b${e.answer}\\w*`, 'ig'), m => '_'.repeat(Math.min(9, m.length))); };
    const mount = () => {
      const e = E[cur], n = E.filter(done).length;
      const root = g.ST2.mount(view, 'game-crossword', { close: '#/practice', count: `${n}/${E.length}`, src: src0, xpL: '+' + g.Game.xpFor('game', { right: E.length, total: E.length }) + ' XP',
        solved: t('Đã giải {a}/{b}', { a: n, b: E.length }), pct: Math.round(n / E.length * 100), tag: `${e.n} ${e.dir === 'across' ? '→' : '↓'} · ${e.len}`,
        level: e.src.level || '', clue: mean(e.src), ex: exOf(e) }, null);
      root.id = 'xw'; return root;
    };
    let root = mount(), T = null;
   
    const sample = () => {
      const v = n => root.querySelector(`[data-v="${n}"]`), c = n => (v(n) || {}).className, sp = (n, j) => { const x = v(n); return x && x.children[j] && x.children[j].className; };
      return { block: c('block'), solved: c('solved'), empty: c('empty'), emptyN: c('emptyN'), active: c('active'), cursor: c('cursor'), num: sp('solved', 0), numE: sp('emptyN', 0), numA: sp('activeN', 0),
        let: sp('solved', 1), letA: sp('active', 0), letC: sp('cursor', 0), bar: sp('cursor', 1), chipOk: c('chipOk'), chipIcon: sp('chipOk', 0), chipTxt: sp('chipOk', 1), chipCur: c('chipCur'),
        chipOpen: c('chipOpen'), chipOpenTxt: sp('chipOpen', 0), key: c('key') };
    };
    function paint() {
      if (!T) T = sample();
      const e = E[cur], inCur = new Set(cells(e).map(([r, c]) => K(r, c))), [cr, cc] = cells(e)[pos] || [], html = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const k = K(r, c), a = letterAt.get(k);
        if (!a) { html.push(`<div class="${T.block}" aria-hidden="true"></div>`); continue; }
        const num = P.cells.find(x => x.r === r && x.c === c).n, ok = solvedAt(r, c), isC = !done(e) && r === cr && c === cc, v = ok ? a : typed.get(k) || '';
        const cls = ok ? T.solved : isC ? T.cursor : inCur ? T.active : num ? T.emptyN : T.empty, lc = ok ? T.let : isC ? T.letC : inCur ? T.letA : T.let;
        html.push(`<button type="button" role="gridcell" data-k="${k}" class="${cls}" aria-label="${esc(`${num || ''} ${v ? v.toUpperCase() : t('ô trống')}`.trim())}">${num ? `<span class="${ok ? T.num : inCur ? T.numA : T.numE}">${num}</span>` : ''}${v ? `<span class="${lc}">${esc(v.toUpperCase())}</span>` : ''}${isC ? `<span class="${T.bar}"></span>` : ''}</button>`);
      }
      root.querySelector('#xwGrid').innerHTML = html.join('');
      root.querySelector('#xwChips').innerHTML = E.map((x, i) => { const d = done(x), lab = `${x.n}${x.dir === 'across' ? '→' : '↓'}` + (d ? ' ' + x.answer.toUpperCase() : ' · ' + x.len);
        return `<button type="button" data-i="${i}" class="${d ? T.chipOk : i === cur ? T.chipCur : T.chipOpen}" aria-pressed="${i === cur}">${d ? `<span class="${T.chipIcon}" aria-hidden="true">check_circle</span>` : ''}<span class="${d ? T.chipTxt : T.chipOpenTxt}" lang="en">${esc(lab)}</span></button>`; }).join('');
      const have = cells(e).map(([r, c]) => solvedAt(r, c));
      root.querySelector('#xwKeys').innerHTML = done(e) ? '' : bank(e.answer, have, X().rng(seed + e.n + e.dir)).map(ch => `<button type="button" data-ch="${ch}" class="${T.key}" lang="en">${ch.toUpperCase()}</button>`).join('');
    }
    function select(i, p) {
      cur = i; const e = E[i]; pos = p != null ? p : Math.max(0, cells(e).findIndex(([r, c]) => !typed.get(K(r, c)) && !solvedAt(r, c)));
      root = mount(); paint(); wire();
    }
    const type = ch => { const e = E[cur]; if (done(e)) return; const cl = cells(e); while (pos < cl.length && solvedAt(...cl[pos])) pos++; if (pos >= cl.length) return; typed.set(K(...cl[pos]), ch); pos = Math.min(cl.length - 1, pos + 1); try { g.Sfx.tap && g.Sfx.tap(); } catch (x) { /* bỏ qua */ } paint(); };
    const del = () => { const e = E[cur], cl = cells(e); if (typed.get(K(...cl[pos])) && !solvedAt(...cl[pos])) typed.delete(K(...cl[pos])); else { pos = Math.max(0, pos - 1); if (!solvedAt(...cl[pos])) typed.delete(K(...cl[pos])); } paint(); };
    async function grade(e, ok, hard) {
      const k = key(e.word), c = state.cards[k];
      if (!ok && App.logMistake) App.logMistake({ kind: 'vocab', q: g.I18N.tk('Nghĩa của “{word}”?', { word: e.word }), a: e.word });
      if (!B || !B.isDue(c, endOfToday())) return;
      c.srs = SRS.review(c.srs, ok ? (hard ? 1 : 2) : 0); state.cards[k] = c;
      try { await Cards.update(c); state.stats = await Stats.logReview(false); } catch (x) { /* lưu lỗi: lần sau chấm lại */ }
    }
    function check() {
      const e = E[cur]; if (done(e)) return; const w = cells(e).map(([r, c]) => (solvedAt(r, c) ? letterAt.get(K(r, c)) : typed.get(K(r, c)) || '')).join('');
      if (w.length < e.len) { g.Sfx.answer(false, { el: root.querySelector('#xwGrid'), answer: '' }); return; }
      const ok = X().check(e, w); g.Sfx.answer(ok, { el: root.querySelector('#xwGrid'), answer: ok ? '' : e.answer, badge: false });
      if (!ok) { e.miss = (e.miss || 0) + 1; return; }
      st[e.dir + e.n] = e.hint ? 'hint' : 'ok'; grade(e, true, !!e.hint || !!e.miss); try { speak(e.word, accent()); } catch (x) { /* bỏ qua */ }
      next();
    }
    function hint() { const e = E[cur]; if (done(e)) return; const cl = cells(e), i = cl.findIndex(([r, c]) => typed.get(K(r, c)) !== letterAt.get(K(r, c))); if (i < 0) return check(); typed.set(K(...cl[i]), letterAt.get(K(...cl[i]))); e.hint = (e.hint || 0) + 1; hints++; pos = Math.min(cl.length - 1, i + 1); paint(); }
    function skip() { const e = E[cur]; if (done(e)) return; st[e.dir + e.n] = 'skip'; grade(e, false); cells(e).forEach(([r, c]) => typed.set(K(r, c), letterAt.get(K(r, c)))); next(); }
    function next() { const i = E.findIndex((x, j) => j > cur && !done(x)), j = i >= 0 ? i : E.findIndex(x => !done(x)); if (j < 0) return end(); select(j); }
    function wire() {
      root.querySelector('#xwGrid').onclick = ev => { const b = ev.target.closest('[data-k]'); if (!b) return; const k = +b.dataset.k, r = Math.floor(k / N), c = k % N;
        const hits = E.map((e, i) => [i, cells(e).findIndex(([a, bb]) => a === r && bb === c)]).filter(x => x[1] >= 0), same = hits.find(x => x[0] === cur);
        const pick = same && hits.length > 1 && cells(E[cur])[pos] && cells(E[cur])[pos][0] === r && cells(E[cur])[pos][1] === c ? hits.find(x => x[0] !== cur) : same || hits[0]; select(pick[0], pick[1]); };
      root.querySelector('#xwChips').onclick = ev => { const b = ev.target.closest('[data-i]'); if (b) select(+b.dataset.i); };
      root.querySelector('#xwKeys').onclick = ev => { const b = ev.target.closest('[data-ch]'); if (b) type(b.dataset.ch); };
      root.querySelector('#xwDel').onclick = del; root.querySelector('#xwCheck').onclick = check; root.querySelector('#xwHint').onclick = hint; root.querySelector('#xwSkip').onclick = skip;
      root.querySelector('#xwSay').onclick = () => { const e = E[cur]; if (done(e)) speak(e.word, accent()); else try { g.UI.toast(t('Giải xong từ này để nghe phát âm')); } catch (x) { /* bỏ qua */ } };
    }
    const keys = ev => { if (over || ev.ctrlKey || ev.metaKey || ev.altKey || (ev.target && /^(INPUT|TEXTAREA)$/.test(ev.target.tagName))) return;
      if (/^[a-z]$/i.test(ev.key)) { ev.preventDefault(); type(ev.key.toLowerCase()); } else if (ev.key === 'Backspace') { ev.preventDefault(); del(); } else if (ev.key === 'Enter') { ev.preventDefault(); check(); } };
    document.addEventListener('keydown', keys);
    App.cleanup = () => document.removeEventListener('keydown', keys);
    async function end() {
      over = true; App.cleanup();
      const right = E.filter(e => st[e.dir + e.n] !== 'skip').length, xp = g.Game.xpFor('game', { right, total: E.length, hints }), pct = Math.round(right / E.length * 100);
      await App.reward({ quizzes: 1, crossword: 1, xp });
      const mins = Math.max(1, Math.round((Date.now() - t0) / 60000)), grid = X().shareGrid(E, st), skipped = E.filter(e => st[e.dir + e.n] === 'skip');
      await App.need('gend').catch(() => {});
      if (location.hash === hash0 && g.GameEnd) g.GameEnd.show(view, { icon: '🧩', chip: t('Ô chữ mỗi ngày'), head: t('Xong ô chữ hôm nay!'), sub: grid, acc: pct, xp,
        tiles: [[right + '/' + E.length, t('Đúng')], [mins + "'", t('Thời gian')], [hints, t('Gợi ý')]], words: E.map(e => e.word),
        more: skipped.length ? g.GameEnd.row('edit_note', t('Từ cần ôn lại') + ':', skipped.map(e => `<span lang="en">${esc(e.word)}</span> = ${esc(mean(e.src))}`).join(' · ')) : '',
        again: { label: t('Chế độ khác'), fn: () => { location.hash = '#/practice'; } }, rev: { label: t('Ôn lại'), href: '#/review', icon: 'replay' },
        share: { label: t('Chia sẻ kết quả'), fn: async () => { const text = t('Mình giải ô chữ Lexkite hôm nay: {g}', { g: grid }); try { if (navigator.share) await navigator.share({ title: 'Lexkite', text, url: location.origin + '/' }); else { await navigator.clipboard.writeText(text); g.UI.toast(t('Đã sao chép')); } } catch (x) { /* người dùng hủy */ } } } });
      practiceDone({ mode: 'crossword', src, pct });
    }
    select(0);
  }
  g.PlayCrossword = { run, bank };
})(typeof self !== 'undefined' ? self : this);
