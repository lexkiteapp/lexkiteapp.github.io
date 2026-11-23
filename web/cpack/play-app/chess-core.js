/* ♟️ Cờ câu đố – lõi luật cờ thuần (game-system P5c): FEN, nước hợp lệ (nhập thành, bắt tốt qua đường, phong cấp), chiếu hết/hết nước/hòa. Test: scripts/test/play-chess-core.mjs (perft + từng luật) */
(function (g) {
  const N = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]], K = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const RK = K.slice(0, 4), BS = K.slice(4), ON = (r, c) => r >= 0 && c >= 0 && r < 8 && c < 8, white = p => !!p && p === p.toUpperCase();
  const sq = (r, c) => 'abcdefgh'[c] + (8 - r), pos = s => [8 - s[1], 'abcdefgh'.indexOf(s[0])], clone = b => b.map(r => r.slice());
  function parse(fen) {
    const [rows, turn, cas, ep, half, full] = fen.trim().split(/\s+/);
    return { b: rows.split('/').map(r => [...r].flatMap(ch => (/\d/.test(ch) ? Array(+ch).fill('') : [ch]))), turn: turn === 'b' ? 'b' : 'w', castle: cas && cas !== '-' ? cas : '', ep: ep && ep !== '-' ? ep : '', half: +half || 0, full: +full || 1 };
  }
  const toFen = s => s.b.map(r => r.reduce((a, p) => (p ? a + p : /\d$/.test(a) ? a.slice(0, -1) + (+a.slice(-1) + 1) : a + '1'), '')).join('/') + ` ${s.turn} ${s.castle || '-'} ${s.ep || '-'} ${s.half} ${s.full}`;
  function attacked(b, r, c, byW) {
    const at = (rr, cc, set) => ON(rr, cc) && set.includes(b[rr][cc]), pw = byW ? 'P' : 'p', kn = byW ? 'N' : 'n', ki = byW ? 'K' : 'k';
    if (at(r + (byW ? 1 : -1), c - 1, [pw]) || at(r + (byW ? 1 : -1), c + 1, [pw])) return true;
    if (N.some(([a, d]) => at(r + a, c + d, [kn])) || K.some(([a, d]) => at(r + a, c + d, [ki]))) return true;
    const ray = (dirs, set) => dirs.some(([a, d]) => { for (let i = 1; ON(r + a * i, c + d * i); i++) { const p = b[r + a * i][c + d * i]; if (p) return set.includes(p); } return false; });
    return ray(RK, byW ? 'RQ' : 'rq') || ray(BS, byW ? 'BQ' : 'bq');
  }
  const kingOf = (b, w) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if (b[i][j] === (w ? 'K' : 'k')) return [i, j]; return null; };
  const inCheck = (b, w) => { const k = kingOf(b, w); return !!k && attacked(b, k[0], k[1], !w); };
  function gen(s) {
    const { b } = s, w = s.turn === 'w', out = [], enemy = q => q && white(q) !== w;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = b[r][c]; if (!p || white(p) !== w) continue; const t = p.toLowerCase(), add = (rr, cc, x) => out.push({ f: [r, c], t: [rr, cc], ...x });
      const step = (dirs, slide) => dirs.forEach(([a, d]) => { for (let i = 1; ON(r + a * i, c + d * i); i++) { const q = b[r + a * i][c + d * i]; if (!q) add(r + a * i, c + d * i); else { if (enemy(q)) add(r + a * i, c + d * i); break; } if (!slide) break; } });
      if (t === 'n') step(N, 0); else if (t === 'r') step(RK, 1); else if (t === 'b') step(BS, 1); else if (t === 'q') step(K, 1);
      else if (t === 'k') {
        step(K, 0); const row = w ? 7 : 0;
        if (r === row && c === 4 && !inCheck(b, w)) for (const [flag, rc, to, path, empty] of [[w ? 'K' : 'k', 7, 6, [5, 6], [5, 6]], [w ? 'Q' : 'q', 0, 2, [3, 2], [1, 2, 3]]])
          if (s.castle.includes(flag) && b[row][rc] === (w ? 'R' : 'r') && empty.every(x => !b[row][x]) && path.every(x => !attacked(b, row, x, !w))) add(row, to, { castle: flag });
      } else {
        const d = w ? -1 : 1, st = w ? 6 : 1, last = w ? 0 : 7, push = (rr, cc, x) => (rr === last ? 'qrbn'.split('').forEach(pr => add(rr, cc, { ...x, promo: pr })) : add(rr, cc, x));
        if (ON(r + d, c) && !b[r + d][c]) { push(r + d, c); if (r === st && !b[r + 2 * d][c]) add(r + 2 * d, c); }
        [-1, 1].forEach(dc => { if (!ON(r + d, c + dc)) return; if (enemy(b[r + d][c + dc])) push(r + d, c + dc); else if (s.ep && sq(r + d, c + dc) === s.ep) add(r + d, c + dc, { ep: true }); });
      }
    }
    return out;
  }
  function make(s, m) {
    const b = clone(s.b), w = s.turn === 'w', p = b[m.f[0]][m.f[1]], cap = b[m.t[0]][m.t[1]] || m.ep; let castle = s.castle;
    b[m.f[0]][m.f[1]] = ''; b[m.t[0]][m.t[1]] = m.promo ? (w ? m.promo.toUpperCase() : m.promo) : p;
    if (m.ep) b[m.f[0]][m.t[1]] = '';
    if (m.castle) { const row = m.f[0], k = m.castle.toUpperCase() === 'K'; b[row][k ? 5 : 3] = b[row][k ? 7 : 0]; b[row][k ? 7 : 0] = ''; }
    const lose = (r, c) => { const x = { '7,4': 'KQ', '0,4': 'kq', '7,0': 'Q', '7,7': 'K', '0,0': 'q', '0,7': 'k' }[r + ',' + c]; if (x) castle = castle.split('').filter(f => !x.includes(f)).join(''); };
    lose(m.f[0], m.f[1]); lose(m.t[0], m.t[1]);
    const dbl = p.toLowerCase() === 'p' && Math.abs(m.t[0] - m.f[0]) === 2;
    return { b, turn: w ? 'b' : 'w', castle, ep: dbl ? sq((m.f[0] + m.t[0]) / 2, m.f[1]) : '', half: p.toLowerCase() === 'p' || cap ? 0 : s.half + 1, full: s.full + (w ? 0 : 1) };
  }
  const legal = s => gen(s).filter(m => !inCheck(make(s, m).b, s.turn === 'w'));
  function insufficient(b) {
    const x = b.flat().filter(p => p && p.toLowerCase() !== 'k').map(p => p.toLowerCase()); if (!x.length) return true;
    if (x.length === 1) return x[0] === 'b' || x[0] === 'n';
    if (x.every(p => p === 'b')) { const col = new Set(); b.forEach((row, r) => row.forEach((p, c) => p && p.toLowerCase() === 'b' && col.add((r + c) % 2))); return col.size === 1; }
    return false;
  }
  /** Nước hợp lệ của bên đang đi: [{from,to,promo?,mate,check}] (phong cấp: hậu trước) */
  function moves(fen) {
    const s = parse(fen), w = s.turn === 'w';
    return legal(s).map(m => { const n = make(s, m), chk = inCheck(n.b, !w); return { from: sq(...m.f), to: sq(...m.t), promo: m.promo, castle: m.castle, ep: !!m.ep, check: chk, mate: chk && !legal(n).length }; });
  }
  /** Đi một nước: trả FEN mới, hoặc null nếu không hợp lệ (promo mặc định hậu). */
  function play(fen, from, to, promo) {
    const s = parse(fen), m = legal(s).find(x => sq(...x.f) === from && sq(...x.t) === to && (!x.promo || x.promo === (promo || 'q')));
    return m ? toFen(make(s, m)) : null;
  }
  /** Trạng thái thế cờ: {check, mate, stalemate, draw: ''|'insufficient'|'fifty'} */
  function status(fen) {
    const s = parse(fen), n = legal(s).length, chk = inCheck(s.b, s.turn === 'w');
    return { check: chk, mate: chk && !n, stalemate: !chk && !n, draw: insufficient(s.b) ? 'insufficient' : s.half >= 100 ? 'fifty' : '' };
  }
  const apply = (fen, from, to, promo) => { const f = play(fen, from, to, promo); return f ? parse(f).b : null; };
  g.ChessCore = { parse, toFen, moves, play, apply, status, inCheck, sq, pos, white };
})(typeof self !== 'undefined' ? self : this);
