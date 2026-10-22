/* Ngữ pháp IELTS: danh sách bài theo chủ điểm, bài học trực quan (dòng thời gian, công thức màu, sơ đồ, thang đo), bài tập có chấm điểm. */
(function () {
  const { $, $$, esc, speak, ring } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  // Giao diện bài học (tô cấu trúc, lỗi theo tiếng mẹ đẻ, chế độ tối cho mảnh công thức, màn 375px) – chèn khi mở Ngữ pháp
  const dk = p => `${p} .fp.subj{background:#172554;color:#93c5fd}${p} .fp.verb{background:#052e16;color:#86efac}${p} .fp.aux{background:#431407;color:#fdba74}${p} .fp.obj{background:#422006;color:#fcd34d}${p} .fp.neg{background:#450a0a;color:#fca5a5}${p} .fp.adv,${p} .fp.time{background:#082f49;color:#7dd3fc}`
    + `${p} .fp.subj,${p} .fp.verb,${p} .fp.aux,${p} .fp.obj,${p} .fp.neg,${p} .fp.adv,${p} .fp.time{filter:none}${p} .fstep.active{background:#172554;color:#bfdbfe}${p} .fstep.passive,${p} .fstep.result{background:#052e16;color:#bbf7d0}${p} .fstep.if{background:#422006;color:#fde68a}`;
  const G_CSS = `mark.g-hl{background:var(--accent-soft);color:var(--accent-text);font-weight:700;font-style:normal;border-radius:4px;padding:0 .14em;box-shadow:inset 0 -2px 0 color-mix(in srgb,var(--accent-text) 60%,transparent);-webkit-box-decoration-break:clone;box-decoration-break:clone}
.g-block h3,.g-l1 h3{font-size:1.05rem;line-height:1.35;margin:0 0 .6rem}.g-block,.g-visual{line-height:1.6}.uex,.fex{line-height:1.6;margin-top:.2rem}.fex{font-style:normal;color:var(--text)}
.use b{display:block;line-height:1.4}.uses{gap:.85rem}.g-tip,.g-ielts{line-height:1.6}
.g-tbl{overflow-x:auto}.g-tbl:focus-visible,.use-card:focus-visible{outline:3px solid var(--accent);outline-offset:2px}.gtable{min-width:440px}.gtable th,.gtable td{vertical-align:top;line-height:1.45}.gtable th{font-size:.82rem;letter-spacing:.02em}
.g-l1-slot:empty{display:none}.g-l1{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:0 14px 14px 0;padding:.8rem 1rem}
.g-l1-it{padding:.55rem 0;border-top:1px dashed var(--line)}.g-l1-it:first-of-type{border-top:0;padding-top:0}.g-l1 .bad{color:var(--again-text);font-weight:800}.g-l1 .good{color:var(--good-text);font-weight:800}
[dir="rtl"] .g-l1{border-left:1px solid var(--line);border-right:4px solid var(--accent);border-radius:14px 0 0 14px}
${dk(':root[data-theme="dark"]')}@media (prefers-color-scheme:dark){${dk(':root:not([data-theme="light"])')}}
@media (max-width:420px){.g-block,.g-visual{padding:.9rem .85rem}.g-hero h1{font-size:1.4rem;line-height:1.25}.fp{font-size:.84rem;padding:.2rem .5rem}.srow{grid-template-columns:84px minmax(0,1fr) 40px}.g-mistake,.g-recap,.g-l1{padding:.7rem .8rem}.unum{width:24px;height:24px}.steps small{font-size:.66rem}}
@media (forced-colors:active){mark.g-hl{forced-color-adjust:none;background:Mark;color:MarkText}}`;
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
  // Tên bài theo ngôn ngữ giao diện: tiếng Việt → tên Việt; ngôn ngữ khác → tên đã dịch, chưa dịch thì tên tiếng Anh (không lẫn tiếng Việt)
  const TTL = x => I18N.lang() === 'vi' ? x.title : (t(x.title) !== x.title ? t(x.title) : x.en);
  const sayBtn = s => `<button class="icon-btn sm" data-speak-text="${esc(s)}" title="${t('Nghe')}">🔊</button>`;
  // Ví dụ đánh dấu [[…]] = phần cấu trúc mục tiêu. Tách 1 lần: ex = chữ thuần (đọc, xếp câu, lưu), exm = bản đánh dấu (chỉ để vẽ)
  const prepHL = () => { for (const x of window.GRAMMAR || []) { if (x._hl) continue; x._hl = 1; for (const b of x.blocks || []) for (const o of b.type === 'uses' ? b.items : b.type === 'formula' ? b.rows : b.type === 'ielts' ? [b] : []) if (typeof o.ex === 'string' && o.ex.includes('[[')) { o.exm = o.ex; o.ex = o.ex.replace(/\[\[|\]\]/g, ''); } } };
  prepHL();
  const hx = o => o.exm ? esc(o.exm).replace(/\[\[(.+?)\]\]/g, '<mark class="g-hl">$1</mark>') : esc(o.ex || '');
  // CSS riêng của bài ngữ pháp: nạp cùng gói grammar (tải lười) – không làm nặng khung app (style.css nằm trong SHELL)
  if (!document.getElementById('gCss')) { const st = document.createElement('style'); st.id = 'gCss'; st.textContent = G_CSS; document.head.appendChild(st); }
  // 🌐 Lỗi hay gặp theo tiếng mẹ đẻ (giao diện ≠ en): js/grammar/l1/<lang>.js, viết tay bằng chính ngôn ngữ đó, tải khi mở bài
  const L1_LANGS = 'vi es pt fr de id th zh ja ko hi ar ru tr'.split(' ');
  let l1P = null;
  const loadL1 = () => { const lg = I18N.lang(); if (!L1_LANGS.includes(lg)) return Promise.resolve(null); if (window.GRAMMAR_L1 && GRAMMAR_L1.lang === lg) return Promise.resolve(GRAMMAR_L1);
    return l1P || (l1P = new Promise(res => { const s = document.createElement('script'); s.src = `js/grammar/l1/${lg}.js`; s.onload = () => res(window.GRAMMAR_L1 && GRAMMAR_L1.lang === lg ? GRAMMAR_L1 : null); s.onerror = () => { l1P = null; res(null); }; document.head.appendChild(s); })); };
  const l1Html = (x, D) => { const ns = D && D.notes[x.id]; if (!ns || !ns.length) return '';
    return `<section class="g-l1" translate="no" aria-labelledby="gL1h-${esc(x.id)}"><h3 id="gL1h-${esc(x.id)}">🌐 ${esc(D.title)}</h3>${ns.map(([w, r, why]) => `<div class="g-l1-it"><div><span class="bad" role="img" aria-label="${t('Sai')}">✗</span> <s lang="en" dir="ltr">${esc(w)}</s></div><div><span class="good" role="img" aria-label="${t('Đúng')}">✓</span> <b lang="en" dir="ltr">${esc(r)}</b> ${sayBtn(r)}</div><div class="small muted">${esc(why)}</div></div>`).join('')}</section>`; };
  const fillL1 = x => loadL1().then(D => { const slot = document.querySelector(`.g-l1-slot[data-l1="${x.id}"]`); if (slot && !slot.childElementCount) { const h = l1Html(x, D); if (h) { slot.innerHTML = h; App.bindCommon(); } } });
  const l1Slot = x => `<div class="g-l1-slot" data-l1="${esc(x.id)}"></div>`;

  routes.grammar = function (id) {
    if (id === 'mix') return mix(arguments[1]);
    if (id) return lesson(id, arguments[1]);
    const all = L();
    const d = done();
    // Bài nên học tiếp: bài chưa đạt 80% (đang dở) → bài đầu tiên chưa học theo thứ tự chương
    const order = CHAPTERS.flatMap(c => lessonsOf(c).map(x => ({ x, c })));
    // Tab trọng tâm theo kỳ thi (luyện cấp tốc): chỉ hiện bài & tiến độ của nhóm đã chọn
    const FOCUS = {
      ielts: 'participle-clauses passive-reporting-causative hedging nominalisation inversion-cleft comparison-special numbers-data-language purpose-result reason-contrast relative-clauses conditionals-2-3 parallel-structure punctuation sequence-of-tenses determiners'.split(' '),
      toeic: 'parts-of-speech-patterns word-formation prepositions dependent-prepositions conjunctions subject-verb-agreement pronouns countable-uncountable adjectives-adverbs tenses-ielts modals-obligation-advice verb-types'.split(' '),
    };
    let gtab = 'all'; try { gtab = sessionStorage.getItem('g.tab') || 'all'; } catch (e) { /* bỏ qua */ }
    if (!FOCUS[gtab]) gtab = 'all';
    const nx = order.find(o => d[o.x.id] != null && d[o.x.id] < 80) || order.find(o => d[o.x.id] == null);
    const nDone = Object.keys(d).filter(k => d[k] >= 80).length;
    // Không lẫn tiếng: giao diện tiếng Việt → tên Việt + tên Anh; ngôn ngữ khác → tên đã dịch, chưa dịch thì dùng tên tiếng Anh
    const vi = I18N.lang() === 'vi', TT = x => vi ? x.title : (t(x.title) !== x.title ? t(x.title) : x.en), SUB = x => vi ? x.en : (TT(x) !== x.en ? x.en : '');
    const SUM = x => vi || t(x.summary) !== x.summary ? t(x.summary) : '';
    const row = (x, c) => `<a class="g-row" href="#/grammar/${x.id}"><span class="em" aria-hidden="true">${x.emoji}</span><span class="g-tx"><b>${esc(TT(x))}</b>${SUB(x) ? `<small>${esc(SUB(x))}</small>` : ''}</span>${d[x.id] != null ? `<span class="chip ${d[x.id] >= 80 ? 'ok' : ''}">${d[x.id] >= 80 ? '✓ ' : ''}${d[x.id]}%</span>` : levelChip(x.level)}</a>`;
    view.innerHTML = `
      <div class="page-head"><div><h1>📐 ${t('Ngữ pháp')}</h1><p class="muted">${t('{n} bài học trực quan: dòng thời gian, công thức tô màu, sơ đồ biến đổi câu, lỗi người Việt hay mắc và bài tập chấm điểm ngay.', { n: all.length })}</p></div>
        ${ring(all.length ? nDone / all.length * 100 : 0, `${nDone}/${all.length}`, 'var(--good)')}</div>
      ${nx ? `<a class="card hover hub-hero" href="#/grammar/${nx.x.id}"><span class="hub-ic" aria-hidden="true">${nx.x.emoji}</span><span class="hub-tx"><small>${d[nx.x.id] != null ? t('Làm lại cho chắc · lần trước {pct}%', { pct: d[nx.x.id] }) : t('Bài tiếp theo')} · ${t('Chương {n}', { n: nx.c.n })}</small><b>${esc(TT(nx.x))}</b>${SUM(nx.x) ? `<small>${esc(SUM(nx.x))}</small>` : ''}</span><span class="btn primary sm">${t('Học ngay')} →</span></a>` : ''}
      <div class="tabs seg g-tabs" id="gTabs" role="tablist">${[['all', t('Tất cả {n} bài', { n: all.length })], ['ielts', '🎓 ' + t('Trọng tâm IELTS 7.0+')], ['toeic', '💼 ' + t('Bí kíp TOEIC Part 5 & 6')]].map(([k, l]) => `<button type="button" role="tab" aria-selected="${gtab === k}" class="${gtab === k ? 'on' : ''}" data-gt="${k}">${l}</button>`).join('')}</div>
      ${gtab !== 'all' ? (() => { const ls = FOCUS[gtab].map(id => all.find(x => x.id === id)).filter(Boolean), dn = ls.filter(x => d[x.id] >= 80).length; return `<div class="card g-focus"><div class="row between" style="margin-bottom:.6rem"><b>${gtab === 'ielts' ? '🎓 ' + t('Trọng tâm IELTS 7.0+') : '💼 ' + t('Bí kíp TOEIC Part 5 & 6')}</b>${ring(ls.length ? dn / ls.length * 100 : 0, `${dn}/${ls.length}`, 'var(--good)')}</div><div class="g-list">${ls.map(x => row(x, chapterOf(x.id))).join('')}</div></div>`; })() : `<div class="g-chapters">${CHAPTERS.map(c => {
        const ls = lessonsOf(c); if (!ls.length) return '';
        const dn = ls.filter(x => d[x.id] >= 80).length, open = nx && nx.c === c;
        return `<details class="g-chap" id="chap${c.n}" ${open ? 'open' : ''} style="--cc:${c.color}"><summary><span class="em" aria-hidden="true">${c.emoji}</span><span class="g-tx"><b>${t('Chương {n}', { n: c.n })} · ${esc(t(c.name))}</b><small>${esc(t(c.desc))}</small></span><span class="g-prog"><span class="small muted">${dn}/${ls.length}</span><span class="progress thin"><i style="width:${dn / ls.length * 100}%"></i></span></span></summary>
          <div class="g-list">${ls.map(x => row(x, c)).join('')}<a class="g-row g-test" href="#/grammar/mix?ch=${c.n}"><span class="em" aria-hidden="true">📝</span><span class="g-tx"><b>${t('Kiểm tra chương')}</b><small>${t('Trộn câu hỏi của cả chương')}</small></span><span aria-hidden="true">›</span></a></div></details>`;
      }).join('') || `<div class="card empty"><div class="em">📐</div>${t('Đang cập nhật bài học…')}</div>`}</div>`}
      <h3 class="set-h hub-h">📝 ${t('Kiểm tra tổng hợp')}</h3>
      <div class="hub-grid"><a class="card hover hub-card" href="#/grammar/mix"><span class="hub-ic" aria-hidden="true">🔀</span><span class="hub-tx"><b>${t('Đề tổng hợp {n} câu', { n: 20 })}</b><small>${t('Trộn câu hỏi từ các bài đã học (hoặc mọi bài)')}</small></span></a>
        <a class="card hover hub-card" href="#/grammar/mix?n=40"><span class="hub-ic" aria-hidden="true">🏁</span><span class="hub-tx"><b>${t('Đề tổng hợp {n} câu', { n: 40 })}</b><small>${t('Ôn toàn bộ chương trình – như bài thi cuối khóa')}</small></span></a></div>
      <h3 class="set-h hub-h">🧰 ${t('Công cụ ngữ pháp')}</h3>
      <div class="hub-grid"><a class="card hover hub-card" href="#/verb"><span class="hub-ic" aria-hidden="true">🔤</span><span class="hub-tx"><b>${t('Chia động từ')}</b><small>${t('Mọi thì, bị động, cách đọc -ed/-s')}</small></span></a>
        <a class="card hover hub-card" href="#/fix"><span class="hub-ic" aria-hidden="true">✍️</span><span class="hub-tx"><b>${t('Sửa ngữ pháp')}</b><small>${t('Dán đoạn văn – gạch chân lỗi, sửa 1 chạm')}</small></span></a></div>`;
    $$('[data-gt]').forEach(b => b.onclick = () => { try { sessionStorage.setItem('g.tab', b.dataset.gt); } catch (e) { /* bỏ qua */ } routes.grammar(); });
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
      ${r.ex ? `<div class="fex" lang="en">➜ ${hx(r)} ${sayBtn(r.ex)}</div>` : ''}</div>`).join('')}
      <div class="tiny muted" style="margin-top:.4rem"><span class="fp subj">${t('Chủ ngữ')}</span> <span class="fp aux">${t('Trợ động từ')}</span> <span class="fp verb">${t('Động từ')}</span> <span class="fp neg">${t('Phủ định')}</span> <span class="fp obj">${t('Tân ngữ')}</span> <span class="fp time">${t('Thời gian')}</span></div></div>`;
  const uses = b => `<div class="g-block"><h3>🎯 ${t('Khi nào dùng?')}</h3><div class="uses">${b.items.map((u, i) => `<div class="use"><span class="unum">${i + 1}</span><div><b>${esc(u.title)}</b><div class="uex" lang="en">${hx(u)} ${sayBtn(u.ex)}</div><div class="muted small">${esc(u.vi || '')}</div></div></div>`).join('')}</div></div>`;
  const signals = b => `<div class="g-block"><h3>🚦 ${t('Dấu hiệu nhận biết')}</h3><div class="row">${b.words.map(w => `<span class="chip lv">${esc(w)}</span>`).join('')}</div></div>`;
  const table = b => `<div class="g-block g-tbl" tabindex="0" role="region" aria-label="${esc(b.head.join(' · '))}"><table class="gtable"><thead><tr>${b.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const tip = b => `<div class="g-tip">💡 ${esc(b.text)}</div>`;
  const mistake = b => `<div class="g-mistake"><div><span class="bad" role="img" aria-label="${t('Sai')}">✗</span> <s lang="en">${esc(b.wrong)}</s></div><div><span class="good" role="img" aria-label="${t('Đúng')}">✓</span> <b lang="en">${esc(b.right)}</b> ${sayBtn(b.right)}</div><div class="small muted">${esc(b.why)}</div></div>`;
  const ielts = b => `<div class="g-ielts"><b>🎓 ${t('Trong IELTS:')}</b> ${esc(b.text)}${b.ex ? `<div class="ex" lang="en" style="margin-top:.3rem">“${hx(b)}” ${sayBtn(b.ex)}</div>` : ''}</div>`;
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
          <div class="card q-card"><div class="tiny muted">${x.emoji} ${esc(TTL(x))}</div>${drillItem(d, 0)}</div><div id="fb"></div></div>`;
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
        <div class="card q-card"><div class="tiny muted">${x.emoji} ${esc(TTL(x))}</div><div style="font-size:1.15rem;font-weight:700;margin-top:.5rem">${esc(q.q)}</div></div>
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
      ${x.quiz.map((q, k) => `<div class="q-item" data-q="${k}" role="group" aria-labelledby="gq${k}"><b id="gq${k}" lang="en">${k + 1}. ${esc(q.q)}</b><div class="opts" lang="en">${q.options.map((o, j) => `<button data-v="${j}">${esc(o)}</button>`).join('')}</div><div class="small" data-explain hidden aria-live="polite" style="margin-top:.4rem"></div></div>`).join('')}
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
      const ex = $('[data-explain]', item); ex.hidden = false; ex.innerHTML = ok ? `✅ ${esc(q.explain)}` : `❌ ${t('Bạn chọn:')} <s>${esc(q.options[+btn.dataset.v])}</s> · ${t('Đáp án: <b>{a}</b>', { a: esc(q.options[q.answer]) })}<div>${esc(q.explain)}</div>`;
      const nextItem = item.nextElementSibling; if (nextItem && nextItem.classList.contains('q-item')) setTimeout(() => nextItem.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500);
      if (answered === x.quiz.length) {
        const pct = Math.round(right / x.quiz.length * 100);
        await App.reward({ quizzes: 1, grammar: 1, perfect: pct === 100 ? 1 : 0, xp: 10 + right * 3 }, $('#gRes'));
        state.game = await Game.mutate(gs => { gs.grammarDone = { ...(gs.grammarDone || {}), [x.id]: Math.max(pct, (gs.grammarDone || {})[x.id] || 0) }; });
        if (pct >= 80) { Sfx.win(); confetti(); }
        $('#gRes').innerHTML = `<div class="feedback ${pct >= 80 ? 'ok' : 'no'}" style="position:static"><b>${t('{right}/{total} câu đúng ({pct}%)', { right, total: x.quiz.length, pct })}</b> · +${10 + right * 3} XP
          ${pct < 80 ? `<div class="small">${t('Xem lại phần công thức và lỗi hay gặp rồi làm lại nhé. Câu sai đã vào Sổ lỗi sai.')}</div>` : ''}
          <div class="row" style="margin-top:.6rem"><button class="btn sm" id="gAgain">↺ ${t('Làm lại')}</button>${right < x.quiz.length ? `<a class="btn sm" href="#/mistakes">📒 ${t('Sổ lỗi sai')}</a>` : ''}${next ? `<a class="btn sm primary" href="#/grammar/${next.id}">${t('Bài tiếp theo')} →</a>` : ''}</div></div>${recapHtml(x)}`;
        $('#gRes').scrollIntoView({ behavior: 'smooth', block: 'center' });
        $('#gAgain').onclick = again;
      }
    }));
  }
  // Tóm tắt cuối bài: ý chính → công thức → lỗi hay gặp (gặp lại ngay sau khi luyện giúp nhớ lâu)
  function recapHtml(x) {
    const f = (x.blocks.find(b => b.type === 'formula') || { rows: [] }).rows[0], m = x.blocks.find(b => b.type === 'mistake');
    return `<div class="g-recap" role="note"><h3>🧠 ${t('Tóm tắt bài học')}</h3><div class="small">${esc(x.summary)}</div>
      ${f ? `<div class="frow" style="margin-top:.5rem"><div class="fparts">${f.parts.map(p => `<span class="fp ${esc(p.c || '')}">${esc(p.t)}</span>`).join('<span class="fplus">+</span>')}</div>${f.ex ? `<div class="fex" lang="en">➜ ${hx(f)}</div>` : ''}</div>` : ''}
      ${m ? `<div class="small" style="margin-top:.4rem"><span class="bad" role="img" aria-label="${t('Sai')}">✗</span> <s lang="en">${esc(m.wrong)}</s> → <span class="good" role="img" aria-label="${t('Đúng')}">✓</span> <b lang="en">${esc(m.right)}</b></div>` : ''}</div>`;
  }
  // ---------- Bài tập tự luận: chia động từ, dạng từ, điền từ, viết lại câu, nối câu, tìm lỗi sai ----------
  const dkind = k => { const K = { verb: '🔤 ' + t('Chia động từ'), form: '🧬 ' + t('Dạng đúng của từ'), fill: '✏️ ' + t('Điền từ'), rewrite: '🔁 ' + t('Viết lại câu'), combine: '🔗 ' + t('Nối câu'), error: '🕵️ ' + t('Tìm lỗi sai') }; return K[k] || K.fill; };
  const dnorm = s => ' ' + String(s || '').toLowerCase().replace(/[’‘`]/g, "'").replace(/won't/g, 'will not').replace(/can't|can not/g, 'cannot').replace(/n't\b/g, ' not').replace(/'re\b/g, ' are').replace(/'ve\b/g, ' have').replace(/'ll\b/g, ' will').replace(/'m\b/g, ' am')
    .replace(/[.,!?;:"“”()]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  // Chuẩn hóa thêm: chính tả Anh–Mỹ (-ize/-ise), "per cent"/"percent" → "%"
  // + "2,000" = "2000" (dấu phân cách hàng nghìn), "three-fold" = "threefold" (gạch nối tùy chọn)
  const dnorm2 = s => dnorm(String(s || '').replace(/(\d),(?=\d{3}\b)/g, '$1').replace(/([a-z])-(?=[a-z])/gi, '$1')).replace(/(\w)iz(e|ed|es|ing|ation|ations)\b/g, '$1is$2').replace(/(\d)\s*(?:per cent|percent)\b/g, '$1%').replace(/\s+%/g, '%');
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
    if (d.t === 'error') return `<div class="q-item dr" data-d="${k}">${head}<div class="dr-q" style="margin:.5rem 0;font-size:1.05rem;line-height:2">${d.parts.map((p, j) => `<button class="dr-part" data-j="${j}"><u>${esc(p)}</u><sub>${'ABCD'[j] || j + 1}</sub></button>`).join(' ')}</div><div class="small muted">${t('Bấm vào phần sai.')}</div><div class="small" data-fb hidden aria-live="polite"></div></div>`;
    const long = d.t === 'rewrite' || d.t === 'combine';
    const q = long ? `<div style="margin:.5rem 0">${esc(d.q)}${d.hint ? ` <span class="muted small">(${esc(d.hint)})</span>` : ''}</div><textarea class="dr-in" rows="2" spellcheck="false" placeholder="${t('Viết câu của bạn…')}">${esc(d.start ? d.start + ' ' : '')}</textarea>`
      : `<div style="margin:.5rem 0;line-height:2.2">${esc(d.q).replace('___', `<input class="dr-in gap" size="14" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${esc(t('Điền từ'))}">`)}</div>`;
    return `<div class="q-item dr" data-d="${k}">${head}${q}<div class="row" style="margin-top:.4rem"><button class="btn sm primary dr-chk">${t('Kiểm tra')}</button></div><div class="small" data-fb hidden aria-live="polite"></div></div>`;
  }
  // Chấm 1 câu, trả về true/false (null nếu chưa làm)
  function gradeDrill(item, d, picked) {
    const fb = $('[data-fb]', item);
    let ok, given, answer, typoR = null;
    if (d.t === 'error') {
      if (picked == null) return null;
      ok = picked === d.w; given = d.parts[picked]; answer = `${d.parts[d.w]} → ${d.fix}`;
      $$('.dr-part', item).forEach((b, j) => { b.disabled = true; if (j === d.w) b.classList.add('right'); else if (j === picked) b.classList.add('wrong'); });
    } else {
      const inp = $('.dr-in', item); given = inp.value.trim();
      if (!given || (d.start && dnorm(given) === dnorm(d.start))) return null;
      ok = matchAnswer(given, d.a); answer = d.a[0];
      // Lỗi chính tả nhỏ ở từ chép lại từ đề → vẫn đúng; từ người học phải tự tạo (dạng ngữ pháp đang kiểm, không có trong đề) phải đúng tuyệt đối
      const FX = window.LessonFx;
      if (!ok && FX) {
        const seen = new Set(FX.norm(d.q + ' ' + (d.start || '')).split(/[^a-z']+/));
        for (const a of d.a) { const r = FX.typo(given, a, { protect: FX.norm(a).split(' ').filter(x => !seen.has(x.replace(/[^a-z']/g, ''))), isWord: x => !!(window.IELTS_DATA && IELTS_DATA.INDEX[x]) }); if (r.ok) { ok = true; typoR = r; answer = a; break; } }
      }
      inp.classList.toggle('ok', ok); inp.classList.toggle('no', !ok); inp.readOnly = true;
      const c = $('.dr-chk', item); if (c) c.remove();
    }
    item.dataset.locked = 1; fb.hidden = false;
    fb.innerHTML = `${typoR ? window.LessonFx.typoHead(typoR.marks) : ok ? `✅ <b>${t('Chính xác!')}</b>` : `❌ ${t('Đáp án: <b>{a}</b>', { a: esc(answer) })}`}${d.ex ? `<div class="muted">${esc(d.ex)}</div>` : ''}`;
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
  const heroHtml = (x, unit) => `<div class="card hero-main g-hero" style="margin:.7rem 0 1rem;--uc:${unit.color}">
      <div class="row nowrap"><div style="font-size:3rem" aria-hidden="true">${x.emoji}</div><div><div class="muted small">${t('Chương {n}', { n: chapterOf(x.id).n })} · ${esc(t(chapterOf(x.id).name))} · ${esc(x.level)}</div>
        <h1 style="margin:0;color:#fff">${esc(TTL(x))}</h1>${TTL(x) !== x.en ? `<div style="opacity:.9;font-weight:700" lang="en">${esc(x.en)}</div>` : ''}</div></div>
      <p style="margin:.6rem 0 0;opacity:.95">${esc(x.summary)}</p></div>`;

  function lesson(id, query) {
    prepHL();
    if (query && query.get('view') === 'full') return lessonFull(id);
    return lessonSteps(id);
  }

  // ---------- Chế độ xem toàn bài ----------
  // ✍️ Thử thách tự đặt câu: nhận diện cấu trúc mục tiêu trên máy (grammar/check.js + structures.js), đúng → tô xanh, +15 XP, lưu câu
  const challengeHtml = x => (window.GRAMMAR_CHECK || {})[x.id] ? `<div class="g-block g-chal" id="gChal"><h3>✍️ ${t('Thử thách tự đặt câu')}</h3>
      <p class="small muted">${t('Đặt một câu hoàn chỉnh sử dụng cấu trúc bạn vừa học')} · <b translate="no">${esc(GRAMMAR_CHECK[x.id][1])}</b></p>
      <textarea class="input" id="gcIn" rows="2" spellcheck="true" lang="en" placeholder="${t('Gõ câu tiếng Anh của bạn…')}"></textarea>
      <div class="row" style="margin-top:.6rem"><button class="btn primary" id="gcChk">${t('Kiểm tra câu')}</button></div><div id="gcOut" aria-live="polite"></div></div>` : '';
  function bindChallenge(x) {
    const box = $('#gChal'); if (!box) return;
    const [src, formula] = GRAMMAR_CHECK[x.id], re = new RegExp(src, 'iu');
    $('#gcChk', box).onclick = () => {
      const sen = $('#gcIn', box).value.trim().replace(/\s+/g, ' '), out = $('#gcOut', box);
      if (sen.split(' ').length < 4 || !/[a-z]/i.test(sen)) { out.innerHTML = `<div class="feedback no" style="position:static;margin-top:.6rem">${t('Hãy viết một câu hoàn chỉnh (ít nhất 4 từ).')}</div>`; return; }
      const m = sen.match(re) || null, st = window.VBStruct ? VBStruct.analyze(sen, 20).find(r => r.lesson === x.id) : null;
      const hit = m ? m[0] : st ? st.match : '';
      if (hit) {
        const i = sen.toLowerCase().indexOf(hit.toLowerCase()), marked = i >= 0 ? esc(sen.slice(0, i)) + `<mark class="g-ok">${esc(sen.slice(i, i + hit.length))}</mark>` + esc(sen.slice(i + hit.length)) : esc(sen);
        const first = !(state.game && state.game.gch && state.game.gch[x.id + '|' + sen.toLowerCase()]);
        if (first) { App.reward({ xp: 15 }); Game.mutate(gs => { gs.gch = gs.gch || {}; gs.gch[x.id + '|' + sen.toLowerCase()] = 1; }).then(g2 => { state.game = g2; }); }
        Sfx.correct();
        out.innerHTML = `<div class="feedback ok" style="position:static;margin-top:.6rem;display:flex;gap:.8rem;align-items:center">${window.Kit ? Kit.svg('cheer', 56) : '🎉'}<div><div>${marked}</div><b>${t('Tuyệt! Bạn đã dùng đúng cấu trúc của bài.')}</b>${first ? ' +15 XP' : ''}<div style="margin-top:.4rem"><button class="btn sm" id="gcSave">＋ ${t('Lưu câu này vào Sổ tay ôn tập')}</button></div></div></div>`;
        const sv = $('#gcSave', out); if (sv) sv.onclick = () => App.savePhraseDialog ? App.savePhraseDialog({ phrase: x.en, vi: I18N.lang() === 'vi' ? x.title : '', sentence: sen, title: t('Ngữ pháp') }) : null;
      } else {
        Sfx.wrong && Sfx.wrong();
        out.innerHTML = `<div class="feedback no" style="position:static;margin-top:.6rem">${t('Chưa thấy cấu trúc của bài trong câu.')} ${t('Công thức')}: <b translate="no">${esc(formula)}</b><div class="small" style="margin-top:.3rem">${t('Gợi ý: xem lại ví dụ ở phần “Cách dùng”, rồi viết lại câu theo đúng công thức.')}</div></div>`;
      }
    };
  }
  function lessonFull(id) {
    const all = L(), i = all.findIndex(x => x.id === id), x = all[i];
    if (!x) return routes.grammar();
    const unit = UNITS.find(u => u.id === x.unit) || UNITS[0];
    const prev = all[i - 1], next = all[i + 1];
    view.innerHTML = `
      <div class="row between"><a href="#/grammar" class="small">← ${t('Ngữ pháp')}</a><a class="btn sm" href="#/grammar/${x.id}">🎯 ${t('Học từng bước')}</a></div>
      ${heroHtml(x, unit)}
      <div class="stack" id="gBody">${x.blocks.map(b => (R[b.type] || (() => ''))(b)).join('')}${l1Slot(x)}</div>
      <div class="lv-slot" hidden data-lv="${esc(JSON.stringify({ mode: 'grammar', grammar: [x.id], level: x.level || '' }))}"></div>
      <div style="margin-top:1rem">${quizHtml(x)}</div>
      ${drillsOf(x).length ? `<div style="margin-top:1rem">${drillsHtml(x)}</div>` : ''}
      <div style="margin-top:1rem">${challengeHtml(x)}</div>
      <div class="row between" style="margin-top:1rem">${prev ? `<a class="btn" href="#/grammar/${prev.id}?view=full">← ${esc(TTL(prev))}</a>` : '<span></span>'}${next ? `<a class="btn primary" href="#/grammar/${next.id}?view=full">${esc(TTL(next))} →</a>` : `<a class="btn primary" href="#/grammar">${t('Hoàn thành chủ điểm')} 🎉</a>`}</div>`;
    App.bindCommon();
    bindQuiz(x, next, () => lessonFull(id));
    if (drillsOf(x).length) bindDrills(x);
    bindChallenge(x);
    fillL1(x);
    App.need('lvideo').then(() => window.LessonVideo && LessonVideo.scan(view)).catch(() => {}); // 🎬 video khớp chủ điểm (ẩn nếu không có)
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
    if (uses.length) steps.push({ name: t('Cách dùng'), em: '🎯', html: () => `<div class="g-block"><h3>🎯 ${t('Khi nào dùng?')} <span class="muted small">${t('Bấm vào từng thẻ để xem ví dụ')}</span></h3><div class="uses">${uses[0].items.map((u, k) => `<button class="use use-card" data-k="${k}"><span class="unum">${k + 1}</span><div style="text-align:start"><b>${esc(u.title)}</b><div class="use-more" hidden><div class="uex" lang="en">${hx(u)}</div><div class="muted small">${esc(u.vi || '')}</div></div></div></button>`).join('')}</div></div>`,
      bind: () => $$('.use-card').forEach(b => b.onclick = () => { const m = $('.use-more', b); if (m.hidden) { m.hidden = false; Sfx.flip(); UI.speak(uses[0].items[+b.dataset.k].ex, state.settings.accent); } }) });
    if (extras.length) steps.push({ name: t('Mẹo & dấu hiệu'), em: '💡', html: () => `<div class="stack">${extras.map(b => R[b.type](b)).join('')}</div>` });
    if (mistakes.length) steps.push({ name: t('Bắt lỗi'), em: '🕵️', html: () => `<div class="stack"><div class="small muted">${t('Đọc câu sai, tự tìm lỗi trong đầu rồi bấm để kiểm tra – cách nhớ lâu nhất là tự phát hiện.')}</div>${mistakes.map((m, k) => `<div class="g-mistake"><div><span class="bad" role="img" aria-label="${t('Sai')}">✗</span> <span lang="en">${esc(m.wrong)}</span></div><button class="btn sm" data-reveal="${k}" style="margin-top:.5rem">🔍 ${t('Tôi đã tìm ra lỗi – xem đáp án')}</button><div data-ans="${k}" hidden style="margin-top:.4rem" aria-live="polite"><div><span class="good" role="img" aria-label="${t('Đúng')}">✓</span> <b lang="en">${esc(m.right)}</b></div><div class="small muted">${esc(m.why)}</div></div></div>`).join('')}${l1Slot(x)}</div>`,
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
    if ((window.GRAMMAR_CHECK || {})[x.id]) steps.push({ name: t('Tự đặt câu'), em: '✍️', html: () => challengeHtml(x), bind: () => bindChallenge(x) });

    let cur = 0, gateOk = false;
    function stepOk() { gateOk = true; const n = $('#sNext'); if (n) n.disabled = false; }
    const draw = () => {
      const st = steps[cur]; gateOk = !st.gate;
      view.innerHTML = `
        <div class="row between"><a href="#/grammar" class="small">← ${t('Ngữ pháp')}</a><a class="btn sm ghost" href="#/grammar/${x.id}?view=full">📖 ${t('Xem toàn bài')}</a></div>
        ${cur === 0 ? heroHtml(x, unit) : `<div class="row nowrap" style="margin:.7rem 0"><span style="font-size:1.8rem" aria-hidden="true">${x.emoji}</span><div><b>${esc(TTL(x))}</b>${TTL(x) !== x.en ? `<div class="tiny muted" lang="en">${esc(x.en)}</div>` : ''}</div></div>`}
        <div class="steps">${steps.map((s, k) => `<button class="stepdot ${k === cur ? 'on' : ''} ${k < cur ? 'done' : ''}" data-step="${k}" title="${esc(s.name)}" ${k === cur ? 'aria-current="step"' : ''}><span>${k < cur ? '✓' : s.em}</span><small>${esc(s.name)}</small></button>`).join('')}</div>
        <div class="step-body">${st.html()}</div>
        ${cur < steps.length - 1 ? `<div class="row between" style="margin-top:1rem">${cur > 0 ? `<button class="btn" id="sPrev">← ${t('Quay lại')}</button>` : '<span></span>'}<button class="btn primary lg" id="sNext" ${gateOk ? '' : 'disabled'}>${t('Tiếp tục')} →</button></div>` : `<div class="row" style="margin-top:1rem"><button class="btn" id="sPrev">← ${t('Quay lại')}</button></div>`}`;
      App.bindCommon();
      if (st.bind) st.bind();
      fillL1(x);
      const n = $('#sNext'); if (n) n.onclick = () => { cur++; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      const p = $('#sPrev'); if (p) p.onclick = () => { cur--; draw(); };
      $$('[data-step]').forEach(b => b.onclick = () => { const k = +b.dataset.step; if (k <= cur || !steps.slice(cur, k).some(s => s.gate)) { cur = k; draw(); } });
      if (st.gate) { const skip = document.createElement('button'); skip.className = 'btn sm ghost'; skip.textContent = t('Bỏ qua'); skip.onclick = stepOk; const n2 = $('#sNext'); if (n2) n2.before(skip); }
    };
    draw();
  }
})();
