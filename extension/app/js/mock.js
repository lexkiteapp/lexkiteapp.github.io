/* Thi thử IELTS đủ 4 kỹ năng: Listening (~30′) → Reading (60′) → Writing (60′) → Speaking (~12′),
 * bấm giờ từng phần như thi thật, chấm điểm tự động và quy đổi band tổng (Overall). Lịch sử lưu trên máy. */
(function () {
  const { $, $$, esc, toast } = UI;
  const { Store } = Core;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  const RT = () => window.READTESTS || [];
  const round5 = x => Math.round(x * 2) / 2;
  const clock = s => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, '0')}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
  const SKILLS = [['listening', '🎧', 'Listening', t('~30 phút · 40 câu')], ['reading', '📖', 'Reading', t('60 phút · 40 câu')], ['writing', '✍️', 'Writing', t('60 phút · Task 1 + Task 2')], ['speaking', '🗣️', 'Speaking', t('~12 phút · 3 phần')]];
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // ================= CHẤM WRITING TASK 2 & SPEAKING (ước tính, tham khảo) =================
  const COMPLEX = /\b(which|who|whom|whose|although|though|whereas|while|unless|because|since|if|when|whether|so that|in order to|not only)\b/gi;
  function grammarRange(text) {
    const sents = (text.match(/[^.!?]+[.!?]+/g) || [text]).map(s => s.trim()).filter(Boolean);
    const lens = sents.map(s => (s.match(/[A-Za-z']+/g) || []).length);
    const avg = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);
    const sd = Math.sqrt(lens.reduce((a, b) => a + (b - avg) ** 2, 0) / Math.max(1, lens.length));
    const cx = (text.match(COMPLEX) || []).length / Math.max(1, sents.length);
    const passive = (text.match(/\b(is|are|was|were|be|been|being)\s+\w+(ed|en)\b/gi) || []).length;
    let g = 5;
    if (cx > 0.3) g += 0.5; if (cx > 0.6) g += 0.5; if (cx > 0.9) g += 0.5;
    if (sd > 5) g += 0.5; if (avg >= 14 && avg <= 30) g += 0.5; if (passive) g += 0.5;
    return { g: Math.min(8.5, g), avg, sd, cx };
  }
  function scoreTask2(text, p) {
    const a = Lexis.analyze(text), words = a.words;
    const paras = text.split(/\n\s*\n/).filter(x => x.trim()).length;
    const has = re => re.test(text);
    let tr = 5;
    if (words >= 250) tr += 1; if (has(/\b(I (strongly )?(believe|agree|disagree|would argue)|in my (opinion|view)|this essay will|I am convinced)\b/i)) tr += 0.5;
    if (has(/\b(in conclusion|to conclude|to sum up|overall,)\b/i)) tr += 0.5; if (has(/\b(for example|for instance|such as|a case in point)\b/i)) tr += 0.5;
    const cc = 5 + Math.min(1.5, a.link.size * 0.2) + (paras >= 4 ? 1 : paras >= 3 ? 0.5 : 0);
    const lr = a.band, gra = grammarRange(text).g;
    let band = round5((Math.min(8.5, tr) + Math.min(8.5, cc) + lr + gra) / 4);
    if (words < 150) band = Math.min(band, 5); else if (words < 250) band = Math.min(band, 6);
    const notes = [];
    if (words < 250) notes.push(t('Bài có {n} từ – Task 2 cần tối thiểu 250 từ.', { n: words }));
    if (paras < 4) notes.push(t('Chia 4–5 đoạn: mở bài, 2–3 thân bài, kết bài.'));
    if (a.link.size < 4) notes.push(t('Đa dạng từ nối hơn (However, Moreover, As a result…).'));
    if (a.overused.length) notes.push(t('Từ lặp nhiều: {list}.', { list: a.overused.slice(0, 4).map(([w, n]) => `${w} (${n})`).join(', ') }));
    return { band: Math.max(3, band), words, crit: { 'Task Response': round5(Math.min(8.5, tr)), 'Coherence & Cohesion': round5(Math.min(8.5, cc)), 'Lexical Resource': lr, 'Grammar': round5(gra) }, notes };
  }
  function scoreSpeaking(answers) {
    const text = answers.map(a => a.text).join(' ').trim();
    const secs = answers.reduce((a, b) => a + b.secs, 0);
    const words = (text.match(/[A-Za-z][A-Za-z'’-]*/g) || []).length;
    if (words < 15) return { band: 0, words, wpm: 0, notes: [t('Không nhận đủ lời nói để chấm – kiểm tra micro và dùng Chrome/Edge.')], crit: {} };
    const wpm = secs > 5 ? Math.round(words / (secs / 60)) : 0;
    const fillers = (text.match(/\b(um+|uh+|er+|erm|ah+|you know|i mean|like)\b/gi) || []).length;
    let fc = wpm >= 110 && wpm <= 175 ? 7 : wpm >= 90 ? 6 : wpm >= 70 ? 5 : 4.5;
    if (fillers / words > 0.05) fc -= 0.5; if (answers.some(a => a.part === 2 && a.secs >= 90)) fc += 0.5;
    const lr = Lexis.analyze(text).band, gra = grammarRange(text).g;
    let band = round5((Math.min(8.5, fc) + lr + gra) / 3);
    if (words < 150) band = Math.min(band, 5);
    const notes = [];
    if (wpm && wpm < 100) notes.push(t('Tốc độ {wpm} từ/phút – luyện nói liền mạch hơn (tự nhiên ~110–160).', { wpm }));
    if (fillers >= 4) notes.push(t("{n} từ đệm (um, uh, like…) – thay bằng “Let me think…”, “That's an interesting question”.", { n: fillers }));
    if (!answers.some(a => a.part === 2 && a.secs >= 90)) notes.push(t('Part 2 nên nói đủ 1,5–2 phút: kể theo trình tự, thêm chi tiết & cảm xúc.'));
    notes.push(t('Phát âm không chấm được tự động – nghe lại bản ghi để tự đánh giá.'));
    return { band: Math.max(3, band), words, wpm, crit: { 'Fluency & Coherence': round5(Math.min(8.5, fc)), 'Lexical Resource': lr, 'Grammar': round5(gra), 'Pronunciation': '—' }, notes };
  }

  // ================= TRANG CHÍNH =================
  routes.mock = async function (arg, query) {
    if (arg === 'run') return run(query);
    const hist = await Store.get('mocks', []);
    const lt = [...new Set((window.LISTENING || []).map(p => p.test))], rtA = RT().filter(x => !x.gt).map(x => x.test), rtG = RT().filter(x => x.gt).map(x => x.test), rt = [...rtA, ...rtG];
    view.innerHTML = `
      <div class="page-head"><div><h1>🏁 ${t('Thi thử IELTS 4 kỹ năng')}</h1><p class="muted">${t('Mô phỏng một buổi thi IELTS Academic: Listening → Reading → Writing → Speaking, bấm giờ như thật, chấm tự động và quy đổi <b>band Overall</b>. Đề tự biên soạn – điểm mang tính tham khảo.')}</p></div></div>
      <div class="grid g2">
        <div class="card">
          <h2 style="margin-top:0">⚙️ ${t('Chọn đề')}</h2>
          <div class="mk-skills">${SKILLS.map(([k, em, n, d]) => `<label class="mk-skill"><input type="checkbox" value="${k}" checked> <span class="em">${em}</span><div><b>${n}</b><div class="tiny muted">${d}</div></div></label>`).join('')}</div>
          <div class="grid g2" style="margin-top:.8rem">
            <label class="field"><span class="small">${t('Đề Listening')}</span><select class="input" id="mkL">${lt.map(n => `<option value="${n}">Test ${n}</option>`).join('')}</select></label>
            <label class="field"><span class="small">${t('Đề Reading')}</span><select class="input" id="mkR">${rt.length ? `<optgroup label="Academic">${rtA.map(n => `<option value="${n}">Test ${n}</option>`).join('')}</optgroup>${rtG.length ? `<optgroup label="General Training">${rtG.map(n => `<option value="${n}">General ${n - 100}</option>`).join('')}</optgroup>` : ''}` : `<option value="">${t('Đang cập nhật')}</option>`}</select></label>
          </div>
          ${rtG.length ? `<div class="tip small" style="margin-top:.6rem">✉️ ${t('Thi IELTS General Training? Chọn đề Reading “General” – Writing Task 1 sẽ là viết thư.')}</div>` : ''}
          <div class="tiny muted" style="margin-top:.5rem">${t('Writing & Speaking chọn ngẫu nhiên từ {a} đề Task 2, {b} đề Task 1 và {c} chủ đề Speaking.', { a: (window.WRITE_PROMPTS || []).length, b: (App.task1 ? App.task1.SETS.length : 0), c: (App.speakBank || []).length })}</div>
          <button class="btn primary lg block" id="mkGo" style="margin-top:1rem">${t('Bắt đầu thi')}</button>
          <div class="tiny muted" style="margin-top:.5rem">🎧 ${t('Đeo tai nghe')} · 🎙️ ${t('cho phép micro (Speaking)')} · ${t('nên dùng Chrome/Edge trên máy tính.')}</div>
        </div>
        <div class="card">
          <h2 style="margin-top:0">📈 ${t('Lịch sử thi thử')}</h2>
          ${hist.length ? `<div class="mk-hist">${hist.slice(0, 8).map(h => `<div class="row between nowrap"><span class="small">${new Date(h.at).toLocaleDateString(I18N.lang())}</span><span class="row nowrap" style="gap:.3rem">${SKILLS.map(([k, em]) => h.bands[k] != null ? `<span class="chip" title="${k}">${em} ${h.bands[k]}</span>` : '').join('')}</span><b class="mk-ov">${h.overall != null ? h.overall : '—'}</b></div>`).join('')}</div>
            ${hist.length >= 2 ? `<div class="small muted" style="margin-top:.6rem">${t('So với lần đầu:')} ${(() => { const d = (hist[0].overall || 0) - (hist[hist.length - 1].overall || 0); return d > 0 ? `<b style="color:var(--good)">+${d}</b>` : d < 0 ? `<b style="color:var(--again)">${d}</b>` : t('giữ nguyên'); })()}</div>` : ''}`
            : `<p class="muted small">${t('Chưa có bài thi nào. Làm bài đầu tiên để biết band hiện tại của bạn và theo dõi tiến bộ.')}</p>`}
          <h3>📋 ${t('Cấu trúc bài thi')}</h3><ul class="small" style="padding-left:1.1rem;line-height:1.8">
            <li>${t('<b>Listening</b>: 4 phần, mỗi phần nghe 1 lần, có 30 giây đọc câu hỏi.')}</li>
            <li>${t('<b>Reading</b>: 3 bài đọc, 40 câu trong 60 phút – tự quản lý thời gian.')}</li>
            <li>${t('<b>Writing</b>: Task 1 (≥150 từ, nên 20′) + Task 2 (≥250 từ, nên 40′). Task 2 chiếm 2/3 điểm.')}</li>
            <li>${t('<b>Speaking</b>: giám khảo đọc câu hỏi · Part 1 hỏi đáp · Part 2 có 1 phút chuẩn bị, nói 2 phút · Part 3 thảo luận.')}</li></ul>
        </div>
      </div>`;
    $('#mkGo').onclick = () => {
      const sk = $$('.mk-skill input:checked').map(x => x.value);
      if (!sk.length) return toast(t('Chọn ít nhất 1 kỹ năng'));
      if (sk.includes('reading') && !RT().length) return toast(t('Đề Reading đang được cập nhật – bỏ chọn Reading để thi các phần còn lại'));
      location.hash = `#/mock/run?s=${sk.join(',')}&l=${$('#mkL').value}&r=${$('#mkR').value}`;
    };
  };

  // ================= CHẠY BÀI THI =================
  function run(query) {
    const order = (query.get('s') || 'listening,reading,writing,speaking').split(',').filter(k => SKILLS.some(s => s[0] === k));
    const M = { order, i: 0, bands: {}, detail: {}, lt: +query.get('l') || 1, rt: +query.get('r') || 1, timers: [], player: null, rec: null };
    const clearAll = () => { M.timers.forEach(clearInterval); M.timers = []; if (M.player) M.player.stop(); if (M.rec) M.rec.cancel(); UI.stopSpeak(); };
    document.body.classList.add('bare');
    window.onbeforeunload = () => t('Bạn đang làm bài thi – rời trang sẽ mất kết quả.');
    App.cleanup = () => { clearAll(); document.body.classList.remove('bare'); window.onbeforeunload = null; };
    const bar = (title, right = '') => `<div class="mk-bar"><div class="row nowrap"><img src="icons/icon.svg" alt="" style="width:26px;height:26px;border-radius:7px"><b>Lexkite · IELTS Mock</b><span class="chip">${esc(title)}</span></div><div class="row nowrap">${right}<button class="btn sm ghost" id="mkQuit">${t('Thoát')}</button></div></div>
      <div class="mk-steps">${M.order.map((k, j) => { const s = SKILLS.find(x => x[0] === k); return `<span class="${j < M.i ? 'done' : j === M.i ? 'on' : ''}">${s[1]} ${s[2]}</span>`; }).join('')}</div>`;
    const bindQuit = () => { $('#mkQuit').onclick = () => { if (confirm(t('Thoát bài thi? Kết quả sẽ không được lưu.'))) { App.cleanup(); App.cleanup = null; location.hash = '#/mock'; } }; };
    const countdown = (secs, el, onEnd) => { let left = secs; const t = setInterval(() => { left--; const e = $(el); if (e) { e.textContent = clock(left); e.classList.toggle('warn', left <= 300); } if (left <= 0) { clearInterval(t); onEnd(); } }, 1000); M.timers.push(t); const e = $(el); if (e) e.textContent = clock(left); return () => left; };
    const next = () => { clearAll(); M.i++; window.scrollTo({ top: 0 }); if (M.i >= M.order.length) finish(); else SECTION[M.order[M.i]](); };
    const intro = (k, html, go) => {
      const s = SKILLS.find(x => x[0] === k);
      view.innerHTML = `${bar(s[2])}<div class="study-wrap"><div class="card celebrate empty"><div class="em">${s[1]}</div><h2>${s[2]}</h2>${html}<button class="btn primary lg" id="mkStart">${t('Bắt đầu {skill}', { skill: s[2] })}</button></div></div>`;
      bindQuit(); $('#mkStart').onclick = go;
    };

    // ---------- LISTENING ----------
    function listening() {
      const parts = App.listening.partsOf(M.lt), res = {};
      intro('listening', `<p class="muted">${t('Test {n} · 4 phần · 40 câu. Mỗi phần có 30 giây đọc câu hỏi, sau đó nghe <b>một lần</b>. Đáp án được lưu khi chuyển phần.', { n: M.lt })}</p>`, () => part(0));
      function part(k) {
        const p = parts[k];
        view.innerHTML = `${bar('Listening', `<span class="mk-clock" id="mkClock">00:30</span>`)}
          <div class="card lplayer"><b id="mkState">⏳ ${t('Đọc câu hỏi Part {n}', { n: p.part })}</b><button class="btn sm ghost" id="mkSkip">${t('Nghe ngay')}</button><span class="lnow small muted" id="lNow"></span></div>
          <div class="card" id="lQs"><div class="tiny muted">Part ${p.part} · ${t('Câu {a}–{b}', { a: App.listening.qNums(p)[0], b: App.listening.qNums(p).slice(-1)[0] })}</div>${QE.questionsHtml(p)}
          <div class="row" style="margin-top:1rem"><button class="btn primary" id="mkNext" disabled>${k < parts.length - 1 ? t('Sang phần tiếp') + ' →' : t('Kết thúc Listening') + ' →'}</button></div></div>`;
        bindQuit(); QE.bind($('#lQs'));
        let started = false;
        const start = () => {
          if (started) return; started = true; clearAll(); $('#mkSkip').remove(); $('#mkClock').textContent = '🔊';
          $('#mkState').textContent = '🔊 ' + t('Đang phát – chỉ nghe 1 lần');
          M.player = App.listening.Player(p, { onLine: i => { const l = p.script[i]; const n = $('#lNow'); if (n) n.textContent = !l || l.pause != null ? '' : l.say ? '🎙️ ' + t('Lời dẫn') : '🗣️ ' + ((p.speakers[l.s] || {}).name || ''); }, onEnd: () => { const s = $('#mkState'); if (s) s.textContent = '✓ ' + t('Hết phần nghe – kiểm tra đáp án'); const b = $('#mkNext'); if (b) b.disabled = false; } });
          M.player.play(0);
          setTimeout(() => { const b = $('#mkNext'); if (b) b.disabled = false; }, 30000);
        };
        countdown(30, '#mkClock', start);
        $('#mkSkip').onclick = start;
        $('#mkNext').onclick = () => {
          if (M.player && M.player.playing && !confirm(t('Phần nghe chưa phát xong. Vẫn chuyển tiếp?'))) return;
          Object.assign(res, Object.fromEntries(Object.entries(QE.collect(p, $('#lQs'))).map(([n, r]) => [n, { ...r, ref: p.id }])));
          if (k < parts.length - 1) { clearAll(); part(k + 1); window.scrollTo({ top: 0 }); }
          else { const raw = Object.values(res).filter(r => r.ok).length; M.bands.listening = QE.bandOf(raw, 'listening'); M.detail.listening = { raw, res }; next(); }
        };
      }
    }

    // ---------- READING ----------
    function reading() {
      const tst = RT().find(x => x.test === M.rt) || RT()[0];
      intro('reading', `<p class="muted">${t('3 bài đọc · 40 câu · <b>60 phút</b>. Chuyển qua lại giữa các bài bằng thanh phía dưới. Bôi đen chữ rồi bấm “Tô sáng” để đánh dấu.')}</p>`, start);
      function start() {
        let cur = 0;
        view.innerHTML = `${bar('Reading', `<span class="mk-clock" id="mkClock">60:00</span>`)}
          <div class="mk-read">
            <div class="card mk-pass" id="mkPass"></div>
            <div class="card mk-qs" id="mkQs">${tst.passages.map((p, k) => `<div class="mk-qp" data-p="${k}" ${k ? 'hidden' : ''}><div class="tiny muted">Reading Passage ${p.n} · ${t('Câu {a}–{b}', { a: QE.numsOf(p)[0], b: QE.numsOf(p).slice(-1)[0] })}</div>${QE.questionsHtml(p)}</div>`).join('')}</div>
          </div>
          <div class="mk-nav"><div class="row">${tst.passages.map((p, k) => `<button class="btn sm ${k ? '' : 'primary'}" data-go="${k}">Passage ${p.n}</button>`).join('')}<button class="btn sm" id="mkHl">🖍 ${t('Tô sáng')}</button></div><div class="mk-qmap" id="mkMap">${tst.passages.flatMap((p, k) => QE.numsOf(p).map(q => `<button data-q="${q}" data-pk="${k}">${q}</button>`)).join('')}</div><button class="btn primary" id="mkSubmit">${t('Nộp bài Reading')}</button></div>`;
        bindQuit(); QE.bind($('#mkQs'));
        const show = k => {
          cur = k; const p = tst.passages[k];
          $('#mkPass').innerHTML = `<h2 style="margin-top:0">${esc(p.title)}</h2>${p.paras.map(x => `<p><b class="mk-pk">${esc(x.k)}</b> ${esc(x.t)}</p>`).join('')}`;
          $$('.mk-qp').forEach(el => el.hidden = +el.dataset.p !== k);
          $$('[data-go]').forEach(b => b.classList.toggle('primary', +b.dataset.go === k));
          $('#mkPass').scrollTop = 0;
        };
        // Giữ phần tô sáng khi chuyển bài
        const hlStore = {};
        $$('[data-go]').forEach(b => b.onclick = () => { hlStore[cur] = $('#mkPass').innerHTML; show(+b.dataset.go); if (hlStore[cur]) $('#mkPass').innerHTML = hlStore[cur]; });
        $('#mkHl').onclick = () => { const s = getSelection(); if (!s.rangeCount || s.isCollapsed || !$('#mkPass').contains(s.anchorNode)) return toast(t('Bôi đen chữ trong bài đọc trước')); try { const m = document.createElement('mark'); s.getRangeAt(0).surroundContents(m); s.removeAllRanges(); } catch (e) { toast(t('Chỉ tô sáng trong một đoạn văn')); } };
        show(0);
        // Dãy số câu như máy thi thật: tô màu câu đã làm, bấm để chuyển bài & nhảy tới câu
        const paintMap = () => $$('#mkMap [data-q]').forEach(b => b.classList.toggle('on', QE.answered($('#mkQs'), b.dataset.q)));
        $('#mkQs').addEventListener('change', paintMap); $('#mkQs').addEventListener('input', paintMap); paintMap();
        $$('#mkMap [data-q]').forEach(b => b.onclick = () => { const k = +b.dataset.pk; if (k !== cur) $(`[data-go="${k}"]`).click(); const el = QE.itemOf($('#mkQs'), b.dataset.q); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('tx-flash'); setTimeout(() => el.classList.remove('tx-flash'), 1200); } });
        const submit = () => {
          const res = {};
          tst.passages.forEach((p, k) => Object.assign(res, Object.fromEntries(Object.entries(QE.collect(p, $(`.mk-qp[data-p="${k}"]`))).map(([n, r]) => [n, { ...r, ref: tst.id + ':' + p.n }]))));
          const raw = Object.values(res).filter(r => r.ok).length;
          M.bands.reading = QE.bandOf(raw, tst.gt ? 'reading-gt' : 'reading'); M.detail.reading = { raw, res, t: tst.id };
          next();
        };
        countdown(3600, '#mkClock', () => { toast('⏰ ' + t('Hết giờ Reading')); submit(); });
        $('#mkSubmit').onclick = () => { const empty = $$('#mkQs input.gap').filter(x => !x.value.trim()).length; if (confirm(empty ? t('Còn ô trống. Nộp bài Reading?') : t('Nộp bài Reading?'))) submit(); };
      }
    }

    // ---------- WRITING ----------
    function writing() {
      // IELTS General (đề Reading GT): Task 1 là viết thư thay vì mô tả biểu đồ
      const tsr = RT().find(x => x.test === M.rt), gl = tsr && tsr.gt && (window.GT_LETTERS || []).length ? pick(window.GT_LETTERS) : null;
      const d = pick(App.task1.SETS), p = pick(window.WRITE_PROMPTS || []);
      intro('writing', `<p class="muted">${t('<b>60 phút</b> cho cả 2 task. Task 1 ≥150 từ (nên dành 20 phút), Task 2 ≥250 từ (40 phút). Task 2 chiếm 2/3 điểm Writing.')}</p>`, start);
      function start() {
        view.innerHTML = `${bar('Writing', `<span class="mk-clock" id="mkClock">60:00</span>`)}
          <div class="tabs" style="display:inline-flex;margin-bottom:.8rem" id="mkTabs"><button class="on" data-t="1">Task 1 · ${t('{n} từ', { n: '<span id="w1">0</span>' })}</button><button data-t="2">Task 2 · ${t('{n} từ', { n: '<span id="w2">0</span>' })}</button></div>
          <div class="mk-write" data-task="1"><div class="card"><b>Writing Task 1${gl ? ' · General' : ''}</b>${gl ? `<p>${esc(gl.situation)}</p><p class="small" style="margin:.2rem 0">Write a letter to ${esc(gl.to || 'the person')}. In your letter:</p><ul style="margin:.2rem 0;padding-left:1.2rem">${gl.bullets.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="small muted">Write at least 150 words. You do NOT need to write any addresses. Begin your letter as follows: <b>${esc(gl.open)}</b></p>` : `<p class="small">${esc(d.title)} Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</p><div class="t1chart">${App.task1.draw(d)}</div>`}</div>
            <div class="card"><textarea class="input mk-ta" id="t1" placeholder="${t('Viết ít nhất 150 từ…')}" spellcheck="false"></textarea></div></div>
          <div class="mk-write" data-task="2" hidden><div class="card"><b>Writing Task 2</b><p>${esc(p.text)}</p><p class="small muted">Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.</p></div>
            <div class="card"><textarea class="input mk-ta" id="t2" placeholder="${t('Viết ít nhất 250 từ…')}" spellcheck="false"></textarea></div></div>
          <div class="row" style="margin-top:1rem"><button class="btn primary" id="mkSubmit">${t('Nộp bài Writing')}</button></div>`;
        bindQuit();
        const wc = t => (t.match(/[A-Za-z][A-Za-z'’-]*/g) || []).length;
        $('#t1').oninput = e => { $('#w1').textContent = wc(e.target.value); };
        $('#t2').oninput = e => { $('#w2').textContent = wc(e.target.value); };
        $$('#mkTabs button').forEach(b => b.onclick = () => { $$('#mkTabs button').forEach(x => x.classList.toggle('on', x === b)); $$('.mk-write').forEach(w => w.hidden = w.dataset.task !== b.dataset.t); });
        const submit = async () => {
          const a = $('#t1').value.trim(), b = $('#t2').value.trim();
          let s1 = { band: 0, words: wc(a), notes: [t('Chưa viết Task 1.')] };
          if (wc(a) >= 20) s1 = gl && window.AI ? await AI.localGrade({ kind: 'letter', task: gl.situation, text: a }).then(r => ({ band: r.overall, words: wc(a), notes: r.improvements || [] })).catch(() => s1) : App.task1.score(a, d);
          const s2 = wc(b) >= 20 ? scoreTask2(b, p) : { band: 0, words: wc(b), notes: [t('Chưa viết Task 2.')], crit: {} };
          M.bands.writing = round5((s1.band + 2 * s2.band) / 3);
          M.detail.writing = { s1, s2, d: gl ? null : d.id, gl: gl ? gl.id : null, p: p.id, t1: a, t2: b };
          Store.get('essays', []).then(es => { if (wc(b) >= 50) { es.unshift({ prompt: p.id, text: b, words: s2.words, band: s2.band, at: Date.now() }); Store.set('essays', es.slice(0, 20)); } });
          next();
        };
        countdown(3600, '#mkClock', () => { toast('⏰ ' + t('Hết giờ Writing')); submit(); });
        $('#mkSubmit').onclick = () => { if (confirm(t('Nộp bài Writing?'))) submit(); };
      }
    }

    // ---------- SPEAKING ----------
    function speaking() {
      App.speakMerge && App.speakMerge(); const bank = App.speakBank || [];
      const t1 = pick(bank), t2 = pick(bank.filter(x => x !== t1)) || t1, t3 = pick(bank) || t1;
      const Q = [...t1.p1.slice(0, 3).map(q => ({ part: 1, q })), { part: 1, q: (t2.p1 || [])[0] }, { part: 2, q: t3.p2.q, points: t3.p2.points }, ...t3.p3.slice(0, 3).map(q => ({ part: 3, q }))].filter(x => x.q);
      const answers = [];
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      intro('speaking', `<p class="muted">${t('Giám khảo sẽ đọc câu hỏi; micro tự bật khi đến lượt bạn. Part 1 trả lời 20–40 giây · Part 2: 1 phút chuẩn bị, nói tối đa 2 phút · Part 3: 40–60 giây.')}${SR ? '' : `<br><b>${t('Trình duyệt này không chuyển giọng nói thành chữ – hãy dùng Chrome hoặc Edge để được chấm.')}</b>`}</p>`, async () => {
        try { const st = await navigator.mediaDevices.getUserMedia({ audio: { autoGainControl: true, noiseSuppression: true, echoCancellation: true } }); st.getTracks().forEach(x => x.stop()); } catch (e) { toast('⚠️ ' + t('Cần cho phép micro để thi Speaking')); }
        ask(0);
      });
      function recorder() {
        let finalText = '', interim = '', rec = null, media = null, chunks = [], stream = null, on = true;
        const startP = (async () => {
          try { stream = await navigator.mediaDevices.getUserMedia({ audio: { autoGainControl: true, noiseSuppression: true, echoCancellation: true } }); media = new MediaRecorder(stream); media.ondataavailable = e => e.data.size && chunks.push(e.data); media.start(); } catch (e) { /* không có micro */ }
          if (SR) { rec = new SR(); rec.lang = state.settings.accent || 'en-GB'; rec.continuous = true; rec.interimResults = true;
            rec.onresult = e => { interim = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) finalText += r[0].transcript + ' '; else interim += r[0].transcript; } const l = $('#mkLive'); if (l) l.textContent = (finalText + interim).slice(-220); };
            rec.onend = () => { if (on && rec) try { rec.start(); } catch (e) { /* đang chạy */ } };
            try { rec.start(); } catch (e) { /* đã chạy */ } }
        })();
        const stop = () => new Promise(async res => {
          await startP; on = false; try { rec && rec.stop(); } catch (e) { /* đã dừng */ }
          const done = () => { if (stream) stream.getTracks().forEach(x => x.stop()); res({ text: (finalText + ' ' + interim).trim(), audio: chunks.length ? UI.recUrl(new Blob(chunks, { type: (media && media.mimeType) || 'audio/webm' }), 'mock' + answers.length) : '' }); };
          if (media && media.state !== 'inactive') { media.onstop = () => setTimeout(done, 250); media.stop(); } else setTimeout(done, 250);
        });
        return { stop, cancel: () => { on = false; try { rec && rec.abort(); } catch (e) { /* bỏ qua */ } if (media && media.state !== 'inactive') try { media.stop(); } catch (e) { /* bỏ qua */ } if (stream) stream.getTracks().forEach(x => x.stop()); } };
      }
      function ask(k) {
        if (k >= Q.length) { const sc = scoreSpeaking(answers); M.bands.speaking = sc.band || null; M.detail.speaking = { sc, answers }; return next(); }
        const q = Q[k], max = q.part === 2 ? 120 : q.part === 1 ? 45 : 75;
        view.innerHTML = `${bar('Speaking', `<span class="mk-clock" id="mkClock"></span>`)}
          <div class="study-wrap"><div class="card"><div class="tiny muted">Part ${q.part} · ${t('câu {i}/{n}', { i: k + 1, n: Q.length })}</div>
            <div class="mk-examiner">👩‍🏫 <span>${q.part === 2 ? 'Now I\'d like you to talk about a topic for one to two minutes. You have one minute to prepare.' : esc(q.q)}</span></div>
            ${q.part === 2 ? `<div class="mk-cue"><b>${esc(q.q)}</b><div class="small">You should say:</div><ul class="small">${q.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div><textarea class="input" rows="3" placeholder="${t('Ghi chú nhanh trong 1 phút chuẩn bị (không bắt buộc)')}"></textarea>` : ''}
            <div class="mk-mic"><span class="mk-dot" id="mkDot"></span><b id="mkHint">${t('Giám khảo đang hỏi…')}</b></div>
            <div class="small muted" id="mkLive" style="min-height:2.6em"></div>
            <div class="row"><button class="btn primary" id="mkDone" disabled>${t('Trả lời xong')} →</button>${q.part === 2 ? `<button class="btn ghost" id="mkPrep">${t('Bỏ qua chuẩn bị')}</button>` : ''}</div></div></div>`;
        bindQuit();
        let started = false, t0 = 0;
        const go = () => {
          if (started) return; started = true; clearAll();
          const pr = $('#mkPrep'); if (pr) pr.remove();
          M.rec = recorder(); t0 = Date.now();
          $('#mkDot').classList.add('on'); $('#mkHint').textContent = q.part === 2 ? t('Bắt đầu nói (tối đa 2 phút)…') : t('Đang ghi âm – hãy trả lời…');
          $('#mkDone').disabled = false;
          countdown(max, '#mkClock', finish1);
        };
        const finish1 = async () => {
          if (!M.rec) return; const r = M.rec; M.rec = null; clearAll();
          $('#mkDone').disabled = true; $('#mkHint').textContent = t('Đang lưu…');
          const out = await r.stop();
          answers.push({ part: q.part, q: q.q, text: out.text, audio: out.audio, secs: (Date.now() - t0) / 1000 });
          ask(k + 1);
        };
        $('#mkDone').onclick = finish1;
        // Giám khảo đọc câu hỏi rồi mới bật micro (Part 2: 1 phút chuẩn bị)
        const say = q.part === 2 ? `Now I'd like you to talk about a topic for one to two minutes. You have one minute to prepare. ${q.q}` : q.q;
        UI.tts(say, 'en-GB', 0.95, { onEnd: () => { if (q.part === 2) { $('#mkHint').textContent = '⏳ ' + t('Chuẩn bị 1 phút'); countdown(60, '#mkClock', go); const pr = $('#mkPrep'); if (pr) pr.onclick = go; } else setTimeout(go, 300); } });
        if (!('speechSynthesis' in window)) setTimeout(go, 500);
      }
    }

    // ---------- KẾT QUẢ ----------
    async function finish() {
      document.body.classList.remove('bare'); window.onbeforeunload = null;
      const got = M.order.filter(k => M.bands[k]);
      const overall = got.length === 4 ? QE.overall(got.map(k => M.bands[k])) : null;
      const hist = await Store.get('mocks', []);
      hist.unshift({ at: Date.now(), bands: M.bands, overall, lt: M.lt, rt: M.rt });
      await Store.set('mocks', hist.slice(0, 30));
      const L = M.detail.listening, R = M.detail.reading, W = M.detail.writing, S = M.detail.speaking;
      [L, R].forEach((x, j) => x && Object.entries(x.res).filter(([, r]) => !r.ok).forEach(([n, r]) => App.logMistake && App.logMistake({ kind: j ? 'reading' : 'listening', q: t('Thi thử – câu {n}: {q}', { n, q: r.q }), answer: r.answer, given: r.given || t('(bỏ trống)'), explain: r.cue ? t('Tham khảo: “…{cue}…”', { cue: r.cue }) : '', ref: j ? '' : r.ref })));
      await App.reward({ quizzes: M.order.length, listens: L ? 4 : 0, readings: R ? 3 : 0, writes: W ? 2 : 0, xp: 40 + got.length * 30 });
      if (overall >= 6.5) { Sfx.win(); confetti(160); }
      const sheet = res => `<div class="lsheet">${Object.keys(res).map(Number).sort((a, b) => a - b).map(n => `<div class="${res[n].ok ? 'ok' : 'no'}"><b>${n}</b> ${res[n].ok ? '✓' : '✗'} <span>${esc(res[n].answer)}</span>${!res[n].ok && res[n].given ? `<span class="tiny muted">${t('(bạn: {a})', { a: esc(res[n].given) })}</span>` : ''}</div>`).join('')}</div>`;
      const crit = c => `<div class="mk-crit">${Object.entries(c || {}).map(([k, v]) => `<div><span class="tiny muted">${esc(k)}</span><b>${v}</b></div>`).join('')}</div>`;
      view.innerHTML = `<div class="study-wrap" style="max-width:900px">
        <div class="card celebrate"><div class="em">🏁</div><h2 style="margin-bottom:.2rem">${overall != null ? `Overall Band ${overall}` : t('Kết quả thi thử')}</h2><p class="muted small" style="margin-top:0">${t('Chấm tự động trên đề tự biên soạn – mang tính tham khảo, không thay thế giám khảo.')}</p>
          <div class="mk-bands">${SKILLS.map(([k, em, n]) => `<div class="${M.order.includes(k) ? '' : 'off'}"><span>${em}</span><b>${M.bands[k] != null ? M.bands[k] : '—'}</b><small>${n}</small></div>`).join('')}</div></div>
        ${L ? `<div class="card"><div class="row between"><h3 style="margin:0">🎧 Listening · ${L.raw}/40 → Band ${M.bands.listening}</h3><a class="btn sm" href="#/listening">${t('Luyện lại có lời thoại')}</a></div><details style="margin-top:.5rem"><summary class="small">${t('Bảng đáp án')}</summary>${sheet(L.res)}</details></div>` : ''}
        ${R ? `<div class="card"><div class="row between"><h3 style="margin:0">📖 Reading · ${R.raw}/40 → Band ${M.bands.reading}</h3><a class="btn sm" href="#/mock">${t('Thi đề khác')}</a></div><details style="margin-top:.5rem"><summary class="small">${t('Bảng đáp án')}</summary>${sheet(R.res)}</details></div>` : ''}
        ${W ? `<div class="card"><h3 style="margin-top:0">✍️ Writing → Band ${M.bands.writing}</h3>
          <div class="grid g2"><div><b>Task 1 · ${t('{n} từ', { n: W.s1.words })} · ~${W.s1.band}</b><ul class="small">${W.s1.notes.map(n => `<li>${n}</li>`).join('')}</ul><a class="btn sm ghost" href="#/model/t1-${esc(W.d)}">📄 ${t('Bài mẫu Task 1 (nếu có)')}</a></div>
          <div><b>Task 2 · ${t('{n} từ', { n: W.s2.words })} · ~${W.s2.band}</b>${crit(W.s2.crit)}<ul class="small">${W.s2.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul><a class="btn sm ghost" href="#/write/${esc(W.p)}">✍️ ${t('Mở đề trong Phòng viết')}</a></div></div></div>` : ''}
        ${S ? `<div class="card"><h3 style="margin-top:0">🗣️ Speaking → ${M.bands.speaking ? 'Band ' + M.bands.speaking : t('chưa chấm được')}</h3>${crit(S.sc.crit)}<ul class="small">${S.sc.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
          <details><summary class="small">${t('Nghe lại & bản chữ từng câu')}</summary>${S.answers.map(a => `<div class="q-item"><div class="tiny muted">Part ${a.part} · ${Math.round(a.secs)}s</div><b class="small">${esc(a.q)}</b>${a.audio ? `<audio controls src="${a.audio}" style="display:block;height:34px;margin:.3rem 0;max-width:100%"></audio>` : ''}<div class="small">${esc(a.text || t('(không nhận được lời nói)'))}</div></div>`).join('')}</details></div>` : ''}
        <div id="mkAI"></div>
        <div class="row center" style="margin-top:1rem"><a class="btn primary" href="#/mock">${t('Về trang Thi thử')}</a><a class="btn" href="#/mistakes">📕 ${t('Sổ lỗi sai')}</a><a class="btn" href="#/method">🧪 ${t('Gợi ý lộ trình')}</a></div></div>`;
      if (window.AI) {
        const box = $('#mkAI');
        if (W && W.t2) AI.attach(box, () => ({ kind: 'task2', task: ((window.WRITE_PROMPTS || []).find(x => x.id === W.p) || {}).text || '', text: W.t2 }));
        if (W && W.t1 && W.gl) { const g2 = (window.GT_LETTERS || []).find(x => x.id === W.gl) || {}; AI.attach(box, () => ({ kind: 'task1', task: `IELTS General Training Task 1 letter (${g2.tone}). ${g2.situation} Bullet points: ${(g2.bullets || []).join('; ')}`, text: W.t1 })); }
        else if (W && W.t1) { const d = App.task1.SETS.find(x => x.id === W.d) || {}; const { overview, ...data } = d; AI.attach(box, () => ({ kind: 'task1', task: d.title || '', text: W.t1, extra: JSON.stringify(data) })); }
        if (S && S.answers.some(a => a.text)) AI.attach(box, () => ({ kind: 'speaking', task: 'IELTS Speaking test', text: S.answers.map(a => `Q (Part ${a.part}): ${a.q}\nA (${Math.round(a.secs)}s): ${a.text || '(no answer)'}`).join('\n\n') }));
      }
    }

    const SECTION = { listening, reading, writing, speaking };
    SECTION[M.order[0]]();
  }

  App.mock = { scoreTask2, scoreSpeaking, grammarRange };
})();
