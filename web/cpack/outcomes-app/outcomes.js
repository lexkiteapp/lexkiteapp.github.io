/* 📈 #/outcome – Bài đo đầu vào + bản ghi tiến bộ (docs/specs/outcomes-3-6m.md §5, mốc 1). Tải lười: app.js BUNDLES.outcome.
 *   #/outcome     trang tiến bộ: lịch đo 4 tuần, biểu đồ từng chỉ số, so lần đầu ↔ mới nhất (nghe lại ghi âm, đọc 2 bài viết)
 *   #/outcome/go  bài đo 3 phần (~12'): đọc to → nói tự do 1–2' → viết 10' → kết quả CEFR ước tính + ≤ 3 điểm sửa
 * Lối thoát: exit-guard.js WITH_ARG có 'outcome' (#/outcome/go = màn học, #/outcome = trang trung tâm).
 * Chấm bằng engine miễn phí có sẵn: Web Speech liên tục (như speaking.js) + LK_WRITE.check; lõi thuần ở outcomes-core.js.
 * Lưu: chỉ số + bài viết → settings.outcomes (đồng bộ sẵn có) + bản sao trên máy (Store 'outcomes') gộp theo id;
 * ghi âm CHỈ trên máy (IndexedDB 'lexkite-voice'), không gửi đi đâu. Không gọi t() lúc nạp module. */
