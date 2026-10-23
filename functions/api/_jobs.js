/* Điều phối việc nền (23/10/2026): thuê (lease) tài nguyên độc quyền + kiểm ngân sách trước khi chạy; ghi lịch sử chạy/bỏ qua cho Quản trị › Hạn mức › "Lịch việc nền".
 * Sổ việc: infra/jobs.json (sinh vào _jobs_reg.js bởi scripts/jobs/gen.mjs). Bảng job_leases / job_runs nằm ở D1 NỘI BỘ (internalDb) – tra theo khoá, không quét.
 * acquire: (1) ngân sách: tỉ lệ dùng D1 hôm nay của tài khoản liên quan ≥ trần theo ưu tiên → bỏ qua; (2) thuê mọi tài nguyên ĐỘC QUYỀN của việc, hoặc từ chối nếu việc khác đang giữ (không chạy song song). */
import { REG } from './_jobs_reg.js';
import { d1Usage } from './_d1guard.js';
import { d1bReady, d1bMode } from './_d1b.js';

const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const one = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).first()) || null;
const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];
const run = (db, sql, ...a) => db.prepare(sql).bind(...a).run();
let READY = new Set();
export async function setupJobs(db, key = 'x') {
  if (READY.has(key)) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS job_leases (resource TEXT PRIMARY KEY, job TEXT NOT NULL, run TEXT NOT NULL, until INTEGER NOT NULL) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS job_runs (id INTEGER PRIMARY KEY AUTOINCREMENT, job TEXT NOT NULL, run TEXT NOT NULL, day TEXT NOT NULL, started INTEGER NOT NULL, ended INTEGER, status TEXT NOT NULL, reason TEXT, reads INTEGER)'),
    db.prepare('CREATE INDEX IF NOT EXISTS job_runs_day ON job_runs (day, id)'),
  ]);
  READY.add(key);
}
export const jobOf = id => REG.jobs.find(j => j.id === id) || null;
const excl = new Set(Object.entries(REG.resources).filter(([, v]) => v.exclusive).map(([k]) => k));
/** Tài khoản D1 mà việc này đụng tới → ['main'|'b']. */
export function accountsOf(env, j) {
  const out = new Set();
  for (const r of j.resources) { if (r === 'd1_internal') out.add(d1bReady(env) && d1bMode(env) !== '0' ? 'b' : 'main'); if (r === 'd1_main' || r === 'd1_main_read') out.add('main'); }
  return [...out];
}
/** Đặt chỗ tài nguyên cho đường người dùng: neuron Workers AI tài khoản chính được cấp cho việc nền (mặc định 0). Không cần DB. */
export function grantsOf(j) {
  const g = {}, R = (REG.reservations || {}).workers_ai || {};
  if (j.resources.includes('workers_ai')) { const v = (R.grants || {})[j.id]; g.workers_ai = Math.max(0, Math.round(v !== undefined ? +v || 0 : +R.background_neurons || 0)); }
  if (j.resources.includes('workers_ai_b')) { const RB = (REG.reservations || {}).workers_ai_b || {}, v = (RB.grants || {})[j.id]; g.workers_ai_b = Math.max(0, Math.round(+v || 0)); }
  return g;
}
/** Việc nặng/dùng chung (tài nguyên độc quyền, D1, AI…) PHẢI có thuê mới chạy (fail-closed); việc chỉ dùng phút GitHub thì bỏ qua được khi điều phối hỏng. */
export const failClosed = j => !!j && j.resources.some(r => r !== 'gh_minutes' && r !== 'grabcast_ai');
export async function acquire(env, db, b, now = Date.now()) {
  const j = jobOf(String(b.job || '')); if (!j) return { status: 400, error: 'unknown-job' };
  if (j.paused && !b.force) return { ok: false, skip: true, reason: 'paused (infra/jobs.json) – chỉ chạy tay với --force' };
  const runId = String(b.run || 'manual-' + now).slice(0, 60), d = day(now);
  const skip = async reason => { try { await run(db, 'INSERT INTO job_runs (job, run, day, started, ended, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?)', j.id, runId, d, now, now, 'skipped', String(reason).slice(0, 200)); } catch (e) { /* DB hỏng: vẫn trả lý do, không ghi nhật ký */ } return { ok: false, skip: true, reason }; };
  const cap = REG.budget_caps[j.priority] ?? 0.5;
  for (const w of accountsOf(env, j)) {
    let u; try { u = await d1Usage(env, db, now, fetch, w); } catch (e) { continue; }
    if (cap < 1 && u.ratio >= cap) return skip(`ngân sách D1 ${w === 'b' ? 'nội bộ' : 'chính'} ${Math.round(u.ratio * 100)}% ≥ trần ${Math.round(cap * 100)}% của việc "${j.priority}"`);
  }
  const res = j.resources.filter(r => excl.has(r)), until = now + Math.round(j.minutes * 1.5 * 60e3);
  if (res.length) {
    await db.batch([db.prepare('DELETE FROM job_leases WHERE until < ?').bind(now), ...res.map(r => db.prepare('INSERT OR IGNORE INTO job_leases (resource, job, run, until) VALUES (?, ?, ?, ?)').bind(r, j.id, runId, until))]);
    const held = await all(db, `SELECT resource, job, run FROM job_leases WHERE resource IN (${res.map(() => '?').join(',')})`, ...res);
    const other = held.find(h => h.run !== runId);
    if (other || held.length < res.length) { await run(db, 'DELETE FROM job_leases WHERE run = ?', runId); return skip(`đang có "${other ? other.job : '?'}" giữ ${other ? other.resource : res.join(',')} – bỏ qua tới khung kế`); }
  }
  await run(db, 'INSERT INTO job_runs (job, run, day, started, status) VALUES (?, ?, ?, ?, ?)', j.id, runId, d, now, 'running');
  return { ok: true, run: runId, leased: res, until, grants: grantsOf(j) };
}
export async function release(env, db, b, now = Date.now()) {
  const id = String(b.job || ''), runId = String(b.run || '').slice(0, 60); if (!jobOf(id) || !runId) return { status: 400, error: 'bad-input' };
  const st = ['success', 'failure', 'cancelled', 'ok', 'fail'].includes(b.status) ? (b.status === 'success' ? 'ok' : b.status === 'failure' ? 'fail' : b.status) : 'ok';
  await db.batch([db.prepare('DELETE FROM job_leases WHERE run = ?').bind(runId), db.prepare("UPDATE job_runs SET ended = ?, status = ?, reason = ?, reads = ? WHERE run = ? AND job = ? AND status = 'running'").bind(now, st, String(b.reason || '').slice(0, 200) || null, Math.max(0, Math.round(+b.reads) || 0) || null, runId, id)]);
  return { ok: true };
}
export async function timeline(env, db, b, now = Date.now()) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(b.day || '')) ? b.day : day(now);
  const runs = await all(db, 'SELECT job, run, started, ended, status, reason, reads FROM job_runs WHERE day = ? ORDER BY id LIMIT 300', d);
  const leases = await all(db, 'SELECT resource, job, until FROM job_leases WHERE until > ?', now);
  const budget = {}; for (const w of ['main', 'b']) { if (w === 'b' && !d1bReady(env)) continue; try { const u = await d1Usage(env, db, now, fetch, w); budget[w] = { reads: u.reads, writes: u.writes, ratio: u.ratio, source: u.source, limit: u.limit }; } catch (e) { /* bỏ qua */ } }
  for (const r of runs) if (r.status === 'running' && jobOf(r.job) && now > r.started + jobOf(r.job).minutes * 1.5 * 60e3) r.status = 'expired';
  return { day: d, runs, leases, budget, caps: REG.budget_caps, jobs: REG.jobs.map(j => ({ id: j.id, cron: j.cron, priority: j.priority, resources: j.resources, minutes: j.minutes, est: j.est, lease: !!j.lease })) };
}
