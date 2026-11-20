// Luật 18: quyết định trạng thái phần nặng của commit main + xác định commit nào là thủ phạm (không revert oan).
import assert from 'node:assert/strict';
import { decide, culprit } from '../ci/heavy-main.mjs';
const ok = (c, m) => { assert.ok(c, m); };
const H = ['visual-qa.yml', 'mobile-qa.yml'];
const R = (f, status, conclusion, n = 1) => ({ path: `.github/workflows/${f}`, name: f, status, conclusion, run_number: n, run_attempt: 1, created_at: '2026-11-16T01:00:00Z' });
ok(decide([], H, 1).state === 'wait' && decide([], H, 10).state === 'none', 'chưa có lượt: chờ vài phút rồi coi là không chạm vùng nặng');
ok(decide([R('visual-qa.yml', 'completed', 'success'), R('mobile-qa.yml', 'completed', 'skipped')], H).state === 'green', 'xanh/skipped → green');
ok(decide([R('visual-qa.yml', 'in_progress', null)], H).state === 'wait', 'còn chạy → chờ');
ok(decide([R('visual-qa.yml', 'completed', 'failure'), R('mobile-qa.yml', 'in_progress', null)], H).state === 'wait', 'đỏ nhưng còn lượt khác chạy → chờ hết');
const red = decide([R('visual-qa.yml', 'completed', 'failure'), R('mobile-qa.yml', 'completed', 'success')], H);
ok(red.state === 'red' && red.red.length === 1, 'có lượt đỏ, hết chạy → red');
ok(decide([R('visual-qa.yml', 'completed', 'cancelled')], H).state === 'superseded', 'bị huỷ do commit mới → superseded (không phát OTA lượt này)');
ok(decide([R('visual-qa.yml', 'completed', 'failure', 1), R('visual-qa.yml', 'completed', 'success', 2)], H).state === 'green', 'lượt chạy lại mới nhất xanh → green');
ok(decide([R('other.yml', 'completed', 'failure')], H, 10).state === 'none', 'workflow không nặng bị bỏ qua');
ok(culprit([{ status: 'completed', conclusion: 'success' }]) && culprit([]) && culprit([{ status: 'completed', conclusion: 'cancelled' }, { status: 'completed', conclusion: 'success' }]), 'lượt trước xanh/không có → commit này là thủ phạm');
ok(!culprit([{ status: 'completed', conclusion: 'failure' }]), 'đã đỏ từ trước → không revert oan');
console.log('✓ heavy-main: quyết định trạng thái nặng sau gộp + thủ phạm');
