// ♟️ Lõi cờ câu đố (web/cpack/play-app/chess-core.js + chess-puzzles.js): mỗi thế phải CÓ nước chiếu hết 1 nước, nước giả không chiếu hết, thuật ngữ không rỗng.
import fs from 'node:fs'; import assert from 'node:assert/strict';
const g = {}; for (const f of ['chess-core', 'chess-puzzles']) new Function('self', fs.readFileSync(new URL(`../../web/cpack/play-app/${f}.js`, import.meta.url), 'utf8'))(g);
const { ChessCore: C, ChessPuzzles: P } = g;
assert.ok(P.length >= 9);
for (const [fen, term] of P) { const m = C.moves(fen); assert.ok(term && m.some(x => x.mate), 'thế phải có nước chiếu hết: ' + fen); assert.ok(m.some(x => !x.mate), 'phải có nước không chiếu hết (câu đố có đáp án sai): ' + fen); }
assert.equal(C.moves('6k1/5ppp/8/8/8/8/8/R3K3 w').filter(x => x.mate).map(x => x.from + x.to).join(), 'a1a8');
assert.ok(!C.inCheck(C.parse('6k1/5ppp/8/8/8/8/8/R3K3 w').b, false));
console.log('play-chess-core OK');
