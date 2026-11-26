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
  const LABEL = 'ti sub dy w g p c go pr mk fin td sv wk mn ok lk rv rw cl cd sk wt nw xw xa xd sg1 sg2 sg3 sg4 sc1 sc2 sc3 sc4 sd sn sgo sh ob o1 o2 o3 stt stp stk rvn rv0 rvg'.split(' '); // thứ tự khớp path-lib.DAY_UI
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
  const startKey = () => 'lk.' + TL + '.start', startAt = () => Math.max(0, Math.min(DAYS.length - 1, parseInt(ls(startKey()), 10) || 0)); // điểm bắt đầu do người học chọn (không đánh dấu xong ngày nào)
  const firstOpen = () => { const k = DAYS.findIndex((d, n) => n >= startAt() && !full(n, d)); return k < 0 ? DAYS.length - 1 : k; };
  const goalOf = n => ((X().cdl || {})[lang()] || (X().cdl || {}).en || [])[n] || ''; // "Sau bài này bạn có thể …" (data cando.json của tl)
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
    const l = lang(), c = C(), tl = [App.need(TL + 'day', c.call), App.loadScript(c.dy[l]), App.loadCss('css/st-v2-day.css'), App.loadCss('css/tlpath.css')]; // token Stitch v2.1 + hub (không đụng khung app)
    if (l !== 'en') tl.push(App.loadScript(c.dy.en)); // dự phòng nhãn tiếng Anh
    await Promise.all(tl); tl.length = 0;
    // Từ + nghĩa: web/packs/<tl>/*.json – cùng tên miền trên lexkite.com, https://lexkite.com ở add-on/app gốc (mẫu App.loadPack); ?v = băm nội dung (dy.js) → không dùng bản cũ
    const base = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '' : 'https://lexkite.com/', v = '?v=' + (X().wdv || '0');
    const get = f => fetch(base + 'packs/' + TL + '/' + f + '.json' + v).then(r => { if (!r.ok) throw new Error(f + ' ' + r.status); return r.json(); });
    if (!X().wd) tl.push(get('wd').then(j => { X().wd = j; }));
    for (const k of l !== 'en' ? [l, 'en'] : ['en']) if (!(X().wdl || {})[k]) tl.push(get('wd-' + k).then(j => { (X().wdl = X().wdl || {})[k] = j; }));
    for (const k of l !== 'en' ? [l, 'en'] : ['en']) if (!(X().cdl || {})[k]) tl.push(get('cd-' + k).then(j => { (X().cdl = X().cdl || {})[k] = j; }).catch(() => {})); // mục tiêu từng ngày (lười; thiếu → ẩn dòng 🎯)
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

  // ---- Hub (#/practice/esd · frd): hero + thẻ Hôm nay + tuần (chỉ tuần hiện tại mở; các tuần sau vẽ lười khi mở) ----
  const WK_N = 7, XP = 50, MIN = { w: 3, g: 4, p: 3, c: 5 }, ICON = { w: '🔤', g: '📘', p: '🎧', c: '📞' }, RING = 2 * Math.PI * 42;
  const wkKey = () => 'lk.' + TL + '.wk';
  const claimed = () => { try { return JSON.parse(ls(wkKey()) || '{}') || {}; } catch (e) { return {}; } };
  const stOf = (k, d, cur) => full(k, d) ? 'done' : k === cur ? 'today' : doneOf(k, d).length ? 'part' : 'lock'; // lock = "chưa tới": mờ + ổ khóa nhưng vẫn bấm được (ai muốn học vượt vẫn vào)
  const minOf = d => steps(d).split('').reduce((n, k) => n + MIN[k], 0);
  function dayRow(k, d, cur) {
    const s = stOf(k, d, cur), part = doneOf(k, d).length + '/' + steps(d).length;
    const st = s === 'done' ? '↺ ' + u('rv') : s === 'today' ? '▶ ' + u('td') : s === 'part' ? part : '🔒 ' + u('lk');
    return `<a class="tp-d ${s}" href="${home()}?d=${k + 1}"${s === 'today' ? ' aria-current="step"' : ''} aria-label="${esc(fmt(u('dy'), { n: k + 1 }) + ' · ' + gxOf(d[2]) + ' · ' + (s === 'done' ? u('ok') : st))}">
      <span class="tp-n" aria-hidden="true">${s === 'done' ? '✓' : k + 1}</span><span class="tp-tx"><b dir="auto">${esc(gxOf(d[2]))}</b><small>${esc(d[3])} · ${esc(fmt(u('mn'), { n: minOf(d) }))}</small></span><span class="tp-st" aria-hidden="true">${esc(st)}</span></a>`;
  }
  function weekBody(wi, D, cur) {
    const a = wi * WK_N, days = D.slice(a, a + WK_N), all = days.every((d, j) => full(a + j, d)), got = claimed()[wi];
    return days.map((d, j) => dayRow(a + j, d, cur)).join('') + `<div class="tp-rw"><span class="tp-em" aria-hidden="true">🏅</span><b>${esc(fmt(u('rw'), { n: wi + 1 }))} · <bdi>+${XP} XP</bdi></b>${all ? `<button type="button" class="tp-btn ${got ? '' : 'p'}" data-claim="${wi}"${got ? ' disabled' : ''}>${esc(got ? u('cd') : fmt(u('cl'), { n: XP }))}</button>` : ''}</div>`;
  }
  function weekHtml(wi, D, cur) {
    const a = wi * WK_N, days = D.slice(a, a + WK_N), dn = days.filter((d, j) => full(a + j, d)).length, open = cur >= a && cur < a + WK_N, lv = [...new Set([days[0][3], days.at(-1)[3]])].join('→');
    return `<details class="tp-w${dn === days.length ? ' done' : ''}" data-w="${wi}"${open ? ' open' : ''}><summary><span class="tp-wn">${esc(fmt(u('wk'), { n: wi + 1 }))}</span><span class="tp-wl">${esc(lv)}</span><span class="tp-wc">${esc(fmt(u('wt'), { a: dn, b: days.length }))}</span><i class="tp-ch" aria-hidden="true"></i></summary><div class="tp-days">${open ? weekBody(wi, D, cur) : ''}</div></details>`;
  }
  // Từ sau ngày cuối (kho > ngày × 8): thêm 8 từ/lần theo thứ hạng vào Ôn tập – mọi từ đã duyệt đều tới SRS
  let MORE = null; // { added, next } – tính lúc vào hub (đọc Sổ từ)
  const moreHtml = D => { const end = D.at(-1)[1], tot = X().wd.length; if (tot <= end) return '';
    const a = MORE ? MORE.added : 0, left = tot - end - a;
    return `<section class="tp-card tp-more" id="tpMore"><h3>${esc(u('xw'))}</h3><p>${esc(fmt(u('xd'), { a, t: tot - end }))}</p>${left > 0 ? `<button type="button" class="tp-btn" id="tpMoreGo">${esc(fmt(u('xa'), { n: Math.min(8, left) }))}</button>` : ''}</section>`; };
  // Ôn tập (ôn → kiểm tra theo chặng): số từ của ngôn ngữ này đến hạn ôn hôm nay (cùng định nghĩa Core.Cards.dueList với màn Ôn tập) + nút vào Ôn tập
  async function reviewInit(root) {
    const C = window.Core, box = root.querySelector('#tpRev'); if (!C || !C.Cards || !box) return;
    const n = C.Cards.dueList(await C.Cards.all()).filter(c => c.tl === TL).length;
    box.innerHTML = `<h3>${esc(u('rv'))}</h3><p>${esc(n ? fmt(u('rvn'), { n }) : u('rv0'))}</p>${n ? `<a class="tp-btn p" href="#/review">${esc(u('rvg'))}</a>` : ''}`; box.hidden = false;
  }
  async function moreInit(D, root) {
    const end = D.at(-1)[1], tot = X().wd.length, C = window.Core; if (tot <= end || !C || !C.Cards) return;
    const m = await C.Cards.all(); let k = end; while (k < tot && m[C.tlKey(X().wd[k][0], TL)]) k++;
    MORE = { added: k - end, next: k };
    const sec = root.querySelector('#tpMore'); if (sec) sec.outerHTML = moreHtml(D);
    const b = root.querySelector('#tpMoreGo'); if (b) b.onclick = async () => { b.disabled = true; let n = 0; try { n = await toDeck(MORE.next, Math.min(tot, MORE.next + 8)); } catch (e) { /* bỏ */ } await moreInit(D, root); if (n && UI.toast) UI.toast(fmt(u('sv'), { n })); };
  }
  // ---- Chặng CEFR (khung chung với lộ trình tiếng Anh: tên · mục tiêu "làm được gì" · tiến độ · học từ cấp này) ----
  const LV = ['A1', 'A2', 'B1', 'B2'], lname = () => (window.Target && Target.table(TL).name) || TL;
  const stages = D => LV.map((lv, i) => { const ix = D.map((d, n) => (d[3] === lv ? n : -1)).filter(n => n >= 0); return { lv, i: i + 1, from: ix[0], n: ix.length, done: ix.filter(n => full(n, D[n])).length }; });
  // kết quả kiểm tra cấp = điểm cao nhất đã lưu ở đề thi (exam-ui: lk.<tl>.x[cấp][đề][phần] = %); ≥ 70 = đạt
  const PASS = 70, bestOf = lv => { let m = -1; try { const x = (JSON.parse(ls('lk.' + TL + '.x') || '{}') || {})[lv] || {}; for (const e of Object.values(x)) for (const v of Object.values(e || {})) if (+v > m) m = +v; } catch (e) { /* bỏ */ } return m; };
  function stagesHtml(D, cur) {
    const L = lname(), rows = stages(D).map(s => {
      const on = s.n && D[cur][3] === s.lv, title = u('sg' + s.i);
      return `<li class="tp-sg${on ? ' on' : ''}${s.n ? '' : ' soon'}"${on ? ' aria-current="step"' : ''}><span class="tp-sgh"><b dir="auto">${esc(title)}</b><small>${esc(s.n ? fmt(u('sd'), { a: s.done, b: s.n }) : u('sn'))}</small></span>
        <span class="tp-sgc" dir="auto">${esc(fmt(u('sc' + s.i), { L }))}</span>${s.n ? `<span class="tp-bar" aria-hidden="true"><i style="width:${Math.round(s.done / s.n * 100)}%"></i></span>${on || s.done === s.n ? '' : `<button type="button" class="tp-btn" data-start="${s.from}">${esc(u('sgo'))}</button>`}<a class="tp-btn${s.done === s.n ? ' p' : ''}" href="${route('tests')}?lv=${s.lv}">${esc(u('stt'))} ${s.lv}</a>${bestOf(s.lv) >= 0 ? `<span class="tp-sgt${bestOf(s.lv) >= PASS ? ' ok' : ''}">${esc(bestOf(s.lv) >= PASS ? u('stk') : fmt(u('stp'), { n: bestOf(s.lv) }))}</span>` : ''}` : ''}</li>`; }).join('');
    return `<section class="tp-card tp-stg" aria-labelledby="tpSg"><h3 id="tpSg">${esc(u('sh'))}</h3><ol>${rows}</ol></section>`;
  }
  // lần đầu (chưa có tiến độ, chưa chọn): hỏi trình độ → điểm bắt đầu (không đánh dấu xong ngày nào)
  function askHtml(D) {
    if (ls(startKey()) !== null && ls(startKey()) !== undefined || Object.keys(prog()).length) return '';
    const sg = stages(D);
    return `<section class="tp-card tp-ask" id="tpAsk" aria-labelledby="tpAq"><h3 id="tpAq">${esc(fmt(u('ob'), { L: lname() }))}</h3><div class="tp-ask-b">${[['o1', 0], ['o2', (sg[1] || {}).from], ['o3', (sg[2] || {}).from]].map(([k, at]) => `<button type="button" class="tp-btn" data-start="${at || 0}">${esc(u(k))}</button>`).join('')}</div></section>`;
  }
  function hub(D) {
    const cur = firstOpen(), d = D[cur], done = D.filter((x, n) => full(n, x)).length, pct = Math.round(done / D.length * 100), all = done === D.length, sk = App.streak ? App.streak() : 0;
    const call = d[6] && (window.CALLS || []).find(c => c.id === d[6]);
    const row = (s, label, det) => { const ok = doneOf(cur, d).includes(s); return `<li${ok ? ' class="ok"' : ''}><span class="tp-ic" aria-hidden="true">${ok ? '✓' : ICON[s]}</span><span class="tp-t" dir="auto">${esc(label)}</span><em>${esc(det)}</em></li>`; };
    const list = steps(d).split('').map(s => s === 'w' ? row('w', fmt(u('nw'), { n: d[1] - d[0] }), fmt(u('mn'), { n: MIN.w })) : s === 'g' ? row('g', u('g') + ' · ' + gxOf(d[2]), fmt(u('mn'), { n: MIN.g })) : s === 'p' ? row('p', u('p') + ' · ' + pxOf(d[4]), fmt(u('mn'), { n: MIN.p })) : row('c', u('c') + (call ? ' · ' + call.title : ''), fmt(u('mn'), { n: MIN.c }))).join('');
    view.innerHTML = `<div class="tp">${window.Target ? Target.chip(TL) : ''}
      <section class="tp-card tp-hero"><div class="tp-ring" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(fmt(u('pr'), { d: cur + 1, t: D.length, p: doneOf(cur, d).length }))}"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="bg" cx="50" cy="50" r="42"/><circle class="fg" cx="50" cy="50" r="42" stroke-dasharray="${RING.toFixed(1)}" stroke-dashoffset="${(RING * (1 - done / D.length)).toFixed(1)}"/></svg><b>${all ? '✓' : cur + 1}<small dir="ltr">/ ${D.length}</small></b></div>
        <div><h1>${esc(u('ti'))}</h1><div class="tp-meta"><span class="tp-pill">${esc(d[3])}</span><span class="tp-pill">${esc(fmt(u('mn'), { n: minOf(d) }))}</span>${sk ? `<span class="tp-pill warm">🔥 ${esc(fmt(u('sk'), { n: sk }))}</span>` : ''}</div><p class="tp-sub">${esc(u('sub'))}</p></div></section>
      <section class="tp-card tp-today" aria-labelledby="tpTd"><div class="tp-k"><span id="tpTd">${esc(u('td'))} · ${esc(fmt(u('dy'), { n: cur + 1 }))}</span><span>${esc(fmt(u('wt'), { a: doneOf(cur, d).length, b: steps(d).length }).replace(/ .*$/, ''))}</span></div>${goalOf(cur) ? `<p class="tp-goal" dir="auto">🎯 ${esc(goalOf(cur))}</p>` : ''}<ul>${list}</ul><a class="tp-go" href="${home()}?d=${cur + 1}">${esc(all ? u('fin') : u('go'))}</a></section>
      ${askHtml(D)}${stagesHtml(D, cur)}
      <section class="tp-card tp-rev" id="tpRev" hidden></section>
      <div class="tp-weeks">${Array.from({ length: Math.ceil(D.length / WK_N) }, (_, wi) => weekHtml(wi, D, cur)).join('')}</div>
      ${moreHtml(D)}</div>`;
    const root = view.querySelector('.tp');
    root.addEventListener('toggle', e => { const w = e.target; if (w.open && w.matches('details[data-w]')) { const box = w.querySelector('.tp-days'); if (box && !box.firstChild) box.innerHTML = weekBody(+w.dataset.w, D, cur); } }, true); // tuần sau vẽ lười: không dựng 125 hàng lúc vào
    root.addEventListener('click', e => { const sb = e.target.closest('[data-start]'); if (sb) { ls(startKey(), String(+sb.dataset.start || 0)); hub(D); return; } const b = e.target.closest('[data-claim]'); if (!b || b.disabled) return; const wi = +b.dataset.claim, c = claimed(); if (c[wi]) return;
      c[wi] = 1; ls(wkKey(), JSON.stringify(c)); try { App.reward({ xp: XP }); } catch (er) { /* không có kho XP */ } const box = b.closest('.tp-days'); if (box) box.innerHTML = weekBody(wi, D, cur); if (UI.toast) UI.toast('🏅 +' + XP + ' XP'); });
    reviewInit(root).catch(() => {});
    moreInit(D, root).catch(() => {});
  }

  function day(n, d) {
    const [a, b, gid, lv, tp, m, cid] = d, W = X().wd.slice(a, b), G = (X().wdl[lang()] || X().wdl.en).slice(a, b), have = prog()[n] || '', art = C().art, has = k => steps(d).includes(k);
    const call = cid && (window.CALLS || []).find(c => c.id === cid);
    const row = (s, title, body, href) => `<section class="card" id="ds-${s}"><div class="row between"><h3 style="margin:0">${have.includes(s) ? '✓ ' : ''}${esc(title)}</h3>${href ? `<a class="btn ${have.includes(s) ? '' : 'primary'}" href="${href}" data-s="${s}">${esc(u('go'))}</a>` : ''}</div>${body}</section>`;
    const words = W.map((w, k) => `<div class="row" style="align-items:flex-start;gap:.6rem;padding:.35rem 0"><button type="button" class="icon-btn sm" data-sp="${esc(w[0])}" aria-label="${esc(w[0])}">🔊</button>
      <div><b lang="${TL}">${art(w) ? `<span class="muted">${esc(art(w).trim())}</span>${/'$/.test(art(w)) ? '' : ' '}` : ''}${esc(w[0])}</b>${w[5] ? ` <span class="small muted" lang="${TL}">(${esc(w[5])})</span>` : ''} <span class="ipa">/${esc(w[2])}/</span> <span class="muted small">${esc(w[1])}</span><div dir="auto">${esc(G[k])}</div><div class="small muted" lang="${TL}">${esc(w[3])} <button type="button" class="icon-btn sm" data-sp="${esc(w[3])}" aria-label="${esc(w[3])}">🔊</button></div></div></div>`).join('');
    view.innerHTML = `${window.Target ? Target.chip(TL) : ''}<div class="page-head"><div><h1>${esc(fmt(u('dy'), { n: n + 1 }))}</h1><p class="muted"><span class="chip">${lv}</span> ${esc(fmt(u('pr'), { d: n + 1, t: DAYS.length, p: doneOf(n, d).length }))}</p>${goalOf(n) ? `<p dir="auto" class="tp-goal">🎯 ${esc(goalOf(n))}</p>` : ''}</div><a class="btn ghost" href="${home()}">${esc(u('ti'))}</a></div>
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
