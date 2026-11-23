/* 🇪🇸🇫🇷 Luyện định dạng DELE/SIELE (#/practice/esx, spanish-exam-w5.md) · DELF/DALF (#/practice/frx, french-course.md W5): MỘT engine, bảng TX theo tl: 6 cấp (A1–C2) × 2 đề × 4 phần: Đọc & dùng ngôn ngữ (điền từ), Nghe (chép), Viết, Nói.
 * Câu của người viết thật từ Tatoeba (CC BY 2.0 FR, ghi công từng câu); consigna + rubric tự viết. KHÔNG phải đề thi chính thức; điểm là ước lượng luyện tập.
 * Khung Stitch có sẵn dùng chung với js/espr.js qua App.esQ / esFoot / esEnd (không CSS mới). Dữ liệu tải lười: cpack/<tl>/x-<cấp>.js + x-ui-<ngôn ngữ>.js (scripts/target/exam-es-lib.mjs, bảng EXT). */
(function () {
  const { $, esc } = UI, App = window.App, view = App.view, LVS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], PARTS = ['rd', 'ls', 'wr', 'sp'], NEED = { A1: 2, A2: 3, B1: 4, B2: 5, C1: 6, C2: 7 };
  // Bảng theo ngôn ngữ đích (không nhánh `if (tl)`): xp = đường dẫn gói (khai ở app.js, nguyên văn cho build-cpack), XL = đợt 2 (app.js giữ A1–B1), G = biến toàn cục gói,
  // lang/acc = mã ngôn ngữ ô gõ/giọng, rub/dict = ký tự giữ khi chấm (fr giữ ' và -), note = nhắc thiếu dấu, score(d,p,pct) = ước lượng theo thang kỳ thi (null = không có), groups/pass = nhóm điểm + quy tắc đạt ĐÃ xác minh (null = không phán)
  const TX = {
    es: { key: 'lk.es.x', route: '#/practice/esx', G: 'ESX', lang: 'es', acc: 'es-419', xp: () => App.esX, XL: { B2: 'cpack/es/x-B2.js', C1: 'cpack/es/x-C1.js', C2: 'cpack/es/x-C2.js' }, rub: /[^a-z ]+/g, dict: /[^a-zñ ]+/g,
      note: a => t('Cẩn thận dấu (tilde): {a}', { a }), name: () => t('Luyện định dạng DELE/SIELE'),
      score: (d, p, pct) => { const m = { rd: 'read', ls: 'listen', wr: 'write', sp: 'speak' }[p], n = Math.round(pct * 2.5), bs = d.sb[m]; let b = '<A1'; for (const k of Object.keys(bs)) if (n >= bs[k]) b = k; return { n, b }; },
      groups: r => [(r.rd + r.wr) / 2, (r.ls + r.sp) / 2], pass: (d, g) => d.sp.groupMinPct == null ? null : g.every(x => x >= d.sp.groupMinPct) },
    fr: { key: 'lk.fr.x', route: '#/practice/frx', G: 'FRX', lang: 'fr', acc: 'fr-FR', xp: () => App.frX, XL: {}, rub: /[^a-z' -]+/g, dict: /[^a-z' -]+/g,
      note: a => t('Cẩn thận dấu (é, è, ç…): {a}', { a }), name: () => t('Luyện định dạng DELF/DALF'),
      score: (d, p, pct) => d.rl ? { n: Math.round(pct * d.rl.partMax / 100), b: '' } : null, // mỗi phần /25 (quy tắc chung DELF/DALF), ước lượng từ %
      groups: r => PARTS.map(p => r[p]), pass: (d, g) => { const r = d.rl; if (!r) return null; const n = g.map(x => x * r.partMax / 100); return n.reduce((a, b) => a + b, 0) >= r.passTotal && n.every(x => x >= r.partMin); } },
  };
  let C = TX.es, XP = null;
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* riêng tư */ } return null; };
  const X = () => (self[C.G] = self[C.G] || {});
  const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const rnd = a => a.map(v => [Math.random(), v]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
  const lang = () => { const l = window.I18N && I18N.learnLang ? I18N.learnLang() : 'en'; return XP.ui[l] ? l : 'en'; };
  const KEY = () => C.key, ACC = () => C.acc;
  const u = (k, v) => { const L = (X().xl || {}); let s = (L[lang()] || {})[k] || (L.en || {})[k] || ''; for (const x in v || {}) s = s.split('{' + x + '}').join(v[x]); return s; };
  const speak = (x, rate) => { try { UI.tts(x, ACC(), rate || 0.9); } catch (e) { /* không có giọng */ } };
  const stats = () => { try { return JSON.parse(ls(KEY()) || '{}') || {}; } catch (e) { return {}; } };
  const save = (lv, e, p, pct) => { const s = stats(); ((s[lv] = s[lv] || {})[e] = s[lv][e] || {})[p] = pct; ls(KEY(), JSON.stringify(s)); };
  const href = (lv, e, p) => `${C.route}?lv=${lv}&e=${e}&p=${p}`;
  const dat = lv => (X().x || {})[lv];
  let S = null;

  // Ước lượng theo thang kỳ thi (SIELE 0–250 tuyến tính theo % → cấp theo dải đã xác minh; DELF/DALF: /25 mỗi phần) – luôn ghi "ước lượng"; không có thang/số liệu → ''
  const scorePart = (d, p, pct) => { const r = C.score(d, p, pct); return r ? u('sr', r) : ''; };
  // Chỉ phán đạt/chưa khi quy tắc ĐÃ xác minh (C.pass trả null = không phán): DELE nhóm 1 = Đọc + Viết, nhóm 2 = Nghe + Nói; DELF/DALF: tổng ≥ 50/100 và mỗi phần ≥ 5/25
  function summary(lv, e, d) {
    const r = (stats()[lv] || {})[e] || {}; if (!PARTS.every(p => typeof r[p] === 'number')) return '';
    const g = C.groups(r), ps = C.pass(d, g), v = ps == null ? u('nov') : ps ? u('okg') : u('nog');
    return `<div class="small" dir="auto"><b>${esc(u('est'))}</b><br>${g.map((x, i) => `${esc(u('grp', { n: i + 1 }))}: ${Math.round(x)}%`).join(' · ')} — ${esc(v)}<br>${PARTS.map(p => { const z = scorePart(d, p, r[p]); return z ? `${esc(u(p))}: ${esc(z)}` : ''; }).filter(Boolean).join('<br>')}</div>`;
  }

  function hub() {
    const st = stats();
    view.innerHTML = `<div class="page-head"><div><h1>${esc(u('ti'))}</h1><p class="muted" dir="auto">${esc(u('sub'))}</p></div></div>` + AV().map(lv => {
      const d = dat(lv), sp = d.sp, au = [...new Set(d.e.flatMap(e => e.c.map(x => x[4]).concat(e.l.map(x => x[2]))))].join(', ');
      const fmt = [['rd', 'read'], ['wr', 'write'], ['ls', 'listen'], ['sp', 'speak']].map(([p, k]) => `${u(p)}${sp[k].min ? ' ' + u('mn', { n: sp[k].min }) : ''}${sp[k].tareas ? ' (' + u('tk', { n: sp[k].tareas }) + ')' : ''}`).join(' · ');
      return `<section class="card" id="x-${lv}"><div class="row between"><h3 style="margin:0">${lv}</h3><span class="chip">${esc(u('pr'))}</span></div><p class="small muted" dir="auto">${esc(fmt)}</p>` + d.e.map((ex, i) => {
        const r = (st[lv] || {})[i + 1] || {};
        return `<div style="margin-top:.6rem"><b>${esc(u('ex', { n: i + 1 }))}</b><div class="row">${PARTS.map(p => `<a class="btn ${typeof r[p] === 'number' ? '' : 'primary'}" href="${href(lv, i + 1, p)}">${esc(u(p))}${typeof r[p] === 'number' ? ` · ${r[p]}%` : ''}</a>`).join('')}</div>${summary(lv, i + 1, d)}</div>`;
      }).join('') + `<p class="small muted" dir="auto" style="margin-top:.6rem">${esc(u('cr', { a: au }))}</p></section>`;
    }).join('');
  }

  // Đọc (điền từ, 3 phương án) và Nghe (chép câu): khung bài học có sẵn
  function ask() {
    const it = S.items[S.i], cl = S.p === 'rd', pct = Math.round(S.i / S.items.length * 100);
    S.pick = null; S.checked = false;
    const d = { close: C.route, title: u('ti'), pct, combo: '', chip: S.lv + ' · ' + u('ex', { n: S.e }), play: t('Nghe lại'), who: '', teacher: '', slow: t('Nghe chậm'), opts: ['off', 'on', 'off', 'off'].map((v, i) => ({ v, o: '', k: 'ABCD'[i], t: '' })) };
    const body = App.esQ.frame(d), chk = $('#lsnCheck'); chk.disabled = true; chk.onclick = check;
    const sk = $('.lsn-skipb'); if (sk) sk.hidden = true;
    if (cl) {
      const [a, b] = it[0].split('___'); $('#lsnBub').innerHTML = ST.lsnTag(u('rd'), false) + ST.lsnSent(`<span lang="${C.lang}">${esc(a)}</span>` + ST.GAP + `<span lang="${C.lang}">${esc(b)}</span>`) + ST.lsnSub(u('qrd'), lang());
      $('#lsnPlay').hidden = true; const sl = $('#lsnSlow'); if (sl) sl.hidden = true;
      S.list = rnd(it[2]); const paint = () => App.esQ.opts(S.list, S.pick, o => { S.pick = o; chk.disabled = false; paint(); const g = $('#lsnGap'); if (g) g.textContent = o; }, () => S.checked); paint();
    } else {
      $('#lsnBub').innerHTML = ST.lsnTag(u('ls'), false) + ST.lsnSent('🔊') + ST.lsnSub(u('qls'), lang());
      const play = $('#lsnPlay'), slow = $('#lsnSlow'); play.hidden = false; play.onclick = () => speak(it[0]); if (slow) { slow.hidden = false; slow.onclick = () => speak(it[0], 0.55); }
      body.className = 'flex flex-col gap-3 mb-[1rem]'; body.innerHTML = ST.lsnIn(u('qls'));
      const inp = $('#lsnIn'); inp.lang = C.lang; inp.oninput = () => { chk.disabled = !inp.value.trim(); }; inp.onkeydown = e => { if (e.key === 'Enter' && inp.value.trim()) check(); }; setTimeout(() => { inp.focus(); speak(it[0]); }, 80);
    }
    $('#lsnRep').onclick = () => window.open('#/report/new', '_blank');
  }

  function check() {
    if (S.checked) return; const it = S.items[S.i], cl = S.p === 'rd', ans = cl ? it[1] : it[0], given = cl ? S.pick : ($('#lsnIn') || {}).value || '';
    let ok, note = '';
    if (cl) ok = given === ans;
    else { ok = QE.gradeGap({ a: [ans] }, 0, given).ok; if (!ok && fold(given).replace(C.dict, ' ').replace(/\s+/g, ' ').trim() === fold(ans).replace(C.dict, ' ').replace(/\s+/g, ' ').trim()) { ok = true; note = C.note(ans); } }
    S.checked = true; if (ok) S.ok++; S.run = ok ? S.run + 1 : 0; S.best = Math.max(S.best, S.run);
    document.querySelectorAll('#lsnBody button, #lsnIn').forEach(x => { x.disabled = true; });
    try { if (window.Sfx) (ok ? Sfx.correct : Sfx.wrong)(); } catch (e) { /* bỏ qua */ }
    const src = `<span class="text-[13px]">Tatoeba #${it[cl ? 3 : 1]} · ${esc(it[cl ? 4 : 2])}</span>`, full = cl ? it[0].replace('___', ans) : ans;
    const dd = { head: ok ? t('Tuyệt!') : t('Chưa đúng'), xp: '', answer: ok ? '' : ans, tlabel: '', word: '', ipa: '', mean: '', a1: '', a2: '', acc1: '', acc2: '', url1: '', url2: '', ar1: '', ar2: '', say: '',
      qkind: cl ? u('rd') : u('ls'), qpre: cl ? it[0].split('___')[0] : '', qpick: cl ? (ok ? ans : String(given)) : full, qpost: cl ? it[0].split('___')[1] : '', extra: (note ? `<span class="text-[13px]">${esc(note)}</span>` : '') + src, boxes: '' };
    App.esFoot(ok, dd, '', next);
    $('#lsnBody').querySelectorAll('.lsn-opt').forEach(b => { b.classList.toggle('opacity-60', b.dataset.o !== ans && b.dataset.o !== String(given)); });
    setTimeout(() => speak(full), 150);
  }

  function next() {
    const f = $('#lsnFoot'); if (f) f.remove();
    if (++S.i < S.items.length) return ask();
    const pct = Math.round(S.ok / S.items.length * 100); save(S.lv, S.e, S.p, pct);
    App.esEnd({ n: S.items.length, ok: S.ok, first: S.ok, best: S.best, chip: S.lv + ' · ' + u('ex', { n: S.e }), title: u('ti'), rev: u('ti'), revHref: C.route, again: () => App.esexam(S.lv, S.e, S.p) });
  }

  // Viết / Nói: rubric trên máy (đếm từ, từ nối, ý khóa); không gửi gì đi. Nói: nhận dạng giọng (Web Speech / Whisper trên máy) điền vào ô văn bản, sửa được.
  function rubric(text, task, con, lv) {
    const f = ' ' + fold(text).replace(/’/g, "'").replace(C.rub, ' ').replace(/\s+/g, ' ').trim() + ' ', words = f.trim() ? f.trim().split(' ').length : 0;
    const cn = con.filter(c => f.includes(' ' + c + ' ')).length, hit = task.g.filter(g => new RegExp(g).test(f)).length;
    const a = Math.min(1, words / task.min), b = Math.min(1, cn / NEED[lv]), c = hit / task.g.length;
    return { words, cn, hit, pct: Math.round(40 * a + 25 * b + 35 * c), a, b, c };
  }
  function freeform() {
    const d = dat(S.lv), ex = d.e[S.e - 1], task = S.p === 'wr' ? ex.w : ex.s, sp = S.p === 'sp', done = { v: false };
    view.innerHTML = `<div class="page-head"><div><h1>${esc(u('ti'))}</h1><p class="muted">${S.lv} · ${esc(u('ex', { n: S.e }))} · ${esc(u(S.p))}</p></div><a class="btn" href="${C.route}" aria-label="close">✕</a></div>
      <section class="card"><p lang="${C.lang}" style="font-size:1.1rem;margin:0 0 .4rem">${esc(task.t)}</p><p class="small muted" dir="auto">${esc(u(sp ? 'ns' : 'wl', { n: task.min }))}</p>
      <textarea id="exTxt" class="input" rows="${sp ? 5 : 9}" lang="${C.lang}" style="width:100%" spellcheck="false"></textarea>
      <div class="row between" style="margin-top:.5rem"><span class="small muted" id="exWc"></span><span class="row">${sp ? `<button type="button" class="btn" id="exMic">🎤 ${esc(u('mic'))}</button>` : ''}<button type="button" class="btn primary" id="exChk">${esc(u('chk'))}</button></span></div>
      <p class="small" id="exHeard" dir="auto"></p><div id="exRes"></div></section>`;
    const tx = $('#exTxt'), wc = () => { $('#exWc').textContent = u('wc', { n: rubric(tx.value, task, d.con, S.lv).words }); }; wc(); tx.oninput = wc; if (!sp) setTimeout(() => tx.focus(), 50);
    if (sp) $('#exMic').onclick = () => {
      const mic = $('#exMic'); mic.disabled = true; let fin = false;
      S.rec = UI.recognize('', ACC(), { result: ({ heard }) => { fin = true; mic.disabled = false; if (heard) { tx.value = (tx.value + ' ' + heard).trim(); wc(); $('#exHeard').textContent = u('hd', { h: heard }); } },
        error: code => { fin = true; mic.disabled = false; $('#exHeard').textContent = code === 'unsupported' ? u('nm') : UI.recErrorText(code); }, end: () => { S.rec = null; mic.disabled = false; if (!fin) $('#exHeard').textContent = ''; } });
      if (!S.rec) mic.disabled = false;
    };
    $('#exChk').onclick = () => {
      const r = rubric(tx.value, task, d.con, S.lv), ic = ok => ok ? '✓' : '✗'; save(S.lv, S.e, S.p, r.pct);
      $('#exRes').innerHTML = `<h3>${esc(u('sc', { n: r.pct }))}</h3><p class="small muted">${esc(u('est'))}</p><div class="small"><b>${esc(u('crit'))}</b><ul>
        <li>${ic(r.a >= 1)} ${esc(u('c1'))}: ${r.words}/${task.min}</li><li>${ic(r.b >= 1)} ${esc(u('c2', { n: r.cn }))}</li><li>${ic(r.c >= 1)} ${esc(u('c3', { n: r.hit, m: task.g.length }))}</li></ul></div>
        <p class="small">${esc(scorePart(d, S.p, r.pct))}</p><a class="btn primary" href="${C.route}">${esc(u('ti'))}</a>`;
      try { App.reward({ quizzes: 1, xp: Game.xpFor('essay') }); } catch (e) { /* bỏ qua */ }
    };
  }

  const AV = () => LVS.filter(l => XP.lv[l] || C.XL[l]); // cấp đã có gói đề (fr: chỉ sau khi CI dựng nguồn Tatoeba và thêm dòng vào App.frX)
  App.esexam = async function (lv, e, p, tl) { // #/practice/esx|frx[?lv=A1&e=1&p=rd|ls|wr|sp] (study.js MODES.esx / MODES.frx); không có lv → danh sách đề
    C = TX[tl] || TX.es; XP = C.xp(); const tok = App.routeToken(), av = AV();
    view.innerHTML = `<div class="card" role="status">${esc(t('Đang tải…'))}</div>`;
    const bad = () => { view.innerHTML = `<div class="card">${esc(t('Không tải được bài. Kiểm tra mạng rồi thử lại.'))}</div>`; };
    if (!av.length) { try { await App.need('espr'); } catch (er) { /* dùng khóa gốc */ } if (App.routeStale(tok)) return; view.innerHTML = `<div class="page-head"><div><h1>${esc(C.name())}</h1><p class="muted" dir="auto">${esc(t('Chưa có bài cho mục này.'))}</p></div></div>`; return; } // chưa có đề nào (fr trước khi dựng nguồn)
    const want = av.includes(lv) ? [lv] : av;
    try { await Promise.all([App.need('espr'), ...want.map(l => App.loadScript(XP.lv[l] || C.XL[l])), App.loadScript(XP.ui[lang()]), lang() === 'en' ? 0 : App.loadScript(XP.ui.en)]); } catch (er) { if (!App.routeStale(tok)) bad(); return; }
    if (App.routeStale(tok)) return;
    if (!(X().xl && X().xl[lang()] && want.every(dat))) return bad();
    if (!av.includes(lv) || !PARTS.includes(p) || !(+e >= 1 && +e <= dat(lv).e.length)) return hub();
    S = { lv, e: +e, p, i: 0, ok: 0, best: 0, run: 0 };
    if (p === 'wr' || p === 'sp') return freeform();
    if (!(window.ST2 && ST2['lesson-question'] && ST2['feedback-correct'] && ST2['feedback-wrong'] && ST2['lesson-complete'] && window.QE && App.esQ)) return bad();
    const ex = dat(lv).e[S.e - 1]; S.items = p === 'rd' ? ex.c : ex.l; ask();
  };
})();
