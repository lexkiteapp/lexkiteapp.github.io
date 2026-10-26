// Thu thập mọi câu nội dung tiếng Việt mà app sẽ dịch máy lúc chạy (contentTranslate) → content/i18n/strings.json
// Cách làm: chạy app trong jsdom ở giao diện tiếng Anh, đi theo mọi đường dẫn nội bộ #/… (BFS, tối đa MAX trang),
// chặn yêu cầu dịch (translate.googleapis sl=vi) và ghi lại từng dòng. scripts/gen-content-i18n.mjs dịch sẵn danh sách này.
// Dùng: node scripts/harvest-content.mjs [MAX=2500]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const WEB = 'web', MAX = +process.argv[2] || 2500;
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8').replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '');
const scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
const dom = new JSDOM(html.replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/?sandbox=1#/home', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, errors = [], strings = new Set();
w.localStorage.setItem('vb.uiLang', 'en'); w.localStorage.setItem('vb.geo', '-');
w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false });
w.CSS = { escape: s => s }; w.console.error = () => {}; w.console.warn = () => {}; w.console.log = () => {};
w.HTMLMediaElement.prototype.play = () => Promise.resolve(); w.HTMLMediaElement.prototype.pause = () => {};
w.fetch = async url => {
  const u = String(url);
  if (/translate\.googleapis/.test(u)) {
    const q = decodeURIComponent((u.match(/[?&]q=([^&]*)/) || [])[1] || '');
    if (/[?&]sl=vi\b/.test(u)) q.split('\n').forEach(s => { s = s.trim(); if (s) strings.add(s); });
    const out = q.split('\n').map(() => 'T').join('\n');
    return { ok: true, json: async () => (/dj=1/.test(u) ? { sentences: [{ trans: out }] } : [[[out]]]) };
  }
  return { ok: false, json: async () => ({}), text: async () => '' };
};
for (const f of scripts) {
  try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); }
  if (/i18n\.js$/.test(f)) { const p = path.join(WEB, 'js/i18n/en.js'); if (fs.existsSync(p)) w.eval(fs.readFileSync(p, 'utf8')); }
}
if (!w.App) { console.error('nạp lỗi:', errors.slice(0, 5).join(' | ')); process.exit(2); }
require('./test/lazyfix.js')(w, fs, path, WEB, errors);
await tick(300); w.location.hash = '#/welcome/setup'; await tick(120); const q = s => w.document.querySelector(s); for (let i = 0; i < 60 && !q('#go'); i++) { if (q('#obNext')) q('#obNext').click(); await tick(100); } const go = w.document.querySelector('#go'); if (go) go.click(); await tick(1500);
const SKIP = /^#\/(welcome|admin|logout|signin|auth|play|session|quiz\/|exam\/run)/;
const queue = ['#/home', '#/vocab', '#/library', '#/practice', '#/path', '#/stats', '#/settings', '#/me', '#/skills', '#/tests', '#/phrases', '#/models', '#/grammar', '#/pron', '#/listening', '#/reading', '#/speaking', '#/write', '#/letters', '#/toeic', '#/toefl', '#/courses', '#/paraphrase', '#/mistakes', '#/goal', '#/placement', '#/review', '#/practice/learn'];
const seen = new Set(queue); let n = 0;
while (queue.length && n < MAX) {
  const r = queue.shift(); n++;
  w.location.hash = r; await tick(140);
  w.document.querySelectorAll('a[href^="#/"]').forEach(a => { const h = a.getAttribute('href').split('?')[0]; if (!seen.has(h) && !SKIP.test(h) && !/\/(dict|usage)\//.test(h)) { seen.add(h); queue.push(h); } });
  if (n % 200 === 0) process.stderr.write(`… ${n} trang, ${strings.size} câu\n`);
}
const VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
// Hết lượt quét (MAX) mà hàng đợi còn trang → KHÔNG được xóa câu cũ (trang chưa tới vẫn còn trong app): gộp với danh sách trước
const truncated = queue.length > 0;
if (truncated) { try { for (const x of JSON.parse(fs.readFileSync('content/i18n/strings.json', 'utf8'))) strings.add(x); } catch (e) { /* chưa có danh sách cũ */ } process.stderr.write(`⚠ dừng ở ${n} trang (còn ${queue.length} trong hàng đợi) – giữ câu cũ\n`); }
const list = [...strings].filter(s => VI.test(s)).sort();
fs.mkdirSync('content/i18n', { recursive: true });
fs.writeFileSync('content/i18n/strings.json', JSON.stringify(list, null, 0).replace(/","/g, '",\n"') + '\n');
console.log(`✓ harvest: ${n} trang, ${list.length} câu cần dịch sẵn (${(list.join('').length / 1024).toFixed(0)} KB)${errors.length ? ` · ${errors.length} lỗi nạp` : ''}`);
process.exit(0);
