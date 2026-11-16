// Hàng sửa quality-sweep (scripts/quality/fix-queue.mjs): nhóm + khử trùng + chỉ đóng khi nguồn chạy đủ. Chạy: node scripts/test/qs-fix-queue.mjs
import { groups, plan, body, marker } from '../quality/fix-queue.mjs';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const items = {
  web: [{ type: 'axe-serious', sev: 'high', key: 'aria-progressbar-name .ret-bar', msg: 'x', where: ['#/streak m-dark', '#/streak d-light'], langs: ['vi'] },
    { type: 'console', sev: 'critical', key: 'TypeError: a is undefined', msg: 'y', where: ['#/lesson/1 m-light'], langs: ['vi'] }],
  addon: [{ lang: 'vi', check: 'popup: tra nhanh "house"', detail: '' }, { lang: 'en', check: 'popup: tra nhanh "house"', detail: '' }, { lang: 'ar', check: 'popup: tra nhanh "house"', detail: '' }],
  heavy: [], lighthouse: [],
};
const gs = groups(items);
ok(gs.length === 3, `gộp: add-on 3 ngôn ngữ = 1 nhóm (được ${gs.length})`);
ok(gs[0].src === 'addon' && gs[0].score === 4 * 12, 'điểm = mức × độ phủ, sắp giảm dần');
ok(gs.find(g => g.type === 'console').area === 'learn-flow', 'route #/lesson → khu vực learn-flow (chủ: learn-flow-nav)');
ok(gs.find(g => g.src === 'addon').area === 'addon' && gs.find(g => /ret-bar/.test(g.title)).area === 'a11y', 'khu vực add-on / a11y');
ok(groups(items).map(g => g.key).join() === gs.map(g => g.key).join(), 'khoá ổn định giữa các đêm');
const b = body(gs[0], 'run', '2026-11-01');
ok(b.includes(marker(gs[0].key)) && /qs-fix:src=addon/.test(b), 'thân issue có dấu khoá + nguồn');
const old = { number: 9, body: body({ ...gs[1], key: 'gone000000ab', src: 'web' }, 'r', '2026-10-30') }, oldAddon = { number: 10, body: body({ ...gs[0], key: 'gone000000cd', src: 'addon' }, 'r', '2026-10-30') };
const cur = { number: 11, body: body(gs[0], 'r', '2026-10-31') };
let p = plan(gs, [old, oldAddon, cur], { web: true, addon: false });
ok(p.update.length === 1 && p.update[0].issue.number === 11, 'nhóm đã có issue → cập nhật, không mở trùng');
ok(p.create.length === 2, 'nhóm mới → mở');
ok(p.close.map(i => i.number).join() === '9', 'đóng mục hết lỗi CHỈ khi nguồn chạy đủ (add-on lỗi job → giữ #10)');
p = plan(gs, [], {}, { maxNew: 1 });
ok(p.create.length === 1 && p.deferred === 2, 'trần mở mới mỗi đêm (điểm cao trước), phần còn lại hoãn');
console.log(fails ? `✗ qs-fix-queue: ${fails} lỗi` : '✓ qs-fix-queue: nhóm, khử trùng, đóng an toàn, trần mở mới');
if (fails) process.exit(1);   // không exit(0): được qa-fill.mjs import nối chuỗi
