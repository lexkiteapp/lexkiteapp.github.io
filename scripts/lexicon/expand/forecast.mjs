#!/usr/bin/env node
// Dự báo lưu trữ kho 20k (docs/LEXICON.md §Lưu trữ 20k): đo mảnh thật hiện tại + mẫu mục mở rộng → ngoại suy tới mục tiêu; cảnh báo ≥ 70 %.
//   node scripts/lexicon/expand/forecast.mjs [--target 20000] [--media-mb 583] [--repo-mb 945] [--dist-files N] [--measure] [--local-git id=dir,…] [--skip id,…] [--out infra/storage-forecast.json]
//   --measure: đo thật từng repo (repo chính + kho media infra/media-repos.json): cây đầu nhánh MB + số tệp (clone nông không blob) + API size (cả lịch sử).
//   Ghi infra/storage-forecast.json + web/data/storage-forecast.json (Quản trị › Lưu trữ đọc bản web). Cảnh báo ≥ 70 % soft (1 GB) hoặc ≥ 70 % soft_files.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { loadRepos } from '../../lib/media-repos.mjs';
import { buildShards } from '../shards.mjs';
import { loadExpand } from './lib.mjs';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const TARGET = +arg('--target', 20000), MEDIA = +arg('--media-mb', 583), REPO = +arg('--repo-mb', 945), DIST = +arg('--dist-files', 0);
const b = buildShards(), now = b.E.size, keys = b.core.reduce((n, c) => n + Object.keys(c.d.e).length, 0);
const raw = b.core.reduce((n, c) => n + JSON.stringify(c.d).length, 0), perKey = raw / keys;
const pub = loadExpand(), perNew = pub.length ? pub.reduce((n, x) => n + JSON.stringify(x.e).length, 0) / pub.length : 1100; // nguồn có 13 ngôn ngữ + qa
const perNewShard = perKey * 1.35, add = Math.max(0, TARGET - now);                              // mục mở rộng có ex2 + ghi chú
const core = Math.ceil((raw + add * perNewShard) / 9000), lang = 13 * Math.ceil(core / 4);
const f = {
  at: new Date().toISOString().slice(0, 10), words_now: now, target: TARGET, add,
  pages_files: { lex_now: b.core.length + 13 * Math.ceil(b.core.length / 4) + 2, lex_at_target: core + lang + 2, dist_now: DIST || null, dist_at_target: DIST ? DIST - (b.core.length + 13 * Math.ceil(b.core.length / 4)) + core + lang : null, gate: 18000 },
  lookup_br_bytes: { core_median: 2800, lang_median: 1300, warm_total: 4100, budget: 5120, note: 'cùng kích thước mảnh (9 KB thô) – thêm mảnh, không phình mảnh' },
  repo_mb: { source_expand: +(add * perNew / 1048576).toFixed(1), source_expand_git: +(add * perNew / 1048576 / 3).toFixed(1), main_repo_now: REPO, soft: 1000 },
  web_js_bytes: 0,
  media_mb: { audio_new: +(add * 2 * 6.2 / 1024).toFixed(0), audio_files: add * 2, images_new: +(add * 0.15 * 12 / 1024).toFixed(0), media_repo_now: MEDIA, soft: 1000 },
};
// ---- Từng repo: MB (cây đầu nhánh + cả lịch sử theo API) + số tệp, dự báo khi đủ TARGET từ ----
const MR = loadRepos(), SOFT = MR.soft_mb || 1000, SOFT_F = MR.soft_files || 60000, ALERT = MR.alert || 0.7;
const prev = (() => { try { return JSON.parse(fs.readFileSync('infra/storage-forecast.json', 'utf8')).repos || []; } catch { return []; } })();
const LOCAL = Object.fromEntries((arg('--local-git', '') || '').split(',').filter(Boolean).map(x => x.split('='))); // id=thư mục git có sẵn (đo không cần mạng)
const SKIP = (arg('--skip', '') || '').split(',').filter(Boolean), MEASURE = process.argv.includes('--measure');
function measure(repo, id) {
  const local = LOCAL[id], dir = local || fs.mkdtempSync(path.join(os.tmpdir(), 'fc-'));
  try {
    if (!local) execFileSync('git', ['clone', '-q', '--bare', '--depth', '1', '--filter=blob:none', `https://github.com/${repo}.git`, dir], { stdio: 'ignore', timeout: 600000 });
    let tree = 0, files = 0; for (const ln of execFileSync('git', ['-C', dir, 'ls-tree', '-r', '-l', 'HEAD'], { maxBuffer: 1 << 29 }).toString().split('\n')) { const m = ln.match(/^\d+ blob \w+\s+(\d+)\t/); if (m) { tree += +m[1]; files++; } }
    return { tree_mb: +(tree / 1e6).toFixed(1), files };
  } catch { return null; } finally { if (!local) fs.rmSync(dir, { recursive: true, force: true }); }
}
async function apiMb(repo) { try { const r = await fetch('https://api.github.com/repos/' + repo, { headers: process.env.GITHUB_TOKEN ? { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN } : {} }); const j = await r.json(); return j.size != null ? +(j.size / 1024).toFixed(0) : null; } catch { return null; } }
const list = [{ id: 'main', repo: 'lexkiteapp/lexkiteapp.github.io', state: 'open', kinds: ['code'] }, ...MR.repos];
f.repos = [];
for (const r of list) {
  const old = prev.find(x => x.id === r.id) || {}, go = MEASURE && r.state !== 'planned';
  const m = go && !SKIP.includes(r.id) ? measure(r.repo, r.id) : null, api = go ? await apiMb(r.repo) : null;
  const row = { id: r.id, repo: r.repo, state: r.state, kinds: r.kinds || [], tree_mb: m ? m.tree_mb : old.tree_mb ?? null, files: m ? m.files : old.files ?? null, api_mb: api ?? old.api_mb ?? null, soft_mb: SOFT, soft_files: r.id === 'main' ? null : SOFT_F };
  row.size_mb = Math.max(row.tree_mb || 0, row.api_mb || 0);
  f.repos.push(row);
}
// Dự báo 20k: âm thanh từ mới (2 giọng) → kho audio open (round-robin đều); nguồn mở rộng → repo chính (git nén ~1/3)
const audioOpen = f.repos.filter(r => r.state === 'open' && r.kinds.includes('audio'));
for (const r of f.repos) {
  let addMb = 0, addFiles = 0;
  if (r.id === 'main') addMb = f.repo_mb.source_expand_git;
  else if (audioOpen.includes(r)) { addMb = f.media_mb.audio_new / audioOpen.length; addFiles = Math.round(f.media_mb.audio_files / audioOpen.length); }
  r.at_target_mb = +((r.size_mb || 0) + addMb).toFixed(0); r.at_target_files = r.files != null ? r.files + addFiles : null;
  r.pct = +((r.size_mb || 0) / SOFT * 100).toFixed(0); r.pct_target = +(r.at_target_mb / SOFT * 100).toFixed(0);
}
const main = f.repos.find(r => r.id === 'main'); if (main && main.size_mb) f.repo_mb.main_repo_now = +main.size_mb.toFixed(0);
const m1 = f.repos.find(r => r.id === 'm1'); if (m1 && m1.size_mb) f.media_mb.media_repo_now = +m1.size_mb.toFixed(0);
f.alerts = [];
const pct = (a, b) => a / b;
if (f.pages_files.dist_at_target && pct(f.pages_files.dist_at_target, 20000) >= ALERT) f.alerts.push(`Pages: ${f.pages_files.dist_at_target}/20000 tệp khi đủ 20k từ (≥ 70 %)`);
for (const r of f.repos) {
  if (r.state === 'planned') continue;
  const label = r.id === 'main' ? 'repo chính' : r.repo.split('/')[1];
  if (r.id === 'main' && (r.tree_mb || 0) > 600) f.alerts.push(`repo chính: cây đầu nhánh ${r.tree_mb} MB > 600 MB (size-guard đỏ)`);
  if (r.state === 'open' && r.id !== 'main' && pct(r.at_target_mb, SOFT) >= ALERT) f.alerts.push(`${label} ${r.at_target_mb} MB / ${SOFT} MB khi đủ ${TARGET} từ (≥ 70 %) – chuyển state=full, mở kho kế (infra/media-repos.json)`);
  else if (pct(r.size_mb, SOFT) >= ALERT) f.alerts.push(`${label} ${r.size_mb} MB / ${SOFT} MB (≥ 70 %)${r.id === 'main' ? ' – phần lớn là lịch sử git (không viết lại, docs/STORAGE.md §3); cây đầu nhánh ' + r.tree_mb + ' MB' : r.state === 'full' ? ' – kho đã đóng (full), chỉ đọc' : ''}`);
  if (r.soft_files && r.at_target_files && pct(r.at_target_files, SOFT_F) >= ALERT) f.alerts.push(`${label}: ${r.at_target_files} tệp khi đủ ${TARGET} từ (≥ 70 % của ${SOFT_F})`);
}
const out = JSON.stringify(f, null, 1) + '\n';
fs.writeFileSync(arg('--out', 'infra/storage-forecast.json'), out);
if (!process.argv.includes('--no-web')) fs.writeFileSync('web/data/storage-forecast.json', out);
for (const a of f.alerts) console.log('::warning title=Dự báo lưu trữ 20k::' + a);
console.log('✓ forecast ' + JSON.stringify({ lex: f.pages_files, repos: f.repos.map(r => `${r.id} ${r.size_mb ?? '?'}MB/${r.files ?? '?'}f → ${r.at_target_mb}MB`) }));
