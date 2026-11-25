// Test budget-comment: markdown cảnh báo ngân sách (thuần).
import { render, MARK } from '../ci/budget-comment.mjs';
import { lowHeadroom, TOTALJS_MAX_FREE_B } from '../lib/headroom.mjs';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
ok(render([]) === null, 'không mục vàng → không comment');
const K = 1024, low = lowHeadroom([{ name: 'khung', used: 380 * K, cap: 374 * K + 9 * K }, { name: 'ổn', used: 100 * K, cap: 200 * K }, { name: 'gần', used: 97 * K, cap: 100 * K }]);
const md = render(low);
ok(low.length === 2 && md.includes(MARK) && md.includes('khung') && !md.includes('**ổn**'), 'chỉ liệt kê mục dùng ≥ 95 %');
ok(md.includes('dưới mục tiêu 3 %'), 'đánh dấu mục dưới mục tiêu 3 %');
// totalJs: size-budget cấm trần cách thực tế ≥ 200 KB → mục tiêu = min(3 %, 150 KB), không đòi 3 % (≈ 240 KB) không thể đạt
{ const tj = (free) => lowHeadroom([{ name: 'totalJs', used: 7_800_000, cap: 7_800_000 + free, maxFree: TOTALJS_MAX_FREE_B }]);
  ok(tj(170 * K).length === 0, 'totalJs còn 170 KB (2,1 %) → không cảnh báo (đạt min(3 %, 150 KB))');
  ok(tj(100 * K).length === 1, 'totalJs còn 100 KB → cảnh báo');
  ok(lowHeadroom([{ name: 'x', used: 7_800_000, cap: 7_800_000 + 170 * K }]).length === 1, 'mục không có maxFree vẫn dùng 5 %'); }
if (bad) process.exit(1);
