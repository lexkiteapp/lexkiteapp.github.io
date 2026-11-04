// 🕺 Rig thân tay (web/js/call/rig.js, docs/specs/teacher-motion.md): cổng tĩnh. Trình duyệt thật + số đo: scripts/test/chars-lively-shots.mjs.
import fs from 'node:fs';
const ok = (c, m) => { if (!c) { console.error('✗ ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };
const R = fs.readFileSync('web/js/call/rig.js', 'utf8'), T = fs.readFileSync('web/js/lesson/teacher.js', 'utf8');
ok(!/kling|\.mp4|\.riv/i.test(R.replace(/\/\*[\s\S]*?\*\//g, '')), 'rig không cần tài sản mới: chỉ ảnh tĩnh registry');
ok(/if \(calm \|\| saveData\(\) \|\| !g\.LipRig\) return/.test(T), 'giảm chuyển động / tiết kiệm dữ liệu → không chạy rig');
ok(/if \(stats\.low\) \{ BR\.destroy\(\)/.test(T), 'máy yếu (khung dài) → gỡ rig, về ảnh 2D');
ok(/'rig', 'cues'/.test(T) && !fs.readFileSync('web/app/index.html', 'utf8').includes('call/rig.js') && !fs.readFileSync('web/sw.js', 'utf8').includes('call/rig.js'), 'rig tải lười cùng mặt vẽ, không vào khung app');
const num = m => +(R.match(m) || [])[1];
ok(num(/beat \* ([\d.]+)/) <= .1, 'biên độ tay theo nhịp ≤ 0,1 rad (~6°)'); ok(num(/br = ([\d.]+) \*/) <= .01, 'thở ≤ 1 %');
for (const f of ['today-desk', 'pas-sit', 'pas-drill']) ok(!/border-dashed[^"]*"[^>]*>\$\{d\.teacher\}/.test(fs.readFileSync(`web/js/st/v2/${f}.js`, 'utf8')), `${f}: giáo viên không nằm trong khung nét đứt`);
