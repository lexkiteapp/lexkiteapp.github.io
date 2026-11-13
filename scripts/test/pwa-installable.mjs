#!/usr/bin/env node
// PWA cài được (dự phòng khi người dùng không muốn app cửa hàng; docs/INSTALL-GROWTH.md): manifest đủ tiêu chí cài của Chrome/Edge/Safari,
// file ảnh có thật, scope/start_url khớp, service worker đúng scope, link app cửa hàng trong related_applications khớp ext-config. Dùng: node scripts/test/pwa-installable.mjs
import fs from 'node:fs';
import path from 'node:path';
let n = 0, fail = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.error('  ✗ ' + m); } };
const rd = f => fs.readFileSync(f, 'utf8'), W = 'web';
const m = JSON.parse(rd(`${W}/manifest.webmanifest`)), clean = u => u.split('?')[0];

ok(m.name && m.short_name && m.short_name.length <= 12, 'name + short_name ≤ 12 ký tự');
ok(m.display === 'standalone' && m.start_url && m.scope === '/app/' && m.start_url.startsWith('/app/'), 'standalone, start_url trong scope /app/');
ok(m.id, 'có id ổn định');
const icons = m.icons || [], has = (sz, purpose) => icons.some(i => i.sizes === sz && (i.purpose || 'any') === purpose && /png/.test(i.type));
ok(has('192x192', 'any') && has('512x512', 'any') && has('512x512', 'maskable'), 'icon PNG 192 + 512 (any) và 512 maskable');
for (const i of icons) ok(fs.existsSync(path.join(W, 'app', clean(i.src))) || fs.existsSync(path.join(W, clean(i.src))), 'icon có thật: ' + i.src);
const shots = m.screenshots || [];
ok(shots.some(s => s.form_factor === 'narrow') && shots.some(s => s.form_factor === 'wide'), 'có ảnh chụp narrow + wide (giao diện cài giàu của Chrome)');
for (const s of shots) ok(fs.existsSync(path.join(W, clean(s.src))), 'ảnh chụp có thật: ' + s.src);
for (const s of m.shortcuts || []) ok(s.url.startsWith('/app/'), 'shortcut trong scope: ' + s.url);
// Link app cửa hàng chỉ có MỘT nguồn: ext-config.js
const cfg = rd(`${W}/js/ext-config.js`), play = (cfg.match(/play: '([^']+)'/) || [])[1], ios = (cfg.match(/ios: '([^']+)'/) || [])[1], ra = m.related_applications || [];
ok(m.prefer_related_applications === false, 'prefer_related_applications=false (PWA vẫn cài được, app cửa hàng chỉ là gợi ý)');
ok(ra.some(a => a.platform === 'play' && a.url === play && a.id === 'com.lexkite.app') && ra.some(a => a.platform === 'itunes' && a.url === ios), 'related_applications khớp ext-config (Play + App Store)');
// HTML + service worker
const html = rd(`${W}/app/index.html`);
ok(/<link rel="manifest" href="manifest\.webmanifest">/.test(html) && /apple-touch-icon/.test(html) && /name="apple-mobile-web-app-capable"|name="mobile-web-app-capable"/.test(html), '/app/ có link manifest + apple-touch-icon + meta web-app-capable');
ok(fs.existsSync(`${W}/app/manifest.webmanifest`) || fs.existsSync(`${W}/manifest.webmanifest`), 'manifest nằm cạnh /app/');
ok(/serviceWorker'\)?\.register\('\/sw\.js', \{ scope: '\/app\/' \}|register\('\/sw\.js', \{ scope: '\/app\/' \}/.test(rd(`${W}/js/app.js`)) && fs.existsSync(`${W}/sw.js`), 'service worker /sw.js đăng ký scope /app/');
console.log(fail ? `✗ pwa-installable: ${fail}/${n} lỗi` : `✓ pwa-installable: ${n} kiểm đều đạt`);
process.exit(fail ? 1 : 0);
