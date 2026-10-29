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
  const targetField = (exam, v, cls = 'input') => exam === 'general'
    ? `<select class="${cls}" id="gTarget">${CEFR.map((c, i) => `<option value="${i + 1}" ${+v === i + 1 ? 'selected' : ''}>${c}</option>`).join('')}</select>`
    : `<input class="${cls}" id="gTarget" type="number" step="${SCALE[exam][0]}" min="${SCALE[exam][1]}" max="${SCALE[exam][2]}" value="${v}">`;
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
    const img = w => ST.tImg(w);
    let real = false, bands = null, hist = [];
    if (ex === 'ielts' || ex === 'ieltsgt') { hist = (await Core.Store.get('mocks', [])) || []; const m = hist[0]; if (m && m.overall) { real = true; bands = m.bands || null; } else real = !!(state.settings.placement || {}).band; }
    else if (ex === 'toeic') { const x = (state.game.toeicTests || []).slice(-1)[0]; if (x) { real = true; bands = { listening: x.ls, reading: x.rs }; hist = (state.game.toeicTests || []).slice().reverse().map(y => ({ bands: { listening: y.ls, reading: y.rs } })); } }
    else if (ex === 'general') real = !!state.settings.placement;
    const pct = real ? Math.max(4, Math.min(100, Math.round((cur - mn) / Math.max(.1, g.target - mn) * 100))) : 0;
    const days = Math.max(0, Math.ceil((new Date(g.date) - Date.now()) / DAY)), BAND = v => (ex === 'toeic' ? String(v) : t('Band {b}', { b: v }));
    const sk = bands ? SK().filter(([k]) => bands[k] != null) : [];
    const skills = sk.map(([k, , n]) => { const v = +bands[k], weak = ex === 'toeic' ? v < g.target / 2 - 25 : v < g.target - .25, top = ex === 'toeic' ? 495 : 9;
      return { k, name: n, v, top, band: BAND(v), weak, href: `#/skill/${k}`, status: weak ? t('Cần luyện thêm') : t('Đạt nhịp mục tiêu'), faLabel: t('Trọng tâm:'), focus: FOCUS()[k], bars: hist.slice(0, 5).map(m => +((m.bands || {})[k] || 0)).reverse().map(b => Math.max(12, Math.round(b / top * 100))) }; });
    const weakest = sk.slice().sort((a, b) => bands[a[0]] - bands[b[0]])[0];
    // 🎨 Bố cục + class = mẫu Stitch "Band Score & Exam Readiness" (web/js/st/goal.js · css/st-goal.css)
    return { aria: t('Mức sẵn sàng thi'), raw: { cur, mn, mx, tg: g.target, toeic: ex === 'toeic' }, weakK: weakest ? weakest[0] : '', chip: `${NAME[ex] || ''} · ${t('Mục tiêu')} ${lab(g.target)}`, who: { img: img(who), name: WHO }, real, pct,
      cur: real ? lab(cur) : '', target: lab(g.target), of: ex === 'general' ? '' : lab(mx), curL: t('Điểm ước tính'), gapL: t('Khoảng cách'), tgL: t('Mục tiêu'), readyL: t('Mức sẵn sàng thi'), pctL: t('{p}% sẵn sàng', { p: pct }),
      days: days ? t('Còn {n} ngày đến kỳ thi', { n: days }) : '', hrs: t('~{h} giờ luyện còn lại', { h: Math.round(hrs * wl) }),
      empty: { title: t('Chưa có điểm ước tính'), body: t('Làm một bài thi thử để Lexkite ước tính điểm hiện tại, mức sẵn sàng và kỹ năng cần luyện.'), cta: ex === 'general' ? t('Làm bài kiểm tra trình độ') : t('Thi thử ngay'), href: MOCKH(ex) },
      skH: t('Chẩn đoán từng kỹ năng'), skills,
      drill: weakest ? { chip: t('{n} chọn cho bạn', { n: WHO }), title: t('Luyện {s} có trọng tâm', { s: weakest[2] }), body: t('Kỹ năng thấp nhất của bạn – luyện 5 phút mỗi ngày để kéo điểm tổng lên.'), cta: t('Bắt đầu luyện'), href: `#/skill/${weakest[0]}` } : null,
      mock: { chip: t('Đủ 4 kỹ năng'), title: next ? t('Thi thử tiếp theo: {date}', { date: next.toLocaleDateString(I18N.lang()) }) : t('Thi thử ngay tuần này để đo điểm'), sub: days ? t('Còn {n} ngày đến kỳ thi', { n: days }) : '', cta: t('Thi thử'), href: MOCKH(ex) } };
  }
  // ---------- Stitch v2.1 "Exam Readiness" (cờ ux1): khung TỰ SINH web/js/st/v2/exam-readiness.js (bind/exam-readiness.json); mọi class dưới đây viết nguyên văn từ khung → biên dịch qua V2DATA ----------
  const v2On = () => !!(window.ST2 && window.ST2['exam-readiness'] && App.ux1On && App.ux1On());
  // @icons headphones menu_book edit_note mic
  const SKI = { listening: 'headphones', reading: 'menu_book', writing: 'edit_note', speaking: 'mic' };
  const V = {
    card: 'relative p-[1rem] lt:bg-[#FFFFFF] lt:shadow-[0_4px_12px_rgba(16,25,27,0.04)] lt:[border:1.5px_solid_rgb(234,_222,_200)] lt:[border-radius:20px] dk:bg-[#142328] dk:rounded-[20px] dk:[border:2px_solid_#233942] dk:[box-shadow:0_5px_0_#0d1a1e]',
    lab: 'text-[11px] leading-[14px] uppercase tracking-wider font-extrabold lt:text-[#10191B] dk:text-[#EEF6F7]',
    h1: 'text-[22px] leading-[30px] tracking-[0em] font-bold lt:text-[#10191B] dk:text-[#EEF6F7]',
    body: 'text-[14px] leading-[20px] tracking-[0em] font-medium lt:text-[#4E5F62] dk:text-[#8FA9AF]',
    strong: 'text-[15px] leading-[20px] tracking-[0.01em] font-bold lt:text-[#10191B] dk:text-[#EEF6F7]',
    big: 'text-[36px] leading-[44px] tracking-tight font-extrabold lt:text-[#0D6964] dk:text-[#4FD1C5]',
    pill: 'inline-flex items-center px-2.5 py-1 rounded-[9999px] text-[11px] leading-[14px] tracking-[0.04em] font-bold lt:bg-[#f2f4f3] lt:text-[#0D6964] dk:bg-[#2BA39A]/15 dk:border dk:border-[#2BA39A]/30 dk:text-[#4FD1C5]',
    track: 'w-full h-2 rounded-[9999px] overflow-hidden lt:bg-[#e6e9e8] dk:bg-[#1A2C33]', fill: 'h-full rounded-[9999px] lt:bg-[#0D6964] dk:bg-[#2BA39A]',
    inp: 'w-full min-h-[44px] px-3 rounded-[0.75rem] text-[14px] leading-[20px] font-medium lt:bg-[#f2f4f3] lt:text-[#10191B] lt:[border:1.5px_solid_rgb(226,_232,_231)] dk:bg-[#0B171A] dk:text-[#EEF6F7] dk:[border:2px_solid_#233942] disabled:opacity-100',
    btn: 'w-full h-12 rounded-[9999px] text-[15px] leading-[20px] tracking-[0.01em] font-[700] flex items-center justify-center gap-2 cursor-pointer no-underline shadow-md bg-gradient-to-r from-[#F2553B] to-[#FF9E3B] border-[#B53A22] [color:#2A0700] [font-weight:800] lt:border-b-[4px] dk:border-b-[5px]',
    row: 'group relative p-3 min-h-[44px] flex flex-col gap-2 no-underline lt:bg-[#ffffff] lt:[border:1.5px_solid_rgb(226,_232,_231)] lt:[border-radius:20px] dk:bg-[#142328] dk:rounded-[20px] dk:[border:2px_solid_#233942]',
    lnk: 'inline-flex items-center min-h-[44px] text-[14px] leading-[20px] font-bold underline lt:text-[#0D6964] dk:text-[#4FD1C5]',
  };
  function v2Extra(o) {
    const { g, rdD, cur, hrs, gap, tg, wl, out, dow, has, mocks } = o, e = esc, ex = g.exam, lab = x => App.goalLabel({ exam: ex, target: x }), mhref = MOCKH(ex);
    const fld = (l, h) => `<label class="flex flex-col gap-1 min-w-0"><span class="${V.body}">${l}</span>${h}</label>`;
    const exams = Object.keys(SCALE).map(k => `<option value="${k}" ${ex === k ? 'selected' : ''}>${App.EXAMS ? e(App.EXAMS[k].name) : k}</option>`).join('');
    const plan = ex === 'toeic' ? t('{wl} tuần · cần tăng {gap} điểm', { wl, gap }) : ex === 'general' ? t('{wl} tuần · cần lên {gap} cấp CEFR', { wl, gap }) : t('{wl} tuần · cần tăng {gap} band', { wl, gap: gap.toFixed(1) });
    const items = Object.entries(tg).map(([k, v]) => { const [em, name, href] = LABEL()[k], done = out[k], p = Math.min(100, Math.round(done / v * 100));
      return `<a class="${V.row}" href="${href}"><div class="flex items-center justify-between gap-2"><span class="${V.strong}"><span data-noicon aria-hidden="true">${em}</span> ${e(name)}</span><span class="${V.pill}${p >= 100 ? ' font-extrabold' : ''}" dir="ltr">${done}/${v}</span></div><div class="${V.track}"><div class="${V.fill}" style="width:${p}%"></div></div></a>`; }).join('');
    return `<section class="${V.card}"><h1 class="${V.h1}">${t('Mục tiêu & kế hoạch học')}</h1><p class="${V.body} pt-1">${t('Nhập kỳ thi, điểm mục tiêu và ngày thi – Lexkite tính khối lượng cần học và chia chỉ tiêu từng tuần cho từng kỹ năng.')}</p></section>
<section class="${V.card}"><h2 class="${V.lab} pb-[0.5rem]">${t('Mục tiêu của bạn')}</h2>
  <div class="grid grid-cols-2 gap-3">${fld(t('Kỳ thi'), `<select class="${V.inp}" id="gExam">${exams}</select>`)}<span class="flex flex-col gap-1 min-w-0" id="gTargetF"><span class="${V.body}">${t('Điểm mục tiêu')}</span>${targetField(ex, g.target, V.inp)}</span>
  ${fld(t('Ngày thi'), `<input class="${V.inp}" id="gDate" type="date" value="${e(g.date)}">`)}${fld(t('Điểm hiện tại (ước tính)'), `<input class="${V.inp}" value="${e(lab(cur))}" disabled>`)}</div>
  <p class="${V.body} pt-[0.5rem]">${t('Điểm hiện tại lấy từ lần thi thử gần nhất (hoặc bài kiểm tra đầu vào).')} <a class="${V.lnk}" href="${mhref}">${ex === 'general' ? t('Làm bài kiểm tra đầu vào (5 phút)') + ' →' : t('Thi thử để cập nhật →')}</a></p>
  <div class="flex flex-col gap-2 pt-[0.5rem]"><button type="button" class="${V.btn}" id="gSave">${has ? t('Cập nhật kế hoạch') : t('Lập kế hoạch')}</button>${has ? `<a class="${V.lnk} justify-center" href="${pathFor(ex)}">${t('Tiếp tục học lộ trình của bạn →')}</a>` : ''}</div></section>
<section class="${V.card}"><h2 class="${V.lab}">${e(plan)}</h2><div class="${V.big} pt-1">${t('{hrs} giờ/tuần', { hrs })}</div>
  <p class="${V.body}">≈ ${t('{m} phút mỗi ngày.', { m: Math.round(hrs * 60 / 7) })} ${hrs >= SCALE[ex][4] ? t('Mục tiêu khá gấp – cân nhắc lùi ngày thi hoặc tăng thời gian học.') : t('Học đều mỗi ngày hiệu quả hơn học dồn cuối tuần.')}</p><p class="${V.body}">${e(rdD.hrs)}</p></section>
<section class="${V.card}"><div class="flex items-center justify-between gap-2 pb-[0.5rem]"><h2 class="${V.lab}">${t('Chỉ tiêu tuần này')}</h2><span class="${V.body}">${t('Hôm nay là ngày {d}/7 của tuần', { d: dow + 1 })}</span></div>
  <div class="grid grid-cols-1 gap-2">${items}</div><p class="${V.body} pt-[0.5rem]">${t('Số liệu tự cập nhật khi bạn học. Bấm từng mục để học ngay.')}</p></section>
<section class="${V.card}"><h2 class="${V.lab} pb-[0.5rem]">${t('Lịch thi thử gợi ý')}</h2><a class="${V.row}" href="${rdD.mock.href}"><span class="${V.strong}">${e(rdD.mock.title)}</span><span class="${V.body}">${e(rdD.mock.chip)}${rdD.mock.sub ? ' · ' + e(rdD.mock.sub) : ''}</span><span class="${V.lnk}">${e(rdD.mock.cta)} →</span></a>
  <div class="flex flex-wrap gap-2 pt-[0.5rem]">${mocks.map((d, i) => `<span class="${V.pill}">${t('Lần {n}: {date}', { n: i + 1, date: d.toLocaleDateString(I18N.lang()) })}</span>`).join('') || `<span class="${V.body}">${t('Thi thử ngay tuần này để đo điểm xuất phát.')}</span>`}</div>
  <p class="${V.body} pt-[0.5rem]">${t('Thi thử đều đặn giúp đo tiến bộ thật và điều chỉnh kế hoạch – điểm hiện tại và chỉ tiêu tuần sẽ tự tính lại sau mỗi lần thi.')}</p></section>`;
  }
  function v2Page(o) {
    const r = o.rdD, w = r.raw, lab = x => App.goalLabel({ exam: o.g.exam, target: x }), fr = x => Math.max(0, Math.min(1, (x - w.mn) / Math.max(.1, w.mx - w.mn))), P = f => [120 - 95 * Math.cos(Math.PI * f), 125 - 95 * Math.sin(Math.PI * f)];
    const f = r.real ? Math.max(.02, fr(w.cur)) : 0, [ax, ay] = P(f), [mxX, mxY] = P(fr(w.tg)), up = s => String(s).toLocaleUpperCase(I18N.lang());
    const skills = r.skills.map(s => ({ v: s.weak ? 'weak' : 'ok', href: s.href, icon: SKI[s.k] || 'edit_note', status: s.status, name: s.name, band: lab(s.v), top: lab(s.top), w: Math.max(4, Math.min(100, Math.round(s.v / s.top * 100))),
      gap: '-' + (w.toeic ? Math.max(0, Math.round(w.tg / 2 - s.v)) : Math.max(0, w.tg - s.v).toFixed(1)) + ' ' + r.gapL, al: `${s.name}: ${s.band} · ${s.status}${s.weak ? ' · ' + s.faLabel + ' ' + s.focus : ''}` }));
    let rec;
    if (r.drill) rec = { recL: r.drill.chip, recIcon: SKI[r.weakK] || 'mic', recTitle: r.drill.title, recBody: r.drill.body, btnText: r.drill.cta, btnTag: t('{n} phút', { n: 5 }), btnHref: r.drill.href };
    else if (r.real) rec = { recL: r.mock.chip, recIcon: 'edit_note', recTitle: r.mock.title, recBody: r.mock.sub || r.hrs, btnText: r.mock.cta, btnTag: '', btnHref: r.mock.href };
    else rec = { recL: r.empty.title, recIcon: 'edit_note', recTitle: r.empty.cta, recBody: r.empty.body, btnText: r.empty.cta, btnTag: '', btnHref: r.empty.href };
    const d = Object.assign({ real: r.real, readyChip: r.real ? r.pctL : r.readyL, days: r.days, tgChip: r.chip, cur: r.real ? r.cur : '–', of: lab(w.mx), mn: lab(w.mn), mx: lab(w.mx), target: r.target, sub: r.real ? r.readyL : r.empty.title,
      lProj: t('Dự báo tổng'), lMin: t('Tối thiểu'), lGoal: t('Mục tiêu'), lMax: t('Tối đa'), gaugeAria: `${r.readyL}: ${r.pctL}${r.real ? ' · ' + r.curL + ' ' + r.cur + ' / ' + r.target : ''}`,
      arc: `M 25 125 A 95 95 0 0 1 ${ax.toFixed(1)} ${ay.toFixed(1)}`, mxX: mxX.toFixed(1), mxY: mxY.toFixed(1), skills, extra: v2Extra(o) }, rec, { btnText: up(rec.btnText) });
    window.ST2.mount(view, 'exam-readiness', d, 'me');
  }
  function bindForm() {
    $('#gExam').onchange = e => { const ex = e.target.value, t2 = $('#gTarget'), [, mn, mx, df] = SCALE[ex], v = +t2.value >= mn && +t2.value <= mx && (ex === 'general') === (t2.tagName === 'SELECT') ? +t2.value : df; t2.outerHTML = targetField(ex, v, t2.className); };
    $('#gSave').onclick = async () => {
      const exam = $('#gExam').value, target = +$('#gTarget').value, date = $('#gDate').value;
      if (!date || new Date(date) < Date.now()) return toast(t('Chọn ngày thi trong tương lai'));
      const [, mn, mx] = SCALE[exam];
      if (!(target >= mn && target <= mx)) return toast(t('Điểm {exam} từ {a} đến {b}', { exam: NAME[exam], a: App.goalLabel({ exam, target: mn }), b: App.goalLabel({ exam, target: mx }) }));
      state.settings.goal = { exam, target, date, at: Date.now() }; state.settings.exam = exam; state.settings.examTarget = App.goalLabel({ exam, target }); await App.saveSettings();
      if (App.updateExamChip) App.updateExamChip();
      toast('🎯 ' + t('Đã lập kế hoạch! Kế hoạch hôm nay sẽ theo mục tiêu này.')); location.hash = pathFor(exam); // đặt mục tiêu xong → vào thẳng lộ trình
    };
  }
  routes.goal = App.guard(async function () {
    const w = App.W;
    const ex0 = SCALE[state.settings.exam] ? state.settings.exam : 'ielts', tg0 = ex0 === 'general' ? cefrN(state.settings.examTarget) : parseFloat(state.settings.examTarget);
    const g = goal() || { exam: ex0, target: tg0 >= SCALE[ex0][1] && tg0 <= SCALE[ex0][2] ? tg0 : SCALE[ex0][3], date: new Date(Date.now() + 120 * DAY).toISOString().slice(0, 10) };
    const cur = await w(current(g.exam));
    const { hrs, gap, t: tg } = weeklyTargets(g, cur), wl = weeksLeft(g), { out, dow } = thisWeek();
    const has = !!goal();
    const mocks = []; for (let w = 2; w <= wl; w += Math.max(2, Math.round(wl / 6))) mocks.push(new Date(Date.now() + w * 7 * DAY));
    const rdD = await w(readiness(g, cur, wl, hrs, mocks[0]));
    if (v2On()) { v2Page({ g, rdD, cur, hrs, gap, tg, wl, out, dow, has, mocks }); bindForm(); return; }
    const rd = ST.ready(rdD);
    view.innerHTML = `
${rd}
      <div class="page-head"><div><h1>🎯 ${t('Mục tiêu & kế hoạch học')}</h1><p class="muted">${t('Nhập kỳ thi, điểm mục tiêu và ngày thi – Lexkite tính khối lượng cần học và chia chỉ tiêu từng tuần cho từng kỹ năng.')}</p></div></div>
      
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
    bindForm();
  });
})();
