/* ♟️ Cờ câu đố – lõi thuần (game-system P5c): đọc FEN, sinh nước đi hợp lệ, nhận biết chiếu hết. Không nhập thành / bắt tốt qua đường (bài chọn không cần). Test: scripts/test/play-chess.mjs */
(function (g) {
  const N = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]], K = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const R = K.slice(0, 4), B = K.slice(4), ON = (r, c) => r >= 0 && c >= 0 && r < 8 && c < 8;
  const white = p => p && p === p.toUpperCase();
  const sq = (r, c) => 'abcdefgh'[c] + (8 - r), pos = s => [8 - s[1], 'abcdefgh'.indexOf(s[0])];
  function parse(fen) {
    const [rows, turn] = fen.split(' '), b = rows.split('/').map(r => [...r].flatMap(ch => (/\d/.test(ch) ? Array(+ch).fill('') : [ch])));
    return { b, turn: turn === 'b' ? 'b' : 'w' };
  }
  function pseudo(b, r, c) {
    const p = b[r][c], w = white(p), t = p.toLowerCase(), out = [], enemy = q => q && white(q) !== w;
    const step = (dirs, slide) => dirs.forEach(([dr, dc]) => { let rr = r + dr, cc = c + dc; while (ON(rr, cc)) { if (!b[rr][cc]) out.push([rr, cc]); else { if (enemy(b[rr][cc])) out.push([rr, cc]); break; } if (!slide) break; rr += dr; cc += dc; } });
    if (t === 'n') step(N, 0); else if (t === 'k') step(K, 0); else if (t === 'r') step(R, 1); else if (t === 'b') step(B, 1); else if (t === 'q') step(K, 1);
    else if (t === 'p') {
      const d = w ? -1 : 1, st = w ? 6 : 1;
      if (ON(r + d, c) && !b[r + d][c]) { out.push([r + d, c]); if (r === st && !b[r + 2 * d][c]) out.push([r + 2 * d, c]); }
      [-1, 1].forEach(dc => { if (ON(r + d, c + dc) && enemy(b[r + d][c + dc])) out.push([r + d, c + dc]); });
    }
    return out;
  }
  function attacked(b, r, c, byWhite) {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const p = b[i][j]; if (p && white(p) === byWhite && pseudo(b, i, j).some(m => m[0] === r && m[1] === c)) return true; }
    return false;
  }
  const inCheck = (b, w) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if (b[i][j] === (w ? 'K' : 'k')) return attacked(b, i, j, !w); return false; };
  const make = (b, f, t) => { const x = b.map(r => r.slice()); let p = x[f[0]][f[1]]; x[f[0]][f[1]] = ''; if (p.toLowerCase() === 'p' && (t[0] === 0 || t[0] === 7)) p = white(p) ? 'Q' : 'q'; x[t[0]][t[1]] = p; return x; };
  function legal(b, w) {
    const out = [];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if (b[i][j] && white(b[i][j]) === w) pseudo(b, i, j).forEach(t => { if (!inCheck(make(b, [i, j], t), w)) out.push({ from: sq(i, j), to: sq(t[0], t[1]), f: [i, j], t }); });
    return out;
  }
  /** Nước đi hợp lệ của bên đang đi: [{from,to,mate}] */
  function moves(fen) { const { b, turn } = parse(fen), w = turn === 'w'; return legal(b, w).map(m => ({ from: m.from, to: m.to, mate: !legal(make(b, m.f, m.t), !w).length && inCheck(make(b, m.f, m.t), !w) })); }
  const apply = (fen, from, to) => { const { b } = parse(fen); return make(b, pos(from), pos(to)); };
  g.ChessCore = { parse, moves, apply, sq, pos, white, inCheck };
})(typeof self !== 'undefined' ? self : this);
