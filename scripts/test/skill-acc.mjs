// Test (node) web/js/skill-acc.js: nhóm kỹ năng, EWMA, ngưỡng mẫu, câu gặp lại không ghi, lời khuyên 'ease', kill switch.
import fs from 'node:fs';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const store = {}; const g = { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } } };
new Function('self', fs.readFileSync('web/js/skill-acc.js', 'utf8'))(g);
const S = g.SkillAcc;
ok(S.group('mcq-vi') === 'recog' && S.group('type-cloze') === 'produce' && S.group('build') === 'produce' && S.group('dict') === 'listen' && S.group('say') === 'speak' && S.group('pic') === 'recog', 'nhóm kỹ năng');
ok(S.get('produce') === null && S.advice() === 'ok', 'chưa có mẫu → null/ok');
for (let i = 0; i < 9; i++) S.rec('type', false, 0);
ok(S.get('produce') === null, '9 mẫu < 10 → chưa đủ');
S.rec('type', false, 0);
ok(S.get('produce').n === 10 && S.get('produce').p < 0.5 && S.advice() === 'ease', '10 câu gõ sai → ease');
S.rec('type', true, 1); ok(S.get('produce').n === 10, 'câu gặp lại (retry>0) không ghi');
for (let i = 0; i < 20; i++) S.rec('type', true, 0);
ok(S.get('produce').p > 0.5 && S.advice() === 'ok', 'khá lên → về ok');
ok(S.get('recog') === null, 'nhóm khác độc lập');
store['vb.noSkillAcc'] = '1'; S.rec('type', false, 0); ok(S.get('produce') === null && S.advice() === 'ok', 'kill switch');
console.log(fails ? `✗ ${fails}/${n}` : `✓ skill-acc ${n} kiểm tra`); process.exit(fails ? 1 : 0);
