/* 🎨 Stitch v2.1 "Tiến độ & huy hiệu" (#/stats, cờ ux1): khung tự sinh web/js/st/v2/stats.js · brand/stitch/v2/bind/stats.json. Tải trong gói ux1 (lười, không vào khung app).
 * Bao routes.stats của app.js (cả 2 lớp: trang gốc + lớp khối thống kê từ trang chủ cũ): cờ ux1 bật → khung Stitch; tắt → trang cũ nguyên vẹn. Dữ liệu THẬT, không số giả:
 * [data-share] Khoe thành tích · avatar (ảnh/chữ đầu) · Cấp n · danh hiệu · thanh XP (into/need tới cấp n+1) · Tổng XP · 🔥 chuỗi + 🧊×n [data-streak-freeze] (StreakUI) ·
 * mô tả cũ = lời thầy Carlos (tư thế encourage qua Chars) · #quests 3 nhiệm vụ hôm nay (tiến độ, +XP, ?s=quests cuộn tới) · #goldenCard thời điểm vàng 3 trạng thái (vẽ lại 30 giây/lần) ·
 * #stLevels 5 cấp độ nhớ (SRS.level5 → #/practice/learn?src=level:n, Vì sao? → #/method, n từ chưa học) · #weekCard tuần này so với cả tuần trước (ẩn khi 2 tuần 0 XP) ·
 * #stTotals Lượt ôn / Bài luyện tập / Từ phát âm đúng / Bài đọc · #stHeat lịch 26 tuần (mức hoạt động, ngày đóng băng 🧊, title = ngày: lượt ôn, XP) ·
 * #stPast lượt ôn 14 ngày qua · #stFc dự báo thẻ đến hạn 14 ngày · #stMastery 4 mức ghi nhớ (SRS.mastery) · #stBadges mọi huy hiệu Game.BADGES (đã mở trước, 9 đầu + Xem cả) ·
 * StreakUI.checkSavedNotice như trang cũ.
 * @icons arrow_back celebration auto_awesome arrow_forward check expand_more expand_less lock sync quiz record_voice_over menu_book flag spellcheck verified bolt mic search hotel_class */
