/* Luyện thi TOEIC Listening & Reading: từ vựng TSL (1.250 từ), luyện từng Part, thi thử có quy đổi điểm 10–990 (ước tính).
 * Dùng chung trình phát nhiều giọng (listening.js) và bộ câu hỏi (qengine.js). Đề tự biên soạn. */
(function () {
  const { $, $$, esc, toast } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  const T = () => window.TOEIC || { reading: [], listening: [] };
  const L_PART = () => ({ 1: t('Mô tả tranh'), 2: t('Hỏi – đáp'), 3: t('Hội thoại'), 4: t('Bài nói ngắn') });
  const R_PART = () => ({ 5: t('Hoàn thành câu'), 6: t('Hoàn thành đoạn văn'), 7: t('Đọc hiểu') });
  // Đánh dấu dữ liệu TOEIC để trang Luyện nghe hiển thị đúng tên Part
  T().listening.forEach(p => { p.exam = 'toeic'; });
  // Xoay vị trí đáp án 4 lựa chọn theo mẫu cố định → A/B/C/D phân bố đều (chấm theo chỉ số nên vẫn đúng). Part 1 (photo) không xoay vì audio đọc sẵn chữ cái
  const PAT = [2, 0, 3, 1, 3, 2, 0, 1, 1, 3, 0, 2];
  T().listening.forEach(p => p.groups.forEach(g => g.type === 'mcq' && !g.photo && !g._rot && (g._rot = 1) && g.items.forEach(it => {
    if (it.options.length !== 4) return;
    const want = PAT[it.n % PAT.length], r = (it.a - want + 4) % 4; if (!r) return;
    it.options = it.options.slice(r).concat(it.options.slice(0, r)); it.a = want;
    // Đổi chữ cái đáp án nhắc trong lời giải thích theo vị trí mới (→ C, (B), đáp án A…) – tránh giải thích chỉ sai phương án
    const mv = L => 'ABCD'[('ABCD'.indexOf(L) - r + 4) % 4];
    it._mv = mv; // QE.exT đổi chữ cái lúc hiển thị (cả bản gốc lẫn bản dịch sẵn)
  })));
  // Quy đổi % đúng → điểm thang 5–495 mỗi phần (ước tính tuyến tính có hiệu chỉnh nhẹ; không phải bảng chính thức)
  const scaled = pct => Math.max(5, Math.min(495, Math.round((5 + 490 * Math.pow(pct, 1.08)) / 5) * 5));
  const words = () => IELTS_DATA.TOPICS.filter(t => t.group === 'toeic');

  routes.toeic = function (arg, query) {
    // Chọn đề (Test 1…n) → mỗi lần chỉ hiện các Part của 1 đề, đỡ cuộn dài trên điện thoại
    const tests = [...new Set([...T().reading.map(r => r.test), ...T().listening.map(p => p.test)])].sort((a, b) => a - b);
    let cur = +(query && query.get && query.get('t')) || 0;
    if (!tests.includes(cur)) { try { cur = +localStorage.getItem('vb.toeicT') || 0; } catch (e) { cur = 0; } }
    if (!tests.includes(cur)) cur = tests[0] || 1;
    try { localStorage.setItem('vb.toeicT', cur); } catch (e) { /* bỏ qua */ }
    const tabs = tests.length > 1 ? `<div class="tabs" style="display:inline-flex;flex-wrap:wrap;margin:.4rem 0 .2rem">${tests.map(n => `<a class="${n === cur ? 'on' : ''}" href="#/toeic?t=${n}" style="padding:.45rem .8rem;border-radius:10px;font-weight:700;text-decoration:none;color:inherit;${n === cur ? 'background:var(--surface);box-shadow:var(--shadow-sm)' : ''}">Test ${n}</a>`).join('')}</div>` : '';
    const g = state.game, best = g.toeicBest || {};
    const ws = words(), learned = ws.reduce((a, t) => a + t.words.filter(w => App.inDeck(w.word)).length, 0), total = ws.reduce((a, t) => a + t.words.length, 0);
    view.innerHTML = `
      <div class="page-head"><div><h1>💼 ${t('Luyện thi TOEIC')}</h1><p class="muted">${t('TOEIC Listening & Reading: từ vựng công sở – kinh doanh, luyện theo từng Part và thi thử có quy đổi điểm. Đề tự biên soạn theo đúng cấu trúc đề thi.')}</p></div></div>
      <div class="grid g2">
        <div class="card hero-main" style="background:linear-gradient(135deg,#0ea5a4,#1e40af)">
          <h2 style="color:#fff;margin:0">🏁 ${t('Thi thử Listening + Reading')}</h2>
          <p style="color:#e0f2fe;margin:.4rem 0 .8rem">${t('Làm trọn bộ câu hỏi, chấm tự động và quy đổi điểm 10–990 (ước tính).')}</p>
          <div class="row">${best.total ? `<span class="chip" style="background:rgba(255,255,255,.2);color:#fff">${t('Cao nhất: {n}/990', { n: best.total })}</span>` : ''}${[...new Set(T().listening.map(p => p.test))].filter(n => T().reading.some(r => r.test === n)).map(n => `<a class="btn" style="background:#fff;color:#0f172a" href="#/toeic-test/${n}">${t('Thi thử Test {n}', { n })}</a>`).join('')}</div>
        </div>
        <div class="card">
          <h3 style="margin-top:0">📚 ${t('Từ vựng TOEIC (TSL)')}</h3>
          <div class="progress"><i style="width:${total ? learned / total * 100 : 0}%"></i></div>
          <div class="small muted" style="margin:.3rem 0 .6rem">${t('{a}/{b} từ đã lưu vào flashcard', { a: learned, b: total || 1250 })}</div>
          <div class="row"><a class="btn sm primary" href="#/practice/learn?src=topic:${ws[0] ? ws[0].id : 'toeic1'}">🧠 ${t('Học thông minh')}</a><a class="btn sm" href="#/library?g=toeic">${t('Xem 10 bộ từ')}</a></div>
          <div class="tiny muted" style="margin-top:.5rem">${t('Nguồn:')} TOEIC Service List 1.2 © Browne & Culligan, CC BY-SA 4.0.</div>
        </div>
      </div>
      <a class="card hover" href="#/toeic-sw" style="display:block;margin-top:1rem;text-decoration:none;color:inherit"><div class="row between"><div><h3 style="margin:0">🎙️ TOEIC Speaking & Writing</h3><div class="small muted" style="margin-top:.2rem">${t('Nói và viết theo các dạng bài của ETS: bài mẫu, tiêu chí chấm, chấm đọc to tự động.')}</div></div><span class="btn sm primary">${t('Luyện tập')} →</span></div></a>
      <h2 style="margin-top:1.4rem">🎯 ${t('Luyện theo Part')}</h2>${tabs}
      <h3 style="margin:.8rem 0 .4rem">🎧 Listening</h3>
      <div class="grid auto">${T().listening.filter(p => p.test === cur).map(p => `<div class="card"><span class="chip">Part ${p.part} · ${L_PART()[p.part] || ''}</span><h3 style="margin:.5rem 0 .2rem">Test ${p.test} · ${esc(p.title)}</h3><div class="small muted">${App.listening ? t('{n} câu', { n: App.listening.qNums(p).length }) : ''}</div>
        <div class="row" style="margin-top:.6rem"><a class="btn sm primary" href="#/listen/${p.id}">🎯 ${t('Luyện tập')}</a><a class="btn sm" href="#/listen/${p.id}?mode=exam">⏱ ${t('Nghe 1 lần')}</a><a class="btn sm ghost" href="#/dictation/${p.id}">⌨️ ${t('Chép chính tả')}</a></div></div>`).join('') || `<div class="card muted">${t('Đang cập nhật.')}</div>`}</div>
      <h3 style="margin:1rem 0 .4rem">📖 Reading</h3>
      <div class="grid auto">${T().reading.filter(rt => rt.test === cur).flatMap(rt => rt.parts.map(pt => `<div class="card"><span class="chip">Part ${pt.part} · ${R_PART()[pt.part] || ''}</span><h3 style="margin:.5rem 0 .2rem">Test ${rt.test} · ${esc(pt.title)}</h3><div class="small muted">${t('{n} câu', { n: countPart(pt) })}</div>
        <div class="row" style="margin-top:.6rem"><a class="btn sm primary" href="#/toeic-r/${rt.id}?part=${pt.part}">🎯 ${t('Luyện Part {n}', { n: pt.part })}</a></div></div>`)).join('') || `<div class="card muted">${t('Đang cập nhật.')}</div>`}</div>
      <div class="card" style="margin-top:1.2rem"><h3 style="margin-top:0">💡 ${t('Chiến lược TOEIC')}</h3><ul class="small" style="line-height:1.8;padding-left:1.1rem">
        <li>${t('<b>Part 2:</b> nghe kỹ từ để hỏi (When/Where/Who…); cẩn thận đáp án lặp lại âm giống câu hỏi – thường là bẫy.')}</li>
        <li>${t('<b>Part 3–4:</b> đọc trước câu hỏi trong lúc nghe hướng dẫn; đáp án xuất hiện theo thứ tự câu hỏi.')}</li>
        <li>${t('<b>Part 5:</b> nhìn loại từ cần điền trước (danh/động/tính/trạng từ) – nhiều câu làm được trong 10 giây.')}</li>
        <li>${t('<b>Part 7:</b> đọc câu hỏi trước, dò từ khóa; bài kép thường có 1–2 câu cần nối thông tin 2 văn bản.')}</li></ul></div>`;
  };
  const countPart = pt => (pt.groups ? [pt] : pt.passages || []).reduce((a, x) => a + (x.groups || []).reduce((b, g) => b + g.items.length, 0), 0);

  // Hiện giải thích sau khi nộp
  const explainMark = (root, groups) => groups.forEach(g => g.items.forEach(it => { const el = $(`[data-item="${it.n}"] .lq-fb`, root); if (el && it.explain) el.insertAdjacentHTML('beforeend', `<div class="tiny muted" style="margin-top:.2rem">💡 ${esc(QE.exT(it.explain, it._mv))}</div>`); }));
  const unitsOf = pt => pt.groups ? [{ title: '', text: '', groups: pt.groups }] : pt.passages;
  const unitHtml = (u, k) => `<div class="card toeic-u" data-u="${k}">${u.text ? `<div class="toeic-pass"><b>${esc(u.title || '')}</b><div style="white-space:pre-wrap;margin-top:.4rem">${esc(u.text)}</div></div>` : ''}<div class="toeic-q">${QE.questionsHtml({ groups: u.groups })}</div></div>`;

  // ---------- Luyện Reading theo Part ----------
  routes['toeic-r'] = function (id, query) {
    const tst = T().reading.find(x => x.id === id);
    if (!tst) return routes.toeic();
    const part = +(query.get('part') || 5), pt = tst.parts.find(x => x.part === part);
    if (!pt) return routes.toeic();
    const units = unitsOf(pt);
    view.innerHTML = `<a href="#/toeic" class="small">← TOEIC</a>
      <div class="page-head" style="margin-top:.4rem"><div><div class="tiny muted">${esc(tst.title)} · Part ${part}</div><h1 style="margin:.2rem 0">${esc(pt.title)}</h1><p class="muted small">${esc(pt.instr || '')}</p></div></div>
      ${window.QT ? QT.box('p' + part, true) : ''}
      <div id="tq">${units.map(unitHtml).join('')}</div>
      <div class="row" style="margin-top:1rem"><button class="btn primary" id="tSub">✅ ${t('Nộp bài & xem giải thích')}</button><div class="row" style="margin-left:auto">${tst.parts.map(x => `<a class="btn sm ${x.part === part ? 'primary' : ''}" href="#/toeic-r/${tst.id}?part=${x.part}">Part ${x.part}</a>`).join('')}</div></div>
      <div id="tRes" style="margin-top:1rem"></div>`;
    QE.bind($('#tq'));
    $('#tSub').onclick = async () => {
      let right = 0, total = 0;
      units.forEach((u, k) => {
        const root = $(`.toeic-u[data-u="${k}"]`), p = { groups: u.groups }, res = QE.collect(p, root);
        QE.mark(root, res); explainMark(root, u.groups);
        Object.entries(res).forEach(([n, r]) => { total++; if (r.ok) right++; else if (App.logMistake) App.logMistake({ kind: 'reading', q: `TOEIC ${n}: ${r.q || ''}`, answer: r.answer, given: r.given || I18N.tk('(bỏ trống)'), explain: (u.groups.flatMap(g => g.items).find(i => i.n === +n) || {}).explain || '', ref: '' }); });
      });
      $('#tSub').disabled = true;
      if (window.QT) await QT.recordRaw('tr', 'p' + part, right, total, QT.secsOf($('#tq')));
      await App.reward({ quizzes: 1, readings: 1, xp: 10 + right * 2 });
      $('#tRes').innerHTML = `<div class="feedback ${right / total >= 0.7 ? 'ok' : 'no'}" style="position:static"><b>${t('{a}/{b} câu đúng', { a: right, b: total })} (${Math.round(right / total * 100)}%)</b> · ${t('câu sai đã vào Sổ lỗi sai')}</div>`;
      $('#tRes').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
  };

  // ---------- Thi thử: Listening (Part 1–4, nghe 1 lần) → Reading (Part 5–7, bấm giờ) ----------
  routes['toeic-test'] = function (n) {
    n = +n || 1;
    const LP = T().listening.filter(p => p.test === n).sort((a, b) => a.part - b.part), RT = T().reading.find(x => x.test === n);
    if (!LP.length || !RT) return routes.toeic();
    const res = { L: {}, R: {} };
    let player = null, timer = null;
    // Lưu bài làm dở (đề dài ~2 giờ): tải lại trang / app bị tắt vẫn tiếp tục được – Listening theo Part, Reading từng đáp án + đồng hồ
    const SK = 'lk.toeicRun.' + n;
    const save = x => { try { localStorage.setItem(SK, JSON.stringify({ ...x, res, at: Date.now() })); } catch (e) { /* bỏ qua */ } };
    const saved = (() => { try { const x = JSON.parse(localStorage.getItem(SK) || 'null'); return x && Date.now() - x.at < 864e5 ? x : null; } catch (e) { return null; } })();
    const clearRun = () => { try { localStorage.removeItem(SK); } catch (e) { /* bỏ qua */ } };
    document.body.classList.add('bare');
    window.onbeforeunload = () => t('Bạn đang làm bài thi – rời trang sẽ mất kết quả.');
    App.cleanup = () => { if (player) player.stop(); clearInterval(timer); document.body.classList.remove('bare'); window.onbeforeunload = null; };
    const bar = (title, right = '') => `<div class="mk-bar"><div class="row nowrap"><b>💼 TOEIC Mock · Test ${n}</b><span class="chip">${esc(title)}</span></div><div class="row nowrap">${right}<a class="btn sm ghost" href="#/toeic" data-confirm="${esc(t('Thoát bài thi?'))}">${t('Thoát')}</a></div></div>`;
    const lPart = k => {
      const p = LP[k];
      view.innerHTML = `${bar('Listening · Part ' + p.part)}<div class="card lplayer" style="margin-top:1rem"><b id="tState">🔊 ${t('Đang phát – chỉ nghe 1 lần')}</b><span class="lnow small muted" id="lNow"></span></div>
        <div class="card" id="lQs">${QE.questionsHtml(p)}<div class="row" style="margin-top:1rem"><button class="btn primary" id="tNext" disabled>${k < LP.length - 1 ? t('Phần tiếp') + ' →' : t('Sang Reading') + ' →'}</button></div></div>`;
      QE.bind($('#lQs'));
      player = App.listening.Player(p, { onEnd: () => { const s = $('#tState'); if (s) s.textContent = '✓ ' + t('Hết phần nghe'); const b = $('#tNext'); if (b) b.disabled = false; } });
      player.play(0);
      setTimeout(() => { const b = $('#tNext'); if (b) b.disabled = false; }, 30000);
      $('#tNext').onclick = () => { player.stop(); const r = QE.collect(p, $('#lQs')); Object.keys(r).forEach(q => { r[q].part = p.part; { const i0 = p.groups.flatMap(g => g.items || []).find(i => i.n === +q) || {}; r[q].explain = QE.exT(i0.explain, i0._mv); } }); Object.assign(res.L, r); save(k < LP.length - 1 ? { stage: 'L', k: k + 1 } : { stage: 'R' }); if (k < LP.length - 1) lPart(k + 1); else reading(); window.scrollTo({ top: 0 }); };
    };
    const reading = (restore) => {
      const units = RT.parts.flatMap(pt => unitsOf(pt).map(u => ({ ...u, part: pt.part })));
      const mins = Math.max(20, Math.round(units.reduce((a, u) => a + u.groups.reduce((b, g) => b + g.items.length, 0), 0) * 0.75));
      const nums = units.flatMap(u => QE.numsOf({ groups: u.groups }));
      view.innerHTML = `${bar('Reading', `<span class="small muted" id="tCnt"></span><span class="mk-clock" id="tClock"></span>`)}<div class="tx-wrap"><div id="tq">${units.map(unitHtml).join('')}<div class="row" style="margin-top:1rem"><button class="btn primary" id="tSub">${t('Nộp bài')}</button></div></div>
        <aside class="tx-nav card"><b class="small">${t('Bảng câu hỏi')}</b><div class="tx-grid">${nums.map(q => `<button data-go="${q}">${q}</button>`).join('')}</div><div class="tiny muted" style="margin-top:.5rem">${t('Ô tô màu = đã trả lời · bấm số để nhảy tới câu')}</div></aside></div>`;
      QE.bind($('#tq'));
      // Bảng câu hỏi: đánh dấu câu đã làm, bấm để nhảy tới
      const answered = q => { const el = $(`#tq [data-item="${q}"]`) || $$('#tq [data-item]').find(x => x.dataset.item.split(',').includes(String(q))); if (!el) return false; return [...el.querySelectorAll('input, select')].some(i => i.type === 'radio' || i.type === 'checkbox' ? i.checked : i.value.trim()); };
      const paint = () => { let k = 0; $$('.tx-grid [data-go]').forEach(b => { const a = answered(+b.dataset.go); b.classList.toggle('on', a); if (a) k++; }); $('#tCnt').textContent = t('{a}/{b} câu đã làm', { a: k, b: nums.length }); };
      const fields = () => $$('#tq input, #tq select');
      const snap = () => fields().map(i => (i.type === 'radio' || i.type === 'checkbox' ? (i.checked ? 1 : 0) : i.value));
      if (restore && Array.isArray(restore.ans)) fields().forEach((i, j) => { const v = restore.ans[j]; if (v == null) return; if (i.type === 'radio' || i.type === 'checkbox') i.checked = !!v; else i.value = v; });
      const keep = () => save({ stage: 'R', ans: snap(), left });
      $('#tq').addEventListener('change', () => { paint(); keep(); }); $('#tq').addEventListener('input', paint); paint();
      $$('.tx-grid [data-go]').forEach(b => b.onclick = () => { const q = b.dataset.go, el = $(`#tq [data-item="${q}"]`) || $$('#tq [data-item]').find(x => x.dataset.item.split(',').includes(q)); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('tx-flash'); setTimeout(() => el.classList.remove('tx-flash'), 1200); } });
      let left = restore && restore.left > 0 ? restore.left : mins * 60; const tick = () => { left--; if (left % 15 === 0) keep(); const c = $('#tClock'); if (c) { c.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`; c.classList.toggle('warn', left < 300); } if (left <= 0) submit(); };
      tick(); timer = setInterval(tick, 1000);
      const submit = () => { clearInterval(timer); units.forEach((u, k) => { const r = QE.collect({ groups: u.groups }, $(`.toeic-u[data-u="${k}"]`)); Object.values(r).forEach(x => { x.part = u.part; }); Object.keys(r).forEach(q => { { const i0 = u.groups.flatMap(g => g.items || []).find(i => i.n === +q) || {}; r[q].explain = QE.exT(i0.explain, i0._mv); } }); Object.assign(res.R, r); }); finish(); };
      $('#tSub').onclick = () => { const miss = nums.filter(q => !answered(q)).length; if (confirm(miss ? t('Còn {n} câu chưa làm. Vẫn nộp bài?', { n: miss }) : t('Nộp bài Reading?'))) submit(); };
    };
    const finish = async () => {
      App.cleanup(); App.cleanup = null; clearRun();
      const cnt = o => { const v = Object.values(o); return [v.filter(r => r.ok).length, v.length]; };
      const [lr, lt] = cnt(res.L), [rr, rt] = cnt(res.R);
      const ls = scaled(lr / Math.max(1, lt)), rs = scaled(rr / Math.max(1, rt)), total = ls + rs;
      state.game = await Game.mutate(gs => { gs.toeicBest = { total: Math.max(total, (gs.toeicBest || {}).total || 0), at: Date.now() }; gs.toeicTests = [...(gs.toeicTests || []), { n, ls, rs, total, at: Date.now() }].slice(-20); });
      if (window.QT) { await QT.record('tl', res.L, null, r => 'p' + r.part); await QT.record('tr', res.R, null, r => 'p' + r.part); }
      await App.reward({ quizzes: 2, listens: LP.length, readings: 1, xp: 40 + lr + rr });
      if (App.logMistake) [...Object.entries(res.L).map(x => ['listening', ...x]), ...Object.entries(res.R).map(x => ['reading', ...x])].filter(([, , r]) => !r.ok).forEach(([kind, q, r]) => App.logMistake({ kind, q: `TOEIC Test ${n} · ${q}: ${r.q || ''}`, answer: r.answer, given: r.given || I18N.tk('(bỏ trống)'), explain: r.explain || '', ref: '' }));
      if (total >= 700) { Sfx.win(); confetti(140); }
      const sheet = o => `<div class="lsheet">${Object.keys(o).map(Number).sort((a, b) => a - b).map(q => `<div class="${o[q].ok ? 'ok' : 'no'}"><b>${q}</b> ${o[q].ok ? '✓' : '✗'} <span>${esc(o[q].answer)}</span></div>`).join('')}</div>`;
      view.innerHTML = `<div class="study-wrap" style="max-width:860px"><div class="card celebrate"><div class="em">💼</div><h2>${t('{n}/990 điểm (ước tính)', { n: total })}</h2>
        <div class="mk-bands" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div><span>🎧</span><b>${ls}</b><small>Listening · ${lr}/${lt}</small></div><div><span>📖</span><b>${rs}</b><small>Reading · ${rr}/${rt}</small></div></div>
        <p class="small muted" style="margin-top:.8rem">${t('Quy đổi ước tính trên đề tự biên soạn – chỉ để tham khảo, không phải thang điểm chính thức của ETS.')}</p></div>
        ${(() => { // Tỉ lệ đúng theo từng Part → chỉ ra Part yếu nhất để luyện
          const by = {}; [...Object.values(res.L).map(r => ['L', r]), ...Object.values(res.R).map(r => ['R', r])].forEach(([k, r]) => { const key = (k === 'L' ? '🎧 ' : '📖 ') + 'Part ' + r.part; (by[key] = by[key] || [0, 0])[1]++; if (r.ok) by[key][0]++; });
          const rows = Object.entries(by), weak = rows.slice().sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1])[0];
          return `<div class="card"><b>📊 ${t('Kết quả theo từng Part')}</b>${rows.map(([k, [a, b]]) => { const p = Math.round(a / b * 100); return `<div class="tx-pbar"><span>${k}</span><div class="progress"><i style="width:${p}%;${p >= 70 ? 'background:var(--good)' : p < 50 ? 'background:var(--again)' : ''}"></i></div><b>${a}/${b}</b></div>`; }).join('')}
            ${weak ? `<div class="tip small" style="margin-top:.6rem">🎯 ${t('Nên luyện thêm: <b>{p}</b> – phần có tỉ lệ đúng thấp nhất.', { p: weak[0] })} <a href="#/toeic">${t('Luyện theo Part →')}</a></div>${window.QT ? QT.box('p' + (weak[0].match(/\d+/) || [''])[0], true) : ''}` : ''}</div>`;
        })()}
        ${(() => { const wrong = [...Object.entries(res.L), ...Object.entries(res.R)].filter(([, r]) => !r.ok); return wrong.length ? `<div class="card"><details open><summary><b>🔍 ${t('Xem lại {n} câu sai', { n: wrong.length })}</b></summary>${wrong.map(([q, r]) => `<div class="tx-rev"><div><span class="qn">${q}</span> ${esc(r.q || '')}</div><div class="small">❌ ${esc(r.given || t('(bỏ trống)'))} · ✅ <b>${esc(r.answer)}</b></div>${r.explain ? `<div class="tiny muted">💡 ${esc(r.explain)}</div>` : ''}</div>`).join('')}</details></div>` : ''; })()}
        <div class="card"><details><summary><b>🎧 ${t('Đáp án Listening')}</b></summary>${sheet(res.L)}</details></div>
        <div class="card"><details><summary><b>📖 ${t('Đáp án Reading')}</b></summary>${sheet(res.R)}</details></div>
        <div class="row center"><a class="btn primary" href="#/toeic">${t('Về TOEIC')}</a><a class="btn" href="#/mistakes">📕 ${t('Sổ lỗi sai')}</a></div></div>`;
    };
    // Màn hình bắt đầu kiểu phòng thi: cấu trúc đề, kiểm tra loa, lịch sử điểm
    const lq = LP.map(p => QE.numsOf(p).length), rParts = RT.parts.map(pt => ({ part: pt.part, q: unitsOf(pt).reduce((a, u) => a + QE.numsOf({ groups: u.groups }).length, 0) }));
    const OFF = { 1: 6, 2: 25, 3: 39, 4: 30, 5: 30, 6: 16, 7: 54 }; // số câu đề TOEIC L&R chính thức theo Part
    const rMins = Math.max(20, Math.round(rParts.reduce((a, x) => a + x.q, 0) * 0.75));
    const hist = (state.game.toeicTests || []).filter(x => x.n === n).slice(-5).reverse();
    view.innerHTML = `<div class="study-wrap" style="max-width:820px"><div class="card tx-start">
      <div class="row between"><div><div class="tiny muted">💼 TOEIC Listening & Reading</div><h2 style="margin:.2rem 0">Mock Test ${n}</h2></div>${(state.game.toeicBest || {}).total ? `<span class="chip ok">🏆 ${t('Cao nhất')}: ${state.game.toeicBest.total}</span>` : ''}</div>
      <table class="tx-table"><thead><tr><th>${t('Phần')}</th><th>${t('Số câu')}</th><th>${t('Thời gian')}</th><th class="muted">${t('Đề thật')}</th></tr></thead><tbody>
        ${LP.some(p => p.part === 1) ? '' : `<tr class="muted"><td>🎧 Listening · Part 1</td><td>–</td><td>${t('mô tả tranh – chưa có')}</td><td>${OFF[1]}</td></tr>`}
        ${LP.map((p, i) => `<tr><td>🎧 Listening · Part ${p.part}</td><td>${lq[i]}</td><td class="muted">${t('nghe 1 lần')}</td><td class="muted">${OFF[p.part] || ''}</td></tr>`).join('')}
        ${rParts.map((x, i) => `<tr><td>📖 Reading · Part ${x.part}</td><td>${x.q}</td><td class="muted">${i === 0 ? t('{m} phút cho cả Reading', { m: rMins }) : ''}</td><td class="muted">${OFF[x.part] || ''}</td></tr>`).join('')}
      </tbody></table><p class="tiny muted" style="margin:.4rem 0 0">${t('Đề tự biên soạn đúng cấu trúc đề thật: 200 câu, Listening ~45 phút, Reading 75 phút.')}</p>
      <div class="tx-check"><b>✅ ${t('Trước khi bắt đầu')}</b><ul class="small"><li>${t('Đeo tai nghe, chọn nơi yên tĩnh – audio chỉ phát 1 lần như thi thật.')}</li><li>${t('Reading có đồng hồ đếm ngược, hết giờ tự nộp.')}</li><li>${t('Câu sai tự vào Sổ lỗi sai kèm giải thích.')}</li></ul>
        <button class="btn sm" id="tTest">🔊 ${t('Thử loa')}</button></div>
      ${hist.length ? `<div class="small" style="margin-top:.8rem"><b>📈 ${t('Các lần trước')}</b><div class="row" style="gap:.35rem;margin-top:.3rem">${hist.map(h => `<span class="chip">${h.total} <span class="muted">(L ${h.ls} · R ${h.rs})</span></span>`).join('')}</div></div>` : ''}
      <button class="btn primary lg block" id="tGo" style="margin-top:1.1rem">${t('Bắt đầu làm bài')} →</button></div></div>`;
    $('#tTest').onclick = () => UI.tts('This is a sound check. If you can hear this clearly, you are ready.', 'en-US');
    $('#tGo').onclick = () => { clearRun(); lPart(0); };
    if (saved) {
      $('#tGo').insertAdjacentHTML('beforebegin', `<button class="btn lg block" id="tResume" style="margin-top:1.1rem">⏯ ${saved.stage === 'R' ? t('Tiếp tục bài đang làm – Reading (còn {m} phút)', { m: Math.ceil((saved.left || 0) / 60) || '…' }) : t('Tiếp tục bài đang làm – Listening Part {p}', { p: (LP[saved.k] || LP[0]).part })}</button>`);
      $('#tResume').onclick = () => { Object.assign(res, saved.res || {}); if (saved.stage === 'R') reading(saved); else lPart(Math.min(saved.k || 0, LP.length - 1)); };
    }
  };
  // ================= TOEIC SPEAKING & WRITING (dữ liệu: js/toeic/sw*.js – window.TOEIC_SW) =================
  // Theo cấu trúc bài thi công khai của ETS; điểm chỉ là ước tính để tự luyện, không phải điểm chính thức.
  const SW = () => window.TOEIC_SW || { speaking: [], writing: [] };
  const SWT = {
    read: { sec: 'speaking', name: 'Read a Text Aloud', ic: '📢', max: 3, get desc() { return t('Đọc to một đoạn thông báo hoặc quảng cáo: 45 giây chuẩn bị, 45 giây đọc.'); } },
    respond: { sec: 'speaking', name: 'Respond to Questions', ic: '💬', max: 3, get desc() { return t('Trả lời 3 câu hỏi về một chủ đề quen thuộc (15, 15 và 30 giây).'); } },
    info: { sec: 'speaking', name: 'Respond to Questions Using Information Provided', ic: '📋', max: 3, get desc() { return t('Đọc lịch hoặc bảng thông tin rồi trả lời 3 câu hỏi của người gọi.'); } },
    opinion: { sec: 'speaking', name: 'Express an Opinion', ic: '🗣️', max: 5, get desc() { return t('Nêu và bảo vệ ý kiến: 45 giây chuẩn bị, 60 giây nói.'); } },
    request: { sec: 'writing', name: 'Respond to a Written Request', ic: '📧', max: 4, get desc() { return t('Trả lời một email công việc trong 10 phút.'); } },
    essay: { sec: 'writing', name: 'Write an Opinion Essay', ic: '📝', max: 5, get desc() { return t('Viết bài nêu ý kiến ít nhất 300 từ trong 30 phút.'); } },
  };
  const swUnits = k => [...SW().speaking, ...SW().writing].filter(u => u.task === k);
  const mmss = s => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, '0')}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
  const wc = s => (String(s || '').trim().match(/\S+/g) || []).length;
  const swStore = { get: k => { try { return localStorage.getItem('vb.toeicsw.' + k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { localStorage.setItem('vb.toeicsw.' + k, v); } catch (e) { /* bỏ qua */ } } };
  const sw = { stream: null, media: null, timer: null, sr: null, timers: [] };
  function swStop() {
    clearInterval(sw.timer); sw.timer = null; sw.timers.forEach(clearInterval); sw.timers = [];
    try { if (sw.sr) sw.sr.stop(); } catch (e) { /* đã dừng */ }
    try { if (sw.media && sw.media.state !== 'inactive') sw.media.stop(); else if (sw.stream) sw.stream.getTracks().forEach(x => x.stop()); } catch (e) { /* đã dừng */ }
  }
  // Ghi âm có giới hạn giây (bản ghi chỉ giữ trong bộ nhớ)
  async function swRecord(seconds, onTick, onDone) {
    if (!navigator.mediaDevices || !window.MediaRecorder) { toast(t('Trình duyệt không hỗ trợ ghi âm.')); return false; }
    try { sw.stream = await navigator.mediaDevices.getUserMedia({ audio: { autoGainControl: true, noiseSuppression: true, echoCancellation: true } }); } catch (e) { toast(t('Cần cho phép dùng micro để ghi âm.')); return false; }
    const chunks = [], media = sw.media = new MediaRecorder(sw.stream), stream = sw.stream;
    media.ondataavailable = e => e.data.size && chunks.push(e.data);
    media.onstop = () => { stream.getTracks().forEach(x => x.stop()); clearInterval(sw.timer); sw.timer = null; onDone(chunks.length ? UI.recUrl(new Blob(chunks, { type: media.mimeType || 'audio/webm' }), 'toeic') : ''); };
    media.start();
    let left = seconds; onTick(left);
    sw.timer = setInterval(() => { left--; onTick(left); if (left <= 0) { try { media.stop(); } catch (e) { /* đã dừng */ } } }, 1000);
    return true;
  }
  // Đếm ngược chuẩn bị rồi gọi go()
  function swPrep(seconds, onTick, go) { let left = seconds; onTick(left); const id = setInterval(() => { left--; onTick(left); if (left <= 0) { clearInterval(id); go(); } }, 1000); sw.timers.push(id); return id; }
  // Chấm đọc to: độ khớp văn bản + tốc độ (từ/phút) + số lần ngắt quãng dài (ước tính từ nhận dạng giọng nói liên tục)
  // SỬA LỖI: Chrome trả số dạng chữ số ("15%", "$50", "9 o'clock", "8:30") trong khi đề viết bằng chữ ("fifteen percent"…).
  // UI.similarity bỏ hết chữ số → các từ này bị tính là "bỏ sót" và kéo độ khớp xuống. Đổi số (0–999) về chữ trước khi so.
  const N1 = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' '), N10 = ',,twenty,thirty,forty,fifty,sixty,seventy,eighty,ninety'.split(',');
  const numW = n => n < 20 ? N1[n] : n < 100 ? N10[Math.floor(n / 10)] + (n % 10 ? ' ' + N1[n % 10] : '') : N1[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numW(n % 100) : '');
  const spellNums = s => String(s).replace(/(\d+):(\d\d)/g, (m, h, mm) => +mm ? `${h} ${+mm}` : h).replace(/\$(\d+)/g, '$1 dollars').replace(/(\d+)\s*%/g, '$1 percent')
    .replace(/\d+/g, d => +d < 1000 ? ' ' + numW(+d) + ' ' : d).replace(/\s+/g, ' ').trim();
  function readScore(target, segs, t0, tEnd) {
    const heard = spellNums(segs.map(x => x.text).join(' ')), n = wc(heard);
    const dur = Math.max(1, ((segs.length ? segs[segs.length - 1].t : tEnd) - (t0 || tEnd)) / 1000);
    const wpm = n ? Math.round(n / dur * 60) : 0;
    let pauses = 0; for (let i = 1; i < segs.length; i++) if ((segs[i].t - segs[i - 1].t) / 1000 > wc(segs[i].text) / 2.6 + 2) pauses++;
    const norm = s => s.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean);
    const hs = new Set(norm(heard)), missed = [...new Set(norm(target).filter(w => w.length > 2 && !hs.has(w)))].slice(0, 12);
    const pct = Math.round(UI.similarity(heard, target) * 100);
    const est = pct >= 90 && wpm >= 110 && wpm <= 175 && pauses <= 2 ? 3 : pct >= 75 ? 2 : pct >= 50 ? 1 : 0;
    return { heard, pct, wpm, pauses, missed, est };
  }
  const ckHtml = (u, max) => u.checklist ? `<div class="card" style="margin:1rem 0 0"><h3 style="margin-top:0">✅ ${t('Tự kiểm tra bài của bạn')}</h3>
    ${u.checklist.map((c, k) => `<label class="small" style="display:flex;gap:.45rem;align-items:flex-start;margin:.45rem 0;cursor:pointer"><input type="checkbox" data-ck="${k}"> <span>${esc(c.c)}<span class="tiny muted" style="display:block;margin-top:.15rem">✏️ ${esc(c.ex)}</span></span></label>`).join('')}
    <div class="small" id="ckRes" style="margin-top:.4rem"></div></div>` : '';
  const ckBind = (u, max) => { const upd = () => { const a = $$('[data-ck]:checked').length, b = (u.checklist || []).length; const r = $('#ckRes'); if (r) r.innerHTML = `<b>${t('Đạt {a}/{b} tiêu chí', { a, b })}</b> · ${t('Ước tính: {s}/{m} theo thang ETS', { s: Math.round(a / (b || 1) * max), m: max })}`; }; $$('[data-ck]').forEach(x => x.onchange = upd); upd(); };
  const extraHtml = u => `${u.mid ? `<div class="card" style="margin:1rem 0 0"><h3 style="margin-top:0">📄 ${t('Bài mức trung bình')}</h3><div style="white-space:pre-wrap;line-height:1.7">${esc(u.mid)}</div>${u.midNote ? `<div class="tip small" style="margin-top:.6rem">🔍 <b>${t('Vì sao kém hơn bài mẫu')}:</b> ${esc(u.midNote)}</div>` : ''}</div>` : ''}${u.outline ? `<div class="card" style="margin:1rem 0 0"><h3 style="margin-top:0">🧭 ${t('Dàn ý')}</h3><ol class="small" style="margin:0;padding-left:1.3rem;line-height:1.7">${u.outline.map(o => `<li>${esc(o)}</li>`).join('')}</ol></div>` : ''}`;

  routes['toeic-sw'] = function (task, query) {
    swStop(); App.cleanup = () => { swStop(); UI.stopSpeak(); };
    if (!SWT[task]) {
      view.innerHTML = `<a href="#/toeic" class="small">← TOEIC</a>
        <div class="page-head" style="margin-top:.4rem"><div><h1>🎙️ TOEIC Speaking & Writing</h1><p class="muted">${t('Nói và viết theo các dạng bài của ETS: bài mẫu, tiêu chí chấm, chấm đọc to tự động.')}</p></div></div>
        <div class="card small" style="margin-bottom:1rem">🗂️ ${t('Đề thật của ETS: Speaking 11 câu (khoảng 20 phút), Writing 8 câu (khoảng 60 phút), mỗi phần thang điểm 0–200. Ứng dụng chưa có dạng bài mô tả tranh (Speaking câu 3–4, Writing câu 1–5).')}</div>
        <div class="grid g2">${['speaking', 'writing'].map(sec => `<div class="card"><h2 style="margin-top:0">${sec === 'speaking' ? '🗣️ Speaking' : '✍️ Writing'}</h2>
          ${Object.entries(SWT).filter(([, v]) => v.sec === sec).map(([k, v]) => `<div style="margin:.8rem 0;padding-top:.6rem;border-top:1px solid var(--line)"><div class="row between"><b>${v.ic} ${esc(v.name)}</b><span class="chip">${swUnits(k).length}</span></div>
            <div class="small muted" style="margin:.2rem 0 .4rem">${v.desc}</div><a class="btn sm primary" href="#/toeic-sw/${k}">🎯 ${t('Luyện tập')}</a></div>`).join('')}</div>`).join('')}</div>`;
      return;
    }
    const T1 = SWT[task], units = swUnits(task), i = Math.min(units.length - 1, Math.max(0, +(query && query.get && query.get('i')) || 0)), u = units[i];
    view.innerHTML = `<a href="#/toeic-sw" class="small">← TOEIC Speaking & Writing</a>
      <div class="page-head" style="margin-top:.4rem"><div><h1 style="margin:.2rem 0">${T1.ic} ${esc(T1.name)}</h1><p class="muted small" style="margin:0">${T1.desc}</p></div></div>
      <div class="row" style="margin-bottom:.8rem">${units.map((x, k) => `<a class="chip ${k === i ? 'lv' : ''}" href="#/toeic-sw/${task}?i=${k}">${esc(t('Đề {n}', { n: k + 1 }))} · ${esc(x.title)}</a>`).join('')}</div>
      <div id="swBody"></div>`;
    if (!u) { $('#swBody').innerHTML = `<div class="card muted">${t('Đang cập nhật.')}</div>`; return; }
    ({ read: swRead, respond: swQs, info: swQs, opinion: swOpinion, request: swWrite, essay: swWrite })[task](u, $('#swBody'), T1);
  };

  function swRead(u, body, T1) {
    const accent = u.accent || 'en-US';
    body.innerHTML = `<div class="card"><div class="lq-instr"><i>Directions: In this part of the test, you will read aloud the text on the screen. You will have ${u.prep} seconds to prepare. Then you will have ${u.secs} seconds to read the text aloud.</i></div>
      <div class="toeic-pass" style="font-size:1.08rem;line-height:1.8">${esc(u.text)}</div>
      <div style="text-align:center;margin-top:.8rem"><div class="small muted" id="swPhase">${t('Chuẩn bị')}</div><div class="timer" id="swClock" style="font-size:2.2rem">${mmss(u.prep)}</div>
        <div class="row center" style="margin-top:.6rem"><button class="btn" id="swPrepB">⏱ ${t('Bắt đầu chuẩn bị')}</button><button class="btn primary" id="swGo">🎙️ ${t('Nói ngay')}</button><button class="btn sm ghost" id="swHear" title="${esc(t('Nghe'))}">🔊</button></div></div>
      <div id="swRes" style="margin-top:1rem"></div>
      <details style="margin-top:.8rem"><summary class="small"><b>💡 ${t('Câu trả lời mẫu & mẹo')}</b></summary><ul class="small" style="line-height:1.7;padding-left:1.2rem">${u.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details></div>`;
    const clock = $('#swClock'), phase = $('#swPhase'), go = $('#swGo');
    $('#swHear').onclick = () => UI.tts(u.text, accent, 0.95);
    const start = async () => {
      swStop(); UI.stopSpeak(); go.textContent = '⏹'; $('#swPrepB').disabled = true; phase.textContent = '🔴 ' + t('Đang ghi âm – bấm lần nữa để dừng');
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition, segs = [], tStart = performance.now(); let t0 = 0;
      if (SR) { try { const r = sw.sr = new SR(); r.lang = accent; r.continuous = true; r.interimResults = false; r.onspeechstart = () => { t0 = t0 || performance.now(); }; r.onresult = e => { for (let k = e.resultIndex; k < e.results.length; k++) if (e.results[k].isFinal) { t0 = t0 || tStart; /* SỬA LỖI: trình duyệt không phát onspeechstart → trước đây lấy (kết quả đầu − 1,5 s), nhưng cụm đầu thường dài 5–10 s → từ/phút bị thổi phồng; nay lấy lúc bắt đầu ghi */ segs.push({ text: e.results[k][0].transcript.trim(), t: performance.now() }); } }; r.onerror = () => {}; r.start(); } catch (e) { sw.sr = null; } }
      const ok = await swRecord(u.secs, left => { clock.textContent = mmss(left); clock.classList.toggle('warn', left <= 10); }, url => {
        try { if (sw.sr) sw.sr.stop(); } catch (e) { /* đã dừng */ }
        setTimeout(() => {
          go.textContent = '🎙️ ' + t('Nói ngay'); $('#swPrepB').disabled = false; phase.textContent = t('Chuẩn bị'); clock.textContent = mmss(u.prep); clock.classList.remove('warn');
          const audio = url ? `<audio controls src="${url}" style="margin-top:.5rem;max-width:100%"></audio>` : '';
          if (!SR || !segs.length) { $('#swRes').innerHTML = `<div class="card small">${t('Đã ghi âm – nghe lại và so với câu trả lời mẫu.')}${audio}</div>`; return; }
          const s = readScore(u.text, segs, t0, performance.now());
          const sp = s.wpm < 110 ? t('Hơi chậm – mục tiêu khoảng 120–160 từ/phút.') : s.wpm > 175 ? t('Hơi nhanh – chậm lại để đọc rõ từng từ.') : t('Tốc độ phù hợp.');
          $('#swRes').innerHTML = `<div class="feedback ${s.est >= 2 ? 'ok' : 'no'}" style="position:static">
            <div><b>${t('Độ khớp với văn bản: {p}%', { p: s.pct })}</b> · ${t('Tốc độ: {w} từ/phút', { w: s.wpm })} · ${t('Ngắt quãng dài: {n} lần', { n: s.pauses })}</div>
            <div class="small" style="margin-top:.3rem">${sp}</div>
            ${s.missed.length ? `<div class="small" style="margin-top:.3rem">${t('Từ bị bỏ sót hoặc đọc chưa rõ:')} ${s.missed.map(w => `<span class="chip">${esc(w)}</span>`).join(' ')}</div>` : ''}
            <div style="margin-top:.4rem"><b>${t('Ước tính: {s}/{m} theo thang ETS', { s: s.est, m: T1.max })}</b></div>${audio}
            <div class="tiny muted" style="margin-top:.3rem">${t('Độ giống do máy nhận dạng giọng nói ước tính – chỉ để tham khảo.')}</div></div>`;
          App.reward({ spoken: 1, xp: 5 });
        }, 700);
      });
      if (!ok) { go.textContent = '🎙️ ' + t('Nói ngay'); $('#swPrepB').disabled = false; phase.textContent = t('Chuẩn bị'); try { if (sw.sr) sw.sr.stop(); } catch (e) { /* đã dừng */ } }
    };
    go.onclick = () => { if (sw.media && sw.media.state === 'recording') { try { sw.media.stop(); } catch (e) { /* đã dừng */ } return; } start(); };
    $('#swPrepB').onclick = () => { swStop(); $('#swPrepB').disabled = true; swPrep(u.prep, left => { clock.textContent = mmss(left); }, start); };
  }

  function swQs(u, body, T1) {
    const accent = u.accent || 'en-US'; let qi = 0;
    const table = u.info ? `<div class="card" style="margin-bottom:1rem"><b>${esc(u.info.title)}</b><div style="overflow-x:auto;margin-top:.5rem"><table class="gtable"><tbody>${u.info.rows.map(r => `<tr><td style="white-space:nowrap"><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table></div>${u.info.note ? `<div class="small muted" style="margin-top:.4rem">${esc(u.info.note)}</div>` : ''}</div>` : '';
    const show = () => {
      swStop(); UI.stopSpeak();
      const q = u.questions[qi];
      body.innerHTML = `<div class="lq-instr"><i>${esc(u.context)}</i></div>${table}
        <div class="card"><div class="row between"><span class="chip">${t('Câu {i}/{n}', { i: qi + 1, n: u.questions.length })} · ${q.secs}s</span><button class="btn sm" id="ivHear">🔊 ${t('Nghe câu hỏi')}</button></div>
          <div style="font-size:1.15rem;font-weight:700;margin:.8rem 0">${esc(q.q)}</div>
          <div style="text-align:center"><div class="timer" id="ivClock" style="font-size:2.2rem">${mmss(q.secs)}</div>
            <div style="margin:1rem 0 .5rem"><button class="mic" id="ivRec" title="${esc(t('Bắt đầu / dừng ghi âm'))}">🎙️</button></div>
            <div class="small muted" id="ivHint">${t('Bấm micro để trả lời – tối đa {s} giây.', { s: q.secs })}</div><div id="ivAudio" style="margin-top:.6rem"></div></div>
          <details style="margin-top:.8rem"><summary class="small"><b>📝 ${t('Câu trả lời mẫu & mẹo')}</b> <span class="tiny muted">– ${t('xem sau khi đã tự trả lời')}</span></summary>
            <div style="margin-top:.5rem;line-height:1.7">${esc(q.model)} <button class="ctx-say sm" data-saysent="${esc(q.model)}">🔊</button></div><div class="tip small" style="margin-top:.5rem">💡 ${esc(q.tip)}</div></details>
          <div class="row" style="margin-top:1rem">${qi > 0 ? `<button class="btn ghost" id="ivPrev">← ${t('Câu trước')}</button>` : ''}${qi < u.questions.length - 1 ? `<button class="btn primary" id="ivNext">${t('Câu hỏi tiếp')} →</button>` : ''}</div></div>
        ${qi === u.questions.length - 1 ? ckHtml(u, T1.max) : ''}`;
      const hear = () => UI.tts(q.q, accent, 0.95);
      $('#ivHear').onclick = hear; hear();
      const btn = $('#ivRec');
      btn.onclick = async () => {
        if (btn.classList.contains('rec')) { try { sw.media.stop(); } catch (e) { /* đã dừng */ } return; }
        UI.stopSpeak();
        const ok = await swRecord(q.secs, left => { const c = $('#ivClock'); if (c) { c.textContent = mmss(left); c.classList.toggle('warn', left <= 5); } }, url => {
          btn.classList.remove('rec'); const h = $('#ivHint'); if (h) h.textContent = t('Đã ghi âm – nghe lại và so với câu trả lời mẫu.');
          const a = $('#ivAudio'); if (a && url) a.innerHTML = `<audio controls src="${url}"></audio>`;
          App.reward({ spoken: 1, xp: 3 });
        });
        if (ok) { btn.classList.add('rec'); $('#ivHint').textContent = '🔴 ' + t('Đang ghi âm – bấm lần nữa để dừng'); }
      };
      const p = $('#ivPrev'); if (p) p.onclick = () => { qi--; show(); };
      const n = $('#ivNext'); if (n) n.onclick = () => { qi++; show(); };
      if (qi === u.questions.length - 1) ckBind(u, T1.max);
    };
    show();
  }

  function swOpinion(u, body, T1) {
    const accent = u.accent || 'en-US';
    body.innerHTML = `<div class="card"><div class="lq-instr"><i>Directions: In this part of the test, you will give your opinion about a specific topic. Be sure to say as much as you can in the time allowed. You will have ${u.prep} seconds to prepare. Then you will have ${u.secs} seconds to speak.</i></div>
      <div class="row between"><span class="chip">${u.secs}s</span><button class="btn sm" id="ivHear">🔊 ${t('Nghe câu hỏi')}</button></div>
      <div style="font-size:1.12rem;font-weight:700;margin:.8rem 0">${esc(u.q)}</div>
      <div style="text-align:center"><div class="small muted" id="swPhase">${t('Chuẩn bị')}</div><div class="timer" id="swClock" style="font-size:2.2rem">${mmss(u.prep)}</div>
        <div class="row center" style="margin-top:.6rem"><button class="btn" id="swPrepB">⏱ ${t('Bắt đầu chuẩn bị')}</button><button class="btn primary" id="swGo">🎙️ ${t('Nói ngay')}</button></div><div id="ivAudio" style="margin-top:.6rem"></div></div>
      <details style="margin-top:.8rem"><summary class="small"><b>📝 ${t('Câu trả lời mẫu & mẹo')}</b> <span class="tiny muted">– ${t('xem sau khi đã tự trả lời')}</span></summary>
        <div style="margin-top:.5rem;line-height:1.7">${esc(u.model)} <button class="ctx-say sm" data-saysent="${esc(u.model)}">🔊</button></div>${extraHtml(u)}</details></div>
      ${ckHtml(u, T1.max)}`;
    const clock = $('#swClock'), phase = $('#swPhase'), go = $('#swGo');
    $('#ivHear').onclick = () => UI.tts(u.q, accent, 0.95);
    const start = async () => {
      swStop(); UI.stopSpeak(); $('#swPrepB').disabled = true;
      const ok = await swRecord(u.secs, left => { clock.textContent = mmss(left); clock.classList.toggle('warn', left <= 10); }, url => {
        $('#swPrepB').disabled = false; go.textContent = '🎙️ ' + t('Nói ngay'); phase.textContent = t('Đã ghi âm – nghe lại và so với câu trả lời mẫu.');
        const a = $('#ivAudio'); if (a && url) a.innerHTML = `<audio controls src="${url}"></audio>`;
        App.reward({ spoken: 1, xp: 5 });
      });
      if (ok) { phase.textContent = '🔴 ' + t('Đang ghi âm – bấm lần nữa để dừng'); go.textContent = '⏹'; } else $('#swPrepB').disabled = false;
    };
    go.onclick = () => { if (sw.media && sw.media.state === 'recording') { try { sw.media.stop(); } catch (e) { /* đã dừng */ } return; } start(); };
    $('#swPrepB').onclick = () => { swStop(); $('#swPrepB').disabled = true; swPrep(u.prep, left => { clock.textContent = mmss(left); }, start); };
    ckBind(u, T1.max);
  }

  function swWrite(u, body, T1) {
    const minW = u.task === 'essay' ? 300 : 0;
    const prompt = u.task === 'request'
      ? `<div class="toeic-pass"><div class="small"><i>Directions: Read the e-mail below. ${esc(u.directions)}</i></div>
          <div style="margin-top:.7rem;padding:.7rem;border:1px solid var(--line);border-radius:10px"><div class="small"><b>From:</b> ${esc(u.email.from)}<br><b>To:</b> ${esc(u.email.to)}<br><b>Subject:</b> ${esc(u.email.subject)}</div><div style="margin-top:.5rem">${esc(u.email.body)}</div></div></div>`
      : `<div class="toeic-pass"><div class="small"><i>Directions: Read the question below. You have ${u.minutes} minutes to plan, write, and revise your essay. Typically, an effective response will contain a minimum of 300 words.</i></div><div style="margin-top:.7rem;font-weight:700">${esc(u.q)}</div></div>`;
    body.innerHTML = `<div class="grid g2" style="align-items:start"><div>${prompt}</div>
      <div class="card" style="margin:0"><div class="row between"><span class="small muted" id="wCnt"></span><span class="mk-clock timer" id="wClock">${mmss(u.minutes * 60)}</span></div>
        <textarea class="input" id="wTxt" style="min-height:300px;font-size:1.02rem;line-height:1.7;margin-top:.5rem" spellcheck="false" placeholder="${esc(t('Bắt đầu viết bài của bạn…'))}"></textarea>
        <div class="tiny muted" style="margin-top:.3rem">${t('Đồng hồ ({m} phút) chạy khi bạn bắt đầu gõ. Bài nháp được lưu trên trình duyệt này.', { m: u.minutes })}</div>
        <div class="row" style="margin-top:.7rem"><button class="btn primary" id="wModel">📝 ${t('Xem bài mẫu & checklist')}</button>${window.AI ? `<button class="btn" id="wAI">🤖 ${t('Nhận xét bằng AI')}</button>` : ''}</div></div></div>
      <div id="wOut" style="margin-top:1rem"></div><div id="wAIOut"></div>`;
    const ta = $('#wTxt'); ta.value = swStore.get(u.id);
    let left = u.minutes * 60, started = false, rewarded = false;
    const paint = () => { const n = wc(ta.value); $('#wCnt').innerHTML = t('{n} từ', { n }) + (n && minW && n < minW ? ` · <span style="color:var(--again-text)">${t('nên viết ≥ {m} từ', { m: minW })}</span>` : ''); };
    ta.addEventListener('input', () => {
      swStore.set(u.id, ta.value); paint();
      if (started) return; started = true;
      sw.timers.push(setInterval(() => { left--; const c = $('#wClock'); if (!c) return; c.textContent = left > 0 ? mmss(left) : '⏰ ' + t('Hết giờ'); c.classList.toggle('warn', left < 60); }, 1000));
    });
    paint();
    $('#wModel').onclick = () => {
      $('#wOut').innerHTML = `<div class="card" style="margin:0"><h3 style="margin-top:0">📝 ${t('Bài mẫu')}</h3><div style="white-space:pre-wrap;line-height:1.7">${esc(u.model)}</div><div class="tiny muted" style="margin-top:.4rem">${t('{n} từ', { n: wc(u.model) })}</div></div>${extraHtml(u)}${ckHtml(u, T1.max)}`;
      ckBind(u, T1.max);
      if (!rewarded && wc(ta.value) >= (minW || 60)) { rewarded = true; App.reward({ xp: 10 }); }
      $('#wOut').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const ai = $('#wAI');
    if (ai) ai.onclick = async function go() {
      const text = ta.value.trim(), n = wc(text);
      if (n < 30) return toast(t('Bài quá ngắn để AI nhận xét (cần ≥ 30 từ)'));
      if (!(await AI.getKey())) { const st = await AI.nanoStatus(); if (st === 'none' || st === 'unavailable') return AI.keyDialog(go); }
      const out = $('#wAIOut'); ai.disabled = true;
      out.innerHTML = `<div class="card small muted">⏳ ${t('AI đang đọc bài (10–30 giây)…')}</div>`;
      const task = u.task === 'request' ? `Respond to a Written Request (scored 0-4).\nE-mail:\n"""${u.email.body}"""\nDirections: ${u.directions}` : `Write an Opinion Essay (scored 0-5).\nQuestion: ${u.q}`;
      try {
        const r = await AI.ask(`This request is about the TOEIC Writing test, NOT IELTS or TOEFL. Act as an experienced TOEIC Writing rater using the public ETS scoring guidelines.
Task: ${task}\nCandidate's response (${n} words):\n"""${text}"""\n
Return ONLY JSON: {"score": number (0-${T1.max}), "summary": string (Vietnamese, 2-3 sentences), "strengths": [string] (Vietnamese, 2-3 items), "improvements": [string] (Vietnamese, 3-5 concrete actions), "errors": [{"quote": string (exact learner text), "fix": string (corrected English), "why": string (Vietnamese)}] (up to 6)}`);
        out.innerHTML = `<div class="card ai-box"><div class="row between"><b>🤖 ${t('Nhận xét của AI')}</b>${r.score != null ? `<span class="chip lv">${esc(r.score)}/${T1.max}</span>` : ''}</div>
          ${r.summary ? `<p class="small">${esc(r.summary)}</p>` : ''}
          ${(r.strengths || []).length ? `<div class="small"><b>👍 ${t('Điểm mạnh')}</b><ul>${r.strengths.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
          ${(r.improvements || []).length ? `<div class="small"><b>🎯 ${t('Cần cải thiện')}</b><ul>${r.improvements.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
          ${(r.errors || []).length ? `<div class="small"><b>✏️ ${t('Lỗi cần sửa')}</b>${r.errors.map(x => `<div style="margin:.3rem 0">❌ <s>${esc(x.quote)}</s> → ✅ <b>${esc(x.fix)}</b><div class="tiny muted">${esc(x.why || '')}</div></div>`).join('')}</div>` : ''}
          <div class="tiny muted" style="margin-top:.4rem">${t('Nhận xét do AI tạo, chỉ để tham khảo – không phải điểm chính thức của ETS.')}</div></div>`;
        App.reward({ xp: 5 });
      } catch (e) {
        out.innerHTML = `<div class="card small">❌ ${esc(AI.errText ? AI.errText(e) : e.message)}</div>`;
      }
      ai.disabled = false;
    };
  }
})();
