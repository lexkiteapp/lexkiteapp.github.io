// Áp bản dịch tay của nội dung nút Lộ trình: scripts/lesson/path-i18n/<chặng>.json ({ "khóa Việt": { en, <13 ngôn ngữ> } })
//  → en vào web/js/i18n/en/pathn.js, 13 ngôn ngữ vào scripts/i18n-fixed.json (đè dịch máy). Sau đó: node scripts/i18n-fix.mjs
// Dùng: node scripts/lesson/path-i18n/apply.mjs <chặng>...
import fs from 'node:fs';
const LANGS = fs.readFileSync('scripts/i18n-langs.txt', 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
const FIX = 'scripts/i18n-fixed.json', EN = 'web/js/i18n/en/pathn.js', fixed = JSON.parse(fs.readFileSync(FIX, 'utf8'));
let en = fs.readFileSync(EN, 'utf8'), add = '';
const hasEn = k => en.includes(JSON.stringify(k) + ':'), err = [];
for (const f of process.argv.slice(2)) for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(`scripts/lesson/path-i18n/${f}.json`, 'utf8')))) {
  for (const l of ['en', ...LANGS]) if (!v[l]) err.push(`${k}: thiếu ${l}`);
  if (!hasEn(k) && !add.includes(JSON.stringify(k) + ':')) add += `${JSON.stringify(k)}: ${JSON.stringify(v.en)},\n`;
  if (!fixed[k]) fixed[k] = Object.fromEntries(LANGS.map(l => [l, v[l]]));
}
if (err.length) { console.error('✗\n ' + err.join('\n ')); process.exit(1); }
if (add) en = en.replace(/\n\}\);\n\}\)\(typeof self/, `\n${add.trimEnd()}\n});\n})(typeof self`);
fs.writeFileSync(EN, en); fs.writeFileSync(FIX, JSON.stringify(fixed, null, 2) + '\n'); console.log('✓ đã áp');
