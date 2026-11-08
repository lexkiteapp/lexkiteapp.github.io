// Cổng TeacherBubble (bong bóng lời giáo viên – docs/specs/teacher-bubble.md).
//  Phần tĩnh/Node (chạy trong npm test: `--static`): tách cụm ký tự giữ nguyên dấu (NFC + NFD), tốc độ gõ 35–45 chữ/s, nhánh giảm chuyển động,
//   pop.mp3 ≤ 6 KB, KHÔNG tự đọc khi attach, giọng nữ Ama, không âm "tick", bản sao add-on trùng web, 15 ngôn ngữ cho nút 🔊, rig có pause, vị trí miệng khớp RIG.
//  Phần trình duyệt (CI teacher-bubble.yml; bỏ qua nếu thiếu playwright): CLS = 0 khi gõ, chiều cao bong bóng không đổi, chạm = hiện hết, giảm chuyển động = hiện ngay,
//   aria-live đủ chữ, vòng nghỉ dừng khi tab ẩn/ngoài màn, khớp môi p95 ≤ 33 ms (đường nói của bong bóng), khung không viền đứt, mũi nhọn ≤ 12 px so với miệng,
//   bong bóng không đè giáo viên, tương phản ≥ 4,5:1 sáng/tối, nút 🔊 ≥ 44 px, không tự đọc; khung giáo viên giữ chỗ (ảnh/rig tải xong lệch ≤ 1 px, CLS 0)
//   + mép trên bệ đúng mẫu 72 % ảnh; Hôm nay (hip:true) mép bệ = hông, lộ tới hông (360/1280 × sáng/tối × mọi cỡ). Ảnh 360 px trước/sau → out/teacher-bubble/ (artifact).
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), W = p => path.join(ROOT, 'web', p);
const STATIC = process.argv.includes('--static'), OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'out/teacher-bubble';
const res = []; let bad = 0;
const ok = (c, m) => { res.push((c ? '✓ ' : '✗ ') + m); if (!c) { bad++; process.exitCode = 1; } };
const read = p => fs.readFileSync(W(p), 'utf8');

