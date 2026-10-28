/* 🧭 UX1 "Một app duy nhất" (cờ ux1, mặc định TẮT – docs/LEARNING-PATH.md, docs/UX-BENCHMARK.md §7).
 * Bật: lk.cfg.v.ux1 · thử: localStorage lk.ux1=1 · xem trước 1 phiên: #/home?ux1=1.
 * - 5 tab (Học · Ôn · Luyện · Giải đấu · Tôi) ở thanh dưới (điện thoại) và menu gọn bên trái (máy tính ≥ 1024 px: 3 cột + cột phải).
 * - Trang chủ = bản đồ chặng (lesson/ui.js gọi Ux1.map): chặng theo mục tiêu + trình độ, băng tiêu đề "Bạn sẽ…", nút kiểm tra kỹ năng thi.
 * - Lần đầu: chọn mục tiêu 1 chạm (IELTS / TOEIC / TOEFL / Giao tiếp + điểm) → settings.exam / examTarget / goalPick.
 * - #/train = Luyện: mọi tính năng cũ gom thành ô biểu tượng theo nhóm, "Luyện thi" đầu tiên. Không bỏ tính năng nào.
 * Cờ tắt: module nạp (test) nhưng không đổi gì. */
(function () {
  const App = window.App; if (!App || window.Ux1) return;
  const { state, routes } = App, view = App.view;
  const { esc } = UI, ic = n => UI.icon(n);
  const on = () => !!(App.ux1On && App.ux1On());
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } } };
  const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const cefrN = s => CEFR.indexOf(String(s || '').toUpperCase().slice(0, 2)) + 1;
  // Ảnh giáo viên trong app: MỘT nguồn (luật 1 phong cách nhân vật/ màn – đổi bộ ảnh = đổi dòng này)
  App.teacherImg = w => 'teach/' + (w === 'carlos' ? 'carlos' : 'ama') + '/poster.webp'; // bộ 2D phông xanh tách nền (nền trong suốt; Ama 358×480, Carlos 514×480)
  const keyOf = w => (window.Core && Core.keyOf ? Core.keyOf(w) : String(w || '').toLowerCase());

  // ---------- 5 tab ----------
  const TABS = () => [['learn', '#/home', 'house', t('Học')], ['review', '#/review', 'layers', t('Ôn')], ['train', '#/train', 'target', t('Luyện')], ['league', '#/league', 'trophy', t('Giải đấu')], ['me', '#/me', 'user', t('Tôi')]];
  const ME = ['me', 'goal', 'stats', 'mistakes', 'settings', 'class', 'method', 'resources', 'tracks', 'streak', 'contact'];
  const tabOf = name => (!name || ['home', 'lesson', 'path', 'day'].includes(name) ? 'learn' : name === 'review' ? 'review' : name === 'league' ? 'league' : ME.includes(name) ? 'me' : 'train');
  const SKN = () => ({ listening: t('Nghe hiểu'), reading: t('Đọc hiểu'), writing: t('Viết'), speaking: t('Nói') });
  const navOf0 = App.navOf, crumb0 = App.crumb, after0 = App.afterRoute;
  App.navOf = (name, arg) => { if (!on()) return navOf0 ? navOf0(name, arg) : [name, name]; const k = tabOf(name); return [k, k]; };
  App.crumb = (name, arg) => {
    if (!on()) return crumb0 ? crumb0(name, arg) : '';
    const k = tabOf(name); if ((k !== 'train' && k !== 'me') || name === k) return '';
    const parts = [k === 'me' ? `<a href="#/me">${t('Tôi')}</a>` : `<a href="#/train">${t('Luyện')}</a>`];
    const old = navOf0 ? navOf0(name, arg) : [];
    if (old[1] && /^skill-/.test(old[1]) && name !== 'skill') parts.push(`<a href="#/skill/${old[1].slice(6)}">${SKN()[old[1].slice(6)] || t('Kỹ năng')}</a>`);
    return `<nav class="crumb small" aria-label="${t('Đường dẫn')}">${parts.join('<span aria-hidden="true">›</span>')}</nav>`;
  };
  // Chuyển tab mượt bằng View Transitions API (0 KB, trình duyệt có sẵn); không hỗ trợ / giảm chuyển động → đổi trang thường
  let vtDone = null;
  App.afterRoute = name => { if (after0) after0(name); if (on()) rail(); if (vtDone) { vtDone(); vtDone = null; } };
  addEventListener('click', e => {
    if (!on() || !document.startViewTransition || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('#bnav a[href^="#/"], #nav a[href^="#/"]'), h = a && a.getAttribute('href');
    if (!h || h === location.hash || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault();
    try { document.startViewTransition(() => new Promise(res => { vtDone = res; location.hash = h; setTimeout(res, 450); })); } catch (x) { location.hash = h; }
  }, true); // pha bắt (capture): chạy trước bộ chặn liên kết "#/…" của index.html

  let inited = false;
  function init() {
    if (inited || !on()) return; inited = true;
    document.body.classList.add('ux1'); css();
    const tabs = TABS();
    const bn = document.getElementById('bnav');
    if (bn) { bn.setAttribute('aria-label', t('Điều hướng chính')); bn.classList.add('st-nav', ...ST.NAV_CLS.split(' ')); bn.innerHTML = ST.nav(tabs); } // thanh tab kiểu Stitch (web/js/st/common.js)
    const nav = document.getElementById('nav');
    if (nav) nav.innerHTML = tabs.map(([k, h, i, l]) => `<a href="${h}" data-route="${k}" class="nav-top"><span class="ic">${ic(i)}</span><bdi>${esc(l)}</bdi>${k === 'review' ? '<i class="badge" data-due hidden></i>' : ''}</a>`).join('');
    const shell = document.querySelector('.shell');
    if (shell && !document.getElementById('ux1Rail')) { const r = document.createElement('aside'); r.className = 'ux1-rail'; r.id = 'ux1Rail'; r.setAttribute('aria-label', t('Tiến độ hôm nay')); shell.appendChild(r); }
    if (App.updateChrome) try { App.updateChrome(); } catch (e) { /* bỏ qua */ }
  }

  // ---------- Mục tiêu (dữ liệu sẵn có: settings.goal · exam · examTarget · placement) ----------
  const PICK = { ielts: ['5.5', '6.5', '7.5'], toeic: ['600', '750', '900'], toefl: ['4', '4.5', '5.5'], general: ['A2', 'B1', 'B2'] };
  const picked = () => { const s = state.settings || {}; return !!(s.goal || s.goalPick || s.examTarget || ls.get('lk.ux1.pk')); };
  const exam = () => (App.exam ? App.exam() : 'ielts');
  const target = () => { const s = state.settings || {}; return s.examTarget || (s.goal && App.goalLabel ? App.goalLabel(s.goal) : '') || ''; };
  const level = () => { const p = (state.settings || {}).placement; if (p) { const n = cefrN(p.vCefr || p.gCefr); if (n) return n; if (p.band) return p.band >= 7 ? 5 : p.band >= 5.5 ? 4 : p.band >= 4.5 ? 3 : 2; } return 2; }; // chưa kiểm tra → A2
  // Điểm hiện tại (dự đoán) từ dữ liệu có sẵn: thi thử TOEIC · kiểm tra trình độ (band/CEFR); IELTS thi thử 4 kỹ năng đọc bất đồng bộ
  const current = ex => { const s = state.settings || {}, g = state.game || {}, p = s.placement;
    if (ex === 'toeic') { const x = (g.toeicTests || []).slice(-1)[0]; return x ? String(x.total) : ''; }
    if (ex === 'general') return p ? (p.vCefr || '') : '';
    if (ex === 'ielts' || ex === 'ieltsgt') return p && p.band ? String(p.band) : '';
    return ''; };
  const pctOf = (ex, cur, tg) => { const c = ex === 'general' ? cefrN(cur) : +cur, g = ex === 'general' ? cefrN(tg) : +tg; if (!c || !g) return null; const lo = ex === 'toeic' ? 10 : ex === 'general' ? 0 : ex === 'toefl' ? 1 : 3; return Math.max(4, Math.min(100, Math.round((c - lo) / Math.max(.1, g - lo) * 100))); };
  const MOCK = { ielts: '#/mock', ieltsgt: '#/mock', toeic: '#/toeic', toefl: '#/toefl', general: '#/placement' };
  function examCard(cls) {
    const ex = exam(), X = (App.EXAMS || {})[ex] || { short: 'IELTS', ic: 'graduation-cap' }, tg = target(), cur = current(ex), p = pctOf(ex, cur, tg);
    const g = (state.settings || {}).goal, left = g && g.date ? Math.ceil((new Date(g.date) - Date.now()) / 864e5) : 0;
    const C = 2 * Math.PI * 20, ring = p != null ? `<svg class="ux1-ring" viewBox="0 0 48 48" role="img" aria-label="${p}%"><circle cx="24" cy="24" r="20"/><circle cx="24" cy="24" r="20" class="fg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - p / 100)}"/></svg>` : `<span class="ux1-ring ic">${ic(X.ic)}</span>`;
    const sub = [cur ? t('Dự đoán ~{s}', { s: cur }) : t('Chưa có điểm dự đoán'), left > 0 ? t('còn {n} ngày', { n: left }) : ''].filter(Boolean).join(' · ');
    return `<section class="card ux1-exam ${cls || ''}" data-ux1-exam>${ring}<a class="ux1-exam-tx" href="#/goal"><b>${esc(X.short)}${tg ? ' · ' + esc(tg) : ''}</b><small>${esc(sub)}</small></a><a class="btn sm ux1-mock" href="${MOCK[ex] || '#/tests'}">${ic('flag')} ${t('Thi thử')}</a></section>`;
  }
  // IELTS: điểm thi thử 4 kỹ năng mới nhất (kho mocks) thay cho ước tính trình độ
  const fillMock = root => { const ex = exam(); if ((ex !== 'ielts' && ex !== 'ieltsgt') || !window.Core || !Core.Store) return; Core.Store.get('mocks', []).then(m => { const x = (m || [])[0]; if (!x || x.overall == null) return; root.querySelectorAll('[data-ux1-exam] small').forEach(s => { s.textContent = s.textContent.replace(/^[^·]*/, t('Dự đoán ~{s}', { s: x.overall }) + ' '); }); }).catch(() => {}); };

  // Chọn mục tiêu 1 chạm: chạm thẻ = kỳ thi + điểm phổ biến; chạm điểm = kỳ thi + điểm đó → vào bản đồ
  function pick() {
    const ex = (App.EXAMS || {}), D = { ielts: t('Du học, định cư – 4 kỹ năng, band 0–9'), toeic: t('Công sở – Nghe & Đọc, 10–990 điểm'), toefl: t('Du học Mỹ – bản 2026, band 1–6'), general: t('Giao tiếp & nền tảng, chưa thi chứng chỉ') };
    const name = k => (k === 'general' ? t('Giao tiếp') : (ex[k] || {}).short || k);
    view.innerHTML = `<div class="ux1-pick"><h1>${t('Bạn học để làm gì?')}</h1><p class="muted">${t('Chọn 1 mục tiêu, đổi lúc nào cũng được.')}</p>
      <div class="ux1-pk-grid">${Object.keys(PICK).map(k => `<div class="card ux1-pk"><button type="button" class="ux1-pk-main" data-pk="${k}" data-tg="${PICK[k][1]}"><span class="ux1-pk-ic" aria-hidden="true">${ic((ex[k] || {}).ic || 'sprout')}</span><span><b>${esc(name(k))}</b><small>${esc(D[k])}</small></span></button>
        <div class="ux1-pk-tg" role="group" aria-label="${t('Điểm mục tiêu')} ${esc(name(k))}">${PICK[k].map(v => `<button type="button" class="chip" data-pk="${k}" data-tg="${v}">${esc(v)}</button>`).join('')}</div></div>`).join('')}</div>
      <p class="center"><a class="small" href="#/placement">${ic('compass')} ${t('Kiểm tra trình độ (5 phút)')}</a></p></div>`;
    view.querySelectorAll('[data-pk]').forEach(b => { b.onclick = () => choose(b.dataset.pk, b.dataset.tg); });
  }
  async function choose(ex, tg) {
    const s = state.settings; s.exam = ex; s.examTarget = tg; s.goalPick = { exam: ex, target: ex === 'general' ? cefrN(tg) : +tg, at: Date.now() }; ls.set('lk.ux1.pk', ex);
    try { await App.saveSettings(); } catch (e) { /* vẫn vào bản đồ */ }
    if (window.Sync && Sync.schedule) Sync.schedule(); if (App.updateExamChip) App.updateExamChip();
    if (!/[?&]pick=1\b/.test(location.hash) && (/^#\/(home)?(\?|$)/.test(location.hash) || !location.hash)) App.route(); else location.hash = '#/home';
  }

  // ---------- Chặng: chủ đề theo mục tiêu + trình độ (docs/LEARNING-PATH.md §2) ----------
  const ORDER = {
    ielts: ['education', 'environment', 'technology', 'health', 'society', 'media', 'urban', 'crime', 'work', 'travel'],
    ieltsgt: ['work', 'travel', 'health', 'education', 'urban', 'media', 'technology', 'environment', 'society', 'crime'],
    toeic: ['work', 'travel', 'technology', 'media', 'health', 'urban', 'environment', 'education', 'society', 'crime'],
    toefl: ['education', 'technology', 'environment', 'health', 'society', 'media', 'urban', 'work', 'travel', 'crime'],
    general: ['travel', 'health', 'work', 'media', 'technology', 'education', 'environment', 'urban', 'society', 'crime'],
  };
  const CAN = () => ({ start: t('Bạn sẽ chào hỏi và kể về một ngày của mình'), education: t('Bạn sẽ nói về việc học và trường lớp'), environment: t('Bạn sẽ nêu nguyên nhân và giải pháp cho môi trường'), technology: t('Bạn sẽ nêu ưu và nhược điểm của công nghệ'), health: t('Bạn sẽ đưa lời khuyên về sức khỏe'), work: t('Bạn sẽ nói về công việc của mình'), society: t('Bạn sẽ so sánh và bảo vệ quan điểm'), media: t('Bạn sẽ bàn về tin tức và mạng xã hội'), urban: t('Bạn sẽ mô tả thành phố và đề xuất thay đổi'), travel: t('Bạn sẽ kể về chuyến đi và đặt dịch vụ'), crime: t('Bạn sẽ bàn về luật lệ và an toàn') });
  const COLORS = ['primary', 'accent', 'good', 'gold', 'again']; // màu chặng = cặp token sẵn có (nền + chữ đạt AA cả sáng/tối) → đổi bảng màu chỉ cần đổi token
  const topics = () => (window.IELTS_DATA && IELTS_DATA.TOPICS) || [];
  function units(ex, lvl) {
    const T = topics(), ids = ORDER[ex] || ORDER.ielts;
    const list = ids.map(id => T.find(x => x.id === id)).filter(Boolean).map(x => ({ id: x.id, name: x.name, emoji: x.emoji, words: x.words || [] }));
    return (lvl < 3 ? [{ id: 'start', name: t('Tiếng Anh hằng ngày'), emoji: '👋', words: [] }] : []).concat(list); // ≥ B1 (đã kiểm tra trình độ) → bỏ chặng khởi động
  }
  const unitAt = (n, len) => { const U = units(exam(), level()), u = Math.floor(n / (len || 6)); return Object.assign({ no: u + 1, color: COLORS[u % COLORS.length] }, U[u % U.length]); };
  // Từ chủ đề vừa sức (i+1): cấp ≤ trình độ + 1, chưa có trong sổ; xoay theo nút để mỗi bài khác nhau
  function words(n, len) {
    const u = unitAt(n, len), lv = level(), cards = state.cards || {};
    if (!u.words.length) return [];
    let ws = u.words.filter(w => (cefrN(w.level) || 3) <= lv + 1 && !cards[keyOf(w.word)]);
    if (ws.length < 4) ws = u.words.filter(w => !cards[keyOf(w.word)]).sort((a, b) => cefrN(a.level) - cefrN(b.level));
    const at = (n % (len || 6)) * 4 % Math.max(1, ws.length);
    return ws.slice(at).concat(ws.slice(0, at)).slice(0, 4);
  }
  // Nút kiểm tra kỹ năng thi cuối chặng → module thi có sẵn, xoay vòng theo chặng
  const CHECK = {
    ielts: [['IELTS Listening', '#/listening', 'headphones'], ['IELTS Reading', '#/rtype', 'newspaper'], ['IELTS Speaking', '#/speaking/p1', 'mic'], ['IELTS Writing', '#/task1', 'pen-line']],
    ieltsgt: [['IELTS Listening', '#/listening', 'headphones'], ['IELTS Reading', '#/rtype', 'newspaper'], ['IELTS Speaking', '#/speaking/p1', 'mic'], ['IELTS Writing', '#/letters', 'mail']],
    toeic: [['TOEIC Listening', '#/toeic', 'headphones'], ['TOEIC Reading', '#/toeic', 'newspaper']],
    toefl: [['TOEFL Listening', '#/toefl-p/response', 'headphones'], ['TOEFL Reading', '#/toefl-p/daily', 'newspaper'], ['TOEFL Writing', '#/toefl-p/email', 'pen-line'], ['TOEFL Speaking', '#/toefl-p/repeat', 'mic']],
    general: [[() => t('Ngữ pháp'), '#/grammar/mix?n=10', 'ruler'], [() => t('Nghe hiểu'), '#/listening', 'headphones']],
  };
  const check = n => { const L = CHECK[exam()] || CHECK.ielts, c = L[Math.floor(n / 6) % L.length]; return { name: typeof c[0] === 'function' ? c[0]() : c[0], href: c[1], icon: c[2] }; };
  const acc = () => { const v = ls.get('lk.lsn.acc'); return v == null || v === '' ? null : +v; };
  // Kế hoạch chặng (LessonEngine.unitPlan) + nút hiện tại thích nghi theo bài trước
  function plan(E, cards, has, n) {
    const now = Date.now(), p = E.unitPlan(cards, now, Object.assign({ exam: true, odd: Math.floor(n / 6) % 2 === 1 }, has));
    const at = n % p.length, due = cards.filter(c => c && c.srs && E.isDue(c, now)).length;
    p[at] = { kind: E.nextKind(p[at].kind, { acc: acc(), due }) };
    return p;
  }

  // ---------- Bản đồ (gọi từ lesson/ui.js) ----------
  const KNAME = k => ({ lesson: t('Bài học'), listen: t('Nghe'), speak: t('Nói'), review: t('Ôn lỗi'), story: t('Truyện'), radio: 'Radio' }[k] || k);
  const KICON = { lesson: 'star', listen: 'headphones', speak: 'mic', review: 'repeat', story: 'book-open', radio: 'audio-lines' };
  const KMIN = { lesson: 4, listen: 3, speak: 3, review: 3, story: 4, radio: 3, exam: 5 }; // phút ước tính mỗi loại bài (nhãn "· 4 phút")
  const stars = () => { try { return JSON.parse(ls.get('lk.ux1.st') || '{}'); } catch (e) { return {}; } }; // sao thật mỗi nút đã học (lesson/ui.js ghi khi xong bài)
  function map(o) {
    const { demo, plan: P, n } = o;
    if (!demo && !picked() && !/[?&]all=1\b/.test(location.hash)) return pick();
    if (/[?&]pick=1\b/.test(location.hash)) return pick();
    const at = n % P.length, u = unitAt(n, P.length), Q = demo ? '?demo=1' : '', who = ls.get('lk.lsn.who') === 'ama' ? 'carlos' : 'ama';
    const have = u.words.length ? u.words.filter(w => (state.cards || {})[keyOf(w.word)]).length : 0, ST_ = demo ? {} : stars();
    const cpAt = P.findIndex((p, i) => i >= at && p.kind === 'exam'), xpTo = cpAt >= 0 ? (cpAt - at + 1) * 20 : 0, X = (App.EXAMS || {})[exam()] || { short: 'IELTS' };
    const nxMin = KMIN[(P[at] || {}).kind] || 4;
    // 🎨 Màn Học = mẫu Stitch "IELTS Learning Path" (web/js/st/home.js · css/st-home.css nạp cùng gói ux1)
    const nodes = P.map((p, i) => {
      const st = i < at ? 'done' : i === at ? 'next' : 'lock', cp = p.kind === 'exam' ? check(n) : null, k = ST_[n - at + i];
      const label = cp ? cp.name : KNAME(p.kind);
      return { st, no: i + 1, label, cp: !!cp && st === 'lock', ms: t('Mốc'), stars: st === 'done' ? k || 0 : 0, href: `#/lesson/go${Q}`, start: t('Bắt đầu'), sub: [cp ? t('Kiểm tra nhanh') : '', t('{n} phút', { n: KMIN[p.kind] || 4 })].filter(Boolean).join(' • '), tch: st === 'next' ? ST.tImg(who) : '', icon: cp ? ({ headphones: 'headphones', newspaper: 'menu_book', mic: 'mic', 'pen-line': 'edit', mail: 'edit', ruler: 'menu_book', phone: 'call' }[cp.icon] || 'emoji_events') : ({ lesson: 'star', listen: 'headphones', speak: 'mic', review: 'replay', story: 'auto_stories', radio: 'radio', call: 'call', write: 'edit' }[p.kind] || 'star') };
    });
    const ex = exam(), Xe = (App.EXAMS || {})[ex] || { short: 'IELTS', ic: 'graduation-cap' }, tg = target(), cur = current(ex), pc = pctOf(ex, cur, tg), g = (state.settings || {}).goal, left = g && g.date ? Math.ceil((new Date(g.date) - Date.now()) / 864e5) : 0, C = 2 * Math.PI * 20;
    const examH = ST.exam({ cls: 'ux1-exam-top', p: pc, C, off: pc != null ? C * (1 - pc / 100) : 0, icon: { briefcase: 'work', landmark: 'account_balance', 'message-circle': 'forum' }[Xe.ic] || 'school', title: Xe.short + (tg ? ' · ' + tg : ''), sub: [cur ? t('Dự đoán ~{s}', { s: cur }) : t('Chưa có điểm dự đoán'), left > 0 ? t('còn {n} ngày', { n: left }) : ''].filter(Boolean).join(' · '), href: MOCK[ex] || '#/tests', mock: t('Thi thử') });
    const coach = who === 'ama' ? 'Carlos' : 'Ama', placed = !!(state.settings || {}).placement;
    const chips = [u.words.length ? { icon: 'local_library', text: `${have}/${u.words.length}`, title: t('Kiến thức đã có') } : null, placed ? null : { href: '#/placement', icon: 'explore', text: t('Kiểm tra trình độ') }].filter(Boolean);
    document.body.classList.add('st');
    view.innerHTML = ST.home({ demoNote: demo ? t('Bài thử (không lưu tiến độ)') : '', exam: examH, ucls: 'u-' + u.color, badge: t('Chặng học {n}', { n: u.no }), meta: X.short + ' · ' + (u.id === 'start' ? 'A1–A2' : CEFR[Math.max(2, Math.min(4, level()))]), title: u.name, img: ST.tImg(coach.toLowerCase()),
      step: t('Bước {a}/{b}', { a: Math.min(at + 1, P.length), b: P.length }), xpTo: xpTo ? t('+{x} XP tới mốc kiểm tra', { x: xpTo }) : '', pct: Math.round(at / P.length * 100), aria: { now: at, max: P.length }, coach: { name: coach, tip: CAN()[u.id] || '' }, chips, nodes,
      cta: { href: `#/lesson/go${Q}`, text: t('Tiếp tục') } }); // mẫu v2: chỉ "Tiếp tục" (chặng + phút đã có ở băng chặng/nút hiện tại, cho trình đọc màn hình)
    App.onCleanup && App.onCleanup(() => document.body.classList.remove('st'));
    fillMock(view);
    const ol = view.querySelector('.ux1-path');
    requestAnimationFrame(() => { if (ol.isConnected) ST.trail(ol, at); });
    const nx = view.querySelector('.ux1-n.next'); if (nx && nx.getBoundingClientRect().bottom > innerHeight - 160) try { nx.scrollIntoView({ block: 'center' }); } catch (e) { /* bỏ qua */ }
  }

  // ---------- Cột phải (máy tính ≥ 1024 px) ----------
  function rail() {
    const r = document.getElementById('ux1Rail'); if (!r) return;
    if (document.body.classList.contains('focus') || !matchMedia('(min-width: 1024px)').matches) { r.innerHTML = ''; return; }
    const g = state.game || {}, k = window.Core && Core.todayKey ? Core.todayKey() : '', rv = ((state.stats || {}).days || {})[k] || 0, goal = (state.settings || {}).dailyGoal || 20, p = Math.min(100, Math.round(rv / goal * 100));
    r.innerHTML = `<div class="ux1-stat"><span>${ic('flame')} <b>${App.streak ? App.streak() : 0}</b></span><span>${ic('star')} <b>${(g.xp || 0).toLocaleString(I18N.lang())}</b></span></div>${examCard('')}
      <a class="card ux1-today" href="#/review"><b>${ic('goal')} ${t('Tiến độ hôm nay')}</b><span class="progress"><i style="width:${p}%"></i></span><small>${t('Ôn {a}/{b} thẻ', { a: Math.min(rv, goal), b: goal })}</small></a>
      <div id="ux1League"></div>
      <section class="card ux1-promo"><a class="btn sm" data-get-app="rail" hidden href="#/me">${ic('smartphone')} ${t('Tải app')}</a><a class="btn sm" data-ext-cta="rail" hidden href="#/me">${ic('puzzle')} ${t('Thêm vào Chrome')}</a></section>`;
    fillMock(r);
    App.need('league').then(() => { const el = document.getElementById('ux1League'); if (el && window.League && League.renderHomeCard) League.renderHomeCard(el); }).catch(() => {});
    if (App.getApp) App.getApp(r).then(() => { if (window.LKExt) LKExt.scan(r); }).catch(() => {});
  }

  // ---------- Luyện: mọi tính năng, nhóm gọn, "Luyện thi" đầu tiên ----------
  const GROUPS = () => [
    [t('Luyện thi'), 'big', [['#/mock', 'graduation-cap', 'IELTS', t('Thi thử IELTS 4 kỹ năng')], ['#/toeic', 'briefcase', 'TOEIC', t('Listening & Reading, quy đổi điểm 10–990')], ['#/toefl', 'landmark', 'TOEFL', t('Luyện theo phần TOEFL iBT')],
      ['#/tests', 'flag', t('Thi thử'), t('Lịch sử điểm')], ['#/toeic', 'clipboard-list', t('TOEIC Part 5–7'), ''], ['#/placement', 'compass', t('Kiểm tra trình độ (5 phút)'), 'CEFR'], ['#/criteria', 'chart-column', t('Tiêu chí chấm band 4–9'), 'IELTS Writing · Speaking']]],
    [t('Từ vựng'), '', [['#/path', 'map', t('Lộ trình từ vựng')], ['#/library', 'library', t('Thư viện từ')], ['#/deck', 'notebook-pen', t('Sổ từ của tôi')], ['#/practice', 'zap', t('Trò chơi từ vựng')], ['#/quick', 'timer', t('Chơi nhanh 15 giây')], ['#/phrases', 'puzzle', t('Cụm từ & cấu trúc')], ['#/dict', 'search', t('Từ điển')], ['#/verb', 'a-large-small', t('Chia động từ')], ['#/usage', 'book-a', t('Cách dùng từ')], ['#/vocab', 'layout-grid', t('Tổng quan')]]],
    [t('Kỹ năng'), '', [['#/skill/listening', 'headphones', t('Nghe hiểu')], ['#/skill/reading', 'newspaper', t('Đọc hiểu')], ['#/skill/writing', 'pen-line', t('Viết')], ['#/skill/speaking', 'mic', t('Nói')], ['#/grammar', 'ruler', t('Ngữ pháp')], ['#/pron', 'audio-lines', t('Phát âm')], ['#/confidence', 'message-circle', t('Giao tiếp tự tin')], ['#/courses', 'school', t('Khóa học theo lộ trình')], ['#/roleplay', 'users', t('Roleplay công sở')], ['#/call', 'phone', t('Gọi cho Mia')], ['#/fix', 'pencil', t('Sửa ngữ pháp')], ['#/skills', 'layout-grid', t('Tổng quan')]]],
    [t('Thêm'), '', [['#/home?all=1', 'calendar', t('Kế hoạch hôm nay')], ['#/handsfree', 'headphones', t('Học rảnh tay')], ['#/reflex', 'brain', t('Phản xạ 60 giây')], ['#/lesson', 'sparkles', t('Bài học trộn')], ['#/tracks', 'compass', t('Gói học')], ['#/class', 'school', t('Lớp học')], ['#/resources', 'globe', t('Tài nguyên miễn phí')], ['#/method', 'flask-conical', t('Cách Lexkite giúp bạn nhớ lâu')]]],
  ];
  routes.train = function () {
    css();
    view.innerHTML = `<div class="page-head"><div><h1>${ic('target')} ${t('Luyện')}</h1><p class="muted">${t('Mọi bài luyện ở một chỗ.')}</p></div></div>`
      + GROUPS().map(([h, big, items]) => `<h2 class="set-h ux1-gh">${esc(h)}</h2><div class="ux1-tiles${big ? ' big' : ''}">${items.map(([href, i, n, d]) => `<a class="ux1-tile" href="${href}"><span class="ux1-ti" aria-hidden="true">${ic(i)}</span><b>${esc(n)}</b>${big && d ? `<small>${esc(d)}</small>` : ''}</a>`).join('')}</div>`).join('');
  };

  // ---------- CSS (chỉ khi cờ bật) ----------
  function css() {
    if (document.getElementById('ux1Css')) return;
    const s = document.createElement('style'); s.id = 'ux1Css';
    s.textContent = `
body.ux1 .side-level{display:none}
body.ux1 #nav{display:flex;flex-direction:column;gap:.2rem}
body.ux1 #nav a{display:flex;align-items:center;gap:.7rem;min-height:48px;padding:.5rem .8rem;border-radius:var(--r-md);font-weight:800;text-transform:uppercase;letter-spacing:.04em;font-size:.85rem;color:var(--muted);border:2px solid transparent}
body.ux1 #nav a.active{color:var(--primary-text);background:var(--primary-soft);border-color:var(--primary)}
body.ux1 #nav a .ic svg{width:26px;height:26px}
.ux1-exam{display:flex;align-items:center;gap:.7rem;padding:.6rem .8rem;margin:0}
.ux1-exam-tx{flex:1;min-width:0;display:flex;flex-direction:column;color:var(--text);text-decoration:none;min-height:44px;justify-content:center}
.ux1-exam-tx small{color:var(--muted);font-size:var(--fs-xs)}
.ux1-ring{width:44px;height:44px;flex:none;transform:rotate(-90deg)}.ux1-ring.ic{transform:none;display:grid;place-items:center;border-radius:50%;background:var(--accent-soft);color:var(--accent-text)}
.ux1-ring circle{fill:none;stroke:var(--surface-3);stroke-width:5}.ux1-ring .fg{stroke:var(--done);stroke-linecap:round}
.ux1-mock{min-height:44px;flex:none}
.ux1-pick{max-width:720px;margin:0 auto;text-align:center}.ux1-pick h1{margin-bottom:.2rem}
.ux1-pk-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem;margin:1rem 0;text-align:start}
.ux1-pk{padding:0;overflow:hidden;display:flex;flex-direction:column}
.ux1-pk-main{display:flex;gap:.7rem;align-items:center;padding:.9rem;background:none;border:0;color:var(--text);font:inherit;text-align:start;cursor:pointer;min-height:76px}
.ux1-pk-main:hover{background:var(--surface-2)}.ux1-pk-main small{display:block;color:var(--muted);font-size:var(--fs-xs)}.ux1-pk-main b{font-size:var(--fs-md)}
.ux1-pk-ic{width:44px;height:44px;flex:none;border-radius:var(--r-md);display:grid;place-items:center;background:var(--primary-soft);color:var(--primary-text)}
.ux1-pk-tg{display:flex;gap:.4rem;padding:0 .9rem .9rem;flex-wrap:wrap}.ux1-pk-tg .chip{min-height:44px;min-width:56px;justify-content:center;cursor:pointer;font:inherit;font-weight:700}
.ux1-gh{margin-top:1.3rem}
.ux1-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:.6rem}
.ux1-tiles.big{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
.ux1-tile{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:.4rem;padding:.8rem .5rem;min-height:96px;border-radius:var(--r-lg);background:var(--surface);border:1px solid var(--line);color:var(--text);text-decoration:none;text-align:center;font-size:var(--fs-sm);box-shadow:0 3px 0 var(--line)}
.ux1-tile:hover{border-color:var(--primary)}.ux1-tile b{font-weight:700;line-height:1.25}.ux1-tile small{color:var(--muted);font-size:var(--fs-xs);line-height:1.3}
.ux1-ti{width:44px;height:44px;border-radius:var(--r-md);display:grid;place-items:center;background:var(--accent-soft);color:var(--accent-text)}
.ux1-tiles.big .ux1-tile{min-height:128px}.ux1-tiles.big .ux1-ti{background:var(--primary-soft);color:var(--primary-text);width:52px;height:52px}
.ux1-tiles.big .ux1-tile b{font-size:var(--fs-md)}
.ux1-rail{display:none}
@media (min-width:1024px){
  body.ux1 .shell{grid-template-columns:232px minmax(0,1fr) 340px}
  body.ux1:not(.focus):not(.bare) .ux1-rail{display:flex;flex-direction:column;gap:.8rem;position:sticky;top:0;height:100vh;overflow-y:auto;padding:1.2rem 1.2rem 1.2rem .4rem}
  body.ux1.focus .shell,body.ux1.bare .shell{grid-template-columns:minmax(0,1fr)}
  body.ux1 .ux1-exam-top{display:none}
}
.ux1-stat{display:flex;gap:1rem;justify-content:space-around;font-size:var(--fs-md);padding:.3rem 0}.ux1-stat span{display:inline-flex;gap:.35rem;align-items:center}
.ux1-stat span:first-child{color:var(--primary-text)}.ux1-stat span:last-child{color:var(--gold-text)}
.ux1-today{display:flex;flex-direction:column;gap:.45rem;color:var(--text);text-decoration:none}.ux1-today small{color:var(--muted)}
.ux1-promo{display:flex;gap:.5rem;flex-wrap:wrap}.ux1-promo:not(:has(a:not([hidden]))){display:none}.ux1-promo .btn{min-height:44px}
@media (max-width:420px){.ux1-pk-grid{grid-template-columns:minmax(0,1fr)}}
@media (max-width:900px){.ux1-cta{bottom:calc(4.4rem + env(safe-area-inset-bottom,0px))!important}}
/* chuyển động: chỉ transform/opacity (60 fps), View Transitions cho đổi tab, @starting-style cho thẻ cột phải */
.ux1-exam,.ux1-tile{transition:transform .15s ease,box-shadow .15s ease}.ux1-tile:active,.ux1-pk-main:active{transform:translateY(2px)}
.ux1-rail>*{transition:opacity .18s ease}@starting-style{.ux1-rail>*{opacity:0}}
body.ux1 .bottom-nav{view-transition-name:ux1nav}body.ux1 .sidebar{view-transition-name:ux1side}
::view-transition-old(root),::view-transition-new(root){animation-duration:.18s}
@media (prefers-reduced-motion:reduce){.ux1-rail>*{transition:none}.ux1-tile:active,.ux1-pk-main:active{transform:none}}`;
    document.head.appendChild(s);
  }

  window.Ux1 = { init, map, plan, words, units, unitAt, check, pick, choose, picked, rail, tabOf, level }; // init() do App.route gọi sau khi gói + bản dịch ngôn ngữ đã nạp xong (nhãn tab không bị kẹt tiếng Anh)
})();
