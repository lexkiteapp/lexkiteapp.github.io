// Đẩy sổ sao lưu (infra/backups/*.json) lên main KHÔNG chết vì xung đột rebase (1/11: release-archive #181 đỏ do `git pull --rebase` dừng giữa chừng
// rồi 4 lần thử sau cùng vấp "unmerged files"). Khi xung đột: huỷ rebase, lấy main mới, GỘP sổ của mình vào sổ của main (hợp theo khoá run|name), commit lại, push.
//   node scripts/ops/ledger-push.mjs <file> "<commit message>"
import { isMain } from '../lib/is-main.mjs';
import fs from 'fs';
import { execFileSync } from 'child_process';

const keyOf = x => (x && typeof x === 'object' ? (x.run != null ? 'run:' + x.run : x.name != null ? 'name:' + x.name : JSON.stringify(x)) : String(x));
const ord = x => (x && (x.run_number ?? Date.parse(x.at))) || 0;
/** Gộp 2 sổ (thuần): mảng đối tượng → hợp theo khoá, mới nhất trước, cắt theo độ dài lớn nhất của 2 bên; đối tượng → gộp từng khoá; còn lại lấy bản của mình. */
export function mergeLedger(ours, theirs) {
  if (Array.isArray(ours) && Array.isArray(theirs)) {
    const m = new Map(); for (const x of [...theirs, ...ours]) m.set(keyOf(x), x);
    const out = [...m.values()].sort((a, b) => ord(b) - ord(a));
    return out.slice(0, Math.max(ours.length, theirs.length));
  }
  if (ours && theirs && typeof ours === 'object' && typeof theirs === 'object' && !Array.isArray(ours) && !Array.isArray(theirs)) {
    const o = { ...theirs }; for (const k of Object.keys(ours)) o[k] = k in theirs ? mergeLedger(ours[k], theirs[k]) : ours[k]; return o;
  }
  return ours;
}
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const tryGit = (...a) => { try { git(...a); return true; } catch (e) { return false; } };

const pushed = () => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'changed=1\n'); return 0; }; // d1-backup.yml: chỉ diễn tập khi sổ có bản mới
export function main(file, msg, tries = 5) {
  if (!msg.includes('[CF-Pages-Skip]')) msg += ' [CF-Pages-Skip] [skip ci]'; // commit sổ không được kích build Pages (docs/FREE-TIER.md §7)
  git('add', file); if (tryGit('diff', '--cached', '--quiet')) { console.log('sổ không đổi'); return 0; }
  git('commit', '-qm', msg);
  const ours = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (let i = 1; i <= tries; i++) {
    if (tryGit('pull', '-q', '--rebase', 'origin', 'main') && tryGit('push', '-q', 'origin', 'HEAD:main')) return pushed();
    if (fs.existsSync('.git/rebase-merge') || fs.existsSync('.git/rebase-apply')) { // xung đột → gộp theo nội dung
      tryGit('rebase', '--abort'); git('fetch', '-q', 'origin', 'main'); git('reset', '-q', '--hard', 'origin/main');
      fs.writeFileSync(file, JSON.stringify(mergeLedger(ours, JSON.parse(fs.readFileSync(file, 'utf8'))), null, 1) + '\n');
      git('add', file); if (tryGit('diff', '--cached', '--quiet')) return 0; git('commit', '-qm', msg);
      if (tryGit('push', '-q', 'origin', 'HEAD:main')) return pushed();
    }
    execFileSync('sleep', [String(3 * i)]);
  }
  console.error('✗ ledger-push: không đẩy được sau ' + tries + ' lần'); return 1;
}
if (isMain(import.meta.url)) process.exit(main(process.argv[2], process.argv[3]));
