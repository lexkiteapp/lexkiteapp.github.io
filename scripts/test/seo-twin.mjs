// web/js/seo-twin.js: route app có bản tĩnh → canonical + liên kết "🌐"; route khác → canonical về /app/. Không chạy ngoài lexkite.com (add-on/app gốc).
import fs from 'node:fs'; import { JSDOM } from 'jsdom';
const src = fs.readFileSync('web/js/seo-twin.js', 'utf8'), bad = [];
const M = { v: 1, w: { es: { achieve: 'achieve' } }, c: { es: ['cafe'] }, t: { vi: { grammar: ['/ngu-phap/', ['tenses']] } } };
const run = async (url, lang) => {
  const dom = new JSDOM(`<!doctype html><head><link rel="canonical" href="https://lexkite.com/app/"></head><body><main id="view"><div>x</div></main></body>`, { url, runScripts: 'outside-only' });
  const w = dom.window; w.I18N = { lang: () => lang }; w.fetch = async () => ({ ok: true, json: async () => M });
  w.eval(src); await new Promise(r => setTimeout(r, 50)); return w;
};
const can = w => w.document.querySelector('link[rel=canonical]').getAttribute('href'), lk = w => w.document.getElementById('lk-twin');
let w = await run('https://lexkite.com/app/#/dict/achieve', 'es');
if (can(w) !== 'https://lexkite.com/es/words/achieve' || !lk(w) || lk(w).querySelector('a').getAttribute('href') !== '/es/words/achieve' || !/Página web/.test(lk(w).textContent)) bad.push('dict es: ' + can(w));
w.location.hash = '#/home'; await new Promise(r => setTimeout(r, 800));
if (can(w) !== 'https://lexkite.com/app/' || lk(w)) bad.push('rời route → canonical không trả về /app/');
w = await run('https://lexkite.com/app/#/confidence/cafe', 'es'); if (can(w) !== 'https://lexkite.com/es/conversations/cafe') bad.push('confidence: ' + can(w));
w = await run('https://lexkite.com/app/#/grammar/tenses', 'vi'); if (can(w) !== 'https://lexkite.com/ngu-phap/tenses') bad.push('grammar vi: ' + can(w));
w = await run('https://lexkite.com/app/#/dict/zzz', 'es'); if (can(w) !== 'https://lexkite.com/app/' || lk(w)) bad.push('từ không có bản tĩnh vẫn đổi canonical');
w = await run('chrome-extension://abc/app/index.html#/dict/achieve', 'es'); if (can(w) !== 'https://lexkite.com/app/' || lk(w)) bad.push('add-on: không được chạy');
const sw = fs.readFileSync('web/sw.js', 'utf8'); if (/seo-twin|notices\.js/.test((sw.match(/const SHELL = \[[\s\S]*?\];/) || [''])[0])) bad.push('seo-twin/notices không được nằm trong SHELL (khung app +0 byte)');
if (bad.length) { console.log('✗ seo-twin:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log('✓ seo-twin: canonical + liên kết bản tĩnh (dict/confidence/grammar), trả về /app/ khi rời route, không chạy ngoài web');
