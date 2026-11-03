// 📱🔊 Âm thanh như trên iPhone (chủ 01/11: "trên iOS không nghe được – Thi thử Listening hiện 'Đang phát' mà im lặng").
// Giả lập LUẬT TỰ PHÁT của iOS Safari trong trang (Chromium + WebKit giả lập iPhone): một phần tử <audio> chỉ phát được nếu đang trong cú chạm thật
// (isTrusted, ≤ 1 s) hoặc đã từng phát trong cú chạm; speechSynthesis lần đầu cũng phải trong cú chạm. mp3 → WAV ngắn có thật (giả lập media, không cần mạng).
// Kiểm: (1) chạm "Bắt đầu" rồi để bài tự phát sau 30 s đọc câu hỏi → CÓ tiếng, phát sang câu 2, 3… (trước đây: mỗi câu new Audio() → bị chặn);
//       (2) bị chặn thật (không có cú chạm nào) → hiện nút "Bấm để nghe", chạm → phát tiếp ĐÚNG câu đang dở (không phát lại từ đầu – luật nghe 1 lần);
//       (3) không lỗi JS. Chạy: node scripts/test/ios-audio.mjs http://localhost:8080 out/ios-audio  (thoát 1 nếu lỗi)
import fs from 'node:fs';
import { chromium, webkit, devices } from 'playwright';

const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, ''), OUT = process.argv[3] || 'out/ios-audio';
fs.mkdirSync(OUT, { recursive: true });
const fails = [], bad = (k, m) => { fails.push(`[${k}] ${m}`); console.log('  ✗ ' + m); };
// WAV 0,4 s im lặng 8 kHz (đủ để có sự kiện playing/ended thật)
const wav = (() => { const n = 3200, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); return b; })();

function iosPolicy() {
  let act = -Infinity; const tr = e => { if (e.isTrusted) act = performance.now(); };
  ['touchend', 'click', 'keydown', 'pointerup'].forEach(ev => addEventListener(ev, tr, true));
  const active = () => performance.now() - act < 1000;
  window.__aud = { ok: [], blocked: 0, ttsBlocked: 0, tts: 0, log: [] }; let lastNow = ''; setInterval(() => { const n = (document.getElementById('lNow') || {}).textContent || ''; if (n !== lastNow) { lastNow = n; lg('lNow "' + n.slice(0, 20) + '"'); } }, 100); const lg = m => { const L = window.__aud.log; L.push(Math.round(performance.now() / 100) / 10 + 's ' + m); if (L.length > 40) L.shift(); };
  ['playing', 'ended', 'error', 'stalled'].forEach(ev => addEventListener(ev, e => { const t = e.target; if (t instanceof HTMLMediaElement) lg(ev + ' ' + String(t.getAttribute('src') || '').split('/').pop().slice(0, 24)); }, true));
  const P = HTMLMediaElement.prototype, play = P.play;
  P.play = function () {
    const src = String(this.getAttribute('src') || this.src || ''), nm = src.split('/').pop().slice(0, 24); // src thuộc tính (đồng bộ) – currentSrc của phần tử dùng chung còn là bài TRƯỚC
    if (!active() && !this.__unlocked) { window.__aud.blocked++; lg('blocked ' + nm); return Promise.reject(new DOMException('The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.', 'NotAllowedError')); }
    this.__unlocked = true; lg('play ' + nm);
    if (!this.__lg) { this.__lg = true; ['playing', 'ended', 'error', 'pause', 'abort', 'emptied'].forEach(ev => this.addEventListener(ev, () => { if (!this.isConnected) lg(ev + '* ' + String(this.getAttribute('src') || '').split('/').pop().slice(0, 24)); })); } // phần tử <audio> rời (new Audio()) không nổi sự kiện lên window → gắn thẳng
    if (!/^data:/.test(src)) window.__aud.ok.push(src.split('/').pop());
    return play.call(this);
  };
  if ('speechSynthesis' in window) {
    let ttsOk = false; const speak = speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak = u => { lg('speak "' + String(u.text).slice(0, 16) + '"' + (!ttsOk && !active() ? ' (chặn)' : '')); if (!ttsOk && !active()) { window.__aud.ttsBlocked++; setTimeout(() => u.onerror && u.onerror({ error: 'not-allowed' }), 0); return; } ttsOk = true; window.__aud.tts++; return speak(u); };
  }
}

