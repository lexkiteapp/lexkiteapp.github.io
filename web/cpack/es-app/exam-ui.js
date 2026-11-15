/* 🇪🇸 Luyện định dạng DELE/SIELE (#/practice/esx, spanish-exam-w5.md): 6 cấp (A1–C2) × 2 đề × 4 phần: Đọc & dùng ngôn ngữ (điền từ), Nghe (chép), Viết, Nói.
 * Câu của người viết thật từ Tatoeba (CC BY 2.0 FR, ghi công từng câu); consigna + rubric tự viết. KHÔNG phải đề thi chính thức; điểm là ước lượng luyện tập.
 * Khung Stitch có sẵn dùng chung với js/espr.js qua App.esQ / esFoot / esEnd (không CSS mới). Dữ liệu tải lười: cpack/es/x-<cấp>.js + x-ui-<ngôn ngữ>.js (scripts/target/exam-es-lib.mjs). */
(function () {
  const { $, esc } = UI, App = window.App, view = App.view, KEY = 'lk.es.x', LVS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], PARTS = ['rd', 'ls', 'wr', 'sp'], ACC = 'es-419', XP = App.esX, NEED = { A1: 2, A2: 3, B1: 4, B2: 5, C1: 6, C2: 7 };
  const XL = { B2: 'cpack/es/x-B2.js', C1: 'cpack/es/x-C1.js', C2: 'cpack/es/x-C2.js' }; // B2–C2 (đợt 2): app.js giữ A1–B1, đường dẫn đợt 2 ở đây để không tăng bundle tải đầu
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* riêng tư */ } return null; };
  const X = () => (self.ESX = self.ESX || {});
  const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const rnd = a => a.map(v => [Math.random(), v]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
  const lang = () => { const l = window.I18N && I18N.learnLang ? I18N.learnLang() : 'en'; return XP.ui[l] ? l : 'en'; };
  const u = (k, v) => { const L = (X().xl || {}); let s = (L[lang()] || {})[k] || (L.en || {})[k] || ''; for (const x in v || {}) s = s.split('{' + x + '}').join(v[x]); return s; };
  const speak = (x, rate) => { try { UI.tts(x, ACC, rate || 0.9); } catch (e) { /* không có giọng */ } };
  const stats = () => { try { return JSON.parse(ls(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const save = (lv, e, p, pct) => { const s = stats(); ((s[lv] = s[lv] || {})[e] = s[lv][e] || {})[p] = pct; ls(KEY, JSON.stringify(s)); };
  const href = (lv, e, p) => `#/practice/esx?lv=${lv}&e=${e}&p=${p}`;
  const dat = lv => (X().x || {})[lv];
  let S = null;

  // Ước lượng thang SIELE 0–250 (tuyến tính theo %, ghi rõ "ước lượng") → cấp theo dải đã xác minh trên siele.org; dưới A1 → '<A1'
  const sielePart = (d, p, pct) => { const m = { rd: 'read', ls: 'listen', wr: 'write', sp: 'speak' }[p], n = Math.round(pct * 2.5), bs = d.sb[m]; let b = '<A1'; for (const k of Object.keys(bs)) if (n >= bs[k]) b = k; return u('sr', { n, b }); };
  // DELE: chỉ phán đạt/chưa khi ngưỡng ĐÃ xác minh (groupMinPct); nhóm 1 = Đọc + Viết, nhóm 2 = Nghe + Nói
  function summary(lv, e, d) {
    const r = (stats()[lv] || {})[e] || {}; if (!PARTS.every(p => typeof r[p] === 'number')) return '';
    const g = [(r.rd + r.wr) / 2, (r.ls + r.sp) / 2], m = d.sp.groupMinPct;
    const v = m == null ? u('nov') : g.every(x => x >= m) ? u('okg') : u('nog');
    return `<div class="small" dir="auto"><b>${esc(u('est'))}</b><br>${g.map((x, i) => `${esc(u('grp', { n: i + 1 }))}: ${Math.round(x)}%`).join(' · ')} — ${esc(v)}<br>${PARTS.map(p => `${esc(u(p))}: ${esc(sielePart(d, p, r[p]))}`).join('<br>')}</div>`;
  }

  function hub() {
    const st = stats();
    view.innerHTML = `<div class="page-head"><div><h1>${esc(u('ti'))}</h1><p class="muted" dir="auto">${esc(u('sub'))}</p></div></div>` + LVS.map(lv => {
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
    const d = { close: '#/practice/esx', title: u('ti'), pct, combo: '', chip: S.lv + ' · ' + u('ex', { n: S.e }), play: t('Nghe lại'), who: '', teacher: '', slow: t('Nghe chậm'), opts: ['off', 'on', 'off', 'off'].map((v, i) => ({ v, o: '', k: 'ABCD'[i], t: '' })) };
    const body = App.esQ.frame(d), chk = $('#lsnCheck'); chk.disabled = true; chk.onclick = check;
    const sk = $('.lsn-skipb'); if (sk) sk.hidden = true;
    if (cl) {
      const [a, b] = it[0].split('___'); $('#lsnBub').innerHTML = ST.lsnTag(u('rd'), false) + ST.lsnSent(`<span lang="es">${esc(a)}</span>` + ST.GAP + `<span lang="es">${esc(b)}</span>`) + ST.lsnSub(u('qrd'), lang());
      $('#lsnPlay').hidden = true; const sl = $('#lsnSlow'); if (sl) sl.hidden = true;
      S.list = rnd(it[2]); const paint = () => App.esQ.opts(S.list, S.pick, o => { S.pick = o; chk.disabled = false; paint(); const g = $('#lsnGap'); if (g) g.textContent = o; }, () => S.checked); paint();
    } else {
      $('#lsnBub').innerHTML = ST.lsnTag(u('ls'), false) + ST.lsnSent('🔊') + ST.lsnSub(u('qls'), lang());
      const play = $('#lsnPlay'), slow = $('#lsnSlow'); play.hidden = false; play.onclick = () => speak(it[0]); if (slow) { slow.hidden = false; slow.onclick = () => speak(it[0], 0.55); }
      body.className = 'flex flex-col gap-3 mb-[1rem]'; body.innerHTML = ST.lsnIn(u('qls'));
      const inp = $('#lsnIn'); inp.lang = 'es'; inp.oninput = () => { chk.disabled = !inp.value.trim(); }; inp.onkeydown = e => { if (e.key === 'Enter' && inp.value.trim()) check(); }; setTimeout(() => { inp.focus(); speak(it[0]); }, 80);
    }
    $('#lsnRep').onclick = () => window.open('#/report/new', '_blank');
  }

  function check() {
    if (S.checked) return; const it = S.items[S.i], cl = S.p === 'rd', ans = cl ? it[1] : it[0], given = cl ? S.pick : ($('#lsnIn') || {}).value || '';
    let ok, note = '';
    if (cl) ok = given === ans;
    else { ok = QE.gradeGap({ a: [ans] }, 0, given).ok; if (!ok && fold(given).replace(/[^a-zñ ]+/g, ' ').replace(/\s+/g, ' ').trim() === fold(ans).replace(/[^a-zñ ]+/g, ' ').replace(/\s+/g, ' ').trim()) { ok = true; note = t('Cẩn thận dấu (tilde): {a}', { a: ans }); } }
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
    App.esEnd({ n: S.items.length, ok: S.ok, first: S.ok, best: S.best, chip: S.lv + ' · ' + u('ex', { n: S.e }), title: u('ti'), rev: u('ti'), revHref: '#/practice/esx', again: () => App.esexam(S.lv, S.e, S.p) });
  }

  // Viết / Nói: rubric trên máy (đếm từ, từ nối, ý khóa); không gửi gì đi. Nói: nhận dạng giọng (Web Speech / Whisper trên máy) điền vào ô văn bản, sửa được.
  function rubric(text, task, con, lv) {
    const f = ' ' + fold(text).replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ', words = f.trim() ? f.trim().split(' ').length : 0;
    const cn = con.filter(c => f.includes(' ' + c + ' ')).length, hit = task.g.filter(g => new RegExp(g).test(f)).length;
    const a = Math.min(1, words / task.min), b = Math.min(1, cn / NEED[lv]), c = hit / task.g.length;
    return { words, cn, hit, pct: Math.round(40 * a + 25 * b + 35 * c), a, b, c };
  }
  function freeform() {
    const d = dat(S.lv), ex = d.e[S.e - 1], task = S.p === 'wr' ? ex.w : ex.s, sp = S.p === 'sp', done = { v: false };
    view.innerHTML = `<div class="page-head"><div><h1>${esc(u('ti'))}</h1><p class="muted">${S.lv} · ${esc(u('ex', { n: S.e }))} · ${esc(u(S.p))}</p></div><a class="btn" href="#/practice/esx" aria-label="close">✕</a></div>
      <section class="card"><p lang="es" style="font-size:1.1rem;margin:0 0 .4rem">${esc(task.t)}</p><p class="small muted" dir="auto">${esc(u(sp ? 'ns' : 'wl', { n: task.min }))}</p>
      <textarea id="exTxt" class="input" rows="${sp ? 5 : 9}" lang="es" style="width:100%" spellcheck="false"></textarea>
      <div class="row between" style="margin-top:.5rem"><span class="small muted" id="exWc"></span><span class="row">${sp ? `<button type="button" class="btn" id="exMic">🎤 ${esc(u('mic'))}</button>` : ''}<button type="button" class="btn primary" id="exChk">${esc(u('chk'))}</button></span></div>
      <p class="small" id="exHeard" dir="auto"></p><div id="exRes"></div></section>`;
    const tx = $('#exTxt'), wc = () => { $('#exWc').textContent = u('wc', { n: rubric(tx.value, task, d.con, S.lv).words }); }; wc(); tx.oninput = wc; if (!sp) setTimeout(() => tx.focus(), 50);
    if (sp) $('#exMic').onclick = () => {
      const mic = $('#exMic'); mic.disabled = true; let fin = false;
      S.rec = UI.recognize('', ACC, { result: ({ heard }) => { fin = true; mic.disabled = false; if (heard) { tx.value = (tx.value + ' ' + heard).trim(); wc(); $('#exHeard').textContent = u('hd', { h: heard }); } },
        error: code => { fin = true; mic.disabled = false; $('#exHeard').textContent = code === 'unsupported' ? u('nm') : UI.recErrorText(code); }, end: () => { S.rec = null; mic.disabled = false; if (!fin) $('#exHeard').textContent = ''; } });
      if (!S.rec) mic.disabled = false;
    };
    $('#exChk').onclick = () => {
      const r = rubric(tx.value, task, d.con, S.lv), ic = ok => ok ? '✓' : '✗'; save(S.lv, S.e, S.p, r.pct);
      $('#exRes').innerHTML = `<h3>${esc(u('sc', { n: r.pct }))}</h3><p class="small muted">${esc(u('est'))}</p><div class="small"><b>${esc(u('crit'))}</b><ul>
        <li>${ic(r.a >= 1)} ${esc(u('c1'))}: ${r.words}/${task.min}</li><li>${ic(r.b >= 1)} ${esc(u('c2', { n: r.cn }))}</li><li>${ic(r.c >= 1)} ${esc(u('c3', { n: r.hit, m: task.g.length }))}</li></ul></div>
        <p class="small">${esc(sielePart(d, S.p, r.pct))}</p><a class="btn primary" href="#/practice/esx">${esc(u('ti'))}</a>`;
      try { App.reward({ quizzes: 1, xp: 10 + Math.round(r.pct / 10) }); } catch (e) { /* bỏ qua */ }
    };
  }

  App.esexam = async function (lv, e, p) { // #/practice/esx[?lv=A1&e=1&p=rd|ls|wr|sp] (study.js MODES.esx); không có lv → danh sách đề
    const tok = App.routeToken();
    view.innerHTML = `<div class="card" role="status">${esc(t('Đang tải…'))}</div>`;
    const bad = () => { view.innerHTML = `<div class="card">${esc(t('Không tải được bài. Kiểm tra mạng rồi thử lại.'))}</div>`; };
    const want = LVS.includes(lv) ? [lv] : LVS;
    try { await Promise.all([App.need('espr'), ...want.map(l => App.loadScript(XP.lv[l] || XL[l])), App.loadScript(XP.ui[lang()]), lang() === 'en' ? 0 : App.loadScript(XP.ui.en)]); } catch (er) { if (!App.routeStale(tok)) bad(); return; }
    if (App.routeStale(tok)) return;
    if (!(X().xl && X().xl[lang()] && want.every(dat))) return bad();
    if (!LVS.includes(lv) || !PARTS.includes(p) || !(+e >= 1 && +e <= dat(lv).e.length)) return hub();
    S = { lv, e: +e, p, i: 0, ok: 0, best: 0, run: 0 };
    if (p === 'wr' || p === 'sp') return freeform();
    if (!(window.ST2 && ST2['lesson-question'] && ST2['feedback-correct'] && ST2['feedback-wrong'] && ST2['lesson-complete'] && window.QE && App.esQ)) return bad();
    const ex = dat(lv).e[S.e - 1]; S.items = p === 'rd' ? ex.c : ex.l; ask();
  };
})();
