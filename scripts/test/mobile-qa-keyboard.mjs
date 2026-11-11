// ⌨️ Bàn phím ảo KHÔNG BAO GIỜ che ô đang nhập (web mobile + app Capacitor dùng chung mã – sửa ở đây đi qua OTA). Chạy trên CI (mobile-qa.yml), không chạy trên Mac.
// Hai mô hình bàn phím, mỗi khổ 360/390/412 px:
//   visual  – iOS WKWebView / Chrome Android "resizes-visual": viewport bố cục GIỮ NGUYÊN, chỉ window.visualViewport thấp lại (giả lập bằng shim
//             visualViewport + sự kiện resize, đúng thứ app thật nhận). Trình duyệt cuộn ô focus vào vùng nhìn thấy = scrollIntoView với
//             scroll-padding-bottom = chiều cao bàn phím trên mọi khung cuộn (khối position:fixed không cuộn được → bị che là LỖI thật).
//   content – Android adjustResize: viewport bố cục thấp lại (setViewportSize).
// Mỗi ô nhập hiện trong trang (cả thanh trên #gq, Phòng viết #essay, tra từ #q, ô điền chữ…): focus → mở bàn phím → kiểm
//   (1) ô là document.activeElement; (2) phần đầu ô (≤ 48 px – chỗ con trỏ) nằm TRỌN trong visualViewport; (3) không bị lớp khác che (elementFromPoint);
//   (4) gợi ý tra từ (#suggest) sau khi gõ: mục đầu tiên nằm trên bàn phím. Thiếu độ phủ (Phòng viết, tra từ, thanh trên) → đỏ, không xanh rỗng.
// Chạy: node scripts/test/mobile-qa-keyboard.mjs http://localhost:8080 out/mobile-qa   → keyboard.json + KEYBOARD.md; ngưỡng mobile-qa.budget.json › kbd-visual.
import fs from 'node:fs';
import { chromium } from 'playwright';
import { noProd } from './lib/no-prod.mjs';

