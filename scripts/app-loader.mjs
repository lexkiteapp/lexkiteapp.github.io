// Bản web (dist/app/index.html): nạp JS khung app SAU lần vẽ đầu – màn đầu (khung chào #lkHero, CSS) vẽ xong trước,
// không tranh băng thông với ~25 file JS + font (LCP mobile 7,0 s → mục tiêu ≤ 2,5 s – docs/UX-PUBLIC.md §LCP app).
// Chỉ đổi dist/ của web: web/app/index.html giữ <script defer> (add-on MV3 cấm script nội tuyến, test jsdom đọc thẻ script,
// app di động chép web/app/index.html). Giữ nguyên ngữ nghĩa defer: chạy đúng thứ tự (async=false), xong hết mới phát
// DOMContentLoaded (app.js khởi động lúc đó) và — nếu sự kiện load thật đã qua — phát lại load (heal.js, native.js, ads.js).
// Dùng: node scripts/app-loader.mjs [dist/app/index.html]   ·   --check: chỉ kiểm tra bản đã biến đổi
import fs from 'fs';
const f = process.argv.slice(2).find(a => !a.startsWith('--')) || 'dist/app/index.html';
let html = fs.readFileSync(f, 'utf8');
const TAG = /^[ \t]*<script(?: defer)? src="([^"]+)"><\/script>\n/gm;
const srcs = [...html.matchAll(TAG)].map(m => m[1]);
if (process.argv.includes('--check')) {
  const m = html.match(/<script id="lk-boot">[\s\S]*?var S=(\[[^\]]*\])/);
  if (!m || srcs.length) { console.error('✗ app-loader: ' + f + ' chưa biến đổi (còn ' + srcs.length + ' thẻ script)'); process.exit(1); }
  console.log('✓ app-loader: ' + JSON.parse(m[1]).length + ' file JS nạp sau lần vẽ đầu'); process.exit(0);
}
if (srcs.length < 10) { console.error('✗ app-loader: chỉ thấy ' + srcs.length + ' thẻ <script src> trong ' + f); process.exit(1); }
// Thứ tự chạy cũ: script đồng bộ (i18n.js) chạy lúc phân tích HTML, trước mọi script defer
const sync = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const order = [...sync, ...srcs.filter(s => !sync.includes(s))];
const FONT = /[ \t]*<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com\/[^"]+)" media="print" onload="this\.media='all'">\n/;
const font = (html.match(FONT) || [])[1] || '';
html = html.replace(TAG, '').replace(FONT, '');
// Nạp sau khung hình đầu (rAF → setTimeout); tab nền không chạy rAF → dự phòng 300 ms
const boot = `<script id="lk-boot">(function(){var S=${JSON.stringify(order)},F=${JSON.stringify(font)},d=document,w=window,done=0;
function go(){if(done)return;if(d.readyState==='loading'){d.addEventListener('DOMContentLoaded',go);return}done=1;var late=d.readyState==='complete',n=S.length;
if(F){var l=d.createElement('link');l.rel='stylesheet';l.href=F;d.head.appendChild(l)}
S.forEach(function(u){var s=d.createElement('script');s.src=u;s.async=false;s.onload=s.onerror=function(){if(--n)return;w.__lkReady=1;d.dispatchEvent(new Event('DOMContentLoaded'));if(late||d.readyState==='complete'&&w.__lkLoaded)w.dispatchEvent(new Event('load'))};d.body.appendChild(s)})}
w.addEventListener('load',function(){w.__lkLoaded=1});
if(w.requestAnimationFrame)requestAnimationFrame(function(){setTimeout(go,0)});setTimeout(go,300)})()</script>
`;
if (!html.includes('</body>')) { console.error('✗ app-loader: thiếu </body>'); process.exit(1); }
html = html.replace(/(<noscript><nav[\s\S]*?<\/noscript>\n)?<\/body>/, m => boot + m);
fs.writeFileSync(f, html);
console.log('✓ app-loader: ' + order.length + ' file JS (+ font) nạp sau lần vẽ đầu → ' + f);
