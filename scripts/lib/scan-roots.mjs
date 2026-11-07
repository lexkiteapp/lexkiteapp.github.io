// Gốc quét chung cho mã + nội dung người học tải: web/js và gói nội dung tải lười web/cpack (scripts/build-cpack.mjs, mẫu #726).
// Mọi bộ quét "toàn bộ web/js" (i18n-missing, vi-lint, comment-code, tts-sites, frame-consistency…) đọc từ đây → dời dữ liệu sang cpack không mở lỗ quét.
// Test: scripts/test/scan-roots.mjs (mọi file cpack nằm trong vùng quét; các bộ quét dùng SCAN_ROOTS).
import fs from 'node:fs'; import path from 'node:path';
export const SCAN_ROOTS = ['web/js', 'web/cpack'];
const num = p => +((path.basename(p).match(/\d+/) || [0])[0]);
// Dữ liệu cùng loại có thể nằm ở web/js/<sub> hoặc web/cpack/<sub> (vd. listen/test10.js): đường dẫn (tương đối root) theo số thứ tự tự nhiên
export const dataFiles = (sub, re, root = '.') => SCAN_ROOTS.flatMap(r => { const d = path.join(root, r, sub); return fs.existsSync(d) ? fs.readdirSync(d).filter(f => re.test(f)).map(f => [r, sub, f].join('/')) : []; })
  .sort((a, b) => num(a) - num(b) || (a < b ? -1 : 1));
