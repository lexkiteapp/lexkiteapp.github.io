// Ghép ảnh giới thiệu: khung Stitch (brand/stitch/store-art) + màn app thật + logo + giáo viên 2D + chữ 15 ngôn ngữ → PNG đúng kích thước từng store, kèm QC.
// Chỉ thay nội dung các ô id lk-*, không vẽ lại khung (docs/STORE-ART.md). Chạy trên CI: tailwindcss@3.4.17 + playwright.
// Dùng: LANGS=en node scripts/store-art/compose.mjs --raw <raw> --out <out> [--only play,apple,chrome,web] [--preview] [--outcome36]
//   --preview: chưa có ảnh Simulator → ảnh Apple tạm dùng ảnh chụp web cùng cỡ, ghi rõ trong báo cáo, KHÔNG dùng để nộp.
// Ra: <out>/play/<lang>/{phone,tablet7,tablet10}-<n>.png, feature-1024x500.png · <out>/apple/{iphone-69,ipad-13}/<lang>/<n>.png · <out>/chrome/… · <out>/web/… · <out>/qc.json · <out>/index.html
import fs from 'node:fs'; import path from 'node:path';
import { RANKING, COMPETITORS } from '../store-metadata.mjs';
import { prepare, compile, ROOT } from './tw.mjs';
import { LANGS as ALL, SLIDES, PORTRAIT, BRAND, PRICE_WORDS } from './spec.mjs';
import { COPY } from './copy.mjs';
import { CAP } from '../store-copy.mjs';

const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; }, has = k => argv.includes(k);
const RAW = path.resolve(opt('--raw', 'store-art-raw')), OUT = path.resolve(opt('--out', 'store-art')), ONLY = opt('--only', 'play,apple,chrome,web').split(',');
const PREVIEW = has('--preview'), OUTCOME36 = has('--outcome36'), LANGS = (process.env.LANGS || 'en').split(',').filter(l => ALL.includes(l));
if (!LANGS.length) throw new Error('LANGS không có ngôn ngữ hợp lệ');
const FRAMES = path.join(ROOT, 'brand/stitch/store-art');
const b64 = (f, t) => `data:${t};base64,` + fs.readFileSync(f).toString('base64');
const LOGO = b64(path.join(ROOT, 'web/icons/icon.svg'), 'image/svg+xml');
const person = (w, pose) => b64(path.join(ROOT, `web/teach/${w}/still-${pose}.webp`), 'image/webp');
const EM_LIGHT = '#C43820'; // token on-primary-fixed-variant: coral đậm đạt 4,5:1 trên nền kem Bright Day
const strip = h => h.replace(/<[^>]+>/g, '');

// Khung → HTML đã biên dịch Tailwind (cache theo khung)
const cache = new Map();
function frameHtml(frame, theme) {
  const k = `${frame}-${theme}`; if (cache.has(k)) return cache.get(k);
  const p = prepare(fs.readFileSync(path.join(FRAMES, k + '.html'), 'utf8')), css = compile(p.html, p.cfg, 'card');
  // Khung Stitch vẽ cho màn rộng: ép <main> phủ đúng canvas, bỏ viền/bóng của bản xem trước
  const force = 'html,body{margin:0!important;padding:0!important;width:100vw!important;height:100vh!important;min-height:0!important;overflow:hidden!important}body>main{width:100vw!important;max-width:none!important;height:100vh!important;max-height:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;margin:0!important}';
  const html = p.html.replace(/<\/head>/i, `<style>${css}${force}</style></head>`);
  cache.set(k, html); return html;
}

