// Phiên bản bộ nhớ đệm service worker theo NỘI DUNG khung app – nguồn DUY NHẤT cho build-web.sh (gắn vào dist/sw.js)
// và các bộ canh deploy (post-deploy-check, live-check, ops/smoke) để biết bản live đã là bản repo chưa.
// web/sw.js giữ hằng CỐ ĐỊNH `const CACHE = 'lexkite-0';` – KHÔNG bump tay: mỗi PR bump dòng này làm mọi PR khác xung đột lại
// (vòng "dirty" 03/11). Build thay thành lexkite-0-<hash 10 ký tự>; nội dung đổi → hash đổi → người dùng nhận khung mới.
// Dùng: node scripts/lib/sw-version.mjs [thư-mục-web=web] → in hash. Test: scripts/test/sw-cache-fixed.mjs
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

export const CACHE_BASE = 'lexkite-0';
export const CACHE_LINE = `const CACHE = '${CACHE_BASE}';`;
const EXT = /\.(js|css|html|json)$/;

function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (EXT.test(e.name)) out.push(p);
  }
  return out;
}

/** Hash nội dung khung app: js/ css/ i18n/ cpack/ app/index.html + chính sw.js (dòng CACHE chuẩn hoá). Thứ tự theo mã ký tự – không phụ thuộc locale của `sort`. */
export function shellHash(root = 'web') {
  const files = [...walk(path.join(root, 'js'), []), ...walk(path.join(root, 'css'), []), ...walk(path.join(root, 'i18n'), []), ...walk(path.join(root, 'cpack'), [])];
  for (const f of ['app/index.html', 'sw.js']) if (fs.existsSync(path.join(root, f))) files.push(path.join(root, f));
  const rel = files.map(f => path.relative(root, f).split(path.sep).join('/')).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const h = crypto.createHash('sha1');
  for (const r of rel) {
    let buf = fs.readFileSync(path.join(root, r));
    if (r === 'sw.js') buf = Buffer.from(buf.toString('utf8').replace(/lexkite-\d+(-[0-9a-f]+)?(?=['"])/, CACHE_BASE));
    h.update(r + '\0'); h.update(buf);
  }
  return h.digest('hex').slice(0, 10);
}

/** Gắn hash vào sw.js đã build: lexkite-<số>[-cũ] → lexkite-<số>-<hash>. Trả nội dung mới (ném lỗi nếu không có hằng CACHE). */
export function stampSw(src, hash) {
  if (!/lexkite-\d+(-[0-9a-f]+)?(?=['"])/.test(src)) throw new Error('sw.js không có hằng CACHE lexkite-<số>');
  return src.replace(/(lexkite-\d+)(-[0-9a-f]+)?(?=['"])/, `$1-${hash}`);
}

/** Hash trong sw.js bản live ('' nếu bản live còn dạng cũ chưa gắn hash). */
export const liveHash = txt => ((txt || '').match(/lexkite-\d+-([0-9a-f]{10})(?=['"])/) || [])[1] || '';

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] || 'web', mode = process.argv[3];
  const h = shellHash(root);
  if (mode === '--stamp') { // node sw-version.mjs <hash-từ> --stamp <file-sw> : gắn hash vào file sw đã build
    const f = process.argv[4]; fs.writeFileSync(f, stampSw(fs.readFileSync(f, 'utf8'), h));
  }
  console.log(h);
}
