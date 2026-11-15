// Hồi quy "PR xung đột lại mỗi khi main đi tiếp" (15/11): i18n-fixed.json sắp + một dòng/khóa + gộp theo khóa; regen-conflicts gỡ trên git thật.
//  1) scripts/i18n-fixed.json trong repo ĐÚNG định dạng chuẩn (fixedText), không mất khóa;
//  2) fixedText: sắp theo điểm mã, một dòng/khóa, idempotent;
//  3) merge3Fixed: hai phía thêm khóa khác nhau / cùng chữ gốc khác ngôn ngữ → gộp; cùng ô khác giá trị → null (người gỡ);
//  4) git thật (repo tạm): main + nhánh cùng thêm vào một khóa i18n-fixed.json và cùng sửa suite.txt → regen-conflicts gỡ xong + commit, không còn dấu xung đột;
//  5) hai khóa KHÁC nhau gộp sạch ngay từ git (lý do đổi định dạng).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { fixedText } from '../lib/fixed-json.mjs';
import { merge3Fixed, plan, regenCmds } from '../pr-unconflict.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const real = fs.readFileSync(path.join(ROOT, 'scripts/i18n-fixed.json'), 'utf8');
assert.equal(real, fixedText(JSON.parse(real)), 'scripts/i18n-fixed.json lệch định dạng chuẩn – chạy node scripts/fmt-stable.mjs');
assert.ok(Object.keys(JSON.parse(real)).length > 2000, 'i18n-fixed.json mất khóa');

const t = fixedText({ b: { es: 'B' }, a: { es: 'A', fr: 'A!' }, 'Ă': { es: 'x' } });
assert.deepEqual(Object.keys(JSON.parse(t)), ['a', 'b', 'Ă'], 'sắp theo điểm mã');
assert.equal(t.split('\n').filter(l => l.startsWith('  "')).length, 3, 'mỗi khóa đúng một dòng');
assert.equal(fixedText(JSON.parse(t)), t, 'idempotent');

const base = { x: { es: '1', fr: '1' } };
assert.deepEqual(merge3Fixed(base, { ...base, a: { es: 'a' } }, { ...base, b: { es: 'b' } }), { x: base.x, a: { es: 'a' }, b: { es: 'b' } });
assert.deepEqual(merge3Fixed(base, { x: { es: '1', fr: '1', de: 'o' } }, { x: { es: '1', fr: '1', ja: 't' } }), { x: { es: '1', fr: '1', de: 'o', ja: 't' } }, 'cùng chữ gốc, khác ngôn ngữ → gộp');
assert.equal(merge3Fixed(base, { x: { es: 'o', fr: '1' } }, { x: { es: 't', fr: '1' } }), null, 'cùng ô, khác giá trị → người gỡ');
assert.deepEqual(plan(['scripts/i18n-fixed.json']), [{ f: 'scripts/i18n-fixed.json', how: 'json3' }]);

// trang pháp lý sinh (15 ngôn ngữ × 4): lấy main rồi dựng lại bằng build-legal
assert.deepEqual(plan(['web/de/privacy.html', 'web/terms.html']), [{ f: 'web/de/privacy.html', how: 'main' }, { f: 'web/terms.html', how: 'main' }]);
assert.equal(plan(['web/de/privacy-extra.html']), null, 'chỉ đúng 4 trang pháp lý');
assert.ok(regenCmds([{ f: 'web/ko/credits.html' }]).some(c => c.join(' ') === 'node scripts/build-legal.mjs'));

