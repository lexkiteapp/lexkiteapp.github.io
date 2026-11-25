/* 🧩 Ô chữ – lõi thuần (game-system P5a): dựng lưới, đánh số, chấm, lưới chia sẻ. Test: scripts/test/play-crossword.mjs */
(function (g) {
  const W = s => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
  const rng = seed => { let a = 0; for (const c of String(seed)) a = (Math.imul(a, 31) + c.charCodeAt(0)) | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
 
  function build(list, o = {}) {
    const N = o.size || 9, max = o.max || 7, rnd = o.rnd || Math.random, seen = new Set();
    const words = list.map(w => ({ ...w, a: W(w.word) })).filter(w => w.a.length >= 3 && w.a.length <= N && !seen.has(w.a) && seen.add(w.a));
    const cell = new Map(), key = (r, c) => r * N + c, at = (r, c) => (r < 0 || c < 0 || r >= N || c >= N ? '#' : cell.get(key(r, c)) || '');
    const fits = (a, r, c, d) => {
      const dr = d ? 1 : 0, dc = d ? 0 : 1; let cross = 0;
      if (at(r - dr, c - dc) || at(r + dr * a.length, c + dc * a.length)) return -1;
      for (let i = 0; i < a.length; i++) {
        const rr = r + dr * i, cc = c + dc * i, x = at(rr, cc);
        if (x === '#') return -1;
        if (x) { if (x !== a[i]) return -1; cross++; continue; }
        if (at(rr + dc, cc + dr) || at(rr - dc, cc - dr)) return -1;
      }
      return cross;
    };
    const placed = [];
    const put = (w, r, c, d) => { for (let i = 0; i < w.a.length; i++) cell.set(key(r + (d ? i : 0), c + (d ? 0 : i)), w.a[i]); placed.push({ ...w, r, c, d }); };
    const pool = words.slice().sort((x, y) => y.a.length - x.a.length || rnd() - 0.5);
    for (const w of pool) {
      if (placed.length >= max) break;
      if (!placed.length) { put(w, Math.floor(N / 2), Math.floor((N - w.a.length) / 2), 0); continue; }
      let best = null;
      for (const p of placed) for (let i = 0; i < p.a.length; i++) for (let j = 0; j < w.a.length; j++) {
        if (p.a[i] !== w.a[j]) continue;
        const d = p.d ? 0 : 1, r = (p.d ? p.r + i : p.r) - (d ? j : 0), c = (p.d ? p.c : p.c + i) - (d ? 0 : j), x = fits(w.a, r, c, d);
        if (x < 1) continue;
        const score = x * 10 - Math.abs(r + (d ? w.a.length / 2 : 0) - N / 2) - Math.abs(c + (d ? 0 : w.a.length / 2) - N / 2) + rnd();
        if (!best || score > best.score) best = { r, c, d, score };
      }
      if (best) put(w, best.r, best.c, best.d);
    }
   
    const starts = [...new Set(placed.map(p => key(p.r, p.c)))].sort((x, y) => x - y), num = new Map(starts.map((k, i) => [k, i + 1]));
    const entries = placed.map(p => ({ n: num.get(key(p.r, p.c)), dir: p.d ? 'down' : 'across', r: p.r, c: p.c, len: p.a.length, answer: p.a, word: p.word, src: p }))
      .sort((x, y) => (x.dir === y.dir ? x.n - y.n : x.dir === 'across' ? -1 : 1));
    return { size: N, cells: [...cell].map(([k, ch]) => ({ r: Math.floor(k / N), c: k % N, ch, n: num.get(k) || 0 })), entries };
  }
  const cellsOf = e => Array.from({ length: e.len }, (_, i) => [e.r + (e.dir === 'down' ? i : 0), e.c + (e.dir === 'down' ? 0 : i)]);
  const check = (e, typed) => W(typed) === e.answer;
  const shareGrid = (entries, st) => entries.map(e => (st[e.dir + e.n] === 'ok' ? '🟩' : st[e.dir + e.n] === 'hint' ? '🟨' : '⬜')).join('');
  g.XwCore = { build, cellsOf, check, shareGrid, rng, norm: W };
})(typeof self !== 'undefined' ? self : this);
