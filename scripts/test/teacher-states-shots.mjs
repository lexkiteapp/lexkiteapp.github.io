// 🎬 Chuyển trạng thái giáo viên trên trình duyệt thật (Chrome + WebKit, H.264 thật, DPR 3): dừng đúng giữa lúc mờ chéo để chụp, so ảnh trong trang.
//  · ảnh tĩnh → clip: giữa và sau khi mờ vào hình phải gần như ảnh tĩnh (không hụt hình, không nhảy tay)
//  · đổi tư thế trong bài học: có mờ chéo, không hụt hình kể cả ảnh tải chậm
//  · giảm chuyển động: không clip, không hoạt ảnh, không tải mp4
// Dùng: node teacher-states-shots.mjs <web> <out> [--browser=chrome|webkit] [--report]  (--report: ảnh "trước", không chặn) · --sheet <trước> <sau> <out.png> ghép ảnh trước/sau
import fs from 'node:fs'; import path from 'node:path';
import { chromium, webkit } from 'playwright';
const argv = process.argv.slice(2), REPORT = argv.includes('--report'), BR = (argv.find(a => a.startsWith('--browser=')) || '--browser=chrome').split('=')[1];
const launch = () => (BR === 'webkit' ? webkit.launch() : chromium.launch({ channel: 'chrome' }));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm' };

if (argv[0] === '--sheet') {
  const [, A, B, OUT] = argv, cases = fs.readdirSync(B).filter(f => f.endsWith('.png')).sort();
  const b64 = f => fs.existsSync(f) ? `data:image/png;base64,${fs.readFileSync(f).toString('base64')}` : '';
  const row = f => `<tr><th>${f.replace('.png', '')}</th><td><img src="${b64(path.join(A, f))}"></td><td><img src="${b64(path.join(B, f))}"></td></tr>`;
  const br = await launch(), p = await br.newPage({ viewport: { width: 760, height: 600 } });
  await p.setContent(`<style>body{background:#0f1b1e;color:#e6eef0;font:13px system-ui;margin:12px}img{height:190px;display:block}th{text-align:left;font-weight:500;max-width:220px}td{padding:4px 8px}</style><table><tr><th></th><th>TRƯỚC</th><th>SAU</th></tr>${cases.map(row).join('')}</table>`);
  await p.screenshot({ path: OUT, fullPage: true }); await br.close(); process.exit(0);
}
const [WEB = 'web', OUT = 'out/teacher-states'] = argv.filter(a => !a.startsWith('--'));
fs.mkdirSync(OUT, { recursive: true });
const CSS = (fs.readFileSync(path.join(WEB, 'js/lesson/ui.js'), 'utf8').match(/\.lsn-v2 \.tch-rig\.posed img\.tch-still\{[^`\n]*/) || [''])[0]; // đúng CSS bài học thật
const HTML = `<!doctype html><meta name=viewport content="width=device-width"><style>body{margin:0;background:#0f1b1e}#s{position:absolute;left:60px;top:40px}#l{position:absolute;left:95px;top:40px;width:200px;height:172px}#c{position:absolute;left:40px;right:40px;top:156px;height:90px;background:#1b2a2f;border-radius:16px;z-index:5}${CSS}</style><div id=s></div><div class=lsn-v2><div id=l></div></div><div id=c></div><script src=js/characters.js></script><script src=js/teacher-slot.js></script><script src=js/lesson/teacher.js></script>`;
const errs = [], rows = [], browser = await launch();
const open = async o => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 500 }, deviceScaleFactor: 3, colorScheme: 'dark', serviceWorkers: 'block', ...o });
  const seen = [], slow = {};
  await ctx.route('**/*', async r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); if (u.pathname === '/fix.html') return r.fulfill({ contentType: 'text/html', body: HTML });
    const f = path.join(WEB, decodeURIComponent(u.pathname)); seen.push(u.pathname); for (const k in slow) if (u.pathname.includes(k)) await new Promise(z => setTimeout(z, slow[k]));
    if (!fs.existsSync(f)) return r.fulfill({ status: 404 }); const range = r.request().headers().range, b = fs.readFileSync(f), mime = MIME[path.extname(f)] || 'application/octet-stream';
    if (range) { const [, a, e] = /bytes=(\d+)-(\d*)/.exec(range), s = +a, t = e ? +e : b.length - 1; return r.fulfill({ status: 206, headers: { 'content-type': mime, 'content-range': `bytes ${s}-${t}/${b.length}`, 'accept-ranges': 'bytes', 'content-length': String(t - s + 1) }, body: b.subarray(s, t + 1) }); }
    r.fulfill({ contentType: mime, headers: { 'accept-ranges': 'bytes' }, body: b }); });
  const page = await ctx.newPage();
  await page.addInitScript(() => { const P = HTMLMediaElement.prototype.play; window.__hold = true; HTMLMediaElement.prototype.play = function () { return window.__hold ? Promise.resolve() : P.call(this); }; }); // giữ video: chỉ vẽ đúng 1 khung đầu để so ảnh
  await page.goto('https://lk.test/fix.html', { waitUntil: 'load' });
  return { ctx, page, seen, slow };
};
const crop = { x: 0, y: 0, width: 390, height: 300 };
// so 2 ảnh PNG trong trang: chênh trung bình /255 trên vùng có người (khác nền)
const diff = (page, a, b) => page.evaluate(async ([a, b]) => { const dec = async s => { const i = new Image(); i.src = 'data:image/png;base64,' + s; await i.decode(); const c = new OffscreenCanvas(i.width / 3, i.height / 3), x = c.getContext('2d'); x.drawImage(i, 0, 0, c.width, c.height); return x.getImageData(0, 0, c.width, c.height).data; };
  const A = await dec(a), B = await dec(b); let sum = 0, n = 0; const bg = [A[0], A[1], A[2]]; for (let i = 0; i < A.length; i += 4) { const fg = Math.abs(A[i] - bg[0]) + Math.abs(A[i + 1] - bg[1]) + Math.abs(A[i + 2] - bg[2]) > 24; if (!fg) continue; sum += (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2])) / 3; n++; } return n ? sum / n : 0; }, [a.toString('base64'), b.toString('base64')]);