// Chạy trong trang: điền ô, canh tiêu đề, đặt giáo viên. Trả số đo cho QC.
function fill(d) {
  const $ = id => document.getElementById(id), W = innerWidth, H = innerHeight, issues = [], miss = [];
  for (const id of d.need) if (!$(id)) miss.push(id);
  const logo = $('lk-logo');
  if (logo) { logo.innerHTML = `<img src="${d.logo}" alt="" style="width:100%;height:100%;display:block;border-radius:22%">`; logo.style.background = 'none'; logo.style.border = '0'; logo.style.boxShadow = 'none'; }
  const hd = $('lk-headline'), emCls = ($('lk-em')?.className || '').split(/\s+/).filter(c => !/^(underline|decoration-|underline-offset)/.test(c)).join(' ');
  if (hd) { hd.innerHTML = d.h.replace('<em>', `<span id="lk-em" class="${emCls}">`).replace('</em>', '</span>'); hd.dir = d.rtl ? 'rtl' : 'ltr'; hd.style.overflowWrap = 'break-word'; if (d.emColor) { const e = $('lk-em'); e.style.cssText += `;color:${d.emColor};-webkit-text-fill-color:${d.emColor};background:none`; } }
  const sub = $('lk-sub'); if (sub) { if (d.s) { sub.textContent = d.s; sub.dir = d.rtl ? 'rtl' : 'ltr'; if (d.subPx) sub.style.fontSize = d.subPx + 'px'; } else sub.remove(); }
  if ($('lk-url')) { if (d.url) $('lk-url').textContent = d.url; else $('lk-url').textContent = 'lexkite.com'; }
  const tags = $('lk-tags');
  if (tags && d.tags) { const proto = tags.firstElementChild, nodes = d.tags.map(t => { const c = proto.cloneNode(true), leaf = [...c.querySelectorAll('*'), c].reverse().find(e => e.textContent.trim() && !e.children.length) || c; leaf.textContent = t; return c; }); tags.replaceChildren(...nodes); }
  const pts = $('lk-points');
  if (pts && d.points) { const proto = pts.firstElementChild, nodes = d.points.map(t => { const c = proto.cloneNode(true), leaf = [...c.querySelectorAll('span')].filter(s => !/symbols/.test(s.className)).pop() || c; leaf.textContent = t; return c; }); pts.replaceChildren(...nodes); }
  const scr = $('lk-screen');
  if (scr) {
    scr.innerHTML = ''; scr.style.padding = '0'; scr.style.overflow = 'hidden'; scr.style.position = scr.style.position || 'relative'; scr.style.background = d.statusColor || '#fff';
    if (d.screen) {
      const inset = d.inset ? scr.getBoundingClientRect().width * d.inset : 0;
      scr.insertAdjacentHTML('beforeend', `<img src="${d.screen}" alt="" style="position:absolute;left:0;top:${inset}px;width:100%;height:auto;display:block;max-width:none">`);
      if (d.popup) scr.insertAdjacentHTML('beforeend', `<img src="${d.popup}" alt="" style="position:absolute;right:6%;top:4%;width:40%;height:auto;border-radius:12px;box-shadow:0 18px 40px rgba(0,0,0,.35)">`);
    }
  }
  const main = document.querySelector('body>main') || document.body;
  const FADE = 0.102; // ảnh still mờ dần từ dòng 866/960: chìm phần đó xuống dưới mép canvas để không lộ thân mờ
  const place = (slot, t, hFrac, side) => {
    if (!slot) return null;
    const r = slot.getBoundingClientRect(); slot.innerHTML = ''; slot.style.background = 'none'; slot.style.border = '0'; slot.style.boxShadow = 'none';
    if (!t) { slot.remove(); return null; }
    const ih = Math.round(H * hFrac), iw = ih * 1108 / 960, cx = side != null ? side : r.left + r.width / 2, sink = Math.ceil(ih * FADE);
    const img = new Image(); img.src = t.src; img.alt = ''; img.dataset.lkTeacher = t.who;
    img.style.cssText = `position:fixed;left:${Math.round(cx - iw / 2)}px;bottom:-${sink}px;height:${ih}px;width:${Math.round(iw)}px;z-index:40;filter:drop-shadow(0 10px 22px rgba(4,20,22,.28));max-width:none`;
    document.body.appendChild(img); return { cx, ih, iw, top: H - ih + sink };
  };
  const t1 = place($('lk-teacher'), d.teacher, d.teacherFrac, d.teacherX != null ? d.teacherX * W : null);
  const t2 = place($('lk-teacher2'), d.teacher2, d.teacherFrac);
  const bub = $('lk-bubble');
  if (bub) {
    if (!d.bubble || !t1) bub.remove();
    else {
      const leaf = [...bub.querySelectorAll('*'), bub].reverse().find(e => e.textContent.trim() && !e.children.length) || bub; leaf.textContent = d.bubble;
      bub.dir = 'ltr'; bub.style.position = 'fixed'; bub.style.zIndex = 41; bub.style.margin = 0; bub.style.transform = 'none'; bub.style.right = 'auto'; bub.style.bottom = 'auto';
      const b = bub.getBoundingClientRect(); // đặt ngay trên đầu giáo viên (nhân vật chiếm khoảng 86 % chiều cao ảnh)
      bub.style.left = Math.max(10, Math.min(W - b.width - 10, t1.cx - b.width * 0.35)) + 'px'; bub.style.top = Math.max(8, t1.top + t1.ih * 0.06 - b.height - 6) + 'px';
    }
  }
  // Tiêu đề: to nhất có thể rồi thu dần cho tới khi không đè vào thiết bị/giáo viên và màn app còn đủ lớn
  const device = scr ? (scr.closest('[class*="rounded"]:not(#lk-screen)') || scr) : null;
  const blocks = () => [hd, sub && sub.isConnected ? sub : null].filter(Boolean).map(e => e.getBoundingClientRect());
  const clash = () => {
    const shrink = e => { const r = e.getBoundingClientRect(); if (!e.dataset.lkTeacher) return r; const m = r.width * 0.2; return { left: r.left + m, right: r.right - m, top: r.top, bottom: r.bottom, height: r.height }; }; // ảnh giáo viên có lề trong suốt
    const bs = blocks(), obs = [device, ...document.querySelectorAll('[data-lk-teacher]'), bub && bub.isConnected ? bub : null].filter(Boolean).map(shrink);
    const hit = bs.some(a => obs.some(o => a.right > o.left + 12 && a.left < o.right - 12 && a.bottom > o.top + 2 && a.top < o.bottom - (o.height * 0.15)));
    const out = hd && (hd.scrollWidth > hd.clientWidth + 1 || hd.getBoundingClientRect().right > W + 0.5 || hd.getBoundingClientRect().bottom > H);
    const shown = scr ? Math.min(H, scr.getBoundingClientRect().bottom) - scr.getBoundingClientRect().top : H;
    return hit || out || (scr && shown < H * d.minScreen);
  };
  let fs = d.target; if (hd) { hd.style.fontSize = fs + 'px'; hd.style.lineHeight = '1.1'; while (fs > d.floor && clash()) { fs -= 1; hd.style.fontSize = fs + 'px'; } }
  const after = clash(); if (hd && after) issues.push({ hard: true, m: `tiêu đề vẫn đè nội dung ở cỡ nhỏ nhất ${fs}px` });
  if (hd && fs < d.target * 0.72) issues.push({ m: `tiêu đề phải thu nhiều (${fs}/${d.target}px)` });
  // Giáo viên phải chạm đáy canvas, nếu không sẽ lộ đường cắt của ảnh
  for (const im of document.querySelectorAll('[data-lk-teacher]')) { const b = im.getBoundingClientRect(); if (b.bottom - H < b.height * FADE - 1) issues.push({ hard: true, m: 'giáo viên lộ phần thân mờ ở đáy ảnh' }); }
  if (miss.length) issues.push({ hard: true, m: `khung thiếu ô: ${miss.join(', ')}` });
  // Chữ tràn ô / ra ngoài canvas
  for (const el of [hd, sub, ...(tags ? tags.children : []), ...(pts ? pts.children : []), bub].filter(e => e && e.isConnected)) {
    const b = el.getBoundingClientRect(); if (b.left < -0.5 || b.right > W + 0.5 || b.top < -0.5 || b.bottom > H + 0.5) issues.push({ hard: true, m: `chữ ra ngoài ảnh: ${el.id || el.tagName}` });
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== 'inline') issues.push({ hard: true, m: `chữ tràn ô: ${el.id || el.tagName}` });
  }
  // Chữ ngoài các ô: Stitch hay tự thêm nhãn/số giả, không cho lọt
  const keep = [hd, sub, tags, pts, scr, bub, $('lk-url')].filter(Boolean), tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = tw.nextNode());) { const t = n.textContent.trim(), el = n.parentElement; if (!t || /^(STYLE|SCRIPT|TITLE)$/.test(el.tagName) || /^lexkite$/i.test(t) || keep.some(k => k.isConnected && k.contains(el))) continue; const r = el.getBoundingClientRect(); if (r.width && r.height && getComputedStyle(el).visibility !== 'hidden') issues.push({ hard: true, m: `chữ lạ trong khung: "${t.slice(0, 30)}"` }); }
  return { issues, font: fs, h: hd ? hd.getBoundingClientRect().bottom / H : 0 };
}

