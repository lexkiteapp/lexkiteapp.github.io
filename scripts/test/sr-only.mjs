// Mọi định nghĩa `.sr-only` (chữ ẩn cho trình đọc màn hình) phải có overflow:hidden: thiếu thì chữ nowrap thò khỏi hộp 1 px và kéo rộng cả trang
// (lỗi 17/11: nút ⋯ "Thêm/More" ở mép phải đầu trang admin → scrollWidth 374>360, 401>390 trên điện thoại). Quét web/css/*.css.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const dir = fileURLToPath(new URL('../../web/css/', import.meta.url)), bad = []; let n = 0;
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.css'))) {
  const css = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const m of css.matchAll(/(^|[},\s])\.sr-only\s*\{([^}]*)\}/g)) {
    if (!/clip\s*:|width\s*:\s*1px/.test(m[2])) continue; // luật phụ (vd Tailwind tách riêng chỉ `position:absolute`) không phải định nghĩa đầy đủ
    n++; if (!/overflow\s*:\s*hidden/.test(m[2])) bad.push(`${f}: .sr-only thiếu overflow:hidden → ${m[2].trim().slice(0, 90)}`);
  }
}
if (!n) bad.push('không thấy định nghĩa .sr-only nào – regex hỏng?');
if (bad.length) { console.log('✗ sr-only:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log(`✓ sr-only: ${n} định nghĩa đều có overflow:hidden`);
