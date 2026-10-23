/* Hạn mức dùng chung cho mọi API tốn tiền/hạn mức miễn phí (AI, handoff, liên hệ, đồng bộ, bảng xếp hạng, thống kê, ảnh).
 * Không phải route (không export onRequest…). Tài liệu đầy đủ + bảng mặc định: docs/QUOTAS.md
 *
 * Danh tính: uid (Firebase ID token) → nếu không: mã thiết bị X-Lexkite-Device (ngẫu nhiên, sinh ở máy khách) → nếu không: IP đã băm.
 *   Luôn tính thêm theo IP đã băm (IPv6 gộp theo /64) với hệ số ipx → đổi mã thiết bị liên tục không lách được.
 * Bậc: anon (khách) < free (đã đăng nhập) < unlimited (ADMIN_EMAILS + UNLIMITED_EMAILS + bảng quota_allow do quản trị sửa).
 * Ngân sách theo tính năng: [mỗi phút, mỗi ngày] cho từng bậc; quản trị đổi trong D1 quota_config (đè lên DEFAULTS).
 *   store 'd1'  : đếm ngày chính xác trong D1 (1 lệnh batch upsert … RETURNING n), hiện ở "Top dùng nhiều" trang Quản trị
 *   store 'edge': đếm ngày gần đúng ở Cache API biên (0 lượt ghi D1) – cho endpoint gọi dày (đồng bộ, thống kê, ảnh)
 *   Burst/phút luôn ở Cache API biên (miễn phí).
 * Cầu dao nhà cung cấp: tổng dùng/ngày của mỗi nhà cung cấp (PROVIDERS, khớp infra/resources.json "cap") giữ < 80% gói miễn phí;
 *   gần trần → endpoint tự hạ cấp (Workers AI thay Gemini, lưu tin nhắn nhưng chưa gửi thư…) hoặc trả 'quota.busy' để máy khách
 *   dùng phương án tại máy (chấm nhanh theo quy tắc, kịch bản soạn sẵn). Tính năng học cốt lõi (thẻ, bài học, ôn tập) không đi qua đây.
 * Chống lạm dụng: id/IP bị từ chối ≥ 20 lần/10 phút = 1 "lỗi"; 3 lỗi/24 giờ → khóa tạm 15 phút × 2^(lần khóa − 1) (tối đa 7 ngày).
 * Phản hồi 429: { error:'quota', feature, tier, msg:'quota.daily'|'quota.burst'|'quota.busy'|'quota.blocked', resetAt, wait, signIn, left:0 }
 *   – không lộ hạn mức, bộ đếm hay khóa nội bộ. Mọi lỗi hạ tầng (D1/Cache hỏng) → cho qua (không bao giờ chặn nhầm người học). */
import { claims, limit } from './sync.js';
import { once } from './_schema.js';

const DAY = 86400e3;
// [mỗi phút, mỗi ngày] · ipx = trần theo IP = ipx × mức cao nhất của các bậc · providers = cầu dao cần đọc · cost = đơn vị tính cho provider 'ai' (neuron/lượt)
export const DEFAULTS = {
  ai:        { anon: [5, 10],    free: [5, 30],    ipx: 3,  store: 'd1',   providers: ['ai', 'gemini'], cost: 50 }, // chấm Writing/Speaking
  chat:      { anon: [10, 20],   free: [20, 60],   ipx: 3,  store: 'd1',   providers: ['ai', 'gemini'], cost: 8 },  // Roleplay for Work (lượt thoại)
  handoff:   { anon: [3, 10],    free: [3, 10],    ipx: 3,  store: 'd1' },                                          // chuyển máy bằng QR (lượt tạo mã)
  contact:   { anon: [2, 5],     free: [2, 5],     ipx: 2,  store: 'd1',   providers: ['mail'] },                   // form liên hệ → thư
  sync:      { anon: [0, 0],     free: [6, 1500],  ipx: 10, store: 'edge' },                                        // đồng bộ D1 (bắt buộc đăng nhập)
  league:    { anon: [0, 0],     free: [12, 300],  ipx: 10, store: 'edge' },                                        // bảng xếp hạng tuần
  classroom: { anon: [0, 0],     free: [30, 1500], ipx: 20, store: 'edge' },                                        // lớp học: giáo viên + học sinh (cả lớp chung 1 IP trường)
  img:       { anon: [30, 300],  free: [30, 300],  ipx: 3,  store: 'edge' },                                        // ảnh minh họa – chỉ tính lượt trượt bộ đệm
  hit:       { anon: [120, 10000], free: [120, 10000], ipx: 1, store: 'edge' },                                   // thống kê (sendBeacon, theo IP) – vượt → bỏ qua im lặng
  translate: { anon: [60, 2000], free: [60, 2000], ipx: 3,  store: 'edge' },                                        // dự phòng: hiện dịch chạy thẳng từ máy khách, chưa có proxy
};
// Trần gói miễn phí/ngày – PHẢI khớp "cap" trong infra/resources.json (scripts/test/quota.mjs kiểm). perKey: nhân với số khóa đang có.
export const PROVIDERS = {
  ai: { infra: 'ai', day: 10000, unit: 'neuron' },
  gemini: { infra: 'gemini', day: 20, unit: 'call/key', perKey: true },
  mail: { infra: 'mail', day: 100, unit: 'mail' },
};
export const BREAKER = 0.8;
export const STRIKE = { denies: 20, windowSec: 600, strikes: 3, baseMin: 15, maxMin: 7 * 1440 };
const STATE_TTL = 60e3, MARK_MAX = 600;
const MSG_KEYS = ['quota.daily', 'quota.burst', 'quota.busy', 'quota.blocked'];

