/* 🌍 Thư viện ngôn ngữ đích (gói tải lười 'tlib' – docs/specs/target-language.md lát 2). Chỉ dùng khi Target.cur() ≠ 'en' (cờ pt_pilot / lk.pt).
 * Bộ từ: web/js/target-<tl>-seed.json (soát tay) + target-<tl>-core.json (bộ lõi đã duyệt) – dựng bởi scripts/target/build.mjs.
 * Thẻ tl: khóa Core.tlKey(từ, tl), trường tl (core.js). Vẽ bằng khung Thư viện sẵn có (page-head, tabs, topic-card, word-row) – không màn mới. */
(function (g) {
  'use strict';
  const cache = {};
  // seed trước, core sau; trùng từ#loại giữ bản seed (= scripts/target/lib.mjs deckWords)
  function words(tl) {
    if (cache[tl]) return cache[tl];
    const get = f => fetch('js/target-' + tl + '-' + f + '.json').then(r => (r.ok ? r.json() : f === 'core' ? { words: [] } : Promise.reject(new Error(f + ' ' + r.status))));
    return (cache[tl] = Promise.all([get('seed'), get('core').catch(() => ({ words: [] }))]).then(([s, c]) => {
      const out = [], seen = new Set();
      for (const [src, list] of [['seed', s.words || []], ['core', c.words || []]]) for (const w of list) { const k = w.word.toLowerCase() + '#' + w.pos; if (!seen.has(k)) { seen.add(k); out.push({ ...w, src }); } }
      LIKE[tl] = out.map(w => like(w, tl));
      return out;
    }).catch(e => { delete cache[tl]; throw e; }));
  }
  // dạng thẻ (Cards.make) cho câu nhiễu mini-game (study.js libNorm/distractors, study-modes options): đồng bộ, null khi chưa tải xong
  const LIKE = {}, like = (w, tl) => ({ word: w.word, pos: w.pos, ipa: w.ipa, gl: w.gl, vi: w.gl.vi, def: w.gl.en, ex: w.ex.pt, emoji: w.emoji || '📘', tl });
  const cached = tl => LIKE[tl] || null;
  // bộ: 'seed' (từ chọn tay) + bộ lõi chia 30 từ/bộ theo thứ hạng tần suất
  const SIZE = 30;
  function decks(list) {
    const seed = list.filter(w => w.src === 'seed'), core = list.filter(w => w.src === 'core').sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9));
    const out = seed.length ? [{ id: 'seed', n: 0, emoji: '⭐', words: seed }] : [];
    for (let i = 0; i < core.length; i += SIZE) out.push({ id: 'core' + (i / SIZE + 1), n: i / SIZE + 1, emoji: ['🌱', '🌿', '🌳', '🍃', '🌻', '🌼', '🌴', '🌵', '🍀', '🌾'][(i / SIZE) % 10], words: core.slice(i, i + SIZE) });
    return out;
  }
  const deckName = d => (d.n ? t('Thông dụng {n}', { n: d.n }) : t('Từ cơ bản'));
  const key = (w, tl) => Core.tlKey(w.word, tl);
  async function add(tl, list) {
    let n = 0;
    await Core.Cards.mutate(m => {
      for (const w of list) {
        const k = key(w, tl); if (m[k]) continue;
        m[k] = Core.Cards.make({ word: w.word, pos: w.pos, ipa: w.ipa, def: w.gl.en, vi: w.gl.vi, ex: w.ex.pt, topic: tl + '-core', emoji: w.emoji || '📘', tl }, { gl: w.gl, exEn: w.ex.en, ...(w.gender ? { gender: w.gender } : {}), ...(w.img ? { img: w.img } : {}) });
        n++;
      }
      return m;
    });
    if (g.Sync && Sync.schedule) Sync.schedule();
    if (g.App && App.load) App.load();
    return n;
  }
  // mạo từ xác định thay nhãn giống (không cần dịch): o (đực) / a (cái) / o/a
  const art = w => (w.pos === 'n' && w.gender ? { m: 'o', f: 'a', mf: 'o/a' }[w.gender] + ' ' : '');
  const fold = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  // gợi ý ô tìm kiếm (app.js search) khi học ngôn ngữ đích: khớp đầu từ (bỏ dấu) hoặc nghĩa
  async function suggest(tl, q, n) {
    const f = fold(q), list = await words(tl);
    return list.filter(w => fold(w.word).startsWith(f)).concat(list.filter(w => !fold(w.word).startsWith(f) && fold(App.meanOf(w)).startsWith(f))).slice(0, n || 8);
  }
  async function library(tl, query) {
    const { $, esc, toast } = UI, view = App.view, mine = () => App.state.cards;
    view.innerHTML = `<div class="page-head"><div><h1>${t('Thư viện từ vựng')}</h1><p class="muted" id="tlSub"></p></div>
      <div class="row"><input class="input" id="libQ" placeholder="${t('Lọc bộ từ…')}" style="max-width:240px" lang="${tl}"></div></div><div id="libBody" style="margin-top:1rem"></div>`;
    let list;
    try { list = await words(tl); } catch (e) { $('#libBody').innerHTML = `<div class="card empty"><div class="em">📡</div>${t('Không tải được bộ từ, thử lại sau')}</div>`; return; }
    if (App.view !== view || !$('#libBody')) return;
    $('#tlSub').textContent = t('Tiếng Bồ Đào Nha (Brazil): {n} từ thông dụng, có phiên âm, nghĩa và câu ví dụ.', { n: list.length });
    const ds = decks(list), have = w => !!mine()[Core.keyOf(w.word)];
    let open = query.get('d') || '';
    const row = w => `<div class="word-row"><div class="em">${esc(w.emoji || '📘')}</div><div style="min-width:0">
        <div class="row"><b class="w" lang="${tl}" translate="no">${esc(art(w) + w.word)}</b><span class="ipa small">/${esc(w.ipa)}/</span><button class="icon-btn sm" data-tlsay="${esc(w.word)}" aria-label="${t('Phát âm')}">🔊</button>${have(w) ? '<span class="chip ok">✓</span>' : ''}</div>
        <div><b class="vi" style="font-size:1rem">${esc(App.meanOf(w))}</b></div>
        <div class="ex small"><span lang="${tl}" translate="no">“${esc(w.ex.pt)}”</span> <button class="icon-btn sm" data-tlsay="${esc(w.ex.pt)}" aria-label="${t('Phát âm')}">🔊</button></div></div></div>`;
    const draw = () => {
      const q = fold($('#libQ').value.trim()), hit = w => !q || fold(w.word).includes(q) || fold(App.meanOf(w)).includes(q);
      const vis = ds.map(d => ({ d, ws: d.words.filter(hit) })).filter(x => x.ws.length);
      $('#libBody').innerHTML = !vis.length ? `<div class="card empty"><div class="em">🔍</div>${t('Không tìm thấy bộ từ phù hợp.')}</div>`
        : `<div class="grid auto">${vis.map(({ d }) => { const m = d.words.filter(w => !have(w)).length; return `<div class="card topic-card${open === d.id ? ' on' : ''}" data-d="${d.id}">
            <div class="row between nowrap"><span class="em">${d.emoji}</span><span class="chip">${t('{n} từ', { n: d.words.length })}</span></div>
            <h3><a href="#/library?d=${d.id}" data-open="${d.id}">${esc(deckName(d))}</a></h3>
            <div class="muted small" lang="${tl}" translate="no">${esc(d.words.slice(0, 5).map(w => w.word).join(' · '))}…</div>
            <div class="row"><span class="chip ok">${t('{n} đã thêm', { n: d.words.length - m })}</span><button class="btn sm${m ? ' primary' : ''}" data-add="${d.id}"${m ? '' : ' disabled'}>${m ? '+ ' + t('Thêm {n} từ vào flashcard', { n: m }) : '✓ ' + t('Đã thêm toàn bộ')}</button></div></div>`; }).join('')}</div>
          ${vis.filter(x => q || x.d.id === open).map(({ d, ws }) => `<div class="section-title"><h2>${d.emoji} ${esc(deckName(d))}</h2></div><div class="card">${ws.map(row).join('')}</div>`).join('')}`;
    };
    $('#libQ').value = query.get('q') || '';
    $('#libQ').oninput = draw;
    $('#libBody').onclick = async e => {
      const s = e.target.closest('[data-tlsay]'); if (s) return UI.speak(s.dataset.tlsay, Target.speechLang(tl));
      const o = e.target.closest('[data-open]'); if (o) { e.preventDefault(); open = open === o.dataset.open ? '' : o.dataset.open; history.replaceState(null, '', location.pathname + location.search + '#/library' + (open ? '?d=' + open : '')); return draw(); }
      const b = e.target.closest('[data-add]'); if (!b) return;
      b.disabled = true;
      try { const n = await add(tl, ds.find(d => d.id === b.dataset.add).words); toast(t('Đã thêm {n} từ tiếng Bồ Đào Nha vào Sổ từ', { n })); } catch (err) { toast(t('Không tải được bộ từ, thử lại sau')); }
      draw();
    };
    draw();
  }
  g.TLib = { words, decks, add, suggest, library, art, cached };
})(self);
