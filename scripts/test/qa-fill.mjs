// Kiểm phần QA mở rộng của ci-filler (#370): sổ có đủ 8 QA, trần shard/chặn trùng (chuyển từ idle-filler cũ), cùng-sha, qa-backlog, upgrade-audit.
import fs from 'node:fs';
import { capacity, shardsFor, plan, eligible, loadRegistry, sameShaDone } from '../ci/filler.mjs';
import { merge, OWNERS, key } from '../ci/qa-backlog.mjs';
import { check, measured } from '../ci/upgrade-audit.mjs';
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.error('✗ qa-fill: ' + m); } };
const POOL = ['qa-bot.yml', 'visual-qa.yml', 'journey-e2e.yml', 'web-sweep.yml', 'ux-cards.yml', 'content-qa.yml', 'lighthouse.yml', 'ext-e2e.yml'];
const reg = loadRegistry(), byWf = Object.fromEntries(reg.entries.map(e => [e.workflow, e]));
for (const w of POOL) { ok(!!byWf[w] && eligible(byWf[w]), w + ' phải có trong infra/ci-backlog.json và đủ điều kiện'); ok(byWf[w] && byWf[w].probe.stale_hours > 0, w + ' cần probe stale_hours (xoay vòng theo độ cũ)'); }
// trần: busy ≥ 32 → 0; shard = min(trần, 40 − busy − 8); không ăn vào 8 runner dự trữ (chuyển từ idle-filler cũ)
ok(capacity({ busy: 32, starved: 0 }) === 0 && capacity({ busy: 39, starved: 0 }) === 0 && capacity({ busy: 0, starved: 1 }) === 0, 'busy≥32 hoặc đói → 0');
for (let b = 0; b <= 60; b++) { const f = capacity({ busy: b, starved: 0 }); ok(f >= 0 && b + f <= 32 || f === 0, `không ăn vào 8 dự trữ b=${b}`); ok(f === Math.max(0, b >= 32 ? 0 : 40 - b - 8), `capacity b=${b}`); }
ok(shardsFor({ jobs: 1 }, 0) === 0 && shardsFor({ jobs: 1 }, 1) === 1, 'mục 1 job cần đúng 1 chỗ');
// chặn trùng + cùng sha
const E = POOL.map(w => byWf[w]), act = new Set([POOL[0]]);
const p = plan(E, { free: 40, active: act, left: () => 1 }), by = Object.fromEntries(p.map(s => [s.id, s]));
ok(by[byWf[POOL[0]].id].act === 'skip' && /trùng/.test(by[byWf[POOL[0]].id].why), 'đang chạy → không bắn trùng');
ok(p.filter(s => s.act === 'dispatch').length === POOL.length - 1, 'còn lại được bắn');
ok(sameShaDone({ head_sha: 'a', conclusion: 'success' }, 'a') && !sameShaDone({ head_sha: 'a', conclusion: 'failure' }, 'a') && !sameShaDone({ head_sha: 'b', conclusion: 'success' }, 'a') && !sameShaDone(undefined, 'a'), 'cùng sha đã xanh → bỏ; khác sha/đỏ → chạy');
// qa-backlog: 1 dòng/lỗi, không trùng, mọi workflow có file sở hữu thật
for (const w of POOL) { ok(!!OWNERS[w], 'OWNERS thiếu ' + w); if (OWNERS[w]) ok(fs.existsSync(OWNERS[w][0]), `file sở hữu ${OWNERS[w][0]} không tồn tại`); }
const item = { wf: 'qa-bot.yml', job: 'j', step: 's', url: 'https://x/1', date: '2026-11-01' };
const [t1, n1] = merge('# t\n', [item, item]); const [t2, n2] = merge(t1, [item]);
ok(n1 === 1 && n2 === 0 && t2 === t1, 'qa-backlog không thêm trùng khoá ' + key('qa-bot.yml', 'j', 's'));
ok(t1.trim().split('\n').filter(l => l.startsWith('- [ ]')).every(l => /file: `.+` \| repro: `.+`/.test(l)), 'dòng có file + repro');
// kiểm toán nâng cấp
ok(check(fs.readFileSync('docs/specs/upgrade-audit.md', 'utf8')).length === 0, 'upgrade-audit.md hợp lệ: ' + check(fs.readFileSync('docs/specs/upgrade-audit.md', 'utf8')).join(';'));
ok(check('x\n'.repeat(200)).some(b => /1 trang/.test(b)), 'audit > 1 trang bị chặn');
ok(/hiệu năng 9\d/.test(measured(JSON.parse(fs.readFileSync('reports/lighthouse.json', 'utf8')))), 'measured đọc được Lighthouse');
if (fail) process.exit(1); console.log('✓ qa-fill: sổ 8 QA, trần, chặn trùng/cùng sha, backlog, kiểm toán');
await import('./qs-fix-queue.mjs');   // hàng sửa quality-sweep (issue qs-fix) – cùng lệnh npm test