const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const list = v => String(v || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
export const dayKey = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
export const nextMidnight = (t = Date.now()) => { const d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1); };
const rows = r => (r && r.results) || [];

// IP → khóa băm (không lưu IP gốc). IPv6 gộp theo /64 (một máy thường có cả dải /64 → xoay địa chỉ không lách được).
export async function ipId(ip) {
  ip = String(ip || '?').trim().toLowerCase();
  if (ip.includes(':')) { const p = ip.split('::')[0].split(':'); while (p.length < 4) p.push('0'); ip = p.slice(0, 4).join(':') + '::/64'; }
  return 'i:' + (await sha('lexkite-q|' + ip)).slice(0, 20);
}
// Chuẩn hóa mục tiêu quản trị nhập (email, IP gốc, hoặc id có tiền tố u:/d:/i:/e:) → id lưu trong bảng; '' nếu không hợp lệ
export async function normId(s) {
  s = String(s || '').trim();
  if (/^e:/i.test(s)) s = s.slice(2);
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(s)) return 'e:' + s.toLowerCase();
  if (/^i:/i.test(s) && /^i:[0-9a-f]{20}$/.test(s)) return s;
  const raw = s.replace(/^i:/i, '');
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(raw) || (/^[0-9a-f:]+$/i.test(raw) && raw.includes(':') && raw.length > 2)) return ipId(raw);
  if (/^u:[A-Za-z0-9_-]{1,128}$/.test(s) || /^d:[A-Za-z0-9_-]{16,64}$/.test(s)) return s;
  return '';
}

// ---------- Bộ đệm biên (Cache API) ----------
const ck = k => new Request('https://quota.lexkite.internal/' + encodeURIComponent(k));
async function peek(k) { try { const r = await /** @type {any} */ (caches).default.match(ck(k)); return r ? await r.text() : ''; } catch (e) { return ''; } }
async function mark(k, sec, v = '1') { try { await /** @type {any} */ (caches).default.put(ck(k), new Response(String(v), { headers: { 'Cache-Control': `max-age=${Math.max(1, Math.ceil(sec))}` } })); } catch (e) { /* bỏ qua */ } }

