// Nguồn duy nhất link cài (infra/install-links.json): file sinh khớp nguồn · không link cửa hàng nào của Lexkite viết cứng lệch nguồn · kênh chưa có listing không tạo nút chết
// · landing 15 ngôn ngữ đủ kênh + chữ đã dịch · khu Cài ẩn đúng lúc · caption/CTA video gắn link đo được theo nền tảng · trang /get chuyển đúng · App Store + Google Play luôn đi đôi, ghi rõ tên, có icon ở mọi nơi. Dùng: node scripts/test/install-links.mjs
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';
import { readLinks, targets, getPage, extConfig } from '../build-install-links.mjs';
import { INSTALL, liveChannels, trackUrl, shortUrl, installLines, withInstall, ctaLabel } from '../../functions/api/_install_links.js';
import { socialMeta } from '../../functions/api/_role_meta.js';
import { bodyFor } from '../../functions/api/_social_mgr.js';
import { packTexts } from '../video/yt-pack.mjs';
import { buildAss } from '../video/lib.mjs';
import { installSection, storeHref } from '../build-landing.mjs';
import { siteFooter, footGroups, FOOT, themePage } from '../lib/site-layout.mjs';

let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.error('  ✗ ' + m); } };
const D = readLinks(), LANGS = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
const fileOf = l => `web/${l}/index.html`;

// 1) File sinh + bản trong add-on khớp nguồn
for (const [p, txt] of targets(D)) ok(fs.existsSync(p) && fs.readFileSync(p, 'utf8') === txt, `${p} cũ so với infra/install-links.json → node scripts/build-install-links.mjs`);
ok(fs.readFileSync('extension/app/js/ext-config.js', 'utf8') === extConfig(D), 'extension/app/js/ext-config.js lệch → bash scripts/build-extension.sh');
ok(JSON.stringify(INSTALL.channels) === JSON.stringify(D.channels), 'functions/api/_install_data.js lệch nguồn');

