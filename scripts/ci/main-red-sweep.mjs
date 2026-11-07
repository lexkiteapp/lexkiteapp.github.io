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
