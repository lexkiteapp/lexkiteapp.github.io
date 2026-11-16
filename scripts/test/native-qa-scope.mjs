// Test phạm vi dịch ngược online của native-qa (scripts/video/teach2d/qa-scope.mjs): PR chỉ dịch ngược hàng đổi; không đọc được base → hết (không bỏ sót).
import { changedIds, rowsAt } from '../video/teach2d/qa-scope.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } else console.log('✓ ' + m); };
const row = (id, hook = 'h') => ({ id, lang: 'ja', in: { en: { hook }, native: { hook: 'n' } } });
const base = [row('a'), row('b'), row('c')];
ok([...changedIds(base, [row('a'), row('b'), row('c')])].length === 0, 'không đổi gì → không hàng nào cần dịch ngược online');
ok([...changedIds(base, [row('a'), row('b', 'sửa'), row('c')])].join() === 'b', 'hàng bị sửa → chỉ hàng đó');
ok([...changedIds(base, [row('a'), row('b'), row('c'), row('d')])].join() === 'd', 'hàng mới thêm → hàng đó');
ok([...changedIds(base, [row('a'), row('c')])].length === 0, 'hàng bị xoá → không còn gì để kiểm');
ok(changedIds(undefined, base) === null && changedIds(null, base) === null, 'không đọc được base → null = dịch ngược TẤT CẢ (không bỏ sót)');
ok([...changedIds([], base)].length === 3, 'tệp chưa có ở base → mọi hàng là mới');
const gitOk = () => JSON.stringify({ rows: base });
ok(rowsAt('origin/main', 'f.json', gitOk).length === 3, 'rowsAt đọc đúng hàng bản base');
const gitMissing = () => { const e = new Error('x'); e.stderr = "fatal: path 'f.json' exists on disk, but not in 'origin/main'"; throw e; };
ok(Array.isArray(rowsAt('origin/main', 'f.json', gitMissing)) && rowsAt('origin/main', 'f.json', gitMissing).length === 0, 'tệp chưa có ở base → []');
const gitBadRef = () => { const e = new Error('x'); e.stderr = "fatal: invalid object name 'origin/zzz'."; throw e; };
ok(rowsAt('origin/zzz', 'f.json', gitBadRef) === undefined, 'ref hỏng → undefined (dịch ngược tất cả)');
if (bad) { console.error(`✗ native-qa-scope: ${bad} lỗi`); process.exit(1); } console.log('✓ native-qa-scope: đạt');
