/* 🇪🇸 Lộ trình ngày tiếng Tây Ban Nha (#/practice/esd, spanish-course.md W4): mỗi ngày = từ mới + 1 điểm ngữ pháp + 1 chủ đề phát âm (+ cuộc gọi AI mỗi 5 ngày).
 * Chỉ ĐIỀU HƯỚNG tới màn có sẵn (#/practice/es · #/practice/esp · #/call/<id>) + bước "từ mới" tại chỗ; không khung/CSS mới (lớp card/chip/btn sẵn có).
 * Dữ liệu tải lười dựng bởi scripts/target/path-lib.mjs: cpack/es/{dy,wd}.js + dy-<ngôn ngữ>.js (nhãn) + wd-<ngôn ngữ>.js (nghĩa). Tiến độ: lk.es.day = { "<ngày>": "wgpc" }.
 * Làm xong bước ở màn khác: nút bắt đầu ghi lk.es.dayctx (sessionStorage); màn kết của luyện TBN/phát âm/cuộc gọi gọi App.esDayMark → đánh dấu bước. */
(function () {
  const { $, esc } = UI, App = window.App, view = App.view, KEY = 'lk.es.day', CTX = 'lk.es.dayctx', ACC = 'es-419';
  const DYL = { en: 'cpack/es/dy-en.js', vi: 'cpack/es/dy-vi.js', es: 'cpack/es/dy-es.js', pt: 'cpack/es/dy-pt.js', fr: 'cpack/es/dy-fr.js', de: 'cpack/es/dy-de.js', id: 'cpack/es/dy-id.js', th: 'cpack/es/dy-th.js', zh: 'cpack/es/dy-zh.js', ja: 'cpack/es/dy-ja.js', ko: 'cpack/es/dy-ko.js', hi: 'cpack/es/dy-hi.js', ar: 'cpack/es/dy-ar.js', ru: 'cpack/es/dy-ru.js', tr: 'cpack/es/dy-tr.js' };
  const WDL = { en: 'cpack/es/wd-en.js', vi: 'cpack/es/wd-vi.js', es: 'cpack/es/wd-es.js', pt: 'cpack/es/wd-pt.js', fr: 'cpack/es/wd-fr.js', de: 'cpack/es/wd-de.js', id: 'cpack/es/wd-id.js', th: 'cpack/es/wd-th.js', zh: 'cpack/es/wd-zh.js', ja: 'cpack/es/wd-ja.js', ko: 'cpack/es/wd-ko.js', hi: 'cpack/es/wd-hi.js', ar: 'cpack/es/wd-ar.js', ru: 'cpack/es/wd-ru.js', tr: 'cpack/es/wd-tr.js' };
  const LABEL = 'ti sub dy w g p c go pr mk fin td'.split(' '); // thứ tự khớp path-lib.DAY_UI
  const ls = (k, v, s) => { try { const st = s ? sessionStorage : localStorage; if (v === undefined) return st.getItem(k); if (v === null) st.removeItem(k); else st.setItem(k, v); } catch (e) { /* riêng tư */ } return null; };
  const X = () => (self.ESX = self.ESX || {});
  const lang = () => { const l = window.I18N && I18N.learnLang ? I18N.learnLang() : 'en'; return DYL[l] ? l : 'en'; };
  const prog = () => { try { return JSON.parse(ls(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const u = k => ((X().dyl || {})[lang()] || (X().dyl || {}).en || [])[LABEL.indexOf(k)] || '';
  const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => o[k]);
  const steps = d => /* bước bắt buộc: w, g, p (+ c khi có cuộc gọi) */ 'wgp' + (d[6] ? 'c' : '');
  const doneOf = (n, d) => { const f = prog()[n] || ''; return steps(d).split('').filter(s => f.includes(s)); };
  const full = (n, d) => doneOf(n, d).length === steps(d).length;
  const speak = (x, rate) => { try { UI.tts(x, ACC, rate || 0.9); } catch (e) { /* không có giọng */ } };
  let DAYS = []; // kế hoạch: ESX.dyp (planDay của path-lib, sinh vào dy.js) áp lên ESX.dy
  const firstOpen = () => { const k = DAYS.findIndex((d, n) => !full(n, d)); return k < 0 ? DAYS.length - 1 : k; };
  const gxOf = id => { const g = (X().gx || {})[lang()] || (X().gx || {}).en || {}; return (g[id] || [id])[0]; };
  const pxOf = id => { const g = (X().pxl || {})[lang()] || (X().pxl || {}).en || { tp: {} }; return ((g.tp || {})[id] || [id])[0]; };

  // Làm xong một bước ở màn khác (espr.js end · call.js recap): đánh dấu theo ngữ cảnh đã ghi lúc bấm Bắt đầu
  const mark = (n, st) => { const p = prog(), f = p[n] || ''; if (!f.includes(st)) { p[n] = f + st; ls(KEY, JSON.stringify(p)); } };
  App.esDayMark = ok => { // đánh dấu theo ngữ cảnh ghi lúc bấm Bắt đầu; ok = các bước màn kết này đảm nhiệm ('gp': espr.js, 'c': call.js)
    let c = null; try { c = JSON.parse(ls(CTX, undefined, 1) || 'null'); } catch (e) { /* bỏ */ }
    if (c && ok.includes(c.s)) { mark(c.d, c.s); ls(CTX, null, 1); }
  };

  const load = async () => {
    const l = lang(), tl = [App.need('esday', 'calles'), App.loadScript(DYL[l]), App.loadScript(WDL[l])];
    if (l !== 'en') tl.push(App.loadScript(DYL.en), App.loadScript(WDL.en)); // dự phòng nhãn/nghĩa tiếng Anh
    tl.push(App.loadScript(App.esGx[l]), App.loadScript(App.esPx[l]), App.loadScript('cpack/es/px.js'));
    await Promise.all(tl);
  };

  App.esday = async function (dq) {
    const tok = App.routeToken();
    view.innerHTML = `<div class="card" role="status">${esc(t('Đang tải…'))}</div>`;
    try { await load(); } catch (e) { if (!App.routeStale(tok)) view.innerHTML = `<div class="card">${esc(t('Không tải được bài. Kiểm tra mạng rồi thử lại.'))}</div>`; return; }
    if (App.routeStale(tok)) return;
    const D = DAYS = X().dy.g.map((g, i) => X().dyp(i, X().dy)), n = dq == null || dq === '' ? -1 : Math.max(0, Math.min(D.length - 1, parseInt(dq, 10) - 1 || 0));
    n < 0 ? hub(D) : day(n, D[n]);
  };

  function hub(D) {
    const cur = firstOpen(), done = D.filter((d, n) => full(n, d)).length, pct = Math.round(done / D.length * 100);
    view.innerHTML = `${window.Target ? Target.chip('es') : ''}<div class="page-head"><div><h1>${esc(u('ti'))}</h1><p class="muted">${esc(u('sub'))}</p></div></div>
      <section class="card"><div class="row between"><b>${esc(u('td'))} · ${esc(fmt(u('dy'), { n: cur + 1 }))}</b><span class="chip">${D[cur][3]}</span></div>
        <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
        <p class="small muted">${esc(fmt(u('pr'), { d: cur + 1, t: D.length, p: doneOf(cur, D[cur]).length }))}</p>
        <a class="btn primary" href="#/practice/esd?d=${cur + 1}">${esc(u('go'))}</a></section>
      <div class="row" style="flex-wrap:wrap;gap:.4rem">${D.map((d, k) => `<a class="chip ${full(k, d) ? 'ok' : ''}" href="#/practice/esd?d=${k + 1}" aria-label="${esc(fmt(u('dy'), { n: k + 1 }))}"${k === cur ? ' aria-current="step"' : ''}>${full(k, d) ? '✓' : k + 1}</a>`).join('')}</div>`;
  }

  function day(n, d) {
    const [a, b, gid, lv, tp, m, cid] = d, W = X().wd.slice(a, b), G = (X().wdl[lang()] || X().wdl.en).slice(a, b), have = prog()[n] || '';
    const call = cid && (window.CALLS || []).find(c => c.id === cid);
    const row = (s, title, body, href) => `<section class="card" id="ds-${s}"><div class="row between"><h3 style="margin:0">${have.includes(s) ? '✓ ' : ''}${esc(title)}</h3>${href ? `<a class="btn ${have.includes(s) ? '' : 'primary'}" href="${href}" data-s="${s}">${esc(u('go'))}</a>` : ''}</div>${body}</section>`;
    const words = W.map((w, k) => `<div class="row" style="align-items:flex-start;gap:.6rem;padding:.35rem 0"><button type="button" class="icon-btn sm" data-sp="${esc(w[0])}" aria-label="${esc(w[0])}">🔊</button>
      <div><b lang="es">${esc(w[0])}</b> <span class="ipa">/${esc(w[2])}/</span> <span class="muted small">${esc(w[1])}</span><div dir="auto">${esc(G[k])}</div><div class="small muted" lang="es">${esc(w[3])} <button type="button" class="icon-btn sm" data-sp="${esc(w[3])}" aria-label="${esc(w[3])}">🔊</button></div></div></div>`).join('');
    view.innerHTML = `${window.Target ? Target.chip('es') : ''}<div class="page-head"><div><h1>${esc(fmt(u('dy'), { n: n + 1 }))}</h1><p class="muted"><span class="chip">${lv}</span> ${esc(fmt(u('pr'), { d: n + 1, t: DAYS.length, p: doneOf(n, d).length }))}</p></div><a class="btn ghost" href="#/practice/esd">${esc(u('ti'))}</a></div>
      ${row('w', u('w'), words + `<button type="button" class="btn ${have.includes('w') ? '' : 'primary'}" id="dsMk">${esc(u('mk'))}</button>`)}
      ${row('g', u('g') + ' · ' + gxOf(gid), '', `#/practice/es?lv=${lv}&p=${encodeURIComponent(gid)}`)}
      ${row('p', u('p') + ' · ' + pxOf(tp), '', `#/practice/esp?tp=${tp}&m=${m}`)}
      ${call ? row('c', u('c') + ' · ' + call.title, `<p class="small muted" lang="es">${esc(call.role)}</p>`, `#/call/${encodeURIComponent(cid)}`) : ''}
      ${full(n, d) ? `<div class="card center" role="status"><b>${esc(u('fin'))}</b></div>` : ''}`;
    view.querySelectorAll('[data-sp]').forEach(x => { x.onclick = () => speak(x.dataset.sp); });
    view.querySelectorAll('a[data-s]').forEach(x => { x.onclick = () => ls(CTX, JSON.stringify({ d: n, s: x.dataset.s }), 1); });
    $('#dsMk').onclick = () => { mark(n, 'w'); day(n, d); };
  }
})();
