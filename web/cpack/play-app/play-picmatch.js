/* 🖼️ Ghép tranh (game-system P5b, gói lười ppm): 6 ảnh minh họa theo nghĩa (VImg) ↔ 6 từ, khung Stitch game-picmatch, SRS chỉ thẻ đến hạn (Good/Hard sai-gợi ý), kết quả GameEnd. */
(function (g) {
  const key = w => String(w || '').toLowerCase().trim(), N = 6;
  async function run(H, src) {
    const App = g.App, { state } = App, view = App.view, { Cards, SRS, Stats, endOfToday } = g.Core, { esc, speak, shuffle } = g.UI, t = g.t, B = g.PlayBlitz && g.PlayBlitz.core;
    const { emptySource, mean, pool, practiceDone, accent } = H, hash0 = location.hash;
    const cand = (!src || src === 'deck' ? [...pool('due'), ...pool('weak'), ...pool('deck')] : pool(src)).filter((w, i, a) => mean(w) && /^[a-z]{3,12}$/i.test(String(w.word || '').trim()) && a.findIndex(x => key(x.word) === key(w.word)) === i).slice(0, 60);
    const ready = await App.vimgReady(cand.map(w => App.imgKey(w)));
    if (location.hash !== hash0) return;
    if (!ready) { try { g.UI.toast(t('Ảnh minh họa đang mở dần – thử chế độ khác nhé')); } catch (e) { /* bỏ qua */ } location.hash = '#/practice'; return; }
    const url = w => (g.VImg ? g.VImg.quizUrl(...App.imgKey(w)) : '');
    const items = shuffle(cand.filter(url)).slice(0, N).map(w => ({ w, url: url(w), miss: 0, hint: 0, ok: false }));
    if (items.length < 4) return emptySource(src);
    const M = items.length, t0 = Date.now();
    let order = shuffle(items.map((_, i) => i)), sel = -1, hints = 0, matched = 0, misses = 0, bad = -1, over = false, T = null, root;
    const src0 = (H.srcName && H.srcName(src)) || t('Từ của bạn');
    const mount = () => {
      root = g.ST2.mount(view, 'game-picmatch', { close: '#/practice', pct: Math.round(matched / M * 100), xpL: '+' + g.Game.xpFor('game', { right: M, total: M }) + ' XP', src: src0, done: t('{a}/{b} đã nối', { a: matched, b: M }) }, null);
      root.id = 'pm'; return root;
    };
    const sample = () => {
      const v = n => root.querySelector(`[data-v="${n}"]`), c = n => (v(n) || {}).className, sp = (n, j) => { const x = v(n); return x && x.children[j] && x.children[j].className; };
      return { card: c('card'), cardSel: c('cardSel'), cardOk: c('cardOk'), slot: sp('card', 0), slotSel: sp('cardSel', 1), slotOk: sp('cardOk', 1), lab: sp('card', 1), labSel: sp('cardSel', 2), labOk: sp('cardOk', 2), badge: sp('cardOk', 0),
        w: c('w'), wOk: c('wOk'), wBad: c('wBad'), wTxt: sp('w', 0), wTxtOk: v('wOk').children[0].children[1].className, wTxtBad: v('wBad').children[0].children[1].className,
        wIc: v('wOk').children[0].children[0].className, wIcBad: v('wBad').children[0].children[0].className, wRow: v('wOk').children[0].className, spk: v('w').children[1].className, spkOk: v('wOk').children[1].className, spkBad: v('wBad').children[1].className };
    };
    const icon = (n, c) => `<span class="${c}" aria-hidden="true">${n}</span>`;
    function paint() {
      if (!T) T = sample();
      root.querySelector('#pmCards').innerHTML = items.map((it, i) => {
        const st = it.ok ? 'Ok' : i === sel ? 'Sel' : '', cls = T['card' + st] || T.card, slot = T['slot' + st] || T.slot, lab = T['lab' + st] || T.lab, img = `<img src="${esc(it.url)}" alt="" width="52" height="52" decoding="async" draggable="false" style="height:100%;width:auto;max-width:100%;object-fit:contain">`;
        return `<button type="button" data-c="${i}" class="${cls}" aria-pressed="${i === sel}" aria-label="${esc(t('Ảnh {n}', { n: i + 1 }))}${it.ok ? ' – ' + esc(it.w.word) : ''}"${it.ok ? ' disabled' : ''}>${it.ok ? `<div class="${T.badge}">${icon('check', 'material-symbols-outlined text-[14px]')}</div>` : ''}<div class="${slot}">${img}</div><span class="${lab}" lang="en">${it.ok ? esc(it.w.word) : ''}</span></button>`;
      }).join('');
      root.querySelector('#pmWords').innerHTML = order.map(i => {
        const it = items[i], st = it.ok ? 'Ok' : i === bad ? 'Bad' : '', cls = T['w' + st] || T.w, txt = T['wTxt' + st] || T.wTxt, ic = st === 'Ok' ? icon('check', T.wIc) : st === 'Bad' ? icon('close', T.wIcBad) : '', spk = T['spk' + st] || T.spk;
        return `<div role="button" tabindex="0" data-w="${i}" class="${cls}" aria-label="${esc(it.w.word)}"><div class="${T.wRow}">${ic}<span class="${txt}" lang="en">${esc(it.w.word)}</span></div><button type="button" data-s="${i}" class="${spk}" aria-label="${esc(t('Nghe phát âm'))}">${icon('volume_up', 'material-symbols-outlined')}</button></div>`;
      }).join('');
      root.querySelector('#pmShuffle').onclick = () => { order = shuffle(order); bad = -1; paint(); };
      root.querySelector('#pmHint').onclick = hint;
      const cardsEl = root.querySelector('#pmCards'), wordsEl = root.querySelector('#pmWords');
      cardsEl.onclick = ev => { const b = ev.target.closest('[data-c]'); if (!b || over) return; const i = +b.dataset.c; if (items[i].ok) return; sel = sel === i ? -1 : i; bad = -1; try { g.Sfx.pop && g.Sfx.pop(); } catch (e) { /* bỏ qua */ } paint(); };
      wordsEl.onclick = ev => { const s = ev.target.closest('[data-s]'); if (s) { speak(items[+s.dataset.s].w.word, accent()); return; } const b = ev.target.closest('[data-w]'); if (b) pick(+b.dataset.w); };
      wordsEl.onkeydown = ev => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.dataset && ev.target.dataset.w != null) { ev.preventDefault(); pick(+ev.target.dataset.w); } };
    }
    async function grade(it) {
      const k = key(it.w.word), c = state.cards[k];
      if (it.miss && App.logMistake) App.logMistake({ kind: 'vocab', q: g.I18N.tk('Nghĩa của “{word}”?', { word: it.w.word }), a: it.w.word });
      if (!B || !B.isDue(c, endOfToday())) return;
      c.srs = SRS.review(c.srs, it.miss || it.hint ? 1 : 2); state.cards[k] = c;
      try { await Cards.update(c); state.stats = await Stats.logReview(false); } catch (e) { /* lưu lỗi: lần sau chấm lại */ }
    }
    function pick(j) {
      if (over || items[j].ok) return;
      if (sel < 0) { speak(items[j].w.word, accent()); return; }
      const it = items[sel];
      if (sel === j) {
        it.ok = true; matched++; sel = -1; bad = -1; grade(it); g.Sfx.answer(true, { el: root.querySelector('#pmCards') }); speak(it.w.word, accent());
        if (matched === M) return end(); mount(); paint(); return;
      }
      it.miss++; misses++; bad = j; g.Sfx.answer(false, { el: root.querySelector('#pmWords'), answer: '', badge: false }); paint();
      setTimeout(() => { if (bad === j) { bad = -1; if (!over) paint(); } }, 600);
    }
    function hint() {
      if (over) return; if (sel < 0) { const i = items.findIndex(x => !x.ok); if (i < 0) return; sel = i; }
      items[sel].hint++; hints++; bad = -1; paint();
      const el = root.querySelector(`[data-w="${sel}"]`); if (el) { el.scrollIntoView && el.scrollIntoView({ block: 'nearest' }); el.style.outline = '3px solid #F2553B'; el.style.outlineOffset = '2px'; }
    }
    async function end() {
      over = true;
      const right = items.filter(x => !x.miss && !x.hint).length, xp = g.Game.xpFor('game', { right, total: M, hints }), pct = Math.round(right / M * 100), mins = Math.max(1, Math.round((Date.now() - t0) / 60000));
      await App.reward({ quizzes: 1, picmatch: 1, perfect: !misses && !hints ? 1 : 0, xp });
      const weak = items.filter(x => x.miss || x.hint);
      await App.need('gend').catch(() => {});
      if (location.hash === hash0 && g.GameEnd) g.GameEnd.show(view, { icon: '🖼️', chip: t('Ghép tranh'), head: misses || hints ? t('Xong rồi!') : '🏅 ' + t('Ghép đúng hết!'), acc: pct, xp,
        tiles: [[M + '/' + M, t('Cặp đã nối')], [misses, t('Lần sai')], [hints, t('Gợi ý')], [mins + "'", t('Thời gian')]], words: items.map(x => x.w.word),
        more: weak.length ? g.GameEnd.row('edit_note', t('Từ cần ôn lại') + ':', weak.map(x => `<span lang="en">${esc(x.w.word)}</span> = ${esc(mean(x.w))}`).join(' · ')) : '',
        again: { label: t('Chơi lại'), fn: () => run(H, src) }, rev: { label: t('Chế độ khác'), href: '#/practice' } });
      practiceDone({ mode: 'picmatch', src, pct });
    }
    mount(); paint();
    App.cleanup = () => { over = true; };
  }
  g.PlayPicmatch = { run };
})(typeof self !== 'undefined' ? self : this);
