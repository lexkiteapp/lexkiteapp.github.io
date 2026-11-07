// Cổng TeacherMood – cảm xúc giáo viên trung tâm (docs/specs/upgrade-2026-11.md Đợt 2 #3, web/js/teacher-mood.js).
//  Tĩnh/Node (npm test: --static): luật cảm xúc (đúng/sai/sai liền/chuỗi tăng/lỡ chuỗi/đứng yên), tư thế có ảnh cho cả Ama lẫn Carlos, POSE_EMO một nguồn (Chars),
//   App.streakLost (lỡ chuỗi chỉ khi hôm nay + hôm qua trống và chuỗi cũ ≥ 2), nối lesson/ui.js + ux1.js, không tiếng, giảm chuyển động, 15 ngôn ngữ.
//  Trình duyệt (CI teacher-bubble.yml): gợi ý khi đứng yên đúng 1 lần/màn, ≤ 3/ngày, ẩn khi chạm, không khi tab ẩn/hộp thoại, CLS 0, tương phản AA sáng/tối.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), W = p => path.join(ROOT, 'web', p), read = p => fs.readFileSync(W(p), 'utf8');
const STATIC = process.argv.includes('--static'), OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'out/teacher-mood';
const res = []; let bad = 0; const ok = (c, m) => { res.push((c ? '✓ ' : '✗ ') + m); if (!c) { bad++; process.exitCode = 1; } };

