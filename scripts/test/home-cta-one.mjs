// Home: MỘT màu CTA chính (docs/specs/chon-cta-khu-b.md, đợt 3): nút amber F59E0B của Hôm nay / Hôm nay (máy tính) / lộ trình
// phải dùng lớp CTA chung (--cta-grad, --cta-ink, --cta-shadow) qua khối CSS có phạm vi .v2s-* (file sinh st/v2 không sửa tay).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('✗ ' + m); } else console.log('✓ ' + m); };
const css = rd('web/css/style.css');
const m = css.match(/\/\* home-cta-one \*\/([\s\S]*?)\/\* \/home-cta-one \*\//);
ok(!!m, 'style.css: có khối /* home-cta-one */');
const blk = m ? m[1] : '';
ok(/var\(--cta-grad\)/.test(blk) && /var\(--cta-ink\)/.test(blk) && /var\(--cta-shadow\)/.test(blk), 'khối dùng đúng --cta-grad/--cta-ink/--cta-shadow (không màu CTA mới)');
const decl = [...blk.matchAll(/\{([^}]*)\}/g)].map(x => x[1]).join(' ');
ok(!/#[0-9a-f]{3,6}\b/i.test(decl), 'khối không có màu hex riêng trong khai báo');
// mỗi nút amber chính của file sinh phải được khối trúng đích
const SRC = [['today', 'v2s-today'], ['today-desk', 'v2s-today-desk'], ['path', 'v2s-path']];
for (const [f, scope] of SRC) {
  const src = rd(`web/js/st/v2/${f}.js`);
  const btn = /<button\b[^>]*(\[background-color:#F59E0B\]|bg-\[#F59E0B\])[^>]*>/.test(src);
  ok(btn, `${f}.js: có nút amber chính`);
  ok(blk.includes('.' + scope + ' button'), `khối trúng .${scope} button`);
}
if (bad) { console.log(`✗ home-cta-one: ${bad} lỗi`); process.exit(1); } console.log('✓ home-cta-one');
