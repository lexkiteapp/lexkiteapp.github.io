/* Kho khóa API dùng chung (Quản trị → Khóa API · docs/API-KEYS.md). Không phải route (không export onRequest…).
 *
 * Lưu trữ: D1 bảng api_keys – giá trị khóa mã hóa AES-GCM (KEYS_ENC_KEY, 32 byte base64; AAD = "apikey:<id>" → bản mã chép
 *   sang dòng khác không giải được). Trình duyệt chỉ thấy last4. Ngoài ra còn 2 nguồn chỉ đọc:
 *   · env  – biến bí mật Cloudflare (GEMINI_KEY, GROQ_API_KEY…) + binding Workers AI (env.AI): có dòng trạng thái trong api_keys
 *            (enc_key NULL, source 'env', ref = tên biến) để theo dõi sức khỏe/lượt dùng; giá trị luôn đọc từ env.
 *   · legacy – danh sách cũ D1 config 'gemini_keys'/'gemini_key' (bản rõ, hộp thoại Gemini cũ + scripts/video/library.mjs còn đọc):
 *            có KEYS_ENC_KEY → tự nhập (mã hóa) vào api_keys; không có → hiện dạng chỉ đọc trong bộ nhớ.
 * Xoay vòng: candidates(env, p) = khóa dùng được (live, không bị nghỉ, trọng số > 0) xếp theo trọng số × lượt miễn phí còn lại hôm nay,
 *   hòa điểm → xoay vòng. report(env, id, 'ok'|'err', code): 401/403/khóa sai → dead · 429/hết hạn mức → quota + nghỉ tới giờ reset ·
 *   lỗi mạng/5xx → transient (3 lần liên tiếp → nghỉ 15 phút). Kiểm sức khỏe: healthCheck() gọi endpoint rẻ nhất của từng nhà cung cấp
 *   (thủ công, lười khi mở trang quản trị > 6 h, và lười theo lưu lượng /api/ai > 24 h).
 * Không bao giờ ghi log / trả về giá trị khóa. */
import { PROVIDERS as QP, nextMidnight, dayKey } from './_quota.js';

const DAY = 86400e3, POOL_TTL = 60e3, NET_STRIKES = 3, NET_COOL = 15 * 60e3, HEALTH_LAZY = 6 * 3600e3, HEALTH_DAILY = DAY;
export const ALERT_MIN = 0.2; // < 20 % dung lượng còn lại → cảnh báo
export const MAIL_GAP = DAY;   // ≤ 1 thư / loại cảnh báo / 24 h
const enc = new TextEncoder();

/* Nhà cung cấp: cap = lượt miễn phí/ngày/khóa (ước lượng, null = trả phí/không rõ) · re = định dạng khóa (tự nhận diện, thứ tự quan trọng) ·
 * env = biến bí mật Cloudflare đọc chỉ-đọc · cool = thời gian nghỉ mặc định khi 429 không ghi giờ reset (ms) */
export const PROVIDERS = {
  gemini: { name: 'Google Gemini', cap: QP.gemini.day, re: /^(AIza[\w-]{30,}|AQ\.[\w.-]{20,})$/, env: ['GEMINI_KEY'], cool: 3600e3, tz: 'America/Los_Angeles' },
  groq: { name: 'Groq', cap: 1000, re: /^gsk_[A-Za-z0-9]{20,}$/, env: ['GROQ_API_KEY', 'GROQ_KEY'], cool: 600e3 },
  openrouter: { name: 'OpenRouter', cap: 50, re: /^sk-or-(v1-)?[A-Za-z0-9]{20,}$/, env: ['OPENROUTER_API_KEY'], cool: 600e3 },
  anthropic: { name: 'Anthropic', cap: null, re: /^sk-ant-[\w-]{20,}$/, env: ['ANTHROPIC_API_KEY'], cool: 600e3 },
  openai: { name: 'OpenAI', cap: null, re: /^sk-(proj-|svcacct-)?[\w-]{20,}$/, env: ['OPENAI_API_KEY'], cool: 600e3 },
  resend: { name: 'Resend', cap: 100, re: /^re_[A-Za-z0-9_]{16,}$/, env: ['RESEND_API_KEY'], cool: 3600e3 },
  brevo: { name: 'Brevo', cap: 300, re: /^xkeysib-[a-f0-9]{32,}-[A-Za-z0-9]{8,}$/, env: ['BREVO_API_KEY'], cool: 3600e3 },
  'cloudflare-ai': { name: 'Cloudflare Workers AI', cap: null, re: null, env: ['CF_AI_TOKEN'], cool: 600e3 }, // token API không có tiền tố → chọn tay
};
export const PROVIDER_IDS = Object.keys(PROVIDERS);
const ORDER = ['anthropic', 'openrouter', 'gemini', 'groq', 'resend', 'brevo', 'openai']; // sk-ant-/sk-or- trước sk-

