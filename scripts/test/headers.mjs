// 🔒 Kiểm web/_headers (Cloudflare Pages): mỗi đường dẫn chỉ khai 1 lần (khai trùng → Pages chỉ giữ khối cuối, header bảo mật mất âm thầm – lỗi live trước 17/10/2026)
// và khối /* có đủ header bảo mật bắt buộc. Chạy: node scripts/test/headers.mjs
import fs from 'fs';
const src = fs.readFileSync(new URL('../../web/_headers', import.meta.url), 'utf8');
const rules = new Map(); let cur = null; const errs = [];
for (const raw of src.split('\n')) {
  const line = raw.replace(/\s+$/, '');
  if (!line || line.trimStart().startsWith('#')) continue;
  if (!/^\s/.test(line)) { if (rules.has(line)) errs.push(`đường dẫn khai trùng: ${line}`); cur = []; rules.set(line, cur); continue; }
  if (!cur) { errs.push(`header ngoài khối: ${line.trim()}`); continue; }
  const t = line.trim();
  if (t.startsWith('! ')) { cur.push(['!', t.slice(2).toLowerCase()]); continue; }
  const i = t.indexOf(':'); if (i < 1) { errs.push(`dòng sai cú pháp: ${t}`); continue; }
  cur.push([t.slice(0, i).toLowerCase(), t.slice(i + 1).trim()]);
  if (t.length > 2000) errs.push(`header quá dài (> 2000 ký tự): ${t.slice(0, 40)}…`);
}
const all = rules.get('/*') || [];
const get = n => (all.find(([k]) => k === n) || [])[1];
const need = {
  'x-frame-options': v => /^(SAMEORIGIN|DENY)$/.test(v),
  'x-content-type-options': v => v === 'nosniff',
  'referrer-policy': v => /strict-origin-when-cross-origin|no-referrer/.test(v),
  'strict-transport-security': v => /max-age=(\d+)/.test(v) && +v.match(/max-age=(\d+)/)[1] >= 15552000,
  'permissions-policy': v => /camera=\(\)/.test(v) && /geolocation=\(\)/.test(v),
  'cross-origin-opener-policy': v => /same-origin-allow-popups/.test(v), // cần cho cửa sổ đăng nhập Google (Firebase signInWithPopup)
};
for (const [h, ok] of Object.entries(need)) { const v = get(h); if (!v) errs.push(`/* thiếu ${h}`); else if (!ok(v)) errs.push(`/* ${h} sai giá trị: ${v}`); }
const csp = get('content-security-policy') || get('content-security-policy-report-only');
if (!csp) errs.push('/* thiếu CSP (Content-Security-Policy hoặc -Report-Only)');
else for (const d of ["object-src 'none'", "base-uri 'self'", 'frame-ancestors']) if (!csp.includes(d)) errs.push(`CSP thiếu ${d}`);
// Trong cùng 1 khối không lặp header (Pages nối bằng dấu phẩy → giá trị hỏng)
for (const [p, hs] of rules) { const seen = new Set(); for (const [k] of hs) { if (k === '!') continue; if (seen.has(k)) errs.push(`${p}: header ${k} lặp`); seen.add(k); } }
// /admin*: header chặt hơn phải gỡ bản chung trước (! Header) để không ra 2 giá trị
const adm = rules.get('/admin*') || [];
for (const k of ['referrer-policy', 'permissions-policy', 'x-frame-options']) if (adm.some(([n]) => n === k) && !adm.some(([n, v]) => n === '!' && v === k)) errs.push(`/admin* đặt ${k} nhưng chưa gỡ bản chung (! ${k})`);
if (!adm.some(([k, v]) => k === 'x-robots-tag' && /noindex/.test(v))) errs.push('/admin* thiếu X-Robots-Tag noindex');
if (errs.length) { console.error('✗ headers:\n  - ' + errs.join('\n  - ')); process.exit(1); }
console.log(`✓ headers: ${rules.size} khối, /* đủ ${Object.keys(need).length + 1} header bảo mật`);