// Tương phản đo trên điểm ảnh nền thật (ẩn chữ, chụp, so từng điểm), thân ≥ 4,5:1, chữ lớn ≥ 3:1
async function contrast(page, W, H) {
  const items = await page.evaluate(() => { const L = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) { if (!n.textContent.trim()) continue; const el = n.parentElement, cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || /^(STYLE|SCRIPT)$/.test(el.tagName) || /symbols/i.test(cs.fontFamily)) continue;
      const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); if (b.width < 1 || b.height < 1) continue;
      let op = 1; for (let a = el; a; a = a.parentElement) op *= +getComputedStyle(a).opacity;
      const px = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700, need = px >= 24 || (px >= 18.66 && bold) ? 3 : 4.5, base = { t: n.textContent.trim().slice(0, 24), rect: [b.left, b.top, b.right, b.bottom], need };
      if (cs.webkitBackgroundClip === 'text' && cs.backgroundImage !== 'none') { el.dataset.lkClip = 1; for (const m of cs.backgroundImage.matchAll(/rgba?\([^)]*\)/g)) { const c = m[0].match(/[\d.]+/g).map(Number); L.push({ ...base, c, a: (c[3] ?? 1) * op }); } continue; }
      const c = cs.color.match(/[\d.]+/g).map(Number); L.push({ ...base, c, a: (c[3] ?? 1) * op }); }
    return L; });
  const st = await page.addStyleTag({ content: '*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;text-decoration-color:transparent!important}[data-lk-clip]{background:none!important}' });
  const bg = (await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H }, scale: 'css' })).toString('base64');
  const res = await page.evaluate(async ({ items, bg, W, H }) => { const img = new Image(); img.src = 'data:image/png;base64,' + bg; await img.decode();
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H);
    const lin = v => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4, Lm = (r, gg, b) => .2126 * lin(r) + .7152 * lin(gg) + .0722 * lin(b), out = []; let worst = 21;
    for (const it of items) { const [x0, y0, x1, y1] = it.rect.map((v, i) => Math.max(0, Math.min(i % 2 ? H : W, Math.round(v)))); if (x1 <= x0 || y1 <= y0) continue;
      const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data, cr = [], step = Math.max(1, Math.floor(d.length / 4 / 3000));
      for (let i = 0; i < d.length; i += 4 * step) { const a = it.a, l1 = Lm(it.c[0] * a + d[i] * (1 - a), it.c[1] * a + d[i + 1] * (1 - a), it.c[2] * a + d[i + 2] * (1 - a)), l2 = Lm(d[i], d[i + 1], d[i + 2]); cr.push((Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05)); }
      cr.sort((p, q) => p - q); const v = cr[Math.floor(cr.length * 0.02)]; worst = Math.min(worst, v / it.need * 4.5); if (v < it.need) out.push(`tương phản "${it.t}" ${v.toFixed(2)}:1 < ${it.need}:1`); }
    return { out, worst }; }, { items, bg, W, H });
  await st.evaluate(n => n.remove());
  return res;
}

