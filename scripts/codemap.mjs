#!/usr/bin/env node
// 🗺️ Bản đồ mã nguồn (Node 22, chỉ dùng thư viện có sẵn): quét repo → docs/CODEMAP.md (≤ 25 KB, đọc ĐẦU PHIÊN) + docs/codemap.json (đồ thị đầy đủ).
// Dùng: node scripts/codemap.mjs [--check]   (--check: không ghi, thoát 1 nếu file đã commit lệch)
// Đầu ra xác định (không có ngày/sha) → chạy lại không đổi thì không sinh commit. Tra chính xác: node -e / jq trên docs/codemap.json.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAP = 25000;                       // trần CODEMAP.md (byte)
const MAX_SRC = 400 * 1000;              // bỏ qua file > 400 KB (dữ liệu sinh)
const CHECK = process.argv.includes('--check');
const sh = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });

// ---------- 1. liệt kê file ----------
let files;
try { files = sh('git', ['ls-files', '-z']).split('\0').filter(Boolean); }
catch { files = []; const walk = d => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const p = d ? d + '/' + e.name : e.name; if (e.isDirectory()) { if (!/^(\.git|node_modules)$/.test(e.name)) walk(p); } else files.push(p); } }; walk(''); }
files = files.filter(f => fs.existsSync(path.join(ROOT, f)));

