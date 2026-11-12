#!/usr/bin/env node
// Mẫu Stitch Hôm nay (today / today-new / today-desk) đã SẠCH lỗi tương phản (07/11, nợ giảm thật): known-issues.json không còn mục today*, mẫu không quay lại
// các kiểu lỗi cũ (cột ngày mờ bằng opacity-40 làm chữ 1,8:1; nhãn đỏ/hồng 500 chữ trắng 3,7:1; chữ phụ #8C7A6B 3,9:1; nút icon không aria-label), bind không còn vá đè.
// Phép đo thật (render + axe) chạy ở stitch-render.mjs trong Stitch diff; test này khoá cho máy không có trình duyệt.
import fs from 'node:fs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } };
const V = 'brand/stitch/v2/', K = JSON.parse(fs.readFileSync(V + 'known-issues.json', 'utf8'));
ok(!K.issues.some(i => /^today/.test(i)), 'known-issues.json không được có mục today*/today-new*/today-desk* (mẫu đã sạch)');
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
ok(cr('#ffffff', '#DC2626') >= 4.5 && cr('#ffffff', '#E11D48') >= 4.5, 'huy hiệu chữ trắng trên đỏ/hồng-600 ≥ 4,5:1');
for (const f of ['today-light', 'today-dark', 'today-new-light', 'today-new-dark', 'today-desk-light', 'today-desk-dark']) {
  const s = fs.readFileSync(`${V}${f}.html`, 'utf8');
  ok(!/opacity-40">\s*<span[^>]*>[A-Z]<\/span>/.test(s), `${f}: cột ngày mờ opacity-40 làm chữ nhãn < 4,5:1`);
  ok(!/bg-(red|rose)-500 text-white/.test(s), `${f}: huy hiệu bg-red/rose-500 chữ trắng 3,7:1 (dùng -600)`);
  ok(!/text-\[#8C7A6B\]/.test(s), `${f}: chữ phụ #8C7A6B (3,9:1) – dùng #76665A`);
  ok(!/<button class="w-16 h-16/.test(s), `${f}: nút chỉ-icon w-16 h-16 thiếu aria-label`);
}
for (const b of ['today', 'today-desk', 'today-rail']) { const s = fs.readFileSync(`${V}bind/${b}.json`, 'utf8'); ok(!/lt:text-\[#8C7A6B\]|"opacity-40"/.test(s), `bind/${b}.json còn vá đè lỗi mẫu đã sửa ở nguồn`); }
if (bad) process.exit(1); console.log('✓ stitch-today-contrast: mẫu Hôm nay sạch lỗi tương phản, không còn vá đè trong bind');
