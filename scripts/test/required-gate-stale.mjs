// Test thuần: bộ canh required-gate không được bỏ sót job sau / rerun / ETag 304 (PR #710 05/11, #602 04/11).
import { dirtyShas, probeOf, evaluate } from '../ci/required-gate.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('✗ ' + m); } else console.log('✓ ' + m); };
const iso = ms => new Date(ms).toISOString();
const run = (o) => ({ head_sha: 'a', path: '.github/workflows/qa.yml', name: 'QA bot', ...o });
const cr = (id, status, conclusion, at) => ({ id, status, conclusion, completed_at: at ? iso(at) : null });
const T0 = 1_000_000e3;

// (a) job sau xong muộn: lượt QA bot bị đẩy khỏi 100 lượt gần nhất (runs = []), run không hiện, nhưng check-runs đổi → chữ ký đổi
{
  const before = [cr(1, 'completed', 'success', T0), cr(2, 'in_progress', null)];
  const after = [cr(1, 'completed', 'success', T0), cr(2, 'completed', 'success', T0 + 60e3)];
  const seen = new Map([['a', { at: T0, state: 'pending', sig: probeOf(before).sig }]]);
  const w = new Map();
  ok(dirtyShas({ shas: ['a'], runs: [], seen, now: T0 + 90e3, probes: new Map([['a', probeOf(after)]]), why: w }).join() === 'a' && w.get('a') === 'sig', '(a) job sau xong, run không còn trong danh sách → chữ ký check-runs đổi → đánh giá');
  ok(!dirtyShas({ shas: ['a'], runs: [], seen, now: T0 + 90e3, probes: new Map([['a', probeOf(before)]]) }).length, '(a) chưa đổi gì và còn check đang chạy → không đánh giá thừa');
}
// (b) rerun: run_id giữ nguyên, run_attempt tăng, updated_at không mới hơn lần đọc (đồng hồ lệch)
{
  const seen = new Map([['a', { at: T0, state: 'success', attempts: { 7: 1 } }]]);
  const runs = [run({ id: 7, run_attempt: 2, status: 'queued', conclusion: null, updated_at: iso(T0 - 1e3) })];
  ok(dirtyShas({ shas: ['a'], runs, seen, now: T0 + 5e3 }).join() === 'a', '(b) rerun: run_attempt tăng → đánh giá dù updated_at cũ');
  ok(!dirtyShas({ shas: ['a'], runs: [{ ...runs[0], run_attempt: 1 }], seen, now: T0 + 5e3 }).length, '(b) cùng attempt, không đổi → bỏ qua');
}
// (c) ETag 304 che thay đổi: danh sách runs trả bản cũ, check-runs không thăm dò được → lưới 5 phút
{
  const probe = probeOf([cr(1, 'completed', 'success', T0)]);
  const seen = new Map([['a', { at: T0, state: 'pending', sig: probe.sig }]]);
  const w = new Map();
  ok(dirtyShas({ shas: ['a'], runs: [], seen, now: T0 + 4 * 60e3, probes: new Map([['a', probe]]) }).length === 0, '(c) pending 4 phút → chưa ép');
  ok(dirtyShas({ shas: ['a'], runs: [], seen, now: T0 + 5 * 60e3, probes: new Map([['a', probe]]), why: w }).join() === 'a' && w.get('a') === 'stale', '(c) pending ≥5 phút, không check nào queued/in_progress → bắt buộc đánh giá lại (gate-stale)');
  const act = probeOf([cr(1, 'in_progress', null)]);
  ok(!dirtyShas({ shas: ['a'], runs: [], seen: new Map([['a', { at: T0, state: 'pending', sig: act.sig }]]), now: T0 + 6 * 60e3, probes: new Map([['a', act]]) }).length, '(c) còn check đang chạy → không ép (chờ bình thường)');
}
// (d) ca chặn #717 (05/11): e2e bị hủy → gate đỏ; lượt e2e MỚI chạy rồi xanh (run mới trượt khỏi 100 lượt gần nhất) → gate phải xanh, không còn status đỏ cũ
{
  const e2e = (id, number, status, conclusion, at) => ({ id, run_number: number, workflow_id: 'e2e', name: 'e2e', path: '.github/workflows/e2e.yml', head_sha: 'a', status, conclusion, run_attempt: 1, updated_at: iso(at) });
  const other = cr(9, 'completed', 'success', T0);
  const cancelled = [other, { ...cr(1, 'completed', 'cancelled', T0 + 10e3), name: 'e2e' }];
  const red = evaluate({ checkRuns: cancelled, workflowRuns: [e2e(100, 1, 'completed', 'cancelled', T0 + 10e3)] });
  ok(red.state === 'failure', '(d) lượt e2e bị hủy → gate đỏ');
  // lượt mới bắt đầu: sha đã đánh giá "failure" nên phải được đánh giá lại ngay (không kẹt đỏ)
  const seen = new Map([['a', { at: T0 + 20e3, state: 'failure', attempts: { 100: 1 }, sig: probeOf(cancelled).sig }]]);
  const running = [e2e(100, 1, 'completed', 'cancelled', T0 + 10e3), e2e(101, 2, 'in_progress', null, T0 + 30e3)];
  ok(dirtyShas({ shas: ['a'], runs: running, seen, now: T0 + 40e3 }).join() === 'a', '(d) lượt mới bắt đầu sau lượt bị hủy → đánh giá lại');
  const pend = evaluate({ checkRuns: [other, { ...cr(1, 'completed', 'cancelled', T0 + 10e3), name: 'e2e' }, { ...cr(2, 'in_progress', null), name: 'e2e' }], workflowRuns: running });
  ok(pend.state === 'pending', '(d) lượt mới đang chạy → chờ (lượt hủy cũ không còn tính đỏ)');
  // lượt mới xanh, nhưng run đã trượt khỏi trang runs (runs = []) → chỉ chữ ký check-runs báo; rồi đánh giá phải xanh
  const seen2 = new Map([['a', { at: T0 + 40e3, state: 'pending', sig: probeOf([other, { ...cr(2, 'in_progress', null), name: 'e2e' }]).sig }]]);
  const done = [other, { ...cr(2, 'completed', 'success', T0 + 90e3), name: 'e2e' }];
  ok(dirtyShas({ shas: ['a'], runs: [], seen: seen2, now: T0 + 100e3, probes: new Map([['a', probeOf(done)]]) }).join() === 'a', '(d) lượt mới xanh, run trượt khỏi danh sách → chữ ký đổi → đánh giá lại');
  const green = evaluate({ checkRuns: [...cancelled, { ...cr(2, 'completed', 'success', T0 + 90e3), name: 'e2e' }], workflowRuns: [e2e(100, 1, 'completed', 'cancelled', T0 + 10e3), e2e(101, 2, 'completed', 'success', T0 + 90e3)] });
  ok(green.state === 'success' && !green.failed.length, '(d) lượt mới xanh sau lượt bị hủy → gate xanh, không còn status đỏ cũ');
}
process.exit(bad ? 1 : 0);
