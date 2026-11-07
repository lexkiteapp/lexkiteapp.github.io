// Nội dung server-driven có ký cho app native (docs/specs/native-apps.md §4 "Cập nhật không cần duyệt lại store"):
// vector native/shared/gen/vectors/compat.json = bộ đọc tham chiếu scripts/native/content-schema.mjs; 2 nhóm ca (app mới ↔ JSON cũ, app cũ ↔ JSON mới);
// chữ ký sai/thiếu/khóa khác/JSON hỏng/kind lạ luôn bị từ chối ở MỌI bản app; bảng flag có mặc định an toàn. Chạy: node scripts/test/native-compat.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { read, verify, testKey, APPS, SHIPPED_APP, CURRENT_APP, KIND } from '../native/content-schema.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const V = JSON.parse(fs.readFileSync(path.join(ROOT, 'native/shared/gen/vectors/compat.json'), 'utf8'));
const K = testKey();
ok(V.testKeySpki === K.spki, 'khóa test trong vector = khóa sinh từ seed công khai');
ok(V.testKeySpki !== (fs.readFileSync(path.join(ROOT, 'web/js/ota-key.js'), 'utf8').match(/LK_OTA_KEY = '([^']*)'/) || [])[1], 'vector KHÔNG dùng khóa thật của web OTA');
ok(APPS[SHIPPED_APP] && APPS[CURRENT_APP], 'có snapshot bản đã phát hành + bản hiện tại');
for (const g of ['new-reads-old', 'old-reads-new']) ok(V.cases.some(c => c.group === g), 'có nhóm ' + g);
for (const c of V.cases) {
  ok(JSON.stringify(read(c.doc, c.app, V.testKeySpki)) === JSON.stringify(c.expect), `"${c.name}" @${c.app}: expect = bộ đọc tham chiếu`);
  if (c.expect.ok) { const e = JSON.parse(c.doc); ok(e.kind === KIND && verify(e, K.spki), `"${c.name}": chữ ký hợp lệ`); }
}
for (const name of ['bad signature (body changed after signing)', 'bad signature (minApp changed after signing)', 'missing signature', 'signature from another key', 'truncated JSON', 'unknown kind (executable payload refused)'])
  for (const app of [SHIPPED_APP, CURRENT_APP]) { const c = V.cases.find(x => x.name === name && x.app === app); ok(c && c.expect.ok === false, `"${name}" bị từ chối ở ${app}`); }
ok(V.cases.some(c => c.app === SHIPPED_APP && c.expect.ok && c.expect.schemaNewer), 'app cũ đọc được JSON lược đồ mới (best-effort)');
const flags = JSON.parse(fs.readFileSync(path.join(ROOT, 'native/shared/flags.json'), 'utf8')).flags;
for (const k of ['ai_enabled', 'ads_enabled']) ok(flags[k] && flags[k].default === false, `flag ${k} mặc định TẮT (an toàn offline)`);
if (fails) { console.log(`✗ native-compat: ${fails}/${n} lỗi`); process.exit(1); }
console.log(`✓ native-compat: ${n} kiểm, ${V.cases.length} ca, ${Object.keys(flags).length} flag`);
