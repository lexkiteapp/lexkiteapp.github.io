// 📱 Chặn tái phát lỗi web mobile tìm được bởi mobile-qa.yml (scripts/test/mobile-qa.mjs) – kiểm tĩnh, chạy trong npm test.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const R = fileURLToPath(new URL('../../', import.meta.url)), rd = f => fs.readFileSync(R + f, 'utf8');
let fail = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} mobile-guards: ${m}`); if (!c) fail++; };
const app = rd('web/js/app.js');
const pf = (app.match(/App\.prefetchAll = [^\n]+/) || [''])[0];
ok(/let inflight = 0/.test(app) && /inflight\+\+/.test(app) && /finally\(\(\) => \{ inflight--; \}\)/.test(app), 'đếm số gói đang tải (need1)');
ok(/inflight \|\| document\.readyState !== 'complete'/.test(pf), 'tải sẵn chỉ bắt đầu khi trang đã load và không còn gói đang tải (không giành băng thông 4G với trang đang mở → LCP)');
ok(/l\.onload = l\.onerror = next/.test(pf) && /for \(let i = 0; i < 3; i\+\+\) next\(\)/.test(pf) && !/\.forEach\(f => \{ const l = document\.createElement\('link'\)/.test(pf), 'tải sẵn xếp hàng 3 file một lúc (không đổ 200+ <link prefetch> cùng lúc)');
const css = rd('web/css/style.css');
ok(/\.top-stats #installBtn \{[^}]*min-width: 44px[^}]*min-height: 44px/.test(css), 'nút cài app ở thanh trên ≥ 44×44 (360 px từng là 38×35)');
const rt = app.slice(app.indexOf('const b = [].concat(ROUTE_BUNDLE[name]'), app.indexOf('await App.need(...b)'));
ok(/document\.body\.classList\.toggle\('focus'/.test(rt) && (app.match(/classList\.toggle\('focus'/g) || []).length === 1, 'chế độ tập trung (ẩn thanh trên) bật NGAY đầu route, trước khi đợi tải gói (CLS 0,07–0,09 khi vào ôn/luyện)');
ok(/const mo = new MutationObserver\(crumb\); mo\.observe\(view, \{ childList: true \}\)/.test(app) && /finally \{ mo\.disconnect\(\); \}/.test(app), 'breadcrumb chèn ngay khi trang vẽ .page-head (không đợi dữ liệu → CLS từ điển 0,04–0,05)');
const b = JSON.parse(rd('scripts/test/mobile-qa.budget.json'));
ok(b['tap<44'] === 0 && b.hscroll === 0 && b['kbd-cover'] === 0 && b.cls <= 0.1 && b.inp_ms <= 200 && b.lcp_ms <= 2500 && b.lcp_deep_ms <= 10000 && b.tbt_ms <= 200, 'ngân sách mobile-qa không bị nới (44 px, 0 tràn, CLS ≤ 0,1, INP ≤ 200 ms, LCP ≤ 2,5 s)');
const MQA = rd('.github/workflows/mobile-qa.yml');
ok(/serve-web\.mjs out\/site 8080/.test(MQA), 'mobile-qa đo qua máy chủ có nén (như Cloudflare), không dùng python http.server');
ok(/app-loader\.mjs out\/site\/app\/index\.html/.test(MQA) && /esbuild@[\d.]+ .*--minify .*--outdir=\.\.\/out\/site/.test(MQA), 'mobile-qa đo bản phát hành như build-web.sh (JS khung app nạp sau lần vẽ đầu + rút gọn), không đo web/ thô');
{ const st = rd('web/js/study.js'), ds = rd('web/js/distract.js');
  ok((st.match(/warmLib\(\)\.then\(\(\) => \{ if \(location\.hash === h0\) next\(\); \}\)/g) || []).length >= 2 && /performance\.now\(\) - t0 < 8/.test(st) && /async function warm\(pool/.test(ds) && /Date\.now\(\) - t0 < 8/.test(ds),
    'trắc nghiệm/học thông minh: kho từ + bộ nhớ Distract làm nóng theo lát ≤ 8 ms trước câu đầu (TBT #/practice từng 205–418 ms)'); }
if (fail) { console.error(`✗ mobile-guards: ${fail} lỗi`); process.exit(1); }
console.log('✓ mobile-guards: đạt');
