// 📱 Soát WEB MOBILE như app lớn (chạy trên GitHub Actions – mobile-qa.yml, KHÔNG chạy nặng trên Mac):
//   • tràn ngang ở 360/390/412 px · vùng chạm ≥ 44 px · safe-area (thanh cố định sát mép trên/dưới phải chừa env(safe-area-inset-*))
//   • bàn phím ảo: ô nhập được focus khi màn hình thấp lại (bàn phím ~42 %) phải nằm trong vùng nhìn thấy và không bị lớp cố định che;
//     ô nhập nằm trong khối cố định sát đáy là lỗi (Chrome Android mặc định resizes-visual: khối cố định nằm SAU bàn phím)
//   • CLS khi đổi màn/tương tác + INP (Event Timing, CPU chậm 4×) trên quiz & ôn tập · Lighthouse mobile (LCP/CLS/TBT) – bật bằng MQA_LH=1
//   • thẻ kết quả luyện tập + ô "Cơ hội thứ 2"/"Nhân đôi XP" (web/js/ad-offers.js) nếu có trong bản dựng
// Chạy: node scripts/test/mobile-qa.mjs http://localhost:8080 out/mobile-qa   → report.json + REPORT.md; thoát 1 nếu vượt mobile-qa.budget.json.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:8080', OUT = process.argv[3] || 'out/mobile-qa';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BUDGET = JSON.parse(fs.readFileSync(new URL('./mobile-qa.budget.json', import.meta.url), 'utf8'));
const LH = process.env.MQA_LH === '1', WEB = process.env.MQA_WEB || ROOT + 'web';
fs.mkdirSync(OUT, { recursive: true });
const VPS = [{ w: 360, h: 740 }, { w: 390, h: 844 }, { w: 412, h: 915 }];
const ROUTES = ['home', 'path', 'review', 'dict/hello', 'me', 'practice/mcq?src=topic:education', 'practice/test?src=topic:education'];
const issues = [], perf = [], errs = [], seen = new Set();
let pages = 0, offerSeen = 0;
const add = (vp, route, list) => { for (const it of list) { const k = it.t + '|' + it.k + '|' + route; if (seen.has(k)) continue; seen.add(k); issues.push({ ...it, vp, route }); } };

