#!/usr/bin/env node
// CLS khung app (mqa #/home 360 đỏ 07/11: 0,139 > 0,1): (1) toast không đổi `bottom` theo body.bare (gỡ 'bare' lúc đổi màn làm toast nhảy 56 px);
// (2) lượt đóng băng của pill chuỗi (điền sau khi nạp dữ liệu) là huy hiệu nổi, không làm hàng chỉ số giãn sang trái (min-width thì ép ô tra từ < 44 px – tap<44). Đo thật: mobile-qa (CLS ≤ 0,1) trên CI.
import fs from 'node:fs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } };
const css = fs.readFileSync('web/css/style.css', 'utf8');
ok(!/body:not\(\.bare\)\s+\.toast\s*\{[^}]*bottom/.test(css), 'toast: `bottom` KHÔNG được phụ thuộc body:not(.bare) (đổi theo lúc gỡ bare = dịch 56 px)');
ok(/@media \(max-width: 1023px\)\s*\{\s*\.toast\s*\{\s*bottom:\s*calc\(84px/.test(css), 'toast ≤ 1023 px: bottom cố định 84 px (né thanh điều hướng dưới)');
ok(/\.top-stats \.pill\.fire \.pill-sub\s*\{[^}]*position:\s*absolute/.test(css), 'thanh trên: .pill-sub (đóng băng) là huy hiệu absolute');
ok(!/\.top-stats #streakPill\s*\{[^}]*min-width:/.test(css), 'không min-width trên #streakPill (ép ô tra từ < 44 px)');
if (bad) process.exit(1); console.log('✓ cls-chrome: toast không đổi bottom theo bare, huy hiệu đóng băng nổi (CLS khung app)');
