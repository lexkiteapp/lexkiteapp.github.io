// 👩‍🏫 Kiểm hình "1 bộ nhân vật" trên ảnh chụp (CI characters-shots.yml): mở các màn có giáo viên, ghi MỌI ảnh/video trình duyệt tải
// (cả tải lúc chạy) + ảnh <img>/<video>/canvas giáo viên đang hiện. Mỗi tài sản nhân vật phải có sha256 trùng web/teach/characters.json;
// tài sản nhân vật lạ (img/teach, img/call, cine/teachers, sprite…) = lỗi. Xuất ảnh chụp + audit.json + tờ sheet.html cho owner.
// Dùng: node scripts/test/characters-shots.mjs <web> <out> [--live https://lexkite.com]  (--live: soát bản đang chạy thật, không chặn mạng)
import fs from 'node:fs';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { serve } from './ux-guard-lib.mjs';

const args = process.argv.slice(2), LIVE = args.includes('--live') ? args[args.indexOf('--live') + 1] : null;
const [ROOT = 'web', OUT = 'out/characters'] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--live');
fs.mkdirSync(OUT, { recursive: true });
const R = JSON.parse(fs.readFileSync(`${ROOT}/teach/characters.json`, 'utf8'));
// miễn trừ tạm, cùng mục WAIVE của characters-gate.mjs: ảnh Mia ở #/call – PR #194 thay bằng Ama/Carlos
const WAIVE = [/\/img\/call\/mia\.webp$/];
const OK = new Map(Object.entries(R.files).map(([f, v]) => [v.sha256, f]));
const CHAR = /\/(teach\/|img\/teach\/|img\/call\/|cine\/teachers|teachers3d|chars\/)|sprite\.json|mouths\.webp/;
// màn có giáo viên: bản đồ ux1 (giáo viên cạnh nút kế tiếp), bài học (Ama/Carlos đọc lời nhắc), truyện 2 người, chuỗi/ăn mừng, gọi, trang chủ
const ROUTES = [['home', ''], ['train', 'train'], ['lesson', 'lesson/go'], ['story', 'lesson/go?story=1'], ['streak', 'streak'], ['call', 'call']];
const browser = await chromium.launch(), rows = [], errs = [];
for (const [w, scheme] of [[390, 'light'], [1366, 'dark']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 }, deviceScaleFactor: w < 768 ? 2 : 1, colorScheme: scheme, serviceWorkers: 'block' });
  await ctx.addInitScript(() => { try { localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.ret', '1'); localStorage.setItem('lk.lesson_mix', '1'); } catch (e) { /* */ } });
  if (!LIVE) await serve(ctx, ROOT);
  const base = LIVE ? `${LIVE.replace(/\/$/, '')}/app/?ux1=1&ret=1&hl=en` : 'https://lk.test/app/?sandbox=1&ux1=1&ret=1&hl=en';
  for (const [name, hash] of ROUTES) {
    const page = await ctx.newPage(), got = [], tag = `${name}-${w}-${scheme}`;
    page.on('response', async r => {
      const u = r.url(), t = r.headers()['content-type'] || '';
      if (!/^image\/|^video\//.test(t) && !/\.(webp|png|jpe?g|mp4|webm|avif|gif)(\?|$)/.test(u)) return;
      if (!CHAR.test(u)) return;
      // video tải từng phần (206/range) → hash TRỌN tệp qua request riêng, không hash 1 mảnh
      try { const b = r.status() === 206 || /^video\//.test(t) ? (LIVE ? Buffer.from(await (await fetch(u)).arrayBuffer()) : fs.readFileSync(ROOT + decodeURIComponent(new URL(u).pathname))) : await r.body(); got.push({ u, sha: crypto.createHash('sha256').update(b).digest('hex'), status: r.status() === 206 ? 200 : r.status() }); } catch (e) { got.push({ u, sha: null, status: r.status() }); }
    });
    await page.goto(`${base}#/${hash}`, { waitUntil: 'load' }).catch(e => errs.push(`${tag}: ${e.message}`));
    await page.waitForTimeout(3500);
    const onScreen = await page.evaluate(() => [...document.querySelectorAll('img,video,canvas.tch-cv')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 8 && b.height > 8 && b.bottom > 0 && b.top < innerHeight; })
      .map(e => ({ tag: e.tagName, src: e.currentSrc || e.src || '', cls: e.className || '' }))).catch(() => []);
    await page.screenshot({ path: `${OUT}/${tag}.png` });
    for (const g of got) {
      const reg = g.sha && OK.get(g.sha);
      if (g.status >= 400) continue;   // 404 = không có tài sản → app ẩn/poster, không phải nhân vật lạ
      const wv = !reg && WAIVE.some(w => w.test(g.u));
      if (!reg && !wv) errs.push(`${tag}: tài sản nhân vật KHÔNG thuộc registry: ${g.u}`);
      rows.push({ screen: tag, url: g.u.replace(/^https?:\/\/[^/]+/, ''), registry: reg || null, ok: wv ? null : !!reg, note: wv ? 'miễn trừ tạm #194 (Mia → Ama/Carlos)' : '' });
    }
    for (const e of onScreen) if (CHAR.test(e.src) && !rows.some(r => r.screen === tag && e.src.endsWith(r.url))) rows.push({ screen: tag, url: e.src.replace(/^https?:\/\/[^/]+/, ''), registry: null, ok: null, note: 'đang hiện (bộ nhớ đệm)' });
    await page.close();
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/audit.json`, JSON.stringify({ live: LIVE, rows, errs }, null, 1));
const shots = fs.readdirSync(OUT).filter(f => f.endsWith('.png')).sort();
fs.writeFileSync(`${OUT}/sheet.html`, `<!doctype html><meta charset="utf-8"><title>Characters ${LIVE || 'build'}</title><style>body{font:14px system-ui;margin:16px}img{width:260px;border:1px solid #ccc;margin:4px}td{padding:2px 8px;border-bottom:1px solid #eee}.x{color:#c00}</style>
<h1>Nhân vật trên mọi màn – ${LIVE || 'bản build'}</h1><table>${rows.map(r => `<tr class="${r.ok === false ? 'x' : ''}"><td>${r.screen}</td><td>${r.url}</td><td>${r.registry || (r.ok === false ? '✗ NGOÀI REGISTRY' : r.note || '')}</td></tr>`).join('')}</table>
${shots.map(f => `<figure style="display:inline-block"><img src="${f}"><figcaption>${f}</figcaption></figure>`).join('')}`);
console.log(`${rows.length} tài sản nhân vật trên ${shots.length} ảnh chụp; lỗi: ${errs.length}`);
if (errs.length) { console.error('✗ characters-shots\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('✓ characters-shots: mọi giáo viên trên màn hình trùng hash registry');
