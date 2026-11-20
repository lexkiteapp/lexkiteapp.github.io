// Nguồn đường dẫn DUY NHẤT của các tệp kho từ (lib/*.js): phần nạp ngay ở web/js/lib, phần tải lười theo gói tsl ở web/cpack/lib (dời 19/11 để giảm byte người học).
// Mọi script đọc kho từ đi qua đây – đừng gõ cứng 'web/js/lib'.
import fs from 'node:fs';
const ROOT = new URL('../../', import.meta.url);
import { SCAN_ROOTS } from './scan-roots.mjs';
export const LEX_DIRS = SCAN_ROOTS.map(r => r + '/lib'); // web/js/lib + web/cpack/lib (cùng quy ước thư mục con của content-load/scan-roots)
/** Đường dẫn tương đối repo của mọi .js kho từ, xếp theo tên tệp (như khi chỉ có một thư mục). */
export const lexFiles = (keep = () => true) => LEX_DIRS.flatMap(d => fs.readdirSync(new URL(d + '/', ROOT)).filter(f => f.endsWith('.js') && keep(f)).map(f => ({ f, p: d + '/' + f })))
  .sort((a, b) => (a.f < b.f ? -1 : a.f > b.f ? 1 : 0)).map(x => x.p);
/** Chỗ của một tệp kho theo tên (web/js/lib trước, rồi web/cpack/lib). */
export const lexPath = f => LEX_DIRS.map(d => d + '/' + f).find(p => fs.existsSync(new URL(p, ROOT))) || LEX_DIRS[0] + '/' + f;
