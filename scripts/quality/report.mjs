// Gộp kết quả quality-sweep → job summary (markdown), nội dung issue "quality-sweep", 1 dòng cho bản tin hằng ngày, ảnh đưa lên nhánh quality-qa.
// Dùng: node scripts/quality/report.mjs <thư-mục-artifact> <thư-mục-ra>   (env: REPO, RUN_ID, WEEKLY_NATIVE)
import fs from 'fs';
import path from 'path';
const IN = path.resolve(process.argv[2] || 'qs-in'), OUT = path.resolve(process.argv[3] || 'qs-report');
const REPO = process.env.REPO || 'lexkiteapp/lexkiteapp.github.io', RUN = process.env.RUN_ID || '0';
const RUN_URL = `https://github.com/${REPO}/actions/runs/${RUN}`, RAW = `https://raw.githubusercontent.com/${REPO}/quality-qa`;
fs.mkdirSync(OUT + '/pub', { recursive: true });
const J = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const dirs = fs.existsSync(IN) ? fs.readdirSync(IN).map(d => path.join(IN, d)).filter(d => fs.statSync(d).isDirectory()) : [];
const SEVS = ['critical', 'high', 'medium', 'low'];

// ---- web + app
let rows = [], visual = [], pageCount = 0, shardInfo = [];
for (const d of dirs.filter(d => /qs-shard-/.test(d))) {
  const lang = path.basename(d).replace('qs-shard-', '');
  for (const r of J(path.join(d, 'findings.json')) || []) rows.push({ ...r, lang, shotPath: r.shot ? path.join(d, r.shot) : '' });
  for (const v of J(path.join(d, 'visual.json')) || []) visual.push({ ...v, lang, diffPath: path.join(d, 'diffs', v.name) });
  const p = J(path.join(d, 'pages.json')); if (p) { pageCount += p.pages; shardInfo.push(`${lang}: ${p.pages} lượt (${p.appRoutes} route app + ${p.staticPages} trang tĩnh × 4 chế độ)`); }
}
// gộp cùng loại+phần tử giữa các ngôn ngữ
const g = new Map();
for (const r of rows) {
  const k = r.type + '|' + r.key;
  const x = g.get(k) || g.set(k, { ...r, where: [], langs: new Set() }).get(k);
  x.langs.add(r.lang); for (const w of r.where) x.where.push(`${r.lang} ${w}`);
  if (!x.shotPath && r.shotPath) { x.shotPath = r.shotPath; x.shotLang = r.lang; }
}
const web = [...g.values()].sort((a, b) => SEVS.indexOf(a.sev) - SEVS.indexOf(b.sev) || b.where.length - a.where.length);

// ---- Lighthouse
const lh = J(path.join(IN, 'qs-lh', 'lh.json')) || [];
const lhBad = lh.filter(x => x.error || (x.budgetFails || []).length);

// ---- add-on
const ext = [];
for (const d of dirs.filter(d => /qs-ext-/.test(d))) for (const f of fs.readdirSync(d).filter(f => /^report-.*\.json$/.test(f))) {
  const r = J(path.join(d, f)); if (!r) continue;
  for (const x of r.results || []) if (!x.ok) ext.push({ lang: r.lang, check: x.check, detail: x.detail });
}
const dp = J(path.join(IN, 'qs-ext-heavy', 'dp.json')), heavy = [];
if (dp) {
  const a = dp.addon || {};
  if (a.error) heavy.push(`trang nặng: không đo được (${a.error})`);
  else if (a.with) {
    if (a.lookupOk === false) heavy.push('trang nặng: bấm đúp lần đầu không tra được');
    if (a.extraScriptMs > 600) heavy.push(`trang nặng: add-on tốn thêm ${a.extraScriptMs} ms script (> 600)`);
    if (a.extraHeapMB > 40) heavy.push(`trang nặng: add-on tốn thêm ${a.extraHeapMB} MB heap (> 40)`);
  }
  for (const f of dp.fails || []) heavy.push('dict-perf: ' + f);
} else heavy.push('trang nặng: không có kết quả đo (job lỗi)');

// ---- ảnh đưa lên nhánh quality-qa (tối đa 40 ảnh lỗi + 20 ảnh so sánh)
let n = 0;
for (const r of web) { if (r.shotPath && fs.existsSync(r.shotPath) && n < 40) { const name = `${r.shotLang || r.lang}/${path.basename(r.shotPath)}`; fs.mkdirSync(path.dirname(`${OUT}/pub/${name}`), { recursive: true }); fs.copyFileSync(r.shotPath, `${OUT}/pub/${name}`); r.link = `${RAW}/${name}`; n++; } }
visual.sort((a, b) => b.ratio - a.ratio);
let m = 0;
for (const v of visual) { if (fs.existsSync(v.diffPath) && m < 20) { const name = `diff/${v.name}`; fs.mkdirSync(`${OUT}/pub/diff`, { recursive: true }); fs.copyFileSync(v.diffPath, `${OUT}/pub/${name}`); v.link = `${RAW}/${name}`; m++; } }