const noAnim = '.tslot-img{animation:none!important}';
const PAD = (v, n = 1) => v.toFixed(n);
const CLIP_MAX = 9, MID_MAX = 9; // /255 trên vùng người (xem docs/specs/teacher-motion.md)

// ---------- 1) ảnh tĩnh → clip ----------
{ const { ctx, page } = await open({}); await page.addStyleTag({ content: noAnim + '#c{display:none}' });
  for (const [who, pose, flip] of [['ama', 'point'], ['ama', 'wave'], ['ama', 'cheer'], ['ama', 'encourage'], ['carlos', 'wave'], ['carlos', 'cheer'], ['carlos', 'explain', true]]) {
    const key = `${who}-${pose}${flip ? '-flip' : ''}`;
    await page.evaluate(([w, p, f]) => { document.getElementById('s').innerHTML = Chars.slot(w, { pose: p, size: 'xl', flip: f, lazy: false }); }, [who, pose, flip]);
    await page.waitForFunction(() => { const i = document.querySelector('.tslot img'); return i && i.complete && i.naturalWidth > 0; });
    await page.waitForTimeout(250); const still = await page.screenshot({ clip: crop });
    await page.evaluate(([w, p, f]) => { document.getElementById('s').innerHTML = Chars.slot(w, { pose: p, size: 'xl', flip: f, lazy: false, clip: true, loop: true });
      window.__mid = new Promise(res => { const tick = () => { const s = document.querySelector('.tslot.live'); if (s) { const an = document.getAnimations().filter(a => a.constructor.name === 'CSSTransition'); an.forEach(a => { a.pause(); a.currentTime = 90; }); res(an.length); } else requestAnimationFrame(tick); }; tick(); }); }, [who, pose, flip]);
    const mid = await Promise.race([page.evaluate(() => window.__mid), new Promise(r => setTimeout(() => r(-1), 12000))]);
    if (mid < 0) { errs.push(`${key}: clip không lên (không có .live) trên ${BR}`); continue; }
    await page.waitForFunction(() => { const c = document.querySelector('.tslot canvas'); return c && c.width > 2; });
    await page.waitForTimeout(80); const m = await page.screenshot({ clip: crop }); fs.writeFileSync(path.join(OUT, `slot-${key}-giua.png`), m);
    await page.evaluate(() => document.getAnimations().forEach(a => { try { if (a.constructor.name === 'CSSTransition') a.finish(); } catch (e) {} }));
    await page.waitForTimeout(120); const a = await page.screenshot({ clip: crop });
    const dM = await diff(page, still, m), dA = await diff(page, still, a); rows.push(`| ảnh→clip ${key} | ${PAD(dM)} | ${PAD(dA)} |`);
    if (dM > MID_MAX) errs.push(`${key}: giữa lúc mờ vào lệch ảnh tĩnh ${PAD(dM)} > ${MID_MAX} (hụt hình)`);
    if (dA > CLIP_MAX) errs.push(`${key}: khung đầu clip lệch ảnh tĩnh ${PAD(dA)} > ${CLIP_MAX} (nhảy tay)`);
  }
  await ctx.close(); }