// ---- Máy dò chạy trong trang
function detect() {
  const out = [], W = innerWidth, H = innerHeight;
  const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return null; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity === 0 || cs.display === 'none') return null; return r; };
  const sel = e => { const one = x => x.tagName.toLowerCase() + [...x.classList].filter(c => !/^(on|active|show|open|is-|has-|sel|done|cur)/.test(c)).slice(0, 2).map(c => '.' + c).join('') + (x.id && !/\d/.test(x.id) ? '#' + x.id : ''); let p = e.parentElement; while (p && !p.classList.length && !p.id && p !== document.body) p = p.parentElement; return (p && p !== document.body ? one(p) + ' > ' : '') + one(e); };
  const push = (t, e, r, x) => out.push({ t, k: sel(e), x: (x || (e.innerText || e.value || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()).slice(0, 60), r: [r.left, r.top + scrollY, r.width, r.height].map(Math.round) });
  const scroller = e => { for (let p = e; p && p !== document.body; p = p.parentElement) { const ox = getComputedStyle(p).overflowX; if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return p; } return null; };
  // 1) tràn ngang cả trang
  if (document.scrollingElement.scrollWidth > W + 1) {
    let worst = null; for (const e of document.body.querySelectorAll('*')) { const r = vis(e); if (!r || scroller(e.parentElement)) continue; if (r.right > W + 1 || r.left < -1) worst = e; }
    push('hscroll', worst || document.body, (worst || document.body).getBoundingClientRect(), 'scrollWidth ' + document.scrollingElement.scrollWidth + ' > ' + W);
  }
  // 2) vùng chạm ≥ 44 px (bỏ link nằm trong đoạn văn – ngoại lệ WCAG 2.5.8 inline)
  for (const b of document.querySelectorAll('a[href],button,[role=button],[role=tab],[role=switch],input:not([type=hidden]),select,textarea,summary,.option,.chip,.btn')) {
    const r = vis(b); if (!r || b.closest('[aria-hidden="true"],[inert]')) continue;
    if (r.bottom < 0 || r.top > document.scrollingElement.scrollHeight) continue;
    const cs = getComputedStyle(b); if (cs.display === 'inline' && b.closest('p,li,small,span,label,h1,h2,h3,td')) continue;
    if (/^(checkbox|radio)$/.test(b.type) && b.closest('label')) continue;
    if (b.tagName === 'A' && b.closest('button,.btn') && b.closest('button,.btn') !== b) continue;
    const af = getComputedStyle(b, '::after'), ext = af.content !== 'none' && af.position === 'absolute' ? Math.min(parseFloat(af.minWidth) || 0, parseFloat(af.minHeight) || 0) : 0;
    const m = Math.max(Math.min(r.width, r.height), ext);
    if (m < 44 - 0.5) push('tap<44', b, r, Math.round(r.width) + '×' + Math.round(r.height) + ' ' + (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40));
  }
  // 3) safe-area: phần tử fixed/sticky chạm mép trên/dưới phải có luật env(safe-area-inset-*) cho chính nó hoặc con của nó
  const saRules = []; for (const ss of document.styleSheets) { let rs; try { rs = ss.cssRules; } catch (e) { continue; } const walk = list => { for (const r of list) { if (r.cssRules && !r.selectorText) walk(r.cssRules); else if (r.selectorText && /safe-area-inset-(top|bottom)/.test(r.cssText)) saRules.push([r.selectorText, /safe-area-inset-top/.test(r.cssText), /safe-area-inset-bottom/.test(r.cssText)]); } }; walk(rs); }
  const hasSA = (e, edge) => { const ok = x => (x.getAttribute('style') || '').includes('safe-area-inset-' + edge) || saRules.some(([s, top, bot]) => (edge === 'top' ? top : bot) && (() => { try { return x.matches(s); } catch (er) { return false; } })()); if (ok(e)) return true; for (const c of e.querySelectorAll('*')) if (ok(c)) return true; for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) if (ok(p)) return true; return false; };
  for (const e of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(e); if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
    const r = vis(e); if (!r || r.width < W * 0.5 || r.height > H * 0.9 || e.closest('.sheet-bg,.modal-bg,.toast,.xp-float,[class*="confetti"]') && r.height < 4) continue;
    if (cs.position === 'fixed' && r.bottom >= H - 1 && r.top > H * 0.4 && !hasSA(e, 'bottom')) push('safe-area-bottom', e, r);
    if (r.top <= 1 && r.bottom < H * 0.4 && (cs.position === 'fixed' || cs.position === 'sticky' && r.top <= 0.5) && !hasSA(e, 'top')) push('safe-area-top', e, r);
  }
  // 4) ô nhập trong khối cố định sát đáy (bàn phím ảo Android resizes-visual sẽ che)
  for (const i of document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]),textarea,[contenteditable="true"]')) {
    const r = vis(i); if (!r) continue;
    for (let p = i; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.position === 'fixed') { const pr = p.getBoundingClientRect(); if (pr.bottom >= H - 2 && pr.top > H * 0.35 && !document.documentElement.dataset.vkFix) push('kbd-fixed-input', i, r); break; } }
  }
  return out;
}

// Bàn phím ảo: thu viewport còn 58 % rồi focus từng ô nhập → ô phải nằm trong màn & không bị lớp cố định che
async function keyboard(page, vp) {
  const n = await page.evaluate(() => [...document.querySelectorAll('#view input[type=text],#view input[type=search],#view input:not([type]),#view input[type=email],#view textarea')].filter(e => e.getBoundingClientRect().width > 2).length);
  if (!n) return [];
  const out = [];
  await page.setViewportSize({ width: vp.w, height: Math.round(vp.h * 0.58) });
  for (let i = 0; i < Math.min(n, 3); i++) {
    const r = await page.evaluate(async i => {
      const el = [...document.querySelectorAll('#view input[type=text],#view input[type=search],#view input:not([type]),#view input[type=email],#view textarea')].filter(e => e.getBoundingClientRect().width > 2)[i];
      if (!el) return null; el.focus(); await new Promise(r => setTimeout(r, 450));
      const vv = window.visualViewport, H = vv ? vv.height : innerHeight, b = el.getBoundingClientRect();
      const cx = b.left + Math.min(b.width / 2, 20), cy = b.top + b.height / 2, hit = document.elementFromPoint(cx, cy);
      const sel = e => e.tagName.toLowerCase() + [...e.classList].slice(0, 2).map(c => '.' + c).join('') + (e.id ? '#' + e.id : '');
      const bad = b.bottom > H + 1 || b.top < -1 ? 'ngoài màn (top ' + Math.round(b.top) + ', đáy màn ' + Math.round(H) + ')' : hit && hit !== el && !el.contains(hit) && !hit.contains(el) && !(el.labels && [...el.labels].includes(hit)) ? 'bị che bởi ' + sel(hit) : '';
      el.blur(); return bad ? { t: 'kbd-cover', k: sel(el), x: bad, r: [b.left, b.top, b.width, b.height].map(Math.round) } : null;
    }, i).catch(() => null);
    if (r) out.push(r);
  }
  await page.setViewportSize({ width: vp.w, height: vp.h });
  return out;
}

