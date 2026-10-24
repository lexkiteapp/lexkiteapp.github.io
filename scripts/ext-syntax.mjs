// node --check cho mọi extension/**/*.js: lỗi cú pháp không bao giờ lọt vào main nữa
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
const walk = d => readdirSync(d).flatMap(f => { if (f === 'node_modules') return []; const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });
let bad = 0;
for (const f of walk('extension')) { const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' }); if (r.status) { bad++; console.error('SYNTAX ERROR ' + f + '\n' + r.stderr); } }
if (bad) process.exit(1);
console.log('ext-syntax OK');
