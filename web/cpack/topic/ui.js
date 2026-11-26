/* Chủ đề sâu (docs/specs/topic-depth.md) – giao diện lười của #/topic/<id> khi có gói LK_TOPICX[id]: tiểu chủ đề · lọc CEFR · tìm · Từ / Cụm / Hội thoại / Quiz.
 * Gộp từ của gói vào TOPICS[id].words (Học/Ghép/Kiểm tra/Anki/Rảnh tay dùng lại nguyên). Chỉ nạp khi mở chủ đề có gói (bundles.js: topicx + topicx-<id>). */
(function () {
  const { $, $$, esc, highlight, toast, levelChip, posChip } = UI, A = window.App;
  const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], rnd = (a, n) => a.map(x => [Math.random(), x]).sort((x, y) => x[0] - y[0]).slice(0, n).map(x => x[1]);
  const nm = o => (o && (o[I18N.lang()] || (I18N.lang() === 'vi' ? o.vi : '') || o.en || o.vi)) || '';

  function merge(tp, X) {
    const have = new Set(tp.words.map(w => w.word.toLowerCase()));
    X.words.forEach(w => { const k = w.word.toLowerCase(); if (!have.has(k)) { tp.words.push(w); have.add(k); } else { const o = tp.words.find(x => x.word.toLowerCase() === k); if (o && !o.sub) { o.sub = w.sub; o.tip = w.tip; } } });
    return tp.words;
  }

  function draw(tp, X, hash) {
    const view = A.view, words = merge(tp, X), S = { sub: '', lv: '', q: '', tab: 'words' };
    const inD = w => A.inDeck(w.word), subOf = id => X.sub.find(s => s.id === id), have = () => words.filter(inD).length;
    const levels = LV.filter(l => words.some(w => w.level === l));
    const fw = () => words.filter(w => (!S.sub || w.sub === S.sub) && (!S.lv || w.level === S.lv) && (!S.q || (w.word + ' ' + A.meanOf(w) + ' ' + (w.def || '')).toLowerCase().includes(S.q)));
    const row = w => `<div class="word-row"><div class="em">${esc(w.emoji || '📘')}</div><div style="min-width:0">
        <div class="row"><a class="w" href="#/dict/${encodeURIComponent(w.word)}">${esc(w.word)}</a>${posChip(w.pos)}${levelChip(w.level)}${UI.ipaHtml(w, null, { cls: 'ipa small' })}<button class="icon-btn sm" data-speak="${esc(w.word)}" aria-label="${t('Phát âm')}">🔊</button></div>
        <div><b class="vi" style="font-size:1rem">${esc(A.meanOf(w))}</b>${w.def && A.meanOf(w) !== w.def ? ` <span class="muted small">— ${esc(w.def)}</span>` : ''}</div>
        ${w.ex ? `<div class="ex small">“${highlight(w.ex, w.word)}”</div>` : ''}${w.col && w.col.length ? `<div class="small" style="margin-top:.2rem">🔗 ${w.col.map(esc).join(' · ')}</div>` : ''}${w.tip ? `<div class="small muted" style="margin-top:.2rem">💡 ${esc(w.tip)}</div>` : ''}
      </div><div>${inD(w) ? `<span class="chip ok">✓ ${t('Đã thêm')}</span>` : `<button class="btn sm" data-add="${esc(w.word)}">+ ${t('Thêm')}</button>`}</div></div>`;
    const lines = d => d.lines.map(l => `<div style="display:flex;gap:.6rem;margin:.45rem 0;${l[0] === 'B' ? 'flex-direction:row-reverse' : ''}"><div class="card" style="padding:.55rem .8rem;max-width:80%"><div lang="en"><b>${esc(l[1])}</b> <button class="icon-btn sm" data-speak-text="${esc(l[1])}" aria-label="${t('Nghe')}">🔊</button></div><div class="muted small">${esc(l[2])}</div></div></div>`).join('');
    const body = () => {
      if (S.tab === 'phrases') { const p = X.phrases.filter(x => (!S.sub || x.sub === S.sub) && (!S.lv || x.lv === S.lv)); return p.length ? p.map(x => `<div class="word-row"><div class="em">💬</div><div style="min-width:0"><div lang="en"><b>${esc(x.en)}</b> <button class="icon-btn sm" data-speak-text="${esc(x.en)}" aria-label="${t('Nghe')}">🔊</button> ${levelChip(x.lv)}</div><div class="muted">${esc(x.vi)}</div></div></div>`).join('') : `<p class="muted">${t('Không có mục nào khớp')}</p>`; }
      if (S.tab === 'dialogs') { const d = X.dialogs.filter(x => !S.sub || x.sub === S.sub); return d.length ? d.map(x => `<div style="margin-bottom:1.2rem"><div class="small muted">${esc(nm((subOf(x.sub) || {}).name))}</div>${lines(x)}<div class="row small">${t('Từ khóa')}: ${x.key.map(k => `<span class="chip">${esc(k)}</span>`).join('')}</div></div>`).join('') : `<p class="muted">${t('Không có mục nào khớp')}</p>`; }
      if (S.tab === 'quiz') return `<div id="qz"></div>`;
      const l = fw(); return l.length ? l.map(row).join('') : `<p class="muted">${t('Không có mục nào khớp')}</p>`;
    };
    const scroll = () => { const p = have() * 100 / words.length; return `<div class="chip ok">${t('{n}/{m} đã thêm', { n: have(), m: words.length })}</div><div style="height:6px;border-radius:3px;background:var(--surface-2);margin-top:.4rem;max-width:260px"><div style="height:100%;width:${p}%;border-radius:3px;background:var(--primary)"></div></div>`; };
    view.innerHTML = `<a href="#/library?g=${tp.group}" class="small">← ${esc((A.GROUPS || []).concat(IELTS_DATA.GROUPS).find(g => g.id === tp.group)?.name || '')}</a>
      <div class="card" style="margin:.7rem 0 1rem;display:flex;gap:1.2rem;align-items:center;flex-wrap:wrap">
        <div style="font-size:3rem;width:80px;height:80px;border-radius:22px;display:grid;place-items:center;background:var(--surface-2)">${tp.emoji}</div>
        <div class="grow"><h1 style="margin:0">${esc(tp.name)}</h1><div class="muted">${esc(tp.desc)}</div>
          <div class="row" style="margin-top:.5rem"><span class="chip">${t('{n} từ', { n: words.length })}</span><span class="chip">${t('{n} cụm', { n: X.phrases.length })}</span><span class="chip">${t('{n} hội thoại', { n: X.dialogs.length })}</span></div><div id="tpProg" style="margin-top:.5rem"></div></div>
        <div class="row"><button class="btn primary" id="addAll"></button><a class="btn" href="#/practice/learn?src=topic:${tp.id}">🧠 ${t('Học')}</a><a class="btn" href="#/practice/match?src=topic:${tp.id}">⚡ ${t('Ghép thẻ')}</a><a class="btn" href="#/practice/test?src=topic:${tp.id}">📝 ${t('Kiểm tra')}</a><a class="btn" href="#/handsfree/${tp.id}">🎧 ${t('Nghe rảnh tay')}</a></div>
      </div>
      <div class="row" id="subs" style="gap:.5rem;margin-bottom:.8rem;flex-wrap:wrap"></div>
      <div class="row" style="gap:.6rem;margin-bottom:.8rem;flex-wrap:wrap;align-items:center"><div class="tabs" id="tabs" role="group" style="display:inline-flex">${[['words', 'Từ'], ['phrases', 'Cụm dùng ngay'], ['dialogs', 'Hội thoại'], ['quiz', 'Quiz nhanh']].map(([k, n]) => `<button data-tab="${k}">${t(n)}</button>`).join('')}</div>
        <div class="tabs" id="lvT" role="group" aria-label="${t('Cấp độ CEFR')}" style="display:inline-flex"><button data-lv="">${t('Tất cả')}</button>${levels.map(l => `<button data-lv="${l}">${l}</button>`).join('')}</div>
        <input id="tpQ" type="search" class="input" placeholder="${t('Tìm từ…')}" aria-label="${t('Tìm từ…')}" style="min-width:160px"></div>
      <div class="card" id="wordList"></div>`;
    const sync = () => {
      $('#tpProg').innerHTML = scroll();
      const m = words.filter(w => !inD(w)).length, b = $('#addAll'); b.textContent = m ? `+ ${t('Thêm {n} từ vào flashcard', { n: m })}` : `✓ ${t('Đã thêm toàn bộ')}`; b.disabled = !m;
      $('#subs').innerHTML = `<button class="chip ${S.sub ? '' : 'ok'}" data-sub="">${t('Tất cả')}</button>` + X.sub.map(s => { const all = words.filter(w => w.sub === s.id), n = all.filter(inD).length; return `<button class="chip ${S.sub === s.id ? 'ok' : ''}" data-sub="${s.id}" title="${esc(s.scene || '')}">${esc(s.emoji || '')} ${esc(nm(s.name))} · ${n}/${all.length}</button>`; }).join('');
      $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab)); $$('#lvT button').forEach(b => b.classList.toggle('on', b.dataset.lv === S.lv));
      $$('#subs [data-sub]').forEach(b => b.onclick = () => { S.sub = b.dataset.sub; paint(); });
    };
    const quiz = () => {
      const pool = fw().length >= 4 ? fw() : words, Q = rnd(pool, Math.min(8, pool.length)); let i = 0, ok = 0; const bad = [];
      const el = $('#qz'), step = () => {
        if (i >= Q.length) { el.innerHTML = `<h3>${t('Kết quả: {a}/{b}', { a: ok, b: Q.length })}</h3>${bad.length ? `<button class="btn primary" id="qzAdd">+ ${t('Thêm {n} từ vào flashcard', { n: bad.filter(w => !inD(w)).length })}</button> ` : ''}<button class="btn" id="qzAgain">${t('Làm lại')}</button> <a class="btn" href="#/practice/learn?src=topic:${tp.id}">🧠 ${t('Học')}</a>`;
          $('#qzAgain').onclick = quiz; const a = $('#qzAdd'); if (a) a.onclick = async () => { for (const w of bad) if (!inD(w)) await A.addWord(w, null, { silent: true }); toast(t('Đã thêm {n} từ – vào Ôn tập hoặc Học thông minh để bắt đầu!', { n: bad.length })); sync(); a.disabled = true; }; return; }
        const w = Q[i], opts = rnd([w].concat(rnd(pool.filter(x => x !== w && x.pos === w.pos).concat(pool.filter(x => x !== w)).slice(0, 12), 3)), 4);
        el.innerHTML = `<div class="muted small">${t('Câu {a}/{b}', { a: i + 1, b: Q.length })}</div><h3 style="margin:.4rem 0">${esc(A.meanOf(w))}</h3><div class="small muted">${esc(w.def || '')}</div><div class="row" style="gap:.5rem;margin-top:.8rem;flex-wrap:wrap">${rnd(opts, 4).map(o => `<button class="btn" data-o="${esc(o.word)}" lang="en">${esc(o.word)}</button>`).join('')}</div>`;
        $$('#qz [data-o]').forEach(b => b.onclick = () => { const good = b.dataset.o === w.word; if (good) ok++; else bad.push(w); $$('#qz [data-o]').forEach(x => { x.disabled = true; if (x.dataset.o === w.word) x.classList.add('primary'); }); b.classList.add(good ? 'primary' : 'danger'); UI.speak(w.word, A.state.settings.accent); setTimeout(() => { i++; step(); }, 900); });
      }; step();
    };
    const paint = () => {
      sync(); $('#wordList').innerHTML = body(); $('#lvT').hidden = S.tab === 'dialogs' || S.tab === 'quiz'; if (S.tab === 'quiz') quiz();
      A.bindCommon(sync);
      $$('#wordList [data-add]').forEach(b => b.onclick = async () => { const w = words.find(x => x.word === b.dataset.add); if (!w) return; await A.addWord(w); b.outerHTML = `<span class="chip ok">✓ ${t('Đã thêm')}</span>`; toast(t('Đã thêm “{w}” vào flashcard', { w: w.word })); sync(); });
    };
    $$('#tabs button').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; paint(); });
    $$('#lvT button').forEach(b => b.onclick = () => { S.lv = b.dataset.lv; paint(); });
    $('#tpQ').oninput = e => { S.q = e.target.value.trim().toLowerCase(); if (S.tab !== 'words') S.tab = 'words'; paint(); $('#tpQ').focus(); };
    $('#addAll').onclick = async () => { const list = words.filter(w => !inD(w)); $('#addAll').disabled = true; for (const w of list) await A.addWord(w, null, { silent: true }); toast(t('Đã thêm {n} từ – vào Ôn tập hoặc Học thông minh để bắt đầu!', { n: list.length })); paint(); };
    paint();
  }
  window.LK_TOPICX_UI = { draw, merge };
})();
