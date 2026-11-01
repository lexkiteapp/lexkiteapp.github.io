// Header bí mật X-Lexkite-CI chỉ được gửi tới chính lexkite.com. Gắn qua extraHTTPHeaders của Playwright thì nó đi kèm cả font
// Google / beacon Cloudflare → preflight CORS chặn → post-deploy-check báo 141 lỗi giả (1/11) và lộ header cho bên thứ ba.
import fs from 'node:fs'; import path from 'node:path';
import { sameOrigin } from '../lib/http.mjs';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const same = sameOrigin('https://lexkite.com/');
ok(same('https://lexkite.com/app/?x=1#/home'), 'cùng origin → gắn header');
ok(!same('https://fonts.gstatic.com/s/x.woff2'), 'font Google → không gắn');
ok(!same('https://static.cloudflareinsights.com/beacon.min.js'), 'beacon Cloudflare → không gắn');
ok(!same('https://www.lexkite.com/'), 'subdomain khác origin → không gắn');
ok(!same('http://lexkite.com/'), 'khác giao thức → không gắn');
ok(!same('not a url'), 'URL hỏng → không gắn');
ok(same(new URL('https://lexkite.com/sw.js')), 'nhận cả đối tượng URL (Playwright truyền URL)');
// Quét: không script nào gắn header CI qua extraHTTPHeaders (gắn mọi origin)
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.name === 'node_modules' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : /\.(mjs|js|cjs)$/.test(e.name) ? [path.join(d, e.name)] : []);
for (const f of walk('scripts')) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/extraHTTPHeaders\s*:\s*([^,}\n]+)/g)) ok(!/\bCI\b|lexkite-ci|ciHeader/i.test(m[1]), `${f}: header CI qua extraHTTPHeaders (gửi mọi origin) – dùng routeCiHeader`);
}
console.log(fails ? `ci-header-scope: ${fails} lỗi` : 'ci-header-scope: OK'); process.exit(fails ? 1 : 0);
