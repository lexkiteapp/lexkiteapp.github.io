// 🔁 Vòng vẽ mặt vẽ (web/js/lesson/teacher.js face()) – bắt "0 fps" NGAY trong npm test, không đợi call-qa (3/11: chú thích nuốt
// `raf = requestAnimationFrame(frame)` → vòng chết sau khung đầu). jsdom + canvas/ảnh/rAF giả: chạy N khung, mỗi khung phải xin rAF lại,
// canvas phải được vẽ (đầu trơn + lớp mặt), đổi cỡ (ResizeObserver) xong vẫn vẽ lại. Dùng: node scripts/test/teacher-loop.mjs
import { createRequire } from 'node:module'; import fs from 'node:fs'; import assert from 'node:assert/strict';
const require = createRequire(import.meta.url), { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><body><div id="t"></div></body>', { url: 'https://lexkite.test/app/', runScripts: 'outside-only', pretendToBeVisual: false });
const w = dom.window, D = w.document;
let q = [], now = 0, ops = 0, ro = [];
w.requestAnimationFrame = f => { q.push(f); return q.length; }; w.cancelAnimationFrame = () => {};
w.localStorage.setItem('lk.lipsync', '1');
w.Path2D = class { addPath() {} ellipse() {} rect() {} moveTo() {} lineTo() {} closePath() {} arc() {} bezierCurveTo() {} quadraticCurveTo() {} };
const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : (typeof k === 'string' ? (() => { ops++; }) : undefined), set: (o, k, v) => { o[k] = v; return true; } });
w.HTMLCanvasElement.prototype.getContext = function () { return ctx; };
w.Image = class { set src(v) { this._s = v; setTimeout(() => this.onload && this.onload(), 0); } get src() { return this._s; } };
w.ResizeObserver = class { constructor(cb) { ro.push(cb); } observe() {} disconnect() {} };
w.matchMedia = () => ({ matches: false, addEventListener() {} });
// mặt vẽ đã nạp sẵn → lipLoad() chèn <script> thì báo onload ngay (jsdom không tải)
const ap = w.HTMLHeadElement.prototype.appendChild; w.HTMLHeadElement.prototype.appendChild = function (n) { if (n.tagName === 'SCRIPT') { setTimeout(() => n.onload && n.onload(), 0); return n; } return ap.call(this, n); };
for (const f of ['characters', 'call/lipsync', 'call/mouths', 'call/face', 'call/paint', 'lesson/teacher']) w.eval(fs.readFileSync(`web/js/${f}.js`, 'utf8'));
assert.ok(w.LessonTeacher && w.LipFace && w.LipPaint, 'nạp module');
const t = w.LessonTeacher.mount(D.getElementById('t'), 'ama', { lip: true });
for (let i = 0; i < 50 && !q.length; i++) await new Promise(r => setTimeout(r, 5));
assert.ok(q.length, 'mặt vẽ: khung đầu được xin (rAF) sau khi ảnh đầu trơn tải');
const N = 60; let lost = 0;
for (let i = 0; i < N; i++) { const f = q; q = []; now += 16.7; f.forEach(cb => cb(now)); if (!q.length) { lost = i + 1; break; } if (i === 20) ro.forEach(cb => cb([])); }
const st = t.lip();
assert.equal(lost, 0, `vòng vẽ chết sau khung ${lost} (rAF không được xin lại)`);
assert.ok(st && st.frames >= N, `đếm khung ${st && st.frames} ≥ ${N}`);
assert.ok(st.draws >= 2 && ops > 0, `canvas vẽ (${st.draws} lần, ${ops} lệnh) – kể cả sau khi đổi cỡ`);
assert.ok(st.t0 > 0 || st.t0 === 0, 'stats.t0 có');
t.destroy && t.destroy();
console.log(`✓ teacher-loop: ${N} khung, rAF xin lại mỗi khung, canvas vẽ ${st.draws} lần (đổi cỡ ở khung 21 vẫn vẽ lại)`);
