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
    if (g.UI && UI.addIcons) { /*icons*/UI.addIcons('<symbol id="i-clock-3" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16.5 12"/></symbol><symbol id="i-arrow-right" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></symbol><symbol id="i-timer-reset" viewBox="0 0 24 24"><path d="M10 2h4"/><path d="M12 14v-4"/><path d="M4 13a8 8 0 0 1 8-7 8 8 0 1 1-5.3 14L4 17.6"/><path d="M9 17H4v5"/></symbol><symbol id="i-eye-off" viewBox="0 0 24 24"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></symbol><symbol id="i-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></symbol><symbol id="i-plus" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5v14"/></symbol>');/*/icons*/ } // icon Lucide chỉ màn thi dùng (scripts/build-icons.mjs LAZY) – vào sprite lúc nạp gói
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const tt = (s, o) => (g.t ? g.t(s, o) : s);
    const toast = m => { if (g.UI && UI.toast) UI.toast(m, 4000); };
    const live = m => { let el = document.getElementById('xkLive'); if (!el) { el = document.createElement('div'); el.id = 'xkLive'; el.className = 'sr-only'; el.setAttribute('aria-live', 'assertive'); document.body.appendChild(el); } el.textContent = m; };

    const ic = n => (g.UI && UI.icon ? UI.icon(n) : '');
    // Chip đồng hồ (thanh trên của khung focus)
    api.chipHtml = (id = 'xkClock') => `<span class="xk-clock" id="${id}" role="timer" aria-live="off">${ic('clock-3')}<b>--:--</b></span>`;
    api.paintChip = (el, v) => { if (!el) return; el.hidden = v.mode === 'off'; const b = el.querySelector('b'); if (b) b.textContent = v.text; el.classList.toggle('w5', v.level === 'w5'); el.classList.toggle('w1', v.level === 'w1'); el.setAttribute('aria-label', v.mode === 'exam' ? tt('Còn {t}', { t: v.text }) : tt('Đã làm {t}', { t: v.text })); };
    api.warn = sec => { const m = sec <= 60 ? tt('Còn 1 phút – kiểm tra lại câu trống!') : tt('Còn 5 phút'); toast('⏰ ' + m); live(m); if (g.Sfx && Sfx.tap) try { Sfx.tap(); } catch (e) { /* không có âm */ } };

    // ===== Khung FOCUS (ref brand/stitch/exam/exam-run-*): thanh trên X · tiến độ "Câu x / N" · đồng hồ; hàng Part + cờ; thanh dưới ← · bảng câu · Tiếp =====
    const progInner = (pos, total) => { const p = total ? Math.round(pos / total * 100) : 0, l = tt('Câu {a} / {b}', { a: pos, b: total }); return `<div class="xk-prog-t"><span>${l}</span><b>${p}%</b></div><div class="xk-track" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${pos}" aria-label="${esc(l)}"><i style="width:${p}%"></i></div>`; };
    api.focusTop = ({ exitHref, exitConfirm, pos = 0, total = 0, chipId = 'xkClock' }) => `<header class="xk-top"><a class="xk-x" href="${esc(exitHref)}" data-confirm="${esc(exitConfirm || tt('Thoát bài thi?'))}" aria-label="${esc(tt('Thoát bài thi'))}">${ic('x')}</a><div class="xk-prog" id="xkProg">${progInner(pos, total)}</div>${api.chipHtml(chipId)}</header>`;
    api.paintProg = (pos, total) => { const el = document.getElementById('xkProg'); if (el) el.innerHTML = progInner(pos, total); };
    api.focusSub = ({ part, name, flag = true }) => `<div class="xk-sub"><div class="xk-part"><span class="xk-badge">${esc(part)}</span><span>${esc(name || '')}</span></div>${flag ? `<button type="button" class="xk-flag" id="xkFlagCur" aria-pressed="false" aria-keyshortcuts="F">${ic('flag')}</button>` : ''}</div>`;
    api.paintFlag = (on, q) => { const b = document.getElementById('xkFlagCur'); if (!b) return; b.classList.toggle('on', !!on); b.setAttribute('aria-pressed', !!on); b.setAttribute('aria-label', on ? tt('Bỏ đánh dấu câu {n}', { n: q }) : tt('Đánh dấu câu {n} để xem lại', { n: q })); };
    api.helperHtml = () => `<div class="xk-help"><span><i class="xk-dot" aria-hidden="true"></i>${tt('Đã tự lưu')}</span><button type="button" class="xk-keys" id="xkKeys">${tt('Phím tắt: 1–4 / A–D')}</button></div>`;
    api.bindHelper = () => { const b = document.getElementById('xkKeys'); if (b) b.onclick = () => toast(tt('Phím tắt: ←/→ đổi câu · 1–4 hoặc A–D chọn · F đánh dấu · M bảng câu')); };
    const ansInner = (a, n) => tt('<b>{a}</b> / {n} đã làm', { a, n });
    api.focusFoot = ({ answered = 0, total = 0, next, prev = true, map = true }) => `<footer class="xk-foot">${prev ? `<button type="button" class="xk-prev" id="xkPrev" aria-label="${esc(tt('Câu trước'))}">${ic('chevron-left')}</button>` : ''}${map ? `<button type="button" class="xk-map" id="xkMap" aria-keyshortcuts="M" aria-label="${esc(tt('Bảng câu hỏi'))}">${ic('layout-grid')}<span id="xkAns">${ansInner(answered, total)}</span></button>` : '<span class="xk-sp"></span>'}<button type="button" class="btn primary xk-next" id="xkNext">${esc(next || tt('Tiếp'))}${ic('arrow-right')}</button></footer>`;
    api.paintAns = (a, n) => { const el = document.getElementById('xkAns'); if (el) el.innerHTML = ansInner(a, n); };
    api.paintNext = label => { const b = document.getElementById('xkNext'); if (b) b.innerHTML = esc(label) + ic('arrow-right'); };
    // Bật/tắt khung focus toàn trang (ẩn vỏ app, thanh dưới cố định) – trả hàm gỡ
    api.focusOn = () => { document.body.classList.add('bare', 'xk-focus'); return () => document.body.classList.remove('xk-focus'); };

    // Chọn chế độ giờ (màn bắt đầu): thi thật / luyện đếm xuôi / tắt giờ – nhớ lựa chọn
    api.modeOf = () => { try { return localStorage.getItem('lk.exam.mode') || 'exam'; } catch (e) { return 'exam'; } };
    api.modePicker = (id = 'xkMode') => { const m = api.modeOf(); const o = [['exam', 'timer', tt('Thi thật – đếm ngược, hết giờ tự nộp')], ['practice', 'timer-reset', tt('Luyện – đếm xuôi, không giới hạn')], ['off', 'eye-off', tt('Luyện – ẩn đồng hồ')]]; return `<fieldset class="xk-modes" id="${id}"><legend class="small"><b>${tt('Chế độ giờ')}</b></legend>${o.map(([v, i, l]) => `<label class="xk-mode"><input type="radio" name="${id}" value="${v}"${v === m ? ' checked' : ''}>${ic(i)}<span>${l}</span></label>`).join('')}</fieldset>`; };
    api.readMode = (id = 'xkMode') => { const r = document.querySelector(`#${id} input:checked`); const v = r ? r.value : api.modeOf(); try { localStorage.setItem('lk.exam.mode', v); } catch (e) { /* bỏ qua */ } return v; };

    // Nút đánh dấu xem lại trên từng câu ([data-item]); flags = mảng số câu (chuỗi). only(el) → chỉ gắn cho câu thỏa điều kiện
    api.flagButtons = (root, flags, onChange, only) => {
      root.querySelectorAll('[data-item]').forEach(el => {
        if (el.querySelector('.xk-flag') || (only && !only(el))) return;
        const q = el.dataset.item.split(',')[0], b = document.createElement('button');
        b.type = 'button'; b.className = 'xk-flag'; b.dataset.q = q;
        const paint = () => { const on = flags.includes(q); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', on ? tt('Bỏ đánh dấu câu {n}', { n: q }) : tt('Đánh dấu câu {n} để xem lại', { n: q })); };
        b.innerHTML = ic('flag');
        b.onclick = e => { e.preventDefault(); const i = flags.indexOf(q); if (i >= 0) flags.splice(i, 1); else flags.push(q); paint(); if (onChange) onChange(q); };
        b._paint = paint; paint(); el.classList.add('xk-q'); el.insertBefore(b, el.firstChild);
      });
    };
    api.toggleFlag = (root, q) => { const b = root.querySelector(`.xk-flag[data-q="${q}"]`); if (b) b.click(); };
    api.repaintFlags = root => root.querySelectorAll('.xk-flag[data-q]').forEach(b => b._paint && b._paint());

    // Bảng câu: ô số – đã làm (đặc) / trống (viền đứt) / đánh dấu (góc cờ); chú giải kèm số đếm
    const gridHtml = (nums, isAns, flags, cur, all) => { const s = summary(all || nums, isAns, flags); return `<div class="xk-grid" role="list">${nums.map(q => { const a = isAns(q), f = flags.includes(String(q)); return `<button type="button" role="listitem" class="xk-n${a ? ' on' : ''}${f ? ' fl' : ''}${String(q) === String(cur) ? ' cur' : ''}" data-go="${q}" aria-label="${esc(tt('Câu {n}', { n: q }) + ' – ' + (a ? tt('đã làm') : tt('chưa làm')) + (f ? ', ' + tt('đã đánh dấu') : ''))}">${q}</button>`; }).join('')}</div>
      <div class="xk-legend tiny"><span><i class="xk-n on"></i>${tt('Đã làm ({n})', { n: s.answered })}</span><span class="xk-lb"><i class="xk-n"></i>${tt('Trống ({n})', { n: s.blank })}</span><span><i class="xk-n on fl"></i>${tt('Đánh dấu ({n})', { n: s.flagged })}</span></div>`; };
    api.gridHtml = gridHtml;
    const bindGo = (box, onGo) => box.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { if (g.UI) UI.closeModal(); onGo(b.dataset.go); });
    const range = nums => nums.length ? `${nums[0]}–${nums[nums.length - 1]}` : '';

    // Sheet bảng câu: lọc Tất cả / Trống / Đánh dấu
    api.palette = ({ nums, isAnswered, flags, cur, onGo, title }) => {
      const s = summary(nums, isAnswered, flags);
      const draw = f => { const list = f === 'blank' ? nums.filter(q => !isAnswered(q)) : f === 'flag' ? nums.filter(q => flags.includes(String(q))) : nums; return list.length ? gridHtml(list, isAnswered, flags, cur, nums) : `<p class="small muted">${tt('Không có câu nào.')}</p>`; };
      UI.modal(`<div class="xk-sheet"><i class="xk-handle" aria-hidden="true"></i><div class="row between"><h3 style="margin:0">${esc(title || tt('Bảng câu hỏi'))} <span class="xk-range">(${range(nums)})</span></h3><button class="xk-x" type="button" data-close aria-label="${esc(tt('Đóng'))}">${ic('x')}</button></div>
        <div class="xk-tabs" role="tablist">${[['all', tt('Tất cả {n}', { n: s.total })], ['blank', tt('Trống {n}', { n: s.blank })], ['flag', tt('Đánh dấu {n}', { n: s.flagged })]].map(([k, l], i) => `<button type="button" role="tab" class="xk-tab${i ? '' : ' on'}" data-f="${k}" aria-selected="${!i}">${l}</button>`).join('')}</div><div class="xk-card" id="xkGrid">${draw('all')}</div></div>`);
      const box = document.getElementById('modalBox'); bindGo(box, onGo);
      box.querySelectorAll('[data-close]').forEach(b => b.onclick = () => UI.closeModal());
      box.querySelectorAll('.xk-tab').forEach(b => b.onclick = () => { box.querySelectorAll('.xk-tab').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); }); box.querySelector('#xkGrid').innerHTML = draw(b.dataset.f); bindGo(box, onGo); });
    };

    // Xác nhận nộp (ref exam-confirm): pill tên đề · tiêu đề · giờ còn · 3 ô Đã làm/Trống/Đánh dấu · bảng câu có chú giải · ghi chú không trừ điểm · Nộp bài · Xem n câu trống
    api.confirmSubmit = ({ nums, isAnswered, flags, leftText, title, pill, onSubmit, onGo }) => {
      const s = summary(nums, isAnswered, flags);
      UI.modal(`<div class="xk-sheet xk-confirm"><i class="xk-handle" aria-hidden="true"></i><div class="xk-chead">${pill ? `<span class="xk-pill"><i class="xk-dot" aria-hidden="true"></i>${esc(pill)}</span>` : ''}<h2>${esc(title || tt('Nộp bài?'))}</h2>${leftText ? `<p class="xk-left">${tt('Còn <b>{t}</b>', { t: esc(leftText) })}<span aria-hidden="true">•</span><span class="xk-ok">${tt('vẫn còn thời gian soát lại')}</span></p>` : ''}</div>
        <div class="xk-stats"><div class="xk-stat ok"><small>${tt('Đã làm')}</small><b>${s.answered}</b><em>${tt('đã trả lời')}</em></div><div class="xk-stat${s.blank ? ' warn' : ''}"><small>${tt('Trống')}</small><b>${s.blank}</b><em>${tt('chưa trả lời')}</em></div><div class="xk-stat"><small>${tt('Đánh dấu')}</small><b>${s.flagged}</b><em>${tt('cần xem lại')}</em></div></div>
        <div class="xk-card"><div class="xk-maph"><b>${tt('Bảng câu hỏi')} <span class="xk-range">(${range(nums)})</span></b><span class="xk-tag">${tt('Chạm để nhảy tới')}</span></div>${gridHtml(nums, isAnswered, flags)}</div>
        ${s.blank ? `<p class="xk-note">${ic('info')}<span>${tt('Không bị trừ điểm khi sai – đoán câu trống vẫn có lợi hơn bỏ trống.')}</span></p>` : ''}
        <div class="xk-cact"><button class="btn primary lg block xk-go" type="button" id="xkSubmit">${tt('Nộp bài')}${ic('arrow-right')}</button>
        ${s.blank ? `<button class="xk-link" type="button" id="xkBlank">${tt('Xem {n} câu trống', { n: s.blank })}</button>` : `<button class="xk-link" type="button" data-close>${tt('Quay lại soát bài')}</button>`}</div></div>`);
      const box = document.getElementById('modalBox'); bindGo(box, onGo);
      box.querySelector('#xkSubmit').onclick = () => { UI.closeModal(); onSubmit(); };
      const bb = box.querySelector('#xkBlank'); if (bb) bb.onclick = () => { UI.closeModal(); onGo(s.blankList[0]); };
      box.querySelectorAll('[data-close]').forEach(b => b.onclick = () => UI.closeModal());
    };

    // ===== Màn CHỮA BÀI chung (ref exam-review): điểm ước tính · điểm theo Part · lọc · thẻ từng câu · Làm lại câu sai · Thêm từ =====
    // o: { root, title, back, badge, score:{label,value,max,subs:[{icon,label,value,detail}],note}, parts:[{label,right,total}], avgSecs,
    //      items:[{n,part,secs,q,options[],given(idx|null),answer(idx),givenText,answerText,ok,flagged,explain,whyWrong{idx:text},words[{word,…}],grammar{href,label}}],
    //      inDeck(word), addWord(w)→Promise, onRetry(items), extraHtml }
    const L4 = 'ABCDEFGH';
    const pctCls = p => p >= 70 ? '' : p < 50 ? ' bad' : ' mid';
    const itemHtml = (it, o) => {
      const opts = (it.options || []).map((x, k) => { const you = it.given === k && !it.ok, right = it.answer === k; return `<div class="xk-opt${right ? ' right' : you ? ' you' : ''}"><span>(${L4[k]}) ${esc(x)}</span>${right ? `<em>${ic('check')}${tt('Đúng')}</em>` : you ? `<em>${ic('x')}${tt('Bạn chọn')}</em>` : ''}</div>`; }).join('');
      const plain = !(it.options || []).length ? `<div class="xk-opt you"><span>${esc(it.givenText || tt('(bỏ trống)'))}</span>${it.ok ? '' : `<em>${ic('x')}${tt('Bạn chọn')}</em>`}</div><div class="xk-opt right"><span>${esc(it.answerText || '')}</span><em>${ic('check')}${tt('Đúng')}</em></div>` : '';
      const ww = it.whyWrong && Object.keys(it.whyWrong).filter(k => +k !== it.answer && it.whyWrong[k]);
      const al = it.answer != null && it.answer >= 0 ? L4[it.answer] : '';
      const words = (it.words || []).map(w => { const has = o.inDeck && o.inDeck(w.word); return `<button type="button" class="xk-chip xk-w${has ? ' on' : ''}" data-w="${esc(w.word)}"${has ? ' disabled' : ''} aria-label="${esc(has ? tt('Đã có “{w}” trong thẻ ôn', { w: w.word }) : tt('Thêm “{w}” vào thẻ ôn', { w: w.word }))}">${esc(w.word)} ${ic(has ? 'check' : 'plus')}</button>`; }).join('');
      return `<article class="xk-card xk-rq" data-n="${esc(it.n)}"><div class="xk-rmeta"><span class="xk-tagn">${esc([tt('Câu {n}', { n: it.n }), it.part, it.secs ? Math.round(it.secs) + ' s' : ''].filter(Boolean).join(' · '))}</span>${it.flagged ? `<span class="xk-fl" title="${esc(tt('Đánh dấu'))}">${ic('flag')}</span>` : ''}</div>
        ${it.passage ? `<details class="xk-pass"><summary>${tt('Xem đoạn văn')}</summary><div>${esc(it.passage)}</div></details>` : ''}${it.img ? `<img class="xk-img" src="${esc(it.img)}" alt="" loading="lazy">` : ''}
        ${it.q ? `<p class="xk-stem">${esc(it.q)}</p>` : ''}<div class="xk-opts">${opts}${plain}</div>
        ${it.explain || (ww && ww.length) ? `<div class="xk-why">${it.explain ? `<div><b class="ok">${ic('circle-check')}${al ? tt('Vì sao {x} đúng', { x: al }) : tt('Vì sao đúng')}</b><p>${esc(it.explain)}</p></div>` : ''}${ww && ww.length ? `<hr><div><b class="no">${ic('circle-x')}${tt('Vì sao các phương án khác sai')}</b><ul>${ww.map(k => `<li><b>${L4[k]}:</b> ${esc(it.whyWrong[k])}</li>`).join('')}</ul></div>` : ''}</div>` : ''}
        ${words ? `<div class="xk-ws"><small>${tt('Thêm vào thẻ ôn')}</small><div>${words}</div></div>` : ''}
        ${it.grammar && it.grammar.href ? `<a class="xk-gram" href="${esc(it.grammar.href)}">${ic('book-open')}<span>${esc(it.grammar.label)}</span>${ic('arrow-right')}</a>` : ''}</article>`;
    };
    api.review = o => {
      const root = o.root || document.getElementById('view'), items = o.items || [], sc = o.score || {};
      const wrong = items.filter(i => !i.ok), blank = items.filter(i => i.given == null && !i.givenText), flagged = items.filter(i => i.flagged);
      const uniq = l => { const m = new Map(); l.forEach(w => { const k = String(w.word).toLowerCase(); if (!m.has(k)) m.set(k, w); }); return [...m.values()]; };
      const newWords = () => uniq(wrong.flatMap(i => i.words || [])).filter(w => !(o.inDeck && o.inDeck(w.word)));
      const F = { all: items, wrong, flag: flagged, blank };
      let f = wrong.length ? 'wrong' : 'all';
      const chips = () => [['all', tt('Tất cả {n}', { n: items.length })], ['wrong', tt('Sai {n}', { n: wrong.length })], ['flag', tt('Đánh dấu {n}', { n: flagged.length })], ['blank', tt('Trống {n}', { n: blank.length })]].map(([k, l]) => `<button type="button" class="xk-chip xk-f${k === f ? ' on' : ''}${k === 'wrong' ? ' no' : ''}" data-f="${k}" aria-pressed="${k === f}">${l}</button>`).join('');
      const list = () => F[f].length ? F[f].map(i => itemHtml(i, o)).join('') : `<p class="xk-card small muted">${tt('Không có câu nào.')}</p>`;
      const nw = newWords().length;
      root.innerHTML = `<div class="xk-rv">
        <div class="xk-rhead"><a class="xk-x" href="${esc(o.back || '#/')}" aria-label="${esc(tt('Quay lại'))}">${ic('arrow-left')}</a><h1>${esc(o.title || tt('Chữa bài'))}</h1></div>
        ${o.badge ? `<div class="xk-badge2">${esc(o.badge)}</div>` : ''}
        <section class="xk-card xk-score"><small>${esc(sc.label || tt('Ước tính'))}</small><div class="xk-big"><b>${sc.value}</b>${sc.max ? `<span>/ ${sc.max}</span>` : ''}</div>
          ${(sc.subs || []).length ? `<div class="xk-subs">${sc.subs.map(s => `<div class="xk-subc"><span class="xk-ico">${ic(s.icon || 'star')}</span><div><small>${esc(s.label)}</small><b>${esc(s.value)}</b>${s.detail ? `<em>${esc(s.detail)}</em>` : ''}</div></div>`).join('')}</div>` : ''}
          ${sc.note ? `<p class="xk-disc">${ic('info')}<span>${esc(sc.note)}</span></p>` : ''}</section>
        ${(o.parts || []).length ? `<section class="xk-card xk-parts"><div class="xk-ph"><b>${ic('chart-column')}${tt('Điểm theo Part')}</b>${o.avgSecs ? `<span class="xk-tagn">${ic('clock-3')}${tt('{s} s / câu', { s: Math.round(o.avgSecs) })}</span>` : ''}</div>
          ${o.parts.map(p => { const v = p.total ? Math.round(p.right / p.total * 100) : 0; return `<div class="xk-pb${pctCls(v)}"><div><span>${esc(p.label)}</span><b>${v}%</b></div><div class="xk-track sm" role="img" aria-label="${esc(p.label + ': ' + p.right + '/' + p.total)}"><i style="width:${v}%"></i></div></div>`; }).join('')}</section>` : ''}
        ${o.extraHtml || ''}
        <div class="xk-fbar" role="toolbar" aria-label="${esc(tt('Lọc câu'))}">${chips()}</div>
        <div id="xkList">${list()}</div>
        ${o.footHtml || ''}
        ${wrong.length || nw ? `<div class="xk-ract">${wrong.length && o.onRetry ? `<button type="button" class="btn primary lg block" id="xkRetry">${ic('refresh-cw')}${tt('Làm lại {n} câu sai', { n: wrong.length })}</button>` : ''}${nw && o.addWord ? `<button type="button" class="xk-link" id="xkAddAll">${tt('Thêm {n} từ vào ôn tập', { n: nw })}</button>` : ''}</div>` : ''}</div>`;
      const bindList = () => root.querySelectorAll('.xk-w:not([disabled])').forEach(b => b.onclick = async () => { const w = items.flatMap(i => i.words || []).find(x => x.word === b.dataset.w); if (!w || !o.addWord) return; b.disabled = true; try { await o.addWord(w); root.querySelectorAll(`.xk-w[data-w="${CSS.escape(w.word)}"]`).forEach(x => { x.classList.add('on'); x.disabled = true; x.innerHTML = esc(w.word) + ' ' + ic('check'); }); toast(tt('Đã thêm “{w}” vào thẻ ôn', { w: w.word })); paintAll(); } catch (e) { b.disabled = false; } });
      const paintAll = () => { const b = root.querySelector('#xkAddAll'); if (!b) return; const n = newWords().length; if (n) b.textContent = tt('Thêm {n} từ vào ôn tập', { n }); else b.hidden = true; };
      root.querySelectorAll('.xk-f').forEach(b => b.onclick = () => { f = b.dataset.f; root.querySelectorAll('.xk-f').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); root.querySelector('#xkList').innerHTML = list(); bindList(); });
      bindList();
      const r = root.querySelector('#xkRetry'); if (r) r.onclick = () => o.onRetry(wrong);
      const a = root.querySelector('#xkAddAll'); if (a) a.onclick = async () => { const ws = newWords(); a.disabled = true; for (const w of ws) { try { await o.addWord(w, true); } catch (e) { /* bỏ qua từ lỗi */ } } toast(tt('Đã thêm {n} từ vào thẻ ôn', { n: ws.length })); root.querySelectorAll('.xk-w').forEach(x => { if (ws.some(w => w.word === x.dataset.w)) { x.classList.add('on'); x.disabled = true; x.innerHTML = esc(x.dataset.w) + ' ' + ic('check'); } }); a.hidden = true; };
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
