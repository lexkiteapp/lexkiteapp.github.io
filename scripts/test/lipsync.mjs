// LipSync (web/js/call/lipsync.js): bảng âm vị → miệng, chống nháy, trộn hình, con trỏ live nhân quả.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module'; import fs from 'node:fs';
const LS = createRequire(import.meta.url)('../../web/js/call/lipsync.js');
LS.setDict(fs.readFileSync('content/lexicon/cmudict-subset.txt', 'utf8'));
const v = t => LS.units(t).map(u => u.v).join('');
assert.equal(v('mom'), 'ADA'); assert.equal(v('food')[0], 'G'); assert.ok(v('you').endsWith('F')); assert.ok(v('let').startsWith('H'));
const c = LS.fromText('Hello, how are you today?', 2.2);
assert.equal(c[0].value, 'X'); assert.equal(c[c.length - 1].value, 'X');
assert.ok(c.every(x => x.end - x.start >= LS.MIN_HOLD - 1e-9), 'không mảnh < MIN_HOLD');
assert.ok(c.every((x, i) => !i || x.value !== c[i - 1].value), 'không 2 hình trùng liền kề');
assert.ok(Math.abs(c[c.length - 1].end - 2.2) < 1e-6);
const s = LS.stateAt([{ start: 0, end: 1, value: 'X' }, { start: 1, end: 2, value: 'D' }], 1 - LS.LEAD + LS.BLEND / 2);
assert.equal(s.a, 'X'); assert.equal(s.b, 'D'); assert.ok(Math.abs(s.k - 0.5) < 1e-6);
const L = LS.live('Good morning', { dur: 1 }); let t = 0;
for (; t < 0.2; t += 1 / 60) L.tick(t, false, 1 / 60); assert.equal(L.tick(t, false, 1 / 60), 'X', 'im → X');
for (; t < 0.9; t += 1 / 60) L.tick(t, true, 1 / 60); assert.ok(L.cues.length > 3, 'có tiếng → miệng chạy');
assert.ok(L.cues.slice(1, -1).every(x => x.end - x.start >= LS.MIN_HOLD - 1e-9));
const vd = LS.vad({ floor: 0.01 }); assert.equal(vd(0.05), true); assert.equal(vd(0.005), true, 'trễ tắt'); for (let i = 0; i < 6; i++) vd(0.005); assert.equal(vd(0.005), false);
// align: mở miệng sớm (Rhubarb ở âm hơi H) → neo vào lúc tiếng bắt đầu; khép trễ → neo vào lúc tiếng tắt
const env = Array.from({ length: 100 }, (_, i) => (i >= 30 && i < 70 ? 0.5 : 0.001));
const al = LS.align([{ start: 0, end: 0.22, value: 'X' }, { start: 0.22, end: 0.5, value: 'C' }, { start: 0.5, end: 0.8, value: 'B' }, { start: 0.8, end: 1, value: 'X' }], env);
assert.ok(Math.abs(al[1].start - 0.3) < 1e-9 && al[0].end === al[1].start, 'mở đúng lúc có tiếng'); assert.ok(Math.abs(al[3].start - 0.7) < 1e-9, 'khép lúc tiếng tắt');
assert.ok(Math.abs(LS.align([{ start: 0, end: 0.27, value: 'X' }, { start: 0.27, end: 1, value: 'C' }], env, { words: [{ start: 0.28, end: 0.6 }] })[1].start - 0.3) < 1e-9);
const env2 = Array.from({ length: 100 }, (_, i) => (i >= 10 && i < 40) || (i >= 60 && i < 90) ? 0.5 : 0.001);
const al2 = LS.smooth(LS.align([{ start: 0, end: 0.1, value: 'X' }, { start: 0.1, end: 0.45, value: 'C' }, { start: 0.45, end: 0.9, value: 'B' }, { start: 0.9, end: 1, value: 'X' }], env2));
assert.ok(al2.some(c => c.value === 'X' && Math.abs(c.start - 0.4) < 1e-9 && Math.abs(c.end - 0.6) < 1e-9), 'chỗ ngắt im → miệng nghỉ');
// LipMouth: đủ 9 hình vẽ cho cả 2 giáo viên, trộn bộ số
const LM = createRequire(import.meta.url)('../../web/js/call/mouths.js');
assert.deepEqual(LM.SHAPES, LS.SHAPES, 'cùng bộ 9 hình');
for (const w of ['ama', 'carlos']) for (const k of LM.SHAPES) { const g = LM.svg(w, k, 'm' + k); assert.ok(/^<g class="lk-mouth">.*<\/g>$/.test(g) && !/NaN|undefined/.test(g), w + k); }
assert.equal(LM.mix('X', 'D', 0.5).d, LM.SHAPE.D.d / 2); assert.ok(!/NaN/.test(LM.svg('ama', LM.mix('C', 'F', 0.3))));
console.log('lipsync ok');
// Kokoro âm vị (IPA misaki) → cues: M/B/P → A, khoảng trắng ngắn nối, dấu câu → X, không mảnh < MIN_HOLD
const ph = [['h', 0.1, 0.16], ['ˈ', 0.16, 0.17], ['I', 0.17, 0.32], ['!', 0.32, 0.5], [' ', 0.5, 0.52], ['m', 0.52, 0.6], ['ɑ', 0.6, 0.75], ['m', 0.75, 0.82], [' ', 0.82, 0.85], ['f', 0.85, 0.93], ['u', 0.93, 1.1], ['d', 1.1, 1.13]].map(([p, s, e]) => ({ p, s, e }));
const kc = LS.fromPhones(ph, 1.3);
assert.equal(kc.map(c => c.value).join(''), 'XBDXADAGFX', 'Kokoro → hình: ' + kc.map(c => c.value).join(''));
assert.ok(kc.every(x => x.end - x.start >= LS.MIN_HOLD - 1e-9) && kc.every((x, i) => !i || x.start === kc[i - 1].end));
// lead: M/B/P khép sớm hơn (LEADS.A) nhưng hình trước vẫn ≥ MIN_HOLD
const ld = LS.lead(kc), ia = kc.findIndex(c => c.value === 'A');
assert.ok(ld[ia].start < kc[ia].start && ld[ia - 1].end - ld[ia - 1].start >= LS.MIN_HOLD - 1e-9, 'A đi trước');
assert.ok(ld.every(x => x.end - x.start >= LS.MIN_HOLD - 1e-9));
// gain: tiếng nhỏ → mở hẹp, tiếng to → mở to, luôn trong [.45, 1.15]
const genv = Array.from({ length: 200 }, (_, i) => (i < 100 ? 0.5 : 0.08)), G = LS.gain(genv);
assert.ok(G(0.8) > G(1.8) + 0.2 && G(0.8) <= 1.15 && G(1.8) >= 0.45, `gain ${G(0.8)} ${G(1.8)}`);
// LipFace: lớp mặt đủ cho 2 giáo viên, máy biểu cảm có chớp mắt, cùng hạt giống → cùng kết quả
const LF = createRequire(import.meta.url)('../../web/js/call/face.js');
for (const w of ['ama', 'carlos']) { const M = LF.machine(w, { cues: kc, env: genv, dur: 2, emo: 'happy', seed: 3, text: 'Hi mom?' });
  const g = LF.svg(w, M.at(0.6), 't'); assert.ok(/^<g class="lk-face">.*<\/g>$/.test(g) && !/NaN|undefined/.test(g), w);
  assert.ok(M.blinks.length >= 1); assert.deepEqual(M.at(0.95), LF.machine(w, { cues: kc, env: genv, dur: 2, emo: 'happy', seed: 3, text: 'Hi mom?' }).at(0.95), 'tất định');
  assert.ok(M.at(M.blinks[0] + 0.07).blink > 0.9 && M.at(M.blinks[0] + 0.2).blink === 0, 'chớp 150 ms'); }
console.log('lipsync face ok');
