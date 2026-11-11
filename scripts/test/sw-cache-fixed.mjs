// web/sw.js giữ CACHE cố định, build gắn hash nội dung (scripts/lib/sw-version.mjs).
// Gốc: 03/11 mỗi PR bump `const CACHE = 'lexkite-<ngày giờ>'` → PR nào vào main cũng làm mọi PR khác xung đột lại (vòng "dirty").
import fs from 'fs';
import os from 'os';
import path from 'path';
import { CACHE_BASE, CACHE_LINE, shellHash, stampSw, liveHash } from '../lib/sw-version.mjs';

let bad = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) bad++; };
const read = f => fs.readFileSync(f, 'utf8');

const sw = read('web/sw.js');
ok(sw.split(CACHE_LINE).length === 2, `web/sw.js có đúng một dòng ${CACHE_LINE} (đừng bump tay – build tự gắn hash nội dung; bump gây xung đột mọi PR khác)`);

const h = shellHash('web');
ok(/^[0-9a-f]{10}$/.test(h) && shellHash('web') === h, 'hash khung app: 10 ký tự hex, ổn định');

// Bản sao tạm: đổi nội dung → hash đổi; sw.js còn số cũ/hash cũ → hash KHÔNG đổi (dòng CACHE được chuẩn hoá)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'swv-'));
fs.mkdirSync(path.join(tmp, 'js'), { recursive: true }); fs.mkdirSync(path.join(tmp, 'app'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'js/a.js'), 'a'); fs.writeFileSync(path.join(tmp, 'app/index.html'), '<x>');
fs.writeFileSync(path.join(tmp, 'sw.js'), `${CACHE_LINE}\nself.x=1;`);
const t0 = shellHash(tmp);
fs.writeFileSync(path.join(tmp, 'sw.js'), `const CACHE = 'lexkite-20261103170000-abcdef0123';\nself.x=1;`);
ok(shellHash(tmp) === t0, 'hash bỏ qua giá trị CACHE trong sw.js (bản đã gắn hash/số cũ cho cùng kết quả)');
fs.writeFileSync(path.join(tmp, 'js/a.js'), 'b');
ok(shellHash(tmp) !== t0, 'đổi một file js → hash đổi (người dùng nhận khung mới)');
fs.writeFileSync(path.join(tmp, 'sw.js'), `${CACHE_LINE}\nself.x=2;`);
const t1 = shellHash(tmp); fs.writeFileSync(path.join(tmp, 'sw.js'), `${CACHE_LINE}\nself.x=3;`);
ok(shellHash(tmp) !== t1, 'đổi logic sw.js → hash đổi');
fs.rmSync(tmp, { recursive: true, force: true });

const stamped = stampSw(sw, h);
ok(stamped.includes(`const CACHE = '${CACHE_BASE}-${h}';`) && stampSw(stamped, h) === stamped, 'build gắn hash: lexkite-0-<hash>, gắn lại không nhân đôi');
ok(liveHash(stamped) === h && liveHash("const CACHE = 'lexkite-20261103170000';") === '', 'đọc hash từ sw.js live; bản cũ chưa gắn hash → rỗng (bộ canh tiếp tục chờ)');
let threw = false; try { stampSw('const X = 1;', h); } catch { threw = true; }
ok(threw, 'sw.js mất hằng CACHE → build đỏ');

// Mọi nơi dùng chung một nguồn – không còn ai bump tay hay so ngày giờ trong web/sw.js
ok(/sw-version\.mjs web --stamp dist\/sw\.js/.test(read('scripts/build-web.sh')), 'build-web.sh gắn hash qua sw-version.mjs');
ok(!/const CACHE = '\$V'|sed[^\n]*const CACHE/.test(read('scripts/mergecheck.sh')), 'mergecheck.sh không bump CACHE');
for (const f of ['scripts/test/post-deploy-check.mjs', 'scripts/test/live-check.mjs', 'scripts/ops/smoke.mjs']) {
  const s = read(f);
  ok(/sw-version\.mjs/.test(s) && !/readFileSync\('web\/sw\.js'[^\n]*lexkite-\\d\+/.test(s) && !/raw\.githubusercontent[^\n]*web\/sw\.js/.test(s), `${f}: so hash nội dung (không so số CACHE trong web/sw.js)`);
}

console.log(bad ? `✗ sw-cache-fixed: ${bad} lỗi` : '✓ sw-cache-fixed: CACHE cố định, hash gắn lúc build');
process.exit(bad ? 1 : 0);
