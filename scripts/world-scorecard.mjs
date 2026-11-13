// 🌍 Bảng World: Lexkite vs Duolingo theo trục, đo bằng máy – docs/WORLD-SCORECARD.md. GOM điểm đã có (content:score, learnability,
// Lighthouse, stitch-coverage, i18n-qa, cổng QA trên CI) + đo tĩnh các trục còn thiếu; KHÔNG gọi host prod (chỉ đọc file đã commit / reports/world/*).
// Dùng: node scripts/world-scorecard.mjs [--write] [--check] [--raise]
//   --write: ghi content/pipeline/WORLD.md + khối Top 10 trong docs/UX-BENCHMARK.md   --check: thoát 1 nếu trục nào < sàn (content/pipeline/world.budget.json)
//   --raise: nâng sàn lên điểm mới (chỉ tăng; trục dao động trừ "noise")
import fs from 'node:fs';
import { dataFiles } from './lib/scan-roots.mjs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => path.join(ROOT, ...a);
const read = f => { try { return fs.readFileSync(P(f), 'utf8'); } catch { return null; } };
const json = f => { const s = read(f); try { return s ? JSON.parse(s) : null; } catch { return null; } };
const ls = d => { try { return fs.readdirSync(P(d)); } catch { return []; } };
const clamp = x => Math.max(0, Math.min(100, x));
const r1 = x => x == null ? null : Math.round(x * 10) / 10;
export const AXES = 'content/pipeline/world.axes.json', BUDGET = 'content/pipeline/world.budget.json', OUT = 'content/pipeline/WORLD.md';
export const UXB = 'docs/UX-BENCHMARK.md', MARK = ['<!-- auto:world-gaps:start -->', '<!-- auto:world-gaps:end -->'];
export const NOISE = { perf: 2, a11y: 1, firstRun: 5, gates: 20, shell: 10 }; // trục phụ thuộc máy CI/mạng → sàn = điểm − noise

