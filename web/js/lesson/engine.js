/* 🧩 Bài học trộn bài tập nhỏ – lõi THUẦN (không DOM, không t()): chọn từ, dựng bài, hàng đợi "Lỗi cũ", COMBO, kết quả → FSRS, chữ → viseme.
 * Thiết kế: docs/LESSON-ENGINE.md. Giao diện: js/lesson/ui.js. Test: scripts/test/lesson.mjs (chạy được trong Node).
 * Dạng bài: match (ghép cặp từ ↔ nghĩa) · type (nghe gõ lại) · gap (nghe chọn từ thiếu) · build (nghe xếp câu) · say (nói theo) · pic (nhìn ảnh nói từ) · tr (dịch bằng ô chữ) · mean (chọn từ theo nghĩa – chỉ là bản thay của say khi tắt nói). */
(function (g) {
  const DAY = 864e5;
  const norm = s => String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' -]+/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const toks = s => String(s || '').replace(/[“”"]/g, '').split(/\s+/).map(x => x.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '')).filter(Boolean);
  const same = (a, b) => norm(a) === norm(b);
  // Bộ sinh ngẫu nhiên có hạt giống (test/demo lặp lại được)
  const rng = seed => { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; }; };
  const shuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const POS = p => { p = String(p || '').toLowerCase(); return /^(n|noun)\b|^danh/.test(p) ? 'n' : /^(v|verb)\b|^động/.test(p) ? 'v' : /^adj|^tính/.test(p) ? 'adj' : /^adv|^trạng/.test(p) ? 'adv' : p || '?'; };

  // Vị trí từ trong câu (chấp nhận biến thể: consider → considering/considered; cụm nhiều từ: so khớp liên tiếp)
  function findWord(sentence, word) {
    const T = toks(sentence), W = toks(word).map(x => x.toLowerCase());
    if (!T.length || !W.length) return null;
    const stem = w => (w.length > 4 ? w.replace(/(e|y)$/, '') : w);
    const hit = (tok, w, last) => { const x = tok.toLowerCase(); return x === w || (last && x.startsWith(stem(w)) && x.length - w.length <= 3); };
    for (let i = 0; i + W.length <= T.length; i++) {
      if (W.every((w, k) => hit(T[i + k], w, k === W.length - 1))) return { i, n: W.length, toks: T, form: T.slice(i, i + W.length).join(' ') };
    }
    return null;
  }

  // Câu luyện của một thẻ: câu người học gặp trên web (add-on) → câu song ngữ → ví dụ thư viện. Chỉ câu chứa từ, 3–14 từ.
  // Độ dài câu mong muốn theo trình độ CEFR (1=A1 … 6=C2): câu quá ngắn so với mục tiêu (A1 trong khi mục tiêu IELTS 7.5) là lệch đề
  const SENT_LEN = [0, 5, 7, 9, 11, 12, 13];
  // Trình độ câu = trình độ hiện tại + 1 (i+1), không vượt mục tiêu: exam 'ielts…' target = band, còn lại target = CEFR 1–6
  function sentLevel(own, exam, target) {
    const tg = /^ielts|^toefl|^toeic/.test(String(exam || '')) ? (+target >= 7 ? 5 : +target >= 6 ? 4 : +target >= 5 ? 3 : +target > 0 ? 2 : 0) : +target || 0;
    const o = Math.max(1, Math.min(6, +own || 2));
    return tg ? Math.max(1, Math.min(6, Math.min(tg, o + 1))) : o;
  }
  function sentenceOf(c, viOk, lvl) {
    const cands = [];
    if (c.ctx) cands.push({ text: c.ctx, own: true });
    (c.contexts || []).forEach(x => x && x.text && cands.push({ text: x.text, own: true }));
    (c.sentences || []).forEach(x => x && x.en && cands.push({ text: x.en, tr: viOk === false ? '' : x.vi || '', own: false })); // .vi = tiếng Việt: chỉ người học vi (viOk=false → không bao giờ lộ tiếng Việt ở ngôn ngữ khác)
    if (c.ex) cands.push({ text: c.ex, own: false });
    const ok = [];
    for (const s of cands) { const n = toks(s.text).length, f = findWord(s.text, c.word); if (f && n >= 3 && n <= 14) ok.push(Object.assign({}, s, { at: f })); }
    if (!lvl || ok.length < 2) return ok[0] || null;
    const want = SENT_LEN[lvl] || 9; // câu người học tự tra (own) vẫn được ưu tiên khi cùng độ lệch
    return ok.map((s, i) => ({ s, d: Math.abs(toks(s.text).length - want) + (s.own ? -0.5 : 0) + i * 0.01 })).sort((a, b) => a.d - b.d)[0].s;
  }
  // Thẻ mẫu câu (thẻ kết quả tự lưu, docs/specs/learn-card.md): từ = "Can I have …, please?", câu luyện = ex
  const isPat = c => /…/.test(String((c && c.word) || ''));
  const fromExt = c => !!(c.src || (c.contexts || []).some(x => x && x.source && /^https?:/.test(x.source)));
  const isDue = (c, now) => !!(c.srs && (c.srs.reps > 0 || c.srs.last) && c.srs.due <= endOfDay(now));
  const isNew = c => !!(c.srs && c.srs.reps === 0 && !c.srs.last);
  function endOfDay(now) { const d = new Date(now); d.setHours(23, 59, 59, 999); return d.getTime(); }

  /** Chọn từ cho 1 bài: đến hạn (quá hạn lâu trước) → tra bằng add-on (mới nhất trước) → thẻ mới → bộ khởi đầu.
   *  cards: map/list thẻ · opts { n=6, now, starter:[thẻ] } → [{ card, why: 'due'|'ext'|'new'|'start' }] */
  function pickWords(cards, opts = {}) {
    const now = opts.now || Date.now(), n = opts.n || 6, list = (Array.isArray(cards) ? cards : Object.values(cards || {})).filter(c => c && c.word && (c.vi || c.def));
    const out = [], seen = new Set(), add = (c, why) => { const k = norm(c.word); if (out.length < n && !seen.has(k)) { seen.add(k); out.push({ card: c, why }); } };
    if (opts.fixed) { const byK = new Map(list.map(c => [norm(c.word), c])); (opts.starter || []).slice(0, n).forEach(c => add(byK.get(norm(c.word)) || c, byK.has(norm(c.word)) ? 'due' : 'start')); if (out.length >= n) return out; } // nút Lộ trình đã chốt từ: xem trước khớp bài thật
    if (opts.mode === 'review') list.filter(c => c.srs && c.srs.lapses > 0 && (c.srs.reps === 0 || isDue(c, now))).sort((a, b) => b.srs.lapses - a.srs.lapses).forEach(c => add(c, 'due')); // nút Ôn lỗi: từ hay quên trước
    list.filter(c => isDue(c, now)).sort((a, b) => a.srs.due - b.srs.due).forEach(c => add(c, 'due'));
    list.filter(c => !isDue(c, now) && fromExt(c)).sort((a, b) => (b.mod || 0) - (a.mod || 0)).forEach(c => add(c, 'ext'));
    list.filter(c => isNew(c)).sort((a, b) => (b.mod || 0) - (a.mod || 0)).forEach(c => add(c, 'new'));
    if (out.length < Math.min(4, n)) (opts.starter || []).forEach(c => add(c, 'start'));
    return out;
  }

  // Dạng biến đổi của chỗ trống so với từ gốc ('ing' | 'ed' | 's' | ''): phương án nhiễu phải CÙNG dạng ngữ pháp với đáp án
  const formKind = (form, word) => { const f = String(form || '').toLowerCase(), w = String(word || '').toLowerCase(); return !f || f === w ? '' : /ing$/.test(f) ? 'ing' : /ed$/.test(f) ? 'ed' : /s$/.test(f) ? 's' : ''; };
  // Chia đuôi theo quy tắc đều; từ khó (gấp đôi phụ âm, cụm nhiều từ) → '' (bỏ ứng viên, không bao giờ sinh từ sai chính tả)
  function inflect(w, k) {
    w = String(w || '').trim(); if (!k) return w; if (!/^[a-z]+$/i.test(w)) return '';
    if (/[^aeiou][aeiou][^aeiouwxy]$/i.test(w) && w.length <= 5 && k !== 's') return '';
    if (k === 'ing') return /ee$/i.test(w) || !/e$/i.test(w) ? w + 'ing' : w.slice(0, -1) + 'ing';
    if (k === 'ed') return /e$/i.test(w) ? w + 'd' : /[^aeiou]y$/i.test(w) ? w.slice(0, -1) + 'ied' : w + 'ed';
    return /[^aeiou]y$/i.test(w) ? w.slice(0, -1) + 'ies' : /(s|x|z|ch|sh)$/i.test(w) ? w + 'es' : w + 's';
  }
  const topicOf = c => String(c.topic || c.unit || c.cat || (c.tags && c.tags[0]) || '').toLowerCase();
  const defSet = c => new Set(String((c.def || '') + ' ' + (c.vi || '')).toLowerCase().split(/[^a-zà-ỹ]+/).filter(x => x.length > 2));
  /** Phương án nhiễu: cùng loại từ + cùng dạng ngữ pháp + cùng chủ đề (thẻ cùng bài/chặng `near`, cùng topic, trùng từ trong định nghĩa) + cùng độ dài; không trùng đáp án/chữ có trong câu.
   *  opts { form: chỗ trống trong câu ('decided'), near: [thẻ cùng chủ đề], avoid: [chữ đã có trong câu] } */
  function distract(word, pos, pool, k, r, opts = {}) {
    if (!opts.modern) { // đường cũ (native Swift/Kotlin đối chiếu vectors/lesson.json): chỉ cùng loại từ; bài web đi đường mới qua build({ near | level })
      const P0 = POS(pos), cand0 = shuffle(pool.filter(c => c && c.word && !same(c.word, word)), r), pick = cand0.filter(c => POS(c.pos) === P0).concat(cand0.filter(c => POS(c.pos) !== P0)), out0 = [];
      for (const c of pick) { if (!out0.some(x => same(x, c.word))) out0.push(c.word); if (out0.length >= k) break; }
      return out0;
    }
    const P = POS(pos), kind = formKind(opts.form, word), near = new Set((opts.near || []).map(c => norm(c.word))), avoid = new Set((opts.avoid || []).map(norm));
    const me = pool.find(c => c && same(c.word, word)) || {}, T = topicOf(me), D = defSet(me), multi = /\s/.test(String(word).trim());
    const cand = shuffle(pool.filter(c => c && c.word && !same(c.word, word) && !avoid.has(norm(c.word))), r).map((c, i) => {
      const txt = inflect(c.word, kind); if (kind && !txt) return null; // đáp án chia đuôi mà ứng viên không chia đều được → bỏ
      let sc = (POS(c.pos) === P ? 0 : 5) + (/\s/.test(c.word.trim()) !== multi ? 5 : 0) + (near.has(norm(c.word)) ? -6 : 0) + (T && topicOf(c) === T ? -2 : 0) + Math.abs(c.word.length - word.length) * 0.15 + i * 0.01;
      const dc = defSet(c); let ov = 0; D.forEach(x => { if (dc.has(x)) ov++; }); sc -= Math.min(2, ov);
      return { w: txt, sc };
    }).filter(Boolean).sort((a, b) => a.sc - b.sc);
    const out = []; for (const c of cand) { if (!out.some(x => same(x, c.w)) && !same(c.w, opts.form || word)) out.push(c.w); if (out.length >= k) break; }
    return out;
  }

  // Gợi ý tăng dần theo dạng (docs/LESSON-UX-V2.md §3)
  const HINTS = { gap: ['fifty'], mean: ['fifty'], q: ['fifty'], build: ['first'], tr: ['first'], type: ['letter', 'bank'], say: ['slow'], pic: ['slow'], match: ['pair'] };
  // Ô chữ cái cho "gõ từ" khi người học chọn ngân hàng chữ
  function letterBank(word, r) {
    const ch = [...String(word)].filter(x => x !== ' '), ABC = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(x => !ch.includes(x));
    return shuffle(ch.concat(shuffle(ABC, r).slice(0, 3)), r);
  }

  /** Dựng các bài tập. picks: kết quả pickWords · opts { seed, pool:[thẻ], hasImg(word,pos), off:{listen,speak}, perWord=2,
   *    gloss(card, câuEN) → bản dịch câu (ngôn ngữ người học) | '' , mean(card) → nghĩa từ (ngôn ngữ người học) | '' }
   *  Luật nội dung: đề luôn khớp dữ liệu – xếp câu cần bản dịch CÂU (hoặc âm thanh), không bao giờ lấy định nghĩa của TỪ làm đề câu.
   *  → [{ id, type, word, card, why, sent?, answer, options?, tiles?, prompt?, tr?, mean?, def?, len?, first?, bank?, hints }] */
  function build(picks, opts = {}) {
    const viOk = opts.vi !== false, r = rng(opts.seed || Date.now()), modern = opts.near != null || opts.level != null, pool = modern ? picks.map(p => p.card).concat(opts.near || [], opts.pool || []) : (opts.pool || []).concat(picks.map(p => p.card)), near = picks.map(p => p.card).concat(opts.near || []), off = opts.off || {}, per = opts.perWord || 2;
    const byWord = picks.map(p => {
      const c = p.card, pat = isPat(c) && c.ex, s = pat ? { text: c.ex, own: false, at: { toks: toks(c.ex) } } : sentenceOf(c, viOk, opts.level), types = [];
      // câu song ngữ riêng cho dạng dịch (câu add-on thường không có bản dịch)
      // dạng dịch cần bản dịch CÂU đúng ngôn ngữ người học
      const trOf = x => (viOk ? x.vi : opts.gloss && opts.gloss(c, x.en)) || '';
      const pair = (c.sentences || []).map(x => { const tr = x && x.en && findWord(x.en, c.word) && toks(x.en).length >= 3 && toks(x.en).length <= 10 ? trOf(x) : ''; return tr ? { text: x.en, tr, own: false, at: findWord(x.en, c.word) } : null; }).find(Boolean);
      if (s && !s.tr && opts.gloss) s.tr = opts.gloss(c, s.text) || ''; // bản dịch câu (gói web/packs/sent) – câu add-on thường không có
      if (s && !pat) types.push('gap');
      if (s && s.at && s.at.toks.length <= 10 && (s.tr || !off.listen)) types.push('build'); // không nghe được + không có bản dịch câu → không có đề → không sinh
      if (opts.hasImg && opts.hasImg(c.word, c.pos)) types.push('pic');
      if (pair) types.push('tr');
      const mn = (opts.mean && opts.mean(c)) || '';
      if (!/\s/.test(c.word.trim()) && c.word.length >= 3 && (!off.listen || mn || c.def)) types.push('type'); // gõ từ (từ đơn): cần âm thanh hoặc nghĩa
      // nghe → chọn 1/4 ảnh (opts.lpic – web bật; native/vectors không đổi): cần âm thanh + ảnh của từ VÀ cả 3 nhiễu (RNG riêng → không đổi thứ tự bốc của các dạng khác)
      const ims = opts.lpic && !off.listen && opts.hasImg && opts.hasImg(c.word, c.pos) ? distract(c.word, c.pos, pool.filter(x => x && x.word && opts.hasImg(x.word, x.pos)), 3, rng((opts.seed || 1) + c.word.length), { modern, near }) : [];
      if (ims.length >= 3) types.push('lpic');
      types.push('say');
      const only = opts.only && types.filter(x => opts.only.includes(x));
      return { p, c, s, pair, ims, types: only && only.length ? only : types };
    });
    // cân bằng cả bài: mỗi vòng, mỗi từ lấy dạng còn ít nhất trong bài
    const cnt = {
      build: 0,
      gap: 0,
      lpic: 0,
      pic: 0,
      say: 0,
      tr: 0,
      type: 0,
    }, RARE = {
      build: 0.2,
      gap: 0.3,
      lpic: 0.05,
      pic: 0,
      say: 0.4,
      tr: 0.1,
      type: 0.25,
    };
    byWord.forEach(w => { w.order = []; });
    for (let round = 0; round < per; round++) byWord.forEach(w => {
      const left = w.types.filter(x => !w.order.includes(x)); if (!left.length) return;
      const pick = shuffle(left, r).sort((a, b) => (cnt[a] + RARE[a]) - (cnt[b] + RARE[b]))[0];
      w.order.push(pick); cnt[pick]++;
    });
    const items = []; let id = 0;
    const make = (w, type) => {
      const { p, c, s } = w, base = { id: ++id, type, word: c.word, card: c, why: p.why, ipa: c.ipaUS || c.ipa || '', retry: 0, hints: HINTS[type] || [], mean: (opts.mean && opts.mean(c)) || '' };
      if (type === 'gap') { const opt = shuffle([s.at.form].concat(distract(c.word, c.pos, pool, 3, r, { modern, form: s.at.form, near, avoid: s.at.toks })), r); return Object.assign(base, { sent: s.text, own: s.own, blank: s.at, answer: s.at.form, options: opt, tr: s.tr || '' }); }
      if (type === 'build' || type === 'tr') {
        const s = type === 'tr' ? w.pair : w.s, words = toks(s.text), extra = distract(c.word, c.pos, pool.filter(x => x && !/\s/.test(String(x.word).trim())), 4, r, { modern, near }).filter(x => !words.some(y => same(y, x))).slice(0, 2); // ô nhiễu = 1 từ, không trùng từ của câu
        return Object.assign(base, { sent: s.text, own: s.own, prompt: s.tr || '', answer: words.join(' '), tiles: shuffle(words.concat(extra), r) }); // build: prompt = bản dịch câu (có thể '' khi chỉ nghe)
      }
      if (type === 'type') { const wd = c.word.trim(); return Object.assign(base, { answer: wd, def: c.def || '', len: wd.replace(/[\s'-]/g, '').length, first: wd[0], bank: letterBank(wd.toLowerCase(), rng([...wd].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7))) }); } // rng riêng theo từ: không làm lệch dãy xáo của cả bài (thứ tự đáp án/ô giữ ổn định)
      if (type === 'lpic') { const o = shuffle([c.word].concat(w.ims), r); return Object.assign(base, { hints: ['fifty'], answer: c.word, options: o, ipos: Object.fromEntries(o.map(x => [x, (pool.find(y => y && same(y.word, x)) || {}).pos])) }); } // ipos: loại từ từng ô → UI tra đúng ảnh từ#loại
      if (type === 'pic') return Object.assign(base, { answer: c.word, options: shuffle([c.word].concat(distract(c.word, c.pos, pool, 3, r, { modern, near })), r) });
      const short = s && (toks(s.text).length <= 8 || isPat(c)), alt = s && s.at && s.at.form ? { type: 'gap', sent: s.text, own: s.own, blank: s.at, answer: s.at.form, options: shuffle([s.at.form].concat(distract(c.word, c.pos, pool, 3, r, { modern, form: s.at.form, near, avoid: s.at.toks })), r) }
        : { type: 'mean', answer: c.word, options: shuffle([c.word].concat(distract(c.word, c.pos, pool, 3, r, { modern, near })), r) }; // bản thay khi tắt nói
      alt.hints = HINTS[alt.type]; if (alt.type === 'gap') alt.tr = s.tr || '';
      return Object.assign(base, { sent: short ? s.text : c.word, answer: short ? s.text : c.word, alt });
    };
    for (let round = 0; round < per; round++) byWord.forEach(w => { if (w.order[round]) items.push(make(w, w.order[round])); });
    // xen kẽ: không 2 bài liền cùng từ
    for (let i = 1; i < items.length; i++) if (same(items[i].word, items[i - 1].word)) { const j = items.findIndex((x, k) => k > i && !same(x.word, items[i - 1].word)); if (j > 0) [items[i], items[j]] = [items[j], items[i]]; }
    // Ghép cặp (từ ↔ nghĩa) giữa bài khi có ≥ 4 từ: 1 bài, không gắn từ riêng (card null → không ghi FSRS theo từ)
    const mp = picks.filter(p => (p.card.vi || p.card.def) && !isPat(p.card)).slice(0, 5);
    if (opts.match !== false && (!opts.only || opts.only.includes('match')) && mp.length >= 4) items.splice(Math.ceil(items.length / 2), 0, { id: ++id, type: 'match', word: '#match', card: null, retry: 0, answer: '', hints: HINTS.match, pairs: shuffle(mp, r).slice(0, 4).map(p => p.card) });
    // Ghép từ ↔ ảnh (opts.mpic – web bật; native/vectors không đổi): cùng khuôn + cách chấm với match, cột phải là ảnh; cần ≥ 4 từ đều có ảnh; hiếm (~40 % bài, RNG riêng → không lệch dãy xáo của dạng khác)
    const mi = opts.mpic && !opts.only && opts.hasImg ? picks.filter(p => !isPat(p.card) && opts.hasImg(p.card.word, p.card.pos)) : [];
    if (mi.length >= 4 && rng((opts.seed || 1) + 97)() < 0.4) items.splice(Math.ceil(items.length * 0.75), 0, { id: ++id, type: 'match', pics: true, word: '#mpic', card: null, retry: 0, answer: '', hints: HINTS.match, pairs: shuffle(mi, rng((opts.seed || 1) + 98)).slice(0, 4).map(p => p.card) });
    const out = items.map(it => adapt(it, off));
    return opts.calm ? calm(out) : out;
  }

  /** Đổi dạng khi người học tắt nghe/nói ("Không nghe được lúc này" / "Không nói được lúc này") */
  function adapt(it, off) {
    off = off || {};
    const o = Object.assign({}, it, { noAudio: !!off.listen });
    if (off.listen && it.type === 'lpic') Object.assign(o, { type: 'pic', choice: true, hints: HINTS.pic }); // không nghe được → xem ảnh, chọn từ (cùng đáp án + 4 từ)
    if (off.speak && (it.type === 'say' || it.type === 'pic')) {
      if (it.type === 'pic') o.choice = true;               // ảnh → chọn 1/4 thay vì nói
      else Object.assign(o, it.alt, { spoke: true });        // nói theo → điền từ thiếu (có câu) / chọn từ theo nghĩa (chỉ có từ)
    }
    return o;
  }

  /** Chấm: gap/pic → chọn đúng; build/tr → chuỗi ô = câu; say → điểm nhận dạng ≥ 0,7 */
  function check(it, ans) {
    if (it.type === 'say' || (it.type === 'pic' && !it.choice)) return typeof ans === 'number' ? ans >= 0.7 : same(ans, it.answer);
    if (it.type === 'build' || it.type === 'tr') return same(Array.isArray(ans) ? ans.join(' ') : ans, it.answer);
    if (it.type === 'match') return ans === true;
    return same(ans, it.answer);
  }

  /** Phiên: hàng đợi + lỗi cũ (tối đa 2 lần gặp lại/bài) + COMBO + tiến độ (chỉ tăng khi đúng) */
  class Session {
    constructor(items, opts = {}) {
      this.q = items.slice(); this.total = items.length; this.solved = 0; this.combo = 0; this.best = 0; this.n = 0; this.ok1 = 0;
      this.wrong = new Map(); this.firstOk = new Set(); this.maxRetry = opts.maxRetry == null ? 2 : opts.maxRetry; this.log = []; this.ease = !!opts.ease; this.miss = 0;
    }
    get cur() { return this.q[0] || null; }
    get done() { return !this.q.length; }
    get progress() { return this.total ? Math.min(1, this.solved / this.total) : 1; }
    answer(ok) {
      const it = this.q.shift(); if (!it) return null;
      if (it.free) { this.solved++; return { ok: true, combo: this.combo, free: true }; } // câu thoại của truyện: chỉ tiến độ, không chấm
      this.n++;
      const k = it.card ? norm(it.word) : '#' + norm(it.word); this.log.push({ id: it.id, type: it.type, word: it.word, ok, retry: it.retry });
      this.miss = ok ? 0 : this.miss + 1;
      // chống nản (ease): sai 2 câu liền → câu kế tiếp là dạng dễ (chọn đáp án) nếu còn trong hàng
      if (!ok && this.ease && this.miss >= 2 && this.q.length > 1 && HARD(this.q[0])) { const j = this.q.findIndex(x => !HARD(x) && !x.free); if (j > 0) { const [e] = this.q.splice(j, 1); this.q.unshift(e); } }
      if (ok) { this.solved++; this.combo++; this.best = Math.max(this.best, this.combo); if (!it.retry) { this.ok1++; if (!this.wrong.has(k)) this.firstOk.add(k); } return { ok, combo: this.combo }; }
      this.combo = 0; this.wrong.set(k, (this.wrong.get(k) || 0) + 1); this.firstOk.delete(k);
      if (it.retry < this.maxRetry) this.q.push(Object.assign({}, it, { retry: it.retry + 1 })); else this.solved++; // hết lượt gặp lại → vẫn tính xong (không kẹt bài)
      return { ok, combo: 0, requeued: it.retry < this.maxRetry };
    }
    skip() { const it = this.q.shift(); if (it) { this.solved++; this.log.push({ id: it.id, type: it.type, word: it.word, skip: true }); } }
    replace(fn) { this.q = this.q.map(fn); }
    get accuracy() { return this.n ? Math.round(this.ok1 * 100 / Math.max(1, this.n - this.log.filter(x => x.retry).length)) : 0; }
  }

  /** Kết quả → FSRS: sai ≥ 1 lần → grade 0 (vào hàng ôn); đến hạn + đúng ngay → grade 2; còn lại không đổi lịch.
   *  → [{ word, grade, card|null, add: bool (chưa có thẻ → App.addWord) }] */
  function results(sess, items, cards, now = Date.now()) {
    const map = {}; Object.values(cards || {}).forEach(c => { if (c && c.word) map[norm(c.word)] = c; });
    const words = new Map(); items.forEach(it => { if (it.card) words.set(norm(it.word), it.card); });
    const out = [];
    words.forEach((card, k) => {
      const c = map[k] || null;
      if (sess.wrong.has(k)) out.push({ word: card.word, grade: 0, card: c, add: !c, entry: card });
      else if (c && sess.firstOk.has(k) && isDue(c, now)) out.push({ word: card.word, grade: 2, card: c, add: false });
    });
    return out;
  }

  // Trọng âm từ IPA: âm tiết có ˈ (1-based) – null khi không có dấu
  function stress(ipa) {
    const s = String(ipa || '').replace(/^\/|\/$/g, ''); if (!s.includes('ˈ')) return null;
    const parts = s.split(/[.ˈˌ]/).filter(Boolean), before = s.slice(0, s.indexOf('ˈ')).split(/[.ˌ]/).filter(Boolean).length;
    return { syl: before + 1, of: Math.max(parts.length, before + 1) };
  }
  // Ghi chú US/UK khi 2 phiên âm khác nhau
  const usuk = c => (c && c.ipa && c.ipaUS && c.ipa.replace(/[/\s]/g, '') !== c.ipaUS.replace(/[/\s]/g, '')) ? { uk: c.ipa, us: c.ipaUS } : null;

  // Chữ → dòng thời gian viseme (hình miệng Rhubarb: X nghỉ · A m/b/p · B phụ âm · C e/i · D a · E o · F u/w · G f/v · H l) – dùng khi chưa có cue sinh sẵn
  function visemes(text, dur) {
    const s = String(text || '').toLowerCase(), cues = [];
    const map = ch => /[mbp]/.test(ch) ? 'A' : /[fv]/.test(ch) ? 'G' : /[l]/.test(ch) ? 'H' : /[ouw]/.test(ch) ? (ch === 'o' ? 'E' : 'F') : /[a]/.test(ch) ? 'D' : /[eiy]/.test(ch) ? 'C' : /[a-z]/.test(ch) ? 'B' : /[,.;:!?]/.test(ch) ? 'X' : null;
    const seq = []; for (const ch of s) { const v = map(ch); if (v && seq[seq.length - 1] !== v) seq.push(v); else if (ch === ' ' && seq[seq.length - 1] !== 'B') seq.push('B'); }
    const step = (dur || Math.max(0.6, s.length * 0.065)) / Math.max(1, seq.length);
    seq.forEach((v, i) => cues.push([+(i * step).toFixed(3), v]));
    cues.push([+(seq.length * step).toFixed(3), 'X']);
    return cues;
  }

  /** Bản đồ chặng: 6 nút/chặng, tự trộn theo dữ liệu (người học không phải chọn). Nhiều thẻ đến hạn/hay quên → mở chặng bằng Ôn lỗi.
   *  → [{ kind: 'review'|'lesson'|'listen'|'speak' }] */
  function pathPlan(cards, now = Date.now(), has = {}) {
    const list = Object.values(cards || {}).filter(c => c && c.srs), due = list.filter(c => isDue(c, now)).length, weak = list.filter(c => c.srs.lapses > 0).length;
    const first = due + weak >= 3 ? 'review' : 'lesson';
    return [first, has.story ? 'story' : 'listen', has.story ? 'listen' : 'lesson', 'speak', has.radio ? 'radio' : 'lesson', 'review'].map(kind => ({ kind }));
  }
  /** Chặng ux1 (docs/LEARNING-PATH.md §2): từ mới → nghe → nói → truyện/radio → ôn → kiểm tra kỹ năng thi (has.exam).
   *  Nhiều thẻ đến hạn/hay quên → mở chặng bằng Ôn lỗi. has.odd: chặng lẻ ưu tiên Radio (xoay vòng truyện ↔ radio). → [{ kind }] */
  function unitPlan(cards, now = Date.now(), has = {}) {
    const list = Object.values(cards || {}).filter(c => c && c.srs), due = list.filter(c => isDue(c, now)).length, weak = list.filter(c => c.srs.lapses > 0).length;
    const mid = has.radio && (has.odd || !has.story) ? 'radio' : has.story ? 'story' : 'lesson';
    return [due + weak >= 3 ? 'review' : 'lesson', 'listen', 'speak', mid, 'review', has.exam ? 'exam' : 'lesson'].map(kind => ({ kind }));
  }
  /** Nút hiện tại thích nghi (Flow/chống nản): bài trước < 60 % → Ôn lỗi thay cho Nói/Radio; ≥ 95 % và không còn thẻ đến hạn → học tiếp thay cho Ôn. */
  function nextKind(kind, ctx = {}) {
    if (ctx.acc != null && ctx.acc < 60 && (kind === 'speak' || kind === 'radio')) return 'review';
    if (ctx.acc != null && ctx.acc >= 95 && kind === 'review' && !ctx.due) return 'lesson';
    return kind;
  }
  // Dạng khó (phải tự tạo câu trả lời) – không để 3 bài khó liền nhau (calm)
  const HARD = it => it.type === 'build' || it.type === 'tr' || it.type === 'type' || (it.type === 'say' && !it.spoke) || (it.type === 'pic' && !it.choice);
  function calm(items) {
    const a = items.slice();
    for (let i = 2; i < a.length; i++) if (HARD(a[i]) && HARD(a[i - 1]) && HARD(a[i - 2])) { const j = a.findIndex((x, k) => k > i && !HARD(x)); if (j > 0) [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  /** Truyện/Radio → hàng bài: mỗi câu thoại là 1 bước 'line' (free, không chấm); sau câu `at` chèn bài kiểm (tap = xếp câu, q = câu hỏi, match = ghép cặp).
   *  lang: ngôn ngữ nghĩa của người học (cặp ghép). → [items] */
  function storyItems(st, lang, seed) {
    const r = rng(seed || 1), out = []; let id = 0;
    const words = [...new Set(st.lines.flatMap(l => toks(l.en)).map(w => w.toLowerCase()))];
    st.lines.forEach((l, i) => {
      out.push({ id: ++id, type: 'line', free: true, word: '#story', card: null, retry: 0, who: l.who, sent: l.en, radio: st.kind === 'radio' });
      (st.checks || []).filter(c => c.at === i).forEach(c => {
        const base = { id: ++id, word: '#story', card: null, retry: 0 };
        if (c.type === 'tap') { const T = toks(st.lines[c.line].en), extra = c.extra || shuffle(words.filter(w => !T.some(x => x.toLowerCase() === w)), r).slice(0, 2); out.push(Object.assign(base, { type: 'build', sent: st.lines[c.line].en, who: st.lines[c.line].who, answer: T.join(' '), tiles: shuffle(T.concat(extra), r) })); }
        else if (c.type === 'q') out.push(Object.assign(base, { type: 'q', prompt: c.q, answer: c.options[c.answer], why: c.why || '', options: c.keep ? c.options.slice() : shuffle(c.options.slice(), r) }));
        else if (c.type === 'match') out.push(Object.assign(base, { type: 'match', pairs: c.pairs.map(p => ({ word: p.en, mean: p.m[lang] || p.m.en })) }));
      });
    });
    out.forEach(x => { x.hints = HINTS[x.type] || []; });
    return out;
  }
  // Dạng bài theo loại nút
  const KIND = { lesson: null, review: null, listen: ['gap', 'build', 'type', 'match'], speak: ['say', 'pic', 'gap'] };

  /** Tuần này (thứ 2 → CN) cho thẻ chuỗi ngày: `on[i]` = đã học ngày i (hôm nay tính luôn vì bài vừa xong), `today` = chỉ số hôm nay, `n` = số ngày học trong tuần,
   *  `days` = Date từng ngày (ui gắn nhãn thứ). Khác `streak` (chuỗi LIỀN tới hôm nay): 2/7 ngày học trong tuần có thể là chuỗi 1 – hai số tách nhãn, không mâu thuẫn. */
  function weekDots(act, now, keyOf) {
    const d0 = new Date(now), mon = new Date(d0); mon.setDate(d0.getDate() - ((d0.getDay() + 6) % 7));
    const days = [], on = [];
    for (let i = 0; i < 7; i++) { const x = new Date(mon); x.setDate(mon.getDate() + i); days.push(x); on.push(keyOf(x) === keyOf(d0) || !!(act && act.has(keyOf(x)))); }
    return { on, days, today: (d0.getDay() + 6) % 7, n: on.filter(Boolean).length };
  }
  /** Chuỗi liền kết thúc hôm nay (hôm nay tính nếu vừa học) trong tập ngày học – dùng khi App.streak() chưa cập nhật */
  const runOf = (act, now, keyOf) => { let n = 0; const d = new Date(now); while (n < 4000 && (n === 0 || (act && act.has(keyOf(d))))) { n++; d.setDate(d.getDate() - 1); if (!(act && act.has(keyOf(d)))) break; } return n; };
  /** Bong bóng giáo viên chỉ hiện khi có lời thật: rỗng / chỉ "🔊 · · ·" / chỉ dấu chấm → ẩn (không bao giờ bong bóng trống) */
  const hasLine = s => /[\p{L}\p{N}]/u.test(String(s == null ? '' : s));
  /** Hai giọng đọc giống hệt (IPA UK = US, hoặc cùng file âm) → chỉ một loa + một IPA */
  const sameVoice = (a, b) => !!a && !!b && String(a).replace(/\s/g, '') === String(b).replace(/\s/g, '');
  g.LessonEngine = { isPat, weekDots, runOf, hasLine, sameVoice, sentLevel, inflect, formKind, distract, HINTS, letterBank, pathPlan, unitPlan, nextKind, calm, HARD, storyItems, KIND, norm, toks, rng, shuffle, findWord, sentenceOf, fromExt, isDue, pickWords, build, adapt, check, Session, results, stress, usuk, visemes, DAY };
})(typeof self !== 'undefined' ? self : globalThis);
