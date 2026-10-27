// 👁 Soát giao diện tự động (máy dò lỗi hiển thị, không cần nhìn ảnh): tràn ngang, nút đè chữ, chữ bị ép cột 1–2 từ,
// chữ cắt "…" không có title, trang cuộn ngang, vùng chạm < 40px (điện thoại), tương phản màu (axe), lỗi RTL (ar), link danh sách lệch hàng, icon tàng hình (icon trùng màu nền nút).
// Ma trận: màn hình chính × 375/820/1440 × sáng/tối × en/vi/es/ar (+ de/ru chỉ 375). Chạy trên GitHub Actions (visual-qa.yml).
// Dùng: node scripts/test/visual-qa.mjs <base> <thư-mục-ra>  → report.md + report.json + shots/ (ảnh cắt cho nhóm lỗi đầu bảng)
// Ngưỡng chống lùi: scripts/test/visual-qa.budget.json (số nhóm lỗi tối đa theo loại; vượt → exit 1).
import { chromium } from 'playwright';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const OUT = process.argv[3] || 'vqa-out';
const QUICK = process.env.VQA_QUICK === '1';
fs.mkdirSync(OUT + '/shots', { recursive: true });
const AXE = fs.readFileSync(require.resolve('axe-core'), 'utf8');
const ROUTES = ['home', 'path', 'day/1', 'review', 'dict/hello', 'library', 'grammar', 'grammar/ed-s-endings', 'tests', 'cbt', 'qstats', 'quick', 'me', 'settings'];
const VPS = { m: { width: 375, height: 812, isMobile: true, hasTouch: true }, t: { width: 820, height: 1180, isMobile: true, hasTouch: true }, d: { width: 1440, height: 900 } };
const combos = [];
for (const v of QUICK ? ['m'] : ['m', 't', 'd']) for (const s of ['light', 'dark']) for (const l of QUICK ? ['es', 'ar'] : ['en', 'vi', 'es', 'ar']) combos.push({ v, s, l });
if (!QUICK) for (const l of ['de', 'ru']) for (const s of ['light', 'dark']) combos.push({ v: 'm', s, l });