// ---------- 2) đổi tư thế trong bài học ----------
for (const who of ['ama', 'carlos']) {
  const { ctx, page, slow } = await open({}); slow['still-concern'] = 900;
  await page.evaluate(w => { window.__t = LessonTeacher.mount(document.getElementById('l'), w, { lip: true, visible: 116 / 172 }); }, who);
  const ready = await page.waitForFunction(() => document.querySelector('.tch-rig[data-face] canvas'), null, { timeout: 15000 }).then(() => 1, () => 0);
  if (!ready) errs.push(`${who}: mặt vẽ không lên`);
  await page.waitForTimeout(300); const before = await page.screenshot({ clip: crop });
  // ảnh tải chậm: trong lúc chờ người đang đứng vẫn hiện (không trắng khung)
  await page.evaluate(() => window.__t.pose('concern')); await page.waitForTimeout(400); const wait = await page.screenshot({ clip: crop }); fs.writeFileSync(path.join(OUT, `pose-${who}-cho-tai.png`), wait);
  const dW = await diff(page, before, wait); rows.push(`| ${who} chờ tải concern | ${PAD(dW)} | |`); if (dW > MID_MAX) errs.push(`${who}: ảnh tải chậm làm hụt hình (lệch ${PAD(dW)} > ${MID_MAX})`);
  await page.waitForTimeout(1300);
  const pause = () => page.evaluate(() => new Promise(res => { let n = 0; const tick = () => { const an = document.getAnimations().filter(a => a.constructor.name === 'CSSTransition' && a.effect.target.closest('.tch-rig')); if (an.length) { an.forEach(a => { a.pause(); a.currentTime = 90; }); res(true); } else if (++n > 40) res(false); else requestAnimationFrame(tick); }; tick(); }));
  const state = () => page.evaluate(() => { const s = document.querySelector('.tch-still,.tch-out'), c = document.querySelector('.tch-rig canvas'); return { o: s ? +getComputedStyle(s).opacity : -1, sv: s ? getComputedStyle(s).visibility : '', cv: c ? getComputedStyle(c).visibility : '' }; });
  const p1 = page.evaluate(() => { window.__t.pose('cheer'); }); await p1; const fadeIn = await pause(), sIn = await state(); await page.waitForTimeout(50);
  const mIn = await page.screenshot({ clip: crop }); fs.writeFileSync(path.join(OUT, `pose-${who}-mo-vao.png`), mIn);
  rows.push(`| ${who} mờ vào cheer: opacity | ${PAD(sIn.o, 2)} | lớp dưới ${sIn.cv} |`);
  if (!fadeIn || !(sIn.o > 0.15 && sIn.o < 0.85)) errs.push(`${who}: pose không mờ chéo (opacity ${sIn.o}, cắt cứng)`);
  if (sIn.cv !== 'visible') errs.push(`${who}: đang mờ vào mà lớp dưới ẩn (${sIn.cv}) → hụt hình`);
  await page.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} })); await page.waitForTimeout(350);
  await page.evaluate(() => { window.__t.pose(null); }); const fadeOut = await pause(), sOut = await state(); await page.waitForTimeout(50);
  fs.writeFileSync(path.join(OUT, `pose-${who}-mo-ra.png`), await page.screenshot({ clip: crop }));
  rows.push(`| ${who} mờ ra: opacity | ${PAD(sOut.o, 2)} | lớp dưới ${sOut.cv} |`);
  if (!fadeOut || sOut.sv !== 'visible' || !(sOut.o > 0.15 && sOut.o < 0.85)) errs.push(`${who}: pose(null) không mờ chéo (opacity ${sOut.o}, ${sOut.sv})`);
  await ctx.close();
}

// ---------- 3) giảm chuyển động ----------
{ const { ctx, page, seen } = await open({ reducedMotion: 'reduce' });
  const r = await page.evaluate(async () => { document.getElementById('s').innerHTML = Chars.slot('ama', { pose: 'point', size: 'l', lazy: false, clip: true, loop: true }); window.__t = LessonTeacher.mount(document.getElementById('l'), 'ama', { lip: false }); await new Promise(z => setTimeout(z, 1500));
    window.__t.pose('cheer'); await new Promise(z => setTimeout(z, 120)); const s = document.querySelector('.tch-still');
    return { live: !!document.querySelector('.tslot.live,.tslot canvas,.tslot video'), anims: document.getAnimations().filter(a => a.effect.target.closest('.tslot,.tch-rig')).length, op: s && getComputedStyle(s).opacity }; });
  rows.push(`| giảm chuyển động | clip ${r.live ? 'có' : 'không'}, hoạt ảnh ${r.anims} | mp4 ${seen.filter(u => u.endsWith('.mp4')).length} |`);
  if (r.live) errs.push('giảm chuyển động: chỗ giáo viên vẫn chạy clip');
  if (r.anims) errs.push(`giảm chuyển động: còn ${r.anims} hoạt ảnh`);
  if (seen.some(u => u.endsWith('.mp4'))) errs.push(`giảm chuyển động: vẫn tải ${seen.filter(u => u.endsWith('.mp4')).join(', ')}`);
  if (+r.op !== 1) errs.push(`giảm chuyển động: tư thế phải hiện ngay (opacity ${r.op})`);
  await ctx.close(); }
await browser.close();
const md = [`# teacher-states (${BR})`, '', '| trường hợp | giữa / giá trị | sau / phụ |', '|---|---:|---:|', ...rows, '', errs.length ? '## ĐỎ\n' + errs.map(e => '- ' + e).join('\n') : '✓ chuyển trạng thái không giật, không hụt hình, tôn trọng giảm chuyển động'];
fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n') + '\n'); console.log(md.join('\n'));
if (errs.length && !REPORT) { console.error(`✗ teacher-states-shots: ${errs.length} lỗi`); process.exit(1); }