async function open(browser, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(`${vp.w} pageerror: ${String(e.message).slice(0, 120)}`));
  await page.addInitScript(() => {
    window.__cls = 0; window.__ev = [];
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.interactionId) window.__ev.push([e.interactionId, e.duration, e.name, e.target && e.target.className || '']); }).observe({ type: 'event', durationThreshold: 16, buffered: true }); } catch (e) {}
  });
  await page.goto(`${BASE}/app/?sandbox=1&hl=en#/welcome/setup`, { waitUntil: 'networkidle' }).catch(() => {});
  return { ctx, page };
}
async function visit(page, route) {
  await page.evaluate(h => { location.hash = h; scrollTo(0, 0); }, '#/' + route);
  await page.waitForTimeout(1100);
}
// Trả lời hết quiz (câu đầu SAI để có câu cần ôn → ô "Cơ hội thứ 2"), đo INP; trả về true nếu tới thẻ kết quả
async function playQuiz(page) {
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate(async i => {
      if (document.querySelector('#view .score-ring')) return 'done';
      const vis = e => e && e.getBoundingClientRect().width > 0 && !e.disabled;
      const inp = [...document.querySelectorAll('#view input[type=text],#view input:not([type])')].find(vis);
      if (inp) { inp.value = i === 0 ? 'zzqx' : (inp.dataset.a || 'zzqx'); inp.dispatchEvent(new Event('input', { bubbles: true })); const ck = [...document.querySelectorAll('#view .btn.primary,#view button[type=submit]')].find(vis); if (ck) ck.click(); else inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return 'typed'; }
      const opts = [...document.querySelectorAll('#view .option')].filter(vis);
      if (opts.length) return 'opt' + (i === 0 ? opts.length - 1 : 0);
      const nx = [...document.querySelectorAll('#view .btn.primary,#view .btn')].find(e => vis(e) && !/^#\//.test(e.getAttribute('href') || ''));
      if (nx) { nx.click(); return 'next'; }
      return 'stuck';
    }, i).catch(() => 'err');
    if (st === 'done') return true;
    if (st === 'stuck' || st === 'err') return false;
    if (st.startsWith('opt')) { const k = +st.slice(3); await page.locator('#view .option').nth(k).tap().catch(() => page.locator('#view .option').nth(k).click()); }
    await page.waitForTimeout(st === 'next' ? 300 : 1300);
  }
  return false;
}
const inpOf = ev => { const by = new Map(); for (const [id, d] of ev) by.set(id, Math.max(by.get(id) || 0, d)); const v = [...by.values()].sort((a, b) => b - a); return v.length ? v[Math.min(v.length - 1, Math.floor(v.length / 50))] : 0; };

