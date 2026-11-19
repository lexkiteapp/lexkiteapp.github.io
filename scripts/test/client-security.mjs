// Hồi quy bảo mật phía client (XSS): dữ liệu công khai/nhập từ file/Markdown không được thành mã chạy.
//  1) admin-reports.js: mức độ (sev / ai.severity) từ D1 chỉ hiện P0–P3 – không chèn HTML vào trang quản trị.
//  2) ui.js pic(): link ghi nguồn ảnh (imageCredit.link, có thể đến từ file nhập) chỉ nhận http(s) – chặn javascript:.
//  3) build-blog.mjs: link/ảnh/CTA trong Markdown chặn javascript:/data:/vbscript:.
// Chạy: node scripts/test/client-security.mjs  (không mạng – fetch giả lập)
import fs from 'node:fs';
import vm from 'node:vm';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const rd = f => fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));
const EVIL = '<img src=x onerror="window.__pwn=1">';

// ---------- 1) Quản trị → Báo lỗi ----------
{
  const dom = new JSDOM('<!doctype html><html><head></head><body><main id="m"></main></body></html>', { url: 'https://lexkite.com/admin.html#reports', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, d = w.document;
  w.console.error = () => {};
  w.firebase = { auth: () => ({ currentUser: { getIdToken: async () => 'tok' } }) };
  const row = { tid: 'LX-1', status: 'new', sev: EVIL, cat: 'bug', area: 'other', msg: 'hi', at: Date.now(), ai: { severity: EVIL, summary_vi: 's' }, ctx: {} };
  w.fetch = async (u, init) => { const b = JSON.parse(init.body); const j = b.op === 'list' ? { rows: [row], total: 1, counts: {}, areas: [], admins: [] } : b.op === 'get' ? row : {}; return { ok: true, status: 200, json: async () => j }; };
  w.eval(rd('web/js/admin-reports.js'));
  const main = d.getElementById('m');
  w.AdminReports.render(main, s => s, { esc, num: x => x, when: x => String(x), lang: () => 'en' });
  await tick(20);
  ok(main.querySelector('.rp-row'), 'admin-reports: danh sách đã vẽ');
  ok(!main.querySelector('.rp-sev img') && !main.innerHTML.includes('onerror'), 'admin-reports: sev độc không thành thẻ HTML trong danh sách');
  const open = main.querySelector('.rp-open'); if (open) open.click();
  await tick(20);
  const dr = d.querySelector('.rp-dr');
  ok(dr && !dr.querySelector('.rp-sev img') && !dr.innerHTML.includes('onerror'), 'admin-reports: sev/ai.severity độc không thành thẻ HTML trong ngăn chi tiết');
  ok(!w.__pwn, 'admin-reports: không chạy mã');
  ok(rd('web/js/admin-reports.js').includes("hasOwnProperty.call(SEVC, v) ? v : '?'"), 'admin-reports: sevChip chỉ in P0–P3');
  dom.window.close();
}

// ---------- 2) UI.pic(): link ghi nguồn ảnh ----------
{
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://lexkite.com/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.t = s => s; w.I18N = { lang: () => 'en', t: s => s, tk: s => s }; w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.eval(rd('web/js/ui.js'));
  const pic = w.UI && w.UI.pic;
  ok(typeof pic === 'function', 'ui.js: UI.pic có xuất');
  if (pic) {
    const host = w.document.createElement('div');
    for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x']) {
      host.innerHTML = pic({ word: 'kite', image: 'https://img.example/k.jpg', imageCredit: { link: bad, text: 't' } });
      const a = host.querySelector('a.pcredit');
      ok(a && !/^\s*(javascript|data|vbscript):/i.test(a.getAttribute('href')), 'ui.js: chặn link ghi nguồn ' + JSON.stringify(bad));
    }
    host.innerHTML = pic({ word: 'kite', image: 'https://img.example/k.jpg', imageCredit: { link: 'https://openverse.org/image/1', text: 't' } });
    ok(host.querySelector('a.pcredit').getAttribute('href') === 'https://openverse.org/image/1', 'ui.js: giữ link https hợp lệ');
  }
  dom.window.close();
}

// ---------- 3) build-blog.mjs: safeUrl ----------
{
  const src = rd('scripts/build-blog.mjs');
  const line = (src.match(/^const safeUrl = .*$/m) || [''])[0];
  ok(line, 'build-blog: có safeUrl');
  const safeUrl = line ? vm.runInNewContext(line.replace(/^const safeUrl = /, '(').replace(/;\s*$/, '') + ')') : () => 'x';
  for (const bad of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'vbscript:msgbox']) ok(!safeUrl(bad), 'build-blog: chặn ' + bad);
  for (const good of ['https://lexkite.com/', 'http://example.com/a', '/vi/blog/x/', '/#/review', '#faq', 'mailto:support@lexkite.com', 'relative/page']) ok(safeUrl(good) === good, 'build-blog: giữ ' + good);
  ok(/if \(!safeUrl\(h\)\) return t;/.test(src), 'build-blog: link Markdown dùng safeUrl');
  ok(/safeUrl\(src\) \? `<img/.test(src), 'build-blog: ảnh Markdown dùng safeUrl');
  ok(/href="\$\{esc\(toApp\(safeUrl\(m\[1\]\) \|\| appHref\(lang\)\)\)\}"/.test(src), 'build-blog: CTA dùng safeUrl (+ toApp: /#/… → /app/#/…)');
}

console.log(fails ? `✗ client-security: ${fails}/${n} lỗi` : `✓ client-security: ${n} kiểm tra đạt`);
process.exit(fails ? 1 : 0);
