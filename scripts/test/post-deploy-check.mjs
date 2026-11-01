// 🔎 Soát bản LIVE lexkite.com sau mỗi lượt Pages deploy (post-deploy-check.yml): tải các tuyến chính bằng Chromium thật ở 390px & 1440px,
// gom lỗi console, ngoại lệ chưa bắt, request same-origin 4xx/5xx hoặc hỏng, ảnh vỡ, trang trống. Có lỗi → exit 1 (workflow đỏ → ci-triage mở issue ci-failure).
// Dùng: node scripts/test/post-deploy-check.mjs [base=https://lexkite.com] [thư-mục-ra=out/post-deploy]   Env: WAIT_SW=1 (chờ live có sw.js bằng repo, tối đa 6 phút), LEXKITE_CI_HEADER, PDC_IGNORE (regex bỏ qua, thêm vào mặc định)
// Tương phản/visual guard dùng lại scripts/test/contrast.mjs (bước riêng trong workflow). Không gọi API trả phí.
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = (process.argv[2] || 'https://lexkite.com').replace(/\/$/, '');
const OUT = process.argv[3] || 'out/post-deploy';
fs.mkdirSync(OUT, { recursive: true });
const ORIGIN = new URL(BASE).origin;
const CI = process.env.LEXKITE_CI_HEADER ? { 'X-Lexkite-CI': process.env.LEXKITE_CI_HEADER.trim() } : {};
const IGNORE = new RegExp(['favicon', '/cdn-cgi/', '/api/hit', process.env.PDC_IGNORE].filter(Boolean).join('|'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Chờ Cloudflare build xong: sw.js live (lexkite-<số>) khớp bản repo; hết giờ vẫn chạy tiếp (không đỏ vì chờ)
async function waitLive() {
  const want = (fs.existsSync('web/sw.js') ? fs.readFileSync('web/sw.js', 'utf8').match(/lexkite-\d+/) || [] : [])[0];
  if (!want) return 'không đọc được web/sw.js – bỏ qua chờ';
  const t0 = Date.now(); let live = '';
  while (Date.now() - t0 < 6 * 60e3) {
    try { live = ((await (await fetch(BASE + '/sw.js?x=' + Date.now(), { headers: CI })).text()).match(/lexkite-\d+/) || [])[0]; } catch (e) { live = ''; }
    if (live === want) return `live = ${want} sau ${Math.round((Date.now() - t0) / 1000)}s`;
    await sleep(20000);
  }
  return `live ${live || '?'} ≠ repo ${want} sau 6 phút – kiểm tra bản live hiện tại`;
}

const APP = `${BASE}/app/?sandbox=1&hl=en`;
const PAGES = [
  { n: 'landing add-on /', u: `${BASE}/?home=1`, must: 'chromewebstore' },
  { n: 'landing /en/', u: `${BASE}/en/`, must: '' },
  ...['home', 'vocab', 'skills', 'tests', 'me', 'dict/hello'].map(r => ({ n: 'app #/' + r, u: `${APP}#/${r}`, app: true })),
  { n: 'blog /en/blog/', u: `${BASE}/en/blog/`, must: 'Lexkite Blog' },
  { n: 'blog bài (đầu danh sách /en/blog/)', u: null, article: true },
];
const VPS = [{ id: 'm390', width: 390, height: 844, isMobile: true, hasTouch: true }, { id: 'd1440', width: 1440, height: 900 }];

async function visit(browser, vp, pg, url) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, extraHTTPHeaders: CI });
  const page = await ctx.newPage(), errs = [], add = (t, m) => { m = String(m).replace(/\s+/g, ' ').slice(0, 300); if (!IGNORE.test(m) && !errs.some(e => e.t === t && e.m === m)) errs.push({ t, m }); };
  const same = u => { try { return new URL(u).origin === ORIGIN; } catch (e) { return false; } };
  page.on('console', m => { if (m.type() === 'error' && (!m.location().url || same(m.location().url))) add('console', m.text() + (m.location().url ? ' @' + m.location().url : '')); });
  page.on('pageerror', e => add('exception', e.message));
  page.on('response', r => { if (r.status() >= 400 && same(r.url())) add('http' + r.status(), r.request().method() + ' ' + r.url()); });
  page.on('requestfailed', r => { if (same(r.url()) && !/ERR_ABORTED/.test(r.failure()?.errorText || '')) add('reqfail', r.url() + ' ' + (r.failure()?.errorText || '')); });
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(async e => { add('nav', e.message); return null; });
    if (resp && resp.status() >= 400) add('http' + resp.status(), 'tài liệu ' + url);
    await page.waitForTimeout(pg.app ? 1500 : 500);
    // cuộn hết trang để ảnh lazy tải rồi mới soi ảnh vỡ
    await page.evaluate(async () => { const h = document.scrollingElement.scrollHeight; for (let y = 0; y < Math.min(h, 12000); y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); }).catch(() => {});
    await page.waitForTimeout(800);
    const info = await page.evaluate(() => ({
      text: (document.body.innerText || '').trim().length, title: document.title,
      broken: [...document.images].filter(i => i.currentSrc && i.complete && i.naturalWidth === 0 && !/^data:/.test(i.currentSrc)).map(i => i.currentSrc).slice(0, 8),
      view: document.querySelector('#view') ? (document.querySelector('#view').innerText || '').trim().length : -1,
      hash: location.hash,
    })).catch(e => { add('exception', 'evaluate: ' + e.message); return null; });
    if (info) {
      for (const b of info.broken) if (!IGNORE.test(b)) add('img', b);
      if (info.text < 40) add('empty', `trang gần như trống (${info.text} ký tự)`);
      if (pg.app && info.view >= 0 && info.view < 20) add('empty', `#view trống (${info.view} ký tự) ở ${info.hash}`);
      if (!info.title) add('title', 'thiếu <title>');
    }
    if (pg.must) { const html = await page.content(); if (!html.includes(pg.must)) add('content', `thiếu "${pg.must}"`); }
  } finally { await ctx.close(); }
  return errs;
}

