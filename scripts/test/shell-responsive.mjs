// 📐 Vỏ app đáp ứng (một mốc 1024 px): thanh trên / cột trái / thanh tab dưới cũ (#bnav) / đầu trang + tab dưới Stitch v2, đo render thật.
// Đỏ khi: thiếu đường tới (nút hiện hoặc nút mở) cho giao diện sáng-tối / ngôn ngữ / thông báo / tài khoản / tra từ / chuỗi ngày (chuỗi chỉ bắt buộc ở Hôm nay);
// số thanh điều hướng chính nhìn thấy ≠ 1 (cột trái, #bnav, tab dưới Stitch); thanh dưới đè lên cột trái hoặc che mục cuối (.side-level / thẻ người dùng);
// số logo nhìn thấy ≠ 1; tràn ngang; các viên thanh trên (.top-stats > *, .gsearch) chồng lên nhau; lỗi JS.
// Rộng 360/768/960/1024/1100/1280/1440 ở 100 %, cộng phóng to trình duyệt 150 %/200 % tại cửa sổ 1280 và 1440 (viewport = floor(w/zoom), deviceScaleFactor = zoom).
// Phục vụ thẳng thư mục web/ qua page.route (?sandbox=1), 0 lượt chạm prod.
// Dùng: node scripts/test/shell-responsive.mjs <web> [out=out/shell-responsive] [--label sau] [--report-only]   (CI: .github/workflows/shell-responsive.yml)
import fs from 'node:fs';
import { chromium } from 'playwright';
import { serve } from './ux-guard-lib.mjs';
import { waitFn } from '../lib/pw-wait.mjs';
const argv = process.argv.slice(2), flag = n => { const i = argv.indexOf(n); return i < 0 ? null : argv.splice(i, 2)[1]; };
const LABEL = flag('--label') || 'sau', REPORT = argv.includes('--report-only'), [ROOT = 'web', OUT = 'out/shell-responsive'] = argv.filter(a => a !== '--report-only');
fs.mkdirSync(OUT, { recursive: true });
const HUBS = ['home', 'vocab', 'me'];
const CASES = [];
for (const w of [360, 768, 960, 1024, 1100, 1280, 1440]) CASES.push({ win: w, zoom: 1, lang: 'vi', th: 'dark', routes: HUBS });
for (const w of [1280, 1440]) for (const zoom of [1.5, 2]) CASES.push({ win: w, zoom, lang: 'vi', th: 'dark', routes: HUBS });
for (const w of [360, 1280]) CASES.push({ win: w, zoom: 1, lang: 'vi', th: 'light', routes: ['home'] });
for (const w of [768, 1280]) CASES.push({ win: w, zoom: 1, lang: 'de', th: 'dark', routes: ['home'] });
for (const c of CASES) c.vw = Math.floor(c.win / c.zoom);
const browser = await chromium.launch();
const rows = [], fails = [];
const measure = () => {
  const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none' && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  const q = s => [...document.querySelectorAll(s)].filter(vis), any = s => q(s).length > 0;
  const rect = e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
  const W = document.documentElement.clientWidth, route = (location.hash.match(/^#\/([^/?]*)/) || [])[1] || '';
  const top = document.querySelector('.topbar'), topVis = vis(top);
  const openers = [...(topVis ? q('#avatarBtn') : []), ...q('.v2 header [data-act="menu"], [data-act="menu"]'), ...q('.v2 header a[href="#/me"]')]; // avatar đầu trang Stitch mở menu tài khoản (app.js App.accountMenu)
  const fixedOf = e => { for (let x = e; x && x !== document.documentElement; x = x.parentElement) if (getComputedStyle(x).position === 'fixed') return x; return null; };
  const v2nav = q('.v2 nav').filter(n => { const f = fixedOf(n); return f && rect(f).b >= innerHeight - 2; });
  const sidebar = q('.sidebar'), bnav = q('#bnav'), navs = { sidebar: sidebar.length, bnav: bnav.length, v2nav: v2nav.length };
  const bottom = [...bnav, ...v2nav].map(n => rect(fixedOf(n) || n)), sb = sidebar.map(rect), lastSide = [...q('.sidebar .side-level, .sidebar .side-user, .sidebar .user-card')].map(rect);
  const hit = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 1;
  const sideHit = [];
  for (const bt of bottom) { for (const s of sb) if (hit(bt, s)) sideHit.push('thanh dưới đè cột trái'); for (const s of lastSide) if (hit(bt, s)) sideHit.push('thanh dưới che mục cuối cột trái'); }
  const logos = new Set([...q('img.logo'), ...q('.v2 header img').filter(i => /icon/.test(i.getAttribute('src') || '')), ...q('.brand img')]);
  const streakRe = /Chuỗi ngày|Streak|Serie/i, streakIn = route === 'home' ? q('#view *').some(e => { const t = (e.getAttribute('aria-label') || '') + ' ' + (e.children.length ? '' : e.textContent || ''); return t.length < 120 && streakRe.test(t); }) : false;
  const kids = topVis ? q('.topbar .top-stats > *, .topbar .gsearch').map(e => ({ k: e.id || String(e.className).split(' ')[0] || e.tagName, ...rect(e) })) : [], ov = [];
  for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) if (hit(kids[i], kids[j])) ov.push(`${kids[i].k}×${kids[j].k}`);
  // Thanh tab dưới (Stitch hoặc #bnav): đúng 5 ô, mỗi ô 1 icon SVG <use href="#i-*"> có thật trong sprite, rộng ≥ 16 px; không ô nào lộ chữ thay icon (font chữ ghép)
  const tabBars = [...v2nav, ...bnav].map(n => fixedOf(n) || n), tabIcons = tabBars.map(b => [...b.querySelectorAll('a')].filter(vis).map(a => { const u = a.querySelector('svg use'), id = u && (u.getAttribute('href') || '').slice(1), sv = u && u.closest('svg'), lig = [...a.querySelectorAll('[class*="material-symbols"]')].map(x => x.textContent.trim()).filter(Boolean);
    return { href: a.getAttribute('href'), ok: !!(id && /^i-/.test(id) && document.getElementById(id) && sv.getBoundingClientRect().width >= 16) && !lig.length, why: !u ? (lig.length ? 'chữ ghép "' + lig[0] + '"' : 'không có icon') : !document.getElementById(id) ? 'thiếu #' + id : 'icon < 16 px' }; }));
  return {
    tabIcons, W, route, sw: document.documentElement.scrollWidth, navs, logos: logos.size, sideHit, topOv: ov, hasOpener: openers.length > 0,
    themeBtn: any('#themeBtn'), lang: any('#langBtn, [data-act="lang"]'), notif: any('#notifBtn, [data-act="notif"]'),
    account: any('#avatarBtn, [data-act="menu"], .topbar a[href="#/me"], .v2 header a[href="#/me"]'), search: any('#gq, [data-act="search"]'), streak: any('#streakPill') || streakIn,
    opener: openers.length ? (openers[0].id ? '#' + openers[0].id : openers[0].matches('[data-act="menu"]') ? '[data-act="menu"]' : '.v2 header a[href="#/me"]') : '',
  };
};
const closeAll = async page => { await page.keyboard.press('Escape').catch(() => 0); await page.evaluate(() => { try { window.UI && UI.closeModal && UI.closeModal(); } catch (e) { /* */ } document.querySelectorAll('.ux1-menu').forEach(x => x.remove()); }).catch(() => 0); await page.waitForTimeout(150); };
const check = (c, r, m, errs, themeVia) => {
  const tag = `${c.th}/${c.lang}/${c.win}@${Math.round(c.zoom * 100)}%/${r}`, bad = s => fails.push(`${tag}: ${s}`);
  if (!(m.themeBtn || themeVia)) bad('giao diện sáng/tối không với tới được (không có #themeBtn, menu tài khoản không có [data-m="theme"])');
  if (!m.lang) bad('không có nút ngôn ngữ');
  if (!m.notif) bad('không có nút thông báo');
  if (!m.account) bad('không có nút tài khoản');
  if (!m.search) bad('không có nút/ô tra từ');
  if (!m.streak && r === 'home') bad('không thấy chuỗi ngày (#streakPill hoặc thẻ chuỗi ở Hôm nay)');
  const n = m.navs.sidebar + m.navs.bnav + m.navs.v2nav; if (n !== 1) bad(`${n} thanh điều hướng chính (cột trái ${m.navs.sidebar}, #bnav ${m.navs.bnav}, tab dưới Stitch ${m.navs.v2nav})`);
  for (const s of new Set(m.sideHit)) bad(s);
  if (m.logos !== 1) bad(`${m.logos} logo nhìn thấy (cần đúng 1)`);
  if (m.sw > m.W + 1) bad(`tràn ngang ${m.sw} > ${m.W}`);
  for (const o of m.topOv) bad(`viên thanh trên chồng nhau: ${o}`);
  for (const t of m.tabIcons) { if (t.length !== 5) bad(`thanh tab dưới có ${t.length} ô (cần 5)`); for (const x of t) if (!x.ok) bad(`tab ${x.href}: ${x.why}`); }
  if (errs.length) bad(`lỗi JS: ${errs[0]}`);
};
const run = async c => {
  const ctx = await browser.newContext({ viewport: { width: c.vw, height: 800 }, colorScheme: c.th, serviceWorkers: 'block', isMobile: c.win < 768 && c.zoom === 1, hasTouch: c.win < 768 && c.zoom === 1, deviceScaleFactor: c.zoom });
  await ctx.addInitScript(([th]) => { try { localStorage.setItem('sbx.settings', JSON.stringify({ onboarded: true, theme: th, exam: 'ielts', examTarget: '6.5' })); localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.onb', '1'); } catch (e) { /* */ } }, [c.th]);
  await serve(ctx, ROOT);
  const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  for (const r of c.routes) {
    errs.length = 0;
    await page.goto(`https://lk.test/app/?sandbox=1&hl=${c.lang}#/${r}`, { waitUntil: 'load' });
    await waitFn(page, () => document.getElementById('view') && document.getElementById('view').children.length > 0, null, { timeout: 15000 }).catch(() => errs.push('#view trống sau 15 s'));
    await page.waitForTimeout(1200);
    await page.evaluate(async () => { App.state.game = App.state.game || {}; App.state.game.xp = 225; await App.route(); }); await page.waitForTimeout(800);
    const m = await page.evaluate(measure); let themeVia = '';
    if (!m.themeBtn && m.hasOpener) { // nút mở menu tài khoản có thật sự dẫn tới mục giao diện?
      const sel = m.opener;
      await page.locator(sel).first().click().catch(e => errs.push('bấm nút tài khoản: ' + e.message));
      const ok = await waitFn(page, () => { const mn = document.querySelector('.ux1-menu'); return !!mn && !!mn.querySelector('[data-m="theme"]') && mn.getBoundingClientRect().height > 0; }, null, { timeout: 4000 }).then(() => true, () => false);
      if (ok) themeVia = 'menu'; await closeAll(page);
    }
    check(c, r, m, errs, themeVia);
    const tag = `${r}-${c.th}-${c.lang}-${c.win}${c.zoom === 1 ? '' : 'z' + Math.round(c.zoom * 100)}`;
    await page.screenshot({ path: `${OUT}/${LABEL}-${tag}.png` });
    rows.push({ c, r, m, themeVia });
  }
  await ctx.close();
};
const queue = [...CASES]; await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) { const c = queue.shift(); await run(c).catch(e => fails.push(`${c.th}/${c.lang}/${c.win}@${Math.round(c.zoom * 100)}%: ${e.message.split('\n')[0]}`)); } }));
await browser.close();
const yn = v => v ? '✓' : '✗';
rows.sort((a, b) => a.c.win - b.c.win || a.c.zoom - b.c.zoom || a.c.lang.localeCompare(b.c.lang) || a.r.localeCompare(b.r));
const md = [`### ${LABEL}: ${fails.length ? fails.length + ' lỗi' : 'đạt'} (${rows.length} lượt đo)`, '', '| cửa sổ | zoom | vw | ngôn ngữ | giao diện | trang | giao diện sáng/tối | ngôn ngữ | thông báo | tài khoản | tra từ | chuỗi | cột trái/#bnav/tab Stitch | logo | tràn | chồng thanh trên |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map(({ c, r, m, themeVia }) => `| ${c.win} | ${Math.round(c.zoom * 100)}% | ${c.vw} | ${c.lang} | ${c.th} | ${r} | ${m.themeBtn ? '✓ nút' : themeVia ? '✓ ' + m.opener : '✗'} | ${yn(m.lang)} | ${yn(m.notif)} | ${yn(m.account)} | ${yn(m.search)} | ${m.streak ? '✓' : r === 'home' ? '✗' : 'n/a'} | ${m.navs.sidebar}/${m.navs.bnav}/${m.navs.v2nav} | ${m.logos} | ${m.sw - m.W} | ${m.topOv.join(' ') || '–'} |`), '', ...fails.map(x => '- ✗ ' + x)].join('\n');
fs.writeFileSync(`${OUT}/${LABEL}.md`, md + '\n'); fs.writeFileSync(`${OUT}/${LABEL}.json`, JSON.stringify({ rows: rows.map(({ c, r, m }) => ({ ...c, r, ...m })), fails }, null, 1));
console.log(md.split('\n').filter(l => !l.startsWith('|')).join('\n'));
if (fails.length && !REPORT) process.exit(1);
