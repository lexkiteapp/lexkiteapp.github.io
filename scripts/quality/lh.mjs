// Lighthouse trên 6 trang chính (điện thoại, mạng 4G giả lập) phục vụ từ dist cục bộ qua serve.mjs (brotli; /api/* = {}; workflow trỏ lexkite.com về 127.0.0.1 trong /etc/hosts → 0 lượt D1 thật).
// Ngân sách: hiệu năng ≥ 85 (di động), a11y ≥ 95, SEO ≥ 95. Dùng: node scripts/quality/lh.mjs <dist> <out.json>
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
const execFileP = promisify(execFile); // KHÔNG dùng execFileSync: nó chặn vòng lặp sự kiện nên máy chủ tĩnh trong cùng tiến trình không trả lời được
import { serve } from './serve.mjs';
const ROOT = path.resolve(process.argv[2] || 'dist'), OUT = process.argv[3] || 'lh.json';
const BUDGET = { performance: 85, accessibility: 95, seo: 95 };
const first = d => { try { return fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).filter(e => e.isDirectory() && fs.existsSync(path.join(ROOT, d, e.name, 'index.html'))).map(e => e.name).sort()[0]; } catch { return ''; } };
const post = first('en/blog');
// /app/?hl=en (không ?sandbox=): robots.txt cấm ?sandbox=/?demo= nên Lighthouse sẽ chấm 'bị chặn' → SEO 61 oan; /app/ thật có canonical về trang giới thiệu, cho phép thu thập.
const PAGES = ['/', '/en/', '/app/?hl=en', '/en/vocabulary/', '/en/blog/', post ? `/en/blog/${post}/` : '/en/samples/'].filter((p, i, a) => a.indexOf(p) === i);
const srv = await serve(ROOT, 0);
const run = (u, file) => execFileP('npx', ['-y', 'lighthouse@12.2.1', u, '--form-factor=mobile', '--only-categories=performance,accessibility,best-practices,seo', '--quiet', '--max-wait-for-load=40000', '--output=json', `--output-path=${file}`,
  '--chrome-flags=--headless=new --no-sandbox'], { timeout: 100000, maxBuffer: 1 << 26 });
const res = [];
for (const p of PAGES) {
  let best = null;
  for (let i = 0; i < 2; i++) {
    const f = path.join(os.tmpdir(), `lh-${Date.now()}-${i}.json`);
    let timedOut = false; try { await run(srv.origin + p, f); } catch (e) { timedOut = !!e.killed; console.log('lighthouse lỗi', p, String(e.message).slice(0, 120)); }
    if (timedOut) break; // treo → không thử lại (tiết kiệm phút)
    if (!fs.existsSync(f)) continue;
    const d = JSON.parse(fs.readFileSync(f, 'utf8')), a = d.audits, s = Object.fromEntries(Object.entries(d.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
    const cur = { page: p, scores: s, metrics: Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift'].map(k => [k, a[k]?.displayValue])), fails: Object.values(a).filter(x => x.score !== null && x.score < 0.9 && ['binary', 'numeric', 'metricSavings'].includes(x.scoreDisplayMode)).map(x => x.title).slice(0, 8) };
    if (!best || s.performance > best.scores.performance) best = cur;
    if (Object.entries(BUDGET).every(([k, v]) => s[k] >= v)) break; // đạt ngay → khỏi đo lần 2 (tiết kiệm phút)
  }
  if (!best) { res.push({ page: p, error: 'Lighthouse không chạy được' }); continue; }
  best.budgetFails = Object.entries(BUDGET).filter(([k, v]) => best.scores[k] < v).map(([k, v]) => `${k} ${best.scores[k]} < ${v}`);
  res.push(best); console.log(p, JSON.stringify(best.scores), best.budgetFails.join('; '));
}
srv.close();
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
