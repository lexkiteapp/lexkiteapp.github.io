// Font tự lưu trữ (scripts/build-fonts.mjs, docs/PERF-SCROLL.md việc 3): app/add-on không gọi fonts.googleapis/gstatic,
// khối <!--fonts--> khớp web/fonts/fonts.json, preload ĐÚNG 1 font (chữ LCP 400 latin, có crossorigin – thiếu là tải 2 lần),
// mảnh latin+latin-ext+vietnamese phủ mọi chữ Latin trong bản dịch của 15 ngôn ngữ, add-on chép web/fonts (url(../fonts/…) không 404).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { block, PRELOAD, SUBSETS } from '../build-fonts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const bad = [], ok = (c, m) => { if (!c) bad.push(m); };
const { faces } = JSON.parse(rd('web/fonts/fonts.json'));
const html = rd('web/app/index.html'), head = html.slice(0, html.indexOf('</head>'));

// 1) không còn Google Fonts trong app + add-on; khối dựng khớp fonts.json
for (const p of ['web/app/index.html', 'extension/app/index.html']) ok(!/fonts\.(googleapis|gstatic)\.com/.test(rd(p)), `${p}: còn tải font từ Google (thêm 2 kết nối trên 4G)`);
ok(html.includes(block(faces)), 'khối <!--fonts--> lệch web/fonts/fonts.json → chạy node scripts/build-fonts.mjs');

// 2) file font có thật, đúng woff2, gọn
for (const f of faces) {
  const p = path.join(ROOT, 'web/fonts', f.file);
  if (!fs.existsSync(p)) { bad.push('thiếu ' + f.file); continue; }
  const b = fs.readFileSync(p);
  ok(b.subarray(0, 4).toString() === 'wOF2', f.file + ' không phải woff2');
  ok(b.length < 60 * 1024, `${f.file} ${b.length} B > 60 KB (mảnh phải cắt gọn)`);
  ok(f.family !== 'Be Vietnam Pro' || f.display === 'swap', `${f.file}: chữ thân phải font-display:swap (không chặn chữ)`);
}

// 3) preload ĐÚNG 1 font: không link tĩnh (ux1 sẽ tải cả 2); script đầu <head> chọn pjs (ux1) HOẶC PRELOAD (mặc định), cùng hàm a() đặt crossOrigin+type
const pre = [...head.matchAll(/<link\b[^>]*rel="preload"[^>]*>/g)].map(m => m[0]).filter(l => /as="font"/.test(l));
ok(!pre.length, `preload font tĩnh trong <head>: ${pre.length} (để script chọn đúng 1 theo giao diện)`);
const sc = (/<script>\/\* Preload ĐÚNG 1 font[\s\S]*?<\/script>/.exec(head) || [''])[0];
ok(/l\.type='font\/woff2';l\.crossOrigin=''/.test(sc), 'preload font thiếu crossorigin/type → trình duyệt tải 2 lần');
ok(/\{a\('preload','fonts\/pjs-latin\.woff2','font'\);[^}]*\}else a\('preload','fonts\/bvp-400-latin\.woff2','font'\)/.test(sc) && sc.includes(`'${PRELOAD}'`), 'script preload phải là if(ux1) pjs-latin else ' + PRELOAD + ' (đúng 1 font)');
ok((sc.match(/,'font'\)/g) || []).length === 3, 'script preload: chỉ 2 nhánh pjs/bvp (+ catch bvp)');
const f0 = faces.find(x => 'fonts/' + x.file === PRELOAD);
ok(f0 && f0.weight === '400' && f0.style === 'normal' && f0.file.endsWith('-latin.woff2'), 'font preload phải là mặt 400 thường, mảnh latin');

// 4) mỗi mặt chữ thân đủ 3 mảnh; mảnh phủ mọi chữ Latin trong bản dịch 15 ngôn ngữ
const key = f => `${f.family}|${f.style}|${f.weight}`, groups = {};
for (const f of faces) (groups[key(f)] ||= []).push(f);
for (const [k, g] of Object.entries(groups)) ok(SUBSETS.every(s => g.some(f => f.file.endsWith(`-${s}.woff2`))), `${k}: thiếu mảnh (${g.map(f => f.file)})`);
const ranges = groups['Be Vietnam Pro|normal|400'].flatMap(f => f.range.split(',').map(r => r.trim().replace('U+', '').split('-').map(h => parseInt(h, 16))));
const covered = c => ranges.some(([a, b = a]) => c >= a && c <= b);
const LATIN = c => (c >= 0x20 && c <= 0x24f) || (c >= 0x1e00 && c <= 0x1eff); // ar/hi/ja/ko/ru/th/zh: chữ riêng → font hệ thống trong --font
const langs = fs.readdirSync(path.join(ROOT, 'web/js/i18n')).filter(f => /^[a-z]{2}\.js$/.test(f));
ok(langs.length >= 14, `chỉ thấy ${langs.length} file bản dịch`);
const miss = new Map();
for (const f of [...langs, '../app.js']) for (const ch of rd('web/js/i18n/' + f)) { const c = ch.codePointAt(0); if (LATIN(c) && !covered(c)) miss.set(ch, f); }
ok(!miss.size, 'ký tự Latin không có trong mảnh font: ' + [...miss].slice(0, 12).map(([c, f]) => `${c} (U+${c.codePointAt(0).toString(16)}, ${f})`).join(' '));

// 5) add-on chép web/fonts → url(../fonts/…) trong CSS dùng chung không 404
ok(/"\$ROOT\/web\/fonts"/.test(rd('scripts/build-extension.sh')), 'build-extension.sh không chép web/fonts');
for (const c of fs.readdirSync(path.join(ROOT, 'web/css')).filter(f => f.endsWith('.css')))
  for (const m of rd('web/css/' + c).matchAll(/url\(["']?\.\.\/fonts\/([^"')]+)/g)) ok(fs.existsSync(path.join(ROOT, 'web/fonts', m[1])), `${c}: thiếu web/fonts/${m[1]}`);

if (bad.length) { console.error('✗ self-fonts:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log(`✓ self-fonts: ${faces.length} mặt tự lưu trữ, preload đúng 1 (ux1 pjs / mặc định ${PRELOAD}), phủ chữ Latin của ${langs.length} bản dịch, add-on có font`);
