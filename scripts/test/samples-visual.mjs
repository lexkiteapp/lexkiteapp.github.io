// Cổng hình họ trang thư viện (docs/specs/samples-visual.md), chạy trên CI (samples-visual.yml), 390/1280 × sáng/tối:
// không tràn ngang, không chữ bị cắt hay gãy giữa từ, hub nhất quán (1 điều hướng danh mục, ô/icon/chữ một cỡ, số đếm cùng chỗ, lề thẳng), hàng lọc cuộn được có dấu hiệu + tới được chip cuối, tương phản chữ ≥ 4,5:1 (axe), icon ≥ 3:1,
// huy hiệu tải được, giáo viên cắt sạch ở sàn. --shots <thư mục>: thêm ảnh màn đầu để ghép tờ trước/sau.
//   node scripts/test/samples-visual.mjs <base-url> [--shots out/dir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8080', si = process.argv.indexOf('--shots'), SHOTS = si > 0 ? process.argv[si + 1] : '';
const axeSrc = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const PAGES = ['/samples/', '/speaking/', '/tu-vung/', '/ngu-phap/', '/viet-thu/', '/phat-am/', '/en/samples/', '/en/speaking/', '/en/vocabulary/', '/en/grammar/', '/en/pronunciation/', '/en/ielts-writing/', '/en/ielts-writing/task-1/', '/en/ielts-writing/general-task-1/',
  '/samples/p1.html', '/en/samples/p1.html', '/speaking/hoc-tap.html', '/viet-thu/gt1.html', '/tu-vung/education.html', '/ngu-phap/present-simple.html'];