// ---- Máy dò chạy trong trang: trả về [{t: loại, k: selector, x: chữ mẫu, r: [x,y,w,h]}]
function detect(opt) {
  const out = [], W = innerWidth, seen = new Set();
  const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return null; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity === 0) return null; return r; };
  const sel = e => { const one = x => x.tagName.toLowerCase() + [...x.classList].filter(c => !/^(on|active|show|open|is-|has-|sel|done|cur)/.test(c)).slice(0, 2).map(c => '.' + c).join('') + (x.id && !/\d/.test(x.id) ? '#' + x.id : ''); let p = e.parentElement; while (p && !p.classList.length && !p.id && p !== document.body) p = p.parentElement; return (p && p !== document.body ? one(p) + ' > ' : '') + one(e); };
  const own = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
  const add = (t, e, r) => { const k = t + '|' + sel(e); if (seen.has(k)) return; seen.add(k); out.push({ t, k: sel(e), x: (e.innerText || e.value || '').replace(/\s+/g, ' ').trim().slice(0, 50), r: [r.left + scrollX, r.top + scrollY, r.width, r.height].map(Math.round) }); };
  const root = document.body;
  for (const ul of root.querySelectorAll('ul,ol,[role=menu]')) { // link/mục menu trong cùng 1 cột phải thẳng mép chữ (vd. chữ ngắn bị căn giữa trong vùng chạm 44px)
    const xs = []; for (const li of ul.children) { const a = li.tagName === 'LI' ? li.firstElementChild : li.getAttribute('role') === 'menuitem' ? li : null; if (!a || !/^(A|BUTTON)$/.test(a.tagName) || !vis(a) || !(a.textContent || '').trim()) continue; const rg = document.createRange(); rg.selectNodeContents(a); const rs = [...rg.getClientRects()].filter(q => q.width > 0); if (!rs.length) continue; const l1 = rs.filter(q => Math.abs(q.top - rs[0].top) < 2); xs.push([getComputedStyle(a).direction === 'rtl' ? Math.max(...l1.map(q => q.right)) : Math.min(...l1.map(q => q.left)), a]); } // dòng đầu, gộp mọi đoạn (chữ Ả Rập + Latin xen kẽ)
    if (xs.length < 3) continue; const m = xs.map(x => x[0]).sort((a, b) => a - b)[xs.length >> 1];
    for (const [x, a] of xs) if (Math.abs(x - m) > 3) { add('list-misaligned', a, a.getBoundingClientRect()); break; }
  }
  if (opt.only === 'align') return out;
  if (document.scrollingElement.scrollWidth > W + 1) { // trang cuộn ngang: tìm phần tử thò ra ngoài màn hình
    let worst = null; for (const e of root.querySelectorAll('*')) { const r = vis(e); if (!r || e.closest('[style*="overflow"],.hscroll,.scroller')) continue; if (r.right > W + 1 || r.left < -1) { const cs = getComputedStyle(e); if (cs.position === 'fixed' && +cs.opacity < 1) continue; worst = e; } }
    add('hscroll', worst || root, (worst || root).getBoundingClientRect());
  }
  const scrollerOf = e => { for (let p = e; p && p !== root; p = p.parentElement) { const ox = getComputedStyle(p).overflowX; if (ox === 'auto' || ox === 'scroll') return p; } return null; };
  for (const e of root.querySelectorAll('body *:not(svg *):not(script):not(style)')) {
    if (/^(INPUT|TEXTAREA|SELECT|SVG|CANVAS|PRE|CODE|IMG|VIDEO|IFRAME|OPTION)$/.test(e.tagName)) continue;
    const r = vis(e); if (!r || r.bottom < 0) continue;
    const cs = getComputedStyle(e), tx = own(e);
    if (tx && [...tx].length > 2 && cs.display !== 'inline' && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll' && e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0 && !scrollerOf(e.parentElement)) {
      if (cs.textOverflow === 'ellipsis') { if (!e.closest('[title],[aria-label]')) add('ellipsis-no-title', e, r); }
      else add('overflow-x', e, r);
    }
    if (tx && cs.display !== 'inline' && !/^(BUTTON|A|LABEL|TH|TD)$/.test(e.tagName)) { // chữ bị ép thành cột 1–2 từ
      const words = tx.split(' ').length, lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3, lines = Math.round(r.height / lh), pw = e.parentElement.getBoundingClientRect().width;
      if (words >= 4 && lines >= 3 && words / lines <= 2 && pw > 200 && r.width < pw * 0.45) add('squeezed', e, r);
    }
    if (opt.rtl && tx && cs.display !== 'inline') {
      if (cs.textAlign === 'left' && cs.direction === 'rtl' && r.width > 120) add('rtl-text-left', e, r);
      if ((/[\u0600-\u06FF][^\u0600-\u06FF]*[→➜➔]\s*$/.test(tx) || /^\s*[←⬅][^]*[\u0600-\u06FF]/.test(tx)) && cs.direction === 'rtl') add('rtl-arrow', e, r);
    }
  }
  const clickables = [...root.querySelectorAll('button,a[href],.btn,[role=button],input[type=checkbox],input[type=radio],select')].filter(e => vis(e) && !e.closest('[aria-hidden="true"]'));
  for (const b of clickables) { // nút/link bị cắt ngang ở mép khung cuộn/ẩn (không có mờ dần báo còn nội dung)
    let p = b.parentElement; while (p && p !== root && getComputedStyle(p).overflowX === 'visible') p = p.parentElement; if (!p || p === root) continue;
    const ps = getComputedStyle(p); if ((ps.maskImage || 'none') !== 'none' || (ps.webkitMaskImage || 'none') !== 'none') continue;
    const pr = p.getBoundingClientRect(), br = b.getBoundingClientRect();
    if ((br.right > pr.right + 4 && br.left < pr.right - 4) || (br.left < pr.left - 4 && br.right > pr.left + 4)) add('clipped', b, br);
  }
  for (const b of clickables) { // nút/link đè lên chữ của phần tử anh em
    const br = b.getBoundingClientRect(), gp = (b.parentElement && b.parentElement.parentElement) || root;
    let fx = false; for (let p = b; p && p !== root; p = p.parentElement) { const ps = getComputedStyle(p).position; if (ps === 'fixed' || ps === 'sticky') { fx = true; break; } } if (!fx && gp !== root) for (const t of gp.querySelectorAll('*')) {
      if (t === b || t.contains(b) || b.contains(t) || !own(t) || t.closest('button,a,.btn,[role=button]')) continue;
      const tr = vis(t); if (!tr) continue;
      const ix = Math.min(br.right, tr.right) - Math.max(br.left, tr.left), iy = Math.min(br.bottom, tr.bottom) - Math.max(br.top, tr.top);
      if (ix > 3 && iy > 3 && ix * iy > 0.15 * Math.min(br.width * br.height, tr.width * tr.height)) { const ps = getComputedStyle(t).position, pb = getComputedStyle(b).position; if (ps === 'static' && pb === 'static') continue; add('btn-overlap', b, br); break; }
    }
    if (opt.mobile) { // vùng chạm nhỏ (bỏ link nằm trong đoạn văn)
      const cs = getComputedStyle(b); if (cs.display === 'inline' && b.closest('p,li,small,span,label')) continue;
      if (/^(checkbox|radio)$/.test(b.type) && b.closest('label')) continue;
      const af = getComputedStyle(b, '::after'), ext = af.content !== 'none' && af.position === 'absolute' ? Math.min(parseFloat(af.minWidth) || 0, parseFloat(af.minHeight) || 0) : 0, m = Math.max(Math.min(br.width, br.height), ext);
      if (m < 40) add(m < 32 ? 'tap<32' : 'tap<40', b, br);
    }
  }
  return out;
}

