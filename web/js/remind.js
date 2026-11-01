/* ⏰ Nhắc học thông minh (tải lười – gói 'remind'; docs/REMINDERS.md). Không có trong khung app: app.js/native.js chỉ gọi App.need('remind').
 * – Bộ lập lịch THUẦN (Remind.plan): giờ cá nhân (30 phút trước giờ hay học, mặc định 20:00), giờ yên lặng, tối đa 1/ngày,
 *   giãn cách sau 3 lần bỏ qua (ngày 1,2,3 → 5,7,10), ngày 14 không mở app = lời nhắc cuối "Kit nhớ bạn" rồi dừng; nội dung chọn theo ngày, không lặp mẫu trong 7 ngày.
 * – App gốc: lên lịch LocalNotifications cho cả chu kỳ mỗi lần mở app (không máy chủ).
 * – Web/PWA: nhắc trong app khi đang mở; ghi kế hoạch 7 ngày (đã dịch) vào cache 'lk-meta' → sw.js đọc khi có push/periodicsync (máy chủ không biết nội dung học).
 * – Web Push (cờ PUSH_PCT ở máy chủ, nhóm nhỏ): đăng ký 1 dòng/thiết bị ở D1 nội bộ (functions/api/push.js), cron Worker workers/push gửi push RỖNG đúng khung giờ.
 * – Hỏi quyền mềm SAU bài học đầu tiên (không bao giờ lúc mở app), hỏi tối đa 1 lần; tắt/đổi trong Cài đặt. */