const VIEW = [[390, 844], [1280, 900]], THEMES = ['light', 'dark'], bad = [];
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const check = () => {
  const out = [], de = document.documentElement, main = document.querySelector('main') || document.body;
  if (de.scrollWidth > de.clientWidth + 1) out.push(`tràn ngang ${de.scrollWidth}>${de.clientWidth}`);
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none'; };
  // Chữ bị cắt: phần tử có chữ, overflow khác visible, nội dung vượt khung (trừ vùng cuộn, trừ đề bài kẹp dòng có chủ đích)
  for (const e of main.querySelectorAll('h1,h2,h3,b,strong,a,span,p,li,button')) {
    if (!vis(e) || !e.textContent.trim() || e.closest('.sr,.vu,.vh-t,#glp,.tbl') || e.matches('.sr,.vu,p.vc-q') || e.closest('p.vc-q')) continue;
    const s = getComputedStyle(e); if (s.overflowX === 'auto' || s.overflowX === 'scroll') continue;
    if ((s.overflowX === 'hidden' || s.overflowX === 'clip') && e.scrollWidth > e.clientWidth + 1) out.push(`chữ cắt ngang: ${e.tagName}.${e.className} "${e.textContent.trim().slice(0, 40)}"`);
    if (s.webkitLineClamp !== 'none' && !e.matches('.pg2 span')) out.push(`kẹp dòng ngoài danh sách cho phép: ${e.tagName}.${e.className}`);
    const r = e.getBoundingClientRect(), p = e.parentElement.getBoundingClientRect(); if (e.matches('.tf a,.cats a') ) continue;
    if (r.right > de.clientWidth + 1 && !e.closest('.tfw')) out.push(`vượt mép phải: ${e.tagName}.${e.className} "${e.textContent.trim().slice(0, 40)}"`);
  }
  // Gãy giữa từ trên tiêu đề khối/thẻ ("Positive/Negativ|e")
  for (const e of main.querySelectorAll('.vcn-i b,.vc-t,.smp h1')) { if (!vis(e)) continue; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) for (const m of n.textContent.matchAll(/[^\s/–-]+/g)) { const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length); const tops = new Set([...rg.getClientRects()].map(r => Math.round(r.top))); if (tops.size > 1) out.push(`gãy giữa từ: "${m[0]}"`); } }
  // Hàng cuộn: còn chỗ → có dấu hiệu; hết chỗ → không có nút thừa; chip nào cũng cuộn tới được
  for (const w of document.querySelectorAll('.tfw')) { const nav = w.querySelector('nav'); if (!vis(nav)) continue; const over = nav.scrollWidth > nav.clientWidth + 2, r = w.querySelector('.tfb-r'), l = w.querySelector('.tfb-l');
    nav.scrollLeft = 0; nav.dispatchEvent(new Event('scroll'));
    if (over && getComputedStyle(r).display === 'none') out.push(`hàng cuộn "${nav.className}" không có dấu hiệu cuộn`);
    if (!over && (getComputedStyle(r).display !== 'none' || getComputedStyle(l).display !== 'none')) out.push(`hàng "${nav.className}" có nút cuộn thừa`);
    if (getComputedStyle(nav).overflowX === 'hidden') out.push('hàng lọc bị cắt, không cuộn được');
    for (const b of [r, l]) if (getComputedStyle(b).display !== 'none' && (b.offsetWidth < 44 || b.offsetHeight < 44)) out.push('nút cuộn < 44 px');
    if (over) { const nr = nav.getBoundingClientRect(); for (const b of [r, l]) { const br = b.getBoundingClientRect(); if (br.width && br.right > nr.left + 1 && br.left < nr.right - 1) out.push('nút cuộn đè lên chip (phải nằm trong lề riêng .tfw.ovf)'); }
      if (l.getAttribute('aria-disabled') !== 'true') out.push('đầu hàng: nút lùi phải aria-disabled'); } }
  // Hub nhất quán (05/11, chủ: "/tu-vung/ lộn xộn, nhảy lung tung"): MỘT điều hướng danh mục, ô đều, icon/chữ một cỡ, lề thẳng
  const navs = [...main.querySelectorAll('nav')].filter(n => n.querySelector('a[href^="#g-"]'));
  if (navs.length > 1) out.push(`trùng điều hướng: ${navs.length} nav cùng liệt kê danh mục (${navs.map(n => n.className).join(' + ')})`);
  const cn = main.querySelector('.vcn');
  if (cn && vis(cn)) { const R = e => e.getBoundingClientRect(), uniq = a => [...new Set(a)], tiles = [...cn.querySelectorAll('a')].filter(vis);
    const sz = uniq(tiles.map(t => `${Math.round(R(t).width)}x${Math.round(R(t).height)}`)); if (sz.length > 1) out.push(`ô danh mục ${sz.length} cỡ: ${sz.join(', ')}`);
    const ic = uniq(tiles.map(t => { const i = t.querySelector('img'); return i ? Math.round(R(i).width) : 0; })); if (ic.length > 1) out.push(`icon danh mục ${ic.length} cỡ: ${ic.join(', ')}`);
    const nf = uniq(tiles.map(t => getComputedStyle(t.querySelector('b')).fontSize)); if (nf.length > 1) out.push(`tên danh mục ${nf.length} cỡ chữ`);
    const fsAll = uniq([...cn.querySelectorAll('*')].filter(e => vis(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map(e => getComputedStyle(e).fontSize)); if (fsAll.length > 3) out.push(`lưới danh mục > 3 cỡ chữ: ${fsAll.join(', ')}`);
    const cnt = uniq(tiles.map(t => { const n = t.querySelector('.n'); return n ? Math.round(R(t).right - R(n).right) : -1; })); if (cnt.length > 1) out.push('số đếm không cùng vị trí trong ô');
    if (cn.scrollWidth > cn.clientWidth + 1) out.push('lưới danh mục tràn ngang');
    const L = Math.round(R(cn).left), Rt = Math.round(R(cn).right);
    for (const e of [main.querySelector('.find .filter'), main.querySelector('.vcn-hd'), ...main.querySelectorAll('.grp .grid')]) { if (!e || !vis(e)) continue; const r = R(e);
      if (Math.abs(Math.round(r.left) - L) > 1 || Math.abs(Math.round(r.right) - Rt) > 1) out.push(`lề lệch: ${e.className || e.tagName} ${Math.round(r.left)}–${Math.round(r.right)} ≠ ${L}–${Rt}`); }
    for (const g of main.querySelectorAll('.grp .grid')) { if (!vis(g)) continue; const cs = [...g.children].filter(vis);
      const w = uniq(cs.map(c => Math.round(R(c).width))); if (w.length > 1) out.push(`thẻ danh sách ${w.length} độ rộng (${w.join(', ')}) trong ${g.parentElement.getAttribute('aria-labelledby')}`);
      const tf = uniq(cs.map(c => c.querySelector('.vc-t')).filter(Boolean).map(t => getComputedStyle(t).fontSize)); if (tf.length > 1) out.push(`tiêu đề thẻ ${tf.length} cỡ chữ (${tf.join(', ')})`); } }
  // Icon ≥ 3:1 trên nền thật
  const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).map(Number).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
  const bg = e => { for (let x = e; x; x = x.parentElement) { const c = getComputedStyle(x).backgroundColor; if (!/, 0\)$|transparent/.test(c)) return c; } return 'rgb(255,255,255)'; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  for (const e of main.querySelectorAll('.vm,.tfb')) { if (!vis(e)) continue; const k = ratio(getComputedStyle(e).color, bg(e)); if (k < 3) out.push(`icon ${e.className} ${k.toFixed(2)}:1 < 3:1`); }
  // Giáo viên: chỉ ảnh 2D thật, chân ảnh (vùng mờ) nằm dưới sàn cắt
  for (const t of main.querySelectorAll('.vh-t')) { const i = t.querySelector('img'); if (!i || !/\/teach\/(ama|carlos)\//.test(i.src)) out.push('giáo viên sai nguồn'); else { if (getComputedStyle(t).overflow !== 'hidden') out.push('giáo viên không cắt ở sàn'); if (i.getBoundingClientRect().bottom - t.getBoundingClientRect().bottom < i.getBoundingClientRect().height * .11) out.push('giáo viên lộ phần thân mờ'); } }
  for (const i of main.querySelectorAll('img[src*="/img/lib/"]')) if (!i.getAttribute('width') || !i.getAttribute('height')) out.push('huy hiệu thiếu cỡ (CLS)');
  return out;
};
const b = await chromium.launch(); let cases = 0;
for (const [w, h] of VIEW) for (const scheme of THEMES) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme }); const pg = await ctx.newPage(); const miss = new Set();
  pg.on('response', r => { if (r.status() >= 400 && /\/img\/lib\/|\/teach\//.test(r.url())) miss.add(r.url()); });
  for (const path of PAGES) { cases++; const tag = `${path} ${w} ${scheme}`;
    const res = await pg.goto(BASE + path, { waitUntil: 'load' }).catch(e => ({ status: () => e.message })); if (res.status() !== 200) { bad.push(`${tag}: HTTP ${res.status()}`); continue; }
    await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 1200) { scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } scrollTo(0, 0); });
    for (const m of await pg.evaluate(check)) bad.push(`${tag}: ${m}`);
    await pg.addScriptTag({ content: axeSrc }); const ax = await pg.evaluate(() => axe.run('main', { runOnly: ['color-contrast'] }).then(r => r.violations.flatMap(v => v.nodes.map(n => `${n.target} ${(n.any[0]?.data?.contrastRatio) || ''}`))));
    for (const a of ax) bad.push(`${tag}: tương phản ${a}`);
    if (SHOTS && /samples\/(p1\.html)?$/.test(path) && !path.startsWith('/en')) await pg.screenshot({ path: `${SHOTS}/${path.includes('p1') ? 'detail' : 'index'}-${w}-${scheme}.jpg`, type: 'jpeg', quality: 72, fullPage: false });
  }
  for (const u of miss) bad.push(`tải lỗi: ${u}`);
  await ctx.close();
}
await b.close();
if (bad.length) { const u = [...new Set(bad)]; console.error(u.slice(0, 80).join('\n')); console.error(`✗ samples-visual: ${u.length} lỗi / ${cases} ca`); process.exit(1); }
console.log(`✓ samples-visual: ${cases} ca sạch`);