// Máy dò icon tàng hình: icon SVG trong nút có màu gần trùng nền nút (vd. icon trắng trên nút trắng ở thẻ đáp án)
function icons() {
  const out = [], lum = c => { const m = String(c).match(/[\d.]+/g); if (!m || m.length < 3) return null; const [r, g, b, a = 1] = m.map(Number); if (a < 0.5) return null; const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = e => { for (let p = e; p; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.backgroundImage !== 'none') return null; const l = lum(cs.backgroundColor); if (l !== null) return l; } return 1; };
  const sel = e => e.tagName.toLowerCase() + [...e.classList].slice(0, 2).map(c => '.' + c).join('') + (e.id && !/\d/.test(e.id) ? '#' + e.id : '');
  for (const s of document.querySelectorAll('button svg, a svg, .btn svg, [role=button] svg')) {
    const r = s.getBoundingClientRect(); if (r.width < 6 || r.height < 6) continue;
    const b = s.closest('button,a,.btn,[role=button]'), cs = getComputedStyle(s); if (cs.visibility === 'hidden' || +cs.opacity === 0 || b.closest('[aria-hidden="true"]')) continue;
    if ([...s.querySelectorAll('[fill]')].some(p => !/^(none|currentcolor)$/i.test(p.getAttribute('fill')))) continue; // logo nhiều màu (vd. chữ G của Google) tự mang màu riêng
    let col = cs.stroke && cs.stroke !== 'none' && !/url/.test(cs.stroke) ? cs.stroke : cs.fill && cs.fill !== 'none' && !/url/.test(cs.fill) ? cs.fill : cs.color;
    const il = lum(col), bl = bgOf(s.parentElement); if (il === null || bl === null) continue;
    const cr = (Math.max(il, bl) + 0.05) / (Math.min(il, bl) + 0.05);
    if (cr < 1.6) out.push({ t: 'icon-invisible', k: (b.parentElement ? sel(b.parentElement) + ' > ' : '') + sel(b), x: (b.getAttribute('aria-label') || b.innerText || '').trim().slice(0, 50) + ' (tương phản ' + cr.toFixed(2) + ')', r: [r.left + scrollX, r.top + scrollY, r.width, r.height].map(Math.round) });
  }
  return out;
}

