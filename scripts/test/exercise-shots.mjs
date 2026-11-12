// 🧩 Ảnh + cổng khung bài tập chung (web/js/lesson/ex.js, mẫu Stitch ex-frame/ex-match): chạy thật #/lesson/go?demo=1 tới Ghép cặp, Xếp câu, Chọn từ, Gõ – 390 px và máy tính, sáng và tối.
// Cổng (loại lỗi "thẻ cắt ngang giáo viên / đầu trang lệch cột / nút nhỏ"): giáo viên không giao với thẻ nào · đầu trang cùng mép cột với thân · không tràn ngang · nút ≥ 44 px · không lồng button · không lỗi JS.
// Có web-trước → chụp thêm bản trước (chỉ ảnh, không chấm). Dùng: node scripts/test/exercise-shots.mjs <web> [web-trước] [out=out/exercise-shots]   (CI: exercise-shots.yml)
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
import { noProd } from './lib/no-prod.mjs';
const [AFTER = 'web', BEFORE = '', OUT = 'out/exercise-shots'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
const TYPES = { match: 'match', build: 'build', mean: 'mean', type: 'type' }, errs = [], browser = await chromium.launch();
// Trả lời ĐÚNG câu hiện tại (qua DOM như người học) để tới dạng bài cần chụp
const step = () => { const L = App._lsn, it = L && L.sess && L.sess.cur; if (!it) return 'end'; const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
  const go = q('#lsnNext') || q('#lsnGo'); if (go && go.offsetParent) { go.click(); return 'next'; }
  if (it.type === 'match') { for (const a of qa('.lsn-match [data-s="w"]')) { a.click(); const b = q(`.lsn-match [data-s="m"][data-m="${a.dataset.m}"]`); if (b) b.click(); } return 'a'; }
  if (it.type === 'build' || it.type === 'tr') { for (const w of String(it.answer).split(' ')) { const b = qa('#lsnBank .lsn-tile:not(.used)').find(x => x.textContent.trim() === w); if (b) b.click(); } const c = q('#lsnCheck'); if (c) c.click(); return 'a'; }
  if (it.type === 'type') { const i = q('#lsnIn'); i.value = it.answer; i.dispatchEvent(new Event('input')); q('#lsnCheck').click(); return 'a'; }
  const o = qa('.lsn-opt').find(x => x.dataset.o === String(it.answer)); if (o) { o.click(); q('#lsnCheck').click(); return 'a'; }
  const s = q('#lsnNoS') || q('#lsnNoL'); if (s) { s.click(); return 's'; } return 'stuck'; };
const measure = () => { const r = e => e.getBoundingClientRect(), inter = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom, out = [];
  const tch = document.querySelector('.lsn-tchw'), vis = e => e && e.offsetParent !== null && r(e).height > 0;
  if (document.documentElement.scrollWidth > innerWidth + 1) out.push('tràn ngang');
  if (vis(tch)) for (const c of document.querySelectorAll('.lsn-qcard, #lsnBody, .lsn-qfoot')) if (vis(c) && inter(r(tch), r(c))) out.push('thẻ chồng giáo viên: ' + c.className.split(' ').pop());
  const x0 = document.querySelector('.lsn-x'), x = vis(x0) ? x0 : null, /* ExitGuard (thanh FOCUS) ẩn nút ✕ của màn và dựng nút thoát chung: không còn ✕ của màn để so cột */ bar = document.querySelector('.lsn-bar'), body = document.querySelector('#lsnBody');
  if (x && body && vis(body) && Math.abs(r(x).left - r(body).left) > 1) out.push(`đầu trang lệch cột: X ${Math.round(r(x).left)} ≠ thân ${Math.round(r(body).left)}`);
  if (bar && body && vis(body) && r(bar).right > r(body).right + 1) out.push('thanh tiến độ rộng hơn cột');
  for (const b of document.querySelectorAll('#lsn button, #lsn a[href]')) if (vis(b) && !b.disabled) { const m = r(b), af = getComputedStyle(b, '::after'); const pad = af.content !== 'none' && af.position === 'absolute' ? Math.max(0, -parseFloat(af.top) || 0) * 2 : 0; if (m.height + pad < 43.5 || m.width < 28) out.push(`nút < 44: ${(b.id || b.getAttribute('aria-label') || b.textContent).trim().slice(0, 24)} ${Math.round(m.width)}×${Math.round(m.height)}`); }
  if (document.querySelector('#lsn button button')) out.push('button lồng button');
  return out; };
async function run(tag, root, vn, scheme, gate) {
  const vp = vn === '390' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 };
  const ctx = await browser.newContext({ ...vp, colorScheme: scheme, serviceWorkers: 'block', reducedMotion: 'reduce' }); await noProd(ctx);
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!fs.existsSync(f)) return r.fulfill({ status: 404 }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
  await ctx.addInitScript(() => { try { localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.onb', '1'); } catch (e) { /* */ } }); // khung người học thật (cờ ux1): không bật = chụp nhầm khung dự phòng, cổng mù
  const page = await ctx.newPage(); if (gate) page.on('pageerror', e => errs.push(`${vn}-${scheme}: ${e.message}`));
  const seen = new Set();
  for (let run = 0; run < 3 && seen.size < Object.keys(TYPES).length; run++) {
    await page.goto(`https://lk.test/app/?sandbox=1&hl=vi#/lesson/go?demo=1`, { waitUntil: 'load' }); await page.waitForTimeout(2500);
    for (let i = 0; i < 80 && seen.size < Object.keys(TYPES).length; i++) {
      const cur = await page.evaluate(() => { const L = window.App && App._lsn, it = L && L.sess && L.sess.cur; return it && !L.checked ? it.type : null; });
      if (cur && TYPES[cur] && !seen.has(cur)) { seen.add(cur); await page.waitForTimeout(500);
        if (cur === 'match') { await page.evaluate(() => { const q = s => document.querySelector(s); const a = [...document.querySelectorAll('.lsn-match [data-s="w"]')]; a[0].click(); q(`.lsn-match [data-s="m"][data-m="${a[0].dataset.m}"]`).click(); a[1].click(); q(`.lsn-match [data-s="m"][data-m="${a[1].dataset.m}"]`).click(); a[2].click(); }); await page.waitForTimeout(350); }
        if (cur === 'build') await page.evaluate(() => { const t = document.querySelector('#lsnBank .lsn-tile'); if (t) t.click(); });
        await page.waitForTimeout(250); await page.screenshot({ path: path.join(OUT, `${tag}-${cur}-${vn}-${scheme}.png`), fullPage: true });
        if (gate) { if (!await page.$('.lsn-xframe')) errs.push(`${cur} ${vn} ${scheme}: KHÔNG thấy khung ex-frame (chấm trên khung sai)`); for (const m of await page.evaluate(measure)) errs.push(`${cur} ${vn} ${scheme}: ${m}`); }
      }
      const r = await page.evaluate(step); if (r === 'end' || r === 'stuck') break; await page.waitForTimeout(r === 'a' ? 500 : 250);
    }
  }
  if (gate) for (const k of Object.keys(TYPES)) if (!seen.has(k)) console.log(`· ${vn} ${scheme}: không gặp dạng ${k} trong bài thử`);
  if (gate && !seen.has('match')) errs.push(`${vn} ${scheme}: không tới được Ghép cặp`);
  if (gate && !seen.has('build')) errs.push(`${vn} ${scheme}: không tới được Xếp câu`);
  await ctx.close();
}
for (const vn of ['390', 'desk']) for (const sc of ['light', 'dark']) { await run('after', AFTER, vn, sc, true); if (BEFORE) await run('before', BEFORE, vn, sc, false); }
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ errs }, null, 1));
if (errs.length) { console.error('✗ exercise-shots:\n  ' + [...new Set(errs)].join('\n  ')); process.exit(1); }
console.log('✓ exercise-shots: giáo viên không bị che, đầu trang cùng cột, không tràn, nút ≥ 44 px');
