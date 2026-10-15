/* Luyện IELTS Reading theo DẠNG CÂU HỎI: gom mọi nhóm câu cùng dạng từ tất cả đề, làm lần lượt,
 * theo dõi tỉ lệ đúng từng dạng (mục tiêu 70–80% rồi mới chuyển dạng – cách luyện được các nền tảng lớn khuyên dùng). */
(function () {
  const { $, $$, esc, toast } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  // Phân loại dạng câu hỏi từ dữ liệu nhóm câu
  function kindOf(g) {
    if (g.type === 'tfng') return 'tfng';
    if (g.type === 'ynng') return 'ynng';
    if (g.type === 'mcq') return 'mcq';
    if (g.type === 'multi') return 'multi';
    if (g.type === 'match') { const c = (g.options || []).map(QE.code); if (c.some(x => /^[ivx]+$/i.test(x))) return 'headings'; if ((g.options || []).every(o => !QE.label(o))) return 'info'; return 'features'; }
    return 'completion';
  }
  const KIND = {
    completion: ['✏️', t('Điền từ (summary/sentence/note/table)'), t('Đọc câu hỏi, đoán loại từ cần điền, tìm từ khóa đồng nghĩa trong bài; chép đúng chính tả và giới hạn số từ.')],
    tfng: ['✔️', 'TRUE / FALSE / NOT GIVEN', t('FALSE = bài nói NGƯỢC lại; NOT GIVEN = bài KHÔNG nhắc tới. Đừng dùng hiểu biết bên ngoài.')],
    ynng: ['💭', 'YES / NO / NOT GIVEN', t('Giống TFNG nhưng hỏi về QUAN ĐIỂM của tác giả – chú ý từ thể hiện thái độ.')],
    mcq: ['🔘', t('Trắc nghiệm A–D'), t('Loại trừ phương án dùng từ y hệt bài nhưng sai nghĩa; đáp án đúng thường là paraphrase.')],
    multi: ['☑️', t('Chọn 2 đáp án'), t('Đọc kỹ cả 5 phương án; 2 đáp án thường nằm ở các câu gần nhau trong bài.')],
    headings: ['🏷️', t('Nối tiêu đề (Matching headings)'), t('Đọc câu chủ đề + câu cuối mỗi đoạn; chọn tiêu đề khái quát ý CHÍNH, không phải chi tiết.')],
    info: ['📍', t('Tìm đoạn chứa thông tin'), t('Thông tin có thể nằm ở bất kỳ đâu, một đoạn có thể dùng nhiều lần – quét từ khóa cụ thể (số, tên, ví dụ).')],
    features: ['👤', t('Nối đặc điểm (người/nhóm ↔ nhận định)'), t('Gạch chân tên riêng trong bài trước, rồi đọc kỹ quanh mỗi tên.')],
  };
  const ORDER = ['completion', 'tfng', 'ynng', 'mcq', 'multi', 'headings', 'info', 'features'];
  function units() {
    const out = [];
    (window.READTESTS || []).forEach(t => t.passages.forEach(p => p.groups.forEach((g, gi) => out.push({ t, p, g, gi, kind: kindOf(g), id: `${t.id}:${p.n}:${gi}` }))));
    return out;
  }
  const stats = () => state.game.rtype || {};

  routes.rtype = function (kind) {
    const all = units();
    if (!kind || !KIND[kind]) {
      const st = stats();
      view.innerHTML = `
        <div class="page-head"><div><h1>🎯 ${t('Luyện Reading theo dạng câu hỏi')}</h1><p class="muted">${t('Tập trung 1 dạng câu hỏi tới khi tỉ lệ đúng đạt <b>70–80%</b> rồi mới chuyển dạng. Thứ tự khuyên dùng: Điền từ → TRUE/FALSE/NOT GIVEN → Trắc nghiệm → Nối.')}</p></div></div>
        <div class="grid auto">${ORDER.map(k => { const n = all.filter(u => u.kind === k), s = st[k] || { r: 0, t: 0 }, pct = s.t ? Math.round(s.r / s.t * 100) : null;
          return n.length ? `<a class="card hover" href="#/rtype/${k}" style="color:var(--text)"><div class="row between"><span style="font-size:1.6rem">${KIND[k][0]}</span>${pct != null ? `<span class="chip ${pct >= 75 ? 'ok' : ''}">${t('{pct}% đúng', { pct })}</span>` : `<span class="chip">${t('Chưa làm')}</span>`}</div>
            <h3 style="margin:.5rem 0 .2rem">${KIND[k][1]}</h3><div class="small muted">${t('{q} câu · {g} nhóm', { q: n.reduce((a, u) => a + QE.numsOf({ groups: [u.g] }).length, 0), g: n.length })}</div>
            <div class="progress" style="margin-top:.5rem"><i style="width:${pct || 0}%;${pct >= 75 ? 'background:var(--good)' : ''}"></i></div>
            <div class="tiny muted" style="margin-top:.4rem">${pct == null ? t('Bắt đầu luyện') : pct >= 75 ? '✅ ' + t('Đã đạt mục tiêu – chuyển dạng tiếp theo') : t('Mục tiêu 75%')}</div></a>` : ''; }).join('')}</div>`;
      return;
    }
    const list = all.filter(u => u.kind === kind);
    let i = 0;
    const show = () => {
      if (i >= list.length) { view.innerHTML = `<div class="study-wrap"><div class="card celebrate empty"><div class="em">🎉</div><h2>${t('Đã làm hết dạng “{k}”', { k: esc(KIND[kind][1]) })}</h2><div class="row center"><a class="btn primary" href="#/rtype">${t('Chọn dạng khác')}</a><a class="btn" href="#/mock">${t('Thi thử đầy đủ')}</a></div></div></div>`; return; }
      const u = list[i], ex = (window.READ_EXPLAIN || {})[u.t.id] || {};
      view.innerHTML = `<a href="#/rtype" class="small">← ${t('Các dạng câu hỏi')}</a>
        <div class="row between" style="margin:.5rem 0"><h2 style="margin:0">${KIND[kind][0]} ${esc(KIND[kind][1])}</h2><span class="chip">${t('Nhóm {i}/{n}', { i: i + 1, n: list.length })}</span></div>
        <div class="tip small" style="margin-bottom:.8rem">💡 ${esc(KIND[kind][2])}</div>
        <div class="mk-read"><div class="card mk-pass"><h3 style="margin-top:0">${esc(u.p.title)}</h3>${u.p.paras.map(x => `<p data-para="${esc(x.k)}"><b class="mk-pk">${esc(x.k)}</b> ${esc(x.t)}</p>`).join('')}</div>
        <div class="card mk-qs" id="rq">${QE.questionsHtml({ groups: [u.g] })}<div class="row" style="margin-top:1rem"><button class="btn primary" id="rSub">${t('Kiểm tra')}</button><button class="btn" id="rNext" hidden>${t('Nhóm tiếp')} →</button></div><div id="rRes" style="margin-top:.8rem"></div></div></div>`;
      QE.bind($('#rq'));
      $('#rSub').onclick = async () => {
        const res = QE.collect({ groups: [u.g] }, $('#rq'));
        const mark = n => { const r = res[n]; if (!r || !r.cue) return; const pEl = $$('.mk-pass p').find(x => x.textContent.includes(r.cue)); if (pEl) { pEl.innerHTML = pEl.innerHTML.replace(esc(r.cue), `<mark class="uhl">${esc(r.cue)}</mark>`); pEl.scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
        QE.mark($('#rq'), res, '📍 ' + t('Xem vị trí trong bài'), mark);
        Object.keys(res).forEach(n => { const e = ex[n]; const el = $(`[data-item~="${n}"] .lq-fb, [data-item="${n}"] .lq-fb`, $('#rq')); if (e && el) el.insertAdjacentHTML('beforeend', `<div class="tiny muted" style="margin-top:.25rem">💡 ${esc(e.why)}${(e.keys || []).length ? `<br>🔁 ${e.keys.map(k2 => `<i>${esc(k2[0])}</i> ≈ <b>${esc(k2[1])}</b>`).join(' · ')}` : ''}</div>`); });
        const right = Object.values(res).filter(r => r.ok).length, tot = Object.keys(res).length;
        state.game = await Game.mutate(gs => { gs.rtype = gs.rtype || {}; const s = gs.rtype[kind] || { r: 0, t: 0 }; gs.rtype[kind] = { r: s.r + right, t: s.t + tot }; });
        Object.entries(res).filter(([, r]) => !r.ok).forEach(([n, r]) => App.logMistake && App.logMistake({ kind: 'reading', q: t('{title} – câu {n}: {q}', { title: u.p.title, n, q: r.q || '' }), answer: r.answer, given: r.given || t('(bỏ trống)'), explain: (ex[n] || {}).why || '', ref: '' }));
        App.reward({ quizzes: 1, readings: 1, xp: 5 + right * 2 });
        right === tot ? Sfx.win() : Sfx.correct();
        $('#rRes').innerHTML = `<div class="feedback ${right / tot >= 0.75 ? 'ok' : 'no'}" style="position:static">${t('<b>{r}/{n} câu đúng</b> · tỉ lệ tích lũy dạng này: {p}%', { r: right, n: tot, p: Math.round(state.game.rtype[kind].r / state.game.rtype[kind].t * 100) })}</div>`;
        $('#rSub').hidden = true; $('#rNext').hidden = false;
      };
      $('#rNext').onclick = () => { i++; show(); window.scrollTo({ top: 0 }); };
    };
    show();
  };
})();