// ---- Trạng thái tương tác (sheet đáp án, modal, toast, xp, nhắc cài đặt, tra từ khi bôi đen) × chế độ thường / body.focus / RTL
const STATES = [
  ['practice/learn', 'answer'], ['review', 'answer'], ['practice/test?src=topic:education', 'answer'], ['practice/test?src=topic:education', 'answer-wrong'], ['practice/mcq?src=topic:education', 'answer'], ['practice/mcq?src=topic:education', 'answer-wrong'], ['home', 'modal'], ['home', 'acct'], ['settings', 'signed'], ['me', 'signed'], ['home', 'toast'], ['home', 'xp'], ['home', 'nudge'], ['dict/hello', 'select'],
  ['home', 'focus-modal'], ['home', 'focus-toast'],
];
async function act(page, kind) {
  await page.evaluate(async kind => {
    const W = window, U = W.UI || {}, wait = ms => new Promise(r => setTimeout(r, ms)), vis = e => e && e.getBoundingClientRect().width > 0;
    if (kind.startsWith('focus-')) { document.body.classList.add('focus'); kind = kind.slice(6); }
    if (kind === 'answer-wrong') { const inp = [...document.querySelectorAll('#view input[type=text], #view input:not([type])')].find(vis); if (inp) { inp.value = 'zzqx'; inp.dispatchEvent(new Event('input', { bubbles: true })); const ck = [...document.querySelectorAll('#view .btn.primary, #view button[type=submit]')].find(vis); if (ck) ck.click(); } else { const o = [...document.querySelectorAll('#view .option, #view .choice, #view [data-opt]')].filter(vis); if (o.length) o[o.length - 1].click(); } await wait(600); kind = 'answer'; }
    if (kind === 'answer') for (let i = 0; i < 3 && !document.querySelector('.sheet'); i++) { const b = [...document.querySelectorAll('#view .option, #view .choice, #view [data-opt], #view .btn.primary')].find(vis); if (!b) break; b.click(); await wait(500); }
    if (kind === 'signed' && W.Sync) { W.Sync.user = W.Sync.user || { uid: 'vqa', displayName: 'Visual QA Learner', email: 'visual.qa.learner@example.com' }; W.Sync.driveOffer = true; const h = location.hash; location.hash = '#/home'; await wait(400); location.hash = h; await wait(1200); } // trạng thái đã đăng nhập (nút Drive, Đăng xuất…)
    if (kind === 'acct' && W.Sync && W.Account) { W.Sync.user = W.Sync.user || { uid: 'vqa', displayName: 'Visual QA', email: 'vqa@example.com' }; const b = document.getElementById('avatarBtn') || document.querySelector('.top-stats .avatar, .top-stats .gsi'); try { W.Account.toggle(b); } catch (e) {} await wait(400); }
    if (kind === 'modal' && U.modal) U.modal('<h3>Ngày bị khoá · Locked day</h3><p>Hoàn thành ngày trước để mở khoá ngày này. Complete the previous day first to unlock.</p><button class="btn primary">OK</button>');
    if (kind === 'toast' && U.toast) U.toast('Đã lưu vào bộ thẻ của bạn · Saved to your deck — a longer notification text to check wrapping', 15000);
    if (kind === 'xp' && U.xpFloat) U.xpFloat(10, [...document.querySelectorAll('#view .btn')].find(vis));
    if (kind === 'nudge' && W.App && W.App.installNudge) try { W.App.installNudge(); } catch (e) {}
    if (kind === 'select') { const el = [...document.querySelectorAll('#view .ex, #view p, #view li')].find(e => vis(e) && e.textContent.trim().length > 12); if (el) { const r = document.createRange(); r.selectNodeContents(el.firstChild || el); getSelection().removeAllRanges(); getSelection().addRange(r); const b = el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: b.left + 10, clientY: b.top + 5 })); document.dispatchEvent(new Event('selectionchange')); } }
  }, kind).catch(() => {});
  await page.waitForTimeout(700);
}
// Máy dò lớp phủ cố định: lệch tâm so với cột nội dung/màn hình, che nội dung không cuộn tới được, đè thanh điều hướng dưới, tràn mép
function overlays() {
  const out = [], W = innerWidth, H = innerHeight, view = document.getElementById('view'), vr = view && view.getBoundingClientRect();
  const sel = e => e.tagName.toLowerCase() + [...e.classList].slice(0, 2).map(c => '.' + c).join('') + (e.id ? '#' + e.id : '');
  const add = (t, e, r) => out.push({ t, k: (document.body.classList.contains('focus') ? 'body.focus ' : '') + sel(e), x: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 50), r: [r.left, r.top, r.width, r.height].map(Math.round) });
  const nav = document.querySelector('.bottom-nav'), nr = nav && getComputedStyle(nav).display !== 'none' && nav.getBoundingClientRect();
  scrollTo(0, 1e6);
  for (const e of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(e); if (cs.position !== 'fixed' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    if (e.closest('.topbar,.sidebar,.bottom-nav') || e.parentElement.closest('[style*="fixed"]')) continue;
    const r = e.getBoundingClientRect(); if (r.width < 40 || r.height < 16 || r.bottom <= 0 || r.top >= H) continue;
    if (r.width >= W - 2 && r.height >= H - 2) continue; // màn phủ toàn trang (nền modal)
    const c = (r.left + r.right) / 2;
    if (r.left < -1 || r.right > W + 1) add('ovl-offscreen', e, r);
    else if (!e.matches('.sel-bar,.sel-pop,.xp-float,[class*="tip"]') && vr && Math.abs(c - (vr.left + vr.right) / 2) > 8 && Math.abs(c - W / 2) > 8 && r.width > W * 0.3) add('ovl-offcentre', e, r);
    if (nr && nr.height && e !== nav && r.bottom > nr.top + 2 && r.top < nr.bottom && r.right > nr.left && r.left < nr.right && +cs.zIndex < +getComputedStyle(nav).zIndex + 1 && r.top > nr.top - 200) add('ovl-on-nav', e, r);
    if (view && r.bottom >= H - 2 && r.top > H * 0.3) for (const b of view.querySelectorAll('button,a[href],input,.option')) { if (e.contains(b)) continue; const br = b.getBoundingClientRect(); if (br.width < 2 || br.top < r.top || br.top > H) continue; const hit = document.elementFromPoint(br.left + br.width / 2, br.top + Math.min(br.height / 2, 6)); if (hit && e.contains(hit)) { add('ovl-covers', e, r); break; } }
  }
  scrollTo(0, 0);
  return out;
}
async function runStates(browser, c) {
  const { ctx, page } = await openCombo(browser, c);
  for (const [route, kind] of STATES) {
    try { await visit(page, c, route); await act(page, kind); pages++; rec(c, route + ' [' + kind + ']', [...await page.evaluate(overlays), ...await page.evaluate(icons), ...await page.evaluate(detect, kind === 'signed' ? { mobile: c.v === 'm', rtl: c.l === 'ar' } : { only: 'align' })]); }
    catch (e) { errs.push(`${tagOf(c)} ${route}[${kind}]: ${String(e.message).split('\n')[0].slice(0, 100)}`); }
  }
  await ctx.close();
}

