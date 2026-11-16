/* 📈 Trang Tiến độ & huy hiệu (#/stats): lịch học 6 tháng, lượt ôn/dự báo, mức ghi nhớ, huy hiệu + nhiệm vụ hôm nay, thời điểm vàng, cấp độ nhớ, tuần này.
 * Tách khỏi app.js (khung app) 06/11 – chỉ nạp khi mở trang: gói 'statsp' (ROUTE_BUNDLE.stats). Khóa test: scripts/test/shell-lazy.mjs */
(function () {
  const { SRS, Cards, Golden, todayKey, DAY } = Core;
  const { $, esc } = UI;
  const App = window.App;
  const { state, routes, view, streak } = App;
  const avatarInner = () => App.avatarInner();

  // Khối thống kê cũ của trang chủ → trang Tiến độ
  function drawGolden(el) {
      if (!el) return;
      const now = Golden.dueNow(state.cards);
      const nx = Golden.next(state.cards);
      if (now) {
        el.innerHTML = `<div class="row nowrap"><div style="font-size:2.4rem">${UI.icon('alarm-clock')}</div><div class="grow"><h3 style="margin:0">${t('Đang là thời điểm vàng!')}</h3>
          <div class="muted small">${t('<b style="color:var(--again)">{n} từ</b> đang ở thời điểm sắp quên – ôn ngay để nhớ lâu nhất.', { n: now })}</div></div></div>
          <a class="btn primary block" style="margin-top:.8rem" href="#/review">${t('Ôn {n} từ ngay →', { n: now })}</a>`;
      } else if (nx) {
        const ms = nx.at - Date.now(), h = Math.floor(ms / 3600000), m = Math.ceil(ms % 3600000 / 60000);
        el.innerHTML = `<div class="row nowrap"><div style="font-size:2.4rem">${UI.icon('hourglass')}</div><div class="grow"><h3 style="margin:0">${t('Thời điểm vàng tiếp theo')}</h3>
          <div class="muted small">${t('Còn <b style="color:var(--primary);font-size:1.1rem">{time}</b> · {n} từ sẽ cần ôn', { time: h ? t('{h} giờ {m} phút', { h, m }) : t('{m} phút', { m }), n: nx.count })}</div></div></div>
          <p class="small muted" style="margin:.6rem 0 0">${t('Lexkite sẽ nhắc bạn đúng lúc từ sắp bị quên. Trong lúc chờ, hãy học thêm từ mới hoặc chơi Ghép thẻ.')}</p>`;
      } else {
        const fresh = Cards.dueCount(state.cards, state.settings, state.stats).newCount;
        el.innerHTML = `<div class="row nowrap"><div style="font-size:2.4rem">${UI.icon('sprout')}</div><div><h3 style="margin:0">${t('Chưa có lịch ôn')}</h3><div class="muted small">${t('Học từ mới đầu tiên – Lexkite sẽ tự tính “thời điểm vàng” để nhắc bạn ôn đúng lúc sắp quên.')}</div></div></div>
          <div class="row" style="margin-top:.9rem">${fresh ? `<a class="btn primary" href="#/review">✨ ${t('Học {n} từ mới ngay', { n: fresh })}</a>` : `<a class="btn primary" href="#/library">📚 ${t('Chọn bộ từ')}</a>`}<a class="btn" href="#/method">${t('Thời điểm vàng là gì?')}</a></div>
          <div class="tiny muted" style="margin-top:.8rem">${t('Đường cong quên lãng: sau 1 ngày bạn quên ~50% từ mới học – ôn đúng lúc giúp nhớ gần như mãi mãi.')}</div>`;
      }
    }

  function weekSummary(el) {
      const D = state.game.days || {}, sum = (from, n) => { const o = { newWords: 0, reviews: 0, quizzes: 0, xp: 0, active: 0 }; for (let i = 0; i < n; i++) { const d = new Date(from); d.setDate(d.getDate() - i); const x = D[todayKey(d)]; if (x) { o.newWords += x.newWords || 0; o.reviews += x.reviews || 0; o.quizzes += x.quizzes || 0; o.xp += x.xp || 0; if (x.xp || x.reviews) o.active++; } } return o; };
      const now = new Date(), dow = (now.getDay() + 6) % 7, cur = sum(now, dow + 1), lastEnd = new Date(now); lastEnd.setDate(now.getDate() - dow - 1); const prev = sum(lastEnd, 7);
      if (!prev.xp && !cur.xp) return;
      const cell = (em, label, a, b) => { const d = a - b; return `<div class="wk-cell"><span>${UI.glyph(em)}</span><b>${a}</b><small>${label}</small>${b || a ? `<i class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}</i>` : ''}</div>`; };
      if (!el) return;
      el.innerHTML = `<div class="card" style="margin-top:1rem"><div class="row between"><b>${UI.icon('calendar')} ${t('Tuần này của bạn')}</b><span class="tiny muted">${t('so với cả tuần trước')}</span></div>
        <div class="wk-grid">${cell('✨', t('Từ mới'), cur.newWords, prev.newWords)}${cell('🔁', t('Lượt ôn'), cur.reviews, prev.reviews)}${cell('🎯', t('Bài luyện'), cur.quizzes, prev.quizzes)}${cell('🔥', t('Ngày học'), cur.active, prev.active)}</div></div>`;
  }

  function levelBars() {
    const n = [0, 0, 0, 0, 0, 0];
    Object.values(state.cards).forEach(c => n[SRS.level5(c.srs)]++);
    if (!n.slice(1).some(Boolean)) return `<div class="empty" style="padding:1.2rem .5rem"><div style="font-size:2rem">${UI.icon('signal')}</div><div class="small">${t('Từ của bạn sẽ đi qua <b>5 cấp độ nhớ</b>: từ “mới học” (cấp 1) đến “nhớ lâu dài” (cấp 5) sau mỗi lần ôn đúng lúc.')}</div><div class="row center" style="margin-top:.6rem;gap:.3rem">${[1, 2, 3, 4, 5].map(i => `<span class="chip">${t('Cấp {n}', { n: i })}</span>`).join('→')}</div></div>`;
    const max = Math.max(1, ...n.slice(1));
    const col = ['', '#e5484d', '#f59e0b', '#eab308', '#22c55e', '#0ea5a4'];
    const lab = ['', t('< 1 ngày'), t('1–3 ngày'), t('4–10 ngày'), t('11–30 ngày'), t('> 1 tháng')];
    return `<div class="bars" style="height:130px;margin-top:.8rem">${[1, 2, 3, 4, 5].map(i => `<a href="#/practice/learn?src=level:${i}" title="${t('Cấp {n}: {range} – bấm để ôn', { n: i, range: lab[i] })}" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;height:100%;color:var(--text)">
      <em>${n[i]}</em><i style="height:${n[i] ? Math.max(8, n[i] / max * 80) : 3}px;background:${n[i] ? col[i] : 'var(--line)'};width:100%;max-width:34px;border-radius:8px 8px 3px 3px"></i><small style="font-weight:800">${t('Cấp {n}', { n: i })}</small></a>`).join('')}</div>
      <div class="tiny muted center" style="margin-top:.4rem">${t('{n} từ chưa học · bấm vào cột để ôn theo cấp', { n: n[0] })}</div>`;
  }

  routes.stats = function () {
    const L = Game.levelOf(state.game.xp);
    const cards = Object.values(state.cards);
    const k = todayKey();
    // Heatmap 26 tuần
    const end = new Date(); end.setHours(0, 0, 0, 0);
    const start = new Date(end); start.setDate(end.getDate() - 7 * 26 + 1 - ((end.getDay() + 6) % 7 === 6 ? 0 : 0));
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const cells = [];
    const usedFreezes = Object.keys(state.game.frozen || {});
    const activity = d => (state.stats.days[d] || 0) + Math.round(((state.game.days[d] || {}).xp || 0) / 10);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = todayKey(d), v = activity(key);
      if (usedFreezes.includes(key)) {
        const title = `${key}: 🧊 ${t('Ngày đóng băng (chuỗi được bảo toàn)')}`;
        cells.push(`<i class="freeze" role="img" aria-label="${title}" title="${title}"></i>`);
      } else {
        const cls = v >= 60 ? 'l4' : v >= 30 ? 'l3' : v >= 10 ? 'l2' : v > 0 ? 'l1' : '';
        const title = `${key}: ${v > 0 ? t('{n} lượt ôn, {xp} XP', { n: state.stats.days[key] || 0, xp: (state.game.days[key] || {}).xp || 0 }) : t('Chưa học')}`;
        cells.push(`<i class="${cls}" role="img" aria-label="${title}" title="${title}"></i>`);
      }
    }
    // Ôn tập 14 ngày
    const past = Array.from({ length: 14 }, (_, i) => { const d = new Date(Date.now() - (13 - i) * DAY); return { d, n: state.stats.days[todayKey(d)] || 0 }; });
    const pmax = Math.max(1, ...past.map(x => x.n));
    // Dự báo 14 ngày tới
    const fc = Array.from({ length: 14 }, (_, i) => {
      const s = new Date(); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() + i);
      const e = s.getTime() + DAY;
      const n = cards.filter(c => (c.srs.reps > 0 || c.srs.last) && (i === 0 ? c.srs.due < e : c.srs.due >= s.getTime() && c.srs.due < e)).length;
      return { d: s, n };
    });
    const fmax = Math.max(1, ...fc.map(x => x.n));
    // Phân bố mức thuộc
    const dist = [0, 0, 0, 0]; cards.forEach(c => dist[SRS.mastery(c.srs)]++);
    const tot = Math.max(1, cards.length);
    const colors = ['var(--surface-3)', 'var(--hard)', 'var(--easy)', 'var(--good)'];
    let acc = 0;
    const conic = dist.map((n, i) => { const a = acc; acc += n / tot * 100; return `${colors[i]} ${a}% ${acc}%`; }).join(',');
    const tl = state.game.total;
    const dn = [t('CN'), t('T2'), t('T3'), t('T4'), t('T5'), t('T6'), t('T7')];

    view.innerHTML = `
      <div class="page-head"><div><h1>${t('Tiến độ & huy hiệu')}</h1><p class="muted">${t('Theo dõi hành trình chinh phục IELTS của bạn')}</p></div><button type="button" class="btn sm" data-share>✨ ${t('Khoe thành tích')}</button></div>
      <div class="card hero-main" style="display:flex;gap:1.2rem;align-items:center;flex-wrap:wrap">
        <div class="avatar" style="width:72px;height:72px;font-size:1.8rem;background:rgba(255,255,255,.2)">${avatarInner()}</div>
        <div class="grow"><div class="muted">${t('Cấp độ hiện tại')}</div><h2 style="margin:0;color:#fff">${t('Cấp {n}', { n: L.level })} · ${esc(L.title)}</h2>
          <div class="progress" style="margin-top:.6rem"><i style="width:${L.into / L.need * 100}%"></i></div>
          <div class="small muted" style="margin-top:.3rem">${t('{a}/{b} XP tới cấp {n}', { a: L.into, b: L.need, n: L.level + 1 })} · ${t('Tổng {xp} XP', { xp: state.game.xp.toLocaleString(I18N.lang()) })}</div></div>
        <div style="text-align:center"><div class="big-num">🔥${streak()}${window.StreakUI ? ' ' + StreakUI.badgeHtml(state.game) : ''}</div><div class="muted small">${t('ngày liên tiếp')}</div></div>
      </div>

      <div class="grid g4 stats" style="margin-top:1rem">
        <div class="card stat"><div class="em">🃏</div><div><b>${tl.reviews.toLocaleString(I18N.lang())}</b><span class="muted small">${t('Lượt ôn')}</span></div></div>
        <div class="card stat"><div class="em">🎯</div><div><b>${tl.quizzes}</b><span class="muted small">${t('Bài luyện tập')}</span></div></div>
        <div class="card stat"><div class="em">🎙️</div><div><b>${tl.spoken}</b><span class="muted small">${t('Từ phát âm đúng')}</span></div></div>
        <div class="card stat"><div class="em">📖</div><div><b>${tl.readings}</b><span class="muted small">${t('Bài đọc')}</span></div></div>
      </div>

      <div class="card" style="margin-top:1rem">
        <div class="row between"><h3 style="margin:0">${t('Lịch học 6 tháng')}</h3><span class="row tiny muted" style="gap:.5rem"><span>${t('Ít')} <i class="heat" style="display:inline-grid;grid-template-rows:12px"><i></i></i><span style="display:inline-flex;gap:3px"><i style="width:12px;height:12px;border-radius:3px" class="l1"></i></span> ${t('Nhiều')}</span><span style="display:inline-flex;align-items:center;gap:3px"><i class="freeze" role="img" aria-label="${t('Đóng băng')}" style="width:12px;height:12px;border-radius:3px;display:inline-block"></i> 🧊 ${t('Đóng băng')}</span></span></div>
        <div class="heat" tabindex="0" style="margin-top:.8rem">${cells.join('')}</div>
      </div>

      <div class="grid g2" style="margin-top:1rem">
        <div class="card"><h3>${t('Lượt ôn 14 ngày qua')}</h3>
          <div class="bars" tabindex="0">${past.map(x => `<div title="${todayKey(x.d)}: ${x.n}"><em>${x.n || ''}</em><i class="${x.n ? '' : 'zero'}" style="height:${x.n ? Math.max(6, x.n / pmax * 100) : 3}px"></i><small>${x.d.getDate()}</small></div>`).join('')}</div></div>
        <div class="card"><h3>${t('Dự báo thẻ đến hạn')}</h3>
          <div class="bars dense" tabindex="0">${fc.map((x, i) => `<div title="${todayKey(x.d)}: ${x.n}"><em>${x.n || ''}</em><i class="${x.n ? '' : 'zero'}" style="height:${x.n ? Math.max(6, x.n / fmax * 100) : 3}px;background:linear-gradient(180deg,#2dd4bf,var(--accent))"></i><small>${i === 0 ? t('Nay') : dn[x.d.getDay()]}</small></div>`).join('')}</div></div>
      </div>

      <div class="card" style="margin-top:1rem;display:flex;gap:2rem;align-items:center;flex-wrap:wrap">
        <div style="width:150px;height:150px;border-radius:50%;background:conic-gradient(${cards.length ? conic : 'var(--surface-2) 0 100%'});display:grid;place-items:center">
          <div style="width:100px;height:100px;border-radius:50%;background:var(--surface);display:grid;place-items:center;text-align:center"><div><b style="font-size:1.5rem">${cards.length}</b><div class="tiny muted">${t('từ')}</div></div></div></div>
        <div class="grow"><h3>${t('Mức độ ghi nhớ')}</h3><div class="legend">
          ${[t('Chưa học'), t('Đang học (< 4 ngày)'), t('Quen (4–20 ngày)'), t('Đã thuộc (≥ 21 ngày)')].map((l, i) => `<span><i style="background:${colors[i]}"></i>${l}<b style="margin-left:auto">${dist[i]}</b></span>`).join('')}</div></div>
      </div>

      <div class="section-title"><h2>${t('Huy hiệu')}</h2><span class="muted small">${Object.keys(state.game.badges).length}/${Game.BADGES.length}</span></div>
      <div class="badge-grid">${Game.BADGES.map(b => `<div class="badge-card ${state.game.badges[b.id] ? '' : 'locked'}" title="${esc(b.desc)}"><div class="em">${UI.glyph(b.icon)}</div><b class="small">${esc(b.name)}</b><div class="tiny muted">${esc(b.desc)}</div></div>`).join('')}</div>`;
  };

  // Trang Tiến độ nhận các khối thống kê từ trang chủ cũ: nhiệm vụ hôm nay, tuần này, thời điểm vàng, cấp độ nhớ
  const statsBase = routes.stats;
  routes.stats = function (...a) {
    statsBase.apply(this, a);
    const k = todayKey(), gd = state.game.days[k] || {}, quests = Game.questsFor(k), doneQ = state.game.questsDone[k] || [];
    const ph = view.querySelector('.page-head');
    const html = `<div class="grid g2 stats-top">
      <div class="card" id="quests"><div class="row between"><h3 style="margin:0">🏅 ${t('Nhiệm vụ hôm nay')}</h3><span class="chip">${doneQ.length}/${quests.length}</span></div>
        ${quests.map(q => { const v = Math.min(q.goal, gd[q.metric] || 0); const ok = doneQ.includes(q.id); return `<div class="quest ${ok ? 'done' : ''}"><div class="em">${UI.glyph(ok ? 'circle-check' : q.icon)}</div><div class="grow"><div class="row between small"><b>${esc(q.text)}</b><span class="muted">+${q.xp} XP</span></div><div class="progress thin xp" style="margin-top:.35rem"><i style="width:${v / q.goal * 100}%"></i></div><div class="tiny muted">${v}/${q.goal}</div></div></div>`; }).join('')}</div>
      <div class="card" id="goldenCard"></div>
      <div class="card"><div class="row between"><h3 style="margin:0">${t('Cấp độ nhớ')}</h3><a class="small" href="#/method">${t('Vì sao? →')}</a></div>${levelBars()}</div>
      <div id="weekCard"></div></div>`;
    if (ph) ph.insertAdjacentHTML('afterend', html); else view.insertAdjacentHTML('afterbegin', html);
    drawGolden($('#goldenCard')); weekSummary($('#weekCard'));
    const gt = setInterval(() => drawGolden($('#goldenCard')), 30000);
    App.cleanup = () => clearInterval(gt);
    if (/[?&]s=quests/.test(location.hash)) { const q = $('#quests'); if (q) q.scrollIntoView({ block: 'center' }); }
    if (window.StreakUI) StreakUI.checkSavedNotice(state.game);
  };
})();
