/* 📚 Truyện & podcast theo cấp độ – LÕI thuần (không DOM, không mạng): tách từ chạm được, mốc thời gian câu (karaoke),
 * đánh dấu Đã biết/Học, đếm từ mới, chấm quiz, phút đọc/ngày + mục tiêu 10 phút, kiểm schema/bản quyền nội dung.
 * Dùng chung cho app (window.Stories), cổng QA (scripts/content-qa/gate.mjs) và test (scripts/test/stories.mjs). Spec: docs/STORIES.md. */
(function (root) {
  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const CAST = ['ama', 'carlos', 'kit']; // nhân vật 2D đã duyệt (Ama nữ, Carlos nam, Kit linh vật)
  const MAX_WPM = 150;
  const AVG_WORDS = { A1: 9, A2: 12, B1: 16, B2: 20, C1: 24 }; // trung bình từ/câu tối đa theo cấp
  const PD_PUBLISHED = 1930, PD_DIED = 1955; // Mỹ: xuất bản ≥ 95 năm; đời tác giả + 70 năm (tính cho năm 2026)
  // Tác phẩm còn bản quyền hay bị nhắc tới – chặn cứng dù ai đó ghi nhầm "public-domain"
  const BLOCK = /animal farm|nineteen eighty|\b1984\b|harry potter|lord of the rings|the hobbit|narnia|little prince|petit prince|charlie and the chocolate|the old man and the sea|of mice and men|great gatsby|to kill a mockingbird|catcher in the rye|brave new world|fahrenheit 451|hunger games/i;
  const DAY_KEEP = 35, TICK_MAX = 60;

  const WORD_RE = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;
  const key = w => String(w || '').toLowerCase().replace(/’/g, "'");
  // "fox's" → "fox", "don't" giữ nguyên (kho có dạng rút gọn)
  const base = w => key(w).replace(/'s$/, '');
  const IRR = { elves: 'elf', shelves: 'shelf', wolves: 'wolf', knives: 'knife', wives: 'wife', lives: 'life', leaves: 'leaf', men: 'man', women: 'woman', children: 'child', feet: 'foot', teeth: 'tooth', mice: 'mouse', geese: 'goose', went: 'go', came: 'come', saw: 'see', took: 'take', gave: 'give', made: 'make', had: 'have', said: 'say', found: 'find', ran: 'run', sat: 'sit', got: 'get', thought: 'think', hid: 'hide', slept: 'sleep', paid: 'pay', told: 'tell', knew: 'know', began: 'begin', ate: 'eat', drank: 'drink', wrote: 'write', shown: 'show', was: 'be', were: 'be', is: 'be', are: 'be', am: 'be' };
  /** Dạng gốc có thể của 1 từ (grapes → grape, jumped → jump, elves → elf) – để khớp với từ khóa trong kho. */
  function lemmas(w0) {
    const w = base(w0), out = new Set([w]);
    if (IRR[w]) out.add(IRR[w]);
    const add = x => { if (x && x.length > 1) out.add(x); };
    if (/ies$/.test(w)) add(w.slice(0, -3) + 'y');
    if (/(s|sh|ch|x|z|o)es$/.test(w)) add(w.slice(0, -2));
    if (/s$/.test(w) && !/ss$/.test(w)) add(w.slice(0, -1));
    if (/ied$/.test(w)) add(w.slice(0, -3) + 'y');
    if (/ed$/.test(w)) { add(w.slice(0, -2)); add(w.slice(0, -1)); if (/([b-df-hj-np-tv-z])\1ed$/.test(w)) add(w.slice(0, -3)); }
    if (/ing$/.test(w)) { add(w.slice(0, -3)); add(w.slice(0, -3) + 'e'); if (/([b-df-hj-np-tv-z])\1ing$/.test(w)) add(w.slice(0, -4)); }
    if (/ly$/.test(w)) add(w.slice(0, -2));
    return [...out];
  }

  /** Tách câu thành token: từ (chạm được) và phần chữ còn lại (dấu câu, khoảng trắng) – nối lại đúng bằng câu gốc. */
  function tokens(sentence) {
    const s = String(sentence || ''), out = [];
    let last = 0;
    for (const m of s.matchAll(WORD_RE)) {
      if (m.index > last) out.push({ t: s.slice(last, m.index) });
      out.push({ t: m[0], w: base(m[0]), l: lemmas(m[0]) });
      last = m.index + m[0].length;
    }
    if (last < s.length) out.push({ t: s.slice(last) });
    return out;
  }
  const words = text => (String(text || '').match(WORD_RE) || []).map(base);
  const textOf = s => (typeof s === 'string' ? s : (s && s.text) || '');
  const sentencesOf = ch => (ch && ch.sentences || []).map(textOf);
  const wordCount = story => (story.chapters || []).reduce((n, ch) => n + sentencesOf(ch).reduce((k, s) => k + words(s).length, 0), 0);
  const minutes = (story, wpm) => Math.max(1, Math.round(wordCount(story) / (wpm || (story.audio && story.audio.wpm) || 120)));

  /** Mốc thời gian từng câu (giây). marks = mốc thật từ audio [[start, end], …]; không có → ước theo số từ ở wpm + nghỉ 0,35 s giữa câu. */
  function timeline(sentences, opts) {
    const o = opts || {}, list = (sentences || []).map(textOf);
    if (Array.isArray(o.marks) && o.marks.length === list.length) return o.marks.map(([a, b], i) => ({ i, start: a, end: b }));
    const wpm = Math.min(o.wpm || 120, MAX_WPM), gap = o.gap == null ? 0.35 : o.gap;
    let at = 0;
    return list.map((s, i) => { const d = Math.max(0.6, words(s).length * 60 / wpm); const r = { i, start: at, end: at + d }; at += d + gap; return r; });
  }
  /** Câu đang đọc tại giây sec (−1 trước câu đầu; trong khoảng nghỉ giữ câu trước). */
  function sentenceAt(tl, sec) {
    let lo = 0, hi = tl.length - 1, ans = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (tl[mid].start <= sec) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans;
  }
  const wpm = (text, seconds) => (seconds > 0 ? Math.round(words(text).length / seconds * 60) : 0);

  // ---- Đã biết / Học (state = game.story; trả về bản MỚI, không sửa tại chỗ) ----
  const empty = () => ({ known: {}, learn: {}, done: {}, at: {} });
  function mark(st, word, kind, now) {
    const s = { ...empty(), ...(st || {}) }, w = base(word), ts = now || Date.now();
    s.known = { ...s.known }; s.learn = { ...s.learn };
    if (!w) return s;
    if (kind === 'known') { s.known[w] = ts; delete s.learn[w]; } else if (kind === 'learn') { s.learn[w] = ts; delete s.known[w]; } else { delete s.known[w]; delete s.learn[w]; }
    return s;
  }
  /** Từ tô sáng của chương còn MỚI với người học (chưa Đã biết, chưa có trong sổ). inDeck: w → bool. */
  function newWords(ch, st, inDeck) {
    const s = st || empty(), seen = new Set(), out = [];
    for (const w0 of ch && ch.words || []) { const w = base(w0); if (seen.has(w)) continue; seen.add(w); if (!(s.known || {})[w] && !(inDeck && inDeck(w))) out.push(w); }
    return out;
  }
  /** "+N từ mới": số từ bấm Học (và Đã biết) từ mốc since. */
  function counter(st, since) {
    const s = st || empty(), n = o => Object.values(o || {}).filter(ts => ts >= (since || 0)).length;
    return { learned: n(s.learn), known: n(s.known), total: n(s.learn) + n(s.known) };
  }
  function chapterDone(st, storyId, ch, score) {
    const s = { ...empty(), ...(st || {}) };
    s.done = { ...s.done, [storyId + '#' + ch]: score }; s.at = { ...s.at, [storyId]: Math.max((s.at || {})[storyId] || 0, ch + 1) };
    return s;
  }

  // ---- Quiz ----
  function grade(quiz, answers) {
    const q = quiz || [], a = answers || {}, wrong = [];
    q.forEach((x, i) => { if (Number(a[i]) !== Number(x.answer) || a[i] == null) wrong.push(i); });
    const score = q.length - wrong.length;
    return { score, n: q.length, pct: q.length ? Math.round(score / q.length * 100) : 0, wrong };
  }

  // ---- Phút đọc/ngày (log = game.storyMin: { 'YYYY-MM-DD': giây }) ----
  function addTime(log, day, sec) {
    const add = Math.max(0, Math.min(TICK_MAX, Number(sec) || 0)), out = { ...(log || {}) };
    out[day] = (out[day] || 0) + add;
    const keep = Object.keys(out).sort().slice(-DAY_KEEP);
    for (const k of Object.keys(out)) if (!keep.includes(k)) delete out[k];
    return out;
  }
  const minutesOn = (log, day) => Math.floor(((log || {})[day] || 0) / 60);
  function goal(log, day, target) {
    const tg = target || 10, min = minutesOn(log, day);
    return { min, target: tg, pct: Math.min(100, Math.round(min / tg * 100)), done: min >= tg };
  }

  // ---- Kiểm nội dung (cổng QA + test) ----
  function licenseOk(src) {
    const s = src || {}, errs = [];
    if (BLOCK.test(String(s.work || '') + ' ' + String(s.title || ''))) errs.push('tác phẩm còn bản quyền (danh sách chặn)');
    if (s.type === 'original') { if (s.author !== 'Lexkite') errs.push('truyện gốc phải ghi author "Lexkite"'); }
    else if (s.type === 'public-domain') {
      if (!(Number.isFinite(s.published) && s.published <= PD_PUBLISHED)) errs.push(`public-domain cần published ≤ ${PD_PUBLISHED}`);
      if (!(Number.isFinite(s.authorDied) && s.authorDied <= PD_DIED)) errs.push(`public-domain cần authorDied ≤ ${PD_DIED}`);
      if (!s.work || !s.author || !/^https:\/\//.test(s.url || '')) errs.push('public-domain cần work, author, url https bản PD');
    } else errs.push('source.type phải là public-domain hoặc original');
    return errs;
  }
  /** Danh sách lỗi schema/bản quyền/độ dài câu/wpm/bìa (rỗng = đạt). Từ đúng cấp + ngữ pháp kiểm ở gate (cần kho từ + LK_WRITE). */
  function validate(story) {
    const x = story || {}, E = [], id = x.id || '?';
    const e = m => E.push(id + ': ' + m);
    if (!/^[a-z0-9-]+$/.test(x.id || '')) e('id chỉ a-z0-9-');
    if (!['book', 'podcast'].includes(x.kind)) e('kind phải là book|podcast');
    if (!LEVELS.includes(x.level)) e('level phải trong A1–C1');
    if (!x.title || !x.summary) e('thiếu title/summary');
    if (!x.license) e('thiếu license');
    for (const m of licenseOk(x.source)) e(m);
    const c = x.cover || {};
    if (c.style !== '2d') e('ảnh bìa chỉ minh họa 2D (cover.style = "2d")');
    if (!Array.isArray(c.cast) || c.cast.some(k => !CAST.includes(k))) e('cover.cast chỉ gồm ' + CAST.join('/'));
    if (!c.scene) e('thiếu cover.scene');
    const a = x.audio || {};
    if (!(a.wpm > 0 && a.wpm <= MAX_WPM)) e(`audio.wpm phải ≤ ${MAX_WPM}`);
    if (x.kind === 'podcast') {
      const sp = x.speakers || {};
      if (!Object.keys(sp).length || Object.values(sp).some(k => !CAST.includes(k))) e('podcast cần speakers là nhân vật 2D');
    }
    const chs = x.chapters || [];
    if (!chs.length) e('cần ≥ 1 chương');
    let nW = 0, nS = 0;
    chs.forEach((ch, ci) => {
      const where = `ch${ci + 1}`, ss = ch.sentences || [];
      if (!ch.title) e(where + ' thiếu title');
      if (ss.length < 3) e(where + ' cần ≥ 3 câu');
      ss.forEach((s, si) => {
        if (!textOf(s).trim()) e(`${where} câu ${si + 1} rỗng`);
        if (x.kind === 'podcast' && !(s && s.who && (x.speakers || {})[s.who])) e(`${where} lượt ${si + 1} thiếu who hợp lệ`);
        nW += words(textOf(s)).length; nS++;
      });
      const inCh = new Set(sentencesOf(ch).flatMap(words).flatMap(lemmas));
      if (!(ch.words || []).length) e(where + ' cần words (từ tô sáng)');
      for (const w of ch.words || []) if (!inCh.has(base(w))) e(`${where} từ "${w}" không có trong chương`);
      const q = ch.quiz || [];
      if (q.length < 2) e(where + ' cần ≥ 2 câu hỏi hiểu bài');
      q.forEach((qq, qi) => {
        const ok = Array.isArray(qq.options) && qq.options.length >= 2 && Number.isInteger(qq.answer) && qq.answer >= 0 && qq.answer < qq.options.length;
        if (!qq.q || !ok) e(`${where} câu hỏi ${qi + 1} sai schema/đáp án ngoài phạm vi`);
        if (!qq.explain) e(`${where} câu hỏi ${qi + 1} thiếu explain`);
        if (ok && new Set(qq.options.map(o => key(o).trim())).size !== qq.options.length) e(`${where} câu hỏi ${qi + 1} phương án trùng`);
      });
    });
    if (nS && LEVELS.includes(x.level) && nW / nS > AVG_WORDS[x.level]) e(`trung bình ${(nW / nS).toFixed(1)} từ/câu > ${AVG_WORDS[x.level]} (${x.level})`);
    return E;
  }

  const Stories = { LEVELS, CAST, MAX_WPM, AVG_WORDS, BLOCK, tokens, words, base, lemmas, sentencesOf, textOf, wordCount, minutes, timeline, sentenceAt, wpm, empty, mark, newWords, counter, chapterDone, grade, addTime, minutesOn, goal, licenseOk, validate };
  if (typeof module === 'object' && module.exports) module.exports = Stories;
  else root.Stories = Stories;
})(typeof self !== 'undefined' ? self : this);
