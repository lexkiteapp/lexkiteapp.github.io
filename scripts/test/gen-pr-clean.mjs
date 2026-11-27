// Cổng "PR không commit bản sinh" (15/11, gốc xung đột): gói dịch web/js/i18n/<lang≠en>, web/cpack/lesson/pn-*, extension/app do CI dựng lại (npm ci → regen-generated)
// và bot gen-sync commit sau gộp. PR đụng các đường này = mọi lần main đi tiếp lại xung đột. Sửa: node scripts/ci/regen-conflicts.mjs --strip
//  1) isGenerated đúng tập (en là NGUỒN, không phải bản sinh; st-*.css chưa thuộc tập này);
//  2) Trên pull_request (checkout = merge commit, cha 1 = main): diff cha 1 → HEAD không được có tệp sinh; sự kiện khác: bỏ qua;
//  3) git thật (repo tạm): stripGenerated đưa tệp sinh của PR về bản main (kể cả tệp PR thêm mới / xoá) mà không đụng nguồn.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { isGenerated, offenders, needsRegen } from '../lib/generated.mjs';

for (const f of ['web/js/i18n/de.js', 'web/js/i18n/de/ux1.js', 'web/js/i18n/zh/lazyui.js', 'web/cpack/lesson/pn-fr.js', 'extension/app/js/app.js', 'extension/app/index.html', 'docs/CODEMAP.md', 'docs/codemap.json']) assert.ok(isGenerated(f), f);
for (const f of ['web/js/i18n/en.js', 'web/js/i18n/en/core.js', 'i18n/ui/de/ux1.js', 'web/js/app.js', 'web/cpack/lesson/stories.js', 'extension/manifest.json', 'web/css/st-v2-today.css', 'docs/METHODS.md', 'docs/codemap-notes.md']) assert.ok(!isGenerated(f), f);
assert.deepEqual(offenders(['web/cpack/es/dy.js', 'web/cpack/fr/dy-vi.js', 'web/packs/fr/wd.json', 'content/target/fr/drills.json']), ['web/cpack/es/dy.js', 'web/cpack/fr/dy-vi.js', 'web/packs/fr/wd.json'], '26/11: gói es/fr sinh từ drill-pack không commit trong PR (nguồn content/target/** vẫn commit)');
assert.deepEqual(needsRegen(['content/target/fr/drills.json']) && needsRegen(['scripts/target/drill-lib.mjs']) && !needsRegen(['web/cpack/es/dy.js']), true, 'đổi nguồn es/fr → phải dựng lại');
assert.deepEqual(offenders(['web/js/app.js', 'extension/app/js/app.js']), ['extension/app/js/app.js']);
assert.deepEqual(offenders(['docs/JOBS.md', 'functions/api/_jobs_reg.js', 'infra/jobs.json']), ['docs/JOBS.md', 'functions/api/_jobs_reg.js'], '25/11: sổ việc sinh (JOBS.md, _jobs_reg.js) không commit trong PR; infra/jobs.json là NGUỒN');

const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
  let parents = 0; try { parents = git('.', 'rev-list', '--parents', '-n', '1', 'HEAD').split(' ').length - 1; } catch { /* không phải git */ }
  if (parents === 2) {
    const bad = offenders(git('.', 'diff', '--name-only', '--no-renames', 'HEAD^1', 'HEAD').split('\n').filter(Boolean));
    if (bad.length) { console.error(`✗ gen-pr-clean: PR commit ${bad.length} tệp sinh (vd. ${bad.slice(0, 3).join(', ')}). Chúng do CI dựng lại + bot gen-sync commit sau gộp → mỗi lần main đi tiếp lại xung đột.\n  Sửa: node scripts/ci/regen-conflicts.mjs --strip   (rồi đẩy)`); process.exit(1); }
    console.log('✓ gen-pr-clean: PR không đụng tệp sinh');
  } else console.log('• gen-pr-clean: checkout không phải merge commit – bỏ qua kiểm PR');
} else console.log('• gen-pr-clean: không phải pull_request – bỏ qua kiểm PR');

// ── git thật: stripGenerated ──
const { stripGenerated } = await import('../pr-unconflict.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gpc-')), w = (f, s) => { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.writeFileSync(path.join(tmp, f), s); };
const g = (...a) => git(tmp, ...a), cwd0 = process.cwd();
g('init', '-q', '-b', 'main'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't'); g('config', 'commit.gpgsign', 'false');
w('i18n/ui/de.js', 'src1'); w('web/js/i18n/de/ux1.js', 'gen-main'); w('web/js/i18n/en/core.js', 'en'); w('extension/app/js/a.js', 'ext-main'); w('extension/app/js/gone.js', 'old');
w('docs/CODEMAP.md', 'map-main');
g('add', '-A'); g('commit', '-qm', 'base');
g('checkout', '-qb', 'pr'); w('docs/CODEMAP.md', 'map-pr'); w('i18n/ui/de.js', 'src2'); w('web/js/i18n/de/ux1.js', 'gen-pr'); w('web/js/i18n/en/core.js', 'en2'); w('extension/app/js/a.js', 'ext-pr'); w('extension/app/js/new.js', 'new'); fs.rmSync(path.join(tmp, 'extension/app/js/gone.js'));
g('add', '-A'); g('commit', '-qm', 'pr');
process.chdir(tmp);
assert.equal(stripGenerated('main'), 5, 'de/ux1.js, a.js, new.js (xoá), gone.js (khôi phục), CODEMAP.md');
process.chdir(cwd0);
const r = f => fs.readFileSync(path.join(tmp, f), 'utf8');
assert.equal(r('docs/CODEMAP.md'), 'map-main', 'CODEMAP về bản main'); assert.equal(r('web/js/i18n/de/ux1.js'), 'gen-main'); assert.equal(r('extension/app/js/a.js'), 'ext-main'); assert.equal(r('extension/app/js/gone.js'), 'old');
assert.ok(!fs.existsSync(path.join(tmp, 'extension/app/js/new.js')), 'tệp sinh PR thêm mới bị gỡ');
assert.equal(r('i18n/ui/de.js'), 'src2', 'nguồn giữ nguyên'); assert.equal(r('web/js/i18n/en/core.js'), 'en2', 'en là nguồn, giữ nguyên');
assert.equal(g('diff', '--cached', '--name-only', 'main').split('\n').filter(isGenerated).length, 0, 'sau strip không còn khác main ở tệp sinh');
fs.rmSync(tmp, { recursive: true, force: true });
// health.yml (chạy trên main theo lịch) phải dựng lại bản sinh trước npm test: bot gen-sync commit sau mỗi lần gộp nên có khoảng trễ → ext-sync đỏ giả (26/11)
{ const h = fs.readFileSync('.github/workflows/health.yml', 'utf8'); const u = h.slice(h.indexOf('  unit:'), h.indexOf('  e2e:')); if (!/GEN_REGEN: '1'/.test(u)) { console.error('✗ health.yml job unit thiếu GEN_REGEN=1 (ext-sync đỏ giả giữa lúc gộp và gen-sync)'); process.exit(1); } }
console.log('✓ gen-pr-clean: tập tệp sinh đúng, PR không commit bản sinh, strip đưa về bản main');
