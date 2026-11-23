#!/usr/bin/env node
// Khung #/path · #/dict/<từ> vẽ ngay (scripts/lib/path-skel.mjs sinh từ nguồn; app-loader ghi vào dist/js/path-skel): (1) app-loader ghi đủ 30 tệp; (2) DOM khung dùng đúng class/thuộc tính của DayPath.map (path-day.js);
// (3) script nạp trong web/app/index.html: người dùng mặc định IELTS/chưa có cài đặt → nạp đúng ngôn ngữ, track khác → không nạp; (4) route() không đè khung bằng khung chờ.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { execFileSync } from 'node:child_process'; import jsdom from 'jsdom'; import { buildSkeletons } from '../lib/path-skel.mjs';
const rd = f => fs.readFileSync(f, 'utf8'), bad = [], LANGS = ['vi', 'en', 'ar', 'de', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'ru', 'th', 'tr', 'zh'];
const SK = buildSkeletons(); // tệp khung KHÔNG commit: app-loader sinh vào dist/js/path-skel lúc dựng (ngoài ngân sách byte người học)
{ // app-loader ghi tệp khung cạnh js/ của bản dựng (không commit trong web/js)
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pskel-')); fs.mkdirSync(path.join(d, 'app')); fs.mkdirSync(path.join(d, 'js'));
  const idx = rd('web/app/index.html').replace(/(<\/body>)/, '<noscript><nav></nav></noscript>\n$1'); fs.writeFileSync(path.join(d, 'app/index.html'), idx);
  try { execFileSync('node', ['scripts/app-loader.mjs', path.join(d, 'app/index.html')], { stdio: 'pipe' }); const got = fs.readdirSync(path.join(d, 'js/path-skel')).sort().join(); if (got !== Object.keys(SK).sort().join()) bad.push('app-loader ghi thiếu/thừa tệp khung: ' + got); }
  catch (e) { bad.push('app-loader lỗi: ' + String(e.stderr || e.message).slice(0, 200)); } fs.rmSync(d, { recursive: true, force: true }); }