(function () {
  const App = window.App; if (!App || !App.routes || !App.routes.stats || !self.Game || !self.Core) return;
  const { state, routes } = App, old = routes.stats, esc = UI.esc, { SRS, Golden, Cards, todayKey, DAY } = Core;
  const on = () => !!(self.ST2 && ST2.stats && App.ux1On && App.ux1On());
  const L10 = () => I18N.lang(), num = n => Number(n || 0).toLocaleString(L10());
  // icon Material cho nhiệm vụ (theo chỉ số); huy hiệu dùng emoji thật của Game.BADGES như trang cũ (3 khuôn emoji của mẫu: cam · vàng · chàm)
  const QIC = { reviews: 'sync', newWords: 'spellcheck', quizzes: 'quiz', perfect: 'verified', matches: 'bolt', spoken: 'mic', readings: 'menu_book', lookups: 'search', xp: 'hotel_class' };
  const B_EM = 'font-extrabold lt:text-[#B53A22] dk:text-[#FF7B54]', B_LINK = 'font-bold underline lt:text-[#1F7A75] dk:text-[#38C6BA]'; // chữ nhấn trong đoạn thời điểm vàng (AA 2 nền)
  const BADGES_SHOWN = 9;
  const dfmt = d => d.toLocaleDateString(L10(), { day: 'numeric', month: 'short' });

  // Thời điểm vàng – cùng 3 trạng thái với drawGolden() cũ
  const gold = () => {
    const now = Golden.dueNow(state.cards), nx = Golden.next(state.cards);
    if (now) return { k: 'now', t: t('Đang là thời điểm vàng!'), rl: '', time: '', href: '#/review', cta: t('Ôn {n} từ ngay →', { n: now }),
      bodyH: t('<b style="color:var(--again)">{n} từ</b> đang ở thời điểm sắp quên – ôn ngay để nhớ lâu nhất.', { n: now }).replace(/<b style="[^"]*">/, `<b class="${B_EM}">`) };
    if (nx) { const ms = nx.at - Date.now(), h = Math.floor(ms / 3600000), m = Math.ceil(ms % 3600000 / 60000), time = h ? t('{h} giờ {m} phút', { h, m }) : t('{m} phút', { m });
      return { k: 'next', t: t('Thời điểm vàng tiếp theo'), rl: t('Lần ôn tới'), time, href: '', cta: '',
        bodyH: `${t('Còn <b style="color:var(--primary);font-size:1.1rem">{time}</b> · {n} từ sẽ cần ôn', { time: esc(time), n: nx.count }).replace(/<b style="[^"]*">/, `<b class="${B_EM}">`)}<br>${esc(t('Lexkite sẽ nhắc bạn đúng lúc từ sắp bị quên. Trong lúc chờ, hãy học thêm từ mới hoặc chơi Ghép thẻ.'))}` }; }
    const fresh = Cards.dueCount(state.cards, state.settings, state.stats).newCount;
    return { k: 'none', t: t('Chưa có lịch ôn'), rl: '', time: '', href: fresh ? '#/review' : '#/library', cta: fresh ? t('Học {n} từ mới ngay', { n: fresh }) : t('Chọn bộ từ'),
      bodyH: `${esc(t('Học từ mới đầu tiên – Lexkite sẽ tự tính “thời điểm vàng” để nhắc bạn ôn đúng lúc sắp quên.'))} <a class="${B_LINK}" href="#/method">${esc(t('Thời điểm vàng là gì?'))}</a><br>${esc(t('Đường cong quên lãng: sau 1 ngày bạn quên ~50% từ mới học – ôn đúng lúc giúp nhớ gần như mãi mãi.'))}` };
  };

  // Tuần này so với cả tuần trước – cùng phép tính với weekSummary() cũ
  const week = () => {
    const D = state.game.days || {}, sum = (from, n) => { const o = { newWords: 0, reviews: 0, quizzes: 0, xp: 0, active: 0 }; for (let i = 0; i < n; i++) { const d = new Date(from); d.setDate(d.getDate() - i); const x = D[todayKey(d)]; if (x) { o.newWords += x.newWords || 0; o.reviews += x.reviews || 0; o.quizzes += x.quizzes || 0; o.xp += x.xp || 0; if (x.xp || x.reviews) o.active++; } } return o; };
    const now = new Date(), dow = (now.getDay() + 6) % 7, cur = sum(now, dow + 1), lastEnd = new Date(now); lastEnd.setDate(now.getDate() - dow - 1); const prev = sum(lastEnd, 7);
    if (!prev.xp && !cur.xp) return null;
    const cell = (k, l, a, b) => { const df = a - b, show = !!(b || a); return { k, l, a: num(a), up: df >= 0, dl: show ? `${df >= 0 ? '▲' : '▼'} ${Math.abs(df)}` : '', dA: show ? t(df >= 0 ? 'Tăng {n} so với tuần trước' : 'Giảm {n} so với tuần trước', { n: Math.abs(df) }) : '' }; };
    return { cells: [cell('newWords', t('Từ mới'), cur.newWords, prev.newWords), cell('reviews', t('Lượt ôn'), cur.reviews, prev.reviews), cell('quizzes', t('Bài luyện'), cur.quizzes, prev.quizzes), cell('active', t('Ngày học'), cur.active, prev.active)] };
  };

  const build = (allBadges) => {
    const g = state.game, L = Game.levelOf(g.xp), cards = Object.values(state.cards), k = todayKey(), st = App.streak(), u = state.user;
    const name = (u && (u.displayName || u.email)) || 'L';
    // nhiệm vụ hôm nay
    const gd = g.days[k] || {}, quests = Game.questsFor(k), doneQ = g.questsDone[k] || [];
    const qs = quests.map((q, i) => { const v = Math.min(q.goal, gd[q.metric] || 0), done = doneQ.includes(q.id);
      return { v: 'v' + (1 + i % 3), id: q.id, done, text: q.text, goal: q.goal, v0: v, prog: `${v} / ${q.goal}`, pct: Math.round(v / q.goal * 100), xpL: `+${q.xp} XP`, icon: QIC[q.metric] || 'flag' }; });
    // 5 cấp độ nhớ (levelBars cũ), cấp cao nhất trên cùng như mẫu
    const n5 = [0, 0, 0, 0, 0, 0]; cards.forEach(c => n5[SRS.level5(c.srs)]++);
    const lab = ['', t('< 1 ngày'), t('1–3 ngày'), t('4–10 ngày'), t('11–30 ngày'), t('> 1 tháng')], tot = Math.max(1, cards.length), VV = ['', 'c', 'a', 'a', 't', 'g'];
    const lvls = [5, 4, 3, 2, 1].map(i => ({ n: i, v: VV[i], l: `${t('Cấp {n}', { n: i })} · ${lab[i]}`, c: t('{n} từ ({p}%)', { n: n5[i], p: Math.round(n5[i] / tot * 100) }), pct: Math.round(n5[i] / tot * 100), tip: t('Cấp {n}: {range} – bấm để ôn', { n: i, range: lab[i] }) }));
    const lvSubH = n5.slice(1).some(Boolean) ? esc(t('{n} từ chưa học · bấm vào cấp để ôn', { n: n5[0] })) : t('Từ của bạn sẽ đi qua <b>5 cấp độ nhớ</b>: từ “mới học” (cấp 1) đến “nhớ lâu dài” (cấp 5) sau mỗi lần ôn đúng lúc.');
    // lịch 26 tuần (heatmap cũ: bắt đầu thứ Hai)
    const end = new Date(); end.setHours(0, 0, 0, 0);
    const start = new Date(end); start.setDate(end.getDate() - 7 * 26 + 1); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const frozen = g.frozen || {}, act = key => (state.stats.days[key] || 0) + Math.round(((g.days[key] || {}).xp || 0) / 10);
    const cells = []; let activeN = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = todayKey(d), v = act(key); if (v > 0) activeN++;
      if (frozen[key]) cells.push({ k: key, v: 'fz', l: `${key}: 🧊 ${t('Ngày đóng băng (chuỗi được bảo toàn)')}` });
      else cells.push({ k: key, v: v >= 60 ? 'e4' : v >= 30 ? 'e3' : v >= 10 ? 'e2' : v > 0 ? 'e1' : 'e0', l: `${key}: ${v > 0 ? t('{n} lượt ôn, {xp} XP', { n: state.stats.days[key] || 0, xp: (g.days[key] || {}).xp || 0 }) : t('Chưa học')}` });
    }
    const weeks = Math.ceil(cells.length / 7), mon = Array.from({ length: 6 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + Math.round(i * (weeks - 1) / 5) * 7); return d.toLocaleDateString(L10(), { month: 'short' }); });
    // lượt ôn 14 ngày qua + dự báo 14 ngày tới
    const past = Array.from({ length: 14 }, (_, i) => { const d = new Date(Date.now() - (13 - i) * DAY); return { d, n: state.stats.days[todayKey(d)] || 0 }; });
    const pmax = Math.max(1, ...past.map(x => x.n));
    const fc = Array.from({ length: 14 }, (_, i) => { const s = new Date(); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() + i); const e = s.getTime() + DAY;
      return { d: s, n: cards.filter(c => (c.srs.reps > 0 || c.srs.last) && (i === 0 ? c.srs.due < e : c.srs.due >= s.getTime() && c.srs.due < e)).length }; });
    const fmax = Math.max(1, ...fc.map(x => x.n)), h = (n, m) => n ? Math.max(8, Math.round(n / m * 100)) : 3;
    // mức ghi nhớ (vòng cũ): đã thuộc · quen · đang học · chưa học
    const dist = [0, 0, 0, 0]; cards.forEach(c => dist[SRS.mastery(c.srs)]++);
    let acc = 0; const seg = [[3, t('Đã thuộc (≥ 21 ngày)')], [2, t('Quen (4–20 ngày)')], [1, t('Đang học (< 4 ngày)')], [0, t('Chưa học')]].map(([m, l]) => {
      const p = cards.length ? dist[m] / cards.length * 100 : 0, o = { n: dist[m], l, c: t('{n} từ ({p}%)', { n: dist[m], p: Math.round(p) }), da: `${p.toFixed(2)}, 100`, off: String(-acc.toFixed(2)) }; acc += p; return o; });
    // huy hiệu thật: đã mở trước (mới nhất trước), rồi chưa mở
    const have = g.badges || {}, B = Game.BADGES.slice().sort((a, b) => (have[b.id] ? 1 : 0) - (have[a.id] ? 1 : 0) || (have[b.id] || 0) - (have[a.id] || 0)), got = B.filter(b => have[b.id]).length;
    let ui = 0;
    const list = B.map((b, i) => ({ id: b.id, v: have[b.id] ? ['u1', 'u4', 'u6'][ui++ % 3] : 'lk', icon: b.icon, name: b.name, desc: b.desc, hide: !allBadges && i >= BADGES_SHOWN }));
    const fi = window.StreakUI && StreakUI.freezeInfo ? StreakUI.freezeInfo(g) : null;
    return {
      backL: t('Trở về trang trước'), title: t('Tiến độ & huy hiệu'), shareL: t('Khoe thành tích'),
      ini: String(name)[0].toUpperCase(), photo: u && u.photoURL ? u.photoURL : '',
      photoH: u && u.photoURL ? `<img class="absolute inset-0 w-full h-full object-cover rounded-2xl" src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : '',
      levelL: t('Cấp {n}', { n: L.level }), ltitle: L.title, streak: String(st), streakL: t('{n} ngày', { n: st }), streakA: t('Chuỗi {n} ngày', { n: st }),
      frz: fi ? { on: true, left: fi.left, a: t('{n} lượt đóng băng chuỗi', { n: fi.left }), tip: t('Đóng băng chuỗi: còn {n}/{max} lượt. Bấm để xem chi tiết.', { n: fi.left, max: fi.max }) } : { on: false, left: 0, a: '', tip: '' },
      toL: t('XP tới cấp {n}', { n: L.level + 1 }), into: L.into, need: L.need, intoL: num(L.into), needL: num(L.need), lvPct: Math.min(100, Math.round(L.into / L.need * 100)),
      leftL: t('Còn {n} XP', { n: num(Math.max(0, L.need - L.into)) }), totalL: t('Tổng {xp} XP', { xp: num(g.xp) }),
      say: t('Theo dõi hành trình chinh phục IELTS của bạn'),
      tch: Chars.img('carlos', { kind: 'still', pose: 'encourage', cls: 'absolute inset-x-0 bottom-1 mx-auto h-[72px] w-auto max-w-none object-contain object-bottom pointer-events-none select-none', alt: '', size: 83 }), // teacher-pose-map: Carlos "encourage" – cổ vũ tiến độ
      qT: t('Nhiệm vụ hôm nay'), qSub: t('Làm mới lúc 0 giờ · {a}/{b}', { a: doneQ.length, b: quests.length }), qXp: t('Tổng +{n} XP', { n: quests.reduce((a, q) => a + q.xp, 0) }), quests: qs,
      g: gold(),
      lvT: t('Cấp độ nhớ'), lvSubH, lvls,
      wkT: t('Tuần này của bạn'), wkSub: t('so với cả tuần trước'), wk: week(),
      tl: [[t('Lượt ôn'), g.total.reviews], [t('Bài luyện tập'), g.total.quizzes], [t('Từ phát âm đúng'), g.total.spoken], [t('Bài đọc'), g.total.readings]].map(([l, n]) => ({ l, n: num(n) })),
      hm: { t: t('Lịch học 6 tháng'), sub: `${t('{n} ngày học', { n: activeN })} · ${t('Chuỗi {n} ngày', { n: st })}`, mon, cells, less: t('Ít'), more: `${t('Nhiều')} · 🧊 ${t('Đóng băng')}`, frzL: t('Đóng băng') },
      pa: { t: t('Lượt ôn 14 ngày qua'), sum: t('{n} lượt ôn', { n: num(past.reduce((a, x) => a + x.n, 0)) }), from: dfmt(past[0].d), to: t('Nay'),
        bars: past.map((x, i) => ({ v: i === 13 ? 'c' : 't', h: h(x.n, pmax), l: `${todayKey(x.d)}: ${x.n}` })) },
      fc: { t: t('Dự báo thẻ đến hạn'), chip: t('Đến hạn'), sum: t('{n} thẻ đến hạn', { n: num(fc.reduce((a, x) => a + x.n, 0)) }), from: t('Nay'), to: dfmt(fc[13].d),
        bars: fc.map((x, i) => ({ v: i === 0 ? 'c' : i < 4 ? 'a' : 't', h: h(x.n, fmax), l: `${todayKey(x.d)}: ${x.n}` })) },
      dn: { t: t('Mức độ ghi nhớ'), sub: t('{n} từ trong sổ', { n: num(cards.length) }), n: num(cards.length), unit: t('từ'), seg },
      bd: { t: t('Huy hiệu'), sub: t('Đã mở {a}/{b} huy hiệu', { a: got, b: B.length }), pct: t('{p}% hoàn thành', { p: Math.round(got / Math.max(1, B.length) * 100) }), list,
        more: B.length > BADGES_SHOWN, moreL: allBadges ? t('Thu gọn') : t('Xem cả {n} huy hiệu', { n: B.length }), lockL: t('Chưa mở khóa') },
    };
  };

  routes.stats = function () {
    if (!on()) return old.apply(this, arguments);
    const view = App.view; let all = false;
    const draw = () => {
      const root = ST2.mount(view, 'stats', build(all), 'me');
      { const sh = root.querySelector(':scope > header'); if (sh && root.querySelector(':scope > div > header')) sh.remove(); } // mẫu có đầu trang riêng (quay lại + tiêu đề + Khoe) → bỏ đầu trang shell cố định đang che nó; thanh tab dưới giữ
      const mb = root.querySelector('#stBadgeMore');
      if (mb) { mb.setAttribute('aria-expanded', String(all)); const ic = mb.querySelector('.material-symbols-rounded'); if (ic) ic.textContent = all ? 'expand_less' : 'expand_more';
        mb.onclick = () => { all = !all; const y = window.scrollY; draw(); window.scrollTo(0, y); const b = view.querySelector('#stBadgeMore'); if (b) b.focus({ preventScroll: true }); }; }
      return root;
    };
    draw();
    // thời điểm vàng: cập nhật mỗi 30 giây như trang cũ (đổi trạng thái → vẽ lại cả thẻ; chỉ đổi giờ → sửa chữ)
    let gk = gold().k;
    const gt = setInterval(() => { if (!view.querySelector('.v2-stats')) return clearInterval(gt); const g = gold();
      if (g.k !== gk) { gk = g.k; const y = window.scrollY; draw(); window.scrollTo(0, y); } else { const el = view.querySelector('#gTime'); if (el) el.textContent = g.time; } }, 30000);
    App.onCleanup(() => clearInterval(gt));
    if (/[?&]s=quests/.test(location.hash)) { const q = view.querySelector('#quests'); if (q) q.scrollIntoView({ block: 'center' }); }
    if (window.StreakUI) StreakUI.checkSavedNotice(state.game);
  };
})();
