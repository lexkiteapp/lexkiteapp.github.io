// Nút "Tải app" (web/js/get-app.js): đúng đích theo nền tảng, link có nguồn đếm lượt cài, ẩn khi đã cài / chạy như app.
// Chạy trên landing thật (web/en/index.html) bằng jsdom, đổi userAgent từng trường hợp. Dùng: node scripts/test/get-app.mjs
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('web/en/index.html', 'utf8');
const cfg = fs.readFileSync('web/js/ext-config.js', 'utf8'), ga = fs.readFileSync('web/js/get-app.js', 'utf8');
const UA = {
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  oldSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
};
let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.error('  ✗ ' + m); } };

// opts: touch (iPad giả Mac), standalone, ext: {eligible, installed}
function run(ua, { touch = 0, standalone = false, ext = null, apps = null } = {}) {
  const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), { url: 'https://lexkite.com/en/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  Object.defineProperty(w.navigator, 'userAgent', { value: ua });
  Object.defineProperty(w.navigator, 'maxTouchPoints', { value: touch });
  const beacons = []; w.navigator.sendBeacon = (u, b) => { beacons.push(JSON.parse(b)); return true; };
  w.matchMedia = q => ({ matches: standalone && /standalone/.test(q) });
  w.eval(cfg);
  if (apps) w.LK_APPS = apps;
  if (ext) w.LKExt = { eligible: () => ext.eligible, installed: () => ext.installed };
  w.eval(ga);
  const els = [...w.document.querySelectorAll('[data-get-app]')];
  return { w, els, beacons, head: els.find(e => e.dataset.getApp === 'head'), foot: els.find(e => e.dataset.getApp === 'foot') };
}
const play = 'https://play.google.com/store/apps/details?id=com.lexkite.app';
const store = (cfg.match(/store: '([^']+)'/) || [])[1];

// 1) Android → Google Play + referrer utm, mở tab mới
{ const r = run(UA.android);
  ok(r.els.length === 2, 'landing có nút "Tải app" ở header + chân trang');
  ok(!r.head.hidden && !r.foot.hidden, 'Android: nút hiện');
  ok(r.head.href === play + '&referrer=' + encodeURIComponent('utm_source=lexkite.com&utm_medium=get_app&utm_campaign=head'), 'Android: header → Play + referrer utm (' + r.head.href + ')');
  ok(r.foot.href.includes('utm_campaign%3Dfoot') && r.head.target === '_blank', 'Android: chân trang gắn nguồn foot, mở tab mới');
  r.head.dispatchEvent(new r.w.MouseEvent('click', { bubbles: true, cancelable: true }));
  ok(r.beacons.some(b => b.t === 'q' && b.ev === 'app_head_play'), 'Android: bấm → /api/hit app_head_play'); }
// 2) Android chưa có bản Play → không mời
{ const r = run(UA.android, { apps: { play: '', ios: '' } }); ok(r.head.hidden && r.foot.hidden, 'Android không có link Play: ẩn'); }
// 3) iPhone (chưa có App Store) → hướng dẫn Thêm vào MH chính, không rời trang
{ const r = run(UA.iphone);
  ok(!r.head.hidden && r.head.dataset.kind === 'a2hs' && r.head.getAttribute('role') === 'button', 'iPhone: nút mở hướng dẫn cài (role=button)');
  const ev = new r.w.MouseEvent('click', { bubbles: true, cancelable: true }); r.head.dispatchEvent(ev);
  ok(ev.defaultPrevented && r.beacons.some(b => b.ev === 'app_head_a2hs'), 'iPhone: bấm không điều hướng, đếm app_head_a2hs');
  ok(r.w.document.querySelector('script[src="/js/get-app-guide.js"]'), 'iPhone: nạp js/get-app-guide.js khi bấm'); }
// 4) iPad (UA giống Mac, có cảm ứng) → hướng dẫn, không coi là Safari Mac
{ const r = run(UA.ipad, { touch: 5 }); ok(r.head.dataset.kind === 'a2hs', 'iPad: hướng dẫn Thêm vào MH chính'); }
// 5) App Store đã có → link App Store + ct
{ const r = run(UA.iphone, { apps: { play, ios: 'https://apps.apple.com/app/id6824714708' } }); ok(r.head.href === 'https://apps.apple.com/app/id6824714708?ct=get_app_head', 'iPhone có App Store: link + ct'); }
// 6) Safari Mac ≥ 17 → hướng dẫn Thêm vào Dock; Safari 16 → web app (chỉ chân trang)
{ const r = run(UA.macSafari); ok(r.head.dataset.kind === 'dock' && !r.head.hidden, 'Safari Mac 18: hướng dẫn Thêm vào Dock'); }
{ const r = run(UA.oldSafari); ok(r.head.hidden && !r.foot.hidden && r.foot.href.endsWith('/app/?hl=en&src=get_app_foot'), 'Safari Mac 16: header ẩn, chân trang → web app'); }
// 7) Firefox máy tính → chỉ chân trang → web app
{ const r = run(UA.firefox); ok(r.head.hidden && r.head.hasAttribute('data-off') && !r.foot.hidden && r.foot.href.includes('/app/?hl=en&src=get_app_foot'), 'Firefox: header ẩn, chân trang → web app'); }
// 8) Chrome máy tính: chờ biết add-on → CWS + utm; đã cài → ẩn
{ const r = run(UA.chrome, { ext: { eligible: true, installed: false } });
  ok(r.head.hidden && !r.head.hasAttribute('data-off'), 'Chrome: chưa hiện ngay (chờ kiểm tra add-on, vẫn giữ chỗ)');
  await new Promise(res => { r.w.dispatchEvent(new r.w.Event('load')); setTimeout(res, 1100); });
  ok(!r.head.hidden && r.head.href === store + '?utm_source=lexkite.com&utm_medium=get_app&utm_campaign=head', 'Chrome: header → Chrome Web Store + utm (' + r.head.href + ')'); }
{ const r = run(UA.chrome, { ext: { eligible: true, installed: true } });
  await new Promise(res => { r.w.dispatchEvent(new r.w.Event('load')); setTimeout(res, 1100); });
  ok(r.head.hidden && r.foot.hidden, 'Chrome đã cài add-on: ẩn'); }
// 9) Đang chạy như app (PWA standalone) → ẩn mọi nơi
{ const r = run(UA.android, { standalone: true }); ok(r.head.hidden && r.foot.hidden, 'PWA standalone: ẩn'); }
{ const r = run(UA.iphone); r.w.navigator.standalone = true; r.w.LKGetApp.scan(); ok(r.head.hidden, 'iOS Màn hình chính (navigator.standalone): ẩn'); }
// 10) Chữ hướng dẫn theo ngôn ngữ có đủ cho 15 trang
for (const l of ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr']) {
  const t = JSON.parse(fs.readFileSync(`web/js/get-app/${l}.json`, 'utf8'));
  ok(t.iph.length === 4 && t.ipad.length === 2 && t.mac.length === 3 && t.ok && [...t.iph, ...t.ipad, ...t.mac].every(Boolean), `get-app/${l}.json đủ chữ`);
  if (l !== 'vi') ok(!/[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(JSON.stringify(t)), `get-app/${l}.json không lẫn tiếng Việt`);
}
if (fail) { console.error(`✗ get-app: ${fail}/${n} kiểm tra lỗi`); process.exit(1); }
console.log(`✓ get-app: ${n} kiểm tra – Android→Play, Chrome→CWS, iPhone/iPad/Mac→hướng dẫn, Firefox→web app, ẩn khi đã cài`);
