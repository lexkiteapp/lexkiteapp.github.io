/* 📞 Call Ama / Carlos (#/call): cuộc gọi video luyện nói có kịch bản rẽ nhánh (IELTS Speaking Part 1/2/3, TOEIC, đời sống) – logic: js/call/engine.js.
 * Giáo viên = viseme sprite khớp môi (js/lesson/teacher.js, pilot B): giọng Kokoro sinh sẵn trên CI (scripts/gen-audio.mjs), thiếu file → giọng máy + miệng theo chữ.
 * Lượt lời: giáo viên nói → "Đến lượt bạn" → micro nghe (vòng sáng + chữ "Đang nghe…"); bấm micro khi giáo viên đang nói = ngắt lời an toàn
 * (dừng giọng, kết quả nhận dạng của lượt cũ bị bỏ qua nhờ mã lượt). Nhận dạng TRÊN MÁY trước (Chrome processLocally / Whisper tiny.en tải 1 lần),
 * dịch vụ đám mây của trình duyệt chỉ khi người học tự chọn; luôn có gõ phím / chạm gợi ý. Âm thanh không rời khỏi máy theo mặc định.
 * Cuối cuộc gọi: điểm tử tế, từ chủ đề đã dùng, nhận xét độ trôi chảy, lời thoại có sửa lỗi (ngữ pháp + nhầm cặp âm bread ≠ breast), luyện lại câu yếu. */
