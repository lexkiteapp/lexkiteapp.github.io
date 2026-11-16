// Định dạng ỔN ĐỊNH cho scripts/i18n-fixed.json (1,7 MB, ~2900 khóa): sắp theo khóa, MỖI KHÓA MỘT DÒNG.
// Gốc xung đột (15/11: 7/16 PR dirty): mọi PR thêm khóa vào CUỐI tệp (không sắp) → cùng một chỗ → xung đột mỗi khi main đi tiếp.
// Sắp + một dòng/khóa: hai PR thêm khóa khác nhau sửa dòng khác nhau → git tự gộp; cùng khóa thì merge3 (pr-unconflict) gỡ theo khóa.
// Mọi script GHI tệp này phải qua writeFixed(); gác: scripts/fmt-stable.mjs (drift).
import fs from 'node:fs';

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0); // thứ tự điểm mã, không phụ thuộc locale/máy

/** Văn bản chuẩn của object { khóa: { lang: bản dịch } }. */
export function fixedText(obj) {
  const keys = Object.keys(obj).sort(cmp);
  if (!keys.length) return '{}\n';
  return '{\n' + keys.map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(obj[k])}`).join(',\n') + '\n}\n';
}

/** Ghi tệp i18n-fixed.json đúng định dạng chuẩn. */
export const writeFixed = (file, obj) => fs.writeFileSync(file, fixedText(obj));
