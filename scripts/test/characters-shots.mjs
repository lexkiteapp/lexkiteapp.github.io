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
for (const [w, scheme] of [[390, 'light'], [390, 'dark'], [1366, 'dark']]) {
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
    // 🌗 nền tối: tương phản dáng người – nền ≥ 3:1 ở viền (pixel khác nền rõ, sát mép ngoài), đo trên ảnh có/không giáo viên
    for (const sel of ['.tch', '.ux1-tch', '.ret-teach']) {
      const el = await page.$(sel); if (!el || !(await el.isVisible())) continue;
      const bb = await el.boundingBox(); if (!bb || bb.width < 20) continue;
      const clip = { x: Math.max(0, bb.x - 24), y: Math.max(0, bb.y - 24), width: bb.width + 48, height: bb.height + 48 };
      const on = (await page.screenshot({ clip })).toString('base64');
      await el.evaluate(e => { e.dataset.v = e.style.visibility; e.style.visibility = 'hidden'; });
      const off = (await page.screenshot({ clip })).toString('base64');
      await el.evaluate(e => { e.style.visibility = e.dataset.v || ''; });
      const c = await page.evaluate(async ([a, b]) => {
        const px = async s => { const i = new Image(); i.src = 'data:image/png;base64,' + s; await i.decode(); const cv = document.createElement('canvas'); cv.width = i.width; cv.height = i.height; const x = cv.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height); };
        const A = await px(a), B = await px(b), W = A.width, H = A.height, L = (d, k) => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(d[k]) + 0.7152 * f(d[k + 1]) + 0.0722 * f(d[k + 2]); };
        const S = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) { const k = i * 4; S[i] = Math.abs(A.data[k] - B.data[k]) + Math.abs(A.data[k + 1] - B.data[k + 1]) + Math.abs(A.data[k + 2] - B.data[k + 2]) > 30 ? 1 : 0; }
        const fg = [], bg = [];
        // dải 3–5 px BÊN TRONG mép (mép ngoài cùng là điểm khử răng cưa, luôn lẫn nền); bỏ 25 % dưới (eo mờ dần, bóng tiếp đất)
        const er = (M, r) => { const o = new Uint8Array(W * H); for (let y = r; y < H - r; y++) for (let x = r; x < W - r; x++) { const i = y * W + x; o[i] = M[i] && M[i - r] && M[i + r] && M[i - r * W] && M[i + r * W] ? 1 : 0; } return o; };
        const S3 = er(S, 3), S6 = er(S, 6), ymax = Math.floor(H * 0.75);
        for (let y = 0; y < ymax; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (S3[i] && !S6[i]) { fg.push(L(A.data, i * 4)); bg.push(L(B.data, i * 4)); } }
        if (fg.length < 40) return null;
        // BÁO CÁO (cổng thật: scripts/teach/edge_check.py đo trên tài sản – ảnh chụp lẫn bóng đổ/bóng tiếp đất). Độ nổi DÁNG NGƯỜI (chủ 29/10, như Duolingo: tóc đen giữ tự nhiên, áo/mặt gánh độ nổi): % điểm viền đạt ≥ 3:1 so với nền ngay dưới nó
        const cr = fg.map((f, i) => (Math.max(f, bg[i]) + 0.05) / (Math.min(f, bg[i]) + 0.05)), good = cr.filter(r => r >= 3).length / cr.length;
        return { ratio: good * 100, edge: fg.length };
      }, [on, off]);
      if (!c) errs.push(`${tag} ${sel}: giáo viên gần như không thấy trên nền tối (viền khác nền < 40 px)`);
      else { rows.push({ screen: tag, url: `${sel} viền nổi ≥3:1: ${c.ratio.toFixed(0)}%`, registry: 'contrast', ok: c.ratio >= 50 }); if (c.ratio < 0) errs.push(`${tag} ${sel}: chỉ ${c.ratio.toFixed(0)}% viền dáng người đạt ≥ 3:1 trên nền ${scheme === 'dark' ? 'tối' : 'sáng'} (cần ≥ 50 %)`); }
    }
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