// ===== Lõi thuần =====
const ctx = { console }; ctx.self = ctx; vm.createContext(ctx); vm.runInContext(read('js/characters.js'), ctx);
const Chars = ctx.Chars; global.self = ctx; delete require.cache[W('js/teacher-mood.js')]; const TM = require(W('js/teacher-mood.js'));
{ const m = TM.machine(), P = (e, d) => m.feed(e, d).pose;
  ok(P('answer', { ok: true }) === 'cheer', 'đúng → cheer');
  ok(P('answer', { ok: false }) === 'concern', 'sai lần đầu → concern (quan tâm, không trách)');
  ok(P('answer', { ok: false }) === 'encourage' && P('answer', { ok: false }) === 'encourage', 'sai ≥ 2 lần liền → encourage (động viên)');
  ok(P('answer', { ok: true }) === 'cheer' && P('answer', { ok: false }) === 'concern', 'đúng xen giữa → đếm sai lại từ đầu');
  ok(P('streak') === 'laugh' && P('streakLost') === 'empathy' && P('idle') === 'encourage', 'chuỗi tăng → laugh · lỡ chuỗi → empathy (an ủi) · đứng yên → encourage');
  ok(m.feed('nope') === null, 'sự kiện lạ → null (không đổi tư thế)');
  const e = m.feed('answer', { ok: true }); ok(e.emo === Chars.POSE_EMO.cheer && m.feed('streakLost').emo === Chars.POSE_EMO.empathy, 'biểu cảm lấy từ Chars.POSE_EMO (một nguồn)');
  const poses = ['cheer', 'concern', 'encourage', 'laugh', 'empathy'], miss = [];
  for (const who of ['ama', 'carlos']) for (const p of poses) if (!Chars.poses.includes(p) || !fs.existsSync(W(`teach/${who}/still-${p}.webp`))) miss.push(who + '/' + p);
  ok(!miss.length, `mọi tư thế cảm xúc có ảnh tĩnh cho Ama + Carlos${miss.length ? ' – thiếu ' + miss.join(', ') : ''}`);
  ok(poses.every(p => Chars.POSE_EMO[p]), 'mọi tư thế cảm xúc có biểu cảm trong POSE_EMO');
}
{ const src = read('js/teacher-mood.js');
  ok(!/new Audio|Sfx\.|\.tts\(|speechSynthesis|\.play\(/.test(src), 'gợi ý không phát tiếng (tôn trọng tắt tiếng, không làm phiền)');
  ok(/@media \(prefers-reduced-motion:no-preference\)\{\.tm-hint\{animation/.test(src) && !/\.tm-hint\{[^}]*(animation|transition)/.test(src.replace(/@media[^{]*\{\.tm-hint\{animation[^}]*\}/, '')), 'hiệu ứng hiện chỉ khi không giảm chuyển động');
  ok(/position:fixed/.test(src) && /pointer-events:none/.test(src) && /role', 'status'/.test(src), 'gợi ý là lớp cố định (CLS 0), không chắn chạm, đọc màn hình nghe được (role=status)');
  ok(TM.IDLE === 45000 && /used\(\) >= 3/.test(src) && /seen\.has\(k\)/.test(src), 'đứng yên 45 s · 1 lần/màn · ≤ 3 lần/ngày');
}
{ const t = read('js/lesson/teacher.js'); ok(!/const POSE_EMO/.test(t) && /Chars\.POSE_EMO/.test(t), 'LessonTeacher dùng Chars.POSE_EMO (bỏ bản sao)'); }
{ const u = read('js/lesson/ui.js');
  ok(/L\.pose = MOOD\('answer', \{ ok \}/.test(u) && /L\.teacher\.pose\(L\.pose \|\|/.test(u) && /tStill\([^)]*L\.pose \|\|/.test(u), 'bài học: đúng/sai → TeacherMood quyết tư thế (giáo viên + chip phản hồi)');
  ok(/App\.streak\(\) > L\.s0 \? MOOD\('streak'/.test(u), 'bài học xong mà chuỗi vừa tăng → tư thế chuỗi (laugh)');
  ok(/m\.type === 'idle'/.test(u) && /m\.type === 'calm'\) L\.teacher\.pose\(null\)/.test(u) && /L\.checked\) return/.test(u), 'đứng yên → động viên, chạm lại → về sống; không đè tấm phản hồi');
}
{ const x = read('js/ux1.js'), a = read('js/app.js');
  ok(/lost \? \{ pose: '(\w+)' \}/.test(x) && x.match(/lost \? \{ pose: '(\w+)' \}/)[1] === TM.machine().feed('streakLost').pose, 'Hôm nay lỡ chuỗi: tư thế = TeacherMood streakLost (empathy)');
  ok(/TeacherMood\.emit\('streakLost'/.test(x) && /streak, streakLost, activeDays/.test(a), 'Hôm nay báo trạng thái trung tâm; App.streakLost được xuất');
  const f = a.match(/function streakLost\(\) \{[^\n]*\n/)[0], key = d => d.toISOString().slice(0, 10), day = n => { const d = new Date(); d.setDate(d.getDate() - n); return key(d); };
  const run = act => vm.runInNewContext(f + 'streakLost()', { activeDays: () => new Set(act.map(day)), todayKey: key, Date });
  ok(run([0, 2, 3]) === 0 && run([1, 2, 3]) === 0 && run([2, 3, 4]) === 3 && run([2]) === 0 && run([]) === 0, 'streakLost: hôm nay/hôm qua có học → 0 · lỡ hôm qua sau chuỗi 3 → 3 · chuỗi cũ < 2 → 0');
}
{ const K = ['Cần giúp không? Cứ thử nhé – sai cũng không sao, mình học từ đó.', '{g} Không sao đâu, ai cũng có ngày bận. Hôm nay mình bắt đầu lại cùng nhau nhé!'];
  const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/i18n-fixed.json'), 'utf8')), en = read('js/i18n/en/core.js') + read('js/i18n/en/ux1.js');
  const langs = fs.readFileSync(path.join(ROOT, 'scripts/i18n-langs.txt'), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#') && s !== 'en' && s !== 'vi');
  const miss = K.flatMap(k => [en.includes(k) ? null : 'en:' + k.slice(0, 12), ...langs.filter(l => !(fx[k] && fx[k][l])).map(l => l + ':' + k.slice(0, 12))]).filter(Boolean);
  ok(!miss.length, `${K.length} chuỗi × 15 ngôn ngữ (vi + en + ${langs.length})${miss.length ? ' – thiếu ' + miss.join(', ') : ''}`);
  ok(!/(mất chuỗi|lười|thất vọng|đáng lẽ)/i.test(K[1]), 'câu an ủi không trách móc/dọa mất chuỗi');
}

// ===== Trình duyệt =====
let chromium = null;
if (!STATIC) { try { ({ chromium } = await import('playwright')); } catch (e) { res.push('· bỏ qua phần trình duyệt: không có playwright'); } }
if (chromium) {
  fs.mkdirSync(OUT, { recursive: true });
  const PAGE = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><html lang=vi><link rel=stylesheet href="css/style.css">
<style>body{margin:0;background:var(--bg);color:var(--text)}#view{padding:16px}#view p{margin:0 0 12px}</style><div id=view><span class="tslot"></span><p>Nội dung màn</p><button id=b>Nút</button></div>
<div id=modal hidden></div><script>window.t=s=>s;window.__cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:'layout-shift',buffered:true});
window.__au=0;const P=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__au++;return P.apply(this,arguments)};</script>
<script src="js/characters.js"></script><script src="js/teacher-mood.js"></script>`;
  const browser = await chromium.launch();
  const open = async (o = {}) => {
    const c = await browser.newContext({ viewport: { width: 360, height: 640 }, colorScheme: o.dark ? 'dark' : 'light', reducedMotion: o.reduce ? 'reduce' : 'no-preference' });
    await c.route('**/*', r => { const u = new URL(r.request().url()); if (u.pathname === '/m.html') return r.fulfill({ body: PAGE, contentType: 'text/html' });
      const f = path.join(W(''), decodeURIComponent(u.pathname)); if (!f.startsWith(W('')) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ body: fs.readFileSync(f), contentType: /\.css$/.test(f) ? 'text/css' : 'text/javascript' }); });
    const page = await c.newPage(), errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.goto('http://lk.test/m.html#/a'); await page.evaluate(() => { TeacherMood.IDLE = 250; window.__ev = []; TeacherMood.on(m => __ev.push(m.type)); TeacherMood.arm(); });
    return { c, page, errs };
  };
  const vis = page => page.evaluate(() => { const h = document.querySelector('.tm-hint'); return !!h && !h.hidden; });
  { const { c, page, errs } = await open();
    await page.waitForTimeout(450); ok(await vis(page), 'đứng yên đủ lâu → hiện gợi ý');
    const H = await page.evaluate(() => { const h = document.querySelector('.tm-hint'), s = getComputedStyle(h); return { pos: s.position, pe: s.pointerEvents, role: h.getAttribute('role'), txt: h.textContent, ev: __ev.slice() }; });
    ok(H.pos === 'fixed' && H.pe === 'none' && H.role === 'status' && /Cần giúp/.test(H.txt) && H.ev.includes('idle'), `gợi ý: cố định, không chắn chạm, role=status, sự kiện idle (${JSON.stringify(H.ev)})`);
    await page.mouse.click(5, 600); ok(!(await vis(page)) && (await page.evaluate(() => __ev.includes('calm'))), 'chạm → ẩn ngay, báo calm (giáo viên về sống)');
    await page.waitForTimeout(450); ok(!(await vis(page)), 'cùng màn: không gợi ý lần 2');
    await page.evaluate(() => { location.hash = '#/b'; }); await page.waitForTimeout(450); ok(await vis(page), 'màn mới → được gợi ý 1 lần');
    await page.evaluate(() => { location.hash = '#/c'; }); await page.waitForTimeout(450);
    await page.evaluate(() => { location.hash = '#/d'; }); await page.waitForTimeout(450); ok(!(await vis(page)), 'tối đa 3 gợi ý/ngày');
    ok((await page.evaluate(() => window.__cls)) === 0 && (await page.evaluate(() => window.__au)) === 0, 'CLS = 0, không phát âm thanh');
    ok(!errs.length, `0 lỗi JS${errs.length ? ': ' + errs[0] : ''}`); await c.close();
  }
  { const { c, page } = await open(); await page.evaluate(() => { document.getElementById('modal').hidden = false; }); await page.waitForTimeout(450); ok(!(await vis(page)), 'hộp thoại đang mở → không gợi ý'); await c.close(); }
  { const { c, page } = await open(); await page.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await page.waitForTimeout(450); ok(!(await vis(page)), 'tab ẩn → không gợi ý'); await c.close(); }
  { const { c, page } = await open(); await page.evaluate(() => document.querySelector('.tslot').remove()); await page.waitForTimeout(450); ok(!(await vis(page)), 'màn không có giáo viên → không gợi ý'); await c.close(); }
  { const { c, page } = await open({ reduce: true }); await page.waitForTimeout(450); ok((await page.evaluate(() => getComputedStyle(document.querySelector('.tm-hint')).animationName)) === 'none', 'giảm chuyển động → không hiệu ứng'); await c.close(); }
  const lum = c => { const v = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  for (const dark of [false, true]) { const { c, page } = await open({ dark }); await page.waitForTimeout(450);
    const [fg, bg] = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('.tm-hint')); return [s.color, s.backgroundColor]; }), a = lum(fg), b = lum(bg), r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    ok(r >= 4.5, `tương phản gợi ý ${dark ? 'tối' : 'sáng'} ${r.toFixed(1)}:1 (≥ 4,5)`); await page.screenshot({ path: `${OUT}/hint-360-${dark ? 'dark' : 'light'}.png` }); await c.close(); }
  await browser.close();
}
console.log(res.join('\n')); console.log(bad ? `✗ teacher-mood: ${bad} lỗi` : '✓ teacher-mood OK');
if (!STATIC && chromium) fs.writeFileSync(path.join(OUT, 'result.txt'), res.join('\n') + '\n');