const BASE = process.argv[2] || 'http://localhost:8080', OUT = process.argv[3] || 'out/mobile-qa';
const BUDGET = JSON.parse(fs.readFileSync(new URL('./mobile-qa.budget.json', import.meta.url), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const VPS = [{ w: 360, h: 740 }, { w: 390, h: 844 }, { w: 412, h: 915 }];
const KB = 0.42; // bàn phím ≈ 42 % chiều cao (iPhone 390×844: 336 + thanh gợi ý ≈ 45 %; Gboard ≈ 40 %)
const ROUTES = ['home', 'dict', 'dict/hello', 'write', 'paraphrase', 'toefl-p/cw', 'practice/test?src=topic:education', 'me', 'settings', 'class'];
const MUST = [['write', /#essay|textarea/], ['dict', /#q\b|input/], ['*', /#gq/]]; // độ phủ bắt buộc: Phòng viết, tra từ, ô tra từ trên thanh trên
const MAX_PER_ROUTE = 6;
const issues = [], checked = [], errs = [], unreachable = [];

// Shim visualViewport: cùng API (EventTarget, width/height/offsetTop/pageTop/scale, onresize/onscroll); __lkKb(px) mở/đóng bàn phím giả.
function shim() {
  const real = window.visualViewport; let kb = 0;
  class VV extends EventTarget {
    get width() { return real ? real.width : innerWidth; } get height() { return Math.max(0, (real ? real.height : innerHeight) - kb); }
    get offsetTop() { return real ? real.offsetTop : 0; } get offsetLeft() { return real ? real.offsetLeft : 0; }
    get pageTop() { return scrollY + this.offsetTop; } get pageLeft() { return scrollX + this.offsetLeft; } get scale() { return real ? real.scale : 1; }
  }
  const vv = new VV(); let onr = null, ons = null;
  Object.defineProperty(vv, 'onresize', { get: () => onr, set: f => { if (onr) vv.removeEventListener('resize', onr); onr = f; if (f) vv.addEventListener('resize', f); } });
  Object.defineProperty(vv, 'onscroll', { get: () => ons, set: f => { if (ons) vv.removeEventListener('scroll', ons); ons = f; if (f) vv.addEventListener('scroll', f); } });
  if (real) { real.addEventListener('resize', () => vv.dispatchEvent(new Event('resize'))); real.addEventListener('scroll', () => vv.dispatchEvent(new Event('scroll'))); }
  try { Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => vv }); } catch (e) { /* trình duyệt không cho → test báo lỗi chạy */ }
  window.__lkKb = px => { kb = Math.max(0, px | 0); vv.dispatchEvent(new Event('resize')); };
}

// Chạy trong trang: liệt kê ô nhập hiện được (cả ngoài #view)
const LIST = () => {
  const sel = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + [...e.classList].slice(0, 2).map(c => '.' + c).join('');
  const Q = 'input:not([type]),input[type=text],input[type=search],input[type=email],input[type=url],input[type=tel],input[type=number],input[type=password],textarea,[contenteditable="true"]';
  document.querySelectorAll('[data-lk-kbd]').forEach(e => delete e.dataset.lkKbd); // dấu của lượt liệt kê trước còn sót trên ô sống qua đổi trang (thanh trên #gq) → probe(i) có thể trúng nhầm ô cũ, bỏ lỡ ô thật
  return [...document.querySelectorAll(Q)].filter(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility === 'visible' && +cs.opacity > 0 && !e.disabled && !e.readOnly && !e.closest('[hidden],[aria-hidden="true"]'); })
    .map((e, i) => { e.dataset.lkKbd = String(i); return sel(e); });
};

// Chạy trong trang: focus ô i, mở bàn phím theo mô hình, để app + "trình duyệt" phản ứng, rồi đo
async function probe([i, mode, kbPx]) {
  const el = document.querySelector(`[data-lk-kbd="${i}"]`); if (!el) return { gone: true };
  const sel = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + [...e.classList].slice(0, 2).map(c => '.' + c).join('');
  const wait = ms => new Promise(r => setTimeout(r, ms));
  el.scrollIntoView({ block: 'nearest' }); await wait(80); // người dùng chạm được ô → ô đang nằm trong màn hình đầy đủ
  { // ô người dùng KHÔNG chạm tới được kể cả khi chưa có bàn phím (thanh trên ẩn ở màn học, ô sau lớp phủ…) → không phải lỗi bàn phím; đếm riêng
    const b0 = el.getBoundingClientRect(), cy = b0.top + Math.min(b0.height / 2, 22), h0 = cy >= 0 && cy < innerHeight && document.elementFromPoint(b0.left + Math.min(b0.width / 2, 24), cy);
    if (!h0 || !(h0 === el || el.contains(h0) || h0.contains(el) || (el.labels && [...el.labels].includes(h0)))) return { unreachable: sel(el) + ' (' + (h0 ? 'chạm trúng ' + sel(h0) : 'ngoài màn, top ' + Math.round(b0.top)) + ')' };
  }
  el.focus({ preventScroll: true }); await wait(60);
  const padded = [];
  if (mode === 'visual') {
    window.__lkKb(kbPx); await wait(120); // app nhận visualViewport resize như trên máy thật
    // Trình duyệt cuộn ô focus lên trên bàn phím: vùng nhìn thấy của MỌI khung cuộn bị bàn phím ăn mất kbPx ở đáy (khung cuộn trong + trang)
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p), sc = p === document.documentElement || /(auto|scroll|overlay)/.test(cs.overflowY);
      if (!sc) continue;
      const r = p === document.documentElement ? { bottom: innerHeight } : p.getBoundingClientRect(), cut = Math.max(0, r.bottom - (innerHeight - kbPx));
      if (cut > 0) { padded.push([p, p.style.scrollPaddingBottom]); p.style.scrollPaddingBottom = cut + 'px'; }
    }
    el.scrollIntoView({ block: 'nearest' });
  } else el.scrollIntoView({ block: 'nearest' }); // adjustResize: trình duyệt cuộn ô vào viewport đã thấp lại
  await wait(450); // hiệu ứng/handler resize của app
  const vv = window.visualViewport, top = vv.offsetTop, H = vv.height, b = el.getBoundingClientRect();
  const head = Math.min(b.height, 48), out = [];
  if (document.activeElement !== el) out.push('mất focus (activeElement = ' + (document.activeElement ? sel(document.activeElement) : 'null') + ')');
  if (b.top < top - 1 || b.top + head > top + H + 1) out.push(`ngoài vùng nhìn thấy: ô ${Math.round(b.top)}–${Math.round(b.top + head)} px, nhìn thấy ${Math.round(top)}–${Math.round(top + H)} px`);
  else {
    const cx = b.left + Math.min(b.width / 2, 24), cy = b.top + Math.min(b.height / 2, 22), hit = document.elementFromPoint(cx, cy);
    if (hit && hit !== el && !el.contains(hit) && !hit.contains(el) && !(el.labels && [...el.labels].includes(hit))) out.push('bị che bởi ' + sel(hit));
  }
  let sug = '';
  if (el.id === 'gq' && !out.length) { // tra từ: gợi ý sau khi gõ phải nằm trên bàn phím
    el.value = 'sus'; el.dispatchEvent(new Event('input', { bubbles: true })); await wait(900);
    const s = document.querySelector('#suggest:not([hidden]) > *');
    if (s) { const r = s.getBoundingClientRect(); if (r.bottom > top + H + 1 || r.top < top - 1) sug = `gợi ý tra từ đầu tiên ${Math.round(r.top)}–${Math.round(r.bottom)} px nằm sau bàn phím (nhìn thấy tới ${Math.round(top + H)} px)`; }
    el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  el.blur(); for (const [p, v] of padded) p.style.scrollPaddingBottom = v;
  if (mode === 'visual') window.__lkKb(0);
  return { k: sel(el), bad: out.concat(sug ? [sug] : []), rect: [b.left, b.top, b.width, b.height].map(Math.round), vv: [Math.round(top), Math.round(H)] };
}

