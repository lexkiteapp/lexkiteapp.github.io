#!/usr/bin/env node
// Hồ sơ Edge Add-ons + Firefox (AMO) cho 15 ngôn ngữ (docs/EDGE-SUBMIT.md, store/edge/search-terms.json, store/firefox/amo.json):
// đủ 15 ngôn ngữ như store/chrome/listing.json, search terms ≤ 7 × ≤ 30 ký tự không trùng, tên AMO ≤ 50, tóm tắt ≤ 250, tags ≤ 10, quyền khớp manifest.
import fs from 'node:fs';
let n = 0, fail = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.error('  ✗ ' + m); } };
const J = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const L = J('store/chrome/listing.json'), E = J('store/edge/search-terms.json').terms, F = J('store/firefox/amo.json'), langs = Object.keys(L);
ok(langs.length === 15, 'listing.json: 15 ngôn ngữ');
for (const l of langs) {
  const t = E[l]; ok(Array.isArray(t) && t.length >= 5 && t.length <= 7, `Edge ${l}: 5–7 search terms`);
  for (const x of t || []) ok(x.length <= 30 && x.trim() === x && !/lexkite/i.test(x), `Edge ${l}: "${x}" ≤ 30 ký tự, không tên thương hiệu`);
  ok(new Set((t || []).map(x => x.toLowerCase())).size === (t || []).length, `Edge ${l}: không trùng cụm`);
  const nm = F.names[l]; ok(nm && nm.length <= 50 && nm.startsWith('Lexkite'), `AMO ${l}: tên ≤ 50 ký tự (${nm && nm.length})`);
  ok(L[l].summary.length <= 250 && L[l].description.length >= 200, `AMO ${l}: tóm tắt ≤ 250, có mô tả (dùng chung listing.json)`);
}
ok(Object.keys(E).length === 15 && Object.keys(F.names).length === 15, 'đủ 15 ngôn ngữ ở Edge + AMO (không dư)');
ok(F.tags.length <= 10 && F.tags.every(x => x.length <= 20), 'AMO: ≤ 10 tags');
const m = J('extension/manifest.json');
ok(F.gecko_id === 'lexkite@lexkite.com' && /gecko[\s\S]*lexkite@lexkite\.com/.test(fs.readFileSync('scripts/build-firefox.sh', 'utf8')), 'AMO: gecko id khớp scripts/build-firefox.sh');
for (const p of m.permissions) ok(new RegExp('\\b' + p + '\\b').test(F.notesToReviewer), `AMO ghi chú kiểm duyệt nêu quyền "${p}"`);
ok(F.supportEmail === 'support@lexkite.com' && /^https:\/\/lexkite\.com\/en\/privacy$/.test(F.privacyPolicy), 'AMO: email hỗ trợ + chính sách riêng tư');
console.log(fail ? `✗ addon-listings: ${fail}/${n} lỗi` : `✓ addon-listings: ${n} kiểm đều đạt`);
process.exit(fail ? 1 : 0);
