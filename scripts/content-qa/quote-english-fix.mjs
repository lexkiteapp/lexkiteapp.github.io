#!/usr/bin/env node
// Sửa kho dịch nội dung web/i18n/content/<lang>.json: khôi phục ví dụ tiếng Anh trong ngoặc bị dịch mất (docs/research/lesson-qa-1511.md).
// Dùng: node scripts/content-qa/quote-english-fix.mjs [--write] [--json]   (không --write = chỉ đếm)
import fs from 'node:fs';
import { restore } from '../lib/quote-english.mjs';
const LANGS = fs.readFileSync('scripts/i18n-langs.txt', 'utf8').split(/\s+/).filter(l => l && l !== 'en' && l !== 'vi');
const write = process.argv.includes('--write'); const rep = {};
for (const l of LANGS) {
  const f = `web/i18n/content/${l}.json`; if (!fs.existsSync(f)) continue;
  const c = JSON.parse(fs.readFileSync(f, 'utf8')); let fixed = 0, left = 0, total = 0;
  for (const [k, v] of Object.entries(c)) {
    if (typeof v !== 'string') continue;
    const r = restore(k, v);
    if (r.changed) { fixed++; c[k] = r.text; }
    if (!r.ok) left++;
  }
  rep[l] = { fixed, left };
  if (write && fixed) fs.writeFileSync(f, JSON.stringify(c));
}
console.log(JSON.stringify(rep));