const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
for (const vp of VPS) for (const mode of ['visual', 'content']) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, locale: 'en', reducedMotion: 'reduce' });
  await noProd(ctx);
  await ctx.addInitScript(shim);
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(`${vp.w} ${mode} pageerror: ${String(e.message).slice(0, 120)}`));
  await page.goto(`${BASE}/app/?sandbox=1&hl=en#/welcome/setup`, { waitUntil: 'networkidle' }).catch(() => {});
  const shimOk = await page.evaluate(() => typeof window.__lkKb === 'function' && window.visualViewport && window.visualViewport.constructor.name === 'VV').catch(() => false);
  if (!shimOk) { errs.push(`${vp.w}: shim visualViewport không gắn được`); await ctx.close(); continue; }
  const kbPx = Math.round(vp.h * KB);
  for (const route of ROUTES) {
    try {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.evaluate(h => { location.hash = h; scrollTo(0, 0); }, '#/' + route);
      await page.waitForTimeout(1300);
      const want = MUST.find(([r]) => r === route); // trang bắt buộc phủ: chờ ô chính dựng xong (gói lười, vd. 'writing' của Phòng viết)
      if (want) await page.waitForSelector(want[1].source.includes('essay') ? '#essay' : '#view #q, #view input', { state: 'visible', timeout: 10000 }).catch(() => {});
      const list = await page.evaluate(LIST);
      if (want && !list.some(k => want[1].test(k))) errs.push(`${vp.w} ${mode} #/${route}: chưa thấy ô chính – ` + await page.evaluate(() => `hash ${location.hash} · body.${[...document.body.classList].join('.')} · ` + (document.querySelector('#view') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 220)).catch(e => e.message));
      // ô chính của trang (Phòng viết #essay, tra từ #q, #gq) luôn được kiểm, rồi tới các ô khác – tối đa MAX_PER_ROUTE
      const must = MUST.filter(([r]) => r === route || r === '*').map(m => m[1]);
      const order = [...list.keys()].sort((a, b) => must.some(re => re.test(list[b])) - must.some(re => re.test(list[a])) || a - b).slice(0, Math.max(MAX_PER_ROUTE, list.filter(k => must.some(re => re.test(k))).length));
      for (const i of order) {
        if (mode === 'content') await page.setViewportSize({ width: vp.w, height: vp.h - kbPx });
        let r = await page.evaluate(probe, [i, mode, kbPx]).catch(e => ({ err: String(e.message).split('\n')[0].slice(0, 120) }));
        if (r.gone) { // trang dựng lại giữa lúc liệt kê và đo (gói lười như Phòng viết): liệt kê lại, tìm ô cùng bộ chọn, đo lại – không im lặng bỏ qua ô chính
          await page.waitForTimeout(600); const again = await page.evaluate(LIST), j = again.indexOf(list[i]);
          if (j >= 0) r = await page.evaluate(probe, [j, mode, kbPx]).catch(e => ({ err: String(e.message).split('\n')[0].slice(0, 120) }));
        }
        if (mode === 'content') await page.setViewportSize({ width: vp.w, height: vp.h });
        if (r.gone) { errs.push(`${vp.w} ${mode} #/${route} ô ${list[i]}: biến mất khi đo (đo lại: ${JSON.stringify(await page.evaluate(() => ({ essay: !!document.querySelector('#essay'), n: document.querySelectorAll('[data-lk-kbd]').length, hash: location.hash })))})`); continue; }
        if (r.unreachable) { unreachable.push(`${vp.w} ${mode} #/${route} ${r.unreachable}`); continue; }
        if (r.err) { errs.push(`${vp.w} ${mode} #/${route} ô ${list[i]}: ${r.err}`); continue; }
        checked.push({ vp: vp.w, mode, route, k: r.k });
        for (const x of r.bad) issues.push({ t: 'kbd-visual', vp: vp.w, mode, route, k: r.k, x, rect: r.rect, vv: r.vv });
        if (r.bad.length && issues.length <= 12) await page.screenshot({ path: `${OUT}/kbd-${vp.w}-${mode}-${route.replace(/[^a-z]+/g, '_')}-${i}.png` }).catch(() => {});
      }
    } catch (e) { errs.push(`${vp.w} ${mode} #/${route}: ${String(e.message).split('\n')[0].slice(0, 120)}`); }
  }
  await ctx.close();
}
await browser.close();

