// 📱 iOS/WebKit mở khóa âm thanh THEO PHẦN TỬ – e2e có chạm thật (gốc lỗi 5/11: Mock Listening iPhone "Đang phát" mà im lặng).
// Playwright: WebKit 'iPhone 13' + Chromium 'Pixel 7'. Không có thiết bị âm thanh → khẳng định bằng sự kiện media: sau MỘT cú chạm thật,
// phần tử giọng đạt `playing` + currentTime > 0 (timeupdate), nhiều dòng nối nhau (setTimeout, ngoài cử chỉ) vẫn phát, LKAudio.stats.blocked = 0.
// Màn: Mock › Listening (bấm "Nghe ngay" VÀ để bộ đếm 30 s tự chạy), Luyện nghe thi 40 câu (#/listen-test), TOEIC Mock (#/toeic-test), UI.speak (thẻ từ vựng; sau await).
// Phủ định: play() bị ép NotAllowedError → hiện nút ▶ (#mkTap / #tTap), KHÔNG ghi "Đang phát"; chạm nút → phát được.
// Bài học (#/lesson/go?demo=1, mọi dạng có 🔊: xếp câu, chọn từ nghe, gõ, nói, truyện) + iPhone: giáo viên không gọi createMediaElementSource. Bỏ qua: call / handsfree (cần micro + quyền); bong bóng Hôm nay (chỉ chữ, không âm thanh).
// Hermetic: web/ trên https://lk.test (stitch-screens serve), file mp3 → WAV tự sinh, mọi host ngoài bị chặn. Chạy: node scripts/test/ios-audio-e2e.mjs [web] [chromium,webkit]
import path from 'node:path';
import { chromium, webkit, devices } from 'playwright';
import { serve } from './stitch-screens.mjs';
import { waitFn } from '../lib/pw-wait.mjs';
const ROOT = path.resolve(process.argv[2] || 'web'), which = (process.argv[3] || 'webkit,chromium').split(',');
const PROJECTS = { webkit: [webkit, 'iPhone 13'], chromium: [chromium, 'Pixel 7'] };

function wav(sec) { // WAV PCM 16-bit mono 8 kHz, sóng sin nhỏ
  const sr = 8000, n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(i / 8) * 2000), 44 + i * 2);
  return b;
}
const WAV = wav(1.5);

// Chạy trước mọi script của trang: ghi sự kiện media của phần tử KHÔNG phải data: (phần tử mồi), ép chặn play() khi __block, tua bộ đếm 1 s → 20 ms khi __fast
const INIT = ({ fast, block }) => {
  try { localStorage.setItem('ielts.settings', JSON.stringify({ onboarded: true, exam: 'ielts' })); localStorage.setItem('lk.onb', '1'); } catch (e) { /* */ }
  window.__ev = {}; window.__block = block ? 1 : 0; window.__fast = fast ? 1 : 0;
  const rec = e => { const a = e.target, s = a.currentSrc || a.src; if (!s || s.startsWith('data:')) return; const o = window.__ev[s] || (window.__ev[s] = { playing: 0, t: 0 }); if (e.type === 'playing') o.playing = 1; else o.t = Math.max(o.t, a.currentTime); };
  const P = HTMLMediaElement.prototype, play0 = P.play;
  P.play = function () {
    if (!this.__w) { this.__w = 1; this.addEventListener('playing', rec); this.addEventListener('timeupdate', rec); }
    if (window.__block && !String(this.src || '').startsWith('data:')) return Promise.reject(new DOMException('play() bị chặn (giả lập iOS)', 'NotAllowedError'));
    return play0.apply(this, arguments);
  };
  window.__cmes = 0; window.__tts = 0;
  for (const AC of [window.AudioContext, window.webkitAudioContext]) if (AC && AC.prototype.createMediaElementSource) { const c0 = AC.prototype.createMediaElementSource; AC.prototype.createMediaElementSource = function () { window.__cmes++; return c0.apply(this, arguments); }; } // iOS: không được nối <audio> vào Web Audio (công tắc im lặng)
  try { const SS = window.speechSynthesis, sp = SS && SS.speak; if (sp) SS.speak = function () { window.__tts++; return sp.apply(this, arguments); }; } catch (e) { /* */ }
  const si = window.setInterval; window.setInterval = function (f, d, ...r) { return si.call(this, f, window.__fast && d === 1000 ? 20 : d, ...r); };
};

