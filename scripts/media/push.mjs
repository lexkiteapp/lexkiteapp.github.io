#!/usr/bin/env node
// Đẩy tệp media mới (thư mục tạm, mặc định .media-out/) lên kho media ngoài theo infra/media-repos.json – KHÔNG ghi vào repo chính.
//   node scripts/media/push.mjs [--src .media-out] [--kind audio] [--msg "…"] [--dry] [--https]
// Mỗi tệp: kho = pickRepo(đường dẫn tương đối) (round-robin hash trên kho open). Clone nông + thưa + không blob (vài MB), chép tệp, commit, push (thử lại 5 lần).
// Khoá: env MEDIA_KEY_<ID> (vd. MEDIA_KEY_M2 = đường dẫn khoá deploy SSH); --https dùng GH_MEDIA_TOKEN (chạy tay).
// Thoát 1 nếu đẩy lỗi → workflow KHÔNG cập nhật chỉ mục (audio-index.js / index.txt) → app không trỏ tới tệp chưa có.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadRepos, pickRepo } from '../lib/media-repos.mjs';
const A = process.argv.slice(2), opt = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const SRC = opt('src', '.media-out'), KIND = opt('kind', 'audio'), MSG = opt('msg', 'media: thêm tệp từ CI repo chính'), DRY = A.includes('--dry');
const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
const files = walk(SRC).map(f => path.relative(SRC, f).split(path.sep).join('/')).filter(f => !f.startsWith('.'));
if (!files.length) { console.log('media/push: không có tệp mới'); process.exit(0); }
const cfg = loadRepos(), groups = new Map();
for (const f of files) { const r = pickRepo(f, KIND, cfg); if (!groups.has(r.id)) groups.set(r.id, { r, files: [] }); groups.get(r.id).files.push(f); }
for (const { r, files: fs_ } of groups.values()) {
  console.log(`media/push: ${fs_.length} tệp → ${r.repo}${DRY ? ' (dry)' : ''}`);
  if (DRY) continue;
  const key = process.env['MEDIA_KEY_' + r.id.toUpperCase()], tok = process.env.GH_MEDIA_TOKEN;
  const url = A.includes('--https') && tok ? `https://x-access-token:${tok}@github.com/${r.repo}.git` : `git@github.com:${r.repo}.git`;
  const env = { ...process.env, ...(key ? { GIT_SSH_COMMAND: `ssh -i ${key} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new` } : {}) };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-')), git = (...a) => execFileSync('git', ['-C', dir, ...a], { env, stdio: ['ignore', 'pipe', 'inherit'] }).toString();
  execFileSync('git', ['clone', '-q', '--depth', '1', '--filter=blob:none', '--sparse', url, dir], { env, stdio: 'inherit' });
  git('sparse-checkout', 'set', '--no-cone', '/README.md');
  for (const f of fs_) { fs.mkdirSync(path.join(dir, path.dirname(f)), { recursive: true }); fs.copyFileSync(path.join(SRC, f), path.join(dir, f)); }
  git('config', 'user.name', 'lexkite-bot'); git('config', 'user.email', 'lexkite-bot@users.noreply.github.com');
  const stage = () => { for (let i = 0; i < fs_.length; i += 2000) git('add', '--sparse', '-f', '--', ...fs_.slice(i, i + 2000)); return !!git('diff', '--cached', '--name-only').trim(); };
  if (!stage()) { console.log('  (đã có sẵn)'); fs.rmSync(dir, { recursive: true, force: true }); continue; }
  git('commit', '-qm', MSG);
  let ok = false;
  // tệp chỉ THÊM (tên băm, không trùng) → đụng nhau thì lấy đầu nhánh mới rồi commit lại (không cần rebase trên clone nông)
  for (let t = 1; t <= 5 && !ok; t++) { try { git('push', '-q', 'origin', 'HEAD:main'); ok = true; } catch { git('fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', 'main'); git('reset', '-q', '--mixed', 'FETCH_HEAD'); if (!stage()) { ok = true; break; } git('commit', '-qm', MSG); } }
  fs.rmSync(dir, { recursive: true, force: true });
  if (!ok) { console.error(`✗ media/push: đẩy ${r.repo} thất bại`); process.exit(1); }
  console.log(`  ✓ đã đẩy ${r.repo}`);
}