/** Nhận diện nhà cung cấp theo tiền tố ('' = không rõ). Nhận cả dòng "TEN_BIEN=giá trị" và dấu nháy. */
export function cleanKey(line) {
  let s = String(line || '').trim();
  const m = s.match(/^[A-Z][A-Z0-9_]{1,40}\s*[=:]\s*(.+)$/); if (m) s = m[1].trim();
  return s.replace(/^["'`]+|["'`,;]+$/g, '').trim();
}
export function detect(key) { const k = cleanKey(key); for (const p of ORDER) if (PROVIDERS[p].re && PROVIDERS[p].re.test(k)) return p; return ''; }
const LOOKS_SECRET = /(?<![A-Za-z0-9_])(AIza[\w-]{20,}|AQ\.[\w.-]{20,}|gsk_[A-Za-z0-9]{16,}|sk-[\w-]{16,}|re_[A-Za-z0-9_]{12,}|xkeysib-[a-f0-9]{16,}|ghp_\w{16,}|-----BEGIN)/;
/** Chữ có dạng khóa bí mật? (chặn dán nhầm khóa vào nhãn/ghi chú + lưới an toàn phản hồi) */
export const looksSecret = s => LOOKS_SECRET.test(String(s || ''));

// ---------- mã hóa ----------
const b64 = u8 => btoa(String.fromCharCode(...new Uint8Array(u8)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const hex = u8 => [...new Uint8Array(u8)].map(x => x.toString(16).padStart(2, '0')).join('');
function rawKey(env) { try { const k = unb64(String((env && env.KEYS_ENC_KEY) || '').trim()); return k.length === 32 ? k : null; } catch (e) { return null; } }
export const encReady = env => !!rawKey(env);
const aes = env => { const raw = rawKey(env); if (!raw) throw new Error('no-key'); return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']); };
/** → "v1.<iv b64>.<bản mã b64>" (iv 12 byte ngẫu nhiên, AAD = apikey:<id>) */
export async function encryptKey(env, id, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode('apikey:' + id) }, await aes(env), enc.encode(value));
  return 'v1.' + b64(iv) + '.' + b64(ct);
}
export async function decryptKey(env, id, blob) {
  const [v, iv, ct] = String(blob || '').split('.'); if (v !== 'v1' || !iv || !ct) throw new Error('bad-blob');
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv), additionalData: enc.encode('apikey:' + id) }, await aes(env), unb64(ct)));
}
/** Dấu vân tay (chống trùng) – băm một chiều, không trả về trình duyệt */
export const fingerprint = async v => hex(await crypto.subtle.digest('SHA-256', enc.encode('lexkite-apikey|' + v))).slice(0, 32);
export const newId = () => 'k_' + hex(crypto.getRandomValues(new Uint8Array(6)));
const last4 = v => String(v || '').slice(-4);

// ---------- D1 ----------
let ready = false;
export async function setupKeys(db) {
  if (ready) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS api_keys (id TEXT PRIMARY KEY, provider TEXT NOT NULL, label TEXT, enc_key TEXT, last4 TEXT, status TEXT NOT NULL DEFAULT 'live', weight INTEGER NOT NULL DEFAULT 100, added_by TEXT, created INTEGER NOT NULL, last_ok INTEGER, last_err TEXT, err_count INTEGER NOT NULL DEFAULT 0, uses_today INTEGER NOT NULL DEFAULT 0, quota_day TEXT, cooldown_until INTEGER NOT NULL DEFAULT 0, notes TEXT, source TEXT NOT NULL DEFAULT 'db', ref TEXT, fp TEXT, checked INTEGER) WITHOUT ROWID"),
    db.prepare('CREATE INDEX IF NOT EXISTS api_keys_prov ON api_keys (provider, status)'),
    db.prepare('CREATE TABLE IF NOT EXISTS api_key_events (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, key_id TEXT, provider TEXT, kind TEXT, code TEXT)'),
    db.prepare('CREATE INDEX IF NOT EXISTS api_key_events_at ON api_key_events (at)'),
    db.prepare('CREATE TABLE IF NOT EXISTS key_alerts (kind TEXT PRIMARY KEY, level TEXT NOT NULL, provider TEXT, msg TEXT, since INTEGER NOT NULL, seen INTEGER NOT NULL, mailed INTEGER) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS key_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, email TEXT, op TEXT, ok INTEGER, detail TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT, at INTEGER, by TEXT) WITHOUT ROWID'),
  ]);
  ready = true;
}
const all = async (db, q, ...a) => (await db.prepare(q).bind(...a).all()).results || [];
const run = (db, q, ...a) => db.prepare(q).bind(...a).run();
const getMeta = async (db, k) => { const r = await db.prepare('SELECT v FROM config WHERE k = ?').bind(k).first(); return r ? r.v : null; };
const setMeta = (db, k, v) => run(db, 'INSERT INTO config (k, v, at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, at = excluded.at', k, String(v), Date.now());

