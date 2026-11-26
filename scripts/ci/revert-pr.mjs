// MỘT cách mở PR revert cho bot (heavy-main.mjs = phần nặng; cheap-revert.mjs = check rẻ). Chạy trong checkout cầm khoá deploy SSH
// (đẩy nhánh bằng token workflow KHÔNG kích CI của PR). Test thuần: scripts/test/main-guards.mjs (revertNames, duplicate).
import { execFileSync } from 'node:child_process';

/** Hàm thuần: tên nhánh + tiêu đề PR revert của commit (tiêu đề cắt 70 ký tự, giữ nguyên bản cũ của heavy-main). */
export const revertNames = (sha, subject, suffix) => ({ branch: `revert/${sha.slice(0, 8)}`, title: `Revert ${String(subject).split('\n')[0].slice(0, 70)} (${suffix})` });
/** Hàm thuần: đã có PR mở cho nhánh revert này chưa (tránh mở lặp mỗi lần push main làm đỏ). */
export const duplicate = (openPrs, branch) => (openPrs || []).some(p => p.head && p.head.ref === branch);
/** Hàm thuần: không revert một commit revert (vòng lặp) và không revert commit nằm trong danh sách miễn (vd. sửa workflow – token không đẩy được). */
export const revertable = subject => !/^Revert /.test(String(subject));

/**
 * Mở PR revert. api(path, init) → { status, json }. opts: { sha, subject, suffix, body, labels }. Trả { url, number } | null (xung đột / lỗi → null, đã in lý do).
 * Không tự gộp – caller gọi autoMerge() khi muốn.
 */
export async function openRevertPr(api, { sha, subject, suffix, body, labels = ['main-red-revert'] }, log = console.log) {
  const { branch, title } = revertNames(sha, subject, suffix);
  const open = (await api(`/pulls?state=open&head=${encodeURIComponent((process.env.GITHUB_REPOSITORY || '').split('/')[0] + ':' + branch)}`)).json;
  if (duplicate(Array.isArray(open) ? open : [], branch)) { log(`đã có PR revert mở cho ${branch} – không mở lặp`); return null; }
  try {
    const g = (...a) => execFileSync('git', a, { stdio: 'inherit' });
    g('config', 'user.name', 'lexkite-bot'); g('config', 'user.email', 'lexkite-bot@users.noreply.github.com');
    g('fetch', '-q', 'origin', 'main'); g('checkout', '-q', '-B', branch, 'origin/main');
    g('revert', '--no-edit', sha); g('push', '-q', 'origin', `HEAD:refs/heads/${branch}`);
  } catch (e) { log('::error::không tự revert được (xung đột?) – ' + String(e.message).split('\n')[0] + ' → revert tay'); return null; }
  const pr = await api('/pulls', { method: 'POST', body: JSON.stringify({ title, head: branch, base: 'main', body }) });
  if (pr.status !== 201) { log(`::error::mở PR revert lỗi ${pr.status} ${JSON.stringify(pr.json).slice(0, 200)}`); return null; }
  log(`đã mở PR revert: ${pr.json.html_url}`);
  await api(`/issues/${pr.json.number}/labels`, { method: 'POST', body: JSON.stringify({ labels }) });
  return { url: pr.json.html_url, number: pr.json.number };
}