// 2) Nguồn đúng dạng: kênh có url đúng host; kênh đã kiểm giữ nguyên văn
const HOST = { ios: /^https:\/\/apps\.apple\.com\//, play: /^https:\/\/play\.google\.com\/store\/apps\/details\?id=/, cws: /^https:\/\/chromewebstore\.google\.com\/detail\//, edge: /^https:\/\/microsoftedge\.microsoft\.com\/addons\/detail\//, firefox: /^https:\/\/addons\.mozilla\.org\// };
for (const [id, c] of Object.entries(D.channels)) ok(c.name && c.devices && (c.url === '' || HOST[id].test(c.url)), `kênh ${id}: url sai host hoặc thiếu tên`);
ok(D.channels.cws.url.endsWith('/' + D.channels.cws.id), 'cws.url phải kết thúc bằng cws.id');

// 3) Quét repo: link cửa hàng của Lexkite viết cứng phải đúng nguồn; Edge/Firefox chưa có thì không được có link listing
const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n').filter(f => f && /\.(html?|m?js|md|json|ya?ml|sh|py|txt|css)$/.test(f) && !/^(brand\/stitch\/|node_modules\/)/.test(f));
const P = [
  ['ios', /apps\.apple\.com\/(?:[a-z]{2}\/)?app\/(?:[^/"'\s)]*\/)?(id\d+)/g, m => m[1], u => u.match(/id\d+/)[0], /6824714708|lexkite/i],
  ['play', /play\.google\.com\/store\/apps\/details\?id=([\w.]+)/g, m => m[1], u => u.split('id=')[1], /lexkite/i],
  ['cws', /chromewebstore\.google\.com\/detail\/(?:[^/"'\s)]*\/)?([a-p]{32})/g, m => m[1], u => u.split('/').pop(), /./],
  ['edge', /microsoftedge\.microsoft\.com\/addons\/detail\/(?:[^/"'\s)$]*\/)?([a-z0-9]{10,32})/g, m => m[1], u => u.split('/').pop(), /./],
  ['firefox', /addons\.mozilla\.org\/(?:[a-z-]+\/)?firefox\/addon\/([\w-]+)/g, m => m[1], u => u.split('/').filter(Boolean).pop(), /./]];
const OTHERS = /^docs\/(COMPETITOR|PR-PLATFORMS|BACKLINKS|archive\/)|^content\/(pr|blog)\//; // bài so sánh / danh sách nói về app khác, không phải link của ta
let scanned = 0;
for (const f of files) {
  if (f === 'infra/install-links.json' || f === 'scripts/test/install-links.mjs' || !fs.existsSync(f) || OTHERS.test(f)) continue;
  let st; try { st = fs.statSync(f); } catch { continue; }
  if (!st.isFile() || st.size > 3e6) continue;
  const s = fs.readFileSync(f, 'utf8'); scanned++;
  if (!/apps\.apple|play\.google|chromewebstore|microsoftedge|addons\.mozilla/.test(s)) continue;
  for (const [id, re, got, want, ours] of P) for (const m of s.matchAll(re)) {
    if (!ours.test(m[0]) && id !== 'edge') continue; // app khác (vd. đối thủ trên Play) không thuộc phạm vi
    const u = D.channels[id].url;
    ok(u && got(m) === want(u), `${f}: link ${id} lệch nguồn: ${m[0].slice(0, 90)}`);
  }
}
ok(scanned > 500, `quét repo quá ít file (${scanned})`);
// Add-on không đọc được JSON lúc chạy: popup.js giữ ID → phải khớp nguồn
ok(fs.readFileSync('extension/popup.js', 'utf8').includes(`CWS = '${D.channels.cws.id}'`), 'extension/popup.js: ID Chrome Web Store lệch nguồn');
// infra/resources.json trỏ về nguồn, không chép link cửa hàng
{ const r = JSON.parse(fs.readFileSync('infra/resources.json', 'utf8')); const svc = (r.services || r.resources || []).filter(x => ['apple', 'play', 'cws'].includes(x.key));
  ok(svc.length === 3 && svc.every(x => x.install === 'infra/install-links.json'), 'infra/resources.json: apple/play/cws phải có "install": "infra/install-links.json"'); }

// 4) Kênh chưa có listing: không vào bất kỳ đâu; điền 1 dòng là hiện đủ
ok(liveChannels().map(c => c.id).join() === 'ios,play,cws', 'hiện tại chỉ App Store, Google Play, Chrome');
{ const T = JSON.parse(JSON.stringify(INSTALL)); T.channels.edge.url = 'https://microsoftedge.microsoft.com/addons/detail/lexkite/abcdefghijklmnop';
  ok(trackUrl('edge', {}, T).includes('utm_source=') && trackUrl('edge') === '', 'trackUrl: kênh rỗng → "", có link → có nguồn đo');
  const c = JSON.parse(fs.readFileSync('content/landing/en.json', 'utf8'));
  const on = installSection(c, T), off = installSection(c);
  ok(on.includes('data-ch="edge"') && !off.includes('data-ch="edge"') && !off.includes('data-ch="firefox"'), 'khu Cài: Edge hiện khi điền url, chưa có thì không có nút');
  ok(getPage({ ...D, channels: { ...D.channels, firefox: { ...D.channels.firefox, url: '' } } }).split('Firefox Add-ons').length === 1, '/get: không link kênh rỗng'); }

// 5) Landing 15 ngôn ngữ: đầu trang, khu Cài đủ 3 kênh + link đo được, chân trang đủ link, chữ đã dịch
const en = JSON.parse(fs.readFileSync('content/landing/en.json', 'utf8')).install;
for (const l of LANGS) {
  const html = fs.readFileSync(fileOf(l), 'utf8'), doc = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, '')).window.document, sec = doc.querySelector('#install');
  ok(!!sec && doc.querySelector('#install h2').textContent.includes('Lexkite'), `${l}: có khu #install`);
  ok(sec && ['ios', 'play', 'cws'].every(k => sec.querySelector(`a[data-ch="${k}"]`)?.href.startsWith(D.channels[k].url)), `${l}: khu Cài đủ App Store, Google Play, Chrome`);
  ok(sec && !sec.querySelector('[data-ch="edge"],[data-ch="firefox"]'), `${l}: không nút Edge/Firefox khi chưa có listing`);
  ok(sec && sec.querySelector('a[data-ch="play"]').href.includes('referrer=utm_source') && sec.querySelector('a[data-ch="ios"]').href.includes('ct=get_app_inst'), `${l}: link khu Cài có nguồn đo`);
  ok(doc.querySelector('header nav a[href="#install"]') && doc.querySelector('section a[href="#install"]'), `${l}: đầu trang + hero có lối tới khu Cài`);
  ok(doc.querySelector('[data-get-app="head"]'), `${l}: hero giữ nút "Tải app"`);
  const foot = doc.querySelector('footer');
  ok(foot && ['ios', 'play', 'cws'].every(k => foot.querySelector(`a[data-ch="${k}"]`)), `${l}: chân trang đủ link`);
  const c = JSON.parse(fs.readFileSync(`content/landing/${l}.json`, 'utf8')).install;
  ok(c && c.h && c.p && c.hero && c.phone?.includes('{url}'), `${l}: thiếu chữ install`);
  if (l !== 'en') ok(c && c.p !== en.p && c.phone !== en.phone && c.hero !== en.hero, `${l}: chữ install còn tiếng Anh`);
  ok(sec && sec.querySelector('a[href="/get"]')?.textContent === D.short.label, `${l}: có trang cài ngắn cho người dùng máy tính`);
}

// 6) Khu Cài: ẩn đúng lúc, đủ kênh trên máy tính (dùng get-app.js thật)
const UA = { chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36', firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0', edge: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0' };
const land = fs.readFileSync('web/en/index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, ''), ga = fs.readFileSync('web/js/get-app.js', 'utf8'), cfg = fs.readFileSync('web/js/ext-config.js', 'utf8');
function run(ua, { standalone = false, ext = null, apps = null } = {}) {
  const w = new JSDOM(land, { url: 'https://lexkite.com/en/', runScripts: 'outside-only' }).window;
  Object.defineProperty(w.navigator, 'userAgent', { value: ua }); Object.defineProperty(w.navigator, 'maxTouchPoints', { value: 0 });
  w.beacons = []; w.navigator.sendBeacon = (u, b) => { w.beacons.push(JSON.parse(b)); return true; };
  w.matchMedia = q => ({ matches: standalone && /standalone/.test(q) });
  w.eval(cfg); if (apps) Object.assign(w.LK_APPS, apps);
  if (ext) w.LKExt = { eligible: () => ext.eligible, installed: () => ext.installed };
  w.eval(ga); return w;
}
const ch = (w, k) => w.document.querySelector(`#install a[data-ch="${k}"]`);
{ const w = run(UA.firefox);
  ok(['ios', 'play', 'cws'].every(k => !ch(w, k).hidden) && !w.document.querySelector('#install').hidden, 'Firefox máy tính: đủ link điện thoại + Chrome');
  ok(ch(w, 'ios').href === storeHref({ id: 'ios', url: D.channels.ios.url }, 'inst') && ch(w, 'play').href === storeHref({ id: 'play', url: D.channels.play.url }, 'inst') && ch(w, 'cws').href === storeHref({ id: 'cws', url: D.channels.cws.url }, 'inst'), 'href của get-app.js trùng khuôn với HTML dựng sẵn');
  ch(w, 'play').dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  ok(w.beacons.some(b => b.ev === 'app_inst_play'), 'bấm kênh → /api/hit app_inst_play'); }
{ const w = run(UA.chrome, { ext: { eligible: true, installed: true } });
  await new Promise(res => { w.dispatchEvent(new w.Event('load')); setTimeout(res, 1100); });
  ok(ch(w, 'cws').hidden && !ch(w, 'ios').hidden && !ch(w, 'play').hidden, 'Chrome đã cài add-on: ẩn kênh add-on, vẫn còn link điện thoại'); }
{ const w = run(UA.android, { standalone: true });
  ok(w.document.querySelector('#install').hidden && ch(w, 'play').hidden && w.document.querySelector('a[href="#install"]').hidden, 'chạy như app: ẩn cả khu Cài và lối tới khu Cài'); }
{ const w = run(UA.android); ok(ch(w, 'play').style.order === '-1' && ch(w, 'ios').style.order === '', 'Android: Google Play lên đầu'); }
{ const w = run(UA.edge, { ext: { eligible: true, installed: false } }); ok(w.LKGetApp.kind() === 'cws', 'Edge chưa có listing riêng → Chrome Web Store (giữ nguyên)'); }
{ const w = run(UA.edge, { ext: { eligible: true, installed: false }, apps: { edge: 'https://microsoftedge.microsoft.com/addons/detail/x/abcdefghijklmnop' } }); ok(w.LKGetApp.kind() === 'edge', 'Edge điền listing → Edge Add-ons'); }
{ const w = run(UA.firefox); ok(w.LKGetApp.kind() === 'web', 'Firefox chưa có listing → web app'); }
{ const w = run(UA.firefox, { apps: { firefox: 'https://addons.mozilla.org/firefox/addon/lexkite/' } }); ok(w.LKGetApp.kind() === 'firefox', 'Firefox điền listing → AMO'); }

// 7) Danh sách cho phép của /api/hit biết mọi nơi + đích đang dùng (trước đây rail bị mất số đếm)
{ const hit = fs.readFileSync('functions/api/hit.js', 'utf8'); const arr = re => (hit.match(re) || [''])[0];
  for (const p of ['head', 'foot', 'menu', 'me', 'top', 'rail', 'inst', 'get']) ok(arr(/\['head'[^\]]*\]/).includes(`'${p}'`), `hit.js thiếu nơi ${p}`);
  for (const k of ['cws', 'play', 'ios', 'edge', 'firefox', 'web']) ok(arr(/\['cws'[^\]]*\]/).includes(`'${k}'`), `hit.js thiếu đích ${k}`); }

// 8) Video: mô tả theo nền tảng, có nguồn đo; caption dài liệt kê cửa hàng; không gắn đôi; đúng trần; CTA trong hình chỉ trang ngắn
const clip = { id: 'clip-a1', title: 'Look for', point: 'look for', topic: 'daily', cefr: 'a2' };
ok(trackUrl('play', { source: 'tiktok', medium: 'video', campaign: 'x y' }) === D.channels.play.url + '&referrer=' + encodeURIComponent('utm_source=tiktok&utm_medium=video&utm_campaign=x-y'), 'Play: referrer utm');
ok(trackUrl('ios', { source: 'youtube', campaign: 'a'.repeat(60) }).split('ct=')[1].length === 40, 'App Store: ct ≤ 40 ký tự');
ok(shortUrl('tiktok', 'clip-a1') === 'https://lexkite.com/get?src=tiktok&c=clip-a1', 'link ngắn có nguồn');
for (const p of ['tiktok', 'instagram', 'threads']) { const d = socialMeta(clip, p).description; ok(d.includes(`/get?src=${p}&c=clip-a1`) && !d.includes('play.google.com'), `socialMeta ${p}: link ngắn đo theo nền tảng`); ok(d.length <= { threads: 500 }[p] || p !== 'threads', 'threads ≤ 500'); }
for (const p of ['youtube', 'facebook_page']) { const d = socialMeta(clip, p).description; ok(liveChannels().every(c => d.includes(c.url)) && d.includes(`utm_source%3D${p}`) && d.includes(`ct=${p}_clip-a1`), `socialMeta ${p}: đủ cửa hàng + nguồn đo`); }
ok(!socialMeta(clip, 'youtube').description.includes('microsoftedge'), 'mô tả không có kênh chưa có listing');
{ const once = withInstall('Hook\n\n#a #b', 'tiktok', 'c1'); ok(once === `Hook\n\nGet the app free: ${shortUrl('tiktok', 'c1')}\n\n#a #b`, 'link đứng trước hashtag'); ok(withInstall(once, 'tiktok', 'c1') === once, 'không gắn đôi');
  const big = withInstall('x'.repeat(600) + '\n\n#tag', 'threads', 'c1', 500); ok(big.length <= 500 && big.includes('/get?src=threads') && big.endsWith('#tag'), 'cắt phần thân, giữ link + hashtag trong trần'); }
{ const b = bodyFor({ id: 'c9', title: 'T', description: 'D', hashtags: ['a'] }, 'm1', [{ id: 1, p: 'tiktok' }, { id: 2, p: 'youtube' }]);
  ok(b.caption.includes('/get?src=social') && b.targets[0].caption_override.includes('/get?src=tiktok&c=c9') && b.targets[1].caption_override.includes('utm_source%3Dyoutube'), 'bodyFor: caption riêng từng kênh có nguồn đo'); }
{ const t = packTexts('clip-a1', { title: 'T', description: 'Lesson' }); ok(t.description.includes(D.channels.ios.url) && /lk:clip-a1\s*$/.test(t.description), 'gói YouTube: có link cài, giữ dấu lk:'); }
{ const a = buildAss({ w: 1080, h: 1920, lines: [], words: [], cta: { start: 1, end: 2 } }); ok(a.includes(ctaLabel()) && !/play\.google|apps\.apple|chromewebstore/.test(a), 'CTA trong hình: chỉ trang cài ngắn'); }
ok(ctaLabel().length <= 20, 'nhãn CTA ngắn');
ok(installLines('tiktok').length === 1 && installLines('youtube').length === 1 + liveChannels().length, 'số dòng theo nền tảng');

// 9) Trang /get: chuyển đúng theo thiết bị, giữ nguồn đo
let first = '';
function getRun(ua, url = 'https://lexkite.com/get?src=TikTok&c=clip-a1', touch = 0, lang = 'en-US', seen = { getItem: () => null, setItem() {} }) {
  let dest = ''; first = ''; const html = fs.readFileSync('web/get/index.html', 'utf8'), code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const fake = { navigator: { userAgent: ua, maxTouchPoints: touch, language: lang, languages: [lang], sendBeacon() { return true; } }, location: { search: new URL(url).search, replace: u => { dest = u; }, assign: u => { dest = u; } }, sessionStorage: seen, document: { documentElement: { setAttribute: (k, v) => { first = v; } } }, URLSearchParams, JSON, encodeURIComponent, String };
  new Function(...Object.keys(fake), code)(...Object.values(fake)); return dest;
}
ok(getRun(UA.android).startsWith(D.channels.play.url + '&referrer=') && getRun(UA.android).includes('utm_source%3Dtiktok') && getRun(UA.android).includes('utm_campaign%3Dclip-a1'), '/get Android → Play + nguồn');
ok(getRun('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1') === D.channels.ios.url + '?ct=tiktok_clip-a1', '/get iPhone → App Store + ct');
ok(getRun('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.0 Safari/605.1.15', undefined, 5).startsWith(D.channels.ios.url), '/get iPad → App Store');
ok(getRun(UA.chrome, undefined, 0, 'ja-JP') === '/ja/?src=get_tiktok&to=install', '/get máy tính → khu Cài đúng ngôn ngữ');
ok(getRun(UA.chrome, undefined, 0, 'vi-VN') === '/?src=get_tiktok&to=install' && getRun(UA.chrome, undefined, 0, 'xx') === '/en/?src=get_tiktok&to=install', '/get: tiếng Việt về /, ngôn ngữ lạ về /en/');
ok(/noindex/.test(fs.readFileSync('web/get/index.html', 'utf8')), '/get không vào chỉ mục');

// 10) App Store và Google Play LUÔN đi đôi, hai đích riêng ghi rõ tên (chủ 04/11: "mới link app android… chưa chia ra 2 cái")
const IOS = D.channels.ios.url, PLAY = D.channels.play.url;
ok(IOS === 'https://apps.apple.com/app/id6824714708' && PLAY === 'https://play.google.com/store/apps/details?id=com.lexkite.app', 'link hai cửa hàng giữ nguyên văn');
const twoStores = (root, where) => { const as = [...root.querySelectorAll('a')], of = (u, name) => as.filter(a => (a.getAttribute('href') || '').startsWith(u));
  for (const [u, name] of [[IOS, 'App Store'], [PLAY, 'Google Play']]) { const hit = of(u); ok(hit.length > 0, `${where}: thiếu ${name}`); ok(hit.every(a => a.textContent.trim().includes(name)), `${where}: link ${name} không ghi rõ tên`); ok(hit.every(a => a.querySelector('svg')), `${where}: link ${name} thiếu icon`); } };
// Chân trang chung (trang tĩnh, từ điển, blog, pháp lý): dựng thật cả 15 ngôn ngữ, không còn mục chung
const FOOT_DOM = l => new JSDOM(siteFooter({ lang: l, text: 'x' }).replace(/<script[\s\S]*?<\/script>/g, '')).window.document.querySelector('footer');
for (const l of LANGS) { const f = FOOT_DOM(l); twoStores(f, `chân trang ${l}`);
  ok(!footGroups(l).product.some(([u]) => /play\.google|apps\.apple/.test(u)), `${l}: nhóm Sản phẩm còn mục chung trỏ một cửa hàng`);
  ok(![...f.querySelectorAll('a')].some(a => a.textContent.trim() === FOOT[l][22]), `${l}: còn mục "${FOOT[l][22]}"`); }
// Landing: khu Cài + chân trang đều có đủ hai đích
for (const l of LANGS) { const doc = new JSDOM(fs.readFileSync(fileOf(l), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '')).window.document; twoStores(doc.querySelector('#install'), `khu Cài ${l}`); twoStores(doc.querySelector('footer'), `chân trang landing ${l}`);
  ok(![...doc.querySelectorAll('footer a')].some(a => a.textContent.trim() === FOOT[l][22]), `landing ${l}: còn mục chung`); }
// /get: đủ hai đích trong HTML (không JS vẫn dùng được); về lại trang trên điện thoại không bị chuyển lần nữa, cửa hàng đúng máy đứng đầu
{ const html = getPage(D), doc = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, '')).window.document; twoStores(doc.body, '/get');
  ok(doc.querySelector('meta[name="description"]')?.content.includes('App Store'), '/get: thiếu mô tả');
  ok(themePage(html) === fs.readFileSync('web/get/index.html', 'utf8'), 'web/get/index.html cũ → node scripts/build-landing.mjs');
  const seen = { getItem: () => '1', setItem() {} };
  ok(getRun(UA.android, undefined, 0, 'en-US', seen) === '' && first === 'play', '/get Android lần sau: ở lại, Google Play đầu, App Store vẫn có');
  ok(getRun('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1', undefined, 0, 'en-US', seen) === '' && first === 'ios', '/get iPhone lần sau: ở lại, App Store đầu, Google Play vẫn có'); }
// Trong app: trang Tôi có hai dòng riêng; iPhone/iPad dùng App Store, không dùng hướng dẫn Thêm vào MH chính thay thế
{ const me = fs.readFileSync('web/js/ux1-me.js', 'utf8'); ok(me.includes('data-ch="ios"') && me.includes('data-ch="play"') && me.includes("'App Store'") && me.includes("'Google Play'"), 'Tôi: thiếu dòng App Store/Google Play');
  ok(run('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1').LKGetApp.kind() === 'ios', 'iPhone: App Store, không phải hướng dẫn thêm vào MH chính'); }
// Quét: file phát hành (web/, add-on, Functions) có link cửa hàng nào của Lexkite thì phải có cả cửa hàng kia; không còn ghi iOS chưa phát hành
{ let pair = 0; for (const f of files) { if (!/^(web|extension|functions|workers)\//.test(f) || /\/i18n\//.test(f) || !fs.existsSync(f) || !fs.statSync(f).isFile() || fs.statSync(f).size > 3e6) continue;
    const s = fs.readFileSync(f, 'utf8'), a = s.includes(IOS), p = s.includes(PLAY); if (a || p) pair++; ok(a === p, `${f}: chỉ có một cửa hàng (${a ? 'App Store' : 'Google Play'})`); }
  ok(pair > 15, `quét đôi cửa hàng quá ít file (${pair})`);
  for (const f of ['scripts/lib/site-layout.mjs', 'scripts/build-landing.mjs', 'web/js/get-app.js', 'web/js/ext-config.js']) ok(!/iOS chưa phát hành|chưa có App Store|ios: ''/.test(fs.readFileSync(f, 'utf8')), `${f}: còn ghi iOS chưa phát hành`); }

if (fail) { console.error(`✗ install-links: ${fail}/${n} kiểm tra lỗi`); process.exit(1); }
console.log(`✓ install-links: ${n} kiểm tra, quét ${scanned} file – một nguồn infra/install-links.json, landing 15 ngôn ngữ, /get, caption + CTA video, App Store + Google Play đi đôi`);
