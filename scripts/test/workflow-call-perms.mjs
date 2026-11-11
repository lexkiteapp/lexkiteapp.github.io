// workflow-call-perms: job gọi workflow con (`uses: ./.github/workflows/x.yml`) phải CẤP đủ mọi quyền mà job của workflow con xin.
// Thiếu dù chỉ 1 quyền (kể cả job có `if:` sai) → GitHub từ chối cả lượt chạy = startup_failure, không job nào chạy, không log:
// 10/11 Prod release đỏ startup_failure MỌI lần đẩy main (npm-test.yml job `heavy` xin actions: write) và Quality sweep đỏ mỗi đêm
// (journey-e2e.yml xin checks: read) – nhiều ngày không ai thấy vì không có log. Chạy: node scripts/test/workflow-call-perms.mjs
import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const DIR = '.github/workflows';
const PY = `import sys,yaml,json,os
out={}
for f in os.listdir(sys.argv[1]):
    if f.endswith(('.yml','.yaml')): out[f]=yaml.safe_load(open(os.path.join(sys.argv[1],f),encoding='utf-8'))
print(json.dumps(out,default=str))`;
const LV = { none: 0, read: 1, write: 2 };
const SCOPES = ['actions', 'attestations', 'checks', 'contents', 'deployments', 'discussions', 'id-token', 'issues', 'models', 'packages', 'pages', 'pull-requests', 'repository-projects', 'security-events', 'statuses'];
// chuẩn hoá `permissions` → {scope: 0|1|2}; undefined = không khai báo (kế thừa)
export function norm(p) {
  if (p === undefined || p === null) return undefined;
  if (p === 'read-all' || p === 'write-all') return Object.fromEntries(SCOPES.map(s => [s, p === 'write-all' ? 2 : 1]));
  if (typeof p === 'object') { const o = {}; for (const [k, v] of Object.entries(p)) o[k] = LV[v] ?? 0; return o; }
  return {};
}
// trả mảng lỗi: [{caller, job, callee, scope, need, have}]
export function check(wfs) {
  const bad = [];
  for (const [file, wf] of Object.entries(wfs)) {
    for (const [jid, job] of Object.entries(wf?.jobs || {})) {
      const m = typeof job?.uses === 'string' && job.uses.match(/^\.\/\.github\/workflows\/(.+\.ya?ml)$/);
      if (!m) continue;
      const have = norm(job.permissions) ?? norm(wf.permissions);
      if (!have) continue;   // caller không khai báo → quyền mặc định của repo, GitHub không chặn ở đây
      const callee = wfs[m[1]];
      if (!callee) { bad.push({ caller: file, job: jid, callee: m[1], scope: '(file không tồn tại)', need: '', have: '' }); continue; }
      for (const [cj, cjob] of Object.entries(callee.jobs || {})) {
        const need = norm(cjob?.permissions) ?? norm(callee.permissions) ?? {};
        for (const [s, n] of Object.entries(need)) if (n > (have[s] ?? 0)) bad.push({ caller: file, job: jid, callee: `${m[1]}#${cj}`, scope: s, need: n, have: have[s] ?? 0 });
      }
    }
  }
  return bad;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // tự kiểm: trường hợp thật của 10/11 phải bị bắt
  const sample = { 'a.yml': { permissions: { contents: 'write' }, jobs: { g: { uses: './.github/workflows/b.yml' }, ok: { uses: './.github/workflows/b.yml', permissions: { contents: 'read', actions: 'write' } } } },
    'b.yml': { permissions: { contents: 'read' }, jobs: { t: {}, h: { permissions: { actions: 'write' } } } } };
  const s = check(sample);
  if (s.length !== 1 || s[0].job !== 'g' || s[0].scope !== 'actions') { console.error('✗ workflow-call-perms tự kiểm sai', s); process.exit(1); }
  const r = spawnSync('python3', ['-c', PY, DIR], { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) { console.error('✗ workflow-call-perms: cần python3 + PyYAML', r.stderr); process.exit(2); }
  const bad = check(JSON.parse(r.stdout));
  const N = ['none', 'read', 'write'];
  if (bad.length) {
    for (const b of bad) console.error(`✗ ${b.caller} job "${b.job}" gọi ${b.callee}: thiếu ${b.scope}: ${N[b.need] ?? ''} (đang cấp ${N[b.have] ?? ''}) → startup_failure`);
    console.error('Sửa: thêm `permissions:` ở job gọi (gồm đủ quyền con xin).'); process.exit(1);
  }
  console.log('✓ workflow-call-perms: mọi job gọi workflow con đều cấp đủ quyền');
}
