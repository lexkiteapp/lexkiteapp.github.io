#!/usr/bin/env node
// Dựng lại tệp sinh không commit trong PR (scripts/lib/generated.mjs) từ NGUỒN trong cây làm việc: gói dịch (i18n-pack) + extension/app (build-extension.sh).
// Chạy tự động ở `npm ci` (postinstall) khi GITHUB_EVENT_NAME=pull_request hoặc GEN_REGEN=1 (npm-test.yml, cả khi Prod release gọi lại) → mọi workflow PR có npm ci
// đều thấy bản sinh khớp nguồn của PR, không cần PR commit chúng. Ngoài CI/PR: không làm gì (máy người dùng/Cloudflare build không bị đụng).
//   --needed [--ext]  (action gen-if-needed): chỉ PR, chỉ khi PR đổi NGUỒN bản sinh (so với base) – i18n-pack, thêm extension/app nếu --ext; không rõ → dựng
//   node scripts/ci/regen-generated.mjs --if-ci   chỉ chạy khi PR/GEN_REGEN     node scripts/ci/regen-generated.mjs   chạy ngay
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { needsRegen } from '../lib/generated.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (process.argv.includes('--if-ci') && process.env.GITHUB_EVENT_NAME !== 'pull_request' && process.env.GEN_REGEN !== '1') process.exit(0);
// checkout thưa (sparse-checkout, vd. report-shots.yml) không đủ nguồn để dựng → bỏ qua, không làm đỏ `npm i`
if (process.argv.includes('--if-ci') && !['i18n/ui', 'web/app', 'extension/manifest.json', 'scripts/build-extension.sh'].every(p => fs.existsSync(path.join(ROOT, p)))) process.exit(0);
if (process.argv.includes('--needed')) {
  const ext = process.argv.includes('--ext');
  if (process.env.GITHUB_EVENT_NAME !== 'pull_request' || !['i18n/ui', 'scripts/lib/i18n-pack.mjs'].every(p => fs.existsSync(path.join(ROOT, p)))) process.exit(0);
  let files = null; const base = process.env.BASE_SHA;
  try { if (base) { execFileSync('git', ['fetch', '-q', '--depth=1', 'origin', base], { cwd: ROOT, stdio: 'ignore' }); files = execFileSync('git', ['diff', '--name-only', base, 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean); } } catch { files = null; }
  if (files && !needsRegen(files, ext)) { console.log('• gen-if-needed: PR không đổi nguồn bản sinh – bỏ qua'); process.exit(0); }
  execFileSync('node', ['scripts/i18n-pack.mjs'], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
  for (const tl of ['es', 'fr']) if (fs.existsSync(path.join(ROOT, 'content/target', tl))) execFileSync('node', ['scripts/target/drill-pack.mjs', '--tl', tl], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
  if (ext && fs.existsSync(path.join(ROOT, 'scripts/build-extension.sh'))) { execFileSync('bash', ['scripts/build-extension.sh'], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] }); try { execFileSync('git', ['checkout', '-q', '--', 'extension/academic.json'], { cwd: ROOT }); } catch { /* không đổi */ } }
  console.log('✓ gen-if-needed: bản sinh dựng lại từ nguồn của PR'); process.exit(0);
}
const run = (c, a) => execFileSync(c, a, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
run('node', ['scripts/i18n-pack.mjs']);
for (const tl of ['es', 'fr']) if (fs.existsSync(path.join(ROOT, 'content/target', tl))) run('node', ['scripts/target/drill-pack.mjs', '--tl', tl]);   // 26/11: gói es/fr sinh từ content/target
run('bash', ['scripts/build-extension.sh']);   // chạy lại i18n-pack (idempotent) rồi chép web/ → extension/app
try { run('git', ['checkout', '-q', '--', 'extension/academic.json']); } catch { /* không phải kho git / không đổi */ } // như prepush: bỏ thay đổi phụ
if (fs.existsSync(path.join(ROOT, 'scripts/jobs/gen.mjs'))) run('node', ['scripts/jobs/gen.mjs', '--derived']);   // docs/JOBS.md + functions/api/_jobs_reg.js từ infra/jobs.json (25/11)
console.log('✓ regen-generated: gói dịch + extension/app + sổ việc dựng lại từ nguồn');
