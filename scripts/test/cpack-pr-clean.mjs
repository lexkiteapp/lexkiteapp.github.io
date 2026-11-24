// Cổng "PR không sửa trần web/cpack trong budget.json" (24/11, gốc xung đột): trần lười do bot giữ (scripts/test/cpack-floor.json, scripts/lib/cpack-floor.mjs);
// PR cần vượt phụ cấp → scripts/test/cpack-notes/<nhánh>.md. Trên pull_request (checkout = merge commit, cha 1 = main) diff budget.json không được thêm/sửa cpackTotal/_cpackNote….
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { ceilingEdits, noteExtra, ALLOWANCE } from '../lib/cpack-floor.mjs';
assert.equal(ceilingEdits('-  "cpackTotal": 1,\n+  "cpackTotal": 2,\n+  "_cpackNote20": "x",\n   "other": 1').length, 2);
assert.equal(ceilingEdits('-  "cpackTotal": 1,').length, 0);
assert.equal(ceilingEdits('+  "contentWarn": 14,\n+  "_totalJsNote": "x"').length, 0);
assert.ok(ALLOWANCE > 0 && noteExtra() >= 0);
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
  let parents = 0; try { parents = git('rev-list', '--parents', '-n', '1', 'HEAD').split(' ').length - 1; } catch { /* không phải git */ }
  if (parents === 2) {
    const bad = ceilingEdits(git('diff', '-U0', 'HEAD^1', 'HEAD', '--', 'scripts/test/budget.json'));
    if (bad.length) { console.error(`✗ cpack-pr-clean: PR sửa trần web/cpack trong budget.json (${bad.length} dòng, vd. ${bad[0].trim().slice(0, 60)}) → mọi PR khác xung đột. Trần do bot giữ (scripts/test/cpack-floor.json); cần vượt phụ cấp: thêm scripts/test/cpack-notes/<nhánh>.md (dòng "cpack-extra: <byte>" + lý do) – docs/CI-RUNNERS.md › Trần web/cpack`); process.exit(1); }
    console.log('✓ cpack-pr-clean: PR không sửa trần web/cpack trong budget.json');
  } else console.log('• cpack-pr-clean: checkout không phải merge commit – bỏ qua kiểm PR');
} else console.log('• cpack-pr-clean: không phải pull_request – bỏ qua kiểm PR (bot ghi cpack-floor.json, không sửa budget.json)');
