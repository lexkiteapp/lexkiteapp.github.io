// 📞 Kiểm thử đầu-cuối Call Ama/Carlos (#/call) + Nhịp câu (#/pron/weak-forms) – chạy trên CI (call-qa.yml), không tài khoản thật.
// Chromium thật + SpeechRecognition GIẢ "trên máy" (available() = 'available', có processLocally) trả câu theo hàng đợi window.__heard;
// TTS giả kết thúc ngay (headless không đọc); tài sản ngoài (audio CDN) bị chặn → giáo viên dùng giọng máy + poster.
// Kiểm: rẽ nhánh IELTS P1, ngắt lời an toàn (kết quả nhận dạng muộn của lượt cũ bị bỏ), tổng kết (từ chủ đề, nhận xét, lời thoại, câu yếu),
// luyện lại câu yếu, nhầm cặp âm bread ≠ breast, Part 2 (chuẩn bị + nói dài nhiều đoạn), hỏi cách nhận dạng khi máy không có gói trên máy,
// nhịp câu/shadowing, bố cục 375 px không tràn ngang, ngân sách tải lần đầu, không lỗi JS.
// Tùy chọn: --whisper <wav> → Whisper tiny.en THẬT trên máy với micro giả phát file mẫu (tải mô hình từ CDN, chỉ CI).
// --before → chỉ chụp ảnh (chạy trên bản main cũ để làm bảng trước/sau). --out <thư mục> ảnh + video.
// Dùng: npm i --no-save playwright@1.48.2 && npx playwright install chromium && node scripts/test/call-e2e.mjs --out qa-call
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const OUT = path.resolve(arg('--out') || 'qa-call'), BEFORE = process.argv.includes('--before'), WAV = arg('--whisper');
const ROOT = path.resolve(arg('--root') || 'web');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.mp3': 'audio/mpeg' };
const BASE = 'http://lexkite.localhost/';
let served = 0;
const serve = route => {
  let p = decodeURIComponent(new URL(route.request().url()).pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, path.normalize(p));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || !fs.statSync(f).isFile()) return route.fulfill({ status: 404, body: '' });
  const body = fs.readFileSync(f); served += /\.(js|css|json|html)$/.test(f) ? zlib.gzipSync(body).length : body.length;
  return route.fulfill({ status: 200, contentType: MIME[path.extname(f)] || 'application/octet-stream', body });
};

// SpeechRecognition giả: cfg.local = gói trên máy có sẵn; mỗi start() lấy 1 câu từ window.__heard (rỗng → no-speech); window.__delay = trễ ms
const MOCK = cfg => {
  window.__heard = []; window.__delay = 120; window.__srStarts = 0;
  class MockSR {
    constructor() { this.continuous = false; this.interimResults = false; this.lang = ''; this._t = []; }
    static available() { return Promise.resolve(cfg.local ? 'available' : 'unavailable'); }
    addEventListener() {} removeEventListener() {}
    start() {
      window.__srStarts++; window.__lastSR = this;
      const fire = (n, e) => typeof this[n] === 'function' && this[n](e || {});
      const text = window.__heard.shift();
      this._t.push(setTimeout(() => fire('onstart'), 20));
      this._t.push(setTimeout(() => {
        if (text == null) { fire('onerror', { error: 'no-speech' }); fire('onend'); return; }
        const alt = [{ transcript: text, confidence: 0.9 }]; alt.isFinal = true; fire('onresult', { resultIndex: 0, results: [alt] }); fire('onend');
      }, window.__delay));
    }
    stop() { setTimeout(() => typeof this.onend === 'function' && this.onend({}), 0); }
    abort() { this._t.forEach(clearTimeout); this._t = []; }
  }
  MockSR.prototype.processLocally = false;
  window.SpeechRecognition = window.webkitSpeechRecognition = MockSR;
  // TTS giả: kết thúc sau 40 ms (headless không có giọng)
  try { const ss = window.speechSynthesis; ss.speak = u => setTimeout(() => { if (u.onstart) u.onstart({}); if (u.onend) u.onend({}); }, 40); ss.getVoices = () => []; } catch (e) { /* */ }
};

const fakeAudio = WAV ? [`--use-file-for-fake-audio-capture=${path.resolve(WAV)}`] : [];
const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', ...fakeAudio] });
const fails = [], ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fails.push(msg); };
const shot = async (page, name) => { await page.waitForTimeout(250); await page.screenshot({ path: path.join(OUT, name + '.png') }); };

