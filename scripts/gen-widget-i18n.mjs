// Sinh chuỗi mô tả widget (thư viện widget iOS / Android) cho 15 ngôn ngữ từ i18n sẵn có của web – không dịch lại, không lẫn tiếng.
// Chạy: node scripts/gen-widget-i18n.mjs (kết quả được commit; npm test không cần chạy lại)
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const langs = ['vi', 'en', ...fs.readFileSync(root + 'scripts/i18n-langs.txt', 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'))];
const g = { I18N_DICT: {} }; g.self = g;
for (const l of langs.filter(l => l !== 'vi')) vm.runInNewContext(fs.readFileSync(`${root}web/js/i18n/${l}.js`, 'utf8'), g);
const tr = (l, k) => (l === 'vi' ? k : (g.I18N_DICT[l] || {})[k] || g.I18N_DICT.en[k]);
const desc = l => `${tr(l, 'Thẻ đến hạn hôm nay')} · 🔥 ${tr(l, 'Chuỗi ngày')}`;
const ios = { zh: 'zh-Hans' }, android = { id: 'in' };
const xml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, "\\'").replace(/"/g, '\\"');
for (const l of langs) {
  const d = `${root}mobile/ios/App/LexkiteWidget/${ios[l] || l}.lproj`; fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(`${d}/Localizable.strings`, `/* Sinh tự động: scripts/gen-widget-i18n.mjs */\n"widget.desc" = "${desc(l).replace(/"/g, '\\"')}";\n`);
  const a = `${root}mobile/android/app/src/main/res/values${l === 'en' ? '' : '-' + (android[l] || l)}`; fs.mkdirSync(a, { recursive: true });
  fs.writeFileSync(`${a}/widget_strings.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<!-- Sinh tự động: scripts/gen-widget-i18n.mjs -->\n<resources>\n    <string name="widget_desc">${xml(desc(l))}</string>\n</resources>\n`);
}
console.log('✓ widget i18n:', langs.length, 'ngôn ngữ');
