// 🎭 Cổng trạng thái giáo viên (npm test, nhanh): đúng biểu cảm theo sự kiện, đúng giọng theo người, chuyển tư thế không hụt hình, tôn trọng giảm chuyển động.
// Đo ảnh/khung thật trên trình duyệt: teacher-states-shots.mjs + scripts/teach/motion_jump.py (workflow teacher-states). Spec: docs/specs/teacher-motion.md
import { createRequire } from 'node:module'; import fs from 'node:fs'; import vm from 'node:vm';
const require = createRequire(import.meta.url), { JSDOM } = require('jsdom');
const errs = [], read = f => fs.readFileSync(f, 'utf8'), reg = JSON.parse(read('web/teach/characters.json'));
const box = { self: {} }; box.self = box; vm.runInNewContext(read('web/js/characters.js'), box); const C = box.Chars;

// 1) Khung bắt đầu clip = khung ảnh tĩnh trong registry (lệch → ảnh→clip nhảy tay)
for (const w of C.ids) for (const p of C.poses) {
  const f = reg.people[w].clips[p].still_frame, at = C.stillAt(w, p);
  if (Math.abs(at * 24 - f) > 0.01) errs.push(`Chars.stillAt(${w},${p}) = khung ${at * 24}, registry still_frame ${f}`);
}
// 2) Sự kiện → tư thế: khen khi đúng, động viên khi sai, không ăn mừng khi điểm thấp, không cau mày lúc nhờ nhớ lại
const GOOD = ['cheer', 'happy', 'laugh'], KIND = ['concern', 'encourage', 'empathy'];
const want = [['correct', GOOD], ['replyOk', GOOD], ['wrong', KIND], ['replyFix', KIND], ['retry', KIND], ['think', ['thinking']], ['recall', ['listen', 'talk', 'encourage']]];
for (const [e, ok] of want) if (!ok.includes(C.forEvent(e))) errs.push(`sự kiện ${e} → ${C.forEvent(e)}, cần một trong ${ok}`);
if (C.forEvent('done', 100) !== 'cheer' || C.forEvent('done', 80) !== 'cheer') errs.push('kết bài điểm cao phải cheer');
if (!KIND.includes(C.forEvent('done', 40)) || !KIND.includes(C.forEvent('done', 79))) errs.push(`kết bài điểm thấp không được ăn mừng: ${C.forEvent('done', 40)}`);
if (C.forEvent('không-có') !== 'talk') errs.push('sự kiện lạ phải về talk');
// 3) Màn phản hồi chỉ lấy tư thế qua bảng chung; kết bài dùng đúng giáo viên của bài
const FILES = ['web/js/lesson/ui.js', 'web/js/speak/app.js', 'web/js/call.js'];
const BAD = [[/\.pose\(\s*['"]/, 'pose(chữ cứng)'], [/\b(?:ok|pass|good)\s*\?\s*['"](?:cheer|happy)['"]/, "đúng ? 'cheer' cứng"], [/accuracy\s*>=\s*\d+\s*\?\s*['"]cheer/, 'kết bài cứng'], [/react\(\s*(?!Chars\.forEvent)[^)]*\?\s*['"]/, 'react(chữ cứng)'], [/VOICE\(\s*['"]/, 'giọng cứng theo tên']];
for (const f of FILES) read(f).split('\n').forEach((l, i) => { for (const [re, why] of BAD) if (re.test(l)) errs.push(`${f}:${i + 1}: ${why} – dùng Chars.forEvent / giọng theo người đang nói`); });
// 4) Giọng: Ama nữ, Carlos nam (registry + Chars), mọi lời giáo viên trên màn có giọng của đúng người
const G = { ama: /^[ab]f_/, carlos: /^[ab]m_/ };
for (const w of C.ids) { const v = reg.people[w].voice; if (!G[w].test(C.voice(w)) || !G[w].test(v.app) || !G[w].test(v.video)) errs.push(`giọng ${w} sai giới: Chars ${C.voice(w)}, registry ${v.app}/${v.video}`); }
for (const f of ['web/js/lesson/ui.js', 'web/js/call.js']) read(f).split('\n').forEach((l, i) => { for (const m of l.matchAll(/\b(?:T|tch|teacher)\.say\(/g)) if (!/voice/.test(l.slice(m.index, m.index + 200))) errs.push(`${f}:${i + 1}: lời giáo viên không truyền voice`); });
// 5) Hoạt ảnh chỗ giáo viên chỉ chạy khi không xin giảm chuyển động
const slot = read('web/js/teacher-slot.js'), css = slot.slice(slot.indexOf('const CSS = `'), slot.indexOf('`;', slot.indexOf('const CSS = `')));
for (const l of css.split('\n')) if (/animation:/.test(l) && !/@media \(prefers-reduced-motion:no-preference\)/.test(l)) errs.push(`teacher-slot: animation ngoài @media no-preference: ${l.slice(0, 80)}`);
if (!/prefers-reduced-motion: reduce/.test(read('web/js/teacher-live.js'))) errs.push('teacher-live: mất nhánh giảm chuyển động');

// 6) Chạy thật trong jsdom: đổi tư thế không hụt hình (chờ giải mã), lỗi ảnh giữ người đang đứng, giảm chuyển động đổi ngay, tăng tư thế không để sót lớp
async function rig(reduce) {
  const dom = new JSDOM('<!doctype html><body><div id="t"></div></body>', { url: 'https://lk.test/app/', runScripts: 'outside-only' }), w = dom.window, D = w.document;
  w.matchMedia = q => ({ matches: reduce && /reduce/.test(q), addEventListener() {} }); w.localStorage.setItem('lk.lipsync', '0');
  w.requestAnimationFrame = () => 1; w.cancelAnimationFrame = () => {};
  w.HTMLCanvasElement.prototype.getContext = () => null;
  const gate = []; w.HTMLImageElement.prototype.decode = () => new Promise((ok, no) => gate.push({ ok, no }));
  for (const f of ['characters', 'lesson/teacher']) w.eval(read(`web/js/${f}.js`));
  const t = w.LessonTeacher.mount(D.getElementById('t'), 'ama', { lip: false }), r = D.querySelector('.tch-rig');
  return { t, r, gate, w };
}
const wait = ms => new Promise(r => setTimeout(r, ms));
{ const { t, r, gate } = await rig(false);
  t.pose('concern'); const s = r.querySelector('.tch-still'), p = r.querySelector('.tch-poster');
  if (!s || !r.classList.contains('posed')) errs.push('pose: phải có .tch-still + .posed ngay');
  if (s.style.opacity !== '0') errs.push('pose: ảnh chưa giải mã không được hiện');
  if (p.style.visibility !== 'visible') errs.push('pose: chờ giải mã mà người đang đứng bị ẩn = hụt hình');
  gate[0].ok(); await wait(5);
  if (s.style.opacity !== '1' || !/opacity/.test(s.style.transition)) errs.push('pose: phải mờ chéo khi hiện');
  if (p.style.visibility !== 'visible') errs.push('pose: đang mờ chéo phải giữ lớp dưới');
  await wait(220); if (p.style.visibility) errs.push('pose: mờ xong phải trả lớp dưới');
  t.pose('cheer'); gate[1].ok(); await wait(5);
  if (r.querySelectorAll('.tch-still').length !== 1) errs.push('đổi tư thế: chỉ một .tch-still');
  t.pose(null); if (r.querySelector('.tch-still') || r.classList.contains('posed')) errs.push('pose(null): phải trả người sống ngay');
  await wait(260); if (r.querySelector('.tch-out')) errs.push('pose(null): lớp mờ ra phải được dọn');
  t.pose('wave'); t.pose(null); gate[2].ok(); await wait(5); if (r.querySelector('.tch-still') || p.style.visibility) errs.push('pose(null) trước khi giải mã xong: ảnh cũ không được hiện lại');
  t.pose('happy'); gate[3].no(new Error('x')); await wait(5); if (r.querySelector('.tch-still') || r.classList.contains('posed')) errs.push('ảnh lỗi: phải giữ người đang đứng');
  t.destroy(); }
{ const { t, r, gate } = await rig(true);
  t.pose('concern'); gate[0].ok(); await wait(5); const s = r.querySelector('.tch-still');
  if (s.style.transition !== 'none' || s.style.opacity !== '1') errs.push('giảm chuyển động: đổi tư thế không được có mờ chéo');
  t.pose(null); if (r.querySelector('.tch-out')) errs.push('giảm chuyển động: gỡ ảnh ngay');
  if (r.querySelector('video,canvas')) errs.push('giảm chuyển động: không chạy vòng clip');
  t.destroy(); }
{ const b2 = { self: {}, Chars: C, LipSync: {}, LipMouth: { mix: () => ({}), shape: () => ({}) } }; b2.self = b2; // mặt vẽ giảm chuyển động: không nghiêng/gật
  const dom = new JSDOM('', { runScripts: 'outside-only' }), w = dom.window; for (const f of ['characters', 'call/lipsync', 'call/mouths', 'call/face']) w.eval(read(`web/js/${f}.js`));
  const m = w.LipFace.machine('ama', { dur: 5, seed: 3, calm: true, emo: 'cheer' }); for (const t of [0.5, 1.7, 3.3]) { const s = m.at(t); if (s.tilt || s.nod) errs.push(`mặt vẽ calm vẫn nghiêng/gật: ${s.tilt}/${s.nod}`); } }

if (errs.length) { console.error('✗ teacher-states:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log(`✓ teacher-states: ${C.ids.length} người × ${C.poses.length} tư thế đúng khung ảnh tĩnh, sự kiện → tư thế đúng ngữ cảnh, giọng đúng giới, đổi tư thế không hụt hình, giảm chuyển động`);
process.exit(0);
