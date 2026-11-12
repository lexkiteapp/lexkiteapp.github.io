// Tĩnh: luật Firestore phải cấm toàn bộ khi mã không còn dùng Firestore; nếu mã dùng lại thì luật phải có giới hạn kích thước + hasOnly.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rules = fs.readFileSync('firestore.rules', 'utf8').replace(/\/\/.*$/gm, '');
const stmts = [...rules.matchAll(/allow\s+([^:]+):\s*if\s+([^;]+);/g)].map(m => ({ ops: m[1].trim(), cond: m[2].trim() }));
assert.ok(stmts.length > 0, 'firestore.rules phải có luật rõ ràng');

// Mã có còn gọi Firestore SDK không?
const roots = ['web/js', 'extension', 'mobile', 'functions'];
const hits = [];
const walk = d => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
  const f = path.join(d, e.name);
  if (e.isDirectory()) walk(f);
  else if (/\.(m?js|ts|html)$/.test(e.name) && !/\.min\./.test(e.name)) { const s = fs.readFileSync(f, 'utf8'); if (/firebase-firestore|firebase\.firestore\(|getFirestore\(|\bfirestore\(\)/.test(s)) hits.push(f); }
} };
roots.forEach(walk);

if (!hits.length) {
  for (const s of stmts) assert.equal(s.cond, 'false', `Firestore không còn được dùng → "allow ${s.ops}" phải là "if false" (đang: ${s.cond})`);
  console.log('✓ firestore.rules: cấm toàn bộ (mã không dùng Firestore)');
} else {
  for (const s of stmts.filter(x => /write|create|update/.test(x.ops) && x.cond !== 'false')) {
    assert.match(s.cond, /request\.resource\.size\s*<\s*\d+/, 'luật ghi phải giới hạn request.resource.size');
    assert.match(s.cond, /hasOnly\(/, 'luật ghi phải có danh sách khóa cho phép (hasOnly)');
    assert.match(s.cond, /request\.auth\.uid\s*==/, 'luật ghi phải ràng buộc theo uid');
  }
  console.log('✓ firestore.rules: giới hạn ghi (mã còn dùng Firestore: ' + hits.join(', ') + ')');
}
