// Motion v2 contract (docs/VIDEO-TEACH2D.md "Motion v2"): caption pop + word bounce + drifting canvas present, timings inside the research spec
// (pop 120 ms in / 80 ms settle, bounce 140 ms, emphasis <= +12 %, drift <= 3 % of the frame, loop 4-12 s). JSX is not importable in node: constants are read from the source.
import fs from 'node:fs';
const src = fs.readFileSync('scripts/video/remotion/src/teach/TeachShort.jsx', 'utf8'); let bad = 0;
const ok = (c, m) => { if (!c) { console.error('✗ ' + m); bad++; } };
const num = re => { const m = src.match(re); return m ? Number(m[1]) : NaN; };
ok(/export const CAP_POP\b/.test(src) && /capScale/.test(src) && /wordBump/.test(src), 'caption pop + word bounce exports');
ok(num(/CAP_POP = \{ in: ([\d.]+)/) <= 0.15, 'pop-in <= 150 ms');
ok(num(/settle: ([\d.]+)/) <= 0.12, 'settle <= 120 ms');
ok(num(/bounce: ([\d.]+)/) <= 0.18, 'bounce <= 180 ms');
ok(num(/bump: ([\d.]+)/) <= 0.12, 'emphasis <= +12 %');
ok(num(/DRIFT = \{ amp: ([\d.]+)/) <= 0.03, 'canvas drift <= 3 %');
const per = num(/period: ([\d.]+) \}/); ok(per >= 4 && per <= 12, 'drift loop period 4-12 s');
ok(/t=\{t\}/.test(src), 'Canvas receives time');
if (bad) process.exit(1); console.log('✓ teach2d motion v2 contract');
