// 🃏 Ảnh trước/sau các THẺ HỌC có trạng thái (sổ lỗi sai có dữ liệu, làm lại, thẻ ôn đã lật, bài ngữ pháp) – bổ sung ux-shots.mjs (chỉ chụp trang trống).
// Điện thoại 360 px + máy tính · sáng/tối · en/vi/ar (RTL). Phục vụ thẳng web/ (page.route), ?sandbox=1 → 0 lượt chạm prod. Đo: tràn ngang, mỗi thẻ ≤1 loa/IPA cho cùng một từ, loa lệch hàng.
// Dùng: node scripts/test/ux-cards.mjs <web-sau> [web-trước] [out=out/ux-cards]   (CI: .github/workflows/ux-cards.yml, đẩy nhánh ux-cards*)
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
const [AFTER, BEFORE, OUT = 'out/ux-cards'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const SHOTS = ['mistakes', 'mistakes?retry=1', 'review', 'grammar/tenses'];
const CONFIGS = [['mobile', 'light', 'en'], ['mobile', 'dark', 'vi'], ['mobile', 'light', 'ar'], ['desktop', 'dark', 'vi'], ['desktop', 'light', 'en']];
const MISTAKES = [
  { kind: 'vocab', q: 'Nghĩa của “compulsory”?', qK: { k: 'Nghĩa của “{word}”?', v: { word: 'compulsory' } }, answer: 'bắt buộc', given: 'tùy chọn', explain: 'compulsory /kəmˈpʌlsəri/ = bắt buộc', ref: 'compulsory', key: 'v1' },
  { kind: 'vocab', q: 'Nghĩa của “compulsory”?', qK: { k: 'Nghĩa của “{word}”?', v: { word: 'compulsory' } }, answer: 'compulsory', given: 'compulsary', explain: 'compulsory /kəmˈpʌlsəri/ = bắt buộc', ref: 'compulsory', key: 'v2' },
  { kind: 'vocab', q: 'Từ tiếng Anh nghĩa là “bền vững”?', qK: { k: 'Từ tiếng Anh nghĩa là “{vi}”?', v: { vi: 'bền vững' } }, answer: 'sustainable', given: 'suitable', explain: 'sustainable /səˈsteɪnəbl/ = bền vững', ref: 'sustainable', key: 'v3' },
  { kind: 'grammar', q: 'She ___ here since 2010.', answer: 'has lived', given: 'lives', explain: 'Hiện tại hoàn thành: hành động bắt đầu trong quá khứ, còn kéo dài tới nay (since + mốc thời gian).', ref: 'tenses', key: 'g1' },
  { kind: 'reading', q: 'Urban farming: Which paragraph mentions rooftop gardens?', answer: 'Paragraph C', given: 'Paragraph A', explain: 'Đoạn C: “rooftop gardens now supply…”', ref: '', key: 'r1' }
].map((m, i) => ({ ...m, n: 1 + (i % 3), at: Date.now() - i * 864e5, fixed: false }));
const browser = await chromium.launch();
const report = { errs: [], metrics: {} };
async function run(TAG, ROOT, vn, scheme, lang) {
  const vp = vn === 'mobile' ? { viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 860 } };
  const ctx = await browser.newContext({ ...vp, colorScheme: scheme, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
  const page = await ctx.newPage(); page.on('pageerror', e => report.errs.push(`${TAG}-${vn}-${lang}: ${e.message}`));
  const url = h => `https://lk.test/app/?sandbox=1&hl=${lang}#/${h}`;
  await page.goto(url('home'), { waitUntil: 'load' }); await page.waitForTimeout(2500);
  await page.evaluate(async M => {
    const C = Core.Cards, now = Date.now();
    const mk = async (e, srs) => { const c = C.make(e); c.srs = { ef: 2.5, interval: 5, reps: 3, lapses: 0, due: now - 1000, last: now - 5 * 864e5, step: 0, S: 5, D: 4, ...srs }; await C.update(c); };
    await mk({ word: 'sustainable', ipa: '/səˈsteɪnəbl/', pos: 'adjective', vi: 'bền vững', def: 'able to continue over a period of time', ex: 'We need a sustainable plan that keeps working for many years without harming the environment.' }, { D: 3 });
    await Core.Store.set('mistakes', M);
  }, MISTAKES).catch(e => report.errs.push(`${TAG}-${vn}-${lang}: seed ${e.message}`));
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
  for (const r of SHOTS) {
    await page.goto(url(r), { waitUntil: 'load' }); await page.waitForTimeout(1800);
    if (r === 'review') { await page.click('#flash').catch(() => {}); await page.waitForTimeout(700); }
    const name = `${TAG}-${vn}-${scheme}-${lang}-${r.replace(/[/?=]/g, '_')}`;
    await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 70, fullPage: r.startsWith('mistakes') });
    report.metrics[name] = await page.evaluate(() => {
      const out = { overflowX: document.documentElement.scrollWidth - innerWidth, dupSay: [], ragged: 0 };
      for (const c of document.querySelectorAll('#mList .card')) { const s = [...c.querySelectorAll('[data-speak]')].map(b => b.dataset.speak.toLowerCase()); if (new Set(s).size < s.length || c.querySelectorAll('.ipa').length > 1) out.dupSay.push(c.textContent.trim().slice(0, 30)); }
      // loa đứng giữa dòng chữ (không ở mép cuối khối) = lệch hàng
      for (const b of document.querySelectorAll('#view [data-speak-text], #view [data-speak]')) { const p = b.parentElement, pb = p.getBoundingClientRect(), bb = b.getBoundingClientRect(); if (pb.width > 200 && Math.abs((document.dir === 'rtl' ? bb.left - pb.left : pb.right - bb.right)) > 40 && p.textContent.trim().length > 40 && !p.matches('.say-line, .mb-pron, .row')) out.ragged++; }
      return out;
    }).catch(e => ({ err: e.message }));
  }
  await ctx.close();
}
for (const [TAG, ROOT] of [['before', BEFORE], ['after', AFTER]]) if (ROOT) for (const [vn, sc, lang] of CONFIGS) await run(TAG, ROOT, vn, sc, lang);
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
try {
  for (const [vn, sc, lang] of CONFIGS) {
    const files = ['before', 'after'].flatMap(TAG => SHOTS.map(r => path.join(OUT, `${TAG}-${vn}-${sc}-${lang}-${r.replace(/[/?=]/g, '_')}.jpg`))).filter(f => fs.existsSync(f)); if (!files.length) continue;
    execFileSync('montage', [...files, '-tile', `${SHOTS.length}x`, '-geometry', vn === 'mobile' ? '300x+6+6' : '560x+6+6', '-background', '#888', '-quality', '72', path.join(OUT, `sheet-${vn}-${sc}-${lang}.jpg`)]); // hàng 1 = trước, hàng 2 = sau
  }
} catch (e) { console.log('montage bỏ qua:', e.message); }
const after = Object.entries(report.metrics).filter(([k]) => k.startsWith('after'));
console.log(after.map(([k, m]) => `${k}: tràn ${m.overflowX} · lặp loa/IPA ${m.dupSay?.length} · loa lệch ${m.ragged}`).join('\n')); console.log('lỗi JS:', report.errs.length, JSON.stringify(report.errs.slice(0, 20)));
if (report.errs.some(e => e.startsWith('after')) || after.some(([, m]) => m.overflowX > 1 || (m.dupSay && m.dupSay.length))) process.exit(1);
