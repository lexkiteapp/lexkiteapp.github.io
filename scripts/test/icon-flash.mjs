#!/usr/bin/env node
// Chữ ligature của phông icon (Material Symbols: "language", "arrow_forward"…) KHÔNG BAO GIỜ được hiện ra thành chữ thường (P1, 07/11: lộ ở E2E add-on, stitch-diff
// "chữ bị cắt", journey-matrix "phông icon không nạp được"). Đo trên dist thật qua mạng 4G chậm + CPU ×4: mỗi khung hình (rAF) tìm phần tử .material-symbols-*
// đang hiện mà RỘNG hơn 1,8× cỡ chữ (icon đã nạp = ô vuông ~1em; chữ thường "arrow_forward" = nhiều em) → ghi thời điểm đầu/cuối + số khung + chữ.
// Dùng: node scripts/test/icon-flash.mjs <base> [--strict] [route…]   (không --strict: chỉ đo/in; có: khung lộ chữ sau lần nạp icon đầu hoặc > MAX_MS → thoát 1)
import { chromium } from 'playwright';
const A = process.argv.slice(2), STRICT = A.includes('--strict'), rest = A.filter(a => !a.startsWith('--'));
const base = rest[0] || 'http://localhost:8080', ROUTES = rest.length > 1 ? rest.slice(1) : ['welcome', 'home', 'review', 'vocab', 'study', 'me'];
const MAX_MS = +(process.env.MAX_MS || 0);   // thời gian lộ chữ cho phép / route (ms); mặc định 0 = không khung nào
const b = await chromium.launch(); let bad = 0, total = 0;
for (const lang of ['en', 'vi']) for (const route of ROUTES) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage(), cdp = await ctx.newCDPSession(pg);
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await pg.addInitScript(() => {
    try { localStorage.setItem('lk.onb', '1'); } catch (e) { /* */ }
    const W = window; W.__ic = { frames: 0, bad: [], first: 0, loaded: 0 };
    const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && +s.opacity > 0.05 && s.display !== 'none'; };
    const tick = () => { const t = Math.round(performance.now()); W.__ic.frames++;
      for (const e of document.querySelectorAll('.material-symbols-outlined,.material-symbols-rounded')) {
        const txt = (e.textContent || '').trim(); if (!txt || !vis(e)) continue; if (!W.__ic.first) W.__ic.first = t;
        const r = e.getBoundingClientRect(), fs = parseFloat(getComputedStyle(e).fontSize) || 24;
        if (txt.length > 3 && r.width > fs * 1.8) { const k = txt; const o = W.__ic.bad.find(x => x.txt === k); if (o) { o.last = t; o.n++; } else W.__ic.bad.push({ txt: k, first: t, last: t, n: 1, w: Math.round(r.width), fs }); }
      }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    document.fonts && document.fonts.addEventListener('loadingdone', () => { W.__ic.loaded = Math.round(performance.now()); });
  });
  await pg.goto(`${base}/app/?hl=${lang}#/${route}`, { waitUntil: 'load', timeout: 60000 }).catch(() => {}); await pg.waitForTimeout(6000);
  const r = await pg.evaluate(() => window.__ic), ms = r.bad.reduce((m, x) => Math.max(m, x.last - x.first + 16), 0);
  total++; const tag = `[${lang} #/${route}]`;
  if (!r.bad.length) console.log(`✓ ${tag} không lộ chữ icon (icon đầu thấy ${r.first || '–'} ms, font xong ${r.loaded || '–'} ms, ${r.frames} khung)`);
  else { const msg = `${tag} lộ chữ icon: ${r.bad.slice(0, 6).map(x => `"${x.txt}" ${x.first}→${x.last} ms (${x.n} khung, rộng ${x.w}px vs ${x.fs}px)`).join('; ')} · font xong ${r.loaded || '–'} ms`;
    if (STRICT && ms > MAX_MS) { bad++; console.log('✗ ' + msg); } else console.log('• ' + msg); }
  await ctx.close();
}
await b.close();
if (bad) { console.error(`✗ icon-flash: ${bad}/${total} màn lộ chữ ligature`); process.exit(1); }
console.log(`✓ icon-flash: ${total} màn (en+vi), ${STRICT ? 'nghiêm ngặt' : 'chỉ đo'}`);
