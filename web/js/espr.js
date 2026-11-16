/* 🇪🇸 Luyện tiếng Tây Ban Nha (#/practice/es?lv=A1|A2|B1) – chia động từ + điền từ ngữ pháp, giải thích bằng ngôn ngữ người học.
 * Khung Stitch CÓ SẴN của bài học (lesson-question · feedback-correct/wrong · lesson-complete) – không CSS mới. Chấm gõ qua QE (qengine.js).
 * Dữ liệu tĩnh tải lười: cpack/es/dr.js (câu hỏi) + cpack/es/gx-<ngôn ngữ>.js (giải thích). Dựng bởi scripts/target/drill-pack.mjs (spanish-course.md W2b).
 * Vào bằng URL (không cần cờ es_course); lối vào ở Luyện tập chỉ hiện khi cờ bật. */
(function () {
  const { $, esc } = UI, App = window.App, view = App.view, N = 10, LV = ['A1', 'A2', 'B1'], LET = 'ABCD', KEY = 'lk.es.lv';
  const GX = App.esGx; // bảng gói giải thích theo ngôn ngữ (khai ở app.js để build-cpack đặt tên băm)
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* riêng tư */ } return null; };
  const noAcc = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let S = null, tpl = null;
  const lang = () => { const l = window.I18N && I18N.learnLang ? I18N.learnLang() : 'en'; return GX[l] ? l : 'en'; };
  const X = () => (self.ESX = self.ESX || {});
  const speak = x => { try { UI.tts(x, 'es-419', 0.95); } catch (e) { /* không có giọng */ } };

  // Chọn N câu của cấp: xen điền từ (g) và chia động từ (c), mỗi điểm ngữ pháp tối đa 2 câu
  function pick(lv, only) {
    const all = X().dr[lv].filter(i => !only || i[1] === only), rnd = a => a.map(v => [Math.random(), v]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
    const g = rnd(all.filter(i => i[0] === 'g')), c = rnd(all.filter(i => i[0] === 'c')), per = {}, out = [];
    for (let k = 0; out.length < Math.min(N, all.length) && (g.length || c.length); k++) {
      const it = (k % 3 === 2 && c.length ? c : g.length ? g : c).shift(); if (!it) continue;
      if ((per[it[1]] = (per[it[1]] || 0) + 1) > (only ? 99 : 2)) continue;
      out.push(it);
    }
    return out;
  }
  const gx = pid => { const D = (X().gx || {}), r = (D[lang()] || {})[pid] || (D.en || {})[pid]; return r ? { t: r[0], x: r[1] } : { t: '', x: '' }; };
  const split = s => { const i = s.indexOf('___'); return [s.slice(0, i), s.slice(i + 3)]; };

  App.espr = async function (arg, pid) { // gọi từ #/practice/es?lv=A1&p=<điểm ngữ pháp> (study.js MODES.es)
    const lv = LV.includes(arg) ? arg : LV.includes(ls(KEY)) ? ls(KEY) : 'A1';
    ls(KEY, lv); const tok = App.routeToken();
    view.innerHTML = UI.skelPage(t('Đang tải…')); // hiện ngay khi gói còn đang về (mạng chậm)
    try { await Promise.all([App.need('espr'), App.loadScript(GX[lang()]), lang() === 'en' ? 0 : App.loadScript(GX.en)]); } catch (e) { if (App.routeStale(tok)) return; view.innerHTML = `<div class="card">${esc(t('Không tải được bài. Kiểm tra mạng rồi thử lại.'))}</div>`; return; }
    if (App.routeStale(tok)) return; // đã sang trang khác trong lúc nạp gói → không vẽ đè
    if (!(window.ST2 && ST2['lesson-question'] && ST2['feedback-correct'] && ST2['feedback-wrong'] && ST2['lesson-complete'] && window.QE && X().dr && X().dr[lv])) { view.innerHTML = `<div class="card">${esc(t('Không tải được bài. Kiểm tra mạng rồi thử lại.'))}</div>`; return; } // thiếu khung/dữ liệu (gói chưa về): báo, không ném lỗi
    const items = pick(lv, pid);
    if (!items.length) { view.innerHTML = `<div class="card">${esc(t('Chưa có bài cho mục này.'))}</div>`; return; }
    S = { lv, items, i: 0, ok: 0, first: 0, t0: Date.now(), best: 0, run: 0 }; tpl = null;
    ask();
  };

  function ask() {
    const it = S.items[S.i], typed = it[0] === 'c', g = gx(it[1]);
    S.pick = null; S.checked = false;
    const d = { close: '#/practice', title: t('Luyện tiếng Tây Ban Nha'), pct: Math.round(S.i / S.items.length * 100), combo: '', chip: S.lv + (g.t ? ' · ' + g.t : ''), play: t('Nghe lại'), who: '', teacher: '', slow: '',
      opts: ['off', 'on', 'off', 'off'].map((v, i) => ({ v, o: '', k: LET[i], t: '' })) };
    const body = frame(d);
    const [a, b] = split(it[2]), kind = typed ? t('Chia động từ') : t('Điền từ còn thiếu');
    $('#lsnBub').innerHTML = `${ST.lsnTag(kind, false)}${ST.lsnSent(esc(a) + ST.GAP + esc(b))}${typed ? ST.lsnSub(it[4], 'es') : ''}`;
    $('#lsnPlay').hidden = true; const sl = $('#lsnSlow'); if (sl) sl.hidden = true; const sk = $('.lsn-skipb'); if (sk) sk.hidden = true;
    const chk = $('#lsnCheck'); chk.disabled = true; chk.onclick = check;
    if (typed) {
      body.className = 'flex flex-col gap-3 mb-[1rem]'; body.innerHTML = ST.lsnIn(t('Câu trả lời của bạn'));
      const inp = $('#lsnIn'); inp.lang = 'es'; inp.oninput = () => { chk.disabled = !inp.value.trim(); }; inp.onkeydown = e => { if (e.key === 'Enter' && inp.value.trim()) check(); }; setTimeout(() => inp.focus(), 50);
    } else paint(it);
    $('#lsnRep').onclick = () => window.open('#/report/new', '_blank');
  }
  // Khung câu hỏi Stitch (lesson-question) + lấy mẫu nút phương án; dùng chung với cpack/es-app/pron-ui.js qua App.esQ
  function frame(d) {
    const root = ST2.mount(view, 'lesson-question', d, null); root.id = 'lsn'; root.classList.add('lsn-v2');
    const body = $('#lsnBody'); tpl = { off: body.children[0], on: body.children[1] }; body.textContent = '';
    const f = $('#lsnFill'); if (f) f.style.width = d.pct + '%'; const pc = $('#lsnPct'); if (pc) pc.textContent = d.pct + '%';
    return body;
  }
  // Vẽ lại các nút phương án (pick = đang chọn; onPick(o) khi bấm; locked() = đã chấm thì không đổi)
  function opts(list, pick, onPick, locked) {
    const body = $('#lsnBody'); body.textContent = '';
    list.forEach((o, i) => {
      const n = tpl[pick === o ? 'on' : 'off'].cloneNode(true); n.removeAttribute('id'); n.dataset.o = o; n.lang = 'es';
      n.querySelector(':scope > div > span').textContent = LET[i]; n.querySelector(':scope > span').textContent = o;
      n.onclick = () => { if (locked && locked()) return; onPick(o); const nb = body.children[i]; if (nb) nb.focus({ preventScroll: true }); };
      body.appendChild(n);
    });
  }
  App.esQ = { frame, opts };
  function paint(it) {
    opts(it[4], S.pick, o => { S.pick = o; $('#lsnCheck').disabled = false; paint(it); }, () => S.checked);
    const g = $('#lsnGap'); if (g && S.pick) g.textContent = S.pick;
  }

  // Tấm phản hồi Stitch dưới câu hỏi (dùng chung với cpack/es-app/pron-ui.js qua App.esFoot): dd = trường của feedback-correct/wrong, tr = dòng phụ (tùy chọn), next = bấm Tiếp tục
  function foot(ok, dd, tr, next) {
    const K = ok ? 'feedback-correct' : 'feedback-wrong', qf = view.querySelector('.lsn-qfoot');
    let f = $('#lsnFoot'); if (!f) { f = document.createElement('div'); f.id = 'lsnFoot'; }
    if (qf) { qf.hidden = true; qf.after(f); }
    f.hidden = false; f.className = 'lsn-fv2 ' + (ok ? 'ok' : 'bad');
    const o2 = ST2[K](dd); f.innerHTML = `<div class="v2s-${K}">${o2.main}</div>`;
    f.querySelectorAll('.lsn-dict,.lsn-whyrow').forEach(x => x.remove()); const xp = f.querySelector('.lsn-xpp'); if (xp) xp.hidden = true; const an = f.querySelector('.lsn-ans'); if (an && ok) an.hidden = true;
    if (tr) f.insertAdjacentHTML('afterbegin', tr);
    view.querySelectorAll('.lsn-fq').forEach(x => x.remove());
    $('#lsnNext').onclick = next; $('#lsnNext').focus({ preventScroll: true });
    f.scrollIntoView({ block: 'end', behavior: 'auto' });
  }
  App.esFoot = foot;

  function check() {
    if (S.checked) return; const it = S.items[S.i], typed = it[0] === 'c', ans = it[3];
    let ok, note = '', given = typed ? ($('#lsnIn') || {}).value || '' : S.pick;
    if (typed) {
      ok = QE.gradeGap({ a: [ans] }, 0, given).ok;
      if (!ok && noAcc(given).trim() === noAcc(ans)) { ok = true; note = t('Cẩn thận dấu (tilde): {a}', { a: ans }); }
    } else ok = given === ans;
    S.checked = true; S.last = given; S.run = ok ? S.run + 1 : 0; S.best = Math.max(S.best, S.run); if (ok) S.ok++;
    document.querySelectorAll('#lsnBody button, #lsnIn').forEach(x => { x.disabled = true; });
    try { if (window.Sfx) (ok ? Sfx.correct : Sfx.wrong)(); } catch (e) { /* bỏ qua */ }
    const full = it[2].replace('___', ans).replace(/\s*\([^)]*\)/, '');
    const g = gx(it[1]);
    const why = (g.t || g.x) ? `<div class="lsn-fb flex flex-col gap-[0.5rem]"><div class="${ST.XP}" dir="auto" lang="${lang()}"><b>${esc(g.t)}</b><br>${esc(g.x)}</div></div>` : '';
    const tr = !typed && it[5] ? `<span class="text-[13px] opacity-90" lang="en">${esc(it[5])}</span>` : '';
    const dd = { head: ok ? t('Tuyệt!') : t('Chưa đúng'), xp: '', answer: ok ? '' : ans, tlabel: '', word: '', ipa: '', mean: '', a1: '', a2: '', acc1: '', acc2: '', url1: '', url2: '', ar1: '', ar2: '', say: '',
      qkind: typed ? t('Chia động từ') : t('Điền từ còn thiếu'), qpre: split(it[2])[0], qpick: ok ? ans : String(given), qpost: split(it[2])[1], extra: note ? `<span class="text-[13px]">${esc(note)}</span>` : '', boxes: why };
    foot(ok, dd, tr, next);
    $('#lsnBody').querySelectorAll('.lsn-opt').forEach(b => { b.classList.toggle('opacity-60', b.dataset.o !== ans && b.dataset.o !== String(given)); });
    if (!typed || ok) setTimeout(() => speak(full), 150);
  }

  function next() {
    const f = $('#lsnFoot'); if (f) f.remove();
    if (++S.i < S.items.length) return ask();
    finish();
  }
  const finish = () => end({ n: S.items.length, ok: S.ok, first: S.first, best: S.best, chip: S.lv, rev: t('Cấp {l}', { l: nx() }), revHref: '#/practice/es?lv=' + nx(), again: () => App.espr(S.lv) });
  const nx = () => LV[(LV.indexOf(S.lv) + 1) % LV.length];
  // Màn kết Stitch (lesson-complete) dùng chung với cpack/es-app/pron-ui.js qua App.esEnd: o = { n, ok, first, best, chip, title, rev, revHref, again }
  async function end(o) {
    try { if (sessionStorage.getItem('lk.es.dayctx')) App.need('esday').then(() => App.esDayMark('gp')); } catch (e) { /* bỏ qua */ } // lộ trình ngày TBN: bài ngữ pháp/phát âm xong → đánh dấu bước (cpack/es-app/day-ui.js)
    const n = o.n, acc = Math.round(o.ok / n * 100), xp = 10 + o.ok * 2 + (o.ok === n ? 5 : 0);
    try { await App.reward({ quizzes: 1, perfect: o.ok === n ? 1 : 0, xp }); } catch (e) { /* bỏ qua */ }
    const off = (v) => Math.round(490 * (1 - v)), ic = x => `<span class="material-symbols-outlined text-[16px]" aria-hidden="true">${x}</span>`;
    const d = { close: '#/practice', mapL: t('Làm lại'), title: o.title || t('Luyện tiếng Tây Ban Nha'), pct: '100%', chip: o.chip, xp: '+' + xp, acc: acc + '%', streak: String(App.streak ? App.streak() : 0), off1: off(acc / 100), off2: Math.round(414 * (1 - o.first / Math.max(1, n))),
      sub: acc >= 80 ? t('Tuyệt vời!') : t('Làm tốt lắm, cứ tiếp tục nhé!'), learned: ' ', more: `<span class="flex flex-wrap items-center gap-x-3 mt-1 text-[13px] font-bold">${ic('local_fire_department')}${esc(t('COMBO cao nhất'))}: ${o.best}</span>`,
      rev: o.rev, revHref: o.revHref, teacher: '' };
    const root = ST2.mount(view, 'lesson-complete', d, null); root.id = 'lsn'; root.classList.add('lsn-v2', 'lsn-end', 'st-end');
    try { if (window.Sfx) Sfx.win(); } catch (e) { /* bỏ qua */ }
    $('#lsnAgain').onclick = o.again; $('#lsnAgain').focus({ preventScroll: true });
  }
  App.esEnd = end;
})();
