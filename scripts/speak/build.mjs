#!/usr/bin/env node
// 🎙️ Play & Speak – content/situations/*.json (MỘT nguồn, cổng scripts/test/situations.mjs) → web/js/speak/data.js (gói lười 'speak').
//   node scripts/speak/build.mjs           kiểm bản sinh khớp nguồn (npm test / prepush)
//   node scripts/speak/build.mjs --write   sinh lại
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), SRC = path.join(ROOT, 'content/situations'), OUT = path.join(ROOT, 'web/js/speak/data.js');
const all = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'))) : [];
const js = `/* TỰ SINH bởi scripts/speak/build.mjs từ content/situations/*.json – KHÔNG sửa tay. */\n(self.SPK || (self.SPK = {})) && Object.assign(self.SPK, ${JSON.stringify(Object.fromEntries(all.map(s => [s.id, s])))});\n`;
if (process.argv.includes('--write')) { fs.writeFileSync(OUT, js); console.log(`speak/build: ${all.length} tình huống → ${path.relative(ROOT, OUT)} (${(js.length / 1024).toFixed(1)} KB)`); }
else if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== js) { console.error('✗ speak/build: web/js/speak/data.js trôi so với content/situations → node scripts/speak/build.mjs --write'); process.exit(1); }
else console.log(`speak/build: ${all.length} ok`);