const pd = rd('web/js/path-day.js'), real = pd.slice(pd.indexOf('<details class="dp-stage"'), pd.indexOf('<div class="dp-body">'));
for (const c of ['class="dp-stage"', 'data-st="${st.id}"', 'class="stage-banner" style="--sc:${st.color};cursor:pointer"', 'class="tiny stage-lv"', '<h2 style="margin:.1rem 0;color:#fff">', '<div class="small" style="opacity:.92">', 'class="small stage-cando">🎯 ']) if (!real.includes(c)) bad.push(`path-day.js đổi DOM banner (${c}) – cập nhật scripts/build-path-skel.mjs + khung`);
const run = l => { const w = new jsdom.JSDOM('<body><main id="view"></main></body>', { url: 'http://localhost/app/#/path', runScripts: 'outside-only', pretendToBeVisual: true }).window; w.eval(SK[`${l}.js`]); w.document.dispatchEvent(new w.Event('DOMContentLoaded')); return w.document; };
for (const l of LANGS) { const d = run(l), ds = d.querySelectorAll('#lkPath details.dp-stage'); if (ds.length !== 5 || !ds[0].open || ds[1].open) bad.push(`${l}: khung phải có 5 chặng, chặng 0 mở`); if (!d.querySelector('#lkPath h1')?.textContent.trim() || [...d.querySelectorAll('.stage-cando')].some(x => x.textContent.length < 8)) bad.push(`${l}: thiếu chữ`); if (l !== 'vi' && d.querySelector('h2').textContent.includes('Chặng')) bad.push(`${l}: chữ chưa dịch`); if (!d.getElementById('lkPathCss')) bad.push(`${l}: thiếu style`); }
{ const w = new jsdom.JSDOM('<body><main id="view"><p>x</p></main></body>', { url: 'http://localhost/app/#/path', runScripts: 'outside-only', pretendToBeVisual: true }).window; w.eval(SK['en.js']); w.document.dispatchEvent(new w.Event('DOMContentLoaded')); if (w.document.getElementById('lkPath')) bad.push('không được đè #view đã có nội dung'); }
{ const w = new jsdom.JSDOM('<body><main id="view"></main></body>', { url: 'http://localhost/app/#/home', runScripts: 'outside-only', pretendToBeVisual: true }).window; w.eval(SK['en.js']); w.document.dispatchEvent(new w.Event('DOMContentLoaded')); if (w.document.getElementById('lkPath')) bad.push('chỉ vẽ ở #/path'); }
// #/dict/<từ>: đầu trang từ điển (mẫu Stitch chạy lúc build) – 15 ngôn ngữ, ô tìm điền sẵn từ trên URL (đã thoát HTML), đoạn mô tả có mặt
for (const l of LANGS) { const w = new jsdom.JSDOM('<body><main id="view"></main></body>', { url: 'http://localhost/app/#/dict/he%22%3Cllo', runScripts: 'outside-only', pretendToBeVisual: true }).window;
  w.eval(SK[`dict-${l}.js`]); w.document.dispatchEvent(new w.Event('DOMContentLoaded')); const d = w.document, q = d.querySelector('#lkPath #q'), p = d.querySelector('#lkPath p.px-4');
  if (!q || q.value !== 'he"<llo') bad.push(`dict-${l}: ô tìm phải điền sẵn từ trên URL (${q && q.value})`); if (!p || p.textContent.length < 20) bad.push(`dict-${l}: thiếu đoạn mô tả`); if (!d.querySelector('#lkPath h1')?.textContent.trim()) bad.push(`dict-${l}: thiếu tiêu đề`); if (l !== 'vi' && /Quay lại|Tra từ/.test(d.getElementById('view').innerHTML.replace(/Tra từ điển/g, ''))) bad.push(`dict-${l}: chữ chưa dịch`); }
{ const w = new jsdom.JSDOM('<body><main id="view"></main></body>', { url: 'http://localhost/app/#/dict', runScripts: 'outside-only', pretendToBeVisual: true }).window; w.eval(SK['dict-en.js']); w.document.dispatchEvent(new w.Event('DOMContentLoaded')); if (w.document.getElementById('lkPath')) bad.push('dict: chỉ #/dict/<từ>, không vẽ ở #/dict'); }
const html = rd('web/app/index.html'), m = html.match(/<script>\/\* #\/path \(và #\/dict[\s\S]*?<\/script>/);
if (!m) bad.push('index.html thiếu script nạp khung #/path'); else {
  const loads = (url, store, lang = 'en-US') => { const dom = new jsdom.JSDOM('<head></head><body><main id="view"></main></body>', { url, runScripts: 'outside-only', pretendToBeVisual: true }), w = dom.window; Object.defineProperty(w.navigator, 'languages', { value: [lang] });
    for (const [k, v] of Object.entries(store)) w.localStorage.setItem(k, v); const wr = []; w.document.write = x => wr.push(x); w.eval(m[0].replace(/^<script>/, '').replace(/<\/script>$/, '')); return wr.map(x => (x.match(/src=([^>\s]+)/) || [])[1]).filter(Boolean); };
  const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) bad.push(`${msg}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };
  eq(loads('http://localhost/app/#/path', {}), ['js/path-skel/en.js'], 'người mới → en');
  eq(loads('http://localhost/app/#/path', {}, 'de-DE'), ['js/path-skel/de.js'], 'trình duyệt de');
  eq(loads('http://localhost/app/?hl=ja#/path', { 'vb.uiLang': 'fr' }), ['js/path-skel/ja.js'], '?hl thắng vb.uiLang');
  eq(loads('http://localhost/app/#/path', { 'vb.uiLang': 'vi' }), ['js/path-skel/vi.js'], 'vb.uiLang');
  eq(loads('http://localhost/app/#/path', { 'ielts.settings': JSON.stringify({ exam: 'toeic' }) }), [], 'exam toeic → không nạp');
  eq(loads('http://localhost/app/#/path', { 'ielts.settings': JSON.stringify({ tracks: { cur: 'comm' } }) }), [], 'track comm → không nạp');
  eq(loads('http://localhost/app/#/path', { 'ielts.settings': JSON.stringify({ tracks: { cur: 'ielts' } }) }), ['js/path-skel/en.js'], 'track ielts → nạp');
  eq(loads('http://localhost/app/?sandbox=1#/path', { 'sbx.settings': JSON.stringify({ exam: 'general' }) }), [], 'sandbox đọc sbx.settings');
  eq(loads('http://localhost/app/#/dict/hello', {}), ['js/path-skel/dict-en.js'], 'dict người mới → dict-en');
  eq(loads('http://localhost/app/#/dict/hello', {}, 'vi-VN'), ['js/path-skel/dict-vi.js'], 'dict vi');
  eq(loads('http://localhost/app/#/dict/hello', { 'ielts.settings': '{}' }), [], 'dict người dùng cũ → không nạp');
  eq(loads('http://localhost/app/#/dict/hello', { 'vb.meanLang': 'vi' }), [], 'dict đã chọn ngôn ngữ giải nghĩa → không nạp');
  eq(loads('http://localhost/app/#/dict', {}), [], 'chỉ #/dict/<từ>');
  eq(loads('http://localhost/app/#/home', {}), [], 'chỉ #/path');
  eq(loads('http://localhost/app/#/path?x=1', {}), ['js/path-skel/en.js'], '#/path?query');
}
if (!html.includes('window.__lkSk=1;') || !/__lkSk\)\{try\{new P\(function\(q,o2\)/.test(rd('scripts/app-loader.mjs'))) bad.push('JS khung #/path phải chờ LCP rơi vào #lkPath – app-loader + script nạp + khung');
if (!/!document\.getElementById\('lkHero'\) && !document\.getElementById\('lkPath'\)\) skel/.test(rd('web/js/app.js'))) bad.push('route() phải không thay khung #lkPath bằng khung chờ');
if (!SK['dict-en.js'].includes('lkDictCss') || !/\.v2s-dict[^{]*\{/.test(SK['dict-en.js'])) bad.push('khung dict phải mang CSS lược từ st-v2-dict.css (không dùng <link> chặn vẽ)');
if (/st-v2-dict\.css/.test(rd('web/app/index.html'))) bad.push('index.html không được nạp st-v2-dict.css (đã nhúng bản lược trong khung)');
if (bad.length) { console.error('✗ path-skel:\n- ' + bad.join('\n- ')); process.exit(1); }
console.log(`✓ path-skel: ${LANGS.length} ngôn ngữ · DOM khớp path-day.js · script nạp đúng điều kiện`);
