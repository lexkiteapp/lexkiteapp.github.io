/* 🔤 Luyện động từ bất quy tắc – #/irregular/practice: điền chỗ trống (quá khứ / quá khứ phân từ), 10 câu từ bộ lọc hiện tại.
 * Gói lười 'irvdrill' (chỉ nạp khi luyện): dùng chung hàm với irregular.js qua Irv. Giao diện = Stitch brand/stitch/v2/irv-drill-{light,dark}.html. */
(function (g) {
  'use strict';
  const { $, esc } = UI, { filtered, miss, setMiss, saved, acc, ipaOf, ms, bodyOn } = Irv, enc = encodeURIComponent;
  const ROOT = 'st v2 v2-irregular-drill antialiased min-h-screen flex justify-center lt:bg-[#fff8f5] lt:text-[#132226] dk:bg-[#091518] dk:text-[#e6f1ef]';
  const speakIcon = b => { const i = b.querySelector('.material-symbols-outlined'); if (!i) return; i.textContent = 'graphic_eq'; setTimeout(() => { i.textContent = 'volume_up'; }, 800); };
  const clean = s => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[.,!?;:"“”]+$/g, '').replace(/^["“”]+/, '').replace(/\s+/g, ' ').trim();
  const accepts = (it, v) => it.ans.some(a => clean(a) === clean(v));
  function makeItems(D, rows, retry) {
    const m = miss();
    const pri = r => (m[r.b] ? 0 : saved(r.b) ? 1 : 2);
    let pool = retry ? retry.map(b => D.map[b]).filter(Boolean) : rows.slice().sort((a, b) => pri(a) - pri(b) || (m[b.b] || 0) - (m[a.b] || 0) || a.freq - b.freq || Math.random() - 0.5);
    const items = []; let k = 0;
    for (const r of pool) {
      if (items.length >= 10) break;
      const pp = retry ? retry.kind[r.b] === 'pp' : (k++ % 2 === 1);
      for (const kind of [pp ? 'pp' : 'p', pp ? 'p' : 'pp']) {
        const list = kind === 'p' ? r.past : r.ppl, s = kind === 'p' ? r.p : r.pp, ans = list.map(x => x.w);
        const re = new RegExp('\\b(' + ans.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'i'), mm = re.exec(s);
        if (!mm) continue; items.push({ b: r.b, kind, ans, pre: s.slice(0, mm.index), post: s.slice(mm.index + mm[0].length), sent: s, row: r }); break;
      }
    }
    return items;
  }
  function drill(view, D, query) {
    const qy = query || new URLSearchParams(), rk = qy.get('retry'), retry = rk ? Object.assign(rk.split(',').filter(Boolean).map(x => x.split(':')[0]), { kind: Object.fromEntries(rk.split(',').filter(Boolean).map(x => x.split(':'))) }) : null;
    const rows = filtered(D, { q: qy.get('q') || '', cef: qy.get('cef') || '', pat: qy.get('pat') || '', sort: qy.get('sort') || 'freq' });
    const base = rows.length ? rows : D.rows, items = makeItems(D, base, retry);
    if (!items.length) { location.replace('#/irregular'); return; }
    const total = items.length, queue = items.slice(), results = [], wrong = []; let idx = 0, state = 'ask', cur = null;
    bodyOn(); App.onCleanup && App.onCleanup(() => UI.stopSpeak());
    const prompt = it => it.kind === 'p' ? t('Điền dạng quá khứ') : t('Điền quá khứ phân từ');
    const frame = (inner, pct, n) => `<div class="v2s-irregular"><div class="${ROOT}" data-irv="drill"><div class="w-full max-w-[390px] lg:max-w-[560px] min-h-screen flex flex-col relative lt:bg-[#fff8f5] dk:bg-[#091518]">
      <header class="w-full pt-4 pb-3 px-4 flex items-center gap-3"><button type="button" data-exit aria-label="${esc(t('Thoát bài học'))}" class="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center active:scale-95 transition-all lt:text-[#4a5d61] lt:hover:bg-[#fff1e8] dk:text-[#9eb5b3] dk:hover:bg-[#16282d]">${ms('close', 'text-2xl')}</button>
        <div class="flex-1 flex items-center gap-2.5"><div class="w-full h-2.5 rounded-full overflow-hidden p-[1px] lt:bg-[#ebdcd3] dk:bg-[#16282d]" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${n}" aria-label="${esc(t('Luyện nhanh {n} động từ', { n: total }))}"><div class="h-full rounded-full transition-all duration-300 lt:bg-[#00504b] dk:bg-[#2ba39a]" style="width:${pct}%"></div></div><span class="text-xs font-bold tracking-wide shrink-0 lt:text-[#4a5d61] dk:text-[#9eb5b3]">${n}/${total}</span></div></header>${inner}</div></div></div>`;
    const teacher = pose => Chars.img('ama', { kind: 'still', pose, size: 64, alt: '', cls: 'w-full h-full object-contain object-bottom select-none' });
    const CARD2 = 'border-2 lt:bg-[#ffffff] lt:border-[#e6d7cd] lt:shadow-[0_3px_0_#e6d7cd] dk:bg-[#121d20] dk:border-[#1e3338] dk:shadow-[0_3px_0_#0a1315]';
    function ask() {
      cur = queue[idx]; state = 'ask';
      const it = cur, clue = `${it.b}, ${it.kind === 'p' ? t('quá khứ') : t('quá khứ phân từ')}`;
      view.innerHTML = frame(`<main class="flex-1 px-4 py-2 flex flex-col justify-between"><div class="w-full flex flex-col gap-4">
        <section class="flex items-center gap-3 pt-1"><div class="w-16 h-16 min-w-[64px] rounded-2xl shrink-0 overflow-hidden flex items-end justify-center lt:bg-[#fff1e8] dk:bg-[#121d20]" id="irvTch">${teacher('talk')}</div>
          <div class="relative rounded-2xl border-2 px-4 py-3 flex-1 min-w-0 ${CARD2}"><p class="text-base font-bold leading-snug break-words lt:text-[#132226] dk:text-[#e6f1ef]">${esc(prompt(it))}</p></div></section>
        <article class="rounded-3xl border-2 p-5 flex flex-col gap-4 ${CARD2}"><div class="flex items-center justify-between gap-2"><span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold lt:bg-[#e1f8f3] lt:border-[#a2dfd6] lt:text-[#00504b] dk:bg-[#103133] dk:border-[#1d4f52] dk:text-[#4dd0c5]">${ms('edit_note', 'text-sm')}<span>${esc(prompt(it))}</span></span>
          <button type="button" id="irvSent" aria-label="${esc(t('Nghe câu'))}" class="w-11 h-11 min-w-[44px] rounded-xl border flex items-center justify-center active:translate-y-0.5 transition-all lt:bg-[#e1f8f3] lt:border-[#9ed9d0] lt:text-[#00504b] lt:shadow-[0_2px_0_#d9c5b8] dk:bg-[#16282d] dk:border-[#26434a] dk:text-[#4dd0c5] dk:shadow-[0_2px_0_#0a1315]">${ms('volume_up', 'text-xl')}</button></div>
          <p class="text-xl font-extrabold leading-relaxed py-2 lt:text-[#132226] dk:text-[#ffffff]" lang="en" translate="no">${esc(it.pre)}<span id="irvBlank" class="inline-block min-w-[4.5rem] px-3 py-0.5 mx-1 border-b-4 rounded text-center lt:border-[#00504b] lt:text-[#00504b] lt:bg-[#e1f8f3]/60 dk:border-[#2ba39a] dk:text-[#4dd0c5] dk:bg-[#0d191c]">&nbsp;</span>${esc(it.post)}</p>
          <div class="pt-2 border-t flex items-center gap-2 flex-wrap lt:border-[#f0e3da] dk:border-[#1e3338]"><span class="text-xs font-bold lt:text-[#4a5d61] dk:text-[#8eaaa7]">${esc(t('Gợi ý'))}</span><span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold lt:bg-[#fff2e3] lt:border-[#f5cc9b] lt:text-[#8c4b00] dk:bg-[#2a1d0d] dk:border-[#4d3516] dk:text-[#fbbf24]">${ms('lightbulb', 'text-sm')}<span lang="en" translate="no">${esc(clue)}</span></span></div></article>
        <div class="flex flex-col gap-2 pt-1"><label for="irvIn" class="text-xs font-extrabold uppercase tracking-wider px-1 lt:text-[#4a5d61] dk:text-[#8eaaa7]">${esc(t('Gõ động từ'))}</label>
          <input id="irvIn" type="text" lang="en" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" class="w-full h-14 min-h-[56px] px-4 rounded-2xl border-2 text-lg font-bold focus:outline-none transition-all lt:bg-[#ffffff] lt:border-[#e6d7cd] lt:text-[#132226] lt:shadow-[inset_0_2px_0_rgba(0,0,0,0.04),0_2px_0_#e6d7cd] lt:focus:border-[#00504b] dk:bg-[#121d20] dk:border-[#1e3338] dk:text-[#ffffff] dk:shadow-[inset_0_2px_0_rgba(0,0,0,0.3),0_2px_0_#0a1315] dk:focus:border-[#2ba39a]">
          <p id="irvFb" role="status" aria-live="polite" class="min-h-[24px] px-1 text-base font-extrabold break-words" lang="en"></p></div></div>
        <div class="w-full pt-4 pb-6 flex flex-col items-center gap-3"><button type="button" id="irvChk" data-lk-primary class="w-full h-14 min-h-[56px] px-6 rounded-2xl text-lg font-extrabold tracking-wide flex items-center justify-center gap-2 text-center active:translate-y-1 transition-all lt:bg-[#f06400] lt:text-[#1a0d00] lt:shadow-[0_4px_0_#ba4c00] dk:bg-[#f25c05] dk:text-[#1a0d00] dk:shadow-[0_4px_0_#9a3800]"><span id="irvChkT">${esc(t('Kiểm tra'))}</span>${ms('arrow_forward', 'text-2xl rtl:-scale-x-100')}</button>
          <button type="button" id="irvDk" class="min-h-[44px] px-4 flex items-center justify-center text-sm font-bold rounded-xl lt:text-[#4a5d61] dk:text-[#9eb5b3]">${esc(t('Mình chưa biết'))}</button></div></main>`, Math.round(idx / total * 100), Math.min(results.length, total));
      const inp = $('#irvIn'), chk = $('#irvChk');
      $('#irvSent').onclick = e => { speakIcon(e.currentTarget); UI.tts(it.sent, acc()); };
      const finish = ok => {
        state = 'done'; inp.disabled = true; $('#irvDk').hidden = true; const fb = $('#irvFb'), bl = $('#irvBlank');
        bl.textContent = ok ? inp.value.trim() : it.ans[0]; $('#irvTch').innerHTML = teacher(ok ? 'happy' : 'encourage');
        fb.className = 'min-h-[24px] px-1 text-base font-extrabold break-words ' + (ok ? 'lt:text-[#00504b] dk:text-[#4dd0c5]' : 'lt:text-[#b3261e] dk:text-[#ff8a80]');
        fb.textContent = ok ? t('Đúng rồi!') : t('Đáp án đúng: {a}', { a: it.ans.join(' / ') });
        $('#irvChkT').textContent = idx + 1 >= queue.length ? t('Xong') : t('Tiếp tục'); UI.tts(it.sent, acc());
        const m = miss();
        if (ok) { if (m[it.b]) { m[it.b]--; if (!m[it.b]) delete m[it.b]; setMiss(m); } if (!it.again) results.push(1); chk.focus(); return; }
        m[it.b] = (m[it.b] || 0) + 1; setMiss(m);
        if (!it.again) { results.push(0); wrong.push(it); queue.push(Object.assign({}, it, { again: true })); }
        if (!saved(it.b)) App.addWord({ word: it.b, vi: it.row.m, def: it.row.g, ipa: ipaOf(it.row, it.b), ex: it.row.p, pos: 'verb', emoji: '🔤', topic: 'irregular' }, { text: it.row.p, title: 'Irregular verbs' }, { silent: true }).catch(() => {});
        chk.focus();
      };
      chk.onclick = () => { if (state === 'done') { idx++; return idx >= queue.length ? summary() : ask(); } const v = inp.value; if (!clean(v)) return inp.focus(); finish(accepts(it, v)); };
      $('#irvDk').onclick = () => finish(false);
      inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); chk.click(); } };
      inp.focus({ preventScroll: true });
    }
    function summary() {
      const c = results.filter(Boolean).length, n = results.length;
      if (g.ExitGuard && ExitGuard.done) ExitGuard.done();
      App.reward && App.reward({ quizzes: 1, xp: 10 + c * 2 });
      const retryQ = wrong.map(x => x.b + ':' + x.kind).join(',');
      view.innerHTML = frame(`<main class="flex-1 px-4 py-6 flex flex-col justify-between"><div class="flex flex-col items-center gap-5 text-center"><div class="w-24 h-24 rounded-2xl overflow-hidden flex items-end justify-center lt:bg-[#fff1e8] dk:bg-[#121d20]">${Chars.img('ama', { kind: 'still', pose: wrong.length ? 'encourage' : 'cheer', size: 96, alt: '', cls: 'w-full h-full object-contain object-bottom select-none' })}</div>
        <h1 class="text-2xl font-extrabold break-words lt:text-[#132226] dk:text-[#ffffff]" role="status">${esc(t('{c} trên {n} câu đúng', { c, n }))}</h1>
        ${wrong.length ? '' : `<p class="text-base font-bold lt:text-[#00504b] dk:text-[#4dd0c5]">${esc(t('Không có câu nào sai, giỏi lắm!'))}</p>`}</div>
        <div class="w-full pt-6 pb-6 flex flex-col gap-3">${wrong.length ? `<a href="#/irregular/practice?retry=${enc(retryQ)}" data-lk-primary class="w-full min-h-[56px] px-6 py-3 rounded-2xl text-lg font-extrabold flex items-center justify-center text-center lt:bg-[#f06400] lt:text-[#1a0d00] lt:shadow-[0_4px_0_#ba4c00] dk:bg-[#f25c05] dk:text-[#1a0d00] dk:shadow-[0_4px_0_#9a3800]">${esc(t('Luyện lại câu sai'))}</a>` : ''}
          <a href="#/irregular" ${wrong.length ? '' : 'data-lk-primary'} class="w-full min-h-[56px] px-6 py-3 rounded-2xl border-2 text-lg font-extrabold flex items-center justify-center text-center ${wrong.length ? 'lt:border-[#e6d7cd] lt:text-[#132226] dk:border-[#1e3338] dk:text-[#ffffff]' : 'lt:bg-[#f06400] lt:border-[#f06400] lt:text-[#1a0d00] lt:shadow-[0_4px_0_#ba4c00] dk:bg-[#f25c05] dk:border-[#f25c05] dk:text-[#1a0d00] dk:shadow-[0_4px_0_#9a3800]'}">${esc(t('Xong'))}</a></div></main>`, 100, total);
      const a = view.querySelector('[data-lk-primary]'); a && a.focus({ preventScroll: true });
    }
    ask();
  }


  Irv.drill = drill; Irv.clean = clean; Irv.accepts = accepts;
})(self);