(function (g) {
  'use strict';
  const DAY = 864e5, SEQ = [0, 1, 2, 3, 5, 7, 10, 14], FINAL = 14, NOREP = 7;
  const TYPES = ['due', 'word', 'streak', 'conf', 'week', 'goal'], EVE = 17 * 60, BACKOFF = 3;
  // Mẫu câu theo loại (khóa tiếng Việt → I18N; biến {n} số thẻ, {w} từ, {c} câu ngữ cảnh, {s} chuỗi ngày, {d} số ngày học trong tuần)
  const TPL = {
    due: [['due1', 'Kit đây! {n} thẻ đang chờ bạn', 'Ôn 5 phút là xong – nhớ lâu hơn hẳn.'], ['due2', '{n} từ sắp quên mất rồi', 'Ôn ngay bây giờ là lúc nhớ lâu nhất.'], ['due3', 'Một vòng ôn nhanh nhé?', '{n} thẻ đến hạn hôm nay. Mình làm cùng nhau!']],
    word: [['word1', 'Còn nhớ “{w}” không?', '“{c}” – bạn còn nhớ nghĩa chứ?'], ['word2', 'Từ của bạn hôm nay: {w}', '“{c}” – chạm để ôn lại.'], ['word3', '“{w}” đang đợi bạn', 'Bạn đã lưu từ này trong câu: “{c}”']],
    streak: [['st1', 'Chuỗi 🔥{s} ngày đang gặp nguy!', 'Chỉ cần 1 phút để giữ chuỗi hôm nay.'], ['st2', 'Đừng để chuỗi {s} ngày tắt nhé', 'Ôn vài thẻ là giữ được – Kit tin bạn!']],
    conf: [['cf1', 'Thử một bài tự tin 3 phút?', 'Luyện nói câu thật, không áp lực.'], ['cf2', 'Nói tiếng Anh tự tin hơn mỗi ngày', 'Một bài ngắn hôm nay – bạn làm được!']],
    week: [['wk1', 'Tuần này: {n} lượt ôn 🎉', 'Xem tiến bộ của bạn trong tuần.'], ['wk2', 'Bạn đã học {d}/7 ngày tuần này', 'Mở để xem bảng tiến bộ tuần.']],
    goal: [['gl1', 'Đã xong {n}/{g} thẻ hôm nay', 'Còn {r} thẻ nữa là đạt mục tiêu – bạn sắp tới rồi!'], ['gl2', 'Sắp đạt mục tiêu hôm nay rồi', 'Thêm {r} thẻ là xong mục tiêu {g} thẻ. Nhẹ nhàng thôi!']],
    miss: [['ms1', 'Kit nhớ bạn lắm 🐦', 'Lâu rồi không gặp. Quay lại 2 phút thôi nhé? Đây là lời nhắc cuối cùng.']],
    gen: [['gen1', 'Đến giờ học với Kit rồi!', 'Mở Lexkite để ôn vài từ nhé.']],
  };
  const ROUTE = { due: '#/review', streak: '#/review', conf: '#/confidence', week: '#/stats', goal: '#/review', miss: '#/home', gen: '#/review' };
  const toMin = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '')); return m ? Math.min(23, +m[1]) * 60 + Math.min(59, +m[2]) : -1; };
  const hm = n => String(Math.floor(n / 60) % 24).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
  const keyOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const midnight = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); }; // đúng cả ngày đổi giờ mùa hè

  let RECENT = null; // lịch sử giờ BẮT ĐẦU phiên học gần đây [{day, m}] (localStorage lk.rems, chỉ trên máy) – phần app gán
  /** Giờ hay học GẦN ĐÂY (cuộn ≤ 21 phiên, phiên mới nặng hơn ×0.9/phiên): ô 30 phút đông nhất (làm mượt 2 ô bên) → trung bình vòng tròn
   *  các phiên trong ±60 phút quanh ô đó. Cần ≥ 5 ngày có phiên; không đủ → -1. Thói quen đổi (đổi ca làm) → vài ngày là theo kịp. */
  function habitMin(recent) {
    const r = (Array.isArray(recent) ? recent : []).filter(x => x && x.m >= 0 && x.m < 1440).slice(-21); if (r.length < 5) return -1;
    const wt = i => Math.pow(0.9, r.length - 1 - i), w = Array(48).fill(0); r.forEach((x, i) => { w[Math.floor(x.m / 30)] += wt(i); });
    let best = 0, bv = -1; for (let b = 0; b < 48; b++) { const v = 2 * w[b] + w[(b + 47) % 48] + w[(b + 1) % 48]; if (v > bv) { bv = v; best = b; } }
    const c = best * 30 + 15; let sx = 0, sy = 0;
    r.forEach((x, i) => { if (Math.abs(((x.m - c + 2160) % 1440) - 720) <= 60) { const a = x.m / 1440 * 2 * Math.PI; sx += wt(i) * Math.cos(a); sy += wt(i) * Math.sin(a); } });
    return Math.round((Math.atan2(sy, sx) / (2 * Math.PI) * 1440 + 1440) % 1440) % 1440;
  }
  /** Giờ nhắc = 30 phút trước giờ hay học (ưu tiên lịch sử phiên gần đây, rồi histogram 24 giờ stats.hours); chưa đủ dữ liệu → giờ người dùng chọn / 20:00. */
  function pickTime(stats, s, recent = RECENT) {
    s = s || {};
    const manual = toMin(s.reminderTime), hs = stats && stats.hours, hb = s.reminderAuto !== false ? habitMin(recent) : -1;
    if (hb >= 0) return clampQuiet((Math.round((hb - 30) / 5) * 5 + 1440) % 1440, s);
    if (s.reminderAuto !== false && Array.isArray(hs) && hs.length === 24 && hs.reduce((a, b) => a + b, 0) >= 8 && Object.keys((stats && stats.days) || {}).length >= 3) {
      let best = 0; for (let h = 1; h < 24; h++) if (hs[h] > hs[best]) best = h;
      return clampQuiet((best * 60 - 30 + 1440) % 1440, s);
    }
    return clampQuiet(manual >= 0 ? manual : 1200, s);
  }
  const quietOf = s => { const a = toMin(s && s.quietStart), b = toMin(s && s.quietEnd); return [a >= 0 ? a : 1320, b >= 0 ? b : 480]; };
  const inQuiet = (n, s) => { const [a, b] = quietOf(s); return a === b ? false : a < b ? n >= a && n < b : n >= a || n < b; };
  /** Giờ rơi vào giờ yên lặng (mặc định 22:00–08:00) → dời ra mép gần nhất (trước giờ bắt đầu 30 phút, hoặc đúng giờ kết thúc). */
  function clampQuiet(n, s) {
    if (!inQuiet(n, s)) return n;
    const [a, b] = quietOf(s), toEnd = (b - n + 1440) % 1440, fromStart = (n - a + 1440) % 1440;
    return fromStart <= toEnd ? (a - 30 + 1440) % 1440 : b;
  }
  /** Ngày thứ d kể từ lần mở app cuối: có nhắc không (dùng chung cho app gốc và máy chủ push). */
  const allowedDay = d => SEQ.includes(d);
  /** Số lời nhắc gần nhất liên tiếp bị bỏ qua (ngày đã nhắc mà không học) + ngày nhắc gần nhất – từ lịch sử 'đã hiện'. */
  function ignoredOf(hist, days, today) {
    const ds = [...new Set((hist || []).map(h => h && h.day).filter(d => d && d < today))].sort().reverse();
    let n = 0; for (const d of ds) { if ((+(days || {})[d] || 0) > 0) break; n++; }
    return { n, last: ds[0] || '' };
  }
  const typesOf = s => { const o = (s && s.remTypes) || {}; return TYPES.filter(k => o[k] !== false); };

  /** Kế hoạch nhắc: [{ at, day, d, type, tpl, title, body, url }]. Thuần (không DOM) – scripts/test/reminders.mjs.
   * x: { now, cards:[], stats, settings, streak, hist:[{day,tpl}], recent:[{day,m}], t(k, vars) }
   * – Chuỗi sắp mất: chỉ khi giờ nhắc là buổi tối (≥ 17:00) và chưa học hôm nay. Đã học một phần mục tiêu ngày → 1 lời nhắc 'goal' (vẫn ≤ 1/ngày).
   * – Bỏ qua ≥ 3 lời nhắc liên tiếp → cách ≥ 2 ngày giữa hai lời nhắc (không bao giờ dồn dập). */
  function plan(x) {
    const now = x.now || Date.now(), s = x.settings || {}, tt = x.t || ((k, v) => String(k).replace(/\{(\w+)\}/g, (_, n) => (v && v[n] != null ? v[n] : ''))); // eslint-disable-line
    if (s.reminderOn === false) return [];
    const types = typesOf(s), min = pickTime(x.stats, s, x.recent), t0 = midnight(now), cards = (x.cards || []).filter(c => c && c.srs);
    const days = (x.stats && x.stats.days) || {}, studied = (days[keyOf(new Date(now))] || 0) > 0, st = Math.max(0, +x.streak || 0);
    const rev = cards.filter(c => c.srs.reps > 0 || c.srs.last);
    const dueBy = end => rev.filter(c => c.srs.due <= end).length;
    const ctxCards = cards.filter(c => c.word && (c.ctx || ((c.contexts || [])[0] || {}).text)).sort((a, b) => (a.srs.due || 0) - (b.srs.due || 0));
    const used = new Map(); for (const h of x.hist || []) if (h && h.tpl && h.day) used.set(h.tpl, h.day > (used.get(h.tpl) || '') ? h.day : used.get(h.tpl));
    const done = days[keyOf(new Date(now))] || 0, goal = Math.max(0, +s.dailyGoal || 0), partial = studied && goal > 0 && done < goal && types.includes('goal');
    const ig = ignoredOf(x.hist, days, keyOf(new Date(now))), dayN = k => { const [y, m, dd] = k.split('-').map(Number); return Math.round(new Date(y, m - 1, dd).getTime() / DAY); };
    let lastKept = ig.n >= BACKOFF && ig.last ? dayN(ig.last) : null;
    const out = [];
    for (const d of SEQ) {
      if (x.remote && d >= 3) break;                 // app gốc có FCM: máy chủ lo kéo lại (≥ 3 ngày) + tiến bộ tuần
      const base = addDays(t0, d), at = base + min * 60e3, dt = new Date(at), day = keyOf(dt);
      if (at <= now + 60e3) continue;              // giờ hôm nay đã qua
      if (d === 0 && studied && !partial) continue; // hôm nay đã học (đủ mục tiêu / không đặt mục tiêu) → không nhắc
      if (lastKept != null && dayN(day) - lastKept < 2) continue; // giãn cách sau nhiều lần bỏ qua
      let type;
      if (d === FINAL) type = 'miss';
      else if (d === 0 && partial) type = 'goal';
      else {
        const cand = [];
        if (types.includes('streak') && st > 0 && min >= EVE && ((d === 0 && !studied) || (d === 1 && studied))) cand.push('streak'); // chuỗi sắp mất: chỉ khi chưa học hôm nay (hoặc ngày mai nếu hôm nay đã học)
        if (types.includes('week') && !x.remote && dt.getDay() === 0 && d <= 7) cand.push('week');
        const rot = ['due', 'word', 'conf'].filter(k => types.includes(k) && (k !== 'due' || dueBy(base + DAY - 1) > 0) && (k !== 'word' || ctxCards.length));
        for (let i = 0; i < rot.length; i++) cand.push(rot[(d + i) % rot.length]);
        type = cand[0];
        if (!type) continue;                       // người dùng tắt hết loại
      }
      // Mẫu: chưa dùng trong 7 ngày (theo lịch sử + kế hoạch này); hết thì lấy mẫu dùng lâu nhất
      const lim = keyOf(new Date(addDays(at, -NOREP))), list = TPL[type];
      const pick = list.find(([id]) => !used.has(id) || used.get(id) <= lim) || list.slice().sort((a, b) => { const x = used.get(a[0]) || '', y = used.get(b[0]) || ''; return x < y ? -1 : x > y ? 1 : 0; })[0]; // khóa ngày YYYY-MM-DD (ASCII) → so chuỗi thường cho cùng thứ tự localeCompare mà không khởi tạo ICU Collator (~50 ms CPU mobile)
      used.set(pick[0], day);
      const v = { n: 0, s: st, d: 0, w: '', c: '', g: goal, r: Math.max(0, goal - done) };
      let url = ROUTE[type];
      if (type === 'due') v.n = dueBy(base + DAY - 1);
      if (type === 'goal') v.n = done;
      if (type === 'word') {
        const c = ctxCards[(d + out.length) % ctxCards.length], cx = String(c.ctx || c.contexts[0].text).replace(/\s+/g, ' ').trim();
        v.w = String(c.word).slice(0, 40); v.c = cx.length > 110 ? cx.slice(0, 108).trim() + '…' : cx; url = '#/review?w=' + encodeURIComponent(c.word);
      }
      if (type === 'week') { for (let i = 0; i < 7; i++) { const n = +days[keyOf(new Date(addDays(t0, d - i)))] || 0; v.n += n; if (n) v.d++; } }
      if (lastKept != null) lastKept = dayN(day);
      out.push({ at, day, d, type, tpl: pick[0], title: tt(pick[1], v), body: tt(pick[2], v), url });
    }
    return out.slice(0, 1 + SEQ.length); // ≤ 1 lời nhắc/ngày (mỗi d là 1 ngày khác nhau)
  }
  const generic = tt => { const [, a, b] = TPL.gen[0], [, c, e] = TPL.miss[0]; return { gen: { title: tt(a), body: tt(b), tpl: 'gen1' }, miss: { title: tt(c), body: tt(e), tpl: 'ms1' } }; };

  const P = { plan, pickTime, habitMin, ignoredOf, clampQuiet, inQuiet, allowedDay, toMin, hm, SEQ, FINAL, TPL, TYPES, keyOf, generic };
  P.setRecent = r => { RECENT = Array.isArray(r) ? r : null; }; P.recent = () => RECENT;
  g.Remind = P;
  if (!g.document || !g.Core || !g.App) return; // môi trường test (vm) – chỉ phần thuần

  // ===================== Phần chạy trong app =====================
  const { Store, Cards, todayKey } = g.Core, App = g.App, state = App.state;
  const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } } };
  const NATIVE = !!(g.VBNative && g.VBNative.is), EXT = !!Store.isExtension;
  const BASE = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '' : 'https://lexkite.com';
  const OFF = /[?&](sandbox|demo)=/.test(location.search) || navigator.webdriver;
  // journey-e2e (scripts/test/journey-e2e.mjs): chỉ khi đang kiểm thử tự động/sandbox VÀ cờ lk.e2e → cho hiện hộp hỏi mềm để kiểm (số liệu/push vẫn TẮT)
  const raw = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const ASKOFF = OFF && !(raw('lk.e2e') === '1' && (navigator.webdriver || Store.sandbox));
  const tr = (k, v) => (typeof g.t === 'function' ? g.t(k, v) : k);
  // Số liệu: shown/open theo mẫu (CTR), ask_yes/ask_no, optin/optout – gộp, gửi bằng beacon text/plain (không preflight), không gửi nội dung học
  const evq = new Map(); let evT = 0;
  const ev = (e, tpl = '', n = 1) => { if (OFF) return; const k = e + '|' + tpl; evq.set(k, (evq.get(k) || 0) + n); clearTimeout(evT); evT = setTimeout(flush, 1500); };
  function flush() {
    if (!evq.size) return; const e = [...evq].slice(0, 12).map(([k, n]) => [...k.split('|'), n]); evq.clear();
    const body = JSON.stringify({ op: 'ev', e });
    try { navigator.sendBeacon ? navigator.sendBeacon(BASE + '/api/push', body) : fetch(BASE + '/api/push', { method: 'POST', body, keepalive: true }); } catch (x) { /* bỏ qua */ }
  }
  addEventListener('pagehide', flush);

  // Lịch sử giờ BẮT ĐẦU phiên học (chỉ trên máy, không đồng bộ): phiên = lần mở/quay lại app sau ≥ 30 phút; ghi 1 lần/ngày khi hôm nay đã học.
  let sess = Date.now(), hidAt = 0;
  document.addEventListener('visibilitychange', () => { if (document.hidden) hidAt = Date.now(); else if (hidAt && Date.now() - hidAt > 30 * 60e3) sess = Date.now(); });
  const starts = () => ls.get('lk.rems', []).filter(x => x && x.day && x.m >= 0);
  P.setRecent(starts());
  function noteStart() {
    const day = todayKey(), r = starts(); if (!((state.stats.days || {})[day] > 0) || r.some(x => x.day === day)) return;
    const d = new Date(sess), m = keyOf(d) === day ? d.getHours() * 60 + d.getMinutes() : 0; // phiên bắt đầu từ hôm qua (qua nửa đêm) → 00:00
    r.push({ day, m }); ls.set('lk.rems', r.slice(-21)); P.setRecent(starts());
    if (EXT) Promise.resolve(Store.set('remRecent', starts())).catch(() => {}); // add-on: service worker không đọc được localStorage → chép sang chrome.storage (chỉ trên máy)
  }
  const hist = () => ls.get('lk.remh', []).filter(h => h && h.day >= keyOf(new Date(Date.now() - 8 * DAY)));
  /** Lời nhắc đã tới giờ trong kế hoạch cũ = đã hiện (app gốc không báo lại) → vào lịch sử chống lặp + đếm 'shown'. */
  function rollPlan(now) {
    const old = ls.get('lk.remp', []), h = hist();
    for (const p of old) if (p.at <= now && !h.some(x => x.day === p.day)) { h.push({ day: p.day, tpl: p.tpl }); if (NATIVE) ev('shown', p.tpl); }
    ls.set('lk.remh', h.slice(-20)); return h;
  }
  function build(now = Date.now(), remote = false) {
    const h = rollPlan(now);
    const p = plan({ now, remote, cards: Object.values(state.cards || {}), stats: state.stats, settings: state.settings, streak: App.streak ? App.streak() : 0, hist: h, recent: starts(), t: tr });
    ls.set('lk.remp', p.map(({ at, day, tpl }) => ({ at, day, tpl })));
    return p;
  }

  // ---------- App gốc: LocalNotifications cho cả chu kỳ ----------
  const NID = [1, ...Array.from({ length: 12 }, (_, i) => 100 + i)];
  async function native(LN, opts = {}) {
    await LN.cancel({ notifications: NID.map(id => ({ id })) }).catch(() => {});
    const o = ls.get('lk.remo', null); if (o) { ev('open', o); ls.set('lk.remo', null); } // chạm thông báo (native.js ghi mẫu) → 'open'
    if (state.settings.reminderOn === false) return;
    const perm = await LN.checkPermissions();
    if (perm.display !== 'granted') { if (!opts.ask) return; const r = await LN.requestPermissions(); if (r.display !== 'granted') return ev('optout', 'os'); ev('optin', 'native'); }
    const remote = await fcmSub().catch(() => false);
    if (FM() && !native.l) native.l = FM().addListener('notificationActionPerformed', a => { const d = (a && a.notification && a.notification.data) || {}; if (d.tpl) ev('open', String(d.tpl)); if (d.route && /^#\/[\w/?=&%-]*$/.test(d.route)) location.hash = d.route; });
    const p = build(Date.now(), remote); if (!p.length) return;
    await LN.schedule({ notifications: p.map((x, i) => ({ id: 100 + i, title: x.title, body: x.body, schedule: { at: new Date(x.at), allowWhileIdle: true }, isExactNotification: false, extra: { route: x.url, tpl: x.tpl } })) });
  }

  // ---------- Web: kế hoạch cho service worker (cache lk-meta) ----------
  let metaKey = '';
  async function syncMeta(p) {
    if (!('caches' in g) || !navigator.serviceWorker || EXT || NATIVE) return;
    const s = state.settings, studied = (state.stats.days || {})[todayKey()] > 0, gtx = generic(tr), first = p[0] || null;
    const m = { v: 2, on: s.reminderOn !== false, time: hm(pickTime(state.stats, s)), last: studied ? new Date().toISOString().slice(0, 10) : '', act: todayKey(), lastDay: studied ? todayKey() : '',
      plan: p.filter(x => x.d <= 7).map(({ day, title, body, url, tpl }) => ({ day, title, body, url: '/app/' + url, tpl })), ...gtx, title: (first || gtx.gen).title, body: (first || gtx.gen).body };
    const k = JSON.stringify(m); if (k === metaKey) return; metaKey = k;
    const c = await caches.open('lk-meta'), r = await c.match('/__meta'), prev = r ? await r.json().catch(() => ({})) : {};
    await c.put('/__meta', new Response(JSON.stringify({ ...m, notified: prev.notified || '' }), { headers: { 'Content-Type': 'application/json' } }));
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg && reg.periodicSync && m.on && 'Notification' in g && Notification.permission === 'granted') {
      try { const ps = await navigator.permissions.query({ name: 'periodic-background-sync' }); if (ps.state === 'granted') await reg.periodicSync.register('vb-daily', { minInterval: 3 * 3600e3 }); } catch (e) { /* không hỗ trợ */ }
    }
  }
  /** Thông báo ngay (nút "Thử thông báo" trong Cài đặt, nhắc trong app khi đã tới giờ). */
  async function notify(force, item) {
    const it = item || build()[0] || { ...generic(tr).gen, url: '#/review' };
    if (EXT && g.chrome && chrome.runtime) { chrome.runtime.sendMessage({ type: 'testNotify' }); return; }
    if (!('Notification' in g)) return force && UI.toast(tr('Trình duyệt không hỗ trợ thông báo'));
    if (Notification.permission !== 'granted') {
      if (!force) return;
      if (await Notification.requestPermission() !== 'granted') return UI.toast(tr('Bạn chưa cho phép thông báo'));
    }
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(), url = location.href.split('#')[0] + (it.url || '#/review');
    if (reg) reg.showNotification(it.title, { body: it.body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'daily', data: { url, tpl: it.tpl } });
    else new Notification(it.title, { body: it.body, icon: 'icons/icon-192.png' });
    if (!force) ev('shown', it.tpl);
  }

  // ---------- Web Push (cờ máy chủ, nhóm nhỏ) ----------
  const iOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => !!(navigator.standalone || (g.matchMedia && matchMedia('(display-mode: standalone)').matches));
  const pushApi = () => !NATIVE && !EXT && 'serviceWorker' in navigator && 'PushManager' in g && 'Notification' in g;
  /** 'ok' | 'ios-install' (iPhone: chỉ khi đã thêm vào MH chính) | 'denied' | 'none' */
  const pushState = () => !pushApi() ? (iOS && !standalone() && !NATIVE && !EXT ? 'ios-install' : 'none') : Notification.permission === 'denied' ? 'denied' : 'ok';
  let cfgP = null;
  const cfg = () => cfgP || (cfgP = fetch(BASE + '/api/push?op=cfg').then(r => (r.ok ? r.json() : {})).catch(() => ({})));
  const cohort = pct => { let v = ls.get('lk.remc', -1); if (v < 0) { v = Math.floor(Math.random() * 100); ls.set('lk.remc', v); } return v < (+pct || 0); };
  const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, ch => ch.charCodeAt(0)); };
  // Máy chủ cần: giờ nhắc ĐỊA PHƯƠNG + múi giờ IANA + giờ yên lặng + ngôn ngữ → tự tính khung UTC (đổi giờ mùa hè, đi du lịch)
  const where = () => { const s = state.settings, q = [toMin(s.quietStart), toMin(s.quietEnd)]; let tz = 'UTC'; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { /* cũ */ } return { lmin: pickTime(state.stats, s), q: q[0] >= 0 && q[1] >= 0 ? q : [1320, 480], tz, lang: g.I18N ? I18N.lang() : 'en' }; };
  const sig = w => [w.lmin, w.q.join('-'), w.tz, w.lang].join('|');
  async function post(b) { const r = await fetch(BASE + '/api/push', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(b) }); if (!r.ok) throw new Error('push-' + r.status); return r.json().catch(() => ({})); }
  /** Có được bật push không (cờ + nhóm + trình duyệt) → khóa VAPID công khai | ''. */
  async function pushKey() { if (OFF || pushState() !== 'ok') return ''; const c = await cfg(); return c && c.on && c.key && cohort(c.pct) ? c.key : ''; }
  async function subscribe() {
    const key = await pushKey(); if (!key) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
    const j = sub.toJSON(), w = where(), studied = (state.stats.days || {})[todayKey()] > 0;
    const r = await post({ op: 'sub', k: 'web', ep: j.endpoint, ...w, st: studied ? 1 : 0 });
    ls.set('lk.push', { id: r.id, sig: sig(w), act: todayKey(), std: studied ? todayKey() : '' }); ev('optin', 'push'); return true;
  }
  async function unsubscribe() {
    const p = ls.get('lk.push', null); ls.set('lk.push', null);
    try { const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } catch (e) { /* bỏ qua */ }
    if (p && p.id) post({ op: 'unsub', id: p.id }).catch(() => {});
    ev('optout', 'push');
  }
  /** Máy chủ chỉ cần: ngày mở app gần nhất, đã học hôm nay chưa, khung giờ → gửi khi 1 trong 3 ĐỔI (≤ 2 lần ghi/ngày). */
  async function touch(key = 'lk.push', resub = subscribe) {
    const p = ls.get(key, null); if (!p || !p.id || OFF) return;
    const w = where(), studied = (state.stats.days || {})[todayKey()] > 0, n = { ...p, sig: sig(w), act: todayKey(), std: studied ? todayKey() : p.std };
    if (state.settings.reminderOn === false || (key === 'lk.push' && Notification.permission !== 'granted')) return key === 'lk.push' ? unsubscribe() : post({ op: 'unsub', id: p.id }).then(() => ls.set(key, null)).catch(() => {});
    if (n.sig === p.sig && n.act === p.act && n.std === p.std) return;
    const r = await post({ op: 'touch', id: p.id, ...w, st: studied ? 1 : 0 }).catch(e => e);
    if (r && r.gone) { ls.set(key, null); return resub().catch(() => {}); } // máy chủ đã xóa (hết hạn) → đăng ký lại
    if (!(r instanceof Error)) ls.set(key, n);
  }
  // ---------- App gốc: FCM (cờ FCM_ON) – chỉ kéo lại sau ≥ 3 ngày không mở app + tiến bộ tuần; nhắc hằng ngày vẫn là lịch cục bộ ----------
  const FM = () => (NATIVE && g.Capacitor.Plugins && g.Capacitor.Plugins.FirebaseMessaging) || null;
  async function fcmSub() {
    const M = FM(); if (!M || OFF) return false;
    const c = await cfg(); if (!c || !c.fcm) return false;
    const { token } = await M.getToken(); if (!token) return false;
    const w = where(), studied = (state.stats.days || {})[todayKey()] > 0, p = ls.get('lk.fcm', null);
    if (p && p.tok === token) return touch('lk.fcm', fcmSub).then(() => true);
    const r = await post({ op: 'sub', k: 'fcm', token, ...w, st: studied ? 1 : 0 });
    ls.set('lk.fcm', { id: r.id, tok: token, sig: sig(w), act: todayKey(), std: studied ? todayKey() : '' }); return true;
  }

  // ---------- Hỏi quyền mềm: sau bài học hoàn thành ĐẦU TIÊN, không bao giờ lúc mở app, tối đa 1 lần ----------
  const canAsk = async () => {
    if (ASKOFF || EXT || ls.get('lk.reask', 0) || state.settings.reminderOn === false) return false;
    if (raw('lk.edu') === '1' || raw('lk.u13') === '1') return false; // học sinh lớp học / dưới 13 tuổi: không mời nhắc học (giáo viên giao bài)
    if (NATIVE) { const LN = g.Capacitor.Plugins.LocalNotifications; if (!LN) return false; const p = await LN.checkPermissions().catch(() => ({})); return p.display === 'prompt' || p.display === 'prompt-with-rationale'; }
    return 'Notification' in g && Notification.permission === 'default';
  };
  async function softAsk() {
    if (!(await canAsk()) || !document.getElementById('modal') || !document.getElementById('modal').hidden) return;
    ls.set('lk.reask', Date.now());
    const box = UI.modal(`<div class="stack" style="text-align:center"><div aria-hidden="true">${g.Kit ? Kit.svg('happy', 88) : '🐦'}</div>
      <h2 id="raT" style="margin:0">${tr('Nhận lời nhắc học nhẹ nhàng?')}</h2>
      <p class="small muted">${tr('Kit nhắc bạn đúng giờ bạn hay học – tối đa 1 lần mỗi ngày, không làm phiền ban đêm. Tắt bất cứ lúc nào trong Cài đặt.')}</p>
      <div class="row" style="justify-content:center"><button class="btn primary" id="raY">${tr('Có, nhắc mình')}</button><button class="btn ghost" data-close id="raN">${tr('Để sau')}</button></div></div>`);
    box.setAttribute('aria-labelledby', 'raT');
    box.querySelector('#raN').addEventListener('click', () => ev('ask_no'));
    box.querySelector('#raY').onclick = async () => {
      UI.closeModal(); ev('ask_yes');
      if (NATIVE) return g.VBNative.scheduleReminder({ ask: true });
      if (await Notification.requestPermission() !== 'granted') return ev('optout', 'os');
      ev('optin', 'web'); syncMeta(build()).catch(() => {});
      subscribe().catch(() => {});
      UI.toast('⏰ ' + tr('Đã bật nhắc học'));
    };
  }
  let doneOnce = false;
  const lessonDone = () => { if (doneOnce) return; doneOnce = true; setTimeout(() => softAsk().catch(() => {}), 1800); };
  addEventListener('lexkite:practice-done', lessonDone); addEventListener('lexkite:test-done', lessonDone);
  new MutationObserver(() => { if (!doneOnce && document.querySelector('.rev-done') && ((state.stats.days || {})[todayKey()] || 0) > 0) lessonDone(); }).observe(App.view || document.body, { childList: true });

  // ---------- Nhịp mỗi phút (thay checkReminder cũ của app.js) ----------
  async function tick() {
    const s = state.settings;
    noteStart();
    // Giờ tự động theo thói quen (web, add-on, app đều đọc reminderTime)
    if (s.reminderAuto !== false) { const m = hm(pickTime(state.stats, s)); if (m !== s.reminderTime) { s.reminderTime = m; App.saveSettings(); } }
    if (EXT || NATIVE) return;
    const p = build(); syncMeta(p).catch(() => {}); touch().catch(() => {});
    // Thời điểm vàng (giữ nguyên hành vi cũ, tôn trọng giờ yên lặng)
    const Golden = g.Core.Golden;
    if (s.goldenOn && Golden && !Golden.quiet(s) && 'Notification' in g && Notification.permission === 'granted') {
      const n = Golden.dueNow(state.cards), last = await Store.get('lastGolden', 0);
      if (n >= s.goldenMin && Date.now() - last > 3 * 3600e3 && document.hidden) {
        await Store.set('lastGolden', Date.now());
        const top = (App.forgetting ? App.forgetting() : []).filter(c => c && c.word).slice(0, 3).map(c => c.word);
        const base = tr('{n} từ đang ở thời điểm sắp quên – ôn 3 phút để nhớ lâu hơn!', { n }), reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
        const opt = { body: top.length ? `${top.join(', ')} · ${base}` : base, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'golden', data: { url: location.href.split('#')[0] + '#/review?src=forgetting' }, actions: [{ action: 'review', title: '🧠 ' + tr('Ôn tập ngay') }, { action: 'later', title: '⏱️ ' + tr('Để sau') }] };
        const gt = '⏰ ' + tr('Thời điểm vàng!'); reg ? reg.showNotification(gt, opt) : new Notification(gt, opt);
      }
    }
    // Nhắc trong app (trang đang mở nhưng ở nền): đúng giờ, 1 lần/ngày, chưa học, ngoài giờ yên lặng
    if (s.reminderOn === false || !document.hidden) return;
    const now = new Date(), cur = now.getHours() * 60 + now.getMinutes();
    const it0 = p.find(x => x.day === todayKey()); // đã học hôm nay → chỉ còn lời nhắc mục tiêu (nếu kế hoạch có)
    if (cur < pickTime(state.stats, s) || inQuiet(cur, s) || ((state.stats.days[todayKey()] || 0) > 0 && !(it0 && it0.type === 'goal'))) return;
    if (await Store.get('lastNotified', '') === todayKey()) return;
    await Store.set('lastNotified', todayKey());
    const c = await caches.open('lk-meta').catch(() => null), r = c && await c.match('/__meta'); // SW đã nhắc hôm nay (push) → thôi
    if (r) { const m = await r.json().catch(() => ({})); if (m.notified === new Date().toISOString().slice(0, 10)) return; }
    const it = p.find(x => x.day === todayKey()) || { ...generic(tr).gen, url: '#/review' };
    notify(false, it);
  }
  let started = false;
  function start() { if (started) return; started = true; tick().catch(() => {}); setInterval(() => tick().catch(() => {}), 60e3); }
  Object.assign(P, { native, notify, start, tick, build, noteStart, subscribe, unsubscribe, pushState, pushKey, softAsk, ev, touch });
})(typeof self !== 'undefined' ? self : this);
