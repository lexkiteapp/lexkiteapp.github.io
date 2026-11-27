// Hạn mức GITHUB_TOKEN dùng chung (26/11: "API rate limit exceeded for installation"): đo (quota-watch), cắt (required-gate nhịp thưa, autopilot compare xoay vòng).
import fs from 'node:fs';
import { parseQuotaLines, topConsumers, lowQuota, renderSummary, WARN_PCT } from '../ci/quota-watch.mjs';
import { nextWait } from '../ci/required-gate.mjs';
import { compareDue, COMPARE_EVERY, TICK_MS } from '../ci/autopilot.mjs';
import { quotaLine } from '../lib/retry5xx.mjs';
let n = 0, bad = 0; const ok = (c, m) => { n++; if (!c) { bad++; console.error('✗ ' + m); } };
// 1) đọc dòng gh-quota từ log (đúng định dạng quotaLine) + gộp theo workflow
const line = quotaLine('ci-autopilot', { calls: 40, limited: 0, waitedMs: 0, remaining: 300, limit: 1000, firstRemaining: 351, reset: 0, resource: 'core' });
const rows = parseQuotaLines(`x\n2026-11-26T08:00:00Z ${line}\n${quotaLine('required-gate watch', { calls: 100, limited: 1, waitedMs: 5000, remaining: 120, limit: 1000, firstRemaining: 400, reset: 0, resource: '' })}\nnoise`);
ok(rows.length === 2 && rows[0].label === 'ci-autopilot' && rows[0].calls === 40 && rows[0].used === 51 && rows[0].remaining === 300 && rows[0].limit === 1000, 'parseQuotaLines đọc đúng định dạng quotaLine');
const top = topConsumers([...rows, { label: 'ci-autopilot', calls: 10 }]); ok(top[0].label === 'required-gate watch' && top[1].calls === 50 && top[1].runs === 2, 'topConsumers gộp + xếp giảm dần');
ok(lowQuota({ remaining: 150, limit: 1000 }) && !lowQuota({ remaining: 250, limit: 1000 }) && !lowQuota(null) && WARN_PCT === 0.2, 'lowQuota: < 20 % → cảnh báo');
ok(/Còn \*\*150\/1000\*\* \(15 %\)/.test(renderSummary({ remaining: 150, limit: 1000, reset: 1e9 }, top)) && /\| required-gate watch \| 1 \| 100 \|/.test(renderSummary(null, top)), 'renderSummary: số còn lại + bảng top');
// 2) bộ canh: nhịp theo hạn mức + lượt dự phòng
ok(nextWait({ remaining: 900, busy: true }) === 30e3 && nextWait({ remaining: 900 }) === 60e3, 'hạn mức dư → 30 s (bận) / 60 s (rảnh) như cũ');
ok(nextWait({ remaining: 450, busy: true }) === 90e3 && nextWait({ remaining: 250, busy: true }) === 180e3, 'còn < 500 → 90 s, < 300 → 180 s');
ok(nextWait({ remaining: 100, reset: 500e3, now: 100e3 }) === 400e3 && nextWait({ remaining: 100, reset: 100e3, now: 100e3 }) === 60e3, 'còn < 150 → chờ tới reset (tối thiểu 60 s)');
ok(nextWait({ remaining: 900, busy: true, backup: true }) === 180e3, 'đã có bộ canh kế tiếp sống → lượt cũ chỉ hỏi mỗi 180 s');
// 3) autopilot: compare xoay vòng 1/3 số vòng, mỗi PR đều được tới lượt
const now = 1e12; let c = 0; for (let t = 0; t < COMPARE_EVERY; t++) for (let pr = 100; pr < 130; pr++) if (compareDue(pr, now + t * TICK_MS)) c++;
ok(c === 30 && [...Array(COMPARE_EVERY).keys()].every(t => [...Array(30).keys()].some(i => compareDue(100 + i, now + t * TICK_MS))), `compare: 30 PR × ${COMPARE_EVERY} vòng = đúng 30 lượt (mỗi PR 1 lần), mọi vòng đều có việc`);
// 4) quota-watch đã vào sổ việc + workflow + hook step summary
ok(fs.readFileSync('infra/jobs.json', 'utf8').includes('"gh-quota-watch.yml"') && fs.existsSync('.github/workflows/gh-quota-watch.yml'), 'gh-quota-watch có workflow + sổ việc');
ok(/GITHUB_STEP_SUMMARY/.test(fs.readFileSync('scripts/lib/retry5xx.mjs', 'utf8')), 'retry5xx ghi dòng gh-quota vào step summary');
if (bad) { console.error(`gh-quota: ${bad}/${n} trượt`); process.exit(1); }
console.log(`✓ gh-quota: ${n} kiểm tra đạt (đo, nhịp bộ canh, compare xoay vòng)`);
