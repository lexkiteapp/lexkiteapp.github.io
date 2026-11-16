#!/usr/bin/env node
// Dựng lại tệp sinh không commit trong PR (scripts/lib/generated.mjs) từ NGUỒN trong cây làm việc: gói dịch (i18n-pack) + extension/app (build-extension.sh).
// Chạy tự động ở `npm ci` (postinstall) khi GITHUB_EVENT_NAME=pull_request hoặc GEN_REGEN=1 (npm-test.yml, cả khi Prod release gọi lại) → mọi workflow PR có npm ci
// đều thấy bản sinh khớp nguồn của PR, không cần PR commit chúng. Ngoài CI/PR: không làm gì (máy người dùng/Cloudflare build không bị đụng).
//   node scripts/ci/regen-generated.mjs --if-ci   chỉ chạy khi PR/GEN_REGEN     node scripts/ci/regen-generated.mjs   chạy ngay
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (process.argv.includes('--if-ci') && process.env.GITHUB_EVENT_NAME !== 'pull_request' && process.env.GEN_REGEN !== '1') process.exit(0);
// checkout thưa (sparse-checkout, vd. report-shots.yml) không đủ nguồn để dựng → bỏ qua, không làm đỏ `npm i`
if (process.argv.includes('--if-ci') && !['i18n/ui', 'web/app', 'extension/manifest.json', 'scripts/build-extension.sh'].every(p => fs.existsSync(path.join(ROOT, p)))) process.exit(0);
const run = (c, a) => execFileSync(c, a, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
run('node', ['scripts/i18n-pack.mjs']);
run('bash', ['scripts/build-extension.sh']);   // chạy lại i18n-pack (idempotent) rồi chép web/ → extension/app
try { run('git', ['checkout', '-q', '--', 'extension/academic.json']); } catch { /* không phải kho git / không đổi */ } // như prepush: bỏ thay đổi phụ
console.log('✓ regen-generated: gói dịch + extension/app dựng lại từ nguồn');
