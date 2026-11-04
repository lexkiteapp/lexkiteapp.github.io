// Ảnh trước/sau trang từ /<lang>/words/<slug> (docs/specs/seo-words-depth.md §6) – chạy trên CI (visual-qa.yml, input seo_words), không chạy trên máy.
// Dùng: node scripts/test/seo-words-shots.mjs <thư mục có before/ after/> "en/words/detect,vi/words/detect" <thư mục ảnh>
// Mỗi trang × {trước, sau} × {390 sáng, 390 tối, 1280 sáng}, cả trang; kèm số chữ bài viết + CLS đo được (phải = 0).
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
import { chromium } from 'playwright';
import { noProd } from './lib/no-prod.mjs';
const [root, list, out] = process.argv.slice(2);
const pages = String(list || '').split(',').map(s => s.trim().replace(/^\/+|\/+$/g, '')).filter(Boolean);
if (!root || !pages.length || !out) { console.error('dùng: seo-words-shots.mjs <root> "en/words/detect,…" <out>'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const serve = dir => new Promise(res => { const s = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); let f = path.join(dir, p); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); else if (!path.extname(f)) f += '.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, () => res(s)); });
const browser = await chromium.launch();
const report = [];
let bad = 0;
for (const side of ['before', 'after']) {
  const dir = path.join(root, side); if (!fs.existsSync(dir)) { console.log(`⚠ thiếu ${dir}`); continue; }
  const srv = await serve(dir), base = `http://127.0.0.1:${srv.address().port}/`;
  for (const p of pages) for (const [w, h, scheme] of [[390, 844, 'light'], [390, 844, 'dark'], [1280, 900, 'light']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 1 });
    await noProd(ctx); // CI: media/audio → GitHub, /api → offline (0 lượt prod)
    const pg = await ctx.newPage();
    await pg.addInitScript(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
    const r = await pg.goto(base + p, { waitUntil: 'load' });
    await pg.waitForTimeout(400);
    const m = await pg.evaluate(() => { const a = document.querySelector('article'); return { words: a ? a.innerText.split(/\s+/).filter(Boolean).length : 0, blocks: document.querySelectorAll('section[data-d]').length, cls: window.__cls, overflow: document.documentElement.scrollWidth > innerWidth + 1, robots: (document.querySelector('meta[name=robots]') || {}).content || 'index' }; });
    const name = `${p.replace(/\//g, '_')}-${side}-${w}-${scheme}.png`;
    await pg.screenshot({ path: path.join(out, name), fullPage: true });
    report.push({ page: p, side, w, scheme, status: r && r.status(), ...m, shot: name });
    if (side === 'after' && (m.cls > 0 || m.overflow || !r || r.status() !== 200)) { bad++; console.log(`✗ ${p} ${w} ${scheme}: CLS ${m.cls} · tràn ngang ${m.overflow} · HTTP ${r && r.status()}`); }
    await ctx.close();
  }
  srv.close();
}
await browser.close();
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1));
for (const p of pages) { const b = report.find(x => x.page === p && x.side === 'before' && x.w === 390 && x.scheme === 'light'), a = report.find(x => x.page === p && x.side === 'after' && x.w === 390 && x.scheme === 'light'); console.log(`· ${p}: chữ ${b ? b.words : '–'} → ${a ? a.words : '–'} · khối ${b ? b.blocks : '–'} → ${a ? a.blocks : '–'} · ${a ? a.robots : ''}`); }
if (!report.some(x => x.side === 'after')) { console.error('✗ 0 ảnh "sau" – dừng'); process.exit(1); }
process.exit(bad ? 1 : 0);
