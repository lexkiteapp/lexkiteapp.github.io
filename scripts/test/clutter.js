// Đo độ rối từng trang chính: số nút/chip/liên kết, số chữ, mã nội bộ lộ ra (p14, gt3, t1-…), trang dài
const { JSDOM } = require('jsdom'); const fs = require('fs'), path = require('path');
const WEB = process.argv[2], html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/#/home', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, errors = []; w.console.error = (...a) => errors.push(a.join(' ')); w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false }); w.CSS = { escape: s => s }; w.fetch = async () => ({ ok: false, json: async () => ({}) });
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms)), $ = s => w.document.querySelector(s);
(async () => { await tick(300); w.location.hash = '#/welcome/setup'; await tick(80); for (let i = 0; i < 60 && !$('#go'); i++) { if ($('#obNext')) $('#obNext').click(); await tick(100); } $('#go').click(); await tick(1500); // thiết lập từng bước (onboard.js): Tiếp tục tới màn cuối rồi Bắt đầu
  for (const b of ['writing', 'listening', 'toeic', 'toefl', 'mock', 'grammar', 'speak', 'readings', 'tsl', 'pron']) { try { await w.App.need(b); } catch (e) {} }
  const R = ['home', 'vocab', 'review', 'path', 'library', 'deck', 'practice', 'phrases', 'dict', 'skills', 'skill/listening', 'skill/reading', 'skill/writing', 'skill/speaking', 'listening', 'reading', 'rtype', 'cbt', 'write', 'task1', 'letters', 'ideas', 'models', 'speaking', 'grammar', 'pron', 'toeic', 'toefl', 'tests', 'mock', 'placement', 'me', 'goal', 'stats', 'mistakes', 'settings', 'method', 'resources'];
  const out = [];
  for (const r of R) { w.location.hash = '#/' + r; await tick(250); const v = $('#view');
    const ctrls = v.querySelectorAll('a,button,select,input').length, chips = v.querySelectorAll('.chip').length, words = v.textContent.split(/\s+/).length;
    const ids = (v.textContent.match(/\b(p\d{1,2}|gt\d{1,2}|t[12]-[a-z]+|tl\d+|[a-z]+-[a-z]+-\d)\b/g) || []).slice(0, 4);
    out.push([r, ctrls, chips, words, ids.join(',')]); }
  out.sort((a, b) => b[1] - a[1]);
  console.log('route ctrls chips words ids'); out.forEach(o => console.log(o.join('\t')));
  console.log('ERRORS', errors.filter(e => !/Not implemented/.test(e)).slice(0, 5).join(' || ') || 'none'); process.exit(0);
})();