// Lint chữ theo luật store: không xếp hạng, không tên đối thủ, Play không ghi giá
function lint(text, store, nofree) {
  const out = [], t = strip(text);
  for (const re of RANKING) if (re.test(t)) out.push(`từ xếp hạng ${re}`);
  const c = COMPETITORS.exec(t); if (c) out.push(`tên app khác "${c[0]}"`);
  if (nofree && PRICE_WORDS.test(t)) out.push(`Play không cho ghi giá: "${PRICE_WORDS.exec(t)[0]}"`);
  if (store === 'play' && /\b(iphone|ipad|ios|app store|apple)\b/i.test(t)) out.push('Play nhắc Apple');
  if (store === 'apple' && /\b(android|google play)\b/i.test(t)) out.push('App Store nhắc Android');
  return out;
}
const pngOk = (f, w, h) => { const b = fs.readFileSync(f); return b.readUInt32BE(16) === w && b.readUInt32BE(20) === h && b[24] === 8 && b[25] === 2; };

const { chromium } = await import('playwright');
const browser = await chromium.launch(), qc = [];
const pageFor = new Map();
async function page(w, h, dsf) { const k = `${w}x${h}@${dsf}`; if (!pageFor.has(k)) pageFor.set(k, await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, reducedMotion: 'reduce' })).newPage()); return pageFor.get(k); }

