/* Lexis: nhận diện từ học thuật (AWL), từ nối, collocation, từ chủ đề trong văn bản → tô sáng & phân tích bài viết. */
(function (g) {
  const { TOPICS, INDEX } = g.IELTS_DATA;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const AWL = new Set(), LINK = new Set(), TOPIC = new Map();
  const PHRASES = []; // [{text, type}]
  // Từ nối phổ biến (bổ sung cho bộ 'linking' & 'opinion')
  ['however', 'moreover', 'furthermore', 'therefore', 'thus', 'hence', 'consequently', 'nevertheless', 'nonetheless', 'although', 'whereas', 'while', 'despite', 'additionally', 'similarly', 'conversely', 'meanwhile', 'firstly', 'secondly', 'finally', 'overall', 'instead', 'otherwise', 'besides', 'accordingly', 'notably', 'undoubtedly', 'arguably']
    .forEach(w => LINK.add(w));
  TOPICS.forEach(t => t.words.forEach(w => {
    const k = w.word.toLowerCase();
    const multi = /\s/.test(k);
    if (t.group === 'awl') AWL.add(k);
    if (t.id === 'linking' || t.id === 'opinion' || t.id === 'task2' && /^(consequently|nevertheless)$/.test(k)) { if (multi) PHRASES.push({ text: k, type: 'link' }); else LINK.add(k); }
    else if (t.id === 'collocations' || t.id === 'idioms' || t.id === 'phrasal') { if (multi) PHRASES.push({ text: k, type: 'col' }); }
    else if (t.group === 'topics' && !multi && !TOPIC.has(k)) TOPIC.set(k, t);
  }));
  PHRASES.sort((a, b) => b.text.length - a.text.length);

  // Dạng gốc có thể có của một từ (đơn giản, đủ dùng cho tiếng Anh học thuật)
  function bases(w) {
    const out = [w];
    if (/ies$/.test(w)) out.push(w.slice(0, -3) + 'y');
    if (/es$/.test(w)) out.push(w.slice(0, -2));
    if (/s$/.test(w)) out.push(w.slice(0, -1));
    if (/ied$/.test(w)) out.push(w.slice(0, -3) + 'y');
    if (/ed$/.test(w)) { out.push(w.slice(0, -2), w.slice(0, -1)); if (/(.)\1ed$/.test(w)) out.push(w.slice(0, -3)); }
    if (/ing$/.test(w)) { out.push(w.slice(0, -3), w.slice(0, -3) + 'e'); if (/(.)\1ing$/.test(w)) out.push(w.slice(0, -4)); }
    if (/ly$/.test(w)) out.push(w.slice(0, -2), w.slice(0, -2) + 'e');
    if (/ation$/.test(w)) out.push(w.slice(0, -5) + 'e', w.slice(0, -5));
    if (/ity$/.test(w)) out.push(w.slice(0, -3), w.slice(0, -3) + 'e');
    if (/ment$/.test(w)) out.push(w.slice(0, -4));
    if (/ise$|ize$/.test(w)) out.push(w.replace(/iz/, 'is'), w.replace(/is/, 'iz'));
    return out;
  }
  const find = (set, w) => bases(w).find(b => set.has(b));
  function classify(w) {
    w = w.toLowerCase();
    return { awl: find(AWL, w), link: LINK.has(w) ? w : null, topic: (b => b && TOPIC.get(b))(find(TOPIC, w)) };
  }

  const phraseRe = new RegExp(`\\b(${PHRASES.map(p => reEsc(p.text).replace(/\\ /g, '\\s+').replace(/ /g, '\\s+')).join('|')})\\b`, 'gi');
  const phraseType = new Map(PHRASES.map(p => [p.text, p.type]));

  /* Tách câu thành HTML có các từ chạm được; opts: { keywords:Set, mine:fn(word)→bool } */
  function markSentence(s, opts = {}) {
    const ranges = [];
    s.replace(phraseRe, (m, _1, off) => { ranges.push({ a: off, b: off + m.length, type: phraseType.get(m.toLowerCase().replace(/\s+/g, ' ')) || 'col', text: m.toLowerCase().replace(/\s+/g, ' ') }); return m; });
    let pos = 0;
    return s.split(/(\s+)/).map(tok => {
      const start = pos; pos += tok.length;
      const m = tok.match(/^([^A-Za-z]*)([A-Za-z][A-Za-z'’-]*[A-Za-z]|[A-Za-z])([^A-Za-z]*)$/);
      if (!m) return esc(tok);
      const w = m[2].toLowerCase().replace(/’/g, "'");
      const ph = ranges.find(r => start >= r.a && start < r.b);
      const c = classify(w);
      const cls = ['tw'];
      if (opts.keywords && opts.keywords.has(w)) cls.push('kw');
      if (ph) cls.push(ph.type === 'link' ? 'link' : 'col');
      else if (c.link) cls.push('link');
      if (c.awl) cls.push('awl');
      if (opts.mine && opts.mine(w)) cls.push('mine');
      return `${esc(m[1])}<span class="${cls.join(' ')}" data-w="${esc(w)}"${ph ? ` data-ph="${esc(ph.text)}"` : ''}>${esc(m[2])}</span>${esc(m[3])}`;
    }).join('');
  }
  const sentencesOf = p => p.match(/[^.!?]+[.!?]+["”’)]*\s*|[^.!?]+$/g) || [p];
  function markText(text, opts) {
    return text.split(/\n\s*\n/).map(p => '<p>' + sentencesOf(p).map(s => `<span class="sent">${markSentence(s, opts)}</span>`).join('') + '</p>').join('');
  }

  // ---------- Phân tích bài viết ----------
  const STOP = new Set('a an the and or but if of to in on at by for with from as is are was were be been being it its this that these those there their they them he she his her we our you your i my me not no so do does did have has had can could will would should may might must also than then which who whom whose what when where why how all any some more most such very just only into about over under between through during before after up down out off again further once both each few other same own too s t'.split(' '));

  function analyze(text) {
    const clean = text.replace(/\s+/g, ' ').trim();
    const sents = clean ? sentencesOf(clean).map(x => x.trim()).filter(Boolean) : [];
    const words = (clean.match(/[A-Za-z][A-Za-z'’-]*/g) || []).map(w => w.toLowerCase().replace(/’/g, "'"));
    const content = words.filter(w => !STOP.has(w) && w.length > 2);
    const freq = {};
    content.forEach(w => { const b = bases(w).find(x => INDEX[x]) || w; freq[b] = (freq[b] || 0) + 1; });
    const awl = new Map(), link = new Map(), topics = new Map(), phrases = new Map();
    words.forEach(w => { const c = classify(w); if (c.awl) awl.set(c.awl, (awl.get(c.awl) || 0) + 1); if (c.link) link.set(c.link, (link.get(c.link) || 0) + 1); if (c.topic) topics.set(c.topic.name, (topics.get(c.topic.name) || 0) + 1); });
    clean.replace(phraseRe, m => { const k = m.toLowerCase().replace(/\s+/g, ' '); phrases.set(k, (phrases.get(k) || 0) + 1); if (phraseType.get(k) === 'link') link.set(k, (link.get(k) || 0) + 1); return m; });
    const lens = sents.map(s => (s.match(/[A-Za-z][A-Za-z'’-]*/g) || []).length);
    const avg = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
    const sd = lens.length ? Math.sqrt(lens.reduce((a, b) => a + (b - avg) ** 2, 0) / lens.length) : 0;
    const diversity = content.length ? new Set(content.map(w => bases(w).slice(-1)[0])).size / content.length : 0;
    const overused = Object.entries(freq).filter(([w, n]) => n >= 4 && !AWL.has(w) && !LINK.has(w)).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const awlRatio = words.length ? [...awl.values()].reduce((a, b) => a + b, 0) / words.length : 0;
    // Ước tính Lexical Resource (heuristic, chỉ tham khảo)
    let score = 4.5;
    score += Math.min(1.5, awlRatio * 20);           // ~7.5% từ AWL → +1.5
    score += Math.min(1, phrases.size * 0.2);         // collocation / cụm tự nhiên
    score += Math.min(0.8, link.size * 0.1);          // đa dạng từ nối
    score += diversity > 0.75 ? 0.7 : diversity > 0.6 ? 0.4 : 0;
    score -= Math.min(1, overused.length * 0.25);     // lặp từ
    if (words.length < 250) score -= 0.5;
    let band = Math.max(4, Math.min(8.5, Math.round(score * 2) / 2));
    // IELTS phạt nặng bài thiếu độ dài → đặt trần điểm cho bài ngắn
    if (words.length < 150) band = Math.min(band, 5);
    else if (words.length < 250) band = Math.min(band, 6);
    return { words: words.length, sentences: sents.length, avg, sd, diversity, awl, link, topics, phrases, overused, awlRatio, band, lens };
  }

  g.Lexis = { classify, markText, markSentence, analyze, bases, AWL, LINK };
})(typeof self !== 'undefined' ? self : this);
