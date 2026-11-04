// E2E xếp câu (web/js/word-arrange.js) trên trình duyệt thật, hermetic: ?sandbox=1, 0 lượt chạm prod, 0 tài khoản. Ảnh + video thao tác ở artifact word-arrange.
// Kiểm: chèn từ dưới vào GIỮA câu nhiều dòng · đổi chỗ · kéo ra gỡ · Esc hủy · bàn phím · hoàn tác · bố cục không nhảy · ô ≥44 px · tương phản · kết quả chấm đúng · cuộn trang từ khe giữa thẻ.
// Dùng: PW_BROWSER=chromium|webkit node scripts/test/word-arrange-e2e.mjs [web] [out]
import fs from 'node:fs'; import path from 'node:path';
import * as pw from 'playwright';
import { serve } from './ux-guard-lib.mjs';
const [ROOT = 'web', OUT = 'out/word-arrange'] = process.argv.slice(2), NAME = process.env.PW_BROWSER || 'chromium';
fs.mkdirSync(OUT, { recursive: true });
const WORDS = ['Hi', 'can', 'I', 'have', 'a', 'large', 'iced', 'coffee', 'with', 'extra', 'milk', 'please'], EXTRA = ['seven', 'day'];
const MID = 6; // "iced": từ còn thiếu, chèn vào giữa
// [rộng, chủ đề, ngôn ngữ, cảm ứng thật qua CDP (chỉ Chromium)]
const CONFIGS = NAME === 'webkit'
  ? [[390, 'dark', 'vi', false], [1366, 'light', 'en', false]]
  : [[390, 'dark', 'vi', true], [390, 'light', 'ar', true], [1366, 'light', 'en', false], [1366, 'dark', 'ar', false]];
const browser = await pw[NAME].launch();
let total = 0, fails = 0;
const ok = (c, m) => { total++; if (c) console.log('✓', m); else { fails++; console.log('✗', m); } };
const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

