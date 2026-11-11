// Chân trang tĩnh gọn (05/11, chủ: "gọn, sạch, chuyên nghiệp như Stripe/Linear"): 3 cột cân (≤ 5 hàng/cột) + hàng đáy © · pháp lý · ngôn ngữ · giao diện.
// Không cắt link (no-cuts): MỌI link của footGroups vẫn là <a href> crawl được ở 15 ngôn ngữ; điện thoại = accordion đóng hết; chạm ≥ 44 px trên cảm ứng.
// Node thuần (npm test). Thêm `--browser [dist]` (CI quality-sweep, cần playwright) → đo chiều cao thật: máy tính ≤ 480 px, điện thoại (đã gập) ≤ 760 px.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { siteFooter, footGroups, FOOT_CSS, FOOT_JS, TAP_CSS, LANG_NAMES, LEGAL_RE, FOOT } from '../lib/site-layout.mjs';
const LANGS = Object.keys(LANG_NAMES);
assert.equal(LANGS.length, 15);
for (const l of LANGS) {
  const h = siteFooter({ lang: l, text: 'Lexkite – x', tm: 'TM' }), g = footGroups(l);
  const hrefs = [...h.matchAll(/<a [^>]*href="([^"]+)"/g)].map(m => m[1]);
  for (const [u] of [...g.product, ...g.learn, ...g.tools, ...g.co]) assert.ok(hrefs.includes(u), `${l}: mất link ${u}`);
  // gate SEO họ trang thư viện so chữ hiển thị với main: gộp cột không được làm mất nhãn nhóm (Sản phẩm/Học/Công cụ miễn phí/Thông tin)
  for (const i of [0, 18, 19, 2]) { const t = g.f[i] || FOOT.en[i]; assert.ok(h.includes(t), `${l}: mất nhãn nhóm "${t}"`); }
  for (const [, t] of [...g.product, ...g.learn, ...g.tools, ...g.co]) assert.ok(h.includes(t), `${l}: mất chữ link "${t}"`);
  for (const k of LANGS) assert.ok(h.includes(`hreflang="${k}"`), `${l}: mất link ngôn ngữ ${k}`);
  const legal = (h.match(/<span class="flegal">(.*?)<\/span>/) || [])[1] || '';
  assert.equal((legal.match(/<a /g) || []).length, g.co.filter(([u]) => LEGAL_RE.test(u)).length, `${l}: hàng pháp lý`);
  assert.ok(/privacy#delete/.test(legal) && /\/terms"/.test(legal), `${l}: Điều khoản + Xóa dữ liệu ở hàng đáy`);
  const cols = [...h.matchAll(/<details class="fg( fw)?" open>.*?<\/details>/g)];
  assert.equal(cols.length, 3, `${l}: 3 cột`);
  for (const c of cols) { const n = (c[0].match(/<li>/g) || []).length, rows = c[1] ? Math.ceil(n / 2) : n; assert.ok(rows <= 5, `${l}: cột ${rows} hàng > 5 (ngân sách chiều cao)`); }
  assert.ok(/class="fbot".*class="fctl".*class="tsp|class="fbot".*class="fctl"/s.test(h) && h.includes('class="ftm"'), `${l}: hàng đáy + nhãn hiệu`);
}
// CSS: vùng bấm ≥ 44 px cả máy tính (cổng web-sweep/theme-static), ≥ 48 px điện thoại; gọn nhờ bố cục, không nhờ thu nhỏ ô bấm
assert.match(FOOT_CSS, /\.site-foot \.fg a,\.flegal a\{[^}]*min-height:44px/);
assert.match(FOOT_CSS, /\.fbtn\{[^}]*min-height:44px/);
// web-sweep đo cả tiêu đề nhóm (summary) trên desktop và bề ngang link pháp lý ngắn ("Terms") trên điện thoại
assert.match(FOOT_CSS, /\.fg summary\{[^}]*min-height:44px/);
assert.match(FOOT_CSS, /\.flegal a\{[^}]*min-width:44px/);
// Điện thoại: .fbrand xếp dọc → flex-basis 260px của khối 1024px thành CHIỀU CAO đoạn mô tả (chân trang 793–841 px > trần 760): phải huỷ trong khối 720px
assert.match(FOOT_CSS, /max-width:720px\).*\.fbrand\{flex-direction:column[^}]*\}\.fbrand p\{flex:none\}/s);
assert.match(FOOT_CSS, /@media \(max-width:720px\)\{.*\.site-foot \.fg a,\.flegal a\{min-height:48px\}/s);
assert.match(FOOT_CSS, /@media \(max-width:720px\)\{.*\.fg summary\{[^}]*pointer-events:auto/s);
assert.match(TAP_CSS, /\.site-foot li a,\.flangs a\{display:inline-flex[^}]*min-height:44px/);
assert.ok(FOOT_JS.includes('x.open=!q.matches') && FOOT_JS.includes("'(max-width:720px)'"), 'điện thoại: gập hết');
// Trang đã commit đã dựng lại bằng generator (privacy/terms/credits/schools ×16 + 404)
for (const f of ['web/privacy.html', 'web/en/terms.html', 'web/404.html']) assert.ok(fs.readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8').includes('class="flegal"'), `${f} cũ – chạy build-legal/build-landing`);

if (process.argv.includes('--browser')) {
  const { chromium } = await import('playwright'), { serve } = await import('../quality/serve.mjs'), path = await import('node:path');
  const i = process.argv.indexOf('--browser'), ROOT = path.resolve(process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : 'dist');
  const srv = await serve(ROOT, 0), br = await chromium.launch(); let bad = 0;
  for (const p of ['/privacy', '/en/terms', '/ar/privacy', '/vi/blog/']) for (const vp of [{ n: 'desktop', width: 1280, height: 800, max: 480 }, { n: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true, max: 760 }]) {
    const ctx = await br.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch }), pg = await ctx.newPage();
    const r = await pg.goto(srv.origin + p, { waitUntil: 'load' }); if (!r || !r.ok()) { await ctx.close(); continue; }
    await pg.waitForTimeout(1200);
    const m = await pg.evaluate(() => { const f = document.querySelector('footer.site-foot'); if (!f) return null; const a = [...f.querySelectorAll('a,summary,button')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').map(e => e.getBoundingClientRect()); return { h: Math.round(f.getBoundingClientRect().height), sw: document.documentElement.scrollWidth - innerWidth, minTap: Math.round(Math.min(...a.map(r => Math.min(r.height, r.width)))) }; });
    if (!m) continue;
    const err = [m.h > vp.max && `cao ${m.h}px > ${vp.max}`, m.sw > 0 && `tràn ngang ${m.sw}px`, vp.isMobile && m.minTap < 44 && `vùng chạm ${m.minTap}px < 44`, !vp.isMobile && m.minTap < 44 && `vùng bấm ${m.minTap}px < 44`].filter(Boolean);
    console.log(`${err.length ? '✗' : '✓'} ${vp.n} ${p}: footer ${m.h}px${err.length ? ' – ' + err.join(', ') : ''}`); bad += err.length;
    await ctx.close();
  }
  await br.close(); srv.close && srv.close();
  if (bad) { console.error(`site-footer: ${bad} lỗi`); process.exit(1); }
}
console.log('✓ site-footer: 15 ngôn ngữ đủ link, 3 cột ≤ 5 hàng, hàng đáy pháp lý, gập trên điện thoại');
