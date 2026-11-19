import { fileURLToPath } from 'node:url';
// Kiểm sổ việc nền (infra/jobs.json ↔ .github/workflows/*.yml ↔ workers/*/wrangler.toml): lịch khớp, không trùng, việc dùng chung tài nguyên ĐỘC QUYỀN không chồng giờ,
// việc nặng không chung phút bắt đầu, việc có lease phải gọi scripts/jobs/lease.mjs. Sinh lịch/ docs: node scripts/jobs/gen.mjs [--write].
import fs from 'fs';
import path from 'path';
export const REG = JSON.parse(fs.readFileSync('infra/jobs.json', 'utf8'));
const W = 10080;
function field(f, lo, hi) { // '*', 'n', 'a,b', 'a-b', '*/n', 'a-b/n' → Set
  const out = new Set();
  for (const part of f.split(',')) {
    const [rng, st] = part.split('/'), step = +st || 1; let a = lo, b = hi;
    if (rng !== '*') { const [x, y] = rng.split('-'); a = +x; b = y === undefined ? (st ? hi : +x) : +y; }
    for (let i = a; i <= b; i += step) out.add(i);
  }
  return out;
}
/** cron 5 trường (UTC) → mảng phút-trong-tuần (0 = CN 00:00). Bỏ qua ngày-trong-tháng/tháng (sổ chỉ dùng * ở đó). */
export function starts(cron) {
  const [mi, ho, , , dw] = cron.trim().split(/\s+/), M = field(mi, 0, 59), H = field(ho, 0, 23), D = field(dw === undefined ? '*' : dw.replace(/7/g, '0'), 0, 6), out = [];
  for (const d of D) for (const h of H) for (const m of M) out.push(d * 1440 + h * 60 + m);
  return out;
}
const overlap = (a, la, b, lb) => { const d = ((b - a) % W + W) % W; return d < la || ((a - b) % W + W) % W < lb; };
export function check(reg, wfDir = '.github/workflows', root = '.') {
  const bad = [], ids = new Set(), wfs = new Set();
  const excl = new Set(Object.entries(reg.resources).filter(([, v]) => v.exclusive).map(([k]) => k));
  for (const j of reg.jobs) {
    if (ids.has(j.id)) bad.push('trùng id ' + j.id); ids.add(j.id);
    const key = j.workflow || j.worker; if (wfs.has(key)) bad.push('trùng nguồn ' + key); wfs.add(key);
    if (!reg.priorities.includes(j.priority)) bad.push(`${j.id}: priority lạ ${j.priority}`);
    for (const r of j.resources) if (!reg.resources[r]) bad.push(`${j.id}: tài nguyên lạ ${r}`);
    if (!(j.minutes > 0) || !Array.isArray(j.cron) || !j.cron.length) bad.push(`${j.id}: thiếu minutes/cron`);
    j.cron.forEach(c => { if (c.trim().split(/\s+/).length !== 5) bad.push(`${j.id}: cron sai "${c}"`); });
  }
  // khớp workflow thật
  const real = {};
  for (const f of fs.readdirSync(path.join(root, wfDir)).filter(x => x.endsWith('.yml'))) {
    const s = fs.readFileSync(path.join(root, wfDir, f), 'utf8'), cs = [...s.matchAll(/^\s*-\s*cron:\s*'([^']+)'/gm)].map(m => m[1]);
    if (cs.length) real[f] = { cs, s };
  }
  for (const j of reg.jobs.filter(j => j.workflow)) {
    const r = real[j.workflow];
    if (j.paused) {   // tạm dừng: workflow tồn tại nhưng KHÔNG được có lịch (cron trong sổ = lịch dự kiến khi bật)
      if (r) bad.push(`${j.id}: paused nhưng workflow vẫn có schedule`); else if (!fs.existsSync(path.join(root, wfDir, j.workflow))) bad.push(`${j.id}: workflow ${j.workflow} không tồn tại`);
      else if (j.lease && !new RegExp('scripts/jobs/lease\\.mjs acquire ' + j.id + '\\b').test(fs.readFileSync(path.join(root, wfDir, j.workflow), 'utf8'))) bad.push(`${j.id}: lease:true nhưng workflow thiếu bước thuê`);
      continue;
    }
    if (!r) { bad.push(`${j.id}: workflow ${j.workflow} không có lịch (schedule) hoặc không tồn tại`); continue; }
    if (JSON.stringify([...r.cs].sort()) !== JSON.stringify([...j.cron].sort())) bad.push(`${j.id}: cron workflow ${JSON.stringify(r.cs)} ≠ sổ ${JSON.stringify(j.cron)} (chạy node scripts/jobs/gen.mjs --write)`);
    if (j.lease && !new RegExp('scripts/jobs/lease\\.mjs acquire ' + j.id + '\\b').test(r.s)) bad.push(`${j.id}: lease:true nhưng workflow thiếu bước "node scripts/jobs/lease.mjs acquire ${j.id}"`);
  }
  for (const f of Object.keys(real)) if (!reg.jobs.some(j => j.workflow === f)) bad.push(`workflow ${f} có lịch nhưng chưa vào infra/jobs.json`);
  // đặt chỗ Workers AI tài khoản chính cho đường người dùng: việc nền dùng workers_ai phải thuê (lease) và không vượt phần được cấp (mặc định 0)
  const R = (reg.reservations || {}).workers_ai || { background_neurons: 0, grants: {} };
  for (const j of reg.jobs.filter(j => j.resources.includes('workers_ai'))) {
    if (!j.lease) bad.push(`${j.id}: dùng workers_ai (neuron tài khoản chính) nhưng lease:false – phải thuê để nhận phần cấp`);
    const g = (R.grants || {})[j.id] ?? R.background_neurons ?? 0, need = (j.est || {}).workers_ai_neurons || 0;
    if (need > g) bad.push(`${j.id}: ước lượng ${need} neuron Workers AI chính > phần cấp ${g} (mặc định nền = 0; cấp thêm trong reservations.workers_ai.grants)`);
  }
  const RB = (reg.reservations || {}).workers_ai_b;
  if (RB) {
    const sum = Object.values(RB.grants || {}).reduce((a, b) => a + b, 0);
    if (sum > RB.daily_neurons - RB.safety_margin) bad.push(`workers_ai_b: tổng phần cấp ${sum} > ${RB.daily_neurons} − biên an toàn ${RB.safety_margin}`);
    for (const j of reg.jobs.filter(j => j.resources.includes('workers_ai_b'))) {
      if (!j.lease) bad.push(`${j.id}: dùng workers_ai_b nhưng lease:false`);
      if (((j.est || {}).workers_ai_b_neurons || 0) > ((RB.grants || {})[j.id] || 0)) bad.push(`${j.id}: ước lượng ${(j.est || {}).workers_ai_b_neurons} neuron tài khoản 2 > phần cấp ${(RB.grants || {})[j.id] || 0}`);
    }
  }
  // chồng giờ
  const heavy = j => j.resources.some(r => excl.has(r)) || j.minutes >= 60;
  for (let i = 0; i < reg.jobs.length; i++) for (let k = i + 1; k < reg.jobs.length; k++) {
    const a = reg.jobs[i], b = reg.jobs[k], shared = a.resources.filter(r => excl.has(r) && b.resources.includes(r));
    const sa = a.cron.flatMap(starts), sb = b.cron.flatMap(starts);
    if (heavy(a) && heavy(b) && sa.some(x => sb.includes(x))) bad.push(`${a.id} & ${b.id}: cùng phút bắt đầu (việc nặng phải so le)`);
    if (shared.length && sa.some(x => sb.some(y => overlap(x, a.minutes, y, b.minutes)))) bad.push(`${a.id} & ${b.id}: chồng giờ trên tài nguyên độc quyền ${shared.join(',')}`);
  }
  return bad;
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(new URL(import.meta.url)))) {
  const bad = check(REG);
  if (bad.length) { console.error('✗ jobs-check:\n' + bad.map(x => '  - ' + x).join('\n')); process.exit(1); }
  console.log(`✓ jobs-check: ${REG.jobs.length} việc nền – lịch khớp workflow, không trùng, không chồng giờ trên tài nguyên độc quyền`);
}
