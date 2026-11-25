// budget-comment (17/11): PR đụng web/ mà ngân sách dùng ≥ 95 % trần → 1 comment (cập nhật tại chỗ) liệt kê mục nào, còn bao nhiêu, mục tiêu ≥ 3 %. Không đỏ PR (size-budget lo phần đỏ).
//   node scripts/ci/budget-comment.mjs <số PR>     (cần GH_TOKEN pull-requests/issues write, GITHUB_REPOSITORY; mã chạy từ main, không từ PR)
// Test: scripts/test/budget-comment.mjs
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { TARGET_FREE_PCT, needFree } from '../lib/headroom.mjs';
export const MARK = '<!-- budget-comment -->';
const kb = n => (n / 1024).toFixed(1) + ' KB';
/** low = [{ name, used, cap, free }] → markdown (null nếu không có mục nào vàng). Thuần. */
export function render(low = []) {
  if (!low.length) return null;
  return `${MARK}\n### 📦 Ngân sách sắp hết (dùng ≥ 95 % trần)\n\n${low.map(h => `- **${h.name}**: ${kb(h.used)} / ${kb(h.cap)} – còn ${kb(h.free)} (${(100 * h.free / h.cap).toFixed(1)} %)${h.free < needFree(h, TARGET_FREE_PCT) ? ' ⚠ dưới mục tiêu 3 %' : ''}`).join('\n')}\n\nKhông nâng trần: PR thêm byte nên kèm giảm byte tương ứng (tải lười, tách gói, bỏ dữ liệu trùng). Hai PR xanh riêng cộng lại có thể cùng đỏ.\n`;
}
async function main() {
  const pr = process.argv[2], repo = process.env.GITHUB_REPOSITORY, H = { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' };
  const line = execFileSync('node', ['scripts/test/size-budget.mjs', '--headroom'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').find(l => l.startsWith('HEADROOM:'));
  const body = render(line ? JSON.parse(line.slice(9)) : []);
  const cs = await (await fetch(`https://api.github.com/repos/${repo}/issues/${pr}/comments?per_page=100`, { headers: H })).json(), mine = Array.isArray(cs) && cs.find(c => (c.body || '').includes(MARK));
  if (!body) { if (mine) await fetch(`https://api.github.com/repos/${repo}/issues/comments/${mine.id}`, { method: 'DELETE', headers: H }); console.log('ngân sách còn rộng – không comment'); return; }
  console.log(body);
  const url = mine ? `https://api.github.com/repos/${repo}/issues/comments/${mine.id}` : `https://api.github.com/repos/${repo}/issues/${pr}/comments`;
  const r = await fetch(url, { method: mine ? 'PATCH' : 'POST', headers: H, body: JSON.stringify({ body }) }); if (!r.ok) throw new Error('comment ' + r.status);
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().catch(e => { console.error('::warning::budget-comment: ' + e.message); });
