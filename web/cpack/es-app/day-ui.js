/* 🇪🇸🇫🇷 Lộ trình ngày ngôn ngữ đích (#/practice/esd · #/practice/frd, spanish-course.md / french-course.md W4; MỘT engine, bảng TLD theo tl): mỗi ngày = từ mới + 1 điểm ngữ pháp + 1 chủ đề phát âm (nếu tl có) (+ cuộc gọi AI mỗi 5 ngày).
 * Chỉ ĐIỀU HƯỚNG tới màn có sẵn (Target.table(tl).routes: luyện · phát âm · #/call/<id>) + bước "từ mới" tại chỗ; không khung/CSS mới (lớp card/chip/btn sẵn có).
 * Dữ liệu tải lười dựng bởi scripts/target/path-lib.mjs: cpack/<tl>/dy.js + dy-<ngôn ngữ>.js (nhãn); từ = packs/<tl>/wd.json + wd-<ngôn ngữ>.json (nghĩa) – tải như App.loadPack. Tiến độ: lk.<tl>.day = { "<ngày>": "wgpc" }.
 * Làm xong bước ở màn khác: nút bắt đầu ghi lk.<tl>.dayctx (sessionStorage); màn kết của luyện/phát âm/cuộc gọi gọi App.esDayMark(bước, tl) → đánh dấu bước. Tệp này nằm ở cả gói esday và frday: nạp lần hai bỏ qua. */
