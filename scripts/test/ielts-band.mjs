// Cổng máy tính band IELTS: bảng quy đổi đơn điệu, làm tròn đúng quy tắc, JS trình duyệt = lib (docs/specs/ielts-band-calculator.md).
import fs from 'node:fs'; import vm from 'node:vm';
import { BAND_DATA, rawToBand, overall } from '../lib/ielts-band.mjs';
const bad = [], ok = (c, m) => { if (!c) bad.push(m); };
for (const k of ['listening', 'reading_academic', 'reading_general']) { const a = BAND_DATA[k]; ok(a.length >= 12, `${k}: thiếu mốc`); for (let i = 1; i < a.length; i++) ok(a[i][0] < a[i - 1][0] && a[i][1] < a[i - 1][1], `${k}[${i}]: không giảm dần`); ok(a[0][1] === 9, `${k}: không có band 9`); }
ok(rawToBand(BAND_DATA.listening, 40) === 9 && rawToBand(BAND_DATA.listening, 30) === 7 && rawToBand(BAND_DATA.listening, 0) === 0, 'rawToBand listening');
ok(rawToBand(BAND_DATA.reading_general, 40) === 9 && rawToBand(BAND_DATA.reading_general, 34) === 7, 'rawToBand general');
ok(rawToBand(BAND_DATA.listening, 99) === 9 && rawToBand(BAND_DATA.listening, -3) === 0 && rawToBand(BAND_DATA.listening, 'x') === 0, 'rawToBand biên');
ok(overall(6, 6, 6, 7) === 6.5 && overall(6, 6.5, 6, 6) === 6 && overall(6, 6, 6, 6.5) === 6 && overall(6.5, 6.5, 6.5, 6) === 6.5 && overall(6.5, 7, 7, 7) === 7 && overall(5.5, 6, 6, 6) === 6 && overall(9, 9, 9, 9) === 9, 'overall làm tròn');
// JS trình duyệt phải cho cùng kết quả
const dom = { forms: {}, out: { innerHTML: '', focus() {} } }, vals = {};
const f = { elements: new Proxy({}, { get: (_, n) => ({ get value() { return vals[n]; }, set value(v) { vals[n] = v; } }) }), addEventListener: (_, fn) => { dom.submit = fn; } };
const U = { tables: { listening: BAND_DATA.listening, reading_academic: BAND_DATA.reading_academic, reading_general: BAND_DATA.reading_general }, need: 'n', resultH: 'r', listenH: 'L', readH: 'R', writeH: 'W', speakH: 'S', approx: 'a', app: '/app/', openApp: 'o' };
const ctx = { document: { getElementById: id => (id === 'band-form' ? f : id === 'tool-data' ? { textContent: JSON.stringify(U) } : dom.out) }, localStorage: { getItem: () => null, setItem() {} }, JSON, Math, Number, Object, String };
vm.runInNewContext(fs.readFileSync('web/js/tools/ielts-band.js', 'utf8'), ctx);
for (const [l, r, w, s, t] of [[32, 30, 6.5, 7, 'a'], [26, 27, 6, 6, 'g'], [39, 40, 8.5, 9, 'a'], [10, 12, 4, 4.5, 'g']]) {
  Object.assign(vals, { l, r, w, s, type: t }); dom.submit({ preventDefault() {} });
  const bl = rawToBand(BAND_DATA.listening, l), br = rawToBand(BAND_DATA[t === 'g' ? 'reading_general' : 'reading_academic'], r), o = overall(bl, br, w, s);
  ok(dom.out.innerHTML.includes(`class="big" aria-live="polite">${o.toFixed(1)}<`), `JS ≠ lib cho ${[l, r, w, s, t]} (kỳ vọng ${o})`);
}
Object.assign(vals, { l: '', r: 5, w: 6, s: 6, type: 'a' }); dom.submit({ preventDefault() {} }); ok(dom.out.innerHTML.includes('role="alert"'), 'thiếu ô nhập → cảnh báo');
if (bad.length) { console.error('✗ ielts-band:\n' + bad.join('\n')); process.exit(1); }
console.log('✓ ielts-band: bảng quy đổi đơn điệu, làm tròn 0,5 đúng, JS trình duyệt = lib');
