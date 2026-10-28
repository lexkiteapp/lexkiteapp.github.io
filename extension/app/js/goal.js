/* Mục tiêu & kế hoạch: người học đặt kỳ thi + điểm mục tiêu + ngày thi → app tính khối lượng cần học,
 * chia chỉ tiêu theo tuần cho từng kỹ năng, theo dõi tiến độ tuần này và lịch thi thử. Mọi tính toán chạy trên máy. */
(function () {
  const { $, esc, toast } = UI;
  const { todayKey, DAY } = Core;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;

  // Ước lượng giờ học cần để tăng điểm (tham khảo khuyến nghị phổ biến: ~150 giờ có hướng dẫn cho mỗi 1.0 band IELTS)
  const HOURS = { ielts: gap => gap * 150, toeic: gap => gap / 100 * 60 }; HOURS.ieltsgt = HOURS.ielts;
  HOURS.toefl = gap => gap * 120; // TOEFL iBT 2026 (band 1–6): ước tính ~120 giờ có hướng dẫn cho mỗi 1.0 band // IELTS General: cùng thang band
  // Thời lượng mỗi đơn vị hoạt động (phút) để quy đổi giờ học → số bài
  const UNIT = { words: 1, listens: 10, readings: 20, writes: 50, spoken: 2, grammar: 15 };
  const SPLIT = {
    ielts: { words: .22, listens: .2, readings: .2, writes: .16, spoken: .1, grammar: .12 },
    toeic: { words: .3, listens: .3, readings: .28, writes: 0, spoken: 0, grammar: .12 },
  };
  SPLIT.ieltsgt = SPLIT.ielts;
  SPLIT.toefl = { words: .2, listens: .22, readings: .22, writes: .14, spoken: .1, grammar: .12 };
  // Thang điểm từng kỳ thi: bước, min, max, mặc định, giờ học tối đa hợp lý mỗi tuần
  const SCALE = { ielts: [0.5, 4, 9, 6.5, 25], ieltsgt: [0.5, 4, 9, 6.5, 25], toeic: [5, 300, 990, 750, 15], toefl: [0.5, 2, 6, 4.5, 20] };
  const NAME = { ielts: 'IELTS', ieltsgt: 'IELTS GT', toeic: 'TOEIC', toefl: 'TOEFL', general: 'CEFR' };
  // Tiếng Anh nền tảng: mục tiêu theo cấp CEFR (lưu số 1–6 = A1–C2); ~200 giờ học có hướng dẫn mỗi cấp (khuyến nghị phổ biến của Cambridge English)
  const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  SCALE.general = [1, 1, 6, 4, 15]; HOURS.general = gap => gap * 200;
  SPLIT.general = { words: .28, listens: .2, readings: .2, writes: .07, spoken: .1, grammar: .15 };
  const cefrN = s => CEFR.indexOf(String(s || '').toUpperCase().slice(0, 2)) + 1;
  App.goalLabel = g => (g.exam === 'general' ? CEFR[g.target - 1] || '' : String(g.target));
  const targetField = (exam, v) => exam === 'general'
    ? `<select class="input" id="gTarget">${CEFR.map((c, i) => `<option value="${i + 1}" ${+v === i + 1 ? 'selected' : ''}>${c}</option>`).join('')}</select>`
    : `<input class="input" id="gTarget" type="number" step="${SCALE[exam][0]}" min="${SCALE[exam][1]}" max="${SCALE[exam][2]}" value="${v}">`;
  const LABEL = () => ({ words: ['📌', t('Từ mới học'), '#/review'], listens: ['🎧', t('Phần nghe'), '#/listening'], readings: ['📖', t('Bài đọc'), '#/reading'], writes: ['✍️', t('Bài viết'), '#/write'], spoken: ['🗣️', t('Lượt nói (điểm)'), '#/speaking'], grammar: ['📐', t('Bài ngữ pháp'), '#/grammar'] });

  const goal = () => state.settings.goal || null;
  const weeksLeft = g => Math.max(1, Math.ceil((new Date(g.date) - Date.now()) / (7 * DAY)));
  // Điểm hiện tại: lần thi thử gần nhất → bài kiểm tra đầu vào → mặc định
  async function current(exam) {
    if (exam === 'toeic') { const t = (state.game.toeicTests || []).slice(-1)[0]; return t ? t.total : 450; }
    if (exam === 'toefl') return 3.5; // chưa có bài thi TOEFL đầy đủ → mức khởi điểm phổ biến
    if (exam === 'general') { const pl = state.settings.placement || {}, a = cefrN(pl.vCefr), b = cefrN(pl.gCefr); return a && b ? Math.round((a + b) / 2) : a || b || 2; } // mặc định A2
    const m = (await Core.Store.get('mocks', []))[0];
    if (m && m.overall) return m.overall;
    const pl = state.settings.placement; return pl && pl.band ? parseFloat(pl.band) || 5 : 5;
  }
  function weeklyTargets(g, cur) {
    const gap = Math.max(g.exam === 'toeic' ? 50 : 0.5, (g.target - cur));
    const hrs = Math.min(SCALE[g.exam][4], Math.max(3, HOURS[g.exam](gap) / weeksLeft(g)));
    const out = {};
    for (const [k, share] of Object.entries(SPLIT[g.exam])) if (share) out[k] = Math.max(1, Math.round(hrs * 60 * share / UNIT[k]));
    return { hrs: Math.round(hrs * 10) / 10, gap, t: out };
  }
  function thisWeek() {
    const D = state.game.days || {}, d = new Date(), out = { words: 0, listens: 0, readings: 0, writes: 0, spoken: 0, grammar: 0 };
    const dow = (d.getDay() + 6) % 7; // thứ Hai = 0
    for (let i = 0; i <= dow; i++) { const x = D[todayKey(d)] || {}; out.words += x.newWords || 0; out.listens += x.listens || 0; out.readings += x.readings || 0; out.writes += x.writes || 0; out.spoken += x.spoken || 0; out.grammar += x.grammar || 0; d.setDate(d.getDate() - 1); }
    return { out, dow };
  }

  // Thẻ tóm tắt cho Trang chủ
  App.goalCard = async function () {
    const g = goal();
    if (!g) return `<div class="card goal-mini"><div class="row between"><div><b>🎯 ${t('Đặt mục tiêu điểm & ngày thi')}</b><div class="small muted">${t('Lexkite sẽ chia kế hoạch học từng tuần cho bạn')}</div></div><a class="btn sm primary" href="#/goal">${t('Đặt mục tiêu')}</a></div></div>`;
    const cur = await current(g.exam), { t: tg } = weeklyTargets(g, cur), { out, dow } = thisWeek();
    const keys = Object.keys(tg), pct = Math.round(keys.reduce((a, k) => a + Math.min(1, out[k] / tg[k]), 0) / keys.length * 100);
    const exp = Math.round((dow + 1) / 7 * 100), days = Math.max(0, Math.ceil((new Date(g.date) - Date.now()) / DAY));
    return `<a class="card goal-mini" href="#/goal" style="color:var(--text)"><div class="row between nowrap"><div><b>🎯 ${NAME[g.exam] || 'IELTS'} ${App.goalLabel(g)}</b> <span class="small muted">· ${t('còn {days} ngày · hiện ~{cur}', { days, cur: App.goalLabel({ exam: g.exam, target: cur }) })}</span></div><span class="chip ${pct >= exp ? 'ok' : ''}">${t('Tuần này {pct}%', { pct })}</span></div>
      <div class="progress" style="margin-top:.5rem"><i style="width:${pct}%"></i></div><div class="tiny muted" style="margin-top:.3rem">${pct >= exp ? t('Đúng tiến độ') + ' 👍' : t('Nên đạt ~{exp}% vào hôm nay – xem chỉ tiêu còn thiếu →', { exp })}</div></a>`;
  };

  // Lộ trình học theo kỳ thi: TOEIC/TOEFL có lộ trình riêng, IELTS/General đi theo các chặng band (#/path).
  const pathFor = ex => ex === 'toeic' ? '#/toeic' : ex === 'toefl' ? '#/toefl' : '#/path';
  // ---------- Sẵn sàng thi (Tactile/Stitch): band ước tính vs mục tiêu · thanh sẵn sàng · 4 kỹ năng · bài luyện gợi ý · lịch thi thử ----------
  // Chỉ dùng điểm THẬT (thi thử / kiểm tra đầu vào); chưa có → trạng thái trống mời đo điểm, không bịa số.
  const SK = () => [['listening', 'headphones', t('Nghe hiểu')], ['reading', 'newspaper', t('Đọc hiểu')], ['writing', 'pen-line', t('Viết')], ['speaking', 'mic', t('Nói')]];
  const MOCKH = ex => (ex === 'toeic' ? '#/toeic' : ex === 'toefl' ? '#/toefl' : ex === 'general' ? '#/placement' : '#/mock');
  const FOCUS = () => ({ listening: t('Phần 3–4: bám ý người nói'), reading: t('Đọc lướt tìm ý nhanh'), writing: t('Task 2: liên kết ý'), speaking: t('Trôi chảy & từ nối') });
  // Bố cục bám mẫu Stitch "band_score_exam_readiness" (brand/stitch/readiness-*.jpg, cổng scripts/test/stitch-diff.mjs)
  async function readiness(g, cur, wl, hrs, next) {
    const ex = g.exam, [, mn, mx] = SCALE[ex], lab = v => App.goalLabel({ exam: ex, target: v }), who = new Date().getDate() % 2 ? 'ama' : 'carlos', WHO = who === 'ama' ? 'Ama' : 'Carlos';
    const img = w => (App.teacherImg ? App.teacherImg(w) : 'teach/' + w + '/poster.webp'), I = UI.icon, out9 = ex === 'general' ? '' : `<small class="rd-of">/ ${esc(lab(mx))}</small>`;
    let real = false, bands = null, hist = [];
    if (ex === 'ielts' || ex === 'ieltsgt') { hist = (await Core.Store.get('mocks', [])) || []; const m = hist[0]; if (m && m.overall) { real = true; bands = m.bands || null; } else real = !!(state.settings.placement || {}).band; }
    else if (ex === 'toeic') { const x = (state.game.toeicTests || []).slice(-1)[0]; if (x) { real = true; bands = { listening: x.ls, reading: x.rs }; hist = (state.game.toeicTests || []).slice().reverse().map(y => ({ bands: { listening: y.ls, reading: y.rs } })); } }
    else if (ex === 'general') real = !!state.settings.placement;
    const pct = real ? Math.max(4, Math.min(100, Math.round((cur - mn) / Math.max(.1, g.target - mn) * 100))) : 0;
    const days = Math.max(0, Math.ceil((new Date(g.date) - Date.now()) / DAY)), BAND = v => (ex === 'toeic' ? String(v) : t('Band {b}', { b: v }));
    const head = `<div class="rd-hd"><span class="tk-chip">${esc(NAME[ex] || '')} · ${t('Mục tiêu')} ${esc(lab(g.target))}</span><span class="rd-who"><img src="${img(who)}" alt="" width="20" height="20">${esc(WHO)}</span></div>`;
    const hero = real ? `<div class="rd-band"><div class="rd-c"><small>${t('Điểm ước tính')}</small><b class="tk-num">${esc(lab(cur))}</b>${out9}</div>
        <div class="rd-mid" aria-hidden="true"><span>${I('chevron-right')}</span><small>${t('Khoảng cách')}</small></div>
        <div class="rd-c end"><small>${t('Mục tiêu')}</small><b class="tk-num tg">${esc(lab(g.target))}</b>${out9}</div></div>
      <div class="rd-ready"><div class="rd-rl"><b>${t('Mức sẵn sàng thi')}</b><b class="rd-pct" dir="ltr">${t('{p}% sẵn sàng', { p: pct })}</b></div><span class="tk-bar rd-bar"><i style="width:${pct}%"></i></span>
        <div class="rd-rf"><span>${I('calendar')} ${days ? t('Còn {n} ngày đến kỳ thi', { n: days }) : ''}</span><span class="rd-h2">${t('~{h} giờ luyện còn lại', { h: Math.round(hrs * wl) })}</span></div></div>`
      : `<div class="rd-empty"><b>${t('Chưa có điểm ước tính')}</b><p>${t('Làm một bài thi thử để Lexkite ước tính điểm hiện tại, mức sẵn sàng và kỹ năng cần luyện.')}</p><a class="btn primary tk-btn wide" href="${MOCKH(ex)}">${ex === 'general' ? t('Làm bài kiểm tra trình độ') : t('Thi thử ngay')}</a></div>`;
    const sk = bands ? SK().filter(([k]) => bands[k] != null) : [];
    const tile = ([k, i, n]) => { const v = +bands[k], weak = ex === 'toeic' ? v < g.target / 2 - 25 : v < g.target - .25, top = ex === 'toeic' ? 495 : 9;
      const h5 = hist.slice(0, 5).map(m => +((m.bands || {})[k] || 0)).reverse(), bars = h5.length > 1 ? `<span class="rd-bars" aria-hidden="true">${h5.map((b, j) => `<i class="${j === h5.length - 1 ? 'on' : ''}" style="height:${Math.max(12, Math.round(b / top * 100))}%"></i>`).join('')}</span>` : '';
      return `<a class="rd-t${weak ? ' weak' : ''}" href="#/skill/${k}"><span class="rd-th"><span class="rd-ti" aria-hidden="true">${I(i)}</span><span class="rd-bd">${BAND(v)}</span></span><b>${esc(n)}</b><small class="rd-st">${weak ? '! ' + t('Cần luyện thêm') : '✓ ' + t('Đạt nhịp mục tiêu')}</small>
        ${weak ? `<span class="rd-fa"><small>${t('Trọng tâm:')}</small>${esc(FOCUS()[k])}</span>` : bars}</a>`; };
    const tiles = sk.length ? `<section class="rd-sec"><h2 class="rd-h tk-display">${t('Chẩn đoán từng kỹ năng')}</h2><div class="rd-sk">${sk.map(tile).join('')}</div></section>` : '';
    const weakest = sk.slice().sort((a, b) => bands[a[0]] - bands[b[0]])[0];
    const drill = weakest ? `<section class="rd-drill"><div class="rd-dh"><span class="rd-di" aria-hidden="true">${I('lightbulb')}</span><div><span class="tk-chip">${t('{n} chọn cho bạn', { n: WHO })}</span><h3 class="tk-display">${t('Luyện {s} có trọng tâm', { s: weakest[2] })}</h3></div></div>
        <p>${t('Kỹ năng thấp nhất của bạn – luyện 5 phút mỗi ngày để kéo điểm tổng lên.')}</p><a class="btn primary tk-btn wide" href="#/skill/${weakest[0]}">${t('Bắt đầu luyện')}</a></section>` : '';
    const sched = `<section class="rd-mock"><span class="rd-mi" aria-hidden="true">${I('timer')}</span><div class="rd-mt"><span class="tk-chip">${t('Đủ 4 kỹ năng')}</span><b>${next ? t('Thi thử tiếp theo: {date}', { date: next.toLocaleDateString(I18N.lang()) }) : t('Thi thử ngay tuần này để đo điểm')}</b><small>${days ? t('Còn {n} ngày đến kỳ thi', { n: days }) : ''}</small></div><a class="rd-mb" href="${MOCKH(ex)}">${I('calendar')} ${t('Thi thử')}</a></section>`;
    return `<div class="rd-wrap"><section class="rd" aria-label="${t('Mức sẵn sàng thi')}">${head}${hero}</section>${tiles}${drill}${sched}</div>`;
  }
  const rdCss = () => { if (document.getElementById('rdCss')) return; const st = document.createElement('style'); st.id = 'rdCss'; st.textContent = `
.rd-wrap{display:flex;flex-direction:column;gap:16px;max-width:480px;margin:0 auto 1rem}
.rd{position:relative;border-radius:16px;background:var(--surface);border:1px solid var(--line);padding:20px;box-shadow:var(--elev-card)}
.rd-hd{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:16px}
.rd-who{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:var(--surface-2);font-size:12px;font-weight:800;letter-spacing:.06em}
.rd-who img{width:20px;height:20px;border-radius:50%;object-fit:cover;object-position:50% 0;background:var(--surface-3)}
.rd-band{display:flex;align-items:center;justify-content:space-between;background:var(--surface-2);padding:16px;border-radius:24px;margin-bottom:16px}
.rd-c{display:flex;flex-direction:column;align-items:flex-start}.rd-c.end{align-items:flex-end}.rd-c small{font-size:13px;line-height:18px;color:var(--muted)}
.rd-c b{font-size:32px;line-height:38px;font-weight:800;letter-spacing:-.025em;color:var(--done)}.rd-c b.tg{color:var(--gold-text)}.rd-of{font-size:14px;font-weight:700;color:var(--muted)}
.rd-mid{display:flex;flex-direction:column;align-items:center;padding:0 8px}.rd-mid span{width:40px;height:40px;border-radius:50%;background:var(--surface-3);display:grid;place-items:center;color:var(--sun)}
.rd-mid small{font-size:12px;font-weight:800;letter-spacing:.06em;color:var(--muted);margin-top:6px;text-transform:uppercase}
.rd-ready{display:flex;flex-direction:column;gap:8px}.rd-rl{display:flex;justify-content:space-between;font-size:14px;line-height:18px;letter-spacing:.02em}.rd-pct{color:var(--done)}
.rd-bar{height:12px;padding:2px}.rd-bar i{background:linear-gradient(90deg,var(--done),var(--sun))}
.rd-rf{display:flex;justify-content:space-between;gap:8px;font-size:13px;line-height:18px;color:var(--muted)}.rd-rf span{display:inline-flex;align-items:center;gap:4px}.rd-rf svg{width:15px;height:15px;color:var(--sun)}.rd-h2{color:var(--done);font-weight:600}
.rd-empty{text-align:center}.rd-empty b{font-size:18px}.rd-empty p{font-size:13px;line-height:18px;color:var(--muted);margin:6px auto 14px;max-width:44ch}
.rd-sec{display:flex;flex-direction:column;gap:8px}.rd-h{font-size:18px;line-height:24px;font-weight:700;margin:0;padding:0 4px}
.rd-sk{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.rd-t{display:flex;flex-direction:column;padding:16px;border-radius:16px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--elev-card);color:var(--text);text-decoration:none;min-height:44px}
.rd-th{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.rd-ti{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:color-mix(in srgb,var(--done) 15%,transparent);color:var(--done)}.rd-ti svg{width:20px;height:20px}
.rd-bd{padding:2px 8px;border-radius:999px;background:color-mix(in srgb,var(--done) 20%,transparent);color:var(--done);font-size:12px;font-weight:800}
.rd-t b{font-size:16px;line-height:22px}.rd-st{font-size:13px;line-height:18px;color:var(--done);margin-top:2px}
.rd-t.weak .rd-ti{background:color-mix(in srgb,var(--cta-2) 20%,transparent);color:var(--again-text)}.rd-t.weak .rd-bd{background:color-mix(in srgb,var(--cta-2) 20%,transparent);color:var(--again-text)}.rd-t.weak .rd-st{color:var(--again-text)}
.rd-bars{display:flex;align-items:flex-end;gap:4px;height:28px;margin-top:16px;padding:12px 4px 0;border-top:1px solid var(--line);box-sizing:content-box}.rd-bars i{flex:1;border-radius:3px 3px 0 0;background:color-mix(in srgb,var(--done) 50%,transparent)}.rd-bars i.on{background:var(--done)}
.rd-fa{margin-top:12px;padding:8px;border-radius:12px;background:var(--surface-2);font-size:12px;line-height:16px}.rd-fa small{display:block;font-size:11px;font-weight:700;color:var(--muted)}
.rd-drill{border-radius:16px;background:var(--surface-2);padding:16px;box-shadow:var(--elev-card)}.rd-dh{display:flex;gap:8px;align-items:flex-start;margin-bottom:8px}
.rd-di{width:32px;height:32px;flex:none;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--sun) 25%,transparent);color:var(--gold-text)}.rd-di svg{width:18px;height:18px}
.rd-drill h3{font-size:18px;line-height:24px;margin:4px 0 0}.rd-drill p{font-size:13px;line-height:18px;color:var(--muted);margin:0 0 16px;padding-inline-start:40px}
.rd-mock{display:flex;align-items:center;gap:12px;padding:16px;border-radius:16px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--elev-card)}
.rd-mi{width:48px;height:48px;flex:none;border-radius:16px;background:var(--surface-3);display:grid;place-items:center;color:var(--done)}.rd-mi svg{width:26px;height:26px}
.rd-mt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.rd-mt b{font-size:16px;line-height:22px}.rd-mt small{font-size:13px;color:var(--muted)}
.rd-mb{flex:none;display:inline-flex;align-items:center;gap:4px;min-height:44px;padding:0 16px;border-radius:999px;background:var(--surface-2);color:var(--text);font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;box-shadow:var(--lip)}.rd-mb svg{width:16px;height:16px;color:var(--done)}
@media (max-width:360px){.rd-c b{font-size:28px}.rd-mock{flex-wrap:wrap}.rd-mb{width:100%;justify-content:center}}`; document.head.appendChild(st); };

  routes.goal = App.guard(async function () {
    const w = App.W;
    const ex0 = SCALE[state.settings.exam] ? state.settings.exam : 'ielts', tg0 = ex0 === 'general' ? cefrN(state.settings.examTarget) : parseFloat(state.settings.examTarget);
    const g = goal() || { exam: ex0, target: tg0 >= SCALE[ex0][1] && tg0 <= SCALE[ex0][2] ? tg0 : SCALE[ex0][3], date: new Date(Date.now() + 120 * DAY).toISOString().slice(0, 10) };
    const cur = await w(current(g.exam));
    const { hrs, gap, t: tg } = weeklyTargets(g, cur), wl = weeksLeft(g), { out, dow } = thisWeek();
    const has = !!goal();
    const mocks = []; for (let w = 2; w <= wl; w += Math.max(2, Math.round(wl / 6))) mocks.push(new Date(Date.now() + w * 7 * DAY));
    rdCss(); const rd = await w(readiness(g, cur, wl, hrs, mocks[0]));
    view.innerHTML = `
      <div class="page-head"><div><h1>🎯 ${t('Mục tiêu & kế hoạch học')}</h1><p class="muted">${t('Nhập kỳ thi, điểm mục tiêu và ngày thi – Lexkite tính khối lượng cần học và chia chỉ tiêu từng tuần cho từng kỹ năng.')}</p></div></div>
      ${rd}
      <div class="grid g2">
        <div class="card">
          <h3 style="margin-top:0">⚙️ ${t('Mục tiêu của bạn')}</h3>
          <div class="grid g2">
            <label class="field"><span class="small">${t('Kỳ thi')}</span><select class="input" id="gExam">${Object.keys(SCALE).map(k => `<option value="${k}" ${g.exam === k ? 'selected' : ''}>${App.EXAMS ? esc(App.EXAMS[k].name) : k}</option>`).join('')}</select></label>
            <label class="field" id="gTargetF"><span class="small">${t('Điểm mục tiêu')}</span>${targetField(g.exam, g.target)}</label>
            <label class="field"><span class="small">${t('Ngày thi')}</span><input class="input" id="gDate" type="date" value="${esc(g.date)}"></label>
            <label class="field"><span class="small">${t('Điểm hiện tại (ước tính)')}</span><input class="input" value="${esc(App.goalLabel({ exam: g.exam, target: cur }))}" disabled></label>
          </div>
          <div class="tiny muted" style="margin:.4rem 0 .8rem">${t('Điểm hiện tại lấy từ lần thi thử gần nhất (hoặc bài kiểm tra đầu vào).')} <a href="${g.exam === 'toeic' ? '#/toeic' : g.exam === 'toefl' ? '#/toefl' : g.exam === 'general' ? '#/placement' : '#/mock'}">${g.exam === 'general' ? t('Làm bài kiểm tra đầu vào (5 phút)') + ' →' : t('Thi thử để cập nhật →')}</a></div>
          <div class="row wrap" style="gap:.6rem"><button class="btn primary" id="gSave">${has ? t('Cập nhật kế hoạch') : t('Lập kế hoạch')}</button>${has ? `<a class="btn" href="${pathFor(g.exam)}">${t('Tiếp tục học lộ trình của bạn →')}</a>` : ''}</div>
        </div>
        <div class="card hero-main">
          <h3 style="color:#fff;margin:0">📅 ${g.exam === 'toeic' ? t('{wl} tuần · cần tăng {gap} điểm', { wl, gap }) : g.exam === 'general' ? t('{wl} tuần · cần lên {gap} cấp CEFR', { wl, gap }) : t('{wl} tuần · cần tăng {gap} band', { wl, gap: gap.toFixed(1) })}</h3>
          <div style="font-size:2.2rem;font-weight:800;margin:.3rem 0">${t('{hrs} giờ/tuần', { hrs })}</div>
          <div style="color:#e0e7ff" class="small">≈ ${t('{m} phút mỗi ngày.', { m: Math.round(hrs * 60 / 7) })} ${hrs >= SCALE[g.exam][4] ? '⚠️ ' + t('Mục tiêu khá gấp – cân nhắc lùi ngày thi hoặc tăng thời gian học.') : t('Học đều mỗi ngày hiệu quả hơn học dồn cuối tuần.')}</div>
        </div>
      </div>
      <div class="card" style="margin-top:1rem"><div class="row between"><h3 style="margin:0">📊 ${t('Chỉ tiêu tuần này')}</h3><span class="small muted">${t('Hôm nay là ngày {d}/7 của tuần', { d: dow + 1 })}</span></div>
        <div class="goal-grid">${Object.entries(tg).map(([k, v]) => { const [em, name, href] = LABEL()[k], done = out[k], p = Math.min(100, Math.round(done / v * 100)); return `<a class="goal-it" href="${href}"><div class="row between nowrap"><span>${em} <b>${name}</b></span><span class="small ${p >= 100 ? 'good' : ''}">${done}/${v}</span></div><div class="progress"><i style="width:${p}%;${p >= 100 ? 'background:var(--good)' : ''}"></i></div></a>`; }).join('')}</div>
        <div class="tiny muted" style="margin-top:.5rem">${t('Số liệu tự cập nhật khi bạn học. Bấm từng mục để học ngay.')}</div></div>
      <div class="card" style="margin-top:1rem"><h3 style="margin-top:0">🏁 ${t('Lịch thi thử gợi ý')}</h3><div class="row">${mocks.map((d, i) => `<span class="chip">${t('Lần {n}: {date}', { n: i + 1, date: d.toLocaleDateString(I18N.lang()) })}</span>`).join('') || `<span class="muted small">${t('Thi thử ngay tuần này để đo điểm xuất phát.')}</span>`}</div>
        <p class="small muted" style="margin-bottom:0">${t('Thi thử đều đặn giúp đo tiến bộ thật và điều chỉnh kế hoạch – điểm hiện tại và chỉ tiêu tuần sẽ tự tính lại sau mỗi lần thi.')}</p></div>`;
    $('#gExam').onchange = e => { const ex = e.target.value, t2 = $('#gTarget'), [, mn, mx, df] = SCALE[ex], v = +t2.value >= mn && +t2.value <= mx && (ex === 'general') === (t2.tagName === 'SELECT') ? +t2.value : df; t2.outerHTML = targetField(ex, v); };
    $('#gSave').onclick = async () => {
      const exam = $('#gExam').value, target = +$('#gTarget').value, date = $('#gDate').value;
      if (!date || new Date(date) < Date.now()) return toast(t('Chọn ngày thi trong tương lai'));
      const [, mn, mx] = SCALE[exam];
      if (!(target >= mn && target <= mx)) return toast(t('Điểm {exam} từ {a} đến {b}', { exam: NAME[exam], a: App.goalLabel({ exam, target: mn }), b: App.goalLabel({ exam, target: mx }) }));
      state.settings.goal = { exam, target, date, at: Date.now() }; state.settings.exam = exam; state.settings.examTarget = App.goalLabel({ exam, target }); await App.saveSettings();
      if (App.updateExamChip) App.updateExamChip();
      toast('🎯 ' + t('Đã lập kế hoạch! Kế hoạch hôm nay sẽ theo mục tiêu này.')); location.hash = pathFor(exam); // đặt mục tiêu xong → vào thẳng lộ trình
    };
  });
})();
