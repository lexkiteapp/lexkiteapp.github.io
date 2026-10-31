// 🎯 Cổng "bám mẫu Stitch" cho TRANG WEB TĨNH (lexkite.com): vẽ mẫu Stitch v2.1 (brand/stitch/web/<trang>-light|dark.html) và trang build thật (dist/)
//   ở 1280 px (máy tính) + 390 px (điện thoại), sáng/tối, TẮT hoạt ảnh → so SSIM ảnh xám + "nhịp hàng"; cùng lượt: axe WCAG 2.2 AA (tương phản 4.5/3…),
//   chạm ≥ 44 px, không cuộn ngang ở 390, CLS ≤ 0.1, không ảnh vỡ/ngoài, không ô giữ chỗ giáo viên. Xuất tờ "Stitch | tối | sáng" cho chủ duyệt.
// Ngưỡng: scripts/test/stitch-web-diff.json – CHỈ được nâng (như stitch-diff.json). Trang chưa có ngưỡng = chỉ báo cáo.
// Dùng: node scripts/test/stitch-web-diff.mjs [dist] [out/stitch-web]   (CI: .github/workflows/stitch-web.yml; cần playwright + pngjs + axe-core + imagemagick)
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';
import { chromium } from 'playwright'; import { PNG } from 'pngjs';
const [ROOT = 'dist', OUT = 'out/stitch-web'] = process.argv.slice(2); fs.mkdirSync(path.join(OUT, 'png'), { recursive: true });
const SRC = 'brand/stitch/web', LIM = fs.existsSync('scripts/test/stitch-web-diff.json') ? JSON.parse(fs.readFileSync('scripts/test/stitch-web-diff.json', 'utf8')) : {};
const AXE = createRequire(path.resolve('package.json')).resolve('axe-core/axe.min.js');
// trang → URL đại diện của mẫu (mẫu phủ nhiều trang: hub = blog index + chỉ mục speaking/samples)
export const PAGES = { home: '/en/', sample: '/en/samples/p27', speaking: '/en/speaking/thoi-tiet-cac-mua', post: '/en/blog/academic-word-list/', hub: '/en/blog/' };
const VPS = { desk: { width: 1280, height: 900 }, phone: { width: 390, height: 844 } }, CAP = 6000; // chụp tối đa 6000 px chiều cao (đủ toàn trang mẫu)
const STILL = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';

// ---- máy chủ tĩnh cho dist/ (đường dẫn không đuôi → .html / index.html như Cloudflare Pages) ----
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.xml': 'application/xml' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const c = [u, u + '.html', path.join(u, 'index.html')].map(x => path.join(ROOT, x)).find(f => fs.existsSync(f) && fs.statSync(f).isFile());
  if (!c) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(c)] || 'application/octet-stream' }); fs.createReadStream(c).pipe(r); });
await new Promise(ok => srv.listen(0, ok)); const BASE = `http://127.0.0.1:${srv.address().port}`;

// ---- ảnh xám thu nhỏ + SSIM (cửa sổ 8, bước 4) + tương quan nhịp hàng ----
const GW = 256;
function gray(buf) { const p = PNG.sync.read(buf), s = GW / p.width, h = Math.round(p.height * s), g = new Float32Array(GW * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < GW; x++) { const sx = Math.min(p.width - 1, Math.floor(x / s)), sy = Math.min(p.height - 1, Math.floor(y / s)), i = (sy * p.width + sx) * 4; g[y * GW + x] = .299 * p.data[i] + .587 * p.data[i + 1] + .114 * p.data[i + 2]; }
  return { g, h }; }
