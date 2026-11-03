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
const AUTO = ['push', 'pull_request', 'pull_request_target', 'schedule', 'workflow_run', 'check_suite'];
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
  return out;
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
  ok(violations('x.yml', nd.replace('  pull_request:\n', '  push:\n    branches: [main]\n')).length === 0, 'workflow không chạy trên PR: chưa áp luật 4');
  ok(violations('x.yml', pr.replace('    timeout-minutes: 5\n', "    timeout-minutes: 5\n    steps:\n      - if: always()\n        run: x\n").replace('    steps: []\n', '')).length === 0, 'always() mức bước (upload artifact) không bị chặn');
  // --- quét repo
  const files = fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f));
  for (const f of files) for (const v of violations(f, fs.readFileSync(path.join(WF, f), 'utf8'))) ok(false, v);
  console.log(fails ? `ci-policy: ${fails} lỗi` : `✓ ci-policy: ${files.length} workflow đạt (timeout + concurrency + phạm vi)`);
  process.exit(fails ? 1 : 0);
}
