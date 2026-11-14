/* Cambridge English A2 Key → C2 Proficiency (#/cambridge): danh sách đề theo cấp + phòng thi 3 bài (Reading & Writing · Listening · Speaking).
 * Dữ liệu: cpack/cambridge/<cấp>/t<N>.js (self.CAMBRIDGE) + cpack/cambridge/rubric.js (tiêu chí tự diễn đạt). Định dạng: docs/specs/cambridge.md.
 * Không CSS riêng: dùng khung câu hỏi QE (qengine.js, .lq-*), ChoiceKit, trình phát nghe (listening.js), ghi âm UI.recognize, chấm AI tùy chọn (ai.js), css/exam.css.
 * Mỗi đề có phần SẢN SINH: viết (đếm từ, kiểm ý bắt buộc, từ nối, bài mẫu, tiêu chí) và nói (nghe câu hỏi, trả lời, bản ghi, độ dài, lý do, câu mẫu). */
(function () {
  const { $, $$, esc } = UI;
  const App = window.App, { state, routes } = App, view = App.view;
  const LEVELS = [['a2', 'A2 Key'], ['b1', 'B1 Preliminary'], ['b2', 'B2 First'], ['c1', 'C1 Advanced'], ['c2', 'C2 Proficiency']];
  const SPKN = { interview: 'Interview', 'long-turn': 'Long turn', collaborative: 'Collaborative task', discussion: 'Discussion' };
  const WR = new Set(['email', 'story', 'article', 'essay', 'report', 'review', 'letter']); // phần viết sản sinh
  const PAPERS = { rw: ['📖', 'Reading & Writing'], listening: ['🎧', 'Listening'], speaking: ['🗣️', 'Speaking'] };
  const tests = () => self.CAMBRIDGE || [];
  const rub = l => (self.CAMBRIDGE_RUBRIC || {})[l] || { writing: [], speaking: [], linkers: [] };
  const best = () => ((state.game || {}).camBest = (state.game || {}).camBest || {});
  const wc = s => (String(s || '').match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;
  const low = s => ' ' + String(s || '').toLowerCase().replace(/[’]/g, "'") + ' ';
  // Kiểm ý: mỗi ý bắt buộc = 1 nhóm từ khóa, đạt khi bài có ít nhất 1 từ của nhóm (tự kiểm nhanh, không thay giám khảo)
  const pointHits = (text, checks) => (checks || []).map(g => g.some(w => low(text).includes(w.toLowerCase())));
  const linkersUsed = (text, L) => (L || []).filter(w => new RegExp(`\\b${w}\\b`, 'i').test(text));
  App.cambridge = { wc, pointHits, linkersUsed, build: (T, p) => build(T, p) };
  const passage = tx => (Array.isArray(tx) ? tx : String(tx || '').split('\n')).map(p => `<p style="margin:.35rem 0;white-space:pre-wrap">${esc(p).replace(/\((\d{1,2})\)/g, '<b class="qn">$1</b>')}</p>`).join('');
  const QTYPE = { 'mcq': 'mcq', 'mcq-picture': 'mcq', 'mcq-gap': 'mcq', 'matching': 'match', 'gap': 'form', 'open-gap': 'form', 'gapped-text': 'match', 'word-formation': 'form', 'transformation': 'form', 'sentence': 'form' };
  // Nhóm câu theo định dạng QE (qengine.js) – chấm, đánh dấu và "xem chỗ có đáp án" dùng chung với IELTS/TOEIC/TOEFL
  const groupOf = (p, items) => {
    const type = QTYPE[p.type];
    if (type === 'match') return { type, options: p.texts ? p.texts.map(x => `${x.code} ${x.title}`) : p.options, items };
    if (type === 'form') return { type, limit: ({ 'open-gap': 1, 'word-formation': 1, transformation: 5 })[p.type] || 3, items: items.map(it => ({ ...it, text: it.text || `(${it.n}) ___` })) };
    return { type, items: items.map(it => ({ ...it, q: it.q || `(${it.n})`, options: it.pics ? it.options.map((o, k) => `${it.pics[k]} ${o}`) : it.options })) };
  };
  const head = (title, sub) => `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div></div>`;

  // ---------- Danh sách đề ----------
  routes.cambridge = function (id, query) {
    if (id && tests().some(x => x.id === id)) return paper(tests().find(x => x.id === id), (query && query.get && query.get('p')) || 'rw');
    const b = best();
    view.innerHTML = head('🎓 Cambridge English', t('Đề tự biên soạn đúng định dạng Cambridge từ A2 Key đến C2 Proficiency: Đọc & Viết, Nghe, Nói – có lời giải, bài mẫu và tiêu chí chấm.'))
      + LEVELS.map(([l, name]) => { const xs = tests().filter(x => x.level === l).sort((a, c) => a.n - c.n); return `<h2 style="margin-top:1.2rem">${esc(name)}</h2>`
        + (xs.length ? `<div class="grid auto">${xs.map(x => `<div class="card"><span class="chip">${l.toUpperCase()}</span> <b>${esc(x.title)}</b>
          <div class="row" style="margin-top:.6rem;flex-wrap:wrap">${Object.entries(PAPERS).map(([k, [ic, nm]]) => `<a class="btn sm${k === 'rw' ? ' primary' : ''}" href="#/cambridge/${x.id}?p=${k}">${ic} ${nm}${b[x.id + ':' + k] != null ? ` · ${b[x.id + ':' + k]}%` : ''}</a>`).join('')}</div></div>`).join('')}</div>`
          : `<div class="card empty-note"><p class="muted" style="margin:0">${t('Đang soạn đề cho cấp này.')}</p></div>`); }).join('')
      + `<p class="tiny muted" style="margin-top:1rem">${t('Điểm trong ứng dụng là tỉ lệ câu đúng để tự theo dõi, không phải điểm Cambridge English Scale chính thức.')}</p>`;
  };

  // ---------- Phòng thi ----------
  function paper(T, p) {
    if (!PAPERS[p]) p = 'rw';
    const tabs = `<div class="row" role="tablist" style="flex-wrap:wrap;margin-bottom:.8rem">${Object.entries(PAPERS).map(([k, [ic, nm]]) => `<a role="tab" aria-selected="${k === p}" class="btn sm${k === p ? ' primary' : ''}" href="#/cambridge/${T.id}?p=${k}">${ic} ${nm}</a>`).join('')}</div>`;
    view.innerHTML = head(`🎓 ${esc(T.title)}`, `<a href="#/cambridge">← Cambridge English</a>`) + tabs + '<div id="camBody"></div>';
    const body = $('#camBody');
    if (p === 'speaking') return speaking(T, body);
    const { P, groups, html } = build(T, p);
    body.innerHTML = html
      + `<div class="row" style="margin-top:1rem"><button class="btn primary" id="camSub">✅ ${t('Nộp bài & xem giải thích')}</button></div><div id="camRes" style="margin-top:1rem"></div>`;
    $$('.lq-wrap', body).forEach(el => QE.bind(el));
    $$('[data-w]', body).forEach(ta => { const out = $(`[data-wc="${ta.dataset.w}"]`, body); ta.oninput = () => { out.textContent = t('{n} từ', { n: wc(ta.value) }); }; });
    if (p === 'listening') bindPlayers(P, body);
    $('#camSub').onclick = () => submit(T, p, P, groups, body);
  }
  // Dựng HTML + danh sách nhóm câu [phần, khung, nhóm QE] – mỗi nhóm PHẢI có đúng một khung [data-g] (test cambridge.mjs)
  function build(T, p) {
    const P = (T[p] || {}).parts || [], groups = [];
    return { P, groups, html: P.map((x, k) => `<div class="card" data-part="${k}"><h3 style="margin-top:0">Part ${x.n}</h3><p class="lq-instr">${esc(x.instr || x.prompt || '')}</p>${partHtml(x, k, p, groups)}</div>`).join('') };
  }
  function partHtml(x, k, p, groups) {
    if (WR.has(x.type)) return `${x.points ? `<ul class="small">${x.points.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}${x.pictures ? `<div class="grid g3">${x.pictures.map((pc, i) => `<div class="card" style="margin:0;text-align:center"><div style="font-size:2.4rem" aria-hidden="true">${pc.ic}</div><div class="tiny muted">${i + 1}. ${esc(pc.alt)}</div></div>`).join('')}</div>` : ''}
      <p class="small"><b>${esc(x.prompt)}</b> <span class="muted">${t('Viết {n} từ trở lên.', { n: x.min_words })}</span></p>
      <textarea class="input" data-w="${k}" style="min-height:160px;line-height:1.6" spellcheck="false" aria-label="Part ${x.n}"></textarea><div class="tiny muted" data-wc="${k}">${t('{n} từ', { n: 0 })}</div><div data-wfb="${k}"></div>`;
    if (p === 'listening') return x.units.map((u, j) => { const g = groupOf(x, u.items); groups.push([k, j, g]);
      return `<div class="toeic-u" data-u="${k}-${j}">${u.title ? `<b>${esc(u.title)}</b>` : ''}<div class="row nowrap" style="margin:.4rem 0"><button class="btn sm primary" data-play="${k}-${j}">▶ ${t('Nghe')}</button><span class="tiny muted" data-now="${k}-${j}"></span></div>
        ${x.type === 'matching' && j === 0 ? `<div class="lq-box">${x.options.map(o => `<span>${esc(o)}</span>`).join('')}</div>` : ''}<div class="lq-wrap" data-g="${k}-${j}">${QE.questionsHtml({ groups: [g] })}</div>
        <details data-tr="${k}-${j}" hidden><summary class="small"><b>📜 ${t('Lời thoại (transcript)')}</b></summary>${u.script.filter(l => l.t).map(l => `<div class="small"><b>${esc((u.speakers[l.s] || {}).name || l.s)}:</b> ${esc(l.t)}</div>`).join('')}</details></div>`; }).join('');
    const lead = x.texts ? x.texts.map(y => `<div class="card" style="margin:.4rem 0"><b>${y.code} · ${esc(y.title)}</b>${passage(y.text)}</div>`).join('')
      : x.text ? `${x.title ? `<h4 style="margin:.2rem 0">${esc(x.title)}</h4>` : ''}${x.by ? `<div class="tiny muted">${esc(x.by)}</div>` : ''}${passage(x.text)}` : '';
    // Part 1 (biển báo, tin nhắn): mỗi câu một văn bản ngắn ngay trên câu hỏi
    if (x.items.some(it => it.text && it.options)) return x.items.map(it => { const g1 = groupOf(x, [it]); groups.push([k, 'i' + it.n, g1]); return `<div class="card" style="margin:.4rem 0;white-space:pre-wrap;font-weight:600">${esc(it.text)}</div><div class="lq-wrap" data-g="${k}-i${it.n}">${QE.questionsHtml({ groups: [g1] })}</div>`; }).join('');
    const g = groupOf(x, x.items); groups.push([k, 0, g]);
    return `${lead}<div class="lq-wrap" data-g="${k}-0">${QE.questionsHtml({ groups: [g] })}</div>`;
  }
  function bindPlayers(P, body) {
    const can = App.listening && App.listening.Player, pls = [];
    P.forEach((x, k) => x.units.forEach((u, j) => {
      const id = `${k}-${j}`, btn = $(`[data-play="${id}"]`, body), now = $(`[data-now="${id}"]`, body);
      if (!can) { btn.disabled = true; now.textContent = t('Trình phát chưa sẵn sàng – hãy tải lại trang.'); return; }
      let plays = 0; const pl = App.listening.Player(u, { onState: on => { btn.textContent = on ? '⏸ ' + t('Tạm dừng') : '▶ ' + t('Nghe'); }, onEnd: () => { btn.textContent = '↻ ' + t('Nghe lại');  plays++; now.textContent = plays >= 2 ? '✓ ' + t('Đã nghe 2 lần (như thi thật)') : '↻ ' + t('Nghe lần 2'); } });
      pls.push(pl); btn.onclick = () => { if (pl.playing) return pl.pause(); pls.forEach(o => o !== pl && o.stop()); pl.play(pl.pos > 0 && pl.pos < u.script.length ? undefined : 0); };
    }));
  }
  function submit(T, p, P, groups, body) {
    let right = 0, total = 0;
    for (const [k, j, g] of groups) {
      const root = $(`[data-g="${k}-${j}"]`, body); if (!root) continue; const res = QE.collect({ groups: [g] }, root);
      QE.mark(root, res);
      for (const it of g.items) { total++; if (res[it.n] && res[it.n].ok) right++; const fb = $(`[data-item="${it.n}"] .lq-fb`, root); if (fb && it.explain) fb.insertAdjacentHTML('beforeend', `<div class="tiny muted" style="margin-top:.2rem">💡 ${esc(QE.exT(it.explain))}</div>`); }
    }
    $$('details[data-tr]', body).forEach(d => { d.hidden = false; });
    P.forEach((x, k) => { if (WR.has(x.type)) writeFb(T, x, k, body); });
    const pct = total ? Math.round(100 * right / total) : 0, b = best(), key = T.id + ':' + p;
    if (b[key] == null || pct > b[key]) b[key] = pct;
    $('#camRes').innerHTML = `<div class="card"><h3 style="margin-top:0">${t('Kết quả: {a}/{b} câu đúng ({p}%)', { a: right, b: total, p: pct })}</h3><p class="small muted" style="margin:0">${t('Xem lời giải dưới từng câu. Phần viết có nhận xét riêng ngay dưới bài.')}</p></div>`;
    App.reward({ quizzes: 1, xp: 10 + right });
  }
  // Phản hồi viết: số từ, ý bắt buộc, từ nối, tiêu chí cấp, bài mẫu, AI (tùy chọn)
  function writeFb(T, x, k, body) {
    const txt = $(`[data-w="${k}"]`, body).value, n = wc(txt), hits = pointHits(txt, x.checks), L = linkersUsed(txt, rub(T.level).linkers), out = $(`[data-wfb="${k}"]`, body);
    out.innerHTML = `<div class="card" style="margin:.5rem 0 0">
      <div class="small">${n >= x.min_words ? '✅' : '⚠️'} ${t('{n} từ (tối thiểu {m})', { n, m: x.min_words })}</div>
      ${(x.points || x.pictures || []).map((pt, i) => `<div class="small">${hits[i] ? '✅' : '⚠️'} ${esc(pt.alt || pt)}</div>`).join('')}
      <div class="small">${L.length >= 2 ? '✅' : '💡'} ${t('Từ nối đã dùng: {w}', { w: L.length ? L.join(', ') : '–' })}</div>
      <ul class="tiny muted">${x.tips.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      <details><summary class="small"><b>📏 ${t('Tiêu chí chấm (0–5 mỗi tiêu chí)')}</b></summary>${rub(T.level).writing.map(c => `<div class="small" style="margin:.3rem 0"><b>${esc(c.name)}</b><div class="tiny">5 · ${esc(c.b5)}</div><div class="tiny">3 · ${esc(c.b3)}</div><div class="tiny">1 · ${esc(c.b1)}</div></div>`).join('')}</details>
      <details><summary class="small"><b>📝 ${t('Bài mẫu')}</b></summary><p class="small" style="white-space:pre-wrap">${esc(x.model)}</p></details>
      ${window.AI && n ? `<button class="btn sm" data-ai="${k}">🤖 ${t('Nhận xét bằng AI')}</button><div data-aio="${k}"></div>` : ''}</div>`;
    const ai = $(`[data-ai="${k}"]`, out); if (ai) ai.onclick = () => aiFb(T, x, txt, $(`[data-aio="${k}"]`, out));
  }
  async function aiFb(T, x, txt, out) {
    const go = () => aiFb(T, x, txt, out);
    try {
      if (!(await AI.getKey())) { const st = await AI.nanoStatus(); if (st === 'none' || st === 'unavailable') return AI.keyDialog(go); }
      out.innerHTML = `<p class="small muted">⏳ ${t('Đang chấm…')}</p>`;
      const crit = rub(T.level).writing.map(c => `${c.name} (0-5): 5 = ${c.b5} 3 = ${c.b3} 1 = ${c.b1}`).join('\n');
      const r = await AI.ask(`You are a friendly, experienced Cambridge English teacher marking a ${T.level.toUpperCase()} learner's writing (task: ${x.prompt}${x.points ? ' Points: ' + x.points.join('; ') : ''}). Minimum ${x.min_words} words.\nCriteria:\n${crit}\nGive a mark 0-5 for each criterion with one short reason, then 2 corrected sentences from the text, then one tip for next time. Simple English at the learner's level.\n\nText:\n${txt}`);
      out.innerHTML = `<div class="card small" style="white-space:pre-wrap;margin-top:.4rem">${esc(r)}</div>`;
    } catch (e) { out.innerHTML = `<div class="card small">❌ ${esc(AI.errText ? AI.errText(e) : e.message)}</div>`; }
  }

  // ---------- Speaking: nghe câu hỏi giám khảo → trả lời → bản ghi + phản hồi ----------
  function speaking(T, body) {
    const S = T.speaking || { parts: [] }, R = rub(T.level), qs = [];
    const qRow = (q, models) => { const i = qs.push([q, models[q]]) - 1; return `<div class="lq-item" data-sq="${i}"><div class="row between" style="gap:.4rem;flex-wrap:wrap"><span>${esc(q)}</span><span class="row nowrap"><button class="btn sm" data-hear="${i}" aria-label="${esc(t('Nghe'))}">🔊</button><button class="btn sm primary" data-rec="${i}">🎙️ ${t('Trả lời')}</button></span></div><div data-sfb="${i}" class="small"></div></div>`; };
    body.innerHTML = S.parts.map(p => `<div class="card"><h3 style="margin-top:0">Part ${p.n} · ${SPKN[p.type] || 'Discussion'}</h3>
      ${p.type === 'interview' ? p.phases.map(ph => `${ph.topic ? `<h4 style="margin:.6rem 0 .2rem">${esc(ph.topic)}</h4>` : ''}${[...ph.q, ...(ph.extended ? [ph.extended] : [])].map(q => qRow(q, p.models || {})).join('')}`).join('')
        : `<p class="lq-instr">${esc(p.prompt)}</p>${p.options ? `<div class="grid g3">${p.options.map(o => `<div class="card" style="margin:0;text-align:center"><div style="font-size:2rem" aria-hidden="true">${o.ic}</div><div class="small">${esc(o.label)}</div></div>`).join('')}</div>` : ''}
        ${p.partnerLines ? `<div class="small" style="margin:.6rem 0"><b>${t('Bạn cùng thi nói:')}</b>${p.partnerLines.map(l => `<div class="row" style="gap:.4rem"><button class="btn sm" data-say="${esc(l)}" aria-label="${esc(t('Nghe'))}">🔊</button><i>${esc(l)}</i></div>`).join('')}</div>` : ''}
        ${[p.prompt, ...p.follow].map(q => qRow(q, p.models || {})).join('')}<div class="tiny muted">${t('Mẫu câu hữu ích:')} ${(p.useful || []).map(esc).join(' · ')}</div>`}
      ${p.tips ? `<ul class="tiny muted">${p.tips.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}</div>`).join('')
      + `<div class="card"><details><summary class="small"><b>📏 ${t('Tiêu chí chấm (0–5 mỗi tiêu chí)')}</b></summary>${R.speaking.map(c => `<div class="small" style="margin:.3rem 0"><b>${esc(c.name)}</b><div class="tiny">5 · ${esc(c.b5)}</div><div class="tiny">3 · ${esc(c.b3)}</div><div class="tiny">1 · ${esc(c.b1)}</div></div>`).join('')}</details></div>`;
    $$('[data-hear]', body).forEach(b => { b.onclick = () => UI.tts(qs[+b.dataset.hear][0], 'en-GB', 0.95); });
    $$('[data-say]', body).forEach(b => { b.onclick = () => UI.tts(b.dataset.say, 'en-US', 0.95); });
    $$('[data-rec]', body).forEach(b => { b.onclick = () => {
      const i = +b.dataset.rec, [q, model] = qs[i], out = $(`[data-sfb="${i}"]`, body), ext = /tell me|why|which|what was/i.test(q);
      out.textContent = '🔴 ' + t('Đang nghe…');
      UI.recognize('', 'en-GB', { setup: r => { r.continuous = ext; },
        result: ({ heard }) => {
          const n = wc(heard), want = ext ? 25 : 6, why = /\b(because|so|but|and)\b/i.test(heard);
          out.innerHTML = `<div>${t('máy nghe: “{heard}”', { heard: esc(heard) })}</div><div>${n >= want ? '✅' : '💡'} ${t('{n} từ – nên nói khoảng {m} từ trở lên', { n, m: want })}</div><div>${why ? '✅' : '💡'} ${t('Thêm lý do hoặc ví dụ (because, so, for example…)')}</div>${model ? `<details><summary><b>${t('Câu trả lời mẫu')}</b></summary><i>${esc(model)}</i></details>` : ''}`;
          App.reward({ spoken: 1, xp: 3 });
        },
        error: e => { out.textContent = UI.recErrorText ? UI.recErrorText(e) : t('Không nhận được giọng nói'); },
      });
    }; });
  }
})();
