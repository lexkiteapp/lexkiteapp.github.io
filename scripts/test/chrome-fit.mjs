// Khung chạy đúng khổ: mọi route trong docs/ui-inventory.json ở 390 & 768 (rà soát 23/11). Chạy trên CI (chrome-fit.yml), không chạy trên Mac.
// Luật 1 (cứng): phần tử position:fixed/sticky nhìn thấy phải nằm TRONG chiều ngang khung (left ≥ 0, right ≤ rộng) — bắt lỗi `fixed w-full` thiếu left-0 (say@768).
// Luật 2: nội dung cuối trang không bị thanh dưới dính che (cuộn tới đáy, chữ cuối cùng phải nằm trên mép trên của thanh dính đáy). Route cũ còn vi phạm nằm trong
//   scripts/test/chrome-fit-baseline.json (chỉ GIẢM, không thêm: route mới/đã sạch mà vi phạm = đỏ).
// Luật 3: MỘT nút chính (.btn.primary / button.primary) nhìn thấy trong màn đầu (route cũ nhiều hơn 1 nằm baseline.prim, chỉ giảm).
// Luật 4 (cứng): trong mỗi [role=radiogroup] chỉ ≤ 1 mục aria-checked=true, và nếu nhóm dùng class .on thì .on ⇔ aria-checked=true (một kiểu chọn, không mơ hồ).
// Dùng: node scripts/test/chrome-fit.mjs <base> [--write-baseline]
import { chromium } from 'playwright'; import fs from 'fs';
const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, ''), WRITE = process.argv.includes('--write-baseline');
const inv = JSON.parse(fs.readFileSync('docs/ui-inventory.json', 'utf8')), BASEF = 'scripts/test/chrome-fit-baseline.json';
const base = Object.assign({ cover: [], prim: [] }, fs.existsSync(BASEF) ? JSON.parse(fs.readFileSync(BASEF, 'utf8')) : {});
const routes = [...new Set(inv.routes.map(r => r.hash).filter(h => !/^#\/(welcome|lesson)/.test(h)))];
const hard = [], cover = [], prim = [], br = await chromium.launch();
for (const [W, H] of [[390, 844], [768, 1024]]) {
  const ctx = await br.newContext({ viewport: { width: W, height: H }, isMobile: W < 700, hasTouch: W < 700, reducedMotion: 'reduce', locale: 'vi' });
  await ctx.route(/lexkite\.com|googletagmanager|google-analytics|pagead|cloudflareinsights/, r => r.abort());
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app/?sandbox=1&hl=vi#/welcome/setup`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForSelector('#obNext, #go', { timeout: 8000 }).catch(() => {});
  for (let i = 0; i < 8 && !(await page.$('#go')) && (await page.$('#obNext')); i++) { await page.click('#obNext').catch(() => {}); await page.waitForTimeout(200); }
  const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await page.waitForTimeout(1800); }
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}.toast,#toast{display:none!important}' });
  for (const h of routes) {
    await page.evaluate(x => { location.hash = x; scrollTo(0, 0); }, h); await page.waitForTimeout(1000);
    const r = await page.evaluate(() => {
      const vw = innerWidth, vh = innerHeight, sel = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '');
      const vis = e => { const q = e.getBoundingClientRect(), s = getComputedStyle(e); return q.width > 2 && q.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && q.bottom > 0 && q.top < vh; };
      const fixed = [...document.querySelectorAll('body *')].filter(e => { const s = getComputedStyle(e).position; return (s === 'fixed' || s === 'sticky') && vis(e) && !e.closest('.skip-link,#toast,.toast,[aria-hidden=true]') && !e.matches('.skip-link'); });
      const bad = fixed.filter(e => { const q = e.getBoundingClientRect(); return q.left < -1 || q.right > vw + 1; }).map(e => sel(e) + ' ' + Math.round(e.getBoundingClientRect().left) + '..' + Math.round(e.getBoundingClientRect().right));
      scrollTo(0, 1e7);
      const bars = fixed.filter(e => { const q = e.getBoundingClientRect(); return getComputedStyle(e).position === 'fixed' && q.bottom >= vh - 2 && q.width > vw * 0.5; });
      const top = bars.length ? Math.min(...bars.map(e => e.getBoundingClientRect().top)) : vh;
      const view = document.getElementById('view'), leaves = view ? [...view.querySelectorAll('*')].filter(e => ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1) ? false : vis(e) && !e.closest('[aria-hidden=true],.hidden') && !fixed.some(f => f.contains(e))) : [];
      const last = leaves.map(e => e.getBoundingClientRect()).filter(q => q.bottom > 0).sort((a, b) => b.bottom - a.bottom)[0];
      scrollTo(0, 0);
      const pr = [...document.querySelectorAll('#view .btn.primary, #view button.primary')].filter(e => vis(e) && e.getBoundingClientRect().top < vh && !e.closest('[hidden],.hidden,[aria-hidden=true]')).length;
      const rg = [...document.querySelectorAll('[role=radiogroup]')].flatMap(g => { const it = [...g.querySelectorAll('[role=radio]')], on = it.filter(x => x.getAttribute('aria-checked') === 'true'); const mism = it.some(x => x.classList.contains('on')) ? it.filter(x => x.classList.contains('on') !== (x.getAttribute('aria-checked') === 'true')) : []; return [...(on.length > 1 ? ['nhiều hơn 1 mục chọn'] : []), ...(mism.length ? ['.on lệch aria-checked'] : [])]; });
      return { pr, rg, bad, covered: !!(last && last.bottom > top + 2), over: last ? Math.round(last.bottom - top) : 0 };
    }).catch(e => ({ bad: [], covered: false, err: String(e.message).slice(0, 60) }));
    r.bad.forEach(b => hard.push(`${h}@${W}: ${b}`)); (r.rg || []).forEach(b => hard.push(`${h}@${W}: radiogroup ${b}`)); if (r.covered) cover.push(`${h}@${W}`); if (r.pr > 1) prim.push(`${h}@${W}`);
  }
  await ctx.close();
}
await br.close();
fs.writeFileSync('chrome-fit-out.json', JSON.stringify({ cover: cover.sort(), prim: prim.sort(), hard }, null, 1)); // luôn xuất (artifact) để lấy baseline đầu tiên
if (WRITE) { fs.writeFileSync(BASEF, JSON.stringify({ _: 'Route cũ còn nội dung cuối bị thanh dưới che (chrome-fit.mjs luật 2) – chỉ giảm, không thêm', cover: cover.sort(), prim: prim.sort() }, null, 1) + '\n'); console.log('baseline', cover.length, prim.length); }
const fresh = cover.filter(c => !base.cover.includes(c)), fixedUp = base.cover.filter(c => !cover.includes(c)), freshP = prim.filter(c => !base.prim.includes(c)), fixedP = base.prim.filter(c => !prim.includes(c));
console.log(`chrome-fit: ${routes.length} route × 2 khổ · cố định lệch khung ${hard.length} · bị tab che ${cover.length} (nền ${base.cover.length}, mới ${fresh.length}, đã sạch ${fixedUp.length}) · >1 nút chính ${prim.length} (nền ${base.prim.length}, mới ${freshP.length}, đã sạch ${fixedP.length})`);
hard.forEach(x => console.log('✗ lệch khung', x)); fresh.forEach(x => console.log('✗ nội dung cuối bị thanh dưới che (mới)', x)); fixedUp.forEach(x => console.log('· đã sạch, hãy gỡ khỏi baseline.cover:', x)); freshP.forEach(x => console.log('✗ nhiều hơn 1 nút chính ở màn đầu (mới)', x)); fixedP.forEach(x => console.log('· đã sạch, hãy gỡ khỏi baseline.prim:', x));
process.exit(WRITE ? 0 : (hard.length || fresh.length || fixedUp.length || freshP.length || fixedP.length) ? 1 : 0);