async function open(bt) {
  const browser = await bt.launch();
  const dev = devices['iPhone 13'];
  // serviceWorkers 'block': sw.js tự tải mp3 audio.lexkite.com (cache âm thanh) – yêu cầu từ service worker KHÔNG đi qua ctx.route → trước đây phát mp3 THẬT
  // từ mạng (lời dẫn ~10 s + quãng nghỉ 8 s) thay cho WAV 0,4 s → "Bấm để nghe" phát đúng mà câu 2 tới sau 15 s chờ → báo im lặng sai (e2e đỏ 01/11). Nay kín, không cần mạng.
  const ctx = await browser.newContext({ ...dev, locale: 'vi', serviceWorkers: 'block' });
  await ctx.route(/\.mp3(\?|$)/, r => r.fulfill({ status: 200, contentType: 'audio/wav', body: wav }));
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await page.addInitScript(() => { try { localStorage.setItem('sbx.settings', JSON.stringify({ onboarded: true, goalPick: 1 })); localStorage.setItem('vb.nudgeAt', String(Date.now())); } catch (e) { /* */ } });
  await page.addInitScript(iosPolicy);
  return { browser, page, errs };
}
const goPart = async page => {
  await page.goto(`${BASE}/app/?sandbox=1&hl=vi#/mock/run?s=listening&l=1`, { waitUntil: 'load' });
  return page.waitForSelector('#mkStart', { timeout: 20000 }).then(() => true, () => false);
};
const aud = page => page.evaluate(() => ({ ...window.__aud, ok: window.__aud.ok.slice(), log: window.__aud.log.join(' › '), hq: !!(window.LISTEN_AUDIO && LISTEN_AUDIO.size), sp: 'speechSynthesis' in window, now: (document.getElementById('lNow') || {}).textContent || '' }));

async function run(name, bt) {
  console.log(`▶ ${name}`);
  // (1) chạm Bắt đầu → 30 s đọc câu hỏi → tự phát (không có cú chạm lúc đó)
  { const { browser, page, errs } = await open(bt), k = name + ' · tự phát sau 30 s';
    if (!(await goPart(page))) { bad(k, 'không mở được Thi thử Listening'); await page.screenshot({ path: `${OUT}/${name}-open.png` }); await browser.close(); return; }
    await page.tap('#mkStart'); await page.waitForSelector('#xClock .xclk', { timeout: 10000 });
    const c0 = await page.$eval('#xClock .xclk-t', e => e.textContent).catch(() => '');
    if (!/^(29|30):\d\d$/.test(c0)) bad(k, `đồng hồ Listening 30′ không hiện đúng: "${c0}"`);
    if (!(await page.$('#xPrep .xprep-ring'))) bad(k, 'không có màn chuẩn bị (đọc câu hỏi) trước khi tự phát');
    await page.waitForTimeout(33000);
    await page.waitForFunction(() => window.__aud.ok.length >= 2, null, { timeout: 15000 }).catch(() => {});
    const a = await aud(page);
    await page.screenshot({ path: `${OUT}/${name}-auto.png` });
    if (a.ok.length < 2) bad(k, `không có tiếng: ${a.ok.length} câu phát được, ${a.blocked} lần bị chặn, giọng máy bị chặn ${a.ttsBlocked}, giọng máy nói ${a.tts}, mp3 sẵn ${a.hq}, speechSynthesis ${a.sp}, đang: "${a.now}"; nhật ký: ${a.log}`);
    else console.log(`  ✓ phát ${a.ok.length} câu (bị chặn ${a.blocked})`);
    if (errs.length) bad(k, 'lỗi JS: ' + errs.join(' | '));
    await browser.close(); }
  // (2) bị chặn thật → nút "Bấm để nghe" → chạm → phát tiếp đúng câu đó
  { const { browser, page, errs } = await open(bt), k = name + ' · bị chặn → Bấm để nghe';
    if (!(await goPart(page))) { bad(k, 'không mở được Thi thử Listening'); await browser.close(); return; }
    await page.evaluate(() => document.getElementById('mkStart').click()); // click giả (không phải cú chạm) → chưa mở khóa
    await page.waitForSelector('#xPrep [data-a="go"]', { timeout: 10000 });
    await page.evaluate(() => document.querySelector('#xPrep [data-a="go"]').click());
    const btn = await page.waitForSelector('#lkTapPlay', { timeout: 8000 }).catch(() => null);
    const before = await aud(page);
    if (!btn) { bad(k, `không hiện nút "Bấm để nghe" khi bị chặn (chặn ${before.blocked}, phát ${before.ok.length}, giọng máy chặn ${before.ttsBlocked}/nói ${before.tts}, mp3 sẵn ${before.hq}, speechSynthesis ${before.sp}, đang: "${before.now}"; nhật ký: ${before.log})`); await page.screenshot({ path: `${OUT}/${name}-blocked.png` }); await browser.close(); return; }
    await page.screenshot({ path: `${OUT}/${name}-tap-to-listen.png` });
    const vis = await page.evaluate(() => { const b = document.getElementById('lkTapPlay'), r = b.getBoundingClientRect(), top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return r.width > 0 && r.bottom <= innerHeight && b.contains(top); });
    if (!vis) bad(k, 'nút "Bấm để nghe" bị che hoặc ngoài màn hình');
    await page.tap('#lkTapPlay');
    await page.waitForFunction(() => window.__aud.ok.length >= 2, null, { timeout: 15000 }).catch(() => {});
    const a = await aud(page);
    if (a.ok.length < 2) { bad(k, `chạm "Bấm để nghe" vẫn không có tiếng (${a.ok.length} câu; bị chặn ${a.blocked}, giọng máy chặn ${a.ttsBlocked}/nói ${a.tts}, mp3 sẵn ${a.hq}, nút lại hiện ${!!(await page.$('#lkTapPlay'))}, đang: "${a.now}"; nhật ký: ${a.log})`); await page.screenshot({ path: `${OUT}/${name}-after-tap.png` }); }
    else console.log(`  ✓ chạm → phát ${a.ok.length} câu`);
    if (a.ok.filter(x => x === a.ok[0]).length > 1) bad(k, 'câu đầu bị phát lại (vi phạm luật nghe 1 lần)');
    if (errs.length) bad(k, 'lỗi JS: ' + errs.join(' | '));
    await browser.close(); }
}

