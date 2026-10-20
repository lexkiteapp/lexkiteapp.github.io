/* Thi thử Reading trên máy tính (mô phỏng giao diện IELTS computer-delivered):
 * chia đôi màn hình, đồng hồ đếm ngược, tô sáng chữ, đánh dấu câu xem lại, thanh điều hướng số câu, chỉnh cỡ chữ. */
(function () {
  const { $, $$, esc, toast, shuffle } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  const R = () => window.READINGS || [];

  routes.cbt = function (arg) {
    if (arg) return exam(arg.split(','));
    const rs = R();
    const full = ['B1', 'B2', 'C1'].map(l => (shuffle(rs.filter(r => r.level === l))[0] || {}).id).filter(Boolean);
    view.innerHTML = `
      <div class="page-head"><div><h1>🖥️ ${t('Thi thử Reading trên máy tính')}</h1><p class="muted">${t('Làm quen giao diện thi IELTS trên máy: đồng hồ đếm ngược, tô sáng văn bản, đánh dấu câu cần xem lại và thanh điều hướng câu hỏi.')}</p></div></div>
      <div class="grid g2">
        <a class="card hover" href="#/cbt/${full.join(',')}" style="color:var(--text)"><div style="font-size:2.4rem">🏁</div><h2>${t('Bài thi đầy đủ · 3 passage')}</h2><p class="muted">${t('60 phút · {n} câu · độ khó tăng dần B1 → B2 → C1', { n: full.length * 5 })}</p><span class="btn primary">${t('Bắt đầu thi')} →</span></a>
        <div class="card"><h3>📌 ${t('Mẹo thi trên máy')}</h3><ul class="small" style="padding-left:1.1rem;line-height:1.8"><li>${t('<b>Bôi đen</b> từ khóa trong bài rồi bấm “Tô sáng” – giống bút highlight trên giấy.')}</li><li>${t('Tích <b>“Xem lại”</b> cho câu chưa chắc, cuối giờ bấm vào số câu có cờ 🚩 để quay lại.')}</li><li>${t('Không bị trừ điểm khi sai – <b>đừng bỏ trống</b> câu nào.')}</li><li>${t('Phân bổ ~20 phút cho mỗi passage; passage 3 thường khó nhất.')}</li></ul></div>
      </div>
      <div class="section-title"><h2>${t('Luyện từng passage (20 phút)')}</h2></div>
      <div class="grid auto">${rs.map(r => `<a class="card hover topic-card" href="#/cbt/${r.id}" style="color:var(--text)"><div class="row between"><span class="em">${r.emoji}</span><span class="chip lv ${esc(r.level)}">${esc(r.level)}</span></div><h3>${esc(r.title)}</h3><div class="muted small">${t('{n} câu · 20 phút', { n: r.questions.length })}</div></a>`).join('')}</div>`;
  };

  function exam(ids) {
    const rs = ids.map(id => R().find(r => r.id === id)).filter(Boolean);
    if (!rs.length) return routes.cbt();
    const qs = rs.flatMap((r, pi) => r.questions.map((q, qi) => ({ ...q, pi, r })));
    const total = rs.length * 20 * 60;
    let left = total, cur = 0, fs = 1, hideClock = false, part = 0;
    const ans = {}, flag = {};
    document.body.classList.add('bare', 'cbt-mode');
    let tick = null;
    App.cleanup = () => { clearInterval(tick); document.body.classList.remove('bare', 'cbt-mode'); window.onbeforeunload = null; };
    window.onbeforeunload = () => t('Bạn đang làm bài thi – rời trang sẽ mất kết quả.');

    view.innerHTML = `
      <div class="cbt">
        <header class="cbt-top">
          <div class="row nowrap"><img src="icons/icon.svg" alt="" style="width:28px;height:28px;border-radius:8px"><b>Lexkite</b><span class="tiny muted">IELTS Reading · ${t('Mô phỏng thi trên máy')}</span></div>
          <div class="row nowrap"><span class="cbt-clock" id="clock"></span><button class="btn sm" id="hideC">${t('Ẩn giờ')}</button><button class="btn sm" id="fsDown" title="${t('Giảm cỡ chữ')}">A−</button><button class="btn sm" id="fsUp" title="${t('Tăng cỡ chữ')}">A+</button><button class="btn sm primary" id="submit">${t('Nộp bài')}</button></div>
        </header>
        <div class="cbt-body">
          <section class="cbt-pass" id="pass"></section>
          <section class="cbt-qs" id="qs"></section>
        </div>
        <footer class="cbt-nav" id="nav"></footer>
        <div class="cbt-hlbtn" id="hlBtn" hidden><button class="btn sm primary">🖍 ${t('Tô sáng')}</button></div>
      </div>`;
    if (window.ChoiceKit) { ChoiceKit.attach($('.cbt'), { key: 'cbt:' + rs.map(r => r.id || r.title).join('|') }); ChoiceKit.split($('.cbt-body'), $('#pass'), 'cbt-split'); }

    const drawPassage = () => {
      const r = rs[part];
      $('#pass').innerHTML = `<div class="tiny muted" style="font-weight:800">PASSAGE ${part + 1}</div><h2>${esc(r.title)}</h2>${r.text.split(/\n\s*\n/).map(p => `<p>${esc(p)}</p>`).join('')}`;
      $('#pass').style.fontSize = (1.02 * fs) + 'rem'; $('#qs').style.fontSize = (0.98 * fs) + 'rem';
    };
    const drawQs = () => {
      const list = qs.map((q, i) => ({ q, i })).filter(x => x.q.pi === part);
      $('#qs').innerHTML = `<div class="tiny muted" style="font-weight:800">${t('CÂU {a}–{b}', { a: list[0].i + 1, b: list[list.length - 1].i + 1 })}</div>
        <p class="small muted">${list.some(x => x.q.type === 'tfng') ? t('Các câu True/False/Not Given: chọn TRUE nếu khớp thông tin, FALSE nếu trái ngược, NOT GIVEN nếu bài không đề cập.') : ''}</p>
        ${list.map(({ q, i }) => `<div class="cbt-q ${i === cur ? 'cur' : ''}" id="q${i}">
          <div class="row between"><b>${i + 1}. ${esc(q.q)}</b><label class="tiny" style="white-space:nowrap"><input type="checkbox" data-flag="${i}" ${flag[i] ? 'checked' : ''}> 🚩 ${t('Xem lại')}</label></div>
          <div class="cbt-opts">${(q.type === 'tfng' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : q.options).map((o, k) => { const v = q.type === 'tfng' ? o : String(k); return `<label class="cbt-opt ${ans[i] === v ? 'sel' : ''}"><input type="radio" name="q${i}" value="${esc(v)}" ${ans[i] === v ? 'checked' : ''}> <b class="cbt-key">${q.type === 'mcq' ? String.fromCharCode(65 + k) : (k + 1)}</b> <span class="cbt-txt">${esc(o)}</span></label>`; }).join('')}</div></div>`).join('')}`;
      $$('#qs input[type=radio]').forEach(inp => inp.onchange = () => { const i = +inp.name.slice(1); ans[i] = inp.value; cur = i; drawQs(); drawNav(); });
      $$('[data-flag]').forEach(c => c.onchange = () => { flag[+c.dataset.flag] = c.checked; drawNav(); });
    };
    const drawNav = () => {
      $('#nav').innerHTML = rs.map((r, pi) => `<div class="cbt-part ${pi === part ? 'on' : ''}"><button class="cbt-pbtn" data-part="${pi}">Part ${pi + 1}</button>
        ${qs.map((q, i) => q.pi === pi ? `<button class="cbt-num ${ans[i] != null ? 'done' : ''} ${flag[i] ? 'flag' : ''} ${i === cur ? 'cur' : ''}" data-go="${i}">${i + 1}</button>` : '').join('')}</div>`).join('')
        + `<span class="tiny muted" style="margin-left:auto">${t('{a}/{b} đã trả lời', { a: Object.keys(ans).length, b: qs.length })}</span>`;
      $$('[data-part]').forEach(b => b.onclick = () => { part = +b.dataset.part; cur = qs.findIndex(q => q.pi === part); drawPassage(); drawQs(); drawNav(); });
      $$('[data-go]').forEach(b => b.onclick = () => { cur = +b.dataset.go; if (qs[cur].pi !== part) { part = qs[cur].pi; drawPassage(); } drawQs(); drawNav(); const el = $(`#q${cur}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    };
    const clock = () => {
      const el = $('#clock'); if (!el) return;
      const m = Math.floor(Math.max(0, left) / 60), s = Math.max(0, left) % 60;
      el.textContent = hideClock ? '⏱ ··:··' : `⏱ ${t('{m} phút {s}', { m, s: String(s).padStart(2, '0') })}`;
      el.classList.toggle('warn', left <= 300);
    };
    drawPassage(); drawQs(); drawNav(); clock();
    tick = setInterval(() => { left--; clock(); if (left === 300) toast('⏰ ' + t('Còn 5 phút!')); if (left <= 0) { clearInterval(tick); submit(true); } }, 1000);
    $('#hideC').onclick = () => { hideClock = !hideClock; $('#hideC').textContent = hideClock ? t('Hiện giờ') : t('Ẩn giờ'); clock(); };
    $('#fsUp').onclick = () => { fs = Math.min(1.5, fs + .1); drawPassage(); drawQs(); };
    $('#fsDown').onclick = () => { fs = Math.max(.8, fs - .1); drawPassage(); drawQs(); };

    // Tô sáng văn bản đã chọn trong passage
    const hlBtn = $('#hlBtn');
    $('#pass').addEventListener('mouseup', () => setTimeout(() => {
      const sel = getSelection();
      if (!sel || sel.isCollapsed || !$('#pass').contains(sel.anchorNode)) { hlBtn.hidden = true; return; }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      hlBtn.style.left = (r.left + r.width / 2 - 50) + 'px'; hlBtn.style.top = (r.top - 44 + scrollY) + 'px'; hlBtn.hidden = false;
    }, 10));
    hlBtn.onclick = () => {
      const sel = getSelection(); if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      try { const m = document.createElement('mark'); m.className = 'cbt-hl'; m.title = t('Bấm để bỏ tô sáng'); range.surroundContents(m); }
      catch (e) { toast(t('Hãy bôi đen trong một đoạn văn')); }
      sel.removeAllRanges(); hlBtn.hidden = true;
    };
    $('#pass').addEventListener('click', e => { const m = e.target.closest('mark.cbt-hl'); if (m && getSelection().isCollapsed) m.replaceWith(...m.childNodes); });

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
        <div class="card celebrate"><div class="em">${window.Kit ? Kit.svg(pct >= 80 ? 'win' : pct >= 50 ? 'happy' : 'think', 80, true) : (timeUp ? '⏰' : '🏁')}</div><h2>${timeUp ? t('Hết giờ!') : t('Đã nộp bài')} · ${t('{a}/{b} câu đúng', { a: score, b: qs.length })}</h2>
          <div class="score-ring" style="--p:${pct};--c:${pct >= 70 ? 'var(--good)' : pct >= 50 ? 'var(--hard)' : 'var(--again)'}"><b>${pct}%</b></div>
          <p class="muted">${t('Thời gian làm: {m} phút {s} giây · +{xp} XP · câu sai đã được ghi vào <a href="#/mistakes">Sổ lỗi sai</a>', { m: Math.floor(used / 60), s: used % 60, xp: 15 + score * 4 })}</p></div>
        <div class="card" style="margin-top:1rem"><h3>${t('Đáp án & giải thích')}</h3>${rows.map(({ q, i, ok }) => `<div class="q-item"><b>${ok ? '✅' : '❌'} ${i + 1}. ${esc(q.q)}</b>
          <div class="small">${t('Đáp án:')} <b style="color:var(--good-text)">${esc(q.type === 'tfng' ? q.answer : q.options[q.answer])}</b>${!ok ? ` · ${t('Bạn chọn:')} <span style="color:var(--again-text)">${esc(ans[i] == null ? t('(bỏ trống)') : q.type === 'tfng' ? ans[i] : q.options[+ans[i]])}</span>` : ''}</div>
          <div class="small muted">💡 ${esc(q.explain)}</div></div>`).join('')}</div>
        <div class="row center" style="margin-top:1rem"><a class="btn primary" href="#/cbt">${t('Làm đề khác')}</a>${rs.map(r => `<a class="btn" href="#/read/${r.id}">📖 ${t('Học từ vựng bài “{title}”', { title: esc(r.title) })}</a>`).join('')}</div></div>`;
      document.body.classList.remove('bare');
    }
  }
})();
