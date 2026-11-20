#!/usr/bin/env node
// Icon RỖNG (P0 15/11): ô icon có nền nhưng không có hình (iPhone Safari – phông Material Symbols không ra ligature).
// Đo THẬT trên pixel, mọi engine: mỗi icon hiện trên màn (.material-symbols-* hoặc svg.i/.ms) chụp 2 lần – bình thường và khi ẩn riêng icon đó (visibility:hidden);
// hai ảnh GIỐNG HỆT = icon không vẽ gì = RỖNG. Thêm: tham chiếu <use href="#…"> phải trỏ tới symbol có path; chữ ligature không được còn trơ trong DOM.
// Dùng: node scripts/test/icon-blank.mjs <base> [--engine=chromium|webkit|both] [--strict] [--shots=thư-mục] [--max=40] [route…]
// Không --strict: chỉ đo/in (dùng để tái hiện lỗi trên bản live); có --strict: thoát 1 nếu có icon rỗng. Header CI (LEXKITE_CI_HEADER) được gắn nếu có → không tính vào thống kê.
import { chromium, webkit, devices } from 'playwright';
import fs from 'fs';
const A = process.argv.slice(2), flag = (k, d) => (A.find(a => a.startsWith('--' + k + '=')) || '').split('=')[1] ?? d;
const STRICT = A.includes('--strict'), engines = flag('engine', 'both') === 'both' ? ['webkit', 'chromium'] : [flag('engine', 'both')];
const SHOTS = flag('shots', ''), MAX = +flag('max', 40), rest = A.filter(a => !a.startsWith('--'));
const base = (rest[0] || 'http://localhost:8080').replace(/\/$/, ''), ROUTES = rest.length > 1 ? rest.slice(1) : ['today', 'vocab', 'skills', 'me'];
const HDR = process.env.LEXKITE_CI_HEADER ? { 'X-Lexkite-CI': process.env.LEXKITE_CI_HEADER.trim() } : {};
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const SEL = '[class*="material-symbols"], svg.i, svg.ms';
let bad = 0, total = 0;
for (const eng of engines) {
  const B = eng === 'webkit' ? webkit : chromium, dev = eng === 'webkit' ? devices['iPhone 14'] : devices['Pixel 7'];
  const br = await B.launch();
  for (const theme of ['dark', 'light']) for (const route of ROUTES) {
    const ctx = await br.newContext({ ...dev, colorScheme: theme, locale: 'vi-VN', extraHTTPHeaders: HDR });
    const pg = await ctx.newPage(), net = [];
    pg.on('response', r => { if (r.status() >= 400 && r.url().startsWith(base)) net.push(r.status() + ' ' + r.url().replace(base, '')); });
    await pg.addInitScript(() => { try { localStorage.setItem('lk.onb', '1'); localStorage.setItem('lk.theme', document.documentElement.dataset.theme || ''); } catch (e) { /* */ } });
    await pg.goto(`${base}/app/?hl=vi#/${route}`, { waitUntil: 'load', timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(4500);
    const info = await pg.evaluate(sel => {
      const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width >= 6 && r.height >= 6 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
      const els = [...document.querySelectorAll(sel)].filter(vis);
      els.forEach((e, i) => e.setAttribute('data-icb', i));
      const refs = [...document.querySelectorAll('svg use')].map(u => u.getAttribute('href') || u.getAttribute('xlink:href')).filter(h => h && h[0] === '#');
      const badRef = [...new Set(refs)].filter(h => { const n = document.getElementById(h.slice(1)); return !n || !n.querySelector('path,circle,rect,line,polyline,polygon,ellipse'); });
      const raw = els.filter(e => /material-symbols/.test(e.className) && !e.querySelector('svg') && (e.textContent || '').trim()).map(e => e.textContent.trim());
      return { n: els.length, badRef, raw: [...new Set(raw)], fonts: [...document.fonts].filter(f => /Material/.test(f.family)).map(f => f.family + ':' + f.status) };
    }, SEL);
    const blank = [];
    for (let i = 0; i < Math.min(info.n, MAX); i++) {
      const el = pg.locator(`[data-icb="${i}"]`);
      try {
        await el.scrollIntoViewIfNeeded({ timeout: 2000 });
        const a = await el.screenshot({ animations: 'disabled', timeout: 4000 });
        await el.evaluate(e => { e.dataset.icv = e.style.visibility; e.style.visibility = 'hidden'; });
        const b = await el.screenshot({ animations: 'disabled', timeout: 4000 });
        await el.evaluate(e => { e.style.visibility = e.dataset.icv || ''; });
        if (a.equals(b)) blank.push(await el.evaluate(e => (e.textContent || '').trim() || (e.querySelector('use') && e.querySelector('use').getAttribute('href')) || e.getAttribute('aria-label') || e.tagName));
      } catch (e) { /* phần tử biến mất giữa chừng – bỏ qua */ }
    }
    if (SHOTS) await pg.evaluate(() => scrollTo(0, 0)).then(() => pg.screenshot({ path: `${SHOTS}/${eng}-${theme}-${route}.png` })).catch(() => {});
    total++;
    const probs = []; if (blank.length) probs.push(`${blank.length} icon rỗng [${[...new Set(blank)].slice(0, 12).join(', ')}]`); if (info.badRef.length) probs.push(`symbol thiếu/rỗng: ${info.badRef.slice(0, 8).join(', ')}`);
    if (info.raw.length) probs.push(`${info.raw.length} icon còn là chữ ligature (chưa thành SVG): ${info.raw.slice(0, 8).join(', ')}`); if (net.length) probs.push('asset lỗi: ' + [...new Set(net)].slice(0, 6).join(', '));
    const tag = `[${eng} ${theme} #/${route}]`;
    if (!probs.length) console.log(`✓ ${tag} ${info.n} icon, không rỗng`);
    else { console.log(`${STRICT ? '✗' : '•'} ${tag} ${info.n} icon: ${probs.join(' · ')} · font ${info.fonts.join(' ') || '–'}`); if (STRICT) bad++; }
    await ctx.close();
  }
  await br.close();
}
if (bad) { console.error(`✗ icon-blank: ${bad}/${total} màn có icon rỗng/thiếu`); process.exit(1); }
console.log(`✓ icon-blank: ${total} màn (${engines.join('+')}), ${STRICT ? 'nghiêm ngặt' : 'chỉ đo'}`);
