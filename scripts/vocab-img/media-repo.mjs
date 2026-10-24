#!/usr/bin/env node
// Xoay vòng kho media ẢNH ngoài Pages (infra/media-repos.json, kind img – âm thanh do scripts/lib/media-repos.mjs) cho ảnh minh hoạ ~20k × (WebP + AVIF ≤ 6 KB) ≈ 240 MB.
//   node scripts/vocab-img/media-repo.mjs check [--apply]   → đo cỡ từng kho (GitHub API repo.size), ≥ alert (70 %) cảnh báo, ≥ soft_mb → state=full;
//                                                             không còn kho open → (--apply) TẠO kho kế tiếp lexkite-media-N qua API + ghi sổ (state open)
//   node scripts/vocab-img/media-repo.mjs pick <đường dẫn>   → kho cho tệp mới: repos[open][fnv(path) % n] (tệp đã đặt không bao giờ dời)
// Token: LEXKITE_MEDIA_TOKEN (đọc cỡ; tạo kho cần quyền Administration/repo create của tổ chức – thiếu quyền → in hướng dẫn, không lỗi im lặng).
// Kho mới cần thêm route Worker lexkite-media /<id>/* + mục infra/resources.json (infra-check chặn ship nếu thiếu) – lệnh in ra việc cần làm.
import fs from 'fs';
import { fnv } from './style.mjs';

const F = new URL('../../infra/media-repos.json', import.meta.url);
export const load = () => JSON.parse(fs.readFileSync(F, 'utf8'));
export function pick(reg, p, kind = 'img') { const open = reg.repos.filter(r => r.state === 'open' && (!r.kinds || r.kinds.includes(kind))); if (!open.length) throw new Error('không còn kho media open – chạy check --apply'); return open[fnv(p) % open.length]; }
/** quyết định thuần (test được): sizes = {id: MB} → { alerts[], full[], need_new } */
export function plan(reg, sizes) {
  const alerts = [], full = [];
  for (const r of reg.repos) {
    const mb = sizes[r.id]; if (mb == null || r.state !== 'open') continue;
    if (mb >= reg.soft_mb) full.push(r.id); else if (mb >= reg.soft_mb * reg.alert) alerts.push(`${r.id} ${mb} MB ≥ ${Math.round(reg.alert * 100)} % của ${reg.soft_mb} MB`);
  }
  const openLeft = reg.repos.filter(r => r.state === 'open' && !full.includes(r.id) && (!r.kinds || r.kinds.includes('img'))).length;
  return { alerts, full, need_new: openLeft === 0 };
}
export function nextRepo(reg) { const n = reg.repos.length + 1; return { id: 'm' + n, repo: `lexkiteapp/lexkite-media-${n}`, cdn: `https://media.lexkite.com/m${n}/`, kinds: ['img'], state: 'open', at: new Date().toISOString().slice(0, 10) }; }

if (process.argv[1] && new URL(import.meta.url).pathname === fs.realpathSync(process.argv[1])) {
  const [cmd, a1] = process.argv.slice(2), reg = load(), tok = process.env.LEXKITE_MEDIA_TOKEN || process.env.GH_TOKEN;
  if (cmd === 'pick') { console.log(JSON.stringify(pick(reg, a1))); process.exit(0); }
  const H = { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'User-Agent': 'lexkite-ci' };
  const sizes = {};
  for (const r of reg.repos.filter(x => x.state !== 'planned')) { const j = await (await fetch('https://api.github.com/repos/' + r.repo, { headers: H })).json().catch(() => ({})); if (j.size != null) sizes[r.id] = Math.round(j.size / 1024); }
  const p = plan(reg, sizes); console.log('cỡ (MB):', JSON.stringify(sizes), '·', JSON.stringify(p));
  for (const a of p.alerts) console.log('::warning::kho media ' + a);
  if (process.argv.includes('--apply') && (p.full.length || p.need_new)) {
    for (const id of p.full) reg.repos.find(r => r.id === id).state = 'full';
    if (p.need_new) {
      const planned = reg.repos.find(r => r.state === 'planned' && (!r.kinds || r.kinds.includes('img'))), nx = planned || nextRepo(reg), name = nx.repo.split('/')[1];
      const r = await fetch('https://api.github.com/orgs/lexkiteapp/repos', { method: 'POST', headers: H, body: JSON.stringify({ name, private: false, description: 'Lexkite media (rollover) – ảnh/âm thanh theo từ, phục vụ qua media.lexkite.com' }) });
      if (r.status === 201 || r.status === 422) { nx.state = 'open'; if (!planned) reg.repos.push(nx); console.log(`✓ kho ${nx.repo} (${r.status === 422 ? 'đã có' : 'mới tạo'}) → open. VIỆC TIẾP: route Worker lexkite-media ${new URL(nx.cdn).pathname}* + infra/resources.json`); }
      else console.log(`::error::không tạo được ${nx.repo} (${r.status}) – token cần quyền tạo kho của tổ chức; chủ tạo tay rồi chạy lại`);
    }
    fs.writeFileSync(F, JSON.stringify(reg, null, 1) + '\n');
  }
}
