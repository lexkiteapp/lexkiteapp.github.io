// 🎯 Trang đích /go/<lang>/ (scripts/build-go.mjs): đủ 15 ngôn ngữ, SEO (canonical + 16 hreflang), nhẹ, quiz chạy thật, UTM chỉ giữ giá trị an toàn.
// Chạy trong npm test: node scripts/test/go-landing.mjs
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { gzSize } from '../lib/gz-canon.mjs';
import { LANGS, KEYS, copyOf, outputs, goUrl, fileOf, QUIZ } from '../build-go.mjs';

const errs = []; let n = 0;
const ok = (c, m) => { n++; if (!c) errs.push(m); };
const out = outputs();
ok(LANGS.length === 15, 'phải đủ 15 ngôn ngữ');
const en = copyOf('en');
for (const l of LANGS) {
  const html = out[fileOf(l)], disk = fs.existsSync(fileOf(l)) ? fs.readFileSync(fileOf(l), 'utf8') : '';
  ok(html === disk, `${l}: web/go chưa dựng lại (node scripts/build-go.mjs)`);
  const c = copyOf(l);
  for (const k of KEYS) { ok(c[k] && c[k].length > 1, `${l}: thiếu chữ "${k}"`); if (l !== 'en' && !['t3'].includes(k) && l !== 'id') ok(c[k] !== en[k], `${l}: "${k}" còn nguyên tiếng Anh`); }
  ok(gzSize(html) <= 8192, `${l}: trang > 8 KB gzip (${gzSize(html)})`);
  const d = new JSDOM(html).window.document;
  ok(d.documentElement.lang === l, `${l}: lang sai`);
  ok(d.documentElement.dir === (l === 'ar' ? 'rtl' : 'ltr'), `${l}: dir sai`);
  ok(d.querySelector('link[rel=canonical]').href === goUrl(l), `${l}: canonical sai`);
  ok(d.querySelectorAll('link[hreflang]').length === 16, `${l}: cần 15 hreflang + x-default`);
  ok(d.querySelectorAll('h1').length === 1, `${l}: cần đúng 1 H1`);
  ok(!/https?:\/\/(?!lexkite\.com|schema\.org)/.test(html.replace(/<script type="application\/ld\+json">.*?<\/script>/s, '')), `${l}: có tài nguyên ngoài lexkite.com`);
  ok([...d.querySelectorAll('a.btn[data-app]')].every(a => /^\/app\//.test(a.getAttribute('data-app'))), `${l}: CTA phải vào /app/`);
  ok(d.querySelectorAll('.langs a').length === 15, `${l}: thiếu liên kết 15 ngôn ngữ`);
  ok(!/<(img)(?![^>]*\balt=)/.test(html), `${l}: ảnh thiếu alt`);
}

// Quiz chạy thật (en): đáp sai → báo; đáp đúng → sang câu; xong 3 câu → thẻ "Học tiếp trong app"; UTM chỉ giữ khóa/giá trị an toàn
const beacons = [];
const dom = new JSDOM(out[fileOf('en')], { url: goUrl('en') + '?utm_source=tiktok&utm_campaign=reel_7&c=ab12&email=a@b.com&utm_medium=x%20y', runScripts: 'dangerously', pretendToBeVisual: true,
  beforeParse(w) { w.navigator.sendBeacon = (u, b) => { beacons.push(JSON.parse(b)); return true; }; w.speechSynthesis = { cancel() {}, speak() {} }; w.SpeechSynthesisUtterance = function () {}; } });
const w = dom.window, D = w.document, $ = s => D.querySelector(s);
D.addEventListener('click', e => e.preventDefault()); // jsdom không điều hướng
ok(beacons.some(b => b.ev === 'go_view' && b.lang === 'en' && b.page === 'go'), 'thiếu beacon go_view');
const app = [...D.querySelectorAll('[data-app]')][0].href;
ok(/src=go/.test(app) && /utm_source=tiktok/.test(app) && /utm_campaign=reel_7/.test(app) && /c=ab12/.test(app), 'UTM hợp lệ phải đi tiếp sang /app/: ' + app);
ok(!/email|a%40b|utm_medium/.test(app), 'không được mang tham số lạ/giá trị không an toàn: ' + app);
QUIZ.forEach((q, i) => {
  const opts = [...D.querySelectorAll('.opt')];
  ok(opts.length === 3 && $('.pic').textContent === q.e, `câu ${i + 1}: hình/đáp án sai`);
  const wrong = opts.find((_, j) => j !== q.c); wrong.click();
  ok(wrong.classList.contains('bad') && $('.fb').textContent.includes(q.a[q.c]), `câu ${i + 1}: đáp sai phải báo đáp án đúng`);
  ok($('#next').hidden, `câu ${i + 1}: chưa được qua câu khi chưa đúng`);
  opts[q.c].click();
  ok(opts[q.c].classList.contains('good') && !$('#next').hidden, `câu ${i + 1}: đáp đúng phải mở nút tiếp`);
  $('#next').click();
});
ok($('#quiz').hidden && !$('#done').hidden, 'xong 3 câu phải hiện thẻ kết quả');
ok(['go_start', 'go_done'].every(e => beacons.some(b => b.ev === e)), 'thiếu beacon go_start/go_done');
$('#done a').click(); ok(beacons.some(b => b.ev === 'go_cta'), 'thiếu beacon go_cta');
// Bot không đếm
const bot = new JSDOM(out[fileOf('vi')], { url: goUrl('vi'), runScripts: 'dangerously', beforeParse(w) { Object.defineProperty(w.navigator, 'webdriver', { value: true }); w.navigator.sendBeacon = () => { n++; errs.push('bot không được gửi beacon'); }; } });
ok(!!bot.window.document.querySelector('.opt'), 'vi: quiz phải vẽ được');
ok(/^\/app\/\?src=go$/.test(new URL([...bot.window.document.querySelectorAll('[data-app]')][1].href).pathname + new URL([...bot.window.document.querySelectorAll('[data-app]')][1].href).search), 'vi: CTA /app/?src=go');
// /go/ chọn ngôn ngữ: có link thật cho cả 15
ok((out['web/go/index.html'].match(/href="\/go\/[a-z]{2}\//g) || []).length === 15, '/go/: thiếu liên kết ngôn ngữ');

if (errs.length) { console.error('✗ go-landing:\n' + errs.map(e => ' - ' + e).join('\n')); process.exit(1); }
console.log(`✓ go-landing: ${n} kiểm, 0 lỗi`);
