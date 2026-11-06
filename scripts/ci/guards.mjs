#!/usr/bin/env node
// Máy gác CI (06/11 – chủ: "không để đỏ CI xảy ra lần nào nữa"). Hàm thuần + CLI nhỏ; test: scripts/test/ci-guards.mjs; tài liệu: docs/CI-RUNNERS.md › Máy gác.
//   lane      – làn nhanh: PR mà `npm test` cùng sha đã ĐỎ thì huỷ lượt nặng (stitch-diff, visual-qa, mobile-qa, web-sweep, scroll-perf, ux-cards, ux-shots) – không đốt runner vào PR đã đỏ
//   main-red  – lượt npm test sau-push (Prod release → gate) đỏ → mở/cập nhật issue `main-red`; xanh lại → đóng
//   budget    – size-budget báo ngân sách dư < 5 KB / < 2 % → issue `budget-low` (vàng, TRƯỚC khi đỏ); hết thấp → đóng
//   wip       – PR mới mở khi > WIP_MAX PR đang mở → nhãn `frozen` + 1 comment (trừ `main-red` / `p0`)
//   web-daily – số PR chạm web/ gộp trong 24 giờ = 0 mà còn PR chạm web/ đang mở → issue `web-stall`
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const WIP_MAX = 15, EXEMPT = ['main-red', 'p0'], NPM_TEST = 'npm test';

