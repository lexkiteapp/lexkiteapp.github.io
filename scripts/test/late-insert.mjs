// 🧱 Chặn tái phát loại lỗi "chèn muộn đẩy nội dung" và "việc phụ giành băng thông của trang đang mở" (mobile-qa CLS 0,1142, LCP deep 6–9 s, 04/11).
// Chạy trong npm test (jsdom + tĩnh, không cần trình duyệt). Số đo thật: mobile-qa.yml.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
const R = fileURLToPath(new URL('../../', import.meta.url)), rd = f => fs.readFileSync(R + f, 'utf8');
let fail = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} late-insert: ${m}`); if (!c) fail++; };
const app = rd('web/js/app.js'), loader = rd('scripts/app-loader.mjs');

// ---- 1) Thanh thoát phải gắn TRƯỚC lần vẽ của màn mới (vi tác vụ), không đợi khung hình sau
{
  const dom = new JSDOM('<!doctype html><body><main id="view"><div id="old"></div></main></body>', { url: 'http://localhost/app/#/practice/mcq?src=deck', runScripts: 'outside-only' }), w = dom.window;
  w.requestAnimationFrame = () => 1; // không bao giờ chạy: mô phỏng "chưa tới khung hình"
  w.App = { route() {}, afterRoute: null };
  w.eval(rd('web/js/exit-guard.js'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  await new Promise(r => setTimeout(r, 5));
  w.App.afterRoute('practice');
  const view = w.document.getElementById('view');
  view.innerHTML = '<div class="study-wrap"><div class="card celebrate"></div></div>'; // thẻ kết quả thay màn câu hỏi, không có nút thoát riêng
  await Promise.resolve(); await Promise.resolve();
  const bar = view.querySelector('.lk-exitbar [data-exit]');
  ok(!!bar && view.firstElementChild.classList.contains('lk-exitbar'), 'thẻ kết quả có thanh thoát ngay trong vi tác vụ, trước khi trình duyệt vẽ (gắn sau khung hình = đẩy .study-wrap 64 px)');
  w.close();
}

// ---- 2) Lời mời về muộn nằm CUỐI thẻ: khối đã vẽ không bị đẩy
{
  const dom = new JSDOM('<!doctype html><body><div class="celebrate" id="c"><div id="aoHost"></div><section class="path-reward"></section></div></body>', { url: 'http://localhost/app/', runScripts: 'outside-only' }), w = dom.window;
  w.t = s => s;
  w.eval(rd('web/js/ad-offers.js'));
  const card = w.document.getElementById('c'), host = w.document.getElementById('aoHost');
  await w.AdOffers.attach(host, { wrong: 1, total: 10, score: 9, pct: 90, unit: false, xp: 0 });
  ok(!!host.querySelector('.ad-offer'), 'lời mời "Cơ hội thứ 2" vẫn hiện (không cắt)');
  ok(card.lastElementChild === host && card.firstElementChild.classList.contains('path-reward'), 'lời mời về sau .path-reward → xuống cuối thẻ, không đẩy .path-reward');
  w.close();
}

// ---- 3) Chỉ nối thêm vào cuối: màn thưởng không chèn lên trên
ok(/card\.appendChild\(sec\)/.test(rd('web/js/path-reward.js')), '.path-reward nối vào CUỐI thẻ kết quả (về muộn không đẩy gì)');

// ---- 4) Rời màn chào: thanh trên hiện ngay lúc chạm, trước khi đợi gói
{ const rt = app.slice(app.indexOf('const b = [].concat(ROUTE_BUNDLE[name]'), app.indexOf('await App.need(...b)'));
  ok(/if \(name !== 'welcome'\) document\.body\.classList\.remove\('bare'\)/.test(rt), "route() gỡ 'bare' trước khi đợi gói (đợi rồi mới gỡ = đẩy #view 65 px, CLS #/home 0,07–0,09)"); }

// ---- 5) Việc phụ chờ lần vẽ đầu
const pf = (app.match(/App\.prefetchAll = [^\n]+/) || [''])[0];
ok(/App\.painted\.then\(\(\) => setTimeout\(go, \d+\)\)/.test(pf), 'tải sẵn mọi gói chờ lần vẽ đầu');
ok(/App\.painted\.then\(\(\) => idle\(\(\) => App\.need\('remind'\)/.test(app), "gói nhắc học (kéo theo ~70 KB i18nx/i18nl) chờ lần vẽ đầu");
ok(/dispatchEvent\(new Event\('lk:drawn'\)\)/.test(app) && /addEventListener\('lk:drawn',fonts\)/.test(loader) && !/if\(F\)\{var l=/.test(loader), 'font web của bản dist nạp sau trang đầu (lk:drawn), có dự phòng hẹn giờ');
ok(/--font: "Be Vietnam Pro", "Be Vietnam Pro Fallback"/.test(rd('web/css/style.css')), 'cả app dùng font dự phòng khớp số đo → font về muộn gần như không xô chữ');

// ---- 6) Kho từ không chặn lần vẽ đầu ở màn không cần, và vẫn được nạp
{ const s0 = app.indexOf('const softOf = '), so = app.slice(s0, app.indexOf('\n  };', s0) + 5); // đúng hàm softOf (main thêm khối Scroll giữa softOf và route())
  const softOf = new Function('topicOf', so + '; return softOf;')(id => (id === 'education' ? { words: [{}] } : null));
  const q = s => new URLSearchParams(s);
  ok(softOf('review', '', q('')).join() === 'words' && !softOf('review', '', q('hub=1')).length && !softOf('review', '', q('src=forgetting')).length, 'phiên ôn vẽ trước kho từ; hub/nguồn riêng vẫn đợi kho');
  ok(softOf('practice', 'mcq', q('src=topic:education')).join() === 'words,tsl' && softOf('practice', 'mcq', q('')).join() === 'words,tsl', 'luyện chủ đề lõi / sổ từ vẽ trước kho từ');
  ok(!softOf('practice', 'mcq', q('src=topic:ngsl1.3')).length && !softOf('practice', 'mcq', q('src=origin:x')).length && !softOf('practice', '', q('')).length && !softOf('home', '', q('')).length, 'nguồn cần kho (bài con lộ trình, origin) và màn khác vẫn đợi kho như cũ');
  ok(/if \(sf\.length\) afterPaint\(\(\) => idle\(\(\) => App\.need\(\.\.\.sf\)/.test(app), 'kho từ vẫn được nạp ngay sau lần vẽ (không mất dữ liệu)');
  ok(/b\.push\('dist'\)/.test(app) && /dist: \['js\/distract\.js'\]/.test(app), 'câu đầu vẫn có bộ chọn phương án nhiễu (distract.js nạp cứng)');
  ok(/addEventListener\('lk:soft'[^\n]*warmLib\(\)/.test(rd('web/js/study.js')), 'kho về sau: chuẩn hóa theo lát, không có tác vụ dài lúc đang làm bài'); }

if (fail) { console.error(`✗ late-insert: ${fail} lỗi`); process.exit(1); }
console.log('✓ late-insert: đạt');
