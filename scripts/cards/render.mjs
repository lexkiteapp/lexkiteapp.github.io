// 🖼️ Thẻ chia sẻ / OG / chứng chỉ: mẫu HTML (Tailwind của Stitch) + data.json → PNG đúng kích thước bằng Chromium (Playwright). Chạy trên CI (cards-render.yml), không chạy tại máy.
// Dùng: node scripts/cards/render.mjs <mẫu.html> <data.json> <ra.png> [--size 1200x630] [--theme light|dark]   (không có --size: lấy <meta name="lk-size" content="1080x1080"> của mẫu)
// Cổng (đỏ = exit 1): còn Tailwind CDN/tài nguyên ngoài · slot thiếu dữ liệu · chữ tràn/cắt · cuộn ngang/dọc · gọi mạng · tương phản chữ (AA: thường ≥ 4.5, lớn ≥ 3 — đo theo điểm ảnh thật, có cả nền gradient/ảnh).
import fs from 'node:fs'; import path from 'node:path';
import { prepare, compile, srcFor, parseArgs, die } from './tw.mjs';

const { pos: [tplPath, dataPath, outPath], opt } = parseArgs(process.argv.slice(2));
if (!tplPath || !dataPath || !outPath) die('dùng: render.mjs <mẫu.html> <data.json> <ra.png> [--size WxH] [--theme light|dark]');
const theme = opt.theme || 'light'; if (!['light', 'dark'].includes(theme)) die('--theme phải là light|dark');
const raw = fs.readFileSync(tplPath, 'utf8'), data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const sz = (opt.size || raw.match(/<meta\s+name=["']lk-size["']\s+content=["'](\d+x\d+)["']/i)?.[1] || '').match(/^(\d+)x(\d+)$/); if (!sz) die('thiếu --size WxH (hoặc <meta name="lk-size">)');
const W = +sz[1], H = +sz[2];

let html, css;
try { const p = prepare(raw); html = p.html; css = compile(html, p.cfg, 'card'); } catch (e) { die(`${tplPath}: ${e.message}`); }
// Chèn CSS + ảnh (data URI) vào mẫu; slot chữ điền trong trình duyệt bằng textContent (an toàn, không HTML)
html = html.replace(/<\/head>/i, `<style>${css}</style></head>`);
if (!/<\/head>/i.test(raw)) html = `<style>${css}</style>` + html;
const srcs = {}; try { for (const m of html.matchAll(/data-slot-src="([^"]+)"/g)) { const v = srcFor(m[1], data); if (!v) die(`${tplPath}: thiếu ảnh cho slot-src "${m[1]}" (src.${m[1]} hoặc teacher)`); srcs[m[1]] = v; } } catch (e) { die(e.message); }

let chromium; try { ({ chromium } = await import('playwright')); } catch { die('thiếu playwright — CI: npm i --no-save playwright@1.48.2'); }
const tmp = path.join(path.dirname(path.resolve(tplPath)), `.render-${process.pid}.html`); fs.writeFileSync(tmp, html);
const net = [], browser = await chromium.launch();
let bad = [];
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: theme, reducedMotion: 'reduce' }), page = await ctx.newPage();
  await page.route('**/*', r => { const u = r.request().url(); if (/^(file|data|about|blob):/.test(u)) return r.continue(); net.push(u); return r.abort(); });
  await page.goto('file://' + tmp); await page.evaluate(t => { document.documentElement.setAttribute('data-theme', t); document.documentElement.classList.toggle('dark', t === 'dark'); }, theme);
  const fill = await page.evaluate(({ data, srcs }) => { const miss = [];
    document.querySelectorAll('[data-slot]').forEach(el => { const k = el.dataset.slot; if (data[k] == null || data[k] === '') miss.push(k); else el.textContent = String(data[k]); });
    document.querySelectorAll('[data-slot-src]').forEach(el => { el.src = srcs[el.dataset.slotSrc]; });
    return { miss, imgs: [...document.images].length }; }, { data, srcs });
  if (fill.miss.length) bad.push(`slot thiếu dữ liệu: ${[...new Set(fill.miss)].join(', ')}`);
  await page.evaluate(() => document.fonts.ready); await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0), null, { timeout: 15000 }).catch(() => bad.push('có ảnh không tải được'));
  await page.waitForTimeout(150);
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true }); await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: W, height: H } });

  // --- cổng bố cục: chữ tràn/cắt, cuộn ---
  const lay = await page.evaluate(({ W, H }) => { const out = [], de = document.documentElement, q = e => (e.tagName.toLowerCase() + (e.dataset.slot ? `[${e.dataset.slot}]` : e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : ''));
    if (de.scrollWidth > W + 1) out.push(`cuộn ngang (${de.scrollWidth} > ${W})`); if (de.scrollHeight > H + 1) out.push(`nội dung cao hơn khung (${de.scrollHeight} > ${H})`);
    for (const el of document.body.querySelectorAll('*')) {
      const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()); if (!own.length) continue;
      const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      const ink = Math.max(1, 0.3 * parseFloat(cs.fontSize)); // chân chữ (g, y) thò ra khi leading-none ≠ tràn; mất cả 1 dòng (≥ 1em) vẫn đỏ
      if (cs.display !== 'inline' && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + ink)) out.push(`chữ tràn ô ${q(el)} (${el.scrollWidth}x${el.scrollHeight} > ${el.clientWidth}x${el.clientHeight})`);
      const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); if (!b.width) continue;
      if (b.left < -0.5 || b.top < -0.5 || b.right > W + 0.5 || b.bottom > H + 0.5) out.push(`chữ ra ngoài khung ${q(el)}`);
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) { const o = getComputedStyle(a); if (/(hidden|clip)/.test(o.overflowX + o.overflowY)) { const ab = a.getBoundingClientRect(); if (b.left < ab.left - 1 || b.right > ab.right + 1 || b.top < ab.top - 1 || b.bottom > ab.bottom + 1) out.push(`chữ bị cắt bởi ${q(a)}: ${q(el)}`); } }
    }
    return out; }, { W, H });
  bad.push(...lay);

  // --- cổng tương phản: ẩn chữ → chụp nền thật → so với màu chữ trên từng điểm ảnh của ô chữ ---
  const items = await page.evaluate(() => { const L = [], tn = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) { if (!n.textContent.trim()) continue; const el = n.parentElement, cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0 || /^(STYLE|SCRIPT)$/.test(el.tagName)) continue;
      const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); if (b.width < 1 || b.height < 1) continue;
      let op = 1; for (let a = el; a; a = a.parentElement) op *= +getComputedStyle(a).opacity;
      const px = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700, m = cs.color.match(/[\d.]+/g).map(Number), clip = cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color ? cs.webkitTextFillColor.match(/[\d.]+/g).map(Number) : m;
      L.push({ t: n.textContent.trim().slice(0, 30), rect: [b.left, b.top, b.right, b.bottom], c: clip, a: (clip[3] ?? 1) * op, need: (px >= 24 || (px >= 18.66 && bold)) ? 3 : 4.5, sym: /symbols/i.test(cs.fontFamily) }); }
    return L; });
  await page.addStyleTag({ content: '*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}' });
  const bgPng = (await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } })).toString('base64');
  const cbad = await page.evaluate(async ({ items, bgPng, W, H }) => { const img = new Image(); img.src = 'data:image/png;base64,' + bgPng; await img.decode();
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const lin = v => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4, Lm = (r, gg, b) => .2126 * lin(r) + .7152 * lin(gg) + .0722 * lin(b), res = [];
    for (const it of items) { if (it.sym) continue; const [x0, y0, x1, y1] = it.rect.map((v, i) => Math.max(0, Math.min(i % 2 ? H : W, Math.round(v)))); if (x1 <= x0 || y1 <= y0) continue;
      const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data, cr = []; const step = Math.max(1, Math.floor(d.length / 4 / 4000));
      for (let i = 0; i < d.length; i += 4 * step) { const a = it.a, r = it.c[0] * a + d[i] * (1 - a), gg = it.c[1] * a + d[i + 1] * (1 - a), b = it.c[2] * a + d[i + 2] * (1 - a), l1 = Lm(r, gg, b), l2 = Lm(d[i], d[i + 1], d[i + 2]); cr.push((Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05)); }
      cr.sort((p, q) => p - q); const worst = cr[Math.floor(cr.length * 0.02)]; // bỏ 2 % điểm ngoại lai (răng cưa mép) rồi lấy điểm tệ nhất
      if (worst < it.need) res.push(`tương phản "${it.t}" = ${worst.toFixed(2)}:1 < ${it.need}:1`); }
    return res; }, { items, bgPng, W, H });
  bad.push(...cbad);
  if (net.length) bad.push(`gọi mạng ngoài: ${[...new Set(net)].slice(0, 3).join(', ')}`);
} catch (e) { bad.push('lỗi dựng: ' + e.message.split('\n')[0]); } finally { await browser.close(); fs.rmSync(tmp, { force: true }); }
if (bad.length) { try { fs.rmSync(outPath, { force: true }); } catch {} die(`${path.basename(tplPath)} [${theme}] ${bad.slice(0, 4).join(' | ')}${bad.length > 4 ? ` (+${bad.length - 4})` : ''}`); }
console.log(`✓ ${outPath} ${W}x${H} ${theme} (${(fs.statSync(outPath).size / 1024).toFixed(0)} KB)`);
