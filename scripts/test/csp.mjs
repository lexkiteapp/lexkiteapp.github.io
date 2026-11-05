// 🔒 CSP chặn thật (docs/SECURITY-CSP.md) – offline, không mạng. Chạy: node scripts/test/csp.mjs [dist]
// 1) web/_headers khối /*: Content-Security-Policy (KHÔNG Report-Only), đủ object-src/base-uri/form-action/frame-ancestors, jsdelivr chỉ dạng có đường dẫn gói@phiên bản.
// 2) Mọi trang HTML (web/ trong bộ nhớ; dist/ nếu có – CI sau build-web.sh): meta CSP đứng trước mọi script, phủ hash mọi script nội tuyến thực thi,
//    script-src hiệu lực (header ∩ meta) không có 'unsafe-inline'; không handler on*= / javascript:.
// 3) Mã JS (web/js) không dựng handler on*= trong chuỗi HTML; mọi URL script ngoài trong mã nằm trong script-src.
// 4) Tự kiểm bộ kiểm (ca âm): script thiếu hash / handler / meta đặt sau script phải bị bắt.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseHeaders, parsePolicy, sitePolicy, metaPolicy, injectMeta, checkPage, hashOf, inlineScripts } from '../lib/csp.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const errs = []; const ok = (c, m) => { if (!c) errs.push(m); };
const rules = parseHeaders();
const all = rules.get('/*') || [];
const policy = sitePolicy(rules);
const P = parsePolicy(policy);

