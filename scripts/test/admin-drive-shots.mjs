// Ảnh + soát hình Quản trị › Kho Drive › Kho video trên DỮ LIỆU MẪU (Playwright trên CI – .github/workflows/admin-drive-ui.yml). Sáng/tối × 1280/390 px, trạng thái: list · clean (hộp Dọn kho).
// Chặn (chỉ tag after): lỗi JS, mạng ra ngoài, tràn ngang, nút/ô < 44 px, chữ bị cắt, axe. --compare <out>: ghép TRƯỚC | SAU. Chạy: node scripts/test/admin-drive-shots.mjs [out] [tag] [web]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
let pw; try { pw = await import('playwright'); } catch (e) { console.log('admin-drive-shots: playwright not installed – skipped'); process.exit(0); }
const browser = await pw.chromium.launch().catch(e => { console.log('admin-drive-shots: no browser – skipped (' + String(e).split('\n')[0] + ')'); return null; });
if (!browser) process.exit(0);
const VPS = [['desktop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]], STATES = ['list', 'clean'], THEMES = ['light', 'dark'];
if (process.argv[2] === '--compare') {
  const OUT = process.argv[3] || 'out/admin-drive', made = [], img = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  for (const st of STATES) for (const th of THEMES) for (const [vp, { width: w }] of VPS) {
    const k = `${st}-${th}-${vp}`, b = path.join(OUT, `before-${k}.png`), a = path.join(OUT, `after-${k}.png`); if (!fs.existsSync(b) || !fs.existsSync(a)) continue;
    const page = await browser.newPage({ viewport: { width: w * 2 + 48, height: 600 } });
    await page.setContent(`<body style="margin:0;background:#888;font:600 16px system-ui;color:#fff;display:flex;gap:16px;padding:16px;align-items:flex-start"><figure style="margin:0;width:${w}px"><figcaption style="padding:0 0 8px">TRƯỚC · ${k}</figcaption><img src="${img(b)}" width="${w}"></figure><figure style="margin:0;width:${w}px"><figcaption style="padding:0 0 8px">SAU · ${k}</figcaption><img src="${img(a)}" width="${w}"></figure></body>`);
    await page.waitForTimeout(100); const f = path.join(OUT, `compare-${k}.png`); await page.screenshot({ path: f, fullPage: true }); made.push(f); await page.close();
  }
  await browser.close(); console.log(made.join('\n') || 'no pairs'); process.exit(0);
}
const OUT = process.argv[2] || 'out/admin-drive', TAG = process.argv[3] || 'after', WEB = process.argv[4] || 'web'; fs.mkdirSync(OUT, { recursive: true });
const AXE = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8'), G = 1024 ** 3, DAY = 864e5, NOW = Date.UTC(2026, 10, 11);
const iso = d => new Date(NOW - d * DAY).toISOString();
const v = (id, name, path, size, state, x = {}) => ({ id: id.padEnd(14, 'a'), name, path, size, mime: 'video/mp4', modified: iso(x.age || 12), state, lock: null, clean: null, ...x });
const items = [
  v('p1', 'present-perfect-coffee-shop-9x16.mp4', 'shorts/grammar/present_perfect', 18e7, 'published', { lock: 'published', posts: [{ p: 'youtube', u: 'https://youtu.be/mock1', t: NOW - 3 * DAY }, { p: 'instagram', u: 'https://instagram.com/p/mock', t: NOW - 2 * DAY }, { p: 'tiktok', u: 'https://tiktok.com/@l/video/1', t: NOW - 2 * DAY }] }),
  v('p2', 'phrasal-verbs-at-work-9x16 (1).mp4', 'shorts/vocab/phrasal', 16e7, 'published', { clean: 'intermediate', reason: 'dup-keep-newest', keep: 'phrasal-verbs-at-work-9x16.mp4', posts: [{ p: 'youtube', u: 'https://youtu.be/mock2', t: NOW - 9 * DAY }], age: 40 }),
  v('d1', 'ordering-food-politely-9x16.mp4', 'shorts/speaking/restaurant', 14e7, 'draft', { lock: 'scheduled', scheduled: NOW + 5 * DAY }),
  v('d2', 'pronunciation-th-minimal-pairs.mp4', 'shorts/pron/theta', 12e7, 'draft', { lock: 'clip' }),
  v('j1', 'render-out-tmp-8841.mp4', 'renders/tmp', 42e7, 'junk', { clean: 'junk', reason: 'temp-older', cat: 'temp', age: 30 }),
  v('j2', 'rejected-take-idioms-weather.mp4', 'shorts/vocab/idioms', 11e7, 'junk', { clean: 'junk', reason: 'rejected', age: 45 }),
  v('j3', 'zero-byte-upload.mp4', 'misc', 0, 'junk', { clean: 'junk', reason: 'zero-byte', cat: 'partial', age: 60 }),
  v('s1', 'old-experiment-b-roll-ama-final-v3.webm', 'misc/experiments', 31e7, 'stale', { clean: 'stale', reason: 'orphan-unknown', age: 210 }),
  v('a1', 'ama-idle-office-loop-master.mp4', 'footage/office', 9e8, 'active', { lock: 'footage', age: 120 }),
];
const sum = s => { const r = items.filter(x => x.state === s); return { files: r.length * 37, bytes: r.reduce((a, x) => a + x.size, 0) * 37 }; };
const INV = { drive_id: 1, checked: NOW, summary: Object.fromEntries(['published', 'draft', 'junk', 'stale', 'active'].map(s => [s, sum(s)])), scheduled: 21, plan: {}, trash: { files: 4, bytes: 2e8 }, items, more: 0, signals_ok: true, truncated: false, refs_synced: true, cfg: { on: true, stale_on: false, stale_days: 90, every_days: 7 }, last: { at: NOW - DAY, trashed: 12, bytes: 34e8, remaining: 0, undo: ['j1aaaaaaaaaaaa'] } };
const LIST = { drives: [{ id: 1, email: 'library.one@example.com', status: 'ok', weight: 100, quota_total: 15 * G, quota_used: 12.6 * G }, { id: 2, email: 'library.two@example.com', status: 'ok', weight: 100, quota_total: 15 * G, quota_used: 4 * G }], total: 30 * G, used: 16.6 * G, free: 13.4 * G, configured: { client: true, secret: true, key: true, cli: true }, alerts: [] };
const PAGE = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/style.css"><link rel="stylesheet" href="/css/admin.css"></head><body class="adm" style="--a-top:0px"><main class="adm-main" id="main" style="padding:16px"></main><script src="/js/admin-drive.js"></script></body></html>`;
const fails = [], report = [];
for (const state of STATES) for (const theme of THEMES) for (const [vp, size] of VPS) {
  const ctx = await browser.newContext({ viewport: size, colorScheme: theme, deviceScaleFactor: 1 }), page = await ctx.newPage(), errs = [], ext = [], k = `${state}-${theme}-${vp}`;
  page.on('request', q => { const u = q.url(); if (!/^(data:|blob:|https:\/\/lexkite\.test\/)/.test(u)) ext.push(u); });
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await page.route('https://lexkite.test/**', r => { const u = new URL(r.request().url()); if (u.pathname === '/admin.html') return r.fulfill({ contentType: 'text/html', body: PAGE }); const f = path.join(WEB, u.pathname); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); });
  await page.addInitScript(([L, I]) => { window.__dapi = async op => (op === 'list' ? L : op === 'inventory' ? I : op === 'tidy_cfg' ? { cfg: I.cfg } : {}); }, [LIST, INV]); // (đặt theme SAU goto: lúc init script chạy document.documentElement còn null → ném lỗi, __dapi không bao giờ được gán)
  await page.goto('https://lexkite.test/admin.html#drive/stock');
  await page.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
  await page.evaluate(() => { window.AdminDrive.render(document.getElementById('main'), window.__dapi, (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, x) => (v[x] != null ? v[x] : m)) : s), { esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), lang: () => 'vi', when: t => new Date(t).toLocaleString('vi') }); });
  await page.waitForTimeout(500);
  if (TAG === 'after' && state === 'clean') { await page.click('[data-clean]'); await page.waitForTimeout(200); }
  const f = path.join(OUT, `${TAG}-${k}.png`); await page.screenshot({ path: f, fullPage: true });
  if (TAG === 'after') {
    const scope = state === 'clean' ? '.drv-modal' : '#main';
    const c = await page.evaluate(sel => { const r = document.querySelector(sel), vis = e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; }, small = [], clipped = [];
      for (const e of r.querySelectorAll('button,select,input:not([type=checkbox]),.stk-posts a')) { if (!e.closest('.stk,.drv-modal') || !vis(e) || e.closest('.drv-tabs')) continue; const b = e.getBoundingClientRect(); if (b.height < 43.5) small.push((e.textContent || e.id || e.tagName).trim().slice(0, 24) + ':' + Math.round(b.height)); }
      for (const e of r.querySelectorAll('.stk *,.drv-modal *')) { if (!vis(e) || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue; const s = getComputedStyle(e); if (/hidden|clip/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 1 && s.textOverflow !== 'ellipsis') clipped.push(e.textContent.trim().slice(0, 30)); }
      return { overflow: document.scrollingElement.scrollWidth - window.innerWidth, small, clipped }; }, scope);
    await page.addScriptTag({ content: AXE });
    const ax = await page.evaluate(async sel => (await window.axe.run(document.querySelector(sel), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })).violations.filter(x => x.impact === 'serious' || x.impact === 'critical').map(x => x.id + '×' + x.nodes.length + ' ' + x.nodes[0].target), scope);
    report.push({ k, ...c, axe: ax, ext, errs });
    if (ext.length) fails.push(`${k}: mạng ra ngoài ${ext[0]}`); if (errs.length) fails.push(`${k}: lỗi JS ${errs[0]}`); if (c.overflow > 1) fails.push(`${k}: tràn ngang ${c.overflow}px`); if (c.small.length) fails.push(`${k}: nút < 44 px – ${c.small.slice(0, 5).join(' | ')}`); if (c.clipped.length) fails.push(`${k}: chữ bị cắt – ${c.clipped.slice(0, 4).join(' | ')}`); if (ax.length) fails.push(`${k}: axe ${ax.join(', ')}`);
  }
  await ctx.close();
}
fs.writeFileSync(path.join(OUT, `report-${TAG}.json`), JSON.stringify(report, null, 1)); await browser.close();
if (fails.length) { console.log('✗ admin-drive-shots\n' + fails.join('\n')); process.exit(1); }
console.log(`✓ admin-drive-shots ${TAG}: ${STATES.length * 4} ảnh`);
