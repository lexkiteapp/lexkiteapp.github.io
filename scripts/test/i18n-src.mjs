#!/usr/bin/env node
// i18n-src: nguồn dịch i18n/ui/** phải ở dạng MỖI KHÓA MỘT DÒNG, sắp xếp (scripts/lib/i18n-src.mjs) để git tự gộp 2 PR thêm khóa khác nhau
// (10/11: #934 xung đột 3 lần/ngày, #983 – tệp 1 dòng JSON khổng lồ). Kiểm: định dạng thư viện, gộp git thật, mọi tệp nguồn đúng dạng,
// mọi bộ ghi dùng thư viện, gói sinh có luật gộp.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fmtSrc, parseSrc, normSrc, isCanonical } from '../lib/i18n-src.mjs';

// 1) thư viện: sắp xếp ổn định, mỗi khóa 1 dòng (cả chuỗi có xuống dòng/nháy), đọc lại y hệt; dạng cũ 1 dòng + khóa trùng (sau thắng) đọc được
const H = '/* UI de – x (nhóm tải lười). */', d = { 'Zebra': 'Z', 'An "x"\nhai dòng': 'A\nB', 'ăn': 'essen', '1': 'eins' };
const t = fmtSrc(H, 'de', d);
assert.deepEqual(parseSrc(t).dict, d); assert.equal(parseSrc(t).head, H); assert.equal(parseSrc(t).lang, 'de');
const rows = t.split('\n').filter(l => l.endsWith(','));
assert.equal(rows.length, 4, 'mỗi khóa đúng 1 dòng'); assert.deepEqual(rows.map(l => JSON.parse('{' + l.slice(0, -1) + '}')).map(o => Object.keys(o)[0]), Object.keys(d).sort());
assert.ok(isCanonical(t) && normSrc(t) === t, 'idempotent');
const old = `${H}\n(function (g) { const D = g.I18N_DICT = g.I18N_DICT || {}; D["de"] = Object.assign(D["de"] || {}, {"b":"1","a":"2"}); })(typeof self !== 'undefined' ? self : this);\n`;
assert.ok(!isCanonical(old)); assert.deepEqual(parseSrc(normSrc(old)).dict, { a: '2', b: '1' });
const dup = t.replace('"Zebra":"Z",', '"Zebra":"Z",\n"Zebra":"Z2",');
assert.equal(parseSrc(dup).dict.Zebra, 'Z2', 'hợp union khóa trùng: dòng sau thắng');

// 2) git thật: 2 nhánh thêm 2 khóa khác nhau (và sửa 2 khóa xa nhau) → gộp SẠCH, giữ cả hai
const T = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'i18nsrc-')), g = (...a) => execFileSync('git', a, { cwd: T, stdio: 'pipe' }).toString();
try {
  const base = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`khóa ${String(i).padStart(2, '0')}`, `v${i}`]));
  const W = o => fs.writeFileSync(path.join(T, 'de.js'), fmtSrc(H, 'de', o));
  g('init', '-q', '-b', 'main'); g('config', 'user.name', 't'); g('config', 'user.email', 't@t');
  W(base); g('add', '-A'); g('commit', '-qm', 'base');
  g('checkout', '-qb', 'a'); W({ ...base, 'a mới': 'A', 'khóa 03': 'sửa A' }); g('commit', '-qam', 'a');
  g('checkout', '-q', 'main'); W({ ...base, 'zz mới': 'Z', 'khóa 30': 'sửa B' }); g('commit', '-qam', 'b');
  const m = spawnSync('git', ['merge', '-q', '--no-edit', 'a'], { cwd: T, encoding: 'utf8' });
  assert.equal(m.status, 0, '2 PR thêm/sửa khóa khác nhau phải gộp sạch: ' + m.stdout + m.stderr);
  const got = parseSrc(fs.readFileSync(path.join(T, 'de.js'), 'utf8')).dict;
  assert.ok(got['a mới'] === 'A' && got['zz mới'] === 'Z' && got['khóa 03'] === 'sửa A' && got['khóa 30'] === 'sửa B', 'giữ thay đổi của cả hai');
  assert.ok(isCanonical(fs.readFileSync(path.join(T, 'de.js'), 'utf8')), 'kết quả gộp vẫn đúng dạng');
} finally { fs.rmSync(T, { recursive: true, force: true }); }

// 3) mọi tệp nguồn i18n/ui đúng dạng (sửa: node scripts/i18n-dedupe.cjs)
const files = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') && files.push(path.join(d, e.name)); })('i18n/ui');
const bad = files.filter(f => !isCanonical(fs.readFileSync(f, 'utf8')));
assert.ok(files.length > 100, 'tìm thấy nguồn i18n/ui');
assert.equal(bad.length, 0, `${bad.length} tệp nguồn chưa ở dạng mỗi khóa một dòng (vd. ${bad.slice(0, 3).join(', ')}) – chạy node scripts/i18n-dedupe.cjs`);

// 4) mọi bộ ghi nguồn dùng thư viện (không tự JSON.stringify cả từ điển 1 dòng nữa); gói sinh có luật gộp
for (const f of ['scripts/split-i18n.mjs', 'scripts/gen-i18n.mjs', 'scripts/i18n-fix.mjs', 'scripts/i18n-dedupe.cjs', 'scripts/confidence/build.mjs', 'scripts/ci/preview-resolve.mjs', 'scripts/pr-unconflict.mjs']) {
  const s = fs.readFileSync(f, 'utf8');
  assert.match(s, /lib\/i18n-src\.mjs/, `${f}: phải ghi nguồn i18n/ui qua scripts/lib/i18n-src.mjs`);
  assert.doesNotMatch(s, /Object\.assign\(D\[[^\n]*\$\{JSON\.stringify\([A-Za-z]*[Dd]ict/, `${f}: còn tự ghi từ điển 1 dòng`);
}
const ga = fs.readFileSync('.gitattributes', 'utf8');
assert.match(ga, /^web\/js\/i18n\/\*\* merge=i18n-gen/m, '.gitattributes: gói sinh web/js/i18n dùng luật gộp i18n-gen');
assert.match(ga, /^extension\/app\/js\/i18n\/\*\* merge=i18n-gen/m, '.gitattributes: bản chép add-on dùng luật gộp i18n-gen');
assert.match(ga, /^web\/js\/i18n\/en(\.js|\/\*\*) -merge|^web\/js\/i18n\/en\.js merge$/m, '.gitattributes: nguồn en KHÔNG phải tệp sinh');
console.log(`✓ i18n-src: ${files.length} tệp nguồn mỗi khóa một dòng, 2 PR khác khóa gộp sạch, bộ ghi dùng chung thư viện, gói sinh có luật gộp`);