/** Làn nhanh (thuần): check-run `npm test` của cùng sha đã xong và đỏ → { red: true }. Chưa xong / chưa có / xanh → chạy tiếp (không chờ, không đoán). */
export function laneVerdict(checkRuns, name = NPM_TEST) {
  const c = (checkRuns || []).filter(r => r && r.name === name).sort((a, b) => Date.parse(b.started_at || 0) - Date.parse(a.started_at || 0))[0];
  if (!c) return { red: false, why: 'chưa có check npm test' };
  if (c.status !== 'completed') return { red: false, why: 'npm test đang chạy' };
  return ['failure', 'timed_out', 'startup_failure'].includes(c.conclusion) ? { red: true, why: `npm test ${c.conclusion}` } : { red: false, why: `npm test ${c.conclusion}` };
}
/** Quyết định issue (thuần): cần báo + chưa có → create; cần báo + đã có → update; hết cần báo + còn → close; còn lại none. */
export function issueAction(needed, existing) { return needed ? (existing ? 'update' : 'create') : (existing ? 'close' : 'none'); }
/** main-red (thuần): kết quả job gate sau-push → có cần báo không. cancelled/skipped = không biết → null (giữ nguyên). */
export function mainRedNeeded(result) { return result === 'failure' ? true : result === 'success' ? false : null; }
/** wip-guard (thuần): đóng băng PR mới khi số PR mở (không tính chính nó) > WIP_MAX, trừ nhãn miễn trừ. */
export function wipVerdict({ openCount, labels = [] }) {
  if (labels.some(l => EXEMPT.includes(l))) return { freeze: false, why: 'nhãn miễn trừ' };
  return openCount > WIP_MAX ? { freeze: true, why: `${openCount} PR đang mở > ${WIP_MAX}` } : { freeze: false, why: `${openCount} ≤ ${WIP_MAX}` };
}
/** Chỉ số hằng ngày (thuần): files = đường dẫn file của 1 PR → có chạm web/ không. */
export const touchesWeb = files => (files || []).some(f => /^web\//.test(f));
/** stall = không PR web nào gộp trong 24 giờ mà còn PR web đang mở. */
export const webStall = ({ mergedWeb24h, openWeb }) => mergedWeb24h === 0 && openWeb > 0;

// ---------- phần mạng (chỉ khi chạy CLI)
const REPO = process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io';
async function api(p, { method = 'GET', body } = {}) {
  const r = await fetch(`https://api.github.com/repos/${REPO}${p}`, { method, headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok && r.status !== 204) throw new Error(`${method} ${p} → ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
}
async function syncIssue({ label, title, body, needed }) {
  if (needed === null) return 'giữ nguyên';
  const ex = ((await api(`/issues?state=open&labels=${label}&per_page=1`)) || [])[0];
  const act = issueAction(needed, ex);
  if (act === 'create') await api('/issues', { method: 'POST', body: { title, body, labels: [label] } });
  if (act === 'update') await api(`/issues/${ex.number}`, { method: 'PATCH', body: { title, body } });
  if (act === 'close') { await api(`/issues/${ex.number}/comments`, { method: 'POST', body: { body: 'Đã xanh lại – tự đóng.' } }); await api(`/issues/${ex.number}`, { method: 'PATCH', body: { state: 'closed' } }); }
  return act;
}
async function prFiles(n) { const f = await api(`/pulls/${n}/files?per_page=100`); return f.map(x => x.filename); }
const arg = (k, d = '') => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };

async function main() {
  const cmd = process.argv[2];
  if (cmd === 'lane') {
    if (process.env.GITHUB_EVENT_NAME !== 'pull_request') return console.log('lane: không phải PR → chạy bình thường');
    const sha = process.env.HEAD_SHA;
    let v = { red: false, why: 'không đọc được' };
    try { v = laneVerdict((await api(`/commits/${sha}/check-runs?per_page=100&check_name=${encodeURIComponent(NPM_TEST)}`)).check_runs); } catch (e) { console.log('::warning::lane: ' + e.message); }
    console.log(`lane: ${v.why}`);
    if (!v.red) return;
    console.log(`::notice::npm test đỏ trên ${String(sha).slice(0, 7)} → huỷ lượt nặng này (sửa npm test trước; đẩy commit mới sẽ chạy lại)`);
    await api(`/actions/runs/${process.env.GITHUB_RUN_ID}/cancel`, { method: 'POST' }).catch(e => console.log('::warning::lane cancel: ' + e.message));
    await new Promise(r => setTimeout(r, 90e3));   // chờ GitHub huỷ – không để các bước nặng kế tiếp chạy
  } else if (cmd === 'main-red') {
    const needed = mainRedNeeded(arg('result')), sha = arg('sha');
    const url = `https://github.com/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID}`;
    console.log('main-red:', needed, await syncIssue({ label: 'main-red', needed, title: `main ĐỎ: npm test sau-push ${sha.slice(0, 7)}`, body: `Lượt \`npm test\` sau-push (Prod release → gate) đỏ trên \`${sha}\`.\n\nLượt: ${url}\n\nGốc thường gặp: hai PR xanh riêng cộng lại vượt ngân sách / xung đột ngữ nghĩa. Sửa trên main trước mọi việc khác (nhãn \`main-red\` được miễn đóng băng WIP). Issue tự đóng khi lượt kế tiếp xanh.` }));
  } else if (cmd === 'budget') {
    const out = execFileSync('node', ['scripts/test/size-budget.mjs', '--headroom'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').find(l => l.startsWith('HEADROOM:'));
    const low = out ? JSON.parse(out.slice(9)) : [];
    const kb = n => (n / 1024).toFixed(1) + ' KB';
    console.log('budget:', low.length, await syncIssue({ label: 'budget-low', needed: low.length > 0, title: `Ngân sách sắp hết: ${low.map(h => h.name).join(', ')}`, body: `Dư < 5 KB hoặc < 2 % (vàng, chưa đỏ):\n\n${low.map(h => `- **${h.name}**: ${kb(h.used)} / ${kb(h.cap)} – còn ${kb(h.free)}`).join('\n')}\n\nKhông nâng ngân sách: rà dữ liệu trùng/thừa, chuyển sang tải lười. PR thêm byte nên chờ tới khi có chỗ (hai PR xanh riêng cộng lại có thể vượt – 05/11 374/374 KB).` }));
  } else if (cmd === 'wip') {
    const n = +arg('pr'), pr = await api(`/pulls/${n}`), labels = pr.labels.map(l => l.name);
    const open = (await api('/pulls?state=open&per_page=100')).filter(p => p.number !== n).length;
    const v = wipVerdict({ openCount: open, labels });
    console.log('wip:', v.why);
    if (v.freeze) {
      await api(`/issues/${n}/labels`, { method: 'POST', body: { labels: ['frozen'] } });
      await api(`/issues/${n}/comments`, { method: 'POST', body: { body: `🧊 **frozen** – đang có ${open} PR mở (> ${WIP_MAX}). Gộp bớt PR cũ trước khi mở việc mới (docs/METHODS.md: finish before start). PR sửa main đỏ hoặc nhãn \`p0\` được miễn.` } });
    }
  } else if (cmd === 'web-daily') {
    const since = Date.now() - 864e5;
    const closed = (await api('/pulls?state=closed&sort=updated&direction=desc&per_page=100')).filter(p => p.merged_at && Date.parse(p.merged_at) > since);
    const open = await api('/pulls?state=open&per_page=100');
    let merged = 0, openWeb = 0;
    for (const p of closed) if (touchesWeb(await prFiles(p.number))) merged++;
    for (const p of open) if (touchesWeb(await prFiles(p.number))) openWeb++;
    const needed = webStall({ mergedWeb24h: merged, openWeb });
    console.log(`web-daily: gộp web/ 24h = ${merged}, mở web/ = ${openWeb}`, await syncIssue({ label: 'web-stall', needed, title: `Không PR web/ nào gộp trong 24 giờ (còn ${openWeb} PR web/ mở)`, body: `Chỉ số hằng ngày: PR chạm \`web/\` gộp trong 24 giờ = **${merged}**, PR chạm \`web/\` đang mở = **${openWeb}**. Hàng gộp đang kẹt (CI đỏ chung? ngân sách? hàng chờ runner?) – kiểm main-red / budget-low / hàng chờ.` }));
  } else { console.error('dùng: guards.mjs lane|main-red|budget|wip|web-daily'); process.exit(2); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error('::error::guards: ' + e.message); process.exit(1); });
