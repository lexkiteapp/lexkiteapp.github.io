// Bảo vệ scripts/test/suite.txt (danh sách `npm test`): không dòng trùng, mọi file được nhắc tới tồn tại, package.json "test" chỉ gọi run-suite,
// .gitattributes giữ merge=union. Cuối: liệt kê (chỉ báo, không đỏ) các scripts/test/*.mjs chưa có trong suite – có thể đang chạy ở chỗ khác.
import fs from 'node:fs'; import path from 'node:path'; import { readSuite, SUITE } from './run-suite.mjs';
const ROOT = path.resolve(path.dirname(SUITE), '../..'), rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const cmds = readSuite(), seen = new Map(), dups = [];
for (const c of cmds) { if (seen.has(c)) dups.push(c); seen.set(c, 1); }
ok(cmds.length > 100, `suite.txt có ${cmds.length} lệnh`);
ok(!dups.length, `suite.txt không có dòng trùng${dups.length ? ': ' + dups.join(' | ') : ''}`);
const refs = [...new Set(cmds.flatMap(c => c.match(/(?:^|\s)((?:scripts|tools|functions|web)\/[\w./-]+\.(?:m?js|cjs|sh|py))\b/g) || []).map(s => s.trim()))];
const missing = refs.filter(f => !fs.existsSync(path.join(ROOT, f)));
ok(!missing.length, `mọi file trong suite.txt tồn tại (${refs.length} file)${missing.length ? ' – thiếu: ' + missing.join(', ') : ''}`);
ok(cmds.every(c => /^!?\s*node\s/.test(c)), 'mọi lệnh trong suite.txt là `node …` (hoặc `! node …`)');
const pkg = JSON.parse(rd('package.json'));
ok(pkg.scripts.test === 'node scripts/test/run-suite.mjs', 'package.json "test" chỉ gọi node scripts/test/run-suite.mjs (thêm test vào suite.txt, không vào package.json)');
ok(/^scripts\/test\/suite\.txt\s+merge=union\s*$/m.test(fs.existsSync(path.join(ROOT, '.gitattributes')) ? rd('.gitattributes') : ''), '.gitattributes: scripts/test/suite.txt merge=union');
ok(cmds.includes('node scripts/test/suite-guard.mjs'), 'suite-guard nằm trong suite.txt');
const all = fs.readdirSync(path.join(ROOT, 'scripts/test')).filter(f => f.endsWith('.mjs') && !/^(run-suite|suite-guard)\.mjs$/.test(f));
const txt = cmds.join('\n'), out = all.filter(f => !txt.includes('scripts/test/' + f));
if (out.length) console.log(`ℹ ${out.length} scripts/test/*.mjs chưa có trong suite.txt (chạy ở npm script/workflow riêng hoặc được test khác gọi – xem trước khi thêm): ${out.join(', ')}`);
if (bad) { console.error(`✗ suite-guard: ${bad} lỗi`); process.exit(1); }
console.log('✓ suite-guard xanh');
