// 🛡️ Gác bố cục tự động (owner 28/10: "chồng chéo, chưa chuyên nghiệp" – không để owner phải soi bằng mắt nữa).
// Mọi trang chính · 360/390/1366 px · sáng/tối · en/vi/ar (RTL). Phục vụ thẳng web/ (page.route), ?sandbox=1 → 0 lượt chạm prod.
// FAIL khi: (1) thẻ/nút/ô chữ chồng lên nhau > 4 px · (2) phần tử bị cắt bởi khung overflow:hidden hoặc mép màn hình (khung CUỘN ngang thì được phép)
//           (3) chữ tràn ra ngoài nút/chip/thẻ chứa nó · (4) cùng một IPA hoặc loa của cùng một từ hiện 2 lần trong một khối.
// Ngoại lệ có chủ đích: badge/chấm định vị tuyệt đối < 48 px, mặt sau thẻ lật (.flash .face), [data-ov-ok].
// Dùng: node scripts/test/ux-guard.mjs <web> [out=out/ux-guard]   (CI: .github/workflows/ux-cards.yml)
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const [ROOT = 'web', OUT = 'out/ux-guard'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const ROUTES = ['home', 'path', 'skills', 'practice', 'review', 'vocab', 'library', 'tests', 'mistakes', 'quick', 'me', 'stats', 'league', 'goal', 'dict/sustainable', 'confidence', 'grammar', 'grammar/tenses', 'pron/th-sounds', 'lesson'];
const CONFIGS = [[360, 'light', 'en'], [360, 'dark', 'vi'], [390, 'dark', 'en'], [390, 'light', 'ar'], [1366, 'light', 'en'], [1366, 'dark', 'vi']];
const browser = await chromium.launch();
const found = {}, errs = [];
const add = (k, v) => { (found[k] ||= []).push(v); };

// Chạy trong trang: trả về danh sách lỗi bố cục của #view
function scan() {
  const W = innerWidth, out = { overlap: [], clip: [], spill: [], dup: [] };
  const lab = el => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) + ` "${(el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24)}"`;
  const cs = el => getComputedStyle(el);
  const shown = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { const s = cs(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; if (e.matches('[data-ov-ok], .flash .face, .skel, [aria-hidden="true"], details:not([open]) > :not(summary)')) return false; } return true; };
  const floating = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { const p = cs(e).position; if (p === 'fixed' || p === 'sticky') return true; } return false; };
  // Khung nhìn thấy được: giao với mọi tổ tiên có overflow ≠ visible; ghi lại tổ tiên cắt (hidden) hay cuộn (auto/scroll)
  const visRect = el => {
    const b = el.getBoundingClientRect(); let r = { l: b.left, t: b.top, r: b.right, b: b.bottom }, cut = null;
    for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      const s = cs(e); if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      const p = e.getBoundingClientRect(), scroll = /auto|scroll/.test(s.overflowX + s.overflowY);
      const n = { l: Math.max(r.l, p.left), t: Math.max(r.t, p.top), r: Math.min(r.r, p.right), b: Math.min(r.b, p.bottom) };
      if (!scroll && !cut && (n.r - n.l < r.r - r.l - 2 || n.b - n.t < r.b - r.t - 2) && n.r > n.l && n.b > n.t) cut = e;
      r = n;
    }
    return { r, cut, full: b };
  };
  const SEL = '.card, .btn, button, a.chip, .chip, input, select, textarea, .icon-btn, h1, h2, h3, .tabs, .quest-line, .hub-card';
  const els = [...document.querySelectorAll('#view *')].filter(el => el.matches(SEL) && shown(el) && !floating(el)).map(el => ({ el, ...visRect(el) })).filter(x => x.r.r - x.r.l > 1 && x.r.b - x.r.t > 1);
  for (const x of els) {
    const s = cs(x.el), small = x.full.width < 48 && x.full.height < 48 && /absolute/.test(s.position);
    if (x.cut && !small) out.clip.push(`${lab(x.el)} cắt bởi ${lab(x.cut)}`);
    let inScroll = false; for (let e = x.el.parentElement; e && e !== document.body; e = e.parentElement) if (/auto|scroll/.test(cs(e).overflowX)) { inScroll = true; break; }
    if (!inScroll && (x.full.left < -1 || x.full.right > W + 1)) out.clip.push(`${lab(x.el)} ra ngoài màn hình ${Math.round(x.full.left)}..${Math.round(x.full.right)}`);
    // chữ tràn khỏi hộp chứa (vd. tab co nhỏ hơn chữ → chữ đè tab bên cạnh)
    if (x.el.matches('button, .btn, .chip, a.chip, .quest-line, .tabs button') && s.overflow === 'visible') {
      const rg = document.createRange(); rg.selectNodeContents(x.el); const tb = rg.getBoundingClientRect();
      if (tb.width && (tb.left < x.full.left - 2 || tb.right > x.full.right + 2)) out.spill.push(`${lab(x.el)} chữ ${Math.round(tb.width)} > hộp ${Math.round(x.full.width)}`);
    }
  }
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i], b = els[j]; if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const ix = Math.min(a.r.r, b.r.r) - Math.max(a.r.l, b.r.l), iy = Math.min(a.r.b, b.r.b) - Math.max(a.r.t, b.r.t);
    if (ix <= 4 || iy <= 4) continue;
    const badge = x => x.full.width < 48 && x.full.height < 48 && /absolute/.test(cs(x.el).position);
    if (badge(a) || badge(b)) continue;
    out.overlap.push(`${lab(a.el)} ✕ ${lab(b.el)} ${Math.round(ix)}×${Math.round(iy)}`);
  }
  // cùng IPA / loa của cùng một từ 2 lần trong một khối
  for (const blk of document.querySelectorAll('#view .card, #view section, #view .sheet')) {
    if (blk.closest('.flash') || blk.querySelector('.card, section')) continue;
    const ipa = [...blk.querySelectorAll('.ipa, .sipa')].filter(shown).map(e => e.textContent.trim()).filter(Boolean);
    const say = [...blk.querySelectorAll('[data-speak], [data-speak-text], [data-sayw]')].filter(shown).map(e => (e.dataset.speak || e.dataset.speakText || '#sayw').toLowerCase());
    if (new Set(ipa).size < ipa.length || new Set(say).size < say.length) out.dup.push(`${lab(blk)} IPA ${ipa.length} · loa ${say.length}`);
  }
  for (const k in out) out[k] = [...new Set(out[k])].slice(0, 15);
  return out;
}

