// Landing/trang Stitch dựng lúc build (scripts/lib/st-web.mjs tr()): mọi khóa v2web có bản dịch ở nguồn i18n/ui/<lang>/v2web.js
// phải ra ĐÚNG bản dịch đó (không rơi về tiếng Anh). Gốc lỗi 05/11: gói web/js/i18n dùng khóa băm (#545) mà tr() tra khóa gốc → 13 ngôn ngữ hiện chữ Anh.
import fs from 'node:fs'; import vm from 'node:vm';
import { tr } from '../lib/st-web.mjs';
import { LANGS } from '../lib/i18n-pack.mjs';
const bad = []; let n = 0;
for (const l of LANGS.filter(x => !['vi', 'en'].includes(x))) {
  const f = `i18n/ui/${l}/v2web.js`; if (!fs.existsSync(f)) continue;
  const g = {}; vm.runInNewContext(fs.readFileSync(f, 'utf8'), { self: g }); const D = (g.I18N_DICT || {})[l] || {}, t = tr(l);
  for (const [k, v] of Object.entries(D)) { n++; if (t(k) !== v) bad.push(`${l}: "${k.slice(0, 40)}" → "${String(t(k)).slice(0, 40)}" (cần "${String(v).slice(0, 40)}")`); }
}
if (!n) { console.error('✗ st-web-i18n: không đọc được khóa nào (0 = hỏng)'); process.exit(1); }
if (bad.length) { console.error(`✗ st-web-i18n: ${bad.length}/${n} chữ Stitch web không ra bản dịch:\n  - ` + bad.slice(0, 10).join('\n  - ')); process.exit(1); }
console.log(`✓ st-web-i18n: ${n} chữ v2web ra đúng bản dịch ở 13 ngôn ngữ`);