// ---------- hàm thuần (có test: scripts/test/world-scorecard.mjs) ----------
export const parseTotal = s => { const m = s && /Tổng[^0-9]{0,20}([\d.]+)\s*\/\s*100/.exec(s); return m ? +m[1] : null; };
export const shellScore = (kb, cap, goal) => kb == null ? null : clamp((cap - kb) / (cap - goal) * 100);
export const ratioScore = (goal, got) => got == null ? null : clamp(100 * Math.min(1, goal / Math.max(got, 1e-9)));
export function robotsAllows(txt, p = '/') { // nhóm User-agent: * (RFC 9309 rút gọn): Disallow khớp tiền tố dài nhất, Allow thắng khi dài bằng/hơn
  let on = false, seen = false; const rules = [];
  for (const raw of String(txt || '').split(/\r?\n/)) {
    const l = raw.replace(/#.*/, '').trim(); const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(l); if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'user-agent') { if (seen) { on = false; seen = false; } on = on || v === '*'; continue; }
    seen = true; if (on && (k === 'allow' || k === 'disallow') && v) rules.push([k, v]);
  }
  let best = ['allow', '']; for (const r of rules) if (p.startsWith(r[1]) && (r[1].length > best[1].length || (r[1].length === best[1].length && r[0] === 'allow'))) best = r;
  return best[0] === 'allow';
}
export function rank(rows, n = 10) { // Top khoảng cách theo tác động/chi phí
  return rows.filter(r => r.gap > 0).map(r => ({ ...r, prio: r1(r.gap * r.impact / r.cost) })).sort((a, b) => b.prio - a.prio || b.gap - a.gap).slice(0, n);
}
export function overall(rows, key) { let s = 0, w = 0; for (const r of rows) if (r[key] != null) { s += r[key] * r.weight; w += r.weight; } return w ? r1(s / w) : null; }
export function raiseFloors(floors, rows) { const o = { ...floors }; for (const r of rows) if (r.lexkite != null) o[r.id] = Math.max(o[r.id] ?? 0, r1(r.lexkite - (NOISE[r.id] || 0))); return o; }
export function checkFloors(floors, rows) { const bad = []; for (const r of rows) { const f = floors[r.id]; if (f == null) continue; if (r.lexkite == null) bad.push(`${r.id}: mất số đo (sàn ${f})`); else if (r.lexkite + 1e-9 < f) bad.push(`${r.id}: ${r.lexkite} < sàn ${f}`); } return bad; }

// ---------- đo từng trục (tĩnh, không mạng) ----------
function whyLangs() { // ngôn ngữ có "why" trong content/explain/*.json + web/js/explain/**.json + gold bank (en)
  const cnt = {}; const add = (l, n = 1) => { cnt[l] = (cnt[l] || 0) + n; };
  const scan = o => { if (!o || typeof o !== 'object') return; for (const [k, v] of Object.entries(o)) { if (/^[a-z]{2}$/.test(k) && v && typeof v === 'object' && typeof v.why === 'string' && v.why.trim()) add(k); else scan(v); } };
  for (const f of ls('content/explain').filter(f => f.endsWith('.json'))) scan(json('content/explain/' + f));
  for (const d of ls('web/js/explain')) for (const f of ls('web/js/explain/' + d).filter(f => /^[a-z]{2}\.json$/.test(f))) { const o = json(`web/js/explain/${d}/${f}`); if (o) add(f.slice(0, 2), Object.values(o).filter(v => v && v.why).length); }
  for (const f of ls('web/js/grammar/l1').filter(f => /^[a-z]{2}\.js$/.test(f))) { // ghi chú lỗi tiếng mẹ đẻ: notes[bài] = [[✗, ✓, vì sao]] (web/js/grammar/l1/<lang>.js)
    try { const w = {}; new Function('window', read('web/js/grammar/l1/' + f))(w); const N = (w.GRAMMAR_L1 || {}).notes || {}; add(f.slice(0, 2), Object.values(N).flat().filter(n => Array.isArray(n) && n[0] && n[1] && String(n[2] || '').trim().length >= 12).length); } catch { /* bỏ qua */ }
  }
  const g = read('web/cpack/lesson/gold.js'); if (g) add('en', (g.match(/"why":"[^"]+"/g) || []).length);
  return cnt;
}
function measure(ax) {
  const has = (f, re) => { const s = read(f); return !!(s && re.test(s)); };
  const m = {}, note = {};
  // gom: content:score + learnability
  m.content = parseTotal(read('content/pipeline/SCORE.md')); note.content = 'content/pipeline/SCORE.md';
  m.learn = parseTotal(read('content/pipeline/LEARN.md')); note.learn = m.learn == null ? 'chưa có LEARN.md (PR #427 chưa gộp)' : 'content/pipeline/LEARN.md';
  // probe hành trình (CI: scripts/world/probe.mjs trên dist cục bộ)
  const pr = json('reports/world/probe.json'), g = k => (ax.find(a => a.id === k) || {}).goal || {};
  if (pr && pr.firstRun) { const f = pr.firstRun; m.firstRun = f.ok ? r1((ratioScore(g('firstRun').seconds, f.seconds) + ratioScore(g('firstRun').taps, f.taps)) / 2) : 0; note.firstRun = f.ok ? `${f.seconds} s · ${f.taps} chạm (probe ${String(pr.at).slice(0, 10)})` : 'probe trượt: ' + (f.err || '?'); }
  else { m.firstRun = null; note.firstRun = 'chưa có reports/world/probe.json (chạy world-scorecard.yml)'; }
  if (pr && pr.today) { m.todayTaps = pr.today.ok ? r1(ratioScore(g('todayTaps').taps, pr.today.taps)) : 0; note.todayTaps = pr.today.ok ? `${pr.today.taps} chạm` : 'probe trượt: ' + (pr.today.err || '?'); }
  else { m.todayTaps = null; note.todayTaps = 'chưa có probe'; }
  // vòng thói quen
  const H = [['chuỗi', has('web/js/core.js', /Stats[\s\S]{0,4000}\bstreak\b/) || has('web/js/app.js', /function streak\b|\bstreak\s*\(/)], ['đóng băng', has('web/js/app.js', /applyFreeze/) || has('web/js/core.js', /freezeInfo/)],
    ['mục tiêu ngày', has('web/js/core.js', /dailyGoal/)], ['nhắc học', has('web/js/remind.js', /LocalNotifications|showNotification|PushManager|Notification/)]];
  m.habit = H.filter(x => x[1]).length * 25; note.habit = H.map(([n, ok]) => (ok ? '✓' : '✗') + n).join(' ');
  // why/L1
  const W = whyLangs(), langs = Object.keys(W).filter(l => W[l] > 0), perLang = 200;
  m.whyL1 = r1(Object.values(W).reduce((s, n) => s + Math.min(1, n / perLang), 0) / 15 * 100);
  note.whyL1 = `${Object.values(W).filter(n => n >= perLang).length}/15 ngôn ngữ đạt đích; có "vì sao" (${langs.map(l => l + ' ' + W[l]).join(', ') || '0'}; đích ${perLang}/ngôn ngữ)`;
  const fsrs = has('web/js/core.js', /FSRS/);
  const l1n = Object.values(W).filter(n => n >= perLang / 2).length; // chỉ tính ngôn ngữ đã có ≥ nửa đích (không để ghi chú lẻ tẻ làm đẹp số)
  m.personal = r1((fsrs ? 50 : 0) + Math.min(1, l1n / 15) * 50); note.personal = `${fsrs ? '✓' : '✗'} FSRS theo người · lỗi L1 ${l1n}/15 ngôn ngữ (≥${perLang / 2} mục)`;
  // offline
  const sw = read('web/sw.js') || '';
  const O = [['shell', /SHELL\s*=\s*\[/.test(sw) && /SHELL\.map\(|addAll\(\s*SHELL/.test(sw)], ['điều hướng dự phòng', /navigate/.test(sw) && /caches\.match\(\s*APP/.test(sw)], ['gói từ offline', /offline-pack/.test(sw)]];
  m.offline = r1(O.filter(x => x[1]).length / O.length * 100); note.offline = O.map(([n, ok]) => (ok ? '✓' : '✗') + n).join(' ');
  // cỡ khung app
  const ss = spawnSync(process.execPath, [P('scripts/test/shell-size.mjs')], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  const sm = /Khung app ([\d.]+) \/ ([\d.]+) KB gz/.exec(ss.stdout || '');
  m.shell = sm ? r1(shellScore(+sm[1], +sm[2], g('shell').kb)) : null; note.shell = sm ? `${sm[1]} / ${sm[2]} KB gz (đích ${g('shell').kb})` : 'shell-size.mjs không chạy được';
  // Lighthouse (file do lighthouse.yml commit – workflow này không gọi lexkite.com)
  const lh = json('reports/lighthouse.json') || {}, sc = (k, c) => lh[k] && lh[k].scores ? lh[k].scores[c] : null;
  m.perf = sc('home', 'performance'); note.perf = lh.home ? `trang chủ di động: LCP ${lh.home.metrics['largest-contentful-paint']}, CLS ${lh.home.metrics['cumulative-layout-shift']}, TBT ${lh.home.metrics['total-blocking-time']} (${String(lh.home.at).slice(0, 10)})` : 'chưa có reports/lighthouse.json';
  const a = [sc('home', 'accessibility'), sc('app/', 'accessibility')].filter(x => x != null); m.a11y = a.length ? r1(a.reduce((s, x) => s + x, 0) / a.length) : null; note.a11y = 'Lighthouse trang chủ + /app/ (axe/a11y tĩnh chạy trong npm test)';
  // stitch-coverage
  const st = json('docs/stitch-coverage.json'), S = st && (st.surfaces || []);
  if (S) { const c = s => S.filter(x => x.status === s).length, den = S.length - c('skip') - c('derived'); m.stitch = den ? r1(c('stitch') / den * 100) : null; note.stitch = `${c('stitch')} Stitch / ${den} màn (ref ${c('ref')}, tay ${c('hand')})`; }
  // i18n-qa
  const iq = spawnSync(process.execPath, [P('scripts/i18n-qa.mjs'), '--strict'], { cwd: ROOT, encoding: 'utf8', timeout: 300000, maxBuffer: 64 << 20 });
  const ie = /(\d+) lỗi bản dịch/.exec(iq.stdout || ''); m.i18n = /✓ i18n-qa/.test(iq.stdout || '') ? 100 : ie ? clamp(100 - +ie[1]) : null; note.i18n = m.i18n == null ? 'i18n-qa không chạy được' : ie ? `${ie[1]} lỗi` : '0 lỗi, 14 ngôn ngữ ngoài vi';
  // cổng QA trên CI (reports/world/ci.json do scripts/world/ci-status.mjs ghi)
  const ci = json('reports/world/ci.json');
  if (ci && ci.workflows) { const w = Object.entries(ci.workflows); m.gates = w.length ? r1(w.filter(([, v]) => v && v.conclusion === 'success').length / w.length * 100) : null; note.gates = w.map(([k, v]) => (v && v.conclusion === 'success' ? '✓' : v ? '✗' : '∅') + k).join(' ') /* ∅ = chưa có lượt trên main: tính là chưa đạt, không bỏ khỏi mẫu số (new-ui-qa + npm-test từng null mà điểm vẫn 100) */ + (ci.mobile ? ` · mobile-qa LCP ${ci.mobile.maxLcp} ms, CLS ${ci.mobile.maxCls}, INP ${ci.mobile.maxInp} ms` : ''); }
  else { m.gates = null; note.gates = 'chưa có reports/world/ci.json'; }
  // luyện thi thật
  const n = (d, re) => ls(d).filter(f => re.test(f)).length;
  const E = { IELTS: Math.min(n('web/js/readtest', /^test\d+\.js$/), dataFiles('listen', /^test\d+\.js$/, ROOT).length), TOEIC: Math.min(n('web/js/toeic', /^reading\d+\.js$/), n('web/js/toeic', /^listening\d+\.js$/)), TOEFL: n('web/cpack/toefl', /^data\d+\.js$/), Cambridge: n('web/cpack/cambridge', /\.js$/) };
  const pe = g('exam').perExam; m.exam = r1(Object.values(E).reduce((s, x) => s + Math.min(1, x / pe), 0) / 4 * 100); note.exam = Object.entries(E).map(([k, v]) => `${k} ${v}`).join(' · ') + ` đề (đích ${pe}/kỳ)`;
  // add-on tra từ
  const sel = has('extension/content.js', /getSelection/) && has('extension/content.js', /(dblclick|mouseup)/), selT = fs.existsSync(P('scripts/test/ext-selection.mjs'));
  m.addon = (sel ? 70 : 0) + (selT ? 30 : 0); note.addon = `${sel ? '✓' : '✗'} chọn chữ → nghĩa · ${selT ? '✓' : '✗'} test ext-selection`;
  // AI trên máy
  const ai = read('web/js/ai-local.js') || '', kinds = (/KINDS\s*=\s*\{([^}]*)\}/.exec(ai) || [, ''])[1].split(',').filter(x => x.includes(':')).length, native = /LexAI/.test(ai);
  m.aiLocal = r1(Math.min(1, kinds / 7) * 80 + (native ? 20 : 0)); note.aiLocal = `${kinds}/7 API trình duyệt · ${native ? '✓' : '✗'} plugin app gốc (Gemini Nano / Foundation Models)`;
  // không tim / năng lượng chặn học
  const gate = /\b(hearts?|energy|lives)\s*(<=|===?|<)\s*0\b|outOfHearts|noHearts|energyLeft|refillHearts/i, hits = [];
  const walk = d => ls(d).forEach(f => { const p = d + '/' + f; if (f === 'i18n') return; if (fs.statSync(P(p)).isDirectory()) walk(p); else if (/\.js$/.test(f) && gate.test(read(p) || '')) hits.push(p); });
  walk('web/js'); m.noLimit = hits.length ? 0 : 100; note.noLimit = hits.length ? 'có cổng chặn: ' + hits.slice(0, 3).join(', ') : '0 cổng tim/năng lượng trong web/js';
  return { m, note };
}

export function build() {
  const A = json(AXES); if (!A) throw new Error('thiếu ' + AXES);
  const { m, note } = measure(A.axes), dlh = json('reports/world/duolingo-lh.json');
  const rows = A.axes.map(a => {
    let d = a.duolingo.score ?? null, dn = a.duolingo.note || '';
    if (a.duolingo.from) { d = dlh && dlh.scores ? dlh.scores[a.duolingo.metric] ?? null : null; dn = dlh && dlh.scores ? `Lighthouse duolingo.com ${String(dlh.at).slice(0, 10)}` + (dlh.metrics ? ` (LCP ${dlh.metrics['largest-contentful-paint']}, CLS ${dlh.metrics['cumulative-layout-shift']})` : '') : (dlh && dlh.skipped ? 'bỏ qua: ' + dlh.skipped : 'chưa đo (world-scorecard.yml)'); }
    const lex = m[a.id] ?? null;
    return { ...a, lexkite: lex, duo: d, duoNote: dn, duoSource: a.duolingo.source, verified: a.duolingo.verified, note: note[a.id] || '', gap: lex == null ? null : r1(a.target - lex) };
  });
  return { A, rows, dlh };
}

export function render({ A, rows }, floors) {
  const both = rows.filter(r => r.lexkite != null && r.duo != null), f = x => x == null ? '–' : String(x);
  const L = ['# Bảng World – Lexkite vs Duolingo (tự sinh – `node scripts/world-scorecard.mjs --write`, đừng sửa tay)', '',
    'Cách đo, nguồn, luật sàn: `docs/WORLD-SCORECARD.md` · trục & mốc Duolingo: `content/pipeline/world.axes.json` · sàn chỉ tăng: `content/pipeline/world.budget.json`.', '',
    `**Tổng Lexkite: ${f(overall(rows, 'lexkite'))} / 100** (mọi trục đo được) · **Trên ${both.length} trục chung: Lexkite ${f(overall(both, 'lexkite'))} vs Duolingo ${f(overall(both, 'duo'))}**`, '',
    ...['core', 'edge'].map(gr => { const b = both.filter(r => r.group === gr); return `- ${gr === 'edge' ? 'Lợi thế khác biệt' : 'Lõi'} (${b.length} trục chung): Lexkite ${f(overall(b, 'lexkite'))} vs Duolingo ${f(overall(b, 'duo'))}`; }), '',
    '| Trục | Nhóm | Lexkite | Duolingo | Mục tiêu | Khoảng cách | Sàn | Đo |', '|---|---|---|---|---|---|---|---|'];
  for (const r of rows) L.push(`| ${r.name} | ${r.group === 'edge' ? '**khác biệt**' : 'lõi'} | **${f(r.lexkite)}** | ${f(r.duo)}${r.duo != null && r.verified === false ? '*' : ''} | ${r.target} | ${f(r.gap)} | ${f(floors[r.id])} | ${r.note.replace(/\|/g, '/')} |`);
  L.push('', '\\* ghi tay, nguồn thứ cấp/mâu thuẫn – kiểm lại khi có nguồn chính thức.', '', `## Lợi thế phải thắng rõ (Lexkite − Duolingo ≥ ${A.mustWinMargin})`, '', '| Trục | Lexkite | Duolingo | Thắng? | Nguồn Duolingo (kiểm ${A.checked}) |'.replace('${A.checked}', A.checked), '|---|---|---|---|---|');
  for (const r of rows.filter(r => r.mustWin)) L.push(`| ${r.name} | ${f(r.lexkite)} | ${f(r.duo)} | ${r.lexkite != null && r.duo != null && r.lexkite - r.duo >= A.mustWinMargin ? '✅ thắng' : '❌ chưa'} | ${r.duoNote}${r.duoSource ? ' – ' + r.duoSource : ''} |`);
  L.push('', '## Top 10 khoảng cách theo tác động ÷ chi phí', '', topTable(rows), '');
  return L.join('\n');
}
export function topTable(rows) {
  const T = rank(rows); const L = ['| # | Trục | Lexkite → mục tiêu | Tác động | Chi phí | Ưu tiên | Hiện trạng |', '|---|---|---|---|---|---|---|'];
  T.forEach((r, i) => L.push(`| ${i + 1} | ${r.name} | ${r.lexkite} → ${r.target} | ${r.impact} | ${r.cost} | ${r.prio} | ${r.note.replace(/\|/g, '/')} |`));
  return L.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = new Set(process.argv.slice(2)), B = json(BUDGET) || { floors: {} };
  const res = build();
  if (args.has('--raise')) { B.floors = raiseFloors(B.floors || {}, res.rows); fs.writeFileSync(P(BUDGET), JSON.stringify(B, null, 1) + '\n'); }
  const md = render(res, B.floors || {});
  if (args.has('--write')) {
    fs.writeFileSync(P(OUT), md);
    const u = read(UXB); if (u && u.includes(MARK[0])) fs.writeFileSync(P(UXB), u.replace(new RegExp(MARK[0] + '[\\s\\S]*?' + MARK[1]), `${MARK[0]}\n_Tự sinh từ \`${OUT}\` (${new Date().toISOString().slice(0, 10)})._\n\n${topTable(res.rows)}\n${MARK[1]}`));
  }
  console.log(md.split('\n').slice(4, 5).join('\n'));
  for (const r of res.rows) console.log(`${r.id.padEnd(10)} ${String(r.lexkite ?? '–').padStart(5)} vs ${String(r.duo ?? '–').padStart(4)} · ${r.note}`);
  if (args.has('--check')) { const bad = checkFloors(B.floors || {}, res.rows); if (bad.length) { console.error('✗ world-scorecard: dưới sàn\n  ' + bad.join('\n  ')); process.exit(1); } console.log('✓ world-scorecard: mọi trục ≥ sàn'); }
}
