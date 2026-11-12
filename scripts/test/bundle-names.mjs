// Hợp đồng tải lười: mọi tên gói gọi qua App.need('…') / ROUTE_BUNDLE phải có trong BUNDLES (app.js),
// hàm App.* mà khung app/ux1 gọi trước khi gói lười tải phải định nghĩa ở khung app,
// và meanOf của bài học chịu được thẻ null (bài ghép cặp). Nguồn: bảng admin "JavaScript errors (24h)" 01/11/2026.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const WEB = path.resolve(process.argv[2] || 'web'), errors = [];
const src = fs.readFileSync(path.join(WEB, 'js/app.js'), 'utf8');
const a = src.indexOf("const G = 'js/grammar/', BUNDLES = {"), b = src.indexOf('\n  };', a);
if (a < 0 || b < 0) throw new Error('không tìm thấy BUNDLES trong app.js');
const BUNDLES = new Function(src.slice(a, b + 4) + '; return BUNDLES;')();
const r0 = src.indexOf('const ROUTE_BUNDLE = {'), r1 = src.indexOf('};', r0);
const ROUTE_BUNDLE = new Function(src.slice(r0, r1 + 2) + '; return ROUTE_BUNDLE;')();

const used = new Map(); // tên gói → nơi gọi
const note = (n, where) => { if (!used.has(n)) used.set(n, where); };
Object.entries(ROUTE_BUNDLE).forEach(([r, v]) => [].concat(v).forEach(n => note(n, 'ROUTE_BUNDLE.' + r)));
const out = execFileSync('git', ['grep', '-nE', "App\\.need\\(", '--', 'js'], { cwd: WEB, encoding: 'utf8' });
for (const line of out.split('\n').filter(Boolean)) {
  const [file, ln] = line.split(':');
  for (const call of line.matchAll(/App\.need\(([^)]*)\)/g)) for (const q of call[1].matchAll(/^\s*'([^']+)'|,\s*'([^']+)'/g)) note(q[1] || q[2], `${file}:${ln}`);
}
for (const [n, where] of used) if (!BUNDLES[n]) errors.push(`gói '${n}' không có trong BUNDLES (gọi ở ${where})`);

// App.goalLabel: tab Tôi (ux1-me.js) gọi trước khi gói 'goal' tải → phải ở script khung app (web/app/index.html)
const shell = [...fs.readFileSync(path.join(WEB, 'app/index.html'), 'utf8').matchAll(/<script[^>]+src="(js\/[^"?]+)/g)].map(m => m[1]);
const defIn = shell.filter(f => fs.existsSync(path.join(WEB, f)) && /App\.goalLabel\s*=/.test(fs.readFileSync(path.join(WEB, f), 'utf8')));
if (!defIn.length) errors.push('App.goalLabel phải định nghĩa trong script khung app (ux1-me.js gọi trước khi goal.js tải)');
else {
  const App = {}; const def = fs.readFileSync(path.join(WEB, defIn[0]), 'utf8').match(/App\.goalLabel = [^\n]+/)[0];
  new Function('App', def)(App);
  if (App.goalLabel({ exam: 'general', target: 4 }) !== 'B2' || App.goalLabel({ exam: 'ielts', target: 6.5 }) !== '6.5') errors.push('App.goalLabel sai nhãn');
}

// meanOf(null) trong bài học không được ném lỗi ("null is not an object (evaluating 'e.vi')")
const ui = fs.readFileSync(path.join(WEB, 'js/lesson/ui.js'), 'utf8').match(/const meanOf = [^\n]+/);
if (!ui) errors.push('không thấy meanOf trong lesson/ui.js');
else {
  const meanOf = new Function('App', ui[0].replace(/\/\/.*$/, '') + '; return meanOf;');
  for (const App of [{}, { meanOf: x => (x ? x.vi || '' : '') }]) {
    try { const f = meanOf(App); if (f(null) !== '' || f(undefined) !== '' || f({ vi: 'táo' }) !== 'táo') errors.push('meanOf trả sai'); } catch (e) { errors.push('meanOf(null) ném lỗi: ' + e.message); }
  }
}

if (errors.length) { console.error('bundle-names FAIL\n- ' + errors.join('\n- ')); process.exit(1); }
console.log(`bundle-names OK (${used.size} tên gói, ${Object.keys(BUNDLES).length} gói)`);