// ---- tổng
const cnt = Object.fromEntries(SEVS.map(s => [s, web.filter(r => r.sev === s).length]));
const byType = {}; for (const r of web) byType[r.type] = (byType[r.type] || 0) + 1;
const total = web.length + lhBad.length + ext.length + heavy.length;
const catLine = Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ');
const head = `quality-sweep ${new Date().toISOString().slice(0, 10)}: ${total} lỗi (web/app ${web.length}: ${SEVS.map(s => `${s} ${cnt[s]}`).join(' · ')}; Lighthouse ${lhBad.length}; add-on ${ext.length + heavy.length}) · ${visual.length} ảnh đổi nhiều`;
const esc = s => String(s).replace(/\|/g, '/').replace(/\n/g, ' ');
const cell = r => `\`${esc(r.key).slice(0, 60)}\`<br>${esc(r.msg).slice(0, 110)}`;
const sevIcon = { critical: '🟥', high: '🟧', medium: '🟨', low: '⬜' };

function body(limit) {
  const L = [`**${head}**`, '', `Lượt chạy: ${RUN_URL} · ${shardInfo.join(' · ')}`, ''];
  L.push('### Web / app – lỗi hàng đầu theo mức độ', '', '| mức | loại | phần tử / thông báo | route (số lần) | ảnh |', '|---|---|---|---|---|');
  for (const r of web.slice(0, limit)) L.push(`| ${sevIcon[r.sev]} ${r.sev} | ${r.type} | ${cell(r)} | ${esc(r.where.slice(0, 3).join(', '))} (${r.where.length}) | ${r.link ? `[ảnh](${r.link})` : ''} |`);
  if (web.length > limit) L.push(`| | | … và ${web.length - limit} nhóm khác (xem artifact qs-shard-* của lượt chạy) | | |`);
  if (!web.length) L.push('| ✅ | | không có lỗi | | |');
  L.push('', '### Phân loại', '', catLine || '(sạch)', '');
  L.push('### Lighthouse (điện thoại; ngân sách perf ≥ 85, a11y ≥ 95, SEO ≥ 95)', '', '| trang | perf | a11y | SEO | vượt ngân sách |', '|---|---|---|---|---|');
  for (const x of lh) L.push(x.error ? `| ${x.page} | – | – | – | ${x.error} |` : `| ${x.page} | ${x.scores.performance} | ${x.scores.accessibility} | ${x.scores.seo} | ${x.budgetFails.join('; ') || '✅'} |`);
  if (!lh.length) L.push('| (không có kết quả) | | | | |');
  L.push('', '### Add-on (ext-e2e vi/en/ar + trang nặng)', '');
  if (!ext.length && !heavy.length) L.push('✅ đạt'); else { for (const e of ext.slice(0, 20)) L.push(`- [${e.lang}] ${esc(e.check)}${e.detail ? ' — ' + esc(e.detail).slice(0, 140) : ''}`); for (const h of heavy) L.push('- ' + h); }
  L.push('', `### So ảnh với nền (cờ nếu đổi > 2% điểm ảnh; chỉ để xem lại, không làm hỏng build): ${visual.length}`, '');
  for (const v of visual.slice(0, 15)) L.push(`- ${v.lang} ${v.vp === 'm' ? 'điện thoại' : 'máy tính'} \`${esc(v.id)}\`: ${(v.ratio * 100).toFixed(1)}%${v.note ? ' (' + v.note + ')' : ''}${v.link ? ` – [diff](${v.link})` : ''}`);
  if (process.env.WEEKLY_NATIVE) L.push('', `Native (hằng tuần): ${process.env.WEEKLY_NATIVE}`);
  return L.join('\n');
}
fs.writeFileSync(OUT + '/summary.md', body(40) + '\n');
fs.writeFileSync(OUT + '/issue.md', body(25).slice(0, 60000) + '\n');
fs.writeFileSync(OUT + '/digest.txt', `• Quality-sweep: ${total} lỗi (${SEVS.map(s => `${s} ${cnt[s]}`).join('/')}), ${visual.length} ảnh đổi – ${RUN_URL}\n`);
fs.writeFileSync(OUT + '/result.json', JSON.stringify({ total, web: web.length, cnt, byType, lighthouse: lhBad.length, addon: ext.length + heavy.length, visual: visual.length, pages: pageCount, head }, null, 1));
console.log(head);
