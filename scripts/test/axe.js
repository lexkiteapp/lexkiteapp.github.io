/* ♿ Kiểm tra trợ năng tự động (axe-core, WCAG 2.1 A/AA) trên các màn hình chính – chạy trong jsdom, không cần trình duyệt.
 * Bỏ các luật cần bố cục thật (color-contrast…). Dùng: node scripts/test/axe.js web  → in vi phạm theo luật, exit 1 nếu có lỗi nghiêm trọng. */
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const WEB = process.argv[2] || 'web';
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/#/home', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, errors = [];
w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false });
w.CSS = { escape: s => s }; w.fetch = async () => ({ ok: false, json: async () => ({}) }); w.console.error = () => {};
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
w.eval(fs.readFileSync(require.resolve('axe-core'), 'utf8'));
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
const ROUTES = ['#/welcome', '#/confidence', '#/confidence/cafe', '#/confidence/toolkit', '#/confidence/daily', '#/home', '#/vocab', '#/review', '#/skills', '#/skill/reading', '#/read/sleep-memory', '#/grammar', '#/models', '#/tests', '#/toeic', '#/me', '#/stats', '#/settings', '#/courses', '#/paraphrase', '#/reflex', '#/contact', '#/phrases', '#/criteria', '#/practice/mcq?src=topic:environment', '#/verb', '#/verb/take', '#/verb/can', '#/fix', '#/usage', '#/usage/interested', '#/usage/stop', '#/usage?c=prep', '#/usage/affect-effect', '#/usage/blorfing'];
const OFF = { 'color-contrast': { enabled: false }, 'region': { enabled: false }, 'landmark-one-main': { enabled: false }, 'page-has-heading-one': { enabled: false } };
(async () => {
  await tick(300);
  const agg = {};
  for (const r of ROUTES) {
    w.location.hash = r; await tick(250);
    const res = await w.axe.run(w.document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, rules: OFF });
    for (const v of res.violations) { const a = agg[v.id] = agg[v.id] || { impact: v.impact, help: v.help, n: 0, where: new Set(), ex: v.nodes[0] && v.nodes[0].html.slice(0, 140) }; a.n += v.nodes.length; a.where.add(r); }
  }
  // Trang giới thiệu tĩnh (/ + /<lang>/, scripts/build-landing.mjs): HTML thuần, không chạy script
  const LANDS = ['index.html', ...fs.readdirSync(WEB).filter(d => /^[a-z]{2}$/.test(d) && fs.existsSync(path.join(WEB, d, 'index.html'))).map(d => d + '/index.html')];
  for (const f of LANDS) {
    const ld = new JSDOM(fs.readFileSync(path.join(WEB, f), 'utf8').replace(/<script id="lk-route">[\s\S]*?<\/script>/, ''), { url: 'http://localhost/' + f.replace('index.html', ''), runScripts: 'outside-only', pretendToBeVisual: true });
    ld.window.eval(fs.readFileSync(require.resolve('axe-core'), 'utf8'));
    const res = await ld.window.axe.run(ld.window.document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, rules: { 'color-contrast': { enabled: false } } });
    for (const v of res.violations) { const a = agg[v.id] = agg[v.id] || { impact: v.impact, help: v.help, n: 0, where: new Set(), ex: v.nodes[0] && v.nodes[0].html.slice(0, 140) }; a.n += v.nodes.length; a.where.add('/' + f.replace('index.html', '')); }
  }
  ROUTES.push(...LANDS);
  const list = Object.entries(agg).sort((a, b) => b[1].n - a[1].n);
  for (const [id, a] of list) console.log(`${a.impact.padEnd(8)} ${id} ×${a.n} – ${a.help}\n   ${[...a.where].slice(0, 5).join(' ')}\n   ${a.ex}`);
  const bad = list.filter(([, a]) => a.impact === 'critical' || a.impact === 'serious');
  console.log(bad.length ? `✗ a11y: ${bad.length} luật nghiêm trọng` : `✓ a11y: ${ROUTES.length} màn hình, không lỗi nghiêm trọng (${list.length} gợi ý nhẹ)`);
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(2); });
