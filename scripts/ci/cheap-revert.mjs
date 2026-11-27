#!/usr/bin/env node
// Máy gác 1/4 (23/11): push vào main làm đỏ check RẺ (size-budget, docs-budget, content-qa, fmt – scripts/ci/cheap.mjs) → bot tìm commit gây đỏ ĐẦU TIÊN
// (nhị phân trên ≤ 10 commit first-parent, so với cha xanh), mở PR revert nhãn main-red-fix, bật tự gộp khi xanh, bình luận vào PR gốc. Mục tiêu main đỏ < 20 phút.
// Không revert: commit Revert (vòng lặp), main đã đỏ từ trước 10 commit (→ issue main-red-wf/chủ xử lý), PR revert đã mở. Không đụng ngưỡng – chỉ gỡ commit.
//   node scripts/ci/cheap-revert.mjs --sha <sha> [--dry]     Env: GITHUB_TOKEN, GITHUB_REPOSITORY. Checkout fetch-depth ≥ 12 + khoá deploy SSH. Workflow: main-red-revert.yml.
// Bot dữ liệu đẩy main [skip ci] không kích workflow này → chặn TRƯỚC khi đẩy bằng bot-test-gate (infra/bot-push-tests.json, luật 17).
import { ghFetch } from '../lib/retry5xx.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { runCheap, firstBad } from './cheap.mjs';
import { openRevertPr, revertable } from './revert-pr.mjs';
import { isMain } from '../lib/is-main.mjs';

export const MAX_BACK = 10, LABEL = 'main-red-fix';

/** Hàm thuần: chuỗi first-parent mới→cũ (shas) → danh sách cũ→mới gồm [cha xanh giả định = phần tử đầu, …, head]. */
export const chain = shas => [...shas].reverse();

async function main() {
  const a = process.argv.slice(2), sha = a[a.indexOf('--sha') + 1], dry = a.includes('--dry'), repo = process.env.GITHUB_REPOSITORY, tok = process.env.GITHUB_TOKEN;
  if (!sha || !repo || !tok) { console.error('thiếu --sha / GITHUB_REPOSITORY / GITHUB_TOKEN'); process.exit(2); }
  const g = (...x) => execFileSync('git', x, { encoding: 'utf8', maxBuffer: 1 << 26 }).trim();
  const api = async (p, init = {}) => { const r = await ghFetch(`https://api.github.com/repos/${repo}${p}`, { ...init, headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', ...(init.body ? { 'content-type': 'application/json' } : {}) } }); return { status: r.status, json: await r.json().catch(() => null) }; };
  const head = runCheap();
  const red = head.filter(r => !r.ok).map(r => r.id);
  if (!red.length) { console.log(`cheap-revert: ${sha.slice(0, 8)} xanh cả ${head.length} check rẻ`); return; }
  console.log(`::error::main ĐỎ check rẻ sau ${sha.slice(0, 8)}: ${red.join(', ')}`);
  const shas = g('rev-list', '--first-parent', `--max-count=${MAX_BACK + 1}`, sha).split('\n'), w = chain(shas), tmp = [];
  const bad = i => {   // đo commit w[i] trong worktree tạm (đỏ nếu BẤT KỲ check đỏ ở head vẫn đỏ ở đó)
    if (i === w.length - 1) return true;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cheap-')); tmp.push(dir);
    g('worktree', 'add', '-q', '--detach', dir, w[i]);
    if (fs.existsSync('node_modules')) fs.symlinkSync(path.resolve('node_modules'), path.join(dir, 'node_modules'));
    return runCheap(dir, red).some(r => !r.ok);
  };
  try {
    if (w.length < 2 || bad(0)) { console.log(`::error::check rẻ đã đỏ từ ≥ ${MAX_BACK} commit trước (hoặc không có cha) → không tự revert; chủ main-red xử lý`); process.exit(1); }
    const culprit = w[firstBad(w.length - 1, i => bad(i + 1)) + 1], subject = g('log', '-1', '--format=%s', culprit);
    console.log(`thủ phạm: ${culprit.slice(0, 8)} "${subject}"`);
    if (!revertable(subject)) { console.log('thủ phạm là commit Revert → không revert lại (tránh vòng lặp); chủ xử lý'); process.exit(1); }
    if (dry) { console.log('--dry: sẽ mở PR revert ' + culprit); return; }
    const orig = ((await api(`/commits/${culprit}/pulls`)).json || [])[0];
    const body = `Tự động (máy gác 1/4, docs/CI-RUNNERS.md › Máy gác main đỏ): commit ${culprit} làm đỏ check rẻ **${red.join(', ')}** trên main (cha của nó xanh).${orig ? `\n\nPR gốc: #${orig.number}.` : ''}\n\nPR revert để main xanh lại < 20 phút; sửa lỗi gốc rồi mở lại. Tự gộp khi xanh.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)`;
    await api('/labels', { method: 'POST', body: JSON.stringify({ name: LABEL, color: 'b60205' }) });   // đã có → 422, bỏ qua
    const pr = await openRevertPr(api, { sha: culprit, subject, suffix: 'main đỏ check rẻ', body, labels: [LABEL] });
    if (!pr) process.exit(1);
    try { execFileSync('gh', ['pr', 'merge', String(pr.number), '--auto', '--squash'], { stdio: 'inherit', env: { ...process.env, GH_TOKEN: tok } }); }
    catch { console.log('::warning::không bật được tự gộp (quyền/ruleset) – điều phối gộp tay khi xanh'); }
    if (orig) await api(`/issues/${orig.number}/comments`, { method: 'POST', body: JSON.stringify({ body: `⚠️ Commit \`${culprit.slice(0, 8)}\` của PR này làm main đỏ check rẻ **${red.join(', ')}**. Đã mở PR revert ${pr.url} (nhãn ${LABEL}). Sửa gốc rồi mở lại PR.` }) });
  } finally { for (const d of tmp) { try { g('worktree', 'remove', '--force', d); } catch { fs.rmSync(d, { recursive: true, force: true }); } } }
}
if (isMain(import.meta.url)) main().catch(e => { console.error(e); process.exit(1); });
