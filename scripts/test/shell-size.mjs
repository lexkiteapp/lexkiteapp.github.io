// 📦 Báo cáo khung app theo từng module (gzip) – PR thấy ngay file/nhóm i18n nào phình. Cổng chặn vẫn là size-budget.mjs (trần 377 KB, KHÔNG nâng).
//   - Mỗi file trong SHELL (web/sw.js): gzip hiện tại, so với nhánh gốc (SHELL_BASE, mặc định origin/main nếu có trong git) cùng một bản Node → Δ chính xác
//   - en.js tách theo nhóm nguồn (web/js/i18n/en/<nhóm>.js) + số khóa "chỉ module tải lười dùng" còn nằm trong khung (nên chuyển sang en/lazyui.js)
//   - CI: ghi bảng vào GITHUB_STEP_SUMMARY. Không bao giờ thoát lỗi (chỉ báo cáo).
// Dùng: node scripts/test/shell-size.mjs [--keys] [--move]   (--keys: liệt kê khóa nên chuyển · --move: chuyển luôn rồi chạy bash scripts/build-i18n.sh)
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import vm from 'vm';
import { execFileSync } from 'child_process';
import { pathToFileURL } from 'url';

const gzb = b => zlib.gzipSync(b, { level: 9 }).length, kb = n => (n / 1024).toFixed(1);
export const shellFiles = () => { const sw = fs.readFileSync('web/sw.js', 'utf8'); return [...(sw.match(/const SHELL = \[([\s\S]*?)\];/) || [, ''])[1].matchAll(/'([^']+)'/g)].map(m => m[1]).filter(u => u !== './').map(u => u.endsWith('/') ? u + 'index.html' : u); };
const git = (...a) => { try { return execFileSync('git', a, { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }); } catch (e) { return null; } };

// Nhóm i18n gộp vào en.js (khung) – đọc từ build-i18n.sh; topics/ext/writecheck không tự chuyển (tên bộ từ hiện ở khung trước khi nạp gói; add-on đọc thẳng)
const SH = fs.readFileSync('scripts/build-i18n.sh', 'utf8');
const CORE_GROUPS = ((SH.match(/for f in ([^;]+); do cat "en\/\$f\.js"/) || [])[1] || '').trim().split(/\s+/);
const KEEP = new Set(['topics', 'ext', 'writecheck']);
const DIR = 'web/js/i18n/en', NEW = 'lazyui';

// Bộ phân tích khóa `'k': 'v',` trong en/<nhóm>.js (giữ nguyên chú thích/định dạng khi gỡ khóa)
const entries = src => {
  const out = [], re = /Object\.assign\((?:D\.en \|\| \{\}|g\.I18N_DICT\.en), \{/g; let m, i;
  const ws = () => { for (;;) { if (/\s/.test(src[i])) i++; else if (src.startsWith('//', i)) { while (i < src.length && src[i] !== '\n') i++; } else if (src.startsWith('/*', i)) i = src.indexOf('*/', i) + 2; else break; } };
  const str = () => { const q = src[i]; if (!`'"\``.includes(q)) throw new Error('chuỗi? ' + src.slice(i, i + 40)); const s = i++; while (src[i] !== q) { if (src[i] === '\\') i++; i++; } i++; return src.slice(s, i); };
  while ((m = re.exec(src))) {
    i = m.index + m[0].length;
    for (;;) { ws(); if (src[i] === '}') break; const s = i, k = str(); ws(); if (src[i++] !== ':') throw new Error('thiếu :'); ws(); str(); ws(); while (src[i] === '+') { i++; ws(); str(); ws(); } if (src[i] === ',') i++; out.push({ key: Function('return ' + k)(), start: s, end: i }); }
  }
  return out;
};

// Khóa chỉ module tải lười dùng: có trong file của BUNDLES (app.js), không có trong file nào khác (khung, trang HTML, add-on ngoài app/), khóa chỉ xuất hiện 1 lần trong mọi nhóm
export function lazyOnlyKeys() {
  const app = fs.readFileSync('web/js/app.js', 'utf8'), bt = app.slice(app.indexOf('BUNDLES = {'), app.indexOf('const ROUTE_BUNDLE'));
  const lazy = new Set([...bt.matchAll(/'(js\/[^']+\.js)'/g)].map(m => 'web/' + m[1]));
  const walk = (d, o = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!/node_modules|i18n$/.test(p)) walk(p, o); } else if (/\.(js|mjs|html|json)$/.test(p)) o.push(p); } return o; };
  const web = walk('web').filter(f => !f.startsWith('web/js/i18n/')), tag = new Set();
  for (const f of web.filter(f => f.endsWith('.html'))) for (const m of fs.readFileSync(f, 'utf8').matchAll(/src="\/?(js\/[^"?]+)/g)) tag.add('web/' + m[1]);
  const E = [], L = [];
  for (const f of web) (lazy.has(f) && !tag.has(f) ? L : E).push(fs.readFileSync(f, 'utf8'));
  for (const f of walk('extension').filter(f => !f.startsWith('extension/app/'))) E.push(fs.readFileSync(f, 'utf8'));
  const e = E.join('\n'), l = L.join('\n'), cnt = {}, parsed = {};
  for (const g of fs.readdirSync(DIR).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3))) { const src = fs.readFileSync(`${DIR}/${g}.js`, 'utf8'); let es = []; try { es = entries(src); } catch (x) { /* nhóm dạng khác – bỏ qua */ } parsed[g] = { src, es }; for (const x of es) cnt[x.key] = (cnt[x.key] || 0) + 1; }
  for (const x of entries('(' + SH.slice(SH.indexOf('Object.assign(g.I18N_DICT.en, {')))) cnt[x.key] = 9; // khối "thống nhất thuật ngữ"
  const res = {};
  for (const g of CORE_GROUPS.filter(g => !KEEP.has(g) && parsed[g])) res[g] = parsed[g].es.filter(x => cnt[x.key] === 1 && !e.includes(x.key) && l.includes(x.key));
  return { res, parsed };
}

