// Đăng ký gói tải lười (tên gói → tệp) nằm ở web/js/bundles.js (ngoài khung app.js – PR thêm nội dung không làm phình khung, trần 374 KB gz).
// Đọc thành object thật (chạy tệp như trình duyệt: giữ cả tên ghép bằng ...map()); mọi test/công cụ dùng hàm này, KHÔNG cắt chuỗi trong app.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const BUNDLES_FILE = 'web/js/bundles.js';
export const bundlesSrc = (root = ROOT) => fs.readFileSync(path.join(root, BUNDLES_FILE), 'utf8');
/** Chạy bundles.js trên một `window` giả → LK_BUNDLES. `src` = nội dung tệp (mặc định đọc từ repo). */
export function parseBundles(src) {
  const win = {}; new Function('window', src)(win);
  if (!win.LK_BUNDLES || typeof win.LK_BUNDLES !== 'object') throw new Error(`${BUNDLES_FILE}: không thấy window.LK_BUNDLES`);
  return win.LK_BUNDLES;
}
export const readBundles = (root = ROOT) => parseBundles(bundlesSrc(root));
/** Như readBundles nhưng nhận thư mục web (dist/web/bản tạm của test): <webDir>/js/bundles.js. */
export const bundlesIn = webDir => parseBundles(fs.readFileSync(path.join(webDir, 'js/bundles.js'), 'utf8'));
/** Tệp duy nhất của mọi gói (thứ tự xuất hiện). */
export const bundleFiles = (B = readBundles()) => [...new Set(Object.values(B).flat())];