function ssim(A, B, h) { const C1 = 6.5025, C2 = 58.5225, n = 8; let s = 0, k = 0;
  for (let y = 0; y + n <= h; y += 4) for (let x = 0; x + n <= GW; x += 4) { let ma = 0, mb = 0; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { ma += A[(y + j) * GW + x + i]; mb += B[(y + j) * GW + x + i]; } ma /= 64; mb /= 64;
    let va = 0, vb = 0, cv = 0; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = A[(y + j) * GW + x + i] - ma, b = B[(y + j) * GW + x + i] - mb; va += a * a; vb += b * b; cv += a * b; } va /= 63; vb /= 63; cv /= 63;
    s += ((2 * ma * mb + C1) * (2 * cv + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2)); k++; } return k ? s / k : 0; }
function rows(A, B, h) { const prof = G => { const o = []; for (let y = 0; y < h; y++) { let m = 0, v = 0; for (let x = 0; x < GW; x++) m += G[y * GW + x]; m /= GW; for (let x = 0; x < GW; x++) v += (G[y * GW + x] - m) ** 2; o.push(Math.sqrt(v / GW)); } return o; };
  const a = prof(A), b = prof(B), ma = a.reduce((s, x) => s + x, 0) / h, mb = b.reduce((s, x) => s + x, 0) / h; let n = 0, da = 0, db = 0;
  for (let i = 0; i < h; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return da && db ? n / Math.sqrt(da * db) : 0; }

// ---- kiểm trên trang thật ----
const AUDIT = () => { const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const small = [...document.querySelectorAll('a[href],button,input,select,summary,[role=button]')].filter(e => vis(e) && !e.closest('p,li>p,.prose,article p,[data-inline]')).filter(e => { const r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44; })
    .filter(e => !(e.tagName === 'A' && getComputedStyle(e).display === 'inline')).map(e => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 24));
  const imgs = [...document.images].filter(i => i.complete && !i.naturalWidth && i.loading !== 'lazy').map(i => i.getAttribute('src')), ext = [...document.querySelectorAll('img[src^="http"]')].filter(i => !/^https?:\/\/(lexkite\.com|127\.0\.0\.1)/.test(i.src)).map(i => i.src);
  return { small: small.slice(0, 12), nSmall: small.length, broken: imgs, ext, hscroll: document.documentElement.scrollWidth > innerWidth + 1, ph: /TEACHER SLOT|\[teacher\]|placeholder/i.test(document.body.innerText), v2: !!document.querySelector('[class^="v2s-web-"]') }; };

const browser = await chromium.launch(), res = {}, bad = [], sheets = [];
async function shot(url, vp, scheme, file) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, reducedMotion: 'reduce', colorScheme: scheme }), page = await ctx.newPage();
  await page.addInitScript(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => /fonts\.(googleapis|gstatic)\.com|cdn\.tailwindcss\.com/.test(r.request().url()) && url.startsWith('file:') ? r.continue() : r.abort()); // mẫu Stitch cần CDN của nó; trang thật: 0 request ra ngoài
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {}); await page.addStyleTag({ content: STILL }).catch(() => {}); await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {}); await page.waitForTimeout(400);
  const h = Math.min(CAP, await page.evaluate(() => document.documentElement.scrollHeight)); await page.setViewportSize({ width: vp.width, height: h }); await page.waitForTimeout(200);
  const buf = await page.screenshot({ fullPage: false }); fs.writeFileSync(file, buf);
  let audit = null; if (!url.startsWith('file:')) { await page.setViewportSize(vp); audit = await page.evaluate(AUDIT); audit.cls = +(await page.evaluate(() => window.__cls)).toFixed(3);
    await page.addScriptTag({ path: AXE }); audit.axe = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.slice(0, 3).map(x => x.target.join(' ')) }))); }
  await ctx.close(); return { buf, audit }; }