(function () {
  const { $, $$, esc, toast } = UI;
  const App = window.App;
  const { routes } = App;
  const view = App.view;
  const E = window.CallEngine;
  const ACCENT = 'en-US';
  const WHO = { ama: 'Ama', carlos: 'Carlos' };
  // poster.webp (bộ giáo viên mới teach-green, nền trong suốt) → lỗi thì poster.jpg (bộ sprite cũ) – chạy được trước & sau khi bộ mới merge
  const poster = w => 'teach/' + (WHO[w] ? w : 'ama') + '/poster.webp';
  const poFix = root => $$('img[data-po]', root).forEach(i => { i.onerror = () => { i.onerror = null; i.src = i.src.replace(/\.webp$/, '.jpg'); }; });
  const NAME = {
    coffee: () => t('Mua cà phê cho cả nhóm'), weekend: () => t('Kể chuyện cuối tuần'), 'first-day': () => t('Ngày đầu đi làm ở Mỹ'), standup: () => t('Họp đầu ngày (stand-up)'), doctor: () => t('Đặt lịch khám bác sĩ'), apartment: () => t('Gọi hỏi thuê căn hộ'),
    'ielts-p1-home': () => t('IELTS Part 1: quê nhà, công việc, thời gian rảnh'), 'ielts-p2-place': () => t('IELTS Part 2: tả một nơi bạn thích đến'), 'ielts-p3-tech': () => t('IELTS Part 3: công nghệ và việc học'),
    'toeic-reschedule': () => t('TOEIC: dời lịch họp với khách hàng'), bakery: () => t('Mua bánh mì ở tiệm bánh'),
  };
  const nameOf = c => (NAME[c.id] ? NAME[c.id]() : c.title);
  const GROUP = { ielts: () => 'IELTS', toeic: () => 'TOEIC', everyday: () => t('Đời sống') };
  const groupOf = c => (/^ielts/.test(c.exam) ? 'ielts' : c.exam === 'toeic' ? 'toeic' : 'everyday');
  const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem('vb.call.' + k); localStorage.setItem('vb.call.' + k, v); } catch (e) { return null; } };
  // An toàn: lời lẽ thô tục/nhạy cảm → giáo viên nhẹ nhàng đưa cuộc gọi về chủ đề, không lặp lại lời đó
  const UNSAFE = /\b(fuck|shit|bitch|asshole|dick|sex|kill|suicide|drugs?|nigg|whore|slut)\w*/i;
  const mmss = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.max(0, s) % 60).padStart(2, '0');

  // ---------- Nhận dạng: dò khả năng trên máy (1 lần) ----------
  const SRC = () => window.SpeechRecognition || window.webkitSpeechRecognition;
  let probeP = null;
  const env = { local: false, localDl: false, sr: false, media: false, ext: false };
  function probe() {
    if (probeP) return probeP;
    const SR = SRC();
    Object.assign(env, { sr: !!SR, media: !!(navigator.mediaDevices && window.MediaRecorder), ext: !!(window.Core && Core.Store && Core.Store.isExtension) });
    probeP = (async () => {
      try {
        if (!SR || typeof SR.available !== 'function' || !('processLocally' in SR.prototype)) return;
        const s = await SR.available({ langs: [ACCENT], processLocally: true });
        env.local = s === 'available'; env.localDl = s === 'downloadable' || s === 'downloading';
      } catch (e) { /* trình duyệt cũ */ }
    })();
    return probeP;
  }
  const mode = () => E.asrMode(Object.assign({}, env, { whisper: (() => { try { return localStorage.getItem('vb.whisper') === '1'; } catch (e) { return false; } })(), pref: pref('asr') }));
  const PRIV = {
    local: () => '🔒 ' + t('Nhận dạng ngay trên máy – âm thanh không rời khỏi máy bạn.'),
    whisper: () => '🔒 ' + t('Nhận dạng ngay trên máy – âm thanh không rời khỏi máy bạn.'),
    cloud: () => '☁️ ' + t('Đang dùng nhận dạng của trình duyệt: âm thanh được gửi tới máy chủ của trình duyệt.'),
    ask: () => '🔒 ' + t('Mặc định Lexkite không gửi âm thanh của bạn đi đâu.'),
    tap: () => '⌨️ ' + t('Trả lời bằng cách chạm gợi ý hoặc gõ phím.'),
  };

  function css() {
    if ($('#callCss')) return;
    const st = document.createElement('style'); st.id = 'callCss';
    st.textContent = `.call-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:.8rem}
.call-card{display:flex;gap:.8rem;align-items:center;padding:.9rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);text-decoration:none;min-height:44px}
.call-card:hover{border-color:var(--primary)}.call-card img{width:56px;height:56px;border-radius:50%;object-fit:cover;object-position:50% 0;background:#f4efe6;flex:none}.call-card b{display:block}
.call-flt{display:flex;gap:.4rem;flex-wrap:wrap;margin:0 0 .8rem}.call-flt button{min-height:36px}
.call-ov{position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;align-items:center;background:radial-gradient(120% 80% at 50% 0%,#1f4f4d 0%,#0f2223 55%,#0a1414 100%);color:#fff;padding:max(14px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));overflow-y:auto}
.call-top{width:100%;max-width:560px;display:flex;justify-content:space-between;align-items:center;gap:.6rem;font-size:.85rem;opacity:.9}
.call-av{position:relative;width:min(46vw,210px);aspect-ratio:3/4;margin:1.4vh auto .8vh;border-radius:22px;overflow:hidden;background:rgba(255,255,255,.06);box-shadow:0 0 0 4px rgba(255,255,255,.08);flex:none;transition:box-shadow .2s}
.call-av>img.call-po{width:100%;height:100%;object-fit:contain;object-position:50% 100%}.call-av .tch{position:absolute;inset:0;width:100%;height:100%;overflow:hidden}
.tch-rig{position:absolute;left:0;top:0;width:480px;height:640px;transform-origin:0 0}.tch-rig img,.tch-rig video{position:absolute;inset:0;width:480px;height:640px;object-fit:cover}
/* bộ giáo viên mới (canvas WebGL, nền trong suốt): khung co theo ô, không phóng 480×640 */
.tch-rig:has(canvas){inset:0;width:auto;height:auto;transform:none!important}.tch-rig:has(canvas) img,.tch-rig canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:50% 100%}.tch-rig.live img{visibility:hidden}
.tch-face{position:absolute;left:0;top:0;width:480px;height:640px;transform-origin:0 0}.tch-m{position:absolute;background-repeat:no-repeat;opacity:0;transition:opacity 60ms linear}
.call-av.talk{box-shadow:0 0 0 4px rgba(255,165,130,.55),0 0 36px rgba(255,132,102,.4)}
.call-av.listen{box-shadow:0 0 0 4px rgba(94,234,212,.75),0 0 40px rgba(94,234,212,.4)}
.call-st{display:inline-flex;align-items:center;gap:.45rem;min-height:28px;padding:.15rem .7rem;border-radius:99px;background:rgba(255,255,255,.1);font-size:.85rem}
.call-st i{display:inline-flex;gap:2px;align-items:flex-end;height:14px}.call-st i b{width:3px;height:4px;border-radius:2px;background:#5eead4}
.call-st.listen i b{animation:callBar .9s ease-in-out infinite}.call-st.listen i b:nth-child(2){animation-delay:.15s}.call-st.listen i b:nth-child(3){animation-delay:.3s}
@keyframes callBar{0%,100%{height:4px}50%{height:14px}}
@keyframes callPulse{from{transform:scale(1)}to{transform:scale(1.06)}}
@media (prefers-reduced-motion:reduce){.call-st.listen i b,.call-mic.on{animation:none!important}}
.call-name{font-weight:800;font-size:1.15rem}.call-sub{font-size:.82rem;opacity:.8;text-align:center}
.call-cap{width:100%;max-width:560px;min-height:4.6em;margin:1vh 0;padding:.65rem .9rem;border-radius:16px;background:rgba(0,0,0,.35);text-align:center;line-height:1.45}
.call-cap .l1{font-size:1.08rem;font-weight:600}.call-cap .l2{font-size:.9rem;opacity:.82;margin-top:.25rem}
.call-cue{width:100%;max-width:560px;margin:0 0 .6rem;padding:.6rem .9rem;border-radius:14px;background:rgba(255,255,255,.1);border:1px dashed rgba(255,255,255,.35);font-size:.92rem}
.call-cue ul{margin:.3rem 0 0;padding-inline-start:1.1rem}.call-clock{font-variant-numeric:tabular-nums;font-weight:800;font-size:1.1rem}
.call-tip{width:100%;max-width:560px;padding:.6rem .8rem;border-radius:14px;background:rgba(245,165,36,.18);border:1px solid rgba(245,165,36,.45);font-size:.92rem;margin-bottom:.6rem}
.call-tip s{opacity:.75}.call-you{width:100%;max-width:560px;font-size:.92rem;opacity:.9;margin:-.2rem 0 .5rem;text-align:end}
.call-opts{width:100%;max-width:560px;display:flex;flex-direction:column;gap:.45rem}
.call-opts button,.call-ask button{min-height:44px;padding:.55rem .9rem;border-radius:14px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;font:inherit;text-align:start;cursor:pointer}
.call-opts button:hover,.call-opts button:focus-visible,.call-ask button:hover,.call-ask button:focus-visible{background:rgba(255,255,255,.18)}
.call-type{width:100%;max-width:560px;display:flex;gap:.4rem;margin-top:.5rem}.call-type input{flex:1;min-width:0;min-height:44px;padding:.5rem .8rem;border-radius:12px;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.25);color:#fff;font:inherit}
.call-type button{min-height:44px;padding:0 .9rem;border-radius:12px;border:0;background:#0D6964;color:#fff;font:inherit;cursor:pointer}
.call-ask{width:100%;max-width:560px;display:flex;flex-direction:column;gap:.45rem;padding:.8rem;border-radius:16px;background:rgba(0,0,0,.35);margin-bottom:.6rem}
.call-ctl{display:flex;gap:1.2rem;justify-content:center;align-items:center;margin-top:auto;padding-top:1rem}
.call-ctl button{width:64px;height:64px;border-radius:50%;border:0;font-size:1.6rem;cursor:pointer;color:#fff}
.call-mic{background:#0D6964}.call-mic.on{background:#14b8a6;animation:callPulse .6s ease-in-out infinite alternate}.call-mic:disabled{opacity:.4}.call-end{background:#d1343a}
.call-sm{background:rgba(255,255,255,.16)!important;font-size:1rem!important;width:52px!important;height:52px!important}
.call-done{min-height:44px;padding:0 1rem;border-radius:99px;border:0;background:#15803d;color:#fff;font:inherit;font-weight:700;cursor:pointer}
.call-tx{border-top:1px solid var(--line);padding:.6rem 0}.call-tx .q{color:var(--muted)}.call-tx .a{margin:.2rem 0}.call-tx.weak .a::before{content:'↻ ';color:var(--warn,#b45309)}
.call-score{display:flex;gap:1rem;align-items:center;flex-wrap:wrap}.call-chips{display:flex;gap:.35rem;flex-wrap:wrap}
body.call-on{overflow:hidden}`;
    document.head.appendChild(st);
  }

  routes.call = function (arg) {
    css(); probe();
    const list = (window.CALLS || []).map(E.prep);
    const c = list.find(x => x.id === arg);
    if (c) return ring(c);
    const flt = pref('flt') || 'all';
    const groups = ['all', 'ielts', 'toeic', 'everyday'];
    view.innerHTML = `<div class="page-head"><div><h1>📞 ${t('Gọi cho Ama & Carlos')}</h1><p class="muted">${t('Cuộc gọi video luyện nói: giáo viên hỏi, bạn trả lời bằng giọng nói. Câu hỏi rẽ nhánh theo câu trả lời, lỗi được sửa nhẹ nhàng, cuối cuộc gọi có tổng kết và luyện lại câu yếu.')}</p></div></div>
      <div class="call-flt" role="group" aria-label="${t('Lọc theo kỳ thi')}">${groups.map(gr => `<button type="button" class="btn sm ${flt === gr ? 'primary' : ''}" data-g="${gr}" aria-pressed="${flt === gr}">${gr === 'all' ? t('Tất cả') : GROUP[gr]()}</button>`).join('')}</div>
      <div class="call-grid">${list.filter(x => flt === 'all' || groupOf(x) === flt).map(x => `<a class="call-card" href="#/call/${x.id}"><img data-po src="${poster(x.who)}" alt="" width="56" height="56" loading="lazy"><span><b>${x.em} ${esc(nameOf(x))}</b><span class="tiny muted"><span class="chip lv">${x.lv}</span> ${WHO[x.who]} · <span lang="en">${esc(x.title)}</span></span></span></a>`).join('')}</div>
      <p class="tiny muted" style="margin-top:1rem"><span id="callPriv">${PRIV.ask()}</span>${pref('asr') ? ` <button type="button" class="btn sm ghost" id="callAsr">${t('Đổi cách nhận dạng')}</button>` : ''}</p>`;
    const ab = $('#callAsr'); if (ab) ab.onclick = () => { try { localStorage.removeItem('vb.call.asr'); } catch (e) { /* bỏ qua */ } toast(t('Lần gọi sau Lexkite sẽ hỏi lại cách nhận dạng.')); routes.call(); };
    poFix(view);
    $$('[data-g]', view).forEach(b => b.onclick = () => { pref('flt', b.dataset.g); routes.call(); });
    probe().then(() => { const p = $('#callPriv'); if (p) p.textContent = (PRIV[mode()] || PRIV.ask)(); });
  };

  // Màn "đang gọi đến" – chạm Nghe máy để bắt đầu (trình duyệt cần 1 lần chạm để phát âm thanh)
  function ring(c) {
    const nm = WHO[c.who];
    view.innerHTML = `<div class="page-head"><div><h1>📞 ${esc(nameOf(c))}</h1><p class="muted"><span class="chip lv">${c.lv}</span> <span lang="en">${esc(c.title)}</span></p></div></div>
      <div class="card center"><img data-po src="${poster(c.who)}" alt="${nm}" width="120" height="160" style="object-fit:contain;object-position:50% 100%"><p><b>${nm}</b> – <span lang="en">${esc(c.role)}</span></p>
      <p class="tiny muted" id="callPriv">${PRIV.ask()}</p>
      <div class="row center" style="gap:.6rem;flex-wrap:wrap"><button class="btn primary lg" id="callGo">📞 ${t('Gọi ngay')}</button><a class="btn" href="#/call">${t('Cuộc gọi khác')}</a></div></div>`;
    poFix(view);
    probe().then(() => { const p = $('#callPriv'); if (p) p.textContent = (PRIV[mode()] || PRIV.ask)(); });
    $('#callGo').onclick = () => start(c);
  }

  function start(c) {
    E.prep(c);
    const nm = WHO[c.who], voice = (window.LessonTeacher && LessonTeacher.VOICE || {})[c.who];
    const ov = document.createElement('div'); ov.className = 'call-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', t('Cuộc gọi với {name}', { name: nm }));
    document.body.appendChild(ov); document.body.classList.add('call-on');
    let id = c.start, rec = null, dead = false, t0 = Date.now(), tick = 0, autoMic = false, showTr = pref('tr') !== '0' && I18N.lang() !== 'en', busy = false;
    let turn = 0, phase = 'talk', tAsk = 0, longBuf = [], longEnd = 0, prepEnd = 0, tch = null, sayRun = 0;
    const log = [], lat = [], tr = {};
    const close = () => { dead = true; clearInterval(tick); sayRun++; if (tch) try { tch.stop(); tch.destroy && tch.destroy(); } catch (e) { /* bỏ qua */ } UI.stopSpeak(); stopRec(); ov.remove(); document.body.classList.remove('call-on'); document.removeEventListener('keydown', onKey); };
    App.cleanups.push(close);
    const onKey = e => { if (e.key === 'Escape') hang(); };
    document.addEventListener('keydown', onKey);
    ov.innerHTML = `<div class="call-top"><span id="cPriv">${(PRIV[mode()] || PRIV.ask)()}</span><span id="cT" aria-live="off">00:00</span></div>
      <div class="call-av" id="cAv"><img class="call-po" data-po src="${poster(c.who)}" alt="${nm}" width="210" height="280"></div>
      <div class="call-name">${nm}</div><div class="call-sub" lang="en">${esc(c.role)}</div>
      <div style="margin-top:.4rem"><span class="call-st" id="cSt" role="status" aria-live="polite"><i aria-hidden="true"><b></b><b></b><b></b></i><span id="cStT"></span></span></div>
      <div class="call-cap" id="cCap" aria-live="polite"><div class="l1" lang="en" id="cL1"></div><div class="l2" id="cL2"></div></div>
      <div id="cCue" style="width:100%;display:flex;justify-content:center"></div>
      <div id="cAsk" style="width:100%;display:flex;justify-content:center"></div>
      <div class="call-you" id="cYou" lang="en" aria-live="polite"></div>
      <div id="cTip" style="width:100%;display:flex;justify-content:center"></div>
      <div class="call-opts" id="cOpts" role="group" aria-label="${t('Gợi ý trả lời')}"></div>
      <form class="call-type" id="cType" autocomplete="off"><input id="cIn" lang="en" aria-label="${t('Gõ câu trả lời')}" placeholder="${t('Hoặc gõ câu trả lời…')}" enterkeyhint="send"><button type="submit">${t('Gửi')}</button></form>
      <div class="call-ctl">${I18N.lang() !== 'en' ? `<button class="call-sm" id="cTr" aria-pressed="${showTr}" aria-label="${t('Bật/tắt phụ đề dịch')}">Aa</button>` : ''}<button class="call-mic" id="cMic" aria-label="${t('Nói')}">🎙️</button><button class="call-end" id="cEnd" aria-label="${t('Kết thúc cuộc gọi')}">📵</button></div>`;
    poFix(ov);
    const alive = () => !dead && document.body.contains(ov);
    const node = () => c.nodes[id];
    tick = setInterval(() => {
      const el = $('#cT', ov); if (el) el.textContent = mmss(Math.floor((Date.now() - t0) / 1000));
      const ck = $('#cClock', ov), now = Date.now();
      if (ck && prepEnd) { const s = Math.ceil((prepEnd - now) / 1000); ck.textContent = mmss(s); if (s <= 0) { prepEnd = 0; answer(t('(đã chuẩn bị xong)'), true, true); } }
      else if (ck && longEnd) { const s = Math.ceil((longEnd - now) / 1000); ck.textContent = mmss(s); if (s <= 0) { longEnd = 0; endLong(); } }
    }, 500);

    // Giáo viên khớp môi: sprite (teacher.js) – lỗi/thiếu → ảnh poster tĩnh, cuộc gọi vẫn chạy
    if (window.LessonTeacher) try { const host = document.createElement('div'); host.className = 'tch'; $('#cAv', ov).appendChild(host); tch = LessonTeacher.mount(host, c.who); } catch (e) { tch = null; }

    // Phụ đề dịch (dòng 2): dịch sẵn mọi câu của giáo viên 1 lần – không chặn cuộc gọi; lỗi mạng thì chỉ hiện tiếng Anh
    const pieces = [...new Set(Object.values(c.nodes).flatMap(x => [x.m, x.re, ...(x.br || []).map(b => b[1])]).concat(c.end).filter(Boolean))];
    const canTr = I18N.lang() !== 'en' && window.Dict && Dict.translateTo;
    if (canTr) Dict.translateTo(pieces.join('\n'), I18N.lang()).then(out => { const ls = String(out || '').split('\n'); if (ls.length === pieces.length) pieces.forEach((p, k) => { tr[p] = ls[k]; }); paintTr(); }).catch(() => {});
    let cur = [];
    const fetchTr = ps => ps.filter(p => !tr[p]).forEach(p => Dict.translateTo(p, I18N.lang()).then(o => { if (o && alive()) { tr[p] = o; paintTr(); } }).catch(() => {}));
    const paintTr = () => { const l2 = $('#cL2', ov); if (l2) l2.textContent = showTr && cur.every(p => tr[p]) ? cur.map(p => tr[p]).join(' ') : ''; };

    // Trạng thái lượt lời: talk (giáo viên nói) · you (đến lượt bạn) · listen (đang nghe) · think (đang hiểu câu)
    function setPhase(p) {
      phase = p;
      const av = $('#cAv', ov), st = $('#cSt', ov), txt = $('#cStT', ov), mic = $('#cMic', ov); if (!av) return;
      av.classList.toggle('talk', p === 'talk'); av.classList.toggle('listen', p === 'listen'); st.className = 'call-st ' + p;
      txt.textContent = p === 'talk' ? t('{name} đang nói…', { name: nm }) : p === 'listen' ? t('Đang nghe bạn…') : p === 'think' ? t('Đang hiểu câu của bạn…') : p === 'done' ? t('Cuộc gọi kết thúc') : t('Đến lượt bạn – bấm micro để nói');
      mic.classList.toggle('on', p === 'listen'); mic.setAttribute('aria-label', p === 'listen' ? t('Dừng nghe') : t('Nói'));
    }
    // Nói lần lượt từng câu (mỗi câu 1 file Kokoro sinh sẵn) – sayRun đổi = bị ngắt lời → bỏ phần còn lại
    function say(parts, then) {
      cur = parts.filter(Boolean); const my = ++sayRun;
      $('#cL1', ov).textContent = cur.join(' '); paintTr(); if (canTr && showTr) setTimeout(() => alive() && fetchTr(cur), 1200);
      setPhase('talk');
      const done = () => { if (my !== sayRun || !alive()) return; setPhase('you'); if (then) then(); else if (autoMic && node() && !node().prep) listen(); };
      const one = k => {
        if (my !== sayRun || !alive()) return;
        if (k >= cur.length) return done();
        const text = cur[k]; let fin = false; const next = () => { if (fin) return; fin = true; one(k + 1); };
        if (tch) tch.say(text, { voice, accent: ACCENT, onEnd: next }); else UI.tts(text, ACCENT, undefined, { onEnd: next });
        setTimeout(next, Math.min(15000, 1500 + text.length * 90)); // trình duyệt không báo kết thúc → vẫn đi tiếp
      };
      one(0);
    }
    const hush = () => { sayRun++; if (tch) try { tch.stop(); } catch (e) { /* bỏ qua */ } UI.stopSpeak(); };

    const showOpts = () => {
      const box = $('#cOpts', ov), n = node(), cue = $('#cCue', ov);
      cue.innerHTML = n && (n.cue || n.long) ? `<div class="call-cue"><div class="row between">${n.prep ? `<b lang="en">${esc(n.m.split('. ').slice(-1)[0])}</b>` : `<b>${esc(t('Lượt nói dài: 1–2 phút'))}</b>`}<span class="call-clock" id="cClock" aria-live="off"></span></div>${(n.cue || (c.nodes[c.start] && c.nodes[c.start].cue) || []).length ? `<div class="tiny" style="opacity:.8;margin-top:.3rem">${t('Bạn nên nói:')}</div><ul lang="en">${(n.cue || c.nodes[c.start].cue).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${n.long ? `<div class="row" style="margin-top:.5rem;gap:.5rem;align-items:center"><button type="button" class="call-done" id="cLongDone">✓ ${t('Tôi nói xong')}</button><span class="tiny" id="cLongN" style="opacity:.8"></span></div>` : ''}</div>` : '';
      const ld = $('#cLongDone', cue); if (ld) ld.onclick = () => endLong();
      box.innerHTML = n ? n.o.map((o, k) => `<button type="button" data-o="${k}" lang="en">💬 ${esc(n.long ? o.split(/(?<=\.)\s/).slice(0, 2).join(' ') + ' …' : o)}</button>`).join('') : '';
      $$('[data-o]', box).forEach(b => b.onclick = () => (n.long ? answer(n.o[+b.dataset.o], true, true) : answer(n.o[+b.dataset.o], true)));
    };

    // text: câu trả lời · picked: chạm gợi ý · force: kết thúc lượt dài/chuẩn bị
    function answer(text, picked, force, extra = {}) {
      text = String(text || '').replace(/\s+/g, ' ').trim();
      const n = node();
      if (!text || busy || !alive() || !n) return;
      if (n.long && !force) { // Part 2: gom từng đoạn nói đến khi hết giờ / bấm "Tôi nói xong"
        longBuf.push(text); const all = longBuf.join(' ');
        $('#cYou', ov).textContent = all; const ln = $('#cLongN', ov); if (ln) ln.textContent = t('{n} từ', { n: E.fluency(all).words });
        if (longEnd && Date.now() < longEnd - 3000 && autoMic) setTimeout(() => alive() && phase !== 'listen' && listen(), 250);
        return;
      }
      busy = true; setPhase('think'); prepEnd = 0;
      const a0 = performance.now(); stopRec(); hush();
      if (n.long && longBuf.length && !picked) text = longBuf.join(' ');
      if (n.long) { longEnd = 0; longBuf = []; }
      const tipBox = $('#cTip', ov); tipBox.innerHTML = '';
      if (UNSAFE.test(text)) { busy = false; say(['Let\'s keep our chat friendly and on topic!', n.m]); return; }
      const secs = tAsk ? Math.max(0, (Date.now() - tAsk) / 1000) : 0;
      if (!n.prep) log.push(Object.assign({ id, text, picked: !!picked, secs: extra.secs != null ? extra.secs : (picked ? 0 : secs) }, extra));
      if (!picked) $('#cYou', ov).textContent = '🗣️ ' + text;
      const fix = picked || n.prep ? null : E.correct(text, n.m), sl = picked || n.prep ? [] : E.slips(text, c, n);
      if (fix) tipBox.innerHTML = `<div class="call-tip">💡 ${t('{name} hiểu ý bạn! Nói tự nhiên hơn:', { name: nm })}<div lang="en"><s>${esc(fix.bad)}</s> → <b>${esc(fix.good)}</b></div><div class="small">${esc(fix.why)}</div></div>`;
      else if (sl.length) tipBox.innerHTML = `<div class="call-tip">👂 ${t('Nghe giống “{said}” – bạn muốn nói “{meant}”? Hai từ này chỉ khác một âm.', { said: sl[0].said, meant: sl[0].meant })}</div>`;
      const r = E.step(c, id, text);
      id = r.next; turn++;
      const nx = node();
      lat.push(performance.now() - a0);
      busy = false;
      $('#cIn', ov).value = '';
      say([r.react, nx ? nx.m : c.end], () => enter(nx));
      showOpts();
      if (!nx) $('#cOpts', ov).innerHTML = '';
    }
    // Vào lượt mới sau khi giáo viên nói xong: chuẩn bị (đếm ngược) · lượt dài (đồng hồ 2 phút, micro tự mở lại sau mỗi đoạn) · lượt thường
    function enter(nx) {
      tAsk = Date.now();
      if (!nx) { setPhase('done'); $('#cMic', ov).disabled = true; setTimeout(() => alive() && finish(), 900); return; }
      if (nx.prep) { prepEnd = Date.now() + nx.prep * 1000; showOpts(); return; }
      if (nx.long) { longEnd = Date.now() + 120000; longBuf = []; showOpts(); }
      if (autoMic) listen();
    }
    function endLong() { const n = node(); if (!n || !n.long) return; const all = longBuf.join(' '); if (all) answer(all, false, true); else answer(n.o[0], true, true); }

    function stopRec() { if (rec) { const r0 = rec; rec = null; try { r0.stop(); } catch (e) { /* bỏ qua */ } } }
    function listen() {
      if (!alive() || rec) return;
      const n = node(); if (!n || n.prep) return;
      const m = mode();
      if (m === 'ask') return askAsr();
      if (m === 'tap') { autoMic = false; toast(t('Trên thiết bị này hãy chạm gợi ý hoặc gõ câu trả lời.'), 3500); return; }
      hush(); setPhase('listen');
      const my = ++turn, s0 = Date.now(), words = [...new Set(E.words(n.o.join(' ') + ' ' + (n.kw || []).join(' ') + ' ' + (c.words || []).join(' ')))].filter(w => w.length > 3).slice(0, 40);
      const cb = {
        start: () => { if (my === turn) setPhase('listen'); },
        result: ({ heard, score }) => { if (my !== turn || !alive()) return; turn++; if (heard) answer(heard, false, false, { secs: (Date.now() - s0) / 1000, asr: score }); else setPhase('you'); },
        error: code => { if (my !== turn) return; autoMic = false; setPhase('you'); if (code !== 'no-speech') toast(UI.recErrorText(code), 3500); else toast(UI.recErrorText('no-speech'), 2500); },
        end: () => { if (rec && rec._my === my) rec = null; if (my === turn && phase === 'listen') setPhase('you'); },
      };
      if (m === 'local') cb.setup = r => { r.processLocally = true; if (n.long) r.continuous = false; if (typeof window.SpeechRecognitionPhrase === 'function' && 'phrases' in r) r.phrases = words.map(w => new window.SpeechRecognitionPhrase(w, 3)); };
      if (m === 'whisper') { cb.whisper = true; cb.maxMs = n.long ? 28000 : Math.min(15000, 3000 + (n.min || 8) * 450); }
      rec = UI.recognize(n.o[0], ACCENT, cb);
      if (rec) rec._my = my; else setPhase('you');
    }
    // Lần đầu (trình duyệt chưa có gói nhận dạng trên máy): người học chọn – trên máy là lựa chọn đầu, đám mây ghi rõ
    function askAsr() {
      const box = $('#cAsk', ov); if (!box || box.firstChild) return;
      const SR = SRC();
      box.innerHTML = `<div class="call-ask" role="group" aria-label="${t('Chọn cách nhận dạng giọng nói')}"><b>🎙️ ${t('Chọn cách nhận dạng giọng nói')}</b>
        ${env.localDl && SR && SR.install ? `<button type="button" data-a="chrome">🔒 ${t('Tải gói nhận dạng của Chrome (chạy trên máy)')}</button>` : ''}
        ${env.media && !env.ext ? `<button type="button" data-a="device">🔒 ${t('Nhận dạng trên máy bằng Whisper (tải ~40 MB một lần, nên dùng Wi-Fi)')}</button>` : ''}
        ${env.sr ? `<button type="button" data-a="cloud">☁️ ${t('Dùng dịch vụ của trình duyệt (âm thanh được gửi đi để nhận dạng)')}</button>` : ''}
        <button type="button" data-a="tap">⌨️ ${t('Chỉ chạm gợi ý hoặc gõ phím')}</button></div>`;
      $$('[data-a]', box).forEach(b => b.onclick = async () => {
        const a = b.dataset.a; box.innerHTML = '';
        if (a === 'chrome') { try { toast(t('Đang tải gói nhận dạng…'), 3000); const okI = await SR.install({ langs: [ACCENT], processLocally: true }); if (okI) { env.local = true; env.localDl = false; } } catch (e) { /* lỗi → hỏi lại */ } }
        else if (a === 'device') { try { localStorage.setItem('vb.whisper', '1'); } catch (e) { /* bỏ qua */ } pref('asr', 'device'); if (UI.whisperWarm) UI.whisperWarm(p => { const st = $('#cStT', ov); if (st && phase !== 'listen') st.textContent = t('Đang tải mô hình nhận dạng giọng nói… {p}%', { p: Math.round(p) }); }).catch(() => {}); }
        else pref('asr', a);
        $('#cPriv', ov).textContent = (PRIV[mode()] || PRIV.ask)();
        if (mode() === 'tap') { $('#cMic', ov).disabled = true; return; }
        autoMic = true; listen();
      });
      setPhase('you');
    }

    $('#cMic', ov).onclick = () => { if (phase === 'listen' && rec) { const r0 = rec; try { r0.stop(); } catch (e) { /* bỏ qua */ } return; } autoMic = true; listen(); };
    $('#cType', ov).onsubmit = e => { e.preventDefault(); const v = $('#cIn', ov).value; if (!v.trim()) return; turn++; stopRec(); answer(v, false, false, { typed: true }); };
    const trBtn = $('#cTr', ov); if (trBtn) trBtn.onclick = () => { showTr = !showTr; pref('tr', showTr ? '1' : '0'); trBtn.setAttribute('aria-pressed', String(showTr)); paintTr(); };
    const hang = () => { if (log.length) finish(); else { close(); location.hash = '#/call'; } };
    $('#cEnd', ov).onclick = hang;

    function finish() {
      if (!alive()) return;
      const secs = Math.round((Date.now() - t0) / 1000), avgLat = lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : 0;
      close();
      summary(c, log, secs, avgLat);
    }
    probe().then(() => { if (alive()) $('#cPriv', ov).textContent = (PRIV[mode()] || PRIV.ask)(); });
    showOpts();
    const first = c.nodes[c.start];
    say([first.m], () => enter(first));
    $('#cMic', ov).focus({ preventScroll: true });
    window.__callState = () => ({ id, phase, turn, log: log.slice(), mode: mode() }); // để kiểm thử e2e
  }

  const NOTE = {
    short: x => t('Có {n} câu trả lời hơi ngắn – hãy trả lời đầy đủ hơn: thêm một lý do (because…) hoặc một ví dụ (for example…).', { n: x.n }),
    link: () => t('Dùng thêm từ nối như because, so, however, for example để câu trả lời liền mạch như bài thi band cao.'),
    fillers: x => t('Bạn dùng {n} từ đệm (um, uh…). Thử dừng ngắn và thở thay vì “um” – nghe tự tin hơn.', { n: x.n }),
    slips: () => t('Có từ nghe thành một từ khác chỉ khác một âm – luyện cặp âm đó ở mục Phát âm.'),
    slow: x => t('Tốc độ khoảng {wpm} từ/phút. Cứ thong thả, nhưng cố nói liền từng cụm thay vì từng từ.', { wpm: x.wpm }),
    speak: () => t('Lần sau hãy thử nói bằng giọng – chỉ cần một câu ngắn cũng được.'),
    good: () => t('Câu trả lời đầy đủ và tự nhiên – tuyệt vời! Thử một cuộc gọi khó hơn nhé.'),
  };
  const BAND = { great: () => t('Xuất sắc!'), good: () => t('Tốt lắm – tiến bộ rõ!'), keep: () => t('Khởi đầu tốt – luyện thêm chút nữa nhé!') };
  const sayBtn = (w, rate) => `<button type="button" class="icon-btn sm" data-say="${esc(w)}" data-rate="${rate || ''}" aria-label="${t('Nghe')}">🔊</button>`;

  function summary(c, log, secs, avgLat) {
    const r = E.recap(c, log), nm = WHO[c.who];
    const voiced = log.filter(x => !x.picked && !x.typed).length, xp = 5 + r.turns.length * 2 + voiced * 2 + (r.used.length ? 3 : 0);
    App.reward({ spoken: voiced, xp });
    const tx = r.turns.map(x => `<div class="call-tx ${x.weak ? 'weak' : ''}"><div class="small q" lang="en"><b>${nm}:</b> ${esc(x.m || '')}</div>
        <div class="a" lang="en"><b>${t('Bạn')}:</b> ${esc(x.text)}${x.picked ? ` <span class="chip">${t('gợi ý')}</span>` : ''}</div>
        ${x.fix ? `<div class="small"><span lang="en"><s>${esc(x.fix.bad)}</s> → <b>${esc(x.fix.good)}</b></span> <span class="muted">${esc(x.fix.why)}</span></div>` : ''}
        ${x.slips.map(s => `<div class="small">👂 <span lang="en"><b>${esc(s.meant)}</b> ${UI.ipaTag ? UI.ipaTag(s.meant, ACCENT) : ''} ${sayBtn(s.meant)} ≠ ${esc(s.said)} ${UI.ipaTag ? UI.ipaTag(s.said, ACCENT) : ''} ${sayBtn(s.said)}</span> <a href="#/pron/${encodeURIComponent(s.skill)}" class="tiny">${t('Luyện cặp âm này')}</a></div>`).join('')}
        ${x.fl.short ? `<div class="small muted">↻ ${t('Trả lời đầy đủ hơn: thêm lý do hoặc ví dụ.')}</div>` : ''}
        ${x.weak || x.picked ? `<div class="small muted">${t('Câu mẫu')}: <span lang="en">${esc(x.model)}</span> ${sayBtn(x.model)} ${sayBtn(x.model, 0.7)}🐢</div>` : ''}</div>`).join('');
    view.innerHTML = `<div class="page-head"><div><h1>📞 ${t('Tổng kết cuộc gọi')}</h1><p class="muted">${esc(nameOf(c))}${c.retry ? ' · ' + t('Luyện lại') : ''} · ${t('{m} phút {s} giây', { m: Math.floor(secs / 60), s: secs % 60 })} · +${xp} XP</p></div></div>
      <div class="card" data-latency="${avgLat}" data-score="${r.score}">
        <div class="call-score">${UI.ring(r.score, r.score)}<div><b>${BAND[r.band]()}</b><p class="small muted" style="margin:.2rem 0 0">${t('Bạn đã trả lời {n} lượt, trong đó {s} lượt bằng giọng nói.', { n: r.turns.length, s: voiced })}${r.words ? ' · ' + t('{n} từ', { n: r.words }) : ''}</p></div></div>
        ${r.target.length ? `<h2 class="set-h">🧩 ${t('Bạn đã dùng {n}/{k} từ chủ đề', { n: r.used.length, k: r.target.length })}</h2><div class="call-chips" lang="en">${r.target.map(w => `<span class="chip ${r.used.includes(w) ? 'ok' : ''}">${r.used.includes(w) ? '✓ ' : ''}${esc(w)}</span>`).join('')}</div>` : ''}
        <h2 class="set-h">📈 ${t('Nhận xét độ trôi chảy')}</h2><ul class="small" style="padding-inline-start:1.1rem">${r.notes.map(x => `<li>${esc(NOTE[x.id](x))}</li>`).join('')}</ul>
        <h2 class="set-h">📝 ${t('Lời thoại & sửa lỗi')}</h2>${tx || `<p class="muted">${t('Chưa có lượt nào.')}</p>`}
        <h2 class="set-h">💬 ${t('Cụm từ nên nhớ')}</h2>
        <ul class="small" style="padding-inline-start:1.1rem">${c.phrases.map(([p, d]) => `<li lang="en"><b>${esc(p)}</b> – <span class="muted">${esc(d)}</span></li>`).join('')}</ul>
        <div class="row" style="gap:.6rem;flex-wrap:wrap;margin-top:1rem">${r.weak.length ? `<button class="btn primary" id="cRetry">↻ ${t('Luyện lại {n} câu yếu', { n: r.weak.length })}</button>` : ''}<button class="btn ${r.weak.length ? '' : 'primary'}" id="cSave">+ ${t('Thêm vào thẻ ôn')}</button><a class="btn" href="#/call/${c.id}">📞 ${t('Gọi lại')}</a><a class="btn" href="#/call">${t('Cuộc gọi khác')}</a></div>
        <p class="tiny muted" style="margin-top:.8rem">${t('Lời bạn nói chỉ được xử lý trên máy để chấm và hiện lời thoại – Lexkite không lưu lại.')}</p></div>`;
    $$('[data-say]', view).forEach(b => b.onclick = () => UI.tts(b.dataset.say, ACCENT, b.dataset.rate ? +b.dataset.rate : undefined));
    const rb = $('#cRetry'); if (rb) rb.onclick = () => { const base = (window.CALLS || []).find(x => x.id === c.id) || c; start(E.retry(E.prep(base), r.weak)); };
    $('#cSave').onclick = async () => {
      const b = $('#cSave'); b.disabled = true;
      const fixes = r.turns.filter(x => x.fix).map(x => x.fix);
      for (const [p, d] of c.phrases) await App.addWord({ word: p, def: d, pos: 'phrase', emoji: '📞', topic: 'call' }, { text: d, title: 'Call ' + nm + ': ' + c.title }, { silent: true });
      for (const x of fixes) await App.addWord({ word: x.good, pos: 'phrase', ex: x.good, emoji: '📞', topic: 'call' }, { text: x.good, title: 'Call ' + nm + ': ' + c.title }, { silent: true });
      b.textContent = '✓ ' + t('Đã thêm {n} thẻ', { n: c.phrases.length + fixes.length }); toast(t('Đã thêm {n} thẻ', { n: c.phrases.length + fixes.length }));
    };
  }
  window.CallMia = { correct: E.correct }; // tương thích kiểm thử cũ
})();