async function open(o = {}) {
  const ctx = await browser.newContext({ locale: 'vi', permissions: ['microphone'], serviceWorkers: 'block', viewport: o.vp || { width: 1280, height: 800 }, deviceScaleFactor: 1, ...(o.video ? { recordVideo: { dir: path.join(OUT, 'video'), size: o.vp || { width: 1280, height: 800 } } } : {}) });
  await ctx.route(BASE + '**', serve);
  await ctx.route(/audio\.lexkite\.com|github\.io\/(lexkite-media|audio)/, r => r.abort());
  await ctx.route('https://lexkite.com/api/**', r => r.request().method() === 'OPTIONS' ? r.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
    : r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, notices: [], unread_count: 0 }) }));
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon|googletagmanager|speechSynthesis|net::ERR/i.test(m.text())) errs.push('console: ' + m.text()); });
  if (!o.realSR) await page.addInitScript(MOCK, { local: o.local !== false });
  else await page.addInitScript(() => { try { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; } catch (e) { /* */ } window.SpeechRecognition = window.webkitSpeechRecognition = undefined; localStorage.setItem('vb.whisper', '1'); localStorage.setItem('vb.call.asr', 'device'); });
  await page.goto(`${BASE}app/?sandbox=1&hl=vi#/welcome/setup`, { waitUntil: 'load' });
  await page.waitForTimeout(1500); await page.waitForSelector('#obNext, #go', { timeout: 8000 }).catch(() => {}); for (let i = 0; i < 8 && !(await page.$('#go')) && (await page.$('#obNext')); i++) { await page.click('#obNext').catch(() => {}); await page.waitForTimeout(150); } const go0 = await page.$('#go'); if (go0) { await go0.click().catch(() => {}); await page.waitForTimeout(1000); }
  return { ctx, page, errs };
}
const go = (page, h) => page.evaluate(x => { location.hash = x; }, h);
const state = page => page.evaluate(() => (window.__callState ? window.__callState() : null));
const until = (page, fn, arg, ms = 15000) => page.waitForFunction(fn, arg, { timeout: ms });

if (BEFORE) { // bản cũ: chỉ chụp ảnh để so sánh
  for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'd'], [{ width: 375, height: 812 }, 'm']]) {
    const { ctx, page } = await open({ vp });
    await go(page, '#/call'); await page.waitForTimeout(1500); await shot(page, `list-${tag}`);
    const first = await page.$('.call-card'); const href = first ? await first.getAttribute('href') : '#/call/coffee';
    await go(page, href); await page.waitForTimeout(1200); await shot(page, `ring-${tag}`);
    await page.click('#callGo').catch(() => {}); await page.waitForTimeout(1500); await shot(page, `call-${tag}`);
    await ctx.close();
  }
  await browser.close(); console.log('before: đã chụp ' + OUT); process.exit(0);
}

