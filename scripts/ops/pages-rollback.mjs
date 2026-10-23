// Quay lại bản deploy trước của Cloudflare Pages (dự án lexkite) bằng API – Pages giữ MỌI bản deploy. Gọi qua: bash scripts/ops/rollback-pages.sh [--dry-run] [--list] [<đích>]
// <đích>: (bỏ trống | previous) = bản production thành công ngay trước bản đang chạy · good = commit đang gắn tag prod-good (bản cuối cùng qua smoke) ·
//         prod-YYYYMMDD-HHMM-<sha7> = tag release · <sha7+> = commit · <deployment id | short id>. Token: CLOUDFLARE_API_TOKEN (quyền Pages:Edit) hoặc ~/.config/lexkite/cf-token.
// Rollback chỉ đổi BẢN WEB/FUNCTIONS đang phục vụ; KHÔNG hoàn tác D1 (xem docs/ROLLBACK.md §Dữ liệu) và lần push main kế tiếp sẽ deploy lại code xấu nếu chưa git revert.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

const ACCT = process.env.CF_ACCOUNT_ID || 'e34e14b7ab35eaf2b3d9d84fcce011f7', PROJECT = process.env.CF_PAGES_PROJECT || 'lexkite', GIT = process.env.LEXKITE_GIT_URL || 'https://github.com/lexkiteapp/lexkiteapp.github.io.git';
const API = (process.env.CF_API_BASE || 'https://api.cloudflare.com/client/v4') + `/accounts/${ACCT}/pages/projects/${PROJECT}`;
export const isOk = d => d && d.environment === 'production' && d.latest_stage && d.latest_stage.name === 'deploy' && d.latest_stage.status === 'success';
export const commitOf = d => String((d.deployment_trigger && d.deployment_trigger.metadata && d.deployment_trigger.metadata.commit_hash) || '');
const short = d => `${d.short_id || String(d.id).slice(0, 8)} · ${commitOf(d).slice(0, 7) || '-'} · ${String(d.created_on || '').replace('T', ' ').slice(0, 16)}Z · ${(((d.deployment_trigger || {}).metadata || {}).commit_message || '').split('\n')[0].slice(0, 70)}`;

/** Chọn bản đích trong danh sách (mới → cũ). shaOf(tag) → sha đầy đủ hoặc null. → { cur, target, why } | { error }. */
export function pick(deps, want, shaOf = () => null) {
  const prod = deps.filter(d => d.environment === 'production'), ok = prod.filter(isOk), cur = ok[0];
  if (!cur) return { error: 'không thấy bản production thành công nào' };
  const w = String(want || 'previous');
  let target = null, why = '';
  if (w === 'previous') { target = ok[1]; why = 'bản thành công ngay trước bản đang chạy'; }
  else {
    let sha = null;
    if (w === 'good' || /^prod-/.test(w)) { sha = shaOf(w === 'good' ? 'prod-good' : w); if (!sha) return { error: `không tìm thấy tag ${w === 'good' ? 'prod-good' : w} trên GitHub` }; why = `commit ${sha.slice(0, 7)} của tag ${w === 'good' ? 'prod-good' : w}`; }
    else if (/^[0-9a-f]{7,40}$/i.test(w) && !prod.some(d => d.id === w || d.short_id === w)) { sha = w; why = 'commit ' + w; }
    target = sha ? ok.find(d => { const c = commitOf(d).toLowerCase(), q = sha.toLowerCase(); return c && (c.startsWith(q) || q.startsWith(c)); }) : prod.find(d => d.id === w || d.short_id === w);
    if (target && !isOk(target)) return { error: `bản ${short(target)} không phải bản thành công – Pages chỉ rollback về bản thành công` };
    if (!why) why = 'deployment ' + w;
  }
  if (!target) return { error: `không có bản deploy production thành công khớp "${w}" (xem --list)` };
  if (target.id === cur.id) return { error: `bản đó chính là bản đang chạy (${short(cur)})` };
  return { cur, target, why };
}

const token = () => process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || (() => { try { return fs.readFileSync(path.join(os.homedir(), '.config/lexkite/cf-token'), 'utf8').trim(); } catch { return ''; } })();
async function cf(p, method = 'GET') {
  const r = await fetch(API + p, { method, headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' } }), j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) throw new Error(`Cloudflare ${method} ${p.split('?')[0]} → ${r.status} ${(j.errors && j.errors[0] && j.errors[0].message) || ''}`);
  return j.result;
}
function tagSha(tag) { // ls-remote công khai (repo công khai, không cần token); tag chú thích → dòng ^{} là commit
  try { const out = execFileSync('git', ['ls-remote', '--tags', GIT, `refs/tags/${tag}`, `refs/tags/${tag}^{}`], { encoding: 'utf8' }).trim().split('\n').filter(Boolean).map(l => l.split(/\s+/)); const peeled = out.find(x => x[1].endsWith('^{}')); return (peeled || out[0] || [])[0] || null; } catch { return null; }
}

async function main() {
  const A = process.argv.slice(2), dry = A.includes('--dry-run'), list = A.includes('--list'), want = A.find(a => !a.startsWith('--'));
  if (A.includes('--help') || A.includes('-h')) { console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(0, 4).map(l => l.replace(/^\/\/ ?/, '')).join('\n')); return 0; }
  if (!token()) { console.error('✗ thiếu token Cloudflare: đặt CLOUDFLARE_API_TOKEN (quyền Pages:Edit) hoặc ghi vào ~/.config/lexkite/cf-token'); return 2; }
  const deps = await cf('/deployments?env=production&per_page=25');
  if (list) { deps.filter(d => d.environment === 'production').forEach((d, i) => console.log(`${isOk(d) ? '✓' : '✗'} ${d.id}  ${short(d)}${i === 0 ? '   ← mới nhất' : ''}`)); return 0; }
  const p = pick(deps, want, tagSha);
  if (p.error) { console.error('✗ ' + p.error); return 1; }
  console.log(`Đang chạy : ${short(p.cur)}\nQuay về   : ${short(p.target)}\n(${p.why}) · id ${p.target.id}`);
  if (dry) { console.log('— chạy thử (--dry-run): chưa đổi gì. Bỏ --dry-run để rollback.'); return 0; }
  await cf(`/deployments/${p.target.id}/rollback`, 'POST');
  console.log(`✓ đã rollback production → ${p.target.short_id || p.target.id}. Hoàn tác (roll-forward): bash scripts/ops/rollback-pages.sh ${p.cur.id}`);
  console.log('Bước tiếp: node scripts/ops/smoke.mjs  ·  rồi git revert commit xấu để push main kế tiếp không deploy lại nó (docs/ROLLBACK.md §Mã nguồn).');
  return 0;
}
if (process.argv[1] && process.argv[1].endsWith('pages-rollback.mjs')) main().then(c => process.exit(c)).catch(e => { console.error('✗ ' + e.message.replace(/Bearer\s+\S+/g, 'Bearer ***')); process.exit(1); });
