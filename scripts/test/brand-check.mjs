// 🎨 Chặn dùng lại màu Kit cũ đã bỏ (lưng xanh dương #2F62C0 / #244E9E) – Kit chỉ lấy từ web/js/kit.js (docs/BRAND-RULES.md)
// + Trang tĩnh SEO/blog: chỉ màu token thương hiệu (web/css/style.css :root, docs/BRAND-RULES.md, EXTRA_TOKENS của scripts/lib/site-layout.mjs);
//   cấm tím cũ #5b4cf0 của trang mẫu đời đầu.
import fs from 'fs';
import path from 'path';
const OLD = /#(2F62C0|244E9E)\b/i, bad = [];
const walk = d => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!/^(node_modules|\.git|app)$/.test(e.name)) walk(p); } else if (/\.(svg|html|css|js|mjs|json)$/.test(e.name) && OLD.test(fs.readFileSync(p, 'utf8'))) bad.push(p); } };
['brand', 'web', 'store', 'extension', 'mobile/www', 'scripts'].forEach(walk);
const me = 'scripts/test/brand-check.mjs', list = bad.filter(p => p !== me);
if (list.length) { console.error('✗ brand-check: màu Kit cũ (#2F62C0/#244E9E) còn ở:\n  - ' + list.join('\n  - ') + '\n  → dùng Kit.svg() từ web/js/kit.js (docs/BRAND-RULES.md)'); process.exit(1); }
console.log('✓ brand-check: không còn Kit màu cũ – nguồn Kit duy nhất web/js/kit.js');

// ---- Màu trang tĩnh (blog + /tu-vung/, /ngu-phap/, /samples/, /speaking/, /viet-thu/, /en/…) ----
const HEX = /#[0-9a-f]{3}(?:[0-9a-f]{3})?\b/gi;
const norm = h => { h = h.toLowerCase(); return h.length === 4 ? '#' + [...h.slice(1)].map(c => c + c).join('') : h; };
const css = fs.readFileSync('web/css/style.css', 'utf8'), rootEnd = css.indexOf('}', css.indexOf(':root[data-theme="dark"] {')); // các khối token :root (sáng + tối) ở đầu file
const { CSS, SEO_CSS, EXTRA_TOKENS } = await import('../lib/site-layout.mjs');
const allowed = new Set([...(css.slice(0, rootEnd).match(HEX) || []), ...(fs.readFileSync('docs/BRAND-RULES.md', 'utf8').match(HEX) || []).filter(h => !OLD.test(h)), ...EXTRA_TOKENS].map(norm));
const off = (txt, where) => { const o = [...new Set((txt.match(HEX) || []).map(norm))].filter(h => !allowed.has(h)); return o.length ? [`${where}: ${o.join(' ')}`] : []; };
const errs = [...off(CSS + SEO_CSS, 'scripts/lib/site-layout.mjs (CSS)')];
for (const f of ['scripts/build-blog.mjs', 'scripts/build-samples.mjs', 'scripts/build-samples-en.mjs']) {
  const src = fs.readFileSync(f, 'utf8');
  if (/#5b4cf0/i.test(src)) errs.push(`${f}: tím cũ #5b4cf0`);
  errs.push(...off(src.replace(/&#x?[0-9a-f]+;/gi, ''), f));
}
// HTML đã dựng (nếu dist/ mới hơn bộ dựng – dist cũ của lần build trước thì bỏ qua, CI dựng lại trước khi test)
const DIRS = ['samples', 'speaking', 'tu-vung', 'ngu-phap', 'viet-thu', 'en/samples', 'en/speaking', 'en/vocabulary'].map(d => path.join('dist', d));
const srcT = Math.max(...['scripts/lib/site-layout.mjs', 'scripts/build-samples.mjs', 'scripts/build-samples-en.mjs'].map(f => fs.statSync(f).mtimeMs));
let scanned = 0;
for (const d of DIRS) {
  if (!fs.existsSync(d) || fs.statSync(path.join(d, 'index.html')).mtimeMs < srcT) continue;
  for (const f of fs.readdirSync(d).filter(f => f.endsWith('.html'))) {
    const h = fs.readFileSync(path.join(d, f), 'utf8'); scanned++;
    if (/#5b4cf0/i.test(h)) errs.push(`${d}/${f}: tím cũ #5b4cf0`);
    errs.push(...off(h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '').replace(/&#x?[0-9a-f]+;/gi, ''), `${d}/${f}`));
  }
}
if (errs.length) { console.error('✗ brand-check: màu ngoài token thương hiệu ở trang tĩnh:\n  - ' + errs.slice(0, 20).join('\n  - ') + '\n  → chỉ dùng biến/token trong scripts/lib/site-layout.mjs (docs/BRAND-RULES.md)'); process.exit(1); }
console.log(`✓ brand-check: trang tĩnh chỉ dùng màu token (${allowed.size} màu; ${scanned ? scanned + ' trang dist đã quét' : 'dist chưa dựng/cũ – chỉ kiểm nguồn'})`);
