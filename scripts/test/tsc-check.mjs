// Kiểm kiểu JSDoc phần lõi (tsconfig.check.json): một lệnh cho cả npm test (cổng PR) và ci.yml, để PR xanh thì main không đỏ vì tsc (#553). Chạy: node scripts/test/tsc-check.mjs
import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const r = spawnSync('npx', ['-y', '-p', 'typescript@5.6.3', 'tsc', '-p', 'tsconfig.check.json'], { cwd: ROOT, stdio: 'inherit' });
if (r.status !== 0) { console.error(`✗ tsc-check: đỏ (mã ${r.status ?? r.signal ?? (r.error && r.error.message)})`); process.exit(1); }
console.log('✓ tsc-check: kiểu JSDoc phần lõi đạt');
