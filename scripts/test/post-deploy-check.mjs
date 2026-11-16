// 🔎 Soát bản LIVE lexkite.com sau mỗi lượt Pages deploy (post-deploy-check.yml): tải các tuyến chính bằng Chromium thật ở 390px & 1440px,
// kiểm đích 302 của "/", gom lỗi console, ngoại lệ chưa bắt, request same-origin 4xx/5xx hoặc hỏng, ảnh vỡ, trang trống. Có lỗi → exit 1 (workflow đỏ → ci-triage mở issue ci-failure).
// Dùng: node scripts/test/post-deploy-check.mjs [base=https://lexkite.com] [thư-mục-ra=out/post-deploy]   Env: WAIT_SW=1 (chờ live có sw.js bằng repo, tối đa 6 phút), LEXKITE_CI_HEADER, PDC_IGNORE (regex bỏ qua, thêm vào mặc định)
// Tương phản/visual guard dùng lại scripts/test/contrast.mjs (bước riêng trong workflow). Không gọi API trả phí.
import { chromium } from 'playwright';
import { shellHash, liveHash } from '../lib/sw-version.mjs';
import fs from 'fs';
import { routeCiHeader } from '../lib/http.mjs';
import { pickLang } from '../../functions/api/_rootlang.js';
const BASE = (process.argv[2] || 'https://lexkite.com').replace(/\/$/, '');
const OUT = process.argv[3] || 'out/post-deploy';
fs.mkdirSync(OUT, { recursive: true });
const ORIGIN = new URL(BASE).origin;
const CI = process.env.LEXKITE_CI_HEADER ? { 'X-Lexkite-CI': process.env.LEXKITE_CI_HEADER.trim() } : {};
const IGNORE = new RegExp(['favicon', '/cdn-cgi/', '/api/hit', process.env.PDC_IGNORE].filter(Boolean).join('|'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Chờ Cloudflare build xong: hash nội dung trong sw.js live (lexkite-0-<hash>) khớp hash tính từ web/ của repo; hết giờ vẫn chạy tiếp (không đỏ vì chờ)
async function waitLive() {
  let want = ''; try { want = shellHash('web'); } catch (e) { /* không có web/ */ }
  if (!want) return 'không tính được hash web/ – bỏ qua chờ';
  const t0 = Date.now(); let live = '';
  while (Date.now() - t0 < 6 * 60e3) {
    try { live = liveHash(await (await fetch(BASE + '/sw.js?x=' + Date.now(), { headers: CI })).text()); } catch (e) { live = ''; }
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
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
  await routeCiHeader(ctx, BASE, CI['X-Lexkite-CI']);
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
// Trang gốc quốc tế (docs/SEO-ARCH.md §10): đích 302 của "/" trên site thật khớp đúng luật, tính theo nước thật của máy chạy (runner ở Mỹ thì kiểm được nhánh Accept-Language, máy ở VN thì không)
if (BASE === 'https://lexkite.com') {
  const errs = [], cc = ((await (await fetch(BASE + '/cdn-cgi/trace')).text()).match(/\bloc=([A-Z]{2})/) || [])[1] || '';
  for (const [ck, al] of [['', ''], ['', 'de-DE,de;q=0.9'], ['', 'ja'], ['', 'vi-VN,vi;q=0.9,en;q=0.8'], ['', 'en-US,en;q=0.9'], ['', 'nl-NL'], ['lk_lang=fr', 'de'], ['lk_lang=zz', 'ko']]) {
    const r = await fetch(BASE + '/', { redirect: 'manual', headers: { ...CI, ...(al ? { 'Accept-Language': al } : {}), ...(ck ? { Cookie: ck } : {}) } }), want = pickLang(ck, cc, al), loc = r.headers.get('location') || '';
    const okLoc = want === 'vi' ? /\/vi\/\?r=1$/.test(loc) : new RegExp(`/${want}/$`).test(loc);
    console.log(`root [${cc}] cookie=${ck || '-'} al=${al || '-'} → ${r.status} ${loc}`);
    if (r.status !== 302 || !okLoc) errs.push({ t: 'root', m: `cookie=${ck || '-'} al=${al || '-'} nước=${cc}: ${r.status} ${loc}, cần /${want}/` });
    else if (!/accept-language/i.test(r.headers.get('vary') || '') || !/cookie/i.test(r.headers.get('vary') || '')) errs.push({ t: 'root', m: `thiếu Vary: ${r.headers.get('vary')}` });
  }
  for (const p of ['/vi/', '/en/', '/tu-vung/', '/samples/']) { const r = await fetch(BASE + p, { redirect: 'manual', headers: CI }); if (r.status !== 200) errs.push({ t: 'root', m: `${p}: ${r.status}, không được chuyển hướng` }); }
  lines.push(`| trang gốc / (nước ${cc}) | - | ${errs.length ? '❌ ' + errs.length : '✅'} |`);
  if (errs.length) failed.push({ n: 'trang gốc /', vp: '-', errs });
}
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
