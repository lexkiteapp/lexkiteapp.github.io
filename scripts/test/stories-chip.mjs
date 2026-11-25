// Chip cấp độ Truyện & podcast (#/stories): trạng thái chọn phải đủ tương phản ở sáng/tối kể cả khi rê chuột (luật hover chung của chip không được đè).
// Lỗi gốc: nền hover --surface-3 (#ECE4D7) đè chip đang chọn có chữ trắng → 1,26:1 (axe đỏ e2e). Chạy: node scripts/test/stories-chip.mjs
import fs from 'node:fs';
const css = fs.readFileSync('web/css/stories.css', 'utf8'), T = JSON.parse(fs.readFileSync('brand/tokens.json', 'utf8')), err = [];
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const sel = css.match(/button\.chip\.st-lvb\[aria-checked="true"\],\s*button\.chip\.st-lvb\[aria-checked="true"\]:hover\s*\{([^}]*)\}/);
if (!sel) err.push('thiếu luật chọn + hover: button.chip.st-lvb[aria-checked="true"], …:hover');
else {
  if (!/background:\s*var\(--primary\)/.test(sel[1]) || !/color:\s*var\(--primary-ink\)/.test(sel[1])) err.push('trạng thái chọn phải dùng nền --primary + chữ --primary-ink');
  if (/#[0-9a-f]{3,6}\b|--on-done/i.test(sel[1])) err.push('trạng thái chọn không được dùng màu cứng/--on-done');
}
const base = css.match(/\.st-lvb \{([^}]*)\}/);
if (!base || !/background:\s*var\(--surface\)/.test(base[1]) || !/color:\s*var\(--text\)/.test(base[1])) err.push('.st-lvb chưa chọn phải khai nền --surface + chữ --text (không thừa màu chip)');
for (const m of ['light', 'dark']) {
  const v = k => T[m][k] || T.light[k];
  for (const [a, b, what] of [['--primary-ink', '--primary', 'chip chọn'], ['--text', '--surface', 'chip chưa chọn'], ['--text', '--surface-3', 'chip chưa chọn khi rê']]) { const r = cr(v(a), v(b)); if (r < 4.5) err.push(`${m} ${what}: ${a}/${b} ${r.toFixed(2)} < 4,5`); }
}
if (err.length) { console.error('✗ stories-chip:\n  ' + err.join('\n  ')); process.exit(1); }
console.log('✓ stories-chip: chip cấp chọn/chưa chọn/rê ≥ 4,5:1 sáng + tối, luật chọn thắng hover chung');