// ===== Phần tĩnh =====
const core = require(W('js/teacher-bubble.js'));
const src = read('js/teacher-bubble.js');
const TXT = 'Chào bạn, mình là Ama! Ôn ngay nhé.';
for (const [name, s] of [['NFC', TXT.normalize('NFC')], ['NFD', TXT.normalize('NFD')]]) for (const noSeg of [false, true]) {
  const a = core.graphemes(s, 'vi', noSeg);
  ok(a.join('') === s && !a.some(x => /^\p{M}/u.test(x)), `cụm ký tự ${name}${noSeg ? ' (dự phòng, không Segmenter)' : ''}: ghép lại đúng nguyên văn, không cụm nào bắt đầu bằng dấu kết hợp (${a.length} cụm)`);
}
ok(core.graphemes(TXT.normalize('NFC'), 'vi').length === core.graphemes(TXT.normalize('NFD'), 'vi').length, 'NFC và NFD cho cùng số cụm (dấu không bị tách)');
ok(core.CPS >= 35 && core.CPS <= 45, `tốc độ gõ ${core.CPS} chữ/s ∈ [35, 45]`);
{ const ms = core.typeMs(40); ok(ms >= 889 && ms <= 1143, `40 cụm gõ trong ${ms} ms (≈ 1 s)`); }
ok(/const rm = \(\) => .*prefers-reduced-motion: reduce/.test(src) && /const typing = [^;]*!rm\(\)/.test(src), 'giảm chuyển động → nhánh hiện ngay (typing = … !rm() …)');
ok(/lite\(\)/.test(src) && /bot\(\)/.test(src), 'tiết kiệm dữ liệu / trình duyệt tự động hóa → hiện ngay');
ok(!/tick\.(mp3|wav)|typing-?sound|sfx\/(?!pop)/i.test(src) && !fs.existsSync(W('sfx/tick.mp3')), 'không có âm tiếng gõ (chỉ sfx/pop.mp3)');
{ const f = W('sfx/pop.mp3'); ok(fs.existsSync(f) && fs.statSync(f).size <= 6144 && fs.statSync(f).size > 200, `sfx/pop.mp3 có mặt, ${fs.existsSync(f) ? fs.statSync(f).size : 0} B ≤ 6 KB`); }
{ // không tự đọc: UI.tts chỉ xuất hiện trong startVoice (gọi từ nút bấm), không ở attach/ensureRig/typing
  const calls = [...src.matchAll(/\.tts\(|\bspeak\(/g)].map(m => m.index), a = src.indexOf('function startVoice'), b = src.indexOf("btn.addEventListener('click'");
  const tts = [...src.matchAll(/g\.UI\.tts\(/g)].map(m => m.index);
  ok(tts.length === 1 && tts[0] > a && tts[0] < b, 'UI.tts chỉ gọi 1 lần, bên trong startVoice (nút 🔊) – attach không bao giờ tự đọc'); void calls;
  ok(/who: 'ama', gender: 'f'/.test(src), "giọng yêu cầu = Ama nữ (who:'ama', gender:'f' → Kokoro af_heart / giọng máy nữ)");
  ok(/btn\.hidden = !p/.test(src) && /genderOf\(v\.name\) === 'f'/.test(src), 'nút 🔊 ẩn khi không có giọng nữ cho ngôn ngữ giao diện (không giả)');
}
{ const ux = read('js/ux1.js'); const f = ux.slice(ux.indexOf('function sayIn'), ux.indexOf('// ---------- CSS')); ok(/TeacherBubble\.attach/.test(f) && !/SayText/.test(f), 'Hôm nay (ux1.js sayIn) dùng TeacherBubble, không còn SayText'); ok(!/tts\(|speak\(/.test(f), 'sayIn không tự đọc'); }
ok(/Chars\.slot\('ama', Object\.assign\([^;]*hip: true/.test(read('js/ux1.js')), 'Hôm nay/Welcome: chỗ giáo viên hip:true (lộ tới hông như mẫu streak) – trang thử dựng y như vậy');
{ const r = read('js/teacher-rig.js'); ok(/pause\(on\)/.test(r) && /cancelAnimationFrame\(raf\)/.test(r), 'TeacherRig.pause(on) có (dừng rAF khi tab ẩn/ngoài màn)'); }
{ const fc = read('js/call/face.js'), m = /ama: \{[\s\S]*?mouth: \[(\d+), (\d+)\]/.exec(fc); ok(m && Math.abs(+m[2] / 960 - core.MOUTH_Y) < 1e-6, `MOUTH_Y ${core.MOUTH_Y.toFixed(3)} = RIG.ama.mouth ${m ? m[2] : '?'}/960 (face.js)`); }
for (const f of ['js/teacher-bubble.js', 'js/teacher-rig.js', 'js/ux1.js', 'sfx/pop.mp3']) { const e = path.join(ROOT, 'extension/app', f); ok(fs.existsSync(e) && fs.readFileSync(e).equals(fs.readFileSync(W(f))), `add-on trùng web: ${f}`); }
{ // 15 ngôn ngữ: khóa vi là chính nó; en + 13 nguồn i18n/ui/<lang>/ux1.js
  const K = ['Nghe Ama đọc', 'Dừng Ama đọc'], langs = fs.readFileSync(path.join(ROOT, 'scripts/i18n-langs.txt'), 'utf8').split('\n').map(x => x.trim()).filter(x => /^[a-z]{2}$/.test(x));
  const miss = []; for (const l of ['en', ...langs]) { const f = l === 'en' ? W('js/i18n/en/ux1.js') : path.join(ROOT, `i18n/ui/${l}/ux1.js`), s = fs.readFileSync(f, 'utf8'); for (const k of K) { const m = new RegExp(`"${k}": ?"([^"]+)"`).exec(s); if (!m || (l !== 'en' && m[1] === k) || (l !== 'en' && /^(Listen|Stop)/.test(m[1]))) miss.push(l + ':' + k); } }
  ok(langs.length === 13 && !miss.length, `nút 🔊: ${K.length} chuỗi × 15 ngôn ngữ (vi gốc + en + 13) đã dịch${miss.length ? ' – thiếu ' + miss.join(', ') : ''}`);
}

// ===== Phần trình duyệt =====
let chromium = null;
if (!STATIC) { try { ({ chromium } = await import('playwright')); } catch (e) { res.push('· bỏ qua phần trình duyệt: không có playwright'); } }
if (chromium) {
  fs.mkdirSync(OUT, { recursive: true });
  const TYPES = { js: 'text/javascript', json: 'application/json', webp: 'image/webp', png: 'image/png', html: 'text/html', css: 'text/css', mp3: 'audio/mpeg' };
  // WAV thử nghiệm 3,75 s (đúng độ dài câu '1017pom' trong cues.js) – tạo tại chỗ, không cần tệp ngoài
  const wav = (() => { const sr = 8000, n = Math.round(sr * 3.75), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(i / sr * 2 * Math.PI * 220) * 3000), 44 + i * 2); return b; })();
  const TB_SLOT = (fs.readFileSync(W('js/ux1.js'), 'utf8').match(/const TB_SLOT = '([^']+)'/) || [])[1]; if (!TB_SLOT) throw new Error('ux1.js thiếu TB_SLOT (chỗ giữ nút 🔊)'); // trang thử dựng y như Hôm nay (sayIn)
  const PAGE = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><html lang=vi data-theme=light><style>
:root{--surface-2:#fff;--ledge:#E4D5C5;--bg:#FFF8F0}:root[data-theme=dark]{--surface-2:#12252A;--ledge:#071316;--bg:#0B1B1F}
body{margin:0;background:var(--bg);font-family:system-ui,sans-serif}#row{display:flex;align-items:center;gap:12px;padding:16px;box-sizing:border-box;width:100%}
[data-tch]{width:120px;height:140px;flex:none;border:2px dashed #136B66;background:#E6F5F3;box-shadow:0 4px 0 #071316;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end}
#b{position:relative;flex:1;border:2px solid #EFE2D3;border-radius:16px;padding:14px;background:#fff;color:#1A1816}
:root[data-theme=dark] #b{background:#12252A;border-color:#1E3D44;color:#fff}#p{margin:0;font:800 12px/1.35 system-ui}.ptr{position:absolute;left:-10px;top:50%;width:16px;height:16px;transform:translateY(-50%) rotate(45deg);background:inherit;border-left:2px solid #EFE2D3;border-bottom:2px solid #EFE2D3}
#sp{height:3000px}</style>
<div id=row><div data-tch>SLOT</div><div id=b class="relative"><div class=hd style="font:900 10px system-ui;margin-bottom:6px">TRỌNG TÂM HÔM NAY</div><p id=p>“${TXT}”${TB_SLOT}</p><div class="ptr absolute -left-2.5 top-1/2 -translate-y-1/2 rotate-45"></div></div></div><div id=sp></div>
<script>window.t=s=>s;window.I18N={lang:()=>'en'};window.UI={tts(text,accent,rate,o){window.__tts={text,accent,o};setTimeout(()=>o.onEnd&&o.onEnd(),80)},stopSpeak(){}};
window.__cls=0;window.__clsSrc=[];new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput){window.__cls+=e.value;for(const s of e.sources||[])window.__clsSrc.push((s.node&&(s.node.id||s.node.className||s.node.nodeName))+' '+JSON.stringify([s.previousRect.x,s.previousRect.y,s.previousRect.width,s.previousRect.height])+'→'+JSON.stringify([s.currentRect.x,s.currentRect.y,s.currentRect.width,s.currentRect.height]))}}).observe({type:'layout-shift',buffered:true});</script>
<script src="js/characters.js"></script><script src="js/teacher-slot.js"></script><script src="js/call/cues.js"></script><script src="js/teacher-bubble.js"></script>
<script>document.querySelector('[data-tch]').innerHTML=Chars.slot('ama',{size:'m',hip:true,lazy:false,style:'margin-left:auto'});</script>`;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const open = async (o = {}) => {
    const ctx = await browser.newContext({ viewport: { width: o.w || 360, height: 640 }, deviceScaleFactor: 2, reducedMotion: o.reduce ? 'reduce' : 'no-preference', colorScheme: o.dark ? 'dark' : 'light' });
    await ctx.addInitScript(() => { try { localStorage.setItem('lk.tb', '1'); } catch (e) { /* bỏ qua */ } }); // bật gõ chữ/rig trong trình duyệt tự động hóa (mặc định tắt để các cổng khác ổn định)
    await ctx.route('**/*', async r => {
      const u = new URL(r.request().url()); if (o.slow && /^\/teach\/.+\.webp$/.test(u.pathname)) await new Promise(ok => setTimeout(ok, 700)); /* ảnh giáo viên đến chậm: đo khung TRƯỚC khi ảnh tải */ if (u.pathname === '/tb.html') return r.fulfill({ body: PAGE, contentType: 'text/html' }); if (u.pathname === '/t.wav') return r.fulfill({ body: wav, contentType: 'audio/wav' });
      const f = path.join(W(''), decodeURIComponent(u.pathname)); if (!f.startsWith(W('')) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ body: fs.readFileSync(f), contentType: TYPES[path.extname(f).slice(1)] || 'application/octet-stream' });
    });
    const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => m.type() === 'error' && !/404|Failed to load resource/.test(m.text()) && errs.push(m.text()));
    await page.goto('http://lk.test/tb.html', { waitUntil: o.slow ? 'domcontentloaded' : 'load' }); if (o.dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    return { ctx, page, errs };
  };
  const ATT = (key = 'k1', mood = 'greet') => `(() => { const p = document.getElementById('p'); window.ctl = TeacherBubble.attach({ root: document, textEl: p, slotEl: document.querySelector('[data-tch] .tslot'), who: 'ama', text: p.textContent.trim(), mood: '${mood}', key: '${key}' }); return !!window.ctl; })()`;
  const lum = c => { const v = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

  { // --- trước: khung cũ (viền đứt, chữ đầy) ---
    const { ctx, page } = await open(); await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/before-360.png` }); await ctx.close();
  }
  { // --- sau: gõ chữ, CLS, chiều cao, khung, mũi nhọn, 🔊, aria-live ---
    const { ctx, page, errs } = await open(); await page.waitForTimeout(300);
    await page.evaluate(ATT()); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const hs = await page.evaluate(async () => { const b = document.getElementById('b'), hs = [b.getBoundingClientRect().height], p = document.getElementById('p'), seen = [];
      await new Promise(done => { const f = () => { hs.push(b.getBoundingClientRect().height); seen.push(p.firstChild.firstChild.firstChild.nodeValue.length); if (!window.ctl.stats.shown || window.ctl.stats.shown < window.ctl.stats.graphemes) requestAnimationFrame(f); else done(); }; f(); }); return { hs, seen, typed: window.ctl.stats.typed }; });
    ok(hs.typed && hs.hs.every(h => Math.abs(h - hs.hs[0]) < 0.5), `chiều cao bong bóng không đổi từ khung đầu tới lúc gõ xong (${hs.hs.length} khung, ${hs.hs[0].toFixed(1)} px)`);
    ok(hs.seen.some(n => n > 0 && n < TXT.length), 'chữ hiện dần (có khung chỉ hiện một phần)');
    { const C = await page.evaluate(() => ({ v: window.__cls, s: window.__clsSrc.slice(0, 6) })); ok(C.v === 0, `CLS = 0 khi gắn + gõ chữ${C.v ? ` (CLS ${C.v.toFixed(4)}: ${C.s.join(' | ')})` : ''}`); }
    const A = await page.evaluate(() => { const c = document.querySelector('[data-tch]'), s = getComputedStyle(c), b = document.getElementById('b'), sl = document.querySelector('.tslot'), im = sl.querySelector('.tslot-img'), p = document.querySelector('.ptr'), btn = document.querySelector('.tb-snd');
      const ir = im.getBoundingClientRect(), pr = p.getBoundingClientRect(), br = b.getBoundingClientRect(), sr = sl.getBoundingClientRect(), bt = btn.getBoundingClientRect(), ls = document.querySelector('.tb-sr');
      return { bs: s.borderTopStyle, bw: s.borderTopWidth, bc: s.borderTopColor, bg: s.backgroundColor, sh: s.boxShadow, mouth: ir.top + ir.height * TeacherBubble.core.MOUTH_Y, ptr: pr.top + pr.height / 2, overlap: !(br.left >= sr.right || br.right <= sr.left || br.top >= sr.bottom || br.bottom <= sr.top), btnW: bt.width, btnH: bt.height, label: btn.getAttribute('aria-label'), hidden: btn.hidden,
        live: ls && ls.getAttribute('aria-live'), liveTxt: ls && ls.textContent, vis: document.querySelector('#p [aria-hidden=true]') ? 1 : 0, tts: !!window.__tts, ledge: (() => { const l = document.querySelector('.tslot-ledge'), f = document.querySelector('.tslot-fig'), cs = getComputedStyle(l), fm = getComputedStyle(f); return { d: cs.display, r: parseFloat(cs.borderTopLeftRadius) || 0, h: l.getBoundingClientRect().height, mask: (fm.maskImage || fm.webkitMaskImage || 'none') }; })() }; });
    ok(A.bs !== 'dashed' && (A.bw === '0px' || A.bc === 'rgba(0, 0, 0, 0)') && A.bg === 'rgba(0, 0, 0, 0)' && A.sh === 'none', `[data-tch] không viền đứt/nền/bóng (kiểu ${A.bs}, rộng ${A.bw} màu ${A.bc} – viền giữ bề dày nhưng trong suốt → gỡ viền không xô bố cục, nền ${A.bg}, bóng ${A.sh})`);
    ok(A.ledge.d !== 'none' && A.ledge.r <= A.ledge.h * 0.35 && A.ledge.mask === 'none', `đứng sau mặt nền phẳng (không bệ bo tròn, không mặt nạ mờ đáy – final-qc cấm): ${JSON.stringify(A.ledge)}`);
    ok(Math.abs(A.ptr - A.mouth) <= 12, `mũi nhọn lệch miệng ${Math.abs(A.ptr - A.mouth).toFixed(1)} px (≤ 12)`);
    ok(!A.overlap, 'bong bóng không đè giáo viên');
    ok(!A.hidden && A.btnW >= 44 && A.btnH >= 44 && !!A.label, `nút 🔊 ${A.btnW}×${A.btnH} px (≥ 44), aria-label "${A.label}"`);
    await page.waitForTimeout(250);
    ok(await page.evaluate(() => document.querySelector('.tb-sr').textContent) === TXT.replace(/^/, '“').replace(/$/, '”') && A.live === 'polite' && A.vis === 1, 'aria-live (polite) chứa đủ câu; chữ đang gõ aria-hidden');
    ok(!(await page.evaluate(() => !!window.__tts)), 'không tự đọc khi hiện bong bóng');
    await page.screenshot({ path: `${OUT}/after-360.png` });
    await page.click('.tb-snd'); await page.waitForTimeout(150);
    const V = await page.evaluate(() => ({ who: window.__tts && window.__tts.o.who, g: window.__tts && window.__tts.o.gender, accent: window.__tts && window.__tts.accent }));
    ok(V.who === 'ama' && V.g === 'f' && V.accent === 'en-US', `bấm 🔊 → UI.tts giọng Ama nữ (${V.accent})`);
    ok(errs.length === 0, `0 lỗi JS${errs.length ? ': ' + errs[0] : ''}`);
    // lần xem thứ 2 trong ngày: hiện ngay
    await page.reload(); await page.evaluate(ATT()); ok(await page.evaluate(() => window.ctl.stats.typed === false && document.getElementById('p').textContent.trim().length > 20), 'lần xem thứ 2 trong ngày hiện ngay (không gõ lại)');
    await ctx.close();
  }
  { // --- chạm = hiện hết ---
    const { ctx, page } = await open(); await page.evaluate(ATT('k2')); await page.waitForTimeout(120);
    await page.click('#b', { position: { x: 30, y: 8 } }); const s = await page.evaluate(() => ({ shown: window.ctl.stats.shown, n: window.ctl.stats.graphemes }));
    ok(s.shown === s.n, `chạm vào bong bóng = hiện hết ngay (${s.shown}/${s.n})`); await ctx.close();
  }
  { // --- giảm chuyển động ---
    const { ctx, page } = await open({ reduce: true }); await page.evaluate(ATT('k3'));
    const s = await page.evaluate(() => ({ typed: window.ctl.stats.typed, txt: document.getElementById('p').firstChild.firstChild.firstChild.nodeValue })); ok(!s.typed && s.txt.length > 20, 'prefers-reduced-motion: reduce → cả câu ngay lập tức'); await ctx.close();
  }
  { // --- tương phản sáng/tối ---
    for (const dark of [false, true]) { const { ctx, page } = await open({ dark }); await page.evaluate(ATT('k4' + dark)); await page.waitForTimeout(900);
      const c = await page.evaluate(() => [getComputedStyle(document.getElementById('p')).color, getComputedStyle(document.getElementById('b')).backgroundColor]);
      ok(ratio(c[0], c[1]) >= 4.5, `tương phản chữ/nền ${dark ? 'tối' : 'sáng'} = ${ratio(c[0], c[1]).toFixed(1)}:1 (≥ 4,5)`); if (dark) await page.screenshot({ path: `${OUT}/after-360-dark.png` }); await ctx.close(); }
  }
  { // --- vòng nghỉ dừng khi ẩn / ngoài màn; khớp môi ---
    const { ctx, page, errs } = await open(); await page.evaluate(ATT('k5', 'plan')); const rigOk = await page.evaluate(() => window.ctl.ready().then(r => !!r)).catch(() => false);
    ok(rigOk, 'TeacherRig tải lười và gắn vào chỗ giáo viên');
    if (rigOk) {
      await page.waitForTimeout(1800); const fr = () => page.evaluate(() => window.ctl.rig().stats.frames);
      let a = await fr(); await page.waitForTimeout(300); let b = await fr(); ok(b - a >= 5, `vòng nghỉ đang chạy (${b - a} khung / 300 ms)`);
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await page.waitForTimeout(100); a = await fr(); await page.waitForTimeout(400); b = await fr();
      ok(b - a <= 1, `tab ẩn → dừng vòng vẽ (${b - a} khung / 400 ms)`);
      await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); }); await page.waitForTimeout(300); a = await fr(); await page.waitForTimeout(300); b = await fr(); ok(b - a >= 5, 'tab hiện lại → chạy tiếp');
      await page.evaluate(() => window.scrollTo(0, 2500)); await page.waitForTimeout(500); a = await fr(); await page.waitForTimeout(400); b = await fr(); ok(b - a <= 1, `cuộn ra ngoài màn → dừng vòng vẽ (${b - a} khung / 400 ms)`);
      await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
      // khớp môi: đường nói của bong bóng (ctl.speak) với tệp âm thanh + mốc thật; p95 |miệng − đồng hồ audio| ≤ 33 ms
      const L = await page.evaluate(async () => {
        const key = '1017pom', packed = LK_CUES.k[key], au = new Audio('t.wav'); await new Promise(r => { au.oncanplaythrough = r; au.load(); }); await au.play(); window.ctl.speak(au, packed, 'xin chao');
        const S = []; await new Promise(done => { const f = () => { const r = window.ctl.rig().stats; S.push([au.currentTime, r.shape, r.speaking]); if (au.ended || au.currentTime > 3.6) done(); else requestAnimationFrame(f); }; f(); });
        const u = LipSync.unpack(packed).cues.filter(c => c.end - c.start >= 0.05), at = t => { let v = 'X'; for (const c of u) { if (c.start <= t) v = c.value; } return v; };
        const bounds = u.map(c => c.start), mism = S.filter(([t, sh, sp]) => t > 0.1 && sp && sh !== at(t)).map(([t]) => Math.min(...bounds.map(b => Math.abs(t - b))));
        mism.sort((x, y) => x - y); return { n: S.length, mism: mism.length, p95: mism.length ? mism[Math.floor(mism.length * 0.95)] : 0, cues: u.length };
      });
      ok(L.n > 100 && L.cues > 20 && L.p95 <= 0.033 && L.mism <= L.n * 0.2, `khớp môi (bong bóng→rig): ${L.n} khung, ${L.mism} lệch hình, p95 cách mốc gần nhất ${Math.round(L.p95 * 1000)} ms (≤ 33)`);
    }
    ok(errs.length === 0, `0 lỗi JS (rig)${errs.length ? ': ' + errs[0] : ''}`); await ctx.close();
  }
  { // --- khung giữ chỗ trước khi ảnh/rig tải (CLS 0, lệch ≤ 1 px) + bệ không che thân hơn mẫu Stitch (mép bệ 72 % ảnh): 360/1280 × sáng/tối × mọi cỡ ---
    // Lỗi 06/11 (ảnh chủ, Hôm nay tối): .trig{position:relative} của rig chèn SAU .tb-rig{absolute} → rig tụt 0,1 khung sau khi tải; bệ che nửa thân.
    const LEDGE_Y = 688; // hàng ảnh (/960) ở mép trên bệ theo mẫu: (1,2 − 0,18 − 0,16) / 1,2 – docs/CHARACTERS.md §Hình học
    // chỗ hip:true (Hôm nay/Welcome): mép bệ = hông (TeacherSlot.HIP) ± 1 px VÀ che dải 15 % đáy người (cùng phép đo final-qc 'not-pasted-on'); đầu/mặt cùng cỡ chỗ thường (1,2 khung)
    const EXTRA = [['xs', 'talk'], ['s', 'wave'], ['l', 'cheer'], ['xl', 'surprise']]; // surprise = tay cao nhất trong Chars.poses (y 68)
    for (const [w, dark] of [[360, false], [360, true], [1280, false], [1280, true]]) {
      const tag = `${w}px ${dark ? 'tối' : 'sáng'}`, { ctx, page, errs } = await open({ dark, w, slow: true });
      // thở CSS (scaleY ≤ 1,2 %) đổi hộp ảnh theo thời gian → đưa hoạt ảnh về khung 0 trước khi đo (đo bố cục, không đo nhịp thở)
      const snap = () => page.evaluate(() => { const A = document.getAnimations(); A.forEach(a => { a.pause(); a.currentTime = 0; }); const R = e => { if (!e) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; };
        return [...document.querySelectorAll('.tslot')].map(s => ({ size: s.className.match(/tslot-(\w+)/)[1], slot: R(s), img: R(s.querySelector('img.tslot-img')), fig: R(s.querySelector('.tslot-fig')), ledge: R(s.querySelector('.tslot-ledge')),
          hip: s.classList.contains('tslot-hip'), rig: R(s.querySelector('.tb-rig canvas')), done: s.querySelector('img.tslot-img').complete && s.querySelector('img.tslot-img').naturalWidth > 0, src: s.querySelector('img.tslot-img').getAttribute('src') }))
        .concat(A.forEach(a => a.play()) || []); });
      await page.evaluate(X => { const d = document.createElement('div'); d.id = 'more'; d.style.cssText = 'display:flex;align-items:flex-end;gap:24px;padding:24px 40px'; d.innerHTML = X.map(([size, pose]) => Chars.slot('ama', { size, pose, lazy: false })).join(''); document.getElementById('row').after(d); }, EXTRA);
      const before = await snap();
      ok(before.every(x => !x.done), `${tag}: đo khung TRƯỚC khi ảnh tải (${before.filter(x => !x.done).length}/${before.length} ảnh chưa về)`);
      await page.evaluate(ATT('k6' + w + dark)); const rigOk = await page.evaluate(() => window.ctl.ready().then(r => !!r)).catch(() => false);
      await page.waitForFunction(() => [...document.querySelectorAll('img.tslot-img')].every(i => i.complete && i.naturalWidth), null, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(700); const after = await snap();
      const d = (a, b) => (a && b ? Math.max(...a.map((v, i) => Math.abs(v - b[i]))) : 99);
      const moved = before.map((x, i) => [x.size, Math.max(d(x.slot, after[i].slot), d(x.img, after[i].img), d(x.ledge, after[i].ledge))]).filter(([, v]) => v > 1);
      ok(after.every(x => x.done) && !moved.length, `${tag}: khung, ảnh, bệ đứng yên khi ảnh tải xong (lệch ≤ 1 px)${moved.length ? ' – lệch ' + JSON.stringify(moved) : ''}`);
      const m = after.find(x => x.rig); ok(rigOk && m && d(m.rig, m.img) <= 1 && d(m.rig, before.find(x => x.size === m.size).img) <= 1, `${tag}: rig (canvas) trùng ảnh tĩnh trước/sau khi tải ≤ 1 px (rig ${m && m.rig.map(Math.round)}, ảnh ${m && m.img.map(Math.round)})`);
      const C = await page.evaluate(() => ({ v: window.__cls, s: window.__clsSrc.slice(0, 4) })); ok(C.v === 0, `${tag}: CLS = 0 khi ảnh + rig tải${C.v ? ` (${C.v.toFixed(4)}: ${C.s.join(' | ')})` : ''}`);
      // thắt lưng / vạt mờ / đỉnh người đo trên CHÍNH ảnh đã tải (cột giữa: hàng đầu có quần xám; hàng cuối còn đục; hàng đầu có người)
      const G = await page.evaluate(srcs => Promise.all(srcs.map(async src => { const im = new Image(); im.src = src; await im.decode(); const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        const W = c.width, H = c.height, px = x.getImageData(0, 0, W, H).data, at = (i, j) => px.subarray((j * W + i) * 4, (j * W + i) * 4 + 4);
        const gray = p => p[3] > 200 && Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]) < 14 && p[0] > 70 && p[0] < 160;
        let waist = -1, fade = -1, top = -1, t8 = -1, b8 = -1; for (let j = 0; j < H; j++) { let n = 0, op = 0, any = 0, k8 = 0; for (let i = 0; i < W; i += 4) { const p = at(i, j); if (p[3] >= 250) op = 1; if (p[3] > 128) any = 1; if (p[3] > 8) k8++; if (Math.abs(i - W / 2) < 40 && gray(p)) n++; }
          if (top < 0 && any) top = j; if (waist < 0 && j >= H * 0.6 && n >= 12) waist = j; if (op) fade = j; if (k8 >= 2) { if (t8 < 0) t8 = j; b8 = j; } }
        return { src, H, waist, fade, top, tail: b8 - 0.15 * (b8 - t8 + 1) }; })), [...new Set(after.map(x => x.src))]);
      const HIP = await page.evaluate(() => TeacherSlot.HIP);
      for (const x of after) { const g = G.find(y => y.src === x.src), y = r => x.img[1] + x.img[3] * r / g.H, lt = x.ledge[1];
        const sameHead = Math.abs(x.img[3] - x.slot[3] * 1.2) <= 1; // đầu/mặt cùng cỡ mọi chỗ (ảnh = 1,2 khung)
        if (x.hip) ok(sameHead && g.waist > 0 && Math.abs(lt - y(HIP)) <= 1 && lt < y(g.tail) && Math.abs(lt - y(g.waist)) <= x.img[3] * 20 / 960 && y(g.top) >= x.fig[1] - 0.5, `${tag} ${x.size} hip ${x.src.split('/').pop()}: mép trên bệ ${lt.toFixed(1)} = hông ${y(HIP).toFixed(1)} (HIP ${HIP}/960) ± 1 px, sát đầu quần đo được ${y(g.waist).toFixed(1)} (≤ 20/960 ảnh), che dải 15 % đáy người từ ${y(g.tail).toFixed(1)} (final-qc), đầu không bị cắt (${y(g.top).toFixed(1)} ≥ ${x.fig[1].toFixed(1)}), ảnh ${x.img[3].toFixed(1)} = 1,2 × khung`);
        else ok(sameHead && Math.abs(lt - y(LEDGE_Y)) <= 1 && lt <= y(g.fade) && y(g.top) >= x.fig[1] - 0.5, `${tag} ${x.size} ${x.src.split('/').pop()}: mép trên bệ ${lt.toFixed(1)} = mẫu ${y(LEDGE_Y).toFixed(1)} ± 1 px (không che thân hơn mẫu), che vạt mờ ${y(g.fade).toFixed(1)}, đầu/tay không bị cắt (${y(g.top).toFixed(1)} ≥ ${x.fig[1].toFixed(1)})`); }
      ok(after.some(x => x.hip), `${tag}: có chỗ hip:true (Hôm nay) trong phép đo`);
      if (w === 360) await page.screenshot({ path: `${OUT}/slot-360-${dark ? 'dark' : 'light'}.png` });
      ok(errs.length === 0, `${tag}: 0 lỗi JS${errs.length ? ': ' + errs[0] : ''}`); await ctx.close();
    }
  }
  await browser.close();
}
console.log(res.join('\n')); console.log(bad ? `✗ teacher-bubble: ${bad} lỗi` : '✓ teacher-bubble OK');
if (OUT && chromium) fs.writeFileSync(path.join(OUT, 'result.txt'), res.join('\n') + '\n');
