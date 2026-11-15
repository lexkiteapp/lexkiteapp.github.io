/* ExamClock – đồng hồ phòng thi + màn chuẩn bị trước khi tự phát Listening (dùng chung: cbt.js, mock.js, listening.js, toeic.js).
 * Gốc lỗi cũ: mỗi màn tự đếm `left--` trong setInterval → tab nền bị trình duyệt hãm (≥ 1 phút/lần) làm đồng hồ CHẬM hơn giờ thật,
 * tải lại trang thì về đầu hoặc mất tới 15 s; mock.js còn đặt tên biến hẹn giờ là `t` che mất hàm dịch t() → lỗi đúng lúc báo "còn 5/1 phút".
 * Nay: lưu MỐC KẾT THÚC (timestamp) trong localStorage, mọi lần vẽ tính lại từ Date.now() → đổi tab/khóa máy/tải lại vẫn đúng giờ thật;
 * hết giờ khi đang ở tab khác → gọi onEnd ngay khi quay lại (tự nộp/chuyển phần như thi thật). Chế độ luyện tập: tạm dừng được (lưu số ms còn lại).
 * Thông báo nhẹ (docs: notifications UX): đổi màu dịu ở 5′ và 1′ + MỘT toast lịch sự mỗi mốc (không âm thanh, không rung, không lặp lại khi tải lại trang).
 * Không gọi t() lúc nạp module. */
