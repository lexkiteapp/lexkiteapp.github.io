/* ExamKit – lõi chung cho mọi màn thi thử (TOEIC, IELTS mock, listen-test, cbt, placement…): docs/specs/exam-real.md
 * - Đồng hồ theo MỐC THỜI GIAN THẬT (endAt = Date.now() + thời lượng): tab ẩn / máy ngủ không lệch, tải lại trang vẫn đúng giờ.
 *   Chế độ: 'exam' đếm ngược + cảnh báo 5'/1' + hết giờ tự nộp · 'practice' đếm xuôi · 'off' ẩn giờ.
 * - Lưu tiến độ trên máy (localStorage lk.exam.<id>, hạn 24 h): đáp án, câu đánh dấu, giây từng câu, câu đang làm, mốc đồng hồ.
 * - Bảng câu (đã làm / trống / đánh dấu), xác nhận nộp (nhắc số câu trống), phím tắt.
 * Phần logic (clock, store, timeTracker, summary) không đụng DOM → test bằng Node (scripts/test/exam-kit.mjs). */
(function (g) {
  const W = { warn: [300, 60] }; // cảnh báo khi còn 5 phút và 1 phút
  const pad = n => String(n).padStart(2, '0');
  const fmt = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s % 60); };

  // ---------- Thời lượng chuẩn (giây) – nguồn chính thức ghi trong spec ----------
  const DURATION = {
    'toeic.listening': 45 * 60, 'toeic.reading': 75 * 60, // ETS: Listening ≈45', Reading 75'
    'ielts.listening': 32 * 60, 'ielts.reading': 60 * 60, 'ielts.writing': 60 * 60, // ielts.org: Listening ≈30' (+2' soát bản máy tính)
    'ielts.passage': 20 * 60, // 60' / 3 bài đọc
    'toefl.reading': 27 * 60, 'toefl.listening': 27 * 60, 'toefl.writing': 23 * 60, 'toefl.speaking': 8 * 60 // ETS TOEFL iBT từ 21/01/2026 (mức trên)
  };

  // ---------- Lưu tiến độ ----------
  function store(id, opt = {}) {
    const key = 'lk.exam.' + id, ttl = opt.ttl || 864e5, ls = opt.storage || (typeof localStorage !== 'undefined' ? localStorage : null), now = opt.now || Date.now;
    const read = () => { try { const x = JSON.parse((ls && ls.getItem(key)) || 'null'); return x && now() - (x.at || 0) < ttl ? x : null; } catch (e) { return null; } };
    let st = read();
    return {
      key, saved: () => st,
      get: () => st || (st = { v: 1, at: now(), answers: {}, flags: [], times: {}, cur: null }),
      save: patch => { st = Object.assign(st || { v: 1, answers: {}, flags: [], times: {}, cur: null }, patch || {}, { at: now() }); try { if (ls) ls.setItem(key, JSON.stringify(st)); } catch (e) { /* đầy bộ nhớ – vẫn làm bài được */ } return st; },
      clear: () => { st = null; try { if (ls) ls.removeItem(key); } catch (e) { /* bỏ qua */ } }
    };
  }

  // ---------- Đồng hồ ----------
  // opt: { mode, duration (giây), state: {startAt,endAt,warned:[],expired} (khôi phục), now, onTick(view), onWarn(sec), onExpire(), onState(state) }
  function clock(opt) {
    const now = opt.now || Date.now, mode = opt.mode || 'exam', dur = Math.max(0, opt.duration || 0) * 1000;
    const s = Object.assign({ startAt: now(), warned: [], expired: false }, opt.state || {});
    if (!s.endAt && mode === 'exam') s.endAt = s.startAt + dur;
    let iv = null, stopped = false;
    const left = () => mode === 'exam' ? Math.max(0, (s.endAt - now()) / 1000) : null;
    const used = () => Math.max(0, (Math.min(now(), mode === 'exam' ? s.endAt : Infinity) - s.startAt) / 1000);
    const view = () => { const l = left(); return { mode, left: l, used: used(), text: mode === 'off' ? '' : fmt(mode === 'exam' ? Math.ceil(l) : used()), level: l == null ? '' : l <= 60 ? 'w1' : l <= 300 ? 'w5' : '' }; };
    const tick = () => {
      if (stopped) return;
      const v = view();
      if (opt.onTick) opt.onTick(v);
      if (mode !== 'exam') return;
      // Cảnh báo: chỉ báo mốc nhỏ nhất vừa vượt (quay lại sau khi tab ẩn lâu không dồn 2 cảnh báo)
      const due = W.warn.filter(w => v.left <= w && v.left > 0 && !s.warned.includes(w));
      if (due.length) { s.warned.push(...due); if (opt.onState) opt.onState(s); if (opt.onWarn) opt.onWarn(Math.min(...due)); }
      if (v.left <= 0 && !s.expired) { s.expired = true; stop(); if (opt.onState) opt.onState(s); if (opt.onExpire) opt.onExpire(); }
    };
    const vis = () => { if (typeof document === 'undefined' || !document.hidden) tick(); };
    const stop = () => { stopped = true; if (iv) clearInterval(iv); iv = null; if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', vis); };
    if (opt.autostart !== false) {
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', vis);
      iv = setInterval(tick, opt.interval || 1000);
      tick();
    }
    return { tick, stop, view, left, used, state: () => s, fmt };
  }

  // ---------- Giây làm từng câu (câu "đang làm" = câu vừa chạm/chọn/nhảy tới) ----------
  function timeTracker(times = {}, now = Date.now) {
    let cur = null, since = now();
    const flush = () => { if (cur != null) { const d = Math.max(0, (now() - since) / 1000); if (d < 1800) times[cur] = Math.round(((times[cur] || 0) + d) * 10) / 10; } since = now(); };
    return { set: q => { if (q === cur) return; flush(); cur = q; }, pause: () => { flush(); cur = null; }, flush, times: () => (flush(), times), cur: () => cur };
  }

  // ---------- Tóm tắt trước khi nộp ----------
  const summary = (nums, isAnswered, flags = []) => { const blank = nums.filter(q => !isAnswered(q)); return { total: nums.length, answered: nums.length - blank.length, blank: blank.length, blankList: blank, flagged: nums.filter(q => flags.includes(q) || flags.includes(String(q))).length }; };

  // ---------- Quy đổi TOEIC (ước tính, theo dáng bảng quy đổi công khai: 0 đúng ≈ 5, 100 % ≈ 495) ----------
  // Điểm theo SỐ CÂU ĐÚNG quy về 100 câu/phần; Listening dễ lên điểm hơn Reading ở cùng số câu (như bảng tham khảo phổ biến).
  const TOEIC_L = [[96, 495], [91, 470], [86, 440], [81, 405], [76, 375], [71, 345], [66, 315], [61, 285], [56, 255], [51, 230], [46, 200], [41, 175], [36, 150], [31, 125], [26, 100], [21, 75], [16, 55], [11, 35], [6, 15], [0, 5]];
  const TOEIC_R = [[96, 495], [91, 460], [86, 425], [81, 390], [76, 355], [71, 325], [66, 295], [61, 265], [56, 240], [51, 210], [46, 185], [41, 160], [36, 135], [31, 110], [26, 85], [21, 65], [16, 45], [11, 25], [6, 10], [0, 5]];
  const toeicScaled = (right, total, part = 'L') => { const per100 = total ? right / total * 100 : 0, tb = part === 'R' ? TOEIC_R : TOEIC_L; const i = tb.findIndex(([m]) => per100 >= m), [m0, s0] = tb[i]; if (i === 0) return per100 >= 100 ? 495 : s0; const [m1, s1] = tb[i - 1]; return Math.round((s0 + (s1 - s0) * (per100 - m0) / (m1 - m0)) / 5) * 5; };

  const api = { DURATION, fmt, store, clock, timeTracker, summary, toeicScaled };

  // ================= Phần giao diện (chỉ trong trình duyệt) =================
  if (typeof document !== 'undefined') {
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const tt = (s, o) => (g.t ? g.t(s, o) : s);
    const toast = m => { if (g.UI && UI.toast) UI.toast(m, 4000); };
    const live = m => { let el = document.getElementById('xkLive'); if (!el) { el = document.createElement('div'); el.id = 'xkLive'; el.className = 'sr-only'; el.setAttribute('aria-live', 'assertive'); document.body.appendChild(el); } el.textContent = m; };

    // Chip đồng hồ (thanh trên của khung focus)
    api.chipHtml = (id = 'xkClock') => `<span class="xk-clock" id="${id}" role="timer" aria-live="off"><i data-lucide="clock-3" aria-hidden="true"></i><b>--:--</b></span>`;
    api.paintChip = (el, v) => { if (!el) return; el.hidden = v.mode === 'off'; const b = el.querySelector('b'); if (b) b.textContent = v.text; el.classList.toggle('w5', v.level === 'w5'); el.classList.toggle('w1', v.level === 'w1'); el.setAttribute('aria-label', v.mode === 'exam' ? tt('Còn {t}', { t: v.text }) : tt('Đã làm {t}', { t: v.text })); };
    api.warn = sec => { const m = sec <= 60 ? tt('Còn 1 phút – kiểm tra lại câu trống!') : tt('Còn 5 phút'); toast('⏰ ' + m); live(m); if (g.Sfx && Sfx.tap) try { Sfx.tap(); } catch (e) { /* không có âm */ } };

    // Chọn chế độ giờ (màn bắt đầu): thi thật / luyện đếm xuôi / tắt giờ – nhớ lựa chọn
    api.modeOf = () => { try { return localStorage.getItem('lk.exam.mode') || 'exam'; } catch (e) { return 'exam'; } };
    api.modePicker = (id = 'xkMode') => { const m = api.modeOf(); const o = [['exam', 'timer', tt('Thi thật – đếm ngược, hết giờ tự nộp')], ['practice', 'timer-reset', tt('Luyện – đếm xuôi, không giới hạn')], ['off', 'eye-off', tt('Luyện – ẩn đồng hồ')]]; return `<fieldset class="xk-modes" id="${id}"><legend class="small"><b>${tt('Chế độ giờ')}</b></legend>${o.map(([v, ic, l]) => `<label class="xk-mode"><input type="radio" name="${id}" value="${v}"${v === m ? ' checked' : ''}><i data-lucide="${ic}" aria-hidden="true"></i><span>${l}</span></label>`).join('')}</fieldset>`; };
    api.readMode = (id = 'xkMode') => { const r = document.querySelector(`#${id} input:checked`); const v = r ? r.value : api.modeOf(); try { localStorage.setItem('lk.exam.mode', v); } catch (e) { /* bỏ qua */ } return v; };

    // Nút đánh dấu xem lại trên từng câu ([data-item]); flags = mảng số câu (chuỗi)
    api.flagButtons = (root, flags, onChange) => {
      root.querySelectorAll('[data-item]').forEach(el => {
        if (el.querySelector('.xk-flag')) return;
        const q = el.dataset.item.split(',')[0], b = document.createElement('button');
        b.type = 'button'; b.className = 'xk-flag'; b.dataset.q = q;
        const paint = () => { const on = flags.includes(q); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', on ? tt('Bỏ đánh dấu câu {n}', { n: q }) : tt('Đánh dấu câu {n} để xem lại', { n: q })); b.innerHTML = `<i data-lucide="flag" aria-hidden="true"></i>`; };
        b.onclick = e => { e.preventDefault(); const i = flags.indexOf(q); if (i >= 0) flags.splice(i, 1); else flags.push(q); paint(); if (g.UI && UI.addIcons) UI.addIcons(b); if (onChange) onChange(q); };
        paint(); el.classList.add('xk-q'); el.insertBefore(b, el.firstChild);
      });
      if (g.UI && UI.addIcons) UI.addIcons(root);
    };
    api.toggleFlag = (root, q) => { const b = root.querySelector(`.xk-flag[data-q="${q}"]`); if (b) b.click(); };

    // Bảng câu: ô số – đã làm (đặc) / trống (viền) / đánh dấu (góc cờ)
    const gridHtml = (nums, isAns, flags, cur) => `<div class="xk-grid" role="list">${nums.map(q => { const a = isAns(q), f = flags.includes(String(q)); return `<button type="button" role="listitem" class="xk-n${a ? ' on' : ''}${f ? ' fl' : ''}${String(q) === String(cur) ? ' cur' : ''}" data-go="${q}" aria-label="${esc(tt('Câu {n}', { n: q }) + ' – ' + (a ? tt('đã làm') : tt('chưa làm')) + (f ? ', ' + tt('đã đánh dấu') : ''))}">${q}</button>`; }).join('')}</div>
      <div class="xk-legend tiny"><span><i class="xk-n on"></i>${tt('Đã làm')}</span><span><i class="xk-n"></i>${tt('Trống')}</span><span><i class="xk-n fl"></i>${tt('Đánh dấu')}</span></div>`;
    api.gridHtml = gridHtml;
    const bindGo = (box, onGo) => box.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { if (g.UI) UI.closeModal(); onGo(b.dataset.go); });

    // Sheet bảng câu: lọc Tất cả / Trống / Đánh dấu
    api.palette = ({ nums, isAnswered, flags, cur, onGo, title }) => {
      const s = summary(nums, isAnswered, flags);
      const draw = f => { const list = f === 'blank' ? nums.filter(q => !isAnswered(q)) : f === 'flag' ? nums.filter(q => flags.includes(String(q))) : nums; return list.length ? gridHtml(list, isAnswered, flags, cur) : `<p class="small muted">${tt('Không có câu nào.')}</p>`; };
      UI.modal(`<div class="xk-sheet"><div class="row between"><h3 style="margin:0">${esc(title || tt('Bảng câu hỏi'))}</h3><button class="xk-x" type="button" data-close aria-label="${esc(tt('Đóng'))}"><i data-lucide="x" aria-hidden="true"></i></button></div>
        <div class="xk-tabs" role="tablist">${[['all', tt('Tất cả {n}', { n: s.total })], ['blank', tt('Trống {n}', { n: s.blank })], ['flag', tt('Đánh dấu {n}', { n: s.flagged })]].map(([k, l], i) => `<button type="button" role="tab" class="xk-tab${i ? '' : ' on'}" data-f="${k}" aria-selected="${!i}">${l}</button>`).join('')}</div><div id="xkGrid">${draw('all')}</div></div>`);
      const box = document.getElementById('modalBox'); bindGo(box, onGo);
      box.querySelectorAll('[data-close]').forEach(b => b.onclick = () => UI.closeModal());
      box.querySelectorAll('.xk-tab').forEach(b => b.onclick = () => { box.querySelectorAll('.xk-tab').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); }); box.querySelector('#xkGrid').innerHTML = draw(b.dataset.f); bindGo(box, onGo); });
      if (UI.addIcons) UI.addIcons(box);
    };

    // Xác nhận nộp: số câu đã làm / trống / đánh dấu + giờ còn; "Xem câu trống" nhảy tới câu trống đầu tiên
    api.confirmSubmit = ({ nums, isAnswered, flags, leftText, title, onSubmit, onGo }) => {
      const s = summary(nums, isAnswered, flags);
      UI.modal(`<div class="xk-sheet xk-confirm"><h3 style="margin:0">${esc(title || tt('Nộp bài?'))}</h3>${leftText ? `<p class="small"><i data-lucide="clock-3" aria-hidden="true"></i> ${tt('Còn {t}', { t: esc(leftText) })} · ${tt('vẫn còn thời gian soát lại')}</p>` : ''}
        <div class="xk-stats"><div class="xk-stat ok"><small>${tt('Đã làm')}</small><b>${s.answered}</b></div><div class="xk-stat${s.blank ? ' warn' : ''}"><small>${tt('Trống')}</small><b>${s.blank}</b></div><div class="xk-stat"><small>${tt('Đánh dấu')}</small><b>${s.flagged}</b></div></div>
        ${gridHtml(nums, isAnswered, flags)}
        ${s.blank ? `<p class="tiny xk-note">${tt('Không bị trừ điểm khi sai – đoán câu trống vẫn có lợi hơn bỏ trống.')}</p>` : ''}
        <button class="btn primary lg block" type="button" id="xkSubmit">${tt('Nộp bài')}</button>
        ${s.blank ? `<button class="btn ghost block" type="button" id="xkBlank">${tt('Xem {n} câu trống', { n: s.blank })}</button>` : `<button class="btn ghost block" type="button" data-close>${tt('Quay lại soát bài')}</button>`}</div>`);
      const box = document.getElementById('modalBox'); bindGo(box, onGo);
      box.querySelector('#xkSubmit').onclick = () => { UI.closeModal(); onSubmit(); };
      const bb = box.querySelector('#xkBlank'); if (bb) bb.onclick = () => { UI.closeModal(); onGo(s.blankList[0]); };
      box.querySelectorAll('[data-close]').forEach(b => b.onclick = () => UI.closeModal());
      if (UI.addIcons) UI.addIcons(box);
    };

    // Phím tắt: ←/→ câu, 1–4 hoặc A–D chọn, F đánh dấu, M bảng câu, Enter câu tiếp. Bỏ qua khi đang gõ trong ô nhập.
    api.keys = h => {
      const on = e => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const tg = e.target, typing = tg && (tg.tagName === 'TEXTAREA' || tg.isContentEditable || (tg.tagName === 'INPUT' && !/radio|checkbox|button/.test(tg.type)) || tg.tagName === 'SELECT');
        if (typing || !document.getElementById('modal').hidden) return;
        const k = e.key, K = k.length === 1 ? k.toUpperCase() : k;
        if (K === 'ArrowRight' && h.next) { e.preventDefault(); h.next(); } else if (K === 'ArrowLeft' && h.prev) { e.preventDefault(); h.prev(); } else if (K === 'F' && h.flag) h.flag(); else if (K === 'M' && h.map) h.map(); else if (/^[1-4]$/.test(K) && h.choose) h.choose(+K - 1); else if (/^[A-D]$/.test(K) && h.choose) h.choose(K.charCodeAt(0) - 65); else if (K === 'Enter' && h.enter && tg === document.body) h.enter();
      };
      document.addEventListener('keydown', on);
      return () => document.removeEventListener('keydown', on);
    };

    // Chọn phương án thứ i của câu đang làm (radio trong [data-item])
    api.chooseIn = (el, i) => { if (!el) return; const r = el.querySelectorAll('input[type=radio]')[i]; if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); r.focus({ preventScroll: true }); } };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = api; else g.ExamKit = api;
})(typeof window !== 'undefined' ? window : globalThis);
