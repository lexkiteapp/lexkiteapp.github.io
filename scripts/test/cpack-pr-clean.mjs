// Cổng trần web/cpack (24/11, gốc xung đột): trần lười do bot giữ (scripts/test/cpack-floor.json, scripts/lib/cpack-floor.mjs);
// PR cần vượt phụ cấp → scripts/test/cpack-notes/<nhánh>.md. Trên pull_request (merge commit, cha 1 = main): sửa cpackTotal/_cpackNote… trong budget.json → ::warning:: (khoá chết, không đỏ để PR cũ không xung đột); sửa cpack-floor.json của bot → ĐỎ.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { ceilingEdits, noteExtra, ALLOWANCE, FLOOR } from '../lib/cpack-floor.mjs';
assert.equal(ceilingEdits('-  "cpackTotal": 1,\n+  "cpackTotal": 2,\n+  "_cpackNote20": "x",\n   "other": 1').length, 2);
assert.equal(ceilingEdits('-  "cpackTotal": 1,').length, 0);
assert.equal(ceilingEdits('+  "contentWarn": 14,\n+  "_totalJsNote": "x"').length, 0);
assert.ok(ALLOWANCE > 0 && noteExtra() >= 0);
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
  let parents = 0; try { parents = git('rev-list', '--parents', '-n', '1', 'HEAD').split(' ').length - 1; } catch { /* không phải git */ }
  if (parents === 2) {
    const warn = ceilingEdits(git('diff', '-U0', 'HEAD^1', 'HEAD', '--', 'scripts/test/budget.json'));
    if (warn.length) console.log(`::warning::cpack-pr-clean: PR sửa ${warn.length} dòng cpackTotal/_cpackNote… trong budget.json – KHÔNG còn tác dụng (trần do bot giữ). Cần vượt phụ cấp 400 KB: thêm scripts/test/cpack-notes/<nhánh>.md (dòng "cpack-extra: <byte>" + lý do) – docs/CI-RUNNERS.md › Trần web/cpack`);
    let inBase = true; try { git('cat-file', '-e', 'HEAD^1:' + FLOOR); } catch { inBase = false; } // PR đầu tiên tạo tệp thì được
    if (inBase && git('diff', 'HEAD^1', 'HEAD', '--', FLOOR)) { console.error(`✗ cpack-pr-clean: PR sửa ${FLOOR} – tệp của bot (cpack-floor.yml), PR không được sửa. Cần vượt phụ cấp: scripts/test/cpack-notes/<nhánh>.md`); process.exit(1); }
    console.log('✓ cpack-pr-clean: PR không sửa mốc bot cpack-floor.json');
  } else console.log('• cpack-pr-clean: checkout không phải merge commit – bỏ qua kiểm PR');
} else console.log('• cpack-pr-clean: không phải pull_request – bỏ qua kiểm PR (bot ghi cpack-floor.json, không sửa budget.json)');