function moveKeys({ res, parsed }) {
  const nf = `${DIR}/${NEW}.js`; let src = fs.readFileSync(nf, 'utf8'), add = '';
  for (const [g, mv] of Object.entries(res)) {
    if (!mv.length) continue; const s0 = parsed[g].src; let out = s0;
    add += `  // ← en/${g}.js\n` + mv.map(x => '  ' + s0.slice(x.start, x.end).trim().replace(/,?$/, ',')).join('\n') + '\n';
    for (const x of [...mv].reverse()) { let en = x.end; while (out[en] === ' ') en++; out = out.slice(0, x.start) + '\u0000' + out.slice(en); }
    fs.writeFileSync(`${DIR}/${g}.js`, out.split('\n').filter(l => !(l.includes('\u0000') && !l.replace(/\u0000/g, '').trim())).join('\n').replace(/\u0000/g, ''));
  }
  const j = src.lastIndexOf('}); })('); fs.writeFileSync(nf, src.slice(0, j) + add + src.slice(j));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = process.env.SHELL_BASE || 'origin/main', hasBase = !!git('rev-parse', '--verify', '-q', base + '^{commit}');
  const budget = JSON.parse(fs.readFileSync('scripts/test/budget.json', 'utf8')).shellGz;
  const rows = shellFiles().map(u => { const f = path.join('web', u), now = fs.existsSync(f) ? gzb(fs.readFileSync(f)) : 0; const b = hasBase ? git('show', `${base}:${f}`) : null; return { u, now, d: b ? now - gzb(b) : hasBase ? now : null }; }).sort((a, b) => b.now - a.now);
  const total = rows.reduce((s, r) => s + r.now, 0), dT = hasBase ? rows.reduce((s, r) => s + r.d, 0) : null;
  const sg = d => (d == null ? '' : (d > 0 ? '+' : '') + d + ' B');
  const lines = [`Khung app ${kb(total)} / ${kb(budget)} KB gz (còn trống ${kb(budget - total)} KB)` + (hasBase ? ` · so với ${base}: ${sg(dT)}` : ' · (không có nhánh gốc để so – đặt SHELL_BASE)'), ''];
  for (const r of rows) lines.push(`${String(r.now).padStart(7)} B  ${(r.d ? sg(r.d) : '').padStart(9)}  ${r.u}`);
  const grp = CORE_GROUPS.filter(g => fs.existsSync(`${DIR}/${g}.js`)).map(g => [g, gzb(fs.readFileSync(`${DIR}/${g}.js`))]).sort((a, b) => b[1] - a[1]);
  lines.push('', 'en.js theo nhóm nguồn (gz riêng lẻ): ' + grp.map(([g, n]) => `${g} ${kb(n)}`).join(' · '));
  const lk = lazyOnlyKeys(), nKeys = Object.values(lk.res).reduce((s, v) => s + v.length, 0);
  if (nKeys) { const est = gzb(Buffer.from(Object.entries(lk.res).flatMap(([g, v]) => v.map(x => lk.parsed[g].src.slice(x.start, x.end))).join('\n'))); lines.push(`⚠ ${nKeys} khóa chỉ module tải lười dùng còn trong en.js (~${kb(est)} KB gz): ` + Object.entries(lk.res).filter(([, v]) => v.length).map(([g, v]) => `${g} ${v.length}`).join(', ') + ' → node scripts/test/shell-size.mjs --move && bash scripts/build-i18n.sh'); }
  else lines.push('✓ en.js không còn khóa chỉ module tải lười dùng (trừ topics/ext/writecheck)');
  if (process.argv.includes('--keys')) for (const [g, v] of Object.entries(lk.res)) for (const x of v) lines.push(`  ${g}: ${x.key.slice(0, 90)}`);
  if (process.argv.includes('--move') && nKeys) { moveKeys(lk); lines.push(`→ đã chuyển ${nKeys} khóa sang en/${NEW}.js – chạy bash scripts/build-i18n.sh`); }
  console.log('📦 shell-size\n' + lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### 📦 Khung app theo module\n\n```\n' + lines.join('\n') + '\n```\n');
}
