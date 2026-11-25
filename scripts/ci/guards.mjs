#!/usr/bin/env node
// Máy gác CI (06/11 – chủ: "không để đỏ CI xảy ra lần nào nữa"). Hàm thuần + CLI nhỏ; test: scripts/test/ci-guards.mjs; tài liệu: docs/CI-RUNNERS.md › Máy gác.
//   lane      – làn nhanh: PR mà `npm test` cùng sha đã ĐỎ thì huỷ lượt nặng (stitch-diff, visual-qa, mobile-qa, web-sweep, scroll-perf, ux-cards, ux-shots) – không đốt runner vào PR đã đỏ
//   main-red  – lượt npm test sau-push (Prod release → gate) đỏ → mở/cập nhật issue `main-red`; xanh lại → đóng
//   budget    – size-budget báo ngân sách dư < 5 KB / < 2 % → issue `budget-low` (vàng, TRƯỚC khi đỏ); hết thấp → đóng
//   wip       – PR mới mở khi > WIP_MAX PR đang mở → nhãn `frozen` + 1 comment (trừ `main-red` / `p0`)
//   web-daily – số PR chạm web/ gộp trong 24 giờ = 0 mà còn PR chạm web/ đang mở → issue `web-stall`
//   yield-streak – workflow XANH mà sản lượng dưới sàn lượt (infra/yield-floors.json minRun) N lượt liền → 1 issue `yield-zero` mỗi workflow (marker yield-streak:<id>), tự đóng khi hồi (health-board.yml gọi hằng ngày)
//   stale-ci  – issue `ci-failure` mở > 12 giờ mà chưa PR nào liên kết → nhãn `p0` + 1 comment, ghi vào bản tin ci-triage (10/11: issue đỏ
//               nằm nhiều ngày không ai nhận). ci-triage sweep gọi mỗi giờ (staleCiRun); chạy tay: node scripts/ci/guards.mjs stale-ci
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const WIP_MAX = 15, EXEMPT = ['main-red', 'main-red-fix', 'p0'], NPM_TEST = 'npm test';

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
/** stale-ci (thuần): issue ci-failure mở > hours giờ, chưa có p0, không PR mở nào nhắc tới (#số trong tiêu đề/thân/nhánh) → cần gắn p0. */
export const STALE_CI_HOURS = 12;
export function staleCi(issues, prs, now, hours = STALE_CI_HOURS) {
  const refs = new Set();
  for (const p of prs || []) for (const m of `${p.title || ''}\n${p.body || ''}\n${(p.head && p.head.ref) || ''}`.matchAll(/(?:#|issue[-/])(\d+)\b/gi)) refs.add(+m[1]);
  return (issues || []).filter(i => !i.pull_request && (i.labels || []).some(l => (l.name || l) === 'ci-failure') && !(i.labels || []).some(l => (l.name || l) === 'p0')
    && now - Date.parse(i.created_at) > hours * 3600e3 && !refs.has(i.number));
}
/** Phần mạng của stale-ci, nhận hàm gọi API kiểu gh(path, {method, body}) – ci-triage dùng chung client của nó. Trả { n, md }. */
export async function staleCiRun(call, now = Date.now()) {
  const issues = (await call('/issues?state=open&labels=ci-failure&per_page=100')) || [];
  const prs = (await call('/pulls?state=open&per_page=100')) || [];
  const stale = staleCi(issues, prs, now);
  for (const i of stale) {
    await call(`/issues/${i.number}/labels`, { method: 'POST', body: { labels: ['p0'] } });
    await call(`/issues/${i.number}/comments`, { method: 'POST', body: { body: `🚨 **p0** – issue CI đỏ đã mở > ${STALE_CI_HOURS} giờ mà chưa có PR nào liên kết (nhắc #${i.number} trong PR). Máy gác stale-ci (scripts/ci/guards.mjs) – điều phối nhận ngay.` } });
  }
  const md = `### ⏰ Issue ci-failure > ${STALE_CI_HOURS} giờ chưa có PR\n${stale.map(i => `- #${i.number} ${i.title} → gắn p0`).join('\n') || '- (không có)'}\n`;
  return { n: stale.length, md, text: stale.length ? `${stale.length} issue ci-failure > ${STALE_CI_HOURS} giờ chưa có PR → p0: ${stale.map(i => '#' + i.number).join(', ')}` : '' };
}

// ---------- yield-streak (24/11: lexicon-expand xanh 11 lượt liền mà 0–7 từ/lượt, vocab-img-scene 1–90 ảnh/lượt – health-board chỉ có 1 issue chung nên không ai nhận)
export const YIELD_STREAK_N = 3;
/** gộp bản ghi sản lượng của một workflow (reports/yield/<id>.json + <id>.<shard>.json) theo LƯỢT (run id; thiếu thì theo giờ) → [{ run, t, n }] cũ → mới (thuần). */
export function yieldByRun(rows) {
  const m = new Map();
  for (const y of rows || []) { const k = y.run || y.t; const o = m.get(k) || { run: k, t: y.t, n: 0 }; o.n += +y.n || 0; if (y.t > o.t) o.t = y.t; m.set(k, o); }
  return [...m.values()].sort((a, b) => (a.t < b.t ? -1 : 1));
}
/** N lượt gần nhất đều dưới minRun → { dead, last } (thuần). minRun ≤ 0 hoặc chưa đủ N lượt → không báo. */
export function yieldStreak(rows, minRun, n = YIELD_STREAK_N) {
  const runs = yieldByRun(rows), last = runs.slice(-n);
  return { dead: minRun > 0 && last.length >= n && last.every(r => r.n < minRun), last, total: runs.length };
}
export const yieldMarker = id => `<!-- yield-streak:${id} -->`;
/** Đồng bộ issue `yield-zero` cho từng workflow có minRun: chuỗi chết → mở/cập nhật; hồi → đóng (call = (path, {method, body}) → JSON). */
export async function yieldStreakRun(call, floors, readRows) {
  const open = (await call('/issues?state=open&labels=yield-zero&per_page=100')) || [], out = [];
  for (const [id, f] of Object.entries(floors || {})) {
    if (!(f.minRun > 0)) continue;
    const v = yieldStreak(readRows(id), f.minRun, f.streak || YIELD_STREAK_N), ex = open.find(i => !i.pull_request && String(i.body || '').includes(yieldMarker(id)));
    const act = issueAction(v.dead, ex), unit = f.unit || 'mục';
    const title = `Sản lượng ≈ 0: ${id} (${v.last.length} lượt xanh liền < ${f.minRun} ${unit}/lượt)`;
    const body = `${yieldMarker(id)}\nWorkflow \`${id}\` chạy XANH nhưng ${v.last.length} lượt gần nhất mỗi lượt ra < ${f.minRun} ${unit} (sàn lượt \`minRun\` ở infra/yield-floors.json) – hỏng âm thầm, cần nguyên nhân gốc chứ không chỉ chạy lại.\n\n` +
      v.last.map(r => `- ${r.t} · run ${r.run} · ${r.n} ${unit}`).join('\n') + `\n\nKhám: log bước plan/tạo của các run trên (hết ứng viên? cầu dao AI? kho hạn mức?); ${f.note || ''}\nTự đóng khi một lượt ≥ ${f.minRun}. Máy gác: scripts/ci/guards.mjs yield-streak (docs/HEALTH-BOARD.md).`;
    if (act === 'create') await call('/issues', { method: 'POST', body: { title, body, labels: ['yield-zero'] } });
    if (act === 'update' && (ex.title !== title || ex.body !== body)) await call(`/issues/${ex.number}`, { method: 'PATCH', body: { title, body } });
    if (act === 'close') { await call(`/issues/${ex.number}/comments`, { method: 'POST', body: { body: `Sản lượng hồi (${v.last.map(r => r.n).join(', ')} ${unit}) – tự đóng.` } }); await call(`/issues/${ex.number}`, { method: 'PATCH', body: { state: 'closed' } }); }
    out.push({ id, act, dead: v.dead, last: v.last.map(r => r.n) });
  }
  return out;
}

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
    console.log('budget:', low.length, await syncIssue({ label: 'budget-low', needed: low.length > 0, title: `Ngân sách sắp hết: ${low.map(h => h.name).join(', ')}`, body: `Dùng ≥ 95 % trần: dư < 5 KB hoặc < 5 % (vàng, chưa đỏ; mục tiêu main chừa ≥ 3 %):\n\n${low.map(h => `- **${h.name}**: ${kb(h.used)} / ${kb(h.cap)} – còn ${kb(h.free)}`).join('\n')}\n\nKhông nâng ngân sách: rà dữ liệu trùng/thừa, chuyển sang tải lười. PR thêm byte nên chờ tới khi có chỗ (hai PR xanh riêng cộng lại có thể vượt – 05/11 374/374 KB).` }));
  } else if (cmd === 'wip') {
    const n = +arg('pr'), pr = await api(`/pulls/${n}`), labels = pr.labels.map(l => l.name);
    const open = (await api('/pulls?state=open&per_page=100')).filter(p => p.number !== n).length;
    const v = wipVerdict({ openCount: open, labels });
    console.log('wip:', v.why);
    // Nhãn miễn trừ gắn SAU khi đã bị đóng băng (vd main-red-fix, p0) → gỡ frozen để autopilot gộp được (chủ duyệt 24/11)
    if (!v.freeze && labels.includes('frozen') && labels.some(l => EXEMPT.includes(l))) await api(`/issues/${n}/labels/frozen`, { method: 'DELETE' }).catch(e => console.log('::warning::unfreeze: ' + e.message));
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
  } else if (cmd === 'yield-streak') {
    const fs = await import('node:fs'), dir = 'reports/yield', files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    const rows = id => files.filter(f => f === `${id}.json` || (f.startsWith(id + '.') && f.endsWith('.json'))).flatMap(f => { try { return JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')).runs || []; } catch { return []; } });
    if (!(await api('/labels/yield-zero').catch(() => null))) await api('/labels', { method: 'POST', body: { name: 'yield-zero', color: 'b60205', description: 'Workflow xanh nhưng sản lượng ≈ 0 (guards.mjs yield-streak)' } }).catch(() => {});
    console.log('yield-streak:', JSON.stringify(await yieldStreakRun((p, o) => api(p, o), JSON.parse(fs.readFileSync('infra/yield-floors.json', 'utf8')), rows)));
  } else if (cmd === 'stale-ci') {
    const r = await staleCiRun((p, o) => api(p, o)); console.log(r.md);
  } else { console.error('dùng: guards.mjs lane|main-red|budget|wip|web-daily|yield-streak|stale-ci'); process.exit(2); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error('::error::guards: ' + e.message); process.exit(1); });
