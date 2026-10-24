#!/usr/bin/env node
// Dự báo lưu trữ kho 20k (docs/LEXICON.md §Lưu trữ 20k): đo mảnh thật hiện tại + mẫu mục mở rộng → ngoại suy tới mục tiêu; cảnh báo ≥ 70 %.
//   node scripts/lexicon/expand/forecast.mjs [--target 20000] [--media-mb 583] [--repo-mb 945] [--dist-files N] [--out infra/storage-forecast.json]
import fs from 'fs';
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
f.alerts = [];
const pct = (a, b) => a / b;
if (f.pages_files.dist_at_target && pct(f.pages_files.dist_at_target, 20000) >= 0.7) f.alerts.push(`Pages: ${f.pages_files.dist_at_target}/20000 tệp khi đủ 20k từ (≥ 70 %)`);
if (pct(REPO + f.repo_mb.source_expand_git, 1000) >= 0.7) f.alerts.push(`repo chính ${REPO + f.repo_mb.source_expand_git} MB / 1 GB (≥ 70 %) – âm thanh từ mới KHÔNG được ghi vào repo chính`);
if (pct(MEDIA + f.media_mb.audio_new + f.media_mb.images_new, 1000) >= 0.7) f.alerts.push(`lexkite-media ${MEDIA + f.media_mb.audio_new + f.media_mb.images_new} MB / 1 GB (≥ 70 %) – mở kho m2 (infra/media-repos.json)`);
fs.writeFileSync(arg('--out', 'infra/storage-forecast.json'), JSON.stringify(f, null, 1) + '\n');
for (const a of f.alerts) console.log('::warning title=Dự báo lưu trữ 20k::' + a);
console.log('✓ forecast ' + JSON.stringify({ lex: f.pages_files, repo: f.repo_mb, media: f.media_mb }));