// ---- 1) header
ok(!all.some(([k]) => k === 'content-security-policy-report-only'), "/* còn Content-Security-Policy-Report-Only – phải là Content-Security-Policy (chặn thật)");
for (const d of ["object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'", "default-src 'self'"]) ok(policy.includes(d), `CSP /* thiếu ${d}`);
ok(!(P.get('script-src') || []).includes("'unsafe-eval'"), "script-src có 'unsafe-eval'");
for (const [d, toks] of P) for (const t of toks) if (/cdn\.jsdelivr\.net/.test(t)) ok(/^https:\/\/cdn\.jsdelivr\.net\/npm\/(@[a-z0-9-]+\/)?[a-z0-9.-]+@\d+\.\d+\.\d+\/$/.test(t), `${d}: jsdelivr phải ghim gói@phiên bản/ (đang: ${t})`);
for (const [p, hs] of rules) {
  if (p === '/*' || p.startsWith('/admin')) continue; // /admin*: thêm chính sách thứ 2 (frame-ancestors 'none') – giao nhau với /*, chỉ chặt hơn
  if (hs.some(([k]) => k === 'content-security-policy')) ok(hs.some(([k, v]) => k === '!' && v === 'content-security-policy'), `${p}: đặt CSP riêng phải gỡ bản chung (! Content-Security-Policy)`);
  ok(!hs.some(([k]) => k === 'content-security-policy-report-only'), `${p}: còn Report-Only`);
}
// transformers.js: phiên bản ghim trong CSP = phiên bản mã thật import (lệch → Whisper bị chặn)
const ui = fs.readFileSync(path.join(ROOT, 'web/js/ui.js'), 'utf8');
const tv = (ui.match(/cdn\.jsdelivr\.net\/npm\/@huggingface\/transformers@([\d.]+)\//) || [])[1];
ok(tv, 'không thấy import transformers trong web/js/ui.js');
for (const d of ['script-src', 'connect-src']) ok((P.get(d) || []).includes(`https://cdn.jsdelivr.net/npm/@huggingface/transformers@${tv}/`), `${d} thiếu https://cdn.jsdelivr.net/npm/@huggingface/transformers@${tv}/ (phiên bản mã đang dùng)`);

// ---- 2) trang HTML
function walk(d, f) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, f); } else if (e.name.endsWith('.html')) f(p); } }
let nWeb = 0, nInline = 0;
walk(path.join(ROOT, 'web'), p => {
  const out = injectMeta(fs.readFileSync(p, 'utf8'), policy); nWeb++; nInline += inlineScripts(out).length;
  for (const x of checkPage(out, policy)) errs.push(path.relative(ROOT, p) + ': ' + x);
  ok(injectMeta(out, policy) === out, path.relative(ROOT, p) + ': chèn meta không ổn định (chạy lại phải ra y hệt)');
});
const dist = process.argv[2] || (fs.existsSync(path.join(ROOT, 'dist/index.html')) && fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8').includes('id="lk-csp"') ? path.join(ROOT, 'dist') : '');
let nDist = 0;
if (dist) walk(dist, p => { nDist++; for (const x of checkPage(fs.readFileSync(p, 'utf8'), policy)) errs.push('dist/' + path.relative(dist, p) + ': ' + x); });

// ---- 3) mã JS
const scriptSrc = P.get('script-src') || [];
const allowed = u => scriptSrc.some(s => s.endsWith('/') ? u.startsWith(s) : /^https:\/\/[^/]+$/.test(s) && (u === s || u.startsWith(s + '/')));
const ads = fs.readFileSync(path.join(ROOT, 'web/js/ads/config.js'), 'utf8');
const adsOn = /enabled:\s*true/.test(ads.replace(/\/\/.*$/gm, ''));
walk2(path.join(ROOT, 'web/js'));
function walk2(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!['i18n', 'vendor'].includes(e.name)) walk2(p); continue; }
    if (!e.name.endsWith('.js')) continue;
    const src = fs.readFileSync(p, 'utf8'), rel = path.relative(ROOT, p);
    for (const m of src.matchAll(/\son[a-z]+=\\?["'`]/g)) errs.push(`${rel}: handler nội tuyến trong chuỗi HTML (${src.slice(m.index, m.index + 40).trim()}) – CSP chặn, dùng addEventListener`);
    for (const m of src.matchAll(/(?:\.src\s*=|import\()\s*['"`](https:\/\/[^'"`?]+)/g)) {
      const u = m[1];
      if (/\.(js|mjs)$|iframe_api$/.test(u) && !allowed(u)) {
        if (!adsOn && /\/ads\//.test(rel)) continue; // quảng cáo đang tắt – xem kiểm adsOn bên dưới
        errs.push(`${rel}: script ngoài ${u} không nằm trong script-src`);
      }
    }
  }
}
// Quảng cáo bật mà CSP chưa mở host AdSense/GPT/đo chất lượng → quảng cáo vỡ âm thầm (docs/SECURITY-CSP.md §Quảng cáo)
if (adsOn) for (const h of ['https://securepubads.g.doubleclick.net', 'https://ep2.adtrafficquality.google']) ok(policy.includes(h), `ADS_CONFIG.enabled = true nhưng CSP thiếu ${h} – mở + kiểm trên trang đã duyệt AdSense trước khi bật`);

// ---- 4) ca âm (bộ kiểm phải bắt được)
const base = '<!doctype html><html><head><title>x</title></head><body><script>alert(1)</script></body></html>';
const good = injectMeta(base, policy);
ok(checkPage(good, policy).length === 0, 'ca dương: trang chèn meta phải đạt – ' + checkPage(good, policy).join('; '));
ok(metaPolicy(base, policy).includes(hashOf('alert(1)')) && !/'unsafe-inline'/.test(metaPolicy(base, policy)), "meta phải có hash và không có 'unsafe-inline'");
ok(checkPage(good.replace('alert(1)', 'alert(2)'), policy).some(e => /chưa có hash/.test(e)), 'ca âm: script đổi nội dung (lệch hash) phải bị bắt');
ok(checkPage(injectMeta(base.replace('<body>', '<body><button onclick="x()">b</button>'), policy), policy).some(e => /handler/.test(e)), 'ca âm: onclick= phải bị bắt');
ok(checkPage(injectMeta(base.replace('<body>', '<body><a href="javascript:x()">b</a>'), policy), policy).some(e => /javascript:/.test(e)), 'ca âm: href=javascript: phải bị bắt');
ok(checkPage(base, policy).includes('thiếu meta CSP'), 'ca âm: trang thiếu meta phải bị bắt');
ok(checkPage(good.replace(/(<meta http-equiv[^>]*>)([\s\S]*?)(<\/body>)/, '$2$1$3'), policy).some(e => /SAU/.test(e)), 'ca âm: meta đặt sau script phải bị bắt');
ok(hashOf('a\r\nb') === hashOf('a\nb'), 'hash phải chuẩn hoá CRLF như trình phân tích HTML');
ok(checkPage(injectMeta('<html><head></head><body><script type="application/ld+json">{"a":1}</script><p title="a onclick=b">x</p></body></html>', policy), policy).length === 0, 'JSON-LD / chữ "onclick=" trong giá trị thuộc tính không phải lỗi');

// Test trình duyệt không dùng page.waitForFunction (Playwright eval predicate trong trang → CSP chặn 'unsafe-eval' → Journey E2E đỏ giả, 2/11)
{
  const walkJs = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === 'node_modules' ? [] : walkJs(path.join(d, e.name))) : /\.(m?js)$/.test(e.name) ? [path.join(d, e.name)] : []);
  const bad = walkJs(path.join(ROOT, 'scripts')).filter(f => !/pw-wait\.mjs$|csp\.mjs$/.test(f) && /\.waitForFunction\(/.test(fs.readFileSync(f, 'utf8')));
  ok(!bad.length, 'dùng waitFn (scripts/lib/pw-wait.mjs) thay page.waitForFunction: ' + bad.map(f => path.relative(ROOT, f)).join(', '));
}

if (errs.length) { console.error(`✗ csp: ${errs.length} lỗi\n  - ` + errs.slice(0, 40).join('\n  - ')); process.exit(1); }
console.log(`✓ csp: header chặn thật; ${nWeb} trang web/ (${nInline} script nội tuyến có hash)${dist ? `, ${nDist} trang dist/` : ''}; JS không handler on*=`);
