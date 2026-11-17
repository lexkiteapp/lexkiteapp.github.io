// Test budget-comment: markdown cảnh báo ngân sách (thuần).
import { render, MARK } from '../ci/budget-comment.mjs';
import { lowHeadroom } from '../lib/headroom.mjs';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
ok(render([]) === null, 'không mục vàng → không comment');
const K = 1024, low = lowHeadroom([{ name: 'khung', used: 380 * K, cap: 374 * K + 9 * K }, { name: 'ổn', used: 100 * K, cap: 200 * K }, { name: 'gần', used: 97 * K, cap: 100 * K }]);
const md = render(low);
ok(low.length === 2 && md.includes(MARK) && md.includes('khung') && !md.includes('**ổn**'), 'chỉ liệt kê mục dùng ≥ 95 %');
ok(md.includes('dưới mục tiêu 3 %'), 'đánh dấu mục dưới mục tiêu 3 %');
if (bad) process.exit(1);
