/* 📘 Bộ máy "Cách dùng từ" (thuần JS, không mạng, không chữ giao diện – chạy cả trong Node để test: scripts/test/usage.mjs).
 * Dữ liệu soạn tay theo 5 nhóm, mỗi nhóm 1 file tải lười (web/js/usage/<nhóm>.js → LK_USAGE_SRC[nhóm] = chuỗi):
 *   p = từ + giới từ đi kèm · v = mẫu động từ (to-V / V-ing / O + to-V…) · a = trạng từ · s = cấu trúc câu · c = cặp từ dễ nhầm
 * Cú pháp mỗi dòng (gọn để soạn nhanh, dễ kiểm):
 *   @<loại> <khóa>          mở mục mới (p: a|v|n = tính/động/danh từ + giới từ; a: irr|freq|deg|time|link|focus|view|man; v/s/c: v|s|c)
 *   + đầu | vi | en | ví dụ  một nghĩa/mẫu (đầu = giới từ, mã mẫu động từ, dạng từ, thành viên cặp…); vi/en có thể trống
 *   x ví dụ                  thêm ví dụ (gắn vào dòng + gần nhất, chưa có thì gắn vào mục)
 *   # vi | en                ghi chú/giải thích       ! sai => đúng | vi | en   lỗi hay gặp
 *   = a, b, c                collocation              > id, id                  bài ngữ pháp liên quan (#/grammar/<id>)
 *   ~ văn phong | vi | en    formal/informal/academic/spoken/neutral
 *   ? câu [đáp án|nhiễu|nhiễu]   câu luyện tập riêng   f công thức (cấu trúc)   k từ khóa   ^ vị trí (front/mid/end)   & từ liên quan
 * Ví dụ: phần trọng tâm đặt trong [ ]: "She is interested [in] art." / "[affect|effect]" (đáp án | phương án nhiễu cho bài luyện).
 * Trong ghi chú, *chữ tiếng Anh* được giữ nguyên khi dịch sang ngôn ngữ khác (giao diện bọc translate="no"). */