// ===== 1) Desktop + video: danh sách, lọc, IELTS P1 rẽ nhánh, ngắt lời an toàn, tổng kết, luyện lại =====
{
  const { ctx, page, errs } = await open({ video: true });
  await go(page, '#/call'); await page.waitForSelector('.call-card', { timeout: 15000 });
  const n = await page.$$eval('.call-card', a => a.length);
  ok(n >= 11, `danh sách: ${n} cuộc gọi`);
  ok(/Ama|Carlos/.test(await page.textContent('h1')), 'tiêu đề Ama & Carlos (không còn Mia)');
  await page.click('[data-g="ielts"]'); await page.waitForTimeout(300);
  ok((await page.$$eval('.call-card', a => a.length)) === 3, 'lọc IELTS = 3 cuộc gọi');
  await shot(page, 'list-d');
  await page.click('[data-g="all"]');
  await go(page, '#/call/ielts-p1-home'); await page.waitForSelector('#callGo');
  await until(page, () => /trên máy/.test(document.querySelector('#callPriv').textContent));
  ok(true, 'màn gọi đến: báo nhận dạng trên máy');
  await shot(page, 'ring-d');
  served = 0;
  await page.click('#callGo'); await page.waitForSelector('.call-ov');
  await page.waitForTimeout(1500);
  ok(served < 700 * 1024, `ngân sách tải khi vào cuộc gọi: ${(served / 1024).toFixed(0)} KB ≤ 700 KB`);
  await until(page, () => /Đến lượt bạn/.test(document.querySelector('#cStT').textContent));
  ok(true, 'trạng thái "Đến lượt bạn" sau khi giáo viên nói');
  await shot(page, 'call-d');
  // Lượt 1: nói tên. Lượt 2 (job): "student" → nhánh study
  await page.evaluate(() => { window.__heard.push('My name is Linh Nguyen', 'Student'); });
  await page.click('#cMic');
  await until(page, () => window.__callState().id === 'study', null, 10000).catch(() => {});
  let s = await state(page);
  ok(s && s.id === 'study' && s.log.map(x => x.id).join() === 'name,job', 'rẽ nhánh sinh viên: ' + JSON.stringify(s && s.log.map(x => x.id)) + ' → ' + (s && s.id));
  await shot(page, 'listen-d');
  // Ngắt lời an toàn: nhận dạng trả muộn 1,5 s, người học gõ câu trước → kết quả muộn phải bị bỏ (không nhảy 2 lượt)
  await until(page, () => /Đến lượt bạn|Đang nghe/.test(document.querySelector('#cStT').textContent));
  await page.evaluate(() => { window.__delay = 1500; window.__heard.length = 0; window.__heard.push('LATE RESULT SHOULD BE IGNORED'); });
  if (!/Đang nghe/.test(await page.textContent('#cStT'))) await page.click('#cMic');
  await page.waitForTimeout(200);
  await page.fill('#cIn', 'I like my major because it is practical and my classmates are friendly'); await page.click('#cType button');
  await page.waitForTimeout(2200);
  s = await state(page);
  ok(s.id === 'home' && !s.log.some(x => /LATE/.test(x.text)) && s.log.length === 3, 'ngắt lời an toàn: kết quả muộn bị bỏ, đang ở ' + s.id + ' · ' + s.log.length + ' lượt');
  await page.evaluate(() => { window.__delay = 120; window.__heard.length = 0; window.__heard.push('My hometown is Hue, it is quiet and green', 'Yes I would because my family lives there and life is calm', 'Um I uh relax', 'I prefer spending time with friends because we have fun together'); });
  if (!/Đang nghe/.test(await page.textContent('#cStT'))) await page.click('#cMic');
  await page.waitForSelector('[data-score]', { timeout: 30000 }).catch(() => {});
  const sum = await page.evaluate(() => ({ score: +(document.querySelector('[data-score]') || {}).dataset?.score, tx: document.querySelectorAll('.call-tx').length, weak: document.querySelectorAll('.call-tx.weak').length, retry: !!document.querySelector('#cRetry'), chips: document.querySelectorAll('.call-chips .chip.ok').length, text: document.querySelector('#view, main, body').innerText }));
  ok(sum.score >= 40 && sum.score <= 100, 'tổng kết: điểm ' + sum.score);
  ok(sum.tx === 7, 'lời thoại 7 lượt: ' + sum.tx);
  ok(sum.weak >= 1 && sum.retry, 'có câu yếu + nút luyện lại: ' + sum.weak);
  ok(sum.chips >= 3, 'từ chủ đề đã dùng: ' + sum.chips);
  ok(/trả lời đầy đủ hơn/i.test(sum.text) && /Câu mẫu/.test(sum.text), 'nhận xét "trả lời đầy đủ hơn" + câu mẫu');
  await shot(page, 'summary-d');
  // Luyện lại câu yếu
  await page.click('#cRetry'); await page.waitForSelector('.call-ov');
  await until(page, () => /Đến lượt bạn/.test(document.querySelector('#cStT').textContent));
  await page.evaluate(() => { window.__heard.push(...Array(6).fill('I really enjoy it because it is practical, interesting and useful for my future career')); });
  await page.click('#cMic');
  await until(page, () => !document.querySelector('.call-ov') && /Luyện lại/.test((document.querySelector('.page-head') || {}).textContent || ''), null, 30000).catch(() => {});
  ok(/Luyện lại/.test(await page.textContent('.page-head')), 'luyện lại xong → tổng kết mới');
  ok(!errs.length, 'desktop: không lỗi JS' + (errs.length ? ' – ' + errs.join(' | ').slice(0, 400) : ''));
  await ctx.close();
}

