// Test lời giải "Vì sao?" theo câu (web/js/lesson/why.js, docs/specs/sentence-builder.md): so câu người học ↔ đáp án, luật trật tự, từ nhiễu, ví dụ MỚI không trùng câu bài tập.
// Chạy: node scripts/test/lesson-why.mjs
import fs from 'node:fs';
import vm from 'node:vm';

let total = 0, fails = 0;
const ok = (c, m) => { total++; if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };
const ctx = { self: {} }; ctx.globalThis = ctx.self; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('web/js/lesson/why.js', 'utf8'), ctx);
const W = ctx.self.LessonWhy;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const t = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (v && k in v ? v[k] : m));
const GL = { innovation: 'sự đổi mới', employment: 'việc làm', loans: 'khoản vay', bank: 'ngân hàng' }, POS = { loans: 'noun', bank: 'noun', entrepreneurs: 'noun', young: 'adjective' };
const deps = { gloss: w => GL[w.toLowerCase()] || '', pos: w => POS[w.toLowerCase()] || '' };

// 1. Ca của owner (01/11): sai chỗ "often", đảo "loans bank", dùng từ nhiễu
const SENT = 'Young entrepreneurs often struggle to obtain bank loans.';
const it = { type: 'build', sent: SENT, answer: 'Young entrepreneurs often struggle to obtain bank loans', tiles: ['Young', 'entrepreneurs', 'often', 'struggle', 'to', 'obtain', 'bank', 'loans', 'innovation', 'employment'] };
const ans = ['Young', 'entrepreneurs', 'struggle', 'often', 'to', 'obtain', 'loans', 'bank', 'innovation'];
const r = W.explain(it, ans, Object.assign({ examples: [SENT, 'Young entrepreneurs often struggle to obtain bank loans', 'Many small firms struggle to get credit.'] }, deps));
ok(r.mistakes.some(m => m.k === 'move' && /often|struggle/.test(m.w)), 'chỉ ra từ sai chỗ (often/struggle)');
ok(r.mistakes.some(m => m.k === 'extra' && m.w === 'innovation' && m.g === 'sự đổi mới'), 'từ thừa người học dùng có nghĩa theo ngôn ngữ người học');
ok(r.rules.some(x => x.k === 'freq' && x.adv === 'often' && x.v === 'struggle'), 'luật S + often + V');
ok(r.rules.some(x => x.k === 'toinf' && x.v === 'struggle' && x.v2 === 'obtain'), 'luật struggle to + V');
ok(r.rules.some(x => x.k === 'mod' && x.a === 'bank' && x.b === 'loans'), 'luật cụm danh từ bank loans');
ok(r.noise.map(x => x.w).join() === 'employment' && r.noise[0].g === 'việc làm', 'giải thích mọi từ nhiễu chưa dùng (từ đã dùng nằm ở Lỗi của bạn, không lặp)');
ok(r.ex.length >= 1 && r.ex.length <= 2, 'có 1–2 ví dụ');
ok(r.ex.every(x => W.notSame(x, SENT)), 'ví dụ KHÔNG trùng câu bài tập');
const h = W.html(r, t, esc);
ok(/Lỗi của bạn/.test(h) && /Trật tự từ trong câu/.test(h) && /Ví dụ khác/.test(h) && !h.includes('{'), 'HTML đủ mục, không sót biến');
ok(!h.includes('<script'), 'HTML đã thoát ký tự');

// 2. Ví dụ không bao giờ trùng câu bài tập (mọi luật, mọi câu mẫu của kho luật)
for (const [k, list] of Object.entries(W.RULE_EX)) for (const s of list) {
  const ex = W.pickEx(s, [{ k }], [s, s.toUpperCase(), s.replace('.', '')]);
  ok(ex.every(x => W.notSame(x, s)), `ví dụ luật ${k} không lặp câu bài tập "${s}"`);
}
ok(!W.notSame('Young entrepreneurs often struggle to obtain bank loans!', SENT), 'gần trùng (khác dấu) cũng bị chặn');

// 3. Đúng thứ tự → không báo lỗi
const r2 = W.explain(it, it.answer.split(' '), deps);
ok(!r2.mistakes.length && r2.rules.length, 'trả lời đúng: không lỗi, vẫn có cấu trúc');

// 4. Dùng chung: điền từ / chọn đáp án / nghe-chép
const g1 = W.explain({ type: 'gap', sent: 'She decided to stay at home.', answer: 'decided', options: ['decided', 'enjoyed', 'avoided'] }, 'enjoyed', { gloss: w => ({ decided: 'quyết định', enjoyed: 'thích' })[w] || '' });
ok(g1.mistakes[0].k === 'pick' && g1.mistakes[0].g2 === 'quyết định' && g1.noise.length === 1, 'điền từ: so phương án chọn ↔ đáp án + từ nhiễu');
ok(g1.rules.some(x => x.k === 'toinf' && x.v === 'decided'), 'điền từ: luật decided to + V');
ok(g1.ex.every(x => W.notSame(x, 'She decided to stay at home.')), 'điền từ: ví dụ khác câu');
const ty = W.explain({ type: 'type', sent: 'You should drink more water.', answer: 'You should drink more water' }, 'You shuold drink water', {});
ok(ty.mistakes.some(m => m.k === 'spell' && m.r === 'should') && ty.mistakes.some(m => m.k === 'miss' && m.w === 'more'), 'nghe-chép: lỗi chính tả + từ thiếu');
ok(ty.rules.some(x => x.k === 'modal') && ty.ex.every(x => W.notSame(x, 'You should drink more water.')), 'nghe-chép: luật modal, ví dụ không phải câu bài');
const be = W.rules('They are always on time');
ok(be[0] && be[0].k === 'freqBe', 'tần suất sau be');

console.log(`\n${total - fails}/${total} lesson-why`);
process.exit(fails ? 1 : 0);