async function shot({ file, frame, theme, w, h, dsf = 1, data, text, store, nofree, pxW = Math.round(w * dsf), pxH = Math.round(h * dsf) }) {
  const p = await page(w, h, dsf), tmp = path.join(FRAMES, `.compose-${process.pid}.html`);
  const issues = []; let m = { issues: [] }, score = 100;
  try {
    fs.writeFileSync(tmp, frameHtml(frame, theme));
    await p.goto('file://' + tmp); await p.evaluate(t => { document.documentElement.classList.toggle('dark', t === 'dark'); document.documentElement.dataset.theme = t; }, theme);
    m = await p.evaluate(fill, data);
    await p.evaluate(() => document.fonts.ready); await p.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0), null, { timeout: 15000 }).catch(() => issues.push({ hard: true, m: 'có ảnh không tải được' }));
    await p.waitForTimeout(120);
    const f = path.join(OUT, file); fs.mkdirSync(path.dirname(f), { recursive: true });
    const c = await contrast(p, w, h); c.out.forEach(x => issues.push({ hard: true, m: x }));
    await p.screenshot({ path: f, clip: { x: 0, y: 0, width: w, height: h } });
    if (!pngOk(f, pxW, pxH)) issues.push({ hard: true, m: `PNG sai chuẩn, cần ${pxW}×${pxH} RGB không alpha` });
    lint(text, store, nofree).forEach(x => issues.push({ hard: true, m: x }));
    issues.push(...m.issues);
    if (store === 'play' && m.h > 0.33) issues.push({ m: `chữ chiếm ${Math.round(m.h * 100)} % chiều cao ảnh` });
    score = Math.max(0, 100 - issues.filter(i => i.hard).length * 25 - issues.filter(i => !i.hard).length * 5);
  } catch (e) { issues.push({ hard: true, m: 'lỗi dựng: ' + e.message.split('\n')[0] }); score = 0; } finally { fs.rmSync(tmp, { force: true }); }
  qc.push({ file, frame, theme, store, score, font: m.font, issues: issues.map(i => (i.hard ? '✗ ' : '⚠ ') + i.m) });
  console.log(`${issues.some(i => i.hard) ? '✗' : '·'} ${file} ${score}${issues.length ? ' ' + issues.map(i => i.m).join(' | ') : ''}`);
}

// Ảnh dọc có màn app
const STATUS = { phone: 0.13, tablet: 0.045 }; // ảnh chụp web không có thanh trạng thái: chừa khoảng trên cho tai thỏ của khung điện thoại
for (const [dev, d] of Object.entries(PORTRAIT)) {
  if (!ONLY.includes(d.store)) continue;
  for (const lang of LANGS) for (const [i, s] of SLIDES.entries()) {
    const c = COPY[lang][s.id], sim = d.capture === 'simulator', srcDev = sim && !PREVIEW ? dev : (d.kind === 'phone' ? 'phone' : 'tablet');
    const raw = `${RAW}/${srcDev}/${lang}/${i + 1}.png`;
    const file = d.store === 'apple' ? `apple/${dev}/${lang}/${i + 1}.png` : `play/${lang}/${dev.replace('play-', '').replace('tablet-', 'tablet')}-${i + 1}.png`;
    if (!fs.existsSync(raw)) { qc.push({ file, store: d.store, score: 0, issues: ['✗ thiếu ảnh chụp ' + path.relative(RAW, raw)] }); console.error('✗ thiếu', raw); continue; }
    const s1 = OUTCOME36 && s.id === 'hero' ? c.s36 : (d.nofree && c.sPlay) || c.s;
    const frame = d.kind === 'tablet' ? 'tablet' : s.frame, tc = s.teacher || null;
    const need = ['lk-logo', 'lk-headline', 'lk-sub', 'lk-screen'];
    await shot({ file, frame, theme: s.theme, w: d.w, h: d.h, dsf: d.dsf, store: d.store, nofree: d.nofree, text: `${c.h} ${s1}`, data: { need, logo: LOGO, h: c.h, s: s1, rtl: lang === 'ar', screen: b64(raw, 'image/png'), inset: sim && !PREVIEW ? 0 : STATUS[d.kind], statusColor: s.theme === 'dark' ? '#0f1b1e' : '#fff7ea',
      teacher: tc ? { who: tc[0], src: person(tc[0], tc[1]) } : null, bubble: tc && tc[2], teacherFrac: d.kind === 'tablet' ? 0.38 : (s.tf || 0.44), teacherX: d.kind === 'tablet' ? null : s.tx, emColor: s.theme === 'light' ? EM_LIGHT : '', subPx: Math.round(d.w * (d.kind === 'tablet' ? 0.026 : 0.041)), target: Math.round(d.w * (d.kind === 'tablet' ? 0.07 : 0.108)), floor: Math.round(d.w * (d.kind === 'tablet' ? 0.04 : 0.062)), minScreen: d.kind === 'tablet' ? 0.4 : 0.4 } });
  }
}