let fails = 0, passes = 0;
const check = (c, msg) => { if (c) { passes++; console.log('  ✓ ' + msg); } else { fails++; console.error('  ✗ ' + msg); } };
const URL0 = '/app/?sandbox=1&hl=vi';

async function open(browser, opts, flags = {}) {
  const ctx = await browser.newContext({ ...opts, locale: 'vi-VN', serviceWorkers: 'block', reducedMotion: 'reduce' });
  await serve(ctx, ROOT);
  // đăng ký SAU → ưu tiên: file âm thanh (mọi host) → WAV; host ngoài đã bị serve() chặn
  await ctx.route(/\.(mp3|wav)(\?|$)/, r => r.fulfill({ contentType: 'audio/wav', body: WAV, headers: { 'access-control-allow-origin': '*' } }));
  await ctx.addInitScript(INIT, { fast: !!flags.fast, block: !!flags.block });
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message));
  return { ctx, page, errs };
}
const ready = page => waitFn(page, () => window.App && window.UI && window.LKAudio && document.querySelector('#view') && document.querySelector('#view').children.length > 0, null, { timeout: 45000 });
const goto = async (page, hash) => { await page.goto('https://lk.test' + URL0 + hash, { waitUntil: 'load' }); await ready(page); };
const heard = page => page.evaluate(() => Object.entries(window.__ev).filter(([, o]) => o.playing && o.t > 0).map(([s]) => s));
const waitHeard = (page, n, ms = 60000) => waitFn(page, n => Object.values(window.__ev).filter(o => o.playing && o.t > 0).length >= n, n, { timeout: ms }).then(() => true, () => false);
const blockedN = page => page.evaluate(() => (LKAudio.stats.blocked || 0));
const txt = (page, sel) => page.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);
const tap = (page, sel) => page.tap(sel, { timeout: 15000 });

