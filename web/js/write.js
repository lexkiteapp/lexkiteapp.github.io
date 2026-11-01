/* Phòng viết (Writing Lab): viết bài Task 2 có bấm giờ, phân tích từ vựng ngay trên máy – không tốn phí, không gửi bài đi đâu. */
(function () {
  const { $, $$, esc, toast, ring } = UI;
  const { Store } = Core;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;

  // Đề bài tự biên soạn theo xu hướng ra đề 2026 (tỷ lệ dạng bài & chủ đề thống kê từ đề thật được thí sinh báo lại)
  const T = (id, type, topic, text) => ({ id, type, topic, text });
  const PROMPTS = [
    T('p1', 'Agree/Disagree', 'education', 'Some people believe that university education should be free for all students. To what extent do you agree or disagree?'),
    T('p2', 'Discussion', 'technology', 'Some people think that technology has made our lives more complicated, while others believe it has made life easier. Discuss both views and give your own opinion.'),
    T('p3', 'Problem–Solution', 'urban', 'Traffic congestion is becoming a serious problem in many large cities. What are the causes of this problem, and what measures could be taken to solve it?'),
    T('p4', 'Advantages–Disadvantages', 'work', 'More and more people are choosing to work from home rather than in an office. Do the advantages of this trend outweigh the disadvantages?'),
    T('p5', 'Agree/Disagree', 'environment', 'Governments should spend more money on protecting the environment than on other public services. To what extent do you agree or disagree?'),
    T('p6', 'Problem–Solution', 'health', 'Obesity rates among children are rising in many countries. Why is this happening, and what can parents and schools do about it?'),
    T('p7', 'Discussion', 'media', 'Some people believe advertising aimed at children should be banned, while others think it is acceptable. Discuss both views and give your opinion.'),
    T('p8', 'Agree/Disagree', 'crime', 'The best way to reduce crime is to give longer prison sentences. To what extent do you agree or disagree?'),
    T('p9', 'Positive/Negative', 'society', 'In many families, grandparents now play a smaller role in raising children than in the past. Is this a positive or negative development?'),
    T('p10', 'Agree/Disagree', 'culture', 'Public money should be spent on museums and galleries rather than on sports facilities. To what extent do you agree or disagree?'),
    T('p11', 'Positive/Negative', 'work', 'Being highly competitive is seen as essential for success at work today. Is this a positive or negative trend for individuals and society?'),
    T('p12', 'Problem–Solution', 'crime', 'Many people who leave prison go on to commit further crimes. Why does this happen, and how can the problem be reduced?'),
    T('p13', 'Discussion', 'environment', 'Some believe that individuals should be free to use natural resources such as water as they wish, while others think governments should strictly limit their use. Discuss both views and give your opinion.'),
    T('p14', 'Agree/Disagree', 'health', 'Preventing illness through public health campaigns is a better use of government money than treating people who are already sick. To what extent do you agree or disagree?'),
    T('p15', 'Advantages–Disadvantages', 'travel', 'Cities around the world are starting to look more and more alike. Do the advantages of this trend outweigh the disadvantages?'),
    T('p16', 'Positive/Negative', 'society', 'In some countries, more fathers are staying at home to look after their children while mothers go out to work. Is this a positive or negative development?'),
    T('p17', 'Agree/Disagree', 'education', 'With so much information available online, schools will soon become unnecessary. To what extent do you agree or disagree?'),
    T('p18', 'Discussion', 'education', 'Some say the main purpose of education is to make individuals useful to society, while others believe it should help people achieve their personal goals. Discuss both views and give your opinion.'),
    T('p19', 'Problem–Solution', 'society', 'Young people today spend less time with older generations than they did in the past. What are the reasons for this, and how can the situation be improved?'),
    T('p20', 'Agree/Disagree', 'environment', 'Reducing the number of non-essential flights would do more to protect the environment than limiting the use of private cars. To what extent do you agree or disagree?'),
    T('p21', 'Positive/Negative', 'technology', 'Many people now share personal information online in order to shop, bank and socialise. Is this a positive or negative development?'),
    T('p22', 'Agree/Disagree', 'media', 'Newspapers and television should report more positive news stories. To what extent do you agree or disagree?'),
    T('p23', 'Problem–Solution', 'work', 'Youth unemployment is a growing problem in many countries. What problems does it cause, and what measures should be taken to reduce it?'),
    T('p24', 'Advantages–Disadvantages', 'education', 'An increasing number of students choose to complete their degrees in another country. Do the benefits of studying abroad outweigh the drawbacks?'),
    T('p25', 'Agree/Disagree', 'technology', 'Advances in technology will make it much easier to prevent and solve crimes in the future. To what extent do you agree or disagree?'),
    T('p26', 'Discussion', 'health', 'Some people think it is the government\'s duty to make sure citizens eat healthily, while others say it is a personal responsibility. Discuss both views and give your opinion.'),
    T('p27', 'Positive/Negative', 'media', 'Celebrities have a growing influence on the attitudes and behaviour of young people. Is this a positive or negative development?'),
    T('p28', 'Agree/Disagree', 'economy', 'Once a country becomes wealthy, further economic growth does little to make its people happier. To what extent do you agree or disagree?'),
    T('p29', 'Two-part question', 'culture', 'Traditional clothing is being replaced by international fashion in many countries. Why is this happening? Is it a positive or negative trend?'),
    T('p30', 'Agree/Disagree', 'education', 'Art and music should be compulsory subjects for all secondary school students. To what extent do you agree or disagree?'),
  ];
  // Đề bổ sung từ file dữ liệu khác (js/write/*.js nạp trước): window.WRITE_MORE = [[id, type, topic, text], …]
  (window.WRITE_MORE || []).forEach(a => { if (!PROMPTS.some(x => x.id === a[0])) PROMPTS.push(T(...a)); });
  window.WRITE_PROMPTS = PROMPTS;
  // Thống kê xu hướng (≈92 đề Task 2 thí sinh báo lại, 07–10/2026) – chỉ là số liệu tổng hợp
  const TRENDS = {
    types: [['Agree/Disagree', 45], ['Positive/Negative', 17], ['Discussion', 15], ['Problem–Solution', 14], ['Advantages–Disadvantages', 7], ['Khác', 2]],
    topics: ['Giáo dục', 'Tội phạm & pháp luật', 'Truyền thông & tin tức', 'Sức khỏe', 'Công việc', 'Môi trường & tài nguyên', 'Công nghệ', 'Gia đình & thế hệ', 'Chi tiêu công (nghệ thuật, thể thao)'],
    task1: [['Bảng (table)', 24], ['Cột (bar)', 22], ['Đường (line)', 20], ['Tròn (pie)', 10], ['Bản đồ (map)', 9], ['Quy trình (process)', 6], ['Kết hợp', 9]],
  };
  const OUTLINE = {
    'Agree/Disagree': ['Mở bài: viết lại đề + nêu rõ quan điểm (đồng ý hoàn toàn / một phần).', 'Thân bài 1: lý do chính 1 + giải thích + ví dụ.', 'Thân bài 2: lý do 2 (hoặc nhượng bộ phía bên kia rồi phản bác).', 'Kết bài: nhắc lại quan điểm, không thêm ý mới.'],
    'Discussion': ['Mở bài: giới thiệu hai quan điểm + ý kiến của bạn.', 'Thân bài 1: quan điểm A – lý do & ví dụ.', 'Thân bài 2: quan điểm B (thường là phía bạn đồng ý) – lý do & ví dụ.', 'Kết bài: tóm tắt và khẳng định ý kiến.'],
    'Problem–Solution': ['Mở bài: viết lại đề + nêu sẽ bàn nguyên nhân/vấn đề và giải pháp.', 'Thân bài 1: 2 nguyên nhân/vấn đề chính.', 'Thân bài 2: giải pháp tương ứng (ai làm, làm thế nào).', 'Kết bài: tóm tắt.'],
    'Advantages–Disadvantages': ['Mở bài: viết lại đề + kết luận lợi lớn hơn hay hại lớn hơn.', 'Thân bài 1: mặt yếu hơn (theo bạn).', 'Thân bài 2: mặt mạnh hơn – phát triển kỹ hơn.', 'Kết bài: khẳng định lại đánh giá.'],
    'Positive/Negative': ['Mở bài: viết lại đề + nêu rõ tích cực hay tiêu cực.', 'Thân bài 1: lý do chính ủng hộ đánh giá của bạn.', 'Thân bài 2: lý do 2 hoặc thừa nhận mặt còn lại rồi phản biện.', 'Kết bài: khẳng định lại.'],
    'Two-part question': ['Mở bài: viết lại đề + trả lời ngắn cả hai câu hỏi.', 'Thân bài 1: trả lời câu hỏi 1.', 'Thân bài 2: trả lời câu hỏi 2.', 'Kết bài: tóm tắt.'],
  };

  let timer = null;
  routes.write = App.guard(async function (arg) {
    const w = App.W;
    const essays = await w(Store.get('essays', []));
    const draft = await w(Store.get('essayDraft', { prompt: 'p1', text: '' }));
    const p = PROMPTS.find(x => x.id === (arg || draft.prompt)) || PROMPTS[0];
    const topic = App.topicOf(p.topic);
    view.innerHTML = `
      <div class="page-head"><div><h1>✍️ ${t('Phòng viết')}</h1><p class="muted"><a href="#/task1">📈 ${t('Chuyển sang Task 1 (biểu đồ) →')}</a> · <a href="#/criteria?skill=writing">📊 ${t('Tiêu chí chấm band 4–9')}</a><br>${t('Viết bài IELTS Task 2 rồi nhận <b>phân tích từ vựng tức thì</b>: từ học thuật, từ nối, collocation, từ bị lặp và gợi ý thay thế. Bài viết chỉ lưu trên máy bạn.')}</p></div></div>
      <div class="grid" style="grid-template-columns:minmax(0,1fr) 300px;align-items:start" id="wGrid">
        <div class="stack">
          <div class="card">
            <div class="row between"><span class="chip lv">${esc(p.type)}</span>
              <div class="row"><select class="input" id="pSel" aria-label="${t('Chọn đề')}" style="width:auto;padding:.35rem .6rem">${Object.keys(OUTLINE).map(ty => `<optgroup label="${esc(ty)}">${PROMPTS.filter(x => x.type === ty).map(x => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${t('Đề {n}', { n: x.id.slice(1) })} · ${esc((App.topicOf(x.topic) || { name: x.topic }).name)}</option>`).join('')}</optgroup>`).join('')}</select>
              <button class="btn sm" id="rndP" title="${t('Đề ngẫu nhiên')}">🎲</button></div></div>
            <p style="font-size:1.08rem;font-weight:600;margin:.8rem 0 0">${esc(p.text)}</p>
            <a class="btn sm ghost" href="#/ideas/${esc(p.topic)}" style="margin-top:.5rem">💡 ${t('Bí ý? Mở ngân hàng ý tưởng chủ đề này')}</a>
            <details style="margin-top:.6rem"><summary class="small"><b>🧭 ${t('Dàn ý gợi ý cho dạng {type}', { type: esc(p.type) })}</b></summary><ol class="small" style="margin:.4rem 0 0;padding-left:1.2rem">${(OUTLINE[p.type] || []).map(x => `<li style="margin:.25rem 0">${esc(t(x))}</li>`).join('')}</ol></details>
            <div class="row between" style="margin-top:.5rem"><p class="tiny muted" style="margin:0">${t('Viết ít nhất 250 từ · thời gian gợi ý 40 phút')}</p>${(window.MODELS || []).some(m => m.id === 't2-' + p.id) ? `<a class="btn sm" href="#/model/t2-${p.id}">📄 ${t('Bài mẫu band 8 có chú thích')}</a>` : ''}</div>
          </div>
          <div class="card">
            <textarea class="input" id="essay" style="min-height:340px;font-size:1.02rem;line-height:1.7" placeholder="${t('Bắt đầu viết bài của bạn…')}" spellcheck="true">${esc(draft.prompt === p.id ? draft.text : '')}</textarea>
            <div class="row between" style="margin-top:.7rem">
              <div class="row"><b id="wc">${t('{n} từ', { n: 0 })}</b><span class="timer" id="clock" style="font-size:1rem">40:00</span><button class="btn sm" id="tBtn">⏱ ${t('Bấm giờ')}</button></div>
              <button class="btn primary" id="analyze">🔍 ${t('Phân tích từ vựng')}</button>
            </div>
          </div>
          <div id="report"></div>
        </div>
        <div class="stack" style="position:sticky;top:80px">
          <div class="card"><h3>💡 ${t('Từ vựng gợi ý')} · ${topic ? esc(topic.name) : ''}</h3>
            <div class="row" style="margin-top:.4rem">${(topic ? topic.words.slice(0, 14) : []).map(w => `<button class="chip" data-ins="${esc(w.word)}" title="${esc(App.meanOf(w))}" style="border:0;cursor:pointer">${esc(w.word)}</button>`).join('')}</div>
            <div class="tiny muted" style="margin-top:.5rem">${t('Bấm để chèn vào bài')}</div></div>
          <div class="card"><h3>📊 ${t('Xu hướng đề Task 2 (2026)')}</h3>
            ${TRENDS.types.map(([ty, v]) => `<div class="srow" style="grid-template-columns:120px minmax(0,1fr) 34px"><span class="tiny"><b>${esc(t(ty))}</b></span><div class="sbar"><i style="width:${v * 2}%;background:var(--primary)"></i></div><span class="tiny muted">${v}%</span></div>`).join('')}
            <div class="tiny muted" style="margin-top:.5rem"><b>${t('Chủ đề lặp nhiều:')}</b> ${TRENDS.topics.map(x => t(x)).join(' · ')}</div>
            <div class="tiny muted" style="margin-top:.4rem"><b>Task 1:</b> ${TRENDS.task1.map(([ty, v]) => `${t(ty)} ${v}%`).join(' · ')}</div>
            <div class="tiny muted" style="margin-top:.4rem">${t('Ước tính sơ bộ từ ~90 đề do thí sinh báo lại (07–10/2026) – không phải số liệu chính thức của IELTS.')}</div></div>
          <div class="card"><h3>🧷 ${t('Từ nối hay dùng')}</h3>
            <div class="row" style="margin-top:.4rem">${['Firstly,', 'Moreover,', 'However,', 'On the other hand,', 'For instance,', 'As a result,', 'It could be argued that', 'In conclusion,'].map(w => `<button class="chip" data-ins="${esc(w)}" style="border:0;cursor:pointer">${esc(w)}</button>`).join('')}</div></div>
          ${essays.length ? `<div class="card"><h3>🗂 ${t('Bài đã viết')}</h3>${essays.slice(0, 6).map((e, i) => `<div class="row between small" style="padding:.35rem 0;border-bottom:1px dashed var(--line)"><span>${t('Đề {n}', { n: esc(e.prompt.slice(1)) })} · ${t('{n} từ', { n: e.words })}</span><span class="chip lv">LR ~${e.band}</span><button class="btn sm ghost" data-open="${i}">${t('Mở')}</button></div>`).join('')}</div>` : ''}
        </div>
      </div>`;
    if (innerWidth < 900) $('#wGrid').style.gridTemplateColumns = '1fr';
    const ta = $('#essay');
    const count = () => { const n = (ta.value.match(/[A-Za-z][A-Za-z'’-]*/g) || []).length; $('#wc').textContent = t('{n} từ', { n }); $('#wc').style.color = n >= 250 ? 'var(--good)' : ''; };
    let saveT;
    ta.oninput = () => { count(); clearTimeout(saveT); saveT = setTimeout(() => Store.set('essayDraft', { prompt: p.id, text: ta.value }), 600); };
    count();
    $('#pSel').onchange = e => { location.hash = `#/write/${e.target.value}`; };
    $('#rndP').onclick = () => { const q = PROMPTS[Math.floor(Math.random() * PROMPTS.length)]; location.hash = `#/write/${q.id}`; };
    $$('[data-ins]').forEach(b => b.onclick = () => {
      const s = ta.selectionStart, ins = b.dataset.ins + ' ';
      ta.value = ta.value.slice(0, s) + ins + ta.value.slice(ta.selectionEnd);
      ta.focus(); ta.selectionStart = ta.selectionEnd = s + ins.length; ta.oninput();
    });
    $$('[data-open]').forEach(b => b.onclick = () => { const e = essays[+b.dataset.open]; ta.value = e.text; ta.oninput(); report(e.text, p, false); });

    // Bấm giờ 40 phút
    let left = 40 * 60;
    clearInterval(timer); timer = null;
    App.cleanup = () => { clearInterval(timer); timer = null; };
    $('#tBtn').onclick = () => {
      if (timer) { clearInterval(timer); timer = null; $('#tBtn').textContent = `⏱ ${t('Tiếp tục')}`; return; }
      $('#tBtn').textContent = `⏸ ${t('Tạm dừng')}`;
      timer = setInterval(() => {
        left--; const el = $('#clock'); if (!el) return clearInterval(timer);
        el.textContent = `${String(Math.floor(Math.max(0, left) / 60)).padStart(2, '0')}:${String(Math.max(0, left) % 60).padStart(2, '0')}`;
        el.style.color = left < 300 ? 'var(--again)' : '';
        if (left <= 0) { clearInterval(timer); timer = null; Sfx.win(); toast(`⏰ ${t('Hết 40 phút – hãy phân tích bài viết của bạn!')}`); }
      }, 1000);
    };
    $('#analyze').onclick = () => report(ta.value, p, true);
    if (window.Assist) Assist.attach(ta, ta.parentElement);
  });

  async function report(text, p, fresh) {
    const a = Lexis.analyze(text);
    if (a.words < 40) return toast(t('Hãy viết ít nhất vài đoạn (≥ 40 từ) để phân tích nhé'));
    const list = (m, cls) => [...m.entries()].sort((x, y) => y[1] - x[1]).map(([w, n]) => `<span class="chip ${cls || ''}">${esc(w)}${n > 1 ? ` ×${n}` : ''}</span>`).join(' ') || `<span class="muted small">${t('Chưa có')}</span>`;
    const tips = [];
    if (a.words < 250) tips.push(t('Bài mới có <b>{n} từ</b> – IELTS Task 2 yêu cầu tối thiểu 250 từ, thiếu sẽ bị trừ điểm Task Response.', { n: a.words }));
    if (a.awlRatio < 0.04) tips.push(t('Tăng từ học thuật (AWL): thay từ thông dụng bằng từ như <i>significant, approach, impact, consequence, factor</i>.'));
    if (a.link.size < 4) tips.push(t('Đa dạng từ nối hơn (Moreover, Consequently, Nevertheless, For instance…) để tăng điểm Coherence & Cohesion.'));
    if (a.phrases.size < 2) tips.push(t('Dùng thêm collocation tự nhiên: <i>pose a threat, play a pivotal role, raise awareness, a growing number of…</i>'));
    if (a.sd < 4 && a.sentences > 4) tips.push(t('Câu có độ dài khá giống nhau – kết hợp câu ngắn và câu phức (mệnh đề quan hệ, câu điều kiện) để tăng điểm ngữ pháp.'));
    if (a.avg > 30) tips.push(t('Câu trung bình hơi dài (> 30 từ) – dễ mắc lỗi ngữ pháp, nên tách bớt.'));
    if (a.overused.length) tips.push(t('Một số từ bị lặp nhiều lần – xem gợi ý thay thế bên dưới.'));
    if (!tips.length) tips.push(t('Từ vựng đa dạng và học thuật – tiếp tục duy trì! Hãy tự kiểm tra lại ngữ pháp và chính tả.'));

    $('#report').innerHTML = `
      <div class="card stack">
        <div class="row nowrap" style="gap:1.2rem">
          <div class="score-ring" style="--p:${(a.band - 4) / 4.5 * 100};--c:${a.band >= 7 ? 'var(--good)' : a.band >= 6 ? 'var(--hard)' : 'var(--again)'}"><b>${a.band}</b></div>
          <div><h2 style="margin:0">${t('Lexical Resource ước tính: {band}', { band: a.band })}</h2>
            <div class="small muted">${t('Ước tính tự động dựa trên mật độ từ học thuật, collocation, từ nối, độ đa dạng và lặp từ – chỉ để tham khảo, không thay thế giám khảo.')}</div></div>
        </div>
        <div class="grid g4 stats">
          <div class="card stat" style="padding:.8rem"><div><b>${a.words}</b><span class="tiny muted">${t('Số từ')}</span></div></div>
          <div class="card stat" style="padding:.8rem"><div><b>${[...a.awl.values()].reduce((x, y) => x + y, 0)}</b><span class="tiny muted">${t('Từ AWL ({pct}%)', { pct: (a.awlRatio * 100).toFixed(1) })}</span></div></div>
          <div class="card stat" style="padding:.8rem"><div><b>${a.link.size}</b><span class="tiny muted">${t('Loại từ nối')}</span></div></div>
          <div class="card stat" style="padding:.8rem"><div><b>${Math.round(a.diversity * 100)}%</b><span class="tiny muted">${t('Độ đa dạng từ')}</span></div></div>
        </div>
        <div><h3>📌 ${t('Nhận xét')}</h3><ul style="margin:.3rem 0;padding-left:1.2rem">${tips.map(tip => `<li style="margin:.3rem 0">${tip}</li>`).join('')}</ul></div>
        ${a.overused.length ? `<div><h3>🔁 ${t('Từ bị lặp & gợi ý thay thế')}</h3><div id="overused">${a.overused.map(([w, n]) => `<div class="row" style="padding:.3rem 0"><b>${esc(w)}</b><span class="chip">×${n}</span><span class="small muted" data-alt="${esc(w)}">${t('đang tìm từ thay thế…')}</span></div>`).join('')}</div></div>` : ''}
        <div><h3>🎓 ${t('Từ học thuật (AWL) đã dùng')}</h3>${list(a.awl, 'lv')}</div>
        <div><h3>🧷 ${t('Từ nối & cụm từ')}</h3>${list(a.link)} ${[...a.phrases.keys()].filter(k => !a.link.has(k)).map(k => `<span class="chip ok">${esc(k)}</span>`).join(' ')}</div>
        <div><h3>📝 ${t('Bài viết được tô sáng')}</h3>
          <div class="hl-bar"><span class="hl-chip awl on">🎓 AWL</span><span class="hl-chip link on">🧷 ${t('Từ nối & cụm')}</span><span class="hl-chip mine on">📒 ${t('Từ của tôi')}</span></div>
          <div class="passage hl-awl hl-link hl-mine" style="font-size:1rem">${Lexis.markText(text, { mine: w => App.inDeck(w) })}</div></div>
      </div>`;
    if (window.AI) AI.attach($('#report'), () => ({ kind: 'task2', task: p.text, text }));
    $('#report').scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Gợi ý thay thế: từ thư viện trước, sau đó Datamuse
    $$('[data-alt]').forEach(async el => {
      const w = el.dataset.alt;
      let alts = ((IELTS_DATA.INDEX[w] || {}).syn || []).slice(0, 4);
      if (alts.length < 3) {
        try { const r = await fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(w)}&max=8`).then(x => x.json()); alts = [...new Set([...alts, ...r.map(x => x.word).filter(x => !/\s/.test(x))])].slice(0, 5); } catch (e) { /* offline */ }
      }
      el.innerHTML = alts.length ? '→ ' + alts.map(x => `<a class="chip" href="#/dict/${encodeURIComponent(x)}">${esc(x)}</a>`).join(' ') : t('không có gợi ý');
    });
    if (fresh) {
      const essays = await Store.get('essays', []);
      essays.unshift({ prompt: p.id, text, words: a.words, band: a.band, at: Date.now() });
      await Store.set('essays', essays.slice(0, 20));
      App.reward({ quizzes: 1, writes: 1, xp: 25 }, $('#analyze'));
      Sfx.win();
    }
  }
})();