// ---------- Bộ nhớ đệm theo isolate ----------
let P = { at: 0, rows: [], vals: new Map(), health: 0 };
const rr = {}; // con trỏ xoay vòng theo nhà cung cấp
export const resetPool = () => { P.at = 0; };
export const poolRows = () => P.rows;

/** Đọc bảng + đồng bộ dòng env + nhập danh sách cũ. Trả { rows, vals, health }. Lỗi D1 → giữ bản cũ. */
export async function loadPool(env, { force = false } = {}) {
  const db = env && env.DB, now = Date.now();
  if (!db) return P;
  if (!force && now - P.at < POOL_TTL) return P;
  try {
    await setupKeys(db);
    let rows = await all(db, 'SELECT * FROM api_keys');
    const vals = new Map(), byId = new Map(rows.map(r => [r.id, r]));
    // 1) biến bí mật Cloudflare → dòng env (chỉ đọc)
    const seen = new Set(); let changed = false;
    for (const [p, def] of Object.entries(PROVIDERS)) for (const name of def.env) {
      const v = typeof env[name] === 'string' ? env[name].trim() : ''; if (!v) continue;
      const id = 'env:' + name, fp = await fingerprint(v), r = byId.get(id); seen.add(id); vals.set(id, v);
      if (!r || r.fp !== fp) changed = true;
      if (!r) { await run(db, "INSERT OR IGNORE INTO api_keys (id, provider, label, last4, status, weight, added_by, created, source, ref, fp) VALUES (?, ?, ?, ?, 'live', 100, 'env', ?, 'env', ?, ?)", id, p, name, last4(v), now, name, fp); }
      else if (r.fp !== fp) { await run(db, "UPDATE api_keys SET last4 = ?, fp = ?, status = CASE status WHEN 'disabled' THEN 'disabled' ELSE 'live' END, err_count = 0, cooldown_until = 0, last_err = NULL WHERE id = ?", last4(v), fp, id); }
    }
    if (env.AI) { // binding Workers AI: không có khóa, chỉ theo dõi sức khỏe/lượt dùng
      seen.add('env:AI'); vals.set('env:AI', '');
      if (!byId.get('env:AI')) changed = true;
      if (!byId.get('env:AI')) await run(db, "INSERT OR IGNORE INTO api_keys (id, provider, label, last4, status, weight, added_by, created, source, ref, fp) VALUES ('env:AI', 'cloudflare-ai', 'Workers AI binding (env.AI)', '', 'live', 100, 'env', ?, 'env', 'AI', 'binding:AI')", now);
    }
    const gone = rows.filter(r => r.source === 'env' && !seen.has(r.id)).map(r => r.id);
    for (const id of gone) await run(db, 'DELETE FROM api_keys WHERE id = ?', id);
    // 2) danh sách Gemini cũ (config) → nhập mã hóa (có KEYS_ENC_KEY) hoặc chỉ đọc trong bộ nhớ
    const legacy = await legacyList(db), mem = [];
    if (legacy.length) {
      rows = await all(db, 'SELECT * FROM api_keys');
      const fps = new Set(rows.map(r => r.fp));
      for (const x of legacy) {
        const fp = await fingerprint(x.k); if (fps.has(fp)) continue; fps.add(fp);
        if (encReady(env)) {
          const id = newId();
          await run(db, "INSERT INTO api_keys (id, provider, label, enc_key, last4, status, weight, added_by, created, source, fp) VALUES (?, 'gemini', 'Gemini (legacy)', ?, ?, 'live', 100, ?, ?, 'db', ?)", id, await encryptKey(env, id, x.k), last4(x.k), String(x.by || 'legacy').slice(0, 120), +x.at || now, fp);
          vals.set(id, x.k); changed = true;
        } else {
          const id = 'legacy:' + fp.slice(0, 10);
          mem.push({ id, provider: 'gemini', label: 'Gemini (legacy config)', enc_key: null, last4: last4(x.k), status: 'live', weight: 100, added_by: x.by || 'legacy', created: +x.at || 0, last_ok: null, last_err: null, err_count: 0, uses_today: 0, quota_day: null, cooldown_until: 0, notes: null, source: 'legacy', ref: null, fp, checked: null });
          vals.set(id, x.k);
        }
      }
    }
    if (changed || gone.length) rows = await all(db, 'SELECT * FROM api_keys');
    // giữ trạng thái bộ nhớ của dòng legacy (không có trong D1) qua các lần nạp
    const old = new Map(P.rows.filter(r => r.source === 'legacy').map(r => [r.id, r]));
    rows = [...rows, ...mem.map(r => old.get(r.id) || r)];
    for (const r of rows) if (r.source === 'db' && P.vals.has(r.id) && !vals.has(r.id)) vals.set(r.id, P.vals.get(r.id));
    P = { at: now, rows, vals, health: +(await getMeta(db, 'keys:health')) || 0 };
  } catch (e) { P.at = now; }
  return P;
}
async function legacyList(db) {
  const rows = await all(db, "SELECT k, v, at, by FROM config WHERE k IN ('gemini_keys', 'gemini_key')");
  let list = []; const many = rows.find(r => r.k === 'gemini_keys'), one = rows.find(r => r.k === 'gemini_key');
  try { list = many ? JSON.parse(many.v) : []; } catch (e) { list = []; }
  if (one && one.v) list.unshift({ k: one.v, at: one.at, by: one.by });
  return list.filter(x => x && typeof x.k === 'string' && x.k.trim()).map(x => ({ ...x, k: x.k.trim() }));
}
/** Gỡ khóa khỏi danh sách cũ (config) theo dấu vân tay – để xóa ở trình quản lý không bị nhập lại */
export async function dropLegacy(db, fps) {
  const set = new Set(fps); if (!set.size) return 0;
  const rows = await all(db, "SELECT k, v FROM config WHERE k IN ('gemini_keys', 'gemini_key')"); let n = 0;
  for (const r of rows) {
    if (r.k === 'gemini_key') { if (r.v && set.has(await fingerprint(String(r.v).trim()))) { await run(db, "DELETE FROM config WHERE k = 'gemini_key'"); n++; } continue; }
    let list = []; try { list = JSON.parse(r.v) || []; } catch (e) { continue; }
    const keep = []; for (const x of list) { if (x && x.k && set.has(await fingerprint(String(x.k).trim()))) n++; else keep.push(x); }
    if (keep.length !== list.length) await run(db, "UPDATE config SET v = ?, at = ? WHERE k = 'gemini_keys'", JSON.stringify(keep), Date.now());
  }
  return n;
}