// ── git thật ──
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rc-'));
const g = (...a) => execFileSync('git', a, { cwd: tmp, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const w = (f, s) => { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.writeFileSync(path.join(tmp, f), s); };
const r = f => fs.readFileSync(path.join(tmp, f), 'utf8');
g('init', '-q', '-b', 'main'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't'); g('config', 'commit.gpgsign', 'false');
const seed = { k1: { es: '1' }, k3: { es: '3' }, k5: { es: '5' } };
w('scripts/i18n-fixed.json', fixedText(seed)); w('scripts/test/suite.txt', 'a.mjs\n'); g('add', '-A'); g('commit', '-qm', 'base');
g('checkout', '-qb', 'pr'); w('scripts/i18n-fixed.json', fixedText({ ...seed, k2: { es: '2' }, k9: { es: 'pr', fr: 'pr' } })); w('scripts/test/suite.txt', 'a.mjs\npr.mjs\n'); g('commit', '-qam', 'pr');
g('checkout', '-q', 'main'); w('scripts/i18n-fixed.json', fixedText({ ...seed, k4: { es: '4' }, k9: { es: 'pr', de: 'main' } })); w('scripts/test/suite.txt', 'a.mjs\nmain.mjs\n'); g('commit', '-qam', 'main');
g('checkout', '-q', 'pr');
const out = execFileSync('node', [path.join(ROOT, 'scripts/ci/regen-conflicts.mjs'), '--base=main'], { cwd: tmp, encoding: 'utf8' });
assert.match(out, /đã gỡ/, out);
const merged = JSON.parse(r('scripts/i18n-fixed.json'));
assert.deepEqual(Object.keys(merged), ['k1', 'k2', 'k3', 'k4', 'k5', 'k9'], 'đủ khóa của cả hai phía, đã sắp');
assert.deepEqual(merged.k9, { es: 'pr', fr: 'pr', de: 'main' }, 'cùng khóa: gộp theo ngôn ngữ');
assert.equal(r('scripts/i18n-fixed.json'), fixedText(merged));
for (const l of ['a.mjs', 'pr.mjs', 'main.mjs']) assert.ok(r('scripts/test/suite.txt').split('\n').includes(l), `suite.txt thiếu ${l}`);
for (const f of ['scripts/i18n-fixed.json', 'scripts/test/suite.txt']) assert.ok(!/^(<<<<<<<|>>>>>>>)/m.test(r(f)), `còn dấu xung đột trong ${f}`);
assert.equal(g('status', '--porcelain', '--untracked-files=no').trim(), '', 'cuộc gộp đã commit');

// hai khóa khác nhau (k2 / k4) → git gộp sạch, không cần công cụ
g('checkout', '-q', '-b', 'pr2', 'main~1'); w('scripts/i18n-fixed.json', fixedText({ ...seed, k2: { es: '2' } })); g('commit', '-qam', 'pr2');
g('merge', '--no-edit', 'main');
assert.deepEqual(Object.keys(JSON.parse(r('scripts/i18n-fixed.json'))), ['k1', 'k2', 'k3', 'k4', 'k5', 'k9']);
fs.rmSync(tmp, { recursive: true, force: true });

// tệp > 1 MiB (i18n-fixed.json thật ~1,8 MB): execFileSync mặc định 1 MiB làm công cụ đọc thành {} và GHI ĐÈ {} (15/11) – tệp lớn vẫn phải giữ đủ khóa
{
  const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'rcbig-'));
  const g2 = (...a) => execFileSync('git', a, { cwd: tmp2, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const w2 = (f, s2) => { fs.mkdirSync(path.dirname(path.join(tmp2, f)), { recursive: true }); fs.writeFileSync(path.join(tmp2, f), s2); };
  g2('init', '-q', '-b', 'main'); g2('config', 'user.email', 't@t'); g2('config', 'user.name', 't'); g2('config', 'commit.gpgsign', 'false');
  const big = {}; for (let i = 0; i < 2600; i++) big['big' + i] = { es: 'x'.repeat(450) };
  assert.ok(fixedText(big).length > (1 << 20), 'tệp thử phải > 1 MiB');
  w2('scripts/i18n-fixed.json', fixedText({ ...big, k1: { es: '1' } })); g2('add', '-A'); g2('commit', '-qm', 'base');
  g2('checkout', '-qb', 'pr'); w2('scripts/i18n-fixed.json', fixedText({ ...big, k1: { es: '1' }, k9: { es: 'pr' } })); g2('commit', '-qam', 'pr');
  g2('checkout', '-q', 'main'); w2('scripts/i18n-fixed.json', fixedText({ ...big, k1: { es: '1' }, k9: { es: 'pr', de: 'main' } })); g2('commit', '-qam', 'main');
  g2('checkout', '-q', 'pr');
  const o2 = execFileSync('node', [path.join(ROOT, 'scripts/ci/regen-conflicts.mjs'), '--base=main'], { cwd: tmp2, encoding: 'utf8' });
  assert.match(o2, /đã gỡ/, o2);
  const m2 = JSON.parse(fs.readFileSync(path.join(tmp2, 'scripts/i18n-fixed.json'), 'utf8'));
  assert.equal(Object.keys(m2).length, 2602, 'tệp > 1 MiB không được mất khóa');
  assert.deepEqual(m2.k9, { es: 'pr', de: 'main' });
  fs.rmSync(tmp2, { recursive: true, force: true });
}
console.log('✓ regen-conflicts: i18n-fixed sắp/một dòng, gộp theo khóa, gỡ trên git thật');
