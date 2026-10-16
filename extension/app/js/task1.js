/* Writing Task 1: biểu đồ tự vẽ (đường, cột, tròn, bảng, quy trình, bản đồ) từ số liệu giả định tự soạn,
 * gợi ý từ vựng theo dạng biểu đồ, câu tổng quan mẫu, bấm giờ 20 phút và phân tích bài viết riêng cho Task 1. */
(function () {
  const { $, $$, esc, toast } = UI;
  const { Store } = Core;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  const COLORS = ['#6d5dfc', '#0ea5a4', '#f59e0b', '#e5484d', '#16a34a', '#c026d3'];

  // Đề tự soạn – số liệu giả định dùng để luyện tập
  const SETS = [
    { id: 'energy', type: 'line', title: 'The line graph shows the percentage of households in one European country that used three main types of energy for heating between 1990 and 2020.',
      x: ['1990', '1995', '2000', '2005', '2010', '2015', '2020'], unit: '%',
      series: [['Gas', [62, 64, 61, 55, 48, 41, 35]], ['Electricity', [25, 24, 27, 30, 33, 34, 33]], ['Renewables', [3, 4, 6, 10, 15, 22, 31]]],
      overview: 'Overall, gas remained the most common heating source for most of the period, but its share fell steadily, while renewable energy rose dramatically and almost caught up with it by 2020.' },
    { id: 'leisure', type: 'bar', title: 'The bar chart compares the average number of hours per week that four age groups spent on three leisure activities in 2022.',
      x: ['16–24', '25–44', '45–64', '65+'], unit: 'hours',
      series: [['Social media', [14, 9, 5, 2]], ['Sport & exercise', [6, 4, 3, 4]], ['Reading', [2, 3, 5, 8]]],
      overview: 'Overall, younger people devoted far more time to social media than any other activity, whereas reading was the most popular pastime among the oldest group.' },
    { id: 'spending', type: 'pie', title: 'The pie charts illustrate how households in one country spent their income in 1980 and 2020.',
      pies: [['1980', [['Food', 35], ['Housing', 22], ['Transport', 12], ['Leisure', 8], ['Other', 23]]], ['2020', [['Food', 17], ['Housing', 34], ['Transport', 15], ['Leisure', 14], ['Other', 20]]]],
      overview: 'Overall, the biggest change was a shift from food to housing as the main expense, and the proportion spent on leisure almost doubled over the 40-year period.' },
    { id: 'students', type: 'table', title: 'The table shows the number of international students (in thousands) enrolled at universities in five countries in 2010, 2015 and 2020.',
      head: ['Country', '2010', '2015', '2020'], rows: [['Country A', 380, 430, 410], ['Country B', 250, 330, 450], ['Country C', 180, 210, 200], ['Country D', 90, 140, 260], ['Country E', 60, 55, 70]],
      overview: 'Overall, most countries attracted more international students over the decade, with Country B and Country D seeing the most significant growth, while Country E remained the least popular destination.' },
    { id: 'museums', type: 'line', title: 'The graph shows the number of visitors (in thousands) to three museums in a city between 2000 and 2020.',
      x: ['2000', '2004', '2008', '2012', '2016', '2020'], unit: 'thousand',
      series: [['History Museum', [120, 135, 150, 145, 160, 90]], ['Science Centre', [80, 110, 140, 175, 200, 120]], ['Art Gallery', [60, 58, 62, 70, 75, 40]]],
      overview: 'Overall, the Science Centre became the most visited attraction after 2008, and all three museums experienced a sharp drop in visitor numbers in the final year.' },
    { id: 'commute', type: 'bar', title: 'The chart shows the percentage of workers who commuted by car, public transport and bicycle in four cities in 2021.',
      x: ['City W', 'City X', 'City Y', 'City Z'], unit: '%',
      series: [['Car', [58, 32, 41, 20]], ['Public transport', [30, 55, 36, 45]], ['Bicycle', [12, 13, 23, 35]]],
      overview: 'Overall, cars were the dominant mode of transport in City W, public transport was most popular in City X, and cycling played a much larger role in City Z than elsewhere.' },
    { id: 'glass', type: 'process', title: 'The diagram shows how used glass bottles are recycled into new bottles.',
      steps: ['Used bottles are collected from recycling bins', 'Bottles are transported to a sorting plant', 'Glass is sorted by colour and cleaned', 'Glass is crushed into small pieces (cullet)', 'Cullet is melted in a furnace at about 1,500°C', 'Molten glass is shaped into new bottles', 'New bottles are filled and delivered to shops'],
      overview: 'Overall, the process consists of seven stages, beginning with the collection of used bottles and ending with new bottles being delivered to shops, so it is a continuous cycle.' },
    { id: 'town', type: 'map', title: 'The maps show the centre of a small town in 2000 and today.',
      maps: [['2000', [['Car park', 1, 1, 2, 1, '#94a3b8'], ['Shops', 3, 1, 2, 1, '#f59e0b'], ['Factory', 1, 2, 2, 2, '#64748b'], ['Park', 3, 2, 2, 2, '#16a34a']]],
             ['Today', [['Bus station', 1, 1, 2, 1, '#0ea5a4'], ['Shops', 3, 1, 2, 1, '#f59e0b'], ['Apartments', 1, 2, 2, 1, '#6d5dfc'], ['Cinema', 1, 3, 2, 1, '#c026d3'], ['Park', 3, 2, 2, 2, '#16a34a']]]],
      overview: 'Overall, the town centre has become more residential and better served by public transport, with the industrial area being replaced, while the park and shops have been retained.' },
  ];
  // Đề Task 1 bổ sung (js/write/*.js nạp trước): window.TASK1_MORE = [{ id, type, … }]
  (window.TASK1_MORE || []).forEach(d => { if (!SETS.some(x => x.id === d.id)) SETS.push(d); });
  const VOCAB = {
    line: ['rise / increase / grow', 'fall / decline / decrease', 'fluctuate', 'peak at', 'reach a low of', 'remain stable', 'level off', 'a dramatic surge', 'a steady decline', 'overtake'],
    bar: ['compared with', 'whereas / while', 'the highest / the lowest', 'twice as many as', 'considerably higher than', 'slightly lower than', 'by contrast', 'respectively'],
    pie: ['account for', 'make up', 'constitute', 'a quarter / a third', 'the largest proportion', 'the remaining', 'nearly half', 'doubled'],
    table: ['the figure for', 'rose from … to …', 'the most significant growth', 'remained the least', 'in terms of', 'by comparison', 'respectively'],
    process: ['First / Initially', 'Subsequently / After that', 'Once … is …, …', 'is collected / is transported (bị động)', 'The final stage is …', 'a continuous cycle'],
    map: ['was demolished', 'was replaced by', 'was converted into', 'has been built', 'to the north of', 'remained unchanged', 'was relocated'],
  };

  // ---------- Vẽ biểu đồ (SVG) ----------
  function lineChart(d) {
    const W = 640, H = 300, L = 46, B = 34, T = 14, Rr = 120;
    const max = Math.ceil(Math.max(...d.series.flatMap(s => s[1])) / 10) * 10 || 10;
    const xs = i => L + i * (W - L - Rr) / (d.x.length - 1), ys = v => T + (H - T - B) * (1 - v / max);
    let g = '';
    for (let k = 0; k <= 5; k++) { const v = max * k / 5; g += `<line x1="${L}" x2="${W - Rr}" y1="${ys(v)}" y2="${ys(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${ys(v) + 4}" text-anchor="end" class="ch-ax">${Math.round(v)}</text>`; }
    d.x.forEach((x, i) => { g += `<text x="${xs(i)}" y="${H - 12}" text-anchor="middle" class="ch-ax">${esc(x)}</text>`; });
    d.series.forEach(([name, vals], si) => {
      g += `<polyline fill="none" stroke="${COLORS[si]}" stroke-width="3" points="${vals.map((v, i) => `${xs(i)},${ys(v)}`).join(' ')}"/>`;
      vals.forEach((v, i) => { g += `<circle cx="${xs(i)}" cy="${ys(v)}" r="4" fill="${COLORS[si]}"><title>${esc(name)} ${esc(d.x[i])}: ${v}</title></circle>`; });
      g += `<rect x="${W - Rr + 12}" y="${T + si * 22}" width="12" height="12" rx="3" fill="${COLORS[si]}"/><text x="${W - Rr + 30}" y="${T + si * 22 + 11}" class="ch-lg">${esc(name)}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" class="chart">${g}<text x="${L}" y="10" class="ch-ax">${esc(d.unit)}</text></svg>`;
  }
  function barChart(d) {
    const W = 640, H = 300, L = 46, B = 34, T = 14, Rr = 140;
    const max = Math.ceil(Math.max(...d.series.flatMap(s => s[1])) / 10) * 10 || 10;
    const gw = (W - L - Rr) / d.x.length, bw = gw * 0.7 / d.series.length, ys = v => T + (H - T - B) * (1 - v / max);
    let g = '';
    for (let k = 0; k <= 5; k++) { const v = max * k / 5; g += `<line x1="${L}" x2="${W - Rr}" y1="${ys(v)}" y2="${ys(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${ys(v) + 4}" text-anchor="end" class="ch-ax">${Math.round(v)}</text>`; }
    d.x.forEach((x, i) => {
      g += `<text x="${L + gw * i + gw / 2}" y="${H - 12}" text-anchor="middle" class="ch-ax">${esc(x)}</text>`;
      d.series.forEach(([name, vals], si) => { const x0 = L + gw * i + gw * 0.15 + bw * si; g += `<rect x="${x0}" y="${ys(vals[i])}" width="${bw - 2}" height="${ys(0) - ys(vals[i])}" rx="3" fill="${COLORS[si]}"><title>${esc(name)} – ${esc(x)}: ${vals[i]}</title></rect>`; });
    });
    d.series.forEach(([name], si) => { g += `<rect x="${W - Rr + 12}" y="${T + si * 22}" width="12" height="12" rx="3" fill="${COLORS[si]}"/><text x="${W - Rr + 30}" y="${T + si * 22 + 11}" class="ch-lg">${esc(name)}</text>`; });
    return `<svg viewBox="0 0 ${W} ${H}" class="chart">${g}<text x="${L}" y="10" class="ch-ax">${esc(d.unit)}</text></svg>`;
  }
  function pieCharts(d) {
    const one = (label, parts) => {
      const tot = parts.reduce((a, p) => a + p[1], 0); let a0 = -Math.PI / 2, g = '';
      parts.forEach(([n, v], i) => {
        const a1 = a0 + v / tot * Math.PI * 2, large = a1 - a0 > Math.PI ? 1 : 0;
        const p = (a, r) => `${100 + r * Math.cos(a)},${100 + r * Math.sin(a)}`;
        g += `<path d="M100,100 L${p(a0, 90)} A90,90 0 ${large} 1 ${p(a1, 90)} Z" fill="${COLORS[i % COLORS.length]}" stroke="var(--surface)" stroke-width="2"><title>${esc(n)}: ${v}%</title></path>`;
        const am = (a0 + a1) / 2; g += `<text x="${100 + 60 * Math.cos(am)}" y="${100 + 60 * Math.sin(am) + 4}" text-anchor="middle" class="ch-pie">${v}%</text>`;
        a0 = a1;
      });
      return `<div style="text-align:center"><b>${esc(label)}</b><svg viewBox="0 0 200 200" style="width:100%;max-width:220px">${g}</svg></div>`;
    };
    const legend = d.pies[0][1].map(([n], i) => `<span class="row nowrap" style="gap:.3rem"><i style="width:12px;height:12px;border-radius:3px;background:${COLORS[i % COLORS.length]}"></i>${esc(n)}</span>`).join('');
    return `<div class="grid g2">${d.pies.map(([l, p]) => one(l, p)).join('')}</div><div class="row center small" style="gap:1rem">${legend}</div>`;
  }
  const tableChart = d => `<div style="overflow-x:auto"><table class="gtable"><thead><tr>${d.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${d.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const processChart = d => `<div class="proc">${d.steps.map((s, i) => `<div class="pstep"><span class="pnum">${i + 1}</span>${esc(s)}</div>`).join('<div class="parrow">→</div>')}</div>`;
  function mapChart(d) {
    const one = (label, blocks) => `<div style="text-align:center"><b>${esc(label)}</b><svg viewBox="0 0 220 180" style="width:100%;max-width:300px">
      <rect x="2" y="2" width="216" height="176" rx="10" fill="var(--surface-2)" stroke="var(--line)"/>
      <text x="110" y="14" text-anchor="middle" class="ch-ax">N ↑</text><line x1="110" y1="20" x2="110" y2="176" stroke="var(--line)" stroke-width="10"/><text x="114" y="170" class="ch-ax">Main St</text>
      ${blocks.map(([n, x, y, w, h, c]) => `<rect x="${(x - 1) * 54 + 8 + (x > 2 ? 14 : 0)}" y="${(y - 1) * 50 + 24}" width="${w * 54 - 14}" height="${h * 50 - 8}" rx="6" fill="${c}" opacity=".85"/><text x="${(x - 1) * 54 + 8 + (x > 2 ? 14 : 0) + (w * 54 - 14) / 2}" y="${(y - 1) * 50 + 24 + (h * 50 - 8) / 2 + 4}" text-anchor="middle" class="ch-map">${esc(n)}</text>`).join('')}</svg></div>`;
    return `<div class="grid g2">${d.maps.map(([l, b]) => one(l, b)).join('')}</div>`;
  }
  const DRAW = { line: lineChart, bar: barChart, pie: pieCharts, table: tableChart, process: processChart, map: mapChart };
  App.task1 = { SETS, draw: d => DRAW[d.type](d), score: (t, d) => score(t, d) };
  const TYPE_VI = { line: t('Biểu đồ đường'), bar: t('Biểu đồ cột'), pie: t('Biểu đồ tròn'), table: t('Bảng số liệu'), process: t('Quy trình'), map: t('Bản đồ') };

  let timer = null;
  routes.task1 = async function (id) {
    const d = SETS.find(x => x.id === id) || SETS[0];
    const drafts = await Store.get('task1Drafts', {});
    view.innerHTML = `
      <div class="page-head"><div><h1>📈 Writing Task 1</h1><p class="muted">${t('Mô tả biểu đồ ≥150 từ trong 20 phút. Đề tự soạn – số liệu giả định để luyện tập.')} <a href="#/write">Task 2 →</a></p></div></div>
      <div class="tabs" style="margin-bottom:1rem">${SETS.map(x => `<button class="${x.id === d.id ? 'on' : ''}" data-set="${x.id}">${TYPE_VI[x.type]} · ${esc(x.id)}</button>`).join('')}</div>
      <div class="grid" style="grid-template-columns:minmax(0,1fr) 300px;align-items:start" id="t1Grid">
        <div class="stack">
          <div class="card"><span class="chip lv">${TYPE_VI[d.type]}</span><p style="font-weight:600;margin:.6rem 0 1rem">${esc(d.title)} Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</p>
            <div class="chart-wrap">${DRAW[d.type](d)}</div><div class="tiny muted" style="margin-top:.3rem">ℹ️ ${t('Dữ liệu minh họa (tự biên soạn)')}</div></div>
          <div class="card">
            <textarea class="input" id="t1" style="min-height:260px;font-size:1.02rem;line-height:1.7" placeholder="The ${d.type === 'map' ? 'maps illustrate' : d.type === 'process' ? 'diagram illustrates' : 'chart shows'}…">${esc(drafts[d.id] || '')}</textarea>
            <div class="row between" style="margin-top:.7rem"><div class="row"><b id="wc">${t('{n} từ', { n: 0 })}</b><span class="timer" id="clock" style="font-size:1rem">20:00</span><button class="btn sm" id="tBtn">⏱ ${t('Bấm giờ')}</button></div>
              <button class="btn primary" id="go">🔍 ${t('Phân tích bài Task 1')}</button></div>
          </div>
          <div id="t1Res"></div>
        </div>
        <div class="stack" style="position:sticky;top:80px">
          <div class="card"><h3>🧭 ${t('Cấu trúc 4 đoạn')}</h3><ol class="small" style="padding-left:1.1rem;line-height:1.7;margin:.3rem 0"><li>${t('<b>Mở bài:</b> viết lại đề (paraphrase).')}</li><li>${t('<b>Tổng quan:</b> 2 đặc điểm nổi bật nhất, không số liệu.')}</li><li>${t('<b>Thân bài 1:</b> nhóm số liệu thứ nhất + so sánh.')}</li><li>${t('<b>Thân bài 2:</b> nhóm còn lại + so sánh.')}</li></ol>
            ${(window.MODELS || []).some(m => m.id === 't1-' + d.id) ? `<a class="btn sm primary block" href="#/model/t1-${d.id}" style="margin:.4rem 0">📄 ${t('Bài mẫu band 8 có chú thích')}</a>` : ''}
            <details><summary class="small"><b>👀 ${t('Xem câu tổng quan mẫu')}</b></summary><div class="example-box small" style="margin-top:.4rem">${esc(d.overview)}</div></details></div>
          <div class="card"><h3>💡 ${t('Từ vựng cho {type}', { type: TYPE_VI[d.type].toLowerCase() })}</h3><div class="row" style="margin-top:.4rem">${VOCAB[d.type].map(v => `<button class="chip" data-ins="${esc(v.split(' / ')[0].replace(/ \\(.*\\)/, ''))}" style="border:0;cursor:pointer">${esc(v.replace('(bị động)', t('(bị động)')))}</button>`).join('')}</div><div class="tiny muted" style="margin-top:.4rem">${t('Bấm để chèn vào bài')}</div></div>
          <div class="card"><h3>⚠️ ${t('Lưu ý')}</h3><ul class="small" style="padding-left:1.1rem;margin:.3rem 0;line-height:1.6"><li>${t('Không nêu ý kiến cá nhân (I think…).')}</li><li>${t('Thì động từ theo mốc thời gian của biểu đồ (quá khứ / hiện tại / dự đoán).')}</li><li>${t('Không cần mô tả mọi con số – chọn số liệu nổi bật.')}</li></ul></div>
        </div>
      </div>`;
    if (innerWidth < 900) $('#t1Grid').style.gridTemplateColumns = '1fr';
    $$('[data-set]').forEach(b => b.onclick = () => { location.hash = `#/task1/${b.dataset.set}`; });
    const ta = $('#t1');
    const count = () => { const n = (ta.value.match(/[A-Za-z][A-Za-z'’-]*/g) || []).length; $('#wc').textContent = t('{n} từ', { n }); $('#wc').style.color = n >= 150 ? 'var(--good)' : ''; };
    let saveT; ta.oninput = () => { count(); clearTimeout(saveT); saveT = setTimeout(async () => { const dr = await Store.get('task1Drafts', {}); dr[d.id] = ta.value; Store.set('task1Drafts', dr); }, 600); };
    count();
    $$('[data-ins]').forEach(b => b.onclick = () => { const s = ta.selectionStart, ins = b.dataset.ins + ' '; ta.value = ta.value.slice(0, s) + ins + ta.value.slice(ta.selectionEnd); ta.focus(); ta.selectionStart = ta.selectionEnd = s + ins.length; ta.oninput(); });
    let left = 20 * 60;
    clearInterval(timer); timer = null; App.cleanup = () => { clearInterval(timer); timer = null; };
    $('#tBtn').onclick = () => {
      if (timer) { clearInterval(timer); timer = null; $('#tBtn').textContent = `⏱ ${t('Tiếp tục')}`; return; }
      $('#tBtn').textContent = `⏸ ${t('Tạm dừng')}`;
      timer = setInterval(() => { left--; const el = $('#clock'); if (!el) return clearInterval(timer); el.textContent = `${String(Math.floor(Math.max(0, left) / 60)).padStart(2, '0')}:${String(Math.max(0, left) % 60).padStart(2, '0')}`; el.style.color = left < 180 ? 'var(--again)' : ''; if (left <= 0) { clearInterval(timer); timer = null; toast(`⏰ ${t('Hết 20 phút!')}`); } }, 1000);
    };
    $('#go').onclick = () => analyse(ta.value, d);
    if (window.Assist && $('#t1')) Assist.attach($('#t1'), $('#t1').parentElement);
  };

  // Chấm Task 1 (thuần, dùng chung cho Phòng viết & Thi thử 4 kỹ năng)
  function score(text, d) {
    const words = (text.match(/[A-Za-z][A-Za-z'’-]*/g) || []).length;
    const has = re => (text.match(re) || []).length;
    const overview = has(/\b(overall|in general|generally|it is clear that|it is evident that|as can be seen|in summary)\b/gi);
    const numbers = has(/\b\d+([.,]\d+)?\s?(%|per cent|percent|thousand|million|hours?)?/gi);
    const trend = has(/\b(increas|ris|rose|grow|grew|fell|fall|declin|decreas|drop|fluctuat|peak|plateau|level(l)?ed off|remain|surg|plummet|doubl|halv|overt(a|oo)k)\w*/gi);
    const compare = has(/\b(than|whereas|while|compared (to|with)|by contrast|in contrast|similarly|the highest|the lowest|the largest|the smallest|twice|respectively|in comparison)\b/gi);
    const opinion = has(/\b(I think|I believe|in my opinion|I feel)\b/gi);
    const passive = has(/\b(is|are|was|were|has been|have been)\s+\w+ed\b/gi);
    const paras = text.split(/\n\s*\n/).filter(p => p.trim()).length;
    const notes = [];
    if (words < 150) notes.push(t('Bài có <b>{n} từ</b> – Task 1 cần tối thiểu 150 từ.', { n: words }));
    if (!overview) notes.push(t('Thiếu <b>đoạn tổng quan</b> (Overall, …) – đây là yếu tố quan trọng nhất để đạt band 6+ Task Achievement.'));
    if (d.type !== 'process' && d.type !== 'map' && numbers < 4) notes.push(t('Dẫn chứng <b>số liệu cụ thể</b> nhiều hơn (ít nhất 4–6 con số tiêu biểu).'));
    if (['line', 'table', 'pie'].includes(d.type) && trend < 3) notes.push(t('Dùng thêm từ chỉ <b>xu hướng</b>: rose, declined, fluctuated, peaked at, remained stable…'));
    if (compare < 2 && d.type !== 'process') notes.push(t('Tăng <b>so sánh</b>: whereas, compared with, twice as…, the highest…'));
    if ((d.type === 'process' || d.type === 'map') && passive < 3) notes.push(d.type === 'process' ? t('Với quy trình, nên dùng nhiều <b>câu bị động</b>: is collected, was replaced by, has been built…') : t('Với bản đồ, nên dùng nhiều <b>câu bị động</b>: is collected, was replaced by, has been built…'));
    if (opinion) notes.push(t('Task 1 <b>không nêu ý kiến cá nhân</b> – bỏ “I think / In my opinion”.'));
    if (paras < 3) notes.push(t('Chia bài thành <b>3–4 đoạn</b> rõ ràng (mở bài, tổng quan, 2 thân bài).'));
    let score = 5;
    if (words >= 150) score += .5; if (overview) score += 1; if (numbers >= 4 || ['process', 'map'].includes(d.type)) score += .5;
    if (trend >= 3 || ['bar', 'map', 'process'].includes(d.type)) score += .5; if (compare >= 2) score += .5; if (paras >= 3) score += .5; if (opinion) score -= .5;
    let band = Math.max(4, Math.min(8, score));
    if (words < 100) band = Math.min(band, 4.5); else if (words < 150) band = Math.min(band, 5.5);
    if (!notes.length) notes.push(t('Bài có đủ các yếu tố chính của Task 1. Hãy tự kiểm tra lại độ chính xác của số liệu, ngữ pháp và chính tả.'));
    return { band, words, notes, overview, numbers, trend, compare };
  }
  function analyse(text, d) {
    const words = (text.match(/[A-Za-z][A-Za-z'’-]*/g) || []).length;
    if (words < 30) return toast(t('Hãy viết ít nhất vài câu (≥ 30 từ) để phân tích'));
    const { band, notes, overview, numbers, trend, compare } = score(text, d);
    $('#t1Res').innerHTML = `<div class="card stack">
      <div class="row nowrap" style="gap:1.2rem"><div class="score-ring" style="--p:${(band - 4) / 4 * 100};--c:${band >= 7 ? 'var(--good)' : band >= 6 ? 'var(--hard)' : 'var(--again)'}"><b>${band}</b></div>
        <div><h2 style="margin:0">${t('Task Achievement ước tính: {band}', { band })}</h2><div class="small muted">${t('Kiểm tra tự động các yếu tố bắt buộc của Task 1 – chỉ để tham khảo.')}</div></div></div>
      <div class="grid g4 stats">
        <div class="card stat" style="padding:.7rem"><div><b>${words}</b><span class="tiny muted">${t('Số từ')}</span></div></div>
        <div class="card stat" style="padding:.7rem"><div><b>${overview ? '✓' : '✗'}</b><span class="tiny muted">${t('Tổng quan')}</span></div></div>
        <div class="card stat" style="padding:.7rem"><div><b>${numbers}</b><span class="tiny muted">${t('Số liệu')}</span></div></div>
        <div class="card stat" style="padding:.7rem"><div><b>${trend + compare}</b><span class="tiny muted">${t('Xu hướng & so sánh')}</span></div></div>
      </div>
      <div><h3>📌 ${t('Nhận xét')}</h3><ul style="padding-left:1.2rem;margin:.3rem 0">${notes.map(n => `<li style="margin:.3rem 0">${n}</li>`).join('')}</ul></div>
      <div><h3>📝 ${t('Bài viết được tô sáng')}</h3><div class="passage hl-awl hl-link hl-mine" style="font-size:1rem">${Lexis.markText(text, { mine: w => App.inDeck(w) })}</div></div></div>`;
    if (window.AI) { const { overview: _ov, ...data } = d; AI.attach($('#t1Res'), () => ({ kind: 'task1', task: d.title, text, extra: JSON.stringify(data) })); }
    $('#t1Res').scrollIntoView({ behavior: 'smooth', block: 'start' });
    App.reward({ quizzes: 1, writes: 1, xp: 20 }, $('#go')); Sfx.win();
  }
})();
