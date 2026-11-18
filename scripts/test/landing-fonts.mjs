// Trang giới thiệu: CSS nội tuyến chỉ được bỏ mặt phông Plus Jakarta Sans (latin-ext, vietnamese) khi KHÔNG ký tự hiển thị nào của trang nằm trong unicode-range của nó
// (menu ẩn tính riêng: tải lười từ CSS ngoài). Thiếu ký tự → giữ mặt đó nội tuyến (tr cần ğ ş ı İ; vi cần chữ Việt).
import fs from 'node:fs';
import { LANGS, fileOf, pageText } from '../build-landing.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { console.error('✗ ' + m); bad++; } };
const FACE = /@font-face\{font-family:"Plus Jakarta Sans";[^}]*\}/g, rng = f => /unicode-range:([^;}]+)/.exec(f)?.[1].split(',').map(x => x.trim().replace(/^U\+/i, '').split('-').map(h => parseInt(h, 16))) || [[0, 0x10ffff]];
for (const l of LANGS) {
  const html = fs.readFileSync(fileOf(l), 'utf8'), text = pageText(html), inline = new Set(html.match(FACE) || []), full = fs.readFileSync(`web/css/home-${l}.css`, 'utf8').match(FACE) || [];
  ok(full.length === 3, `${l}: CSS ngoài phải giữ đủ 3 mặt phông Plus Jakarta Sans (có ${full.length})`);
  for (const f of full) if (!inline.has(f)) for (const ch of text) { const c = ch.codePointAt(0); ok(!rng(f).some(([a, b]) => c >= a && c <= (b ?? a)), `${l}: ký tự "${ch}" (U+${c.toString(16)}) nằm trong mặt phông đã bỏ khỏi CSS nội tuyến`); }
}
// Bớt byte CSS nội tuyến phải không đổi hiển thị: không còn var(--tw-*-opacity,1) thừa, biến --tw-* còn khai báo thì còn chỗ dùng; CSS ngoài vẫn giữ bản đủ
for (const l of LANGS) {
  const css = [...fs.readFileSync(fileOf(l), 'utf8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join(''), full = fs.readFileSync(`web/css/home-${l}.css`, 'utf8');
  ok(!/var\(--tw-(?:bg|text|border|ring)-opacity/.test(css), `${l}: CSS nội tuyến còn var(--tw-…-opacity) thừa`);
  for (const d of css.match(/\*,:after,:before\{[^}]*\}/)?.[0].matchAll(/(--tw-[a-z0-9-]+):/g) || []) ok(css.includes('var(' + d[1]), `${l}: ${d[1]} khai báo nội tuyến mà không dùng`);
  ok(/var\(--tw-text-opacity,1\)/.test(full), `${l}: CSS ngoài phải giữ bản đủ (có --tw-text-opacity)`);
  ok(!/-webkit-font-feature-settings/.test(css) && /font-feature-settings:"liga"/.test(css), `${l}: font-feature-settings không tiền tố phải còn`);
}
const tr = fs.readFileSync(fileOf('tr'), 'utf8'); ok(/U\+0100-/.test(tr.match(FACE).join('')), 'tr: phải giữ mặt latin-ext nội tuyến (ğ ş ı İ)');
if (bad) process.exit(1); console.log(`✓ landing-fonts: ${LANGS.length} trang, mặt phông bỏ khỏi CSS nội tuyến không che ký tự nào của trang`);
