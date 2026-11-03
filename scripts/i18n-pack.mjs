#!/usr/bin/env node
// Sinh gói dịch chạy (khóa băm) web/js/i18n/<lang>(.js|/<nhóm>.js) từ nguồn dễ đọc i18n/ui/ – scripts/lib/i18n-pack.mjs, docs/I18N-PIPELINE.md.
//   node scripts/i18n-pack.mjs          → ghi tệp lệch, xóa tệp không còn nguồn
//   node scripts/i18n-pack.mjs --check  → chỉ kiểm (thoát 1 nếu lệch: ai đó sửa nguồn mà quên chạy, hoặc sửa tay tệp sinh)
import { packAll } from './lib/i18n-pack.mjs';
const check = process.argv.includes('--check');
const r = packAll({ check });
const kb = n => (n / 1024).toFixed(0) + ' KB';
if (check && (r.stale.length || r.removed.length)) {
  console.error(`✗ i18n-pack: ${r.stale.length + r.removed.length} tệp web/js/i18n lệch nguồn i18n/ui (vd. ${[...r.stale, ...r.removed].slice(0, 3).join(', ')}) – chạy node scripts/i18n-pack.mjs (sửa bản dịch ở i18n/ui, không sửa web/js/i18n/<lang>)`);
  process.exit(1);
}
console.log(`✓ i18n-pack: ${r.files} tệp, nguồn ${kb(r.srcBytes)} → gói chạy ${kb(r.outBytes)}${check ? '' : ` (ghi ${r.stale.length}, xóa ${r.removed.length})`}`);
