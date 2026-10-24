// 🛡️ Cổng QA nội dung – kiểm các luật lõi (scripts/content-qa/lib.mjs) + cổng chạy thật trên repo đỏ khi gặp lỗi CỨNG.
// Chạy: node scripts/test/content-qa.mjs
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { execFileSync } from 'node:child_process';
import { pairOk, agree, trIssues, spot, cefrOver } from '../content-qa/lib.mjs';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
// ✗/✓
ok(pairOk('It depends of the situation.', 'It depends on the situation.', 'on'), '✗/✓ hợp lệ');
ok(!pairOk('It depends on it.', 'It depends on it.') && !pairOk('', 'x') && !pairOk('a b', 'A  B'), '✗/✓: giống nhau / rỗng → loại');
ok(pairOk('It is cheap, however it is risky.', 'It is cheap; however, it is risky.'), '✗/✓: sửa dấu câu vẫn hợp lệ');
ok(!pairOk('I go to home.', 'I went home.', 'to'), '✗/✓: câu đúng phải chứa cụm đích');
// 2 giám khảo
ok(agree({ j: { 'gemini:gemini-3.6-flash': 5, 'llama:llama-3.3-70b': 4 } }).ok, '2 họ mô hình cùng ≥ 4, lệch ≤ 1 → đạt');
ok(!agree({ j: { 'gemini:a': 5, 'gemini:b': 5 } }).ok, 'cùng họ Gemini 2 lần ≠ độc lập → hàng duyệt');
ok(!agree({ j: { 'gemini:a': 5, 'llama:b': 3 } }).ok && !agree({ j: { 'gemini:a': 5 } }).ok && !agree(undefined).ok, 'có điểm < 4 / chỉ 1 giám khảo / không có → hàng duyệt');
// dịch
ok(trIssues('Score {n} points in [on] time', 'Đạt {n} điểm', 'es').length >= 2, 'dịch: lẫn tiếng Việt + mất ô [đáp án] bị bắt');
ok(trIssues('You have {n} words', 'Tienes palabras', 'es').includes('mất/thừa biến {x}'), 'dịch: mất biến {n}');
ok(trIssues('The meeting starts at 9 and ends at 11.', 'The meeting starts at 9 and ends at 11.', 'ja').some(x => /chữ viết|chưa dịch/.test(x)), 'dịch: ja chép nguyên tiếng Anh → bắt');
ok(!trIssues('The meeting starts at 9.', '会議は９時に始まります。', 'ja').length, 'dịch: ja đúng chữ viết, số toàn chiều rộng vẫn khớp');
ok(trIssues('Good answer here', 'Buena respuesta', 'es', { bt: 0.6 }).includes('dịch ngược < 0.8'), 'dịch: dịch ngược < 0.8 → loại');
// kiểm mẫu ≥ 5%, sai > 2% → loại lô
ok(spot({ n: 200, checked: Array.from({ length: 10 }, () => ({ ok: true })) }).ok, 'lô 200 mục, soát 10 (5%), 0 sai → đạt');
ok(!spot({ n: 200, checked: Array.from({ length: 9 }, () => ({ ok: true })) }).ok, 'lô soát < 5% → chưa đạt');
ok(!spot({ n: 100, checked: [...Array.from({ length: 9 }, () => ({ ok: true })), { ok: false }] }).ok, 'sai 1/10 = 10% > 2% → loại lô');
// CEFR
const lex = new Map([['ubiquitous', 'C2'], ['coffee', 'A1']]);
ok(cefrOver('Coffee is ubiquitous.', 'A2', lex).join() === 'ubiquitous' && !cefrOver('Coffee please', 'A1', lex).length, 'CEFR: từ C2 trong bài A2 bị đánh dấu');
// cổng chạy thật: repo hiện tại xanh; thêm thư mục nội dung chưa đăng ký / lô thiếu kiểm mẫu → đỏ (chạy trên bản sao tạm)
const run = cwd => { try { execFileSync('node', [path.join(cwd, 'scripts/content-qa/gate.mjs')], { cwd, stdio: 'pipe' }); return ''; } catch (e) { return String(e.stdout) + String(e.stderr); } };
ok(run(process.cwd()) === '', 'cổng QA xanh trên repo hiện tại');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cqa-'));
try {
  for (const d of ['scripts', 'content', 'package.json', 'functions/api/report.js']) fs.cpSync(d, path.join(tmp, d), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'web'), { recursive: true }); fs.cpSync('web/js', path.join(tmp, 'web/js'), { recursive: true }); fs.cpSync('web/i18n', path.join(tmp, 'web/i18n'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'content/idioms-new'));
  fs.mkdirSync(path.join(tmp, 'content/qa/batches'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'content/qa/batches/t1.json'), JSON.stringify({ id: 't1', source: 'usage', n: 300, checked: [{ id: 'a', ok: true }], status: 'shipped' }));
  const out = run(tmp);
  ok(/content\/idioms-new chưa có/.test(out), 'thư mục nội dung mới chưa đăng ký → đỏ');
  ok(/t1\.json: kiểm mẫu 1\/15/.test(out), 'lô thiếu kiểm mẫu 5% mà chưa "rejected" → đỏ');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(fails ? `✗ content-qa test: ${fails}/${n} lỗi` : `✓ content-qa test: ${n} kiểm tra`); process.exit(fails ? 1 : 0);