async function run(width, scheme, lang) {
  const vp = width < 768 ? { viewport: { width, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width, height: 860 } };
  const ctx = await browser.newContext({ ...vp, colorScheme: scheme, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
  const page = await ctx.newPage(); const tag = `${width}-${scheme}-${lang}`;
  page.on('pageerror', e => errs.push(`${tag}: ${e.message}`));
  const url = h => `https://lk.test/app/?sandbox=1&hl=${lang}#/${h}`;
  await page.goto(url('home'), { waitUntil: 'load' }); await page.waitForTimeout(2500);
  await page.evaluate(async () => {
    const C = Core.Cards, now = Date.now();
    const mk = async (e, srs) => { const c = C.make(e); c.srs = { ef: 2.5, interval: 5, reps: 3, lapses: 0, due: now - 1000, last: now - 5 * 864e5, step: 0, S: 5, D: 4, ...srs }; await C.update(c); };
    await mk({ word: 'sustainable', ipa: '/səˈsteɪnəbl/', pos: 'adjective', vi: 'bền vững', def: 'able to continue over a period of time', ex: 'We need sustainable energy.' }, { D: 3 });
    for (const [w, v] of [['river', 'dòng sông'], ['window', 'cửa sổ'], ['decline', 'suy giảm'], ['habit', 'thói quen']]) await mk({ word: w, pos: 'noun', vi: v, ex: '' }, { due: now + 9e9 });
    await Core.Store.set('mistakes', [{ kind: 'vocab', q: 'Nghĩa của “compulsory”?', qK: { k: 'Nghĩa của “{word}”?', v: { word: 'compulsory' } }, answer: 'bắt buộc', given: 'tùy chọn', explain: 'compulsory /kəmˈpʌlsəri/ = bắt buộc', ref: 'compulsory', key: 'v1', n: 2, at: now, fixed: false }]);
  }).catch(e => errs.push(`${tag}: seed ${e.message}`));
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
  // Giải đấu như người dùng đã đăng nhập (ảnh owner: thẻ hạng ở trang chủ) – giả lập trong trang, không gọi mạng
  await page.evaluate(() => { const S = window.Sync; if (!S) return; S.user = { uid: 'guard', displayName: 'Guard', getIdToken: async () => 'x' }; S.authed = async () => {}; S.league = async () => ({ member: { tier: 0, xp: 15 }, board: [{ me: true, rank: 1, zone: 'up', name: 'Guard', xp: 15 }, { rank: 2, name: 'Mai', xp: 9 }], week: { end: Date.now() + 4.85 * 864e5 } }); }).catch(() => {});
  for (const r of ROUTES) {
    await page.goto(url(r), { waitUntil: 'load' }); await page.waitForTimeout(1600);
    const res = await page.evaluate(scan).catch(e => ({ err: [e.message] }));
    let bad = false; for (const [k, v] of Object.entries(res)) if (v.length) { bad = true; add(`${k}`, `${tag} #/${r}: ${v.join(' | ')}`); }
    if (bad) await page.screenshot({ path: path.join(OUT, `${tag}-${r.replace(/\//g, '_')}.jpg`), type: 'jpeg', quality: 60, fullPage: true });
  }
  await ctx.close();
}
for (const [w, sc, lang] of CONFIGS) await run(w, sc, lang);
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ found, errs }, null, 1));
for (const [k, v] of Object.entries(found)) { console.log(`\n✗ ${k}: ${v.length}`); for (const x of v.slice(0, 40)) console.log('  ' + x); }
console.log('\nlỗi JS:', errs.length, JSON.stringify(errs.slice(0, 10)));
if (Object.keys(found).length || errs.length) process.exit(1);
console.log(`✓ ux-guard: ${ROUTES.length} trang × ${CONFIGS.length} cấu hình – không chồng lấn, không cắt, không tràn chữ, không lặp IPA/loa`);