const groups = new Map(); let pages = 0; const errs = [];
const tagOf = c => `${c.v}${VPS[c.v].width}-${c.s}-${c.l}`;
function rec(c, route, list) { for (const it of list) { const key = it.t + ' | ' + it.k; let g = groups.get(key); if (!g) groups.set(key, g = { t: it.t, k: it.k, n: 0, where: new Set(), ex: null }); g.n++; g.where.add(tagOf(c) + ' #/' + route); if (!g.ex) g.ex = { c, route, x: it.x, r: it.r }; } }
const STILL = '*,*::before,*::after{animation:none!important;transition:none!important}#toast,.lkr-toast,body>canvas{display:none!important}';

async function openCombo(browser, c) {
  const vp = VPS[c.v];
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, colorScheme: c.s, locale: c.l, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(`${tagOf(c)}: ${String(e.message).slice(0, 120)}`));
  await page.goto(`${BASE}/app/?sandbox=1&hl=${c.l}#/welcome/setup`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForSelector('#obNext, #go', { timeout: 8000 }).catch(() => {}); for (let i = 0; i < 8 && !(await page.$('#go')) && (await page.$('#obNext')); i++) { await page.click('#obNext').catch(() => {}); await page.waitForTimeout(150); } const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await page.waitForTimeout(1800); } // thiết lập từng bước (onboard.js): Tiếp tục tới màn cuối rồi Bắt đầu
  return { ctx, page };
}
async function visit(page, c, route) {
  if (route === 'landing') await page.goto(`${BASE}/${c.l === 'vi' ? '' : c.l + '/'}`, { waitUntil: 'networkidle' }).catch(() => {});
  else { if (!page.url().includes('/app/')) await page.goto(`${BASE}/app/?sandbox=1&hl=${c.l}#/home`, { waitUntil: 'networkidle' }).catch(() => {}); await page.evaluate(h => { location.hash = h; scrollTo(0, 0); }, '#/' + route); await page.waitForTimeout(900); }
  await page.addStyleTag({ content: STILL }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
}
async function runCombo(browser, c) {
  const { ctx, page } = await openCombo(browser, c);
  for (const route of [...ROUTES, 'landing']) {
    try {
      await visit(page, c, route); pages++;
      const list = [...await page.evaluate(detect, { mobile: c.v === 'm', rtl: c.l === 'ar' }), ...await page.evaluate(icons)];
      if (c.v !== 't') { // tương phản màu (axe) ở 375 và 1440
        if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
        const v = await page.evaluate(async () => { const r = await axe.run(document, { runOnly: ['color-contrast'], resultTypes: ['violations'] }); return r.violations.flatMap(x => x.nodes.map(n => ({ s: n.target.join(' '), x: (n.any[0] && n.any[0].message || '').slice(0, 90) }))); });
        for (const n of v) { const s = n.s.replace(/:nth-child\(\d+\)/g, '').split(' > ').slice(-2).join(' > '); list.push({ t: 'contrast-' + c.s, k: s, x: n.x, r: await page.evaluate(q => { const e = document.querySelector(q); if (!e) return [0, 0, 0, 0]; const r = e.getBoundingClientRect(); return [r.left + scrollX, r.top + scrollY, r.width, r.height].map(Math.round); }, n.s).catch(() => [0, 0, 0, 0]) }); }
      }
      rec(c, route, list);
    } catch (e) { errs.push(`${tagOf(c)} #/${route}: ${String(e.message).split('\n')[0].slice(0, 100)}`); }
  }
  await ctx.close();
}

const browser = await chromium.launch();
const stateCombos = []; for (const v of QUICK ? ['m', 'd'] : ['m', 't', 'd']) for (const l of ['en', 'ar']) for (const sc of v === 'm' ? ['light', 'dark'] : ['light']) stateCombos.push({ v, s: sc, l });
const queue = [...combos, ...stateCombos.map(c => ({ ...c, states: 1 }))]; await Promise.all([0, 1, 2].map(async () => { while (queue.length) { const c = queue.shift(); await (c.states ? runStates : runCombo)(browser, c); } }));

// ---- Báo cáo + ảnh cắt cho nhóm lỗi đầu bảng
const order = ['icon-invisible', 'clipped', 'list-misaligned', 'ovl-offcentre', 'ovl-offscreen', 'ovl-covers', 'ovl-on-nav', 'hscroll', 'squeezed', 'btn-overlap', 'overflow-x', 'ellipsis-no-title', 'rtl-text-left', 'rtl-arrow', 'contrast-dark', 'contrast-light', 'tap<32', 'tap<40'];
const list = [...groups.values()].sort((a, b) => order.indexOf(a.t) - order.indexOf(b.t) || b.where.size - a.where.size);
const byType = {}; for (const g of list) byType[g.t] = (byType[g.t] || 0) + 1;
const SHOTS = +(process.env.VQA_SHOTS || 12); let si = 0;
for (const g of list.filter(g => !g.t.startsWith('tap')).slice(0, SHOTS)) {
  const { c, route, r } = g.ex; if (!r[2]) continue;
  if (g.t.startsWith('ovl')) { try { const [rt, kd] = route.split(' ['); const { ctx, page } = await openCombo(browser, c); await visit(page, c, rt); await act(page, kd.slice(0, -1)); g.shot = `shots/${String(++si).padStart(2, '0')}-${g.t}.jpg`; await page.screenshot({ path: `${OUT}/${g.shot}`, type: 'jpeg', quality: 50 }); await ctx.close(); } catch (e) { errs.push('shot: ' + e.message.split('\n')[0]); } continue; }
  try { const { ctx, page } = await openCombo(browser, c); await visit(page, c, route);
    const pad = 60, clip = { x: Math.max(0, r[0] - pad), y: Math.max(0, r[1] - pad), width: Math.min(VPS[c.v].width, r[2] + pad * 2), height: Math.min(700, r[3] + pad * 2) };
    await page.evaluate(([x, y, w, h]) => { const d = document.createElement('div'); d.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;outline:3px solid #f0f;z-index:99999;pointer-events:none`; document.body.appendChild(d); }, r);
    g.shot = `shots/${String(++si).padStart(2, '0')}-${g.t.replace(/[^a-z0-9-]/gi, '')}.jpg`;
    await page.screenshot({ path: `${OUT}/${g.shot}`, type: 'jpeg', quality: 55, clip, fullPage: true }); await ctx.close();
  } catch (e) { errs.push('shot: ' + e.message.split('\n')[0]); }
}
await browser.close();
const md = [`# Visual QA – ${new Date().toISOString().slice(0, 16)} · ${pages} trang · ${combos.length} tổ hợp`, '', '| loại | số nhóm |', '|---|---|', ...Object.entries(byType).map(([t, n]) => `| ${t} | ${n} |`), '',
  '| loại | selector | số màn | ví dụ | chữ | ảnh |', '|---|---|---|---|---|---|',
  ...list.slice(0, 80).map(g => `| ${g.t} | \`${g.k.replace(/\|/g, '/')}\` | ${g.where.size} | ${g.ex.c && tagOf(g.ex.c)} #/${g.ex.route} | ${g.ex.x.replace(/\|/g, '/')} | ${g.shot || ''} |`),
  '', errs.length ? `Lỗi chạy (${errs.length}): ` + [...new Set(errs)].slice(0, 10).join(' · ') : ''];
fs.writeFileSync(OUT + '/report.md', md.join('\n'));
fs.writeFileSync(OUT + '/report.json', JSON.stringify({ byType, groups: list.map(g => ({ t: g.t, k: g.k, screens: g.where.size, ex: [...g.where].slice(0, 4), x: g.ex.x })) }));
console.log(md.slice(0, 4 + Object.keys(byType).length).join('\n'));
let fail = 0; try { const bud = JSON.parse(fs.readFileSync(new URL('./visual-qa.budget.json', import.meta.url))); for (const [t, max] of Object.entries(bud)) if ((byType[t] || 0) > max) { fail++; console.log(`✗ ${t}: ${byType[t]} nhóm > ngưỡng ${max}`); } } catch (e) {}
console.log(fail ? `✗ visual-qa: ${fail} loại vượt ngưỡng` : '✓ visual-qa: trong ngưỡng');
process.exit(fail && !QUICK ? 1 : 0);
