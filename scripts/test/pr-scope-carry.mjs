// Carry-over của pr-scope (scripts/ci/pr-scope.mjs): push không đổi file nào kích workflow + head cũ xanh THẬT → bỏ qua lượt nặng. Hàm thuần.
import { carryOver, prPaths, BIG_DELTA } from '../ci/pr-scope.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } else console.log('✓ ' + m); };
const SELF = '.github/workflows/scroll-perf.yml', PATHS = ['web/js/**', 'web/css/**', 'scripts/test/scroll-perf.mjs', SELF];
const base = { paths: PATHS, self: SELF, prevReal: true };
ok(carryOver({ ...base, delta: ['content/blog/pt/a.md', 'docs/A.md', 'web/cpack/x.js'] }).skip === true, 'gộp main chỉ mang blog/docs/cpack (ngoài paths) + head cũ xanh thật → BỎ QUA lượt nặng');
ok(carryOver({ ...base, delta: ['content/blog/a.md', 'web/js/app.js'] }).skip === false, 'push có file khớp paths (web/js/app.js) → chạy');
ok(carryOver({ ...base, delta: [SELF] }).skip === false, 'push đổi chính workflow → chạy (file workflow tự nó luôn tính)');
ok(carryOver({ ...base, delta: ['docs/A.md'], prevReal: false }).skip === false, 'head cũ chưa có lượt nặng xanh thật (đỏ / gate-skip rỗng / chưa chạy) → chạy, không giấu');
ok(carryOver({ ...base, delta: [] }).skip === false && carryOver({ ...base, delta: undefined }).skip === false, 'không rõ phần đổi → chạy');
ok(carryOver({ ...base, delta: Array.from({ length: 450 }, (_, i) => `docs/f${i}.md`) }).skip === true, 'delta 450 file (đã phân trang, đều ngoài paths) → vẫn bỏ qua được');
ok(carryOver({ ...base, delta: Array.from({ length: BIG_DELTA }, (_, i) => `docs/f${i}.md`) }).skip === false, `delta ≥ ${BIG_DELTA} file (không biết đủ) → chạy`);
ok(carryOver({ delta: ['docs/A.md'], paths: null, self: SELF, prevReal: true }).skip === false, 'workflow KHÔNG có paths (mọi file kích nó) → luôn chạy');
ok(carryOver({ ...base, delta: ['web/css/a.css'], paths: ['web/js/**', '!web/css/**'] }).skip === true && carryOver({ ...base, delta: ['web/css/a.css'], paths: ['web/css/**', '!web/css/old/**'] }).skip === false, 'paths có phủ định: file bị loại không kích → bỏ qua; file khớp → chạy');
// đọc paths thật của scroll-perf từ nguồn workflow
const real = prPaths("on:\n  pull_request:\n    paths: ['web/js/**', 'web/css/**', 'web/app/**']\n  push:\n    branches: [x]\n");
ok(Array.isArray(real) && real.length === 3 && carryOver({ delta: ['content/blog/a.md'], paths: real, self: SELF, prevReal: true }).skip === true, 'paths đọc từ workflow thật → gộp main chỉ blog thì bỏ qua');
if (bad) { console.error(`✗ pr-scope-carry: ${bad} lỗi`); process.exit(1); } console.log('✓ pr-scope-carry: đạt');