(function (g) {
  if (g.LK_USAGE) return;
  const KINDS = ['p', 'v', 'a', 's', 'c'];
  const SUBS = { p: ['a', 'v', 'n'], v: ['v'], a: ['irr', 'freq', 'deg', 'time', 'link', 'focus', 'view', 'man'], s: ['s'], c: ['c'] };
  const PREPS = ['in', 'on', 'at', 'for', 'to', 'of', 'with', 'about', 'from', 'by', 'into', 'against', 'over', 'towards', 'between', 'among', 'after'];
  const QUIZ_PREPS = ['in', 'on', 'at', 'for', 'to', 'of', 'with', 'about', 'from', 'by'];
  const VCODES = ['to', 'ing', 'oto', 'obare', 'bare', 'that', 'sub', 'oing', 'ov3', 'wh', 'pass', 'ping', 'oo', 'o'];
  const split = s => s.split(/\s+\|\s+/).map(x => x.trim());
  const norm = s => String(s || '').toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();

  // ---------- Ví dụ: "She stopped [to buy|buying|buy] water." → { pre, ans, alts, post, text } ----------
  function example(src) {
    const s = String(src || ''), a = s.indexOf('['), b = s.indexOf(']', a);
    if (a < 0 || b < 0) return { pre: s, ans: '', alts: [], post: '', text: s, raw: s };
    const parts = s.slice(a + 1, b).split('|').map(x => x.trim());
    const pre = s.slice(0, a), post = s.slice(b + 1);
    return { pre, ans: parts[0], alts: parts.slice(1).filter(Boolean), post, text: pre + parts[0] + post, raw: s };
  }

  // ---------- Đọc một nhóm dữ liệu ----------
  function parse(kind, src) {
    const out = [], errors = [];
    let cur = null, item = null;
    String(src || '').split('\n').forEach((line, i) => {
      const L = line.trim(); if (!L || L.startsWith('//')) return;
      const tag = L[0], rest = L.slice(1).trim();
      const err = m => errors.push(`${kind}:${i + 1}: ${m}`);
      if (tag === '@') {
        const m = /^(\S+)\s+(.+)$/.exec(rest); if (!m) return err('thiếu khóa');
        cur = { kind, sub: m[1], key: m[2].trim(), items: [], ex: [], notes: [], mis: [], col: [], lessons: [], reg: [], quiz: [], k: [], pos: [], rel: [], f: '' }; item = null; out.push(cur);
        if (!SUBS[kind].includes(cur.sub)) err('loại không hợp lệ: ' + cur.sub);
        return;
      }
      if (!cur) return err('dòng nằm ngoài mục');
      if (tag === '+') { const [h, vi = '', en = '', ex] = split(rest); item = { h, vi, en, ex: ex ? [ex] : [] }; cur.items.push(item); }
      else if (tag === 'x') (item ? item.ex : cur.ex).push(rest);
      else if (tag === '#') { const [vi, en = ''] = split(rest); cur.notes.push({ vi, en }); }
      else if (tag === '!') { const [pair, vi = '', en = ''] = split(rest), [w, r] = pair.split(/\s*=>\s*/); if (!r) err('lỗi thiếu =>'); cur.mis.push({ w: w || '', r: r || '', vi, en }); }
      else if (tag === '=') cur.col.push(...rest.split(/\s*,\s*/).filter(Boolean));
      else if (tag === '>') cur.lessons.push(...rest.split(/\s*,\s*/).filter(Boolean));
      else if (tag === '~') { const [r, vi = '', en = ''] = split(rest); cur.reg.push({ r, vi, en }); }
      else if (tag === '?') cur.quiz.push(rest);
      else if (tag === 'f') cur.f = rest;
      else if (tag === 'k') cur.k.push(...rest.split(/\s*,\s*/).map(norm).filter(Boolean));
      else if (tag === '^') cur.pos.push(...rest.split(/[\s,]+/).filter(Boolean));
      else if (tag === '&') cur.rel.push(...rest.split(/\s*,\s*/).map(norm).filter(Boolean));
      else err('ký hiệu lạ: ' + tag);
    });
    return { entries: out, errors };
  }

  // ---------- Kho đã nạp ----------
  const cache = {};
  const src = () => g.LK_USAGE_SRC || {};
  const has = kind => typeof src()[kind] === 'string';
  function load(kind) {
    if (cache[kind]) return cache[kind];
    if (!has(kind)) return [];
    return (cache[kind] = parse(kind, src()[kind]).entries);
  }
  // Từ được mục này "phủ": khóa + đầu mục (trạng từ: hard/hardly; cặp: affect/effect) + từ khóa cấu trúc
  function words(e) {
    const w = new Set();
    if (e.kind === 'p' || e.kind === 'v' || e.kind === 'a') w.add(norm(e.key));
    if (e.kind === 'a') e.items.forEach(x => { const h = norm(x.h); if (/^[a-z][a-z' -]*$/.test(h) && h.split(' ').length <= 2) w.add(h); });
    if (e.kind === 'c') e.items.forEach(x => w.add(norm(x.h.replace(/\s*\(.*\)$/, ''))));
    if (e.kind === 's') e.k.forEach(x => w.add(x));
    return [...w];
  }

  // ---------- Chỉ mục (web/js/usage-index.js – sinh bằng scripts/build-usage-index.mjs) ----------
  const IDX = () => g.LK_USAGE_IDX || { w: {}, id: {} };
  // Đưa dạng đã chia/biến đổi về khóa có trong chỉ mục: interests → interest, relied → rely, arriving → arrive, stopped → stop
  function resolve(q) {
    const s = norm(q).replace(/^to\s+/, '').replace(/[.?!,;:"“”]+$/g, '');
    if (!s) return null;
    const W = IDX().w, I = IDX().id;
    if (W[s]) return s;
    if (I[s]) return s;
    const cands = [];
    if (g.LK_VERBS && /^[a-z]+$/.test(s)) { const r = g.LK_VERBS.resolve(s); if (r && r.base) cands.push(r.base); }
    const add = x => x && cands.push(x);
    if (/ies$/.test(s)) add(s.slice(0, -3) + 'y');
    if (/ied$/.test(s)) add(s.slice(0, -3) + 'y');
    if (/es$/.test(s)) add(s.slice(0, -2));
    if (/s$/.test(s)) add(s.slice(0, -1));
    if (/ed$/.test(s)) { add(s.slice(0, -2)); add(s.slice(0, -1)); if (/(.)\1ed$/.test(s)) add(s.slice(0, -3)); }
    if (/ing$/.test(s)) { add(s.slice(0, -3)); add(s.slice(0, -3) + 'e'); if (/(.)\1ing$/.test(s)) add(s.slice(0, -4)); }
    // cụm (interested in, depend on): lấy chữ đầu
    if (/\s/.test(s)) { const f = s.split(' ')[0]; add(f); if (/s$/.test(f)) add(f.slice(0, -1)); if (/ed$/.test(f)) { add(f.slice(0, -2)); add(f.slice(0, -1)); } }
    for (const c of cands) if (W[c] || I[c]) return c;
    return null;
  }
  const chunksOf = key => { const x = IDX(); return (x.w[key] || '') + (x.id[key] || ''); };
  // Gợi ý: khóa bắt đầu bằng chuỗi gõ, rồi khóa chứa chuỗi gõ (sắp theo độ dài)
  function suggest(q, n = 8) {
    const s = norm(q); if (!s) return [];
    const keys = Object.keys(IDX().w), r = resolve(s);
    const a = keys.filter(k => k.startsWith(s)).sort((x, y) => x.length - y.length || (x < y ? -1 : 1));
    const b = keys.filter(k => !k.startsWith(s) && k.includes(s)).sort((x, y) => x.length - y.length);
    const out = [...new Set([...(r && IDX().w[r] ? [r] : []), ...a, ...b])];
    return out.slice(0, n);
  }
  // Gần đúng (gõ sai chính tả): khoảng cách sửa ≤ 2
  function near(q, n = 6) {
    const s = norm(q), keys = Object.keys(IDX().w);
    const d = (a, b) => { if (Math.abs(a.length - b.length) > 2) return 9; const m = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) m[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return m[a.length][b.length]; };
    return keys.map(k => [k, d(s, k)]).filter(x => x[1] <= 2).sort((x, y) => x[1] - y[1]).slice(0, n).map(x => x[0]);
  }

  // ---------- Tra cứu một từ (chỉ trong các nhóm đã nạp) ----------
  function lookup(key) {
    const k = norm(key), out = { key: k, p: [], v: [], a: [], s: [], c: [] };
    for (const kind of KINDS) for (const e of load(kind)) {
      if (norm(e.key) === k || words(e).includes(k)) out[kind].push(e);
    }
    out.count = KINDS.reduce((n, x) => n + out[x].length, 0);
    return out;
  }
  const byId = (kind, id) => load(kind).find(e => e.key === id) || null;

  // ---------- Bài luyện nhanh ----------
  // Trộn ổn định theo hạt giống (kiểm thử lặp lại được)
  const rng = seed => { let x = seed >>> 0 || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const shuffle = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const lastWord = h => norm(h).split(' ').pop();
  // Phương án nhiễu tự sinh cho mẫu động từ: đáp án "to buy" → buying, buy …
  function verbAlts(code, ans) {
    const V = g.LK_VERBS; if (!V) return null;
    const a = norm(ans);
    if ((code === 'to' || code === 'oto') && /^to [a-z]+$/.test(a)) { const b = a.slice(3), f = V.forms(b); return [f.ing[0].w, b]; }
    if (code === 'ing' && /^[a-z]+ing$/.test(a)) { const r = V.resolve(a); if (!r || r.from !== 'ing') return null; return ['to ' + r.base, r.base]; }
    if ((code === 'obare' || code === 'bare') && /^[a-z]+$/.test(a)) { const f = V.forms(a); return ['to ' + a, f.ing[0].w]; }
    return null;
  }
  // Mọi câu luyện được của một mục: { pre, ans, post, choices, note }
  function quizItems(e) {
    const out = [], codes = new Set(e.items.map(x => x.h));
    // Mẫu cạnh tranh (cả hai đều đúng ngữ pháp) → không tự sinh câu hỏi, chỉ dùng câu "?" soạn tay
    const amb = { to: ['ing', 'bare'], ing: ['to'], bare: ['to', 'oto'], oto: ['obare', 'oing'], obare: ['oto', 'oing'] };
    const push = (ex, item, alts) => { if (!ex.ans || !alts || !alts.length) return; const ch = [...new Set([ex.ans, ...alts])]; if (ch.length < 2) return; out.push({ pre: ex.pre, ans: ex.ans, post: ex.post, choices: ch, key: e.key, kind: e.kind, item }); };
    e.items.forEach(item => item.ex.forEach(s => {
      const ex = example(s);
      if (ex.alts.length) return push(ex, item, ex.alts);
      if (e.kind === 'p') { const own = new Set(e.items.map(x => lastWord(x.h))); return push(ex, item, QUIZ_PREPS.filter(p => !own.has(p) && p !== norm(ex.ans)).slice(0, 6)); }
      if (e.kind === 'v' && !(amb[item.h] || []).some(c => codes.has(c))) return push(ex, item, verbAlts(item.h, ex.ans));
    }));
    e.ex.concat(e.quiz).forEach(s => { const ex = example(s); if (ex.alts.length) push(ex, null, ex.alts); });
    return out;
  }
  // n câu từ nhiều mục; với giới từ: lấy 3 phương án nhiễu ngẫu nhiên
  function quiz(entries, n = 5, seed = Date.now()) {
    const r = rng(seed), all = [];
    for (const e of entries) for (const q of quizItems(e)) all.push(q);
    const pickByEntry = []; const seen = new Set();
    for (const q of shuffle(all, r)) { const k = q.key + '|' + q.pre + q.ans; if (seen.has(k)) continue; seen.add(k); pickByEntry.push(q); }
    // ưu tiên trải đều các mục
    const byKey = {}; pickByEntry.forEach(q => (byKey[q.key] = byKey[q.key] || []).push(q));
    const res = []; let round = 0;
    while (res.length < n && Object.values(byKey).some(l => l.length > round)) { for (const l of Object.values(byKey)) if (l[round] && res.length < n) res.push(l[round]); round++; }
    return res.map(q => ({ ...q, choices: shuffle([q.ans, ...shuffle(q.choices.filter(c => c !== q.ans), r).slice(0, 3)], r) }));
  }

  // id ổn định của câu luyện → lời giải (web/js/explain/usage-<kind>/<lang>.json, scripts/explain/sets.mjs)
  const xid = q => `${q.kind}|${q.key}|${q.item ? q.item.h : '@' + q.ans}`;

  // ---------- Danh sách theo nhóm (trang chuyên mục) ----------
  const list = (kind, sub) => load(kind).filter(e => !sub || e.sub === sub);
  const counts = () => { const c = {}; KINDS.forEach(k => { const es = load(k); c[k] = { entries: es.length, items: es.reduce((n, e) => n + e.items.length, 0) }; }); return c; };

  g.LK_USAGE = { KINDS, SUBS, PREPS, VCODES, parse, load, has, example, words, resolve, suggest, near, lookup, byId, chunksOf, quizItems, quiz, xid, list, counts, norm };
})(typeof self !== 'undefined' ? self : this);
