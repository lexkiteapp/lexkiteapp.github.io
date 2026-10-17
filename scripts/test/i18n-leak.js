// Rà soát LẪN TIẾNG tự động: chạy app (jsdom) ở từng ngôn ngữ giao diện ≠ vi, đi qua mọi trang chính, báo mọi chữ tiếng Việt còn hiện ra.
//   node scripts/test/i18n-leak.js web [lang,lang…]   (mặc định: en,zh,ar – npm test; GitHub Action chạy đủ 14 ngôn ngữ)
// Mô phỏng dịch máy lúc chạy (contentTranslate) để chỉ còn lại lỗi THẬT: chữ không qua t(), vùng không được dịch, dữ liệu lưu sẵn bằng tiếng Việt…
// Bỏ qua phần cố ý giữ tiếng gốc: [translate="no"], [data-keep-vi], ô nhập. Thoát mã 1 nếu có lỗi (chặn ship).
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const WEB = process.argv[2] || 'web';
const LANGS = (process.argv[3] || 'en,zh,ar').split(',');
const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const ROUTES = ['#/home', '#/vocab', '#/library', '#/review', '#/practice', '#/path', '#/stats', '#/settings', '#/me', '#/skills', '#/tests', '#/phrases', '#/models', '#/grammar', '#/pron', '#/listening', '#/reading', '#/speaking', '#/write', '#/task1', '#/letters', '#/toeic', '#/toefl', '#/contact', '#/placement', '#/dict/sustainable', '#/topic/ngsl1', '#/topic/office-email', '#/model/t1-travel', '#/handsfree', '#/reflex', '#/courses', '#/course/ielts-writing', '#/paraphrase', '#/verb', '#/verb/went', '#/verb/can', '#/fix', '#/usage', '#/usage/interested', '#/usage/stop', '#/usage?c=verb', '#/usage/hardly', '#/usage/affect-effect', '#/home'];
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8').replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '');
const scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));

async function run(lang) {
  const dom = new JSDOM(html.replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/?sandbox=1#/home', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, errors = [];
  w.localStorage.setItem('vb.uiLang', lang); w.localStorage.setItem('vb.geo', '-');
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false });
  w.CSS = { escape: s => s }; w.console.error = () => {};
  // Dịch máy giả lập: mọi dòng → "⟦T⟧" (để chỉ còn lỗi không qua đường dịch nào)
  w.fetch = async url => {
    const u = String(url);
    if (/translate\.googleapis/.test(u)) { const q = decodeURIComponent((u.match(/[?&]q=([^&]*)/) || [])[1] || ''); const out = q.split('\n').map(() => 'T').join('\n'); return { ok: true, json: async () => (/dj=1/.test(u) ? { sentences: [{ trans: out }] } : [[[out]]]) }; }
    return { ok: false, json: async () => ({}), text: async () => '' };
  };
  for (const f of scripts) {
    try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); }
    if (/i18n\.js$/.test(f)) for (const d of ['en', lang].filter((x, i, a) => a.indexOf(x) === i)) { const p = path.join(WEB, 'js/i18n', d + '.js'); if (fs.existsSync(p)) w.eval(fs.readFileSync(p, 'utf8')); }
  }
  if (!w.App) { console.log('nạp lỗi:', errors.slice(0, 5).join(' | ')); process.exit(2); }
  require('./lazyfix.js')(w, fs, path, WEB, errors);
  await tick(300); w.location.hash = '#/welcome/setup'; await tick(120); const go = w.document.querySelector('#go'); if (go) go.click(); await tick(1500);
  const leaks = new Map();
  const scan = route => {
    const tw = w.document.createTreeWalker(w.document.body, w.NodeFilter.SHOW_TEXT); let n;
    while ((n = tw.nextNode())) {
      const s = n.nodeValue.replace(/\s+/g, ' ').trim(); if (!s || !VI.test(s)) continue;
      const el = n.parentElement; if (!el || el.closest('script,style,[translate="no"],[data-keep-vi],textarea,[hidden]')) continue;
      const where = (el.closest('[id]') || el).id || el.className || el.tagName;
      const k = s.slice(0, 80); if (!leaks.has(k)) leaks.set(k, `${route} · ${String(where).slice(0, 40)} · “${k}”`);
    }
    w.document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => ['placeholder', 'title', 'aria-label'].forEach(a => { const v = el.getAttribute(a); if (v && VI.test(v) && !el.closest('[translate="no"],[data-keep-vi]')) { const k = a + ':' + v.slice(0, 60); if (!leaks.has(k)) leaks.set(k, `${route} · [${a}] · “${v.slice(0, 60)}”`); } }));
  };
  for (const r of ROUTES) { w.location.hash = r; await tick(250); scan(r); w.document.body.classList.remove('bare'); }
  return { leaks: [...leaks.values()], errors };
}

(async () => {
  let total = 0;
  for (const l of LANGS) {
    const { leaks, errors } = await run(l);
    total += leaks.length;
    console.log(`${leaks.length ? '✗' : '✓'} ${l}: ${leaks.length} chỗ lẫn tiếng Việt${errors.length ? ` · ${errors.length} lỗi nạp` : ''}`);
    const by = {}; leaks.forEach(x => { const [r, kind] = x.split(' · '); const k = r + ' ' + (kind.startsWith('[') ? kind : 'text'); by[k] = (by[k] || 0) + 1; }); console.log('   theo trang: ' + Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + '=' + v).join(', ')); leaks.filter(x => !/ · \[/.test(x)).slice(0, process.env.N ? +process.env.N : 40).forEach(x => console.log('   ' + x));
  }
  console.log(total ? `✗ i18n-leak: ${total} chỗ lẫn tiếng` : '✓ i18n-leak: không lẫn tiếng Việt');
  process.exit(total && process.argv.includes('--strict') ? 1 : 0);
})();
