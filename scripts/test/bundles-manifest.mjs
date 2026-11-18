// Đăng ký gói tải lười ở web/js/bundles.js, KHÔNG ở khung app (15/11: shell sát trần 374 KB gz, mỗi PR nội dung thêm tệp vào BUNDLES chạm trần – #1389, #1354).
//  1) app.js không còn khối BUNDLES; nạp js/bundles.js LƯỜI (manifest()), mọi App.need/prefetch/giọng đợi manifest, lỗi mạng không đóng băng gói (xoá bundleP, thử lại được);
//  2) bundles.js KHÔNG thuộc tệp nạp ngay (SW SHELL ∪ <script> của /app/) ⇒ thêm tệp vào gói không đổi số byte khung (đo: cùng danh sách firstLoadFiles);
//  3) nội dung đọc được qua scripts/lib/bundles.mjs (chạy như trình duyệt, giữ ...map()); mọi tệp có thật; không tên gói trùng/rỗng ngoài EXT_NO;
//  4) thêm một tệp vào gói trong bản sao → gzip khung (firstLoadFiles) y nguyên, bundles.js đổi.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseBundles, readBundles, bundlesSrc, bundleFiles } from '../lib/bundles.mjs';
import { firstLoadFiles, gzSize } from '../lib/gz-canon.mjs';

const app = fs.readFileSync('web/js/app.js', 'utf8'), src = bundlesSrc();
assert.ok(!/BUNDLES = \{\n/.test(app) && !/const G = 'js\/grammar\/'/.test(app), 'app.js còn khối BUNDLES – đăng ký gói thuộc web/js/bundles.js');
assert.equal((app.match(/loadScript\('js\/bundles\.js'\)/g) || []).length, 1, 'app.js nạp js/bundles.js đúng 1 chỗ (manifest())');
assert.ok(/const need1 = n => bundleP\[n\] \|\| \(inflight\+\+, bundleP\[n\] = manifest\(\)\.then\(/.test(app), 'need1 phải đợi manifest()');
assert.ok(/\.catch\(e => \{ delete bundleP\[n\]; throw e; \}\)/.test(app), 'need1: lỗi nạp manifest không được cache (xoá bundleP → thử lại được)');
assert.ok(/idle\(\(\) => manifest\(\)\.then\(/.test(app) && /manifest\(\)\.then\(\(\) => Promise\.all\(BUNDLES\.voice/.test(app), 'prefetchAll + prefetch giọng đợi manifest');
assert.ok(/EXT_NO\.forEach\(n => \{ BUNDLES\[n\] = \[\]; \}\)/.test(app) && /if \(Store\.isExtension\) EXT_NO/.test(app), 'add-on vẫn bỏ gói EXT_NO sau khi nạp manifest');

const B = readBundles();
assert.ok(Object.keys(B).length > 90, 'đọc được > 90 gói');
const missing = bundleFiles(B).filter(f => !fs.existsSync(`web/${f.split('?')[0]}`));
assert.deepEqual(missing, [], `gói trỏ tới tệp không có: ${missing.join(', ')}`);
for (const [k, v] of Object.entries(B)) assert.ok(Array.isArray(v) && v.every(f => typeof f === 'string') && v.length > 0, `gói ${k}: phải là danh sách tệp không rỗng`);

const first = firstLoadFiles();
assert.ok(!first.some(u => /bundles\.js/.test(u)), 'bundles.js không được nằm trong khung (SW SHELL/<script> của /app/) – chỉ nạp lười');
const sw = fs.readFileSync('web/sw.js', 'utf8'), html = fs.readFileSync('web/app/index.html', 'utf8');
assert.ok(/<link rel="preload" as="script" href="js\/bundles\.js">/.test(html) && !/<script[^>]*bundles\.js/.test(html), 'index.html chỉ preload bundles.js (song song app.js), không chặn/nạp tĩnh');
assert.ok(!/bundles\.js/.test(sw.split('\n').find(l => /const SHELL/.test(l)) || ''), 'bundles.js không vào SW SHELL');

// thêm tệp nội dung vào gói: khung không đổi, chỉ bundles.js đổi
const before = first.filter(u => /\.js$/.test(u)).map(u => gzSize(fs.readFileSync('web' + u))).reduce((a, b) => a + b, 0);
const edited = src.replace("  g.LK_BUNDLES = {", "  g.LK_BUNDLES = {\n    zzNew: ['cpack/zz-new-file.js'],");
assert.notEqual(edited, src); assert.deepEqual(parseBundles(edited).zzNew, ['cpack/zz-new-file.js'], 'thêm gói mới vào bundles.js đọc được');
const after = firstLoadFiles().filter(u => /\.js$/.test(u)).map(u => gzSize(fs.readFileSync('web' + u))).reduce((a, b) => a + b, 0);
assert.equal(after, before, 'khung (gz tệp nạp ngay) không phụ thuộc bundles.js');
assert.throws(() => parseBundles('window.x = 1;'), /LK_BUNDLES/, 'tệp thiếu LK_BUNDLES báo lỗi rõ');
console.log(`✓ bundles-manifest: ${Object.keys(B).length} gói ở web/js/bundles.js (nạp lười, ngoài khung), app.js ${(gzSize(fs.readFileSync('web/js/app.js')) / 1024).toFixed(1)} KB gz`);
