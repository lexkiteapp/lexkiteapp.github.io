#!/usr/bin/env node
// CLS khung app (mqa #/home 360 đỏ 07/11: 0,139 > 0,1): (1) toast không đổi `bottom` theo body.bare (gỡ 'bare' lúc đổi màn làm toast nhảy 56 px);
// (2) pill chuỗi trên thanh trên chừa chỗ cho số + lượt đóng băng điền sau khi nạp dữ liệu (hàng chỉ số không giãn sang trái). Đo thật: mobile-qa (CLS ≤ 0,1) trên CI.
import fs from 'node:fs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } };
const css = fs.readFileSync('web/css/style.css', 'utf8');
ok(!/body:not\(\.bare\)\s+\.toast\s*\{[^}]*bottom/.test(css), 'toast: `bottom` KHÔNG được phụ thuộc body:not(.bare) (đổi theo lúc gỡ bare = dịch 56 px)');
ok(/@media \(max-width: 1023px\)\s*\{\s*\.toast\s*\{\s*bottom:\s*calc\(84px/.test(css), 'toast ≤ 1023 px: bottom cố định 84 px (né thanh điều hướng dưới)');
ok(/\.top-stats #streakPill\s*\{[^}]*min-width:/.test(css), 'thanh trên: #streakPill có min-width (chừa chỗ chuỗi + đóng băng điền sau)');
if (bad) process.exit(1); console.log('✓ cls-chrome: toast không đổi bottom theo bare, pill chuỗi chừa chỗ (CLS khung app)');