(function () {
  const g = window, App = g.App; if (!App || !App.routes) return;
  const O = g.Outcomes, { $, esc, toast } = UI, { state, routes } = App;
  const KEEP_AUDIO = 6; // giữ ghi âm lần đầu + 5 lần gần nhất

  // ---------- Ghi âm trên máy (IndexedDB riêng, không đồng bộ) ----------
  let dbP = null;
  const vdb = () => dbP || (dbP = new Promise((res, rej) => { if (!g.indexedDB) return rej(new Error('no-idb')); const q = indexedDB.open('lexkite-voice', 1); q.onupgradeneeded = () => q.result.createObjectStore('clips'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }).catch(e => { dbP = null; throw e; }));
  const vdo = (mode, fn) => vdb().then(db => new Promise((res, rej) => { const tx = db.transaction('clips', mode), r = fn(tx.objectStore('clips')); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); }));
  const clipPut = (k, blob) => vdo('readwrite', st => st.put(blob, k)).catch(() => {});
  const clipGet = k => vdo('readonly', st => st.get(k)).catch(() => null);
  const clipKeys = () => vdo('readonly', st => st.getAllKeys()).catch(() => []);
  const clipDel = k => vdo('readwrite', st => st.delete(k)).catch(() => {});
  async function pruneAudio(checks) {
    const keep = new Set(checks.length ? [checks[0].id, ...checks.slice(-(KEEP_AUDIO - 1)).map(c => c.id)] : []);
    for (const k of await clipKeys() || []) if (!keep.has(String(k).split(':')[0])) await clipDel(k);
  }

  // ---------- Dữ liệu lần đo (đồng bộ + bản sao trên máy, gộp hợp theo id) ----------
  async function load() {
    const local = await Core.Store.get('outcomes', []), synced = (state.settings.outcomes && state.settings.outcomes.checks) || [];
    const all = O.merge(local, synced);
    if (all.length !== synced.length || all.some((c, i) => !synced[i] || synced[i].id !== c.id)) await save(all); // bản trên máy có lần đo mà bản đồng bộ (thắng theo thời gian) chưa có → ghi lại
    return all;
  }
  async function save(checks) {
    const slimmed = checks.map(O.slim);
    await Core.Store.set('outcomes', slimmed);
    state.settings.outcomes = { v: 1, checks: slimmed };
    await App.saveSettings();
    if (g.Sync && Sync.schedule) Sync.schedule();
  }

  // ---------- Ghi âm + bản ghi chữ liên tục (Web Speech; không có thì chỉ ghi âm) ----------
  function recorder(onText) {
    const SR = g.SpeechRecognition || g.webkitSpeechRecognition;
    let stream = null, media = null, chunks = [], rec = null, on = false, fin = '', intm = '', t0 = 0;
    const start = async () => {
      UI.stopSpeak && UI.stopSpeak();
      stream = await navigator.mediaDevices.getUserMedia({ audio: { autoGainControl: true, noiseSuppression: true, echoCancellation: true } });
      try { media = new MediaRecorder(stream); media.ondataavailable = e => e.data.size && chunks.push(e.data); media.start(); } catch (e) { media = null; }
      if (SR) {
        rec = new SR(); rec.lang = state.settings.accent || 'en-US'; rec.continuous = true; rec.interimResults = true;
        rec.onresult = e => { intm = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript + ' '; else intm += r[0].transcript; } onText && onText((fin + intm).trim()); };
        rec.onend = () => { if (on && rec) try { rec.start(); } catch (e) { /* đang chạy */ } }; // Chrome tự dừng khi im lặng lâu
        try { rec.start(); } catch (e) { /* đã chạy */ }
      }
      on = true; t0 = Date.now();
    };
    const stop = () => new Promise(res => {
      if (!on) return res(null);
      on = false; const sec = (Date.now() - t0) / 1000;
      try { rec && rec.stop(); } catch (e) { /* đã dừng */ } rec = null;
      const done = () => { if (stream) stream.getTracks().forEach(x => x.stop()); setTimeout(() => res({ text: (fin + ' ' + intm).trim(), sec, blob: chunks.length ? new Blob(chunks, { type: (media && media.mimeType) || 'audio/webm' }) : null, sr: !!SR }), 350); };
      if (media && media.state !== 'inactive') { media.onstop = done; try { media.stop(); } catch (e) { done(); } } else done();
    });
    return { start, stop, sr: !!SR, get on() { return on; } };
  }

  const fmtDate = at => { try { return new Date(at).toLocaleDateString(I18N && I18N.lang ? I18N.lang() : undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return new Date(at).toDateString(); } };
  const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const DIMS = () => [['fl', t('Trôi chảy')], ['rg', t('Vốn từ')], ['ac', t('Độ chính xác')], ['ph', t('Độ rõ phát âm')], ['wr', t('Viết')]];

  // ---------- Trang tiến bộ ----------
  // Biểu đồ đường nhỏ cho 1 chỉ số; low = càng thấp càng tốt (lỗi/100 từ)
  function spark(vals, low) {
    const pts = vals.map((v, i) => [i, v]).filter(p => p[1] != null);
    if (!pts.length) return '';
    const W = 160, H = 56, P = 6, lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1])), span = hi - lo || 1, n = Math.max(1, vals.length - 1);
    const xy = pts.map(([i, v]) => [P + (W - 2 * P) * (vals.length === 1 ? 0.5 : i / n), H - P - (H - 2 * P) * ((v - lo) / span)]);
    const path = xy.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${path}" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${xy.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2" fill="var(--primary)"/>`).join('')}</svg>`;
  }
  const METRICS = () => [
    [t('Từ/phút khi nói'), c => c.sp && !c.sp.few && c.sp.wpm ? c.sp.wpm : null, false],
    [t('Độ rõ khi đọc to (%)'), c => c.rd && c.rd.w ? c.rd.acc : null, false],
    [t('Lỗi / 100 từ'), c => { const s = c.sp && !c.sp.few ? c.sp : null, w = c.wr && !c.wr.few ? c.wr : null, n = (s ? s.w : 0) + (w ? w.w : 0); return n ? Math.round(((s ? s.epw * s.w : 0) + (w ? w.epw * w.w : 0)) / n * 10) / 10 : null; }, true],
    [t('Đa dạng từ (MATTR)'), c => { const v = [c.sp && !c.sp.few && c.sp.mattr, c.wr && !c.wr.few && c.wr.mattr].filter(x => x); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 100) / 100 : null; }, false],
    [t('Số từ viết trong 10 phút'), c => c.wr ? c.wr.w : null, false],
  ];
  async function hub(view) {
    const checks = await App.live(load()), d = O.due(checks), last = checks[checks.length - 1], first = checks[0];
    if (!checks.length) {
      view.innerHTML = `<div class="oc-wrap oc-hub"><div class="page-head"><div><h1>${t('Bài đo đầu vào: nói + viết')}</h1></div></div><div class="card"><div class="oc-step">${t('Đo đầu ra')}</div>
        <p>${t('Khoảng 12 phút, 3 phần: đọc to một đoạn ngắn, nói tự do 1–2 phút và viết 10 phút. Lexkite đo tốc độ nói, độ rõ, lỗi trên 100 từ, độ đa dạng từ và bài viết, rồi ước tính trình độ CEFR từng khía cạnh.')}</p>
        <p class="small muted">${t('Mỗi 4 tuần đo lại để nghe bản ghi tháng đầu cạnh bản mới nhất và thấy tiến bộ thật. Ghi âm chỉ lưu trên máy của bạn.')}</p>
        <a class="btn primary lg block" href="#/outcome/go">${t('Bắt đầu bài đo')}</a></div></div>`;
      return;
    }
    const e = O.estimate(last); // tính lại theo rubric hiện hành (hiệu chuẩn lại không để mức cũ lệch giữa các lần đo)
    const metrics = METRICS().map(([label, get, low]) => {
      const vals = checks.map(get), a = vals.find(v => v != null), b = [...vals].reverse().find(v => v != null);
      if (b == null) return '';
      const dv = a != null && checks.length > 1 ? Math.round((b - a) * 100) / 100 : null, good = dv != null && (low ? dv < 0 : dv > 0);
      return `<figure><figcaption>${esc(label)}</figcaption>${spark(vals, low)}<div><b>${b}</b>${dv ? ` <span class="small oc-delta ${good ? 'up' : 'down'}">${dv > 0 ? '+' : ''}${dv}</span>` : ''}</div></figure>`;
    }).join('');
    const col = (c, label) => `<div><b>${esc(label)}</b><div class="small muted">${esc(fmtDate(c.at))} · ${esc(O.estimate(c).all || '–')}</div>
      <div data-aud="${esc(c.id)}:sp"></div><div data-aud="${esc(c.id)}:rd"></div>${c.wr && c.wr.text ? `<p lang="en">${esc(c.wr.text)}</p>` : ''}</div>`;
    view.innerHTML = `<div class="oc-wrap oc-hub"><div class="page-head"><div><h1>${t('Tiến bộ nói + viết')}</h1></div></div>
      <div class="card"><div class="oc-step">${t('Đo đầu ra')}</div>
        <p>${t('Lần đo gần nhất: {date} · Ước tính {cefr}', { date: esc(fmtDate(last.at)), cefr: esc(e.all || '–') })}</p>
        <div class="oc-grid">${DIMS().map(([k, l]) => `<div class="oc-dim"><span>${l}</span><b>${esc(e[k] || '–')}</b></div>`).join('')}</div>
        <p class="small muted">${t('Ước tính từ rubric CEFR của Lexkite, không phải chứng chỉ.')}</p>
        ${d.due ? `<a class="btn primary lg block" href="#/outcome/go">${t('Làm bài đo tháng này')}</a>` : `<p><b>${t('Lần đo tiếp theo: còn {n} ngày', { n: d.days })}</b></p><a class="btn block" href="#/outcome/go">${t('Đo lại ngay')}</a>`}
      </div>
      <div class="card"><h2>${t('Chỉ số qua từng lần đo')}</h2><div class="oc-chart">${metrics}</div></div>
      ${checks.length > 1 ? `<div class="card"><h2>${t('Nghe lại: lần đầu và mới nhất')}</h2><div class="oc-cmp">${col(first, t('Lần đầu'))}${col(last, t('Mới nhất'))}</div></div>` : ''}
      <div class="card"><p class="small muted">${t('Ghi âm chỉ lưu trên máy này (giữ lần đầu + 5 lần gần nhất), không gửi đi đâu. Chỉ số và bài viết được đồng bộ khi bạn đăng nhập.')}</p>
        <button class="btn ghost" id="ocDelAud">${t('Xóa ghi âm trên máy')}</button></div></div>`;
    const urls = [];
    App.cleanups.push(() => urls.forEach(u => URL.revokeObjectURL(u)));
    for (const el of view.querySelectorAll('[data-aud]')) {
      const blob = await clipGet(el.dataset.aud); if (!blob || !el.isConnected) continue;
      const u = URL.createObjectURL(blob); urls.push(u);
      el.innerHTML = `<span class="small muted">${el.dataset.aud.endsWith(':rd') ? t('Đọc to') : t('Nói tự do')}</span><audio controls preload="none" src="${u}"></audio>`;
    }
    const del = $('#ocDelAud');
    if (del) del.onclick = async () => { if (!confirm(t('Xóa mọi ghi âm bài đo trên máy này? Chỉ số và bài viết vẫn giữ.'))) return; for (const k of await clipKeys() || []) await clipDel(k); toast(t('Đã xóa ghi âm')); hub(view); };
  }

  // ---------- Bài đo 3 phần ----------
  function run(view) {
    const checks0 = (state.settings.outcomes && state.settings.outcomes.checks) || [];
    const lastEst = checks0.length ? checks0[checks0.length - 1].est && checks0[checks0.length - 1].est.all : null;
    const pl = state.settings.placement, plCefr = pl && (pl.gCefr || pl.vCefr);
    const band = O.bandOf(lastEst || plCefr || 'B1'), formId = O.pickForm(g.OUTCOME_FORMS, band, checks0), F = g.OUTCOME_FORMS[formId];
    const C = { id: 'oc' + Date.now().toString(36), at: 0, form: formId, lo: F.lo }, blobs = {};
    let R = null, tick = null;
    const stopAll = () => { clearInterval(tick); if (R && R.on) R.stop(); };
    App.cleanups.push(stopAll);
    if (App.holdRoute) App.holdRoute(); // đang làm bài → đồng bộ/boot không vẽ lại xóa tiến độ

    const micStep = (n, title, body, maxSec, minSec, next) => {
      view.innerHTML = `<div class="oc-wrap"><div class="card"><div class="oc-step">${t('Phần {n}/3', { n })}</div><h2>${title}</h2>${body}
        <div class="oc-mic"><button class="btn primary lg" id="ocRec" data-lk-primary aria-label="${t('Bắt đầu ghi âm')}">🎙️ ${t('Bắt đầu')}</button><span class="oc-clock" id="ocClock" aria-live="off">0:00</span></div>
        <div class="oc-live" id="ocLive" aria-live="polite"></div>
        <p class="small muted" id="ocHint">${t('Bấm Bắt đầu rồi nói to, rõ ràng. Bấm lần nữa khi xong.')}</p>
        <button class="btn ghost" id="ocSkip" data-lk-skip>${t('Bỏ qua')}</button></div></div>`;
      const btn = $('#ocRec');
      $('#ocSkip').onclick = () => { if (R && R.on) { clearInterval(tick); R.stop(); R = null; } next(null); }; // không có micro/không muốn nói → vẫn làm tiếp phần viết (phần nói không được chấm)
      btn.onclick = async () => {
        if (R && R.on) {
          const sec = (Date.now() - R.t0) / 1000;
          if (sec < minSec && !confirm(t('Bạn mới nói {s} giây. Dừng thật chứ? Nói lâu hơn giúp đo chính xác hơn.', { s: Math.round(sec) }))) return;
          clearInterval(tick); btn.disabled = true; const r = await R.stop(); R = null; return next(r);
        }
        if (!navigator.mediaDevices || !g.MediaRecorder) return toast(t('Trình duyệt không hỗ trợ ghi âm – hãy dùng Chrome hoặc Edge.'), 4000);
        R = recorder(txt => { const l = $('#ocLive'); if (l) l.textContent = txt.slice(-220); });
        try { await R.start(); } catch (e) { R = null; return toast('⚠️ ' + t('Cần cho phép dùng micro (biểu tượng 🎙️ trên thanh địa chỉ)'), 4000); }
        R.t0 = Date.now();
        btn.innerHTML = '⏹ ' + t('Xong'); btn.setAttribute('aria-label', t('Dừng ghi âm'));
        $('#ocHint').textContent = R.sr ? t('Đang ghi âm và chuyển thành chữ…') : t('Đang ghi âm… (trình duyệt không chuyển giọng nói thành chữ – phần nói sẽ không được chấm)');
        tick = setInterval(() => { const s = (Date.now() - R.t0) / 1000, el = $('#ocClock'); if (!el) return clearInterval(tick); el.textContent = clock(s); if (s >= maxSec) btn.click(); }, 250);
      };
    };
    const intro = () => {
      view.innerHTML = `<div class="oc-wrap"><div class="card"><div class="oc-step">${t('Đo đầu ra')}</div><h2>${t('Bài đo: nói + viết (~12 phút)')}</h2>
        <ol><li>${t('Đọc to một đoạn ngắn (1 phút)')}</li><li>${t('Nói tự do theo đề (1–2 phút)')}</li><li>${t('Viết một đoạn (10 phút)')}</li></ol>
        <p class="small muted">${t('Ngồi chỗ yên tĩnh, dùng tai nghe có micro nếu có. Cứ nói tự nhiên – đây là mốc để so với chính bạn sau này.')}</p>
        <button class="btn primary lg block" id="ocGo" data-lk-primary>${t('Bắt đầu')}</button></div></div>`;
      $('#ocGo').onclick = step1;
    };
    const step1 = () => micStep(1, t('Đọc to đoạn này'), `<p class="oc-passage" lang="en">${esc(F.read)}</p>`, 60, 8, r => {
      if (r) { C.rd = r.sr ? O.read({ target: F.read, heard: r.text, sec: r.sec }) : null; if (r.blob) blobs.rd = r.blob; }
      step2();
    });
    const step2 = () => micStep(2, t('Nói tự do 1–2 phút'), `<p class="oc-passage" lang="en">${esc(F.speak)}</p><p class="small muted">${t('Cố gắng nói ít nhất 1 phút. Máy tự dừng ở 2 phút.')}</p>`, 120, 45, r => {
      if (r) { C.sp = r.sr ? Object.assign(O.speech({ text: r.text, sec: r.sec }), { text: r.text.slice(0, 1500) }) : null; if (r.blob) blobs.sp = r.blob; }
      step3();
    });
    const step3 = () => {
      const t0 = Date.now();
      view.innerHTML = `<div class="oc-wrap"><div class="card"><div class="oc-step">${t('Phần {n}/3', { n: 3 })}</div><h2>${t('Viết trong 10 phút')}</h2>
        <p class="oc-passage" lang="en">${esc(F.write)}</p>
        <label class="small muted" for="ocTxt">${t('Viết bằng tiếng Anh, 80–150 từ. Không dùng công cụ dịch – bài đo là để so với chính bạn.')}</label>
        <textarea id="ocTxt" lang="en" spellcheck="false" autocapitalize="sentences"></textarea>
        <div class="oc-mic"><span class="oc-clock" id="ocClock">10:00</span><span class="small muted" id="ocWc">${t('{n} từ', { n: 0 })}</span></div>
        <button class="btn primary lg block" id="ocDone" data-lk-primary>${t('Nộp bài')}</button></div></div>`;
      const ta = $('#ocTxt'), wc = () => O.words(ta.value).length;
      ta.oninput = () => { $('#ocWc').textContent = t('{n} từ', { n: wc() }); };
      tick = setInterval(() => { const el = $('#ocClock'); if (!el) return clearInterval(tick); const left = Math.max(0, 600 - (Date.now() - t0) / 1000); el.textContent = clock(left); if (!left) { clearInterval(tick); el.textContent = t('Hết giờ – nộp khi bạn sẵn sàng'); } }, 500);
      $('#ocDone').onclick = () => {
        if (wc() < O.MIN_WRITE && !confirm(t('Bài viết mới có {n} từ. Nộp luôn chứ? Phần viết cần ít nhất {m} từ để được chấm.', { n: wc(), m: O.MIN_WRITE }))) return;
        clearInterval(tick); C.wr = Object.assign(O.writing({ text: ta.value }), { text: ta.value.trim(), min: Math.round((Date.now() - t0) / 6e4) });
        finish();
      };
    };
    const finish = async () => {
      C.at = Date.now(); C.est = O.estimate(C); C.errs = O.topFixes(C, 8).reduce((m, x) => (m[x.rule] = x.n, m), {}); C.xp = O.xpFor(C);
      const fixes = O.topFixes(C);
      const all = O.merge(await load(), [C]);
      await save(all);
      for (const k of Object.keys(blobs)) await clipPut(C.id + ':' + k, blobs[k]);
      await pruneAudio(all);
      if (C.xp) App.reward({ xp: C.xp });
      g.Sfx && Sfx.win && Sfx.win(); g.confetti && confetti(90);
      const e = C.est, first = all.length === 1;
      const why = [!C.sp || C.sp.few ? t('Phần nói quá ngắn hoặc chưa chuyển được thành chữ – chưa chấm trôi chảy.') : '', !C.wr || C.wr.few ? t('Bài viết dưới {m} từ – chưa chấm phần viết.', { m: O.MIN_WRITE }) : ''].filter(Boolean);
      view.innerHTML = `<div class="oc-wrap"><div class="card" data-lesson-done><div class="oc-step">${first ? t('Mốc đầu vào') : t('Đo đầu ra')}</div>
        <h2>${e.all ? t('Ước tính tổng: {cefr}', { cefr: esc(e.all) }) : t('Đã lưu bài đo')}</h2>
        <div class="oc-grid">${DIMS().map(([k, l]) => `<div class="oc-dim"><span>${l}</span><b>${esc(e[k] || '–')}</b></div>`).join('')}</div>
        <div class="oc-grid">${C.sp && !C.sp.few ? `<div class="oc-dim"><span>${t('Từ/phút khi nói')}</span><b>${C.sp.wpm}</b></div>` : ''}${C.rd && C.rd.w ? `<div class="oc-dim"><span>${t('Độ rõ khi đọc to (%)')}</span><b>${C.rd.acc}</b></div>` : ''}${C.wr ? `<div class="oc-dim"><span>${t('Từ đã viết')}</span><b>${C.wr.w}</b></div>` : ''}</div>
        ${why.map(s => `<p class="small muted">${s}</p>`).join('')}
        <p class="small muted">${t('Ước tính từ rubric CEFR của Lexkite, không phải chứng chỉ. Máy chỉ bắt các lỗi phổ biến.')}</p>
        ${C.xp ? `<p><b>+${C.xp} XP</b> <span class="small muted">${t('theo số từ bạn đã nói và viết')}</span></p>` : ''}</div>
        ${fixes.length ? `<div class="card"><h2>${t('Sửa trước những điểm này')}</h2>${fixes.map(f => `<div class="oc-fix"><b>${esc(t(f.title || ''))}</b>${f.bad ? `<div lang="en"><del>${esc(f.bad)}</del>${f.fix ? ` → <ins>${esc(f.fix)}</ins>` : ''}</div>` : ''}${f.lesson ? `<a class="small" href="#/grammar/${encodeURIComponent(f.lesson)}">${t('Học điểm ngữ pháp này →')}</a>` : ''}</div>`).join('')}</div>` : ''}
        <div class="card"><p>${t('Lần đo tiếp theo sau 4 tuần. Khi đó bạn sẽ nghe lại bản ghi hôm nay cạnh bản mới.')}</p>
        <a class="btn primary lg block" href="#/outcome">${t('Xem tiến bộ')}</a><a class="btn block" href="#/confidence">${t('Luyện nói tiếp')}</a></div></div>`;
    };
    intro();
  }

  routes.outcome = App.guard(async function (arg) { const view = document.getElementById('view'); return arg === 'go' ? run(view) : hub(view); });
})();
