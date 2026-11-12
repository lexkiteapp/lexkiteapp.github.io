/* 🔤 Động từ bất quy tắc – #/irregular (bảng) · #/irregular/<động từ> (bảng + tờ chi tiết, link sâu) · #/irregular/practice (luyện điền chỗ trống).
 * Dạng chia: LK_VERBS.irregularList() (một nguồn). Dữ liệu phụ: web/js/irv/core.json (+ <ngôn ngữ>.json), scripts/verbs/build-irregular.mjs.
 * Giao diện = Stitch brand/stitch/v2/irv-{table,detail,drill}-{light,dark}.html, port tay (lt:/dk:, như say.js) → css/st-v2-irregular.css.
 * Nạp lười: App.need('irregular') (BUNDLES.irregular trong app.js); chuỗi = nhóm i18n lười 'verbs' (i18nl). */
(function (g) {
  'use strict';
  const { routes } = App, { $, esc, toast, modal } = UI;
  const MISS = 'lk.irv.miss', LV = ['A1', 'A2', 'B1', 'B2', 'C1'], PATS = [['ABC', 'A-B-C', 'go-went-gone'], ['ABB', 'A-B-B', 'buy-bought'], ['AAA', 'A-A-A', 'cut-cut'], ['ABA', 'A-B-A', 'come-came']];
  const S = { q: '', cef: '', pat: '', sort: 'freq', init: false, tok: 0, y: 0, pushed: false, back: '', sheet: null, rows: null };
  // ---- dữ liệu (nạp lười, một lần mỗi ngôn ngữ) ----
  const learn = () => (g.I18N && I18N.learnLang ? I18N.learnLang() : 'en');
  const cache = {}, got = u => cache[u] || (cache[u] = fetch(u).then(r => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }).catch(e => { delete cache[u]; throw e; }));
  const built = {};
  async function load() {
    const l = learn(); if (built[l]) return built[l];
    const core = await got('js/irv/core.json'); let loc = {};
    if (l !== 'en') { try { loc = (await got('js/irv/' + l + '.json')).rows || {}; } catch (e) { loc = {}; } } // thiếu bản dịch → nghĩa tiếng Anh
    const list = {}; for (const x of g.LK_VERBS.irregularList()) list[x.base] = x;
    const rows = [], map = {};
    for (const c of core.rows) {
      const f = list[c[0]]; if (!f) continue; const o = loc[c[0]] || [];
      const r = { b: c[0], lv: c[1], cef: c[1] === 'C2' ? 'C1' : c[1], freq: c[2], pat: c[3], ipa: c[4], p: c[5], pp: c[6], g: c[7], n: o[3] || c[8] || '', ipaB: c[9], trio: c[10], past: f.past, ppl: f.pp,
        m: l === 'en' ? c[7] : o[0] || c[7], tp: o[1] || '', tpp: o[2] || '' };
      r.forms = [r.b, ...r.past.map(x => x.w), ...r.ppl.map(x => x.w)];
      r.hay = norm(r.forms.join(' ') + ' ' + r.m); r.fn = r.forms.map(norm); rows.push(r); map[r.b] = r;
    }
    return (built[l] = { rows, map, l });
  }
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
  const miss = () => { try { return JSON.parse(localStorage.getItem(MISS) || '{}') || {}; } catch (e) { return {}; } };
  const setMiss = o => { try { localStorage.setItem(MISS, JSON.stringify(o)); } catch (e) { /* bỏ qua */ } };
  const saved = b => App.inDeck(b);
  const accIdx = () => (App.state.settings.accent === 'en-US' ? 1 : 0), acc = () => (accIdx() ? 'en-US' : 'en-GB');
  const ipaOf = (r, w) => { const a = accIdx(); if (w === r.b && r.ipaB) return r.ipaB[a] || ''; const x = r.ipa[w]; return x ? x[a] || x[0] || '' : ''; };
  const lvOf = () => { const p = App.state.settings.placement; if (!p) return ''; const c = String(p.gCefr || p.vCefr || '').toUpperCase(); return c === 'C2' ? 'C1' : LV.includes(c) ? c : ''; };
  const enc = encodeURIComponent, E = (s, c) => `<span lang="en" translate="no"${c ? ` class="${c}"` : ''}>${esc(s)}</span>`;
  const speakIcon = b => { const i = b.querySelector('.material-symbols-outlined'); if (!i) return; i.textContent = 'graphic_eq'; setTimeout(() => { i.textContent = 'volume_up'; }, 800); };
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const err = view => { view.innerHTML = `<div class="empty"><p>${esc(t('Không tải được – thử lại sau'))}</p><a class="btn" href="#/irregular">${esc(t('Thử lại'))}</a></div>`; };
  const navHtml = () => (g.ST2 && ST2.shell ? `<div class="lg:hidden">${ST2.shell({ hdr: ST2.hdr(), tabs: ST2.tabs('skills') }).nav}</div>` : '');
  const bodyOn = () => { document.body.classList.add('st', 'v2on'); App.onCleanup && App.onCleanup(() => document.body.classList.remove('st', 'v2on')); };

  // ---- lớp class Tailwind (sáng/tối theo Stitch irv-*) ----
  const ROOT = 'st v2 v2-irregular antialiased min-h-screen flex justify-center lt:bg-[#FFF9F3] lt:text-[#141819] dk:bg-[#091518] dk:text-[#F0FDFA]';
  const COL = 'w-full max-w-[390px] lg:max-w-[560px] min-h-screen flex flex-col relative pb-28';
  const BTN = 'w-11 h-11 shrink-0 rounded-2xl border-2 flex items-center justify-center active:translate-y-[2px] transition-all lt:bg-[#ffffff] lt:border-[#EDE3D8] lt:shadow-[0_3px_0_0_#E2D5C7] lt:text-[#141819] dk:bg-[#10252B] dk:border-[#234E57] dk:shadow-[0_3px_0_0_#051013] dk:text-[#E2E8F0]';
  const CHIP_ON = 'min-h-[44px] shrink-0 inline-flex items-center px-4 py-2 rounded-full border-[1.5px] font-extrabold text-xs active:translate-y-[1px] transition-transform lt:bg-[#136B66] lt:border-[#136B66] lt:text-[#ffffff] lt:shadow-[0_2px_0_0_#0D4844] dk:bg-[#136B66] dk:border-[#2DD4BF] dk:text-[#ffffff] dk:shadow-[0_2px_0_0_#051013]';
  const CHIP_OFF = 'min-h-[44px] shrink-0 inline-flex items-center px-4 py-2 rounded-full border-[1.5px] font-bold text-xs active:translate-y-[1px] transition-transform lt:bg-[#ffffff] lt:border-[#EDE3D8] lt:text-[#4A3E35] lt:shadow-[0_2px_0_0_#E2D5C7] lt:hover:bg-[#FAF3EB] dk:bg-[#10252B] dk:border-[#234E57] dk:text-[#E2E8F0] dk:shadow-[0_2px_0_0_#051013]';
  const SEG_ON = 'flex-1 min-h-[44px] px-1 rounded-xl font-extrabold text-xs flex items-center justify-center relative text-center transition-all lt:bg-[#ffffff] lt:text-[#136B66] lt:shadow-[0_2px_0_0_#D5C4B2] dk:bg-[#142E35] dk:text-[#2DD4BF] dk:border dk:border-[#234E57] dk:shadow-[0_2px_0_0_#051013]';
  const SEG_OFF = 'flex-1 min-h-[44px] px-1 rounded-xl font-bold text-xs flex items-center justify-center relative text-center transition-all lt:text-[#5A4E45] dk:text-[#A5B4C0]';
  const CARD = 'rounded-2xl border-2 lt:bg-[#ffffff] lt:border-[#EDE3D8] lt:shadow-[0_3px_0_0_#E2D5C7] dk:bg-[#10252B] dk:border-[#1B383F] dk:shadow-[0_3px_0_0_#051013]';
  const SPK = 'w-11 h-11 shrink-0 rounded-full border flex items-center justify-center active:scale-95 transition-all lt:bg-[#E6F5F3] lt:border-[#BDEBE6] lt:text-[#136B66] lt:hover:bg-[#D5EFEA] dk:bg-[#14353B] dk:border-[#1B4D54] dk:text-[#2DD4BF] dk:hover:bg-[#1B464E]';
  const MUTED = 'lt:text-[#5A4E45] dk:text-[#A5B4C0]', TEAL = 'lt:text-[#136B66] dk:text-[#2DD4BF]';
  const ms = (n, c) => `<span class="material-symbols-outlined${c ? ' ' + c : ''}" aria-hidden="true">${n}</span>`;

  // ---- lọc / sắp xếp ----
  const tricky = () => { const m = miss(); return r => (m[r.b] || 0) > 0 || saved(r.b); };
  function filtered(D, o) {
    const q = norm(o.q || ''), m = miss(), tk = tricky();
    let rows = D.rows.filter(r => (!o.cef || (o.cef === 'my' ? LV.indexOf(r.cef) <= LV.indexOf(lvOf()) : r.cef === o.cef)) && (!o.pat || r.pat === o.pat) && (!q || r.fn.some(f => f.startsWith(q)) || r.hay.includes(q)) && (o.sort !== 'tricky' || tk(r)));
    rows = rows.slice().sort(o.sort === 'az' ? (a, b) => a.b.localeCompare(b.b) : o.sort === 'tricky' ? (a, b) => (m[b.b] || 0) - (m[a.b] || 0) || a.freq - b.freq || a.b.localeCompare(b.b) : (a, b) => a.freq - b.freq || a.b.localeCompare(b.b));
    return rows;
  }

  // ---- hàng của bảng ----
  const formsTxt = l => l.map(x => x.w).join(' / ');
  function rowHtml(r) {
    const i0 = r.past[0].w, i1 = r.ppl[0].w;
    return `<article class="flex items-center ${CARD} [content-visibility:auto] [contain-intrinsic-size:auto_92px]"><a href="#/irregular/${enc(r.b)}" class="flex-1 min-w-0 grid grid-cols-10 gap-2 items-start p-3.5 pe-1 rounded-s-2xl" data-irv-open="${esc(r.b)}">
      <span class="col-span-4 min-w-0"><span class="block text-base font-extrabold leading-tight break-words" lang="en" translate="no">${esc(r.b)}</span><span class="block text-[11px] font-medium ${TEAL}" lang="en" translate="no">${esc(ipaOf(r, r.b))}</span><span class="block text-[11px] font-medium mt-0.5 line-clamp-2 break-words ${MUTED}" lang="${esc(learn())}">${esc(r.m)}</span></span>
      <span class="col-span-3 min-w-0"><span class="block text-sm font-bold break-words" lang="en" translate="no">${esc(formsTxt(r.past))}</span><span class="block text-[11px] font-medium ${MUTED}" lang="en" translate="no">${esc(ipaOf(r, i0))}</span></span>
      <span class="col-span-3 min-w-0"><span class="block text-sm font-bold break-words" lang="en" translate="no">${esc(formsTxt(r.ppl))}</span><span class="block text-[11px] font-medium ${MUTED}" lang="en" translate="no">${esc(ipaOf(r, i1))}</span></span></a>
      <button type="button" data-irv-spk="${esc(r.b)}" aria-label="${esc(t('Nghe') + ': ' + r.trio)}" class="${SPK} me-2">${ms('volume_up', 'text-[20px]')}</button></article>`;
  }

  // ---- trang bảng ----
  function mount(view, D) {
    const l = D.l, back = S.back && !/^#\/irregular/.test(S.back) ? S.back : '#/grammar';
    const chip = (k, v, label, on, extra) => `<button type="button" data-${k}="${esc(v)}" aria-pressed="${on}" class="${on ? CHIP_ON : CHIP_OFF}">${label}${extra || ''}</button>`;
    bodyOn();
    view.innerHTML = `<div class="v2s-irregular"><div class="${ROOT}" data-irv="table"><div class="${COL}">
      <header class="sticky top-0 z-40 w-full px-4 h-16 pt-safe flex items-center justify-between gap-2 backdrop-blur-md border-b lt:bg-[#FFF9F3]/95 lt:border-[#EDE3D8] dk:bg-[#091518]/95 dk:border-[#1B383F]">
        <button type="button" data-href="${esc(back)}" aria-label="${esc(t('Quay về'))}" class="${BTN}">${ms('arrow_back', 'text-[22px] rtl:-scale-x-100')}</button>
        <h1 class="text-xl font-extrabold tracking-tight text-center min-w-0 break-words leading-tight">${esc(t('Động từ bất quy tắc'))}</h1>
        <button type="button" id="irvAcc" class="${BTN} text-xs font-extrabold" aria-label="${esc(t('Giọng Anh') + ' / ' + t('Giọng Mỹ'))}"><span lang="en" translate="no" id="irvAccT"></span></button></header>
      <div class="px-4 pt-3 space-y-4">
        <section aria-label="${esc(t('Động từ bất quy tắc'))}"><div class="relative flex items-center rounded-2xl border-2 ps-3.5 pe-1 py-1 transition-all lt:bg-[#ffffff] lt:border-[#EDE3D8] lt:shadow-[0_3px_0_0_#E2D5C7] lt:focus-within:border-[#136B66] dk:bg-[#0E1E22] dk:border-[#234E57] dk:shadow-[0_3px_0_0_#051013] dk:focus-within:border-[#2DD4BF]">
          ${ms('search', 'me-2 text-[22px] ' + TEAL)}<input id="irvQ" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(S.q)}" placeholder="${esc(t('Tìm mọi dạng, ví dụ went hoặc gone'))}" aria-label="${esc(t('Tìm mọi dạng, ví dụ went hoặc gone'))}" class="w-full bg-transparent border-none font-medium text-sm focus:ring-0 focus:outline-none p-0 h-11 min-w-0 lt:text-[#141819] lt:placeholder:text-[#6b6159] dk:text-[#F0FDFA] dk:placeholder:text-[#94A3B8]">
          <button type="button" id="irvClr" aria-label="${esc(t('Xóa'))}" class="w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${MUTED}" hidden>${ms('close', 'text-[18px]')}</button></div></section>
        <section aria-label="CEFR"><div id="irvCef" class="flex items-center gap-2 overflow-x-auto py-1 [scrollbar-width:none]">${chip('cef', '', esc(t('Mọi cấp độ')), !S.cef)}${lvOf() ? chip('cef', 'my', '≤ ' + lvOf(), S.cef === 'my') : ''}${LV.map(v => chip('cef', v, v, S.cef === v)).join('')}</div></section>
        <section aria-label="A-B-C"><div id="irvPat" class="flex items-center gap-2 overflow-x-auto py-0.5 [scrollbar-width:none]">${chip('pat', '', esc(t('Mọi kiểu')), !S.pat)}${PATS.map(([k, a, ex]) => chip('pat', k, `<span lang="en" translate="no">${a}</span>`, S.pat === k, `<span class="ms-1 text-[10px] font-normal ${MUTED}" lang="en" translate="no">(${ex})</span>`)).join('')}</div></section>
        <section><div id="irvSort" class="p-1.5 rounded-2xl flex gap-1 border lt:bg-[#EFE5D8] lt:border-[#E2D5C7] dk:bg-[#0B191D] dk:border-[#1B383F]" role="group">${[['freq', t('Hay gặp nhất')], ['az', t('A đến Z')], ['tricky', t('Hay sai của tôi')]].map(([k, lb]) => `<button type="button" data-sort="${k}" aria-pressed="${S.sort === k}" class="${S.sort === k ? SEG_ON : SEG_OFF}"><span>${esc(lb)}</span>${k === 'tricky' ? '<span id="irvDot" class="w-1.5 h-1.5 rounded-full bg-[#E11D48] absolute top-2 end-2" hidden></span>' : ''}</button>`).join('')}</div></section>
        <div class="flex items-center justify-between gap-2 flex-wrap text-xs font-bold px-1 pt-1"><span class="flex items-center gap-1.5">${ms('format_list_bulleted', 'text-[16px] ' + TEAL)}<span id="irvCnt" role="status" aria-live="polite"></span></span></div>
        <section aria-label="${esc(t('Động từ bất quy tắc'))}" class="pt-1"><div class="grid grid-cols-10 gap-2 ps-3.5 pe-[60px] pb-2 text-[11px] font-extrabold tracking-wider uppercase ${MUTED}" aria-hidden="true"><div class="col-span-4 min-w-0 break-words">${esc(t('Dạng gốc'))}</div><div class="col-span-3 min-w-0 break-words">${esc(t('Quá khứ'))}</div><div class="col-span-3 min-w-0 break-words">${esc(t('Quá khứ phân từ'))}</div></div>
          <div id="irvList" class="space-y-3"></div><p id="irvNone" class="py-8 text-center text-sm font-medium ${MUTED}" hidden>${esc(t('Không có động từ phù hợp.'))}</p></section></div>
      <div class="sticky bottom-[76px] lg:bottom-4 z-30 px-4 pt-6 mt-auto pointer-events-none lt:bg-gradient-to-t lt:from-[#FFF9F3] lt:via-[#FFF9F3]/90 lt:to-transparent dk:bg-gradient-to-t dk:from-[#091518] dk:via-[#091518]/90 dk:to-transparent"><a id="irvGo" href="#/irregular/practice" class="pointer-events-auto w-full min-h-[52px] py-3.5 px-6 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 text-center active:translate-y-[2px] transition-all lt:bg-[#E11D48] lt:text-[#ffffff] lt:shadow-[0_4px_0_0_#9F1239] dk:bg-[#E11D48] dk:text-[#ffffff] dk:shadow-[0_4px_0_0_#881337]"><span id="irvGoT"></span>${ms('arrow_forward', 'text-[20px] rtl:-scale-x-100')}</a></div>
      </div>${navHtml()}</div></div>`;
    const root = view.querySelector('[data-irv="table"]'), q = $('#irvQ', root), list = $('#irvList', root);
    const setOn = (box, attr, v) => box.querySelectorAll('button').forEach(b => { const on = b.dataset[attr] === v; b.setAttribute('aria-pressed', String(on)); b.className = box.id === 'irvSort' ? (on ? SEG_ON : SEG_OFF) : (on ? CHIP_ON : CHIP_OFF); });
    const paint = () => {
      const rows = filtered(D, S), tok = ++S.tok, m = miss(); let i = 0;
      list.innerHTML = ''; $('#irvNone', root).hidden = rows.length > 0;
      const chunk = () => { if (tok !== S.tok || !list.isConnected) return; const n = i ? 40 : 24; list.insertAdjacentHTML('beforeend', rows.slice(i, i + n).map(rowHtml).join('')); i += n; if (i < rows.length) requestAnimationFrame(chunk); };
      chunk();
      const sv = D.rows.filter(r => saved(r.b)).length;
      $('#irvCnt', root).textContent = t('{n} động từ, đã lưu {s} vào ôn tập', { n: rows.length, s: sv });
      $('#irvDot', root).hidden = !D.rows.some(r => (m[r.b] || 0) > 0 || saved(r.b));
      const go = $('#irvGo', root), n = Math.min(10, rows.length); $('#irvGoT', root).textContent = t('Luyện nhanh {n} động từ', { n });
      go.hidden = !n; go.href = '#/irregular/practice' + qs();
      $('#irvAccT', root).textContent = accIdx() ? 'US' : 'UK'; $('#irvClr', root).hidden = !S.q;
    };
    const qs = () => { const p = new URLSearchParams(); for (const k of ['q', 'cef', 'pat']) if (S[k]) p.set(k, S[k]); if (S.sort !== 'freq') p.set('sort', S.sort); const s = p.toString(); return s ? '?' + s : ''; };
    q.oninput = () => { S.q = q.value; paint(); };
    $('#irvClr', root).onclick = () => { S.q = q.value = ''; paint(); q.focus(); };
    $('#irvCef', root).onclick = e => { const b = e.target.closest('button'); if (!b) return; S.cef = b.dataset.cef; setOn(e.currentTarget, 'cef', S.cef); paint(); };
    $('#irvPat', root).onclick = e => { const b = e.target.closest('button'); if (!b) return; S.pat = b.dataset.pat; setOn(e.currentTarget, 'pat', S.pat); paint(); };
    $('#irvSort', root).onclick = e => { const b = e.target.closest('button'); if (!b) return; S.sort = b.dataset.sort; setOn(e.currentTarget, 'sort', S.sort); paint(); };
    $('#irvAcc', root).onclick = () => { App.state.settings.accent = accIdx() ? 'en-GB' : 'en-US'; App.saveSettings && App.saveSettings(); paint(); if (S.sheet) openSheet(D, S.sheet, true); };
    root.addEventListener('click', e => {
      const sp = e.target.closest('[data-irv-spk]'); if (sp) { const r = D.map[sp.dataset.irvSpk]; if (r) { speakIcon(sp); UI.tts(r.trio, acc()); } return; }
      if (e.target.closest('[data-irv-open]')) { S.pushed = true; S.y = scrollY; }
    });
    S.repaint = paint; paint();
  }

  // ---- tờ chi tiết (hộp thoại) ----
  const T_CARD = 'rounded-2xl border-2 lt:bg-[#ffffff] lt:border-[#DFCFC5] lt:shadow-[0_3px_0_0_#DFCFC5] dk:bg-[#142a30] dk:border-[#234e57] dk:shadow-[0_3px_0_0_#0c1b20]';
  const T_SPK = 'w-11 h-11 shrink-0 rounded-full border flex items-center justify-center active:scale-95 transition-all lt:bg-[#F8EAE1] lt:border-[#DFCFC5] lt:text-[#136B66] lt:shadow-[0_2px_0_0_#DFCFC5] dk:bg-[#16323a] dk:border-[#234e57] dk:text-[#ffffff] dk:shadow-[0_2px_0_0_#0c1b20]';
  const T_MUTED = 'lt:text-[#5F5046] dk:text-[#a5c6cb]', T_TEAL = 'lt:text-[#136B66] dk:text-[#2dd4bf]';
  const hl = (s, vars) => { const re = new RegExp('\\b(' + vars.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'i'), m = re.exec(s); return m ? esc(s.slice(0, m.index)) + `<span class="underline decoration-2 font-extrabold ${T_TEAL}">${esc(m[0])}</span>` + esc(s.slice(m.index + m[0].length)) : esc(s); };
  function sheetHtml(r) {
    const l = learn(), PAT = { AAA: t('3 dạng giống nhau'), ABB: t('V2 = V3'), ABA: t('V1 = V3'), ABC: t('3 dạng khác nhau') }, pa = PATS.find(x => x[0] === r.pat)[1], sv = saved(r.b);
    const tile = (lb, list, hi) => { const w0 = list[0].w;
      return `<div class="rounded-2xl p-2.5 flex flex-col items-center text-center border-2 min-w-0 ${hi ? 'lt:bg-[#D2EBE9]/30 lt:border-[#136B66]/40 lt:shadow-[0_4px_0_0_#9DC8C5] dk:bg-[#0d2a2f] dk:border-[#2dd4bf] dk:shadow-[0_4px_0_0_#091e22]' : 'lt:bg-[#ffffff] lt:border-[#DFCFC5] lt:shadow-[0_4px_0_0_#DFCFC5] dk:bg-[#142a30] dk:border-[#234e57] dk:shadow-[0_4px_0_0_#0c1b20]'}">
        <span class="text-[11px] font-extrabold uppercase break-words max-w-full ${hi ? T_TEAL : T_MUTED}">${esc(lb)}</span>
        <p class="text-lg font-extrabold mt-1 leading-tight break-words max-w-full ${hi ? T_TEAL : 'lt:text-[#1C1003] dk:text-[#ffffff]'}" lang="en" translate="no">${esc(w0)}${list[0].tag ? `<small class="text-[10px] font-bold ${T_MUTED}"> ${esc(list[0].tag)}</small>` : ''}</p>
        <span class="text-[11px] font-medium mt-0.5 ${T_MUTED}" lang="en" translate="no">${esc(ipaOf(r, w0))}</span>
        <button type="button" data-irv-say="${esc(w0)}" aria-label="${esc(t('Nghe') + ': ' + w0)}" class="mt-2 ${T_SPK}">${ms('volume_up', 'text-[20px]')}</button>
        ${list.slice(1).map(x => `<button type="button" data-irv-say="${esc(x.w)}" aria-label="${esc(t('Nghe') + ': ' + x.w)}" class="mt-2 min-h-[44px] px-3 rounded-full border text-sm font-bold flex items-center gap-1 max-w-full ${T_SPK.replace('w-11 h-11 shrink-0 rounded-full', '')}"><span lang="en" translate="no" class="break-words">${esc(x.w)}${x.tag ? ' ' + esc(x.tag) : ''}</span>${ms('volume_up', 'text-[16px]')}</button>`).join('')}</div>`; };
    const ex = (lb, s, tr, vars, k) => `<div class="p-3.5 flex items-center justify-between gap-3 ${T_CARD}"><div class="flex-1 min-w-0"><span class="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider mb-1 lt:bg-[#F8EAE1] lt:text-[#5F5046] dk:bg-[#0e3835] dk:text-[#2dd4bf]">${esc(lb)}</span>
      <p class="text-[14px] font-bold leading-snug lt:text-[#1C1003] dk:text-[#ffffff]" lang="en" translate="no">${hl(s, vars)}</p>${tr ? `<p class="text-xs font-medium mt-1 ${T_MUTED}" lang="${esc(l)}">${esc(tr)}</p>` : ''}</div>
      <button type="button" data-irv-sent="${k}" aria-label="${esc(t('Nghe câu'))}" class="${T_SPK}">${ms('volume_up', 'text-[20px]')}</button></div>`;
    const sec = 'text-xs font-extrabold uppercase tracking-wider mb-2 ' + T_MUTED, sb = 'flex-1 min-h-[46px] px-2 py-2 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 text-center active:translate-y-1 transition-all lt:bg-[#ffffff] lt:border-[#DFCFC5] lt:text-[#1C1003] lt:shadow-[0_3px_0_0_#DFCFC5] dk:bg-[#142a30] dk:border-[#234e57] dk:text-[#ffffff] dk:shadow-[0_3px_0_0_#0c1b20]';
    const tg = (on, lb) => `<button type="button" data-irv-acc="${on ? 1 : 0}" aria-pressed="${accIdx() === on}" class="flex-1 min-h-[44px] rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 text-center transition-all ${accIdx() === on ? 'lt:bg-[#ffffff] lt:text-[#136B66] lt:shadow-[0_2px_0_0_#C5B5AA] dk:bg-[#142a30] dk:text-[#ffffff] dk:border dk:border-[#234e57]' : 'lt:text-[#5F5046] dk:text-[#a5c6cb]'}">${ms('record_voice_over', 'text-[16px]')}<span>${esc(lb)}</span></button>`;
    return `<div class="v2s-irregular"><div class="st v2 lt:text-[#1C1003] dk:text-[#ffffff]"><section class="w-full rounded-t-3xl flex flex-col overflow-hidden border-t-2 lt:bg-[#FFF8F4] lt:border-[#DFCFC5] dk:bg-[#091518] dk:border-[#234e57]">
      <div class="w-full pt-3 px-5 pb-2 flex flex-col items-center shrink-0"><div class="w-12 h-1.5 rounded-full mb-2 lt:bg-[#DFCFC5] dk:bg-[#25444c]" aria-hidden="true"></div><div class="w-full flex items-center justify-end"><button type="button" data-irv-close aria-label="${esc(t('Đóng'))}" class="w-11 h-11 rounded-full border flex items-center justify-center lt:bg-[#F8EAE1] lt:border-[#DFCFC5] lt:text-[#1C1003] lt:shadow-[0_2px_0_0_#DFCFC5] dk:bg-[#142a30] dk:border-[#234e57] dk:text-[#ffffff]">${ms('close', 'text-[20px]')}</button></div></div>
      <div class="px-5 pb-6 overflow-y-auto space-y-4 max-h-[78vh] overscroll-contain">
        <div><h2 id="irvH" class="text-4xl font-extrabold tracking-tight break-words" lang="en" translate="no">${esc(r.b)}</h2><p class="text-[15px] font-medium leading-relaxed mt-1 lt:text-[#5F5046] dk:text-[#e2e8f0]" lang="${esc(l)}">${esc(r.m)}</p>${l !== 'en' ? `<p class="text-xs font-medium ${T_MUTED}" lang="en" translate="no">${esc(r.g)}</p>` : ''}
          <div class="flex flex-wrap items-center gap-2 mt-3"><span class="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[11px] font-extrabold uppercase tracking-wide lt:bg-[#D2EBE9]/70 lt:border-[#136B66]/30 lt:text-[#0b4b47] dk:bg-[#0e3835] dk:border-[#2dd4bf]/40 dk:text-[#2dd4bf]">${ms('stars', 'text-[14px]')}<span lang="en" translate="no">${esc(r.lv)}</span></span>
          <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[11px] font-extrabold tracking-wide lt:bg-[#FFDAD3]/70 lt:border-[#B53A22]/30 lt:text-[#8f2c18] dk:bg-[#3a1b1b] dk:border-[#ff8a9a]/40 dk:text-[#ff8a9a]"><span lang="en" translate="no">${pa}</span><span>${esc(PAT[r.pat])}</span></span></div></div>
        <div class="w-full p-1 rounded-2xl flex items-center border min-h-[48px] gap-1 lt:bg-[#F0DFD4]/70 lt:border-[#DFCFC5] dk:bg-[#0a1619] dk:border-[#234e57]" role="group">${tg(0, t('Giọng Anh'))}${tg(1, t('Giọng Mỹ'))}</div>
        <div class="grid grid-cols-3 gap-2.5">${tile(t('Dạng gốc'), [{ w: r.b }])}${tile(t('Quá khứ'), r.past, 1)}${tile(t('Quá khứ phân từ'), r.ppl)}</div>
        ${r.n ? `<p class="text-xs font-semibold rounded-2xl border-2 p-3 leading-relaxed lt:bg-[#FFDF9E]/30 lt:border-[#8A6500]/30 lt:text-[#392900] dk:bg-[#241c10] dk:border-[#633c0e] dk:text-[#f1f5f9]" lang="${esc(l)}">${esc(r.n)}</p>` : ''}
        <button type="button" data-irv-say="trio" class="w-full text-start rounded-2xl border-2 p-3.5 flex items-start gap-3 lt:bg-[#FFDF9E]/30 lt:border-[#8A6500]/30 lt:shadow-[0_3px_0_0_#E0BC6B] dk:bg-[#241c10] dk:border-[#633c0e] dk:shadow-[0_3px_0_0_#140f08]"><span class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 lt:bg-[#8A6500] lt:text-[#ffffff] dk:bg-[#3d260d] dk:text-[#f59e0b]">${ms('lightbulb', 'text-[20px]')}</span><span class="min-w-0"><span class="block text-sm font-extrabold lt:text-[#392900] dk:text-[#fbbf24]" lang="en" translate="no">${esc(r.trio)}</span><span class="block text-xs font-semibold mt-1 leading-relaxed lt:text-[#1C1003] dk:text-[#f1f5f9]">${esc(t('Đọc to cả ba dạng, nhịp điệu giúp bạn nhớ lâu.'))}</span></span></button>
        <div class="space-y-2.5">${ex(t('Quá khứ'), r.p, r.tp, r.past.map(x => x.w), 'p')}${ex(t('Quá khứ phân từ'), r.pp, r.tpp, r.ppl.map(x => x.w), 'pp')}</div>
        <div class="pt-2 pb-2 space-y-2.5"><button type="button" data-irv-save aria-pressed="${sv}" class="w-full min-h-[54px] px-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 text-center active:translate-y-1 transition-all ${sv ? 'lt:bg-[#D2EBE9] lt:text-[#083734] lt:border-2 lt:border-[#136B66]/40 dk:bg-[#0e3835] dk:text-[#2dd4bf] dk:border-2 dk:border-[#2dd4bf]/40' : 'lt:bg-[#D93838] lt:text-[#ffffff] lt:shadow-[0_5px_0_0_#A82525] dk:bg-[#FF5252] dk:text-[#2a0606] dk:shadow-[0_5px_0_0_#D93838]'}">${ms(sv ? 'check_circle' : 'bookmark_add', 'text-[22px]')}<span>${esc(sv ? t('Đã lưu vào ôn tập') : t('Lưu vào ôn tập'))}</span></button>
          <div class="flex items-stretch gap-2.5"><a href="#/verb/${enc(r.b)}" class="${sb}">${ms('menu_book', 'text-[18px] ' + T_TEAL)}<span>${esc(t('Bảng chia đầy đủ'))}</span></a><a href="#/dict/${enc(r.b)}" class="${sb}">${ms('auto_stories', 'text-[18px] ' + T_TEAL)}<span>${esc(t('Từ điển'))}</span></a></div></div></div></section></div></div>`;
  }
  const sheetCss = on => { const m = $('#modal'), b = $('#modalBox'); if (!m || !b) return; m.style.cssText = on ? 'place-items:end center;padding:0' : ''; b.style.cssText = on ? 'padding:0;border-radius:28px 28px 0 0;width:min(560px,100%);max-height:92vh;overflow:hidden' : ''; };
  let obs = null;
  function watchClose() {
    if (obs) return; const m = $('#modal'); if (!m) return;
    obs = new MutationObserver(() => {
      if (!m.hidden || !S.sheet) return; S.sheet = null; sheetCss(false);
      if (/^#\/irregular\/(?!practice)/.test(location.hash)) { if (S.pushed) history.back(); else location.replace(location.pathname + location.search + '#/irregular'); }
    });
    obs.observe(m, { attributes: true, attributeFilter: ['hidden'] });
  }
  function openSheet(D, r, again) {
    S.sheet = r; const box = modal(sheetHtml(r)); sheetCss(true); watchClose(); box.setAttribute('aria-labelledby', 'irvH');
    const ipaStr = ipaOf(r, r.b);
    box.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-irv-close')) return UI.closeModal();
      if (b.dataset.irvAcc != null) { App.state.settings.accent = b.dataset.irvAcc === '1' ? 'en-US' : 'en-GB'; App.saveSettings && App.saveSettings(); openSheet(D, r, true); if (S.repaint) S.repaint(); const nb = $('#modalBox [data-irv-acc="' + b.dataset.irvAcc + '"]'); if (nb) nb.focus({ preventScroll: true }); return; }
      if (b.dataset.irvSay) { speakIcon(b); return b.dataset.irvSay === 'trio' ? UI.tts(r.trio, acc()) : UI.speak(b.dataset.irvSay, acc()); }
      if (b.dataset.irvSent) { speakIcon(b); return UI.tts(b.dataset.irvSent === 'p' ? r.p : r.pp, acc()); }
      if (b.hasAttribute('data-irv-save') && !saved(r.b)) {
        await App.addWord({ word: r.b, vi: r.m, def: r.g, ipa: ipaStr, ex: r.p, pos: 'verb', emoji: '🔤', topic: 'irregular' }, { text: r.p, title: 'Irregular verbs' });
        toast(t('Đã lưu vào ôn tập')); openSheet(D, r, true); if (S.repaint) S.repaint(); const nb = $('#modalBox [data-irv-save]'); if (nb) nb.focus({ preventScroll: true });
      }
    };
    return box;
  }

  routes.irregular = App.guard(async function (arg, query) {
    const view = $('#view'), w = App.W; let D;
    if (!/^#\/irregular/.test(App.prevHash || '')) S.back = App.prevHash || '';
    try { D = await w(load()); } catch (e) { return err(view); }
    if (arg === 'practice') { S.sheet = null; try { await w(App.need('irvdrill')); } catch (e) { return err(view); } return Irv.drill(view, D, query); }
    if (!S.init) { S.init = true; S.cef = lvOf() ? 'my' : ''; } // biết trình độ (bài xếp lớp) → mặc định mọi động từ tới cấp đó
    const r = arg ? D.map[String(arg).toLowerCase()] : null;
    if (arg && !r) { location.replace('#/irregular'); return; }
    const live = view.querySelector('[data-irv="table"]');
    if (live && S.rows === D) { bodyOn(); window.scrollTo(0, S.y || 0); } else { S.rows = D; mount(view, D); if (!r) S.pushed = false; }
    if (r) { if (!S.sheet || S.sheet !== r || $('#modal').hidden) openSheet(D, r); } else { S.pushed = false; if (S.sheet && !$('#modal').hidden) UI.closeModal(); S.sheet = null; sheetCss(false); }
    App.onCleanup && App.onCleanup(() => { if (S.sheet && !$('#modal').hidden && !/^#\/irregular\/(?!practice)/.test(location.hash)) UI.closeModal(); sheetCss(false); });
  });
  g.Irv = { S, filtered, miss, setMiss, saved, acc, ipaOf, ms, bodyOn, norm }; // dùng chung với irregular/drill.js (gói lười 'irvdrill') + test jsdom
})(self);