(function (g) {
  const PFX = 'lk.xclk.', HIDE = 'lk.xclkHide'; // HIDE ngoài tiền tố PFX: không đụng khóa đồng hồ nào
  // Thời lượng chuẩn (phút) theo kỳ thi/section – IELTS (Academic & GT giống nhau ở L/R/W), TOEIC L&R, TOEFL iBT (bản 2026, ước theo ETS)
  const STD = {
    ielts: { listening: 30, reading: 60, writing: 60, review: 2, prep: 30 },
    toeic: { listening: 45, reading: 75, items: 100, prep: 5 },
    toefl: { reading: 30, listening: 29, writing: 23, speaking: 8, prep: 5 },
  };
  const LS = (() => { try { const s = g.localStorage; s.setItem(PFX + 't', '1'); s.removeItem(PFX + 't'); return s; } catch (e) { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; } })();
  const fmt = sec => { sec = Math.max(0, Math.ceil(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60, p = n => String(n).padStart(2, '0'); return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`; };
  const STALE = 12 * 3600e3; // mốc đã hết > 12 giờ (quay lại hôm sau) → bài mới, không tự nộp bài cũ

  /** Lõi thuần (test được bằng node): trạng thái { v, secs, end, paused, warned } theo khóa. */
  function core(key, o = {}) {
    const store = o.store || LS, now = o.now || Date.now, K = PFX + key;
    const read = () => { try { const x = JSON.parse(store.getItem(K) || 'null'); return x && x.v === 1 && x.secs > 0 ? x : null; } catch (e) { return null; } };
    let s = read();
    const write = () => { try { if (s) store.setItem(K, JSON.stringify(s)); } catch (e) { /* hết chỗ: vẫn chạy trong bộ nhớ */ } };
    const api = {
      /** fresh=true: bắt đầu lại từ đầu; ngược lại tiếp tục mốc đã lưu nếu cùng thời lượng và chưa quá cũ */
      start(secs, fresh, leftSecs) {
        if (fresh || !s || s.secs !== secs || (s.paused == null && now() - s.end > STALE)) { s = { v: 1, secs, end: now() + Math.min(secs, leftSecs > 0 ? leftSecs : secs) * 1000, paused: null, warned: 0 }; write(); }
        return api;
      },
      leftMs() { return !s ? 0 : s.paused != null ? Math.max(0, s.paused) : Math.max(0, s.end - now()); },
      left() { return Math.ceil(api.leftMs() / 1000); },
      get started() { return !!s; }, get paused() { return !!s && s.paused != null; }, get secs() { return s ? s.secs : 0; },
      pause() { if (s && s.paused == null) { s.paused = api.leftMs(); write(); } },
      resume() { if (s && s.paused != null) { s.end = now() + s.paused; s.paused = null; write(); } },
      /** bit mốc nhắc đã báo (1 = 5′, 2 = 1′) – lưu để tải lại trang không nhắc lại */
      warned(b) { return !!s && !!(s.warned & b); }, warn(b) { if (s) { s.warned |= b; write(); } },
      clear() { s = null; try { store.removeItem(K); } catch (e) { /* bỏ qua */ } },
    };
    return api;
  }
  /** Số giây còn lại của một mốc đã lưu (để nút "Tiếp tục (còn 12:30)"), null nếu không có */
  const saved = key => { const c = core(key); if (!c.started) return null; const x = c.left(); return x > 0 || c.paused ? x : 0; };
  const clear = key => core(key).clear();

  let cssDone = false;
  function css() {
    if (cssDone || !g.document) return; cssDone = true;
    const st = document.createElement('style'); st.id = 'xclkCss';
    // màu theo token của app (sáng/tối tự đổi); cảnh báo dịu: 5′ = vàng nhạt, 1′ = đỏ nhạt – không nhấp nháy
    st.textContent = `.xclk{display:inline-flex;align-items:center;gap:.15rem;padding:.15rem .2rem .15rem .55rem;border-radius:999px;background:var(--primary-soft);color:var(--primary-text,var(--text));font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;transition:background-color .6s ease,color .6s ease;line-height:1}
.xclk-t{font:800 1.05rem ui-monospace,SFMono-Regular,Menlo,monospace;min-width:3.4em;text-align:center;letter-spacing:.02em}
.xclk svg{width:16px;height:16px;flex:none}
.xclk-b{display:inline-grid;place-items:center;width:32px;height:32px;border:0;border-radius:999px;background:transparent;color:inherit;cursor:pointer;padding:0}
.xclk-b:hover{background:color-mix(in srgb,currentColor 10%,transparent)}.xclk-b:focus-visible{outline:2px solid var(--primary);outline-offset:1px}
.xclk.w5{background:color-mix(in srgb,var(--hard,#f59e0b) 18%,var(--surface,#fff));color:var(--text)}
.xclk.w1{background:var(--again-soft);color:var(--again-text)}
.xclk.paused .xclk-t{opacity:.6}.xclk.hid .xclk-t{display:none}.xclk.hid{padding-left:.2rem}
.xclk-sticky{position:sticky;top:calc(.4rem + env(safe-area-inset-top,0px));z-index:7}
.xprep{display:flex;align-items:center;gap:.8rem;flex-wrap:wrap;width:100%}
.xprep-ring{--p:0;width:58px;height:58px;border-radius:50%;flex:none;display:grid;place-items:center;font:800 1rem ui-monospace,SFMono-Regular,Menlo,monospace;background:conic-gradient(var(--primary) calc(var(--p)*1turn),var(--primary-soft) 0);position:relative}
.xprep-ring::before{content:"";position:absolute;inset:5px;border-radius:50%;background:var(--surface)}.xprep-ring span{position:relative}
.xprep-big .xprep-ring{width:72px;height:72px;font-size:1.6rem}
.xprep-txt{flex:1 1 12rem;min-width:0}.xprep-txt b{display:block}.xprep-act{display:flex;gap:.4rem;flex-wrap:wrap}
@media (prefers-reduced-motion:reduce){.xclk{transition:none}}`;
    document.head.appendChild(st);
  }
  const SVG = {
    timer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.4 0 10 8 10 8a17.6 17.6 0 0 1-2.2 3.2M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 8 10 8a9.7 9.7 0 0 0 5.4-1.6"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/><line x1="2" x2="22" y1="2" y2="22"/></svg>',
  };
  const hiddenPref = () => { try { return LS.getItem(HIDE) === '1'; } catch (e) { return false; } };

  /** Gắn đồng hồ vào host (thay nội dung host). o: { key, secs, fresh, left, practice, onEnd, onTick(leftSec), name }
   *  Trả về { left(), pause(), resume(), paused, stop() (ngừng vẽ, giữ mốc để tải lại tiếp tục), done() (xóa mốc), el } */
  function mount(host, o) {
    css();
    const c = core(o.key, o).start(o.secs, o.fresh, o.left); // o.left: số giây còn lại từ bản lưu cũ (trước ExamClock)
    let hid = hiddenPref(), ended = false, tm = 0, alive = true;
    const el = document.createElement('div'); el.className = 'xclk'; el.setAttribute('role', 'timer'); el.setAttribute('aria-live', 'off');
    el.innerHTML = `${SVG.timer}<span class="xclk-t"></span>${o.practice ? '<button type="button" class="xclk-b" data-a="p"></button>' : ''}<button type="button" class="xclk-b" data-a="h"></button>`;
    host.innerHTML = ''; host.appendChild(el);
    const tEl = el.querySelector('.xclk-t'), pB = el.querySelector('[data-a="p"]'), hB = el.querySelector('[data-a="h"]');
    const label = () => {
      const L = c.left(), tt = fmt(L);
      el.setAttribute('aria-label', (o.name ? o.name + ' · ' : '') + t('Thời gian còn lại: {t}', { t: tt }) + (c.paused ? ' · ' + t('Đã tạm dừng') : ''));
      el.title = hid ? t('Hiện giờ') + ' (' + tt + ')' : '';
      hB.innerHTML = hid ? SVG.eye : SVG.eyeOff; hB.setAttribute('aria-label', hid ? t('Hiện giờ') : t('Ẩn giờ')); hB.setAttribute('aria-pressed', String(hid));
      if (pB) { pB.innerHTML = c.paused ? SVG.play : SVG.pause; pB.setAttribute('aria-label', c.paused ? t('Tiếp tục') : t('Tạm dừng')); }
    };
    const paint = () => {
      if (!alive) return;
      if (!el.isConnected) { api.stop(); return; } // rời màn (đổi route) → ngừng vẽ; mốc vẫn lưu để tải lại/quay lại tiếp tục
      const L = c.left();
      tEl.textContent = fmt(L);
      el.classList.toggle('w5', L <= 300 && L > 60); el.classList.toggle('w1', L <= 60); el.classList.toggle('paused', c.paused); el.classList.toggle('hid', hid);
      // nhắc nhẹ MỘT lần mỗi mốc, chỉ khi bài đủ dài để có nghĩa; tải lại trang khi đã qua mốc → không nhắc lại
      if (!c.paused && L > 0) {
        if (L <= 300 && L > 60 && o.secs > 600 && !c.warned(1)) { c.warn(1); UI.toast(t('Còn 5 phút – cứ bình tĩnh làm tiếp nhé')); }
        else if (L <= 60 && o.secs > 180 && !c.warned(2)) { c.warn(2 | 1); UI.toast(t('Còn 1 phút – xem lại các câu đã làm')); }
      }
      if (o.onTick) try { o.onTick(L); } catch (e) { /* bỏ qua lỗi màn gọi */ }
      if (L <= 0 && !c.paused && !ended) { ended = true; clearTimeout(tm); c.clear(); o.onEnd && o.onEnd(); return; }
      label();
    };
    // Hẹn lần vẽ kế tiếp đúng lúc đổi giây (không trôi); tab nền bị hãm cũng không sao vì luôn tính lại từ mốc
    const loop = () => { clearTimeout(tm); if (!alive || ended) return; paint(); if (!alive || ended || c.paused) return; const ms = c.leftMs() % 1000 || 1000; tm = setTimeout(loop, ms + 15); };
    const vis = () => { if (document.visibilityState !== 'hidden') loop(); };
    document.addEventListener('visibilitychange', vis); g.addEventListener('pageshow', vis); g.addEventListener('focus', vis);
    hB.onclick = () => { hid = !hid; try { LS.setItem(HIDE, hid ? '1' : '0'); } catch (e) { /* bỏ qua */ } paint(); };
    if (pB) pB.onclick = () => { if (c.paused) api.resume(); else api.pause(); };
    const api = {
      el, left: () => c.left(), get paused() { return c.paused; }, get ended() { return ended; },
      pause() { c.pause(); clearTimeout(tm); paint(); o.onPause && o.onPause(true); },
      resume() { c.resume(); loop(); o.onPause && o.onPause(false); },
      stop() { alive = false; clearTimeout(tm); document.removeEventListener('visibilitychange', vis); g.removeEventListener('pageshow', vis); g.removeEventListener('focus', vis); },
      done() { api.stop(); c.clear(); },
      /** hết giờ ngay (vd. đã hết bài nghe, chuyển sang thời gian kiểm tra) */
      cap(secs) { if (c.left() > secs) { c.start(secs, true); c.warn(3); loop(); } },
    };
    loop();
    return api;
  }

  /** Màn chuẩn bị trước khi tự phát (đọc trước câu hỏi như IELTS, hoặc 3-2-1). Vẽ vào host.
   *  o: { secs, title, note, onGo, practice, goLabel } → { go(), cancel() }. Đếm theo mốc thời gian (đổi tab không lệch). */
  function prep(host, o) {
    css();
    const secs = Math.max(1, o.secs | 0), end = Date.now() + secs * 1000; let done = false, tm = 0, paused = null;
    host.innerHTML = `<div class="xprep ${secs <= 5 ? 'xprep-big' : ''}" role="status" aria-live="polite"><div class="xprep-ring" aria-hidden="true"><span></span></div>
      <div class="xprep-txt"><b>${UI.esc(o.title || t('Đọc trước câu hỏi'))}</b><span class="small muted xprep-n"></span></div>
      <div class="xprep-act"><button type="button" class="btn primary" data-a="go" data-lk-skip>${UI.esc(o.goLabel || t('Nghe ngay'))}</button>${o.practice ? `<button type="button" class="btn ghost" data-a="p">${t('Tạm dừng')}</button>` : ''}</div></div>`;
    const ring = host.querySelector('.xprep-ring'), num = ring.querySelector('span'), n = host.querySelector('.xprep-n'), pB = host.querySelector('[data-a="p"]');
    let endAt = end;
    const left = () => paused != null ? paused : Math.max(0, endAt - Date.now());
    const paint = () => {
      if (done) return; if (!ring.isConnected) { api.cancel(); return; }
      const ms = left(), s = Math.ceil(ms / 1000);
      num.textContent = secs <= 5 ? String(Math.max(1, s)) : fmt(s); ring.style.setProperty('--p', String(1 - ms / (secs * 1000)));
      n.textContent = paused != null ? t('Đã tạm dừng') : (o.note ? o.note + ' · ' : '') + t('Âm thanh tự phát sau {n} giây', { n: s });
      if (ms <= 0 && paused == null) { api.go(); return; }
      tm = setTimeout(paint, Math.min(250, ms % 1000 || 250));
    };
    const api = {
      go() { if (done) return; done = true; clearTimeout(tm); o.onGo && o.onGo(); },
      cancel() { done = true; clearTimeout(tm); },
      get done() { return done; },
    };
    host.querySelector('[data-a="go"]').onclick = () => api.go(); // cú bấm thật → mở khóa âm thanh (listening.js unlock bắt ở pha capture)
    if (pB) pB.onclick = () => { if (paused == null) { paused = left(); pB.textContent = t('Tiếp tục'); clearTimeout(tm); paint(); } else { endAt = Date.now() + paused; paused = null; pB.textContent = t('Tạm dừng'); clearTimeout(tm); paint(); } };
    paint();
    return api;
  }

  g.ExamClock = { STD, fmt, core, mount, prep, saved, clear };
})(typeof self !== 'undefined' ? self : this);