// (3) Một phần thi thật (#/listen/…?mode=exam): màn chuẩn bị → "Nghe ngay" (cú chạm) → có tiếng; (4) luyện tập mở thẳng bằng link, không cú chạm:
// 3-2-1 rồi tự phát → trình duyệt chặn → PHẢI hiện nút "Bấm để nghe" (không im lặng), chạm → có tiếng
async function single(name, bt) {
  { const { browser, page, errs } = await open(bt), k = name + ' · 1 phần thi thật: chuẩn bị → Nghe ngay';
    await page.goto(`${BASE}/app/?sandbox=1&hl=vi#/listen/t1p1?mode=exam`, { waitUntil: 'load' });
    const go = await page.waitForSelector('#lPrep [data-a="go"]', { timeout: 20000 }).catch(() => null);
    if (!go) bad(k, 'không có màn chuẩn bị trước khi phát');
    else {
      const txt = await page.$eval('#lPrep', e => e.textContent);
      if (!/\d/.test(txt)) bad(k, 'màn chuẩn bị không đếm ngược: ' + txt.slice(0, 80));
      await page.tap('#lPrep [data-a="go"]');
      await page.waitForFunction(() => window.__aud.ok.length >= 2, null, { timeout: 15000 }).catch(() => {});
      const a = await aud(page); if (a.ok.length < 2) bad(k, `chạm "Nghe ngay" không có tiếng (${a.ok.length} câu, chặn ${a.blocked}; ${a.log})`); else console.log(`  ✓ thi thật: phát ${a.ok.length} câu`);
      if (await page.$('#lPrep')) bad(k, 'màn chuẩn bị không biến mất sau khi phát');
    }
    if (errs.length) bad(k, 'lỗi JS: ' + errs.join(' | '));
    await browser.close(); }
  { const { browser, page, errs } = await open(bt), k = name + ' · luyện tập tự phát bị chặn → nút to';
    await page.goto(`${BASE}/app/?sandbox=1&hl=vi#/listen/t1p1`, { waitUntil: 'load' });
    await page.waitForSelector('#lPrep', { timeout: 20000 }).catch(() => {});
    const btn = await page.waitForSelector('#lkTapPlay', { timeout: 12000 }).catch(() => null);
    await page.screenshot({ path: `${OUT}/${name}-practice-blocked.png` });
    if (!btn) bad(k, 'tự phát bị chặn nhưng không hiện nút "Bấm để nghe" (lỗi im lặng)');
    else { await page.tap('#lkTapPlay'); await page.waitForFunction(() => window.__aud.ok.length >= 2, null, { timeout: 15000 }).catch(() => {}); const a = await aud(page); if (a.ok.length < 2) bad(k, `chạm nút vẫn không có tiếng (${a.ok.length})`); else console.log(`  ✓ luyện tập: bị chặn → chạm → ${a.ok.length} câu`); }
    if (errs.length) bad(k, 'lỗi JS: ' + errs.join(' | '));
    await browser.close(); }
}

await run('chromium-iphone', chromium);
await run('webkit-iphone', webkit);
await single('chromium-iphone', chromium);
await single('webkit-iphone', webkit);
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({ fails }, null, 1));
console.log(fails.length ? `\n❌ ${fails.length} lỗi:\n` + fails.join('\n') : '\n✅ ios-audio: Thi thử Listening có tiếng khi tự phát; bị chặn → "Bấm để nghe" phát tiếp đúng câu');
process.exit(fails.length ? 1 : 0);
