// 🛡️ Gác bố cục cho giao diện ux1 (BẬT 100 % từ 28/10) + từng bước bài học + màn giữ chuỗi. Lõi quét: ux-guard-lib.mjs.
// Phủ: chọn mục tiêu · bản đồ chặng (tiêu đề chặng, nút xong/tiếp/khóa) · Ôn · Luyện · Giải đấu · Tôi · cột phải máy tính (3 cột)
//      · #/lesson/go?demo=1: mọi dạng bài, phiếu đúng/sai, "Vì sao?", câu dễ sau 2 lần sai (ease), "Không nghe được", màn tổng kết
//      · lịch chuỗi #/streak, mốc 7 ngày, rương quà, rã băng.
// 360/390/412/1366/1920 px · sáng/tối · en/vi/ar(RTL)/de/ru. Hermetic: phục vụ thẳng web/, ?sandbox=1, 0 lượt chạm prod, 0 tài khoản thật.
// FAIL như ux-guard.mjs + (5) nút/ô bị thanh cố định phía dưới che ở cuối trang + (6) khung nội dung bị ép hẹp. Ngưỡng chỉ được siết, không nới.
// Dùng: node scripts/test/ux1-guard.mjs <web> [out] [--part i/n] [--shots]   (--shots: chụp MỌI bước → tờ trước/sau)
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
import { serve, scan } from './ux-guard-lib.mjs';
const args = process.argv.slice(2), flags = args.filter(a => a.startsWith('--')), pos = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--part'));
const [ROOT = 'web', OUT = 'out/ux1-guard'] = pos, SHOTS = flags.includes('--shots');
const part = (args[args.indexOf('--part') + 1] || '0/1').split('/').map(Number);
fs.mkdirSync(OUT, { recursive: true });
const ROUTES = ['review', 'train', 'league', 'me', 'goal', 'streak', 'stats', 'mistakes', 'grammar'];
const ALL = [[360, 'light', 'en'], [360, 'dark', 'vi'], [390, 'dark', 'en'], [390, 'light', 'ar'], [412, 'light', 'de'], [412, 'dark', 'ru'], [1366, 'light', 'en'], [1366, 'dark', 'ar'], [1920, 'dark', 'vi'], [1920, 'light', 'en']];
const CONFIGS = ALL.filter((c, i) => i % part[1] === part[0]);
const OPT = { roots: ['#view', '#ux1Rail', '#nav', '#bnav', '#lsnFoot'], layers: true, cover: true };
const browser = await chromium.launch();
const found = {}, errs = [], seen = [];

