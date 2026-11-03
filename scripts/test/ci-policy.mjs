// Chính sách workflow (2/11 – "CI tiết kiệm, không mất tín hiệu"): mọi workflow phải tự giới hạn số lượt + thời gian.
//  1) Mọi job (trừ job gọi workflow tái dùng `uses:`) có `timeout-minutes` – job treo không giữ runner 6 giờ.
//  2) Workflow có sự kiện tự động (push / pull_request / schedule / workflow_run / check_suite) có `concurrency` (mức workflow hoặc job)
//     – lượt trùng cùng nhánh/sha bị gộp thay vì dồn hàng. Workflow chỉ chạy tay/gọi lại (dispatch/workflow_call) mà cố ý không gộp
//     (mỗi lượt khác input, nhóm chung sẽ HUỶ lượt chờ = mất việc – docs/CI-RUNNERS.md) ghi rõ: `# ci-policy: no-concurrency – <lý do>`.
//  3) push / pull_request có phạm vi: `paths`/`paths-ignore`, hoặc push chỉ trên nhánh thử riêng (không có main), hoặc lý do:
//     `# ci-policy: all-paths – <lý do>` (vd. check bắt buộc phải chạy mọi PR).
//  4) Workflow chạy trên PR (pull_request/_target – kết quả job = check của PR): job có `needs:` không dùng `always()` trần: `always()` vẫn chạy khi CẢ lượt đã bị huỷ (huỷ tay/concurrency/giải phóng runner)
//     → job tải artifact của job bị huỷ đỏ "Artifact not found" và nhuộm đỏ PR (3/11: before-after đỏ ở #311 #323 #325 #326 #331 vì bot bị huỷ).
//     Dùng `!cancelled()` (chạy cả khi job trước đỏ, không chạy khi lượt bị huỷ), hoặc có chặn rõ `needs.<job>.result != 'cancelled'`.
//  5) (3/11 – sự cố required-gate: workflow_run ×38 → ~20 runner/commit, 66 % lượt CI) workflow nghe workflow_run / check_suite / check_run:
//     (a) mọi job có `if:` mức job (hoặc `needs:` job đã có if) – lượt không cần là skipped, không chiếm runner; danh sách workflow_run
//         > 5 workflow thì `if:` của job gốc phải lọc theo chính sự kiện (github.event.workflow_run / check_suite / check_run);
//     (b) concurrency có cancel-in-progress: true, hoặc dòng `# ci-policy: queue – <lý do>` (việc tuần tự không được huỷ, vd. deploy);
//     (c) không vòng workflow_run (A → B → A) – kiểm trên toàn bộ .github/workflows.
// Không có danh sách miễn trừ ngầm: ngoại lệ nằm ngay trong file workflow, kèm lý do. Chạy: node scripts/test/ci-policy.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WF = path.join(ROOT, '.github/workflows');