// ===== 2) Bakery: bread ≠ breast · Part 2 chuẩn bị + nói dài · Phát âm nhịp câu =====
{
  const { ctx, page, errs } = await open();
  await go(page, '#/call/bakery'); await page.waitForSelector('#callGo'); await page.click('#callGo');
  await until(page, () => /Đến lượt bạn/.test(document.querySelector('#cStT').textContent));
  await page.evaluate(() => { window.__heard.push('Could I have a loaf of breast please'); });
  await page.click('#cMic');
  await until(page, () => /breast/.test(document.querySelector('#cTip').textContent), null, 8000).catch(() => {});
  ok(/breast/.test(await page.textContent('#cTip')) && /bread/.test(await page.textContent('#cTip')), 'nhầm cặp âm: báo “breast” → “bread”');
  await shot(page, 'slip-d');
  await page.click('#cEnd'); await page.waitForSelector('[data-score]', { timeout: 10000 });
  ok(await page.$('a[href="#/pron/final-consonants"]'), 'tổng kết: link luyện cặp âm');
  // Part 2
  await go(page, '#/call/ielts-p2-place'); await page.waitForSelector('#callGo'); await page.click('#callGo');
  await page.waitForSelector('.call-cue', { timeout: 10000 });
  ok(/where it is/.test(await page.textContent('.call-cue')), 'Part 2: thẻ đề có gợi ý');
  await shot(page, 'p2-prep-d');
  await page.click('[data-o="0"]'); // "I'm ready"
  await page.waitForSelector('#cLongDone', { timeout: 10000 });
  await until(page, () => /Đến lượt bạn/.test(document.querySelector('#cStT').textContent));
  await page.evaluate(() => { window.__heard.push('I would like to talk about Hoi An, an old town located in central Vietnam.', 'What I love most is the peaceful atmosphere in the evening, and I would highly recommend it.'); });
  await page.click('#cMic');
  await until(page, () => /recommend/.test(document.querySelector('#cYou').textContent), null, 10000).catch(() => {});
  await shot(page, 'p2-long-d');
  await page.click('#cLongDone');
  await page.waitForTimeout(800);
  const s = await state(page), talk = s.log.find(x => x.id === 'talk');
  ok(talk && /Hoi An/.test(talk.text) && /recommend/.test(talk.text) && s.id === 'often', 'Part 2: gom 2 đoạn nói thành 1 lượt dài, sang câu hỏi tiếp');
  // Phát âm: nhịp câu
  await go(page, '#/pron/weak-forms'); await page.waitForSelector('#pRhythm .rhy-s', { timeout: 15000 });
  ok(await page.$$eval('#pRhythm .rhy-w .ipa', a => a.length) >= 2, 'nhịp câu: hiện IPA dạng yếu');
  await page.evaluate(() => { window.__heard.push('I want to go to the shop'); });
  await page.click('#rhyGo');
  await page.waitForSelector('#rhyRes .feedback', { timeout: 10000 }).catch(() => {});
  ok(/\/100/.test(await page.textContent('#rhyRes')), 'shadowing: có điểm');
  await page.locator('#pRhythm').scrollIntoViewIfNeeded(); await shot(page, 'pron-rhythm-d');
  ok(!errs.length, 'bakery/P2/phát âm: không lỗi JS' + (errs.length ? ' – ' + errs.join(' | ').slice(0, 400) : ''));
  await ctx.close();
}

