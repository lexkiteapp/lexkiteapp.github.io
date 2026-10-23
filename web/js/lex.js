/* Lex – tra kho từ vựng MỘT NGUỒN theo mảnh (shard) nhỏ: web app, add-on (service worker + popup), mobile, thẻ/quiz dùng chung.
 * Dữ liệu: scripts/lexicon/shards.mjs dựng từ web/js/data.js + web/js/lib/*.js (đúng IELTS_DATA.INDEX) + web/packs/<lang>.json
 *   /data/lex-index.json (no-cache, ~2 KB br) → { v, g, c: [[khóaĐầu, hash]…], l: { es: hash … }, top, n }
 *   /data/lex/c/<hash>.json (immutable)     → { e: { khóa: mục }, r: { dạng: gốc }, f: { không-dấu: khóa }, a: [khóa có audio Kokoro] }
 *   /data/lex/<lang>/<hash>-<j>.json        → { khóa: [nghĩa, cờ, tin cậy] } – mảnh j phủ mảnh lõi [j·g, (j+1)·g)
 * Bộ đệm: bộ nhớ (đã parse) → IndexedDB 'lk-lex' (khóa = đường dẫn có hash ⇒ đổi phiên bản kho là tự hết hạn; LRU ≤ MAX tệp) → mạng.
 * Không có mảnh (file://, test, mất mạng lần đầu) → dùng IELTS_DATA.INDEX với CÙNG chuẩn hóa + tách gốc từ.
 * API: Lex.norm(s) · Lex.get(s, { lang }) → { entry, key, via, from, mean, au } | null · Lex.peek(s) · Lex.suggest(q, n) · Lex.warm() · Lex.version()
 * Chạy được trong Node (module.exports) để test: scripts/test/lex.mjs. */
