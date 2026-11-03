// 💬 Bong bóng lời giáo viên (js/lesson/teacher.js: bubble/kara/weights/wordAt): đuôi trỏ đúng miệng người nói, karaoke khớp giọng ≤120 ms,
// chạm từ, 🐢 0,75×, CC, giảm chuyển động, tương phản (chữ ≥4.5:1, icon ≥3:1), RTL, không che nút X; truyện 2 giáo viên + cuộc gọi + Play & Speak (pas-drill).
// Chạy: node scripts/test/teacher-bubble.mjs [chromium,webkit]  (không đối số = phần Node + jsdom; có tên trình duyệt = thêm Playwright, chạy trên CI audio-play.yml)
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import os from 'node:os';
import jsdom from 'jsdom';
const SRC = fs.readFileSync('web/js/lesson/teacher.js', 'utf8');
let total = 0, fails = 0; const ok = (c, m) => { total++; if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };

// ---------- A. Karaoke khớp giọng: mốc giả kiểu Kokoro (độ dài theo âm vị + nghỉ dấu câu + im đầu/cuối) ----------
const dom = new jsdom.JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://lexkite.test/', pretendToBeVisual: true, runScripts: 'outside-only' });
const w = dom.window; w.Chars = { id: x => x, voice: x => 'af_heart', img: () => '<img class="tch-poster">', clip: () => '', still: () => '' };
w.matchMedia = () => ({ matches: true }); w.eval(SRC);
const T = w.LessonTeacher;
ok(T && T.SLOW === 0.75, 'nút 🐢 = 0,75× (đúng chuẩn, file Kokoro giữ cao độ)');
const SENT = ["We're considering moving to a new city.", 'She is afraid of the dark.', 'Her salary is paid every month, and she saves a little.', 'Could you tell me where the station is?', 'I like listening to music before I go to bed.', 'The meeting has been moved to Thursday afternoon.', 'Excuse me, is this seat taken?'];
const PH = x => x.toLowerCase().replace(/[^a-z]/g, '').replace(/(.)\1/g, '$1').replace(/e$/, '').length; // ≈ số âm vị
let worst = 0;
for (const s of SENT) {
  const ws = s.split(/\s+/), dur = ws.map(x => 0.062 * PH(x) + 0.075 + (/[,;:]$/.test(x) ? 0.22 : /[.!?]$/.test(x) ? 0.3 : 0));
  const LEAD = 0.12, speech = dur.reduce((a, b) => a + b, 0), D = speech + 2 * LEAD; // file = im + lời + im
  let acc = 0; const start = dur.map(d => { const v = acc; acc += d; return v; });
  const est = T.weights(ws);
  for (let i = 0; i < ws.length; i++) {
    // thời điểm (s, theo file) mà kara bật từ i: quét đồng hồ 5 ms giống rAF, f = (t - LEAD)/(D - 2·LEAD)
    let t = 0; while (t < D && T.wordAt(est, Math.max(0, t - LEAD) / (D - 2 * LEAD)) < i) t += 0.005;
    worst = Math.max(worst, Math.abs((t - LEAD) - start[i]) * 1000);
  }
}
ok(worst <= 120, `karaoke: lệch tối đa ${worst.toFixed(0)} ms so với mốc giả (≤120 ms)`);
ok(T.wordAt([1, 1], 0) === -1 && T.wordAt([1, 1], 0.4) === 0 && T.wordAt([1, 1], 0.6) === 1 && T.wordAt([1, 1], 1) === 1, 'wordAt: chưa phát = không sáng, cuối = từ cuối');

