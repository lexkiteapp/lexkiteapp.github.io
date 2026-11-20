#!/usr/bin/env node
// Luật 18 (16/11, chủ OK): PR chỉ chờ làn nhanh; việc NẶNG chạy sau gộp trên push main. Script này (job `heavy-main` của prod-release.yml) chờ các lượt nặng của commit main:
//   xanh → mark/OTA được chạy · đỏ → mở PR revert đúng commit đó (nếu chính commit làm đỏ) · bị huỷ do commit mới hơn → bỏ qua OTA lượt này (lượt của commit mới kiểm tiếp).
//   node scripts/ci/heavy-main.mjs --sha <sha> [--wait-min 80] [--dry]     Env: GITHUB_TOKEN, GITHUB_REPOSITORY, (ghi $GITHUB_OUTPUT: state=green|red|superseded|none)
// Workflow nặng = có dòng `# ci-policy: heavy-gate` (heavyFiles của heavy-rerun.mjs). Test: scripts/test/heavy-main.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { heavyFiles } from './heavy-rerun.mjs';
import { isMain } from '../lib/is-main.mjs';

const BAD = new Set(['failure', 'timed_out', 'startup_failure']), OKC = new Set(['success', 'skipped', 'neutral']);
/** Hàm thuần: runs = lượt push của commit (mọi workflow), heavy = tên file nặng, ageMin = phút từ lúc đẩy → { state: 'wait'|'green'|'red'|'superseded'|'none', red: [run], pending: n }. */
export function decide(runs, heavy, ageMin = 99, graceMin = 4) {
  const set = new Set(heavy), mine = (runs || []).filter(r => set.has(path.basename((r.path || '').split('@')[0])));
  const latest = new Map(); for (const r of mine) { const p = latest.get(r.path), n = (r.run_number || 0) * 100 + (r.run_attempt || 1); if (!p || n > p.n) latest.set(r.path, { n, r }); }
  const rs = [...latest.values()].map(x => x.r), pending = rs.filter(r => r.status !== 'completed').length, red = rs.filter(r => r.status === 'completed' && BAD.has(r.conclusion));
  if (!rs.length) return { state: ageMin < graceMin ? 'wait' : 'none', red: [], pending: 0 };   // chưa thấy lượt nào: có thể GitHub chưa kịp tạo → chờ vài phút; sau đó = commit không chạm vùng nặng
  if (red.length) return { state: pending ? 'wait' : 'red', red, pending };                       // đỏ nhưng còn lượt khác đang chạy: chờ hết rồi mới kết luận (báo đủ danh sách)
  if (pending) return { state: 'wait', red: [], pending };
  if (rs.some(r => r.conclusion === 'cancelled')) return { state: 'superseded', red: [], pending: 0 };
  return rs.every(r => OKC.has(r.conclusion)) ? { state: 'green', red: [], pending: 0 } : { state: 'wait', red: [], pending: 0 };
}
/** Hàm thuần: lượt đỏ là DO commit này nếu lượt xong gần nhất TRƯỚC nó của cùng workflow trên main không đỏ (đã đỏ từ trước → không revert oan). prev = runs cũ hơn, mới→cũ. */
export function culprit(prev) { const p = (prev || []).find(r => r.status === 'completed' && !['cancelled', 'skipped', 'neutral'].includes(r.conclusion)); return !p || !BAD.has(p.conclusion); }

