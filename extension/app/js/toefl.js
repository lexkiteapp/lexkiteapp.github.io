/* Luyện thi TOEFL iBT theo định dạng mới (áp dụng từ 21/01/2026): 4 kỹ năng, 12 dạng bài, thang band 1–6 (kèm 0–120 trong giai đoạn chuyển tiếp).
 * Dữ liệu: js/toefl/data1.js (tự biên soạn). Dùng chung bộ câu hỏi (qengine.js), trình phát nhiều giọng (listening.js),
 * nhận dạng/ghi âm (UI.recognize) và chấm AI tùy chọn (ai.js). Điểm ước tính chỉ để tham khảo, không tương đương điểm chính thức của ETS. */
(function () {
  const { $, $$, esc, toast } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  const D = () => window.TOEFL || { reading: [], listening: [], writing: [], speaking: [] };

  // Dạng bài: tên chính thức (tiếng Anh, giữ nguyên như đề thi) + mô tả
  const SECTIONS = [
    { key: 'reading', ic: '📖', name: 'Reading', mins: 30, items: 50, tasks: ['cw', 'daily', 'academic'] },
    { key: 'listening', ic: '🎧', name: 'Listening', mins: 29, items: 47, tasks: ['response', 'conversation', 'announcement', 'talk'] },
    { key: 'writing', ic: '✍️', name: 'Writing', mins: 23, items: 12, tasks: ['sentence', 'email', 'discussion'] },
    { key: 'speaking', ic: '🗣️', name: 'Speaking', mins: 8, items: 11, tasks: ['repeat', 'interview'] },
  ];
  const TASKS = {
    cw: { name: 'Complete the Words', ic: '🔤', get desc() { return t('Điền các chữ cái còn thiếu để hoàn thành từ trong một đoạn văn học thuật ngắn.'); } },
    daily: { name: 'Read in Daily Life', ic: '📰', get desc() { return t('Đọc thông báo, email, tờ rơi, tin nhắn đời thường và trả lời câu hỏi trắc nghiệm.'); } },
    academic: { name: 'Read an Academic Passage', ic: '🎓', get desc() { return t('Đọc bài học thuật; câu hỏi chi tiết, phủ định, suy luận, từ vựng trong ngữ cảnh và mục đích tu từ.'); } },
    response: { name: 'Listen and Choose a Response', ic: '💬', get desc() { return t('Nghe một câu nói ngắn và chọn câu đáp phù hợp nhất.'); } },
    conversation: { name: 'Listen to a Conversation', ic: '👥', get desc() { return t('Nghe hội thoại trong môi trường đại học và trả lời câu hỏi.'); } },
    announcement: { name: 'Listen to an Announcement', ic: '📢', get desc() { return t('Nghe thông báo trong khuôn viên trường hoặc lớp học.'); } },
    talk: { name: 'Listen to an Academic Talk', ic: '🧑‍🏫', get desc() { return t('Nghe bài giảng ngắn; câu hỏi ý chính, chi tiết, mục đích và suy luận.'); } },
    sentence: { name: 'Build a Sentence', ic: '🧩', get desc() { return t('Sắp xếp các cụm từ thành câu trả lời đúng ngữ pháp.'); } },
    email: { name: 'Write an Email', ic: '📧', get desc() { return t('Viết email theo tình huống, đủ các ý đề yêu cầu (khoảng 7 phút).'); } },
    discussion: { name: 'Write for an Academic Discussion', ic: '🗨️', get desc() { return t('Viết bài đóng góp ý kiến vào thảo luận trên diễn đàn lớp học (khoảng 10 phút).'); } },
    repeat: { name: 'Listen and Repeat', ic: '🔁', get desc() { return t('Nghe và nhắc lại chính xác từng câu, từ ngắn đến dài.'); } },
    interview: { name: 'Take an Interview', ic: '🎙️', get desc() { return t('Trả lời các câu hỏi phỏng vấn, khoảng 45 giây mỗi câu.'); } },
  };
  const secOf = task => SECTIONS.find(s => s.tasks.includes(task));
  const unitsOf = task => { const s = secOf(task); return s ? D()[s.key].filter(u => u.task === task) : []; };
  const nItems = u => u.groups ? u.groups.reduce((a, g) => a + g.items.length, 0)
    : u.task === 'cw' ? (u.text.match(/\{[^}]*\}/g) || []).length
      : u.items ? u.items.length : u.sentences ? u.sentences.length : u.questions ? u.questions.length : 1;
  const countTask = task => unitsOf(task).reduce((a, u) => a + nItems(u), 0);
  const unitWord = (task, n) => /^(email|discussion)$/.test(task) ? t('{n} đề', { n }) : task === 'repeat' ? t('{n} câu nhắc lại', { n }) : task === 'interview' ? t('{n} câu hỏi phỏng vấn', { n }) : t('{n} câu', { n });

  // Band ước tính từ tỉ lệ đúng (tham khảo nội bộ, KHÔNG phải bảng quy đổi của ETS)
  const BAND = [[0.95, 6], [0.87, 5.5], [0.78, 5], [0.68, 4.5], [0.58, 4], [0.48, 3.5], [0.38, 3], [0.28, 2.5], [0.18, 2], [0.08, 1.5], [0, 1]];
  const bandEst = pct => (BAND.find(([m]) => pct >= m) || [0, 1])[1];
  const best = () => (state.game && state.game.toeflBest) || {};
  async function saveBest(task, pct) {
    if (!window.Game || !Game.mutate) return;
    try { state.game = await Game.mutate(gs => { const b = gs.toeflBest = gs.toeflBest || {}; b[task] = Math.max(b[task] || 0, Math.round(pct * 100)); }); } catch (e) { /* bỏ qua */ }
  }

  // ================= TRANG TỔNG QUAN =================
  routes.toefl = function () {
    const b = best();
    view.innerHTML = `
      <div class="page-head"><div><h1>🎓 ${t('Luyện thi TOEFL iBT')}</h1><p class="muted">${t('Luyện 12 dạng bài của đề TOEFL iBT định dạng mới: Reading, Listening, Writing, Speaking. Đề tự biên soạn, có giải thích tiếng Việt cho từng câu.')}</p></div></div>
      <div class="grid g2">
        <div class="card hero-main" style="background:linear-gradient(135deg,#0F3D3E,#1F7A72)">
          <h2 style="color:#fff;margin:0">🆕 ${t('Định dạng mới từ 21/01/2026')}</h2>
          <ul style="color:#ede9fe;margin:.5rem 0 0;padding-left:1.1rem;line-height:1.7" class="small">
            <li>${t('Bài thi ngắn hơn (khoảng 1,5 giờ) và <b>thích ứng</b>: độ khó thay đổi theo câu trả lời của bạn.')}</li>
            <li>${t('Điểm mỗi kỹ năng và điểm tổng theo <b>thang band 1–6</b> (bước 0,5); điểm tổng là trung bình 4 kỹ năng.')}</li>
            <li>${t('Trong giai đoạn chuyển tiếp, phiếu điểm vẫn ghi thêm điểm tương đương <b>thang 0–120</b>.')}</li>
          </ul>
        </div>
        <div class="card">
          <h3 style="margin-top:0">🗂️ ${t('Cấu trúc đề')}</h3>
          <table class="tx-table"><thead><tr><th>${t('Phần')}</th><th>${t('Số câu')}</th><th>${t('Thời gian')}</th></tr></thead><tbody>
            ${SECTIONS.map(s => `<tr><td>${s.ic} ${s.name}</td><td>~${s.items}</td><td class="muted">${t('khoảng {m} phút', { m: s.mins })}</td></tr>`).join('')}
          </tbody></table>
          <div class="tiny muted">${t('Số câu và thời gian là con số tham khảo do ETS công bố; vì đề thích ứng nên có thể thay đổi.')}</div>
        </div>
      </div>
      ${SECTIONS.map(s => `<h2 style="margin-top:1.4rem">${s.ic} ${s.name}</h2>
        <div class="grid auto">${s.tasks.map(k => { const T = TASKS[k], n = countTask(k); return `<div class="card"><span class="chip">${T.ic} ${s.name}</span>${b[k] != null ? ` <span class="chip ok">🏆 ${b[k]}%</span>` : ''}
          <h3 style="margin:.5rem 0 .2rem">${esc(T.name)}</h3><div class="small muted">${T.desc}</div><div class="tiny muted" style="margin-top:.3rem">${n ? esc(unitWord(k, n)) : t('Đang cập nhật.')}</div>
          <div class="row" style="margin-top:.6rem"><a class="btn sm primary" href="#/toefl-p/${k}">🎯 ${t('Luyện tập')}</a></div></div>`; }).join('')}</div>`).join('')}
      <div class="card" style="margin-top:1.2rem"><h3 style="margin-top:0">📏 ${t('Về điểm số trong ứng dụng')}</h3>
        <p class="small" style="margin:.2rem 0">${t('Sau mỗi bài trắc nghiệm, ứng dụng hiển thị tỉ lệ đúng và một <b>band ước tính</b> (1–6) để bạn theo dõi tiến bộ. Đây là quy đổi tuyến tính trên bộ đề tự biên soạn – <b>không phải</b> thang điểm chính thức và không tương đương điểm thi thật của ETS.')}</p>
        <p class="small muted" style="margin:.2rem 0">${t('Writing và Speaking: tự đối chiếu với bài mẫu và checklist; có thể nhờ AI nhận xét bài viết (tùy chọn).')}</p></div>
      <div class="card"><h3 style="margin-top:0">💡 ${t('Chiến lược TOEFL')}</h3><ul class="small" style="line-height:1.8;padding-left:1.1rem">
        <li>${t('<b>Complete the Words:</b> đọc cả câu trước khi điền – loại từ, thì và số ít/số nhiều thường quyết định đáp án.')}</li>
        <li>${t('<b>Academic Passage:</b> câu hỏi đi theo thứ tự đoạn văn; với câu NOT/EXCEPT, loại dần các ý có trong bài.')}</li>
        <li>${t('<b>Listening:</b> ghi chú từ khóa, chú ý từ nối (however, so, actually) – đáp án thường nằm ngay sau chúng.')}</li>
        <li>${t('<b>Writing:</b> email cần đủ mọi ý đề yêu cầu; bài thảo luận cần ý MỚI, không chỉ nhắc lại ý bạn khác.')}</li>
        <li>${t('<b>Speaking:</b> Listen and Repeat chấm độ chính xác; Interview cần trả lời trực tiếp, có lý do và ví dụ.')}</li></ul></div>`;
  };

  // ================= TIỆN ÍCH CHUNG =================
  const explainMark = (root, groups) => groups.forEach(g => g.items.forEach(it => { const el = $(`[data-item="${it.n}"] .lq-fb`, root); if (el && it.explain) el.insertAdjacentHTML('beforeend', `<div class="tiny muted" style="margin-top:.2rem">💡 ${esc(QE.exT(it.explain))}</div>`); }));
  const resultHtml = (right, total, objective = true) => {
    const pct = total ? right / total : 0;
    return `<div class="feedback ${pct >= 0.7 ? 'ok' : 'no'}" style="position:static"><b>${t('{a}/{b} câu đúng', { a: right, b: total })} (${Math.round(pct * 100)}%)</b>${objective ? ` · ${t('band ước tính ≈ {b}', { b: bandEst(pct) })}` : ''} · ${t('câu sai đã vào Sổ lỗi sai')}
      <div class="tiny muted" style="margin-top:.3rem">${t('Ước tính tham khảo trên đề tự biên soạn, không phải điểm chính thức của ETS.')}</div></div>`;
  };
  const log = (kind, task, n, q, answer, given, explain) => { if (App.logMistake) App.logMistake({ kind, q: `TOEFL · ${TASKS[task].name} · ${n}: ${q || ''}`, answer, given: given || I18N.tk('(bỏ trống)'), explain: explain || '', ref: '' }); };
  const wc = s => (String(s).match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) || []).length;
  const mmss = s => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, '0')}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
  const store = { get: k => { try { return localStorage.getItem('vb.toefl.' + k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { localStorage.setItem('vb.toefl.' + k, v); } catch (e) { /* bỏ qua */ } } };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  // Ghi âm đơn giản (MediaRecorder) – bản ghi chỉ giữ trong bộ nhớ, rời trang là xóa
  const rec = { stream: null, media: null, timer: null };
  function stopRec() { clearInterval(rec.timer); rec.timer = null; try { if (rec.media && rec.media.state !== 'inactive') rec.media.stop(); else if (rec.stream) rec.stream.getTracks().forEach(x => x.stop()); } catch (e) { /* đã dừng */ } }
  async function record(seconds, onTick, onDone) {
    if (!navigator.mediaDevices || !window.MediaRecorder) { toast(t('Trình duyệt không hỗ trợ ghi âm.')); return false; }
    try { rec.stream = await navigator.mediaDevices.getUserMedia({ audio: { autoGainControl: true, noiseSuppression: true, echoCancellation: true } }); } catch (e) { toast(t('Cần cho phép dùng micro để ghi âm.')); return false; }
    const chunks = [], media = rec.media = new MediaRecorder(rec.stream), stream = rec.stream;
    media.ondataavailable = e => e.data.size && chunks.push(e.data);
    media.onstop = () => { stream.getTracks().forEach(x => x.stop()); onDone(chunks.length ? UI.recUrl(new Blob(chunks, { type: media.mimeType || 'audio/webm' }), 'toefl') : ''); };
    media.start();
    let left = seconds; onTick(left);
    rec.timer = setInterval(() => { left--; onTick(left); if (left <= 0) stopRec(); }, 1000);
    return true;
  }

  // ================= LUYỆN TỪNG DẠNG BÀI =================
  routes['toefl-p'] = function (task, query) {
    if (!TASKS[task]) return routes.toefl();
    const sec = secOf(task), T = TASKS[task], all = unitsOf(task);
    // Nhiều bộ đề: dạng làm cả trang (đọc/nghe/sắp câu) hiện từng bộ một qua tab, chấm riêng – trang không quá dài
    const sets = [...new Set(all.map(u => u.set || 1))].sort((a, b) => a - b), perPage = !['email', 'discussion', 'repeat', 'interview'].includes(task);
    const cur = sets.includes(+((query && query.get && query.get('s')) || 0)) ? +query.get('s') : sets[0];
    const units = perPage && sets.length > 1 ? all.filter(u => (u.set || 1) === cur) : all;
    const players = [], timers = [];
    App.cleanup = () => { players.forEach(p => p && p.stop()); timers.forEach(clearInterval); stopRec(); UI.stopSpeak(); if (UI.stopRecognize) UI.stopRecognize(); };
    view.innerHTML = `<a href="#/toefl" class="small">← TOEFL iBT</a>
      <div class="page-head" style="margin-top:.4rem"><div><div class="tiny muted">${sec.ic} ${sec.name}</div><h1 style="margin:.2rem 0">${T.ic} ${esc(T.name)}</h1><p class="muted small" style="margin:0">${T.desc}</p></div></div>
      <div class="row" style="margin-bottom:1rem">${sec.tasks.map(k => `<a class="btn sm ${k === task ? 'primary' : ''}" href="#/toefl-p/${k}">${TASKS[k].ic} ${esc(TASKS[k].name)}</a>`).join('')}</div>
      ${perPage && sets.length > 1 ? `<div class="tabs" style="display:inline-flex;margin-bottom:1rem">${sets.map(n => `<a class="${n === cur ? 'on' : ''}" href="#/toefl-p/${task}?s=${n}" style="padding:.45rem .9rem;border-radius:10px;font-weight:700;text-decoration:none;color:inherit;${n === cur ? 'background:var(--surface);box-shadow:var(--shadow-sm)' : ''}">${t('Bộ {n}', { n })}</a>`).join('')}</div>` : ''}
      <div id="tfBody"></div>`;
    const body = $('#tfBody');
    if (!units.length) { body.innerHTML = `<div class="card muted">${t('Đang cập nhật.')}</div>`; return; }
    const fn = { cw: practiceCW, sentence: practiceSentence, email: practiceWriting, discussion: practiceWriting, repeat: practiceRepeat, interview: practiceInterview }[task] || practiceQE;
    fn({ task, units, body, players, timers, query });
  };

  // ---------- Reading · Complete the Words ----------
  function practiceCW({ task, units, body }) {
    const ans = [];
    body.innerHTML = `${units.map((u, ui) => {
      let k = 0;
      const html = esc(u.text).replace(/\{([^|}]*)\|([^}]*)\}/g, (m, pre, miss) => { k++; ans.push({ ui, k, pre, miss, explain: QE.exT((u.explain || [])[k - 1] || '') });
        return `<span style="white-space:nowrap">${pre}<input class="gap" data-cw="${ans.length - 1}" style="width:${miss.length + 1.6}ch;min-width:0;padding:0 .15rem;margin:0" maxlength="${pre.length + miss.length}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${esc(t('Ô trống {n}', { n: k }))}"></span>`; });
      return `<div class="card toeic-u" data-u="${ui}"><div><b>${esc(u.title)}</b><div class="lq-instr" style="margin-top:.5rem"><i>${esc(u.instr || '')}</i></div><div style="line-height:2.3;font-size:1.02rem">${html}</div><div data-cwfb></div></div></div>`;
    }).join('')}
      <div class="row" style="margin-top:1rem"><button class="btn primary" id="tSub">✅ ${t('Nộp bài & xem giải thích')}</button></div><div id="tRes" style="margin-top:1rem"></div>`;
    const inputs = $$('input[data-cw]', body);
    inputs.forEach((inp, k) => inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (inputs[k + 1]) inputs[k + 1].focus(); } }));
    $('#tSub').onclick = async () => {
      let right = 0;
      const rows = {};
      ans.forEach((a, i) => {
        const inp = $(`input[data-cw="${i}"]`, body), v = inp.value.trim().toLowerCase(), full = (a.pre + a.miss).toLowerCase();
        const ok = v === a.miss.toLowerCase() || v === full;
        if (ok) right++; else log('reading', task, `${units[a.ui].title} #${a.k}`, '', a.pre + a.miss, v ? a.pre + v : '', a.explain);
        inp.classList.add(ok ? 'ok' : 'no'); inp.disabled = true;
        (rows[a.ui] = rows[a.ui] || []).push(`<div class="lq-item ${ok ? 'ok' : 'no'}"><span class="qn">${a.k}</span> ${ok ? '✅' : '❌'} <b>${esc(a.pre)}<u>${esc(a.miss)}</u></b>${!ok && v ? ` <span class="tiny muted">${t('(bạn: {a})', { a: esc(a.pre + v) })}</span>` : ''}<div class="tiny muted">💡 ${esc(a.explain)}</div></div>`);
      });
      Object.entries(rows).forEach(([ui, r]) => { $(`.toeic-u[data-u="${ui}"] [data-cwfb]`, body).innerHTML = `<div class="lq-group" style="margin-top:.8rem">${r.join('')}</div>`; });
      $('#tSub').disabled = true;
      await finish(task, right, ans.length, 'readings');
    };
  }

  async function finish(task, right, total, stat) {
    await App.reward({ quizzes: 1, [stat]: 1, xp: 10 + right * 2 });
    await saveBest(task, total ? right / total : 0);
    const r = $('#tRes'); if (!r) return;
    r.innerHTML = resultHtml(right, total);
    r.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---------- Reading (Daily Life, Academic) & Listening: trắc nghiệm qua qengine ----------
  function practiceQE({ task, units, body, players }) {
    const listening = secOf(task).key === 'listening';
    const passHtml = u => {
      if (!u.text) return '';
      const paras = u.task === 'academic' ? u.text.split(/\n\n/).map((p, i) => `<p style="margin:0 0 .7rem"><b class="muted">¶${i + 1}</b> ${esc(p)}</p>`).join('') : `<div style="white-space:pre-wrap">${esc(u.text)}</div>`;
      return `<div class="toeic-pass" style="${u.task === 'academic' ? 'position:sticky;top:.5rem;max-height:85vh;overflow:auto' : ''}"><b>${esc(u.title)}</b><div style="margin-top:.5rem">${paras}</div></div>`;
    };
    const scriptHtml = u => (u.script || []).filter(l => l.pause == null).map(l => l.say ? `<div class="small muted"><i>${esc(l.say)}</i></div>` : `<div class="small" style="margin:.2rem 0"><b>${esc((u.speakers[l.s] || { name: l.s }).name)}:</b> ${esc(l.t)}</div>`).join('');
    const playerHtml = (u, k) => `<div><div class="row between"><b>${esc(u.title)}</b><div class="row nowrap"><button class="btn sm primary" data-play="${k}">▶ ${t('Nghe')}</button><button class="btn sm" data-stop="${k}">⏹ ${t('Dừng')}</button></div></div>
      <div class="tiny muted" data-now="${k}" style="margin-top:.3rem">${t('Bấm Nghe để phát bài (giọng đọc máy). Ở bài thi thật, bạn chỉ được nghe 1 lần.')}</div></div>`;
    body.innerHTML = `<div id="tq">${units.map((u, k) => `<div class="card toeic-u" data-u="${k}">${listening ? playerHtml(u, k) : passHtml(u)}<div class="toeic-q">${QE.questionsHtml({ groups: u.groups })}</div>
      ${listening ? `<details data-tr="${k}" hidden><summary class="small"><b>📜 ${t('Lời thoại (transcript)')}</b></summary><div style="margin-top:.4rem">${scriptHtml(u)}</div></details>` : ''}</div>`).join('')}</div>
      <div class="row" style="margin-top:1rem"><button class="btn primary" id="tSub">✅ ${t('Nộp bài & xem giải thích')}</button></div><div id="tRes" style="margin-top:1rem"></div>`;
    QE.bind($('#tq'));
    if (listening) {
      const canPlay = App.listening && App.listening.Player;
      units.forEach((u, k) => {
        const now = $(`[data-now="${k}"]`, body);
        const btn = $(`[data-play="${k}"]`, body);
        if (!canPlay) { btn.disabled = true; now.textContent = t('Trình phát chưa sẵn sàng – hãy tải lại trang.'); return; }
        players[k] = App.listening.Player(u, {
          onLine: i => { const l = u.script[i]; if (now && l && (l.t || l.say)) now.textContent = l.say ? '🔈 ' + t('Lời dẫn') : '🔊 ' + ((u.speakers[l.s] || {}).name || ''); },
          onState: on => { btn.textContent = on ? '⏸ ' + t('Tạm dừng') : '▶ ' + t('Nghe'); },
          onEnd: () => { if (now) now.textContent = '✓ ' + t('Đã nghe xong'); btn.textContent = '↻ ' + t('Nghe lại'); },
        });
        btn.onclick = () => { const p = players[k]; if (p.playing) return p.pause(); players.forEach((x, j) => j !== k && x && x.stop()); p.play(p.pos > 0 && p.pos < u.script.length ? undefined : 0); };
        $(`[data-stop="${k}"]`, body).onclick = () => players[k].stop();
      });
    }
    $('#tSub').onclick = async () => {
      let right = 0, total = 0;
      players.forEach(p => p && p.stop());
      units.forEach((u, k) => {
        const root = $(`.toeic-u[data-u="${k}"]`, body), res = QE.collect({ groups: u.groups }, root);
        QE.mark(root, res); explainMark(root, u.groups);
        const tr = $(`[data-tr="${k}"]`, root); if (tr) tr.hidden = false;
        Object.entries(res).forEach(([n, r]) => { total++; if (r.ok) right++; else log(listening ? 'listening' : 'reading', task, n, r.q, r.answer, r.given, QE.exT((u.groups.flatMap(g => g.items).find(i => i.n === +n) || {}).explain)); });
      });
      $('#tSub').disabled = true;
      await finish(task, right, total, listening ? 'listens' : 'readings');
    };
  }

  // ---------- Writing · Build a Sentence ----------
  // Xáo trộn cố định theo số câu (mỗi lần mở giống nhau, luôn khác thứ tự đúng)
  const seeded = (n, len) => {
    let s = n * 9301 + 49297; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let tries = 0; tries < 20; tries++) {
      const a = [...Array(len).keys()]; for (let i = len - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      if (a.some((x, i) => x !== i)) return a;
    }
    return [...Array(len).keys()].reverse();
  };
  function practiceSentence({ task, units, body }) {
    const items = units.flatMap(u => u.items);
    body.innerHTML = `<div class="card"><div class="lq-instr"><i>${esc(units[0].instr || '')}</i><br><span class="tiny">${t('Bấm cụm từ để đưa vào câu; bấm lại để bỏ ra.')}</span></div>
      ${items.map(it => `<div class="lq-item" data-bs="${it.n}" style="margin-bottom:.6rem"><div><span class="qn">${it.n}</span> <i>“${esc(it.prompt)}”</i></div>
        <div class="row" style="align-items:center;gap:.3rem;margin:.4rem 0 .3rem 2.2rem"><div data-ans style="flex:1;min-height:2.5rem;border:2px dashed var(--line);border-radius:10px;padding:.3rem;display:flex;flex-wrap:wrap;gap:.3rem;align-items:center">${it.starter ? `<span class="muted">${esc(it.starter)}</span>` : ''}</div><b>${esc(it.end || '.')}</b></div>
        <div data-bank class="row" style="gap:.3rem;margin-left:2.2rem">${seeded(it.n, it.chunks.length).map(i => `<button class="btn sm" data-c="${i}">${esc(it.chunks[i])}</button>`).join('')}</div>
        <div class="lq-fb" hidden></div></div>`).join('')}</div>
      <div class="row" style="margin-top:1rem"><button class="btn primary" id="tSub">✅ ${t('Nộp bài & xem giải thích')}</button><button class="btn ghost" id="tReset">↺ ${t('Làm lại')}</button></div><div id="tRes" style="margin-top:1rem"></div>`;
    body.addEventListener('click', e => {
      const b = e.target.closest('button[data-c]'); if (!b || b.disabled) return;
      const item = b.closest('[data-bs]'), ans = $('[data-ans]', item), bank = $('[data-bank]', item);
      (b.parentElement === ans ? bank : ans).appendChild(b);
    });
    $('#tReset').onclick = () => routes['toefl-p'](task, query);
    $('#tSub').onclick = async () => {
      let right = 0;
      items.forEach(it => {
        const item = $(`[data-bs="${it.n}"]`, body), given = $$('[data-ans] button', item).map(b => b.textContent).join(' ');
        const correct = it.chunks.join(' '), ok = [correct, ...(it.alt || [])].some(x => x.toLowerCase() === given.toLowerCase());
        const sentence = (it.starter ? it.starter + ' ' : '') + (!it.starter || /[.!?]$/.test(it.starter) ? cap(correct) : correct) + (it.end || '.');
        if (ok) right++; else log('grammar', task, it.n, it.prompt, sentence, given, QE.exT(it.explain));
        item.classList.add(ok ? 'ok' : 'no');
        $$('button', item).forEach(b => { b.disabled = true; });
        const fb = $('.lq-fb', item); fb.hidden = false;
        fb.innerHTML = `${ok ? '✅' : '❌'} ${t('Đáp án: <b>{a}</b>', { a: esc(sentence) })}<div class="tiny muted" style="margin-top:.2rem">💡 ${esc(QE.exT(it.explain))}</div>`;
      });
      $('#tSub').disabled = true;
      await finish(task, right, items.length, 'quizzes');
    };
  }

  // ---------- Writing · Email & Academic Discussion ----------
  // Lời dẫn đề thi giữ tiếng Anh như đề thật (nội dung bài thi, không phải giao diện)
  const DIRECTIONS = {
    email: 'Write an email to {to}. In your email, do the following:',
    discussion: 'Your professor has posted a question to the class discussion board. Write a post that states and supports your opinion and adds something new to the discussion. Aim for at least 100 words.',
  };
  const taskText = u => u.task === 'email'
    ? `${u.scenario}\n${DIRECTIONS.email.replace('{to}', u.to)}\n${u.points.map(p => '- ' + p).join('\n')}`
    : `${DIRECTIONS.discussion}\n${u.professor.name}: ${u.professor.text}\n${u.students.map(s => s.name + ': ' + s.text).join('\n')}`;
  function practiceWriting({ task, units, body, timers, query }) {
    const i = Math.min(units.length - 1, Math.max(0, +(query && query.get('i')) || 0)), u = units[i];
    const prompt = u.task === 'email'
      ? `<div class="toeic-pass"><div>${esc(u.scenario)}</div><div style="margin-top:.6rem"><b>${esc(DIRECTIONS.email.replace('{to}', u.to))}</b></div><ul style="margin:.3rem 0 0;padding-left:1.2rem">${u.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>`
      : `<div class="toeic-pass"><div class="small"><i>${esc(DIRECTIONS.discussion)}</i></div>
          <div style="margin-top:.7rem"><b>👩‍🏫 ${esc(u.professor.name)}</b><div>${esc(u.professor.text)}</div></div>
          ${u.students.map(s => `<div style="margin-top:.6rem;padding-left:.8rem;border-left:3px solid var(--line)"><b>🧑‍🎓 ${esc(s.name)}</b><div>${esc(s.text)}</div></div>`).join('')}</div>`;
    const key = u.id, minW = u.task === 'email' ? 80 : 100;
    body.innerHTML = `<div class="row" style="margin-bottom:.8rem">${units.map((x, k) => `<a class="chip ${k === i ? 'lv' : ''}" href="#/toefl-p/${task}?i=${k}">${esc(t('Đề {n}', { n: k + 1 }))} · ${esc(x.title)}</a>`).join('')}</div>
      <div class="grid g2" style="align-items:start">
        <div>${prompt}</div>
        <div class="card" style="margin:0">
          <div class="row between"><span class="small muted" id="wCnt"></span><span class="mk-clock timer" id="wClock">${mmss(u.minutes * 60)}</span></div>
          <textarea class="input" id="wTxt" style="min-height:300px;font-size:1.02rem;line-height:1.7;margin-top:.5rem" spellcheck="false" placeholder="${esc(t('Bắt đầu viết bài của bạn…'))}"></textarea>
          <div class="tiny muted" style="margin-top:.3rem">${t('Đồng hồ ({m} phút) chạy khi bạn bắt đầu gõ. Bài nháp được lưu trên trình duyệt này.', { m: u.minutes })}</div>
          <div class="row" style="margin-top:.7rem"><button class="btn primary" id="wModel">📝 ${t('Xem bài mẫu & checklist')}</button>${window.AI ? `<button class="btn" id="wAI">🤖 ${t('Nhận xét bằng AI')}</button>` : ''}</div>
        </div>
      </div>
      <div id="wOut" style="margin-top:1rem"></div><div id="wAIOut"></div>`;
    const ta = $('#wTxt'); ta.value = store.get(key);
    let left = u.minutes * 60, started = false, rewarded = false;
    const paint = () => { const n = wc(ta.value); $('#wCnt').innerHTML = t('{n} từ', { n }) + (n && n < minW ? ` · <span style="color:var(--again-text)">${t('nên viết ≥ {m} từ', { m: minW })}</span>` : ''); };
    ta.addEventListener('input', () => {
      store.set(key, ta.value); paint();
      if (started) return; started = true;
      timers.push(setInterval(() => { left--; const c = $('#wClock'); if (!c) return; c.textContent = left > 0 ? mmss(left) : '⏰ ' + t('Hết giờ'); c.classList.toggle('warn', left < 60); }, 1000));
    });
    paint();
    $('#wModel').onclick = () => {
      $('#wOut').innerHTML = `<div class="grid g2" style="align-items:start">
        <div class="card" style="margin:0"><h3 style="margin-top:0">📝 ${t('Bài mẫu')}</h3><div style="white-space:pre-wrap;line-height:1.7">${esc(u.model)}</div><div class="tiny muted" style="margin-top:.4rem">${t('{n} từ', { n: wc(u.model) })}</div></div>
        <div class="card" style="margin:0"><h3 style="margin-top:0">✅ ${t('Tự kiểm tra bài của bạn')}</h3>${u.checklist.map((c, k) => `<label class="small" style="display:flex;gap:.45rem;align-items:flex-start;margin:.35rem 0;cursor:pointer"><input type="checkbox" data-ck="${k}"> <span>${esc(c)}</span></label>`).join('')}
          <div class="small" id="ckRes" style="margin-top:.4rem"></div><div class="tip small" style="margin-top:.6rem">💡 ${esc(u.tips)}</div></div></div>${u.mid ? `
        <div class="card" style="margin:1rem 0 0"><h3 style="margin-top:0">📄 ${t('Bài mức trung bình')}</h3><div style="white-space:pre-wrap;line-height:1.7">${esc(u.mid)}</div><div class="tiny muted" style="margin-top:.4rem">${t('{n} từ', { n: wc(u.mid) })}</div>
          ${u.midNote ? `<div class="tip small" style="margin-top:.6rem">🔍 <b>${t('Vì sao kém hơn bài mẫu')}:</b> ${esc(u.midNote)}</div>` : ''}</div>` : ''}${u.outline ? `
        <div class="card" style="margin:1rem 0 0"><h3 style="margin-top:0">🧭 ${t('Dàn ý')}</h3><ol class="small" style="margin:.2rem 0 0;padding-left:1.3rem;line-height:1.7">${u.outline.map(o => `<li>${esc(o)}</li>`).join('')}</ol></div>` : ''}${u.vocab ? `
        <div class="card" style="margin:1rem 0 0"><h3 style="margin-top:0">🔤 ${t('Từ nên dùng')}</h3><div>${u.vocab.map(v => `<span class="chip" style="white-space:normal;max-width:100%;color:inherit">${esc(v)}</span>`).join('')}</div></div>` : ''}`;
      const upd = () => { const a = $$('[data-ck]:checked').length, b = u.checklist.length; $('#ckRes').innerHTML = `<b>${t('Đạt {a}/{b} tiêu chí', { a, b })}</b>`; };
      $$('[data-ck]').forEach(x => x.onchange = upd); upd();
      if (!rewarded && wc(ta.value) >= minW) { rewarded = true; App.reward({ xp: 10 }); }
      $('#wOut').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const ai = $('#wAI');
    if (ai) ai.onclick = async function go() {
      const text = ta.value.trim(), n = wc(text);
      if (n < 30) return toast(t('Bài quá ngắn để AI nhận xét (cần ≥ 30 từ)'));
      if (!(await AI.getKey())) { const st = await AI.nanoStatus(); if (st === 'none' || st === 'unavailable') return AI.keyDialog(go); }
      const out = $('#wAIOut'); ai.disabled = true;
      out.innerHTML = `<div class="card small muted">⏳ ${t('AI đang đọc bài (10–30 giây)…')}</div>`;
      try {
        const r = await AI.ask(`This request is about the TOEFL iBT (2026 format), NOT IELTS – ignore IELTS band descriptors. Act as an experienced TOEFL writing rater.
Task type: ${u.task === 'email' ? 'Write an Email' : 'Write for an Academic Discussion'}.
Task:\n"""${taskText(u)}"""\nCandidate's response (${n} words):\n"""${text}"""\n
Return ONLY JSON: {"score": number (holistic task score on a 0-5 scale, may use .5), "summary": string (Vietnamese, 2-3 sentences), "strengths": [string] (Vietnamese, 2-3 items), "improvements": [string] (Vietnamese, 3-5 concrete actions), "errors": [{"quote": string (exact learner text), "fix": string (corrected English), "why": string (Vietnamese)}] (up to 6)}`);
        out.innerHTML = `<div class="card ai-box"><div class="row between"><b>🤖 ${t('Nhận xét của AI')}</b>${r.score != null ? `<span class="chip lv">${t('Điểm bài: {s}/5', { s: esc(r.score) })}</span>` : ''}</div>
          ${r.summary ? `<p class="small">${esc(r.summary)}</p>` : ''}
          ${(r.strengths || []).length ? `<div class="small"><b>👍 ${t('Điểm mạnh')}</b><ul>${r.strengths.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
          ${(r.improvements || []).length ? `<div class="small"><b>🎯 ${t('Cần cải thiện')}</b><ul>${r.improvements.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
          ${(r.errors || []).length ? `<div class="small"><b>✏️ ${t('Lỗi cần sửa')}</b>${r.errors.map(x => `<div style="margin:.3rem 0">❌ <s>${esc(x.quote)}</s> → ✅ <b>${esc(x.fix)}</b><div class="tiny muted">${esc(x.why || '')}</div></div>`).join('')}</div>` : ''}
          <div class="tiny muted" style="margin-top:.4rem">${t('Nhận xét do AI tạo, chỉ để tham khảo – không phải điểm chính thức của ETS.')}</div></div>`;
        App.reward({ xp: 5 });
      } catch (e) {
        out.innerHTML = `<div class="card small">❌ ${esc(AI.errText ? AI.errText(e) : e.message)} ${e.message === 'BAD_KEY' || e.message === 'NO_KEY' ? `<button class="btn sm" data-k>${t('Nhập khóa')}</button>` : ''}</div>`;
        const k = $('[data-k]', out); if (k) k.onclick = () => AI.keyDialog(go);
      }
      ai.disabled = false;
    };
  }

  // ---------- Speaking · Listen and Repeat ----------
  function practiceRepeat({ task, units, body, query }) {
    const i = Math.min(units.length - 1, Math.max(0, +(query && query.get('i')) || 0)), u = units[i], scores = {};
    const accent = u.accent || 'en-US';
    body.innerHTML = `<div class="row" style="margin-bottom:.8rem">${units.map((x, k) => `<a class="chip ${k === i ? 'lv' : ''}" href="#/toefl-p/${task}?i=${k}">${esc(t('Bộ {n}', { n: k + 1 }))} · ${esc(x.title)}</a>`).join('')}</div>
      <div class="card"><div class="lq-instr"><i>${esc(u.context)}</i><br><span class="tiny">${t('Bấm 🔊 để nghe, rồi 🎙️ để nhắc lại. Câu chữ được che để bạn luyện nghe – bấm 👁 nếu cần xem.')}</span></div>
        ${u.sentences.map((s, k) => `<div class="lq-item" data-rp="${k}"><div class="row between" style="align-items:center"><div style="flex:1;min-width:0"><span class="qn">${k + 1}</span> <span data-txt style="filter:blur(6px);transition:filter .2s">${esc(s.t)}</span></div>
          <div class="row nowrap" style="gap:.25rem"><button class="btn sm" data-l title="${esc(t('Nghe'))}">🔊</button><button class="btn sm" data-slow title="${esc(t('Nghe chậm'))}">🐢</button><button class="btn sm primary" data-r>🎙️ ${t('Nhắc lại')}</button><button class="btn sm ghost" data-show title="${esc(t('Hiện câu'))}">👁</button></div></div>
          <div class="lq-fb" hidden></div></div>`).join('')}
        <div id="tRes" style="margin-top:1rem"></div></div>`;
    $$('[data-rp]', body).forEach(row => {
      const k = +row.dataset.rp, s = u.sentences[k], fb = $('.lq-fb', row), txt = $('[data-txt]', row);
      $('[data-l]', row).onclick = () => UI.tts(s.t, accent, 0.95);
      $('[data-slow]', row).onclick = () => UI.tts(s.t, accent, 0.7);
      $('[data-show]', row).onclick = () => { txt.style.filter = txt.style.filter ? '' : 'blur(6px)'; };
      $('[data-r]', row).onclick = () => {
        fb.hidden = false; fb.textContent = '🔴 ' + t('Đang nghe…');
        UI.recognize(s.t, accent, {
          result: ({ heard, score, audio }) => {
            scores[k] = score; txt.style.filter = '';
            row.classList.remove('ok', 'no', 'half'); row.classList.add(score >= 85 ? 'ok' : score >= 60 ? 'half' : 'no');
            fb.innerHTML = `<b style="color:${score >= 85 ? 'var(--good)' : score >= 60 ? 'var(--hard)' : 'var(--again)'}">${t('{score}% giống mẫu', { score })}</b> · ${t('máy nghe: “{heard}”', { heard: esc(heard) })} ${audio ? `<audio controls src="${audio}" style="height:30px;vertical-align:middle"></audio>` : ''}<div class="tiny muted" style="margin-top:.2rem">💡 ${esc(s.tip)}</div>`;
            App.reward({ spoken: 1, xp: 2 });
            const done = Object.keys(scores).length;
            if (done === u.sentences.length) { const avg = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / done); $('#tRes').innerHTML = `<div class="feedback ${avg >= 80 ? 'ok' : 'no'}" style="position:static"><b>${t('Hoàn thành · trung bình {pct}% giống mẫu', { pct: avg })}</b><div class="tiny muted">${t('Độ giống do máy nhận dạng giọng nói ước tính – chỉ để tham khảo.')}</div></div>`; saveBest(task, avg / 100); }
          },
          error: e => { fb.textContent = UI.recErrorText ? UI.recErrorText(e) : t('Không nhận được giọng nói'); },
        });
      };
    });
  }

  // ---------- Speaking · Take an Interview ----------
  function practiceInterview({ task, units, body, query }) {
    const i = Math.min(units.length - 1, Math.max(0, +(query && query.get('i')) || 0)), u = units[i];
    const accent = u.accent || 'en-US', secs = u.seconds || 45;
    let qi = 0;
    const tabs = `<div class="row" style="margin-bottom:.8rem">${units.map((x, k) => `<a class="chip ${k === i ? 'lv' : ''}" href="#/toefl-p/${task}?i=${k}">${esc(t('Bộ {n}', { n: k + 1 }))} · ${esc(x.title)}</a>`).join('')}</div>`;
    const show = () => {
      stopRec(); UI.stopSpeak();
      const q = u.questions[qi];
      body.innerHTML = `${tabs}<div class="lq-instr"><i>${esc(u.context)}</i></div>
        <div class="card"><div class="row between"><span class="chip">${t('Câu {i}/{n}', { i: qi + 1, n: u.questions.length })}</span><button class="btn sm" id="ivHear">🔊 ${t('Nghe câu hỏi')}</button></div>
          <div style="font-size:1.2rem;font-weight:700;margin:.8rem 0">${esc(q.q)}</div>
          <div style="text-align:center"><div class="timer" id="ivClock" style="font-size:2.2rem">${mmss(secs)}</div>
            <div style="margin:1rem 0 .5rem"><button class="mic" id="ivRec" title="${esc(t('Bắt đầu / dừng ghi âm'))}">🎙️</button></div>
            <div class="small muted" id="ivHint">${t('Bấm micro để trả lời – tối đa {s} giây.', { s: secs })}</div><div id="ivAudio" style="margin-top:.6rem"></div></div>
          <details style="margin-top:.8rem"><summary class="small"><b>📝 ${t('Câu trả lời mẫu & mẹo')}</b> <span class="tiny muted">– ${t('xem sau khi đã tự trả lời')}</span></summary>
            <div style="margin-top:.5rem;line-height:1.7">${esc(q.model)} <button class="ctx-say sm" data-saysent="${esc(q.model)}">🔊</button></div><div class="tip small" style="margin-top:.5rem">💡 ${esc(q.tip)}</div></details>
          <div class="row" style="margin-top:1rem">${qi > 0 ? `<button class="btn ghost" id="ivPrev">← ${t('Câu trước')}</button>` : ''}${qi < u.questions.length - 1 ? `<button class="btn primary" id="ivNext">${t('Câu hỏi tiếp')} →</button>` : `<a class="btn primary" href="#/toefl">${t('Hoàn thành')} ✓</a>`}</div></div>`;
      const hear = () => UI.tts(q.q, accent, 0.95);
      $('#ivHear').onclick = hear; hear();
      const btn = $('#ivRec');
      btn.onclick = async () => {
        if (btn.classList.contains('rec')) return stopRec();
        UI.stopSpeak();
        const ok = await record(secs, left => { const c = $('#ivClock'); if (c) { c.textContent = mmss(left); c.classList.toggle('warn', left <= 10); } }, url => {
          btn.classList.remove('rec'); const h = $('#ivHint'); if (h) h.textContent = t('Đã ghi âm – nghe lại và so với câu trả lời mẫu.');
          const a = $('#ivAudio'); if (a && url) a.innerHTML = `<audio controls src="${url}"></audio>`;
          App.reward({ spoken: 1, xp: 5 });
        });
        if (ok) { btn.classList.add('rec'); $('#ivHint').textContent = '🔴 ' + t('Đang ghi âm – bấm lần nữa để dừng'); }
      };
      const p = $('#ivPrev'); if (p) p.onclick = () => { qi--; show(); };
      const n = $('#ivNext'); if (n) n.onclick = () => { qi++; show(); };
    };
    show();
  }
})();