// ----- 3 màn thi nghe: cùng bộ kiểm; `mode`: 'skip' (chạm nút bắt đầu ngay) · 'count' (chỉ bộ đếm 30 s) · 'block' (ép NotAllowedError → ▶ → chạm) -----
const SCREENS = {
  mock: { name: 'Mock › Listening', state: '#mkState', tapBtn: '#mkTap', skip: '#mkSkip',
    enter: async page => { await goto(page, '#/mock'); await tap(page, '#mkGo'); await tap(page, '#mkStart'); } }, // hai cú chạm đầu; bộ đếm 30 s bắt đầu SAU chúng
  listenTest: { name: 'Luyện nghe thi 40 câu (listening.js part)', state: '#tCount', tapBtn: '#tTap', skip: '#tSkip',
    enter: async page => { await goto(page, '#/listen-test/1'); await tap(page, '#tGo'); } },
};
async function examCase(browser, opts, key, mode) {
  const S = SCREENS[key], { ctx, page, errs } = await open(browser, opts, { fast: mode !== 'skip', block: mode === 'block' }), tag = `${S.name} · ${mode}`;
  try {
    await S.enter(page);
    if (mode === 'skip') await tap(page, S.skip);
    if (mode !== 'block') {
      check(await waitHeard(page, 2), `${tag}: ≥ 2 dòng giọng liên tiếp đạt playing + currentTime > 0 (${(await heard(page)).length})`);
      check(/Đang phát/.test(await txt(page, S.state)), `${tag}: ghi "Đang phát" (sau khi có tiếng thật)`);
      check(await blockedN(page) === 0, `${tag}: LKAudio.stats.blocked = 0 (${await blockedN(page)})`);
    } else {
      await page.waitForSelector(S.tapBtn, { timeout: 60000 });
      check(!/Đang phát/.test(await txt(page, S.state)), `${tag}: chặn → KHÔNG ghi "Đang phát" (im lặng thì không nói đang phát)`);
      check(await blockedN(page) >= 1, `${tag}: LKAudio.stats.blocked được đếm`);
      await page.evaluate(() => { window.__block = 0; });
      await tap(page, S.tapBtn);
      check(await waitHeard(page, 1, 30000), `${tag}: chạm ▶ → phát được (playing + currentTime > 0)`);
      check(/Đang phát/.test(await txt(page, S.state)), `${tag}: sau khi chạm ▶ mới ghi "Đang phát"`);
    }
  } catch (e) { check(false, `${tag}: ${String(e.message).split('\n')[0]}`); }
  check(errs.length === 0, `${tag}: không lỗi JS` + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
}

async function toeicCase(browser, opts, mode) {
  const { ctx, page, errs } = await open(browser, opts, { block: mode === 'block' }), tag = `TOEIC Mock Listening · ${mode}`;
  try {
    await goto(page, '#/toeic');
    // cú chạm thật vào lối vào (mở khóa); trang Part tự phát SAU khi nạp gói (ngoài cử chỉ) – đúng đường iOS hay hỏng
    const link = 'a[href="#/toeic-test/1"]';
    if (await page.$(link)) await tap(page, link); else { await page.touchscreen.tap(5, 5); await page.evaluate(() => { location.hash = '#/toeic-test/1'; }); }
    // màn giới thiệu đề (bảng cấu trúc + "Thử loa") → chạm thật "Bắt đầu làm bài" như người dùng; Part 1 mới dựng #tState + trình phát
    await page.waitForSelector('#tGo', { timeout: 30000 });
    await tap(page, '#tGo');
    await page.waitForSelector('#tState', { timeout: 30000 });
    if (mode === 'play') {
      check(await waitHeard(page, 2, 40000), `${tag}: ≥ 2 dòng giọng nối nhau đạt playing + currentTime > 0`);
      check(/Đang phát/.test(await txt(page, '#tState')), `${tag}: ghi "Đang phát" sau khi có tiếng`);
      check(await blockedN(page) === 0, `${tag}: LKAudio.stats.blocked = 0`);
    } else {
      await page.waitForSelector('#tTap', { timeout: 30000 });
      check(!/Đang phát/.test(await txt(page, '#tState')), `${tag}: chặn → KHÔNG ghi "Đang phát"`);
      await page.evaluate(() => { window.__block = 0; });
      await tap(page, '#tTap');
      check(await waitHeard(page, 1, 30000) && /Đang phát/.test(await txt(page, '#tState')), `${tag}: chạm ▶ → phát được, rồi mới ghi "Đang phát"`);
    }
  } catch (e) { check(false, `${tag}: ${String(e.message).split('\n')[0]}`); }
  check(errs.length === 0, `${tag}: không lỗi JS` + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
}

// UI.speak (thẻ từ vựng, đọc câu ví dụ…): gọi SAU await/setTimeout (ngoài cử chỉ) khi trang đã có 1 cú chạm trước đó
async function speakCase(browser, opts) {
  const { ctx, page, errs } = await open(browser, opts), tag = 'UI.speak (thẻ từ vựng)';
  try {
    await goto(page, '#/home');
    await page.touchscreen.tap(5, 5); // cú chạm đầu của người dùng → mở khóa
    await waitFn(page, () => LKAudio.isUnlocked(), null, { timeout: 10000 });
    // Hai đường phần tử, kiểm RIÊNG từng đường: (1) từ CÓ trong kho INDEX → file từ Kokoro (LA().play, phần tử pool);
    // (2) URL bản ghi của Lexkite → audioSrc → audioEl (ui.js bỏ URL ngoài lexkite khi máy có giọng đọc → URL lk.test cũ rơi về giọng máy, không kiểm được gì)
    await waitFn(page, () => window.IELTS_DATA && Object.keys(IELTS_DATA.INDEX).some(k => /^[a-z]{3,}$/.test(k)), null, { timeout: 20000 });
    const word = await page.evaluate(() => Object.keys(IELTS_DATA.INDEX).find(k => /^[a-z]{3,}$/.test(k)));
    let before = (await heard(page)).length;
    await page.evaluate(w => new Promise(r => setTimeout(r, 1200)).then(() => UI.speak(w, 'en-GB')), word); // ngoài cử chỉ
    check(await waitHeard(page, before + 1, 20000), `${tag}: từ "${word}" (file từ) phát được ngoài cử chỉ (playing + currentTime > 0)`);
    before = (await heard(page)).length;
    await page.evaluate(() => new Promise(r => setTimeout(r, 400)).then(() => UI.speak('banana', 'en-GB', 'https://audio.lexkite.com/stub/banana.mp3'))); // sau await
    check(await waitHeard(page, before + 1, 20000), `${tag}: URL bản ghi Lexkite phát được sau await (playing + currentTime > 0)`);
    check(await blockedN(page) === 0, `${tag}: LKAudio.stats.blocked = 0`);
  } catch (e) { check(false, `${tag}: ${String(e.message).split('\n')[0]}`); }
  check(errs.length === 0, `${tag}: không lỗi JS` + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
}


// ----- Bài học (#/lesson): MỌI dạng bài có nút 🔊 / "Nghe lại" (#lsnPlay): xếp câu (build, ngân hàng từ), chọn từ nghe (gap), gõ chính tả (type), nói (say), dòng truyện (line) -----
// Lái bài thử (App._lsn, không ghi FSRS/XP) như DRIVE của stitch-screens; ở mỗi dạng MỚI: chờ lời tự đọc xong, xoá sự kiện, CHẠM THẬT 🔊 → phần tử giọng playing + currentTime > 0.
const STEP = () => { const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)], nz = v => String(v).trim().replace(/[.,!?;:]+$/, '').toLowerCase(), it = window.App && App._lsn && App._lsn.sess.cur;
  if (q('.lsn-end')) return 'end'; if (!it) return 'none';
  if (q('#lsnGo')) { q('#lsnGo').click(); return 'go'; }
  const pick = qa('.lsn-opts .lsn-opt').find(b => b.dataset.o === String(it.answer)), o2 = qa('#lsnBody .lsn-opt').find(b => b.dataset.o === String(it.answer));
  if (pick) pick.click(); else if (o2) o2.click();
  else if (q('#lsnBank')) { const used = new Set(); for (const x of String(it.answer).split(/\s+/)) { const b = qa('#lsnBank .lsn-tile').find(t => !used.has(t) && nz(t.textContent) === nz(x)); if (b) { used.add(b); b.click(); } } }
  else if (q('#lsnIn')) { q('#lsnIn').value = it.answer; q('#lsnIn').dispatchEvent(new Event('input')); }
  else if (q('.lsn-match')) { for (const a of qa('.lsn-match [data-s="w"]')) { a.click(); const b = q(`.lsn-match [data-s="m"][data-m="${a.dataset.m}"]`); if (b) b.click(); } }
  else if (q('#lsnNoS')) { q('#lsnNoS').click(); return 'nos'; }
  return 'answer'; };
const AFTER = () => { const q = s => document.querySelector(s); if (q('#lsnCheck') && !q('#lsnCheck').disabled) q('#lsnCheck').click(); return !!q('#lsnNext'); };
const NEXT = () => { const b = document.querySelector('#lsnNext'); if (b) b.click(); };
const PLAYBTN = () => { const b = document.querySelector('#lsnPlay'); return !!b && !b.hidden && !!(b.offsetWidth || b.offsetHeight) && !b.closest('[hidden]'); };
const curType = () => window.App && App._lsn && App._lsn.sess.cur ? App._lsn.sess.cur.type + (document.querySelector('#lsnBank') ? '+bank' : '') : '';

async function lessonCase(browser, opts, tag, setup, need, ios) {
  const { ctx, page, errs } = await open(browser, opts); var tested = new Set();
  try {
    await goto(page, '#/home');
    await page.touchscreen.tap(5, 5); // cú chạm đầu của người dùng → mở khóa
    await waitFn(page, () => LKAudio.isUnlocked(), null, { timeout: 10000 });
    await page.evaluate(async s => { await App.need('lesson'); const h = await new Function('return (' + s + ')')()(); location.hash = h; }, setup.toString());
    await waitFn(page, () => window.App && App._lsn && App._lsn.sess.cur, null, { timeout: 30000 });
    const soft = [];
    for (let n = 0; n < 40; n++) {
      if (await page.evaluate(() => !!document.querySelector('.lsn-end'))) break;
      const ty = await page.evaluate(curType), has = await page.evaluate(PLAYBTN);
      if (has && ty && !tested.has(ty)) {
        tested.add(ty);
        await page.waitForTimeout(2600); // lời tự đọc (WAV 1,5 s) xong
        await page.evaluate(() => { window.__ev = {}; window.__tts0 = window.__tts; });
        await tap(page, '#lsnPlay');
        const ok = await waitHeard(page, 1, 12000), tts = await page.evaluate(() => window.__tts - window.__tts0);
        if (ok) check(true, `${tag} · ${ty}: chạm 🔊/Nghe lại → giọng playing + currentTime > 0`);
        else if (tts > 0) { soft.push(ty); console.log(`  ⓘ ${tag} · ${ty}: câu chưa có file Kokoro → giọng máy đọc (${tts} lần), không phần tử`); }
        else check(false, `${tag} · ${ty}: chạm 🔊/Nghe lại KHÔNG ra tiếng (không phần tử playing, không giọng máy)`);
      }
      const st = await page.evaluate(STEP); if (st === 'end' || st === 'none') break;
      await page.waitForTimeout(150); const nx = await page.evaluate(AFTER); await page.waitForTimeout(450); if (nx) await page.evaluate(NEXT); await page.waitForTimeout(350);
    }
    console.log(`  ⓘ ${tag}: đã thử dạng ${[...tested].join(', ') || '(không có)'}`);
    for (const need1 of need) check([...tested].some(x => x === need1 || x.startsWith(need1 + '+')), `${tag}: có dạng ${need1} với nút 🔊/Nghe lại để kiểm`);
    check(await blockedN(page) === 0, `${tag}: LKAudio.stats.blocked = 0 (${await blockedN(page)})`);
    if (ios) check(await page.evaluate(() => window.__cmes) === 0, `${tag}: giáo viên KHÔNG gọi createMediaElementSource trên iOS (${await page.evaluate(() => window.__cmes)} lần)`);
  } catch (e) { check(false, `${tag}: ${String(e.message).split('\n')[0]}`); }
  check(errs.length === 0, `${tag}: không lỗi JS` + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
  return tested;
}
const SET_PATH = k => `(() => async () => { localStorage.setItem('lk.lsn.path.demo', '${k}'); return '#/lesson/go?demo=1'; })()`;
const SET_STORY = `(() => async () => { localStorage.setItem('lk.lsn.path.demo', '0'); const s = (window.LESSON_STORIES || []).find(x => x.kind === 'story') || (window.LESSON_STORIES || [])[0]; return '#/lesson/go?demo=1&story=' + (s ? s.id : ''); })()`;

for (const name of which) {
  const P = PROJECTS[name]; if (!P) continue;
  const [type, dev] = P; console.log(`— ${name} (${dev})`);
  const browser = await type.launch(), opts = { ...devices[dev] };
  for (const [key, mode] of [['mock', 'skip'], ['mock', 'count'], ['mock', 'block'], ['listenTest', 'skip'], ['listenTest', 'count'], ['listenTest', 'block']]) await examCase(browser, opts, key, mode);
  await toeicCase(browser, opts, 'play'); await toeicCase(browser, opts, 'block');
  await speakCase(browser, opts);
  const ios = name === 'webkit';
  const seen = new Set();
  for (const k of [0, 1, 2, 3]) (await lessonCase(browser, opts, `Bài học · chặng ${k}`, SET_PATH(k), [], ios)).forEach(x => seen.add(x));
  (await lessonCase(browser, opts, 'Bài học · Truyện', SET_STORY, ['line'], ios)).forEach(x => seen.add(x));
  check([...seen].some(x => x.startsWith('build')), `Bài học: dạng xếp câu (ngân hàng từ + Nghe lại) đã được kiểm (${[...seen].join(', ')})`);
  console.log('  ⏭ bỏ qua: call / handsfree (cần micro + quyền, không có trong trình giả); bong bóng Hôm nay (chỉ chữ hiện dần SayText, không phát âm thanh)');
  await browser.close();
}
console.log(fails ? `✗ ios-audio-e2e: ${fails} lỗi, ${passes} đạt` : `✓ ios-audio-e2e: ${passes} kiểm tra đạt (${which.join(', ')})`);
process.exit(fails ? 1 : 0);
