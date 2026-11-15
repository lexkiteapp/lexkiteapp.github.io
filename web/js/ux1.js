/* 🧭 UX1 "Một app duy nhất" (cờ ux1, mặc định TẮT – docs/LEARNING-PATH.md, docs/UX-BENCHMARK.md §7).
 * Bật: lk.cfg.v.ux1 · thử: localStorage lk.ux1=1 · xem trước 1 phiên: #/home?ux1=1.
 * - 5 tab §5d (Hôm nay · Từ vựng · Kỹ năng · Thi · Tôi; Giải đấu ở Hôm nay) ở thanh dưới (điện thoại) và menu gọn bên trái (máy tính ≥ 1024 px: 3 cột + cột phải).
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
  const TABS = () => [['home', '#/home', 'house', t('Hôm nay')], ['vocab', '#/vocab', 'book-open', t('Từ vựng')], ['skills', '#/skills', 'target', t('Kỹ năng')], ['tests', '#/tests', 'flag', t('Thi')], ['me', '#/me', 'user', t('Tôi')]];
  const ME = ['me', 'goal', 'stats', 'mistakes', 'settings', 'class', 'method', 'resources', 'tracks', 'streak', 'contact', 'outcome'];
  const tabOf = (name, arg) => { if (!name || ['home', 'lesson', 'path', 'day', 'league'].includes(name)) return 'home'; if (ME.includes(name)) return 'me'; const o = (navOf0 ? navOf0(name, arg) : [])[0]; return o === 'vocab' || o === 'tests' ? o : 'skills'; }; // còn lại (#/train, #/say, #/call…) thuộc Kỹ năng
  const SKN = () => ({ listening: t('Nghe hiểu'), reading: t('Đọc hiểu'), writing: t('Viết'), speaking: t('Nói') });
  const navOf0 = App.navOf, crumb0 = App.crumb, after0 = App.afterRoute;
  App.navOf = (name, arg) => { if (!on()) return navOf0 ? navOf0(name, arg) : [name, name]; const k = tabOf(name, arg); return [k, k]; };
  App.crumb = (name, arg) => {
    if (!on()) return crumb0 ? crumb0(name, arg) : '';
    const k = tabOf(name, arg); if (k === 'home' || name === k) return '';
    const parts = [`<a href="#/${k}">${{ me: t('Tôi'), vocab: t('Từ vựng'), tests: t('Thi') }[k] || t('Kỹ năng')}</a>`];
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
    if (nav) nav.innerHTML = tabs.map(([k, h, i, l]) => `<a href="${h}" data-route="${k}" class="nav-top"><span class="ic">${ic(i)}</span><bdi>${esc(l)}</bdi>${k === 'vocab' ? '<i class="badge" data-due hidden></i>' : ''}</a>`).join('');
    const shell = document.querySelector('.shell');
    if (shell && !document.getElementById('ux1Rail')) { const r = document.createElement('aside'); r.className = 'ux1-rail'; r.id = 'ux1Rail'; r.setAttribute('aria-label', t('Tiến độ hôm nay')); shell.appendChild(r); }
    if (App.updateChrome) try { App.updateChrome(); } catch (e) { /* bỏ qua */ }
  }

  // ---------- Mục tiêu (dữ liệu sẵn có: settings.goal · exam · examTarget · placement) ----------
  const PICK = { ielts: ['5.5', '6.5', '7.5'], toeic: ['600', '750', '900'], toefl: ['4', '4.5', '5.5'], general: ['A2', 'B1', 'B2'] };
  const picked = () => { const s = state.settings || {}; return !!(s.goal || s.goalPick || s.examTarget || ls.get('lk.ux1.pk')); };
  const exam = () => (App.exam ? App.exam() : 'ielts');
  const target = () => { const s = state.settings || {}; if (App.fixExamTarget) App.fixExamTarget(s); return s.examTarget || (s.goal && App.goalLabel ? App.goalLabel(s.goal) : '') || ''; };
  // tracks.js tải lười: cấp thấp nhất mỗi gói (test home-logic đối chiếu)
  const TRACK_LO = { comm: 1, toeic: 2, toefl: 3, work: 2 };
  const selfLevel = c => { const sid = c && c.lv && c.lv[c.cur] && c.lv[c.cur].s, m = /^([a-z]+)(\d)$/.exec(sid || ''); return m && TRACK_LO[m[1]] ? TRACK_LO[m[1]] + (+m[2] - 1) : 0; };
  const level = () => { const p = (state.settings || {}).placement; if (p) { const n = cefrN(p.vCefr || p.gCefr); if (n) return n; if (p.band) return p.band >= 7 ? 5 : p.band >= 5.5 ? 4 : p.band >= 4.5 ? 3 : 2; } return selfLevel((state.settings || {}).tracks) || 2; }; // chưa kiểm tra → tự chọn lúc thiết lập, không có → A2
  // Điểm hiện tại (dự đoán) từ dữ liệu có sẵn: thi thử TOEIC · kiểm tra trình độ (band/CEFR); IELTS thi thử 4 kỹ năng đọc bất đồng bộ
  const current = ex => { const s = state.settings || {}, g = state.game || {}, p = s.placement;
    if (ex === 'toeic') { const x = (g.toeicTests || []).slice(-1)[0]; return x ? String(x.total) : ''; }
    if (ex === 'general') return p ? (p.vCefr || '') : '';
    if (ex === 'ielts' || ex === 'ieltsgt') return p && p.band ? String(p.band) : '';
    return ''; };
  const pctOf = (ex, cur, tg) => { const c = ex === 'general' ? cefrN(cur) : parseFloat(cur), g = ex === 'general' ? cefrN(tg) : parseFloat(tg); if (!c || !g) return null; const lo = ex === 'toeic' ? 10 : ex === 'general' ? 0 : ex === 'toefl' ? 1 : 3; return Math.max(4, Math.min(100, Math.round((c - lo) / Math.max(.1, g - lo) * 100))); };
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
  // 🧭 Chọn kỳ thi mà chưa rõ trình độ → mời kiểm tra đầu vào 5 phút trước bài đầu; không ép (Bỏ qua nhớ theo settings.plSkip, đồng bộ).
  const needLevel = () => { const s = state.settings || {}; return on() && picked() && exam() !== 'general' && !s.placement && !s.plSkip && !Object.keys((s.tracks || {}).lv || {}).length; };
  function levelInvite(then) {
    const box = UI.modal(`<h2 style="margin-top:0">${ic('compass')} ${t('Biết trình độ để xếp lộ trình đúng sức')}</h2><p class="muted">${t('Bài kiểm tra ngắn giúp bạn bắt đầu đúng chặng. Không bắt buộc, làm sau cũng được.')}</p><div class="row center"><a class="btn primary" id="lvlGo" href="#/placement">${t('Kiểm tra trình độ (5 phút)')}</a><button type="button" class="btn" id="lvlSkip">${t('Bỏ qua')}</button></div>`);
    box.querySelector('#lvlGo').onclick = () => UI.closeModal();
    box.querySelector('#lvlSkip').onclick = async () => { state.settings.plSkip = Date.now(); UI.closeModal(); try { await App.saveSettings(); } catch (e) { /* vẫn đi tiếp */ } if (window.Sync && Sync.schedule) Sync.schedule(); if (then) then(); };
  }
  async function choose(ex, tg) {
    const s = state.settings; s.exam = ex; s.examTarget = tg; s.goalPick = { exam: ex, target: ex === 'general' ? cefrN(tg) : +tg, at: Date.now() }; ls.set('lk.ux1.pk', ex);
    try { await App.saveSettings(); } catch (e) { /* vẫn vào bản đồ */ }
    if (window.Sync && Sync.schedule) Sync.schedule(); if (App.updateExamChip) App.updateExamChip();
    if (!/[?&]pick=1\b/.test(location.hash) && (/^#\/(home)?(\?|$)/.test(location.hash) || !location.hash)) App.route(); else location.hash = '#/home';
    if (needLevel()) levelInvite(() => { if (/^#\/(home)?(\?|$)/.test(location.hash) || !location.hash) App.route(); });
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
  function words(n, len, kind) {
    const fx = self.PathTrail && PathTrail.wordsOf(n, unitAt, kind); if (fx) return fx;
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
  const KNAME = k => ({ lesson: t('Bài học'), listen: t('Nghe'), speak: t('Nói'), review: Object.values(state.cards || {}).some(c => c && c.srs && c.srs.lapses > 0) ? t('Ôn lỗi') : t('Ôn tập'), story: t('Truyện'), radio: 'Radio' }[k] || k);
  const KICON = { lesson: 'star', listen: 'headphones', speak: 'mic', review: 'repeat', story: 'book-open', radio: 'audio-lines' };
  const KDESC = { story: 'Đọc một đoạn hội thoại ngắn rồi trả lời câu hỏi.', radio: 'Nghe một đoạn radio ngắn rồi trả lời câu hỏi.', exam: 'Luyện một kỹ năng thi để qua mốc kiểm tra.' }; // dòng mô tả thẻ bài Hôm nay khi bài không có danh sách từ (khóa t() gọi lúc vẽ)
  const KMIN = { lesson: 4, listen: 3, speak: 3, review: 3, story: 4, radio: 3, exam: 5 }; // phút ước tính mỗi loại bài (nhãn "· 4 phút")
  const stars = () => { try { return JSON.parse(ls.get('lk.ux1.st') || '{}'); } catch (e) { return {}; } }; // sao thật mỗi nút đã học (lesson/ui.js ghi khi xong bài)
  function map(o) {
    const { demo, plan: P, n } = o;
    // W7b: đang học ngôn ngữ đích ≠ en → "Hôm nay" = lộ trình ngày của chính ngôn ngữ đó (không vẽ lộ trình IELTS/TOEIC tiếng Anh); ?en=1 = xem bản tiếng Anh
    const tlHome = !demo && window.Target && Target.cur() !== 'en' && !/[?&]en=1\b/.test(location.hash) ? Target.homeOf(Target.cur()) : '';
    if (tlHome) { location.replace(tlHome); return; }
    const fresh = !demo && n === 0 && !((state.game || {}).xp > 0) && !!(self.ST2 && ST2['today-new'] && ST2.path); // người mới (chưa xong bài nào, 0 XP) → Hôm nay v2 trống: bước 1 = chọn mục tiêu (pick)
    if (!demo && !picked() && !fresh && !/[?&]all=1\b/.test(location.hash)) return pick();
    if (/[?&]pick=1\b/.test(location.hash)) return pick();
    const at = n % P.length, u = unitAt(n, P.length), Q = demo ? '?demo=1' : '', who = ls.get('lk.lsn.who') === 'ama' ? 'carlos' : 'ama';
    const have = u.words.length ? u.words.filter(w => (state.cards || {})[keyOf(w.word)]).length : 0, ST_ = demo ? {} : stars();
    const cpAt = P.findIndex((p, i) => i >= at && p.kind === 'exam'), xpTo = cpAt >= 0 ? (cpAt - at + 1) * 20 : 0, X = (App.EXAMS || {})[exam()] || { short: 'IELTS' };
    const nxMin = KMIN[(P[at] || {}).kind] || 4;
    // 🎨 Màn Học = mẫu Stitch "IELTS Learning Path" (web/js/st/home.js · css/st-home.css nạp cùng gói ux1)
    const nodes = P.map((p, i) => {
      const st = i < at ? 'done' : i === at ? 'next' : 'lock', cp = p.kind === 'exam' ? check(n) : null, k = ST_[n - at + i];
      const label = cp ? cp.name : KNAME(p.kind);
      return { st, no: i + 1, label, cp: !!cp && st === 'lock', ms: t('Mốc'), stars: st === 'done' ? k || 0 : 0, href: `#/lesson/go${Q}`, start: t('Bắt đầu'), sub: [cp ? t('Kiểm tra nhanh') : '', t('{n} phút', { n: KMIN[p.kind] || 4 })].filter(Boolean).join(' • '), tch: st === 'next' ? Chars.slot(who, { pose: 'point', size: 'l', lazy: false, clip: true, loop: true, cls: 'absolute right-full mr-3 -bottom-2' }) : '', icon: cp ? ({ headphones: 'headphones', newspaper: 'menu_book', mic: 'mic', 'pen-line': 'edit', mail: 'edit', ruler: 'menu_book', phone: 'call' }[cp.icon] || 'emoji_events') : ({ lesson: 'star', listen: 'headphones', speak: 'mic', review: 'replay', story: 'auto_stories', radio: 'radio', call: 'call', write: 'edit' }[p.kind] || 'star') };
    });
    const ex = exam(), Xe = (App.EXAMS || {})[ex] || { short: 'IELTS', ic: 'graduation-cap' }, tg = target(), cur = current(ex), pc = pctOf(ex, cur, tg), g = (state.settings || {}).goal, left = g && g.date ? Math.ceil((new Date(g.date) - Date.now()) / 864e5) : 0, C = 2 * Math.PI * 20;
    const examH = ST.exam({ cls: 'ux1-exam-top', p: pc, C, off: pc != null ? C * (1 - pc / 100) : 0, icon: { briefcase: 'work', landmark: 'account_balance', 'message-circle': 'forum' }[Xe.ic] || 'school', title: Xe.short + (tg ? ' · ' + tg : ''), sub: [cur ? t('Dự đoán ~{s}', { s: cur }) : t('Chưa có điểm dự đoán'), left > 0 ? t('còn {n} ngày', { n: left }) : ''].filter(Boolean).join(' · '), href: MOCK[ex] || '#/tests', mock: t('Thi thử') });
    const coach = who === 'ama' ? 'Carlos' : 'Ama', placed = !!(state.settings || {}).placement;
    const chips = [u.words.length ? { icon: 'local_library', text: `${have}/${u.words.length}`, title: t('Kiến thức đã có') } : null, placed ? null : { href: '#/placement', icon: 'explore', text: t('Kiểm tra trình độ') }].filter(Boolean);
    if (self.ST2 && ST2.path) { // 🎨 Stitch v2 "Learning Path" – khung tự sinh (web/js/st/v2/path.js · css/st-v2-path.css), chỉ gắn dữ liệu thật ở đây
      // Hướng dẫn chặng (nút "Guide" có sẵn trong mẫu Stitch path) mở bảng giữ ĐỦ tính năng cũ của màn Học mà mẫu không vẽ: câu "Bạn sẽ…", kiến thức đã có, thẻ kỳ thi + thi thử, kiểm tra trình độ, đổi mục tiêu
      const guide = root => { const g = root.querySelector('[data-act="guide"]'); if (g) g.addEventListener('click', e => { e.preventDefault();
        const ch = chips.map(c => c.href ? `<a class="btn sm" href="${c.href}">${ic(c.icon === 'explore' ? 'compass' : 'library')} ${esc(c.text)}</a>` : `<span class="chip" title="${esc(c.title || '')}">${ic('library')} ${esc(c.text)} · ${esc(c.title || '')}</span>`).join(' ');
        const box = UI.modal(`<div class="ux1-guide"><p class="muted small">${esc(t('Chặng học {n}', { n: u.no }))} · ${esc(X.short)}</p><h2>${esc(u.name)}</h2>${CAN()[u.id] ? `<p class="ux1-unit-tip">${esc(CAN()[u.id])}</p>` : ''}${examCard('')}<p>${ch}</p><p><a class="btn" href="#/lesson?pick=1">${ic('target')} ${t('Đổi mục tiêu')}</a></p></div>`);
        fillMock(box || document); }); };
      const demoNote = root => { if (!demo) return; const s = document.createElement('p'); s.className = 'sr-only'; s.setAttribute('role', 'status'); s.textContent = t('Bài thử (không lưu tiến độ)'); root.prepend(s); if (App.toast) App.toast(t('Bài thử (không lưu tiến độ)')); };
      const toCur = root => { const cur = root.querySelector('[data-cur]'); if (cur && cur.getBoundingClientRect().bottom > innerHeight - 160) try { cur.scrollIntoView({ block: 'center' }); } catch (e) { /* bỏ qua */ } };
      const TCH = { pose: 'point', size: 'm', lazy: false, hip: true, ground: false }; // ground:false → bệ = var(--bg); thẻ hiện tại đặt --bg = --surface (path.json) → bệ cùng màu mặt thẻ, không lộ bệ xám
      const tp = { P, at, n, Q, unitAt, check, can: CAN(), kmin: KMIN, tch: () => Chars.slot('ama', TCH), guide, toCur, render: x => ST2.path(Object.assign({ hdr: ST2.hdr(), tabs: [] }, x)).main };
      // 🏠 Home v2 "Hôm nay": lộ trình = đúng một component PathTrail (thu gọn chặng hiện tại, mở rộng thêm hàng)
      if (ST2.today) return home2({ demo, fresh, Q, P, at, n, u, nodes, tp, xpTo, nxMin, guide, demoNote, toCur });
      const first = PathTrail.build(tp, false), root = ST2.mount(view, 'path', first, 'home'); PathTrail.wire(root, tp, first);
      demoNote(root); guide(root); toCur(root);
      return;
    }
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

  // ---------- 🏠 Home v2 "Hôm nay" (docs/HOME-V2.md · khung Stitch tự sinh web/js/st/v2/today*.js) ----------
  // Chỉ dữ liệu THẬT; khối không có dữ liệu → data-show=0 → gỡ (không hiện số giả). Điện thoại: today / today-new · máy tính ≥ 1024 px: today-desk + cột phải today-rail.
  const DSK = () => matchMedia('(min-width: 1024px)').matches;
  const MINS = { ielts: 165, ieltsgt: 165, toeic: 120, toefl: 120 };
  const PLAN_TTL = 30e3; let planC = null; // nhớ 30 s; đổi kỳ thi / vừa học → tính lại
  const dcOf = () => (window.Core && Core.Cards ? Core.Cards.dueCount(state.cards || {}, state.settings, state.stats) : { due: 0, total: 0 });
  const planSig = () => [exam(), dcOf().total, ((state.stats || {}).days || {})[window.Core && Core.todayKey ? Core.todayKey() : ''] || 0, (state.game || {}).xp || 0].join('|');
  const planOf = async () => { const sig = planSig(); if (planC && planC.sig === sig && Date.now() - planC.at < PLAN_TTL) return planC.v; let v = []; try { v = (App.todayPlan ? await App.todayPlan() : []) || []; } catch (e) { v = []; } planC = { at: Date.now(), v, sig }; return v; };
  // <goal-left>
  const goalLeftOf = (rv, goal, total) => (rv >= goal ? t('Đã đạt mục tiêu ngày') : total >= goal - rv ? t('Còn {n} thẻ', { n: goal - rv }) : total > 0 ? t('{n} đến hạn', { n: total }) : t('Không còn thẻ đến hạn'));
  // </goal-left>
  const mockOverall = async () => { const ex = exam(); if ((ex !== 'ielts' && ex !== 'ieltsgt') || !window.Core || !Core.Store) return ''; try { const m = await Core.Store.get('mocks', []), x = (m || [])[0]; return x && x.overall != null ? String(x.overall) : ''; } catch (e) { return ''; } };
  const lgInvite = () => ({ tier: t('Giải đấu'), rank: t('Tham gia ngay'), zone: '', left: '' }); // chưa tham gia: thẻ vẫn hiện (lối vào duy nhất của Giải đấu trên Hôm nay), giữ chỗ để không nhảy bố cục
  const lgGet = () => { try { return JSON.parse(ls.get('lk.ux1.lg') || 'null'); } catch (e) { return null; } };
  // Dữ liệu dùng chung cho Hôm nay + cột phải: số liệu đầu trang, kỳ thi, kế hoạch hôm nay, chuỗi 7 ngày, giải đấu (bộ nhớ đệm lần trước)
  async function homeBase() {
    const st = state, se = st.settings || {}, g = st.game || {}, k = window.Core && Core.todayKey ? Core.todayKey() : '', rv = ((st.stats || {}).days || {})[k] || 0, goal = se.dailyGoal || 20;
    const ex = exam(), Xe = (App.EXAMS || {})[ex] || { short: 'IELTS' }, tg = target(), cur = (await mockOverall()) || current(ex), pc = pctOf(ex, cur, tg), left = se.goal && se.goal.date ? Math.ceil((new Date(se.goal.date) - Date.now()) / 864e5) : 0;
    const streak = App.streak ? App.streak() : 0, gp = Math.min(100, Math.round(rv / goal * 100)), lang = I18N.lang();
    const plan = await planOf(), tot = plan.length, dn = plan.filter(x => x.done).length, first = plan.findIndex(x => !x.done);
    const items = plan.map((x, i) => ({ v: i === first ? 'cur' : /listen/.test(x.href || '') ? 'lis' : 'row', t: x.t, sub: x.done ? '✓ ' + t('Đã xong') : i === first ? t('Đang làm') + ' · ' + t('{n} phút', { n: x.mins || 5 }) : x.sub || '', tag: x.done ? '✓' : i === first ? t('Việc hiện tại') : t('{n} phút', { n: x.mins || 5 }), href: x.href || '#/home' }));
    const act = App.activeDays ? App.activeDays() : new Set(), now = new Date(), mon = new Date(now); mon.setHours(12, 0, 0, 0); mon.setDate(mon.getDate() - (mon.getDay() + 6) % 7);
    const fN = new Intl.DateTimeFormat(lang, { weekday: 'narrow' }), fL = new Intl.DateTimeFormat(lang, { weekday: 'long' }); let wn = 0;
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); const key = Core.todayKey(d), on = act.has(key), today = key === k; if (on) wn++;
      return { v: today ? 'now' : on && d < now ? 'done' : 'off', mark: on ? '✓' : '⚡', l: fN.format(d), aria: fL.format(d) + (on ? ' ✓' : '') }; });
    const lg = lgGet() || lgInvite();
    return { lang: lang.toUpperCase(), ex, Xe, tg, left,
      c: { tg: tg || '–', tgL: tg ? t('Mục tiêu điểm') : t('Đặt mục tiêu'), tgHref: tg ? '#/goal' : '#/lesson?pick=1', streak: String(streak), xp: (g.xp || 0).toLocaleString(lang), goal: `${Math.min(rv, goal)}/${goal}`, ring: `${gp}, 100`,
        exName: Xe.name || Xe.short, streakDays: t('{n} ngày', { n: streak }), flame: streak ? t('Chuỗi đang cháy') : t('Học hôm nay để bắt đầu chuỗi'), xpToday: t('+{n} XP hôm nay', { n: ((g.days || {})[k] || {}).xp || 0 }), goalLeft: goalLeftOf(rv, goal, dcOf().total) },
      x: { p: pc, pct: pc != null ? pc + '%' : '', ready: pc != null ? t('Sẵn sàng {p}%', { p: pc }) : '', href: MOCK[ex] || '#/tests',
        title: [Xe.short + (tg ? ' · ' + t('mục tiêu {s}', { s: tg }) : ''), left > 0 ? t('còn {n} ngày', { n: left }) : ''].filter(Boolean).join(' · '), title2: Xe.short + (tg ? ' · ' + tg : ''),
        sub: cur ? t('Dự đoán ~{s}', { s: cur }) : t('Chưa có điểm dự đoán'), left: [cur ? t('Dự đoán ~{s}', { s: cur }) : '', left > 0 ? t('còn {n} ngày', { n: left }) : ''].filter(Boolean).join(' · '),
        mock: t('Thi thử {x} đầy đủ', { x: Xe.short }) + (MINS[ex] ? ' · ' + t('{n} phút', { n: MINS[ex] }) : '') },
      p: { items, count: t('{n} việc', { n: tot }), done: `${dn}/${tot}`, ring: `${tot ? (88 * dn / tot).toFixed(1) : 0}, 88`, left: tot - dn },
      wk: { days, n: `${wn}/7`, n2: t('{a}/7 đã xong', { a: wn }) }, lg };
  }
  // 🏆 Giải đấu thật (Sync.league): vá chữ vào thẻ có sẵn ([data-lg]) – không có tài khoản/chưa tham gia → thẻ ẩn (cột phải: thẻ giải đấu cũ thay vào)
  async function fillLeague(root, legacy) {
    let v = null;
    try { await App.need('league'); if (window.Sync && Sync.authed) await Sync.authed(); if (window.Sync && Sync.user && Sync.league && window.League) { const res = await Sync.league('me');
      if (res && res.member) { const me = (res.board || []).find(x => x.me), tr = League.tier(res.member.tier);
        v = { tier: tr.name(), rank: t('Hạng #{r}/{n}', { r: me ? me.rank : '–', n: (res.board || []).length || 30 }), zone: me && me.zone === 'up' ? '▲ ' + t('Vùng thăng hạng') : me && me.zone === 'down' ? '▼ ' + t('Vùng xuống hạng') : '● ' + t('Vùng an toàn'), left: League.timeRemaining ? League.timeRemaining(res.week && res.week.end) : '' }; } } } catch (e) { v = lgGet(); }
    ls.set('lk.ux1.lg', v ? JSON.stringify(v) : '');
    if (!root.isConnected) return;
    const c = v || (legacy ? null : lgInvite()); // cột phải có thẻ cũ thay vào; Hôm nay luôn còn lối vào
    root.querySelectorAll('[data-lg]').forEach(el => { const f = el.getAttribute('data-lg'); if (f === 'card') { el.classList.toggle('hidden', !c); el.classList.toggle('flex', !!c); } else if (c && c[f] != null) el.textContent = c[f]; });
    if (!v && legacy && window.League && League.renderHomeCard) League.renderHomeCard(legacy);
  }
  const prune = root => root.querySelectorAll('[data-show="0"]').forEach(x => x.remove());
  // Một lối nhắc ôn: kế hoạch còn việc ôn → gỡ khối "phai dần" + số trên ô Từ cần ôn (ô vẫn dẫn tới #/review)
  const oneReview = d => { if (d.p.items.some(x => x.href === '#/review' && x.tag !== '✓')) { d.r.due = 0; d.q.dueN = 0; } };
  // Đầu màn Hôm nay trên điện thoại (thanh trên của app ẩn dưới 1024 px): dùng lại đúng ô tìm #gq, bảng #notifBtn, nút sáng/tối và bộ chọn kỳ thi – không viết chức năng thứ hai
  const headBtns = root => { const el = id => document.getElementById(id), on = (a, f) => root.querySelectorAll(`[data-act="${a}"]`).forEach(b => b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); f(); }));
    on('search', () => { const i = el('gq'); if (!i) return; document.body.classList.add('v2-gs'); i.focus(); i.addEventListener('blur', () => setTimeout(() => { if (!i.parentNode.contains(document.activeElement)) document.body.classList.remove('v2-gs'); }, 300), { once: true }); });
    on('notif', () => { const n = el('notifBtn'); if (n) n.click(); });
    on('menu', () => App.accountMenu()); // một menu tài khoản chung (app.js)
    const src = el('notifBadge'), dots = root.querySelectorAll('[data-notif-badge]'); if (src && dots.length) { const sync = () => dots.forEach(d => { d.textContent = src.textContent; d.className = src.hidden ? 'hidden' : 'notif-dot'; }); sync(); const o = new MutationObserver(sync); o.observe(src, { attributes: true, childList: true, characterData: true, subtree: true }); if (App.onCleanup) App.onCleanup(() => o.disconnect()); } };
  const langBtn = root => root.querySelectorAll('[data-act="lang"]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); UI.modal(`<div class="ux1-lang"><h2>${t('Chọn ngôn ngữ giao diện')}</h2><p>${App.langPicker ? App.langPicker() : ''}</p></div>`); }));
  async function home2(o) {
    const tok = location.hash, { demo, fresh, Q, P, at, n, u, nodes, tp, xpTo, nxMin } = o;
    const b = await homeBase(); if (location.hash !== tok) return;
    const dc = dcOf(), due = demo ? 0 : dc.due, all = demo ? 0 : dc.total;
    let mist = 0; try { mist = demo ? 0 : ((await Core.Store.get('mistakes', [])) || []).filter(x => !x.fixed).length; } catch (e) { mist = 0; }
    if (location.hash !== tok) return;
    const name = (state.user && (state.user.displayName || state.user.email)) || '', ini = (String(name).trim()[0] || 'L').toUpperCase();
    const trail = PathTrail.build(tp, false), pm = tp.render(trail).replace(/^<main[^>]*>/, '').replace(/<\/main>$/, ''), pathHtml = `<div class="v2s-path w-full"><div class="st v2 v2-path">${pm}</div></div>`; // một component cho điện thoại, người mới, máy tính
    const SL = (self.LESSON_STORIES || []), sAt = (parseInt(ls.get('lk.lsn.s.story') || '0', 10) || 0), so0 = SL.slice(sAt % (SL.length || 1)).concat(SL.slice(0, sAt % (SL.length || 1))), sDn = (() => { try { const a = JSON.parse(ls.get('lk.lsn.sd' + (demo ? '.demo' : '')) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } })(), so = so0.filter(x => !sDn.includes(x.id)).concat(so0.filter(x => sDn.includes(x.id))); // truyện đã học xuống cuối, thẻ đầu luôn là bài mới
    const stories = so.map(x => ({ title: x.title, sub: x.kind === 'radio' ? 'Radio' : t('Truyện'), cefr: x.cefr || '', min: t('{n} phút', { n: KMIN[x.kind] || 4 }), href: '#/lesson/go' + (Q ? Q + '&' : '?') + 'story=' + encodeURIComponent(x.id) })); // giữ ?demo=1: truyện trong bài thử không ghi tiến độ thật
    const kind = (P[at] || {}).kind, ws = /^(story|radio|exam)$/.test(kind) ? [] : words(n, P.length, kind);
    const h = new Date().getHours(), greet = h < 12 ? t('Chào buổi sáng!') : h < 18 ? t('Chào buổi chiều!') : t('Chào buổi tối!');
    const lost = !fresh && App.streakLost ? App.streakLost() : 0;
    const say = lost ? t('{g} Không sao đâu, ai cũng có ngày bận. Hôm nay mình bắt đầu lại cùng nhau nhé!', { g: greet }) : b.p.left ? t('{g} Hôm nay còn {a} việc trong kế hoạch.', { g: greet, a: b.p.left }) : all ? t('{g} Hôm nay có {b} từ cần ôn.', { g: greet, b: all }) : t('{g} Bạn đã xong kế hoạch hôm nay – tuyệt vời!', { g: greet });
    // teacher-pose-map: Ama sau bệ – người mới vẫy chào (wave), đang học vòng nghỉ (idle, happy)
    const tch = fresh => Chars.slot('ama', Object.assign(fresh ? { pose: 'wave', clip: true, loop: 6000 } : lost ? { pose: 'empathy' } : { pose: 'happy', idle: true }, { size: 'm', hip: true, lazy: false, style: 'margin-left:auto' })); // hip: lộ tới hông như mẫu streak (chủ 06/11) · sát bong bóng: khung cắt rộng 1,4 khung-cao lòi mép màn 360 px nếu căn giữa ô 120 px
    const d = Object.assign(b, { ini, say: `“${say}”`, xpReady: xpTo ? t('+{x} XP tới mốc kiểm tra', { x: xpTo }) : '', teacher: tch(fresh), pathHtml, unitName: u.name,
      k: { unit: t('Chặng học {n}', { n: u.no }) + ' · ' + u.name, of: t('Bài {a}/{b}', { a: Math.min(at + 1, P.length), b: P.length }), title: (trail.rows.find(r => r.v === 'cur') || nodes[at] || {}).label || t('Bài học'), mins: t('{n} phút', { n: nxMin }), lvl: u.id === 'start' ? 'A1–A2' : CEFR[Math.max(2, Math.min(4, level()))], pct: Math.round(at / P.length * 100), href: `#/lesson/go${Q}`,
        words: ws.length ? `${esc(t('Bạn sẽ học {n} từ:', { n: ws.length }))} ${ws.map(w => `<span class="font-black lt:text-[#17595A] dk:text-[#2BA39A]">${esc(w.word)}</span>`).join(', ')}` : KDESC[kind] ? esc(t(KDESC[kind])) : '' }, // bài không dạy danh sách từ (truyện/radio/kiểm tra) vẫn có 1 dòng nói rõ sẽ làm gì – thẻ đủ cấu trúc mẫu Stitch
      r: { due, title: t('{n} từ đang phai dần', { n: due }), sub: t('Ôn ngay ({m} phút)', { m: Math.max(1, Math.ceil(due / 6)) }) },
      q: { mistN: mist, mist: t('{n} cần sửa', { n: mist }), mistHref: mist ? '#/mistakes?retry=1' : '#/mistakes', dueN: due, due: t('{n} đến hạn', { n: due }), dueHref: all ? '#/review' : '#/quick' },
      s: stories.slice(0, DSK() ? 3 : 2), mock: MOCK[b.ex] || '#/mock', story: stories[0] ? stories[0].href : '#/lesson/go' });
    if (fresh) { // người mới: 3 bước, bước đang làm = khuôn nổi bật
      const S = [{ k: 'goal', done: picked(), t: t('Chọn mục tiêu'), sub: t('IELTS, TOEIC, giao tiếp'), href: '#/lesson?pick=1' }, { k: 'level', done: !!((state.settings || {}).placement || (state.settings || {}).plSkip), t: t('Kiểm tra trình độ nhanh'), sub: t('Bài kiểm tra thích ứng, có khoảng band'), min: t('{n} phút', { n: 5 }), href: '#/placement' }, { k: 'lesson', done: false, t: t('Bài học đầu tiên'), sub: t('Từ vựng thông dụng theo mục tiêu'), min: t('{n} phút', { n: KMIN.lesson }), href: `#/lesson/go${Q}` }];
      const on = S.findIndex(x => !x.done); d.go = S[on].href;
      d.steps = S.flatMap((x, i) => [...(i ? [{ v: 'line' }] : []), Object.assign(x, { v: i === on ? 'on' : 'off', n: x.done ? '✓' : String(i + 1), min: x.min || '' })]);
      d.c.tgL = picked() ? t('Mục tiêu điểm') : t('Đặt mục tiêu'); d.say = `“${t('Chào bạn, mình là Ama! Cùng sẵn sàng qua 3 bước nhỏ nhé.')}”`;
      d.pathSec = picked() ? `<section class="v2-hpath" data-blk="path">${pathHtml}</section>` : ''; // chưa chọn mục tiêu → chưa có lộ trình (bước 1)
    }
    if (!fresh) oneReview(d);
    const k = fresh ? 'today-new' : DSK() && ST2['today-desk'] ? 'today-desk' : 'today';
    const root = ST2.mount(view, k, d, null);
    sayIn(root, d.say, lost, fresh ? 'greet' : lost ? 'review' : !b.p.left && !due ? 'goal' : due ? 'review' : 'plan'); // người mới chào · xong kế hoạch khen · có từ cần ôn khuyến khích (không dọa) · còn việc chỉ nút Bắt đầu
    if (ST2.shell) root.insertAdjacentHTML('beforeend', ST2.shell(Object.assign({ hdr: ST2.hdr(), tabs: ST2.tabs('home') }, d)).nav); // thanh tab CHUNG (5 tab), thay thanh tab riêng của mẫu
    if (k === 'today-desk') { const lb = document.getElementById('langBtn'); if (lb && lb.offsetParent) root.querySelectorAll('[data-act="lang"]').forEach(x => x.remove()); }
    prune(root); langBtn(root); headBtns(root);
    root.querySelectorAll(`[data-href="${(d.k || {}).href}"]`).forEach(x => x.classList.add('lsn-start', 'ux1-go')); // nút Bắt đầu chính = móc chung (lộ trình v1 cũng có) cho test/gác bố cục
    root.querySelectorAll('[data-act="path"]').forEach(x => x.addEventListener('click', e => { e.preventDefault(); const c = root.querySelector('[data-cur]'); if (c) try { c.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); } catch (er) { /* bỏ qua */ } }));
    o.demoNote(root); o.guide(root);
    const pathSet = PathTrail.wire(root, tp, trail);
    if (/[?&]at=path\b/.test(location.hash)) { if (pathSet) pathSet(true, false); o.toCur(root); } // tới thẳng nút hiện tại (liên kết cũ "bản đồ")
    if (!demo && root.querySelector('[data-lg]')) fillLeague(root, null);
    return root;
  }
  // Đổi cỡ màn qua mốc 1024 px khi đang ở Hôm nay → vẽ lại đúng khung (điện thoại ↔ máy tính)
  try { matchMedia('(min-width: 1024px)').addEventListener('change', () => { if (on() && document.querySelector('.v2s-today, .v2s-today-desk') && App.route) App.route(); }); } catch (e) { /* trình duyệt cũ */ }

  // ---------- Cột phải (máy tính ≥ 1024 px) ----------
  function rail() {
    const r = document.getElementById('ux1Rail'); if (!r) return;
    if (document.body.classList.contains('focus') || !matchMedia('(min-width: 1024px)').matches) { r.innerHTML = ''; return; }
    const promo = `<section class="card ux1-promo"><a class="btn sm" data-get-app="rail" hidden href="#/me">${ic('smartphone')} ${t('Tải app')}</a><a class="btn sm" data-ext-cta="rail" hidden href="#/me">${ic('puzzle')} ${t('Thêm vào Chrome')}</a></section>`;
    const tail = () => { if (App.getApp) App.getApp(r).then(() => { if (window.LKExt) LKExt.scan(r); }).catch(() => {}); };
    if (self.ST2 && ST2['today-rail']) { // 🎨 Stitch v2 cột phải (mẫu desk Home v2): số liệu · kế hoạch hôm nay · kỳ thi · giải đấu · chuỗi 7 ngày + thẻ giải đấu cũ (khách/chưa tham gia) + tải app/tiện ích
      const tok = r.dataset.tok = String(Date.now() + Math.random());
      homeBase().then(b => { if (r.dataset.tok !== tok || !document.body.contains(r)) return;
        const o = ST2['today-rail'](b);
        r.innerHTML = `<div class="v2s-today-rail"><div class="${o.root.replace(/\bmin-h-screen\b/, '')}">${o.main}</div></div><div id="ux1League"></div>${promo}`;
        const v = r.firstElementChild; ST2.css && ST2.css('today-rail', v); prune(v); fillLeague(v, document.getElementById('ux1League')); tail();
      }).catch(() => {});
      return;
    }
    const g = state.game || {}, k = window.Core && Core.todayKey ? Core.todayKey() : '', rv = ((state.stats || {}).days || {})[k] || 0, goal = (state.settings || {}).dailyGoal || 20, p = Math.min(100, Math.round(rv / goal * 100));
    r.innerHTML = `<div class="ux1-stat"><span>${ic('flame')} <b>${App.streak ? App.streak() : 0}</b></span><span>${ic('star')} <b>${(g.xp || 0).toLocaleString(I18N.lang())}</b></span></div>${examCard('')}
      <a class="card ux1-today" href="#/review"><b>${ic('goal')} ${t('Tiến độ hôm nay')}</b><span class="progress"><i style="width:${p}%"></i></span><small>${t('Ôn {a}/{b} thẻ', { a: Math.min(rv, goal), b: goal })}</small></a>
      <div id="ux1League"></div>${promo}`;
    fillMock(r);
    App.need('league').then(() => { const el = document.getElementById('ux1League'); if (el && window.League && League.renderHomeCard) League.renderHomeCard(el); }).catch(() => {});
    tail();
  }

  // ---------- Luyện: mọi tính năng, nhóm gọn, "Luyện thi" đầu tiên ----------
  const GROUPS = () => [
    [t('Luyện thi'), 'big', [['#/mock', 'graduation-cap', 'IELTS', t('Thi thử IELTS 4 kỹ năng')], ['#/toeic', 'briefcase', 'TOEIC', t('Listening & Reading, quy đổi điểm 10–990')], ['#/toefl', 'landmark', 'TOEFL', t('Luyện theo phần TOEFL iBT')],
      ['#/tests', 'flag', t('Thi thử'), t('Lịch sử điểm')], ['#/toeic', 'clipboard-list', t('TOEIC Part 5–7'), ''], ['#/placement', 'compass', t('Kiểm tra trình độ (5 phút)'), 'CEFR'], ['#/criteria', 'chart-column', t('Tiêu chí chấm band 4–9'), 'IELTS Writing · Speaking']]],
    [t('Từ vựng'), '', [['#/path', 'map', t('Lộ trình từ vựng')], ['#/library', 'library', t('Thư viện từ')], ['#/deck', 'notebook-pen', t('Sổ từ của tôi')], ['#/practice', 'zap', t('Trò chơi từ vựng')], ['#/quick', 'timer', t('Chơi nhanh 15 giây')], ['#/phrases', 'puzzle', t('Cụm từ & cấu trúc')], ['#/dict', 'search', t('Từ điển')], ['#/verb', 'a-large-small', t('Chia động từ')], ['#/usage', 'book-a', t('Cách dùng từ')], ['#/vocab', 'layout-grid', t('Tổng quan')]]],
    [t('Kỹ năng'), '', [['#/skill/listening', 'headphones', t('Nghe hiểu')], ['#/skill/reading', 'newspaper', t('Đọc hiểu')], ['#/skill/writing', 'pen-line', t('Viết')], ['#/skill/speaking', 'mic', t('Nói')], ['#/grammar', 'ruler', t('Ngữ pháp')], ['#/pron', 'audio-lines', t('Phát âm')], ['#/mediate', 'users', t('Trung gian')], ['#/confidence', 'message-circle', t('Giao tiếp tự tin')], ['#/courses', 'school', t('Khóa học theo lộ trình')], ['#/roleplay', 'users', t('Roleplay công sở')], ['#/call', 'phone', t('Gọi Ama & Carlos')], ['#/fix', 'pencil', t('Sửa ngữ pháp')], ['#/skills', 'layout-grid', t('Tổng quan')]]],
    [t('Thêm'), '', [['#/home?all=1', 'calendar', t('Kế hoạch hôm nay')], ['#/handsfree', 'headphones', t('Học rảnh tay')], ['#/reflex', 'brain', t('Phản xạ 60 giây')], ['#/lesson', 'sparkles', t('Bài học trộn')], ['#/tracks', 'compass', t('Gói học')], ['#/class', 'school', t('Lớp học')], ['#/resources', 'globe', t('Tài nguyên miễn phí')], ['#/method', 'flask-conical', t('Cách Lexkite giúp bạn nhớ lâu')]]],
  ];
  // 🎨 Stitch v2 "Practice" (khung tự sinh web/js/st/v2/practice.js · bind/practice.json): thẻ kỳ thi, nước rút hằng ngày, 8 mô-đun, hàng thi thử.
  // Mọi mục còn lại của GROUPS() vẫn có: cùng khuôn ô mô-đun, huy hiệu = tên nhóm (không cắt tính năng nào).
  // @icons headphones menu_book edit mic auto_fix_high graphic_eq call auto_stories school work account_balance flag checklist explore bar_chart map local_library edit_note bolt timer extension search text_fields grid_view forum groups event psychology auto_awesome public science
  const MS = { 'graduation-cap': 'school', briefcase: 'work', landmark: 'account_balance', flag: 'flag', 'clipboard-list': 'checklist', compass: 'explore', 'chart-column': 'bar_chart', map: 'map', library: 'local_library', 'notebook-pen': 'edit_note', zap: 'bolt', timer: 'timer', puzzle: 'extension', search: 'search', 'a-large-small': 'text_fields', 'book-a': 'menu_book', 'layout-grid': 'grid_view', headphones: 'headphones', newspaper: 'menu_book', 'pen-line': 'edit', mic: 'mic', ruler: 'auto_fix_high', 'audio-lines': 'graphic_eq', 'message-circle': 'forum', school: 'school', users: 'groups', phone: 'call', pencil: 'edit', calendar: 'event', brain: 'psychology', sparkles: 'auto_awesome', globe: 'public', 'flask-conical': 'science' };
  const FOCUS = ['#/skill/listening', '#/skill/reading', '#/skill/writing', '#/skill/speaking', '#/grammar', '#/pron', '#/call']; // 7 ô đầu = mục có sẵn của nhóm Kỹ năng; ô 8 = Truyện
  async function trainV2() {
    const tok = location.hash, ex = exam(), Xe = (App.EXAMS || {})[ex] || { short: 'IELTS' }, tg = target(), cur = current(ex), g = state.game || {}, k = window.Core && Core.todayKey ? Core.todayKey() : '';
    const left = (state.settings || {}).goal && state.settings.goal.date ? Math.ceil((new Date(state.settings.goal.date) - Date.now()) / 864e5) : 0, hrs = Math.max(1, Math.ceil((new Date().setHours(24, 0, 0, 0) - Date.now()) / 36e5));
    const leftT = left > 0 ? t('còn {n} ngày', { n: left }) : t('còn {n} giờ', { n: hrs });
    let plan = []; try { plan = (App.todayPlan ? await App.todayPlan() : []) || []; } catch (e) { plan = []; }
    if (location.hash !== tok) return; // đã sang trang khác trong lúc tải kế hoạch
    const gr = GROUPS(), pool = new Map(); gr.forEach(([h, , items]) => items.forEach(([href, i, n, d]) => { const key = href + '|' + n; if (!pool.has(key)) pool.set(key, { href, icon: MS[i] || 'auto_awesome', title: n, sub: d || '', badge: h }); }));
    const all = [...pool.values()], pick = h => all.find(x => x.href === h), skills = gr[2] ? gr[2][0] : '';
    const focus = FOCUS.map(pick).filter(Boolean).map(x => (x.href === '#/call' ? Object.assign({}, x, { title: t('Gọi giáo viên') }) : x)); focus.push({ href: '#/lesson', icon: 'auto_stories', title: t('Truyện'), sub: '', badge: gr[3] ? gr[3][0] : skills });
    const rest = all.filter(x => !FOCUS.includes(x.href)), tiles = [...focus, ...rest].map((x, ci) => Object.assign({ ci }, x));
    const tot = plan.length, dn = plan.filter(x => x.done).length, nx = plan.find(x => !x.done), pct = tot ? Math.round(dn / tot * 100) : 0, sprAria = t('Tiếp tục nước rút ngày');
    const mockName = t('Thi thử {x} đầy đủ', { x: Xe.short }), mins = { ielts: 165, ieltsgt: 165, toeic: 120, toefl: 120 }[ex];
    const d = { ex: { name: Xe.short, pred: cur ? t('Dự đoán ~{s}', { s: cur }) : t('Chưa có điểm dự đoán'), title: Xe.short + (tg ? ' · ' + tg : ''), left: leftT, leftAria: leftT },
      sp: { xp: '+' + (((g.days || {})[k] || {}).xp || 0) + ' XP', title: t('Nước rút ngày {a}/{b}', { a: dn, b: tot }), left: t('Còn {n} bài', { n: tot - dn }), pct, aria: sprAria, cta: t('Tiếp tục'), href: nx && nx.href ? nx.href : '#/home?all=1' },
      count: t('{n} mô-đun', { n: tiles.length }), tiles,
      mock: { title: mockName, chip: mins ? t('{n} phút', { n: mins }) : Xe.short, cta: t('Bắt đầu'), href: MOCK[ex] || '#/mock', aria: t('Bắt đầu thi thử {x}', { x: Xe.short }) } };
    ST2.mount(view, 'practice', d, 'skills');
  }
  // 🎨 Stitch v2 "Review" (hub Ôn): số thẻ đến hạn, trí nhớ, bộ thẻ theo nguồn; nút Bắt đầu mở phiên ôn thật (#/review → study.js). study.js gọi khi vào bằng thanh tab (#/review?hub=1).
  const ORI_IC = { youtube: 'smart_display', web: 'language', reading: 'auto_stories', dict: 'search', library: 'local_library', anki: 'style' }; // @icons smart_display language auto_stories search local_library style
  function reviewHub() {
    document.body.classList.remove('focus');
    const { SRS, Cards, endOfToday } = Core, end = endOfToday(), all = Object.values(state.cards), dc = Cards.dueCount(state.cards, state.settings, state.stats), due = dc.total;
    const studied = all.filter(c => c.srs.last || c.srs.reps > 0), rets = studied.map(c => SRS.retention(c.srs)).filter(x => x != null), avg = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length * 100 : 0;
    const done = (state.stats.days || {})[window.Core.todayKey()] || 0, C = 2 * Math.PI * 50, crit = Math.min(App.forgetting().length, dc.due), soon = all.filter(c => c.srs.last && c.srs.due > end && c.srs.due <= end + 2 * 864e5).length;
    const ahead = !due && soon > 0, fresh = new Set(Cards.newToday(state.cards, state.settings, state.stats)), nNew = fresh.size, fam = Math.max(0, dc.due - crit), groups = {}; all.forEach(c => { const o = App.origin(c); (groups[o] = groups[o] || []).push(c); });
    const decks = Object.entries(groups).map(([o, l]) => { const dl = l.filter(c => ((c.srs.last || c.srs.reps > 0) && c.srs.due <= end) || fresh.has(c)).length /* phần của bộ trong phiên hôm nay (đến hạn + mới) → tổng các bộ = số trên vòng */, rs = l.map(c => SRS.retention(c.srs)).filter(x => x != null), O = App.ORIGINS[o] || {};
      return { k: o, name: O.name || o, icon: ORI_IC[o] || 'style', href: '#/deck?from=' + o, ret: rs.length ? Math.round(rs.reduce((a, b) => a + b, 0) / rs.length * 100) + '%' : '–', cards: t('{n} thẻ trong bộ', { n: l.length }), dueText: t('{n} đến hạn', { n: dl }), due: dl, n: l.length }; }).sort((a, b) => b.due - a.due || b.n - a.n);
    const d = { due, off: due || done ? C * (1 - done / (done + due)) : C, mem: t('{p}% trí nhớ', { p: avg.toFixed(1) }), lock: t('Ghi {n} thẻ vào trí nhớ dài hạn', { n: due }),
      critText: t('{n} sắp quên', { n: crit }), famText: t('{n} quen', { n: fam }), critHref: crit ? '#/review?src=forgetting' : '#/review', critAria: t('Thẻ sắp quên: {n}', { n: crit }),
      cta: ahead ? t('Ôn trước →') : t('Bắt đầu ôn'), startHref: ahead ? '#/review?ahead=2' : '#/review', startAria: t('Bắt đầu ôn: {n} thẻ đến hạn', { n: due }), est: !due && !nNew ? t('Không còn thẻ đến hạn') /* rỗng: không bịa "~1 phút" */ : nNew ? t('Ước tính ~{m} phút · {n} thẻ mới', { m: Math.max(1, Math.ceil(due / 3)), n: nNew }) : t('Ước tính ~{m} phút', { m: Math.max(1, Math.ceil(due / 3)) }) /* sắp quên + quen (chip) + mới (dòng này) = số trên vòng (dc.total) */,
      famHref: ahead ? '#/review?ahead=2' : '#/review', famAria: t('Thẻ quen: {n}', { n: fam }), readyHref: ahead ? '#/review?ahead=2' : '#/review', trainHref: '#/deck?m=12', permHref: '#/deck?m=3', // ô số liệu + chip "quen" bấm được (ô Đang luyện = mức 1–2, Nhớ lâu = mức 3, như SRS.mastery)
      training: studied.filter(c => SRS.mastery(c.srs) < 3).length, perm: studied.filter(c => SRS.mastery(c.srs) === 3).length, decksTitle: t('Bộ thẻ • {n} đang dùng', { n: decks.length }), decks };
    return ST2.mount(view, 'review', d, 'vocab');
  }
  routes.train = function () {
    if (self.ST2 && ST2.practice && on()) { trainV2(); return; }
    css();
    view.innerHTML = `<div class="page-head"><div><h1>${ic('target')} ${t('Luyện')}</h1><p class="muted">${t('Mọi bài luyện ở một chỗ.')}</p></div></div>`
      + GROUPS().map(([h, big, items]) => `<h2 class="set-h ux1-gh">${esc(h)}</h2><div class="ux1-tiles${big ? ' big' : ''}">${items.map(([href, i, n, d]) => `<a class="ux1-tile" href="${href}"><span class="ux1-ti" aria-hidden="true">${ic(i)}</span><b>${esc(n)}</b>${big && d ? `<small>${esc(d)}</small>` : ''}</a>`).join('')}</div>`).join('');
  };

  // Bong bóng Hôm nay = TeacherBubble (js/teacher-bubble.js, tải lười; docs/specs/teacher-bubble.md): chữ gõ 1 lần/ngày, 🔊 Ama đọc, miệng/vòng nghỉ bằng TeacherRig.
  // chỗ giữ nút 🔊 của TeacherBubble: cùng dấu chân dòng với .tb-snd (44 px + lề trái 2 px, cao dòng 16 px nhờ lề âm -14 px) – cổng teacher-bubble.mjs đọc đúng hằng này
  const TB_SLOT = '<span class="tb-snd-slot" aria-hidden="true" style="display:inline-block;width:46px;height:16px;vertical-align:middle"></span>';
  function sayIn(root, say, lost, mood) {
    const p = [...root.querySelectorAll('p')].find(x => x.textContent.trim() === say); if (!p || !App.loadScript) return;
    App.loadScript('js/teacher-mood.js').then(() => { if (lost && window.TeacherMood) TeacherMood.emit('streakLost', { n: lost }); }).catch(() => {});
    p.style.visibility = 'hidden'; // chờ module nạp rồi mới hiện (không nháy chữ đầy → trống → gõ)
    p.insertAdjacentHTML('beforeend', TB_SLOT); // giữ chỗ nút 🔊 ngay từ khung đầu → gắn bong bóng không xuống dòng/xô bố cục (CLS 0)
    App.loadScript('js/teacher-bubble.js').then(() => window.TeacherBubble && TeacherBubble.attach({ root, textEl: p, slotEl: root.querySelector('[data-tch] .tslot'), who: 'ama', text: say, mood, key: 'today' })).catch(() => {}).finally(() => { p.style.visibility = ''; });
  }

  // ---------- CSS (chỉ khi cờ bật) ----------
  function css() {
    if (document.getElementById('ux1Css')) return;
    const s = document.createElement('style'); s.id = 'ux1Css';
    s.textContent = `
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
  body.ux1 .v2s-today-desk main{margin-inline:auto}
  body.ux1:not(.focus):not(.bare) .ux1-rail{display:flex;flex-direction:column;gap:.8rem;position:sticky;top:0;height:100vh;overflow-y:auto;padding:1.2rem 1.2rem 1.2rem .4rem}
  body.ux1 .ux1-exam-top{display:none}
}
.ux1-stat{display:flex;gap:1rem;justify-content:space-around;font-size:var(--fs-md);padding:.3rem 0}.ux1-stat span{display:inline-flex;gap:.35rem;align-items:center}
.ux1-stat span:first-child{color:var(--primary-text)}.ux1-stat span:last-child{color:var(--gold-text)}
.ux1-today{display:flex;flex-direction:column;gap:.45rem;color:var(--text);text-decoration:none}.ux1-today small{color:var(--muted)}
.ux1-promo{display:flex;gap:.5rem;flex-wrap:wrap}.ux1-promo:not(:has(a:not([hidden]))){display:none}.ux1-promo .btn{min-height:44px}
@media (max-width:420px){.ux1-pk-grid{grid-template-columns:minmax(0,1fr)}}
@media (max-width:1023px){.ux1-cta{bottom:calc(4.4rem + env(safe-area-inset-bottom,0px))!important}}
/* chuyển động: chỉ transform/opacity (60 fps), View Transitions cho đổi tab, @starting-style cho thẻ cột phải */
.ux1-exam,.ux1-tile{transition:transform .15s ease,box-shadow .15s ease}.ux1-tile:active,.ux1-pk-main:active{transform:translateY(2px)}
.ux1-rail>*{transition:opacity .18s ease}@starting-style{.ux1-rail>*{opacity:0}}
body.ux1 .bottom-nav{view-transition-name:ux1nav}body.ux1 .sidebar{view-transition-name:ux1side}
::view-transition-old(root),::view-transition-new(root){animation-duration:.18s}
@media (prefers-reduced-motion:reduce){.ux1-rail>*{transition:none}.ux1-tile:active,.ux1-pk-main:active{transform:none}}`;
    document.head.appendChild(s);
  }

  window.Ux1 = { headBtns, reviewHub, init, map, plan, words, units, unitAt, check, pick, choose, picked, rail, tabOf, level, needLevel, levelInvite }; // init() do App.route gọi sau khi gói + bản dịch ngôn ngữ đã nạp xong (nhãn tab không bị kẹt tiếng Anh)
})();
