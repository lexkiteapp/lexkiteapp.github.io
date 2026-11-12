/* ⏰ Nguồn kích cron ngoài GitHub (lưới an toàn cuối): Worker lexkite-cronkick (cron mỗi 30 phút) → POST /api/cron-kick (khoá chung) → workflow_dispatch.
 * Mô-đun THUẦN (không đụng mạng/D1) dùng chung cho Pages (functions/api/cron-kick.js) và Worker (workers/cronkick) – test: scripts/test/cron-kick.mjs.
 * Logic chống trùng/trần/ngưỡng quá hạn khớp scripts/ci/cron-watch.mjs (limitMin, BACKFILL_MAX) – test đối chiếu từng hằng số, đổi một bên là đỏ.
 * Xác thực: HMAC-SHA256(khoá, ts + "." + body); so bằng crypto.subtle.verify (hằng thời gian); lệch giờ > 5 phút bị từ chối. Khoá = secret CRON_KICK_SECRET ở cả hai phía (không commit). */
export const REPO = 'lexkiteapp/lexkiteapp.github.io';
export const SKEW_MS = 5 * 60e3, BACKFILL_MAX = 5, HOURLY_MAX = 4, BODY_MAX = 1024, SECRET_MIN = 32;
/** Danh sách cho phép CỐ ĐỊNH: workflow → khoảng lịch dài nhất (phút) – test đối chiếu với cron thật trong .github/workflows. Thứ tự = ưu tiên bù:
 *  free-tier-guard (gỡ lệnh dừng) → required-gate (chuỗi canh + cron-watch) → ci-triage. */
export const ALLOW = { 'free-tier-guard.yml': 60, 'required-gate.yml': 30, 'ci-triage.yml': 10 };
export const ORDER = Object.keys(ALLOW);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);   // AUDIT C2: không bao giờ tra bảng bằng o[k] với khoá từ bên ngoài
export const isAllowed = f => typeof f === 'string' && has(ALLOW, f);
// ngưỡng quá hạn (phút) – y hệt cron-watch.limitMin
export const FLOOR_MIN = 60, TIMES = 3, LONG_GAP = 720, GRACE_MIN = 360;
export const limitMin = gap => gap >= LONG_GAP ? gap + GRACE_MIN : Math.max(FLOOR_MIN, TIMES * gap);

const enc = new TextEncoder();
const toHex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const fromHex = h => /^[0-9a-f]{64}$/.test(h) ? Uint8Array.from(h.match(/../g), x => parseInt(x, 16)) : null;
const hmacKey = (secret, usage) => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
/** Chữ ký hex của (ts, body). */
export async function sign(secret, ts, body) { return toHex(await crypto.subtle.sign('HMAC', await hmacKey(secret, 'sign'), enc.encode(`${ts}.${body}`))); }
/** 'ok' | 'bad' (khoá/chữ ký/ts sai) | 'stale' (lệch giờ > 5 phút). Thiếu/ngắn khoá → 'bad'. */
export async function verify(secret, ts, body, sig, now = Date.now()) {
  if (typeof secret !== 'string' || secret.length < SECRET_MIN || !/^\d{10,16}$/.test(String(ts))) return 'bad';
  const raw = fromHex(String(sig || '').toLowerCase());
  if (!raw || !(await crypto.subtle.verify('HMAC', await hmacKey(secret, 'verify'), raw, enc.encode(`${ts}.${body}`)))) return 'bad';
  return Math.abs(now - Number(ts)) > SKEW_MS ? 'stale' : 'ok';
}
/** Body → danh sách workflow (đúng thứ tự ORDER, bỏ trùng). Ném { code } nếu sai: bad-body | not-allowed. */
export function parseWfs(text) {
  let b; try { b = JSON.parse(text); } catch (e) { throw { code: 'bad-body' }; }
  if (!b || typeof b !== 'object' || b.op !== 'kick') throw { code: 'bad-body' };
  if (b.wfs === undefined) return [...ORDER];
  if (!Array.isArray(b.wfs) || b.wfs.length < 1 || b.wfs.length > ORDER.length) throw { code: 'bad-body' };
  if (!b.wfs.every(isAllowed)) throw { code: 'not-allowed' };
  return ORDER.filter(f => b.wfs.includes(f));
}
/** Quyết định (thuần). last = lượt chạy mới nhất BẤT KỲ sự kiện ({status, created_at}) | null. Chống trùng: bỏ qua khi đang chờ/chạy hoặc đã có lượt trong ngưỡng quá hạn.
 *  → [{ file, act: 'dispatch' | 'skip', why }]; ≤ BACKFILL_MAX dispatch mỗi lần. */
export function plan(wfs, lastByFile, now = Date.now()) {
  let used = 0;
  return ORDER.filter(f => wfs.includes(f)).map(file => {
    const last = has(lastByFile, file) ? lastByFile[file] : null, lim = limitMin(ALLOW[file]);
    if (last && last.error) return { file, act: 'skip', why: 'github-error' };
    const age = last ? (now - Date.parse(last.created_at)) / 6e4 : Infinity;
    // queued quá hạn = lượt zombie không bao giờ chạy (khớp scripts/ci/zombie.mjs: 2 giờ, required-gate 15 phút vì bộ canh chết thì không PR nào có status) – không để nó chặn lượt kích
    const gate = file === 'required-gate.yml', stuck = !!last && last.status === 'queued' && age > (gate ? 15 : 120);
    if (last && last.status !== 'completed' && !stuck) return { file, act: 'skip', why: 'in-flight' };
    if (age <= lim && !(gate && stuck)) return { file, act: 'skip', why: `recent ${Math.round(age)}m <= ${lim}m` };
    if (used >= BACKFILL_MAX) return { file, act: 'skip', why: 'cap' };
    used++; return { file, act: 'dispatch', why: last ? `overdue ${Math.round(age)}m > ${lim}m` : 'no-runs' };
  });
}