// ---------- Chọn khóa ----------
export const usesToday = (r, now = Date.now()) => (r.quota_day === dayKey(now) ? +r.uses_today || 0 : 0);
export const capOf = r => (r.id === 'env:AI' ? null : (PROVIDERS[r.provider] || {}).cap ?? null);
/** Trạng thái hiển thị: quota đã hết giờ nghỉ → live; env/legacy giữ status thật (lọc 'env' theo source) */
export function effStatus(r, now = Date.now()) { if (r.status === 'quota' && !(+r.cooldown_until > now)) return 'live'; return r.status || 'live'; }
export const usable = (r, now = Date.now()) => r.status !== 'disabled' && r.status !== 'dead' && !(+r.cooldown_until > now) && (+r.weight || 0) > 0;
const score = (r, now) => { const c = capOf(r); return (+r.weight || 0) * (c ? Math.max(0, c - usesToday(r, now)) : 1); };
/** Thuần: khóa dùng được của provider theo thứ tự thử (điểm cao trước; hòa điểm → xoay vòng theo state[provider]) */
export function rank(rows, provider, now = Date.now(), state = rr) {
  const el = rows.filter(r => r.provider === provider && usable(r, now)).map(r => ({ r, s: score(r, now) })).sort((a, b) => b.s - a.s || String(a.r.id).localeCompare(String(b.r.id)));
  if (!el.length) return [];
  const top = el.filter(x => x.s === el[0].s), i = (state[provider] = ((state[provider] || 0) + 1)) % top.length;
  return [...top.slice(i), ...top.slice(0, i), ...el.slice(top.length)].map(x => x.r);
}
async function valueOf(env, r) {
  if (P.vals.has(r.id)) return P.vals.get(r.id);
  if (r.source === 'env') { const v = r.ref === 'AI' ? '' : String(env[r.ref] || '').trim(); P.vals.set(r.id, v); return v; }
  if (r.source !== 'db' || !r.enc_key) return '';
  try { const v = await decryptKey(env, r.id, r.enc_key); P.vals.set(r.id, v); return v; } catch (e) { return ''; }
}
/** Danh sách { id, key } theo thứ tự thử (bỏ trùng giá trị env/db). Dùng cho vòng thử dự phòng. */
export async function candidates(env, provider) {
  const p = await loadPool(env), out = [], fps = new Set();
  for (const r of rank(p.rows, provider)) {
    if (r.fp && fps.has(r.fp)) continue;
    const key = await valueOf(env, r); if (!key) continue;
    fps.add(r.fp); out.push({ id: r.id, key, provider });
  }
  return out;
}
/** pick(provider) → khóa tốt nhất { id, key } hoặc null */
export async function pick(env, provider) { return (await candidates(env, provider))[0] || null; }
/** Giá trị mọi khóa chưa tắt/chưa chết (kể cả đang nghỉ) – để tính trần cầu dao theo số khóa */
export async function poolKeys(env, provider) {
  const p = await loadPool(env), out = new Set();
  for (const r of p.rows) if (r.provider === provider && r.status !== 'disabled' && r.status !== 'dead') { const v = await valueOf(env, r); if (v) out.add(v); }
  return [...out];
}
/** Khóa (giá trị) đang nghỉ/hỏng theo bộ nhớ isolate – cho hộp thoại Gemini cũ */
export function coolingValue(v, now = Date.now()) { for (const [id, x] of P.vals) if (x === v) { const r = P.rows.find(y => y.id === id); if (r && !usable(r, now)) return true; } return false; }
export function isUsable(id, now = Date.now()) { const r = P.rows.find(x => x.id === id); return !r || usable(r, now); }

