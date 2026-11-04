// Khoá nhanh (không trình duyệt) phần tĩnh của cuộn mượt – docs/PERF-SCROLL.md; số đo thật ở scroll-perf.yml.
//  1) khung đặt trước lần vẽ đầu (app/index.html) cùng danh sách màn với ExitGuard và app.js (lệch = xô bố cục khi tải lại)
//  2) content-visibility chỉ trong @supports (overflow-anchor) (Safari không có scroll anchoring → cả trang nhảy khi cuộn)
//  3) không scroll-behavior:smooth toàn trang; có scrollRestoration thủ công; hiệu ứng vô hạn không animate left/top/width/height
import fs from 'node:fs';
const read = f => fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const html = read('web/app/index.html'), eg = read('web/js/exit-guard.js'), app = read('web/js/app.js'), css = read('web/css/style.css');
const boot = (html.match(/<body>\s*<script>([\s\S]*?)<\/script>/) || [])[1] || '';
ok(boot, 'app/index.html: thiếu script khung đặt trước ngay sau <body>');
const list = n => (eg.match(new RegExp(`const ${n} = \\[([^\\]]*)\\]`)) || [, ''])[1].match(/'[^']+'/g).map(x => x.slice(1, -1));
for (const n of list('ALWAYS')) ok(new RegExp(`'[^']*\\b${n}\\b[^']*'`).test(boot), `khung đặt trước thiếu màn học ${n} (ExitGuard.ALWAYS)`);
for (const n of list('WITH_ARG')) ok(new RegExp(`'[^']*\\b${n}\\b[^']*'`).test(boot), `khung đặt trước thiếu màn học ${n} (ExitGuard.WITH_ARG)`);
const v2 = (app.match(/V2_ROUTES = new Set\(\[([^\]]*)\]/) || [, ''])[1].match(/'[^']+'/g) || [];
ok(v2.length, 'app.js: thiếu V2_ROUTES');
const bootV2 = (boot.match(/\(H\|\|I\('([^']*)',n\)/) || [, ''])[1].split(' ').sort().join(' ');
ok(bootV2 === v2.map(x => x.slice(1, -1)).sort().join(' '), `V2_ROUTES (app.js) lệch khung đặt trước: ${bootV2}`);
for (const k of ['lk.ux1.pv', 'lk.ux1c']) ok(boot.includes(k) && app.includes(k), `cờ ux1 trong khung đặt trước phải cùng nguồn với app.js: ${k}`);
// 2) content-visibility
const noSup = css.replace(/@supports \(overflow-anchor: auto\) \{[\s\S]*?\n\}/g, '');
ok(css.includes('@supports (overflow-anchor: auto)'), 'style.css: content-visibility phải nằm trong @supports (overflow-anchor: auto)');
ok(!/^[^/]*content-visibility:\s*auto/m.test(noSup), 'style.css: có content-visibility ngoài @supports (overflow-anchor)');
// 3) quy tắc cuộn
ok(!/(^|[\s,}])html[^{}]*\{[^}]*scroll-behavior:\s*smooth/.test(css), 'style.css: cấm scroll-behavior:smooth trên html');
ok(/history\.scrollRestoration = 'manual'/.test(app), "app.js: cần history.scrollRestoration = 'manual'");
for (const f of ['web/css/style.css', 'web/js/streak-ui.js', 'web/js/st/v2/runtime.js']) for (const m of read(f).matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/g)) {
  const inf = new RegExp(`animation:[^;}]*\\b${m[1]}\\b[^;}]*infinite|animation:[^;}]*infinite[^;}]*\\b${m[1]}\\b`).test(read(f));
  if (inf && /(^|[{;\s])(left|top|right|bottom|width|height|margin[\w-]*|padding[\w-]*)\s*:/.test(m[2])) fails.push(`${f}: hiệu ứng vô hạn ${m[1]} animate thuộc tính gây layout`);
}
if (fails.length) { console.error('✗ scroll-boot:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log('✓ scroll-boot: khung đặt trước khớp danh sách màn, content-visibility an toàn, quy tắc cuộn đạt');
