// Cú pháp script build (scripts/*.mjs, scripts/lib/*.mjs): một lệnh cho cả npm test (cổng PR) và ci.yml. Chạy: node scripts/test/syntax-check.mjs
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const files = ['scripts', 'scripts/lib'].flatMap(d => fs.readdirSync(path.join(ROOT, d)).filter(f => f.endsWith('.mjs')).map(f => path.join(ROOT, d, f)));
if (!files.length) { console.error('✗ syntax-check: không thấy file nào'); process.exit(1); }
const bad = files.filter(f => spawnSync(process.execPath, ['--check', f], { stdio: 'inherit' }).status !== 0);
if (bad.length) { console.error(`✗ syntax-check: ${bad.length} file lỗi cú pháp`); process.exit(1); }
console.log(`✓ syntax-check: ${files.length} file đạt`);
