// Phát âm – huấn luyện viên (web/js/pron/coach.js): nhịp câu + dạng yếu theo giọng Anh/Mỹ (bảng UI.WEAK của PR #178), so câu nói với mẫu,
// điểm tử tế 3 mức, gợi ý luyện tiếp. Dùng đúng bảng WEAK trong web/js/ui.js (giữa LK_WEAK-START/END) – không chép tay.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const ui = fs.readFileSync('web/js/ui.js', 'utf8'), w0 = ui.indexOf('/* LK_WEAK-START */'), w1 = ui.indexOf('/* LK_WEAK-END */');
const WEAK = vm.runInNewContext('(' + ui.slice(w0, w1).replace(/^[\s\S]*?const WEAK = /, '').replace(/;\s*$/, '') + ')');
const c = { localStorage: null }; vm.createContext(c); c.self = c;
vm.runInContext(fs.readFileSync('web/js/pron/pairs.js', 'utf8') + fs.readFileSync('web/js/pron/coach.js', 'utf8'), c);
const C = c.PronCoach, P = c.PronPairs; let n = 0;
const ok = (v, m) => { assert.ok(v, m || 'lỗi'); n++; }, eq = (a, b, m) => { assert.equal(JSON.stringify(a), JSON.stringify(b), m || JSON.stringify(a)); n++; };

// 1. Nhịp + dạng yếu: từ nội dung nhấn, hư từ yếu theo giọng (for: UK /fə/ · US /fər/)
const us = C.plan('This is for you.', 'en-US', WEAK), uk = C.plan('This is for you.', 'en-GB', WEAK);
eq(us.map(x => x.stress), [true, false, false, false]);
eq([us[2].weak, uk[2].weak], ['/fər/', '/fə/']);
eq(C.plan('I want to go to the shop.', 'en-US', WEAK).filter(x => x.stress).map(x => x.w), ['want', 'go', 'shop']);
eq(C.plan('I want to go to the shop.', 'en-US', WEAK).filter(x => x.weak).map(x => x.weak), ['/tə/', '/tə/', '/ðə/']);
eq(C.plan({ s: 'Can you swim?', w: ['can', 'swim'] }, 'en-US', WEAK).map(x => x.stress), [true, false, true], 'nhấn tùy chỉnh');
for (const s of C.SENTENCES) { const p = C.plan(s, 'en-US', WEAK); ok(p.some(x => x.stress) && p.some(x => x.weak), 'câu có cả từ nhấn & dạng yếu: ' + s.s); ok(/^[A-Z].*[.?!]$/.test(s.s) && /^(A2|B1|B2)$/.test(s.lv), s.s); }
eq(new Set(C.SENTENCES.map(x => x.s)).size, C.SENTENCES.length, 'câu trùng');

// 2. So câu nói: thiếu từ nội dung vs thiếu hư từ, không phân biệt hoa thường/dấu
const d = C.diff('I want go shop', 'I want to go to the shop.', WEAK);
eq([d.missingContent, d.missingWeak], [[], ['to', 'to', 'the']]);
eq(C.diff('i WANT to go to the SHOP!', 'I want to go to the shop.', WEAK).missing, []);
eq(C.diff('I want to the shop', 'I want to go to the shop.', WEAK).missingContent, ['go']);
eq(C.diff('', 'Hi there.', WEAK).cover, 0);

// 3. Điểm & mức: nói đúng = tuyệt; bỏ từ nội dung trừ nặng hơn bỏ hư từ; luôn 0–100
eq(C.score(1, C.diff('I want to go to the shop', 'I want to go to the shop.', WEAK)), 100);
ok(C.score(0.8, d) > C.score(0.8, C.diff('I want to to the', 'I want to go to the shop.', WEAK)), 'bỏ từ chính bị trừ nhiều hơn');
ok(C.score(0, C.diff('', 'a b c d e f g', WEAK)) === 0);
eq([C.band(95), C.band(85), C.band(70), C.band(10)], ['great', 'great', 'close', 'again']);

// 4. Gợi ý luyện tiếp: cặp âm yếu nhất trước, rồi câu nhịp chưa đạt, tối đa 3, không gợi ý chính bài đang học
const stats = { 'th-s': { n: 10, ok: 2, hist: [] }, 'i-ih': { n: 10, ok: 9, hist: [] } };
const nx = C.next({ pairs: P, stats, rhythm: { 0: 90 }, skill: 'weak-forms' });
ok(nx.length <= 3 && nx[0].kind === 'pair' && nx[0].id === 'th-s' && nx[0].skill, 'cặp yếu trước: ' + JSON.stringify(nx));
ok(nx.some(x => x.kind === 'rhythm' && x.k === 1), 'câu 1 đã đạt → gợi ý câu 2');
ok(!C.next({ skill: 'weak-forms' }).some(x => x.id === 'weak-forms'), 'không gợi ý bài đang học');
eq(C.next({}).length, 3);

console.log(`pron-coach: ${n} kiểm tra OK`);