// ---------- Trạng thái dùng chung (cấu hình, danh sách không giới hạn, khóa) – đọc D1 tối đa 1 lần/phút/isolate ----------
let ready = false;
const st = { at: 0, cfg: {}, legacy: {}, allow: new Set(), block: new Map() };
// Trạng thái dùng chung cả trung tâm dữ liệu qua Cache API (60 s): N isolate cùng nơi → 1 lượt đọc D1/phút thay vì N (docs/CAPACITY.md)
const STATE_KEY = 'https://quota.lexkite.internal/state/v1';
/** Quản trị đổi cấu hình/khóa → isolate này áp dụng ngay + xoá bản đệm chung (isolate khác ≤ 1 phút). memoryOnly: chỉ bộ nhớ isolate (kiểm thử). */
export const resetState = (o = {}) => { st.at = 0; if (!o.memoryOnly) try { /** @type {any} */ (caches).default.delete(new Request(STATE_KEY)).catch(() => {}); } catch (e) { /* bỏ qua */ } };
const fromShared = v => { st.cfg = v.cfg || {}; st.allow = new Set(v.allow || []); st.block = new Map(v.block || []); st.legacy = v.legacy || {}; };
export async function setupQuota(db) {
  if (ready) return;
  await once(db, 'quota', 1, async () => { // lược đồ: chỉ chạy khi đổi phiên bản (_schema.js) – sửa CREATE/ALTER ở đây thì TĂNG số 1
    await db.batch([
      db.prepare('CREATE TABLE IF NOT EXISTS quota_count (k TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (k, day)) WITHOUT ROWID'),
      // (day) thay cho (day, n): mỗi lần đếm (n đổi) không phải ghi thêm 1 dòng chỉ mục – D1 Free chỉ 100k dòng GHI/ngày (docs/CAPACITY.md)
      db.prepare('DROP INDEX IF EXISTS quota_count_day'),
      db.prepare('CREATE INDEX IF NOT EXISTS quota_count_d ON quota_count (day)'),
      db.prepare('CREATE TABLE IF NOT EXISTS quota_config (feature TEXT PRIMARY KEY, v TEXT NOT NULL, at INTEGER, by TEXT) WITHOUT ROWID'),
      db.prepare('CREATE TABLE IF NOT EXISTS quota_allow (id TEXT PRIMARY KEY, note TEXT, at INTEGER, by TEXT) WITHOUT ROWID'),
      db.prepare('CREATE TABLE IF NOT EXISTS quota_block (id TEXT PRIMARY KEY, until INTEGER NOT NULL, reason TEXT, at INTEGER, by TEXT) WITHOUT ROWID'),
      db.prepare('CREATE TABLE IF NOT EXISTS quota_flag (id TEXT PRIMARY KEY, strikes INTEGER NOT NULL, bans INTEGER NOT NULL DEFAULT 0, last INTEGER NOT NULL, until INTEGER NOT NULL DEFAULT 0, feature TEXT) WITHOUT ROWID'),
      db.prepare('CREATE INDEX IF NOT EXISTS quota_flag_until ON quota_flag (until)'), // state(): WHERE until > ? – không quét cả bảng cờ
      db.prepare('CREATE TABLE IF NOT EXISTS quota_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, email TEXT, op TEXT, target TEXT, detail TEXT)'),
      db.prepare('CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT, at INTEGER, by TEXT) WITHOUT ROWID'),
    ]);
  });
  ready = true;
}
async function state(db) {
  const now = Date.now();
  if (now - st.at < STATE_TTL) return st;
  st.at = now; // lỗi D1 → giữ trạng thái cũ, thử lại sau 1 phút (không dội D1)
  try { const hit = await /** @type {any} */ (caches).default.match(new Request(STATE_KEY)); if (hit) { const v = await hit.json(); if (v && now - v.at < STATE_TTL) { fromShared(v); st.at = v.at; return st; } } } catch (e) { /* không có Cache API → đọc D1 */ }
  try {
    await setupQuota(db);
    const [c, a, b, f, l] = await db.batch([
      db.prepare('SELECT feature, v FROM quota_config'),
      db.prepare('SELECT id FROM quota_allow'),
      db.prepare('SELECT id, until FROM quota_block WHERE until = 0 OR until > ?').bind(now),
      db.prepare('SELECT id, until FROM quota_flag WHERE until > ?').bind(now),
      db.prepare("SELECT k, v FROM config WHERE k IN ('ai_user', 'ai_anon')"),
    ]);
    st.cfg = {}; for (const r of rows(c)) { try { st.cfg[r.feature] = JSON.parse(r.v); } catch (e) { /* bỏ qua dòng hỏng */ } }
    st.allow = new Set(rows(a).map(r => r.id));
    st.block = new Map(); for (const r of [...rows(b), ...rows(f)]) { const u = +r.until || 0, o = st.block.get(r.id); st.block.set(r.id, o === 0 || u === 0 ? 0 : Math.max(o || 0, u)); }
    st.legacy = Object.fromEntries(rows(l).filter(r => r.v !== '' && r.v != null && +r.v >= 0).map(r => [r.k, +r.v]));
    try { await /** @type {any} */ (caches).default.put(new Request(STATE_KEY), new Response(JSON.stringify({ at: now, cfg: st.cfg, allow: [...st.allow], block: [...st.block], legacy: st.legacy }), { headers: { 'Cache-Control': `max-age=${STATE_TTL / 1000}` } })); } catch (e) { /* bỏ qua */ }
  } catch (e) { /* cho qua */ }
  return st;
}