const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const hasOffer = fs.existsSync(WEB + '/js/ad-offers.js');
for (const vp of VPS) {
  const { ctx, page } = await open(browser, vp);
  const cdp = await ctx.newCDPSession(page);
  for (const route of ROUTES) {
    try {
      await page.evaluate(() => { window.__cls = 0; window.__ev = []; });
      await visit(page, route); pages++;
      add(vp.w, route, await page.evaluate(detect));
      add(vp.w, route, await keyboard(page, vp));
      if (route.startsWith('practice/') || route === 'review') {
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await page.evaluate(() => { window.__ev = []; });
        let done = false;
        if (route === 'review') {
          for (let i = 0; i < 6; i++) { const b = page.locator('#view .flash, #view .btn.primary').first(); if (!(await b.count())) break; await b.tap().catch(() => {}); await page.waitForTimeout(500); const g = page.locator('#view [data-g], #view .grade .btn, #view .option').first(); if (await g.count()) { await g.tap().catch(() => {}); await page.waitForTimeout(500); } }
        } else done = await playQuiz(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
        const m = await page.evaluate(() => ({ cls: window.__cls, ev: window.__ev }));
        perf.push({ vp: vp.w, route, cls: +m.cls.toFixed(4), inp: Math.round(inpOf(m.ev)), n: new Set(m.ev.map(e => e[0])).size, worst: m.ev.sort((a, b) => b[1] - a[1])[0] || null });
        if (route.startsWith('practice/')) {
          if (!done) { errs.push(`${vp.w} ${route}: không tới được thẻ kết quả`); continue; }
          await page.waitForTimeout(1500); // chờ bundle adoffer tải lười
          const offer = await page.evaluate(() => !!document.querySelector('#aoHost .ad-offer'));
          if (offer) offerSeen++;
          add(vp.w, route + ' [kết quả]', await page.evaluate(detect));
          if (offer && vp.w === 360) await page.locator('.ad-offer').screenshot({ path: `${OUT}/ad-offer-${route.split('/')[1].split('?')[0]}-360.png` }).catch(() => {});
          // Nhân đôi XP chỉ hiện khi có video → giả lập Ads có video để soát bố cục cả 2 ô
          if (hasOffer) {
            const both = await page.evaluate(async () => {
              const h = document.getElementById('aoHost'); if (!h || !window.AdOffers) return false;
              const real = window.Ads; window.Ads = { rewarded: async () => true, on: () => true, slot: () => '' };
              h.innerHTML = ''; await window.AdOffers.attach(h, { wrong: 1, total: 10, score: 9, pct: 90, unit: false, xp: 42 });
              window.Ads = real; return h.querySelectorAll('.ao-row').length;
            }).catch(() => false);
            if (both !== 2) errs.push(`${vp.w} ${route}: ô "Nhân đôi XP" không dựng được (${both})`);
            else { offerSeen++; add(vp.w, route + ' [kết quả+x2]', await page.evaluate(detect)); if (vp.w === 360) await page.locator('.ad-offer').screenshot({ path: `${OUT}/ad-offer-both-360.png` }).catch(() => {}); }
          }
        }
      } else {
        const cls = await page.evaluate(() => window.__cls);
        perf.push({ vp: vp.w, route, cls: +cls.toFixed(4), inp: null });
      }
    } catch (e) { errs.push(`${vp.w} #/${route}: ${String(e.message).split('\n')[0].slice(0, 120)}`); }
  }
  await ctx.close();
}
await browser.close();

// ---- Lighthouse mobile (giả lập 4G chậm + CPU 4×) cho từng route – lần tải lạnh
const lh = [];
if (LH) for (const route of ['home', 'path', 'review', 'dict/hello', 'me', 'practice/mcq?src=topic:education']) {
  const f = `${OUT}/lh-${route.replace(/[^a-z]+/g, '_')}.json`;
  const runs = [];
  for (let i = 0; i < 3; i++) {
    try { execFileSync('npx', ['-y', 'lighthouse@12.2.1', `${BASE}/app/?sandbox=1&hl=en#/${route}`, '--form-factor=mobile', '--only-categories=performance,accessibility', '--chrome-flags=--headless=new --no-sandbox', '--output=json', `--output-path=${f}`, '--quiet'], { stdio: 'ignore', timeout: 180e3 }); } catch (e) { continue; }
    const d = JSON.parse(fs.readFileSync(f, 'utf8')), a = d.audits;
    runs.push({ route, perf: Math.round(d.categories.performance.score * 100), a11y: Math.round(d.categories.accessibility.score * 100), lcp: Math.round(a['largest-contentful-paint'].numericValue), cls: +a['cumulative-layout-shift'].numericValue.toFixed(4), tbt: Math.round(a['total-blocking-time'].numericValue), fcp: Math.round(a['first-contentful-paint'].numericValue), tap: a['target-size'] ? a['target-size'].score : null });
  }
  if (!runs.length) { errs.push('lighthouse lỗi: ' + route); continue; }
  runs.sort((x, y) => x.lcp - y.lcp); lh.push(runs[Math.floor((runs.length - 1) / 2)]); // trung vị
}

// ---- Tổng hợp + cổng ngân sách
const count = {}; for (const i of issues) count[i.t] = (count[i.t] || 0) + 1;
const maxCls = Math.max(0, ...perf.map(p => p.cls), ...lh.map(l => l.cls)), maxInp = Math.max(0, ...perf.map(p => p.inp || 0)), maxLcp = Math.max(0, ...lh.map(l => l.lcp)), maxTbt = Math.max(0, ...lh.map(l => l.tbt));
const fails = [];
for (const k of ['hscroll', 'tap<44', 'safe-area-top', 'safe-area-bottom', 'kbd-cover', 'kbd-fixed-input']) if ((count[k] || 0) > BUDGET[k]) fails.push(`${k}: ${count[k]} > ${BUDGET[k]}`);
if (maxCls > BUDGET.cls) fails.push(`CLS ${maxCls} > ${BUDGET.cls}`);
if (maxInp > BUDGET.inp_ms) fails.push(`INP ${maxInp} ms > ${BUDGET.inp_ms}`);
if (LH && maxLcp > BUDGET.lcp_ms) fails.push(`LCP ${maxLcp} ms > ${BUDGET.lcp_ms}`);
if (LH && maxTbt > BUDGET.tbt_ms) fails.push(`TBT ${maxTbt} ms > ${BUDGET.tbt_ms}`);
if (pages < VPS.length * ROUTES.length * 0.9) fails.push(`chỉ soát được ${pages}/${VPS.length * ROUTES.length} trang`); // không cho xanh khi chạy rỗng
if (perf.filter(p => p.inp !== null && p.n > 0).length < VPS.length) fails.push('không đo được INP (0 tương tác)');
if (hasOffer && offerSeen < VPS.length) fails.push(`ô Cơ hội thứ 2/Nhân đôi XP chỉ soát được ${offerSeen} lần`);
if (LH && lh.length < 4) fails.push(`Lighthouse chỉ chạy được ${lh.length} route`);
if (errs.some(e => /không tới được thẻ kết quả|Nhân đôi XP/.test(e))) fails.push('luồng quiz/kết quả lỗi');

const report = { at: new Date().toISOString(), pages, count, maxCls, maxInp, maxLcp, maxTbt, lh, perf, issues, errs, fails, hasOffer, offerSeen };
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
const md = [`# Mobile QA – ${pages} trang × ${VPS.map(v => v.w).join('/')} px`, '',
  `**Kết quả:** ${fails.length ? '❌ ' + fails.join(' · ') : '✅ đạt ngân sách'}`, '',
  `| Chỉ số | Giá trị | Ngưỡng |`, `|---|---|---|`,
  ...['hscroll', 'tap<44', 'safe-area-top', 'safe-area-bottom', 'kbd-cover', 'kbd-fixed-input'].map(k => `| ${k} | ${count[k] || 0} | ${BUDGET[k]} |`),
  `| CLS tối đa (đổi màn + tương tác${LH ? ' + LH' : ''}) | ${maxCls} | ${BUDGET.cls} |`, `| INP (CPU 4×) | ${maxInp} ms | ${BUDGET.inp_ms} ms |`,
  ...(LH ? [`| LCP Lighthouse tối đa | ${maxLcp} ms | ${BUDGET.lcp_ms} ms |`, `| TBT Lighthouse tối đa | ${maxTbt} ms | ${BUDGET.tbt_ms} ms |`] : []), '',
  ...(lh.length ? ['## Lighthouse mobile', '| route | perf | a11y | LCP | CLS | TBT |', '|---|---|---|---|---|---|', ...lh.map(l => `| ${l.route} | ${l.perf} | ${l.a11y} | ${l.lcp} | ${l.cls} | ${l.tbt} |`), ''] : []),
  '## INP / CLS theo màn', '| vp | route | CLS | INP | tương tác | chậm nhất |', '|---|---|---|---|---|---|', ...perf.map(p => `| ${p.vp} | ${p.route} | ${p.cls} | ${p.inp ?? ''} | ${p.n ?? ''} | ${p.worst ? Math.round(p.worst[1]) + ' ms ' + p.worst[2] + ' ' + String(p.worst[3]).slice(0, 30) : ''} |`), '',
  `## Lỗi (${issues.length})`, '| loại | phần tử | vp | route | chi tiết |', '|---|---|---|---|---|', ...issues.slice(0, 150).map(i => `| ${i.t} | \`${i.k.replace(/\|/g, '/')}\` | ${i.vp} | ${i.route} | ${String(i.x).replace(/\|/g, '/')} |`), '',
  ...(errs.length ? ['## Lỗi chạy', ...errs.slice(0, 30).map(e => '- ' + e)] : []), `\nÔ Cơ hội thứ 2/x2 XP: ${hasOffer ? offerSeen + ' lần soát' : 'chưa có trong bản dựng'}`].join('\n');
fs.writeFileSync(`${OUT}/REPORT.md`, md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
console.log(md.split('\n').slice(0, 20).join('\n'));
if (fails.length && process.env.MQA_REPORT_ONLY !== '1') process.exit(1);
