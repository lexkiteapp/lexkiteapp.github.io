#!/usr/bin/env node
// Máy gác "main luôn xanh" cho MỌI workflow tự chạy (06/11 — chủ: workflow lịch đỏ nhiều ngày mà không ai biết: Rà soát hằng ngày đỏ từ 31/10,
// Xưởng nội dung từ 04/11…). Với mỗi workflow đang bật có trigger schedule/push: lượt HOÀN TẤT mới nhất trên main (bỏ cancelled/skipped/neutral
// và lượt tay workflow_dispatch) đỏ → 1 issue `main-red-wf` liệt kê; xanh hết → tự đóng. Bổ sung cho `main-red` của npm test sau-push (ci/guards).
// Dùng: node scripts/ci/main-red-sweep.mjs [--dry]   (GITHUB_TOKEN, GITHUB_REPOSITORY). Test: scripts/test/main-red-sweep.mjs.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const LABEL = 'main-red-wf', MARK = '<!-- main-red-sweep -->', AUTO_EVENTS = ['schedule', 'push', 'workflow_run'], BAD = ['failure', 'timed_out', 'startup_failure'], SKIP = ['cancelled', 'skipped', 'neutral', 'stale', 'action_required'];
// Thêm mục = tắt có chủ ý kèm lý do (vd. thí nghiệm thủ công chưa tune xong). Mặc định rỗng: không miễn trừ.
export const EXEMPT = {};