// Ảnh thương hiệu
for (const b of BRAND) {
  if (!ONLY.includes(b.store)) continue;
  for (const lang of b.perLang ? LANGS : ['en']) {
    const c = COPY[lang], tags = b.cws ? ['100% free', '15 languages', 'IELTS · TOEIC'] : b.nofree ? c.tagsPlay : c.tags, head = b.cws ? CAP.en[0][1].replace('<br>', ' ') : c.hero.h, dir = b.store === 'play' ? `play/${lang}/feature-1024x500` : b.perLang ? `${b.store}/${lang}/${b.id}` : `${b.store}/${b.id}`;
    const need = b.frame === 'wide' ? ['lk-logo', 'lk-headline', 'lk-tags', 'lk-teacher', 'lk-teacher2'] : ['lk-logo', 'lk-headline', 'lk-teacher'];
    await shot({ file: dir + '.png', frame: b.frame, theme: b.theme, w: b.w, h: b.h, store: b.store, nofree: b.nofree, text: `${head} ${tags.join(' ')}`, data: { need, logo: LOGO, h: head, s: '', emColor: b.theme === 'light' ? EM_LIGHT : '', rtl: lang === 'ar', tags,
      teacher: { who: 'ama', src: person('ama', 'cheer') }, teacher2: { who: 'carlos', src: person('carlos', 'happy') }, bubble: b.frame === 'square' ? 'Hi! Ready to talk?' : '', teacherFrac: b.frame === 'tile' ? 0.82 : b.frame === 'square' ? 0.56 : 0.86, target: Math.round(Math.min(b.w * 0.08, b.h * (b.frame === 'tile' ? 0.11 : 0.13))), floor: Math.round(b.h * 0.05), minScreen: 0 } });
  }
}

// Chrome Web Store: 5 ảnh từ add-on thật (scripts/store-shots.mjs ghi raw vào <raw>/cws/<lang>/<n>.png)
if (ONLY.includes('chrome')) for (const lang of LANGS) {
  const caps = CAP[lang] || []; if (!caps.length) { qc.push({ file: `chrome/${lang}`, store: 'chrome', score: 0, issues: ['✗ thiếu chữ CAP'] }); continue; }
  for (let i = 0; i < 5; i++) {
    const raw = `${RAW}/cws/${lang}/${i + 1}.png`, file = `chrome/${lang}/${i + 1}.png`; if (!fs.existsSync(raw)) { qc.push({ file, store: 'chrome', score: 0, issues: ['✗ thiếu ảnh add-on ' + path.relative(RAW, raw)] }); console.error('✗ thiếu', raw); continue; }
    const [, title, sub, pts, url] = caps[i], back = i === 2 && fs.existsSync(`${RAW}/cws/${lang}/1.png`);
    const h = title.replace('<br>', ' '), points = pts.map(x => x.replace('|', ' '));
    await shot({ file, frame: 'cws-landscape', theme: i % 2 ? 'light' : 'dark', w: 1280, h: 800, store: 'chrome', text: `${h} ${sub} ${points.join(' ')}`, data: { need: ['lk-logo', 'lk-headline', 'lk-sub', 'lk-points', 'lk-screen'], logo: LOGO, h, s: sub, rtl: lang === 'ar', points, url, emColor: i % 2 ? EM_LIGHT : '',
      screen: b64(back ? `${RAW}/cws/${lang}/1.png` : raw, 'image/png'), popup: back ? b64(raw, 'image/png') : null, inset: 0, statusColor: '#fff', target: 52, floor: 30, minScreen: 0 } });
  }
}
await browser.close();

// Báo cáo + trang duyệt
const fail = qc.filter(q => q.issues.some(i => i.startsWith('✗'))), avg = qc.length ? Math.round(qc.reduce((a, q) => a + q.score, 0) / qc.length) : 0;
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'qc.json'), JSON.stringify({ preview: PREVIEW, outcome36: OUTCOME36, langs: LANGS, total: qc.length, fail: fail.length, avg, items: qc }, null, 1));
console.log(`${fail.length ? '✗' : '✓'} ${qc.length} ảnh · QC trung bình ${avg}/100 · ${fail.length} ảnh đỏ`);
if (!qc.length || fail.length) process.exitCode = 1;