const fails = [];
const n = issues.length; if (n > BUDGET['kbd-visual']) fails.push(`kbd-visual: ${n} > ${BUDGET['kbd-visual']}`);
for (const vp of VPS) for (const mode of ['visual', 'content']) for (const [route, re] of MUST) {
  if (!checked.some(c => c.vp === vp.w && c.mode === mode && (route === '*' || c.route === route) && re.test(c.k))) fails.push(`thiếu độ phủ: ${vp.w} ${mode} ${route === '*' ? 'thanh trên' : '#/' + route} (${re})`);
}
if (checked.length < VPS.length * 2 * 8) fails.push(`chỉ kiểm được ${checked.length} ô (cần ≥ ${VPS.length * 2 * 8}) – không cho xanh khi chạy rỗng`);
if (errs.some(e => /shim/.test(e))) fails.push('shim visualViewport lỗi');
const rep = { at: new Date().toISOString(), checked: checked.length, issues, errs, fails, unreachable, routes: ROUTES, kb: KB };
fs.writeFileSync(`${OUT}/keyboard.json`, JSON.stringify(rep, null, 1));
const md = [`# ⌨️ Bàn phím ảo – ${checked.length} lượt ô nhập × ${VPS.map(v => v.w).join('/')} px × visual/content`, '',
  `**Kết quả:** ${fails.length ? '❌ ' + fails.join(' · ') : '✅ không ô nào bị bàn phím che'}`, '',
  `| vp | mô hình | route | ô | lỗi | ô (x,y,w,h) | nhìn thấy (top,h) |`, '|---|---|---|---|---|---|---|',
  ...issues.slice(0, 80).map(i => `| ${i.vp} | ${i.mode} | ${i.route} | \`${i.k}\` | ${i.x.replace(/\|/g, '/')} | ${i.rect} | ${i.vv} |`), '',
  `Ô không chạm tới được ngay cả khi chưa mở bàn phím (bỏ qua, ví dụ thanh trên ẩn ở màn học): ${unreachable.length}`, ...unreachable.slice(0, 40).map(u => '- ' + u), '',
  ...(errs.length ? ['## Lỗi chạy', ...errs.slice(0, 30).map(e => '- ' + e)] : [])].join('\n');
fs.writeFileSync(`${OUT}/KEYBOARD.md`, md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
console.log(md.split('\n').slice(0, 30).join('\n')); if (errs.length) console.log('## Lỗi chạy\n' + errs.slice(0, 30).map(e => '- ' + e).join('\n')); // lỗi chạy luôn hiện trong log CI
if (fails.length && process.env.MQA_REPORT_ONLY !== '1') process.exit(1);
