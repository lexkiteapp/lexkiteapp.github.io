// 🎯 Chặn tái phát nợ Stitch trên màn app (DESIGN-SYSTEM §0, §5d, 04/11): không nhấp nháy, ô giáo viên không khung, Hôm nay chỉ 1 lối nhắc ôn. Chạy trong npm test.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const R = fileURLToPath(new URL('../../', import.meta.url)), rd = f => fs.readFileSync(R + f, 'utf8');
let fail = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} today-debt: ${m}`); if (!c) fail++; };
const walk = d => fs.readdirSync(R + d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const st = walk('web/js/st').filter(f => f.endsWith('.js'));
ok(st.length > 10, 'quét đủ màn Stitch (' + st.length + ' file)');
const pulse = st.filter(f => /animate-pulse/.test(rd(f)));
ok(!pulse.length, '§0 không nhấp nháy: web/js/st không còn animate-pulse' + (pulse.length ? ' → ' + pulse.join(', ') : ''));
const dashed = st.filter(f => /<div[^<>]*border-dashed[^<>]*>\$\{d\.teacher/.test(rd(f)));
ok(!dashed.length, '§5d ô giáo viên không khung nét đứt' + (dashed.length ? ' → ' + dashed.join(', ') : ''));
ok(/<\/header><div class="px-4 py-4 /.test(rd('web/js/st/v2/today.js')), '§5d nội dung Hôm nay cách thanh trên 16 px, như Hôm nay người mới');
const ux = rd('web/js/ux1.js'), line = (ux.match(/const oneReview = [^\n]+/) || [''])[0];
ok(/if \(!fresh\) oneReview\(d\);/.test(ux) && !!line, 'home2 gọi quy tắc một lối nhắc ôn');
const oneReview = new Function(line + '; return oneReview;')();
const mk = items => ({ p: { items }, r: { due: 8 }, q: { dueN: 8 } });
{ const d = mk([{ href: '#/review', tag: 'Việc hiện tại' }]); oneReview(d); ok(d.r.due === 0 && d.q.dueN === 0, 'kế hoạch còn việc ôn → chỉ kế hoạch nhắc'); }
{ const d = mk([{ href: '#/review', tag: '✓' }, { href: '#/read', tag: '5' }]); oneReview(d); ok(d.r.due === 8 && d.q.dueN === 8, 'việc ôn đã xong mà còn thẻ → khối phai dần vẫn nhắc'); }
{ const d = mk([]); oneReview(d); ok(d.r.due === 8, 'kế hoạch rỗng → khối phai dần vẫn nhắc'); }
const b = JSON.parse(rd('brand/stitch/v2/bind/today.json')), hrefs = JSON.stringify(b.attr);
ok(/'#\/review'/.test(hrefs) && /d\.q\.dueHref/.test(hrefs), 'không mất lối vào: ô đầu trang và ô Từ cần ôn vẫn có liên kết');
if (fail) { console.error(`✗ today-debt: ${fail} lỗi`); process.exit(1); }
console.log('✓ today-debt: đạt');
