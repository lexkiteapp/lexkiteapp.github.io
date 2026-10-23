// Thuê tài nguyên cho 1 việc nền (điều phối: functions/api/jobs.js, sổ: infra/jobs.json, docs/JOBS.md).
//   node scripts/jobs/lease.mjs acquire <job> [--wait-min N] [--force = chạy tay việc đang paused]   → GITHUB_OUTPUT skip=0|1, reason=…; (GITHUB_ENV JOB_RUN=<run>)
//   node scripts/jobs/lease.mjs release <job> [--status success|failure|cancelled] [--reason "…"] [--reads N]
// Luật: bị từ chối (đang có việc khác giữ / ngân sách D1 gần cạn / 429) → skip=1, thoát 0 (bước sau `if: steps.lease.outputs.skip != '1'`); KHÔNG thử lại ngoài --wait-min.
// Lỗi mạng/5xx của dịch vụ điều phối → chạy tiếp (skip=0) kèm cảnh báo: việc nền tự gặp cầu dao D1 nếu thật sự hết hạn mức.
import fs from 'fs';
import { driveSign, driveCliKey } from '../video/library.mjs';

const [cmd, job, ...rest] = process.argv.slice(2), opt = n => { const i = rest.indexOf('--' + n); return i >= 0 ? rest[i + 1] : undefined; };
const BASE = String(process.env.LEXKITE_API_BASE || 'https://lexkite.com').replace(/\/+$/, '');
const run = `${process.env.GITHUB_RUN_ID || 'local'}-${process.env.GITHUB_RUN_ATTEMPT || 1}-${job}`;
const out = (k, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${String(v).replace(/\n/g, ' ')}\n`); };
async function call(body) {
  const key = driveCliKey(); if (!key) return { status: 0, j: { error: 'no-key' } };
  const text = JSON.stringify(body);
  try { const r = await fetch(BASE + '/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json', ...driveSign(key, text) }, body: text }); return { status: r.status, j: await r.json().catch(() => ({})) }; }
  catch (e) { return { status: 0, j: { error: 'network' } }; }
}
if (!job || !['acquire', 'release'].includes(cmd)) { console.error('Dùng: lease.mjs acquire|release <job>'); process.exit(2); }
if (cmd === 'acquire') {
  const deadline = Date.now() + (+opt('wait-min') || 0) * 60e3;
  for (;;) {
    const { status, j } = await call({ op: 'acquire', job, run, force: rest.includes('--force') });
    if (status === 200 && j.ok) { console.log(`✓ lease ${job}: ${(j.leased || []).join(',') || '(không tài nguyên độc quyền)'}`); out('skip', 0); out('run', run); if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, `JOB_RUN=${run}\n`); break; }
    if (status === 200 && j.skip) { if (Date.now() < deadline) { console.log('… chờ: ' + j.reason); await new Promise(r => setTimeout(r, 120e3)); continue; } console.log(`⏭ bỏ qua ${job}: ${j.reason}`); out('skip', 1); out('reason', j.reason); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `⏭ ${job} bỏ qua: ${j.reason}\n`); break; }
    if (status === 429 || status === 403 || status === 400) { console.log(`⏭ bỏ qua ${job}: dịch vụ điều phối trả ${status} ${j.error || ''}`); out('skip', 1); out('reason', `coordinator ${status} ${j.error || ''}`); break; }
    console.log(`⚠ điều phối không phản hồi (${status} ${j.error || ''}) → chạy không thuê`); out('skip', 0); out('run', run); break;
  }
} else {
  const { status, j } = await call({ op: 'release', job, run, status: opt('status') || 'success', reason: opt('reason'), reads: opt('reads') });
  console.log(status === 200 ? `✓ release ${job}` : `⚠ release ${job}: ${status} ${j.error || ''}`);
}
