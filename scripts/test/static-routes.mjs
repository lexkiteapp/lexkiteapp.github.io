import { fileURLToPath } from 'node:url';
// File tĩnh trên lexkite.com không bao giờ được trả 500 vì mã server: Pages Functions chỉ chạy ở /api/* (web/_routes.json),
// không có middleware/catch-all chạy trên mọi đường dẫn; JSON tĩnh mà app tải (seo-twins.json, blog-langs.json) thử lại khi gặp 5xx tạm thời.
import fs from 'node:fs'; import path from 'node:path';
const R = fileURLToPath(new URL('../../', import.meta.url));
let fail = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} static-routes: ${m}`); if (!c) fail++; };
const routes = JSON.parse(fs.readFileSync(path.join(R, 'web/_routes.json'), 'utf8'));
ok(routes.version === 1 && Array.isArray(routes.include) && Array.isArray(routes.exclude), '_routes.json đúng định dạng Cloudflare Pages (version 1, include, exclude)');
ok(Object.keys(routes).every(k => ['version', 'include', 'exclude'].includes(k)), '_routes.json không có khoá lạ (Pages từ chối deploy)');
ok(routes.include.length > 0 && routes.include.every(r => r.startsWith('/api/')), 'Functions chỉ được gọi ở /api/*');
ok(routes.include.length + routes.exclude.length <= 100, '≤ 100 luật (giới hạn Pages)');
const glob = r => new RegExp('^' + r.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
const hit = p => routes.include.some(r => glob(r).test(p)) && !routes.exclude.some(r => glob(r).test(p));
for (const p of ['/', '/app/', '/en/', '/ar/', '/data/seo-twins.json', '/blog-langs.json', '/i18n/content/ja.json', '/en/blog/about/', '/sw.js', '/js/app.js'])
  ok(!hit(p), `${p} là file tĩnh – không đi qua Functions`);
// Mọi function phải nằm dưới functions/api và được _routes.json phủ; không có _middleware ở gốc chạy trên mọi đường dẫn
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const fns = walk(path.join(R, 'functions')).filter(f => /\.(m?js|ts)$/.test(f)).map(f => path.relative(path.join(R, 'functions'), f));
ok(fns.every(f => f.startsWith('api' + path.sep)), `mọi Pages Function nằm dưới functions/api/ (${fns.filter(f => !f.startsWith('api' + path.sep)).join(', ') || 'ok'})`);
ok(!fns.some(f => /(^|\/)_middleware\.(m?js|ts)$/.test(f) && !f.startsWith('api/')), 'không có _middleware chạy trên mọi đường dẫn');
const routed = fns.filter(f => !path.basename(f).startsWith('_')).map(f => '/' + f.replace(/\.(m?js|ts)$/, '').replace(/\/index$/, '').replace(/\[\[?[^\]]+\]\]?/g, 'x'));
ok(routed.every(hit), `mọi endpoint /api/* vẫn được phục vụ (${routed.filter(p => !hit(p)).join(', ') || routed.length + ' endpoint'})`);
// Fail open phía app: 5xx tạm thời của CDN → thử lại, không ghi nhớ kết quả sai
const twin = fs.readFileSync(path.join(R, 'web/js/seo-twin.js'), 'utf8'), hubs = fs.readFileSync(path.join(R, 'web/js/hubs.js'), 'utf8');
ok(/status >= 500[\s\S]{0,120}get\(n - 1\)/.test(twin), 'seo-twin.js thử lại seo-twins.json khi 5xx');
ok(/App\.getStatic = [^\n]*status >= 500/.test(hubs) && /getStatic\([^\n]*blog-langs\.json/.test(hubs) && /if \(!flaky\)/.test(hubs), 'hubs.js thử lại blog-langs.json khi 5xx và không ghi nhớ kết quả lỗi');
if (fail) { console.error(`✗ static-routes: ${fail} lỗi`); process.exit(1); }
console.log('✓ static-routes: file tĩnh không đi qua Functions, app fail-open khi CDN 5xx');
