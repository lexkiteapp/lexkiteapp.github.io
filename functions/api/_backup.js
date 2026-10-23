/* Xuất D1 chính ra ngoài nền tảng (docs/ROLLBACK.md §Dữ liệu): dòng bảng NGƯỜI DÙNG, theo khoá chính (keyset, không OFFSET → mỗi dòng đọc đúng 1 lần),
 * nén gzip rồi mã hoá AES-GCM NGAY TRONG Worker bằng khoá suy ra (HKDF) từ DRIVE_ENC_KEY → CI/Drive chỉ thấy bản mã, CI không giữ khoá.
 * op backup_export (xuất 1 trang) · backup_open (giải mã 1 trang – cho diễn tập khôi phục trên CI). Cả hai chỉ qua đường CLI HMAC + cầu dao D1 của drive.js.
 * Giải mã ngoại tuyến (khi Pages hỏng): scripts/ops/d1-restore.mjs --key-env DRIVE_ENC_KEY (cùng công thức HKDF). */
const enc = new TextEncoder();
const b64 = u8 => { let s = ''; const a = new Uint8Array(u8); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export const INFO = 'lexkite-backup-v1';
/** Bảng người dùng cần có bản ngoài D1 (pk = thứ tự khoá chính để phân trang). Bảng vắng mặt trong D1 → bỏ qua (count 0). KHÔNG gồm: drive* (dựng lại từ Drive), sessions/pageviews/errors (thống kê), handoff/nonce (tạm), user_backups (bản chụp 30 ngày – tự sinh). */
export const TABLES = {
  users: ['uid'], docs: ['uid', 'k'], league_member: ['uid'], league_week: ['week', 'uid'],
  classes: ['id'], class_member: ['cls', 'uid'], class_task: ['id'], class_progress: ['task', 'uid'],
  notices: ['id'], notice_reads: ['id', 'uid'], vid_uid: ['vid'],
  reports: ['id'], report_events: ['id'],
  config: ['k'], quota_config: ['feature'], quota_allow: ['id'], quota_block: ['id'], quota_flag: ['id'],
  api_keys: ['id'],            // giá trị khoá đã mã hoá AES-GCM bằng KEYS_ENC_KEY – vẫn là bản mã trong bản sao lưu
};
export const ORDER = Object.keys(TABLES);
const MAX_CT = 400000; // ký tự base64 tối đa của 1 trang (≤ ~300 KB bản mã) – vượt thì chia đôi số dòng
const DEFAULT_LIMIT = { docs: 60, user_backups: 20, reports: 100 }, MAX_LIMIT = 400;

async function aesKey(env, usage) {
  let raw; try { raw = unb64(String(env.DRIVE_ENC_KEY || '').trim()); } catch (e) { raw = null; }
  if (!raw || raw.length !== 32) { const e = new Error('no-key'); e.code = 'no-key'; throw e; }
  const base = await crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode(INFO) }, base, { name: 'AES-GCM', length: 256 }, false, [usage]);
}
const pipe = async (u8, ts) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(ts)).arrayBuffer());
const jv = v => (v instanceof ArrayBuffer || ArrayBuffer.isView(v) ? { $b: b64(v instanceof ArrayBuffer ? v : new Uint8Array(v.buffer, v.byteOffset, v.byteLength)) } : v === undefined ? null : v);

/** Mã hoá 1 trang: JSON → gzip → AES-GCM (AAD 'backup:<bảng>'). → { iv, ct } base64. */
export async function seal(env, table, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12)), plain = await pipe(enc.encode(JSON.stringify(obj)), new CompressionStream('gzip'));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode('backup:' + table) }, await aesKey(env, 'encrypt'), plain));
  return { iv: b64(iv), ct: b64(ct) };
}
export async function open(env, table, { iv, ct }) {
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv), additionalData: enc.encode('backup:' + table) }, await aesKey(env, 'decrypt'), unb64(ct)));
  return JSON.parse(new TextDecoder().decode(await pipe(plain, new DecompressionStream('gzip'))));
}

/** Xuất 1 trang bảng `table` sau khoá `after` (mảng giá trị khoá chính, null = từ đầu). → { ok, table, n, last, done, missing?, iv, ct } (rows/ddl chỉ nằm trong bản mã). */
export async function exportPage(env, db, table, after, limit) {
  if (!Object.hasOwn(TABLES, table)) return { status: 400, error: 'bad-input' };
  const pk = TABLES[table], a = Array.isArray(after) && after.length === pk.length ? after.map(x => (x == null ? '' : x)) : null;
  const where = a ? ` WHERE (${pk.join(', ')}) > (${pk.map(() => '?').join(', ')})` : '';
  let ddl = null, ddlDone = false;
  for (let lim = Math.max(1, Math.min(MAX_LIMIT, Math.round(+limit) || DEFAULT_LIMIT[table] || 300)); ; lim = Math.max(1, lim >> 1)) {
    let rows;
    try { rows = (await db.prepare(`SELECT * FROM ${table}${where} ORDER BY ${pk.join(', ')} LIMIT ${lim}`).bind(...(a || [])).all()).results || []; }
    catch (e) { if (/no such table/i.test(String(e && e.message))) return { ok: true, table, n: 0, last: null, done: true, missing: true, ...(await seal(env, table, { t: table, cols: [], rows: [], ddl: null })) }; throw e; }
    if (!a && !ddlDone) { ddlDone = true; const r = await db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").bind(table).first().catch(() => null); ddl = r ? r.sql : null; }
    const cols = rows.length ? Object.keys(rows[0]) : [], last = rows.length ? pk.map(c => rows[rows.length - 1][c]) : after || null;
    const page = { t: table, cols, rows: rows.map(r => cols.map(c => jv(r[c]))), ddl, last, done: rows.length < lim }, sealed = await seal(env, table, page);
    if (sealed.ct.length <= MAX_CT || lim === 1) return { ok: true, table, n: rows.length, last, done: page.done, ...sealed };
  }
}
