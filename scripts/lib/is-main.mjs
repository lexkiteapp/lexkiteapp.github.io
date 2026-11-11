// Tệp đang chạy là file này? So realpath của cả hai phía (macOS /tmp → /private/tmp, symlink) – so chuỗi import.meta.url với argv[1] sai khi
// đường dẫn qua symlink: khối main bị bỏ qua, lệnh thoát 0 không làm gì (02/11: cutover switch báo xong nhưng không chuyển). Test: scripts/test/cdn-r2.mjs.
import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const real = p => { try { return fs.realpathSync(p); } catch (e) { return p; } };
export const isMain = (metaUrl, argv1 = process.argv[1]) => !!argv1 && real(fileURLToPath(metaUrl)) === real(argv1);
