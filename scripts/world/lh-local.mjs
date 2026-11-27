#!/usr/bin/env node
// Perf của bảng World đo trên dist TĨNH cục bộ, trung vị 5 lần (cách Lighthouse CI: numberOfRuns 5, aggregationMethod median-run) – #2328:
// điểm live lexkite.com dao động 94–99 (CDN/mạng/giờ) nên sàn bị nâng bởi một mẫu may. Dist cục bộ + 5 lần = ít nhiễu hơn; 0 lượt chạm prod.
//   node scripts/world/lh-local.mjs [--root dist] [--runs 5] [--page en/]  → reports/world/lighthouse-local.json (cùng dạng một mục của reports/lighthouse.json)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Lần chạy có điểm trung vị (chẵn → lần thấp hơn ở giữa, bảo thủ như lighthouse.yml). runs = [{ score, ... }]. */
export function medianRun(runs) {
  const s = [...runs].sort((a, b) => a.score - b.score);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : null;
}
const METRICS = ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'];
export const summarize = (d, pages = 5) => ({
  url: d.finalDisplayedUrl, at: d.fetchTime, runs: pages, method: 'median-of-' + pages + ' local dist',
  scores: Object.fromEntries(Object.entries(d.categories).map(([k, v]) => [k, Math.round(v.score * 100)])),
  metrics: Object.fromEntries(METRICS.map(k => [k, d.audits[k].displayValue])),
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
  const root = arg('root', 'dist'), N = +arg('runs', 5), page = arg('page', 'en/');
  const { serve } = await import('../quality/serve.mjs'), { chromium } = await import('playwright');
  const srv = await serve(root, 0), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lhl-')), chrome = chromium.executablePath(), runs = [];
  for (let i = 1; i <= N; i++) {
    const out = path.join(tmp, `lh${i}.json`);
    const r = spawnSync('npx', ['-y', 'lighthouse@12.2.1', `${srv.origin}/${page}`, '--form-factor=mobile', '--only-categories=performance,accessibility,best-practices,seo', '--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage --disable-gpu', '--output=json', `--output-path=${out}`, '--quiet'], { env: { ...process.env, CHROME_PATH: chrome }, stdio: 'inherit', timeout: 240e3 });
    if (r.status !== 0 || !fs.existsSync(out)) { console.log(`::warning::lighthouse lần ${i} lỗi (${r.status})`); continue; }
    const d = JSON.parse(fs.readFileSync(out, 'utf8')); runs.push({ score: d.categories.performance.score, d });
    console.log(`lần ${i}: perf ${Math.round(d.categories.performance.score * 100)}`);
  }
  srv.close();
  const m = medianRun(runs);
  if (!m || runs.length < Math.ceil(N / 2)) { console.error(`✗ lh-local: chỉ ${runs.length}/${N} lần đo hợp lệ – không ghi số (World dùng reports/lighthouse.json)`); process.exit(1); }
  fs.mkdirSync('reports/world', { recursive: true });
  fs.writeFileSync('reports/world/lighthouse-local.json', JSON.stringify(summarize(m.d, runs.length), null, 1) + '\n');
  console.log(`✓ lh-local: trung vị ${runs.length} lần = ${Math.round(m.score * 100)} (${runs.map(r => Math.round(r.score * 100)).join(', ')})`);
}
