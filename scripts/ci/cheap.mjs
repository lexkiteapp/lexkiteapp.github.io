#!/usr/bin/env node
// Check RẺ (< 3 phút, không trình duyệt) = tín hiệu "main đỏ" nhanh nhất. Dùng chung cho 2 máy gác (docs/CI-RUNNERS.md › Máy gác main đỏ 23/11):
//   1) cheap-revert.mjs: push main làm đỏ check rẻ → bisect commit gây đỏ → PR revert nhãn main-red-fix (workflow main-red-revert.yml).
//   2) merge-recheck: PR ghép với main HIỆN TẠI vẫn phải qua check rẻ (hai PR riêng xanh, ghép vượt ngân sách – 23/11: 4b25693 + 49c55e6 vượt 220 B).
// CLI (chạy trong cây làm việc hiện tại):
//   node scripts/ci/cheap.mjs run [--ids a,b] [--out r.json]      chạy check rẻ, in ✓/✗, mã 1 nếu đỏ, ghi {red:[id…]} nếu có --out
//   node scripts/ci/cheap.mjs post --sha S --main M --result r.json   ghi commit status `merge-recheck` (success|failure + "main@<8>")
// Test thuần: scripts/test/main-guards.mjs. Ngưỡng của từng check nằm trong chính check – KHÔNG đổi ở đây (no-cuts).
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { isMain } from '../lib/is-main.mjs';

export const CONTEXT = 'merge-recheck';
/** Mỗi check phải có NGUYÊN DÒNG trong scripts/test/suite.txt (test chính sách kiểm) – đỏ ở đây = đỏ trong npm test. */
export const CHEAP = [
  { id: 'size-budget', cmd: 'node scripts/test/size-budget.mjs' },
  { id: 'docs-budget', cmd: 'node scripts/test/docs-budget.mjs' },
  { id: 'content-qa', cmd: 'node scripts/content-qa/gate.mjs' },
  { id: 'fmt', cmd: 'node scripts/test/fmt-stable.mjs' },
];
export const TIMEOUT_MS = 4 * 60e3;

/** Chạy các check rẻ trong cwd → [{ id, ok, out }]. Hết giờ/không chạy được = đỏ (không bao giờ mở cổng khi không đo được). */
export function runCheap(cwd = process.cwd(), ids = null) {
  return CHEAP.filter(c => !ids || ids.includes(c.id)).map(c => {
    const r = spawnSync('bash', ['-c', c.cmd], { cwd, encoding: 'utf8', timeout: TIMEOUT_MS, maxBuffer: 1 << 26 });
    return { id: c.id, ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}`.split('\n').filter(l => !l.startsWith('✓')).slice(0, 12).join('\n') };
  });
}

/**
 * Hàm thuần: commits cũ→mới, commits[0] đã biết XANH ở cha của nó, phần tử cuối đỏ → chỉ số commit ĐẦU TIÊN đỏ (nhị phân, giả định đơn điệu:
 * đỏ rồi thì các commit sau cũng đỏ tới khi ai đó sửa). isBad(i) đo commit i. Đo ≤ ⌈log2 n⌉ lần.
 */
export function firstBad(n, isBad) {
  let lo = 0, hi = n - 1;                    // hi luôn đỏ
  while (lo < hi) { const mid = (lo + hi) >> 1; if (isBad(mid)) hi = mid; else lo = mid + 1; }
  return hi;
}

/** Hàm thuần: status `merge-recheck` + số commit main đã đi tiếp từ main lúc đo (aheadBy; null = không biết) → 'clear' | 'wait' | 'fail' | 'stale'.
 *  Chịu lệch ≤ TOLERANCE commit (main đổi liên tục – đòi đúng đầu main sẽ đuổi mãi); merge-window-pr.sh thì đo lại đúng đầu main ngay trước khi gộp. */
export const TOLERANCE = 5;
export function recheckVerdict(status, aheadBy, tol = TOLERANCE) {
  if (!status || !/main@[0-9a-f]{8}/.test(status.description || '') || aheadBy == null || aheadBy > tol) return 'stale';
  return status.state === 'success' ? 'clear' : status.state === 'pending' ? 'wait' : 'fail';
}

/** Hàm thuần: ghép kết quả → { state, description } cho commit status (success khi mọi check xanh). */
export function statusOf(results, main) {
  const red = results.filter(r => !r.ok).map(r => r.id), tag = String(main || '').slice(0, 8);
  return red.length ? { state: 'failure', description: `main@${tag}: ghép với main đỏ ${red.join(', ')}` } : { state: 'success', description: `main@${tag}: check rẻ xanh khi ghép main` };
}

async function post({ sha, main, result }) {
  const res = fs.existsSync(result) ? JSON.parse(fs.readFileSync(result, 'utf8')) : null, s = statusOf(res ? res.results : [{ id: 'không đo được', ok: false }], main);
  const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/statuses/${sha}`, { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json' }, body: JSON.stringify({ ...s, context: CONTEXT }) });
  console.log(`merge-recheck ${sha.slice(0, 8)} → ${s.state}: ${s.description} (HTTP ${r.status})`);
  if (r.status !== 201) process.exitCode = 1;
}

if (isMain(import.meta.url)) {
  const a = process.argv.slice(2), arg = k => a.includes(k) ? a[a.indexOf(k) + 1] : undefined;
  if (a[0] === 'post') post({ sha: arg('--sha'), main: arg('--main'), result: arg('--result') }).catch(e => { console.error(e); process.exit(1); });
  else {
    const results = runCheap(process.cwd(), arg('--ids') ? arg('--ids').split(',') : null);
    for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.id}${r.ok ? '' : '\n' + r.out}`);
    if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify({ results: results.map(({ id, ok }) => ({ id, ok })) }));
    process.exit(results.every(r => r.ok) ? 0 : 1);
  }
}
