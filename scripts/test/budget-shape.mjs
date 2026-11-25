// Khóa HÌNH DẠNG scripts/test/budget.json (25/11, gốc xung đột lặp lại: mỗi PR nâng ngân sách thêm 1 dòng `_cpackNoteN` ngay cạnh `cpackTotal` → hai PR cùng sửa 1 khối là dirty).
// Luật: tệp ngưỡng chỉ chứa SỐ (và danh sách), mỗi khóa một dòng, xếp theo chữ cái, không có khóa ghi chú `_…`; ghi chú lịch sử nằm ở scripts/test/budget.notes.json.
// PR chỉ đổi một ngưỡng → một dòng đổi, các PR đổi ngưỡng khác nhau không đụng nhau.
import fs from 'node:fs';
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.error('✗ ' + m); } };
const B = 'scripts/test/budget.json', raw = fs.readFileSync(B, 'utf8'), j = JSON.parse(raw), keys = Object.keys(j);
ok(!keys.some(k => k.startsWith('_')), `budget.json không chứa ghi chú (${keys.filter(k => k.startsWith('_')).join(', ')}) – ghi vào scripts/test/budget.notes.json`);
ok(keys.join() === [...keys].sort().join(), 'khóa của budget.json xếp theo chữ cái');
ok(JSON.stringify(j, null, 2) + '\n' === raw, 'budget.json định dạng JSON.stringify(…, null, 2) (size-budget --update ghi lại đúng dạng, không đổi cả khối)');
ok(!Object.values(j.routeGz || {}).some(v => typeof v !== 'number') && !Object.keys(j.routeGz || {}).some(k => k.startsWith('_')), 'routeGz chỉ chứa số theo gói');
const N = JSON.parse(fs.readFileSync('scripts/test/budget.notes.json', 'utf8'));
ok(Object.keys(N).every(k => k.startsWith('_') && typeof N[k] === 'string'), 'budget.notes.json: mọi khóa `_…` là chuỗi');
if (fail) process.exit(1);
console.log(`✓ budget-shape: budget.json ${keys.length} ngưỡng (một khóa/dòng, xếp chữ cái, không ghi chú), ${Object.keys(N).length} ghi chú ở budget.notes.json`);
