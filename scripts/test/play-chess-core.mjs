// ♟️ Lõi luật cờ (web/cpack/play-app/chess-core.js, game-system P5c): perft chuẩn (kiểm sinh nước đi: nhập thành, bắt tốt qua đường, phong cấp, chiếu),
// nước không hợp lệ, phong cấp, nhập thành, bắt tốt qua đường, chiếu hết, hết nước đi (hòa), hòa thiếu quân / luật 50 nước, kho câu đố.
import fs from 'node:fs'; import assert from 'node:assert/strict';
const g = {}; for (const f of ['chess-core', 'chess-puzzles']) new Function('self', fs.readFileSync(new URL(`../../web/cpack/play-app/${f}.js`, import.meta.url), 'utf8'))(g);
const { ChessCore: C, ChessPuzzles: P } = g, START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const perft = (fen, d) => { if (!d) return 1; let n = 0; for (const m of C.moves(fen)) n += perft(C.play(fen, m.from, m.to, m.promo), d - 1); return n; };
const bad = (fen, a, b, why) => assert.equal(C.play(fen, a, b), null, why), board = fen => fen.split(' ')[0], rights = fen => fen.split(' ')[2];
// 1) perft – số nút chuẩn của cộng đồng cờ (chessprogramming.org/Perft_Results)
assert.deepEqual([1, 2, 3].map(d => perft(START, d)), [20, 400, 8902], 'thế ban đầu');
assert.deepEqual([1, 2].map(d => perft('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', d)), [48, 2039], 'Kiwipete: nhập thành 2 phía, bắt tốt, ghim');
assert.deepEqual([1, 2, 3].map(d => perft('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', d)), [14, 191, 2812], 'thế bắt tốt qua đường + chiếu lộ');
assert.deepEqual([1, 2].map(d => perft('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', d)), [6, 264], 'thế phong cấp + nhập thành bị cấm');
assert.deepEqual([1, 2].map(d => perft('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', d)), [44, 1486], 'thế phong cấp bắt quân');
// 2) nước KHÔNG hợp lệ → play trả null
bad(START, 'e2', 'e5', 'tốt đi 3 ô'); bad(START, 'e7', 'e5', 'đi quân đối phương'); bad(START, 'a1', 'a3', 'xe nhảy qua tốt'); bad(START, 'e4', 'e5', 'ô trống không có quân'); bad(START, 'b1', 'b3', 'mã đi thẳng');
bad('4k3/8/8/8/8/8/8/4KQ2 w - - 0 1', 'e1', 'f1', 'vua không ăn quân mình');
bad('4k3/8/8/8/8/8/3r4/4K3 w - - 0 1', 'e1', 'd1', 'vua vào ô bị xe khống chế');
assert.ok(C.play('4k3/8/8/8/8/8/4r3/4K3 w - - 0 1', 'e1', 'e2'), 'vua ăn xe không được bảo vệ'); bad('4k3/8/8/8/8/3b4/4r3/4K3 w - - 0 1', 'e1', 'e2', 'vua ăn xe được tượng bảo vệ');
bad('4k3/4r3/8/8/8/8/4R3/4K3 w - - 0 1', 'e2', 'a2', 'quân bị ghim rời đường ghim'); assert.ok(C.play('4k3/4r3/8/8/8/8/4R3/4K3 w - - 0 1', 'e2', 'e7'), 'quân bị ghim vẫn đi dọc đường ghim');
bad('4k3/8/8/8/8/8/4r3/4K2R w - - 0 1', 'h1', 'h8', 'đang bị chiếu mà không gỡ chiếu');
// 3) phong cấp
const PR = '4k3/P7/8/8/8/8/8/4K3 w - - 0 1';
assert.deepEqual(C.moves(PR).filter(m => m.from === 'a7').map(m => m.promo).sort(), ['b', 'n', 'q', 'r'], 'tốt cuối bàn: 4 lựa chọn');
assert.equal(board(C.play(PR, 'a7', 'a8')), 'Q3k3/8/8/8/8/8/8/4K3', 'mặc định phong hậu'); assert.equal(board(C.play(PR, 'a7', 'a8', 'n')), 'N3k3/8/8/8/8/8/8/4K3', 'phong mã');
assert.ok(C.moves('k7/2P5/K7/8/8/8/8/8 w - - 0 1').some(m => m.from === 'c7' && m.promo === 'q'), 'phong hậu cạnh vua');
assert.ok(C.moves('r5k1/5ppp/8/8/8/8/1p6/4K3 b - - 0 1').some(m => m.promo === 'q' && m.from === 'b2'), 'Đen phong cấp ở hàng 1');
assert.equal(C.moves('7k/P7/8/8/8/8/8/R5K1 w - - 0 1').find(m => m.from === 'a7' && m.promo === 'q').mate, false, 'phong hậu không phải lúc nào cũng chiếu hết');
const UM = C.moves('7k/4P1pp/8/8/8/8/8/4K3 w - - 0 1').filter(m => m.from === 'e7'); // e8=Q chiếu hết hàng cuối; e8=N không chiếu
assert.equal(UM.find(m => m.promo === 'q').mate, true, 'phong hậu chiếu hết'); assert.equal(UM.find(m => m.promo === 'n').mate, false, 'phong mã không chiếu hết');
// 4) nhập thành
const CA = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
assert.equal(board(C.play(CA, 'e1', 'g1')), 'r3k2r/8/8/8/8/8/8/R4RK1', 'nhập thành cánh vua'); assert.equal(board(C.play(CA, 'e1', 'c1')), 'r3k2r/8/8/8/8/8/8/2KR3R', 'nhập thành cánh hậu');
assert.equal(rights(C.play(CA, 'e1', 'g1')), 'kq', 'mất quyền nhập thành sau khi nhập'); assert.equal(rights(C.play(CA, 'h1', 'g1')), 'Qkq', 'xe h1 đi → mất quyền cánh vua'); assert.equal(rights(C.play(CA, 'e1', 'd1')), 'kq', 'vua đi → mất cả hai');
bad('r3k2r/8/8/8/8/8/8/R3K2R w Qkq - 0 1', 'e1', 'g1', 'đã mất quyền cánh vua');
bad('r3k2r/8/8/8/8/5r2/8/R3K2R w KQkq - 0 1', 'e1', 'g1', 'không nhập thành qua ô bị chiếu (f1)'); bad('r3k2r/8/8/8/8/4r3/8/R3K2R w KQkq - 0 1', 'e1', 'g1', 'không nhập thành khi đang bị chiếu');
bad('r3k2r/8/8/8/8/8/8/RN2K2R w KQkq - 0 1', 'e1', 'c1', 'có quân chắn giữa');
assert.ok(C.play('r3k2r/8/8/8/8/1r6/8/R3K2R w KQkq - 0 1', 'e1', 'c1'), 'ô b1 bị chiếu vẫn nhập thành cánh hậu được (chỉ xe qua b1)');
assert.ok(C.play('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1', 'e8', 'g8'), 'Đen nhập thành cánh vua'); assert.equal(board(C.play('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1', 'e8', 'c8')), '2kr3r/8/8/8/8/8/8/R3K2R', 'Đen nhập thành cánh hậu');
bad('r3k2r/8/8/8/8/8/8/R3K2R b KQ - 0 1', 'e8', 'g8', 'Đen không còn quyền');
assert.equal(rights(C.play('r3k2r/8/8/8/8/8/6b1/R3K2R b KQkq - 0 1', 'g2', 'h1')), 'Qkq', 'xe góc bị bắt → mất quyền cánh đó');
// 5) bắt tốt qua đường
const E1 = C.play('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1', 'd7', 'd5');
assert.equal(E1.split(' ')[3], 'd6', 'tốt đi 2 ô mở ô bắt qua đường'); assert.ok(C.moves(E1).some(m => m.ep && m.to === 'd6' && m.from === 'e5'), 'có nước bắt tốt qua đường');
assert.equal(board(C.play(E1, 'e5', 'd6')), '4k3/8/3P4/8/8/8/8/4K3', 'ăn d5 và đặt tốt ở d6');
const E2 = C.play(C.play(E1, 'e1', 'e2'), 'e8', 'e7'); assert.equal(E2.split(' ')[3], '-', 'chỉ được bắt ngay nước kế tiếp'); assert.ok(!C.moves(E2).some(m => m.ep), 'nước sau hết quyền');
assert.ok(!C.moves('8/8/8/K2pP2r/8/8/8/4k3 w - d6 0 1').some(m => m.ep), 'bắt qua đường bị cấm khi lộ vua cho xe (cùng hàng)');
assert.ok(C.moves('8/8/8/3pP3/8/8/8/k3K3 w - d6 0 1').some(m => m.ep), 'bắt qua đường hợp lệ khi không lộ vua');
// 6) chiếu hết / hết nước đi / hòa
const FM = C.play(C.play(C.play(C.play(START, 'f2', 'f3'), 'e7', 'e5'), 'g2', 'g4'), 'd8', 'h4');
assert.deepEqual(C.status(FM), { check: true, mate: true, stalemate: false, draw: '' }, "fool's mate"); assert.deepEqual(C.moves(FM), [], 'bị chiếu hết: không còn nước');
assert.equal(C.status('6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1').mate, false); assert.equal(C.status(C.play('6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1', 'a1', 'a8')).mate, true, 'chiếu hết hàng cuối');
const SM = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
assert.deepEqual(C.status(SM), { check: false, mate: false, stalemate: true, draw: '' }, 'hết nước đi mà không bị chiếu = hòa'); assert.deepEqual(C.moves(SM), []);
assert.equal(C.status('7k/8/5K2/8/8/8/8/7Q b - - 0 1').stalemate, false, 'còn nước đi → chưa hòa');
assert.equal(C.status('K7/8/8/8/8/8/8/6kN w - - 0 1').draw, 'insufficient', 'vua + mã đấu vua'); assert.equal(C.status('K7/8/8/8/8/8/8/6kk w - - 0 1').draw, 'insufficient', 'chỉ có vua');
assert.equal(C.status('K7/8/8/8/8/8/8/6kB w - - 0 1').draw, 'insufficient', 'vua + tượng đấu vua'); assert.equal(C.status('K7/8/8/8/8/8/5b2/6kB w - - 0 1').draw, '', 'hai tượng khác màu ô: còn khả năng chiếu hết');
assert.equal(C.status('K7/8/8/8/8/8/6b1/6kB w - - 0 1').draw, 'insufficient', 'hai tượng cùng màu ô'); assert.equal(C.status('K7/8/8/8/8/8/8/5RPk w - - 0 1').draw, '', 'còn xe/tốt: không hòa');
assert.equal(C.status('K7/8/8/8/8/8/8/6Rk w - - 100 80').draw, 'fifty', 'luật 50 nước'); assert.equal(C.status('K7/8/8/8/8/8/8/6Rk w - - 99 80').draw, '');
assert.equal(C.status(C.play('K7/8/8/8/8/8/8/6Rk w - - 99 80', 'g1', 'g2')).draw, 'fifty', 'đếm nước nửa đạt 100 sau một nước'); assert.equal(C.status(C.play('K7/8/8/8/p7/8/8/6Rk w - - 99 80', 'g1', 'g2')).draw, 'fifty');
// 7) FEN vào/ra
const KIWI = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
assert.equal(C.toFen(C.parse(START)), START); assert.equal(C.toFen(C.parse(KIWI)), KIWI); assert.equal(C.parse('6k1/5ppp/8/8/8/8/8/R3K3 w').castle, '', 'FEN rút gọn của kho câu đố');
assert.equal(C.play(START, 'e2', 'e4'), 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 'ra đúng FEN chuẩn');
// 8) kho câu đố: mỗi thế có nước chiếu hết 1 nước, có nước sai, thuật ngữ không rỗng
assert.ok(P.length >= 9);
for (const [fen, term] of P) { const m = C.moves(fen), k = m.find(x => x.mate); assert.ok(term && k, 'thế phải có nước chiếu hết: ' + fen); assert.ok(m.some(x => !x.mate), 'phải có nước sai: ' + fen); assert.equal(C.status(C.play(fen, k.from, k.to, k.promo)).mate, true, 'chơi nước chiếu hết → status mate'); }
assert.equal(C.moves('6k1/5ppp/8/8/8/8/8/R3K3 w').filter(x => x.mate).map(x => x.from + x.to).join(), 'a1a8');
console.log('play-chess-core OK');