// Ngân sách hiệu lực của 1 tính năng: quota_config > khóa cũ ai_user/ai_anon (trang Cài đặt cũ, chỉ cho 'ai') > DEFAULTS
const pair = (v, d) => Array.isArray(v) && v.length === 2 && v.every(x => Number.isInteger(x) && x >= 0 && x <= 1e7) ? v : d;
export function budget(feature, s = st) {
  const d = DEFAULTS[feature]; if (!d) throw new Error('quota feature ' + feature);
  const o = s.cfg[feature] || {}, out = { ...d, anon: pair(o.anon, d.anon), free: pair(o.free, d.free), ipx: Number.isInteger(o.ipx) && o.ipx >= 1 && o.ipx <= 100 ? o.ipx : d.ipx };
  if (feature === 'ai' && !s.cfg.ai) { if (s.legacy.ai_anon != null) out.anon = [out.anon[0], s.legacy.ai_anon]; if (s.legacy.ai_user != null) out.free = [out.free[0], s.legacy.ai_user]; }
  return out;
}
export const validConfig = v => !!v && typeof v === 'object' && pair(v.anon, null) && pair(v.free, null) && Number.isInteger(v.ipx) && v.ipx >= 1 && v.ipx <= 100;

// Ghi "lỗi" khi 1 id/IP bị từ chối dồn dập → khóa tạm với thời gian tăng gấp đôi mỗi lần
async function strike(db, key, feature) {
  try {
    if (!(await limit('qs:' + key, STRIKE.denies, STRIKE.windowSec))) return;
    if (await peek('qsd:' + key)) return; // đã tính 1 lỗi trong cửa sổ này
    await mark('qsd:' + key, STRIKE.windowSec);
    const now = Date.now(), r = await db.prepare('SELECT strikes, bans, last, until FROM quota_flag WHERE id = ?').bind(key).first();
    let strikes = r && now - r.last < DAY ? r.strikes + 1 : 1, bans = r && now - r.last < 7 * DAY ? r.bans : 0, until = r && r.until > now ? r.until : 0;
    if (strikes >= STRIKE.strikes) { bans++; strikes = 0; until = now + Math.min(STRIKE.baseMin * 2 ** (bans - 1), STRIKE.maxMin) * 60e3; st.block.set(key, until); try { await /** @type {any} */ (caches).default.delete(new Request(STATE_KEY)); } catch (e) { /* bỏ qua */ } } // khóa mới → bản đệm chung phải đọc lại D1
    await db.prepare('INSERT INTO quota_flag (id, strikes, bans, last, until, feature) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT (id) DO UPDATE SET strikes = ?2, bans = ?3, last = ?4, until = ?5, feature = ?6')
      .bind(key, strikes, bans, now, until, feature).run();
  } catch (e) { /* bỏ qua */ }
}

const UP = 'INSERT INTO quota_count (k, day, n) VALUES (?1, ?2, ?3) ON CONFLICT (k, day) DO UPDATE SET n = n + ?3 RETURNING n';
const plainJson = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** Cổng hạn mức. opt: { who: claims|null (bỏ trống = tự đọc header Authorization), json: (req, status, data) => Response (CORS của endpoint) }
 *  Trả đối tượng q: q.res (Response 429 nếu bị chặn) · q.tier · q.id · q.take(n) (tính lượt ngày cho store 'd1') · q.near(p, keys) · q.use(p, n) · q.busy() */