async function run(width, scheme, lang, touch) {
  const tag = `${NAME}-${width}-${scheme}-${lang}`, mobile = width < 768;
  const ctx = await browser.newContext({ viewport: { width, height: mobile ? 844 : 860 }, colorScheme: scheme, locale: lang, serviceWorkers: 'block', hasTouch: mobile && NAME === 'chromium', recordVideo: { dir: path.join(OUT, 'video-raw'), size: { width: Math.min(width, 900), height: 700 } } });
  await serve(ctx, ROOT);
  const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  const cdp = touch ? await ctx.newCDPSession(page) : null;
  const T = m => `${tag}: ${m}`;
  const shot = n => page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) });
  // Con trỏ thật: chuột (Playwright) hoặc cảm ứng thật (CDP Input.dispatchTouchEvent → pointerType touch, đi qua touch-action như máy thật)
  const P = {
    async down(x, y) { if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); else { await page.mouse.move(x, y); await page.mouse.down(); } },
    async move(x, y) { if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); else await page.mouse.move(x, y); },
    async up() { if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await page.mouse.up(); },
  };
  const glide = async (x0, y0, x1, y1, n = 10) => { for (let i = 1; i <= n; i++) { await P.move(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); await page.waitForTimeout(16); } };
  const center = s => page.evaluate(q => { const el = document.querySelector(q); el.scrollIntoView({ block: 'nearest' }); const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, s);
  const drag = async (from, x, y, during) => { const [a, b] = await center(from); await P.down(a, b); await glide(a, b, x, y); await page.waitForTimeout(220); if (during) await during(); await P.up(); await page.waitForTimeout(260); };
  // Điểm thả: ranh giới giữa thẻ thứ i-1 và i của hàng đáp án (đọc trái → phải)
  const boundary = i => page.evaluate(k => { const r = document.querySelectorAll('#lsnAns .lsn-tile')[k].getBoundingClientRect(); return [r.left + 2, r.top + r.height / 2]; }, i);
  const words = () => page.evaluate(() => [...document.querySelectorAll('#lsnAns .lsn-tile')].map(b => b.textContent));
  const bankOf = w => page.evaluateHandle(x => [...document.querySelectorAll('#lsnBank .lsn-tile')].find(b => b.textContent === x), w);
  const tap = async w => { const h = await bankOf(w); const el = h.asElement(); if (mobile && touch) await el.tap(); else await el.click(); };
  const sel = w => `#lsnBank .lsn-tile[data-i="${WORDS.concat(EXTRA).sort().indexOf(w)}"]`;
  const layout = () => page.evaluate(() => { const b = document.querySelector('#lsnBank').getBoundingClientRect(), a = document.querySelector('#lsnAns').getBoundingClientRect(); return { bank: Math.round(b.top + scrollY), ans: Math.round(a.height) }; });

  // Đề cố định, câu dài + 2 từ nhiễu như ảnh chủ dự án; thẻ xáo theo bảng chữ cái để chọn thẻ tất định. Đề 1 đáp đúng, đề 2 đáp sai để kiểm chấm.
  await page.goto(`https://lk.test/app/?sandbox=1&ux1=1&hl=${lang}#/lesson?demo=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.App && App.need);
  await page.evaluate(async ({ WORDS, EXTRA }) => {
    await App.need('lesson'); const E = window.LessonEngine, orig = E.build, tiles = WORDS.concat(EXTRA).sort();
    E.build = (...a) => { const r = orig(...a), base = r.find(x => x.card) || r[0], mk = (id, type) => Object.assign({}, base, { id, type, noAudio: true, sent: WORDS.join(' '), prompt: '', answer: WORDS.join(' '), tiles, choice: false, retry: 0 }); return [mk(9001, 'build'), mk(9002, 'tr'), ...r]; };
    location.hash = '#/lesson/go?demo=1';
  }, { WORDS, EXTRA });
  await page.waitForSelector('#lsnBank .lsn-tile', { timeout: 25000 });
  await page.waitForTimeout(500);
  for (let i = 0; i < 6 && await page.$('.modal, #modal:not([hidden])'); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(150); }

  // 1) chạm thêm nhanh mọi từ, trừ "iced" → câu thiếu từ giữa, như ảnh
  const L0 = await layout();
  for (const [i, w] of WORDS.entries()) if (i !== MID) await tap(w);
  await page.waitForTimeout(260);
  const want1 = WORDS.filter((_, i) => i !== MID);
  ok((await words()).join(' ') === want1.join(' '), T('chạm: từ nối cuối câu theo thứ tự'));
  const L1 = await layout();
  ok(L1.bank === L0.bank && L1.ans === L0.ans, T(`đặt thẻ không đẩy ngân hàng (${JSON.stringify(L0)} → ${JSON.stringify(L1)})`));
  const rows = await page.evaluate(() => new Set([...document.querySelectorAll('#lsnAns .lsn-tile')].map(b => Math.round(b.getBoundingClientRect().top))).size);
  if (mobile) ok(rows >= 2, T(`câu dài xuống ${rows} dòng`));
  const info = await page.evaluate(() => { const parse = s => s.match(/[\d.]+/g).slice(0, 3).map(Number), t = document.querySelector('#lsnAns .lsn-tile'), s = getComputedStyle(t); let bg = s.backgroundColor; return { h: Math.min(...[...document.querySelectorAll('.lsn-tile')].map(b => b.getBoundingClientRect().height)), fg: parse(s.color), bg: parse(bg), dirA: getComputedStyle(document.querySelector('#lsnAns')).direction, dirP: document.documentElement.dir, hole: !!document.querySelector('#lsnBank .lsn-tile.used:disabled') }; });
  ok(info.h >= 44, T(`ô ≥44 px (${info.h})`)); ok(ratio(info.fg, info.bg) >= 4.5, T(`tương phản chữ ô ≥4.5 (${ratio(info.fg, info.bg).toFixed(2)})`));
  ok(info.dirA === 'ltr', T('câu tiếng Anh đọc trái → phải')); if (lang === 'ar') ok(info.dirP === 'rtl', T('giao diện ar đúng RTL'));
  ok(info.hole, T('ô đã dùng giữ chỗ, không bấm được'));
  await shot('1-thieu-tu');

  // 2) kéo "iced" từ dưới thả vào GIỮA large | coffee: có vạch, hai bên dạt ra, thả xong đúng chỗ, bố cục không nhảy
  const [bx, by] = await boundary(MID);
  await drag(sel('iced'), bx, by, async () => {
    const m = await page.evaluate(k => { const c = document.querySelector('#lsnAns .lsn-caret'), ts = [...document.querySelectorAll('#lsnAns .lsn-tile')], g = document.querySelector('.lsn-ghost'); if (!c || !g) return null; const r = c.getBoundingClientRect(), p = ts[k - 1].getBoundingClientRect(), n = ts[k].getBoundingClientRect(), cs = getComputedStyle(c), parse = s => s.match(/[\d.]+/g).slice(0, 3).map(Number); let e = document.querySelector('#lsnAns'), bg = 'rgba(0, 0, 0, 0)'; while (e && /rgba\(0, 0, 0, 0\)|transparent/.test(bg)) { bg = getComputedStyle(e).backgroundColor; e = e.parentElement; } return { w: r.width, between: r.left + 1 >= p.right - 1 && r.right - 1 <= n.left + 1 && Math.abs((r.top + r.bottom) / 2 - (n.top + n.bottom) / 2) < 12, gap: n.left - p.right, col: parse(cs.backgroundColor), bg: parse(bg), z: +getComputedStyle(g).zIndex }; }, MID);
    ok(m && m.between, T(`vạch chèn nằm giữa large | coffee ${JSON.stringify(m)}`));
    ok(m && m.gap >= 14, T(`hai bên dạt ra (khe ${m && m.gap})`));
    ok(m && ratio(m.col, m.bg) >= 3, T(`vạch chèn tương phản ≥3 (${m && ratio(m.col, m.bg).toFixed(2)})`));
    await shot('2-dang-keo');
  });
  ok((await words()).join(' ') === WORDS.join(' '), T('kéo từ dưới vào giữa: chèn đúng chỗ, không phải gỡ từ nào'));
  const L2 = await layout(); ok(L2.bank === L0.bank && L2.ans === L0.ans, T('thả không xê dịch bố cục'));
  ok(!await page.$('.lsn-ghost, .lsn-caret'), T('thả: dọn sạch bóng + vạch'));
  await shot('3-da-chen');

  // 3) đổi chỗ ngay trong câu rồi đổi lại
  const a0 = '#lsnAns .lsn-tile:nth-of-type(1)';
  const [bx3, by3] = await boundary(3); await drag(a0, bx3, by3);
  ok((await words()).join(' ') === ['can', 'I', 'Hi', 'have'].concat(WORDS.slice(4)).join(' '), T('kéo trong câu: đổi chỗ'));
  const [bx4, by4] = await boundary(0); await drag('#lsnAns .lsn-tile:nth-of-type(3)', bx4, by4);
  ok((await words()).join(' ') === WORDS.join(' '), T('kéo lại về đầu câu'));

  // 4) kéo ra ngoài để gỡ · chạm lại đặt cuối · Esc hủy kéo (chuột/bàn phím)
  const [ox, oy] = await center('#lsnBank'); await drag('#lsnAns .lsn-tile:nth-of-type(7)', ox, oy + 80);
  ok(!(await words()).includes('iced'), T('kéo ra ngoài: gỡ từ'));
  await tap('iced'); await page.waitForTimeout(240);
  ok((await words()).at(-1) === 'iced', T('chạm: thẻ gỡ thêm lại vào cuối'));

  // 5) bàn phím: End/Home/←, Delete, Enter đặt rồi ←, Ctrl+Z (máy có bàn phím)
  if (!touch) {
    await page.focus('#lsnAns .lsn-tile:last-of-type');
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft');
    ok((await words()).join(' ') === WORDS.join(' '), T('bàn phím: ← đưa từ vào giữa câu'));
    const live = await page.evaluate(() => { const l = document.querySelector('.wa-live'); return l && l.getAttribute('aria-live') + '|' + l.textContent; });
    ok(/^polite\|.*iced/.test(live || ''), T(`aria-live đọc vị trí (${live})`));
    await page.keyboard.press('Delete'); ok(!(await words()).includes('iced'), T('bàn phím: Delete gỡ'));
    await page.focus(sel('iced')); await page.keyboard.press('Enter'); await page.waitForTimeout(120);
    ok((await words()).at(-1) === 'iced' && await page.evaluate(() => document.activeElement.textContent === 'iced' && !!document.activeElement.closest('#lsnAns')), T('bàn phím: Enter đặt rồi focus sang thẻ đó'));
    await page.keyboard.press('Home'); ok((await words())[0] === 'iced', T('bàn phím: Home về đầu câu'));
    await page.keyboard.press('Control+z'); await page.waitForTimeout(60); ok((await words()).at(-1) === 'iced', T('Ctrl+Z hoàn tác: về cuối câu'));
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft');
    const [x, y] = await center('#lsnAns .lsn-tile:nth-of-type(2)'), [ex, ey] = await boundary(5);
    await P.down(x, y); await glide(x, y, ex, ey); await page.keyboard.press('Escape'); await P.up(); await page.waitForTimeout(150);
    ok((await words()).join(' ') === WORDS.join(' ') && !await page.$('.lsn-ghost'), T('Esc: hủy kéo, câu giữ nguyên'));
  } else {
    await drag('#lsnAns .lsn-tile:last-of-type', ...(await boundary(MID)));
    ok((await words()).join(' ') === WORDS.join(' '), T('cảm ứng: kéo lại từ cuối vào giữa'));
  }

  // 6) chấm: đề 1 (đã kéo về đúng) = đúng, đề 2 (sai thứ tự) = sai – logic chấm không đổi
  const sess = () => page.evaluate(() => { const s = App._lsn.sess; return { combo: s.combo, wrong: s.wrong.size, id: s.cur && s.cur.id }; });
  await page.click('#lsnCheck'); await page.waitForTimeout(500);
  const s1 = await sess(); ok(s1.combo === 1 && s1.wrong === 0, T(`chấm: thứ tự đã kéo đúng → Đúng ${JSON.stringify(s1)}`));
  await shot('4-cham-dung');
  const locked = await page.evaluate(() => { const b = document.querySelector('#lsnAns .lsn-tile'), r = b.getBoundingClientRect(); return [r.left + 5, r.top + 5]; });
  const before = await words(); await P.down(...locked); await glide(...locked, locked[0], locked[1] + 200, 4); await P.up(); await page.waitForTimeout(120);
  ok((await words()).join() === before.join(), T('đã chấm: khóa kéo'));
  await page.evaluate(() => { const n = document.querySelector('#lsnNext') || document.querySelector('#lsnCheck'); n.click(); }); await page.waitForTimeout(800);
  await page.waitForFunction(() => App._lsn.sess.cur && App._lsn.sess.cur.id === 9002 && document.querySelector('#lsnBank'), null, { timeout: 8000 }).catch(() => {});
  for (const w of [...WORDS].reverse()) await tap(w);
  await page.waitForTimeout(200);
  await page.click('#lsnCheck'); await page.waitForTimeout(500);
  const s2 = await sess(); ok(s2.wrong === 1 && s2.combo === 0, T(`chấm: sai thứ tự → Sai ${JSON.stringify(s2)}`));

  // 7) cuộn trang: màn thấp, vuốt từ khe giữa thẻ vẫn cuộn; kéo sát mép tự cuộn
  if (touch) {
    await page.setViewportSize({ width, height: 420 });
    await page.evaluate(() => { const n = document.querySelector('#lsnNext'); if (n) n.click(); }); await page.waitForTimeout(800);
    const pt = await page.evaluate(() => { const b = document.querySelector('#lsnBank'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return [r.left + 3, r.top + 2]; });
    if (pt) {
      const sc = () => page.evaluate(() => { let e = document.querySelector('#lsnBank'); while (e && e !== document.body) { const s = getComputedStyle(e); if (/auto|scroll/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 1) return e.scrollTop; e = e.parentElement; } return scrollY; });
      const y0 = await sc(); await P.down(...pt); await glide(pt[0], pt[1], pt[0], pt[1] - 160, 8); await P.up(); await page.waitForTimeout(350);
      ok(await sc() !== y0 || await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), T('vuốt từ khe giữa thẻ: trang vẫn cuộn'));
    }
  }
  ok(!errs.length, T('không lỗi JS: ' + errs.slice(0, 2).join(' | ')));

  const video = page.video(); await ctx.close(); if (video) fs.renameSync(await video.path(), path.join(OUT, `${tag}.webm`));
}

// Ngữ pháp và TOEFL dùng cùng component: chèn vào giữa + nộp bài đúng
async function otherScreens(width, scheme) {
  const tag = `${NAME}-${width}-${scheme}`, ctx = await browser.newContext({ viewport: { width, height: 860 }, colorScheme: scheme, locale: 'en', serviceWorkers: 'block' });
  await serve(ctx, ROOT);
  const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  const T = m => `${tag}: ${m}`;
  const dragTo = async (from, tx, ty) => { const f = await from.boundingBox(); const a = f.x + f.width / 2, b = f.y + f.height / 2; await page.mouse.move(a, b); await page.mouse.down(); for (let i = 1; i <= 8; i++) { await page.mouse.move(a + (tx - a) * i / 8, b + (ty - b) * i / 8); await page.waitForTimeout(16); } await page.waitForTimeout(120); await page.mouse.up(); await page.waitForTimeout(250); };
  // TOEFL Build a Sentence
  await page.goto(`https://lk.test/app/?sandbox=1&hl=en#/toefl-p/sentence`, { waitUntil: 'load' });
  await page.waitForSelector('[data-bs] [data-bank] .ts-chunk', { timeout: 25000 });
  const it = page.locator('[data-bs]').first(), want = await page.evaluate(() => { const n = +document.querySelector('[data-bs]').dataset.bs; for (const s of Object.values(window.TOEFL_DATA || {})) void s; return n; });
  ok(want > 0, T('TOEFL: có câu Build a Sentence'));
  const chunks = await it.locator('[data-bank] .ts-chunk').allTextContents();
  await it.locator('[data-bank] .ts-chunk').nth(0).click(); await it.locator('[data-bank] .ts-chunk:not(.used)').first().click(); await page.waitForTimeout(240);
  const third = await it.locator('[data-bank] .ts-chunk:not(.used)').first();
  const thirdText = await third.textContent(), second = await it.locator('[data-ans] .ts-chunk').nth(1).boundingBox();
  await dragTo(third, second.x + 2, second.y + second.height / 2);
  const placed = await it.locator('[data-ans] .ts-chunk').allTextContents();
  ok(placed.length === 3 && placed[1] === thirdText, T(`TOEFL: kéo cụm từ vào giữa (${placed.join(' / ')})`));
  ok(chunks.length > 2 && (await it.locator('[data-bank] .ts-chunk').count()) === chunks.length, T('TOEFL: ngân hàng giữ chỗ'));
  await page.screenshot({ path: path.join(OUT, `${tag}-toefl.png`) });
  await page.click('#tSub'); await page.waitForTimeout(400);
  ok(await it.evaluate(el => el.classList.contains('ok') || el.classList.contains('no')), T('TOEFL: nộp bài vẫn chấm theo thứ tự trong câu'));
  // Ngữ pháp "Xếp câu": tìm bài có ví dụ phù hợp qua route thật, đi tới bước Xếp câu
  await page.goto(`https://lk.test/app/?sandbox=1&hl=en#/grammar`, { waitUntil: 'load' });
  await page.waitForSelector('a.g-row[href^="#/grammar/"]', { timeout: 25000 });
  let found = false;
  const ids = await page.evaluate(() => [...document.querySelectorAll('a.g-row[href^="#/grammar/"]')].map(a => a.getAttribute('href')).filter(h => !/mix/.test(h)).slice(0, 8));
  for (const h of ids) {
    await page.evaluate(x => { location.hash = x; }, h); await page.waitForTimeout(700);
    for (let i = 0; i < 8 && !await page.$('[data-build]'); i++) {
      const stepBtn = await page.evaluateHandle(() => [...document.querySelectorAll('button, [role=tab], a')].find(b => /Sentence|Xếp câu|Put the words|Build/i.test(b.textContent || '') && b.offsetParent));
      const el = stepBtn.asElement(); if (el) { await el.click().catch(() => {}); await page.waitForTimeout(400); }
      else break;
    }
    if (await page.$('[data-build]')) { found = true; break; }
  }
  if (found) {
    const box = page.locator('[data-build]').first(), n = await box.locator('[data-pool] .wpick').count();
    await box.locator('[data-pool] .wpick').nth(0).click(); await box.locator('[data-pool] .wpick:not(.used)').first().click(); await page.waitForTimeout(240);
    const nxt = box.locator('[data-pool] .wpick:not(.used)').first(), nt = await nxt.textContent(), sb = await box.locator('[data-slot] .wpick').nth(1).boundingBox();
    await dragTo(nxt, sb.x + 2, sb.y + sb.height / 2);
    const got = await box.locator('[data-slot] .wpick').allTextContents();
    ok(n >= 3 && got[1] === nt, T(`ngữ pháp: kéo từ vào giữa (${got.join(' ')})`));
    await page.screenshot({ path: path.join(OUT, `${tag}-grammar.png`) });
  } else console.log(`… ${T('ngữ pháp: chưa lái tới bước Xếp câu qua giao diện – xem jsdom/lesson-drag')}`);
  ok(!errs.length, T('không lỗi JS: ' + errs.slice(0, 2).join(' | ')));
  await ctx.close();
}

for (const c of CONFIGS) { try { await run(...c); } catch (e) { ok(false, `${NAME}-${c.slice(0, 3).join('-')}: ${e.message.split('\n')[0]}`); } }
for (const [w, s] of NAME === 'webkit' ? [[1366, 'dark']] : [[390, 'light'], [1366, 'dark']]) { try { await otherScreens(w, s); } catch (e) { ok(false, `${NAME}-${w}-${s} màn khác: ${e.message.split('\n')[0]}`); } }
await browser.close();
fs.rmSync(path.join(OUT, 'video-raw'), { recursive: true, force: true });
console.log(`\n${total - fails}/${total} word-arrange-e2e (${NAME})`);
process.exit(fails || !total ? 1 : 0);