async function main() {
  const a = process.argv.slice(2), arg = (k, d = '') => a.includes(k) ? a[a.indexOf(k) + 1] : d, sha = arg('--sha'), waitMin = +arg('--wait-min', 80), dry = a.includes('--dry');
  const repo = process.env.GITHUB_REPOSITORY, tok = process.env.GITHUB_TOKEN;
  if (!sha || !repo || !tok) { console.error('thiếu --sha / GITHUB_REPOSITORY / GITHUB_TOKEN'); process.exit(2); }
  const api = async (p, init = {}) => { const r = await fetch(`https://api.github.com/repos/${repo}${p}`, { ...init, headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', ...(init.body ? { 'Content-Type': 'application/json' } : {}) } }); return { status: r.status, json: await r.json().catch(() => ({})) }; };
  const out = s => { console.log('heavy-main: ' + s); if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `state=${s.split(' ')[0]}\n`); };
  const commit = (await api(`/commits/${sha}`)).json, t0 = Date.parse(commit.commit?.committer?.date || Date.now()), heavy = heavyFiles(), deadline = Date.now() + waitMin * 6e4;
  let d;
  for (;;) {
    const runs = (await api(`/actions/runs?head_sha=${sha}&event=push&per_page=100`)).json.workflow_runs || [];
    d = decide(runs, heavy, (Date.now() - t0) / 6e4);
    if (d.state !== 'wait' || Date.now() > deadline) break;
    console.log(`heavy-main: chờ ${d.pending} lượt nặng của ${sha.slice(0, 8)}…`); await new Promise(r => setTimeout(r, 120e3));
  }
  if (d.state === 'wait') { out('timeout – nặng chưa xong, không phát OTA'); process.exit(0); }
  if (d.state !== 'red') { out(`${d.state} (${sha.slice(0, 8)})`); return; }
  const names = d.red.map(r => r.name).join(', '); console.log(`::error::main ĐỎ phần nặng sau gộp ${sha.slice(0, 8)}: ${names}`);
  let mine = [];
  for (const r of d.red) { const prev = ((await api(`/actions/workflows/${path.basename(r.path.split('@')[0])}/runs?branch=main&event=push&per_page=10&created=<${r.created_at}`)).json.workflow_runs || []).filter(x => x.head_sha !== sha); if (culprit(prev)) mine.push(r); }
  out(`red (${sha.slice(0, 8)})`);
  if (!mine.length) { console.log('lượt đỏ đã đỏ từ trước commit này → không revert (issue main-red-wf lo)'); return; }
  if (dry) { console.log('--dry: sẽ mở PR revert ' + sha); return; }
  const br = `revert/${sha.slice(0, 8)}`, title = `Revert ${commit.commit.message.split('\n')[0].slice(0, 70)} (main đỏ phần nặng)`;
  try {
    execFileSync('git', ['config', 'user.name', 'lexkite-bot']); execFileSync('git', ['config', 'user.email', 'lexkite-bot@users.noreply.github.com']);
    execFileSync('git', ['fetch', '-q', 'origin', 'main']); execFileSync('git', ['checkout', '-q', '-B', br, 'origin/main']);
    execFileSync('git', ['revert', '--no-edit', sha], { stdio: 'inherit' }); execFileSync('git', ['push', '-q', 'origin', `HEAD:refs/heads/${br}`]);   // SSH khoá deploy: kích CI của PR revert
  } catch (e) { console.log('::error::không tự revert được (xung đột?) – ' + e.message.split('\n')[0] + ' → revert tay'); process.exit(1); }
  const body = `Tự động: commit ${sha} làm đỏ phần NẶNG sau gộp (luật 18, docs/CI-RUNNERS.md): ${names}.\n\nPR revert để main xanh lại; sửa lỗi gốc rồi mở lại PR cũ. Tác giả/phiên chủ: xem commit gốc.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)`;
  const pr = await api('/pulls', { method: 'POST', body: JSON.stringify({ title, head: br, base: 'main', body }) });
  console.log(pr.status === 201 ? `đã mở PR revert: ${pr.json.html_url}` : `::error::mở PR revert lỗi ${pr.status} ${JSON.stringify(pr.json).slice(0, 200)}`);
  if (pr.status === 201) await api(`/issues/${pr.json.number}/labels`, { method: 'POST', body: JSON.stringify({ labels: ['main-red-revert'] }) });
}
if (isMain(import.meta.url)) main().catch(e => { console.error(e); process.exit(1); });
