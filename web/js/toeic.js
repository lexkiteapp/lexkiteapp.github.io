/* Luyện thi TOEIC Listening & Reading: từ vựng TSL (1.250 từ), luyện từng Part, thi thử có quy đổi điểm 10–990 (ước tính).
 * Dùng chung trình phát nhiều giọng (listening.js) và bộ câu hỏi (qengine.js). Đề tự biên soạn. */
(function () {
  const { $, $$, esc, toast } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  const T = () => window.TOEIC || { reading: [], listening: [] };
  const L_PART = { 1: t('Mô tả tranh'), 2: t('Hỏi – đáp'), 3: t('Hội thoại'), 4: t('Bài nói ngắn') };
  const R_PART = { 5: t('Hoàn thành câu'), 6: t('Hoàn thành đoạn văn'), 7: t('Đọc hiểu') };
  // Đánh dấu dữ liệu TOEIC để trang Luyện nghe hiển thị đúng tên Part
  T().listening.forEach(p => { p.exam = 'toeic'; });
  // Xoay vị trí đáp án 4 lựa chọn theo mẫu cố định → A/B/C/D phân bố đều (chấm theo chỉ số nên vẫn đúng)
  const PAT = [2, 0, 3, 1, 3, 2, 0, 1, 1, 3, 0, 2];
  T().listening.forEach(p => p.groups.forEach(g => g.type === 'mcq' && !g._rot && (g._rot = 1) && g.items.forEach(it => {
    if (it.options.length !== 4) return;
    const want = PAT[it.n % PAT.length], r = (it.a - want + 4) % 4; if (!r) return;
    it.options = it.options.slice(r).concat(it.options.slice(0, r)); it.a = want;
    // Đổi chữ cái đáp án nhắc trong lời giải thích theo vị trí mới (→ C, (B), đáp án A…) – tránh giải thích chỉ sai phương án
    const mv = L => 'ABCD'[('ABCD'.indexOf(L) - r + 4) % 4];
    if (it.explain) it.explain = it.explain.replace(/(→\s*|\(|[Đđ]áp án\s+|[Cc]họn\s+|[Pp]hương án\s+)([A-D])\b/g, (m, pre, L) => pre + mv(L));
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
      <h2 style="margin-top:1.4rem">🎯 ${t('Luyện theo Part')}</h2>${tabs}
      <h3 style="margin:.8rem 0 .4rem">🎧 Listening</h3>
      <div class="grid auto">${T().listening.filter(p => p.test === cur).map(p => `<div class="card"><span class="chip">Part ${p.part} · ${L_PART[p.part] || ''}</span><h3 style="margin:.5rem 0 .2rem">Test ${p.test} · ${esc(p.title)}</h3><div class="small muted">${App.listening ? t('{n} câu', { n: App.listening.qNums(p).length }) : ''}</div>
        <div class="row" style="margin-top:.6rem"><a class="btn sm primary" href="#/listen/${p.id}">🎯 ${t('Luyện tập')}</a><a class="btn sm" href="#/listen/${p.id}?mode=exam">⏱ ${t('Nghe 1 lần')}</a><a class="btn sm ghost" href="#/dictation/${p.id}">⌨️ ${t('Chép chính tả')}</a></div></div>`).join('') || `<div class="card muted">${t('Đang cập nhật.')}</div>`}</div>
      <h3 style="margin:1rem 0 .4rem">📖 Reading</h3>
      <div class="grid auto">${T().reading.filter(rt => rt.test === cur).flatMap(rt => rt.parts.map(pt => `<div class="card"><span class="chip">Part ${pt.part} · ${R_PART[pt.part] || ''}</span><h3 style="margin:.5rem 0 .2rem">Test ${rt.test} · ${esc(pt.title)}</h3><div class="small muted">${t('{n} câu', { n: countPart(pt) })}</div>
        <div class="row" style="margin-top:.6rem"><a class="btn sm primary" href="#/toeic-r/${rt.id}?part=${pt.part}">🎯 ${t('Luyện Part {n}', { n: pt.part })}</a></div></div>`)).join('') || `<div class="card muted">${t('Đang cập nhật.')}</div>`}</div>
      <div class="card" style="margin-top:1.2rem"><h3 style="margin-top:0">💡 ${t('Chiến lược TOEIC')}</h3><ul class="small" style="line-height:1.8;padding-left:1.1rem">
        <li>${t('<b>Part 2:</b> nghe kỹ từ để hỏi (When/Where/Who…); cẩn thận đáp án lặp lại âm giống câu hỏi – thường là bẫy.')}</li>
        <li>${t('<b>Part 3–4:</b> đọc trước câu hỏi trong lúc nghe hướng dẫn; đáp án xuất hiện theo thứ tự câu hỏi.')}</li>
        <li>${t('<b>Part 5:</b> nhìn loại từ cần điền trước (danh/động/tính/trạng từ) – nhiều câu làm được trong 10 giây.')}</li>
        <li>${t('<b>Part 7:</b> đọc câu hỏi trước, dò từ khóa; bài kép thường có 1–2 câu cần nối thông tin 2 văn bản.')}</li></ul></div>`;
  };
  const countPart = pt => (pt.groups ? [pt] : pt.passages || []).reduce((a, x) => a + (x.groups || []).reduce((b, g) => b + g.items.length, 0), 0);

  // Hiện giải thích sau khi nộp
  const explainMark = (root, groups) => groups.forEach(g => g.items.forEach(it => { const el = $(`[data-item="${it.n}"] .lq-fb`, root); if (el && it.explain) el.insertAdjacentHTML('beforeend', `<div class="tiny muted" style="margin-top:.2rem">💡 ${esc(it.explain)}</div>`); }));
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
      <div id="tq">${units.map(unitHtml).join('')}</div>
      <div class="row" style="margin-top:1rem"><button class="btn primary" id="tSub">✅ ${t('Nộp bài & xem giải thích')}</button><div class="row" style="margin-left:auto">${tst.parts.map(x => `<a class="btn sm ${x.part === part ? 'primary' : ''}" href="#/toeic-r/${tst.id}?part=${x.part}">Part ${x.part}</a>`).join('')}</div></div>
      <div id="tRes" style="margin-top:1rem"></div>`;
    QE.bind($('#tq'));
    $('#tSub').onclick = async () => {
      let right = 0, total = 0;
      units.forEach((u, k) => {
        const root = $(`.toeic-u[data-u="${k}"]`), p = { groups: u.groups }, res = QE.collect(p, root);
        QE.mark(root, res); explainMark(root, u.groups);
        Object.entries(res).forEach(([n, r]) => { total++; if (r.ok) right++; else if (App.logMistake) App.logMistake({ kind: 'reading', q: `TOEIC ${n}: ${r.q || ''}`, answer: r.answer, given: r.given || t('(bỏ trống)'), explain: (u.groups.flatMap(g => g.items).find(i => i.n === +n) || {}).explain || '', ref: '' }); });
      });
      $('#tSub').disabled = true;
      await App.reward({ quizzes: 1, readings: 1, xp: 10 + right * 2 });
      $('#tRes').innerHTML = `<div class="feedback ${right / total >= 0.7 ? 'ok' : 'no'}" style="position:static"><b>${t('{a}/{b} câu đúng', { a: right, b: total })} (${Math.round(right / total * 100)}%)</b> · ${t('câu sai đã vào Sổ lỗi sai')}</div>`;
      $('#tRes').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
  };

  // ---------- Thi thử: Listening (Part 2–4, nghe 1 lần) → Reading (Part 5–7, bấm giờ) ----------
  routes['toeic-test'] = function (n) {
    n = +n || 1;
    const LP = T().listening.filter(p => p.test === n).sort((a, b) => a.part - b.part), RT = T().reading.find(x => x.test === n);
    if (!LP.length || !RT) return routes.toeic();
    const res = { L: {}, R: {} };
    let player = null, timer = null;
    document.body.classList.add('bare');
    window.onbeforeunload = () => t('Bạn đang làm bài thi – rời trang sẽ mất kết quả.');
    App.cleanup = () => { if (player) player.stop(); clearInterval(timer); document.body.classList.remove('bare'); window.onbeforeunload = null; };
    const bar = (title, right = '') => `<div class="mk-bar"><div class="row nowrap"><b>💼 TOEIC Mock · Test ${n}</b><span class="chip">${esc(title)}</span></div><div class="row nowrap">${right}<a class="btn sm ghost" href="#/toeic" onclick="return confirm(${esc(JSON.stringify(t('Thoát bài thi?')))})">${t('Thoát')}</a></div></div>`;
    const lPart = k => {
      const p = LP[k];
      view.innerHTML = `${bar('Listening · Part ' + p.part)}<div class="card lplayer" style="margin-top:1rem"><b id="tState">🔊 ${t('Đang phát – chỉ nghe 1 lần')}</b><span class="lnow small muted" id="lNow"></span></div>
        <div class="card" id="lQs">${QE.questionsHtml(p)}<div class="row" style="margin-top:1rem"><button class="btn primary" id="tNext" disabled>${k < LP.length - 1 ? t('Phần tiếp') + ' →' : t('Sang Reading') + ' →'}</button></div></div>`;
      QE.bind($('#lQs'));
      player = App.listening.Player(p, { onEnd: () => { const s = $('#tState'); if (s) s.textContent = '✓ ' + t('Hết phần nghe'); const b = $('#tNext'); if (b) b.disabled = false; } });
      player.play(0);
      setTimeout(() => { const b = $('#tNext'); if (b) b.disabled = false; }, 30000);
      $('#tNext').onclick = () => { player.stop(); const r = QE.collect(p, $('#lQs')); Object.keys(r).forEach(q => { r[q].part = p.part; r[q].explain = (p.groups.flatMap(g => g.items || []).find(i => i.n === +q) || {}).explain || ''; }); Object.assign(res.L, r); if (k < LP.length - 1) lPart(k + 1); else reading(); window.scrollTo({ top: 0 }); };
    };
    const reading = () => {
      const units = RT.parts.flatMap(pt => unitsOf(pt).map(u => ({ ...u, part: pt.part })));
      const mins = Math.max(20, Math.round(units.reduce((a, u) => a + u.groups.reduce((b, g) => b + g.items.length, 0), 0) * 0.75));
      const nums = units.flatMap(u => QE.numsOf({ groups: u.groups }));
      view.innerHTML = `${bar('Reading', `<span class="small muted" id="tCnt"></span><span class="mk-clock" id="tClock"></span>`)}<div class="tx-wrap"><div id="tq">${units.map(unitHtml).join('')}<div class="row" style="margin-top:1rem"><button class="btn primary" id="tSub">${t('Nộp bài')}</button></div></div>
        <aside class="tx-nav card"><b class="small">${t('Bảng câu hỏi')}</b><div class="tx-grid">${nums.map(q => `<button data-go="${q}">${q}</button>`).join('')}</div><div class="tiny muted" style="margin-top:.5rem">${t('Ô tô màu = đã trả lời · bấm số để nhảy tới câu')}</div></aside></div>`;
      QE.bind($('#tq'));
      // Bảng câu hỏi: đánh dấu câu đã làm, bấm để nhảy tới
      const answered = q => { const el = $(`#tq [data-item="${q}"]`) || $$('#tq [data-item]').find(x => x.dataset.item.split(',').includes(String(q))); if (!el) return false; return [...el.querySelectorAll('input, select')].some(i => i.type === 'radio' || i.type === 'checkbox' ? i.checked : i.value.trim()); };
      const paint = () => { let k = 0; $$('.tx-grid [data-go]').forEach(b => { const a = answered(+b.dataset.go); b.classList.toggle('on', a); if (a) k++; }); $('#tCnt').textContent = t('{a}/{b} câu đã làm', { a: k, b: nums.length }); };
      $('#tq').addEventListener('change', paint); $('#tq').addEventListener('input', paint); paint();
      $$('.tx-grid [data-go]').forEach(b => b.onclick = () => { const q = b.dataset.go, el = $(`#tq [data-item="${q}"]`) || $$('#tq [data-item]').find(x => x.dataset.item.split(',').includes(q)); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('tx-flash'); setTimeout(() => el.classList.remove('tx-flash'), 1200); } });
      let left = mins * 60; const tick = () => { left--; const c = $('#tClock'); if (c) { c.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`; c.classList.toggle('warn', left < 300); } if (left <= 0) submit(); };
      tick(); timer = setInterval(tick, 1000);
      const submit = () => { clearInterval(timer); units.forEach((u, k) => { const r = QE.collect({ groups: u.groups }, $(`.toeic-u[data-u="${k}"]`)); Object.values(r).forEach(x => { x.part = u.part; }); Object.keys(r).forEach(q => { r[q].explain = (u.groups.flatMap(g => g.items || []).find(i => i.n === +q) || {}).explain || ''; }); Object.assign(res.R, r); }); finish(); };
      $('#tSub').onclick = () => { const miss = nums.filter(q => !answered(q)).length; if (confirm(miss ? t('Còn {n} câu chưa làm. Vẫn nộp bài?', { n: miss }) : t('Nộp bài Reading?'))) submit(); };
    };
    const finish = async () => {
      App.cleanup(); App.cleanup = null;
      const cnt = o => { const v = Object.values(o); return [v.filter(r => r.ok).length, v.length]; };
      const [lr, lt] = cnt(res.L), [rr, rt] = cnt(res.R);
      const ls = scaled(lr / Math.max(1, lt)), rs = scaled(rr / Math.max(1, rt)), total = ls + rs;
      state.game = await Game.mutate(gs => { gs.toeicBest = { total: Math.max(total, (gs.toeicBest || {}).total || 0), at: Date.now() }; gs.toeicTests = [...(gs.toeicTests || []), { n, ls, rs, total, at: Date.now() }].slice(-20); });
      await App.reward({ quizzes: 2, listens: LP.length, readings: 1, xp: 40 + lr + rr });
      if (App.logMistake) [...Object.entries(res.L).map(x => ['listening', ...x]), ...Object.entries(res.R).map(x => ['reading', ...x])].filter(([, , r]) => !r.ok).forEach(([kind, q, r]) => App.logMistake({ kind, q: `TOEIC Test ${n} · ${q}: ${r.q || ''}`, answer: r.answer, given: r.given || t('(bỏ trống)'), explain: r.explain || '', ref: '' }));
      if (total >= 700) { Sfx.win(); confetti(140); }
      const sheet = o => `<div class="lsheet">${Object.keys(o).map(Number).sort((a, b) => a - b).map(q => `<div class="${o[q].ok ? 'ok' : 'no'}"><b>${q}</b> ${o[q].ok ? '✓' : '✗'} <span>${esc(o[q].answer)}</span></div>`).join('')}</div>`;
      view.innerHTML = `<div class="study-wrap" style="max-width:860px"><div class="card celebrate"><div class="em">💼</div><h2>${t('{n}/990 điểm (ước tính)', { n: total })}</h2>
        <div class="mk-bands" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div><span>🎧</span><b>${ls}</b><small>Listening · ${lr}/${lt}</small></div><div><span>📖</span><b>${rs}</b><small>Reading · ${rr}/${rt}</small></div></div>
        <p class="small muted" style="margin-top:.8rem">${t('Quy đổi tuyến tính trên đề rút gọn tự biên soạn – chỉ để tham khảo, không phải thang điểm chính thức của ETS.')}</p></div>
        ${(() => { // Tỉ lệ đúng theo từng Part → chỉ ra Part yếu nhất để luyện
          const by = {}; [...Object.values(res.L).map(r => ['L', r]), ...Object.values(res.R).map(r => ['R', r])].forEach(([k, r]) => { const key = (k === 'L' ? '🎧 ' : '📖 ') + 'Part ' + r.part; (by[key] = by[key] || [0, 0])[1]++; if (r.ok) by[key][0]++; });
          const rows = Object.entries(by), weak = rows.slice().sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1])[0];
          return `<div class="card"><b>📊 ${t('Kết quả theo từng Part')}</b>${rows.map(([k, [a, b]]) => { const p = Math.round(a / b * 100); return `<div class="tx-pbar"><span>${k}</span><div class="progress"><i style="width:${p}%;${p >= 70 ? 'background:var(--good)' : p < 50 ? 'background:var(--again)' : ''}"></i></div><b>${a}/${b}</b></div>`; }).join('')}
            ${weak ? `<div class="tip small" style="margin-top:.6rem">🎯 ${t('Nên luyện thêm: <b>{p}</b> – phần có tỉ lệ đúng thấp nhất.', { p: weak[0] })} <a href="#/toeic">${t('Luyện theo Part →')}</a></div>` : ''}</div>`;
        })()}
        ${(() => { const wrong = [...Object.entries(res.L), ...Object.entries(res.R)].filter(([, r]) => !r.ok); return wrong.length ? `<div class="card"><details open><summary><b>🔍 ${t('Xem lại {n} câu sai', { n: wrong.length })}</b></summary>${wrong.map(([q, r]) => `<div class="tx-rev"><div><span class="qn">${q}</span> ${esc(r.q || '')}</div><div class="small">❌ ${esc(r.given || t('(bỏ trống)'))} · ✅ <b>${esc(r.answer)}</b></div>${r.explain ? `<div class="tiny muted">💡 ${esc(r.explain)}</div>` : ''}</div>`).join('')}</details></div>` : ''; })()}
        <div class="card"><details><summary><b>🎧 ${t('Đáp án Listening')}</b></summary>${sheet(res.L)}</details></div>
        <div class="card"><details><summary><b>📖 ${t('Đáp án Reading')}</b></summary>${sheet(res.R)}</details></div>
        <div class="row center"><a class="btn primary" href="#/toeic">${t('Về TOEIC')}</a><a class="btn" href="#/mistakes">📕 ${t('Sổ lỗi sai')}</a></div></div>`;
    };
    // Màn hình bắt đầu kiểu phòng thi: cấu trúc đề, kiểm tra loa, lịch sử điểm
    const lq = LP.map(p => QE.numsOf(p).length), rParts = RT.parts.map(pt => ({ part: pt.part, q: unitsOf(pt).reduce((a, u) => a + QE.numsOf({ groups: u.groups }).length, 0) }));
    const rMins = Math.max(20, Math.round(rParts.reduce((a, x) => a + x.q, 0) * 0.75));
    const hist = (state.game.toeicTests || []).filter(x => x.n === n).slice(-5).reverse();
    view.innerHTML = `<div class="study-wrap" style="max-width:820px"><div class="card tx-start">
      <div class="row between"><div><div class="tiny muted">💼 TOEIC Listening & Reading</div><h2 style="margin:.2rem 0">Mock Test ${n}</h2></div>${(state.game.toeicBest || {}).total ? `<span class="chip ok">🏆 ${t('Cao nhất')}: ${state.game.toeicBest.total}</span>` : ''}</div>
      <table class="tx-table"><thead><tr><th>${t('Phần')}</th><th>${t('Số câu')}</th><th>${t('Thời gian')}</th></tr></thead><tbody>
        ${LP.map((p, i) => `<tr><td>🎧 Listening · Part ${p.part}</td><td>${lq[i]}</td><td class="muted">${t('nghe 1 lần')}</td></tr>`).join('')}
        ${rParts.map((x, i) => `<tr><td>📖 Reading · Part ${x.part}</td><td>${x.q}</td><td class="muted">${i === 0 ? t('{m} phút cho cả Reading', { m: rMins }) : ''}</td></tr>`).join('')}
      </tbody></table>
      <div class="tx-check"><b>✅ ${t('Trước khi bắt đầu')}</b><ul class="small"><li>${t('Đeo tai nghe, chọn nơi yên tĩnh – audio chỉ phát 1 lần như thi thật.')}</li><li>${t('Reading có đồng hồ đếm ngược, hết giờ tự nộp.')}</li><li>${t('Câu sai tự vào Sổ lỗi sai kèm giải thích.')}</li></ul>
        <button class="btn sm" id="tTest">🔊 ${t('Thử loa')}</button></div>
      ${hist.length ? `<div class="small" style="margin-top:.8rem"><b>📈 ${t('Các lần trước')}</b><div class="row" style="gap:.35rem;margin-top:.3rem">${hist.map(h => `<span class="chip">${h.total} <span class="muted">(L ${h.ls} · R ${h.rs})</span></span>`).join('')}</div></div>` : ''}
      <button class="btn primary lg block" id="tGo" style="margin-top:1.1rem">${t('Bắt đầu làm bài')} →</button></div></div>`;
    $('#tTest').onclick = () => UI.tts('This is a sound check. If you can hear this clearly, you are ready.', 'en-US');
    $('#tGo').onclick = () => lPart(0);
  };
})();