// ---------- B. jsdom: bọc từ, sáng dần, chạm từ, CC, đuôi đo bbox, RTL ----------
const D = w.document;
D.body.innerHTML = '<div id="tch" style="width:200px;height:172px"><div class="tch-rig"><img class="tch-poster"></div></div><div id="card"><p class="lsn-sent">I <span class="lsn-gap">&nbsp;</span> the station.</p></div>';
const rect = (l, t, wd, h) => () => ({ left: l, top: t, width: wd, height: h, right: l + wd, bottom: t + h, x: l, y: t });
D.querySelector('.tch-poster').getBoundingClientRect = rect(120, 0, 160, 172);
D.getElementById('card').getBoundingClientRect = rect(16, 116, 358, 220);
const se = D.querySelector('.lsn-sent'); se.querySelector('.lsn-gap').dataset.kn = 2;
let tapped = '';
const k = T.kara(se, 'I can see the station.', { onWord: x => { tapped = x; } });
ok(k.words.length === 5 && se.querySelectorAll('.kw').length === 3, 'kara: 3 từ hiện + chỗ trống 2 từ = 5 từ nói');
k.at(0.5); const on = [...se.querySelectorAll('.kw')].map(x => x.classList.contains('on'));
ok(on[0] && !on[2], 'kara: giữa câu → từ đầu sáng, từ cuối chưa');
k.at(1); ok([...se.querySelectorAll('.kw')].every(x => x.classList.contains('on')), 'kara: hết câu → sáng hết');
se.querySelectorAll('.kw')[2].dispatchEvent(new w.MouseEvent('click', { bubbles: true })); ok(tapped === 'station', 'chạm từ "station." → gọi đúng từ (bỏ dấu câu)');
k.cc(false); ok(se.classList.contains('kw-off'), 'CC tắt → ẩn chữ (thanh giữ chỗ, karaoke vẫn chạy)'); k.cc(true);
const b = T.bubble(D.getElementById('card'), D.getElementById('tch'));
const tail = D.querySelector('.tchb-tail'), x = +tail.dataset.x, mouth = 120 + 160 * 0.5 - 16;
ok(!tail.hidden && Math.abs(x + 9 - mouth) <= 1, `đuôi trỏ miệng giáo viên (tâm đuôi ${x + 9}px, miệng ${mouth}px)`);
D.querySelector('.tch-poster').getBoundingClientRect = rect(30, 0, 160, 172); D.documentElement.dir = 'rtl'; b.place();
ok(Math.abs(+tail.dataset.x + 9 - (30 + 80 - 16)) <= 1, 'RTL / giáo viên dời chỗ → đuôi đo lại, vẫn trỏ miệng');
const btn = D.createElement('button'); btn.innerHTML = '<div class="rounded-[9999px]"></div>'; b.playing(btn, 0.4);
ok(btn.classList.contains('tchb-play') && btn.querySelector('.tchb-ring').style.getPropertyValue('--p') === '0.400', 'nút Nghe lại: vòng tiến độ theo giọng'); b.playing(btn, 1); ok(!btn.classList.contains('tchb-play'), 'hết câu → tắt vòng');
const css = D.getElementById('tchb-css').textContent;
ok(/prefers-reduced-motion:reduce\)\{\.tchb-pop\{animation:none\}/.test(css) && /\.kwp \.kw\.on\{color:inherit\}/.test(css), 'giảm chuyển động: tắt animation, giữ highlight');
ok(/scale\(\.92\)/.test(css) && /\.16s/.test(css) && !/translate\([^)]*px\)[^}]*@keyframes/.test(css), 'hiện bong bóng: 0.92→1 + mờ 160 ms (không chữ bay)');
// tương phản (WCAG): chữ chưa đọc ≥4.5:1, nút CC (icon/chữ nhỏ) ≥4.5:1 sáng/tối
const L = h => { const c = h.match(/\w\w/g).map(v => parseInt(v, 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const CR = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
for (const [fg, bg, min, m] of [['4E5F62', 'FFFFFF', 4.5, 'chữ chưa đọc (sáng)'], ['A9BFC1', '142328', 4.5, 'chữ chưa đọc (tối)'], ['0D6964', 'FFFFFF', 4.5, 'CC bật (sáng)'], ['2BA39A', '142328', 4.5, 'CC bật (tối)'], ['4E5F62', 'FFFFFF', 3, 'CC tắt (sáng)'], ['2BA39A', 'FFFFFF', 3, 'vòng tiến độ/viền focus (sáng)'], ['EEF6F7', '10191B', 4.5, 'nghĩa nhanh']]) ok(CR(fg, bg) >= min, `tương phản ${m}: ${CR(fg, bg).toFixed(2)}:1 ≥ ${min}`);
ok(css.includes('#4E5F62') && css.includes('#A9BFC1') && css.includes('#0D6964'), 'màu đo đúng là màu trong CSS');
b.destroy();

// ---------- B2. Truyện 2 giáo viên + cuộc gọi: đuôi theo người nói, karaoke từng câu, CC không ẩn chữ ở màn không có nút CC ----------
{
  D.documentElement.dir = 'ltr';
  D.body.innerHTML = '<div id="ta" class="t"><img class="tch-poster"></div><div id="tc" class="t"><img class="tch-poster"></div><div id="la"><p>Hi there.</p></div><div id="lc"><p>Hello! Nice to meet you.</p></div>';
  const [pa, pc] = D.querySelectorAll('.tch-poster'); pa.getBoundingClientRect = rect(10, 0, 150, 160); pc.getBoundingClientRect = rect(230, 0, 150, 160);
  D.getElementById('la').getBoundingClientRect = rect(8, 150, 300, 80); D.getElementById('lc').getBoundingClientRect = rect(82, 240, 300, 80);
  const ba = T.bubble(D.getElementById('la'), D.getElementById('ta')), bc = T.bubble(D.getElementById('lc'), D.getElementById('tc'));
  const xa = +D.querySelector('#la .tchb-tail').dataset.x + 9 + 8, xc = +D.querySelector('#lc .tchb-tail').dataset.x + 9 + 82;
  ok(Math.abs(xa - 85) <= 1 && Math.abs(xc - 305) <= 1, `truyện: câu Ama trỏ Ama (${xa}px), câu Carlos trỏ Carlos (${xc}px)`);
  bc.point(D.getElementById('ta')); ok(+D.querySelector('#lc .tchb-tail').dataset.x + 9 + 82 < 120, 'đổi người nói → đuôi chuyển sang người mới');
  ba.destroy(); bc.destroy();
  try { w.localStorage.setItem('lk.cc', '0'); } catch (e) { /* jsdom */ }
  const kc = T.kara(D.querySelector('#lc p'), 'Hello! Nice to meet you.', { cc: false });
  ok(!D.querySelector('#lc p').classList.contains('kw-off'), 'màn không có nút CC → chữ luôn hiện dù đã tắt CC ở bài học');
  kc.part(1, 4, 0.01); const on2 = [...D.querySelectorAll('#lc .kw')].map(x => x.classList.contains('on'));
  ok(on2[0] && on2[1] && !on2[4], 'cuộc gọi: câu 2 bắt đầu → câu 1 đã sáng hết, từ đầu câu 2 sáng');
  kc.part(1, 4, 1); ok([...D.querySelectorAll('#lc .kw')].every(x => x.classList.contains('on')), 'cuộc gọi: hết câu 2 → sáng hết');
  w.localStorage.removeItem('lk.cc');
  const UI = fs.readFileSync('web/js/lesson/ui.js', 'utf8'), CALL = fs.readFileSync('web/js/call.js', 'utf8');
  ok(/duoBub\(n, it, p\)/.test(UI) && /#lsnTch2' : '#lsnTch'/.test(UI), 'ui.js: câu thoại mới gắn bong bóng vào đúng giáo viên đang nói');
  ok(/LessonTeacher\.bubble\(card, \$\('#cTch', ov\)\)/.test(CALL) && /kw\.part\(k0, cnt\[k\], f\)/.test(CALL) && /bub\.destroy\(\)/.test(CALL), 'call.js: thẻ phụ đề = bong bóng trỏ giáo viên, karaoke từng câu, dọn khi đóng');
}

// ---------- B3. Play & Speak (pas-drill): đuôi "Cô Ama" trỏ mặt giáo viên, RTL lật đuôi, chấm đủ tương phản ----------
const SPK = fs.readFileSync('web/js/speak/app.js', 'utf8');
const PAS = () => { const d2 = new jsdom.JSDOM('<!doctype html><html><head></head><body><div id="v"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true }); const v = d2.window;
  v.App = { routes: {}, view: v.document.getElementById('v') }; v.I18N = { lang: () => 'en' }; v.t = x => x; v.eval(SPK); return v; };
{
  const v = PAS(), S = v.App.speakBubble, V = v.document.getElementById('v');
  ok(!!S, 'speak/app.js nạp được, có App.speakBubble');
  const mk = () => { V.innerHTML = '<div role="progressbar" aria-label="Câu 1/6"></div><span>Câu 1/6</span><section><div class="box"><img></div><div id="spkSay"><div class="absolute"></div><div class="absolute"></div><div><span class="inline-block w-2 h-2 rounded-full lt:bg-[#F59E0B] dk:bg-[#f59e0b]"></span><span>CÔ AMA</span></div><p>Hi</p></div></section>';
    const img = V.querySelector('img'); Object.defineProperty(img, 'naturalWidth', { value: 300 }); Object.defineProperty(img, 'naturalHeight', { value: 400 }); Object.defineProperty(img, 'complete', { value: true }); return img; };
  let img = mk(); img.getBoundingClientRect = rect(16, 100, 96, 128); V.querySelector('#spkSay').getBoundingClientRect = rect(124, 60, 230, 200);
  S.bubbleFix(V); const tl = V.querySelector('#spkSay > .absolute'), face = 100 + 128 * S.FACE;
  ok(Math.abs(+tl.dataset.y + 8 + 60 - face) <= 1 && tl.style.transform === '', `pas-drill: đuôi ngang mặt giáo viên (${+tl.dataset.y + 68}px / mặt ${face}px), không cố định top-6`);
  img = mk(); img.getBoundingClientRect = rect(264, 100, 96, 128); V.querySelector('#spkSay').getBoundingClientRect = rect(20, 60, 230, 200); S.bubbleFix(V);
  const tr = V.querySelector('#spkSay > .absolute'); ok(tr.style.transform === 'scaleX(-1)' && tr.style.right === '-9px' && tr.style.left === 'auto', 'pas-drill RTL: giáo viên bên phải → đuôi lật sang phải');
  const dot = V.querySelector('#spkSay span.w-2'); ok(dot.classList.contains('spk-dot') && !dot.className.includes('#F59E0B'), 'chấm "Cô Ama": bỏ cam #F59E0B (2.15:1)');
  ok(V.querySelectorAll('.spk-pdot').length === 1, 'chấm trước "Câu 1/6" = chấm thật (không ký tự • mảnh), aria-hidden');
  ok(!/prog: '• '/.test(SPK), 'nhãn tiến độ đọc cho trình đọc màn hình không còn "•"');
  const dc = v.document.getElementById('spk-dot-css').textContent;
  for (const [fg, bg, m] of [['B45309', 'FFFFFF', 'chấm Cô Ama (sáng)'], ['F59E0B', '12282E', 'chấm Cô Ama (tối)'], ['136B66', 'FFF7EA', 'chấm Câu 1/6 (sáng)'], ['2DD4BF', '0B171A', 'chấm Câu 1/6 (tối)']]) ok(CR(fg, bg) >= 3 && dc.toUpperCase().includes('#' + fg), `tương phản ${m}: ${CR(fg, bg).toFixed(2)}:1 ≥ 3`);
}

// ---------- C. Trình duyệt thật (CI): bbox đuôi, X không bị che, reduced-motion, RTL ----------
const browsers = (process.argv[2] || '').split(',').filter(Boolean);
if (browsers.length) {
  const pw = await import('playwright');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tchb-'));
  const page = dir + '/i.html';
  fs.writeFileSync(page, `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>body{margin:0;font:16px system-ui}#x{position:absolute;top:8px;left:8px;width:44px;height:44px}.wrap{display:flex;justify-content:center;height:172px;margin:64px 0 -56px;position:relative;z-index:0}#tch{width:200px;height:172px}.tch-poster{width:100%;height:100%;object-fit:contain;display:block}#card{position:relative;z-index:10;margin:0 16px;padding:16px;border-radius:20px;background:#fff;border:1px solid #EADEC8;color:#10191B}</style></head>
<body><a id="x" href="#">X</a><div class="wrap"><div id="tch"><div class="tch-rig"><img class="tch-poster" alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'/%3E"></div></div></div>
<div id="card"><button id="lsnPlay"><div class="rounded-[9999px]">▶</div></button><p class="lsn-sent">Could you tell me where the station is?</p></div>
<script>self.Chars={id:x=>x,voice:()=>'af_heart',img:()=>'',clip:()=>'',still:()=>''};${SRC.replace(/<\/script/g, '<\\/script')}</script></body></html>`);
  for (const name of browsers) for (const vp of [{ width: 360, height: 740 }, { width: 768, height: 1024 }]) for (const dirn of ['ltr', 'rtl']) {
    const br = await pw[name].launch(); const ctx = await br.newContext({ viewport: vp, reducedMotion: 'reduce' }); const p = await ctx.newPage();
    await p.goto('file://' + page); await p.evaluate(d => { document.documentElement.dir = d; }, dirn);
    const r = await p.evaluate(() => { const b = LessonTeacher.bubble(document.getElementById('card'), document.getElementById('tch'));
      const k = LessonTeacher.kara(document.querySelector('.lsn-sent'), 'Could you tell me where the station is?'); b.pop(); b.place();
      const t = document.querySelector('.tchb-tail').getBoundingClientRect(), f = document.querySelector('.tch-poster').getBoundingClientRect(), x = document.getElementById('x').getBoundingClientRect();
      k.at(0.5); const cs = getComputedStyle(document.querySelector('.kw')), an = getComputedStyle(document.getElementById('card')).animationName;
      return { tc: t.left + t.width / 2, tt: t.top, mouth: f.left + f.width / 2, fb: f.bottom, ft: f.top, cover: !(t.right < x.left || t.left > x.right || t.bottom < x.top || t.top > x.bottom), an, on: document.querySelectorAll('.kw.on').length };
    });
    const tag = `${name} ${vp.width}px ${dirn}`;
    ok(Math.abs(r.tc - r.mouth) <= 2 && r.tt < r.fb && r.tt > r.ft, `${tag}: đuôi trỏ đúng giáo viên (tâm ${r.tc.toFixed(0)} / miệng ${r.mouth.toFixed(0)})`);
    ok(!r.cover, `${tag}: đuôi không che nút X`);
    ok(r.an === 'none' && r.on > 0, `${tag}: giảm chuyển động → không animation, highlight vẫn chạy`);
    await br.close();
  }
}
console.log(`\n${total - fails}/${total} ok`); if (fails) process.exit(1);
