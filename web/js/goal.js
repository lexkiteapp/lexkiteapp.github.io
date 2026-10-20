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

  routes.goal = async function () {
    const ex0 = SCALE[state.settings.exam] ? state.settings.exam : 'ielts', tg0 = ex0 === 'general' ? cefrN(state.settings.examTarget) : parseFloat(state.settings.examTarget);
    const g = goal() || { exam: ex0, target: tg0 >= SCALE[ex0][1] && tg0 <= SCALE[ex0][2] ? tg0 : SCALE[ex0][3], date: new Date(Date.now() + 120 * DAY).toISOString().slice(0, 10) };
    const cur = await current(g.exam);
    const { hrs, gap, t: tg } = weeklyTargets(g, cur), wl = weeksLeft(g), { out, dow } = thisWeek();
    const has = !!goal();
    const mocks = []; for (let w = 2; w <= wl; w += Math.max(2, Math.round(wl / 6))) mocks.push(new Date(Date.now() + w * 7 * DAY));
    view.innerHTML = `
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
          <button class="btn primary" id="gSave">${has ? t('Cập nhật kế hoạch') : t('Lập kế hoạch')}</button>
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
      toast('🎯 ' + t('Đã lập kế hoạch! Kế hoạch hôm nay sẽ theo mục tiêu này.')); routes.goal();
    };
  };
})();