async function run(width, scheme, lang) {
  const vp = width < 768 ? { viewport: { width, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width, height: width > 1600 ? 1080 : 860 } };
  const ctx = await browser.newContext({ ...vp, colorScheme: scheme, serviceWorkers: 'block', reducedMotion: 'reduce' });
  await ctx.addInitScript(() => { try { localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.ret', '1'); } catch (e) { /* */ } });
  await serve(ctx, ROOT);
  const page = await ctx.newPage(), tag = `${width}-${scheme}-${lang}`;
  page.on('pageerror', e => errs.push(`${tag}: ${e.message}`));
  const url = h => `https://lk.test/app/?sandbox=1&ux1=1&ret=1&hl=${lang}#/${h}`;
  const go = async (h, ms = 1600) => { await page.goto(url(h), { waitUntil: 'load' }); await page.waitForTimeout(ms); };
  const click = sel => page.evaluate(s => { const b = document.querySelector(s); if (b) b.click(); return !!b; }, sel);
  const check = async step => {
    seen.push(`${tag} ${step}`);
    const res = await page.evaluate(scan, OPT).catch(e => ({ err: [e.message] }));
    let bad = false; for (const [k, v] of Object.entries(res)) if (v.length) { bad = true; (found[k] ||= []).push(`${tag} ${step}: ${v.join(' | ')}`); }
    if (bad || SHOTS) await page.screenshot({ path: path.join(OUT, `${tag}-${step.replace(/[/?=]/g, '_')}.jpg`), type: 'jpeg', quality: 60, fullPage: true });
  };

  // Dữ liệu mẫu: thẻ + sổ lỗi sai + 7 ngày học liên tiếp (→ mốc 7 ngày, 1 rương) + 1 lượt đóng băng; chưa chọn mục tiêu
  await go('home', 2500);
  await page.evaluate(async () => {
    const C = Core.Cards, now = Date.now(), D = 864e5, key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const mk = async (e, srs) => { const c = C.make(e); c.srs = { ef: 2.5, interval: 5, reps: 3, lapses: 0, due: now - 1000, last: now - 5 * D, step: 0, S: 5, D: 4, ...srs }; await C.update(c); };
    await mk({ word: 'sustainable', ipa: '/səˈsteɪnəbl/', pos: 'adjective', vi: 'bền vững', def: 'able to continue over a period of time', ex: 'We need sustainable energy.' }, { D: 3 });
    for (const [w, v] of [['river', 'dòng sông'], ['window', 'cửa sổ'], ['decline', 'suy giảm'], ['habit', 'thói quen']]) await mk({ word: w, pos: 'noun', vi: v, ex: '' }, { due: now + 9e9 });
    await Core.Store.set('mistakes', [{ kind: 'vocab', q: 'Nghĩa của “compulsory”?', qK: { k: 'Nghĩa của “{word}”?', v: { word: 'compulsory' } }, answer: 'bắt buộc', given: 'tùy chọn', explain: 'compulsory /kəmˈpʌlsəri/ = bắt buộc', ref: 'compulsory', key: 'v1', n: 2, at: now, fixed: false }]);
    const days = {}, gd = {}; for (let i = 0; i < 7; i++) { const k = key(new Date(now - i * D)); days[k] = 12; gd[k] = { xp: 80, reviews: 12 }; }
    await Core.Store.set('stats', { days, newToday: { day: key(new Date()), n: 2 } });
    await Core.Store.set('game', { xp: 640, days: gd, freezes: 1, total: { reviews: 84, newWords: 20, quizzes: 6 }, badges: {}, questsDone: {} });
    try { localStorage.removeItem('lk.ux1.pk'); localStorage.removeItem('lk.lsn.path.demo'); } catch (e) { /* */ }
  }).catch(e => errs.push(`${tag}: seed ${e.message}`));
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
  await page.evaluate(() => { const S = window.Sync; if (!S) return; S.user = { uid: 'guard', displayName: 'Guard', getIdToken: async () => 'x' }; S.authed = async () => {}; S.league = async () => ({ member: { tier: 0, xp: 15 }, board: [{ me: true, rank: 1, zone: 'up', name: 'Guard', xp: 15 }, { rank: 2, name: 'Mai', xp: 9 }], week: { end: Date.now() + 4.85 * 864e5 } }); }).catch(() => {});

  // 🔥 Giữ chuỗi: mốc 7 ngày (tự hiện khi mở app) → rương → rã băng
  await page.evaluate(async () => { if (App.lazy) await App.lazy('streak', 'ret').catch(() => {}); if (window.Ret) Ret.check(); }).catch(() => {});
  await page.waitForFunction(() => !!document.querySelector('#modal:not([hidden]) .ret-cel'), null, { timeout: 8000 }).catch(() => errs.push(`${tag}: mốc 7 ngày không hiện`));
  await check('ret-milestone');
  if (await click('#retChestTile')) { await page.waitForTimeout(1200); await check('ret-chest'); }
  await page.evaluate(() => { const m = document.getElementById('modal'); if (m) m.hidden = true; if (window.Ret) Ret.thaw(); });
  await page.waitForTimeout(500); await check('ret-thaw');
  for (let i = 0; i < 3; i++) { await click('#retIce'); await page.waitForTimeout(150); }
  await page.waitForTimeout(500); await check('ret-thaw-done');
  await page.evaluate(() => { const m = document.getElementById('modal'); if (m) m.hidden = true; });

  // 🧭 Chọn mục tiêu → bản đồ chặng (nút đầu) → bản đồ có nút xong/tiếp/khóa + chặng sau
  await go('home?pick=1'); await check('goal-pick');
  await click('.ux1-pk-tg .chip'); await page.waitForTimeout(1600); await check('home-map');
  await page.evaluate(() => localStorage.setItem('lk.lsn.path', '4')); await go('home'); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1800); // cùng URL → goto không vẽ lại
  if (!await page.evaluate(() => !!document.querySelector('.ux1-n.done'))) errs.push(`${tag}: bản đồ n4 không có nút đã xong`);
  await check('home-map-n4');
  for (const r of ROUTES) { await go(r); await check(r); }

  // 🧩 Bài học thử (không ghi FSRS/XP): đi hết bài, 2 câu đầu cố ý sai (phiếu sai + câu dễ hơn), sau đó đúng
  await go('lesson/go?demo=1', 2200);
  const did = new Set(); let wrong = 0, easierNext = false, noListen = false;
  for (let k = 0; k < 80; k++) {
    const st = await page.evaluate(() => {
      if (document.querySelector('.lsn-end')) return { end: 1 };
      const f = document.getElementById('lsnFoot');
      if (document.getElementById('lsnNext')) return { fb: /\bok\b/.test(f.className) ? 'ok' : 'bad', why: !!document.getElementById('lsnWhy') };
      const L = App._lsn, it = L && L.sess.cur; return it ? { type: it.type + (it.choice ? '-choice' : '') + (it.noAudio ? '-noaudio' : '') + (it.retry ? '-retry' : '') } : { none: 1 };
    }).catch(e => ({ err: e.message }));
    if (st.err || st.none) { errs.push(`${tag}: lesson ${st.err || 'không có câu'}`); break; }
    if (st.end) { await page.waitForTimeout(800); await check('lesson-recap'); break; }
    if (st.fb) {
      if (!did.has('fb-' + st.fb)) { did.add('fb-' + st.fb); await check('lesson-fb-' + st.fb); }
      if (st.why && !did.has('why')) { did.add('why'); await click('#lsnWhy'); await page.waitForTimeout(900); await check('lesson-fb-why'); }
      await click('#lsnNext'); await page.waitForTimeout(500); continue;
    }
    const step = (easierNext ? 'easier-' : '') + st.type;
    if (!did.has(step)) { did.add(step); await check('lesson-' + step); }
    easierNext = false;
    if (!noListen && wrong >= 2 && await page.evaluate(() => !!document.getElementById('lsnNoL'))) { noListen = true; await click('#lsnNoL'); await page.waitForTimeout(500); continue; }
    const w = wrong < 2;
    const r = await page.evaluate(async w => {
      const L = App._lsn, it = L.sess.cur, E = LessonEngine, $ = s => document.querySelector(s);
      if (it.type === 'line') { $('#lsnGo').click(); return 'line'; }
      if ($('#lsnNoS') && (it.type === 'say' || (it.type === 'pic' && !it.choice))) { $('#lsnNoS').click(); return 'skip'; }
      if (it.type === 'match') { for (const a of document.querySelectorAll('.lsn-match [data-s=w]')) { a.click(); $(`.lsn-match [data-s=m][data-m="${a.dataset.m}"]`).click(); } return 'ok'; }
      if (it.type === 'type') { const i = $('#lsnIn'); i.value = w ? 'zzz' : it.answer; i.dispatchEvent(new Event('input')); $('#lsnCheck').click(); return w ? 'wrong' : 'ok'; }
      if (it.tiles) {
        const want = E.toks(it.answer).map(E.norm), used = new Set(), bank = [...document.querySelectorAll('#lsnBank .lsn-tile')];
        const seq = w ? [bank[bank.length - 1]] : want.map(x => { const b = bank.find(b => !used.has(b) && E.norm(b.textContent) === x); if (b) used.add(b); return b; }).filter(Boolean);
        seq.forEach(b => b.click()); $('#lsnCheck').click(); return w ? 'wrong' : 'ok';
      }
      const bs = [...document.querySelectorAll('.lsn-opts .lsn-opt')]; if (!bs.length) return 'none';
      (bs.find(b => E.check(it, b.dataset.o) !== w) || bs[0]).click(); $('#lsnCheck').click(); return w ? 'wrong' : 'ok';
    }, w).catch(e => 'err ' + e.message);
    if (r.startsWith('err') || r === 'none') { errs.push(`${tag}: lesson ${step} ${r}`); break; }
    if (r === 'wrong') { wrong++; if (wrong === 2) easierNext = true; }
    await page.waitForTimeout(r === 'ok' && st.type === 'match' ? 900 : 600);
  }
  for (const need of ['lesson-fb-ok', 'lesson-fb-bad', 'lesson-recap']) if (!seen.includes(`${tag} ${need}`)) errs.push(`${tag}: chưa tới bước ${need}`);
  await ctx.close();
}
for (const [w, sc, lang] of CONFIGS) await run(w, sc, lang).catch(e => errs.push(`${w}-${sc}-${lang}: ${e.message}`));
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ found, errs, seen }, null, 1));
for (const [k, v] of Object.entries(found)) { console.log(`\n✗ ${k}: ${v.length}`); for (const x of v.slice(0, 60)) console.log('  ' + x); }
console.log(`\nđã quét ${seen.length} màn; lỗi JS/kịch bản:`, errs.length, JSON.stringify(errs.slice(0, 20)));
if (seen.length < CONFIGS.length * 20) { console.log('✗ quá ít màn được quét – kịch bản hỏng'); process.exit(1); }
if (Object.keys(found).length || errs.length) process.exit(1);
console.log(`✓ ux1-guard: ${seen.length} màn × ${CONFIGS.length} cấu hình – không chồng lấn, không cắt, không tràn chữ, không lặp IPA/loa, không nút bị che`);
