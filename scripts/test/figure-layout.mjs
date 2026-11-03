// 📐 Cổng bố cục hình đề: vẽ MỌI đề Writing Task 1 (map/process/bar/line/pie/table – task1.js + write/task1-more*.js,
// cũng là hình dùng ở #/model và phòng thi #/mock) bằng Chromium thật ở 360 px & 1280 px × sáng/tối × font thật/font dự phòng,
// rồi dò chữ đè chữ, chữ vắt mép khối, phần tử tràn khung (bị cắt), khối chồng khối, chữ < 9 px, tương phản < 4,5:1.
// Baseline = 0 lỗi: có lỗi → thoát 1. Chỉ chạy trên CI (figure-layout.yml); báo cáo + ảnh ở figure-layout-report/.
// Dùng: node scripts/test/figure-layout.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
if (!process.env.CI) { console.error('figure-layout: chỉ chạy trên CI (Chromium) – dispatch figure-layout.yml'); process.exit(2); }
const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, 'fixtures/figure-layout.html')).href;
const OUT = 'figure-layout-report'; fs.mkdirSync(OUT, { recursive: true });
const VIEWS = [{ name: 'mobile360', width: 360, height: 780, isMobile: true }, { name: 'desktop1280', width: 1280, height: 900 }];
const browser = await chromium.launch();
const found = []; let figs = 0;
for (const v of VIEWS) for (const theme of ['light', 'dark']) for (const font of ['bvp', 'fallback']) {
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: !!v.isMobile, deviceScaleFactor: 1, colorScheme: theme });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(([th, f]) => { document.documentElement.dataset.theme = th; if (f === 'fallback') document.body.classList.add('fallback'); }, [theme, font]);
  await page.evaluate(() => document.fonts.ready);
  const n = await page.evaluate(() => window.renderAll());
  await page.evaluate(() => document.fonts.ready);
  const res = await page.evaluate(() => window.checkAll());
  if (font === 'bvp') for (const t of await page.evaluate(() => window.selfTest())) if (!t.ok) found.push({ tag: `${v.name}/${theme}`, fig: '(tự kiểm bộ dò)', issues: [{ kind: 'detector', detail: `hình lỗi cố ý loại "${t.kind}" không bị bắt (bắt được: ${t.got.join(', ') || 'không'})` }] });
  const tag = `${v.name}/${theme}/${font}`;
  if (errs.length) found.push({ tag, fig: '(trang)', issues: errs.map(m => ({ kind: 'js', detail: m })) });
  figs += n * 2;
  for (const r of res) {
    found.push({ tag, ...r });
    const el = await page.$(`[data-fig="${r.fig}"]`);
    if (el && found.length <= 60) await el.screenshot({ path: `${OUT}/${tag.replace(/\//g, '_')}_${r.fig.replace('@', '_')}.png` }).catch(() => {});
  }
  if (font === 'bvp') await page.screenshot({ path: `${OUT}/all_${v.name}_${theme}.png`, fullPage: true }).catch(() => {});
  await ctx.close();
}
await browser.close();
const total = found.reduce((a, f) => a + f.issues.length, 0);
const byKind = {}; found.forEach(f => f.issues.forEach(i => { byKind[i.kind] = (byKind[i.kind] || 0) + 1; }));
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({ figs, total, byKind, found }, null, 1));
const byTag = {}; found.forEach(f => { byTag[f.tag] = (byTag[f.tag] || 0) + f.issues.length; });
const md = [`# Bố cục hình đề – ${figs} lượt vẽ, ${total} lỗi`, '', Object.entries(byKind).map(([k, n]) => `- ${k}: ${n}`).join('\n'), '', Object.entries(byTag).map(([k, n]) => `- ${k}: ${n}`).join('\n'),
  '', ...found.map(f => `## ${f.fig} · ${f.tag}\n${f.issues.map(i => `- **${i.kind}** ${i.detail}`).join('\n')}`)].join('\n');
fs.writeFileSync(`${OUT}/report.md`, md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.slice(0, 60000) + '\n');
console.log(md.slice(0, 20000));
process.exit(total ? 1 : 0);
