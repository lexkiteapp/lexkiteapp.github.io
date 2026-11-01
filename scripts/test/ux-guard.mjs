// 🛡️ Gác bố cục tự động (owner 28/10: "chồng chéo, chưa chuyên nghiệp" – không để owner phải soi bằng mắt nữa).
// Mọi trang chính · 360/390/1366 px · sáng/tối · en/vi/ar (RTL). Phục vụ thẳng web/ (page.route), ?sandbox=1 → 0 lượt chạm prod.
// FAIL khi: (1) thẻ/nút/ô chữ chồng lên nhau > 4 px · (2) phần tử bị cắt bởi khung overflow:hidden hoặc mép màn hình (khung CUỘN ngang thì được phép)
//           (3) chữ tràn ra ngoài nút/chip/thẻ chứa nó · (4) cùng một IPA hoặc loa của cùng một từ hiện 2 lần trong một khối.
// Ngoại lệ có chủ đích: badge/chấm định vị tuyệt đối < 48 px, mặt sau thẻ lật (.flash .face), [data-ov-ok].
// Dùng: node scripts/test/ux-guard.mjs <web> [out=out/ux-guard]   (CI: .github/workflows/ux-cards.yml)
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
import { serve, scan } from './ux-guard-lib.mjs'; // hàm quét dùng chung với ux1-guard.mjs
const [ROOT = 'web', OUT = 'out/ux-guard'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const ROUTES = ['home', 'path', 'skills', 'practice', 'review', 'vocab', 'library', 'tests', 'mistakes', 'quick', 'me', 'stats', 'league', 'goal', 'dict/sustainable', 'confidence', 'grammar', 'grammar/tenses', 'pron/th-sounds', 'lesson'];
const CONFIGS = [[360, 'light', 'en'], [360, 'dark', 'vi'], [390, 'dark', 'en'], [390, 'light', 'ar'], [1366, 'light', 'en'], [1366, 'dark', 'vi']];
const browser = await chromium.launch();
const found = {}, errs = [];
const add = (k, v) => { (found[k] ||= []).push(v); };

async function run(width, scheme, lang) {
  const vp = width < 768 ? { viewport: { width, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width, height: 860 } };
  const ctx = await browser.newContext({ ...vp, colorScheme: scheme, serviceWorkers: 'block' });
  await serve(ctx, ROOT);
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
