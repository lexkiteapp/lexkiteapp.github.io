/* 🎙️ Nhật ký giọng nói – ngày 1 vs ngày 30 (docs/specs/voice-diary.md). Route #/diary · #/diary/c/<id> (bạn mở link thách đấu nhật ký).
 * MỘT bộ chấm: Speak.score → Score30.grade (gói score30 nạp cùng). Bản ghi CHỈ trên máy: IndexedDB lk-vdiary (Blob âm thanh) + localStorage lk.vd (ngày bắt đầu, câu).
 * Video 9:16 chỉ dựng khi bấm Chia sẻ (gói lười diaryvid → diary-video.js). Công tắc khẩn: /api/config vd_kill='1'. Nạp lười: App.need('diary'). */
(function (g) {
  'use strict';
  const DAY = 864e5, MS = [0, 7, 14, 30, 60, 90], PID0 = 100; // mốc (ngày kể từ bắt đầu) · pid thẻ thách đấu nhật ký = 100 + chỉ số câu (functions/api/challenge.js)
  // Câu cố định theo trình độ: âm khó cho người học châu Á (th, r–l, v–w, âm cuối, nối âm) – tiếng Anh thuần ASCII, đọc 3–6 giây
  const SENTENCES = [
    'I think the weather will be really nice this weekend.',
    'Three of my friends travelled north to visit their families last year.',
    'Learning a new language has changed the way I think, work, and travel around the world.',
  ];
  const keyOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const midnight = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const fromKey = k => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : NaN; };
  /** Số ngày lịch từ ngày bắt đầu (khóa YYYY-MM-DD) tới now (giờ địa phương, an toàn đổi giờ mùa hè). */
  const daysSince = (start, now) => { const a = fromKey(start); return Number.isFinite(a) ? Math.max(0, Math.round((midnight(now) - a) / DAY)) : 0; };
  /** Mốc mà ngày d thuộc về: mốc lớn nhất ≤ d (thu lại trong cùng mốc = thay bản cũ). */
  const slotOf = d => MS.filter(m => m <= Math.max(0, d | 0)).pop();
  /** Trạng thái từng mốc: [{m, take|null, state:'done'|'due'|'later', in: số ngày còn lại}] + next = mốc kế tiếp chưa thu (hoặc null). */
  function timeline(start, takes, now) {
    const d = daysSince(start, now), by = new Map((takes || []).map(t => [t.m, t])), cur = slotOf(d);
    const rows = MS.map(m => ({ m, take: by.get(m) || null, state: by.has(m) ? 'done' : m === cur ? 'due' : m > d ? 'later' : 'missed', in: Math.max(0, m - d) }));
    const next = rows.find(r => r.m > 0 && !r.take && r.m >= cur) || null;
    return { d, cur, rows, next, dueNow: !!rows.find(r => r.m === cur && !r.take) };
  }
  /** Thời điểm mốc kế tiếp chưa thu (ms) cho bộ nhắc Remind.plan (loại 'diary'); null khi chưa có nhật ký/đã thu hết. */
  function nextDueAt(meta, takes, now) {
    if (!meta || !meta.start) return null;
    const t = timeline(meta.start, takes, now); if (!t.next) return null;
    return Math.max(midnight(now), fromKey(meta.start) + t.next.m * DAY);
  }
  /** Cặp so sánh cho video: ngày 0 + bản mới nhất (khác ngày 0). */
  const pairOf = takes => { const s = (takes || []).slice().sort((a, b) => a.m - b.m); return { first: s.find(t => t.m === 0) || s[0] || null, last: s.length > 1 ? s[s.length - 1] : null }; };
  const idOk = s => /^[a-hjkmnp-z2-9]{10}$/.test(s || '');

  g.VDiary = Object.assign(g.VDiary || {}, { MS, PID0, SENTENCES, daysSince, slotOf, timeline, nextDueAt, pairOf, keyOf, idOk });
  if (typeof App === 'undefined' || !App.routes) return; // nạp trong test thuần (không có app)

  const { routes } = App, { $, esc, toast } = UI, d = document;
  const T = (k, v) => g.t(k, v), lang = () => (g.I18N && I18N.lang && I18N.lang()) || 'en';
  const now = () => (g.VDiary.now ? g.VDiary.now() : Date.now()); // test giả đồng hồ
  const ev = a => { try { navigator.sendBeacon('/api/hit', JSON.stringify({ t: 'q', ev: 'vd_' + a })); } catch (e) { /* bỏ qua */ } };
  const off = () => !!(App.vdOn && !App.vdOn()); // công tắc khẩn /api/config vd_kill='1' (web/js/app.js App.vdOn)
  const ls = { get: () => { try { return JSON.parse(localStorage.getItem('lk.vd') || 'null'); } catch (e) { return null; } }, set: v => { try { v ? localStorage.setItem('lk.vd', JSON.stringify(v)) : localStorage.removeItem('lk.vd'); } catch (e) { /* bỏ qua */ } } };

  // ---- IndexedDB: 1 bản/mốc (khóa m) ----
  let dbP = null;
  const db = () => dbP || (dbP = new Promise((res, rej) => { const r = indexedDB.open('lk-vdiary', 1); r.onupgradeneeded = () => r.result.createObjectStore('takes', { keyPath: 'm' }); r.onsuccess = () => res(r.result); r.onerror = () => { dbP = null; rej(r.error); }; }));
  const tx = (mode, fn) => db().then(x => new Promise((res, rej) => { const t = x.transaction('takes', mode), st = t.objectStore('takes'), out = fn(st); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }));
  const Takes = { all: () => tx('readonly', s => s.getAll()).then(a => a || []), put: v => tx('readwrite', s => s.put(v)), del: m => tx('readwrite', s => s.delete(m)), clear: () => tx('readwrite', s => s.clear()) };
  // Mốc kế tiếp cho bộ nhắc (remind.js đọc lk.vd.next/nm – không lặp logic mốc ở đó)
  const syncNext = (meta, takes) => { if (!meta) return; const t = timeline(meta.start, takes, now()); meta.next = nextDueAt(meta, takes, now()); meta.nm = t.next ? t.next.m : 0; ls.set(meta); };
  g.VDiary.Takes = Takes; g.VDiary.meta = ls.get; g.VDiary.ev = ev;

  const cssOnce = () => {
    if (d.getElementById('vd-css')) return;
    const st = d.createElement('style'); st.id = 'vd-css';
    st.textContent = `.vd{display:grid;gap:1rem;padding:0 0 1rem}.vd .txt{font-size:1.25rem;line-height:1.5;font-weight:600;margin:0;text-align:center}.vd .c{text-align:center;justify-items:center;display:grid;gap:.75rem}
.vd .cta{min-height:56px;min-width:min(100%,260px);font-weight:800;font-size:1.1rem}.vd .row{display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center}.vd .row .btn{min-height:48px}
.vd .pick{display:grid;gap:.6rem}.vd .pick label{display:flex;gap:.7rem;align-items:flex-start;border:2px solid var(--line,#eae1d8);border-radius:16px;padding:.8rem 1rem;cursor:pointer;min-height:48px}
.vd .pick input{margin-top:.3rem;accent-color:var(--primary,#E5502F)}.vd .pick label:has(input:checked){border-color:var(--primary,#E5502F)}.vd .lv{font-size:.8rem;font-weight:800;color:var(--muted,#5c5349)}
.vd .tl{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}.vd .tl li{display:flex;gap:.7rem;align-items:center;border:2px solid var(--line,#eae1d8);border-radius:16px;padding:.6rem .9rem;min-height:56px}
.vd .tl .d{font-weight:800;min-width:5.5em}.vd .tl .s{margin-inline-start:auto;font-weight:800}.vd .tl .due{border-color:var(--primary,#E5502F)}.vd .tl .btn{min-height:44px;min-width:44px}
.vd .w{display:inline}.vd .w.no{text-decoration:underline wavy var(--primary,#E5502F);text-underline-offset:4px}.vd .chart{width:100%;height:auto;max-width:420px;margin:0 auto;display:block}
.vd .chart .ln{fill:none;stroke:var(--primary,#E5502F);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.vd .chart .ax{stroke:var(--line,#eae1d8)}.vd .chart text{fill:currentColor;font-size:11px}
.vd .mic{width:96px;height:96px;border-radius:50%;display:grid;place-items:center;font-size:2.2rem;background:var(--primary,#E5502F);color:#fff;animation:vdp 1.2s ease-in-out infinite}
@keyframes vdp{50%{transform:scale(1.06)}}@media(prefers-reduced-motion:reduce){.vd .mic{animation:none}}.vd .big{font-size:3rem;font-weight:800;line-height:1}.vd .small{font-size:.85rem}`;
    d.head.appendChild(st);
  };
  function frame(view) {
    cssOnce();
    view.innerHTML = `<div class="page-head"><div><h1>${esc(T('Nhật ký giọng nói'))}</h1></div></div><div class="vd" id="vd"></div>`;
    return $('#vd', view);
  }
  const wordsHtml = (sen, words) => (words && words.length ? words : sen.split(/\s+/).map(w => ({ w, ok: true }))).map(x => `<span class="w${x.ok ? '' : ' no'}">${esc(x.w)}</span>`).join(' ');
  const dayLabel = n => (n === 0 ? T('Ngày 1') : T('Ngày thứ {n}', { n }));

  routes.diary = App.guard(async function (arg) {
    const view = $('#view'), box = frame(view);
    if (off()) { box.innerHTML = `<p class="muted c">${esc(T('Nhật ký giọng nói đang tạm nghỉ – bản ghi của bạn vẫn an toàn trên máy này.'))}</p>`; return; }
    const m = /^c\/([a-z0-9]{10})$/.exec(arg || '');
    if (m && idOk(m[1])) return friend(box, m[1]);
    ev('view'); home(box);
  });

  async function home(box) {
    const meta = ls.get();
    if (!meta || !meta.start) return intro(box);
    const takes = await Takes.all().catch(() => []), t = timeline(meta.start, takes, now()), sen = SENTENCES[meta.sid] || SENTENCES[0];
    syncNext(meta, takes);
    const pts = takes.slice().sort((a, b) => a.m - b.m);
    const row = r => {
      const lbl = r.take ? dayLabel(r.take.day) : dayLabel(r.m), st = r.take ? `${r.take.score}/100` : r.state === 'due' ? T('Đến lúc thu!') : r.state === 'later' ? T('Còn {n} ngày nữa', { n: r.in }) : T('Đã lỡ');
      return `<li class="${r.state === 'due' ? 'due' : ''}"><span class="d">${esc(lbl)}</span>${r.take && r.take.audio ? `<button class="btn ghost" type="button" data-play="${r.m}" aria-label="${esc(T('Nghe bản {d}', { d: lbl }))}">▶</button>` : ''}<span class="s">${esc(st)}</span>${r.take ? `<button class="btn ghost" type="button" data-del="${r.m}" aria-label="${esc(T('Xóa bản {d}', { d: lbl }))}">🗑</button>` : ''}</li>`;
    };
    box.innerHTML = `<div class="c"><p class="muted">${esc(T('Câu cố định của bạn'))}</p><p class="txt" lang="en">${esc(sen)}</p>
      ${t.dueNow ? `<button class="btn primary cta" id="vdrec" type="button">🎙️ ${esc(T('Thu câu hôm nay'))}</button>` : t.next ? `<p class="small muted">${esc(T('Mốc tiếp theo: ngày {m} (còn {n} ngày)', { m: t.next.m, n: t.next.in }))}</p><button class="btn" id="vdrec" type="button">${esc(T('Thu lại bản gần nhất'))}</button>` : ''}</div>
      ${pts.length > 1 ? chart(pts) : ''}
      <ul class="tl">${t.rows.filter(r => r.take || r.state !== 'missed').map(row).join('')}</ul>
      <div class="row"><button class="btn primary cta" id="vdsh" type="button">🎬 ${esc(T('Chia sẻ video'))}</button></div>
      <p class="small muted c">${esc(T('Bản ghi chỉ nằm trên máy này – không gửi lên máy chủ. Xóa dữ liệu trình duyệt sẽ mất nhật ký.'))}</p>
      <div class="row"><button class="btn ghost" id="vddel" type="button">${esc(T('Xóa cả nhật ký'))}</button></div>`;
    const rec = $('#vdrec', box); if (rec) rec.onclick = () => take(box, meta, t.cur, () => home(box));
    box.querySelectorAll('[data-play]').forEach(b => { b.onclick = () => play(takes.find(x => x.m === +b.dataset.play)); });
    box.querySelectorAll('[data-del]').forEach(b => {
      b.onclick = async () => { if (!await UI.confirm(T('Xóa bản ghi này? Không hoàn tác được.'))) return; await Takes.del(+b.dataset.del).catch(() => {}); ev('del'); home(box); };
    });
    $('#vddel', box).onclick = async () => { if (!await UI.confirm(T('Xóa cả nhật ký giọng nói trên máy này? Không hoàn tác được.'))) return; await Takes.clear().catch(() => {}); ls.set(null); ev('del'); home(box); };
    $('#vdsh', box).onclick = () => share(box, meta, takes);
  }

  let audioEl = null;
  function play(tk) {
    if (!tk || !tk.audio) return;
    if (audioEl) { audioEl.pause(); URL.revokeObjectURL(audioEl.src); }
    audioEl = new Audio(URL.createObjectURL(tk.audio)); audioEl.play().catch(() => {});
  }

  function chart(pts) {
    const W = 320, H = 120, P = 24, x = i => P + i * (W - 2 * P) / Math.max(1, pts.length - 1), y = s => H - P - (H - 2 * P) * s / 100;
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.score).toFixed(1)}`).join(' ');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T('Điểm từ {a} lên {b}', { a: pts[0].score, b: pts[pts.length - 1].score }))}"><line class="ax" x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}"/><path class="ln" d="${path}"/>${pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.score).toFixed(1)}" r="4" fill="currentColor"/><text x="${x(i).toFixed(1)}" y="${(y(p.score) - 8).toFixed(1)}" text-anchor="middle">${p.score}</text><text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(dayLabel(p.day))}</text>`).join('')}</svg>`;
  }

  function intro(box, seed) {
    box.innerHTML = `<div class="c"><p class="txt">${esc(T('Thu 1 câu hôm nay, thu lại sau 7, 14, 30 ngày – rồi nghe chính mình tiến bộ.'))}</p></div>
      <fieldset class="pick" style="border:0;padding:0;margin:0"><legend class="muted">${esc(T('Chọn câu của bạn (giữ cố định suốt nhật ký)'))}</legend>
      ${SENTENCES.map((s, i) => `<label><input type="radio" name="vds" value="${i}"${i === (seed ? seed.sid : 1) ? ' checked' : ''}><span><span class="lv">${esc([T('Ngắn'), T('Vừa'), T('Dài')][i])}</span><br><span lang="en">${esc(s)}</span></span></label>`).join('')}</fieldset>
      <div class="c"><button class="btn primary cta" id="vdgo" type="button">🎙️ ${esc(T('Bắt đầu ngày 1'))}</button><p class="small muted">${esc(T('Cần micro. Bản ghi chỉ lưu trên máy bạn.'))}</p></div>`;
    $('#vdgo', box).onclick = async () => {
      const sid = +((box.querySelector('input[name=vds]:checked') || {}).value || 0), meta = { start: keyOf(new Date(now())), sid, v: 1 };
      if (seed && seed.take && seed.sid === sid) { ls.set(meta); await save(meta, 0, seed.take, seed.audio); ev('join'); return home(box); } // bạn từ link: dùng luôn bản vừa đọc làm ngày 1
      take(box, meta, 0, () => home(box), true);
    };
  }

  // ---- Thu + chấm (một bộ chấm) ----
  async function record(box, sen) {
    box.innerHTML = `<div class="c"><p class="txt" lang="en">${esc(sen)}</p><div class="mic" aria-hidden="true">🎙️</div><p class="muted" role="status" aria-live="polite">${esc(T('Đang nghe… đọc to câu trên'))}</p><button class="btn" id="vdstop" type="button">${esc(T('Xong'))}</button></div>`;
    $('#vdstop', box).onclick = () => { try { g.Speak.stop(); } catch (e) { /* đã dừng */ } };
    ev('rec');
    const r = await g.Speak.score({ target: sen, mode: 'free' }).catch(() => null);
    const s = g.Score30.grade(r); let audio = null;
    if (s && r.audio) try { audio = await (await fetch(r.audio)).blob(); } catch (e) { audio = null; } // sao chép trước khi UI.recUrl thu hồi
    return { s, r, audio };
  }
  // Điện thoại web: micro không chạy song song với nhận giọng (UI.micParallel) → thu riêng 1 lượt chỉ ghi âm để lưu giọng
  function rawRecord(box, sen) {
    return new Promise(res => {
      if (!navigator.mediaDevices || !g.MediaRecorder) return res(null);
      box.innerHTML = `<div class="c"><p class="muted">${esc(T('Đọc lại câu một lần nữa để lưu giọng của bạn vào nhật ký'))}</p><p class="txt" lang="en">${esc(sen)}</p><button class="btn primary cta" id="vdraw" type="button">🎙️ ${esc(T('Ghi âm'))}</button><button class="btn ghost" id="vdskip" type="button">${esc(T('Bỏ qua'))}</button></div>`;
      $('#vdskip', box).onclick = () => res(null);
      $('#vdraw', box).onclick = () => navigator.mediaDevices.getUserMedia(UI.MIC || { audio: true }).then(st => {
        const chunks = [], mr = new MediaRecorder(st); let tm = 0;
        mr.ondataavailable = e => e.data.size && chunks.push(e.data);
        mr.onstop = () => { clearTimeout(tm); st.getTracks().forEach(x => x.stop()); res(chunks.length ? new Blob(chunks, { type: mr.mimeType || 'audio/webm' }) : null); };
        box.innerHTML = `<div class="c"><p class="txt" lang="en">${esc(sen)}</p><div class="mic" aria-hidden="true">🎙️</div><p class="muted" role="status" aria-live="polite">${esc(T('Đang ghi âm…'))}</p><button class="btn primary cta" id="vdend" type="button">${esc(T('Xong'))}</button></div>`;
        $('#vdend', box).onclick = () => mr.state !== 'inactive' && mr.stop();
        mr.start(); tm = setTimeout(() => mr.state !== 'inactive' && mr.stop(), 15000);
      }).catch(() => res(null));
    });
  }
  async function save(meta, slot, s, audio) {
    const prev = (await Takes.all().catch(() => [])).find(x => x.m === slot);
    const rec = { m: slot, day: daysSince(meta.start, now()), at: now(), sid: meta.sid, fl: s.fl, pr: s.pr, score: s.score, cefr: s.cefr, words: s.wl || [], audio: audio || (prev && prev.audio) || null };
    await Takes.put(rec); syncNext(meta, await Takes.all().catch(() => [rec]));
    if (!prev) { // thưởng 1 lần/mốc (thu lại cùng mốc không cộng thêm – chống cày)
      const xp = g.Game && Game.xpFor ? Game.xpFor('say', { score: s.score }) : 3;
      try { App.reward({ xp, spoken: 1 }); } catch (e) { /* bỏ qua */ }
      ev(slot === 0 ? 'start' : 'ms');
    }
    return rec;
  }
  async function take(box, meta, slot, after, first) {
    const sen = SENTENCES[meta.sid] || SENTENCES[0], { s, r, audio: a0 } = await record(box, sen);
    if (!d.getElementById('vd')) return; // đã rời trang
    if (!s) {
      box.innerHTML = `<div class="c"><p class="txt">${esc(r && r.error === 'unsupported' ? T('Trình duyệt này chưa hỗ trợ nhận giọng nói. Hãy thử Chrome hoặc app Lexkite.') : T('Không nghe rõ – thử lại ở nơi yên tĩnh hơn nhé.'))}</p><button class="btn primary cta" id="vdre" type="button">${esc(T('Làm lại'))}</button></div>`;
      $('#vdre', box).onclick = () => take(box, meta, slot, after, first); return;
    }
    s.wl = (r.words || []).map(x => ({ w: x.w, ok: !!x.ok }));
    const audio = a0 || (UI.micParallel && UI.micParallel(g.SpeechRecognition || g.webkitSpeechRecognition) ? null : await rawRecord(box, sen));
    if (first) ls.set(meta);
    await save(meta, slot, s, audio);
    const takes = await Takes.all().catch(() => []), p = pairOf(takes), up = p.last && p.first ? p.last.score - p.first.score : null;
    box.innerHTML = `<div class="c"><p class="muted">${esc(dayLabel(daysSince(meta.start, now())))}</p><div class="big">${s.score}<span class="muted small">/100</span></div>
      <p>${esc(T('Lưu loát'))}: ${s.fl} · ${esc(T('Phát âm'))}: ${s.pr} · ${s.cefr}</p>${up != null ? `<p class="txt">${esc(up >= 0 ? T('Tăng {n} điểm so với ngày 1!', { n: up }) : T('Thấp hơn ngày 1 {n} điểm – hôm nay chỉ là một ngày, thử lại lúc khác nhé.', { n: -up }))}</p>` : `<p class="txt">${esc(T('Đã lưu ngày 1. Hẹn bạn ở mốc ngày 7!'))}</p>`}
      <p class="txt" lang="en">${wordsHtml(sen, s.wl)}</p><p class="small muted">${esc(T('Ước lượng CEFR – chỉ mang tính tham khảo'))}</p>
      <div class="row"><button class="btn primary cta" id="vdok" type="button">${esc(T('Xem nhật ký'))}</button></div></div>`;
    $('#vdok', box).onclick = after;
  }

  // ---- Chia sẻ: dựng video trên máy (gói lười diaryvid) + link thách đấu ----
  let linkP = null;
  async function share(box, meta, takes) {
    ev('share');
    const p = pairOf(takes); if (!p.first) return toast(T('Hãy thu ngày 1 trước nhé'));
    const btn = $('#vdsh', box); if (btn) { btn.disabled = true; btn.textContent = T('Đang dựng video… giữ màn hình mở'); }
    try {
      await App.need('diaryvid');
      const last = p.last || p.first;
      const id = await (linkP || (linkP = g.Score30.api({ op: 'create', fl: last.fl, pr: last.pr, pid: PID0 + (meta.sid | 0), lang: lang() }).then(j => j.id || '').finally(() => { linkP = null; })));
      const url = id ? g.Score30.linkOf(id, lang(), 'share', 'voicediary') + `&d=${last.day | 0}&f=${p.first.score | 0}` : 'https://lexkite.com';
      const out = await g.VDiaryVideo.render({ first: p.first, last: p.last, sentence: SENTENCES[meta.sid] || SENTENCES[0], link: id ? 'lexkite.com/c/' + id : 'lexkite.com', who: (meta.sid | 0) % 2 ? 'carlos' : 'ama', T, onProgress: f => { if (btn) btn.textContent = T('Đang dựng video… {p}%', { p: Math.round(f * 100) }); } });
      const text = p.last ? T('Ngày 1: {a} điểm → ngày {n}: {b} điểm. Nhật ký giọng nói tiếng Anh của mình trên Lexkite – thử câu này nhé: {url}', { a: p.first.score, n: p.last.day, b: p.last.score, url }) : T('Ngày 1 nhật ký giọng nói tiếng Anh của mình: {a} điểm. Hẹn ngày 30! Thử câu này nhé: {url}', { a: p.first.score, url });
      const name = 'lexkite-voice-diary.' + (/mp4/.test(out.mime) ? 'mp4' : 'webm');
      let r = 'saved'; try { r = await LKFile.save(out.blob, name, { share: true, title: T('Nhật ký giọng nói'), text }); } catch (e) { r = 'saved'; }
      if (r === 'shared') ev('shared'); else { ev('dl'); try { await navigator.clipboard.writeText(text); toast(T('Đã lưu video và chép link – dán kèm khi đăng nhé')); } catch (e) { toast(url); } }
    } catch (e) { toast(T('Chưa dựng được video trên trình duyệt này – thử Chrome hoặc Safari mới.')); }
    if (btn && d.body.contains(btn)) { btn.disabled = false; btn.textContent = '🎬 ' + T('Chia sẻ video'); }
  }

  // ---- Bạn mở link: đọc đúng câu đó, so điểm, mời bắt đầu nhật ký ----
  async function friend(box, id) {
    let chal = null; try { const r = await App.W(fetch('/api/challenge?id=' + id)); if (r.ok) chal = await r.json(); } catch (e) { /* link hỏng */ }
    if (!chal || chal.pid < PID0) { location.hash = chal ? '#/score/' + id : '#/diary'; return; }
    const sid = Math.min(SENTENCES.length - 1, chal.pid - PID0), sen = SENTENCES[sid];
    ev('cstart');
    box.innerHTML = `<div class="c"><p class="banner" role="status" style="border:2px solid var(--line,#eae1d8);border-radius:16px;padding:.7rem 1rem;font-weight:700">${esc(T('Bạn của bạn đạt {s}/100 với câu này. Thử nhé!', { s: chal.score }))}</p><p class="txt" lang="en">${esc(sen)}</p><button class="btn primary cta" id="vdfgo" type="button">🎙️ ${esc(T('Bắt đầu'))}</button></div>`;
    $('#vdfgo', box).onclick = async () => {
      const { s, r, audio } = await record(box, sen); if (!d.getElementById('vd')) return;
      if (!s) return friend(box, id);
      s.wl = (r.words || []).map(x => ({ w: x.w, ok: !!x.ok })); ev('cdone'); g.Score30.api({ op: 'reply', id });
      const msg = s.score > chal.score ? T('Bạn thắng! {me} so với {fr}', { me: s.score, fr: chal.score }) : s.score === chal.score ? T('Hòa nhau! {me} so với {fr}', { me: s.score, fr: chal.score }) : T('Bạn của bạn hơn {n} điểm – thử lại nhé!', { n: chal.score - s.score });
      const has = !!(ls.get() || {}).start;
      box.innerHTML = `<div class="c"><p class="banner" role="status" style="font-weight:800">${esc(msg)}</p><div class="big">${s.score}<span class="muted small">/100</span></div><p class="txt" lang="en">${wordsHtml(sen, s.wl)}</p>
        <p>${esc(has ? T('Thu lại câu của bạn ở mốc tiếp theo để xem tiến bộ.') : T('Lưu bản này làm ngày 1 nhật ký của bạn – thu lại sau 30 ngày để thấy mình tiến bộ.'))}</p>
        <div class="row"><button class="btn primary cta" id="vdjoin" type="button">${esc(has ? T('Xem nhật ký') : T('Bắt đầu nhật ký của tôi'))}</button><button class="btn" id="vdagain" type="button">${esc(T('Làm lại'))}</button></div></div>`;
      $('#vdagain', box).onclick = () => friend(box, id);
      $('#vdjoin', box).onclick = () => (has ? home(box) : intro(box, { sid, take: s, audio }));
    };
  }
})(typeof self !== 'undefined' ? self : globalThis);
