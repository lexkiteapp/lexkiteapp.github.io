/* 📚 Khóa học (#/courses, #/course/<id>): xếp nội dung sẵn có thành lộ trình Khóa → Chương → Bài, % tiến độ, "Tiếp tục bài học".
 * Hoàn thành TỰ ĐỘNG khi đạt (không bấm tay): ngữ pháp ≥ 80% · phần nghe ≥ 60% câu đúng · bài đọc ≥ 60% · bài mẫu ≥ 2 chế độ luyện đạt
 * · nghe chép đã làm · bộ từ ≥ 80% từ đã thuộc. Thêm khóa mới: khai báo trong COURSES (lấy nội dung động, không chép tay danh sách). */
(function () {
  const { $, esc } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  const TT = x => (I18N.lang() === 'vi' ? x.titleVi || x.title : x.title);

  // Mỗi mục: { t: tiêu đề, href, done(): bool }
  const gd = () => state.game || {};
  const pctOf = s => { const m = String(s || '').match(/(\d+)\/(\d+)/); return m ? +m[1] / Math.max(1, +m[2]) : 0; };
  const itemGrammar = id => { const x = (window.GRAMMAR || []).find(g => g.id === id); return x && { t: I18N.lang() === 'vi' ? x.title : x.en, em: x.emoji || '📐', href: '#/grammar/' + id, done: () => ((gd().grammarDone || {})[id] || 0) >= 80 }; };
  const itemListen = p => ({ t: `Part ${p.part} · ${TT(p)}`, em: '🎧', href: '#/listen/' + p.id, done: () => ((gd().listenDone || {})[p.id] || 0) >= Math.ceil(((p.groups || []).reduce((a, g) => a + (g.type === 'multi' ? g.n.length : (g.items || []).length), 0) || 10) * 0.6) });
  const itemDict = p => ({ t: `${t('Nghe chép')} · ${TT(p)}`, em: '⌨️', href: '#/dictation/' + p.id, done: () => ((gd().dictDone || {})[p.id] || 0) >= 70 });
  const itemRead = r => ({ t: r.title, em: r.emoji || '📰', href: '#/read/' + r.id, done: () => pctOf((gd().readDone || {})[r.id]) >= 0.6 });
  const MD = {}; // chế độ luyện bài mẫu đã đạt (đọc 1 lần từ Store)
  const itemModel = (m, label) => ({ t: label, em: '✍️', href: '#/model/' + m.id, done: () => (MD[m.id] || []).length >= 2 });
  const itemTopic = tp => tp && { t: tp.name, em: tp.emoji || '📚', href: '#/topic/' + tp.id, done: () => { const ws = tp.words || []; if (!ws.length) return false; const ok = ws.filter(w => { const c = state.cards[String(w.word).toLowerCase()]; return c && c.srs && c.srs.reps >= 2; }).length; return ok / ws.length >= 0.8; } };
  const topics = re => ((window.IELTS_DATA || {}).TOPICS || []).filter(x => re.test(x.id));
  const TYPE1 = { line: 'Line graph', bar: 'Bar chart', pie: 'Pie chart', table: 'Table', process: 'Process', map: 'Map', mixed: 'Mixed charts' };
  const writingUnits = () => {
    const ms = window.MODELS || [], t1 = (App.task1 && App.task1.SETS) || [], p2 = window.WRITE_PROMPTS || [], by = {};
    ms.filter(m => m.task === 1).forEach(m => { const d = t1.find(x => x.id === m.ref), k = (d && d.type) || 'mixed'; (by['1:' + k] = by['1:' + k] || []).push(itemModel(m, d ? String(d.title || m.ref).replace(/^The (line graph|bar chart|pie charts?|table|diagram|maps?|charts?) (shows?|illustrates?|compares?|gives?|presents?) /i, '').replace(/\.$/, '').slice(0, 80) : m.ref)); });
    ms.filter(m => m.task === 2).forEach(m => { const p = p2.find(x => x.id === m.ref), k = (p && p.type) || 'Task 2'; (by['2:' + k] = by['2:' + k] || []).push(itemModel(m, p ? (p.text || '').slice(0, 70) + '…' : m.ref)); });
    return Object.entries(by).map(([k, items]) => ({ t: k.startsWith('1:') ? 'Task 1 · ' + (TYPE1[k.slice(2)] || k.slice(2)) : 'Task 2 · ' + k.slice(2), items }));
  };
  const listenUnits = () => { const by = {}; (window.LISTENING || []).forEach(p => { (by[p.test] = by[p.test] || []).push(itemListen(p), itemDict(p)); }); return Object.entries(by).map(([n, items]) => ({ t: 'Test ' + n, items })); };
  const FOCUS_IELTS = 'participle-clauses passive-reporting-causative hedging nominalisation inversion-cleft comparison-special numbers-data-language purpose-result reason-contrast relative-clauses conditionals-2-3 parallel-structure punctuation sequence-of-tenses determiners'.split(' ');
  const FOCUS_TOEIC = 'parts-of-speech-patterns word-formation prepositions dependent-prepositions conjunctions subject-verb-agreement pronouns countable-uncountable adjectives-adverbs tenses-ielts modals-obligation-advice verb-types'.split(' ');
  const chunk = (arr, n, name) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push({ t: `${name} ${i / n + 1}`, items: arr.slice(i, i + n) }); return out; };

  const COURSES = [
    { id: 'ielts-listening', exam: 'ielts', em: '🎧', t: () => t('IELTS Listening chuyên sâu'), d: () => t('4 phần thi theo từng đề + nghe chép chính tả từng câu'), b: ['listening'], units: listenUnits },
    { id: 'ielts-reading', exam: 'ielts', em: '📖', t: () => t('IELTS Reading theo chủ đề'), d: () => t('Bài đọc học thuật có câu hỏi dạng IELTS, từ dễ đến khó'), b: ['readings'], units: () => chunk((window.READINGS || []).slice().sort((a, b) => String(a.level).localeCompare(String(b.level))).map(itemRead), 5, t('Chặng')) },
    { id: 'ielts-writing', exam: 'ielts', em: '✍️', t: () => t('IELTS Writing qua bài mẫu'), d: () => t('Task 1 theo dạng biểu đồ, Task 2 theo dạng đề – 6 chế độ luyện mỗi bài'), b: ['writing'], units: writingUnits },
    { id: 'ielts-grammar', exam: 'ielts', em: '🎓', t: () => t('Ngữ pháp IELTS 7.0+'), d: () => t('15 chủ điểm ăn điểm Grammatical Range & Accuracy'), b: ['grammar'], units: () => chunk(FOCUS_IELTS.map(itemGrammar).filter(Boolean), 5, t('Chặng')) },
    { id: 'academic-vocab', exam: 'ielts', em: '🎓', t: () => t('Từ vựng học thuật (AWL + NAWL)'), d: () => t('Từ học thuật hay gặp trong IELTS Academic & TOEFL'), b: ['words', 'tsl'], units: () => [{ t: 'Academic Word List', items: topics(/^awl\d/).map(itemTopic) }, { t: 'New Academic Word List', items: topics(/^nawl\d/).map(itemTopic) }].filter(u => u.items.length) },
    { id: 'toeic-core', exam: 'toeic', em: '💼', t: () => t('TOEIC nền tảng'), d: () => t('Từ vựng TOEIC (TSL + BSL) và 12 chủ điểm ngữ pháp Part 5 & 6'), b: ['words', 'tsl', 'grammar'], units: () => [{ t: t('Ngữ pháp Part 5 & 6'), items: FOCUS_TOEIC.map(itemGrammar).filter(Boolean) }, ...chunk(topics(/^(toeic|bsl)\d/).map(itemTopic), 6, t('Từ vựng'))] },
    { id: 'office-english', exam: 'all', em: '🏢', t: () => t('Tiếng Anh Công sở & Sự nghiệp'), d: () => t('Email & Slack, họp và đàm phán, phỏng vấn xin việc, IT & văn phòng – câu mẫu dùng ngay ở chỗ làm'), b: ['words'], units: () => [{ t: t('Tiếng Anh Công sở & Sự nghiệp'), items: topics(/^office-/).map(itemTopic) }] },
  ];
  const allBundles = [...new Set(COURSES.flatMap(c => c.b))];
  const loadMD = async ids => { await Promise.all(ids.filter(id => !MD[id]).map(async id => { MD[id] = await Core.Store.get('mdone:' + id, []); })); };
  const build = c => { const units = c.units().filter(u => u.items && u.items.length); const items = units.flatMap(u => u.items); const n = items.filter(i => i.done()).length; return { units, items, n, pct: items.length ? Math.round(n / items.length * 100) : 0, next: items.find(i => !i.done()) }; };
  const prep = async () => { await App.need(...allBundles).catch(() => {}); await loadMD((window.MODELS || []).map(m => m.id)); };

  routes.courses = async function () {
    view.innerHTML = `<p class="muted">${t('Đang tải…')}</p>`;
    await prep();
    const ex = App.exam ? App.exam() : 'ielts', list = COURSES.slice().sort((a, b) => (b.exam === ex) - (a.exam === ex));
    view.innerHTML = `<div class="page-head"><div><h1>📚 ${t('Khóa học')}</h1><p class="muted">${t('Lộ trình học theo chương – tự đánh dấu hoàn thành khi bạn đạt yêu cầu, luôn biết bài tiếp theo.')}</p></div></div>
      <div class="grid auto">${list.map(c => { const s = build(c); return `<a class="card hover course-card" href="#/course/${c.id}"><div class="row between nowrap"><span class="em">${c.em}</span><b class="course-pct">${s.pct}%</b></div><h3>${esc(c.t())}</h3><div class="muted small">${esc(c.d())}</div><div class="progress course-bar"><i style="width:${s.pct}%"></i></div><div class="small">${s.next ? `${t('Tiếp tục')}: <b>${esc(s.next.t)}</b>` : `✓ ${t('Đã hoàn thành khóa học')}`}</div></a>`; }).join('')}</div>`;
  };

  routes.course = async function (id) {
    const c = COURSES.find(x => x.id === id); if (!c) return routes.courses();
    view.innerHTML = `<p class="muted">${t('Đang tải…')}</p>`;
    await prep();
    const s = build(c);
    view.innerHTML = `<a class="small" href="#/courses">← ${t('Khóa học')}</a>
      <div class="card course-head"><div class="row between"><div><h1 style="margin:.2rem 0">${c.em} ${esc(c.t())}</h1><p class="muted small" style="margin:0">${esc(c.d())}</p></div>${UI.ring(s.pct, `${s.n}/${s.items.length}`, 'var(--good)')}</div>
        ${s.next ? `<a class="btn primary lg block" href="${s.next.href}" style="margin-top:1rem">${t('Tiếp tục bài học')}: ${esc(s.next.t)} →</a>` : `<div class="feedback ok" style="position:static;margin-top:1rem">🎉 ${t('Đã hoàn thành khóa học')}</div>`}</div>
      ${s.units.map((u, k) => { const dn = u.items.filter(i => i.done()).length, open = s.next && u.items.includes(s.next); return `<details class="g-chap course-unit" ${open ? 'open' : ''}><summary><span class="g-tx"><b>${t('Chương {n}', { n: k + 1 })} · ${esc(u.t)}</b><small>${dn}/${u.items.length}</small></span></summary><div class="g-list">${u.items.map(i => `<a class="g-row ${i.done() ? 'done' : ''} ${i === s.next ? 'next' : ''}" href="${i.href}"><span class="em" aria-hidden="true">${i.done() ? '✅' : i.em}</span><span class="g-tx"><b>${esc(i.t)}</b></span>${i === s.next ? `<span class="chip lv">${t('Tiếp theo')}</span>` : ''}</a>`).join('')}</div></details>`; }).join('')}`;
  };
})();