export async function gate(request, env, feature, opt = {}) {
  const db = env.DB, now = Date.now(), s = db ? await state(db) : st, c = budget(feature, s);
  let who = opt.who;
  if (who === undefined) { const tk = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, ''); who = tk ? await claims(tk).catch(() => null) : null; }
  const uid = (who && who.sub) || '', email = who && who.email_verified && who.email ? String(who.email).toLowerCase() : '';
  const dv = request.headers.get('X-Lexkite-Device') || '', dev = /^[A-Za-z0-9_-]{16,64}$/.test(dv) ? dv : '';
  const ip = await ipId(request.headers.get('CF-Connecting-IP'));
  const id = uid ? 'u:' + uid : dev ? 'd:' + dev : ip;
  const keys = [id, ip, dev && 'd:' + dev, email && 'e:' + email].filter((k, i, a) => k && a.indexOf(k) === i);
  const unlimited = !!(email && (list(env.ADMIN_EMAILS).includes(email) || list(env.UNLIMITED_EMAILS).includes(email))) || keys.some(k => s.allow.has(k));
  const tier = unlimited ? 'unlimited' : uid ? 'free' : 'anon', [perMin, perDay] = unlimited ? [0, Infinity] : c[tier === 'free' ? 'free' : 'anon'];
  const ipMin = Math.max(c.anon[0], c.free[0]) * c.ipx, ipDay = Math.max(c.anon[1], c.free[1]) * c.ipx, day = dayKey(now), reset = nextMidnight(now);
  const respond = opt.json || plainJson;
  const q = {
    feature, tier, id, ip, res: null, left: unlimited ? null : perDay, prov: {},
    async deny(msg, resetAt, key) {
      const wait = Math.max(1, Math.ceil(((resetAt || reset) - Date.now()) / 1000));
      const r = respond(request, 429, { error: 'quota', feature, tier, msg: MSG_KEYS.includes(msg) ? msg : 'quota.busy', resetAt: resetAt || null, wait, signIn: tier === 'anon', left: 0 });
      try { r.headers.set('Retry-After', String(Math.min(wait, 86400))); } catch (e) { /* bỏ qua */ }
      q.res = r;
      if (key && db && (msg === 'quota.daily' || msg === 'quota.burst')) await strike(db, key, feature);
      return q;
    },
    // Tính lượt ngày (store 'd1') + đọc bộ đếm nhà cung cấp trong CÙNG 1 batch D1. Vượt → q.res = 429.
    async take(n = 1) {
      if (!db) return q;
      const pk = (c.providers || []).map(p => 'p:' + p), counted = !unlimited && c.store === 'd1';
      let res; try {
        await setupQuota(db); const stm = [];
        if (counted) { stm.push(db.prepare(UP).bind(feature + '|' + id, day, n)); if (ip !== id) stm.push(db.prepare(UP).bind(feature + '|' + ip, day, n)); }
        if (pk.length) stm.push(db.prepare(`SELECT k, n FROM quota_count WHERE day = ? AND k IN (${pk.map(() => '?').join(', ')})`).bind(day, ...pk));
        if (counted && Math.random() < 0.005) stm.push(db.prepare('DELETE FROM quota_count WHERE day < ?').bind(dayKey(now - 8 * DAY))); // dọn lười
        if (!stm.length) return q;
        res = await db.batch(stm);
      } catch (e) { return q; } // D1 lỗi → cho qua
      if (pk.length) for (const r of rows(res[counted ? (ip !== id ? 2 : 1) : 0])) q.prov[r.k.slice(2)] = r.n;
      if (counted) {
        const idN = (rows(res[0])[0] || {}).n || 0, ipN = ip !== id ? (rows(res[1])[0] || {}).n || 0 : 0, ttl = Math.min(MARK_MAX, (reset - now) / 1000);
        if (idN > perDay) { await mark(`qx:${feature}:${id}`, ttl, String(reset)); return q.deny('quota.daily', reset); }
        if (ipN > ipDay) { await mark(`qx:${feature}:${ip}`, ttl, String(reset)); return q.deny('quota.daily', reset); }
        q.left = Math.max(0, perDay - idN);
      }
      return q;
    },
    // Nhà cung cấp p đã dùng ≥ 80% gói miễn phí hôm nay? (keys: số khóa khi trần tính theo khóa)
    near(p, nKeys = 1) { const P = PROVIDERS[p]; return (q.prov[p] || 0) >= BREAKER * P.day * (P.perKey ? Math.max(1, nKeys) : 1); },
    use(p, n = 1) { return db.prepare(UP).bind('p:' + p, day, Math.max(1, Math.round(n))); }, // câu lệnh – endpoint gộp vào batch của mình
    busy() { return q.deny('quota.busy', reset); },
    cost: c.cost || 1,
  };
  if (unlimited) return q;
  for (const k of keys) { const u = s.block.get(k); if (u === 0 || u > now) return q.deny('quota.blocked', u || null); }
  if (!perDay) return q.deny('quota.daily', reset);
  if (c.store === 'd1') for (const k of id === ip ? [id] : [id, ip]) if (await peek(`qx:${feature}:${k}`)) return q.deny('quota.daily', reset, k);
  let w;
  if (perMin && (w = await limit(`qm:${feature}:${id}`, perMin, 60))) return q.deny('quota.burst', now + w * 1000, id);
  if (ip !== id && ipMin && (w = await limit(`qm:${feature}:${ip}`, ipMin, 60))) return q.deny('quota.burst', now + w * 1000, ip);
  if (c.store === 'edge') {
    const sec = Math.ceil((reset - now) / 1000);
    if (await limit(`qd:${feature}:${day}:${id}`, perDay, sec)) return q.deny('quota.daily', reset, id);
    if (ip !== id && await limit(`qd:${feature}:${day}:${ip}`, ipDay, sec)) return q.deny('quota.daily', reset, ip);
  }
  return q;
}
