// Hàm thoát HTML `esc` chỉ định nghĩa MỘT lần (web/js/ui.js → UI.esc); các tệp khác ủy quyền `const esc = s => UI.esc(s)` (mỗi bản chép tốn ~130 B byte người học – size-budget).
// Khóa: (1) hành vi UI.esc đúng với ca nguy hiểm; (2) không tệp nào (trừ quản trị/i18n/bản khác nghĩa) chép lại bảng thoát; (3) các tệp đã gộp thật sự gọi UI.esc.
import fs from 'node:fs'; import path from 'node:path';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const ui = fs.readFileSync('web/js/ui.js', 'utf8'), def = ui.match(/^\s*const esc = .*$/m);
ok(def, 'ui.js định nghĩa esc'); const esc = new Function(`${def[0].replace(/^\s*const esc =/, 'return')}`)();
ok(esc(`<a href="x" onclick='y'>&</a>`) === '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;', 'UI.esc thoát < > " \' &');
ok(esc(null) === '' && esc(undefined) === '' && esc(0) === '0', 'UI.esc: null/undefined → rỗng, 0 giữ nguyên');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (/i18n|node_modules/.test(e.name) ? [] : walk(path.join(d, e.name))) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
let n = 0;
for (const f of walk('web/js')) {
  if (f === 'web/js/ui.js' || /\/admin|\/explain-card\.js|\/lexis\.js|\/qtips\.js|\/qengine\.js|\/lesson-fx\.js|\/wordcard\.js|\/report\.js|\/tools\/|\/anki\.js|\/vocab-img\.js/.test(f)) continue; // tools/*: trang độc lập không nạp ui.js · explain-card/lexis/qtips/qengine/lesson-fx/wordcard/report: test + script dựng (scripts/native, dict/build) nạp riêng không có ui.js không nạp ui.js · anki/vocab-img: bản khác nghĩa (không thoát ', không String(null))
  const s = fs.readFileSync(f, 'utf8');
  ok(!/\{ '&': '&amp;', '<': '&lt;'/.test(s), `${f}: chép lại bảng thoát HTML → dùng UI.esc`);
  n += (s.match(/const esc = \w+ => UI\.esc\(\w+\)/g) || []).length;
}
ok(n >= 6, `≥6 tệp ủy quyền UI.esc (đang ${n})`);
console.log(fails ? `✗ esc-dedupe: ${fails} lỗi` : `✓ esc-dedupe: UI.esc là bản duy nhất, ${n} tệp ủy quyền`); process.exit(fails ? 1 : 0);
