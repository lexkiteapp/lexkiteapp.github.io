// Thuê tài nguyên cho 1 việc nền (điều phối: functions/api/jobs.js, sổ: infra/jobs.json, docs/JOBS.md).
//   node scripts/jobs/lease.mjs acquire <job> [--wait-min N] [--force = chạy tay việc đang paused]   → GITHUB_OUTPUT skip=0|1, reason=…; (GITHUB_ENV JOB_RUN=<run>)
//   node scripts/jobs/lease.mjs release <job> [--status success|failure|cancelled] [--reason "…"] [--reads N]
// Luật: bị từ chối (đang có việc khác giữ / ngân sách D1 gần cạn / 429) → skip=1, thoát 0 (bước sau `if: steps.lease.outputs.skip != '1'`); KHÔNG thử lại ngoài --wait-min.
// Điều phối hỏng/không phản hồi (5xx, mạng, không khoá): việc DÙNG CHUNG (tài nguyên độc quyền, D1, AI, Drive…) → FAIL-CLOSED (skip=1, không chạy); chỉ việc tầm thường (chỉ phút GitHub) chạy tiếp.
// Đầu ra: ai_main_neurons = neuron Workers AI tài khoản chính được cấp cho việc nền (mặc định 0) → workflow đưa vào --neurons / VIMG_MAX_MAIN; env LEASE_AI_MAIN_NEURONS.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { driveSign, driveCliKey } from '../video/library.mjs';

/** Việc nặng/dùng chung (không chỉ phút GitHub) → fail-closed: điều phối hỏng/không phản hồi = KHÔNG chạy. Việc tầm thường (chỉ gh_minutes/grabcast_ai) → chạy tiếp. Khớp functions/api/_jobs.js failClosed. */
export function failClosed(jobId, reg) {
  try { reg = reg || JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../infra/jobs.json'), 'utf8')); } catch { return true; }
  const j = reg.jobs.find(x => x.id === jobId); return !j || j.resources.some(r => r !== 'gh_minutes' && r !== 'grabcast_ai');
}
/** Quyết định khi gọi acquire: { skip, reason } từ (status, body). */
export function decide(status, j, closed) {
  if (status === 200 && j.ok) return { skip: 0 };
  if (status === 200 && j.skip) return { skip: 1, reason: j.reason };
  if (status === 429 || status === 403 || status === 400) return { skip: 1, reason: `coordinator ${status} ${j.error || ''}` };
  return closed ? { skip: 1, reason: `điều phối không phản hồi (${status} ${j.error || ''} ${j.cause || ''}) – việc dùng chung phải có thuê (fail-closed)` } : { skip: 0, warn: true };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
async function main() {
  const [cmd, job, ...rest] = process.argv.slice(2), opt = n => { const i = rest.indexOf('--' + n); return i >= 0 ? rest[i + 1] : undefined; };
  const BASE = String(process.env.LEXKITE_API_BASE || 'https://lexkite.com').replace(/\/+$/, '');
  const run = `${process.env.GITHUB_RUN_ID || 'local'}-${process.env.GITHUB_RUN_ATTEMPT || 1}-${job}${process.env.LEASE_SHARD ? '-s' + process.env.LEASE_SHARD : ''}`;   // LEASE_SHARD: mỗi việc ma trận một lượt thuê riêng
  const out = (k, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${String(v).replace(/\n/g, ' ')}\n`); };
  async function call(body) {
    const key = driveCliKey(); if (!key) return { status: 0, j: { error: 'no-key' } };
    const text = JSON.stringify(body);
    try { const r = await fetch(BASE + '/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json', ...driveSign(key, text) }, body: text }); return { status: r.status, j: await r.json().catch(() => ({})) }; }
    catch (e) { return { status: 0, j: { error: 'network' } }; }
  }
  if (!job || !['acquire', 'release'].includes(cmd)) { console.error('Dùng: lease.mjs acquire|release <job> [--wait-min N] [--force]'); process.exit(2); }
  if (cmd === 'acquire') {
    const deadline = Date.now() + (+opt('wait-min') || 0) * 60e3, closed = failClosed(job);
    for (;;) {
      const { status, j } = await call({ op: 'acquire', job, run, force: rest.includes('--force') });
      const d = decide(status, j, closed);
      if (!d.skip) {
        if (j.ok) {
          console.log(`✓ lease ${job}: ${(j.leased || []).join(',') || '(không tài nguyên độc quyền)'}${j.grants ? ' · cấp ' + JSON.stringify(j.grants) : ''}`);
          out('skip', 0); out('run', run); out('ai_main_neurons', (j.grants || {}).workers_ai ?? 0); out('ai_b_neurons', (j.grants || {}).workers_ai_b ?? 0);
          if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, `JOB_RUN=${run}\nLEASE_AI_MAIN_NEURONS=${(j.grants || {}).workers_ai ?? 0}\nLEASE_AI_B_NEURONS=${(j.grants || {}).workers_ai_b ?? 0}\n`);
        } else { console.log(`⚠ điều phối không phản hồi (${status} ${j.error || ''}) → việc tầm thường, chạy không thuê`); out('skip', 0); out('run', run); out('ai_main_neurons', 0); if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, 'LEASE_AI_MAIN_NEURONS=0\n'); }
        break;
      }
      if (status === 200 && j.skip && Date.now() < deadline) { console.log('… chờ: ' + d.reason); await new Promise(r => setTimeout(r, 120e3)); continue; }
      console.log(`⏭ bỏ qua ${job}: ${d.reason}`); out('skip', 1); out('reason', d.reason); out('ai_main_neurons', 0); out('ai_b_neurons', 0);
      if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `⏭ ${job} bỏ qua: ${d.reason}\n`);
      break;
    }
  } else {
    const { status, j } = await call({ op: 'release', job, run, status: opt('status') || 'success', reason: opt('reason'), reads: opt('reads') });
    console.log(status === 200 ? `✓ release ${job}` : `⚠ release ${job}: ${status} ${j.error || ''}`);
  }
}
