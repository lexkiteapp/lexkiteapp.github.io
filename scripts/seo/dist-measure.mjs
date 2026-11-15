#!/usr/bin/env node
// Đo dist sau build-web.sh (CI): số file (trần Pages 20k), file theo nhóm, cỡ TB trang words mỗi ngôn ngữ, tốc độ thêm bài blog/ngày.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const D = process.argv[2] || 'dist', files = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else files.push([path.relative(D, p), fs.statSync(p).size]); } };
walk(D);
const grp = new Map(), add = (k, s) => { const g = grp.get(k) || [0, 0]; g[0]++; g[1] += s; grp.set(k, g); };
for (const [f, s] of files) { const p = f.split('/'); add(p[1] === 'words' ? 'words' : p[1] === 'blog' ? 'blog' : p[0].length === 2 ? `${p[1] || ''}(lang pages)` : p[0], s); }
console.log(`## dist: ${files.length} file / trần 20.000 (còn ${20000 - files.length})\n`);
console.log('| nhóm | file | MB |\n|---|---|---|');
for (const [k, [n, s]] of [...grp].sort((a, b) => b[1][0] - a[1][0]).slice(0, 14)) console.log(`| ${k} | ${n} | ${(s / 1e6).toFixed(1)} |`);
const perLang = {};
for (const [f, s] of files) { const m = /^([a-z]{2})\/words\/(?!index\.html)/.exec(f); if (m) { const g = perLang[m[1]] ||= [0, 0]; g[0]++; g[1] += s; } }
console.log('\n| ngôn ngữ | trang words | KB TB/trang | MB tổng |\n|---|---|---|---|');
let tn = 0, ts = 0; for (const [l, [n, s]] of Object.entries(perLang).sort()) { console.log(`| ${l} | ${n} | ${(s / n / 1024).toFixed(1)} | ${(s / 1e6).toFixed(1)} |`); if (l !== 'en' && l !== 'vi') { tn += n; ts += s; } }
console.log(`\n13 ngôn ngữ ngoài en/vi: ${tn} trang, ${(ts / 1e6).toFixed(0)} MB (= phần chuyển sang R2).`);
try { // blog: số file bài mới thêm mỗi ngày trong 14 ngày qua
  const out = execFileSync('git', ['log', '--since=14 days ago', '--diff-filter=A', '--name-only', '--format=', '--', 'content/blog'], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n').filter(f => /\.(json|md|html)$/.test(f));
  console.log(`\nbài blog thêm 14 ngày qua: ${new Set(out).size} nguồn ≈ ${(new Set(out).size / 14).toFixed(1)}/ngày (mỗi bài × ngôn ngữ = số file dist/ngày).`);
} catch (e) { console.log('\n(không đo được blog)'); }
try { const s = JSON.parse(fs.readFileSync('web/free-tier-state.json', 'utf8')); console.log('\nfree-tier-state:', JSON.stringify(s).slice(0, 600)); } catch (e) { /* không có */ }