(function () {
  const { $, esc } = UI, App = window.App, view = App.view; if (App.tlday) return;
  // Bảng theo ngôn ngữ đích (đường dẫn cpack nguyên văn để build-cpack đặt tên băm): dy/wd = nhãn + nghĩa theo ngôn ngữ người học, G = biến toàn cục gói, call = gói cuộc gọi (bundles.js), acc = giọng đọc dự phòng,
  // gx = bảng gói giải thích ngữ pháp (app.js; lấy tên điểm), px = bảng gói phát âm theo ngôn ngữ người học + gói gốc (tl chưa có phát âm: bỏ bước p, không liên kết hỏng), art = mạo từ hiển thị trước danh từ (hàng wd.js: [từ, loại, IPA, ví dụ, giống?, số nhiều?, 'a' = h aspiré])
  const ES_ART = w => (w[1] !== 'n' || !w[4] ? '' : (w[4] === 'm' ? 'el' : w[4] === 'mf' ? 'el/la' : /^ˈa/.test(w[2]) ? 'el' : 'la') + ' '); // el trước a/ha nhấn ở âm đầu: el agua; IPA es-419 nhấn đầu từ = 'ˈa…'
  const FR_ART = w => (w[1] !== 'n' || !w[4] ? '' : /^[aeiouyàâäéèêëîïôöùûüœæh]/i.test(w[0]) && w[6] !== 'a' ? "l'" : (w[4] === 'mf' ? 'le/la' : w[4] === 'm' ? 'le' : 'la') + ' '); // l' trước nguyên âm/h câm; h aspiré (haricot) giữ le/la
  const TLD = {
    es: { G: 'ESX', call: 'calles', acc: 'es-419', art: ES_ART, gx: () => App.esGx, px: () => ({ pxl: App.esPx, base: 'cpack/es/px.js' }),
      dy: { en: 'cpack/es/dy-en.js', vi: 'cpack/es/dy-vi.js', es: 'cpack/es/dy-es.js', pt: 'cpack/es/dy-pt.js', fr: 'cpack/es/dy-fr.js', de: 'cpack/es/dy-de.js', id: 'cpack/es/dy-id.js', th: 'cpack/es/dy-th.js', zh: 'cpack/es/dy-zh.js', ja: 'cpack/es/dy-ja.js', ko: 'cpack/es/dy-ko.js', hi: 'cpack/es/dy-hi.js', ar: 'cpack/es/dy-ar.js', ru: 'cpack/es/dy-ru.js', tr: 'cpack/es/dy-tr.js' } },
    fr: { G: 'FRX', call: 'callfr', acc: 'fr-FR', art: FR_ART, gx: () => App.frGx, px: () => (App.frPx ? { pxl: App.frPx, base: 'cpack/fr/px.js' } : null), // App.frPx do nhánh phát âm fr (W3) khai khi vào main
      dy: { en: 'cpack/fr/dy-en.js', vi: 'cpack/fr/dy-vi.js', es: 'cpack/fr/dy-es.js', pt: 'cpack/fr/dy-pt.js', fr: 'cpack/fr/dy-fr.js', de: 'cpack/fr/dy-de.js', id: 'cpack/fr/dy-id.js', th: 'cpack/fr/dy-th.js', zh: 'cpack/fr/dy-zh.js', ja: 'cpack/fr/dy-ja.js', ko: 'cpack/fr/dy-ko.js', hi: 'cpack/fr/dy-hi.js', ar: 'cpack/fr/dy-ar.js', ru: 'cpack/fr/dy-ru.js', tr: 'cpack/fr/dy-tr.js' } },
  };
  let TL = 'es'; const C = () => TLD[TL], KEY = () => 'lk.' + TL + '.day', CTX = () => 'lk.' + TL + '.dayctx';
  const LABEL = 'ti sub dy w g p c go pr mk fin td sv'.split(' '); // thứ tự khớp path-lib.DAY_UI
  const ls = (k, v, s) => { try { const st = s ? sessionStorage : localStorage; if (v === undefined) return st.getItem(k); if (v === null) st.removeItem(k); else st.setItem(k, v); } catch (e) { /* riêng tư */ } return null; };
  const X = () => (self[C().G] = self[C().G] || {});
  const lang = () => { const l = window.I18N && I18N.learnLang ? I18N.learnLang() : 'en'; return C().dy[l] ? l : 'en'; };
  const prog = () => { try { return JSON.parse(ls(KEY()) || '{}') || {}; } catch (e) { return {}; } };
  const u = k => ((X().dyl || {})[lang()] || (X().dyl || {}).en || [])[LABEL.indexOf(k)] || '';
  const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => o[k]);
  const hasPx = () => !!(X().dy.t[0] || [])[0] && !!C().px(); // chủ đề phát âm rỗng ('') = tl chưa có phát âm → bỏ bước p
  const steps = d => /* bước bắt buộc: w (nếu ngày có từ mới), g, p (nếu có phát âm), c (khi có cuộc gọi) */ (d[1] > d[0] ? 'w' : '') + 'g' + (d[4] && hasPx() ? 'p' : '') + (d[6] ? 'c' : '');
  const doneOf = (n, d) => { const f = prog()[n] || ''; return steps(d).split('').filter(s => f.includes(s)); };
  const full = (n, d) => doneOf(n, d).length === steps(d).length;
  const speak = (x, rate) => { try { UI.tts(x, window.Target && Target.speechLang ? Target.speechLang(TL) || C().acc : C().acc, rate || 0.9); } catch (e) { /* không có giọng */ } };
  let DAYS = []; // kế hoạch: <G>.dyp (planDay của path-lib, sinh vào dy.js) áp lên <G>.dy
  const firstOpen = () => { const k = DAYS.findIndex((d, n) => !full(n, d)); return k < 0 ? DAYS.length - 1 : k; };
  const gxOf = id => { const g = (X().gx || {})[lang()] || (X().gx || {}).en || {}; return (g[id] || [id])[0]; };
  const route = k => ((window.Target && Target.table(TL).routes) || {})[k] || '#/practice/' + TL; // luyện (vocab) · phát âm (skills) của tl
  const home = () => (window.Target && Target.homeOf(TL)) || '#/practice/' + TL + 'd';
  // "Đánh dấu xong" bước từ mới → thẻ tl vào Sổ từ/Ôn tập (SRS sẵn có lọc theo Target.cur(); cùng dạng thẻ bộ seed ở settings.js addTlSeed)
  async function toDeck(a, b) {
    const C_ = window.Core, l = lang(), tl = TL; if (!C_ || !C_.Cards) return 0;
    const W = X().wd.slice(a, b), E = (X().wdl.en || []).slice(a, b), G = ((X().wdl || {})[l] || X().wdl.en || []).slice(a, b), add = [];
    await C_.Cards.mutate(m => {
      W.forEach((w, k) => { const key = C_.tlKey(w[0], tl); if (m[key]) return;
        m[key] = C_.Cards.make({ word: w[0], pos: w[1], ipa: w[2], def: E[k] || G[k] || '', vi: l === 'vi' ? G[k] : '', ex: w[3], topic: tl + '-core', emoji: '📘', tl }, { gl: { en: E[k] || G[k], [l]: G[k] }, ...(w[4] ? { gender: w[4] } : {}), ...(w[5] ? { plural: w[5] } : {}), ...(w[6] === 'a' ? { h: 'aspire' } : {}) });
        add.push(m[key]); });
      return m;
    });
    if (window.Target && Target.cur() === tl) for (const c of add) App.state.cards[c.word.toLowerCase()] = c;
    if (add.length) { try { App.updateChrome(); } catch (e) { /* khung chưa vẽ */ } if (window.Sync && Sync.schedule) Sync.schedule(); }
    return add.length;
  }
  const pxOf = id => { const g = (X().pxl || {})[lang()] || (X().pxl || {}).en || { tp: {} }; return ((g.tp || {})[id] || [id])[0]; };

  // Làm xong một bước ở màn khác (espr.js end · call.js recap): đánh dấu theo ngữ cảnh đã ghi lúc bấm Bắt đầu
  const mark = (n, st) => { const p = prog(), f = p[n] || ''; if (!f.includes(st)) { p[n] = f + st; ls(KEY(), JSON.stringify(p)); } };
  App.esDayMark = (ok, tl) => { // đánh dấu theo ngữ cảnh ghi lúc bấm Bắt đầu; ok = các bước màn kết này đảm nhiệm ('gp': espr.js, 'c': call.js); tl mặc định es
    TL = TLD[tl] ? tl : 'es';
    let c = null; try { c = JSON.parse(ls(CTX(), undefined, 1) || 'null'); } catch (e) { /* bỏ */ }
    if (c && ok.includes(c.s)) { mark(c.d, c.s); ls(CTX(), null, 1); }
  };

  const load = async () => {
    const l = lang(), c = C(), tl = [App.need(TL + 'day', c.call), App.loadScript(c.dy[l])];
    if (l !== 'en') tl.push(App.loadScript(c.dy.en)); // dự phòng nhãn tiếng Anh
    await Promise.all(tl); tl.length = 0;
    // Từ + nghĩa: web/packs/<tl>/*.json – cùng tên miền trên lexkite.com, https://lexkite.com ở add-on/app gốc (mẫu App.loadPack); ?v = băm nội dung (dy.js) → không dùng bản cũ
    const base = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '' : 'https://lexkite.com/', v = '?v=' + (X().wdv || '0');
    const get = f => fetch(base + 'packs/' + TL + '/' + f + '.json' + v).then(r => { if (!r.ok) throw new Error(f + ' ' + r.status); return r.json(); });
    if (!X().wd) tl.push(get('wd').then(j => { X().wd = j; }));
    for (const k of l !== 'en' ? [l, 'en'] : ['en']) if (!(X().wdl || {})[k]) tl.push(get('wd-' + k).then(j => { (X().wdl = X().wdl || {})[k] = j; }));
    tl.push(App.loadScript(c.gx()[l])); // tên điểm ngữ pháp
    const px = c.px(); if (px) tl.push(App.loadScript(px.pxl[l]), App.loadScript(px.base)); // tên chủ đề phát âm
    await Promise.all(tl);
  };

  App.tlday = async function (tl, dq) {
    TL = TLD[tl] ? tl : 'es';
    const tok = App.routeToken();
    view.innerHTML = `<div class="card" role="status">${esc(t('Đang tải…'))}</div>`;
    try { await load(); } catch (e) { if (!App.routeStale(tok)) view.innerHTML = `<div class="card">${esc(t('Không tải được bài. Kiểm tra mạng rồi thử lại.'))}</div>`; return; }
    if (App.routeStale(tok)) return;
    const D = DAYS = X().dy.g.map((g, i) => X().dyp(i, X().dy)), n = dq == null || dq === '' ? -1 : Math.max(0, Math.min(D.length - 1, parseInt(dq, 10) - 1 || 0));
    n < 0 ? hub(D) : day(n, D[n]);
  };
  App.esday = dq => App.tlday('es', dq); App.frday = dq => App.tlday('fr', dq);

  function hub(D) {
    const cur = firstOpen(), done = D.filter((d, n) => full(n, d)).length, pct = Math.round(done / D.length * 100);
    view.innerHTML = `${window.Target ? Target.chip(TL) : ''}<div class="page-head"><div><h1>${esc(u('ti'))}</h1><p class="muted">${esc(u('sub'))}</p></div></div>
      <section class="card"><div class="row between"><b>${esc(u('td'))} · ${esc(fmt(u('dy'), { n: cur + 1 }))}</b><span class="chip">${D[cur][3]}</span></div>
        <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
        <p class="small muted">${esc(fmt(u('pr'), { d: cur + 1, t: D.length, p: doneOf(cur, D[cur]).length }))}</p>
        <a class="btn primary" href="${home()}?d=${cur + 1}">${esc(u('go'))}</a></section>
      <div class="row" style="flex-wrap:wrap;gap:.4rem">${D.map((d, k) => `<a class="chip ${full(k, d) ? 'ok' : ''}" href="${home()}?d=${k + 1}" aria-label="${esc(fmt(u('dy'), { n: k + 1 }))}"${k === cur ? ' aria-current="step"' : ''}>${full(k, d) ? '✓' : k + 1}</a>`).join('')}</div>`;
  }

  function day(n, d) {
    const [a, b, gid, lv, tp, m, cid] = d, W = X().wd.slice(a, b), G = (X().wdl[lang()] || X().wdl.en).slice(a, b), have = prog()[n] || '', art = C().art, has = k => steps(d).includes(k);
    const call = cid && (window.CALLS || []).find(c => c.id === cid);
    const row = (s, title, body, href) => `<section class="card" id="ds-${s}"><div class="row between"><h3 style="margin:0">${have.includes(s) ? '✓ ' : ''}${esc(title)}</h3>${href ? `<a class="btn ${have.includes(s) ? '' : 'primary'}" href="${href}" data-s="${s}">${esc(u('go'))}</a>` : ''}</div>${body}</section>`;
    const words = W.map((w, k) => `<div class="row" style="align-items:flex-start;gap:.6rem;padding:.35rem 0"><button type="button" class="icon-btn sm" data-sp="${esc(w[0])}" aria-label="${esc(w[0])}">🔊</button>
      <div><b lang="${TL}">${art(w) ? `<span class="muted">${esc(art(w).trim())}</span>${/'$/.test(art(w)) ? '' : ' '}` : ''}${esc(w[0])}</b>${w[5] ? ` <span class="small muted" lang="${TL}">(${esc(w[5])})</span>` : ''} <span class="ipa">/${esc(w[2])}/</span> <span class="muted small">${esc(w[1])}</span><div dir="auto">${esc(G[k])}</div><div class="small muted" lang="${TL}">${esc(w[3])} <button type="button" class="icon-btn sm" data-sp="${esc(w[3])}" aria-label="${esc(w[3])}">🔊</button></div></div></div>`).join('');
    view.innerHTML = `${window.Target ? Target.chip(TL) : ''}<div class="page-head"><div><h1>${esc(fmt(u('dy'), { n: n + 1 }))}</h1><p class="muted"><span class="chip">${lv}</span> ${esc(fmt(u('pr'), { d: n + 1, t: DAYS.length, p: doneOf(n, d).length }))}</p></div><a class="btn ghost" href="${home()}">${esc(u('ti'))}</a></div>
      ${has('w') ? row('w', u('w'), words + `<button type="button" class="btn ${have.includes('w') ? '' : 'primary'}" id="dsMk">${esc(u('mk'))}</button>`) : ''}
      ${row('g', u('g') + ' · ' + gxOf(gid), '', `${route('vocab')}?lv=${lv}&p=${encodeURIComponent(gid)}`)}
      ${has('p') ? row('p', u('p') + ' · ' + pxOf(tp), '', `${route('skills')}?tp=${tp}&m=${m}`) : ''}
      ${call ? row('c', u('c') + ' · ' + call.title, `<p class="small muted" lang="${TL}">${esc(call.role)}</p>`, `#/call/${encodeURIComponent(cid)}`) : ''}
      ${full(n, d) ? `<div class="card center" role="status"><b>${esc(u('fin'))}</b></div>` : ''}`;
    view.querySelectorAll('[data-sp]').forEach(x => { x.onclick = () => speak(x.dataset.sp); });
    view.querySelectorAll('a[data-s]').forEach(x => { x.onclick = () => ls(CTX(), JSON.stringify({ d: n, s: x.dataset.s }), 1); });
    const mk = $('#dsMk'); if (mk) mk.onclick = async () => { mark(n, 'w'); let k = 0; try { k = await toDeck(d[0], d[1]); } catch (e) { /* lưu thẻ lỗi: bước vẫn ghi */ } day(n, d); if (k && UI.toast) UI.toast(fmt(u('sv'), { n: k })); };
  }
})();
