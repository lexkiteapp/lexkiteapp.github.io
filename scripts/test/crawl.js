const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const WEB = process.argv[2];
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/' + (process.argv[3] || '#/home'), runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, errors = [];
w.addEventListener("error", e => errors.push(e.message + " :: " + (e.error && e.error.stack || "").split("\n").slice(0,3).join(" < ")));
w.console.error = (...a) => errors.push(a.join(' '));
w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false });
w.CSS = { escape: s => s };
w.fetch = async () => ({ ok: false, json: async () => ({}) });
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
const $ = s => w.document.querySelector(s);
const go = async (h, ms = 60) => { w.location.hash = h; await tick(ms); };
(async () => { await tick(300); await go('#/welcome/setup'); $('#go').click(); await tick(1500);
  // nạp sẵn mọi gói để có danh sách id
  for (const b of ['writing', 'listening', 'toeic', 'toefl', 'mock', 'grammar', 'speak', 'readings', 'tsl', 'pron']) { try { await w.App.need(b); } catch (e) { errors.push('need ' + b + ': ' + e.message); } }
  const ids = {
    model: (w.MODELS || []).map(m => m.id), letters: (w.GT_LETTERS || []).map(x => x.id), read: (w.READINGS || []).map(r => r.id),
    grammar: (w.GRAMMAR || []).map(x => x.id), topic: w.IELTS_DATA.TOPICS.map(x => x.id), listen: (w.LISTENING || []).map(p => p.id).concat(((w.TOEIC || {}).listening || []).map(p => p.id)),
    'toeic-r': ((w.TOEIC || {}).reading || []).map(x => x.id + '?part=5'), 'listen-test': [...new Set((w.LISTENING || []).map(p => p.test))], 'toeic-test': [...new Set(((w.TOEIC || {}).reading || []).map(x => x.test))],
    write: (w.WRITE_PROMPTS || []).map(p => p.id), ideas: (w.IDEAS || []).map(x => x.topic),
    verb: w.LK_VERBS ? ['went', 'be', 'have', 'do', 'can', 'ought to', 'lie', 'lay', 'study', 'panic', 'travel', 'give%20up', 'know', 'blorf', 'quizzes', ...w.LK_VERBS.irregularList().filter((x, i) => i % 4 === 0).map(x => x.base)] : [],
  };
  const bad = []; let n = 0;
  for (const [r, list] of Object.entries(ids)) for (const id of list) {
    const before = errors.length; await go(`#/${r}/${id}`, 120); n++;
    const v = $('#view'), txt = v ? v.textContent.trim() : '';
    if (errors.length > before) bad.push(`${r}/${id}: ${errors.slice(before).join(' | ').slice(0, 200)}`);
    else if (txt.length < 40) bad.push(`${r}/${id}: trang trống`);
    if (r === 'listen-test' || r === 'toeic-test') { w.document.body.classList.remove('bare'); w.onbeforeunload = null; }
  }
  // Trang giới thiệu (/ + /<lang>/): mọi liên kết nội bộ phải tới được – /app/…#/route có thật, file tĩnh có trong web/ hoặc trang dựng lúc build
  const BUILT = /^\/(?:[a-z]{2}\/blog\/|tu-vung\/|samples\/|speaking\/|ngu-phap\/|viet-thu\/|en\/(?:vocabulary|samples|speaking)\/)/;
  const LANDS = ['index.html', ...fs.readdirSync(WEB).filter(d => /^[a-z]{2}$/.test(d) && fs.existsSync(path.join(WEB, d, 'index.html'))).map(d => d + '/index.html')];
  for (const f of LANDS) {
    const hrefs = [...fs.readFileSync(path.join(WEB, f), 'utf8').matchAll(/href="(\/[^"]*)"/g)].map(m => m[1].replace(/&amp;/g, '&'));
    for (const h of new Set(hrefs)) {
      n++;
      const u = new URL(h, 'http://localhost'), p = u.pathname;
      if (p === '/app/') { const r = (u.hash.match(/^#\/([a-z0-9-]+)/) || [])[1]; if (u.hash && (!r || !w.App.routes[r])) bad.push(`/${f}: liên kết app tới route không có ${h}`); continue; }
      if (BUILT.test(p)) continue;
      const file = path.join(WEB, p.endsWith('/') ? p + 'index.html' : (fs.existsSync(path.join(WEB, p)) ? p : p + '.html'));
      if (!fs.existsSync(file)) bad.push(`/${f}: liên kết hỏng ${h}`);
    }
  }
  ids.landing = LANDS;
  console.log('PAGES', n, JSON.stringify(Object.fromEntries(Object.entries(ids).map(([k, v]) => [k, v.length]))));
  console.log(bad.slice(0, 30).join('\n') || 'ALL OK'); process.exit(0); })();
