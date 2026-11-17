// Test red-report: phân loại PR đỏ theo nguyên nhân (thuần, không mạng).
import { classify, commonChecks, report, STALE_DAYS } from '../ci/red-report.mjs';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const f = (name, conclusion = 'failure', passedBefore = false) => ({ name, conclusion, passedBefore });
ok(classify({ failed: [] }) === null, 'không check đỏ → null');
ok(classify({ failed: [f('a', 'cancelled'), f('b', 'startup_failure')] }).group === 'infra', 'chỉ huỷ/startup → infra');
ok(classify({ failed: [f('npm test', 'failure', true)] }).group === 'flaky', 'đỏ nhưng cùng sha từng đạt → flaky');
ok(classify({ failed: [f('x')], gateDesc: 'Main đã đổi tệp cổng (a.mjs): gộp lại' }).group === 'drift', 'gate báo main đổi cổng → drift');
ok(classify({ failed: [f('npm test shard 7/8')] }, new Set(['npm test shard 7/8'])).group === 'drift', 'check đỏ chung nhiều PR → drift');
ok(classify({ failed: [f('only-mine'), f('npm test')] }, new Set(['npm test'])).group === 'real', 'có check đỏ riêng → real');
const prs = [1, 2, 3].map(n => ({ number: n, failed: [f('measure (phone)')] })).concat([{ number: 4, failed: [f('e2e')], createdAt: new Date(Date.now() - 20 * 864e5).toISOString() }, { number: 5, failed: [] }]);
ok(commonChecks(prs).has('measure') && !commonChecks(prs).has('e2e'), 'commonChecks bỏ hậu tố (…) đúng');
const r = report(prs);
ok(r.groups.drift.length === 3 && r.groups.real.length === 1 && r.red === 4, 'report gom 3 drift + 1 real');
ok(r.stale.length === 1 && r.stale[0].n === 4 && r.stale[0].days >= STALE_DAYS, 'report liệt kê PR quá cũ');
ok(/#4/.test(r.md) && /Chập chờn/.test(r.md), 'markdown đủ nhóm');
if (bad) process.exit(1);