// ---------- Báo kết quả ----------
/** Giờ reset hạn mức ngày: Gemini = 0 h giờ Thái Bình Dương; còn lại 0 h UTC */
export function nextReset(provider, now = Date.now()) {
  const tz = (PROVIDERS[provider] || {}).tz; if (!tz) return nextMidnight(now);
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(now)).map(x => [x.type, x.value]));
    return now - ((+parts.hour % 24) * 3600 + +parts.minute * 60 + +parts.second) * 1000 - (now % 1000) + DAY;
  } catch (e) { return nextMidnight(now); }
}
/** Phân loại lỗi → { kind: ok|dead|quota|transient|error, until? }
 * @param {string} provider @param {any} code @param {string} [text] @param {{ retryAfter?: any, ping?: boolean, now?: number }} [opt] */
export function classify(provider, code, text = '', opt = {}) {
  const { retryAfter = null, ping = false, now = Date.now() } = opt;
  const c = code === 'net' || code == null ? 0 : +code || 0, t = String(text || '');
  if (c >= 200 && c < 300) return { kind: 'ok' };
  if (ping && c === 404) return { kind: 'ok' }; // khóa hợp lệ, chỉ không thấy mô hình
  if (provider === 'resend' && c === 401 && /restricted_api_key/i.test(t)) return { kind: 'ok' }; // khóa chỉ-gửi vẫn hợp lệ
  if ((c === 401 || c === 403) && /location|region|country|unsupported_country/i.test(t)) return { kind: 'transient' }; // vùng chưa hỗ trợ ≠ khóa hỏng
  if (c === 429 || c === 402 || (c === 403 && /quota|exceeded|exhausted/i.test(t)) || /RESOURCE_EXHAUSTED|neurons|daily free allocation|4006/i.test(t)) {
    if (c === 402 || /PerDay|per[ _-]day|daily|neurons|4006/i.test(t)) return { kind: 'quota', until: nextReset(provider, now) };
    const s = +retryAfter || +((t.match(/retryDelay"?\s*:\s*"?(\d+(?:\.\d+)?)s/) || [])[1]) || 0;
    return { kind: 'quota', until: now + (s ? Math.max(30, Math.ceil(s)) * 1000 : (PROVIDERS[provider] || {}).cool || 600e3) };
  }
  if (c === 401 || c === 403 || (c === 400 && /API_KEY_INVALID|API key not valid|API key expired|invalid[_ ]api[_ ]key/i.test(t))) return { kind: 'dead' };
  if (!c || c >= 500 || c === 408) return { kind: 'transient' };
  return { kind: 'error' };
}
let alertAt = 0;
/** report(env, id, 'ok' | 'err', code?, { text, retryAfter, ping }) – cập nhật D1 + bộ nhớ. Không bao giờ ném lỗi. */
export async function report(env, id, outcome, code, extra = {}) {
  try {
    const p = await loadPool(env), r = p.rows.find(x => x.id === id); if (!r) return null;
    const now = Date.now(), today = dayKey(now), db = env.DB, prev = r.status;
    const c = outcome === 'ok' ? { kind: 'ok' } : classify(r.provider, code, extra.text, { retryAfter: extra.retryAfter, ping: extra.ping, now });
    if (c.kind === 'ok') {
      Object.assign(r, { uses_today: usesToday(r, now) + (extra.ping ? 0 : 1), quota_day: today, last_ok: now, err_count: 0, cooldown_until: 0, status: r.status === 'disabled' ? 'disabled' : 'live', checked: extra.ping ? now : r.checked });
      if (r.source !== 'legacy' && db) await run(db, 'UPDATE api_keys SET status = ?, last_ok = ?, err_count = 0, uses_today = ?, quota_day = ?, cooldown_until = 0, checked = ? WHERE id = ?', r.status, now, r.uses_today, today, r.checked || null, id);
      return { kind: 'ok', status: r.status };
    }
    r.err_count = (+r.err_count || 0) + 1; r.last_err = (String(code || 'net') + ' ' + c.kind).slice(0, 40); // chỉ mã + loại – không lưu thông điệp (có thể chứa dữ liệu nhà cung cấp)
    if (c.kind === 'dead' && r.status !== 'disabled') r.status = 'dead';
    if (c.kind === 'quota') { if (r.status !== 'disabled') r.status = 'quota'; r.cooldown_until = c.until; }
    if (c.kind === 'transient' && r.err_count >= NET_STRIKES) r.cooldown_until = now + NET_COOL;
    if (extra.ping) r.checked = now;
    if (r.source !== 'legacy' && db) {
      await db.batch([
        db.prepare('UPDATE api_keys SET status = ?, err_count = ?, last_err = ?, cooldown_until = ?, checked = ? WHERE id = ?').bind(r.status, r.err_count, r.last_err, +r.cooldown_until || 0, r.checked || null, id),
        db.prepare('INSERT INTO api_key_events (at, key_id, provider, kind, code) VALUES (?, ?, ?, ?, ?)').bind(now, id, r.provider, c.kind, String(code || 'net').slice(0, 12)),
      ]);
      if (Math.random() < 0.02) await run(db, 'DELETE FROM api_key_events WHERE at < ?', now - 7 * DAY);
      // khóa vừa chết/hết lượt và nhà cung cấp không còn khóa dùng được → kiểm cảnh báo ngay (≤ 1 lần/10 phút/isolate)
      if (prev !== r.status && !p.rows.some(x => x.provider === r.provider && usable(x, now)) && now - alertAt > 600e3) { alertAt = now; await refreshAlerts(env, now).catch(() => {}); }
    }
    return { kind: c.kind, status: r.status };
  } catch (e) { return null; }
}

