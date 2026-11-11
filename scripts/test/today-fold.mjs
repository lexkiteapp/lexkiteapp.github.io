// 📱 Màn đầu Hôm nay ở 360×640 (docs/specs/upgrade-2026-11.md Đợt 1 #1 + #4) – chạy trên CI (frame-consistency.yml, dùng lại dist + playwright).
//   • Dải gọn chuỗi · XP · mục tiêu ([data-strip]) cao ≤ 48 px, mỗi ô là liên kết chạm ≥ 44 px, đủ 4 ô (mục tiêu điểm, chuỗi, XP, mục tiêu ngày).
//   • CTA chính ([data-cont]) nằm TRỌN trong màn đầu: đáy nút ≤ mép trên thanh tab dưới (#bnav / nav Stitch) – không phải cuộn mới thấy.
//   • % tiến độ: thẻ bài Hôm nay hiện "{p}%" khớp aria-valuenow của thanh tiến độ; thẻ bài hiện tại trong lộ trình (data-cur) hiện % chặng.
//   • Không giật bố cục: tổng layout-shift khi tải ≤ 0,02.
//   Người cũ (đã xong 3 bài → today) + người mới (0 XP → today-new) × sáng/tối.
// Dùng: node scripts/test/today-fold.mjs [--root dist]
import { chromium } from 'playwright';
import { serve } from '../quality/serve.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const srv = await serve(arg('root', 'dist'), 0), O = srv.origin.replace(/\/$/, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) bad++; };
const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const who of ['old', 'new']) {
  const tag = `${who}/${theme}`;
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'en-US', serviceWorkers: 'block', colorScheme: theme });
  await ctx.addInitScript(([th, fresh]) => { try {
    // cùng hạt giống stitch-diff: vỏ Stitch 5 tab (cờ từ /api/config, hermetic = rỗng), đã qua chào mừng; người cũ = đã xong 3 bài lộ trình
    localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.onb', '1'); localStorage.setItem('sbx.settings', JSON.stringify({ onboarded: true, theme: th, exam: 'ielts', examTarget: '7.5' }));
    if (!fresh) { localStorage.setItem('lk.lsn.path', '3'); localStorage.setItem('lk.ux1.st', JSON.stringify({ 0: 3, 1: 3, 2: 2 })); }
    window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) { /* trang lỗi */ } }, [theme, who === 'new']);
  const page = await ctx.newPage();
  await page.goto(`${O}/app/?sandbox=1&hl=en#/home`, { waitUntil: 'load', timeout: 90000 });
  const root = who === 'old' ? '.v2-today' : '.v2-today-new';
  try { await page.waitForSelector(`${root} [data-cont]`, { timeout: 30000 }); } catch { ok(false, `${tag}: không thấy ${root} [data-cont] (${await page.evaluate(() => location.hash + ' · ' + document.body.className + ' · ' + ((document.querySelector('#view > *') || {}).className || '-')).catch(e => e.message)})`); await ctx.close(); continue; }
  await sleep(1500); // ảnh giáo viên + CSS lười xong
  const m = await page.evaluate(root => {
    const R = el => { const r = el.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), h: Math.round(r.height), w: Math.round(r.width) }; };
    const vis = el => el && el.getBoundingClientRect().height > 0 && getComputedStyle(el).display !== 'none';
    const s = document.querySelector(`${root} [data-strip]`), cta = document.querySelector(`${root} [data-cont]`);
    const navs = [...document.querySelectorAll('#bnav, .v2 > nav, nav.fixed')].filter(vis).map(n => n.getBoundingClientRect().top);
    const fold = Math.min(innerHeight, ...navs);
    const bar = cta && cta.closest('section') && cta.closest('section').querySelector('[role="progressbar"]');
    return { strip: s ? R(s) : null, tiles: s ? [...s.children].map(a => ({ tag: a.tagName, href: a.getAttribute('href'), ...R(a) })) : [], cta: cta ? R(cta) : null, fold: Math.round(fold), scrollY: scrollY,
      bar: bar ? { now: bar.getAttribute('aria-valuenow'), txt: (bar.parentElement.nextElementSibling || {}).textContent } : null,
      pxExp: (document.querySelector(`${root} [data-act="pathx"]`) || { getAttribute: () => null }).getAttribute('aria-expanded'), cls: window.__cls };
  }, root);
  ok(m.strip && m.strip.h <= 48, `${tag}: dải chuỗi·XP·mục tiêu gọn (cao ${m.strip && m.strip.h} ≤ 48 px)`);
  ok(m.tiles.length === 4 && m.tiles.every(x => x.tag === 'A' && x.href && x.h >= 44 && x.w >= 44), `${tag}: 4 ô của dải là liên kết, vùng chạm ≥ 44 px (${m.tiles.map(x => x.w + '×' + x.h).join(', ')})`);
  ok(m.cta && m.scrollY === 0 && m.cta.t >= 0 && m.cta.b <= m.fold, `${tag}: CTA chính trong màn đầu 360×640 (đáy ${m.cta && m.cta.b} ≤ ${m.fold})`);
  ok(m.cls <= 0.02, `${tag}: không giật bố cục (CLS ${m.cls.toFixed(3)} ≤ 0,02)`);
  if (who === 'old') {
    ok(m.bar && m.bar.txt && m.bar.txt.trim() === m.bar.now + '%', `${tag}: thẻ bài Hôm nay hiện % tiến độ khớp thanh (${m.bar && m.bar.txt} / ${m.bar && m.bar.now})`);
    // Khối "Your path" thu gọn (3 nút như mẫu) → mở TẠI CHỖ bằng bàn phím (Enter trên nút thật, aria-expanded) → lộ trình đầy đủ + % chặng
    const px = `${root} [data-act="pathx"]`;
    ok(m.pxExp === 'false', `${tag}: khối Lộ trình thu gọn mặc định (aria-expanded=${m.pxExp})`);
    await page.focus(px); await page.keyboard.press('Enter'); await sleep(400);
    const x = await page.evaluate(([root, px]) => { const cur = document.querySelector(`${root} [data-pathfull] [data-cur]`), card = cur && cur.closest('div.w-full.flex-col');
      return { exp: document.querySelector(px).getAttribute('aria-expanded'), curPct: card ? (card.querySelector('span.tabular-nums') || {}).textContent : null, cls: window.__cls }; }, [root, px]);
    ok(x.exp === 'true', `${tag}: Enter mở lộ trình đầy đủ tại chỗ (aria-expanded=${x.exp})`);
    ok(x.curPct && /^\d{1,3}%$/.test(x.curPct.trim()), `${tag}: thẻ bài hiện tại trong lộ trình hiện % (${x.curPct})`);
  }
  await ctx.close();
}
await browser.close(); srv.close && srv.close();
if (bad) { console.error(`✗ today-fold: ${bad} lỗi`); process.exit(1); }
console.log('✓ today-fold: màn đầu Hôm nay 360×640 đạt');
