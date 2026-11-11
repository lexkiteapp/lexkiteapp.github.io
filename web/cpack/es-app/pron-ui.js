/* 🇪🇸 Phát âm tiếng Tây Ban Nha (#/practice/esp, spanish-course.md W3): 8 chủ đề âm (nguyên âm, r/rr, b/v, c-z-s, trọng âm/tilde, nối âm, j-g, ñ-ll-h-qu),
 * mỗi chủ đề có 3 bài: cặp tối thiểu (nghe → chọn từ), nghe chính tả (nghe → gõ), nói theo (micro; Web Speech es hoặc Whisper đa ngôn ngữ chạy trên máy, ui.js).
 * Khung Stitch CÓ SẴN của bài học – dùng chung với js/espr.js qua App.esQ / esFoot / esEnd, không CSS mới; danh sách chủ đề dùng lớp card/chip/btn có sẵn.
 * Dữ liệu tải lười: cpack/es/px.js (chủ đề, từ, cặp, IPA) + px-<ngôn ngữ>.js (giải thích + nhãn 15 ngôn ngữ). Dựng bởi scripts/target/px-lib.mjs. */
(function () {
  const { $, esc } = UI, App = window.App, view = App.view, N = 8, KEY = 'lk.es.px', ACC = 'es-419';
  const PX = App.esPx;
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* riêng tư */ } return null; };
  const noAcc = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-zñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const X = () => (self.ESX = self.ESX || {});
  const lang = () => { const l = window.I18N && I18N.learnLang ? I18N.learnLang() : 'en'; return PX[l] ? l : 'en'; };
  const L = () => (X().pxl || {})[lang()] || (X().pxl || {}).en || { ui: {}, tp: {} };
  const u = k => L().ui[k] || ((X().pxl || {}).en || { ui: {} }).ui[k] || '';
  const tpx = id => { const r = (L().tp || {})[id] || (((X().pxl || {}).en || {}).tp || {})[id] || ['', '']; return { t: r[0], x: r[1] }; };
  const speak = (x, rate) => { try { UI.tts(x, ACC, rate || 0.9); } catch (e) { /* không có giọng */ } };
  const stats = () => { try { return JSON.parse(ls(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const bump = (id, ok) => { const s = stats(), r = s[id] = s[id] || { ok: 0, n: 0 }; r.n++; if (ok) r.ok++; ls(KEY, JSON.stringify(s)); };
  const rnd = a => a.map(v => [Math.random(), v]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
  const href = (tp, m) => `#/practice/esp?tp=${tp}&m=${m}`;
  let S = null;

  // Danh sách chủ đề: giải thích (ngôn ngữ người học) + từ mẫu bấm nghe + 3 lối vào bài
  function hub() {
    const st = stats(), P = X().px;
    view.innerHTML = `<div class="page-head"><div><h1>${esc(u('ti'))}</h1><p class="muted">${esc(u('pk'))}</p></div></div>` + P.map(p => {
      const g = tpx(p.i), r = st[p.i], pct = r && r.n ? Math.round(r.ok / r.n * 100) : null;
      return `<section class="card" id="px-${p.i}"><div class="row between"><h3 style="margin:0" dir="auto">${esc(g.t)}</h3><span class="row"><span class="chip">${p.v}</span>${pct == null ? '' : `<span class="chip ${pct >= 80 ? 'ok' : ''}">${pct}%</span>`}</span></div>
        <p class="small" dir="auto">${esc(g.x)}</p>
        <div class="row"><span class="small muted">${esc(u('ex'))}</span>${p.e.map(([w, i]) => `<button type="button" class="btn sm" data-px="${esc(w)}" lang="es">🔊 ${esc(w)} <span class="ipa">/${esc(i)}/</span></button>`).join('')}</div>
        <div class="row" style="margin-top:.6rem">${p.p.length ? `<a class="btn" href="${href(p.i, 'pp')}">${esc(u('pp'))}</a>` : ''}<a class="btn" href="${href(p.i, 'dc')}">${esc(u('dc'))}</a><a class="btn primary" href="${href(p.i, 'sy')}">${esc(u('sy'))}</a></div></section>`;
    }).join('');
    view.querySelectorAll('[data-px]').forEach(b => { b.onclick = () => speak(b.dataset.px); });
  }

  // Dựng 8 câu của một bài: pp = cặp tối thiểu (nghe 1 từ → chọn), dc = nghe chính tả, sy = nói theo
  function pick(tp, m) {
    const P = X().px.filter(p => !tp || p.i === tp), out = [];
    if (m === 'pp') for (const p of P) for (const q of p.p) for (const s of [0, 1]) out.push({ k: 'pp', tp: p.i, a: q[s * 2], ia: q[s * 2 + 1], b: q[2 - s * 2], ib: q[3 - s * 2] }); // cả hai chiều của mỗi cặp
    else {
      const key = m === 'dc' ? 'd' : 's';
      for (const p of P) for (const [w, i] of p[key]) { const pr = p.p.find(q => q[0] === w || q[2] === w), o = pr ? (pr[0] === w ? [pr[2], pr[3]] : [pr[0], pr[1]]) : null; out.push({ k: m, tp: p.i, a: w, ia: i, b: o && o[0], ib: o && o[1] }); }
    }
    return rnd(out).slice(0, N);
  }

  App.espron = async function (tp, m) { // gọi từ #/practice/esp?tp=<chủ đề>&m=pp|dc|sy (study.js MODES.esp); không có m → danh sách chủ đề
    const tok = App.routeToken();
    view.innerHTML = `<div class="card" role="status">${esc(t('Đang tải…'))}</div>`;
    const bad = () => { view.innerHTML = `<div class="card">${esc(t('Không tải được bài. Kiểm tra mạng rồi thử lại.'))}</div>`; };
    try { await Promise.all([App.need('espr'), App.loadScript(PX[lang()]), lang() === 'en' ? 0 : App.loadScript(PX.en)]); } catch (e) { if (!App.routeStale(tok)) bad(); return; }
    if (App.routeStale(tok)) return;
    if (!(X().px && X().pxl && X().pxl[lang()])) return bad();
    if (!m) return hub();
    if (!(window.ST2 && ST2['lesson-question'] && ST2['feedback-correct'] && ST2['feedback-wrong'] && ST2['lesson-complete'] && window.QE && App.esQ)) return bad();
    const items = pick(tp, m);
    if (!items.length) { view.innerHTML = `<div class="card">${esc(t('Chưa có bài cho mục này.'))}</div>`; return; }
    S = { tp, m, items, i: 0, ok: 0, best: 0, run: 0, tries: 0 };
    ask();
  };

  function ask() {
    const it = S.items[S.i], g = tpx(it.tp), pct = Math.round(S.i / S.items.length * 100);
    S.pick = null; S.checked = false; S.tries = 0;
    const d = { close: '#/practice/esp', title: u('ti'), pct, combo: '', chip: g.t, play: t('Nghe lại'), who: '', teacher: '', slow: t('Nghe chậm'), opts: ['off', 'on', 'off', 'off'].map((v, i) => ({ v, o: '', k: 'ABCD'[i], t: '' })) };
    const body = App.esQ.frame(d), chk = $('#lsnCheck'); chk.disabled = true;
    const kind = { pp: u('pp'), dc: u('dc'), sy: u('sy') }[it.k], sk = $('.lsn-skipb'); if (sk) sk.hidden = true;
    const say = it.a, play = $('#lsnPlay'), slow = $('#lsnSlow');
    $('#lsnBub').innerHTML = ST.lsnTag(kind, false) + (it.k === 'sy' ? ST.lsnSent(`<span lang="es">${esc(it.a)}</span>`) + ST.lsnSub('/' + it.ia + '/', 'es') : ST.lsnSent('🔊') + ST.lsnSub(it.k === 'pp' ? u('qp') : u('qd'), lang()));
    play.hidden = false; play.onclick = () => speak(say); if (slow) { slow.hidden = false; slow.onclick = () => speak(say, 0.55); }
    if (it.k === 'pp') {
      S.list = rnd([it.a, it.b]); chk.onclick = check;
      const paint = () => App.esQ.opts(S.list, S.pick, o => { S.pick = o; chk.disabled = false; paint(); }, () => S.checked); paint();
    } else if (it.k === 'dc') {
      body.className = 'flex flex-col gap-3 mb-[1rem]'; body.innerHTML = ST.lsnIn(u('qd')); chk.onclick = check;
      const inp = $('#lsnIn'); inp.lang = 'es'; inp.oninput = () => { chk.disabled = !inp.value.trim(); }; inp.onkeydown = e => { if (e.key === 'Enter' && inp.value.trim()) check(); }; setTimeout(() => inp.focus(), 50);
    } else {
      body.className = 'flex flex-col gap-3 mb-[1rem]'; body.innerHTML = ST.lsnMic('🎤 ' + u('mic')); chk.hidden = true; $('#lsnMic').onclick = listen;
    }
    $('#lsnRep').onclick = () => window.open('#/report/new', '_blank');
    setTimeout(() => { if (S && S.items[S.i] === it) speak(say); }, 250);
  }

  // Nói theo: nhận dạng es (Web Speech, hoặc Whisper đa ngôn ngữ trên máy – ui.js) → đúng / thành từ còn lại trong cặp / chưa rõ (thử lại 2 lần, không trừ điểm)
  function listen() {
    const it = S.items[S.i], mic = $('#lsnMic'), out = $('#lsnHeard'); if (S.checked || !mic) return;
    let fin = false; mic.disabled = true; out.textContent = '…';
    S.rec = UI.recognize(it.a, ACC, {
      result: ({ heard, alts }) => { fin = true; mic.disabled = false; const list = (alts && alts.length ? alts : [heard]).map(noAcc), me = noAcc(it.a), other = it.b && noAcc(it.b);
        const hit = x => x === me || x.split(' ').includes(me) || (me.includes(' ') && x.includes(me));
        if (list.some(hit)) return grade(true, heard);
        if (other && list.some(x => x === other || x.split(' ').includes(other))) return grade(false, heard);
        if (++S.tries > 2) return grade(false, heard);
        out.textContent = `${u('rt')} ${heard ? u('hd').replace('{h}', heard) : ''}`; },
      error: code => { fin = true; mic.disabled = false; out.textContent = code === 'unsupported' ? u('nm') : UI.recErrorText(code); },
      end: () => { S.rec = null; mic.disabled = false; if (!fin) out.textContent = u('rt'); },
    });
    if (!S.rec) mic.disabled = false;
  }

  function check() {
    if (S.checked) return; const it = S.items[S.i];
    if (it.k === 'pp') return grade(S.pick === it.a);
    const given = ($('#lsnIn') || {}).value || '', ok = QE.gradeGap({ a: [it.a] }, 0, given).ok;
    if (!ok && noAcc(given) === noAcc(it.a)) return grade(true, given, t('Cẩn thận dấu (tilde): {a}', { a: it.a })); // thiếu tilde vẫn đúng kèm nhắc
    grade(ok, given);
  }

  function grade(ok, given, note) {
    if (S.checked) return; const it = S.items[S.i], g = tpx(it.tp);
    S.checked = true; S.run = ok ? S.run + 1 : 0; S.best = Math.max(S.best, S.run); if (ok) S.ok++; bump(it.tp, ok);
    document.querySelectorAll('#lsnBody button, #lsnIn').forEach(x => { x.disabled = true; });
    try { if (window.Sfx) (ok ? Sfx.correct : Sfx.wrong)(); } catch (e) { /* bỏ qua */ }
    const pair = it.b ? `<span lang="es" class="text-[13px]">${esc(it.a)} /${esc(it.ia)}/ ≠ ${esc(it.b)} /${esc(it.ib)}/</span>` : `<span lang="es" class="text-[13px]">${esc(it.a)} /${esc(it.ia)}/</span>`;
    const heard = it.k === 'sy' && given && !ok ? `<span class="text-[13px]">${esc(u('hd').replace('{h}', given))}</span>` : '';
    const why = `<div class="lsn-fb flex flex-col gap-[0.5rem]"><div class="${ST.XP}" dir="auto" lang="${lang()}"><b>${esc(g.t)}</b><br>${esc(g.x)}</div></div>`;
    const dd = { head: ok ? t('Tuyệt!') : t('Chưa đúng'), xp: '', answer: ok ? '' : it.a, tlabel: '', word: '', ipa: '', mean: '', a1: '', a2: '', acc1: '', acc2: '', url1: '', url2: '', ar1: '', ar2: '', say: '',
      qkind: { pp: u('pp'), dc: u('dc'), sy: u('sy') }[it.k], qpre: '', qpick: it.k === 'pp' && !ok ? String(S.pick) : it.a, qpost: '', extra: (note ? `<span class="text-[13px]">${esc(note)}</span>` : '') + heard + pair, boxes: why };
    App.esFoot(ok, dd, '', next);
    $('#lsnBody').querySelectorAll('.lsn-opt').forEach(b => { b.classList.toggle('opacity-60', b.dataset.o !== it.a && b.dataset.o !== String(S.pick)); });
    if (it.k !== 'pp' || !ok) setTimeout(() => speak(it.a), 150);
  }

  function next() {
    const f = $('#lsnFoot'); if (f) f.remove();
    if (++S.i < S.items.length) return ask();
    App.esEnd({ n: S.items.length, ok: S.ok, first: S.ok, best: S.best, chip: tpx(S.tp || S.items[0].tp).t, title: u('ti'), rev: u('pk'), revHref: '#/practice/esp', again: () => App.espron(S.tp, S.m) });
  }
})();
