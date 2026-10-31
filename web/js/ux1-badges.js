/* 🏅 Stitch v2 – Báo cáo tuần (#/week) · Tất cả huy hiệu (#/badges) · bảng chi tiết huy hiệu · màn "Huy hiệu mới!" (gói lười 'badges').
 * Khung tự sinh: web/js/st/v2/{week-report,badges,badge-detail,badge-unlocked}.js ← brand/stitch/v2/bind/*.json (mẫu chủ duyệt 31/10, PR #259).
 * Dữ liệu THẬT: state.game.days (XP/từ mới/lượt ôn/bài luyện từng ngày) · Game.BADGES (19) + state.game.badges[id] = thời điểm nhận ·
 *   bài thi thử gần nhất (Store 'mocks' / game.toeicTests – cùng nguồn goal.js) cho mạnh nhất / cần luyện (ẩn khi chưa có). Số bịa của mẫu đều bỏ.
 * Huy chương: web/js/badge-art.js (tờ Stitch badge-sheet). Giáo viên: chỉ Chars.* (2D). Chia sẻ: share-card.js có sẵn (data-share).
 * @icons arrow_upward arrow_downward check_circle lock */
(function () {
  const App = window.App; if (!App || !App.routes) return;
  const { state, routes } = App, view = App.view;
  const L = () => (window.I18N ? I18N.lang() : 'vi'), num = n => (n || 0).toLocaleString(L());
  const tk = d => (window.Core && Core.todayKey ? Core.todayKey(d) : d.toISOString().slice(0, 10));
  const reduce = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Giáo viên đứng TRONG ô Stitch, chân khuất sau 1 gờ đục màu mặt Stitch (như #/stats v2) → không "dán đè", không trôi nổi
  const stand = (who, pose, h) => Chars.img(who, { kind: 'still', pose, size: h, alt: '', cls: 'absolute inset-x-0 bottom-0 w-full h-full object-contain object-bottom pointer-events-none select-none' }) + '<span aria-hidden="true" class="absolute inset-x-0 bottom-0 h-7 rounded-t-xl lt:bg-[#F2E6CF] dk:bg-[#233942]"></span>';
  // Vùng chạm ≥ 44 px cho nút nhỏ của mẫu (hộp ::after vô hình, không đổi cỡ nhìn thấy)
  const HIT = "relative after:absolute after:left-1/2 after:top-1/2 after:w-[max(100%,44px)] after:h-[max(100%,44px)] after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']";
  const exam = () => { const se = state.settings || {}, X = (App.EXAMS || {})[se.exam || 'ielts'] || { short: 'IELTS' }; return X.short; };

  // ---------- Báo cáo tuần ----------
  const SK = () => ({ listening: t('Nghe hiểu'), reading: t('Đọc hiểu'), writing: t('Viết'), speaking: t('Nói') });
  const FOCUS = () => ({ listening: t('Phần 3–4: bám ý người nói'), reading: t('Đọc lướt tìm ý nhanh'), writing: t('Task 2: liên kết ý'), speaking: t('Trôi chảy & từ nối') });
  async function skills() { // điểm từng kỹ năng của bài thi thử gần nhất – cùng nguồn với goal.js readiness()
    const ex = (state.settings || {}).exam || 'ielts'; let bands = null;
    if (ex === 'ielts' || ex === 'ieltsgt') { const m = ((await Core.Store.get('mocks', [])) || [])[0]; if (m && m.overall && m.bands) bands = m.bands; }
    else if (ex === 'toeic') { const x = ((state.game || {}).toeicTests || []).slice(-1)[0]; if (x) bands = { listening: x.ls, reading: x.rs }; }
    const ks = bands ? Object.keys(SK()).filter(k => bands[k] != null && !isNaN(+bands[k])) : [];
    if (ks.length < 2) return null;
    ks.sort((a, b) => +bands[b] - +bands[a]);
    const one = k => ({ k, name: SK()[k], focus: FOCUS()[k], band: ex === 'toeic' ? String(bands[k]) : t('Band {b}', { b: bands[k] }), href: '#/skill/' + k });
    return { top: one(ks[0]), low: one(ks[ks.length - 1]) };
  }
  function weekData() {
    const D = (state.game || {}).days || {}, now = new Date(), dow = (now.getDay() + 6) % 7;
    const sum = (from, n) => { const o = { newWords: 0, reviews: 0, quizzes: 0, xp: 0, active: 0 }; for (let i = 0; i < n; i++) { const d = new Date(from); d.setDate(d.getDate() - i); const x = D[tk(d)]; if (x) { o.newWords += x.newWords || 0; o.reviews += x.reviews || 0; o.quizzes += x.quizzes || 0; o.xp += x.xp || 0; if (x.xp) o.active++; } } return o; };
    const cur = sum(now, dow + 1), lastEnd = new Date(now); lastEnd.setDate(now.getDate() - dow - 1); const prev = sum(lastEnd, 7); // = weekSummary() ở app.js
    const mon = new Date(now); mon.setHours(12, 0, 0, 0); mon.setDate(now.getDate() - dow);
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return { d, xp: ((D[tk(d)] || {}).xp) || 0 }; });
    const max = Math.max(1, ...days.map(x => x.xp));
    const bars = days.map((x, i) => { const v = i < dow ? (x.xp ? 'n' : 'rest') : i === dow ? 'today' : 'fut';
      return { v, xp: v === 'fut' ? '' : num(x.xp), l: x.d.toLocaleDateString(L(), { weekday: 'narrow' }), h: x.xp ? Math.max(10, Math.round(x.xp / max * 98)) : 8,
        al: `${x.d.toLocaleDateString(L(), { weekday: 'long' })}: ${v === 'fut' ? '–' : t('{n} XP', { n: num(x.xp) })}` }; });
    const dl = (a, b) => (a > b ? '+' + num(a - b) : a < b ? '−' + num(b - a) : '');
    const up = prev.xp ? Math.round((cur.xp - prev.xp) / prev.xp * 100) : null;
    const st = App.streak ? App.streak() : 0;
    const hiT = cur.active >= 5 ? t('Tuần này bạn đang rất sung! 🔥') : prev.xp && cur.xp > prev.xp ? t('Tiến bộ hơn tuần trước!') : cur.xp ? t('Giữ nhịp đều mỗi ngày nhé!') : t('Tuần mới, khởi đầu mới!');
    const hiB = st ? t('Chuỗi {n} ngày liên tiếp · {d} ngày học tuần này.', { n: st, d: cur.active }) : t('Học 5 phút hôm nay để bắt đầu chuỗi ngày.');
    const fmt = d => d.toLocaleDateString(L(), { day: 'numeric', month: 'short' }), sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { exam: exam(), hiT, hiB, xp: num(cur.xp), up, upIc: up != null && up < 0 ? 'arrow_downward' : 'arrow_upward',
      vs: up == null ? '' : t('{p}% so với tuần trước', { p: (up > 0 ? '+' : up < 0 ? '−' : '') + Math.abs(up) }), range: `${fmt(mon)} – ${fmt(sun)}`, bars,
      chartAria: t('XP từng ngày trong tuần'),
      c: [{ n: num(cur.newWords), dl: dl(cur.newWords, prev.newWords) }, { n: num(cur.reviews), dl: dl(cur.reviews, prev.reviews) }, { n: num(cur.quizzes), dl: dl(cur.quizzes, prev.quizzes) }, { n: `${cur.active}/${dow + 1}`, dl: dl(cur.active, prev.active) }],
      teacher: stand('carlos', 'encourage', 170) };
  }
  routes.week = App.guard(async function () {
    const W = App.W, d = weekData(), sk = await W(skills());
    Object.assign(d, sk ? { sk: 1, top: sk.top, low: sk.low } : { sk: 0, top: {}, low: {} });
    const root = ST2.mount(view, 'week-report', d, null);
    if (!d.sk) { const s = root.querySelector('#wkSkills'); if (s) s.remove(); } else root.querySelectorAll('#wkSkills button').forEach(b => { b.className += ' ' + HIT; });
    document.title = t('Tuần của bạn') + ' – Lexkite';
  });

  // ---------- Huy hiệu ----------
  const ctx = () => ({ cards: Object.keys(state.cards || {}).length, mastered: App.masteredCount ? App.masteredCount() : 0, streak: App.streak ? App.streak() : 0 });
  // Tiến độ [có, cần] cho đúng điều kiện test của Game.BADGES (game.js) – null = không đo được (vd ghép thẻ dưới 25 giây)
  const PROG = { first: (s) => [s.total.reviews, 1], words50: (s, c) => [c.cards, 50], words200: (s, c) => [c.cards, 200], words500: (s, c) => [c.cards, 500],
    master10: (s, c) => [c.mastered, 10], master100: (s, c) => [c.mastered, 100], streak3: (s, c) => [c.streak, 3], streak7: (s, c) => [c.streak, 7], streak30: (s, c) => [c.streak, 30],
    rev500: s => [s.total.reviews, 500], perfect5: s => [s.total.perfect, 5], speaker: s => [s.total.spoken, 50], reader: s => [s.total.readings, 5], speed: () => null,
    night: s => [s.total.night, 5], early: s => [s.total.early, 5], hunter: s => [Math.max(0, ...Object.values(s.days || {}).map(x => x.newWords || 0)), 50],
    level5: s => [Game.levelOf(s.xp || 0).level, 5], level10: s => [Game.levelOf(s.xp || 0).level, 10] };
  function badgeList() {
    const g = state.game || {}, s = Object.assign({ total: {}, days: {}, xp: 0 }, g, { total: g.total || {} }), have = g.badges || {}, c = ctx();
    return Game.BADGES.map(b => { const p = PROG[b.id] ? PROG[b.id](s, c) : null, a = p ? Math.min(p[1], +p[0] || 0) : 0;
      return { id: b.id, name: b.name, desc: b.desc, got: !!have[b.id], at: have[b.id], has: a, need: p ? p[1] : 0, pct: p ? a / p[1] : 0 }; });
  }
  const artOf = (b, px) => (b.got ? BadgeArt.svg(b.id, { px }) : BadgeArt.svg(b.id, { lock: 1, pct: b.pct, px }));
  routes.badges = function () {
    const L0 = badgeList(), got = L0.filter(b => b.got).length, nx = L0.filter(b => !b.got && b.need && b.pct < 1).sort((a, b) => b.pct - a.pct)[0];
    const d = { count: `${got} / ${L0.length}`, countAria: t('Đã nhận {a}/{b} huy hiệu', { a: got, b: L0.length }),
      items: L0.map(b => ({ v: b.got ? 'got' : 'lock', id: b.id, name: b.name, art: artOf(b, 80), al: `${b.name} – ${b.got ? t('Đã nhận') : t('Chưa đạt')}` })),
      next: nx ? { name: nx.name, left: t('Còn {n} để mở', { n: num(nx.need - nx.has) }), pct: Math.round(nx.pct * 100), how: `${nx.desc} (${num(nx.has)}/${num(nx.need)})` } : { name: '', left: '', pct: 0, how: '' },
      tName: 'Ama', tChip: Math.round(got / L0.length * 100) + '%',
      tSay: got === L0.length ? t('Bạn đã sưu tầm đủ cả bộ – tuyệt vời!') : nx ? t('Chỉ còn {n} nữa là có “{b}”!', { n: num(nx.need - nx.has), b: nx.name }) : t('Học mỗi ngày để mở thêm huy hiệu nhé!'),
      teacher: Chars.img('ama', { size: 48, alt: '', cls: 'w-full h-full object-cover' }) };
    const root = ST2.mount(view, 'badges', d, 'me');
    const sh = root.firstElementChild; if (sh && sh.tagName === 'HEADER') sh.remove(); // mẫu có đầu trang riêng (quay lại · Huy hiệu · n/19) → bỏ đầu trang chung, giữ thanh tab
    if (!nx) ['#bdNext', '#bdTip'].forEach(s => { const x = root.querySelector(s); if (x) x.remove(); });
    root.addEventListener('click', e => { const b = e.target.closest('[data-badge]'); if (b) BadgeUI.detail(b.dataset.badge, b); });
    document.title = t('Huy hiệu') + ' – Lexkite';
  };

  // ---------- Lớp phủ dùng chung (bảng chi tiết · màn chúc mừng) ----------
  const STRIP = /(^|\s)(min-h-screen|lt:bg-\S+|dk:bg-\S+|lt:min-h-screen)(?=\s|$)/g;
  // Lớp phủ nằm TRONG #view (cùng cây với trang): đổi trang vẽ lại #view → gắn lại (màn chúc mừng giữ qua lúc bài học chuyển trang).
  // keep = màn chúc mừng: nền đục của mẫu, trang dưới ẩn + inert (hộp thoại thật); bảng chi tiết: nền trong, trang dưới mờ qua lớp phủ của mẫu.
  function layer(k, d, onClose, keep) {
    const o = ST2[k](d), w = document.createElement('div'), back = document.activeElement; let open = true;
    w.className = 'v2s-' + k; w.innerHTML = `<div class="${keep ? o.root.replace(/(^|\s)min-h-screen(?=\s|$)/g, ' ') : o.root.replace(STRIP, ' ')} fixed inset-0 z-[80] overflow-y-auto">${o.main}</div>`;
    const hide = () => { if (keep) for (const c of view.children) if (c !== w && !c.hasAttribute('data-bu-hid')) { c.setAttribute('data-bu-hid', ''); c.setAttribute('inert', ''); c.setAttribute('aria-hidden', 'true'); c.style.visibility = 'hidden'; } };
    const show = () => view.querySelectorAll('[data-bu-hid]').forEach(c => { c.removeAttribute('data-bu-hid'); c.removeAttribute('inert'); c.removeAttribute('aria-hidden'); c.style.visibility = ''; });
    const de = document.documentElement, ov = de.style.overflow; de.style.overflow = 'hidden'; // khóa cuộn trang dưới hộp thoại (cuộn trong lớp phủ)
    view.appendChild(w); hide();
    const mo = new MutationObserver(() => { if (!open) return; if (!w.isConnected) view.appendChild(w); hide(); }); mo.observe(view, { childList: true });
    const close = () => { if (!open) return; open = false; mo.disconnect(); w.remove(); show(); de.style.overflow = ov; document.removeEventListener('keydown', key, true); if (back && back.focus && back.isConnected) try { back.focus(); } catch (e) { /* bỏ qua */ } onClose && onClose(); };
    const key = e => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    document.addEventListener('keydown', key, true);
    if (!keep && App.onCleanup) App.onCleanup(close); // bảng chi tiết: đổi trang → đóng (màn chúc mừng thì giữ – thường hiện đúng lúc bài học chuyển trang)
    return { w, close };
  }
  const when = ts => new Date(ts).toLocaleDateString(L(), { day: 'numeric', month: 'short', year: 'numeric' });

  const BadgeUI = window.BadgeUI = {
    detail(id) {
      const b = badgeList().find(x => x.id === id); if (!b) return;
      const d = { name: b.name, desc: b.desc, got: b.got, art: artOf(b, 144), whenIc: b.got ? 'check_circle' : 'lock',
        when: b.got ? t('Nhận ngày {d}', { d: when(b.at) }) : b.need ? t('Tiến độ {a}/{b}', { a: num(b.has), b: num(b.need) }) : t('Chưa đạt') };
      const { w, close } = layer('badge-detail', d); const dl = w.firstElementChild; dl.setAttribute('role', 'dialog'); dl.setAttribute('aria-modal', 'true'); dl.setAttribute('aria-labelledby', 'bdName');
      w.addEventListener('click', e => { if (e.target.closest('[data-bd-close]')) close(); });
      const s = w.querySelector('#bdSheet'); if (s && !reduce()) s.classList.add('st-rise');
      const c = w.querySelector('#bdClose'); if (c) c.focus();
    },
    // Màn chúc mừng: nhiều huy hiệu cùng lúc → lần lượt (hàng đợi)
    q: [], open: false,
    // Đang ôn/học (body.focus: thẻ ôn, bài học, luyện tập) → giữ lại, chúc mừng khi rời phiên (như Duolingo: thành tích hiện cuối phiên, không cắt ngang câu hỏi)
    unlocked(badge) { this.q.push(badge); if (this.open) return; if (document.body.classList.contains('focus')) { if (!this.wait) { this.wait = () => { if (document.body.classList.contains('focus')) return; removeEventListener('hashchange', this.wait); this.wait = null; setTimeout(() => this.open || this.next(), 600); }; addEventListener('hashchange', this.wait); } return; } this.next(); },
    next() {
      const badge = this.q.shift(); if (!badge) { this.open = false; return; } this.open = true;
      const all = Game.BADGES, have = (state.game || {}).badges || {}, got = all.filter(b => have[b.id]).length, who = got % 2 ? 'ama' : 'carlos';
      const d = { name: badge.name, desc: badge.desc, kicker: t('Huy hiệu thứ {n}/{m}', { n: got, m: all.length }), chip: t('Giỏi lắm!'),
        say: t('Bạn vừa mở khóa “{b}”!', { b: badge.name }), sub: t('Cứ thế phát huy nhé.'), foot: t('Đã sưu tầm {a}/{b} huy hiệu', { a: got, b: all.length }),
        art: BadgeArt.svg(badge.id, { px: 144, cls: reduce() ? '' : 'st-pop' }),
        teacher: stand(who, 'cheer', 120) };
      const { w, close } = layer('badge-unlocked', d, () => this.next(), true);
      const dlg = w.firstElementChild; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-label', t('Huy hiệu mới!') + ' ' + badge.name);
      if (!reduce()) w.querySelectorAll('[data-bu-medal]').forEach(m => { const C = ['#F59E0B', '#2BA39A', '#E5502F', '#FFC94A', '#6BD8CE']; // tung hoa giấy nhẹ quanh huy chương (st-burst, tắt khi giảm chuyển động)
        m.insertAdjacentHTML('beforeend', `<span class="st-burst" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2, r = 90 + (i % 3) * 18; return `<i style="--x:${Math.round(Math.cos(a) * r)}px;--y:${Math.round(Math.sin(a) * r)}px;--r:${i * 47}deg;background:${C[i % C.length]}"></i>`; }).join('')}</span>`); });
      w.addEventListener('click', e => { if (e.target.closest('[data-bu-next]')) close(); else if (e.target.closest('[data-share]')) setTimeout(close, 0); });
      w.querySelectorAll('header [data-bu-next]').forEach(b => { b.className += ' ' + HIT; });
      const n = w.querySelector('footer [data-bu-next]') || w.querySelector('[data-bu-next]'); if (n) n.focus();
    },
  };
})();