for (const [k, u] of Object.entries(PAGES)) for (const [v, vp] of Object.entries(VPS)) { const row = [];
  for (const sc of ['dark', 'light']) { const tag = `${k}-${v}-${sc}`, ref = path.resolve(SRC, `${k}-${sc}.html`); if (!fs.existsSync(ref)) continue;
    const S = await shot('file://' + ref, vp, sc, path.join(OUT, 'png', `${tag}-stitch.png`)), A = await shot(BASE + u, vp, sc, path.join(OUT, 'png', `${tag}-site.png`));
    const gs = gray(S.buf), ga = gray(A.buf), h = Math.min(gs.h, ga.h), au = A.audit;
    const r = res[tag] = { ssim: +ssim(gs.g, ga.g, h).toFixed(3), rows: +rows(gs.g, ga.g, h).toFixed(3), hRatio: +(ga.h / gs.h).toFixed(2), ported: au.v2, cls: au.cls, axe: au.axe, small: au.nSmall, hscroll: au.hscroll };
    const serious = au.axe.filter(x => x.impact === 'serious' || x.impact === 'critical');
    if (au.v2) { // cổng cứng chỉ cho trang ĐÃ port (có khung .v2s-web-*); trang cũ chỉ báo cáo
      if (serious.length) bad.push(`${tag}: axe AA ${serious.map(x => `${x.id}×${x.n}`).join(', ')}`);
      if (au.nSmall) bad.push(`${tag}: ${au.nSmall} vùng chạm < 44 px (${au.small.join(' | ')})`);
      if (v === 'phone' && au.hscroll) bad.push(`${tag}: cuộn ngang ở 390 px`);
      if (au.cls > 0.1) bad.push(`${tag}: CLS ${au.cls} > 0.1`);
      if (au.broken.length || au.ext.length) bad.push(`${tag}: ảnh vỡ/ngoài ${[...au.broken, ...au.ext].slice(0, 3).join(' ')}`);
      if (au.ph) bad.push(`${tag}: còn chữ giữ chỗ giáo viên/placeholder`); }
    const l = LIM[tag]; if (l) { if (!au.v2) bad.push(`${tag}: có ngưỡng nhưng trang chưa dùng khung Stitch`); for (const m of ['ssim', 'rows']) if (l[m] != null && r[m] < l[m]) bad.push(`${tag} ${m} ${r[m]} < ${l[m]}`); }
    row.push(path.join(OUT, 'png', `${tag}-stitch.png`), path.join(OUT, 'png', `${tag}-site.png`)); }
  // tờ duyệt: Stitch tối | trang tối | Stitch sáng | trang sáng (thu nhỏ, cắt 4000 px đầu)
  if (row.length) { const o = path.join(OUT, `sheet-${k}-${v}.jpg`); try { execFileSync('convert', [...row.map(f => `${f}[0]`), '-crop', `x${v === 'desk' ? 4000 : 3000}+0+0`, '+repage', '-resize', `x${v === 'desk' ? 1600 : 1400}`, '-background', '#888', '-splice', '8x0', '+append', '-quality', '62', o]); sheets.push(o); } catch (e) { console.warn('sheet', k, v, e.message); } } }
await browser.close(); srv.close();

fs.writeFileSync(path.join(OUT, 'scores.json'), JSON.stringify(res, null, 1));
const md = ['## Stitch web diff', '| trang | port | SSIM | nhịp hàng | cao/mẫu | CLS | axe nghiêm trọng | <44px |', '|---|---|---|---|---|---|---|---|',
  ...Object.entries(res).map(([t, r]) => `| ${t} | ${r.ported ? '✓' : '–'} | ${r.ssim} | ${r.rows} | ${r.hRatio} | ${r.cls} | ${r.axe.filter(x => /serious|critical/.test(x.impact)).map(x => x.id).join(',') || 0} | ${r.small} |`), '', bad.length ? '### ✗\n- ' + bad.join('\n- ') : '### ✓ đạt'];
fs.writeFileSync(path.join(OUT, 'SUMMARY.md'), md.join('\n') + '\n'); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n');
console.log(md.join('\n'));
if (bad.length) { console.error('✗ stitch-web-diff'); process.exit(1); }
