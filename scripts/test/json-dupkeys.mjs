#!/usr/bin/env node
// Khoá trùng trong JSON (JSON.parse lặng lẽ lấy khoá sau): quét mọi file JSON dễ bị gộp tay – bind Stitch, i18n-fixed, cấu hình test/QA/hạ tầng. Đỏ kèm đường dẫn + dòng.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dupKeys } from '../lib/json-dupkeys.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } };
// --- bộ quét thuần
ok(dupKeys('{"a":1,"b":{"x":1,"x":2},"c":[{"k":1,"k":2}]}').map(d => d.key + '@' + d.path).join() === 'x@/b,k@/c', 'bắt khoá trùng trong object lồng + trong mảng');
ok(dupKeys('{"a":{"x":1},"b":{"x":2},"c":[{"x":1},{"x":1}]}').length === 0, 'cùng tên khoá ở object KHÁC nhau không phải trùng');
ok(dupKeys('{"a":"x","b":"a","a2":"a"}').length === 0, 'giá trị trùng tên khoá không tính');
ok(dupKeys('{"a\\"b":1,"a\\"b":2}').length === 1, 'khoá có dấu \\" vẫn so đúng');
ok(dupKeys('{\n "a":1,\n "a":2\n}')[0].line === 3, 'báo đúng số dòng');
// --- quét repo: mọi JSON thuộc nhóm hay gộp tay
const files = execFileSync('git', ['ls-files', '*.json'], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n').filter(f => f && /^(brand\/stitch\/|scripts\/test\/[^/]+\.json$|content\/qa\/[^/]+\.json$|infra\/|data\/i18n-fixed\.json$)|i18n-fixed\.json$|(^|\/)budget\.json$/.test(f) && fs.existsSync(f));
let n = 0;
for (const f of files) { const t = fs.readFileSync(f, 'utf8'); if (t.length > 3e6) continue; n++; for (const d of dupKeys(t).slice(0, 5)) ok(false, `${f}:${d.line} khoá trùng "${d.key}" trong ${d.path} (JSON.parse lấy khoá sau, mất khoá trước)`); }
if (bad) process.exit(1); console.log(`✓ json-dupkeys: ${n} file JSON (bind Stitch, cấu hình QA/test/hạ tầng, i18n-fixed) không có khoá trùng`);
