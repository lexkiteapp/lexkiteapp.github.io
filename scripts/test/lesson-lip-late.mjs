#!/usr/bin/env node
// LCP #/lesson/go (23/11): lipsync + cues (~100 KB nén) nạp SAU khi poster giáo viên (phần tử LCP) hiện, không lúc vào route. Kiểm từ nguồn + chạy lipLoad thật trong jsdom:
// (1) mount chờ poster (posterReady) trừ khi lk.lipEarly=1/cfg lip_early (công tắc tắt khẩn); (2) prep() không nạp sớm trừ khi prep(true) (Call đổ chuông) hoặc lipEarly; (3) cổng câu đầu (gate, chờ ≤2 s) vẫn nối với lipLoad.
import fs from 'node:fs'; import jsdom from 'jsdom';
const rd = f => fs.readFileSync(f, 'utf8'), T = rd('web/js/lesson/teacher.js'), bad = [];
for (const [re, m] of [[/const lipEarly = \(\) =>[^\n]*lk\.lipEarly[^\n]*lip_early/, 'công tắc lk.lipEarly / cfg lip_early'], [/const posterReady = rig =>/, 'posterReady(rig)'], [/const lipLoad = \(rig, force\) => lipP \|\| \(lipP = \(\(force \|\| lipEarly\(\) \|\| !rig\) \? Promise\.resolve\(\) : posterReady\(rig\)\)\.then\(lipFetch\)\)/, 'lipLoad chờ poster'],
  [/gate = lipLoad\(rig\)\.then\(/, 'mount: cổng câu đầu nối lipLoad(rig)'], [/const prep = force => \{[^\n]*force === true \|\| lipEarly\(\)[^\n]*lipLoad\(null, true\)/, 'prep chỉ nạp khi force/lipEarly']]) if (!re.test(T)) bad.push('thiếu: ' + m);
if (!/LessonTeacher\.prep\(true\)/.test(rd('web/js/call.js'))) bad.push('call.js phải gọi prep(true) (Call nạp sớm lúc đổ chuông)');
if (/LessonTeacher\.prep\(true\)/.test(rd('web/js/lesson/ui.js'))) bad.push('ui.js (route bài học) không được prep(true)');
// chạy thật: poster chưa tải → không chèn script; poster tải xong → chèn đủ 6 script
const run = async early => { const dom = new jsdom.JSDOM('<body><div id="el"></div></body>', { url: 'http://localhost/app/#/lesson/go', runScripts: 'outside-only', pretendToBeVisual: true }), w = dom.window;
  if (early) w.localStorage.setItem('lk.lipEarly', '1'); w.self = w; w.Chars = { id: x => x, img: () => '<img class="tch-poster" src="p.png">', clip: () => '', voice: () => ({}), slot: () => '' }; w.Sfx = {}; w.Game = {}; w.UI = {}; w.I18N = { lang: () => 'en' };
  const src = T.replace(/\}\)\(self\);?\s*$/, '})(self);');
  try { w.eval(src); } catch (e) { return { err: String(e.message).slice(0, 100) }; }
  const L = w.LessonTeacher; if (!L) return { err: 'không có LessonTeacher' };
  const n = () => [...w.document.head.querySelectorAll('script')].filter(s => /call\/(lipsync|mouths|face|paint|cues)|teacher-rig/.test(s.src)).length;
  const el = w.document.getElementById('el'); L.mount(el, 'ama', { lip: true }); await new Promise(r => setTimeout(r, 30)); const before = n();
  const im = el.querySelector('img.tch-poster'); if (im) im.dispatchEvent(new w.Event('load')); await new Promise(r => setTimeout(r, 150)); return { before, after: n() }; };
const a = await run(false), b = await run(true);
if (a.err || b.err) bad.push('chạy teacher.js trong jsdom lỗi: ' + (a.err || b.err)); else {
  if (a.before !== 0 || a.after < 5) bad.push(`mặc định: trước poster phải 0 script (${a.before}), sau poster ≥5 (${a.after})`);
  if (b.before < 5) bad.push(`lk.lipEarly=1: phải nạp ngay (${b.before})`); }
if (bad.length) { console.error('✗ lesson-lip-late:\n- ' + bad.join('\n- ')); process.exit(1); }
console.log(`✓ lesson-lip-late: lipsync nạp sau poster (mặc định 0→${a.after} script), công tắc lk.lipEarly nạp ngay (${b.before}), Call prep(true)`);
