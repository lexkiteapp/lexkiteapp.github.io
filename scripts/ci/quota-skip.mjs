#!/usr/bin/env node
/* Bỏ qua TRUNG TÍNH khi hạn mức D1 / cầu dao chặn việc nền (docs/METHODS.md: "CI dừng, mai chạy tiếp, KHÔNG thử lại").
 *   node scripts/ci/quota-skip.mjs <lệnh> [đối số…]
 * - Chạy lệnh, chuyển nguyên stdout/stderr ra log. Lệnh thoát 0 → 0.
 * - Lệnh lỗi VÀ đầu ra có dấu hiệu hạn mức (429 quota-guard · d1-budget · d1-limit · lỗi "D1 … daily … limit") → ::notice + tóm tắt job,
 *   ghi QUOTA_SKIP=1 vào $GITHUB_ENV (các bước bọc sau đó tự bỏ qua) và thoát 0. Cron/coordinator lượt sau chạy tiếp.
 * - Lỗi khác (500, bug thật…) → giữ nguyên mã thoát: vẫn đỏ, ci-triage.yml phân loại / chạy lại / mở issue.
 * - QUOTA_SKIP=1 đã có (bước trước bị chặn) → không chạy lệnh, thoát 0. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const QUOTA_RE = /\b(quota-guard|d1-budget|d1-limit)\b|D1[^\n]{0,80}\b(daily|rows? read|reads?|writes?)\b[^\n]{0,60}\b(limit|exceeded|quota)\b/i;
export const isQuota = text => QUOTA_RE.test(String(text || ''));

function note(cmd, why, penv = process.env) {
  const msg = `Hạn mức D1 / cầu dao việc nền đang chặn (${why}) – bỏ qua trung tính, lượt cron sau (hoặc sau 00:10 UTC khi hạn mức đặt lại) sẽ chạy tiếp.`;
  console.log(`::notice title=Bỏ qua do hạn mức D1::${msg}`);
  const sum = penv.GITHUB_STEP_SUMMARY;
  if (sum) try { fs.appendFileSync(sum, `### ⏸ Bỏ qua do hạn mức D1\n- Lệnh: \`${cmd.slice(0, 160).replace(/`/g, "'")}\`\n- ${msg}\n`); } catch { /* */ }
  const env = penv.GITHUB_ENV;
  if (env) try { fs.appendFileSync(env, 'QUOTA_SKIP=1\n'); } catch { /* */ }
}

export function run(argv, { env = process.env, out = process.stdout, err = process.stderr } = {}) {
  const cmd = argv.join(' ');
  if (!argv.length) { err.write('quota-skip: thiếu lệnh\n'); return Promise.resolve(2); }
  if (env.QUOTA_SKIP === '1') { out.write(`⏸ bỏ qua (QUOTA_SKIP=1 từ bước trước): ${cmd.slice(0, 160)}\n`); return Promise.resolve(0); }
  return new Promise(resolve => {
    let tail = ''; const keep = b => { tail = (tail + b.toString()).slice(-400000); };
    const p = spawn(argv[0], argv.slice(1), { stdio: ['inherit', 'pipe', 'pipe'], env });
    p.stdout.on('data', b => { out.write(b); keep(b); });
    p.stderr.on('data', b => { err.write(b); keep(b); });
    p.on('error', e => { err.write(`quota-skip: ${e.message}\n`); resolve(127); });
    p.on('close', (code, sig) => {
      const rc = code == null ? 1 : code;
      if (rc !== 0 && isQuota(tail)) { note(cmd, (tail.match(QUOTA_RE) || [''])[0].slice(0, 60), env); return resolve(0); }
      if (sig) err.write(`quota-skip: lệnh bị dừng bởi ${sig}\n`);
      resolve(rc);
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run(process.argv.slice(2)).then(rc => process.exit(rc));
