// CLS của trang giới thiệu (landing) + mẫu blog: đo layout-shift thật bằng Playwright, FAIL nếu > 0,1 (mục tiêu ≤ 0,05).
// Chờ ~2 s sau load để bắt cả nút "Thêm vào Chrome" (js/ext-cta.js bỏ hidden sau ~0,9 s) và dải gợi ý ngôn ngữ.
// Chạy trong quality-sweep (cần playwright; không nằm trong npm test). Dùng: node scripts/test/landing-cls.mjs [thư-mục=dist] [--lang ar,en]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from '../quality/serve.mjs';
const ROOT = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'dist');
const li = process.argv.indexOf('--lang');
const ALL = 'vi en es pt fr de id th zh ja ko hi ar ru tr'.split(' ');
const LANGS = li > 0 ? process.argv[li + 1].split(',') : ALL;
const LIMIT = 0.1, GOAL = 0.05;
const pages = LANGS.map(l => l === 'vi' ? '/' : `/${l}/`);
for (const l of LANGS.slice(0, 2)) { // mẫu blog: bài đầu tiên của mỗi ngôn ngữ
  const d = path.join(ROOT, l, 'blog');
  try { const a = fs.readdirSync(d, { withFileTypes: true }).filter(e => e.isDirectory() && fs.existsSync(path.join(d, e.name, 'index.html')))[0]; if (a) pages.push(`/${l}/blog/${a.name}/`); } catch { /* không có blog */ }
}
const srv = await serve(ROOT, 0), browser = await chromium.launch();
let bad = 0;
for (const vp of [{ n: 'desktop', width: 1280, height: 800 }, { n: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true }]) {
  for (const p of pages) {
    const lang = (p.match(/^\/([a-z]{2})\//) || [, 'vi'])[1];
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, locale: lang === 'vi' ? 'vi-VN' : lang });
    await ctx.addInitScript(() => {
      window.__cls = 0; window.__src = [];
      try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__src.push(e.value.toFixed(3) + ' ' + ((e.sources || []).map(s => s.node && ((s.node.nodeName || '') + '.' + (s.node.id || s.node.className || ''))).filter(Boolean).join('|').slice(0, 80))); } }).observe({ type: 'layout-shift', buffered: true }); } catch { /* */ }
    });
    await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.origin === srv.origin) return r.continue(); return r.fulfill({ status: 200, contentType: 'text/plain', body: '' }); });
    const pg = await ctx.newPage();
    await pg.goto(srv.origin + p, { waitUntil: 'load' });
    await pg.waitForTimeout(2000);
    await pg.mouse.wheel(0, 1500).catch(() => {}); await pg.waitForTimeout(500);
    const cls = await pg.evaluate(() => window.__cls), src = await pg.evaluate(() => window.__src);
    const ok = cls <= LIMIT;
    console.log(`${ok ? (cls <= GOAL ? '✓' : '~') : '✗'} ${vp.n} ${p} CLS ${cls.toFixed(3)}${cls > GOAL ? ' ← ' + src.slice(0, 3).join(' ; ') : ''}`);
    if (!ok) bad++;
    await ctx.close();
  }
}
await browser.close(); srv.close();
if (bad) { console.error(`✗ landing-cls: ${bad} trang có CLS > ${LIMIT}`); process.exit(1); }
console.log('✓ landing-cls: CLS ≤ ' + LIMIT + ' trên mọi trang đo');