/** Khối `on:` (thuần) → { events: Set, push: text, pull_request: text }. Hỗ trợ dạng khối (repo không dùng `on: [..]`). */
export function triggers(src) {
  const m = String(src).match(/^on:[ \t]*\n([\s\S]*?)(?=^\S)/m), body = m ? m[1] : '';
  const inline = String(src).match(/^on:[ \t]*\[?([^\n\]]+)\]?[ \t]*$/m);
  const events = new Set(inline && !m ? inline[1].split(',').map(s => s.trim()) : [...body.matchAll(/^  ([a-z_]+):/gm)].map(x => x[1]));
  const block = ev => { const b = body.match(new RegExp(`^  ${ev}:[^\\n]*\\n((?:    [^\\n]*\\n|\\s*\\n)*)`, 'm')); return b ? b[1] : ''; };
  return { events, push: block('push'), pull_request: block('pull_request') };
}
/** Các job (thuần) → [{ id, text }]. */
export function jobs(src) {
  const m = String(src).match(/^jobs:[ \t]*\n([\s\S]*)$/m); if (!m) return [];
  const body = m[1], heads = [...body.matchAll(/^  ([\w-]+):[ \t]*(?:#.*)?\n/gm)];
  return heads.map((h, i) => ({ id: h[1], text: body.slice(h.index, i + 1 < heads.length ? heads[i + 1].index : undefined) }));
}
const AUTO = ['push', 'pull_request', 'pull_request_target', 'schedule', 'workflow_run', 'check_suite', 'check_run'];
const CHAIN = ['workflow_run', 'check_suite', 'check_run'];
const reason = (src, k) => new RegExp(`^#\\s*ci-policy:\\s*${k}\\s*[–-]\\s*\\S.{8,}`, 'm').test(src);
/** Lỗi chính sách của 1 workflow (thuần, có test) → [chuỗi]. */
export function violations(file, src) {
  const out = [], t = triggers(src);
  for (const j of jobs(src)) if (!/^    uses:/m.test(j.text) && !/^    timeout-minutes:/m.test(j.text)) out.push(`${file}: job "${j.id}" thiếu timeout-minutes`);
  const hasConc = /^concurrency:/m.test(src) || jobs(src).some(j => /^    concurrency:/m.test(j.text));
  const auto = AUTO.filter(e => t.events.has(e));
  if (!hasConc && auto.length) out.push(`${file}: chạy tự động (${auto.join(', ')}) mà thiếu concurrency`);
  else if (!hasConc && !reason(src, 'no-concurrency')) out.push(`${file}: thiếu concurrency (hoặc dòng "# ci-policy: no-concurrency – <lý do>")`);
  const scoped = ev => /^\s*paths(-ignore)?:/m.test(t[ev]) || (ev === 'push' && /^\s*branches:/m.test(t.push) && !/\bmain\b/.test((t.push.match(/^\s*branches:([^\n]*)/m) || [])[1] || ''));
  for (const ev of ['push', 'pull_request']) if (t.events.has(ev) && !scoped(ev) && !reason(src, 'all-paths')) out.push(`${file}: ${ev} không có paths (hoặc dòng "# ci-policy: all-paths – <lý do>")`);
  if (t.events.has('pull_request') || t.events.has('pull_request_target')) for (const j of jobs(src)) { const c = (j.text.match(/^    if:([^\n]*)/m) || [])[1] || '';
    if (/^    needs:/m.test(j.text) && /\balways\(\)/.test(c) && !/!=\s*'cancelled'/.test(c)) out.push(`${file}: job "${j.id}" có needs + if: always() – lượt bị huỷ vẫn chạy rồi đỏ; dùng !cancelled()`); }
  const chain = CHAIN.filter(e => t.events.has(e));
  if (chain.length) {
    const js = jobs(src), gated = new Set(js.filter(j => /^    if:/m.test(j.text)).map(j => j.id));
    const needsOf = j => { const m = j.text.match(/^    needs:\s*(\[[^\]]*\]|[\w-]+)/m); return m ? m[1].replace(/[[\]\s]/g, '').split(',').filter(Boolean) : []; };
    for (const j of js) if (!gated.has(j.id) && !needsOf(j).some(n => gated.has(n))) out.push(`${file}: nghe ${chain.join('/')} mà job "${j.id}" thiếu if: mức job (lượt không cần phải skipped, không chiếm runner)`);
    const list = workflowRunList(src);
    if (list.length > 5) for (const j of js) if (!needsOf(j).length && !/^    if:.*github\.event\.(workflow_run|check_suite|check_run)/m.test(j.text)) out.push(`${file}: workflow_run nghe ${list.length} workflow (> 5) mà job "${j.id}" không có cổng skip theo github.event.workflow_run`);
    if (!/cancel-in-progress:\s*true/.test(src) && !reason(src, 'queue')) out.push(`${file}: nghe ${chain.join('/')} cần concurrency cancel-in-progress: true (hoặc dòng "# ci-policy: queue – <lý do>")`);
  }
  return out;
}
/** Tên các workflow trong workflow_run.workflows (dạng [a, b] hoặc danh sách - 'a'). */
export function workflowRunList(src) {
  const b = (String(src).match(/^  workflow_run:[^\n]*\n((?:    [^\n]*\n|\s*\n)*)/m) || [, ''])[1];
  const inl = b.match(/^    workflows:\s*\[([^\]]*)\]/m);
  if (inl) return inl[1].split(',').map(x => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  const blk = b.match(/^    workflows:\s*\n((?:      - [^\n]*\n)*)/m);
  return blk ? [...blk[1].matchAll(/^      - ['"]?([^'"\n#]+?)['"]?\s*(?:#.*)?$/gm)].map(x => x[1].trim()) : [];
}
/** Vòng workflow_run trên cả thư mục: files = [[file, src]] → ['A → B → A', …]. */
export function chainCycles(files) {
  const name = (f, s) => ((s.match(/^name:\s*(.+)$/m) || [])[1] || f).trim().replace(/^['"]|['"]$/g, '');
  const edges = new Map();   // workflow nguồn → workflow bị kích hoạt
  for (const [f, s] of files) for (const src of workflowRunList(s)) { if (!edges.has(src)) edges.set(src, new Set()); edges.get(src).add(name(f, s)); }
  const out = new Set(), path = [], on = new Set(), done = new Set();
  const dfs = n => { if (on.has(n)) { const i = path.indexOf(n); out.add([...path.slice(i), n].join(' → ')); return; } if (done.has(n)) return;
    on.add(n); path.push(n); for (const m of edges.get(n) || []) dfs(m); path.pop(); on.delete(n); done.add(n); };
  for (const n of edges.keys()) dfs(n);
  return [...out];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
  // --- tự kiểm hàm thuần
  const base = "name: x\non:\n  push:\n    branches: [main]\n    paths: ['a/**']\nconcurrency: { group: x }\njobs:\n  a:\n    runs-on: ubuntu-latest\n    timeout-minutes: 5\n    steps: []\n";
  ok(violations('x.yml', base).length === 0, 'mẫu đúng → 0 lỗi');
  ok(violations('x.yml', base.replace('    timeout-minutes: 5\n', '')).some(v => /timeout-minutes/.test(v)), 'job thiếu timeout → lỗi');
  ok(violations('x.yml', base.replace('    timeout-minutes: 5\n', '').replace('    runs-on: ubuntu-latest\n', '    uses: ./.github/workflows/y.yml\n')).length === 0, 'job uses: (workflow tái dùng) không cần timeout');
  ok(violations('x.yml', base.replace('concurrency: { group: x }\n', '')).some(v => /thiếu concurrency/.test(v)), 'push thiếu concurrency → lỗi');
  ok(violations('x.yml', base.replace('concurrency: { group: x }\n', '').replace('steps: []', 'concurrency: { group: y }\n    steps: []')).length === 0, 'concurrency mức job cũng được');
  ok(violations('x.yml', base.replace("    paths: ['a/**']\n", '')).some(v => /không có paths/.test(v)), 'push main không paths → lỗi');
  ok(violations('x.yml', '# ci-policy: all-paths – check bắt buộc của ruleset\n' + base.replace("    paths: ['a/**']\n", '')).length === 0, 'all-paths có lý do → đạt');
  ok(violations('x.yml', base.replace("    branches: [main]\n    paths: ['a/**']\n", "    branches: ['try-*']\n")).length === 0, 'push nhánh thử riêng = có phạm vi');
  const disp = "name: d\non:\n  workflow_dispatch:\njobs:\n  a:\n    runs-on: ubuntu-latest\n    timeout-minutes: 5\n    steps: []\n";
  ok(violations('d.yml', disp).some(v => /no-concurrency/.test(v)), 'dispatch không concurrency, không lý do → lỗi');
  ok(violations('d.yml', '# ci-policy: no-concurrency – mỗi lượt khác input, nhóm chung huỷ lượt chờ\n' + disp).length === 0, 'dispatch có lý do → đạt');
  ok(violations('d.yml', '# ci-policy: no-concurrency – x\n' + disp).length === 1, 'lý do quá ngắn không tính');
  const pr = base.replace('  push:\n    branches: [main]\n', '  pull_request:\n');
  const nd = pr.replace('    runs-on: ubuntu-latest\n', "    needs: b\n    if: always() && github.event_name == 'pull_request'\n    runs-on: ubuntu-latest\n");
  ok(violations('x.yml', nd).some(v => /always\(\)/.test(v)), 'job needs + always() trần → lỗi (before-after đỏ khi bot bị huỷ)');
  ok(violations('x.yml', nd.replace('always()', '!cancelled()')).length === 0, 'job needs + !cancelled() → đạt');
  ok(violations('x.yml', nd.replace("&& github.event_name == 'pull_request'", "&& needs.b.result != 'cancelled'")).length === 0, "always() + chặn != 'cancelled' → đạt");
  ok(violations('x.yml', nd.replace('  pull_request:\n', '  push:\n    branches: [main]\n')).length === 0, 'workflow không chạy trên PR: chưa áp luật 5');
  ok(violations('x.yml', pr.replace('    timeout-minutes: 5\n', "    timeout-minutes: 5\n    steps:\n      - if: always()\n        run: x\n").replace('    steps: []\n', '')).length === 0, 'always() mức bước (upload artifact) không bị chặn');
  // --- 5) workflow_run / check_suite / check_run (hồi quy sự cố required-gate 3/11 – fixture vi phạm phải đỏ)
  const wr = (list, job = "    if: github.event.workflow_run.conclusion == 'success'\n", conc = "concurrency: { group: w-${{ github.event.workflow_run.head_sha }}, cancel-in-progress: true }\n") =>
    `name: w\non:\n  workflow_run:\n    types: [completed]\n    workflows: [${list.join(', ')}]\n${conc}jobs:\n  a:\n${job}    runs-on: ubuntu-latest\n    timeout-minutes: 3\n    steps: []\n`;
  ok(violations('w.yml', wr(['A'])).length === 0, 'workflow_run có if + cancel → đạt');
  ok(violations('w.yml', wr(['A'], '')).some(v => /thiếu if/.test(v)), 'workflow_run job thiếu if → lỗi');
  ok(violations('w.yml', wr(['A']).replace('steps: []\n', 'steps: []\n  b:\n    needs: a\n    runs-on: ubuntu-latest\n    timeout-minutes: 3\n    steps: []\n')).length === 0, 'job needs job đã có if → đạt (skipped lan theo needs)');
  ok(violations('w.yml', wr(['A'], '', '').replace('jobs:\n  a:\n', 'jobs:\n  a:\n    if: always()\n')).some(v => /concurrency/.test(v)), 'workflow_run thiếu concurrency → lỗi');
  ok(violations('w.yml', wr(['A'], undefined, 'concurrency: { group: w, cancel-in-progress: false }\n')).some(v => /cancel-in-progress/.test(v)), 'workflow_run cancel-in-progress false không lý do → lỗi');
  ok(violations('w.yml', '# ci-policy: queue – deploy tuần tự, huỷ là mất bản phát hành\n' + wr(['A'], undefined, 'concurrency: { group: w, cancel-in-progress: false }\n')).length === 0, 'queue có lý do → đạt');
  const six = ['A', 'B', 'C', 'D', 'E', 'F'];
  ok(violations('w.yml', wr(six, '    if: always()\n')).some(v => /> 5/.test(v)), 'danh sách workflow_run > 5 mà if không lọc theo sự kiện → lỗi (kiểu required-gate cũ)');
  ok(violations('w.yml', wr(six)).length === 0, 'danh sách > 5 có cổng skip theo github.event.workflow_run → đạt');
  ok(violations('c.yml', "name: c\non:\n  check_suite:\n    types: [completed]\nconcurrency: { group: c, cancel-in-progress: true }\njobs:\n  a:\n    runs-on: ubuntu-latest\n    timeout-minutes: 3\n    steps: []\n").some(v => /thiếu if/.test(v)), 'check_suite job thiếu if → lỗi');
  ok(workflowRunList("on:\n  workflow_run:\n    workflows:\n      - 'Một'\n      - Hai # x\n    types: [completed]\n").join() === 'Một,Hai', 'đọc danh sách workflow_run dạng khối');
  ok(chainCycles([['a.yml', wr(['B']).replace('name: w', 'name: A')], ['b.yml', wr(['A']).replace('name: w', 'name: B')]]).length === 1, 'vòng A → B → A → lỗi');
  ok(chainCycles([['a.yml', wr(['A']).replace('name: w', 'name: A')]]).length === 1, 'tự kích hoạt A → A → lỗi');
  ok(chainCycles([['a.yml', wr(['B']).replace('name: w', 'name: A')], ['c.yml', wr(['A']).replace('name: w', 'name: C')]]).length === 0, 'chuỗi B → A → C không vòng → đạt');
  // --- quét repo
  const files = fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f)), srcs = files.map(f => [f, fs.readFileSync(path.join(WF, f), 'utf8')]);
  for (const [f, s] of srcs) for (const v of violations(f, s)) ok(false, v);
  for (const c of chainCycles(srcs)) ok(false, `vòng workflow_run: ${c}`);
  console.log(fails ? `ci-policy: ${fails} lỗi` : `✓ ci-policy: ${files.length} workflow đạt (timeout + concurrency + phạm vi + workflow_run có cổng skip, không vòng)`);
  process.exit(fails ? 1 : 0);
}
