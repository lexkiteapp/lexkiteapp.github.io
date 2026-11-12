// 🌍 Mốc Duolingo công khai cho bảng World: Lighthouse trang chủ duolingo.com, TỐI ĐA 1 lần/tuần, ≤ 3 request trang
// (robots.txt + 1 lượt tải trang; Lighthouse tự đọc robots.txt cho mục SEO). Không đăng nhập, không cào nội dung, tôn trọng robots.txt.
// Ghi reports/world/duolingo-lh.json (cùng dạng reports/lighthouse.json). CHỈ chạy trên CI (workflow world-scorecard.yml).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { robotsAllows } from '../world-scorecard.mjs';

const URL_ = 'https://www.duolingo.com/', OUT = 'reports/world/duolingo-lh.json', UA = 'LexkiteWorldScorecard/1.0 (+https://lexkite.com; weekly Lighthouse, 1 page)';
if (!process.env.CI) { console.error('chỉ chạy trên CI'); process.exit(75); }
const prev = (() => { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { return null; } })();
const write = o => { fs.mkdirSync('reports/world', { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(o, null, 1) + '\n'); console.log(JSON.stringify(o.scores || o)); };
if (prev && prev.at && Date.now() - Date.parse(prev.at) < 6 * 864e5 && !process.env.FORCE) { console.log('đã đo < 6 ngày trước → bỏ qua (1 lần/tuần)'); process.exit(0); }
const rb = await fetch(new URL('/robots.txt', URL_), { headers: { 'User-Agent': UA } }).then(r => r.ok ? r.text() : '').catch(() => null);
if (rb == null) { write({ at: new Date().toISOString(), url: URL_, skipped: 'không đọc được robots.txt', scores: prev && prev.scores }); process.exit(0); }
if (!robotsAllows(rb, '/')) { write({ at: new Date().toISOString(), url: URL_, skipped: 'robots.txt chặn /' }); process.exit(0); }
try {
  execFileSync('npx', ['-y', 'lighthouse@12.2.1', URL_, '--form-factor=mobile', '--only-categories=performance,accessibility,best-practices,seo', '--max-wait-for-load=45000',
    '--chrome-flags=--headless=new --no-sandbox', '--output=json', '--output-path=/tmp/duo-lh.json', '--quiet'], { stdio: 'inherit', timeout: 300000 });
} catch (e) { console.error('lighthouse lỗi: ' + e.message); }
let d; try { d = JSON.parse(fs.readFileSync('/tmp/duo-lh.json', 'utf8')); } catch { write({ at: new Date().toISOString(), url: URL_, skipped: 'Lighthouse không ra kết quả', scores: prev && prev.scores }); process.exit(0); }
const a = d.audits, c = d.categories;
write({ url: d.finalDisplayedUrl, at: d.fetchTime, scores: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.score == null ? null : Math.round(v.score * 100)])),
  metrics: Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'].map(k => [k, a[k] && a[k].displayValue])) });
