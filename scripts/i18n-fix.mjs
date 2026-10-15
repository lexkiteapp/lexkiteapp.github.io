// Áp bản dịch tay (scripts/i18n-fixed.json) đè lên bản dịch máy trong web/js/i18n/<lang>.js – nhãn ngắn không bị sai nghĩa
import fs from 'fs';
const fixed = JSON.parse(fs.readFileSync(new URL('./i18n-fixed.json', import.meta.url)));
let n = 0;
for (const lang of ['es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr']) {
  const f = new URL(`../web/js/i18n/${lang}.js`, import.meta.url); if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8');
  for (const [k, tr] of Object.entries(fixed)) {
    if (k.startsWith('_') || !tr[lang]) continue;
    const key = JSON.stringify(k), val = JSON.stringify(tr[lang]);
    const re = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':"(?:[^"\\\\]|\\\\.)*"');
    if (re.test(s)) { const before = s; s = s.replace(re, key + ':' + val); if (s !== before) n++; }
    else { s = s.replace(/(D\[["']?[a-z]{2}["']?\]\s*=\s*Object\.assign\([^,]+,\s*\{)/, `$1${key}:${val},`); n++; }
  }
  fs.writeFileSync(f, s);
}
console.log('✓ i18n-fix: ' + n + ' nhãn đã áp bản dịch tay');