// ===== 3) Máy không có gói nhận dạng trên máy → hỏi; chọn "chỉ chạm/gõ" → micro tắt =====
{
  const { ctx, page, errs } = await open({ local: false });
  await go(page, '#/call/coffee'); await page.waitForSelector('#callGo'); await page.click('#callGo');
  await until(page, () => /Đến lượt bạn/.test(document.querySelector('#cStT').textContent));
  await page.click('#cMic');
  await page.waitForSelector('.call-ask', { timeout: 5000 }).catch(() => {});
  const opts = await page.$$eval('.call-ask [data-a]', a => a.map(x => x.dataset.a));
  ok(opts.includes('device') && opts.includes('cloud') && opts.includes('tap') && opts.indexOf('device') < opts.indexOf('cloud'), 'hỏi cách nhận dạng: trên máy đứng trước đám mây: ' + opts);
  ok(await page.evaluate(() => window.__srStarts === 0), 'chưa chọn → không gửi âm thanh lên dịch vụ nào');
  await shot(page, 'asr-ask-d');
  await page.click('[data-a="tap"]'); await page.waitForTimeout(300);
  ok(await page.$eval('#cMic', b => b.disabled), 'chọn chạm/gõ → micro tắt');
  ok(!errs.length, 'hỏi nhận dạng: không lỗi JS' + (errs.length ? ' – ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ===== 4) Điện thoại 375 px: không tràn ngang, nút ≥ 44 px =====
{
  const { ctx, page, errs } = await open({ vp: { width: 375, height: 812 }, video: false });
  const noX = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  await go(page, '#/call'); await page.waitForSelector('.call-card'); ok(await noX(), '375 px: danh sách không tràn ngang'); await shot(page, 'list-m');
  await go(page, '#/call/ielts-p1-home'); await page.waitForSelector('#callGo'); await shot(page, 'ring-m'); await page.click('#callGo');
  await until(page, () => /Đến lượt bạn/.test(document.querySelector('#cStT').textContent));
  const ov = await page.evaluate(() => { const o = document.querySelector('.call-ov'); return { x: o.scrollWidth <= o.clientWidth + 1, small: [...o.querySelectorAll('button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 44).map(b => b.id || b.textContent.trim().slice(0, 20)) }; });
  ok(ov.x, '375 px: cuộc gọi không tràn ngang');
  ok(!ov.small.length, '375 px: mọi nút ≥ 44 px ' + ov.small.join(','));
  await shot(page, 'call-m');
  await page.evaluate(() => { window.__heard.push('My name is Linh Nguyen', 'I work in a bank as a sales assistant and I enjoy it'); });
  await page.click('#cMic'); await until(page, () => window.__callState().log.length >= 2, null, 10000).catch(() => {});
  await page.click('#cEnd'); await page.waitForSelector('[data-score]', { timeout: 10000 });
  ok(await noX(), '375 px: tổng kết không tràn ngang'); await shot(page, 'summary-m');
  ok(!errs.length, 'điện thoại: không lỗi JS' + (errs.length ? ' – ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ===== 4b) Mặt VẼ khớp miệng (cờ lk.lipsync, docs/specs/call-lipsync.md): đầu trơn + lớp vector thay clip, nói (giọng máy → live) & nghỉ (chớp/liếc), fps ≥ 50 ở CPU 4×, không lỗi JS =====
{
  const { ctx, page, errs } = await open({ vp: { width: 375, height: 812 } });
  await page.evaluate(() => localStorage.setItem('lk.lipsync', '1'));
  await go(page, '#/call/coffee'); await page.waitForSelector('#callGo'); await page.click('#callGo');
  const on = await until(page, () => document.querySelector('.tch-rig.drawn .tch-face g.lk-face'), null, 15000).then(() => true, () => false);
  ok(on, 'mặt vẽ: đầu trơn + mắt/mày/miệng vector thay clip');
  ok(!(await page.$('.tch-cv')) && !(await page.$('.tch-rig video')), 'mặt vẽ: không tải clip WebGL');
  const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const a = (await state(page)).lip; await page.waitForTimeout(3000); const b = (await state(page)).lip;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const fps = a && b ? Math.round(1000 * (b.frames - a.frames) / (b.now - a.now)) : 0;
  ok(fps >= 50, `mặt vẽ: ${fps} fps ở CPU chậm 4× (≥ 50), khung > 50 ms: ${a && b ? b.long - a.long : '?'}`);
  await shot(page, 'lip-m');
  ok(!errs.length, 'mặt vẽ: không lỗi JS' + (errs.length ? ' – ' + errs.join(' | ').slice(0, 300) : ''));
  await ctx.close();
}

// ===== 5) Tùy chọn: Whisper THẬT trên máy với mẫu âm thanh thu sẵn =====
if (WAV) {
  const { ctx, page, errs } = await open({ realSR: true });
  await go(page, '#/call/ielts-p1-home'); await page.waitForSelector('#callGo'); await page.click('#callGo');
  await until(page, () => /Đến lượt bạn/.test(document.querySelector('#cStT').textContent), null, 20000);
  ok(/trên máy/.test(await page.textContent('#cPriv')), 'Whisper: báo nhận dạng trên máy');
  await page.click('#cMic');
  await until(page, () => window.__callState().log.length >= 1, null, 240000).catch(() => {});
  const s = await state(page), heard = (s.log[0] || {}).text || '';
  console.log('  Whisper nghe được: ' + JSON.stringify(heard));
  ok(/name/i.test(heard) && /linh|lynn|lin/i.test(heard), 'Whisper trên máy nhận đúng câu mẫu');
  ok(!errs.length, 'Whisper: không lỗi JS' + (errs.length ? ' – ' + errs.join(' | ').slice(0, 300) : ''));
  await ctx.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ fails }, null, 1));
if (fails.length) { console.error(`✗ call-e2e: ${fails.length} lỗi`); process.exit(1); }
console.log('✓ call-e2e: mọi kiểm tra đạt');
