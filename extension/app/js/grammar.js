/* Ngữ pháp IELTS: danh sách bài theo chủ điểm, bài học trực quan (dòng thời gian, công thức màu, sơ đồ, thang đo), bài tập có chấm điểm. */
(function () {
  const { $, $$, esc, speak, ring } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  const L = () => CHAPTERS.flatMap(c => lessonsOf(c));
  const UNITS = [
    { id: 'foundation', name: 'Nền tảng', emoji: '🧱', desc: 'Từ loại, cấu tạo từ, đại từ, câu hỏi, số liệu – gốc rễ cho người mới', color: '#16a34a' },
    { id: 'tenses', name: 'Thì động từ', emoji: '⏳', desc: '12 thì & cách diễn đạt tương lai – nền tảng cho mọi câu', color: '#6d5dfc' },
    { id: 'verbs', name: 'Cấu trúc động từ', emoji: '⚙️', desc: 'Động từ khuyết thiếu, bị động, câu điều kiện, câu tường thuật', color: '#0ea5a4' },
    { id: 'words', name: 'Từ loại & cụm từ', emoji: '🧱', desc: 'Mạo từ, danh từ đếm được, so sánh, giới từ, hòa hợp chủ – vị', color: '#f59e0b' },
    { id: 'sentences', name: 'Câu phức & nâng band', emoji: '🏗️', desc: 'Mệnh đề quan hệ, mệnh đề danh từ, liên kết, đảo ngữ – band 7+', color: '#c026d3' },
    { id: 'academic', name: 'Học thuật nâng cao', emoji: '🎓', desc: 'Mệnh đề phân từ, giả định, nominalisation, hedging, dấu câu – band 7.5+', color: '#1d4ed8' },
  ];
  const CHAPTERS = [
    { n: 1, name: 'Các thì', emoji: '⏳', color: '#6d5dfc', desc: '12 thì từ cơ bản đến nâng cao và cách diễn đạt tương lai',
      ids: ['present-simple', 'present-continuous', 'present-perfect', 'present-perfect-continuous', 'past-simple', 'past-continuous', 'past-perfect', 'past-perfect-continuous', 'future-forms', 'future-continuous-perfect', 'used-to-would', 'stative-dynamic', 'ed-s-endings'] },
    { n: 2, name: 'Sự phối hợp các thì', emoji: '🔗', color: '#7c3aed', desc: 'Phối hợp thì trong câu phức, mệnh đề thời gian, chọn thì cho IELTS',
      ids: ['sequence-of-tenses', 'future-in-past', 'tenses-ielts'] },
    { n: 3, name: 'Mệnh đề & cụm từ', emoji: '🧩', color: '#0ea5a4', desc: 'Câu điều kiện, wish, mệnh đề quan hệ, danh từ, trạng ngữ, phân từ, mục đích – kết quả',
      ids: ['conditionals-0-1', 'conditionals-2-3', 'mixed-conditionals-wish', 'alternatives-to-if', 'relative-clauses', 'noun-clauses', 'adverbial-clauses', 'participle-clauses', 'purpose-result', 'reason-contrast', 'as-if-unreal-past', 'so-such-too-enough', 'gerund-infinitive'] },
    { n: 4, name: 'Diễn tả số lượng', emoji: '🔢', color: '#f59e0b', desc: 'Danh từ đếm được, lượng từ, từ hạn định, số liệu, hòa hợp chủ – vị',
      ids: ['countable-uncountable', 'determiners', 'quantity-advanced', 'numbers-data-language', 'subject-verb-agreement'] },
    { n: 5, name: 'Văn phong & viết lại câu', emoji: '🖋️', color: '#16a34a', desc: 'Diễn đạt một ý bằng nhiều cách – paraphrase, hedging, danh từ hóa, liên kết, dấu câu',
      ids: ['paraphrase-structures', 'paraphrase-ielts', 'hedging', 'nominalisation', 'parallel-structure', 'reference-substitution', 'punctuation', 'idioms-style'] },
    { n: 6, name: 'Dạng nhấn mạnh', emoji: '📣', color: '#e5484d', desc: 'Đảo ngữ, câu chẻ, nhấn mạnh với do/does/did (nhấn mạnh khi nói: xem Thư viện phát âm)',
      ids: ['emphasis-variety', 'inversion-cleft'] },
    { n: 7, name: 'Từ loại', emoji: '🧱', color: '#0369a1', desc: 'Danh từ, động từ, động từ khuyết thiếu, tính từ, trạng từ, đại từ, mạo từ, giới từ, liên từ',
      ids: ['parts-of-speech-patterns', 'word-formation', 'nouns', 'noun-plurals', 'possessive-case', 'articles', 'pronouns', 'verb-types', 'modals-ability-permission', 'modals-obligation-advice', 'modals-deduction', 'preference-advice', 'subjunctive', 'adjectives-adverbs', 'adjectives-special', 'ing-ed-adjectives-prepositions', 'comparatives-superlatives', 'comparison-special', 'adverbs-position', 'prepositions', 'dependent-prepositions', 'phrasal-verbs-grammar', 'conjunctions', 'there-is-empty-it'] },
    { n: 8, name: 'Lời nói gián tiếp', emoji: '💬', color: '#c026d3', desc: 'Lùi thì, câu hỏi, mệnh lệnh và các động từ tường thuật',
      ids: ['reported-speech', 'reported-advanced'] },
    { n: 9, name: 'Câu chủ động – bị động', emoji: '🔄', color: '#1d4ed8', desc: 'Bị động mọi thì, bị động tường thuật, thể sai khiến',
      ids: ['passive-voice', 'passive-reporting-causative'] },
    { n: 10, name: 'Câu', emoji: '🏗️', color: '#64748b', desc: 'Phân loại câu, câu hỏi, câu hỏi đuôi, câu mệnh lệnh, câu phức band 7+',
      ids: ['sentence-types', 'questions', 'question-tags-short-answers', 'imperatives-suggestions', 'complex-sentences'] },
  ];
  const UNIT_FALLBACK = { tenses: 1, verbs: 7, words: 7, sentences: 10, foundation: 7, academic: 5 };
  const chapterOf = id => { const c = CHAPTERS.find(c => c.ids.includes(id)); if (c) return c; const l = (window.GRAMMAR || []).find(x => x.id === id); return CHAPTERS.find(c => c.n === UNIT_FALLBACK[l && l.unit]) || CHAPTERS[6]; };
  const lessonsOf = c => { const all = window.GRAMMAR || []; const listed = c.ids.map(id => all.find(x => x.id === id)).filter(Boolean); const extra = all.filter(x => !CHAPTERS.some(cc => cc.ids.includes(x.id)) && chapterOf(x.id) === c); return [...listed, ...extra]; };
  const done = () => state.game.grammarDone || {};
  const sayBtn = s => `<button class="icon-btn sm" data-speak-text="${esc(s)}" title="${t('Nghe')}">🔊</button>`;

  routes.grammar = function (id) {
    if (id === 'mix') return mix(arguments[1]);
    if (id) return lesson(id, arguments[1]);
    const all = L();
    const d = done();
    view.innerHTML = `
      <div class="page-head"><div><h1>📐 ${t('Ngữ pháp IELTS')}</h1><p class="muted">${t('{n} bài học trực quan: dòng thời gian, công thức tô màu, sơ đồ biến đổi câu, lỗi người Việt hay mắc và bài tập chấm điểm ngay.', { n: all.length })}</p></div>
        <div class="row">${ring(all.length ? Object.keys(d).length / all.length * 100 : 0, `${Object.keys(d).length}/${all.length}`, 'var(--good)')}<a class="btn primary" href="#/grammar/mix">🔀 ${t('Luyện tổng hợp {n} câu', { n: 20 })}</a></div></div>
      <div class="chap-nav">${CHAPTERS.map(c => `<a href="#chap${c.n}" class="chip" data-chap="${c.n}">${c.emoji} Ch.${c.n}</a>`).join('')}<a class="chip" href="#chap11" data-chap="11">📝 Ch.11</a></div>
      ${CHAPTERS.map(c => {
        const ls = lessonsOf(c);
        if (!ls.length) return '';
        const u = { color: c.color };
        const dn = ls.filter(x => d[x.id] >= 80).length;
        return `<div class="section-title" id="chap${c.n}"><h2>${c.emoji} ${t('Chương {n}', { n: c.n })} · ${esc(t(c.name))} <span class="muted small">(${dn}/${ls.length})</span></h2>
            <a class="btn sm" href="#/grammar/mix?ch=${c.n}">📝 ${t('Kiểm tra chương')}</a></div><p class="muted small" style="margin-top:-.6rem">${esc(t(c.desc))}</p>
          <div class="grid auto">${ls.map(x => `
            <a class="card hover topic-card" href="#/grammar/${x.id}" style="color:var(--text);border-top:4px solid ${u.color}">
              <div class="row between"><span class="em">${x.emoji}</span>${d[x.id] ? `<span class="chip ok">✓ ${d[x.id]}%</span>` : levelChip(x.level)}</div>
              <h3>${esc(x.title)}</h3><div class="tiny muted" style="font-weight:700">${esc(x.en)}</div>
              <div class="muted small">${esc(x.summary)}</div>
            </a>`).join('')}</div>`;
      }).join('') || `<div class="card empty"><div class="em">📐</div>${t('Đang cập nhật bài học…')}</div>`}
      <div class="section-title" id="chap11"><h2>📝 ${t('Chương {n}', { n: 11 })} · ${t('Kiểm tra tổng hợp')}</h2></div>
      <div class="grid auto"><a class="card hover topic-card" href="#/grammar/mix" style="color:var(--text)"><span class="em">🔀</span><h3>${t('Đề tổng hợp {n} câu', { n: 20 })}</h3><div class="muted small">${t('Trộn câu hỏi từ các bài đã học (hoặc mọi bài)')}</div></a>
        <a class="card hover topic-card" href="#/grammar/mix?n=40" style="color:var(--text)"><span class="em">🏁</span><h3>${t('Đề tổng hợp {n} câu', { n: 40 })}</h3><div class="muted small">${t('Ôn toàn bộ chương trình – như bài thi cuối khóa')}</div></a></div>`;
    $$('.chap-nav a[data-chap]').forEach(a => a.onclick = e => { e.preventDefault(); const el = document.getElementById('chap' + a.dataset.chap); if (el) el.scrollIntoView({ behavior: 'smooth' }); });
  };
  const levelChip = l => l ? `<span class="chip lv ${esc(l)}">${esc(l)}</span>` : '';

  // ---------- Các khối hiển thị ----------
  function timeline(b) {
    const X = v => 40 + v * 6.4; // 0..100 → 40..680
    const marks = (b.marks || []).map(m => {
      if (m.kind === 'now') return `<line x1="${X(50)}" y1="22" x2="${X(50)}" y2="98" stroke="var(--again)" stroke-width="2" stroke-dasharray="4 3"/><text x="${X(50)}" y="16" text-anchor="middle" class="tl-now">NOW</text>`;
      if (m.kind === 'point') return `<circle cx="${X(m.at)}" cy="60" r="9" fill="var(--primary)"/><text x="${X(m.at)}" y="90" text-anchor="middle" class="tl-lab">${esc(m.label || '')}</text>`;
      if (m.kind === 'range') return `<rect x="${X(m.from)}" y="50" width="${X(m.to) - X(m.from)}" height="20" rx="10" fill="var(--primary)" opacity=".75"/><text x="${(X(m.from) + X(m.to)) / 2}" y="90" text-anchor="middle" class="tl-lab">${esc(m.label || '')}</text>`;
      if (m.kind === 'arrow') return `<line x1="${X(m.from)}" y1="60" x2="${X(m.to) - 8}" y2="60" stroke="var(--accent)" stroke-width="5" stroke-linecap="round"/><polygon points="${X(m.to)},60 ${X(m.to) - 12},52 ${X(m.to) - 12},68" fill="var(--accent)"/><text x="${(X(m.from) + X(m.to)) / 2}" y="44" text-anchor="middle" class="tl-lab">${esc(m.label || '')}</text>`;
      if (m.kind === 'repeat') { const n = 6, pts = []; for (let i = 0; i < n; i++) pts.push(`<circle cx="${X(m.from + (m.to - m.from) * i / (n - 1))}" cy="60" r="6" fill="var(--hard)"/>`); return pts.join('') + `<text x="${(X(m.from) + X(m.to)) / 2}" y="90" text-anchor="middle" class="tl-lab">${esc(m.label || '')}</text>`; }
      return '';
    }).join('');
    return `<div class="g-visual"><svg viewBox="0 0 720 110" class="timeline" role="img" aria-label="${esc(b.caption || t('Dòng thời gian'))}">
      <line x1="30" y1="60" x2="700" y2="60" stroke="var(--line)" stroke-width="4" stroke-linecap="round"/><polygon points="712,60 698,52 698,68" fill="var(--line)"/>
      <text x="40" y="106" class="tl-ax">${t('QUÁ KHỨ')}</text><text x="680" y="106" text-anchor="end" class="tl-ax">${t('TƯƠNG LAI')}</text>${marks}</svg>
      ${b.caption ? `<div class="small muted center">${esc(b.caption)}</div>` : ''}</div>`;
  }
  const formula = b => `<div class="g-block"><h3>🧮 ${t('Công thức')}</h3>${b.rows.map(r => `<div class="frow"><div class="flabel">${esc(r.label)}</div>
      <div class="fparts">${r.parts.map(p => `<span class="fp ${esc(p.c || '')}">${esc(p.t)}</span>`).join('<span class="fplus">+</span>')}</div>
      ${r.ex ? `<div class="fex">➜ ${esc(r.ex)} ${sayBtn(r.ex)}</div>` : ''}</div>`).join('')}
      <div class="tiny muted" style="margin-top:.4rem"><span class="fp subj">${t('Chủ ngữ')}</span> <span class="fp aux">${t('Trợ động từ')}</span> <span class="fp verb">${t('Động từ')}</span> <span class="fp neg">${t('Phủ định')}</span> <span class="fp obj">${t('Tân ngữ')}</span> <span class="fp time">${t('Thời gian')}</span></div></div>`;
  const uses = b => `<div class="g-block"><h3>🎯 ${t('Khi nào dùng?')}</h3><div class="uses">${b.items.map((u, i) => `<div class="use"><span class="unum">${i + 1}</span><div><b>${esc(u.title)}</b><div>${esc(u.ex)} ${sayBtn(u.ex)}</div><div class="muted small">${esc(u.vi || '')}</div></div></div>`).join('')}</div></div>`;
  const signals = b => `<div class="g-block"><h3>🚦 ${t('Dấu hiệu nhận biết')}</h3><div class="row">${b.words.map(w => `<span class="chip lv">${esc(w)}</span>`).join('')}</div></div>`;
  const table = b => `<div class="g-block" style="overflow-x:auto"><table class="gtable"><thead><tr>${b.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const tip = b => `<div class="g-tip">💡 ${esc(b.text)}</div>`;
  const mistake = b => `<div class="g-mistake"><div><span class="bad">✗</span> <s>${esc(b.wrong)}</s></div><div><span class="good">✓</span> <b>${esc(b.right)}</b> ${sayBtn(b.right)}</div><div class="small muted">${esc(b.why)}</div></div>`;
  const ielts = b => `<div class="g-ielts"><b>🎓 ${t('Trong IELTS:')}</b> ${esc(b.text)}${b.ex ? `<div class="ex" style="margin-top:.3rem">“${esc(b.ex)}” ${sayBtn(b.ex)}</div>` : ''}</div>`;
  const diagram = b => `<div class="g-visual"><div class="flow">${b.steps.map(s => `<div class="fstep ${esc(s.c || '')}">${esc(s.t)}</div>`).join('')}</div>${b.caption ? `<div class="small muted center">${esc(b.caption)}</div>` : ''}</div>`;
  const scale = b => `<div class="g-visual"><div class="scale">${b.items.slice().sort((x, y) => y.v - x.v).map(i => `<div class="srow"><b>${esc(i.t)}</b><div class="sbar"><i style="width:${i.v}%;background:hsl(${i.v * 1.2},70%,48%)"></i></div><span class="tiny muted">${i.v}%</span></div>`).join('')}</div>${b.caption ? `<div class="small muted center">${esc(b.caption)}</div>` : ''}</div>`;
  const sort = b => `<div class="g-visual"><div class="grid g2">${b.groups.map(gr => `<div class="sortbox"><div style="font-size:1.6rem">${gr.emoji || ''}</div><b>${esc(gr.title)}</b><div class="row center" style="margin-top:.4rem">${gr.items.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div></div>`).join('')}</div>${b.caption ? `<div class="small muted center">${esc(b.caption)}</div>` : ''}</div>`;
  const R = { timeline, formula, uses, signals, table, tip, mistake, ielts, diagram, scale, sort };

  // Trộn câu hỏi từ các bài đã học (hoặc mọi bài) – học xen kẽ giúp nhớ lâu hơn
  function mix(query) {
    const ch = query && +query.get('ch'), n = (query && +query.get('n')) || 20;
    const chap = ch && CHAPTERS.find(c => c.n === ch);
    const all = chap ? lessonsOf(chap) : L(), d = done();
    const pool = (!chap && Object.keys(d).length >= 3 ? all.filter(x => d[x.id] != null) : all).flatMap(x => [...x.quiz.map(q => ({ q, x })), ...drillsOf(x).map(d => ({ d, x }))]);
    const qs = UI.shuffle(pool).slice(0, n);
    let i = 0, right = 0;
    const next = () => {
      if (i >= qs.length) {
        const pct = Math.round(right / qs.length * 100);
        App.reward({ quizzes: 1, grammar: 1, perfect: pct === 100 ? 1 : 0, xp: 10 + right * 2 }); if (pct >= 80) { Sfx.win(); confetti(); }
        view.innerHTML = `<div class="study-wrap"><div class="card celebrate empty"><div class="em">🔀</div><h2>${t('{right}/{total} câu đúng ({pct}%)', { right, total: qs.length, pct })}</h2><p class="muted">${t('Câu sai đã được ghi vào <a href="#/mistakes">Sổ lỗi sai</a>.')}</p><div class="row center"><a class="btn primary" href="#/grammar/mix">${t('Luyện lượt mới')}</a><a class="btn" href="#/grammar">${t('Về danh sách bài')}</a></div></div></div>`;
        return;
      }
      const { q, x, d } = qs[i];
      if (d) {
        view.innerHTML = `<div class="study-wrap"><div class="study-top"><a class="icon-btn" href="#/grammar">✕</a><div class="progress"><i style="width:${i / qs.length * 100}%"></i></div><span class="small muted">${i + 1}/${qs.length}</span></div>
          <div class="card q-card"><div class="tiny muted">${x.emoji} ${esc(x.title)}</div>${drillItem(d, 0)}</div><div id="fb"></div></div>`;
        const item = $('.dr'), done = r => {
          if (!r) return; if (r.ok) right++;
          if (!r.ok && App.logMistake) App.logMistake({ kind: 'grammar', q: d.t === 'error' ? d.parts.join(' ') : d.q, answer: r.answer, given: r.given, explain: d.ex || '', ref: x.id });
          $('#fb').innerHTML = `<div class="row" style="margin-top:.8rem"><button class="btn primary" id="nx">${t('Tiếp')} ↵</button><a class="btn sm ghost" href="#/grammar/${x.id}">${t('Xem lại bài')}</a></div>`;
          $('#nx').onclick = () => { i++; next(); }; $('#nx').focus();
        };
        if (d.t === 'error') $$('.dr-part', item).forEach(b => b.onclick = () => { if (!item.dataset.locked) done(gradeDrill(item, d, +b.dataset.j)); });
        else { const go = () => { if (!item.dataset.locked) done(gradeDrill(item, d)); }; $('.dr-chk', item).onclick = go; const inp = $('.dr-in', item); inp.focus(); inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } }); }
        return;
      }
      view.innerHTML = `<div class="study-wrap"><div class="study-top"><a class="icon-btn" href="#/grammar">✕</a><div class="progress"><i style="width:${i / qs.length * 100}%"></i></div><span class="small muted">${i + 1}/${qs.length}</span></div>
        <div class="card q-card"><div class="tiny muted">${x.emoji} ${esc(x.title)}</div><div style="font-size:1.15rem;font-weight:700;margin-top:.5rem">${esc(q.q)}</div></div>
        <div class="options">${q.options.map((o, k) => `<button class="option" data-k="${k}"><span class="kbd">${k + 1}</span>${esc(o)}</button>`).join('')}</div><div id="fb"></div></div>`;
      $$('.option').forEach(b => b.onclick = () => {
        if ($('#fb').innerHTML) return;
        const ok = +b.dataset.k === q.answer;
        $$('.option')[q.answer].classList.add('right'); if (!ok) b.classList.add('wrong');
        ok ? (right++, Sfx.correct()) : Sfx.wrong();
        if (!ok && App.logMistake) App.logMistake({ kind: 'grammar', q: q.q, answer: q.options[q.answer], given: q.options[+b.dataset.k], explain: q.explain, ref: x.id });
        $('#fb').innerHTML = `<div class="feedback ${ok ? 'ok' : 'no'}"><b>${ok ? '✅ ' + t('Chính xác!') : '❌ ' + t('Chưa đúng')}</b><div class="small">${esc(q.explain)}</div><div class="row" style="margin-top:.5rem"><button class="btn primary" id="nx">${t('Tiếp')} ↵</button><a class="btn sm ghost" href="#/grammar/${x.id}">${t('Xem lại bài')}</a></div></div>`;
        $('#nx').onclick = () => { i++; next(); }; $('#nx').focus();
      });
    };
    next();
  }

  // ---------- Bài tập (dùng chung cho cả 2 chế độ) ----------
  function quizHtml(x) {
    return `<div class="card" id="gQuiz"><h2>✏️ ${t('Luyện tập ({n} câu)', { n: x.quiz.length })}</h2>
      ${x.quiz.map((q, k) => `<div class="q-item" data-q="${k}"><b>${k + 1}. ${esc(q.q)}</b><div class="opts">${q.options.map((o, j) => `<button data-v="${j}">${esc(o)}</button>`).join('')}</div><div class="small" data-explain hidden style="margin-top:.4rem"></div></div>`).join('')}
      <div id="gRes" style="margin-top:1rem"></div></div>`;
  }
  function bindQuiz(x, next, again) {
    let answered = 0, right = 0;
    $$('#gQuiz .q-item').forEach(item => $$('.opts button', item).forEach(btn => btn.onclick = async () => {
      if (item.dataset.locked) return;
      item.dataset.locked = 1;
      const q = x.quiz[+item.dataset.q];
      const ok = +btn.dataset.v === q.answer;
      answered++; if (ok) right++;
      $$('.opts button', item).forEach(b2 => { if (+b2.dataset.v === q.answer) b2.classList.add('right'); });
      if (!ok) btn.classList.add('wrong');
      ok ? Sfx.correct() : Sfx.wrong();
      if (!ok && App.logMistake) App.logMistake({ kind: 'grammar', q: q.q, answer: q.options[q.answer], given: q.options[+btn.dataset.v], explain: q.explain, ref: x.id });
      const ex = $('[data-explain]', item); ex.hidden = false; ex.innerHTML = `${ok ? '✅' : '❌'} ${esc(q.explain)}`;
      const nextItem = item.nextElementSibling; if (nextItem && nextItem.classList.contains('q-item')) setTimeout(() => nextItem.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500);
      if (answered === x.quiz.length) {
        const pct = Math.round(right / x.quiz.length * 100);
        await App.reward({ quizzes: 1, grammar: 1, perfect: pct === 100 ? 1 : 0, xp: 10 + right * 3 }, $('#gRes'));
        state.game = await Game.mutate(gs => { gs.grammarDone = { ...(gs.grammarDone || {}), [x.id]: Math.max(pct, (gs.grammarDone || {})[x.id] || 0) }; });
        if (pct >= 80) { Sfx.win(); confetti(); }
        $('#gRes').innerHTML = `<div class="feedback ${pct >= 80 ? 'ok' : 'no'}" style="position:static"><b>${t('{right}/{total} câu đúng ({pct}%)', { right, total: x.quiz.length, pct })}</b> · +${10 + right * 3} XP
          ${pct < 80 ? `<div class="small">${t('Xem lại phần công thức và lỗi hay gặp rồi làm lại nhé. Câu sai đã vào Sổ lỗi sai.')}</div>` : ''}
          <div class="row" style="margin-top:.6rem"><button class="btn sm" id="gAgain">↺ ${t('Làm lại')}</button>${next ? `<a class="btn sm primary" href="#/grammar/${next.id}">${t('Bài tiếp theo')} →</a>` : ''}</div></div>`;
        $('#gRes').scrollIntoView({ behavior: 'smooth', block: 'center' });
        $('#gAgain').onclick = again;
      }
    }));
  }
  // ---------- Bài tập tự luận: chia động từ, dạng từ, điền từ, viết lại câu, nối câu, tìm lỗi sai ----------
  const dkind = k => { const K = { verb: '🔤 ' + t('Chia động từ'), form: '🧬 ' + t('Dạng đúng của từ'), fill: '✏️ ' + t('Điền từ'), rewrite: '🔁 ' + t('Viết lại câu'), combine: '🔗 ' + t('Nối câu'), error: '🕵️ ' + t('Tìm lỗi sai') }; return K[k] || K.fill; };
  const dnorm = s => ' ' + String(s || '').toLowerCase().replace(/[’‘`]/g, "'").replace(/won't/g, 'will not').replace(/can't|can not/g, 'cannot').replace(/n't\b/g, ' not').replace(/'re\b/g, ' are').replace(/'ve\b/g, ' have').replace(/'ll\b/g, ' will').replace(/'m\b/g, ' am')
    .replace(/[.,!?;:"“”()]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  // Chuẩn hóa thêm: chính tả Anh–Mỹ (-ize/-ise), "per cent"/"percent" → "%"
  const dnorm2 = s => dnorm(s).replace(/(\w)iz(e|ed|es|ing|ation|ations)\b/g, '$1is$2').replace(/(\d)\s*(?:per cent|percent)\b/g, '$1%').replace(/\s+%/g, '%');
  // Câu người học có thể viết tắt 'd (would/had) và 's (is/has/sở hữu) → thử mọi cách hiểu
  function variants(given) {
    let out = [given.replace(/[’‘`]/g, "'")];
    out = out.flatMap(v => /'d\b/i.test(v) ? [v.replace(/'d\b/gi, ' would'), v.replace(/'d\b/gi, ' had')] : [v]);
    for (let k = 0; k < 3; k++) out = out.flatMap(v => { const m = v.match(/\b(it|he|she|that|there|what|who|where|here|this)'s\b/i); return m ? [v.replace(m[0], m[1] + ' is'), v.replace(m[0], m[1] + ' has')] : [v]; });
    return out.map(dnorm2);
  }
  const matchAnswer = (given, answers) => { const vs = variants(given); return answers.some(a => { const n = dnorm2(a); return vs.includes(n) || variants(a).some(x => vs.includes(x)); }); };
  const drillsOf = x => x.drills || [];
  function drillItem(d, k) {
    const head = `<span class="chip" style="font-size:.75rem">${dkind(d.t)}</span>`;
    if (d.t === 'error') return `<div class="q-item dr" data-d="${k}">${head}<div class="dr-q" style="margin:.5rem 0;font-size:1.05rem;line-height:2">${d.parts.map((p, j) => `<button class="dr-part" data-j="${j}"><u>${esc(p)}</u><sub>${'ABCD'[j] || j + 1}</sub></button>`).join(' ')}</div><div class="small muted">${t('Bấm vào phần sai.')}</div><div class="small" data-fb hidden></div></div>`;
    const long = d.t === 'rewrite' || d.t === 'combine';
    const q = long ? `<div style="margin:.5rem 0">${esc(d.q)}${d.hint ? ` <span class="muted small">(${esc(d.hint)})</span>` : ''}</div><textarea class="dr-in" rows="2" spellcheck="false" placeholder="${t('Viết câu của bạn…')}">${esc(d.start ? d.start + ' ' : '')}</textarea>`
      : `<div style="margin:.5rem 0;line-height:2.2">${esc(d.q).replace('___', '<input class="dr-in gap" size="14" autocomplete="off" spellcheck="false">')}</div>`;
    return `<div class="q-item dr" data-d="${k}">${head}${q}<div class="row" style="margin-top:.4rem"><button class="btn sm primary dr-chk">${t('Kiểm tra')}</button></div><div class="small" data-fb hidden></div></div>`;
  }
  // Chấm 1 câu, trả về true/false (null nếu chưa làm)
  function gradeDrill(item, d, picked) {
    const fb = $('[data-fb]', item);
    let ok, given, answer;
    if (d.t === 'error') {
      if (picked == null) return null;
      ok = picked === d.w; given = d.parts[picked]; answer = `${d.parts[d.w]} → ${d.fix}`;
      $$('.dr-part', item).forEach((b, j) => { b.disabled = true; if (j === d.w) b.classList.add('right'); else if (j === picked) b.classList.add('wrong'); });
    } else {
      const inp = $('.dr-in', item); given = inp.value.trim();
      if (!given || (d.start && dnorm(given) === dnorm(d.start))) return null;
      ok = matchAnswer(given, d.a); answer = d.a[0];
      inp.classList.toggle('ok', ok); inp.classList.toggle('no', !ok); inp.readOnly = true;
      const c = $('.dr-chk', item); if (c) c.remove();
    }
    item.dataset.locked = 1; fb.hidden = false;
    fb.innerHTML = `${ok ? `✅ <b>${t('Chính xác!')}</b>` : `❌ ${t('Đáp án: <b>{a}</b>', { a: esc(answer) })}`}${d.ex ? `<div class="muted">${esc(d.ex)}</div>` : ''}`;
    ok ? Sfx.correct() : Sfx.wrong();
    return { ok, given, answer };
  }
  function drillsHtml(x) {
    const ds = drillsOf(x);
    return `<div class="card" id="gDrill"><h2>✍️ ${t('Bài tập tự luận ({n} câu)', { n: ds.length })}</h2><p class="small muted">${t('Các dạng bài quen thuộc trong đề thi: chia động từ, viết lại câu, nối câu, tìm lỗi sai. Gõ đáp án rồi bấm Kiểm tra (hoặc Enter).')}</p>
      <div class="stack">${ds.map(drillItem).join('')}</div><div id="dRes" style="margin-top:1rem"></div></div>`;
  }
  function bindDrills(x, onDone) {
    const ds = drillsOf(x); let answered = 0, right = 0;
    const after = async r => {
      if (!r) return; answered++; if (r.ok) right++;
      if (!r.ok && App.logMistake) App.logMistake({ kind: 'grammar', q: r.q, answer: r.answer, given: r.given, explain: r.ex || '', ref: x.id });
      if (answered === ds.length) {
        const pct = Math.round(right / ds.length * 100);
        await App.reward({ quizzes: 1, grammar: 1, writes: 1, perfect: pct === 100 ? 1 : 0, xp: 10 + right * 4 }, $('#dRes'));
        if (pct >= 80) { Sfx.win(); confetti(); }
        $('#dRes').innerHTML = `<div class="feedback ${pct >= 80 ? 'ok' : 'no'}" style="position:static"><b>${t('{right}/{total} câu đúng ({pct}%)', { right, total: ds.length, pct })}</b> · +${10 + right * 4} XP${onDone ? '' : ''}</div>`;
        if (onDone) onDone(pct);
      }
    };
    $$('#gDrill .dr').forEach(item => {
      const d = ds[+item.dataset.d];
      const meta = r => r && Object.assign(r, { q: d.t === 'error' ? d.parts.join(' ') : d.q, ex: d.ex });
      if (d.t === 'error') $$('.dr-part', item).forEach(b => b.onclick = () => { if (!item.dataset.locked) after(meta(gradeDrill(item, d, +b.dataset.j))); });
      else {
        const go = () => { if (!item.dataset.locked) after(meta(gradeDrill(item, d))); };
        $('.dr-chk', item).onclick = go;
        $('.dr-in', item).addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } });
      }
    });
  }
  const heroHtml = (x, unit) => `<div class="card hero-main" style="margin:.7rem 0 1rem;background:linear-gradient(135deg, ${unit.color}, #1e1b4b 160%)">
      <div class="row nowrap"><div style="font-size:3rem">${x.emoji}</div><div><div class="muted small">${t('Chương {n}', { n: chapterOf(x.id).n })} · ${esc(t(chapterOf(x.id).name))} · ${esc(x.level)}</div>
        <h1 style="margin:0;color:#fff">${esc(x.title)}</h1><div style="opacity:.9;font-weight:700">${esc(x.en)}</div></div></div>
      <p style="margin:.6rem 0 0;opacity:.95">${esc(x.summary)}</p></div>`;

  function lesson(id, query) {
    if (query && query.get('view') === 'full') return lessonFull(id);
    return lessonSteps(id);
  }

  // ---------- Chế độ xem toàn bài ----------
  function lessonFull(id) {
    const all = L(), i = all.findIndex(x => x.id === id), x = all[i];
    if (!x) return routes.grammar();
    const unit = UNITS.find(u => u.id === x.unit) || UNITS[0];
    const prev = all[i - 1], next = all[i + 1];
    view.innerHTML = `
      <div class="row between"><a href="#/grammar" class="small">← ${t('Ngữ pháp')}</a><a class="btn sm" href="#/grammar/${x.id}">🎯 ${t('Học từng bước')}</a></div>
      ${heroHtml(x, unit)}
      <div class="stack" id="gBody">${x.blocks.map(b => (R[b.type] || (() => ''))(b)).join('')}</div>
      <div style="margin-top:1rem">${quizHtml(x)}</div>
      ${drillsOf(x).length ? `<div style="margin-top:1rem">${drillsHtml(x)}</div>` : ''}
      <div class="row between" style="margin-top:1rem">${prev ? `<a class="btn" href="#/grammar/${prev.id}?view=full">← ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a class="btn primary" href="#/grammar/${next.id}?view=full">${esc(next.title)} →</a>` : `<a class="btn primary" href="#/grammar">${t('Hoàn thành chủ điểm')} 🎉</a>`}</div>`;
    App.bindCommon();
    bindQuiz(x, next, () => lessonFull(id));
    if (drillsOf(x).length) bindDrills(x);
  }

  // ---------- Chế độ học từng bước (kiểu Duolingo) ----------
  const tokenize = s => s.replace(/[“”"]/g, '').trim().split(/\s+/);
  function lessonSteps(id) {
    const all = L(), i = all.findIndex(x => x.id === id), x = all[i];
    if (!x) return routes.grammar();
    const unit = UNITS.find(u => u.id === x.unit) || UNITS[0];
    const next = all[i + 1];
    const B = t => x.blocks.filter(b => b.type === t);
    const visual = x.blocks.filter(b => ['timeline', 'diagram', 'scale', 'sort'].includes(b.type));
    const formulas = B('formula'), uses = B('uses'), mistakes = B('mistake');
    const extras = x.blocks.filter(b => ['signals', 'table', 'tip', 'ielts'].includes(b.type));
    // Câu dùng cho bài "xếp chữ": lấy từ ví dụ trong bài, 5–12 từ
    const sents = [...formulas.flatMap(f => f.rows.map(r => r.ex)), ...uses.flatMap(u => u.items.map(it => it.ex))]
      .filter(Boolean).filter(t => { const n = tokenize(t).length; return n >= 5 && n <= 12; });
    const builds = UI.shuffle([...new Set(sents)]).slice(0, 3);
    const steps = [];
    steps.push({ name: t('Hình dung'), em: '👀', html: () => `${visual.map(b => R[b.type](b)).join('') || ''}<div class="g-tip" style="margin-top:1rem">🧠 <b>${t('Ghi nhớ:')}</b> ${esc(x.summary)}</div>` });
    if (formulas.length && formulas[0].rows[0]) steps.push({ name: t('Ghép công thức'), em: '🧮', html: () => {
      const row = formulas[0].rows[0];
      return `<div class="g-block"><h3>🧮 ${t('Bấm các mảnh theo đúng thứ tự để tạo công thức “{label}”', { label: esc(row.label) })}</h3>
        <div class="build-slot" id="fSlot"></div><div class="row" id="fPool" style="margin-top:.8rem">${UI.shuffle(row.parts.map((p, k) => ({ p, k }))).map(({ p, k }) => `<button class="fp ${esc(p.c || '')} fpick" data-k="${k}">${esc(p.t)}</button>`).join('')}</div>
        <div id="fDone" hidden style="margin-top:1rem"></div></div>`;
    }, bind: () => {
      const row = formulas[0].rows[0]; let want = 0;
      $$('.fpick').forEach(b => b.onclick = () => {
        if (+b.dataset.k === want) { want++; Sfx.pop(); $('#fSlot').insertAdjacentHTML('beforeend', `${want > 1 ? '<span class="fplus">+</span>' : ''}<span class="fp ${esc(row.parts[+b.dataset.k].c || '')}">${esc(b.textContent)}</span>`); b.remove();
          if (want === row.parts.length) { Sfx.correct(); $('#fDone').hidden = false; $('#fDone').innerHTML = formula(formulas[0]); App.bindCommon(); stepOk(); } }
        else { Sfx.wrong(); b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); }
      });
    }, gate: true });
    if (uses.length) steps.push({ name: t('Cách dùng'), em: '🎯', html: () => `<div class="g-block"><h3>🎯 ${t('Khi nào dùng?')} <span class="muted small">${t('Bấm vào từng thẻ để xem ví dụ')}</span></h3><div class="uses">${uses[0].items.map((u, k) => `<button class="use use-card" data-k="${k}"><span class="unum">${k + 1}</span><div style="text-align:left"><b>${esc(u.title)}</b><div class="use-more" hidden><div>${esc(u.ex)}</div><div class="muted small">${esc(u.vi || '')}</div></div></div></button>`).join('')}</div></div>`,
      bind: () => $$('.use-card').forEach(b => b.onclick = () => { const m = $('.use-more', b); if (m.hidden) { m.hidden = false; Sfx.flip(); UI.speak(uses[0].items[+b.dataset.k].ex, state.settings.accent); } }) });
    if (extras.length) steps.push({ name: t('Mẹo & dấu hiệu'), em: '💡', html: () => `<div class="stack">${extras.map(b => R[b.type](b)).join('')}</div>` });
    if (mistakes.length) steps.push({ name: t('Bắt lỗi'), em: '🕵️', html: () => `<div class="stack"><div class="small muted">${t('Đọc câu sai, tự tìm lỗi trong đầu rồi bấm để kiểm tra – cách nhớ lâu nhất là tự phát hiện.')}</div>${mistakes.map((m, k) => `<div class="g-mistake"><div><span class="bad">✗</span> ${esc(m.wrong)}</div><button class="btn sm" data-reveal="${k}" style="margin-top:.5rem">🔍 ${t('Tôi đã tìm ra lỗi – xem đáp án')}</button><div data-ans="${k}" hidden style="margin-top:.4rem"><div><span class="good">✓</span> <b>${esc(m.right)}</b></div><div class="small muted">${esc(m.why)}</div></div></div>`).join('')}</div>`,
      bind: () => $$('[data-reveal]').forEach(b => b.onclick = () => { $(`[data-ans="${b.dataset.reveal}"]`).hidden = false; b.remove(); Sfx.flip(); }) });
    if (builds.length) steps.push({ name: t('Xếp câu'), em: '🧩', html: () => `<div class="stack">${builds.map((s, k) => `<div class="g-block" data-build="${k}"><h3>🧩 ${t('Xếp các từ thành câu đúng')}</h3><div class="build-slot" data-slot="${k}"></div>
        <div class="row" data-pool="${k}" style="margin-top:.6rem">${UI.shuffle(tokenize(s).map((w, j) => ({ w, j }))).map(({ w, j }) => `<button class="chip wpick" data-j="${j}" style="border:2px solid var(--line);cursor:pointer;font-size:.95rem;padding:.35rem .7rem">${esc(w)}</button>`).join('')}</div>
        <div class="row" style="margin-top:.6rem"><button class="btn sm" data-undo="${k}">↺ ${t('Làm lại')}</button><span class="small" data-msg="${k}"></span></div></div>`).join('')}</div>`,
      bind: () => builds.forEach((s, k) => {
        const words = tokenize(s); let built = [];
        const pool = $(`[data-pool="${k}"]`), slot = $(`[data-slot="${k}"]`), msg = $(`[data-msg="${k}"]`);
        const check = () => {
          if (built.length < words.length) return;
          const ok = built.map(j => words[j]).join(' ') === words.join(' ');
          msg.innerHTML = ok ? `✅ <b>${t('Chính xác!')}</b>` : `❌ ${t('Đáp án: <i>{a}</i>', { a: esc(s) })}`; ok ? Sfx.correct() : Sfx.wrong();
          if (ok) UI.speak(s, state.settings.accent);
          slot.classList.add(ok ? 'ok' : 'no');
        };
        $$('.wpick', pool).forEach(b => b.onclick = () => { built.push(+b.dataset.j); slot.insertAdjacentHTML('beforeend', `<span class="chip" style="font-size:.95rem;padding:.35rem .7rem">${esc(b.textContent)}</span>`); b.hidden = true; Sfx.pop(); check(); });
        $(`[data-undo="${k}"]`).onclick = () => { built = []; slot.innerHTML = ''; slot.className = 'build-slot'; msg.textContent = ''; $$('.wpick', pool).forEach(b => b.hidden = false); };
      }) });
    if (drillsOf(x).length) steps.push({ name: t('Tự luận'), em: '✍️', html: () => drillsHtml(x), bind: () => bindDrills(x) });
    steps.push({ name: t('Luyện tập'), em: '✏️', html: () => quizHtml(x), bind: () => bindQuiz(x, next, () => lessonSteps(id)) });

    let cur = 0, gateOk = false;
    function stepOk() { gateOk = true; const n = $('#sNext'); if (n) n.disabled = false; }
    const draw = () => {
      const st = steps[cur]; gateOk = !st.gate;
      view.innerHTML = `
        <div class="row between"><a href="#/grammar" class="small">← ${t('Ngữ pháp')}</a><a class="btn sm ghost" href="#/grammar/${x.id}?view=full">📖 ${t('Xem toàn bài')}</a></div>
        ${cur === 0 ? heroHtml(x, unit) : `<div class="row nowrap" style="margin:.7rem 0"><span style="font-size:1.8rem">${x.emoji}</span><div><b>${esc(x.title)}</b><div class="tiny muted">${esc(x.en)}</div></div></div>`}
        <div class="steps">${steps.map((s, k) => `<button class="stepdot ${k === cur ? 'on' : ''} ${k < cur ? 'done' : ''}" data-step="${k}" title="${esc(s.name)}"><span>${k < cur ? '✓' : s.em}</span><small>${esc(s.name)}</small></button>`).join('')}</div>
        <div class="step-body">${st.html()}</div>
        ${cur < steps.length - 1 ? `<div class="row between" style="margin-top:1rem">${cur > 0 ? `<button class="btn" id="sPrev">← ${t('Quay lại')}</button>` : '<span></span>'}<button class="btn primary lg" id="sNext" ${gateOk ? '' : 'disabled'}>${t('Tiếp tục')} →</button></div>` : `<div class="row" style="margin-top:1rem"><button class="btn" id="sPrev">← ${t('Quay lại')}</button></div>`}`;
      App.bindCommon();
      if (st.bind) st.bind();
      const n = $('#sNext'); if (n) n.onclick = () => { cur++; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      const p = $('#sPrev'); if (p) p.onclick = () => { cur--; draw(); };
      $$('[data-step]').forEach(b => b.onclick = () => { const k = +b.dataset.step; if (k <= cur || !steps.slice(cur, k).some(s => s.gate)) { cur = k; draw(); } });
      if (st.gate) { const skip = document.createElement('button'); skip.className = 'btn sm ghost'; skip.textContent = t('Bỏ qua'); skip.onclick = stepOk; const n2 = $('#sNext'); if (n2) n2.before(skip); }
    };
    draw();
  }
})();