const lines = [], failed = [];
const note = (await (process.env.WAIT_SW === '1' ? waitLive() : 'không chờ deploy (chạy tay)'));
console.log('deploy:', note);
const browser = await chromium.launch();
// bài blog đầu danh sách: lấy link từ /en/blog/
let article = null;
try { const r = await fetch(BASE + '/en/blog/', { headers: CI }); const t = await r.text(); article = (t.match(/href="(\/en\/blog\/[^"#?]+?)"/g) || []).map(x => x.slice(6, -1)).find(h => h.replace(/\/$/, '') !== '/en/blog' && !/\.(xml|json|css|js)$/.test(h)) || null; } catch (e) {}
const t0 = Date.now();
for (const pg of PAGES) {
  const url = pg.article ? (article ? BASE + article : null) : pg.u;
  if (!url) { failed.push({ n: pg.n, vp: '-', errs: [{ t: 'content', m: 'không tìm thấy link bài blog trong /en/blog/' }] }); continue; }
  for (const vp of VPS) {
    let errs = await visit(browser, vp, pg, url);
    if (errs.length) { const again = await visit(browser, vp, pg, url); errs = errs.filter(e => again.some(a => a.t === e.t && a.m === e.m)); } // lỗi chập chờn (mạng) không tính, chỉ lỗi lặp lại
    lines.push(`| ${pg.n} | ${vp.id} | ${errs.length ? '❌ ' + errs.length : '✅'} |`);
    if (errs.length) failed.push({ n: pg.n + ' ' + url.replace(BASE, ''), vp: vp.id, errs });
    console.log(pg.n, vp.id, errs.length ? errs : 'ok');
  }
}
await browser.close();
const n = failed.reduce((a, f) => a + f.errs.length, 0);
let md = `### 🔎 Post-deploy check ${BASE}: ${n ? '❌ ' + n + ' lỗi ở ' + failed.length + ' trang×màn' : '✅ đạt'}\n\n- Chờ deploy: ${note}\n- Thời gian: ${Math.round((Date.now() - t0) / 1000)}s · khung 390px + 1440px\n\n| Trang | Khung | Kết quả |\n|---|---|---|\n${lines.join('\n')}\n`;
if (failed.length) md += '\n#### Chi tiết lỗi\n' + failed.map(f => `- **${f.n}** [${f.vp}]\n` + f.errs.map(e => `  - \`${e.t}\` ${e.m}`).join('\n')).join('\n') + '\n';
fs.writeFileSync(OUT + '/report.md', md);
fs.writeFileSync(OUT + '/report.json', JSON.stringify({ base: BASE, note, failed }, null, 1));
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
process.exit(n ? 1 : 0);
