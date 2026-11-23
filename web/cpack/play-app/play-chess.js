/* ♟️ Cờ câu đố (P5c, gói pch): 5 thế chiếu hết 1 nước + thuật ngữ; test play-chess.mjs */
(function (g) {
  const R = 5, F = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟\uFE0E' }, GL = { K: F.k, Q: F.q, R: F.r, B: F.b, N: F.n, P: F.p, ...F };
  const NAME = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
  async function run(H, src) {
    const App = g.App, view = App.view, { esc, speak, shuffle } = g.UI, t = g.t, C = g.ChessCore, hash0 = location.hash;
    const order = shuffle(g.ChessPuzzles.map((_, i) => i)), picked = order.slice(0, R), spare = order.slice(R);
    let n = 0, fen, mv, sel = '', hintStep = 0, bad = '', done = false, solved = 0, misses = 0, hints = 0, board, flip = false, over = false, root, T = null, clean = true;
    const t0 = Date.now(), cur = () => g.ChessPuzzles[picked[n]];
    const tok = (c, re) => String(c || '').split(/\s+/).filter(x => re.test(x));
    const mount = () => {
      root = g.ST2.mount(view, 'game-chess', { close: '#/practice', pct: 0, cnt: '1 / ' + R, xpL: '+' + g.Game.xpFor('game', { right: R, total: R }) + ' XP', turn: '' }, null);
      root.id = 'ch'; return root;
    };
    const sample = () => {
      const v = x => root.querySelector(`[data-v="${x}"]`), c = x => (v(x) || {}).className || '', h = x => (v(x) || {}).innerHTML || '';
      return { sqL: c('sqL'), sqD: c('sqD'), pcB: tok(c('pcB'), /text-\[#|drop-shadow/), pcW: tok(c('pcW'), /text-\[#|text-white|drop-shadow/), sel: tok(c('sel'), /^shadow-\[inset/), dot: h('dot'), bad: h('bad'), selHtml: '<span class="absolute inset-0 bg-[#f2553b]/20"></span>' };
    };
    const load = () => {
      const p = cur(); fen = p[0]; mv = C.moves(fen); board = C.parse(fen).b; flip = fen.split(' ')[1] === 'b'; sel = ''; hintStep = 0; bad = ''; done = false; clean = true;
      const turn = flip ? t('Đen đi') : t('Trắng đi'), el = root.querySelector('#chTurn'); if (el) el.textContent = turn;
      const lab = root.querySelector('#chBoard').previousElementSibling; if (lab) [...lab.children].forEach((s, i) => { s.textContent = 'abcdefgh'[flip ? 7 - i : i]; });
      const bar = root.querySelector('header [style*=width]'); if (bar) bar.style.width = Math.round(n / R * 100) + '%';
      const cnt = root.querySelector('header .font-bold'); if (cnt) cnt.textContent = n + 1 + ' / ' + R;
      for (const id of ['#chFb', '#chTerm']) root.querySelector(id).hidden = true;
      const go = root.querySelector('#chGo'); go.disabled = true; const gl = go.querySelector('span:not(.absolute):not(.material-symbols-outlined)'); if (gl) gl.textContent = t(n + 1 < R ? 'Tiếp' : 'Xong');
    };
    const targets = () => (sel ? mv.filter(m => m.from === sel).map(m => m.to) : []);
    const hintMove = () => mv.find(m => m.mate);
    function paint() {
      if (!T) T = sample();
      const grid = root.querySelector('#chBoard'), tg = targets(), hm = hintStep ? hintMove() : null;
      let html = '';
      for (let i = 0; i < 64; i++) {
        const r = flip ? 7 - (i >> 3) : i >> 3, c = flip ? 7 - (i & 7) : i & 7, s = C.sq(r, c), p = board[r][c], light = (r + c) % 2 === 0;
        let cls = tok(light ? T.sqL : T.sqD, /./).filter(x => !/text-\[#/.test(x)).join(' '), inner = '';
        if (p) { cls += ' ' + (C.white(p) ? T.pcW : T.pcB).join(' '); inner = GL[p]; }
        const isSel = s === sel || (hm && hintStep && s === hm.from && !sel), isTg = tg.includes(s) || (hm && hintStep > 1 && s === hm.to);
        if (isSel) { cls += ' relative ' + T.sel.join(' '); inner = T.selHtml + (inner ? `<span class="relative z-10">${inner}</span>` : ''); }
        if (isTg && !p) inner = T.dot; else if (isTg) cls += ' relative ' + T.sel.join(' ');
        if (s === bad) inner = (inner || '') + `<span class="absolute text-[#BA1A1A]" aria-hidden="true">✕</span>`;
        const label = `${s}${p ? ' ' + (C.white(p) ? 'white ' : 'black ') + NAME[p.toLowerCase()] : ''}`;
        html += `<div role="button" tabindex="0" data-s="${s}" class="${cls}" aria-label="${esc(label)}" aria-pressed="${s === sel}">${inner}</div>`;
      }
      grid.innerHTML = html;
    }
    const show = (title, body, good) => {
      const fb = root.querySelector('#chFb'); fb.hidden = false; root.querySelector('#chFbT').textContent = title; root.querySelector('#chFbB').textContent = body; fb.dataset.ok = good ? '1' : '0';
    };
    function pick(s) {
      if (over || done) return;
      const m = sel && mv.find(x => x.from === sel && x.to === s);
      if (m) {
        sel = '';
        if (m.mate) {
          board = C.apply(fen, m.from, m.to); done = true; solved += clean ? 1 : 0; paint();
          g.Sfx.answer(true, { el: root.querySelector('#chBoard') });
          const term = cur()[1], te = root.querySelector('#chTerm'); te.hidden = false; te.lastElementChild.textContent = term;
          show(t('Chiếu hết!'), t('Đó là “{term}”.', { term }), true); speak(term, H.accent ? H.accent() : 'en-US');
          const go = root.querySelector('#chGo'); go.disabled = false; return go.focus && go.focus();
        }
        clean = false; misses++; bad = m.to; g.Sfx.answer(false, { el: root.querySelector('#chBoard'), answer: '', badge: false }); paint();
        show(t('Chưa chiếu hết'), t('Vua đối phương vẫn còn nước thoát – thử quân hoặc ô khác nhé.'), false);
        setTimeout(() => { if (bad === m.to) { bad = ''; if (!over) paint(); } }, 600); return;
      }
      const has = mv.some(x => x.from === s);
      sel = has && sel !== s ? s : ''; bad = ''; try { g.Sfx.pop && g.Sfx.pop(); } catch (e) { /* bỏ qua */ } paint();
    }
    function hint() { if (over || done) return; hintStep = Math.min(2, hintStep + 1); clean = false; hints++; sel = ''; paint(); }
    function skip() {
      if (over || done || !spare.length) { if (!done && !spare.length) g.UI.toast(t('Hết thế mới rồi – thử thế này nhé')); return; }
      picked[n] = spare.shift(); load(); paint();
    }
    async function end() {
      over = true;
      const xp = g.Game.xpFor('game', { right: solved, total: R, hints }), pct = Math.round(solved / R * 100), mins = Math.max(1, Math.round((Date.now() - t0) / 60000));
      await App.reward({ quizzes: 1, chess: 1, perfect: solved === R && !hints ? 1 : 0, xp });
      await App.need('gend').catch(() => {});
      if (location.hash === hash0 && g.GameEnd) g.GameEnd.show(view, { icon: '♟️', chip: t('Cờ câu đố'), head: solved === R ? '🏅 ' + t('Chiếu hết cả bộ!') : t('Xong rồi!'), acc: pct, xp,
        tiles: [[solved + '/' + R, t('Thế giải đúng')], [misses, t('Lần sai')], [hints, t('Gợi ý')], [mins + "'", t('Thời gian')]], words: picked.map(i => g.ChessPuzzles[i][1]),
        more: g.GameEnd.row('school', t('Thuật ngữ vừa học') + ':', picked.map(i => `<span lang="en">${esc(g.ChessPuzzles[i][1])}</span>`).join(' · ')),
        again: { label: t('Chơi lại'), fn: () => run(H, src) }, rev: { label: t('Chế độ khác'), href: '#/practice' } });
      if (H.practiceDone) H.practiceDone({ mode: 'chess', src, pct });
    }
    mount(); load(); paint();
    root.querySelector('#chBoard').onclick = ev => { const b = ev.target.closest('[data-s]'); if (b) pick(b.dataset.s); };
    root.querySelector('#chBoard').onkeydown = ev => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.dataset && ev.target.dataset.s) { ev.preventDefault(); pick(ev.target.dataset.s); } };
    root.querySelector('#chHint').onclick = hint; root.querySelector('#chSkip').onclick = skip;
    root.querySelector('#chGo').onclick = () => { if (!done) return; if (n + 1 >= R) return end(); n++; load(); paint(); };
    App.cleanup = () => { over = true; };
  }
  g.PlayChess = { run };
})(typeof self !== 'undefined' ? self : this);