// Bỏ: bản sao dựng (extension/app = web), vendor, bundle i18n sinh, dữ liệu lớn, nhị phân.
const SKIP = [/^extension\/app\//, /(^|\/)node_modules\//, /^(dist|out|legacy-public)\//, /^mobile\/(ios|android)\//, /(^|\/)vendor\//, /\.min\.js$/,
  /^web\/js\/i18n\//, /^web\/js\/(notes|vimg|get-app|explain)\//, /^web\/(packs|data|audio|img|icons|screenshots|fonts|sfx)\//, /^content\//, /^brand\/library\//, /^extension\/_locales\//];
const isCode = f => /\.(m?js|cjs)$/.test(f) && !SKIP.some(r => r.test(f));
const size = f => fs.statSync(path.join(ROOT, f)).size;
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const codeFiles = files.filter(f => isCode(f) && size(f) <= MAX_SRC).sort();
const fileSet = new Set(files);

// ---------- 2. phân tích module ----------
const RES = ['', '.js', '.mjs', '.cjs', '/index.js', '/index.mjs'];
const resolveFrom = (fromDir, spec) => { const base = path.posix.normalize(path.posix.join(fromDir, spec)); for (const e of RES) if (fileSet.has(base + e)) return base + e; return null; };
const strRe = /['"`]((?:\.{1,2}\/|\/)?[\w@.\-]+\/[\w@.\-/]+\.(?:m?js|cjs)|\.{1,2}\/[\w@.\-]+\.(?:m?js|cjs))['"`]/g;
const impRe = [/\bimport\s+(?:[\w*${}\s,]+?\s+from\s+)?['"]([^'"\n]+)['"]/g, /\bexport\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"\n]+)['"]/g, /\bimport\(\s*['"]([^'"\n]+)['"]\s*\)/g, /\brequire\(\s*['"]([^'"\n]+)['"]\s*\)/g];
const symRe = [/\bexport\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([\w$]+)/g, /\bmodule\.exports\.([\w$]+)\s*=/g, /(?<![\w.])exports\.([\w$]+)\s*=/g, /\bwindow\.([A-Za-z_$][\w$]*)\s*=[^=]/g, /(?<![\w.])App\.([A-Za-z_$][\w$]*)\s*=[^=]/g, /(?<![\w.])routes\.([A-Za-z_$][\w$]*)\s*=[^=]/g];
const nodes = {};
function analyse(f) {
  const src = read(f), dir = path.posix.dirname(f), imports = new Set(), syms = new Set();
  for (const re of impRe) for (const m of src.matchAll(re)) { if (!/^\.{1,2}\//.test(m[1]) && !m[1].startsWith('/')) continue; const r = resolveFrom(dir, m[1]); if (r) imports.add(r); }
  for (const m of src.matchAll(strRe)) { const s = m[1].replace(/^\//, ''); const r = resolveFrom(dir, s) || (fileSet.has(s) ? s : null) || (fileSet.has('web/' + s) ? 'web/' + s : null); if (r) imports.add(r); }
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) for (const n of m[1].split(',')) { const a = n.trim().split(/\s+as\s+/).pop(); if (a) syms.add(a); }
  if (/\bexport\s+default\b/.test(src) || /\bmodule\.exports\s*=/.test(src)) syms.add('default');
  for (const re of symRe) for (const m of src.matchAll(re)) syms.add(m[1]);
  imports.delete(f);
  return { path: f, bytes: src.length, exports: [...syms].slice(0, 12), imports: [...imports].sort(), importedBy: [], head: (src.match(/^(?:#!.*\n)?\s*(?:\/\/|\/\*+)\s*(.{8,140})/) || [, ''])[1].replace(/\*\/\s*$/, '').trim() };
}
for (const f of codeFiles) nodes[f] = analyse(f);
// HTML tải script bằng <script src> → cạnh html→js (và tính là "dùng bởi")
const htmlLoads = {};
for (const f of files.filter(f => /^web\/(app\/)?index\.html$|^web\/admin\.html$|^extension\/[\w-]+\.html$/.test(f))) {
  const dir = path.posix.dirname(f), set = new Set();
  for (const m of read(f).matchAll(/<script[^>]+src="([^"?#]+)/g)) { const r = resolveFrom(dir, m[1]); if (r && nodes[r]) set.add(r); }
  if (set.size) htmlLoads[f] = [...set];
}
// Script trình duyệt dùng toàn cục (window.X = …): cạnh "dùng X." → file định nghĩa X (chỉ khi X do đúng 1 file web/js định nghĩa)
const globalDef = {};
for (const n of Object.values(nodes)) if (/^web\/js\//.test(n.path)) for (const m of read(n.path).matchAll(/\bwindow\.([A-Z][A-Za-z0-9]{1,})\s*=[^=]/g)) (globalDef[m[1]] ||= new Set()).add(n.path);
const globalOwner = Object.fromEntries(Object.entries(globalDef).filter(([, s]) => s.size === 1).map(([k, s]) => [k, [...s][0]]));
const gnames = Object.keys(globalOwner);
if (gnames.length) { const gre = new RegExp('(?<![\\w$.])(' + gnames.join('|') + ')\\s*[.(\\[]|window\\.(' + gnames.join('|') + ')\\b', 'g');
  for (const n of Object.values(nodes)) if (/^web\/js\//.test(n.path)) for (const m of read(n.path).matchAll(gre)) { const o = globalOwner[m[1] || m[2]]; if (o && o !== n.path) n.imports.push(o); } }
for (const n of Object.values(nodes)) n.imports = [...new Set(n.imports)].sort().filter(i => nodes[i]);
for (const n of Object.values(nodes)) for (const i of n.imports) nodes[i].importedBy.push(n.path);
for (const [h, l] of Object.entries(htmlLoads)) for (const i of l) nodes[i].importedBy.push(h);
for (const n of Object.values(nodes)) n.importedBy.sort();
const nonTest = n => n.importedBy.filter(p => !/^scripts\/test\//.test(p));
const indeg = n => nonTest(n).length;

// ---------- 3. god nodes ----------
const gods = Object.values(nodes).filter(n => !/^scripts\/test\//.test(n.path)).sort((a, b) => indeg(b) - indeg(a) || a.path.localeCompare(b.path)).slice(0, 15);

// ---------- 4. routes ----------
const routes = {};
for (const f of codeFiles.filter(f => /^web\/js\//.test(f))) {
  const src = read(f);
  for (const m of src.matchAll(/\broutes(?:\.([A-Za-z_$][\w$]*)|\[\s*['"]([\w-]+)['"]\s*\])\s*=[^=]/g)) { const k = m[1] || m[2]; (routes[k] ||= new Set()).add(f); }
}
const routeList = Object.entries(routes).map(([k, s]) => ['#/' + k, [...s].sort()]).sort((a, b) => a[0].localeCompare(b[0]));

// ---------- 5. workflows ----------
const wfDir = '.github/workflows', workflows = [];
for (const f of files.filter(f => f.startsWith(wfDir + '/') && /\.ya?ml$/.test(f)).sort()) {
  const src = read(f), lines = src.split('\n');
  const name = (src.match(/^name:\s*['"]?(.+?)['"]?\s*$/m) || [, path.basename(f)])[1];
  const onIdx = lines.findIndex(l => /^(on|'on'|true):/.test(l));
  let block = ''; if (onIdx >= 0) { block = lines[onIdx]; for (let i = onIdx + 1; i < lines.length && !/^\S/.test(lines[i]); i++) block += '\n' + lines[i]; }
  const trig = [];
  const has = k => new RegExp('(^|[\\s\\[{,])' + k + '\\s*[:,\\]}]|^\\s*' + k + '\\s*$', 'm').test(block) || new RegExp('\\b' + k + '\\b').test(block.split('\n')[0]);
  if (has('push')) trig.push(/push[\s\S]*?branches:[^\n]*\b(main|master)\b/.test(block) || /push\s*:\s*\{[^}]*main/.test(block) ? 'push:main' : 'push');
  if (has('pull_request')) trig.push('pr');
  if (has('schedule')) trig.push('cron');
  if (has('workflow_dispatch')) trig.push('manual');
  if (has('workflow_run')) trig.push('after-wf');
  if (has('workflow_call')) trig.push('call');
  if (has('issues') || has('issue_comment')) trig.push('issue');
  // mô tả: dòng chú thích đầu file (trước `name:`)
  const com = []; for (const l of lines) { if (/^#/.test(l)) com.push(l.replace(/^#+\s*/, '')); else if (l.trim()) break; }
  let desc = (com.join(' ') || name).replace(/\s+/g, ' ').replace(/^[^\p{L}\p{N}(]+/u, '').trim();
  desc = desc.split(/\.\s|\s[—–]\s/)[0].replace(/[:;,\s]+$/, '');
  if (desc.length > 62) desc = desc.slice(0, 62).replace(/\s+\S*$/, '') + '…';
  workflows.push({ file: path.basename(f), name, triggers: trig, desc });
}

// ---------- 6. test → vùng phủ ----------
const areaOf = p => { const parts = p.split('/'); if (parts.length === 1) return '(root)'; return parts.slice(0, Math.min(parts.length - 1, 2)).join('/'); };
const tests = [];
for (const f of files.filter(f => /^scripts\/test\/[^/]+\.(m?js|cjs)$/.test(f)).sort()) {
  const src = read(f), dir = path.posix.dirname(f), cnt = {}, targets = new Set();
  const add = p => { if (!p || /^(scripts\/test\/|docs\/)/.test(p)) return; targets.add(p); };
  for (const m of src.matchAll(/['"`]((?:\.{1,2}\/)[\w@.\-/]+)['"`]/g)) { const r = resolveFrom(dir, m[1]); if (r) add(r); }
  for (const m of src.matchAll(/(?<![\w/.-])((?:web|scripts|functions|workers|extension|brand|infra|mobile|content)\/[\w.\-/]*[\w.-])/g)) { const p = m[1].replace(/\/+$/, ''); if (fileSet.has(p) || files.some(x => x.startsWith(p + '/'))) add(p); }
  for (const t of [...targets]) { if (/^(scripts\/lib\/|extension\/app\/|web\/js\/i18n\/)/.test(t) && targets.size > 1) continue; const a = areaOf(fileSet.has(t) ? t : t + '/x'); cnt[a] = (cnt[a] || 0) + 1; }
  const best = Object.entries(cnt).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  tests.push({ test: path.basename(f).replace(/\.(m?js|cjs)$/, ''), file: f, area: best ? best[0] : '(không rõ)', targets: [...targets].sort().slice(0, 12) });
}
const testsByArea = {}; for (const t of tests) (testsByArea[t.area] ||= []).push(t.test);

// ---------- 7. khu vực & "sửa ở đâu" ----------
const top = {}; for (const f of files) { const k = f.includes('/') ? f.split('/')[0] : '(root)'; top[k] = (top[k] || 0) + 1; }
const apiNames = files.filter(f => /^functions\/api\/[^_][^/]*\.js$/.test(f)).map(f => path.basename(f, '.js')).sort();
const AREAS = [
  ['web/', 'App (SPA) + landing: shell web/app/index.html nạp web/js/*.js bằng <script> (toàn cục App/UI/Chars, KHÔNG import); lazy bundle: BUNDLES trong web/js/app.js; css web/css; trang tĩnh sinh bởi scripts/build-*.mjs → dist'],
  ['extension/', 'Add-on Chrome/Edge (background/content/popup/newtab). extension/app là BẢN SAO dựng từ web/ (scripts/build-extension.sh) – KHÔNG sửa tay, bị bỏ khỏi map'],
  ['functions/', 'Cloudflare Pages Functions = backend /api/* (file _*.js là helper dùng chung)'],
  ['workers/', 'Cloudflare Workers riêng: audio, dict, gemini (AI), mail, media; workers/lib dùng chung'],
  ['scripts/', 'Công cụ build/gen/ops (mjs); scripts/test = chuỗi `npm test`; thư mục con theo mảng (video, lexicon, dict, ops, jobs, ci, social, seo…)'],
  ['.github/workflows/', 'CI/CD + việc nền theo lịch (xem mục Workflows)'],
  ['infra/', 'Sổ hạ tầng JSON: resources, jobs (nguồn của docs/JOBS.md), media-repos, schema.lock'],
  ['brand/', 'tokens.json (màu), logo, stitch/ (ref + DTCG), library/ (kho cảnh/clip video)'],
  ['content/', 'Nội dung nguồn: blog, authority, dict, confidence, explain, brand (dữ liệu lớn – bỏ khỏi map)'],
  ['mobile/', 'Capacitor iOS/Android (ios/ android/ bỏ khỏi map)'],
  ['store/', 'Hồ sơ listing Chrome/Edge/Apple/Play'],
  ['docs/', 'Luật + tài liệu chủ đề (docs/README.md → INDEX.md); lịch sử ở docs/archive'],
];
const WHERE = [
  ['Chuỗi i18n (15 ngôn ngữ)', 'Khóa = câu tiếng Việt trong t(\'…\'). Bản dịch web/js/i18n/<lang>.js + web/js/i18n/en/*.js (nhóm theo tính năng); add-on extension/_locales/<lang>/messages.json. Tool: scripts/i18n-missing.mjs, i18n-qa.mjs, gen-i18n.mjs, i18n-sync.sh. Luật: docs/I18N-PIPELINE.md. Test: scripts/test/i18n-*.mjs'],
  ['Design token / màu', 'brand/tokens.json → scripts/build-tokens.mjs → :root trong web/css/style.css (+ scripts/lib/site-layout.mjs). Stitch: brand/stitch/tokens.dtcg.json, scripts/build-stitch-css.mjs → web/css/st-*.css. Luật: docs/DESIGN-SYSTEM.md, docs/BRAND-RULES.md; test brand-check.mjs'],
  ['Giáo viên Ama/Carlos', 'Registry web/teach/characters.json (+ ama/ carlos/); API Chars.* ở web/js/characters.js; lời/khẩu hình web/js/lesson/teacher.js, web/js/st/v2/teacher-call.js; tool scripts/teach, scripts/teacher; luật docs/CHARACTERS.md; test characters-gate.mjs'],
  ['Luồng bài học', 'web/js/lesson/{engine,ui,stories,gold,teacher}.js; màn st: web/js/st/lesson.js, web/js/st/v2/lesson-question.js, lesson-complete.js; lộ trình web/js/path.js, plan.js, next-step.js; build scripts/lesson/; docs/LESSON-ENGINE.md, docs/LEARNING-PATH.md; test lesson.mjs, learn-flow.mjs'],
  ['Từ điển / từ vựng', 'web/js/dictionary.js (route #/dict), lexis.js, lex.js, wordcard.js, vocab-img.js; dữ liệu sinh: scripts/build-lexicon.mjs, scripts/lexicon/, scripts/dict/, workers/dict; docs/LEXICON.md; test lex.mjs, dict-pages.mjs'],
  ['Cổng Stitch v2', 'scripts/stitch-v2-convert.mjs (HTML Stitch → module) → web/js/st/v2/*.js + web/css/st-v2-*.css; ref brand/stitch/v2; docs/STITCH-V2-PORT.md; CI so ảnh (workflow nav-render, dist-ui)'],
  ['Pipeline video', 'scripts/video/{render,auto,synth,motion}.mjs + remotion/ + motion/; cảnh cine scripts/cine; footage scripts/footage; kho brand/library/cine; docs/VIDEO.md, docs/VIDEO-MOTION.md, docs/CREDIT-RULES.md (tiêu credit: đọc trước); workflow cine-render, footage-*'],
  ['Route / màn hình app', 'routes.<tên> = … rải ở web/js/*.js (bảng Routes dưới); alias + lazy bundle ở web/js/app.js (ROUTE_ALIAS, ROUTE_BUNDLE, BUNDLES); thêm script toàn cục → web/app/index.html'],
  ['API backend', 'functions/api/<tên>.js = /api/<tên>; helper functions/api/_*.js (quota, abuse…); test api-security.mjs'],
  ['Add-on', 'extension/{manifest.json,background.js,content.js,popup.js,newtab.js}; build scripts/build-extension.sh (web → extension/app); test ext-*.mjs; docs/CWS-RULES.md'],
  ['Blog / SEO', 'content/blog + scripts/blog-pipeline.mjs, build-blog.mjs, build-seo.mjs; workflow blog-daily; docs/BLOG-RUNBOOK.md'],
  ['CI / việc nền', 'infra/jobs.json → docs/JOBS.md (node scripts/jobs/gen.mjs); lease scripts/jobs/lease.mjs; chuỗi test = package.json "test"; scripts/prepush.sh; docs/CI-RUNNERS.md'],
];
const exists = p => files.some(f => f === p || f.startsWith(p.replace(/\/$/, '') + '/') || (/\.\w+$/.test(p) ? false : f.startsWith(p)));

// ---------- 8. sinh CODEMAP.md ----------
const kb = n => (n / 1000).toFixed(1);
const pick = (a, n) => a.slice(0, n).join(',') + (a.length > n ? '…' : '');
const short = (p, base) => p.startsWith(base) ? p.slice(base.length) : p;
const out = [];
out.push('# CODEMAP – bản đồ mã nguồn (SINH TỰ ĐỘNG, đừng sửa tay)', '',
  '> TL;DR: Đọc file này ĐẦU PHIÊN thay vì khám phá repo; tra chính xác bằng `docs/codemap.json` (`node -e` / jq); chỉ grep/mở file mà bản đồ trỏ tới. Sinh bởi `node scripts/codemap.mjs` (workflow codemap.yml). Luật: TOKEN-RULES.md §1.',
  '> Đọc khi: ĐẦU MỖI PHIÊN, trước khi tìm code.', '',
  'Tra json: `node -e "const g=require(\'./docs/codemap.json\');console.log(g.nodes[\'web/js/app.js\'])"` · `g.routes` · `g.workflows` · `g.tests` · `g.god`. Mỗi node: exports, imports, importedBy.', '');
out.push('## Khu vực');
for (const [d, p] of AREAS) { const k = d.replace(/\/$/, ''); const c = d.startsWith('.github') ? files.filter(f => f.startsWith(d)).length : (top[k] || 0); out.push(`- \`${d}\` (${c} file): ${p}`); }
out.push(`- API \`/api/*\` (${apiNames.length}): ${pick(apiNames, 70)}`);
const subs = {}; for (const f of files) { const m = f.match(/^(web\/js\/[\w-]+|scripts\/[\w-]+)\//); if (m) subs[m[1]] = (subs[m[1]] || 0) + 1; }
out.push(`- Thư mục con (số file; js/=web/js, s/=scripts): ${Object.entries(subs).filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([d, c]) => `${d.replace(/^web\/js\//, 'js/').replace(/^scripts\//, 's/')}:${c}`).join(' ')}`, '');
out.push('## Sửa ở đâu (tác vụ → file)');
for (const [k, v] of WHERE) {
  const miss = (v  .match(/(?:web|scripts|functions|workers|extension|brand|infra|content|docs)\/[\w.\-/]+/g) || []).map(p => p.replace(/[.,]+$/, '')).filter(p => !/[<{*…]/.test(p) && !exists(p));
  if (miss.length) console.warn(`⚠ "${k}": đường dẫn không tồn tại: ${miss.join(', ')}`);
  out.push(`- **${k}**: ${v}`);
}
out.push('', `## God nodes (${gods.length} module được import/nạp nhiều nhất; không tính test)`);
gods.forEach((n, i) => out.push(`${i + 1}. \`${n.path}\` ←${indeg(n)} · ${pick(n.exports, 6) || 'script'}`));
out.push('', `## Routes \`#/…\` → file xử lý (${routeList.length})`);
const byFile = {}; for (const [r, fs_] of routeList) for (const f of fs_) (byFile[f] ||= []).push(r.slice(2));
for (const [f, rs] of Object.entries(byFile).sort()) out.push(`- \`${short(f, 'web/js/')}\`: ${rs.join(' ')}`);
out.push('', `## Workflows (${workflows.length}): [trigger] việc kiểm/làm`);
for (const w of workflows) out.push(`- ${w.file.replace(/\.ya?ml$/, '')} [${w.triggers.join(',') || '?'}] ${w.desc}`);
out.push('', `## Test (${tests.length}) → vùng phủ (file đích chi tiết: json \`tests\`)`);
for (const [a, ts] of Object.entries(testsByArea).sort((x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0]))) out.push(`- \`${a}\`: ${ts.join(' ')}`);
const fixed = Buffer.byteLength(out.join('\n'));
// Mô-đun: lấp phần ngân sách còn lại, ưu tiên theo mức nối (dependents) rồi số export; json giữ tất cả.
const room = CAP - fixed - 700;
const cand = Object.values(nodes).filter(n => !/^scripts\/test\//.test(n.path) && (indeg(n) > 0 || n.imports.length > 1) && n.exports.length + n.imports.length > 0)
  .map(n => ({ n, score: indeg(n) * 4 + n.imports.length + Math.min(n.exports.length, 6) * 0.3 })).sort((a, b) => b.score - a.score || a.n.path.localeCompare(b.n.path));
const line = n => { const base = path.posix.basename(n.path); const dep = nonTest(n).slice(0, 3).map(p => path.posix.basename(p)).join(','); const use = n.imports.slice(0, 3).map(p => path.posix.basename(p)).join(','); return `${base}${n.exports.length ? ': ' + pick(n.exports, 5) : ''} →${use || '-'} ←${indeg(n)}${dep ? ' (' + dep + ')' : ''}`; };
const chosen = []; let used = 0;
for (const c of cand) { const L = Buffer.byteLength(line(c.n)) + 3; if (used + L + 40 > room) continue; chosen.push(c.n); used += L; }
const groups = {}; for (const n of chosen) (groups[path.posix.dirname(n.path)] ||= []).push(n);
out.push('', `## Mô-đun JS chính (${chosen.length}/${Object.keys(nodes).length}; phần còn lại trong json) – tên: export →nạp/import ←số nơi dùng`);
for (const [d, ns] of Object.entries(groups).sort()) out.push(`- \`${d}/\` ` + ns.sort((a, b) => a.path.localeCompare(b.path)).map(line).join(' · '));
const md = out.join('\n') + '\n';
if (Buffer.byteLength(md) > CAP) { console.error(`✗ CODEMAP ${Buffer.byteLength(md)} B > ${CAP}`); process.exit(1); }

// ---------- 9. ghi ----------
const graph = {
  _: 'Sinh bởi scripts/codemap.mjs – đừng sửa tay. nodes[path]={exports,imports,importedBy}; extension/app, i18n bundle, dữ liệu lớn bị loại.',
  god: gods.map(n => ({ path: n.path, importedBy: indeg(n) })),
  routes: Object.fromEntries(routeList), workflows, tests, htmlLoads,
  nodes: Object.fromEntries(Object.entries(nodes).map(([k, n]) => [k, { exports: n.exports, imports: n.imports, importedBy: n.importedBy, ...(n.head ? { note: n.head } : {}) }])),
};
const json = JSON.stringify(graph) + '\n';
const MD = path.join(ROOT, 'docs/CODEMAP.md'), JS = path.join(ROOT, 'docs/codemap.json');
if (CHECK) {
  const same = fs.existsSync(MD) && fs.readFileSync(MD, 'utf8') === md && fs.existsSync(JS) && fs.readFileSync(JS, 'utf8') === json;
  console.log(same ? '✓ codemap: khớp' : '✗ codemap: lệch – chạy node scripts/codemap.mjs'); process.exit(same ? 0 : 1);
}
fs.writeFileSync(MD, md); fs.writeFileSync(JS, json);
console.log(`✓ codemap: CODEMAP.md ${kb(Buffer.byteLength(md))} KB (≤ ${CAP / 1000}), codemap.json ${kb(json.length)} KB · ${Object.keys(nodes).length} module, ${gods.length} god node, ${routeList.length} route, ${workflows.length} workflow, ${tests.length} test`);
