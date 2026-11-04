// "Ôn thẻ → thêm lượt AI" (functions/api/aiearn.js): quy tắc cấp lượt, trần/ngày, idempotent, chỉ dùng bằng chứng máy chủ.
import fs from 'node:fs'; import assert from 'node:assert/strict';
import { earnable, EARN } from '../../functions/api/aiearn.js';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
ok(earnable(9, 0, 'ai').grant === 0, 'chưa đủ 10 thẻ → 0');
ok(earnable(10, 0, 'ai').grant === EARN.ai.grant && earnable(10, 0, 'ai').newly === 1, '10 thẻ → 1 lần');
ok(earnable(25, 1, 'ai').newly === 1 && earnable(25, 2, 'ai').newly === 0, 'nhận từng mức, không trùng');
ok(earnable(999, 0, 'ai').total === EARN.maxPerDay && earnable(999, 3, 'ai').grant === 0, 'trần/ngày');
ok(earnable(30, 0, 'chat').grant === EARN.maxPerDay * EARN.chat.grant, 'chat theo mức riêng');
ok(earnable(50, 0, 'sync').grant === 0 && earnable(-5, 0, 'ai').grant === 0 && earnable(NaN, 0, 'ai').grant === 0, 'tính năng lạ / số xấu');
const src = fs.readFileSync('functions/api/aiearn.js', 'utf8');
ok(/error: 'auth'/.test(src) && /stats\.days\[day\]/.test(src), 'cần đăng nhập + đọc bằng chứng từ meta máy chủ, không tin số máy khách gửi');
ok(EARN.maxPerDay * EARN.ai.grant <= 6, 'trần lượt thêm/ngày nhỏ hơn mức gói free (30)');
console.log(`aiearn: ${n} kiểm tra PASS`);
