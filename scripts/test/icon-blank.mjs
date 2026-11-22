#!/usr/bin/env node
// Icon RỖNG (P0 15/11): ô icon có nền nhưng không có hình (iPhone Safari – phông Material Symbols không ra ligature).
// Đo THẬT trên pixel, mọi engine: mỗi icon hiện trên màn (.material-symbols-* hoặc svg.i/.ms) chụp 2 lần – bình thường và khi ẩn riêng icon đó (visibility:hidden);
// hai ảnh GIỐNG HỆT = icon không vẽ gì = RỖNG. Thêm: tham chiếu <use href="#…"> phải trỏ tới symbol có path; chữ ligature không được còn trơ trong DOM.
// Đo CẢ HAI giao diện: v1 và v2 Stitch (cờ ux1 – admin/beta thấy v2; 21/11 chủ thấy ô trống trên v2 trong khi cổng chỉ đo v1 → mù). --ui=v1|v2|both (mặc định both).
// Dùng: node scripts/test/icon-blank.mjs <base> [--engine=chromium|webkit|both] [--ui=both] [--strict] [--shots=thư-mục] [--max=40] [route…]
// Không --strict: chỉ đo/in (dùng để tái hiện lỗi trên bản live); có --strict: thoát 1 nếu có icon rỗng. Header CI (LEXKITE_CI_HEADER) được gắn nếu có → không tính vào thống kê.
import { chromium, webkit, devices } from 'playwright';
import fs from 'fs';
const A = process.argv.slice(2), flag = (k, d) => (A.find(a => a.startsWith('--' + k + '=')) || '').split('=')[1] ?? d;
const STRICT = A.includes('--strict'), engines = flag('engine', 'both') === 'both' ? ['webkit', 'chromium'] : [flag('engine', 'both')];
const UIS = flag('ui', 'both') === 'both' ? ['v1', 'v2'] : [flag('ui', 'both')];
const IDLE = +flag('idle', 0); // giây để yên sau ảnh đầu rồi chụp lại (bắt icon tự mất theo thời gian, vd. vẽ lại/nạp lười làm mất hình)
const SHOTS = flag('shots', ''), MAX = +flag('max', 40), rest = A.filter(a => !a.startsWith('--'));
const base = (rest[0] || 'http://localhost:8080').replace(/\/$/, ''), ROUTES = rest.length > 1 ? rest.slice(1) : ['today', 'vocab', 'skills', 'me'];
const HDR = process.env.LEXKITE_CI_HEADER ? { 'X-Lexkite-CI': process.env.LEXKITE_CI_HEADER.trim() } : {};
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const SEL = '[class*="material-symbols"], svg.i, svg.ms';
let bad = 0, total = 0;
for (const eng of engines) {
  const B = eng === 'webkit' ? webkit : chromium, dev = eng === 'webkit' ? devices['iPhone 14'] : devices['Pixel 7'];
  const br = await B.launch();
  for (const ui of UIS) for (const theme of ['dark', 'light']) for (const route of ROUTES) {
    const ctx = await br.newContext({ ...dev, colorScheme: theme, locale: 'vi-VN', extraHTTPHeaders: HDR });
    const pg = await ctx.newPage(), net = [];
    pg.on('response', r => { if (r.status() >= 400 && r.url().startsWith(base)) net.push(r.status() + ' ' + r.url().replace(base, '')); });
    await pg.addInitScript(UI => { try { localStorage.setItem('lk.onb', '1'); localStorage.setItem('lk.ux1', UI === 'v2' ? '1' : '0'); localStorage.setItem('lk.theme', document.documentElement.dataset.theme || ''); } catch (e) { /* */ } }, ui);
    await pg.goto(`${base}/app/?hl=vi#/${route}`, { waitUntil: 'load', timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(4500);
    const info = await pg.evaluate(sel => {
      // hộp còn thấy sau khi tổ tiên overflow hidden/clip cắt (vùng cuộn được thì không tính) (vd. khối "Kế hoạch hôm nay" thu gọn): < 50 % = người dùng không thấy → không đo (tránh báo rỗng giả)
      const shown = e => { const r = e.getBoundingClientRect(); let l = r.left, t = r.top, R = r.right, B = r.bottom; for (let p = e.parentElement; p && p !== document.documentElement; p = p.parentElement) { const s = getComputedStyle(p); if (+s.opacity <= 0.05) return 0; if (/hidden|clip/.test(s.overflowX + s.overflowY)) { const q = p.getBoundingClientRect(); l = Math.max(l, q.left); t = Math.max(t, q.top); R = Math.min(R, q.right); B = Math.min(B, q.bottom); } } return Math.max(0, R - l) * Math.max(0, B - t) / Math.max(1, r.width * r.height); };
      const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width >= 6 && r.height >= 6 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 && shown(e) >= 0.5; };
      const els = [...document.querySelectorAll(sel)].filter(vis);
      els.forEach((e, i) => e.setAttribute('data-icb', i));
      const refs = [...document.querySelectorAll('svg use')].map(u => u.getAttribute('href') || u.getAttribute('xlink:href')).filter(h => h && h[0] === '#');
      const badRef = [...new Set(refs)].filter(h => { const n = document.getElementById(h.slice(1)); return !n || !n.querySelector('path,circle,rect,line,polyline,polygon,ellipse'); });
      const raw = els.filter(e => /material-symbols/.test(e.className) && !e.querySelector('svg') && (e.textContent || '').trim()).map(e => e.textContent.trim());
      return { n: els.length, badRef, raw: [...new Set(raw)], fonts: [...document.fonts].filter(f => /Material/.test(f.family)).map(f => f.family + ':' + f.status) };
    }, SEL);
    if (SHOTS) await pg.screenshot({ path: `${SHOTS}/${eng}-${ui}-${theme}-${route}-0.png` }).catch(() => {}); // ảnh TRƯỚC vòng đo (đúng thứ người dùng thấy)
    if (IDLE) { await pg.waitForTimeout(IDLE * 1000); if (SHOTS) await pg.screenshot({ path: `${SHOTS}/${eng}-${ui}-${theme}-${route}-idle.png` }).catch(() => {}); }
    const blank = [], skipped = [], skippedWhy = [];
    // 21/11: ảnh thứ hai quá hạn (runner chậm, 4 tiến trình song song) → nhảy catch mà KHÔNG trả visibility → icon bị ẩn luôn + icon đó không được đo (cổng mù im lặng).
    // Giờ: trả visibility trong finally; quá hạn thì thử lại 1 lần (hạn 15 s); icon vẫn không đo được (mà còn trong DOM) bị đếm – quá 10 % → đỏ khi --strict.
    // 22/11: element.screenshot quá hạn ở MỌI icon trên CI (chờ "ổn định/hiển thị" của Playwright không bao giờ xong – bản cũ nuốt lỗi nên cổng mù từ trước).
    // Chụp theo KHUNG: cuộn icon vào giữa màn, lấy hộp thật, page.screenshot({ clip }) – cùng điểm ảnh, không qua bước chờ thao tác.
    const shot = (clip, ms) => pg.screenshot({ clip, animations: 'disabled', timeout: ms });
    const measure = async (el, ms) => {
      const box = await el.evaluate(e => { e.scrollIntoView({ block: 'center', inline: 'center' }); const r = e.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { x: r.left, y: r.top, width: r.width, height: r.height, covered: !!h && h !== e && !e.contains(h) && !h.contains(e) }; });
      if (!box || box.width < 2 || box.height < 2) return null;
      if (box.covered) return 'covered'; // tâm icon thuộc phần tử khác (khối thu gọn bị vẽ đè, lớp phủ) → người dùng không thấy → không đo
      const clip = { x: Math.max(0, Math.floor(box.x)), y: Math.max(0, Math.floor(box.y)), width: Math.ceil(box.width) + 1, height: Math.ceil(box.height) + 1 };
      await el.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.waitForTimeout(60); // khung vẽ xong sau cuộn (content-visibility:auto)
      const a = await shot(clip, ms);
      await el.evaluate(e => { e.dataset.icv = e.style.visibility; e.style.visibility = 'hidden'; });
      try { return a.equals(await shot(clip, ms)); } finally { await el.evaluate(e => { e.style.visibility = e.dataset.icv || ''; delete e.dataset.icv; }).catch(() => {}); }
    };
    for (let i = 0; i < Math.min(info.n, MAX); i++) {
      const el = pg.locator(`[data-icb="${i}"]`);
      let same = null;
      for (const ms of [4000, 15000]) { try { same = await measure(el, ms); break; } catch (e) { if (ms === 15000) skippedWhy.push(String(e.message).split('\n')[0].slice(0, 90)); } }
      if (same === null) { if (await el.count().catch(() => 0)) skipped.push(i); continue; } // biến mất giữa chừng (vẽ lại) = không tính
      if (same === 'covered') continue;
      if (same) { await pg.waitForTimeout(500); same = (await measure(el, 15000).catch(() => true)) === true; } // xác nhận: rỗng phải còn rỗng sau 500 ms (vùng chưa kịp vẽ sau cuộn ≠ icon rỗng)
      if (same) blank.push(await el.evaluate(e => (e.textContent || '').trim() || (e.querySelector('use') && e.querySelector('use').getAttribute('href')) || e.getAttribute('aria-label') || e.tagName));
    }
    if (SHOTS) await pg.evaluate(() => scrollTo(0, 0)).then(() => pg.screenshot({ path: `${SHOTS}/${eng}-${ui}-${theme}-${route}.png` })).catch(() => {});
    total++;
    const probs = []; if (blank.length) probs.push(`${blank.length} icon rỗng [${[...new Set(blank)].slice(0, 12).join(', ')}]`); if (info.badRef.length) probs.push(`symbol thiếu/rỗng: ${info.badRef.slice(0, 8).join(', ')}`);
    if (skipped.length > Math.max(1, Math.min(info.n, MAX) * 0.1)) probs.push(`${skipped.length}/${Math.min(info.n, MAX)} icon không đo được (quá hạn chụp: ${[...new Set(skippedWhy)].slice(0, 2).join(' | ') || 'biến mất / hộp rỗng'})`);
    if (info.raw.length) probs.push(`${info.raw.length} icon còn là chữ ligature (chưa thành SVG): ${info.raw.slice(0, 8).join(', ')}`); if (net.length) probs.push('asset lỗi: ' + [...new Set(net)].slice(0, 6).join(', '));
    const tag = `[${eng} ${ui} ${theme} #/${route}]`;
    if (!probs.length) console.log(`✓ ${tag} ${info.n} icon, không rỗng`);
    else { console.log(`${STRICT ? '✗' : '•'} ${tag} ${info.n} icon: ${probs.join(' · ')} · font ${info.fonts.join(' ') || '–'}`); if (STRICT) bad++; }
    await ctx.close();
  }
  await br.close();
}
if (bad) { console.error(`✗ icon-blank: ${bad}/${total} màn có icon rỗng/thiếu`); process.exit(1); }
console.log(`✓ icon-blank: ${total} màn (${engines.join('+')} · ${UIS.join('+')}), ${STRICT ? 'nghiêm ngặt' : 'chỉ đo'}`);
