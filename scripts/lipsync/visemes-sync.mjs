// Ghi bảng viseme chung web/js/call/visemes.json vào khối @visemes của web/js/call/lipsync.js (bản web chạy đồng bộ, không tải JSON lúc chạy).
// node scripts/lipsync/visemes-sync.mjs [--check]  – --check: báo lỗi nếu khối lệch bảng (scripts/test/lipsync-cross.mjs gọi)
import fs from 'node:fs';
const F = 'web/js/call/lipsync.js', J = JSON.parse(fs.readFileSync('web/js/call/visemes.json', 'utf8')); delete J['//'];
const src = fs.readFileSync(F, 'utf8'), re = /(  const VIS = ).*?(;\n  \/\* @visemes-end \*\/)/s;
if (!re.test(src)) { console.error('lipsync.js: thiếu khối @visemes'); process.exit(1); }
const out = src.replace(re, (_, a, b) => a + JSON.stringify(J) + b);
if (process.argv.includes('--check')) { if (out !== src) { console.error('lipsync.js lệch web/js/call/visemes.json → node scripts/lipsync/visemes-sync.mjs'); process.exit(1); } console.log('visemes: khớp'); }
else { fs.writeFileSync(F, out); console.log('visemes: đã ghi', F); }
