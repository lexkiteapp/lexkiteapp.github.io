/* Thi thử Reading trên máy tính (mô phỏng giao diện IELTS computer-delivered):
 * chia đôi màn hình, đồng hồ đếm ngược, bút dạ quang 3 màu, ghi chú, gạch loại trừ,
 * cờ xem lại & bộ lọc, thanh điều hướng số câu, Pacing Engine ước tính nhịp độ, chỉnh cỡ chữ. */
(function () {
  // CSS giao diện thi trên máy (chuyển từ style.css 25/10 – giữ khung app ≤377 KB gz); nạp 1 lần khi tải gói
  try { if (!document.getElementById('cbtCss')) { const st = document.createElement('style'); st.id = 'cbtCss'; st.textContent = `
.cbt { display: flex; flex-direction: column; height: 100vh; background: var(--bg); }
.cbt-top { display: flex; justify-content: space-between; align-items: center; gap: .6rem; padding: .55rem 1rem; background: var(--surface); border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.cbt-clock { font-weight: 800; font-variant-numeric: tabular-nums; padding: .3rem .7rem; border-radius: 10px; background: var(--surface-2); }
.cbt-clock.warn { background: var(--again-soft); color: var(--again-text); }
.cbt-body { flex: 1; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); min-height: 0; }
.cbt-pass, .cbt-qs { overflow-y: auto; padding: 1.2rem 1.5rem; line-height: 1.8; }
.cbt-pass { border-right: 4px solid var(--line); background: var(--surface); }
.cbt-q { padding: .8rem; border-radius: 12px; margin-bottom: .6rem; border: 2px solid transparent; }
.cbt-q.cur { border-color: var(--primary-soft); background: var(--surface); }
.cbt-opts { display: grid; gap: .5rem; margin-top: .5rem; }
.cbt-opt { display: flex; gap: .7rem; align-items: center; padding: .65rem .9rem; border-radius: 12px; border: 2px solid var(--line); border-bottom-width: 4px; background: var(--surface); cursor: pointer; font-weight: 500; box-shadow: 0 3px 0 color-mix(in srgb, var(--line) 75%, #000); transition: border-color .12s cubic-bezier(.2,.8,.4,1), background .12s cubic-bezier(.2,.8,.4,1), transform .12s cubic-bezier(.2,.8,.4,1), box-shadow .12s cubic-bezier(.2,.8,.4,1); user-select: none; }
@media (hover: hover) and (pointer: fine) { .cbt-opt:hover { border-color: var(--primary); background: var(--surface); box-shadow: 0 4px 12px rgba(0,0,0,.04); } }
.cbt-opt:active { transform: translateY(2px); border-bottom-width: 2.5px; box-shadow: 0 1px 0 color-mix(in srgb, var(--line) 75%, #000); }
.cbt-opt.sel, .cbt-opt:has(:checked) { border-color: var(--primary); background: var(--primary-soft); font-weight: 700; border-bottom-color: color-mix(in srgb, var(--primary) 70%, #000); box-shadow: 0 3px 0 color-mix(in srgb, var(--primary) 70%, #000); }
.cbt-opt.sel:active, .cbt-opt:has(:checked):active { transform: translateY(2px); box-shadow: 0 1px 0 color-mix(in srgb, var(--primary) 70%, #000); }
.cbt-opt .cbt-key { display: inline-grid; place-items: center; min-width: 26px; height: 26px; padding: 0 .25rem; border-radius: 7px; font-size: .82rem; font-weight: 800; border: 1.5px solid var(--line); border-bottom-width: 2.5px; background: var(--surface-2); color: var(--text); flex-shrink: 0; transition: all .12s ease; }
@media (hover: hover) and (pointer: fine) { .cbt-opt:hover .cbt-key { border-color: var(--primary); color: var(--primary); } }
.cbt-opt.sel .cbt-key, .cbt-opt:has(:checked) .cbt-key { background: var(--primary); color: var(--primary-ink); border-color: var(--primary); border-bottom-color: color-mix(in srgb, var(--primary) 70%, #000); }
.cbt-opt.struck { text-decoration: line-through; opacity: .5; filter: grayscale(.85); border-style: dashed; border-bottom-width: 2px; cursor: not-allowed; transform: none !important; }
.cbt-nav { display: flex; align-items: center; gap: .8rem; padding: .6rem 1rem; background: var(--surface); border-top: 1px solid var(--line); overflow-x: auto; scrollbar-width: thin; }
.cbt-part { display: flex; align-items: center; gap: .3rem; padding: .25rem .45rem; border-radius: 10px; background: var(--surface-2); }
.cbt-part.on { background: color-mix(in srgb, var(--primary) 14%, var(--surface-2)); }
.cbt-pbtn { border: 0; background: transparent; font-weight: 800; cursor: pointer; color: var(--text); margin-right: .2rem; }
.cbt-num { width: 34px; height: 34px; border-radius: 9px; cursor: pointer; font-weight: 700; font-size: .88rem; position: relative; display: inline-grid; place-items: center; transition: all .12s cubic-bezier(.2,.8,.4,1); touch-action: manipulation; }
.cbt-num:not(.done):not(.cur) { border: 1.5px dashed var(--muted); background: var(--surface); color: var(--muted); }
@media (hover: hover) and (pointer: fine) { .cbt-num:hover { transform: translateY(-2px); box-shadow: 0 3px 6px rgba(0,0,0,.08); } .cbt-num:not(.done):not(.cur):hover { border-color: var(--primary); color: var(--primary); background: var(--primary-soft); } }
.cbt-num:active { transform: translateY(0); }
.cbt-num.done { border: 1.5px solid var(--accent); background: var(--accent); color: #fff; box-shadow: 0 2px 4px color-mix(in srgb, var(--accent) 30%, transparent); }
.cbt-num.flag { border-color: var(--hard); background: var(--gold-soft); color: var(--text); }
.cbt-num.flag.done { background: var(--accent); color: #fff; border-color: var(--hard); }
.cbt-num.flag::after { content: "${UI.icon('flag')}"; position: absolute; top: -8px; right: -6px; font-size: .75rem; filter: drop-shadow(0 1px 2px rgba(0,0,0,.25)); }
.cbt-num.cur { outline: 2px solid var(--primary); outline-offset: 2px; font-weight: 800; }
mark.cbt-hl { background: #fde047; color: #111; cursor: pointer; border-radius: 3px; padding: 0 2px; }
.cbt-hlbtn { position: absolute; z-index: 60; }
@media (max-width: 900px) { .cbt-body { grid-template-columns: minmax(0, 1fr); } .cbt-pass { border-right: 0; border-bottom: 4px solid var(--line); max-height: 45vh; } }
`; document.head.appendChild(st); } } catch (e) { /* không có DOM (kiểm thử) */ }
  const { $, $$, esc, toast, shuffle } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  const R = () => window.READINGS || [];

  function ensureCss() {
    if (document.getElementById('cbt-ext-css')) return;
    const st = document.createElement('style');
    st.id = 'cbt-ext-css';
    st.textContent = `
      mark.cbt-hl { cursor: pointer; border-radius: 3px; padding: 0 2px; transition: background .12s ease; }
      mark.cbt-hl.cbt-hl-y { background: #fef08a; color: #1c1917; }
      mark.cbt-hl.cbt-hl-g { background: #bbf7d0; color: #14532d; }
      mark.cbt-hl.cbt-hl-p { background: #fbcfe8; color: #831843; }
      @media (prefers-color-scheme: dark) {
        :root:not([data-theme="light"]) mark.cbt-hl.cbt-hl-y { background: #854d0e; color: #fef08a; }
        :root:not([data-theme="light"]) mark.cbt-hl.cbt-hl-g { background: #14532d; color: #bbf7d0; }
        :root:not([data-theme="light"]) mark.cbt-hl.cbt-hl-p { background: #831843; color: #fbcfe8; }
      }
      :root[data-theme="dark"] mark.cbt-hl.cbt-hl-y { background: #854d0e; color: #fef08a; }
      :root[data-theme="dark"] mark.cbt-hl.cbt-hl-g { background: #14532d; color: #bbf7d0; }
      :root[data-theme="dark"] mark.cbt-hl.cbt-hl-p { background: #831843; color: #fbcfe8; }
      .cbt-hl-bar { position: absolute; z-index: 70; display: inline-flex; align-items: center; gap: .35rem; padding: .3rem .45rem; background: var(--surface); border: 1.5px solid var(--line); border-radius: 999px; box-shadow: 0 8px 24px rgba(0,0,0,.18); user-select: none; }
      .cbt-hl-dot { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #fff; cursor: pointer; transition: transform .12s ease; outline: 1.5px solid var(--line); outline-offset: 1px; }
      .cbt-hl-dot:hover { transform: scale(1.2); }
      .cbt-hl-dot.y { background: #fde047; }
      .cbt-hl-dot.g { background: #4ade80; }
      .cbt-hl-dot.p { background: #f472b6; }
      .cbt-hl-btn { border: 0; background: var(--surface-2); color: var(--text); padding: .25rem .55rem; border-radius: 999px; font-size: .78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: .25rem; transition: background .12s; }
      .cbt-hl-btn:hover { background: var(--line); }

      .cbt-note-badge { display: inline-grid; place-items: center; width: 19px; height: 19px; font-size: .72rem; vertical-align: super; cursor: pointer; margin-inline-start: 2px; border-radius: 4px; background: var(--gold-soft); border: 1px solid var(--hard); transition: transform .12s ease; user-select: none; }
      .cbt-note-badge:hover { transform: scale(1.22); }

      .cbt-strike-btn { margin-inline-start: auto; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--muted); width: 28px; height: 28px; border-radius: 8px; cursor: pointer; display: inline-grid; place-items: center; font-weight: 800; font-size: .82rem; transition: all .12s ease; flex-shrink: 0; text-decoration: none; }
      @media (hover: hover) and (pointer: fine) {
        .cbt-opt:hover .cbt-strike-btn { border-color: var(--primary); color: var(--text); }
        .cbt-strike-btn:hover { background: var(--again-soft); color: var(--again-text); border-color: var(--again); }
      }
      .cbt-opt.struck .cbt-strike-btn { background: var(--again-soft); color: var(--again-text); border-color: var(--again); }

      .cbt-flag-btn { border: 1.5px solid var(--line); background: var(--surface-2); color: var(--muted); padding: .25rem .55rem; border-radius: 8px; font-size: .8rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: .3rem; transition: all .12s ease; }
      .cbt-flag-btn:hover, .cbt-flag-btn.on { border-color: var(--hard); background: var(--gold-soft); color: var(--text); }

      .cbt-filter-bar { display: inline-flex; align-items: center; gap: .3rem; margin-inline-start: auto; flex-wrap: wrap; }
      .cbt-filter-chip { border: 1.5px solid var(--line); background: var(--surface-2); color: var(--muted); padding: .2rem .55rem; border-radius: 999px; font-size: .78rem; font-weight: 700; cursor: pointer; transition: all .12s ease; }
      .cbt-filter-chip:hover { border-color: var(--primary); color: var(--text); }
      .cbt-filter-chip.on { border-color: var(--primary); background: var(--primary-soft); color: var(--primary); }
      .cbt-filter-flag.on { border-color: var(--hard); background: var(--gold-soft); color: var(--text); }
      .cbt-dim { opacity: .28 !important; }

      .cbt-pacing-chip { display: inline-flex; align-items: center; gap: .35rem; padding: .3rem .65rem; border-radius: 10px; font-weight: 800; font-size: .82rem; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--text); cursor: pointer; transition: all .12s ease; }
      .cbt-pacing-chip.on-track { border-color: color-mix(in srgb, var(--good) 45%, transparent); background: var(--good-soft); color: var(--good-text); }
      .cbt-pacing-chip.behind { border-color: color-mix(in srgb, var(--hard) 45%, transparent); background: var(--gold-soft); color: var(--text); }
      .cbt-pacing-chip.slow { border-color: color-mix(in srgb, var(--again) 45%, transparent); background: var(--again-soft); color: var(--again-text); }
      .cbt-pacing-pop { position: absolute; top: calc(100% + 8px); inset-inline-end: 1rem; z-index: 85; min-width: min(280px, calc(100vw - 2rem)); max-width: calc(100vw - 2rem); padding: .85rem 1rem; border-radius: 14px; background: var(--surface); border: 1.5px solid var(--line); box-shadow: 0 12px 32px rgba(0,0,0,.22); font-size: .88rem; line-height: 1.6; }
      @media (hover: none) { .cbt-strike-btn { width: 36px; height: 36px; } .cbt-hl-dot { width: 30px; height: 30px; } }
      @media (prefers-reduced-motion: reduce) { .cbt-hl-dot:hover, .cbt-note-badge:hover { transform: none; } }
    `;
    document.head.appendChild(st);
  }

  routes.cbt = function (arg) {
    if (arg) return exam(arg.split(','));
    const rs = R();
    const full = ['B1', 'B2', 'C1'].map(l => (shuffle(rs.filter(r => r.level === l))[0] || {}).id).filter(Boolean);
    view.innerHTML = `
      <div class="page-head"><div><h1>🖥️ ${t('Thi thử Reading trên máy tính')}</h1><p class="muted">${t('Làm quen giao diện thi IELTS trên máy: đồng hồ đếm ngược, tô sáng văn bản, đánh dấu câu cần xem lại và thanh điều hướng câu hỏi.')}</p></div></div>
      <div class="grid g2">
        <a class="card hover" href="#/cbt/${full.join(',')}" style="color:var(--text)"><div style="font-size:2.4rem">${UI.icon('flag')}</div><h2>${t('Bài thi đầy đủ · 3 passage')}</h2><p class="muted">${t('60 phút · {n} câu · độ khó tăng dần B1 → B2 → C1', { n: full.length * 5 })}</p><span class="btn primary">${t('Bắt đầu thi')} →</span></a>
        <div class="card"><h3>📌 ${t('Mẹo thi trên máy')}</h3><ul class="small" style="padding-left:1.1rem;line-height:1.8"><li>${t('<b>Bôi đen</b> từ khóa trong bài rồi bấm “Tô sáng” – giống bút highlight trên giấy.')}</li><li>${t('Tích <b>“Xem lại”</b> cho câu chưa chắc, cuối giờ bấm vào số câu có cờ 🚩 để quay lại.')}</li><li>${t('Không bị trừ điểm khi sai – <b>đừng bỏ trống</b> câu nào.')}</li><li>${t('Phân bổ ~20 phút cho mỗi passage; passage 3 thường khó nhất.')}</li></ul></div>
      </div>
      <div class="section-title"><h2>${t('Luyện từng passage (20 phút)')}</h2></div>
      <div class="grid auto">${rs.map(r => `<a class="card hover topic-card" href="#/cbt/${r.id}" style="color:var(--text)"><div class="row between"><span class="em">${r.emoji}</span><span class="chip lv ${esc(r.level)}">${esc(r.level)}</span></div><h3>${esc(r.title)}</h3><div class="muted small">${t('{n} câu · 20 phút', { n: r.questions.length })}</div></a>`).join('')}</div>`;
  };

  function exam(ids) {
    ensureCss();
    const rs = ids.map(id => R().find(r => r.id === id)).filter(Boolean);
    if (!rs.length) return routes.cbt();
    const qs = rs.flatMap((r, pi) => r.questions.map((q, qi) => ({ ...q, pi, r })));
    const total = rs.length * 20 * 60;
    let left = total, cur = 0, fs = 1, hideClock = false, part = 0;
    let navFilter = 'all'; // 'all' | 'todo' | 'flag'
    let showPacingPop = false;
    const ans = {}, flag = {}, passHl = {};
    document.body.classList.add('bare', 'cbt-mode');
    let tick = null;

    const onKey = e => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target && e.target.tagName) || '';
      if (e.repeat || (e.target && e.target.isContentEditable)) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) && e.target.type !== 'radio' && e.target.type !== 'checkbox') return;
      if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        flag[cur] = !flag[cur];
        drawQs();
        drawNav();
      }
    };
    document.addEventListener('keydown', onKey);
    let onDocClick = null, onSelChange = null, selT = 0;

    App.cleanup = () => {
      clearInterval(tick); clearTimeout(selT);
      document.removeEventListener('keydown', onKey);
      if (onDocClick) document.removeEventListener('click', onDocClick);
      if (onSelChange) document.removeEventListener('selectionchange', onSelChange);
      document.body.classList.remove('bare', 'cbt-mode');
      window.onbeforeunload = null;
    };
    window.onbeforeunload = () => t('Bạn đang làm bài thi – rời trang sẽ mất kết quả.');

    view.innerHTML = `
      <div class="cbt">
        <header class="cbt-top" style="position:relative">
          <div class="row nowrap"><img src="icons/icon.svg" alt="" style="width:28px;height:28px;border-radius:8px"><b>Lexkite</b><span class="tiny muted">IELTS Reading · ${t('Mô phỏng thi trên máy')}</span></div>
          <div class="row nowrap">
            <button class="cbt-pacing-chip on-track" id="pacingChip" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="pacingPop" title="${t('Ước tính nhịp độ làm bài (bấm để xem chi tiết)')}">${UI.icon('zap')} <span>${t('Đúng tiến độ (ước tính)')}</span></button>
            <span class="cbt-clock" id="clock"></span>
            <button class="btn sm" id="hideC" type="button">${t('Ẩn giờ')}</button>
            <button class="btn sm" id="fsDown" type="button" title="${t('Giảm cỡ chữ')}">A−</button>
            <button class="btn sm" id="fsUp" type="button" title="${t('Tăng cỡ chữ')}">A+</button>
            <button class="btn sm primary" id="submit" type="button">${t('Nộp bài')}</button>
          </div>
          <div class="cbt-pacing-pop" id="pacingPop" role="dialog" aria-label="${t('Ước tính nhịp độ làm bài')}" hidden></div>
        </header>
        <div class="cbt-body">
          <section class="cbt-pass" id="pass"></section>
          <section class="cbt-qs" id="qs"></section>
        </div>
        <footer class="cbt-nav" id="nav"></footer>
        <div class="cbt-hl-bar" id="hlBar" hidden role="toolbar" aria-label="${t('Công cụ tô sáng & ghi chú')}">
          <button type="button" class="cbt-hl-dot y" data-c="y" title="${t('Tô sáng vàng (Từ khóa)')}" aria-label="${t('Tô sáng vàng')}"></button>
          <button type="button" class="cbt-hl-dot g" data-c="g" title="${t('Tô sáng xanh (Bằng chứng)')}" aria-label="${t('Tô sáng xanh')}"></button>
          <button type="button" class="cbt-hl-dot p" data-c="p" title="${t('Tô sáng hồng (Bẫy/Mâu thuẫn)')}" aria-label="${t('Tô sáng hồng')}"></button>
          <button type="button" class="cbt-hl-btn" data-act="note">${UI.icon('file-pen')} ${t('Ghi chú')}</button>
          <button type="button" class="cbt-hl-btn" data-act="clear">🗑️ ${t('Xóa')}</button>
        </div>
      </div>`;

    if (window.ChoiceKit) {
      ChoiceKit.attach($('.cbt'), { key: 'cbt:' + rs.map(r => r.id || r.title).join('|') });
      ChoiceKit.split($('.cbt-body'), $('#pass'), 'cbt-split');
    }

    const drawPassage = () => {
      const r = rs[part];
      if (passHl[r.id]) {
        $('#pass').innerHTML = passHl[r.id];
      } else {
        $('#pass').innerHTML = `<div class="tiny muted" style="font-weight:800">PASSAGE ${part + 1}</div><h2>${esc(r.title)}</h2>${r.text.split(/\n\s*\n/).map(p => `<p>${esc(p)}</p>`).join('')}`;
      }
      $('#pass').style.fontSize = (1.02 * fs) + 'rem';
      $('#qs').style.fontSize = (0.98 * fs) + 'rem';
    };

    const drawQs = () => {
      const list = qs.map((q, i) => ({ q, i })).filter(x => x.q.pi === part);
      $('#qs').innerHTML = `<div class="tiny muted" style="font-weight:800">${t('CÂU {a}–{b}', { a: list[0].i + 1, b: list[list.length - 1].i + 1 })}</div>
        <p class="small muted">${list.some(x => x.q.type === 'tfng') ? t('Các câu True/False/Not Given: chọn TRUE nếu khớp thông tin, FALSE nếu trái ngược, NOT GIVEN nếu bài không đề cập.') : ''}</p>
        ${list.map(({ q, i }) => `<div class="cbt-q ${i === cur ? 'cur' : ''}" id="q${i}">
          <div class="row between">
            <b>${i + 1}. ${esc(q.q)}</b>
            <button type="button" class="cbt-flag-btn ${flag[i] ? 'on' : ''}" data-flag="${i}" aria-pressed="${!!flag[i]}" title="${t('Đánh dấu để xem lại sau (Phím F)')}">${UI.icon('flag')} <span>${t('Xem lại')}</span></button>
          </div>
          <div class="cbt-opts">${(q.type === 'tfng' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : q.options).map((o, k) => {
            const v = q.type === 'tfng' ? o : String(k);
            const keyChar = q.type === 'mcq' ? String.fromCharCode(65 + k) : (k + 1);
            return `<label class="cbt-opt ${ans[i] === v ? 'sel' : ''}">
              <input type="radio" name="q${i}" value="${esc(v)}" ${ans[i] === v ? 'checked' : ''}>
              <b class="cbt-key">${keyChar}</b>
              <span class="cbt-txt">${esc(o)}</span>
              <button type="button" class="cbt-strike-btn" data-strike="1" aria-pressed="false" title="${t('Gạch loại trừ (Alt+{k})', { k: keyChar })}" aria-label="${t('Gạch loại trừ')}"><s>S</s></button>
            </label>`;
          }).join('')}</div></div>`).join('')}`;

      $$('#qs input[type=radio]').forEach(inp => inp.onchange = () => {
        const i = +inp.name.slice(1);
        ans[i] = inp.value;
        cur = i;
        drawQs();
        drawNav();
        updatePacing();
      });
      $$('[data-flag]').forEach(b => b.onclick = (e) => {
        e.preventDefault();
        const i = +b.dataset.flag;
        flag[i] = !flag[i];
        drawQs();
        drawNav();
      });
    };

    const drawNav = () => {
      const answeredCount = Object.keys(ans).length;
      const missingCount = qs.length - answeredCount;
      const flagCount = Object.values(flag).filter(Boolean).length;

      $('#nav').innerHTML = rs.map((r, pi) => `<div class="cbt-part ${pi === part ? 'on' : ''}"><button type="button" class="cbt-pbtn" data-part="${pi}">Part ${pi + 1}</button>
        ${qs.map((q, i) => {
          if (q.pi !== pi) return '';
          const isDone = ans[i] != null;
          const isFlag = !!flag[i];
          const isCur = i === cur;
          const isDim = (navFilter === 'todo' && isDone && !isFlag) || (navFilter === 'flag' && !isFlag);
          return `<button type="button" class="cbt-num ${isDone ? 'done' : ''} ${isFlag ? 'flag' : ''} ${isCur ? 'cur' : ''} ${isDim ? 'cbt-dim' : ''}" data-go="${i}">${i + 1}</button>`;
        }).join('')}</div>`).join('')
        + `<div class="cbt-filter-bar">
          <button type="button" class="cbt-filter-chip ${navFilter === 'all' ? 'on' : ''}" data-filter="all" aria-pressed="${navFilter === 'all'}">${t('Tất cả')}</button>
          <button type="button" class="cbt-filter-chip ${navFilter === 'todo' ? 'on' : ''}" data-filter="todo" aria-pressed="${navFilter === 'todo'}">${t('Chưa làm ({n})', { n: missingCount })}</button>
          <button type="button" class="cbt-filter-chip cbt-filter-flag ${navFilter === 'flag' ? 'on' : ''}" data-filter="flag" aria-pressed="${navFilter === 'flag'}">${UI.icon('flag')} ${t('Xem lại ({n})', { n: flagCount })}</button>
        </div>`;

      $$('[data-part]').forEach(b => b.onclick = () => {
        part = +b.dataset.part;
        cur = qs.findIndex(q => q.pi === part);
        drawPassage(); drawQs(); drawNav();
      });
      $$('[data-go]').forEach(b => b.onclick = () => {
        cur = +b.dataset.go;
        if (qs[cur].pi !== part) { part = qs[cur].pi; drawPassage(); }
        drawQs(); drawNav();
        const el = $(`#q${cur}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      $$('[data-filter]').forEach(b => b.onclick = () => {
        navFilter = b.dataset.filter;
        drawNav();
      });
    };

    function computePacing() {
      const answered = Object.keys(ans).length;
      const used = total - Math.max(0, left);
      const targetSec = Math.max(10, Math.round(total / qs.length));
      const actualSec = answered > 0 ? Math.round(used / answered) : targetSec;
      const expected = Math.floor(used / targetSec);
      const diff = answered - expected;
      const remainSec = Math.round((qs.length - answered) * actualSec);
      const delta = left - remainSec;

      let status = 'on-track', label = t('Đúng tiến độ (ước tính)');
      if (diff < -2 || delta < -180) {
        status = 'slow';
        const m = Math.max(1, Math.ceil(Math.abs(delta) / 60));
        label = t('Chậm ~{m}p (ước tính)', { m });
      } else if (diff < 0 || delta < -60) {
        status = 'behind';
        label = t('Hơi chậm (ước tính)');
      }
      return { answered, totalQs: qs.length, used, targetSec, actualSec, delta, status, label };
    }

    function updatePacing() {
      const chip = $('#pacingChip');
      if (!chip) return;
      const p = computePacing();
      if (chip.dataset.l !== p.status + p.label) {
        chip.dataset.l = p.status + p.label;
        chip.className = `cbt-pacing-chip ${p.status}`;
        chip.innerHTML = `${UI.icon('zap')} <span>${esc(p.label)}</span>`;
      }

      const pop = $('#pacingPop');
      if (pop && !pop.hidden) renderPacingPop(p);
    }

    function renderPacingPop(p) {
      const pop = $('#pacingPop');
      if (!pop) return;
      pop.innerHTML = `
        <div class="row between" style="margin-bottom:.5rem">
          <b>${UI.icon('zap')} ${t('Ước tính nhịp độ làm bài')}</b>
          <button type="button" class="btn sm" id="closePacingPop" style="padding:2px 8px;font-size:.78rem">${t('Đóng')}</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:.6rem">
          <div class="card" style="padding:.5rem;margin:0"><div class="tiny muted">${t('Nhịp độ chuẩn')}</div><b>${p.targetSec} ${t('s / câu')}</b></div>
          <div class="card" style="padding:.5rem;margin:0"><div class="tiny muted">${t('Tốc độ thực tế')}</div><b>${p.actualSec} ${t('s / câu')}</b></div>
        </div>
        <div class="small" style="line-height:1.7">
          <div>${UI.icon('chart-column')} ${t('Tiến độ')}: <b>${p.answered}/${p.totalQs}</b></div>
          <div>${UI.icon('hourglass')} ${t('Dự kiến hoàn thành')}: <b>${p.delta >= 0 ? t('Dư khoảng {m} phút (ước tính)', { m: Math.max(0, Math.round(p.delta / 60)) }) : t('Thiếu khoảng {m} phút (ước tính)', { m: Math.ceil(Math.abs(p.delta) / 60) })}</b></div>
        </div>
        <div class="tiny muted" style="margin-top:.5rem;border-top:1px dashed var(--line);padding-top:.4rem">*${t('Các chỉ số mang tính ước tính nhằm hỗ trợ phân bổ thời gian thi.')}</div>`;
      $('#closePacingPop').onclick = () => { pop.hidden = true; showPacingPop = false; $('#pacingChip').setAttribute('aria-expanded', 'false'); };
    }

    $('#pacingChip').onclick = (e) => {
      e.stopPropagation();
      showPacingPop = !showPacingPop;
      const pop = $('#pacingPop');
      pop.hidden = !showPacingPop;
      $('#pacingChip').setAttribute('aria-expanded', String(showPacingPop));
      if (showPacingPop) renderPacingPop(computePacing());
    };
    onDocClick = (e) => {
      if (!e.target.closest || (!e.target.closest('#pacingPop') && !e.target.closest('#pacingChip'))) {
        const pop = $('#pacingPop');
        if (pop && !pop.hidden) { pop.hidden = true; showPacingPop = false; $('#pacingChip').setAttribute('aria-expanded', 'false'); }
      }
    };
    document.addEventListener('click', onDocClick);

    const clock = () => {
      const el = $('#clock'); if (!el) return;
      const m = Math.floor(Math.max(0, left) / 60), s = Math.max(0, left) % 60;
      el.textContent = hideClock ? '⏱ ··:··' : `⏱ ${t('{m} phút {s}', { m, s: String(s).padStart(2, '0') })}`;
      el.classList.toggle('warn', left <= 300);
      updatePacing();
    };

    drawPassage(); drawQs(); drawNav(); clock();
    tick = setInterval(() => {
      left--; clock();
      if (left === 300) toast('⏰ ' + t('Còn 5 phút!'));
      if (left <= 0) { clearInterval(tick); submit(true); }
    }, 1000);

    $('#hideC').onclick = () => { hideClock = !hideClock; $('#hideC').textContent = hideClock ? t('Hiện giờ') : t('Ẩn giờ'); clock(); };
    $('#fsUp').onclick = () => { fs = Math.min(1.5, fs + .1); drawPassage(); drawQs(); };
    $('#fsDown').onclick = () => { fs = Math.max(.8, fs - .1); drawPassage(); drawQs(); };

    // Tô sáng văn bản 3 màu & Ghi chú (Highlighter & Sticky Notes)
    const hlBar = $('#hlBar');
    let activeMark = null;

    const updateHlBarPosition = (rect) => {
      hlBar.style.left = Math.max(10, Math.min(window.innerWidth - 240, rect.left + rect.width / 2 - 110)) + 'px';
      const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
      hlBar.style.top = (coarse ? rect.bottom + 12 + window.scrollY : Math.max(10, rect.top - 46 + window.scrollY)) + 'px';
      hlBar.hidden = false;
    };

    const showForSel = () => {
      const sel = getSelection(), pass = $('#pass');
      if (!pass) return;
      if (!sel || sel.isCollapsed || !sel.rangeCount || !pass.contains(sel.anchorNode)) {
        if (!activeMark) hlBar.hidden = true;
        return;
      }
      activeMark = null;
      updateHlBarPosition(sel.getRangeAt(0).getBoundingClientRect());
    };
    $('.cbt-body').addEventListener('mouseup', () => setTimeout(showForSel, 15));
    // Cảm ứng (iOS/Android): bôi đen bằng nhấn giữ + kéo tay cầm không bắn mouseup → nghe selectionchange (debounce)
    onSelChange = () => { clearTimeout(selT); selT = setTimeout(() => { const s = getSelection(); if (s && !s.isCollapsed) showForSel(); }, 350); };
    document.addEventListener('selectionchange', onSelChange);

    $('.cbt-body').addEventListener('click', e => {
      const badge = e.target.closest('.cbt-note-badge');
      if (badge) {
        const curNote = badge.dataset.note || '';
        const newNote = prompt(t('Ghi chú'), curNote);
        if (newNote === null) return;
        if (!newNote.trim()) badge.remove();
        else {
          badge.dataset.note = newNote.trim();
          badge.title = t('Ghi chú: {n}', { n: newNote.trim() });
        }
        if (rs[part]) passHl[rs[part].id] = $('#pass').innerHTML;
        return;
      }
      const m = e.target.closest('mark.cbt-hl');
      if (m && getSelection().isCollapsed) {
        activeMark = m;
        updateHlBarPosition(m.getBoundingClientRect());
        return;
      }
      if (!e.target.closest('#hlBar')) {
        activeMark = null;
        hlBar.hidden = true;
      }
    });

    hlBar.addEventListener('pointerdown', e => e.preventDefault()); // giữ vùng bôi đen khi bấm nút (iOS)
    hlBar.onclick = e => {
      const dot = e.target.closest('.cbt-hl-dot');
      const act = e.target.closest('[data-act]');
      const color = dot ? dot.dataset.c : null;
      const action = act ? act.dataset.act : null;

      if (color) {
        if (activeMark) {
          activeMark.className = `cbt-hl cbt-hl-${color}`;
          activeMark.dataset.c = color;
          if (rs[part]) passHl[rs[part].id] = $('#pass').innerHTML;
          hlBar.hidden = true; activeMark = null;
          return;
        }
        const sel = getSelection(); if (!sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        try {
          const m = document.createElement('mark');
          m.className = `cbt-hl cbt-hl-${color}`;
          m.dataset.c = color;
          m.title = t('Bỏ tô sáng');
          range.surroundContents(m);
          if (rs[part]) passHl[rs[part].id] = $('#pass').innerHTML;
        } catch (err) { toast(t('Hãy bôi đen trong một đoạn văn')); }
        sel.removeAllRanges(); hlBar.hidden = true;
      } else if (action === 'note') {
        const sel = getSelection();
        const curText = activeMark ? (activeMark.nextElementSibling?.classList.contains('cbt-note-badge') ? activeMark.nextElementSibling.dataset.note : '') : '';
        const note = prompt(t('Nhập ghi chú của bạn:'), curText);
        if (note && note.trim()) {
          const clean = note.trim();
          if (activeMark) {
            let b = activeMark.nextElementSibling;
            if (b && b.classList.contains('cbt-note-badge')) {
              b.dataset.note = clean; b.title = t('Ghi chú: {n}', { n: clean });
            } else {
              const span = document.createElement('span');
              span.className = 'cbt-note-badge'; span.textContent = '📝'; span.dataset.note = clean; span.title = t('Ghi chú: {n}', { n: clean });
              activeMark.after(span);
            }
          } else if (sel.rangeCount) {
            const range = sel.getRangeAt(0);
            try {
              const m = document.createElement('mark');
              m.className = 'cbt-hl cbt-hl-y'; m.dataset.c = 'y'; m.title = t('Bỏ tô sáng');
              range.surroundContents(m);
              const span = document.createElement('span');
              span.className = 'cbt-note-badge'; span.textContent = '📝'; span.dataset.note = clean; span.title = t('Ghi chú: {n}', { n: clean });
              m.after(span);
            } catch (err) { toast(t('Hãy bôi đen trong một đoạn văn')); }
            sel.removeAllRanges();
          }
          if (rs[part]) passHl[rs[part].id] = $('#pass').innerHTML;
        }
        hlBar.hidden = true; activeMark = null;
      } else if (action === 'clear') {
        if (activeMark) {
          const b = activeMark.nextElementSibling;
          if (b && b.classList.contains('cbt-note-badge')) b.remove();
          activeMark.replaceWith(...activeMark.childNodes);
          if (rs[part]) passHl[rs[part].id] = $('#pass').innerHTML;
        } else {
          const sel = getSelection();
          if (sel.rangeCount) {
            const m = sel.anchorNode?.parentElement?.closest('mark.cbt-hl');
            if (m) {
              const b = m.nextElementSibling;
              if (b && b.classList.contains('cbt-note-badge')) b.remove();
              m.replaceWith(...m.childNodes);
              if (rs[part]) passHl[rs[part].id] = $('#pass').innerHTML;
            }
            sel.removeAllRanges();
          }
        }
        hlBar.hidden = true; activeMark = null;
      }
    };

    $('#submit').onclick = () => submit(false);
    async function submit(timeUp) {
      const missing = qs.length - Object.keys(ans).length;
      if (!timeUp && !confirm(missing ? t('Còn {n} câu chưa trả lời. Vẫn nộp bài?', { n: missing }) : t('Nộp bài và xem kết quả?'))) return;
      clearInterval(tick); window.onbeforeunload = null;
      let score = 0;
      const rows = qs.map((q, i) => {
        const right = String(q.answer), ok = ans[i] === right;
        if (ok) score++;
        else if (App.logMistake) App.logMistake({ kind: 'reading', q: `${q.r.title}: ${q.q}`, answer: q.type === 'tfng' ? right : q.options[+right], given: ans[i] == null ? I18N.tk('(bỏ trống)') : q.type === 'tfng' ? ans[i] : q.options[+ans[i]], explain: q.explain, ref: q.r.id });
        return { q, i, ok };
      });
      const pct = Math.round(score / qs.length * 100);
      const used = total - Math.max(0, left);
      await App.reward({ quizzes: 1, readings: rs.length, perfect: pct === 100 ? 1 : 0, xp: 15 + score * 4 });
      document.body.classList.remove('cbt-mode');
      if (pct >= 80) { Sfx.win(); confetti(); }
      view.innerHTML = `<div class="study-wrap" style="max-width:820px">
        <div class="card celebrate"><div class="em">${window.Kit ? Kit.svg(pct >= 80 ? 'win' : pct >= 50 ? 'happy' : 'think', 80, true) : (timeUp ? UI.icon('alarm-clock') : UI.icon('flag'))}</div><h2>${timeUp ? t('Hết giờ!') : t('Đã nộp bài')} · ${t('{a}/{b} câu đúng', { a: score, b: qs.length })}</h2>
          <div class="score-ring" style="--p:${pct};--c:${pct >= 70 ? 'var(--good)' : pct >= 50 ? 'var(--hard)' : 'var(--again)'}"><b>${pct}%</b></div>
          <p class="muted">${t('Thời gian làm: {m} phút {s} giây · +{xp} XP · câu sai đã được ghi vào <a href="#/mistakes">Sổ lỗi sai</a>', { m: Math.floor(used / 60), s: used % 60, xp: 15 + score * 4 })}</p></div>
        <div class="card" style="margin-top:1rem"><h3>${t('Đáp án & giải thích')}</h3>${rows.map(({ q, i, ok }) => `<div class="q-item"><b>${ok ? UI.icon('circle-check') : '❌'} ${i + 1}. ${esc(q.q)}</b>
          <div class="small">${t('Đáp án:')} <b style="color:var(--good-text)">${esc(q.type === 'tfng' ? q.answer : q.options[q.answer])}</b>${!ok ? ` · ${t('Bạn chọn:')} <span style="color:var(--again-text)">${esc(ans[i] == null ? t('(bỏ trống)') : q.type === 'tfng' ? ans[i] : q.options[+ans[i]])}</span>` : ''}</div>
          <div class="small muted">${UI.icon('lightbulb')} ${esc(q.explain)}</div></div>`).join('')}</div>
        <div class="row center" style="margin-top:1rem"><a class="btn primary" href="#/cbt">${t('Làm đề khác')}</a>${rs.map(r => `<a class="btn" href="#/read/${r.id}">${UI.icon('book-open')} ${t('Học từ vựng bài “{title}”', { title: esc(r.title) })}</a>`).join('')}</div></div>`;
      document.body.classList.remove('bare');
    }
  }
})();
