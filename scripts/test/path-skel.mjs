#!/usr/bin/env node
// Khung #/path vẽ ngay (web/js/path-skel/*.js, sinh từ nguồn bởi scripts/build-path-skel.mjs): (1) tệp sinh khớp nguồn; (2) DOM khung dùng đúng class/thuộc tính của DayPath.map (path-day.js);
// (3) script nạp trong web/app/index.html: người dùng mặc định IELTS/chưa có cài đặt → nạp đúng ngôn ngữ, track khác → không nạp; (4) route() không đè khung bằng khung chờ.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process'; import jsdom from 'jsdom';
const rd = f => fs.readFileSync(f, 'utf8'), bad = [], LANGS = ['vi', 'en', 'ar', 'de', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'ru', 'th', 'tr', 'zh'];
try { execFileSync('node', ['scripts/build-path-skel.mjs', '--check'], { stdio: 'pipe' }); } catch (e) { bad.push(String(e.stderr || e.message).trim()); }
const pd = rd('web/js/path-day.js'), real = pd.slice(pd.indexOf('<details class="dp-stage"'), pd.indexOf('<div class="dp-body">'));
for (const c of ['class="dp-stage"', 'data-st="${st.id}"', 'class="stage-banner" style="--sc:${st.color};cursor:pointer"', 'class="tiny stage-lv"', '<h2 style="margin:.1rem 0;color:#fff">', '<div class="small" style="opacity:.92">', 'class="small stage-cando">🎯 ']) if (!real.includes(c)) bad.push(`path-day.js đổi DOM banner (${c}) – cập nhật scripts/build-path-skel.mjs + khung`);
const run = l => { const w = new jsdom.JSDOM('<body><main id="view"></main></body>', { url: 'http://localhost/app/#/path', runScripts: 'outside-only' }).window; w.eval(rd(`web/js/path-skel/${l}.js`)); w.document.dispatchEvent(new w.Event('DOMContentLoaded')); return w.document; };
for (const l of LANGS) { const d = run(l), ds = d.querySelectorAll('#lkPath details.dp-stage'); if (ds.length !== 5 || !ds[0].open || ds[1].open) bad.push(`${l}: khung phải có 5 chặng, chặng 0 mở`); if (!d.querySelector('#lkPath h1')?.textContent.trim() || [...d.querySelectorAll('.stage-cando')].some(x => x.textContent.length < 8)) bad.push(`${l}: thiếu chữ`); if (l !== 'vi' && d.querySelector('h2').textContent.includes('Chặng')) bad.push(`${l}: chữ chưa dịch`); if (!d.getElementById('lkPathCss')) bad.push(`${l}: thiếu style`); }
{ const w = new jsdom.JSDOM('<body><main id="view"><p>x</p></main></body>', { url: 'http://localhost/app/#/path', runScripts: 'outside-only' }).window; w.eval(rd('web/js/path-skel/en.js')); w.document.dispatchEvent(new w.Event('DOMContentLoaded')); if (w.document.getElementById('lkPath')) bad.push('không được đè #view đã có nội dung'); }
{ const w = new jsdom.JSDOM('<body><main id="view"></main></body>', { url: 'http://localhost/app/#/home', runScripts: 'outside-only' }).window; w.eval(rd('web/js/path-skel/en.js')); w.document.dispatchEvent(new w.Event('DOMContentLoaded')); if (w.document.getElementById('lkPath')) bad.push('chỉ vẽ ở #/path'); }
const html = rd('web/app/index.html'), m = html.match(/<script>\/\* #\/path mở thẳng[\s\S]*?<\/script>/);
if (!m) bad.push('index.html thiếu script nạp khung #/path'); else {
  const loads = (url, store, lang = 'en-US') => { const dom = new jsdom.JSDOM('<head></head><body><main id="view"></main></body>', { url, runScripts: 'outside-only' }), w = dom.window; Object.defineProperty(w.navigator, 'languages', { value: [lang] });
    for (const [k, v] of Object.entries(store)) w.localStorage.setItem(k, v); const wr = []; w.document.write = x => wr.push(x); w.eval(m[0].replace(/^<script>/, '').replace(/<\/script>$/, '')); return wr.map(x => (x.match(/src="([^"]+)"/) || [])[1]).filter(Boolean); };
  const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) bad.push(`${msg}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };
  eq(loads('http://localhost/app/#/path', {}), ['js/path-skel/en.js'], 'người mới → en');
  eq(loads('http://localhost/app/#/path', {}, 'de-DE'), ['js/path-skel/de.js'], 'trình duyệt de');
  eq(loads('http://localhost/app/?hl=ja#/path', { 'vb.uiLang': 'fr' }), ['js/path-skel/ja.js'], '?hl thắng vb.uiLang');
  eq(loads('http://localhost/app/#/path', { 'vb.uiLang': 'vi' }), ['js/path-skel/vi.js'], 'vb.uiLang');
  eq(loads('http://localhost/app/#/path', { 'ielts.settings': JSON.stringify({ exam: 'toeic' }) }), [], 'exam toeic → không nạp');
  eq(loads('http://localhost/app/#/path', { 'ielts.settings': JSON.stringify({ tracks: { cur: 'comm' } }) }), [], 'track comm → không nạp');
  eq(loads('http://localhost/app/#/path', { 'ielts.settings': JSON.stringify({ tracks: { cur: 'ielts' } }) }), ['js/path-skel/en.js'], 'track ielts → nạp');
  eq(loads('http://localhost/app/?sandbox=1#/path', { 'sbx.settings': JSON.stringify({ exam: 'general' }) }), [], 'sandbox đọc sbx.settings');
  eq(loads('http://localhost/app/#/home', {}), [], 'chỉ #/path');
  eq(loads('http://localhost/app/#/path?x=1', {}), ['js/path-skel/en.js'], '#/path?query');
}
if (!/!document\.getElementById\('lkHero'\) && !document\.getElementById\('lkPath'\)\) skel/.test(rd('web/js/app.js'))) bad.push('route() phải không thay khung #lkPath bằng khung chờ');
if (bad.length) { console.error('✗ path-skel:\n- ' + bad.join('\n- ')); process.exit(1); }
console.log(`✓ path-skel: ${LANGS.length} ngôn ngữ · DOM khớp path-day.js · script nạp đúng điều kiện`);