/** Workflow có tự chạy (schedule/push) không — đọc khối `on:` cấp 1 của YAML (thuần, không cần parser). */
export function autoTriggers(yml) {
  const on = /^on:\s*\n((?:[ \t]+[^\n]*\n|\s*\n)*)/m.exec(String(yml) + '\n');
  const body = on ? on[1] : '';
  const flow = /^on:\s*\{([^}]*)\}/m.exec(String(yml));
  const src = flow ? flow[1] : body;
  return ['schedule', 'push'].filter(t => new RegExp(`(^|[\\s,{])${t}\\s*:`, 'm').test(src));
}
/** Lượt đánh giá (thuần): runs mới→cũ trên main → { red, run } hoặc null nếu chưa có lượt tự động hoàn tất. */
export function latestAuto(runs) {
  for (const r of runs || []) {
    if (r.status && r.status !== 'completed') continue;
    if (!AUTO_EVENTS.includes(r.event)) continue;
    if (SKIP.includes(r.conclusion)) continue;
    return { red: BAD.includes(r.conclusion), run: r };
  }
  return null;
}
/** Danh sách đỏ (thuần): files = [{file,name,state,yml}], runsOf(file) → runs. */
export function redList(files, runsOf) {
  const out = [];
  for (const w of files) {
    if (w.state && w.state !== 'active') continue;
    if (EXEMPT[w.file]) continue;
    if (!autoTriggers(w.yml).length) continue;
    const v = latestAuto(runsOf(w.file));
    if (v && v.red) out.push({ file: w.file, name: w.name, id: v.run.id, url: v.run.html_url, at: v.run.created_at, event: v.run.event, conclusion: v.run.conclusion });
  }
  return out.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
/**
 * Mù main (07/11): Prod release (job gate = npm test sau-push → issue `main-red`) bị huỷ/xếp hàng bỏ đói khi hàng CI dài – 6 lượt liền không chạy, main đỏ (native-parity)
 * mà không ai thấy. Hàm thuần: commits (main, mới→cũ, {sha,date,message}), runs = Prod release trên main (mọi trạng thái) → { sha, ageMin } nếu commit đầu (không [skip ci])
 * đã quá graceMin mà CHƯA có lượt Prod release nào đánh giá nó (xong không huỷ, hoặc đang chạy/xếp hàng < staleMin); ngược lại null.
 */
export function blindHead(commits, runs, now = Date.now(), graceMin = 25, staleMin = 60) {
  const head = (commits || []).find(c => !/\[skip ci\]/i.test(c.message || ''));
  if (!head) return null;
  const ageMin = Math.round((now - Date.parse(head.date)) / 60000);
  if (ageMin < graceMin) return null;
  const covered = (runs || []).some(r => r.status === 'completed'
    ? !['cancelled', 'skipped'].includes(r.conclusion) && (r.head_sha === head.sha || Date.parse(r.created_at) >= Date.parse(head.date))
    : r.head_sha === head.sha && (now - Date.parse(r.created_at)) / 60000 < staleMin);
  return covered ? null : { sha: head.sha, ageMin };
}
export function issueBody(red) {
  return `${MARK}\nLượt tự động mới nhất trên \`main\` của ${red.length} workflow đang ĐỎ (main phải luôn xanh — sửa gốc, không tắt/hạ ngưỡng):\n\n` +
    red.map(r => `- **${r.name}** (\`${r.file}\`) — ${r.event} ${r.conclusion} từ ${r.at.slice(0, 16).replace('T', ' ')}Z — [lượt ${r.id}](${r.url})`).join('\n') + '\n\nTự cập nhật mỗi giờ; tự đóng khi hết đỏ.';
}

// ---------- mạng (chỉ khi chạy CLI)
const REPO = process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io';
async function api(p, { method = 'GET', body } = {}) {
  const r = await fetch(`https://api.github.com/repos/${REPO}${p}`, { method, headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok && r.status !== 204) throw new Error(`${method} ${p} → ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
}
async function main() {
  const dry = process.argv.includes('--dry'), dir = '.github/workflows';
  const wfs = (await api('/actions/workflows?per_page=200')).workflows;
  const files = fs.readdirSync(dir).filter(f => /\.ya?ml$/.test(f)).map(file => {
    const w = wfs.find(x => x.path === `${dir}/${file}`);
    return { file, name: w ? w.name : file, state: w ? w.state : 'active', yml: fs.readFileSync(path.join(dir, file), 'utf8') };
  }).filter(w => autoTriggers(w.yml).length && (w.state === 'active'));
  // mù main: commit đầu main chưa được Prod release (npm test sau-push) đánh giá → gọi tay đúng sha đó (nhóm riêng, không bị lượt push thay thế)
  try {
    const commits = (await api('/commits?sha=main&per_page=15')).map(c => ({ sha: c.sha, date: c.commit.committer.date, message: c.commit.message }));
    const pr = (await api('/actions/workflows/prod-release.yml/runs?branch=main&per_page=20')).workflow_runs;
    const b = blindHead(commits, pr);
    if (!b) console.log('main-red-sweep: commit đầu main đã/đang được npm test sau-push đánh giá');
    else { console.log(`main-red-sweep: ⚠ ${b.sha.slice(0, 7)} (${b.ageMin} phút) chưa có lượt Prod release nào đánh giá – ${dry ? 'bỏ qua (--dry)' : 'gọi tay'}`);
      if (!dry) await api('/actions/workflows/prod-release.yml/dispatches', { method: 'POST', body: { ref: 'main', inputs: { sha: b.sha } } }); }
  } catch (e) { console.log('::warning::main-red-sweep mù-main: ' + e.message); }
  const cache = {};
  for (const w of files) { const id = wfs.find(x => x.path === `${dir}/${w.file}`)?.id; if (!id) continue; cache[w.file] = (await api(`/actions/workflows/${id}/runs?branch=main&status=completed&per_page=12`).catch(() => ({ workflow_runs: [] }))).workflow_runs; }
  const red = redList(files, f => cache[f] || []);
  console.log(`main-red-sweep: ${files.length} workflow tự chạy, ${red.length} đỏ`); for (const r of red) console.log(`  ✗ ${r.file} (${r.event} ${r.conclusion} ${r.at})`);
  if (dry) return;
  const ex = (await api(`/issues?state=open&labels=${LABEL}&per_page=5`)).find(i => (i.body || '').includes(MARK));
  if (red.length) {
    const title = `main ĐỎ: ${red.length} workflow chạy tự động đang đỏ`, body = issueBody(red);
    if (ex) await api(`/issues/${ex.number}`, { method: 'PATCH', body: { title, body } }); else await api('/issues', { method: 'POST', body: { title, body, labels: [LABEL] } });
  } else if (ex) { await api(`/issues/${ex.number}/comments`, { method: 'POST', body: { body: 'Mọi workflow tự chạy đã xanh trên main – tự đóng.' } }); await api(`/issues/${ex.number}`, { method: 'PATCH', body: { state: 'closed' } }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error('::error::main-red-sweep: ' + e.message); process.exit(1); });
