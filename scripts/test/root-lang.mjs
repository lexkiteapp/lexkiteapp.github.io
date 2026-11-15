// Trang gốc quốc tế: functions/index.js + _rootlang.js – cookie đã chọn → nước theo IP → Accept-Language → en; không lặp với 301 cũ đã lưu; không xét User-Agent.
import fs from 'node:fs';
import { LANGS as LANDING, geoGen } from '../build-landing.mjs';
import { LANGS, COOKIE, parseAL, cookieLang, pickLang, rootTarget } from '../../functions/api/_rootlang.js';
import { GEO } from '../../functions/api/_geo.gen.js';
import { onRequest } from '../../functions/index.js';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.error('✗', m); } }, eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
eq([...LANGS].sort(), [...LANDING].sort(), '15 ngôn ngữ khớp trang giới thiệu');
eq(parseAL('fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5'), ['fr', 'fr', 'en', 'de'], 'parse theo q');
eq(parseAL('de;q=0.5, ja;q=0.9'), ['ja', 'de'], 'q giảm dần'); eq(parseAL('vi;q=0, en'), ['en'], 'q=0 bị bỏ'); eq(parseAL('*'), [], '* không phải ngôn ngữ'); eq(parseAL(null), [], 'rỗng');
eq(cookieLang('a=1; lk_lang=de; b=2'), 'de', 'đọc cookie'); eq(cookieLang('lk_lang=xx'), null, 'mã lạ bị bỏ'); eq(cookieLang('xlk_lang=de'), null, 'không khớp tên khác'); eq(cookieLang('lk_lang=de%3Cscript'), null, 'giá trị bẩn bị bỏ'); eq(cookieLang(null), null, 'không cookie');
for (const [ck, c, al, want, m] of [
  ['lk_lang=fr', 'VN', 'vi', 'fr', '(1) cookie thắng nước và Accept-Language'], ['lk_lang=vi', 'US', 'en-US', 'vi', '(1) đã chọn tiếng Việt ở Mỹ'], ['lk_lang=xx', 'JP', 'en', 'ja', 'cookie lạ → luật tiếp theo'],
  ['', 'VN', 'en-US,en;q=0.9', 'vi', '(2) IP VN thắng trình duyệt en-US'], ['', 'JP', '', 'ja', '(2) IP JP không header'], ['', 'KR', 'en', 'ko', '(2) KR'], ['', 'DE', 'en-GB', 'de', '(2) DE'], ['', 'AT', 'en', 'de', '(2) AT'], ['', 'FR', 'en', 'fr', '(2) FR'], ['', 'SA', 'en', 'ar', '(2) SA'], ['', 'AE', 'en', 'ar', '(2) AE'], ['', 'BR', 'en', 'pt', '(2) BR'], ['', 'vn', 'en', 'vi', '(2) mã thường cũng khớp'],
  ['', 'NL', 'nl-NL,nl;q=0.9', 'en', '(3) NL không trong bảng, nl không có → en'], ['', 'SE', 'sv-SE,de;q=0.5', 'de', '(3) SE theo ngôn ngữ thứ hai app có'], ['', 'US', 'vi-VN,vi;q=0.9,en;q=0.8', 'vi', '(3) người Việt ở Mỹ'], ['', 'US', 'en-US,en;q=0.9', 'en', '(3) Mỹ en'], ['', 'IN', 'hi-IN', 'hi', '(3) IN theo hi'], ['', 'CA', 'in-ID', 'id', '(3) mã cũ in → id'],
  ['', 'US', '', 'en', '(4) Mỹ không header (Googlebot) → en'], ['', 'NL', '*', 'en', '(4) * → en'], ['', undefined, null, 'en', '(4) không gì cả'], ['', 'XX', 'fa', 'en', '(4) nước lạ, ngôn ngữ lạ'], ['', '__proto__', '', 'en', 'khoá lạ không vào bảng'],
]) eq(pickLang(ck, c, al), want, m);
for (const [cc, l] of Object.entries(GEO)) ok(LANGS.includes(l), `GEO ${cc} → ${l} thuộc 15 ngôn ngữ`);
{ const m = /const GEO = (\{[^}]+\});/.exec(fs.readFileSync('web/js/i18n.js', 'utf8')); eq(new Function(`return ${m[1]}`)(), GEO, 'bảng GEO khớp web/js/i18n.js'); eq(fs.readFileSync('functions/api/_geo.gen.js', 'utf8'), geoGen(), '_geo.gen.js sinh đúng từ i18n.js'); }
eq(rootTarget('', 'DE', '', ''), '/de/', 'đích thường'); eq(rootTarget('', 'US', '', '?utm_source=x'), '/en/?utm_source=x', 'giữ query');
eq(rootTarget('', 'VN', '', ''), '/vi/?r=1', 'vi có dấu chống lặp'); eq(rootTarget('', 'VN', '', '?home=1'), '/vi/?r=1&home=1', 'vi giữ query');
ok(!/^\/vi\/?$/.test(rootTarget('', 'VN', '', '')), 'đích vi khác URL /vi/ có thể đã lưu 301');
const call = (method, headers = {}, cf, u = 'https://lexkite.com/') => { const r = new Request(u, { method, headers }); Object.defineProperty(r, 'cf', { value: cf }); return onRequest({ request: r }); };
{ const r = call('GET', { 'Accept-Language': 'en' }, { country: 'KR' }); eq(r.status, 302, '302'); eq(r.headers.get('location'), '/ko/', 'Location'); ok(/Accept-Language/.test(r.headers.get('vary')) && /Cookie/.test(r.headers.get('vary')), 'Vary'); ok(/no-store/.test(r.headers.get('cache-control')), 'không đệm'); }
eq(call('GET', { Cookie: 'lk_lang=ja' }, { country: 'VN' }).headers.get('location'), '/ja/', 'hàm đọc cookie');
eq(call('HEAD', {}, { country: 'US' }).headers.get('location'), '/en/', 'HEAD, không header'); eq(call('POST').status, 405, 'POST 405');
eq(call('GET', {}, undefined, 'https://lexkite.com/?a=1').headers.get('location'), '/en/?a=1', 'không có cf');
const G = call('GET', { 'User-Agent': 'Googlebot/2.1' }, { country: 'JP' }), B = call('GET', { 'User-Agent': 'Mozilla/5.0' }, { country: 'JP' });
eq(G.headers.get('location'), B.headers.get('location'), 'Googlebot cùng luật người dùng');
// Máy khách: chỉ khi người dùng bấm chọn mới có cookie; đoán theo nước thì không
{ const { LANG_JS, HINT_JS, LANG_COOKIE } = await import('../lib/site-layout.mjs'), i18n = fs.readFileSync('web/js/i18n.js', 'utf8');
  eq(LANG_COOKIE, COOKIE, 'tên cookie thống nhất'); ok(LANG_JS.includes(`d.cookie='${COOKIE}='+a.hreflang`) && HINT_JS.includes(`d.cookie='${COOKIE}='+n`), 'menu và dải gợi ý ghi cookie khi bấm');
  ok(/secure/.test(LANG_JS) && /samesite=lax/.test(LANG_JS) && /max-age=31536000/.test(LANG_JS), 'cookie Secure, SameSite=Lax, 1 năm');
  ok(i18n.includes('set(l, 1);') && /if \(auto !== 1\) document\.cookie = 'lk_lang='/.test(i18n), 'i18n.js: đoán theo nước không ghi cookie, người dùng chọn thì ghi'); }
const src = fs.readFileSync('functions/index.js', 'utf8') + fs.readFileSync('functions/api/_rootlang.js', 'utf8');
ok(!/user-agent|<script|location\.(href|replace)/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'không dựa User-Agent, không redirect JS');
const routes = JSON.parse(fs.readFileSync('web/_routes.json', 'utf8')); ok(routes.include.includes('/') && routes.include.includes('/api/*') && routes.include.every(r => ['/', '/api/*'].includes(r) || /^\/[a-z]{2}\/words\/\*$/.test(r)), 'Functions chỉ cho /, /api/* và /<lang>/words/* (trang từ R2)');
ok(!fs.readFileSync('web/_redirects', 'utf8').split('\n').some(l => /^\/vi(\/|\/index\.html)?\s/.test(l)), '_redirects không còn /vi → /');
for (const l of LANDING) ok(fs.existsSync(`web/${l}/index.html`), `có web/${l}/index.html`);
if (fails) { console.error(`✗ root-lang: ${fails}/${n} lỗi`); process.exit(1); }
console.log(`✓ root-lang: ${n} kiểm tra – cookie → IP → Accept-Language → en, một bảng GEO, Vary, không lặp 301 cũ, Googlebot cùng luật`);