// ---------- Kiểm sức khỏe ----------
/** Gọi Gemini qua Worker ghim tại Mỹ (env.GEM) nếu có, không thì gọi thẳng (dùng chung với ai.js) */
export async function gemFetch(env, path, key, body, method = 'POST') {
  if (env.GEM) return env.GEM.fetch('https://gem.internal/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, method, key, body }) });
  return fetch('https://generativelanguage.googleapis.com/v1beta/' + path, { method, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: method === 'GET' ? undefined : JSON.stringify(body) });
}
const bearer = k => ({ headers: { Authorization: 'Bearer ' + k } });
/** Endpoint rẻ nhất (miễn phí, không tốn lượt) của từng nhà cung cấp */
export const PING = {
  gemini: (env, k) => gemFetch(env, 'models/gemini-2.5-flash', k, null, 'GET'),
  groq: (env, k) => fetch('https://api.groq.com/openai/v1/models', bearer(k)),
  openrouter: (env, k) => fetch('https://openrouter.ai/api/v1/key', bearer(k)),
  anthropic: (env, k) => fetch('https://api.anthropic.com/v1/models?limit=1', { headers: { 'x-api-key': k, 'anthropic-version': '2023-06-01' } }),
  openai: (env, k) => fetch('https://api.openai.com/v1/models', bearer(k)),
  resend: (env, k) => fetch('https://api.resend.com/domains', bearer(k)),
  brevo: (env, k) => fetch('https://api.brevo.com/v3/account', { headers: { 'api-key': k, accept: 'application/json' } }),
  'cloudflare-ai': (env, k) => fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', bearer(k)),
};
const timeout = (p, ms) => Promise.race([p, new Promise((y, n) => setTimeout(() => n(new Error('timeout')), ms))]);
/** Kiểm các khóa (ids hoặc mọi khóa chưa tắt) – song song tối đa 4. → [{ id, status, kind }] */
export async function healthCheck(env, { ids = null } = {}) {
  const p = await loadPool(env, { force: true }), now = Date.now();
  if (!ids && env.DB) { P.health = now; await setMeta(env.DB, 'keys:health', now).catch(() => {}); }
  const want = ids ? new Set(ids) : null, list = p.rows.filter(r => (want ? want.has(r.id) : r.status !== 'disabled')), out = [];
  let i = 0;
  const one = async r => {
    let res;
    if (r.id === 'env:AI') res = await report(env, r.id, env.AI ? 'ok' : 'err', env.AI ? 200 : 'net', { ping: true });
    else {
      const k = await valueOf(env, r), f = PING[r.provider];
      if (!k || !f) res = await report(env, r.id, 'err', k ? 'n/a' : 'decrypt', { ping: true });
      else {
        try { const x = await timeout(f(env, k), 8000), text = x.ok ? '' : (await x.text().catch(() => '')).slice(0, 600); res = await report(env, r.id, x.ok ? 'ok' : 'err', x.status, { text, retryAfter: x.headers && x.headers.get && x.headers.get('Retry-After'), ping: true }); }
        catch (e) { res = await report(env, r.id, 'err', 'net', { ping: true }); }
      }
    }
    out.push({ id: r.id, status: effStatus(r), kind: res ? res.kind : 'error' });
  };
  await Promise.all(Array.from({ length: Math.min(4, list.length) }, async () => { while (i < list.length) await one(list[i++]); }));
  return out;
}
let lazyAt = 0;
/** Kiểm lười theo lưu lượng: > 24 h chưa kiểm → chạy nền (ctx.waitUntil), ≤ 1 lần/giờ/isolate */
export async function maybeHealth(env, waitUntil) {
  try {
    const p = await loadPool(env), now = Date.now();
    if (!waitUntil || !p.rows.length || now - p.health < HEALTH_DAILY || now - lazyAt < 3600e3) return false;
    lazyAt = now; waitUntil(healthCheck(env).then(() => refreshAlerts(env)).catch(() => {})); return true;
  } catch (e) { return false; }
}
export const healthStale = (p, now = Date.now()) => now - (p.health || 0) > HEALTH_LAZY;

// ---------- Tổng hợp, lọc, cảnh báo ----------
export async function errCounts(db, now = Date.now()) {
  const m = new Map(); if (!db) return m;
  try { for (const r of await all(db, 'SELECT key_id, COUNT(*) AS n FROM api_key_events WHERE at > ? GROUP BY key_id', now - DAY)) m.set(r.key_id, +r.n); } catch (e) { /* chưa có bảng */ }
  return m;
}
/** Dữ liệu được phép ra trình duyệt – KHÔNG có enc_key/fp/giá trị */
export function pub(r, now = Date.now(), err24 = new Map()) {
  return { id: r.id, provider: r.provider, label: r.label || '', last4: r.last4 || '', status: effStatus(r, now), source: r.source || 'db', weight: +r.weight || 0, added_by: r.added_by || '', created: +r.created || 0, last_ok: r.last_ok || null, last_err: r.last_err || null, err_count: +r.err_count || 0, err24: err24.get(r.id) || 0, uses_today: usesToday(r, now), cap: capOf(r), cooldown_until: +r.cooldown_until > now ? +r.cooldown_until : 0, checked: r.checked || null, notes: r.notes || '' };
}
const SORTS = { uses: r => r.uses_today, last_ok: r => r.last_ok || 0, errors: r => r.err24 * 1e6 + r.err_count, created: r => r.created, weight: r => r.weight, provider: r => r.provider + '|' + r.label };
/** Thuần: lọc (provider, status: live|dead|die|quota|disabled|env, q) + sắp xếp + phân trang */
export function filterRows(rows, f = {}) {
  const prov = String(f.provider || ''), st = String(f.status || '').replace(/^die$/, 'dead'), q = String(f.q || '').trim().toLowerCase();
  let out = rows.filter(r => (!prov || prov === 'all' || r.provider === prov)
    && (!st || st === 'all' || (st === 'env' ? r.source === 'env' || r.source === 'legacy' : r.status === st))
    && (!q || [r.label, r.last4, r.id, r.provider, r.notes].some(x => String(x || '').toLowerCase().includes(q))));
  const key = SORTS[f.sort] || SORTS.created, dir = f.dir === 'asc' ? 1 : -1;
  out = out.sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * dir || String(a.id).localeCompare(String(b.id)); });
  const per = Math.min(100, Math.max(5, +f.per || 25)), pages = Math.max(1, Math.ceil(out.length / per)), page = Math.min(pages, Math.max(1, +f.page || 1));
  return { rows: out.slice((page - 1) * per, page * per), total: out.length, page, pages, per };
}
/** Thẻ tổng hợp theo nhà cung cấp: đếm trạng thái, lượt hôm nay / trần miễn phí, lỗi 24 h, dung lượng còn (0–1) */
export function summarize(rows, now = Date.now(), err24 = new Map()) {
  const by = {};
  for (const r of rows) {
    const s = by[r.provider] || (by[r.provider] = { provider: r.provider, name: (PROVIDERS[r.provider] || {}).name || r.provider, total: 0, live: 0, dead: 0, quota: 0, disabled: 0, env: 0, usable: 0, enabled: 0, uses: 0, cap: 0, left: 0, err24: 0, capacity: 1 });
    const e = effStatus(r, now), c = capOf(r), u = usesToday(r, now);
    s.total++; s[e] = (s[e] || 0) + 1; if (r.source !== 'db') s.env++; s.uses += u; s.err24 += err24.get(r.id) || 0;
    if (r.status !== 'disabled') { s.enabled++; if (c) s.cap += c; }
    if (usable(r, now)) { s.usable++; if (c) s.left += Math.max(0, c - u); }
  }
  for (const s of Object.values(by)) s.capacity = !s.enabled ? 1 : s.cap ? s.left / s.cap : s.usable / s.enabled;
  return Object.values(by).sort((a, b) => a.provider.localeCompare(b.provider));
}
/** Cảnh báo: nhà cung cấp có khóa đang bật mà 0 khóa dùng được (crit) hoặc dung lượng còn < 20 % (warn) */
export function evalAlerts(summary) {
  const out = [];
  for (const s of summary) {
    if (!s.enabled) continue;
    if (!s.usable) out.push({ kind: 'nolive:' + s.provider, level: 'crit', provider: s.provider, msg: `${s.name}: 0/${s.enabled} khóa dùng được (chết ${s.dead || 0}, hết lượt ${s.quota || 0}) – thêm khóa ở Quản trị → Khóa API.` });
    else if (s.capacity < ALERT_MIN) out.push({ kind: 'cap:' + s.provider, level: 'warn', provider: s.provider, pct: Math.round(s.capacity * 100), msg: `${s.name}: chỉ còn ${Math.round(s.capacity * 100)}% dung lượng hôm nay (${s.usable}/${s.enabled} khóa dùng được).` });
  }
  return out;
}
async function sendMail(env, subject, text) {
  if (!env.MAIL) return false;
  const to = String(env.REPORT_NOTIFY_EMAIL || '').trim();
  const r = await env.MAIL.fetch('https://mail/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, text: text + '\n\nhttps://lexkite.com/admin.html#keys', ...(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(to) ? { to } : {}) }) }).catch(() => null);
  return !!(r && r.ok);
}
/** Ghi bảng key_alerts + gửi thư (≤ 1 thư / loại / 24 h; hết lỗi đã từng gửi thư → thư "đã khôi phục", cùng cửa sổ) → loại đã gửi */
export async function syncAlerts(env, alerts, now = Date.now()) {
  const db = env.DB, sent = []; if (!db) return sent;
  await setupKeys(db);
  const prev = new Map((await all(db, 'SELECT * FROM key_alerts')).map(a => [a.kind, a]));
  for (const a of alerts) {
    const p = prev.get(a.kind); prev.delete(a.kind);
    let mailed = p ? p.mailed : null;
    if (!mailed) {
      const last = +(await getMeta(db, 'keys:mail:' + a.kind)) || 0;
      if (now - last >= MAIL_GAP && await sendMail(env, `[Lexkite] ${a.level === 'crit' ? '⛔' : '⚠️'} Khóa API: ${a.msg.slice(0, 90)}`, a.msg)) { mailed = now; sent.push(a.kind); await setMeta(db, 'keys:mail:' + a.kind, now); }
    }
    await run(db, 'INSERT INTO key_alerts (kind, level, provider, msg, since, seen, mailed) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(kind) DO UPDATE SET level = excluded.level, msg = excluded.msg, seen = excluded.seen, mailed = excluded.mailed', a.kind, a.level, a.provider, a.msg, p ? p.since : now, now, mailed);
  }
  for (const p of prev.values()) {
    if (p.mailed) { const k = 'ok:' + p.kind, last = +(await getMeta(db, 'keys:mail:' + k)) || 0; if (now - last >= MAIL_GAP && await sendMail(env, `[Lexkite] ✅ Khóa API đã khôi phục: ${p.provider}`, 'Đã hết cảnh báo: ' + p.msg)) { sent.push(k); await setMeta(db, 'keys:mail:' + k, now); } }
    await run(db, 'DELETE FROM key_alerts WHERE kind = ?', p.kind);
  }
  return sent;
}
/** Đánh giá + đồng bộ cảnh báo từ trạng thái hiện tại */
export async function refreshAlerts(env, now = Date.now()) {
  const p = await loadPool(env, { force: true }), alerts = evalAlerts(summarize(p.rows, now, await errCounts(env.DB, now)));
  return { alerts, mailed: await syncAlerts(env, alerts, now) };
}