(function (g) {
  'use strict';
  const MAX = 400; // số tệp mảnh giữ trong IndexedDB (~1,5 MB)
  // ---------- Chuẩn hóa (dùng chung khi dựng mảnh và khi tra – không chép hàm này sang nơi khác) ----------
  const QUOTES = /[’‘ʼ`´′]/g, DASHES = /[‐‑‒–—―−]/g;
  const base = s => String(s == null ? '' : s).normalize('NFC').toLowerCase().replace(QUOTES, "'").replace(DASHES, '-').replace(/[\s ​]+/g, ' ').trim();
  const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC'); // café → cafe, naïve → naive
  const edge = s => s.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''); // "(word)." → word
  const norm = s => base(s);
  // ---------- Tách gốc từ theo quy tắc (bất quy tắc nằm trong dữ liệu mảnh: r) ----------
  function stems(w) {
    const out = [], add = x => { if (x && x.length > 1 && x !== w && !out.includes(x)) out.push(x); }, dbl = /([b-df-hj-np-tv-z])\1$/;
    if (/[^aeiou]ies$/.test(w)) add(w.slice(0, -3) + 'y');
    if (/(s|x|z|ch|sh|o)es$/.test(w)) add(w.slice(0, -2));
    if (/[^s]s$/.test(w) && !/(us|is|ss)$/.test(w)) add(w.slice(0, -1));
    if (/ves$/.test(w)) { add(w.slice(0, -3) + 'f'); add(w.slice(0, -3) + 'fe'); }
    if (/[^aeiou]ied$/.test(w)) add(w.slice(0, -3) + 'y');
    if (/ed$/.test(w)) { const s = w.slice(0, -2); if (dbl.test(s)) add(s.slice(0, -1)); add(w.slice(0, -1)); add(s); }
    if (/ing$/.test(w) && w.length > 4) { const s = w.slice(0, -3); if (dbl.test(s)) add(s.slice(0, -1)); add(s); add(s + 'e'); if (/y$/.test(s)) add(s.slice(0, -1) + 'ie'); }
    if (/[^aeiou]ier$/.test(w)) add(w.slice(0, -3) + 'y');
    if (/[^aeiou]iest$/.test(w)) add(w.slice(0, -4) + 'y');
    if (/er$/.test(w) && w.length > 4) { const s = w.slice(0, -2); if (dbl.test(s)) add(s.slice(0, -1)); add(s); add(w.slice(0, -1)); }
    if (/est$/.test(w) && w.length > 5) { const s = w.slice(0, -3); if (dbl.test(s)) add(s.slice(0, -1)); add(s); add(w.slice(0, -2)); }
    if (/'s$/.test(w)) add(w.slice(0, -2));
    return out;
  }
  // dạng quá khứ/phân từ của 1 mục LK_VERBS.irregularList() (chuỗi 'a/b:UK' hoặc mảng { w, tag })
  const formsOf = v => [v.past, v.pp].flatMap(x => (Array.isArray(x) ? x : [x])).flatMap(y => (y && typeof y === 'object' ? [y.w] : String(y || '').split('/'))).map(y => String(y || '').replace(/:.*/, '').trim().toLowerCase()).filter(Boolean);
  const own = (o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined); // "constructor", "toString"… không lấy nhầm từ prototype
  const OBJ = /^(it|them|him|her|me|us|you|this|that|something|someone|sth|sb)$/;
  // ---------- Nguồn dữ liệu ----------
  const isNode = typeof module !== 'undefined' && module.exports && !g.document && !g.registration;
  const loc = g.location || {};
  const BASE = g.LEX_BASE != null ? g.LEX_BASE
    : /^https?:$/.test(loc.protocol || '') && !/^chrome-extension:/.test(loc.protocol) ? '' : 'https://lexkite.com';
  let fetcher = typeof fetch === 'function' && !isNode ? (u, o) => fetch(u, o) : null;
  let idx = null, idxP = null, idxFresh = false, idxErr = 0;
  const mem = new Map(); // đường dẫn → dữ liệu đã parse (không parse lại JSON lớn)
  const inflight = new Map(); // đường dẫn → Promise (gõ nhanh / nhiều nơi cùng hỏi → 1 lần tải)
  const stats = { net: 0, bytes: 0, idb: 0, mem: 0 };
  // ---------- IndexedDB (LRU) ----------
  let dbP = null;
  const idb = () => dbP || (dbP = new Promise(res => {
    try {
      if (!g.indexedDB) return res(null);
      const r = g.indexedDB.open('lk-lex', 1);
      r.onupgradeneeded = () => { const s = r.result.createObjectStore('f'); s.createIndex('t', 't'); };
      r.onsuccess = () => res(r.result); r.onerror = r.onblocked = () => res(null);
    } catch (e) { res(null); }
  }));
  const tx = (mode, fn) => idb().then(db => db && new Promise(res => { try { const t = db.transaction('f', mode), s = t.objectStore('f'); const out = fn(s); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = t.onabort = () => res(null); } catch (e) { res(null); } }));
  const idbGet = k => tx('readonly', s => s.get(k)).then(v => v || null).catch(() => null);
  let puts = 0;
  const idbPut = (k, d) => tx('readwrite', s => s.put({ d, t: Date.now() }, k)).then(() => { if (++puts % 20 === 0) trim(); }).catch(() => {});
  const touch = (k, rec) => { if (Date.now() - rec.t > 3600e3) idbPut(k, rec.d); };
  function trim(keep) { // LRU: giữ MAX tệp dùng gần nhất; đổi phiên bản kho → bỏ tệp không còn trong mục lục
    return tx('readwrite', s => {
      const cnt = s.count(); cnt.onsuccess = () => {
        let extra = cnt.result - MAX; const all = s.index('t').openCursor();
        all.onsuccess = () => { const c = all.result; if (!c) return; const k = c.primaryKey; if (k !== 'index' && ((keep && !keep.has(k)) || extra > 0)) { c.delete(); extra--; } c.continue(); };
      };
    }).catch(() => {});
  }
  // ---------- Tải ----------
  async function getJSON(path, { cacheable = true } = {}) {
    if (mem.has(path)) { stats.mem++; return mem.get(path); }
    if (inflight.has(path)) return inflight.get(path);
    const p = (async () => {
      if (cacheable) { const rec = await idbGet(path); if (rec) { stats.idb++; mem.set(path, rec.d); touch(path, rec); return rec.d; } }
      if (!fetcher) throw new Error('no-fetch');
      const r = await fetcher(BASE + path, cacheable ? {} : { cache: 'no-cache' });
      if (!r.ok) throw new Error('http ' + r.status);
      const txt = await r.text(); stats.net++; stats.bytes += txt.length;
      const d = JSON.parse(txt); mem.set(path, d); if (cacheable) idbPut(path, d);
      return d;
    })();
    inflight.set(path, p); p.then(() => inflight.delete(path), () => inflight.delete(path));
    return p;
  }
  // Mục lục: bản trong IndexedDB dùng ngay (offline/nhanh), song song hỏi bản mới (no-cache, ETag → 304) – khác phiên bản thì thay
  function setIdx(d) { if (!d || !Array.isArray(d.c)) return false; const changed = !idx || idx.v !== d.v; idx = d; if (changed) { for (const k of [...mem.keys()]) if (!k.includes(d.v) && !inIdx(k)) mem.delete(k); memo.clear(); } return changed; }
  const inIdx = p => !!idx && paths(idx).has(p);
  function refresh() {
    if (idxFresh) return Promise.resolve(idx);
    return getJSONFresh().then(d => { idxFresh = true; if (setIdx(d)) { idbPut('index', d); trim(paths(d)); } return idx; });
  }
  const getJSONFresh = () => (fetcher ? fetcher(BASE + '/data/lex-index.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }) : Promise.reject(new Error('no-fetch')));
  const paths = d => new Set([...(d.c || []).map(x => '/data/lex/c/' + x[1] + '.json'), ...Object.entries(d.l || {}).flatMap(([l, h]) => (d.c || []).map((x, i) => `/data/lex/${l}/${h}-${Math.floor(i / (d.g || 1))}.json`)), d.top ? '/data/lex/' + d.top + '.json' : '']);
  function index() {
    if (idx) { if (!idxFresh && !idxErr) refresh().catch(() => { idxErr = 1; }); return Promise.resolve(idx); }
    if (idxP) return idxP;
    idxP = (async () => {
      const rec = await idbGet('index');
      if (rec) setIdx(rec.d);
      if (idx) { refresh().catch(() => { idxErr = 1; }); return idx; }
      try { await refresh(); } catch (e) { idxErr = 1; }
      return idx;
    })().finally(() => { idxP = null; });
    return idxP;
  }
  const pickI = (list, k) => { let lo = 0, hi = list.length - 1, ans = 0; while (lo <= hi) { const m = (lo + hi) >> 1; if (list[m][0] <= k) { ans = m; lo = m + 1; } else hi = m - 1; } return ans; };
  const shardOf = k => getJSON('/data/lex/c/' + idx.c[pickI(idx.c, k)][1] + '.json');
  // ---------- Dự phòng: IELTS_DATA.INDEX (cùng chuẩn hóa) ----------
  const local = () => (g.IELTS_DATA && g.IELTS_DATA.INDEX) || null;
  let fb = null, fbN = -1; // bảng dự phòng đã chuẩn hóa (dựng lại khi INDEX thêm bộ từ)
  function fbShard() {
    const I = local(); if (!I) return null; const ks = Object.keys(I); if (fb && fbN === ks.length) return fb;
    const e = Object.create(null), f = Object.create(null), r = Object.create(null);
    for (const k of ks) { const n = norm(k); if (!(n in e)) e[n] = I[k]; const fd = fold(n); if (fd !== n && !(fd in f)) f[fd] = n; }
    const V = g.LK_VERBS; if (V && V.irregularList) for (const v of V.irregularList()) for (const x of formsOf(v)) if (x && !(x in e) && v.base in e) r[x] = v.base;
    fb = { e, f, r, a: [] }; fbN = ks.length; return fb;
  }
  // ---------- Tra ----------
  const memo = new Map(); // khóa đã chuẩn hóa + lang → kết quả (LRU 500)
  async function lookupKey(k, useFb) { // → { entry, sh } trong mảnh chứa k (gồm cả bảng r/f của mảnh)
    if (idx && !useFb) { const sh = await shardOf(k); return { sh, entry: own(sh.e, k) || null }; }
    const sh = fbShard(); return { sh, entry: sh ? own(sh.e, k) || null : null };
  }
  async function resolve(raw, useFb) {
    const L = k => lookupKey(k, useFb);
    const b = norm(raw); if (!b) return null;
    const tries = [b]; const e2 = edge(b); if (e2 && e2 !== b) tries.push(e2);
    for (const k of tries) {
      const { sh, entry } = await L(k);
      if (entry) return { entry, key: k, via: 'exact', sh };
      if (sh && own(sh.f, fold(k))) { const kk = own(sh.f, fold(k)); const r = await L(kk); if (r.entry) return { entry: r.entry, key: kk, via: 'fold', sh: r.sh }; }
      const fk = fold(k); if (fk !== k) { const r = await L(fk); if (r.entry) return { entry: r.entry, key: fk, via: 'fold', sh: r.sh }; }
      if (sh && own(sh.r, k)) { const r = await L(own(sh.r, k)); if (r.entry) return { entry: r.entry, key: own(sh.r, k), via: 'irregular', from: k, sh: r.sh }; }
    }
    const w = e2 || b, parts = w.split(' ');
    if (parts.length === 1) {
      for (const s of stems(w)) { const r = await L(s); if (r.entry) return { entry: r.entry, key: s, via: 'rule', from: w, sh: r.sh }; }
      return null;
    }
    // Cụm động từ: went up → go up · looking it up → look up · gave them back → give back
    if (parts.length <= 4) {
      const rest = parts.slice(1).filter((x, i, a) => !(OBJ.test(x) && i < a.length - 1));
      const heads = [parts[0]]; const h = await L(parts[0]); if (h.sh && own(h.sh.r, parts[0])) heads.push(own(h.sh.r, parts[0])); heads.push(...stems(parts[0]));
      for (const hd of heads) for (const tail of [rest, parts.slice(1)]) { const k = [hd, ...tail].join(' '); if (k === w) continue; const r = await L(k); if (r.entry) return { entry: r.entry, key: k, via: 'phrasal', from: w, sh: r.sh }; }
    }
    return null;
  }
  async function meanOf(key, entry, lang) {
    if (!lang || lang === 'vi' || lang === 'en') return null;
    if (idx && idx.l && idx.l[lang]) { try { const L = await getJSON(`/data/lex/${lang}/${idx.l[lang]}-${Math.floor(pickI(idx.c, key) / (idx.g || 1))}.json`); return own(L, key) || null; } catch (e) { /* mất mạng → dự phòng gói */ } }
    const P = g.App && g.App.packs && g.App.packs[lang]; if (!P) return null;
    const pos = String(entry.pos || '').toLowerCase(), gp = /^(n|noun)\b/.test(pos) ? 'n' : /^(phr ?v|phrasal)/.test(pos) ? 'phrv' : /^(v|verb)\b/.test(pos) ? 'v' : /^adj/.test(pos) ? 'adj' : /^adv/.test(pos) ? 'adv' : pos;
    return own(P, key + '#' + gp) || own(P, key) || null;
  }
  async function get(raw, opt = {}) {
    const lang = opt.lang || '', mk = norm(raw) + '|' + lang;
    if (memo.has(mk)) { const v = memo.get(mk); memo.delete(mk); memo.set(mk, v); return v; }
    await index();
    let r = null;
    try { r = await resolve(raw); } catch (e) { if (!idx) throw e; r = await resolve(raw, true); } // mảnh lỗi mạng (offline, chưa có trong bộ đệm) → bảng dự phòng
    const out = r ? { entry: r.entry, key: r.key, via: r.via, from: r.from || '', au: !!(r.sh && r.sh.a && r.sh.a.includes(r.key)), mean: await meanOf(r.key, r.entry, lang).catch(() => null) } : null;
    if (out || (idx && !idxErr)) { memo.set(mk, out); if (memo.size > 500) memo.delete(memo.keys().next().value); }
    return out;
  }
  // Cờ âm thanh Kokoro của đúng từ đó (không phải từ gốc): true/false khi đã tra trong phiên, undefined khi chưa biết
  const peekAu = raw => { const k = norm(raw); for (const [mk, v] of memo) if (mk.startsWith(k + '|') && v) return v.via === 'exact' || v.via === 'fold' ? v.au : false; return undefined; };
  const peek = (raw, lang = '') => { const v = memo.get(norm(raw) + '|' + lang); return v ? v.entry : (local() && local()[norm(raw)]) || null; };
  // Gợi ý theo tiền tố: chỉ mở mảnh chứa tiền tố (+ mảnh kế nếu tràn), không duyệt cả kho
  async function suggest(q, n = 6) {
    const k = norm(q); if (!k) return [];
    await index();
    const out = [], push = (key, e) => { if (key.startsWith(k) && out.length < n && !out.some(x => x.key === key)) out.push({ key, word: e.word, vi: e.vi, pos: e.pos, entry: e }); };
    if (idx) {
      let i = pickI(idx.c, k);
      while (i < idx.c.length && out.length < n) { const sh = await getJSON('/data/lex/c/' + idx.c[i][1] + '.json'); Object.keys(sh.e).sort().forEach(key => push(key, sh.e[key])); i++; if (!(idx.c[i] && idx.c[i][0].startsWith(k))) break; }
    } else { const sh = fbShard(); if (sh) Object.keys(sh.e).filter(x => x.startsWith(k)).sort().slice(0, n).forEach(key => push(key, sh.e[key])); }
    return out;
  }
  // Tải sẵn: mục lục + mảnh top-N từ thông dụng (gộp 1 tệp) – gọi lúc rảnh
  async function warm() {
    await index(); if (!idx || !idx.top) return 0;
    const top = await getJSON('/data/lex/' + idx.top + '.json').catch(() => null); if (!top) return 0;
    for (const [k, e] of Object.entries(top.e || {})) memo.set(k + '|', { entry: e, key: k, via: 'exact', from: '', au: (top.a || []).includes(k), mean: null });
    return Object.keys(top.e || {}).length;
  }
  const Lex = {
    norm, fold, edge, stems, formsOf, get, peek, peekAu, suggest, warm, resolve,
    ready: () => index().then(() => !!idx), refresh: () => { idxFresh = false; return refresh().catch(() => idx); },
    version: () => (idx ? idx.v : 'local'), stats: () => ({ ...stats, version: idx ? idx.v : 'local', mem: mem.size }),
    // test / môi trường đặc biệt
    _setFetch: f => { fetcher = f; }, _reset: () => { idx = null; idxP = null; idxFresh = false; idxErr = 0; mem.clear(); memo.clear(); inflight.clear(); fb = null; fbN = -1; Object.keys(stats).forEach(k => { stats[k] = 0; }); },
    _trim: trim, _idb: idb,
  };
  if (isNode) module.exports = Lex; else g.Lex = Lex;
})(typeof self !== 'undefined' ? self : globalThis);
