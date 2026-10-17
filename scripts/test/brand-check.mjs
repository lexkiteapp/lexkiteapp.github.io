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
for (const f of ['scripts/build-blog.mjs', 'scripts/build-samples.mjs', 'scripts/build-samples-en.mjs', 'scripts/lib/samples-ui.mjs', 'scripts/build-landing.mjs']) {
  const src = fs.readFileSync(f, 'utf8');
  if (/#5b4cf0/i.test(src)) errs.push(`${f}: tím cũ #5b4cf0`);
  errs.push(...off(src.replace(/&#x?[0-9a-f]+;/gi, ''), f));
}
// HTML đã dựng (nếu dist/ mới hơn bộ dựng – dist cũ của lần build trước thì bỏ qua, CI dựng lại trước khi test)
const DIRS = ['samples', 'speaking', 'tu-vung', 'ngu-phap', 'viet-thu', 'en/samples', 'en/speaking', 'en/vocabulary'].map(d => path.join('dist', d));
const srcT = Math.max(...['scripts/lib/site-layout.mjs', 'scripts/lib/samples-ui.mjs', 'scripts/build-samples.mjs', 'scripts/build-samples-en.mjs'].map(f => fs.statSync(f).mtimeMs));
let scanned = 0;
for (const d of DIRS) {
  if (!fs.existsSync(d) || fs.statSync(path.join(d, 'index.html')).mtimeMs < srcT) continue;
  for (const f of fs.readdirSync(d).filter(f => f.endsWith('.html'))) {
    const h = fs.readFileSync(path.join(d, f), 'utf8'); scanned++;
    if (/#5b4cf0/i.test(h)) errs.push(`${d}/${f}: tím cũ #5b4cf0`);
    errs.push(...off(h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '').replace(/&#x?[0-9a-f]+;/gi, ''), `${d}/${f}`));
  }
}
// Trang giới thiệu đã dựng (web/index.html + web/<lang>/index.html) – Kit SVG lấy từ kit.js (nguồn chuẩn) nên bỏ qua khi quét
for (const f of ['web/index.html', ...fs.readdirSync('web').filter(d => /^[a-z]{2}$/.test(d) && fs.existsSync(`web/${d}/index.html`)).map(d => `web/${d}/index.html`)]) {
  const h = fs.readFileSync(f, 'utf8').replace(/<span class="kit">[\s\S]*?<\/svg><\/span>/, '').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  errs.push(...off(h, f)); scanned++;
}
if (errs.length) { console.error('✗ brand-check: màu ngoài token thương hiệu ở trang tĩnh:\n  - ' + errs.slice(0, 20).join('\n  - ') + '\n  → chỉ dùng biến/token trong scripts/lib/site-layout.mjs (docs/BRAND-RULES.md)'); process.exit(1); }
console.log(`✓ brand-check: trang tĩnh chỉ dùng màu token (${allowed.size} màu; ${scanned ? scanned + ' trang dist đã quét' : 'dist chưa dựng/cũ – chỉ kiểm nguồn'})`);

// ---- Nhãn hiệu "Lexkite™" (docs/BRAND-RULES.md § Nhãn hiệu): chân trang 15 ngôn ngữ + điều khoản; không đổi logo/wordmark, không ™ trong <title>, không ® ----
const { TM_NOTE, TM_OWNER, LANG_NAMES, siteFooter } = await import('../lib/site-layout.mjs');
const tmErr = [];
for (const l of Object.keys(LANG_NAMES)) {
  const n = TM_NOTE[l];
  if (!n || !n.includes('Lexkite™') || !n.includes(TM_OWNER) || n.includes('®')) tmErr.push(`TM_NOTE.${l} thiếu/sai`);
  else if (l !== 'en' && n === TM_NOTE.en) tmErr.push(`TM_NOTE.${l} chưa dịch`);
  const f = siteFooter({ lang: l, text: 'Lexkite – x' });
  if (!f.includes(n) || !f.includes('<p>Lexkite™ – x</p>')) tmErr.push(`siteFooter(${l}) thiếu dòng nhãn hiệu`);
}
for (const f of ['web/index.html', ...Object.keys(LANG_NAMES).filter(l => l !== 'vi').map(l => `web/${l}/index.html`)]) {
  if (!fs.existsSync(f)) continue;
  const h = fs.readFileSync(f, 'utf8'), l = f === 'web/index.html' ? 'vi' : f.split('/')[1];
  if (!h.includes(TM_NOTE[l])) tmErr.push(`${f}: chân trang thiếu "${TM_NOTE[l]}" (chạy node scripts/build-landing.mjs)`);
  if (/<title>[^<]*[™®]/.test(h)) tmErr.push(`${f}: không gắn ™/® trong <title>`);
  if (/lex<b>kite<\/b>[™®]|lex<b>kite[™®]/.test(h)) tmErr.push(`${f}: không gắn ™ vào wordmark/logo`);
}
for (const l of ['en', 'vi']) {
  const src = fs.readFileSync(`content/legal/${l}/terms.html`, 'utf8');
  if (!/<p id="trademarks">[^\n]*MODIAN LUXURY JEWELRY LLC/.test(src) || !/^<p>Lexkite™ /m.test(src)) tmErr.push(`content/legal/${l}/terms.html: thiếu điều khoản nhãn hiệu #trademarks / "Lexkite™" lần nhắc đầu`);
  if (!fs.readFileSync(`web/${l}/terms.html`, 'utf8').includes('id="trademarks"')) tmErr.push(`web/${l}/terms.html chưa dựng lại (node scripts/build-legal.mjs)`);
}
if ((fs.readFileSync('web/js/app.js', 'utf8').match(/t\('Lexkite™ là nhãn hiệu của \{owner\}\.'/g) || []).length < 2) tmErr.push('web/js/app.js: chân trang chào mừng thiếu dòng nhãn hiệu');
if (tmErr.length) { console.error('✗ brand-check (nhãn hiệu):\n  - ' + tmErr.join('\n  - ')); process.exit(1); }
console.log(`✓ brand-check: Lexkite™ ở chân trang ${Object.keys(TM_NOTE).length} ngôn ngữ + điều khoản (logo/wordmark/<title> không đổi)`);
