// #/skills mở thẳng: khung chờ vẽ ĐỒNG BỘ ngay sau #view (web/app/index.html, script data-lksk), không chữ, không đụng trang khác, add-on bỏ script nội tuyến.
// Gốc 26/11: #view trống 3–7 s tới khi ~100 script defer nạp xong (post-deploy-check báo trống ở 390 px).
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
let n = 0, bad = 0; const ok = (c, m) => { n++; if (!c) { bad++; console.error('✗ ' + m); } };
const html = fs.readFileSync('web/app/index.html', 'utf8'), m = /<script data-lksk>([\s\S]*?)<\/script>/.exec(html);
ok(m && html.indexOf('data-lksk') > html.indexOf('<main id="view"'), 'khung chờ đặt ngay sau #view');
const run = (hash, pre = '') => { const w = new JSDOM(`<!doctype html><body><main id="view">${pre}</main></body>`, { url: 'https://x.test/app/' + hash, runScripts: 'outside-only' }).window; w.eval(m[1]); return w.document.getElementById('view'); };
for (const h of ['#/skills', '#/skills?hl=en']) { const v = run(h); ok(v.querySelector('.skel-page[aria-busy=true] .skel-card') && v.querySelectorAll('.skel-card').length === 4, `${h}: có khung chờ 4 thẻ`); ok(!v.textContent.trim(), `${h}: khung không chữ (không cần dịch)`); }
for (const h of ['#/skill/listening', '#/skillsx', '#/home', '#/path', '']) ok(!run(h).firstChild, `${h}: không vẽ khung`);
ok(run('#/skills', '<i>x</i>').innerHTML === '<i>x</i>', '#view đã có nội dung → không đè');
ok(/skel-page/.test(fs.readFileSync('web/css/style.css', 'utf8')) && /\.skel-card/.test(fs.readFileSync('web/css/style.css', 'utf8')), 'CSS khung chờ có sẵn ở style.css');
ok(fs.readFileSync('scripts/build-extension.sh', 'utf8').includes('<script data-lksk>'), 'add-on bỏ khung chờ nội tuyến (CSP MV3)');
if (bad) { console.error(`skills-skel: ${bad}/${n} trượt`); process.exit(1); }
console.log(`✓ skills-skel: ${n} kiểm tra đạt`);
