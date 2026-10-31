/* 🧩 Bài học trộn bài tập nhỏ – lõi THUẦN (không DOM, không t()): chọn từ, dựng bài, hàng đợi "Lỗi cũ", COMBO, kết quả → FSRS, chữ → viseme.
 * Thiết kế: docs/LESSON-ENGINE.md. Giao diện: js/lesson/ui.js. Test: scripts/test/lesson.mjs (chạy được trong Node).
 * Dạng bài: match (ghép cặp từ ↔ nghĩa) · type (nghe gõ lại) · gap (nghe chọn từ thiếu) · build (nghe xếp câu) · say (nói theo) · pic (nhìn ảnh nói từ) · tr (dịch bằng ô chữ) · mean (chọn từ theo nghĩa – chỉ là bản thay của say khi tắt nói). */
(function (g) {
  const DAY = 864e5;
  const norm = s => String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' -]+/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const toks = s => String(s || '').replace(/[“”"]/g, '').split(/\s+/).map(x => x.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, '')).filter(Boolean);
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
  function sentenceOf(c) {
    const cands = [];
    if (c.ctx) cands.push({ text: c.ctx, own: true });
    (c.contexts || []).forEach(x => x && x.text && cands.push({ text: x.text, own: true }));
    (c.sentences || []).forEach(x => x && x.en && cands.push({ text: x.en, tr: x.vi || '', own: false }));
    if (c.ex) cands.push({ text: c.ex, own: false });
    for (const s of cands) { const n = toks(s.text).length, f = findWord(s.text, c.word); if (f && n >= 3 && n <= 14) return Object.assign({}, s, { at: f }); }
    return null;
  }
  const fromExt = c => !!(c.src || (c.contexts || []).some(x => x && x.source && /^https?:/.test(x.source)));
  const isDue = (c, now) => !!(c.srs && (c.srs.reps > 0 || c.srs.last) && c.srs.due <= endOfDay(now));
  const isNew = c => !!(c.srs && c.srs.reps === 0 && !c.srs.last);
  function endOfDay(now) { const d = new Date(now); d.setHours(23, 59, 59, 999); return d.getTime(); }

  /** Chọn từ cho 1 bài: đến hạn (quá hạn lâu trước) → tra bằng add-on (mới nhất trước) → thẻ mới → bộ khởi đầu.
   *  cards: map/list thẻ · opts { n=6, now, starter:[thẻ] } → [{ card, why: 'due'|'ext'|'new'|'start' }] */
  function pickWords(cards, opts = {}) {
    const now = opts.now || Date.now(), n = opts.n || 6, list = (Array.isArray(cards) ? cards : Object.values(cards || {})).filter(c => c && c.word && (c.vi || c.def));
    const out = [], seen = new Set(), add = (c, why) => { const k = norm(c.word); if (out.length < n && !seen.has(k)) { seen.add(k); out.push({ card: c, why }); } };
    if (opts.mode === 'review') list.filter(c => c.srs && c.srs.lapses > 0 && (c.srs.reps === 0 || isDue(c, now))).sort((a, b) => b.srs.lapses - a.srs.lapses).forEach(c => add(c, 'due')); // nút Ôn lỗi: từ hay quên trước
    list.filter(c => isDue(c, now)).sort((a, b) => a.srs.due - b.srs.due).forEach(c => add(c, 'due'));
    list.filter(c => !isDue(c, now) && fromExt(c)).sort((a, b) => (b.mod || 0) - (a.mod || 0)).forEach(c => add(c, 'ext'));
    list.filter(c => isNew(c)).sort((a, b) => (b.mod || 0) - (a.mod || 0)).forEach(c => add(c, 'new'));
    if (out.length < Math.min(4, n)) (opts.starter || []).forEach(c => add(c, 'start'));
    return out;
  }

  // Phương án nhiễu: ưu tiên cùng loại từ, không trùng đáp án
  function distract(word, pos, pool, k, r) {
    const P = POS(pos), cand = shuffle(pool.filter(c => c && c.word && !same(c.word, word)), r);
    const pick = cand.filter(c => POS(c.pos) === P).concat(cand.filter(c => POS(c.pos) !== P));
    const out = []; for (const c of pick) { if (!out.some(x => same(x, c.word))) out.push(c.word); if (out.length >= k) break; }
    return out;
  }

  // Gợi ý tăng dần theo dạng (docs/LESSON-UX-V2.md §3) – không trừ XP: fifty = bỏ 1 phương án sai · first = hiện ô kế tiếp · letter = mở 1 chữ · bank = đổi sang ô chữ cái · slow = nghe chậm · pair = hiện 1 cặp
  const HINTS = { gap: ['fifty'], mean: ['fifty'], q: ['fifty'], build: ['first'], tr: ['first'], type: ['letter', 'bank'], say: ['slow'], pic: ['slow'], match: ['pair'] };
  // Ô chữ cái cho "gõ từ" khi người học chọn ngân hàng chữ: chữ của đáp án (giữ "-", "'") + 3 chữ nhiễu không có trong từ
  function letterBank(word, r) {
    const ch = [...String(word)].filter(x => x !== ' '), ABC = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(x => !ch.includes(x));
    return shuffle(ch.concat(shuffle(ABC, r).slice(0, 3)), r);
  }

  /** Dựng các bài tập. picks: kết quả pickWords · opts { seed, pool:[thẻ], hasImg(word,pos), off:{listen,speak}, perWord=2,
   *    gloss(card, câuEN) → bản dịch câu (ngôn ngữ người học) | '' , mean(card) → nghĩa từ (ngôn ngữ người học) | '' }
   *  Luật nội dung: đề luôn khớp dữ liệu – xếp câu cần bản dịch CÂU (hoặc âm thanh), không bao giờ lấy định nghĩa của TỪ làm đề câu.
   *  → [{ id, type, word, card, why, sent?, answer, options?, tiles?, prompt?, tr?, mean?, def?, len?, first?, bank?, hints }] */
  function build(picks, opts = {}) {
    const r = rng(opts.seed || Date.now()), pool = (opts.pool || []).concat(picks.map(p => p.card)), off = opts.off || {}, per = opts.perWord || 2;
    const byWord = picks.map(p => {
      const c = p.card, s = sentenceOf(c), types = [];
      // câu song ngữ riêng cho dạng dịch (câu add-on thường không có bản dịch)
      const pair = (c.sentences || []).map(x => x && x.en && x.vi && findWord(x.en, c.word) && toks(x.en).length >= 3 && toks(x.en).length <= 10 ? { text: x.en, tr: x.vi, own: false, at: findWord(x.en, c.word) } : null).find(Boolean);
      if (s && !s.tr && opts.gloss) s.tr = opts.gloss(c, s.text) || ''; // bản dịch câu (gói web/packs/sent) – câu add-on thường không có
      if (s) types.push('gap');
      if (s && s.at && s.at.toks.length <= 10 && (s.tr || !off.listen)) types.push('build'); // không nghe được + không có bản dịch câu → không có đề → không sinh
      if (opts.hasImg && opts.hasImg(c.word, c.pos)) types.push('pic');
      if (pair) types.push('tr');
      const mn = (opts.mean && opts.mean(c)) || '';
      if (!/\s/.test(c.word.trim()) && c.word.length >= 3 && (!off.listen || mn || c.def)) types.push('type'); // gõ từ (từ đơn): cần âm thanh hoặc nghĩa
      types.push('say');
      const only = opts.only && types.filter(x => opts.only.includes(x));
      return { p, c, s, pair, types: only && only.length ? only : types };
    });
    // cân bằng cả bài: mỗi vòng, mỗi từ lấy dạng còn ít nhất trong bài (hòa → ngẫu nhiên), dạng hiếm (pic, tr) được ưu tiên khi hòa
    const cnt = { gap: 0, build: 0, pic: 0, tr: 0, type: 0, say: 0 }, RARE = { pic: 0, tr: 0.1, build: 0.2, type: 0.25, gap: 0.3, say: 0.4 };
    byWord.forEach(w => { w.order = []; });
    for (let round = 0; round < per; round++) byWord.forEach(w => {
      const left = w.types.filter(x => !w.order.includes(x)); if (!left.length) return;
      const pick = shuffle(left, r).sort((a, b) => (cnt[a] + RARE[a]) - (cnt[b] + RARE[b]))[0];
      w.order.push(pick); cnt[pick]++;
    });
    const items = []; let id = 0;
    const make = (w, type) => {
      const { p, c, s } = w, base = { id: ++id, type, word: c.word, card: c, why: p.why, ipa: c.ipaUS || c.ipa || '', retry: 0, hints: HINTS[type] || [], mean: (opts.mean && opts.mean(c)) || '' };
      if (type === 'gap') { const opt = shuffle([s.at.form].concat(distract(c.word, c.pos, pool, 3, r)), r); return Object.assign(base, { sent: s.text, own: s.own, blank: s.at, answer: s.at.form, options: opt, tr: s.tr || '' }); }
      if (type === 'build' || type === 'tr') {
        const s = type === 'tr' ? w.pair : w.s, words = toks(s.text), extra = distract(c.word, c.pos, pool, 2, r).filter(x => !words.some(y => same(y, x)));
        return Object.assign(base, { sent: s.text, own: s.own, prompt: s.tr || '', answer: words.join(' '), tiles: shuffle(words.concat(extra), r) }); // build: prompt = bản dịch câu (có thể '' khi chỉ nghe)
      }
      if (type === 'type') { const wd = c.word.trim(); return Object.assign(base, { answer: wd, def: c.def || '', len: wd.replace(/[\s'-]/g, '').length, first: wd[0], bank: letterBank(wd.toLowerCase(), r) }); }
      if (type === 'pic') return Object.assign(base, { answer: c.word, options: shuffle([c.word].concat(distract(c.word, c.pos, pool, 3, r)), r) });
      const short = s && toks(s.text).length <= 8, alt = s ? { type: 'gap', sent: s.text, own: s.own, blank: s.at, answer: s.at.form, options: shuffle([s.at.form].concat(distract(c.word, c.pos, pool, 3, r)), r) }
        : { type: 'mean', answer: c.word, options: shuffle([c.word].concat(distract(c.word, c.pos, pool, 3, r)), r) }; // bản thay khi tắt nói
      alt.hints = HINTS[alt.type]; if (alt.type === 'gap') alt.tr = s.tr || '';
      return Object.assign(base, { sent: short ? s.text : c.word, answer: short ? s.text : c.word, alt });
    };
    for (let round = 0; round < per; round++) byWord.forEach(w => { if (w.order[round]) items.push(make(w, w.order[round])); });
    // xen kẽ: không 2 bài liền cùng từ
    for (let i = 1; i < items.length; i++) if (same(items[i].word, items[i - 1].word)) { const j = items.findIndex((x, k) => k > i && !same(x.word, items[i - 1].word)); if (j > 0) [items[i], items[j]] = [items[j], items[i]]; }
    // Ghép cặp (từ ↔ nghĩa) giữa bài khi có ≥ 4 từ: 1 bài, không gắn từ riêng (card null → không ghi FSRS theo từ)
    const mp = picks.filter(p => p.card.vi || p.card.def).slice(0, 5);
    if (opts.match !== false && (!opts.only || opts.only.includes('match')) && mp.length >= 4) items.splice(Math.ceil(items.length / 2), 0, { id: ++id, type: 'match', word: '#match', card: null, retry: 0, answer: '', hints: HINTS.match, pairs: shuffle(mp, r).slice(0, 4).map(p => p.card) });
    const out = items.map(it => adapt(it, off));
    return opts.calm ? calm(out) : out;
  }

  /** Đổi dạng khi người học tắt nghe/nói ("Không nghe được lúc này" / "Không nói được lúc này") */
  function adapt(it, off) {
    off = off || {};
    const o = Object.assign({}, it, { noAudio: !!off.listen });
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
      const k = norm(it.word); this.log.push({ id: it.id, type: it.type, word: it.word, ok, retry: it.retry });
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
        if (c.type === 'tap') { const T = toks(st.lines[c.line].en), extra = shuffle(words.filter(w => !T.some(x => x.toLowerCase() === w)), r).slice(0, 2); out.push(Object.assign(base, { type: 'build', sent: st.lines[c.line].en, who: st.lines[c.line].who, answer: T.join(' '), tiles: shuffle(T.concat(extra), r) })); }
        else if (c.type === 'q') out.push(Object.assign(base, { type: 'q', prompt: c.q, answer: c.options[c.answer], options: c.keep ? c.options.slice() : shuffle(c.options.slice(), r) }));
        else if (c.type === 'match') out.push(Object.assign(base, { type: 'match', pairs: c.pairs.map(p => ({ word: p.en, mean: p.m[lang] || p.m.en })) }));
      });
    });
    out.forEach(x => { x.hints = HINTS[x.type] || []; });
    return out;
  }
  // Dạng bài theo loại nút
  const KIND = { lesson: null, review: null, listen: ['gap', 'build', 'type', 'match'], speak: ['say', 'pic', 'gap'] };

  g.LessonEngine = { HINTS, letterBank, pathPlan, unitPlan, nextKind, calm, HARD, storyItems, KIND, norm, toks, rng, shuffle, findWord, sentenceOf, fromExt, isDue, pickWords, build, adapt, check, Session, results, stress, usuk, visemes, DAY };
})(typeof self !== 'undefined' ? self : globalThis);
