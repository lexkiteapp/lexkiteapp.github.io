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
  // Bố cục tính theo nội dung (độ dài chữ ước lượng, số hàng/cột) thay vì tọa độ cố định → không tràn khung, không đè chữ.
  // Màn hẹp (< 600 px) dùng khung 340 đơn vị + chú giải dưới biểu đồ để chữ không bị thu quá nhỏ.
  // Cổng CI scripts/test/figure-layout.mjs vẽ MỌI đề ở 360 px/1280 px × sáng/tối và chặn chồng/tràn/thiếu tương phản.
  const narrow = () => (window.innerWidth || 1024) < 600;
  const textW = (s, fs, bold) => String(s).length * fs * (bold ? 0.62 : 0.57);
  const wrapText = (s, maxW, fs, bold) => {
    const out = [];
    String(s).split(/\s+/).forEach(w => { const cur = out[out.length - 1]; if (cur != null && textW(cur + ' ' + w, fs, bold) <= maxW) out[out.length - 1] = cur + ' ' + w; else out.push(w); });
    return out;
  };
  const tspans = (lines, x, lh) => lines.map((l, i) => `<tspan x="${x}" dy="${i ? lh : 0}">${esc(l)}</tspan>`).join('');
  // Chữ trên nền màu: chọn mực tối hoặc trắng theo độ tương phản WCAG (trắng trên cam/xanh lá chỉ ~2–3:1)
  const lumOf = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0); };
  const INK = '#0b1220';
  const inkOn = hex => { const L = lumOf(hex), dark = (L + 0.05) / (lumOf(INK) + 0.05), white = 1.05 / (L + 0.05); return dark >= white ? INK : '#ffffff'; };
  // Khung trục + chú giải chung cho đường & cột; plot(x0, x1, ys) trả phần vẽ dữ liệu
  function axesChart(d, groups, plot) {
    const nw = narrow(), W = nw ? Math.max(300, Math.min(560, (window.innerWidth || 360) - 50)) : 640, L = 40, T = 24, LH = 13;
    const max = Math.ceil(Math.max(...d.series.flatMap(s => s[1])) / 10) * 10 || 10;
    const lgW = Math.max(...d.series.map(s => textW(s[0], 12, true))) + 22;
    // đường: điểm cuối nằm ngay mép phải → chừa nửa nhãn trục x cuối để không bị cắt
    const lastHalf = groups === d.x.length - 1 ? textW(d.x[d.x.length - 1], 11) / 2 + 4 : 0;
    const Rr = nw ? Math.max(12, lastHalf) : Math.min(240, Math.max(110, lgW + 18, lastHalf));
    const x1 = W - Rr, step = (x1 - L) / groups;
    const xl = d.x.map(x => wrapText(x, step - 6, 11));
    // Nhãn trục x chật (vd. 12 tháng trên điện thoại) → so le 2 hàng thay vì đè nhau; ước lượng dư 15 % cho font thật
    const stag = d.x.length > 2 && xl.some(l => l.some(t => textW(t, 11) * 1.15 > step - 4));
    const xLines = Math.max(...xl.map(l => l.length)) + (stag ? 1 : 0);
    // Chú giải: bên phải (rộng) hoặc thành hàng dưới trục (hẹp)
    const items = []; let lx = L, ly = 0;
    d.series.forEach(([name], si) => { const w = textW(name, 12, true) + 34; if (nw && lx + w > W - 8 && lx > L) { lx = L; ly++; } items.push([name, si, lx, ly]); lx += w; });
    const plotH = nw ? 190 : 230, axisB = T + plotH, B = 12 + xLines * LH;
    const H = axisB + B + (nw ? (ly + 1) * 20 + 6 : 0);
    const ys = v => T + plotH * (1 - v / max);
    let g = '';
    for (let k = 0; k <= 5; k++) { const v = max * k / 5; g += `<line x1="${L}" x2="${x1}" y1="${ys(v)}" y2="${ys(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${ys(v) + 4}" text-anchor="end" class="ch-ax">${Math.round(v)}</text>`; }
    g += plot(L, step, ys, xl, axisB, i => stag && i % 2 ? LH : 0);
    items.forEach(([name, si, ix, iy]) => {
      const x = nw ? ix : x1 + 12, y = nw ? axisB + B + 6 + iy * 20 : T + si * 22;
      g += `<rect x="${x}" y="${y}" width="12" height="12" rx="3" fill="${COLORS[si]}"/><text x="${x + 18}" y="${y + 11}" class="ch-lg">${esc(name)}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(d.title)}">${g}<text x="${L - 6}" y="12" class="ch-ax">${esc(d.unit)}</text></svg>`;
  }
  const xLabel = (lines, x, axisB) => `<text x="${x}" y="${axisB + 20}" text-anchor="middle" class="ch-ax">${tspans(lines, x, 13)}</text>`;
  function lineChart(d) {
    return axesChart(d, d.x.length - 1 || 1, (L, step, ys, xl, axisB, off) => {
      const xs = i => L + i * step; let g = '';
      d.x.forEach((x, i) => { g += xLabel(xl[i], xs(i), axisB + off(i)); });
      d.series.forEach(([name, vals], si) => {
        g += `<polyline fill="none" stroke="${COLORS[si]}" stroke-width="3" stroke-linejoin="round" points="${vals.map((v, i) => `${xs(i)},${ys(v)}`).join(' ')}"/>`;
        vals.forEach((v, i) => { g += `<circle cx="${xs(i)}" cy="${ys(v)}" r="4" fill="${COLORS[si]}"><title>${esc(name)} ${esc(d.x[i])}: ${v}</title></circle>`; });
      });
      return g;
    });
  }
  function barChart(d) {
    return axesChart(d, d.x.length, (L, gw, ys, xl, axisB, off) => {
      const bw = gw * 0.7 / d.series.length; let g = '';
      d.x.forEach((x, i) => {
        g += xLabel(xl[i], L + gw * i + gw / 2, axisB + off(i));
        d.series.forEach(([name, vals], si) => { const x0 = L + gw * i + gw * 0.15 + bw * si; g += `<rect x="${x0}" y="${ys(vals[i])}" width="${Math.max(1, bw - 2)}" height="${ys(0) - ys(vals[i])}" rx="3" fill="${COLORS[si]}"><title>${esc(name)} – ${esc(x)}: ${vals[i]}</title></rect>`; });
      });
      return g;
    });
  }
  function pieCharts(d) {
    const one = (label, parts) => {
      const tot = parts.reduce((a, p) => a + p[1], 0); let a0 = -Math.PI / 2, g = '', lb = '', prev = null;
      const p = (a, r) => `${100 + r * Math.cos(a)},${100 + r * Math.sin(a)}`;
      parts.forEach(([n, v], i) => {
        const a1 = a0 + v / tot * Math.PI * 2, large = a1 - a0 > Math.PI ? 1 : 0, c = COLORS[i % COLORS.length];
        g += `<path d="M100,100 L${p(a0, 90)} A90,90 0 ${large} 1 ${p(a1, 90)} Z" fill="${c}" stroke="var(--surface)" stroke-width="2"><title>${esc(n)}: ${v}%</title></path>`;
        // Số % nằm trong lát nếu cung đủ rộng; lát nhỏ → nhãn ngoài vòng tròn + vạch dẫn (kiểu đề thật), đẩy xa hơn nếu sát nhãn ngoài trước
        const am = (a0 + a1) / 2, w = textW(v + '%', 12, true);
        if ((a1 - a0) * 62 >= w + 12) lb += `<text x="${100 + 62 * Math.cos(am)}" y="${100 + 62 * Math.sin(am) + 4}" text-anchor="middle" class="ch-pie" style="fill:${inkOn(c)}">${v}%</text>`;
        else {
          let r = 108; const pos = rr => [100 + rr * Math.cos(am), 100 + rr * Math.sin(am)];
          if (prev && Math.hypot(pos(r)[0] - prev[0], pos(r)[1] - prev[1]) < 22) r = 126;
          const [x, y] = pos(r); prev = [x, y];
          lb += `<line x1="${p(am, 91).split(',')[0]}" y1="${p(am, 91).split(',')[1]}" x2="${100 + (r - 10) * Math.cos(am)}" y2="${100 + (r - 10) * Math.sin(am)}" stroke="var(--muted)" stroke-width="1"/><text x="${x}" y="${y + 4}" text-anchor="middle" class="ch-pie-o">${v}%</text>`;
        }
        a0 = a1;
      });
      return `<figure class="t1fig"><figcaption class="t1cap">${esc(label)}</figcaption><svg viewBox="-42 -42 284 284" class="t1pie" role="img" aria-label="${esc(label)}: ${esc(parts.map(([n, v]) => `${n} ${v}%`).join(', '))}">${g}${lb}</svg></figure>`;
    };
    const legend = d.pies[0][1].map(([n], i) => `<span class="row nowrap" style="gap:.3rem"><i style="width:12px;height:12px;border-radius:3px;background:${COLORS[i % COLORS.length]}"></i>${esc(n)}</span>`).join('');
    return `<div class="grid g2">${d.pies.map(([l, p]) => one(l, p)).join('')}</div><div class="row center small" style="gap:.4rem 1rem;flex-wrap:wrap">${legend}</div>`;
  }
  const tableChart = d => `<div style="overflow-x:auto"><table class="gtable"><thead><tr>${d.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${d.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const processChart = d => `<div class="proc">${d.steps.map((s, i) => `<div class="pstep"><span class="pnum">${i + 1}</span>${esc(s)}</div>`).join('<div class="parrow" aria-hidden="true">→</div>')}</div>`;
  // Bản đồ kiểu đề IELTS: năm là tiêu đề trên khung, đường là dải dọc giữa có tên xoay trong lòng đường,
  // khối 2 bên tính theo lưới (cột 1–2 | đường | cột 3–4, số hàng theo dữ liệu), nhãn tự xuống dòng trong khối.
  function mapChart(d) {
    const road = d.road || 'Main St';
    const VW = 300, FX = 3, TOP = 30, PAD = 10, RW = 28, GAP = 6, RH = 54, RG = 8, cx = VW / 2;
    const lx0 = FX + PAD, l1 = cx - RW / 2 - GAP, r0 = cx + RW / 2 + GAP, colW = (l1 - lx0 - GAP) / 2;
    const colX = c => c <= 2 ? lx0 + (c - 1) * (colW + GAP) : r0 + (c - 3) * (colW + GAP);
    const one = (label, blocks) => {
      const rows = Math.max(1, ...blocks.map(b => b[2] + b[4] - 1));
      const y0 = TOP + PAD, FH = PAD * 2 + rows * RH + (rows - 1) * RG, VH = TOP + FH + FX;
      let g = `<text x="${cx}" y="19" text-anchor="middle" class="ch-map-t">${esc(label)}</text><text x="${VW - FX}" y="19" text-anchor="end" class="ch-ax" aria-label="North">N ↑</text>
        <rect x="${FX}" y="${TOP}" width="${VW - FX * 2}" height="${FH}" rx="10" class="ch-map-f"/>
        <rect x="${cx - RW / 2}" y="${TOP + 1}" width="${RW}" height="${FH - 2}" class="ch-road"/>
        <text transform="translate(${cx} ${TOP + FH / 2}) rotate(-90)" text-anchor="middle" dominant-baseline="central" class="ch-road-t">${esc(road)}</text>`;
      blocks.forEach(([n, bx, by, bw, bh, c]) => {
        const end = Math.min(bx + bw - 1, bx <= 2 ? 2 : 4), x = colX(bx), w = colX(end) + colW - x;
        const y = y0 + (by - 1) * (RH + RG), h = bh * RH + (bh - 1) * RG;
        let fs = 11, lines = wrapText(n, w - 10, fs, true);
        if (lines.length * 13 > h - 8 || lines.some(l => textW(l, fs, true) > w - 10)) { fs = 10; lines = wrapText(n, w - 8, fs, true); }
        const lh = fs + 2, ty = y + h / 2 - (lines.length - 1) * lh / 2 + fs * 0.35;
        g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${c}"><title>${esc(n)}</title></rect><text x="${x + w / 2}" y="${ty}" text-anchor="middle" class="ch-map" style="fill:${inkOn(c)};font-size:${fs}px">${tspans(lines, x + w / 2, lh)}</text>`;
      });
      return `<svg viewBox="0 0 ${VW} ${VH}" class="t1map" role="img" aria-label="${esc(label)}: ${esc(blocks.map(b => b[0]).join(', '))}">${g}</svg>`;
    };
    return `<div class="grid g2">${d.maps.map(([l, b]) => one(l, b)).join('')}</div>`;
  }
  const DRAW = { line: lineChart, bar: barChart, pie: pieCharts, table: tableChart, process: processChart, map: mapChart };
  App.task1 = { SETS, draw: d => DRAW[d.type](d), score: (t, d) => score(t, d) };
  const TYPE_VI = () => ({ line: t('Biểu đồ đường'), bar: t('Biểu đồ cột'), pie: t('Biểu đồ tròn'), table: t('Bảng số liệu'), process: t('Quy trình'), map: t('Bản đồ') });

  let timer = null;
  routes.task1 = App.guard(async function (id) {
    const w = App.W;
    const d = SETS.find(x => x.id === id) || SETS[0];
    const drafts = await w(Store.get('task1Drafts', {}));
    view.innerHTML = `
      <div class="page-head"><div><h1>📈 Writing Task 1</h1><p class="muted">${t('Mô tả biểu đồ ≥150 từ trong 20 phút. Đề tự soạn – số liệu giả định để luyện tập.')} <a href="#/write">Task 2 →</a></p></div></div>
      <div class="tabs" style="margin-bottom:1rem">${SETS.map(x => `<button class="${x.id === d.id ? 'on' : ''}" data-set="${x.id}">${TYPE_VI()[x.type]} · ${esc(x.id)}</button>`).join('')}</div>
      <div class="grid" style="grid-template-columns:minmax(0,1fr) 300px;align-items:start" id="t1Grid">
        <div class="stack">
          <div class="card"><span class="chip lv">${TYPE_VI()[d.type]}</span><p style="font-weight:600;margin:.6rem 0 1rem">${esc(d.title)} Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</p>
            <div class="chart-wrap">${DRAW[d.type](d)}</div><div class="tiny muted" style="margin-top:.3rem">ℹ️ ${t('Dữ liệu minh họa (tự biên soạn)')}</div></div>
          <div class="card">
            <textarea class="input" id="t1" style="min-height:260px;font-size:1.02rem;line-height:1.7" placeholder="The ${d.type === 'map' ? 'maps illustrate' : d.type === 'process' ? 'diagram illustrates' : 'chart shows'}…">${esc(drafts[d.id] || '')}</textarea>
            <div class="row between" style="margin-top:.7rem"><div class="row"><b id="wc">${t('{n} từ', { n: 0 })}</b><span class="timer" id="clock" style="font-size:1rem">20:00</span><button class="btn sm" id="tBtn">⏱ ${t('Bấm giờ')}</button></div>
              <button class="btn primary" id="go" data-lk-primary>🔍 ${t('Phân tích bài Task 1')}</button></div>
          </div>
          <div id="t1Res"></div>
        </div>
        <div class="stack" style="position:sticky;top:80px">
          <div class="card"><h3>🧭 ${t('Cấu trúc 4 đoạn')}</h3><ol class="small" style="padding-left:1.1rem;line-height:1.7;margin:.3rem 0"><li>${t('<b>Mở bài:</b> viết lại đề (paraphrase).')}</li><li>${t('<b>Tổng quan:</b> 2 đặc điểm nổi bật nhất, không số liệu.')}</li><li>${t('<b>Thân bài 1:</b> nhóm số liệu thứ nhất + so sánh.')}</li><li>${t('<b>Thân bài 2:</b> nhóm còn lại + so sánh.')}</li></ol>
            ${(window.MODELS || []).some(m => m.id === 't1-' + d.id) ? `<a class="btn sm primary block" href="#/model/t1-${d.id}" style="margin:.4rem 0">📄 ${t('Bài mẫu band 8 có chú thích')}</a>` : ''}
            <details><summary class="small"><b>👀 ${t('Xem câu tổng quan mẫu')}</b></summary><div class="example-box small" style="margin-top:.4rem">${esc(d.overview)}</div></details></div>
          <div class="card"><h3>💡 ${t('Từ vựng cho {type}', { type: TYPE_VI()[d.type].toLowerCase() })}</h3><div class="row" style="margin-top:.4rem">${VOCAB[d.type].map(v => `<button class="chip" data-ins="${esc(v.split(' / ')[0].replace(/ \\(.*\\)/, ''))}" style="border:0;cursor:pointer">${esc(v.replace('(bị động)', t('(bị động)')))}</button>`).join('')}</div><div class="tiny muted" style="margin-top:.4rem">${t('Bấm để chèn vào bài')}</div></div>
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
  });

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
