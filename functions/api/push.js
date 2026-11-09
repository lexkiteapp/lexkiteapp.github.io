/* ⏰ Nhắc học – đăng ký thông báo đẩy + số liệu (docs/REMINDERS.md). Dữ liệu ở D1 NỘI BỘ (tài khoản 2, coordDb của _d1b.js) – KHÔNG bao giờ ghi D1 người dùng.
 * Bảng push_subs: 1 dòng/thiết bị, khóa = sha256(endpoint/token)[0:32]. k = 'web' (Web Push, endpoint) | 'fcm' (app gốc, token Firebase Cloud Messaging).
 *   tz = múi giờ IANA (Intl) · lmin = giờ nhắc theo GIỜ ĐỊA PHƯƠNG (phút) · q1/q2 = giờ yên lặng địa phương · lang = ngôn ngữ giao diện (15, rơi về en)
 *   slot = phút UTC (bội 10) của lần nhắc KẾ TIẾP – máy chủ tự tính từ tz + lmin (đúng cả đổi giờ mùa hè), tính lại sau mỗi lần gửi/touch; cron vẫn kiểm giờ địa phương + giờ yên lặng
 *   act/std = ngày địa phương (số ngày kể từ 1970, theo tz) mở app / học gần nhất
 *   last = lúc gửi gần nhất (ms) · n = số lần gửi kể từ lần mở app cuối · done = 1 sau lời nhắc cuối (ngày 14) · lang
 * Bảng ntf_daily(day, k, n): bộ đếm theo ngày (shown/open theo mẫu, ask_yes/no, optin/optout, sent, subs, unsub) → Quản trị › Thông báo (đọc theo khóa ngày, không quét).
 * Nút:
 *   GET  ?op=cfg                         → { on, pct, key, fcm } (cache 1 giờ) – cờ PUSH_PCT (0–100, nhóm thử theo máy); fcm = FCM_ON (mặc định BẬT, '0' = tắt khẩn)
 *                                          VÀ cron Worker báo gửi được FCM trong 2 giờ qua (nhịp push_meta 'fcm' – Worker có FCM_SA). Chưa có nhịp → app gốc giữ lịch cục bộ đủ 14 ngày.
 *   POST {op:'sub', ep|token, k, lmin, q:[q1,q2], tz (IANA), lang, st}  → { id }   (ghi 1 dòng)
 *     ro: 1 = chỉ báo lỗi "đã sửa" (done = 1, không nhắc học; không đè lịch thiết bị đã bật nhắc học)
 *   POST {op:'touch', id, lmin, q, tz, lang, st}  → { ok } | { gone:1 }  (máy khách chỉ gửi khi ngày mở app/đã học/giờ/tz/ngôn ngữ ĐỔI)
 *   POST {op:'unsub', id}                → { ok }
 *   POST {op:'ev', e:[[ev, tpl, n], …]}  → 204 (≤ 12 bộ đếm/lượt, 1 lượt ghi gộp)
 *   POST {op:'due', fcm} + X-Push-Cron   → { web:[{id,ep}], fcm:[{id,token,lang,kind}] } (cron Worker workers/push; cầu dao + ngân sách điều phối + ≤ 40/lượt)
 *     fcm = 1 khi Worker có FCM_SA (gửi được) → ghi nhịp; 0/thiếu → KHÔNG lấy dòng FCM (không đánh dấu "đã gửi" lời nhắc không ai gửi)
 *     + thông báo "đã sửa" từ hàng đợi push_now (pickFixed; FCM kind 'fixed' + rid)
 *   POST {op:'gone', ids} + X-Push-Cron  → xóa đăng ký hết hạn (404/410 từ dịch vụ push)
 *   POST {op:'stats'} (quản trị)          → 30 ngày bộ đếm cho thẻ "Thông báo" */
import { coordDb, d1bReady } from './_d1b.js';
import { d1Usage } from './_d1guard.js';
import { REG } from './_jobs_reg.js';
import { adminGate, adminCors } from './admin.js';
import { limit } from './sync.js';
import { readText, bodyFail } from './_body.js';

const DAY = 864e5, MAX_SEND = 40;
export const SEQ = [0, 1, 2, 3, 5, 7, 10, 14], FINAL = 14, REMOTE_FROM = 3; // trùng web/js/remind.js (test reminders.mjs đối chiếu)
// Chỉ dịch vụ push thật (chống SSRF: Worker chỉ POST tới các máy chủ này)
export const PUSH_HOST = /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com|push\.services\.mozilla\.com)\/[\w\-./:%~+=]+$/;
export const EV = new Set(['shown', 'open', 'ask_show', 'ask_yes', 'ask_no', 'optin', 'optout']), TPL = /^[a-z0-9_]{0,12}$/;
const LANGS = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
const cors = req => { const o = req.headers.get('Origin') || ''; return /^(https:\/\/(lexkite\.com|[\w-]+\.lexkite\.pages\.dev|lexkite\.pages\.dev)|capacitor:\/\/localhost|https?:\/\/localhost(:\d+)?)$/.test(o) ? { 'Access-Control-Allow-Origin': o, Vary: 'Origin' } : {}; };
const json = (req, status, data, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req), ...extra } });
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
export const pct = env => Math.max(0, Math.min(100, Math.round(+((env && env.PUSH_PCT) || 0)) || 0));
// FCM_ON: mặc định BẬT (bật qua mã – lên app bằng OTA); '0'/'off' = tắt khẩn. Chỉ có hiệu lực khi Worker gửi được (fcmLive) + app gốc có plugin (web/js/remind.js fcmCapable).
export const fcmOn = env => !/^(0|off|false)$/i.test(String((env && env.FCM_ON) ?? '1').trim());
export const FCM_FRESH = 2 * 3600e3, DAY_CAP = 20 * 3600e3; // nhịp Worker còn mới (cron 10 phút) · ≤ 1 push/ngày/thiết bị (mọi loại, kể cả "đã sửa")
/** Nhịp Worker 'fcm' (ms lúc báo gửi được; 0 = không gửi được) còn mới? (thuần – test) */
export const fcmLive = (v, now = Date.now()) => +v > 0 && now - +v >= -600e3 && now - +v < FCM_FRESH;
export const META_SQL = 'CREATE TABLE IF NOT EXISTS push_meta (k TEXT PRIMARY KEY, v INTEGER NOT NULL) WITHOUT ROWID';
const minOk = v => { const n = Math.round(+v); return Number.isFinite(n) && n >= 0 && n < 1440 ? n : null; };
const FMT = new Map();
/** Múi giờ IANA hợp lệ (Intl) → tên; sai → 'UTC'. */
export const tzOk = v => { const z = String(v || '').slice(0, 64); if (!/^[A-Za-z_]+(\/[A-Za-z0-9_+\-]+){0,2}$|^UTC$/.test(z)) return 'UTC'; try { fmt(z); return z; } catch (e) { return 'UTC'; } };
const fmt = z => { let f = FMT.get(z); if (!f) { f = new Intl.DateTimeFormat('en-US', { timeZone: z, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' }); FMT.set(z, f); } return f; };
/** Giờ địa phương tại tz: { day (số ngày từ 1970 của NGÀY địa phương), min (phút trong ngày), dow (0 = CN), off (phút lệch UTC lúc đó) } */
export function tzParts(now, tz) {
  const p = {}; for (const x of fmt(tz).formatToParts(new Date(now))) p[x.type] = x.value;
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute), day = Math.floor(wall / DAY);
  return { day, min: (+p.hour % 24) * 60 + +p.minute, dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), off: Math.round((wall - Math.floor(now / 60e3) * 60e3) / 60e3) };
}
export const localDay = (now, tz) => tzParts(now, tz).day;
/** Phút UTC (bội 10) của lần nhắc kế tiếp lúc lmin giờ địa phương ở tz – dùng độ lệch CỦA NGÀY ĐÓ (đổi giờ mùa hè, đi du lịch đổi tz). */
export function slotFor(lmin, tz, now = Date.now()) {
  const t = tzParts(now, tz), ahead = ((lmin - t.min) + 1440) % 1440 || 1440, at = now + ahead * 60e3, off = tzParts(at, tz).off;
  return Math.round(((((lmin - off) % 1440) + 1440) % 1440) / 10) * 10 % 1440;
}
export const inQuiet = (n, q1, q2) => (q1 == null || q2 == null || q1 === q2 ? false : q1 < q2 ? n >= q1 && n < q2 : n >= q1 || n < q2);
const day = t => new Date(t).toISOString().slice(0, 10);

/** Hàng đợi "Lỗi LX-xxxx đã được sửa" (functions/api/report.js pushFixed ghi khi phiếu sang Đã sửa): sid = id thiết bị push_subs, rid = id phiếu. */
export const PUSH_NOW_SQL = 'CREATE TABLE IF NOT EXISTS push_now (sid TEXT NOT NULL, rid INTEGER NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (sid, rid)) WITHOUT ROWID';
/** Chọn thông báo "đã sửa" (thuần – test): bỏ qua giờ nhắc, VẪN tôn trọng giờ yên lặng + ≤ 1 push/ngày/thiết bị (để lượt sau, hàng đợi giữ ≤ 3 ngày); thiết bị đã hủy hoặc chờ > 3 ngày → bỏ.
 * rows: push_now LEFT JOIN push_subs (kèm s.last); taken: id thiết bị đã có lời nhắc trong lượt này → web: push rỗng đó đủ (SW ưu tiên báo đã sửa);
 * FCM: báo "đã sửa" THAY lời nhắc (máy gọi xóa lời nhắc cùng id). fcmSend: Worker gửi được FCM lượt này. → { web, fcm, drop:[[sid, rid]] } */
export function pickFixed(rows, env, now = Date.now(), room = MAX_SEND, taken = new Set(), fcmSend = fcmOn(env)) {
  const out = { web: [], fcm: [], drop: [] };
  for (const r of rows) {
    const k = r.k === 'fcm' ? (fcmSend ? 'fcm' : '') : r.k === 'web' && pct(env) > 0 ? 'web' : '';
    if (!k || now - (+r.at || 0) > 3 * DAY) { out.drop.push([r.sid, r.rid]); continue; }
    if (inQuiet(tzParts(now, r.tz || 'UTC').min, r.q1, r.q2)) continue;
    const dup = out.web.some(x => x.id === r.sid) || out.fcm.some(x => x.id === r.sid);
    if (k === 'fcm' && dup) continue;                                                     // 1 FCM/thiết bị/lượt: phiếu sau chờ lượt sau
    if (!dup && !taken.has(r.sid) && now - (+r.last || 0) < DAY_CAP) continue;           // đã nhận push trong 20 giờ → chờ (≤ 1/ngày)
    if (out.web.length + out.fcm.length >= room) break;
    out.drop.push([r.sid, r.rid]);
    if (k === 'fcm') out.fcm.push({ id: r.sid, token: r.ep, lang: r.lang || 'en', kind: 'fixed', rid: 'LX-' + (1000 + (+r.rid || 0)) });
    else if (!taken.has(r.sid) && !dup) out.web.push({ id: r.sid, ep: r.ep });
  }
  return out;
}

let READY = false;
export async function setupPush(db) {
  if (READY) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS push_subs (id TEXT PRIMARY KEY, k TEXT NOT NULL DEFAULT 'web', ep TEXT NOT NULL, slot INTEGER NOT NULL, tz TEXT NOT NULL, lmin INTEGER NOT NULL, q1 INTEGER, q2 INTEGER, act INTEGER NOT NULL, std INTEGER NOT NULL DEFAULT 0, last INTEGER NOT NULL DEFAULT 0, n INTEGER NOT NULL DEFAULT 0, done INTEGER NOT NULL DEFAULT 0, lang TEXT, at INTEGER NOT NULL) WITHOUT ROWID"),
    db.prepare('CREATE INDEX IF NOT EXISTS push_slot ON push_subs (slot, last)'),
    db.prepare('CREATE INDEX IF NOT EXISTS push_k_last ON push_subs (k, last)'),
    db.prepare('CREATE TABLE IF NOT EXISTS ntf_daily (day TEXT NOT NULL, k TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, k)) WITHOUT ROWID'),
    db.prepare(PUSH_NOW_SQL),
    db.prepare(META_SQL),
  ]);
  READY = true;
}
// Nhịp Worker: ghi khi trạng thái đổi hoặc ≥ 30 phút (≤ 48 ghi/ngày/isolate) · đọc cho cfg: nhớ 5 phút/isolate (≤ 1 đọc D1 nội bộ/5 phút)
let BEAT = { at: 0, v: -1 }, LIVE = { at: 0, v: 0 };
async function beat(db, can, now) {
  const v = can ? 1 : 0; if (BEAT.v === v && now - BEAT.at < 30 * 60e3) return;
  await db.prepare("INSERT INTO push_meta (k, v) VALUES ('fcm', ?1) ON CONFLICT (k) DO UPDATE SET v = ?1").bind(can ? now : 0).run(); BEAT = { at: now, v }; LIVE = { at: now, v: can ? now : 0 };
}
async function fcmReady(db, now) {
  if (now - LIVE.at >= 5 * 60e3) { const r = await db.prepare("SELECT v FROM push_meta WHERE k = 'fcm'").first(); LIVE = { at: now, v: r ? +r.v : 0 }; }
  return fcmLive(LIVE.v, now);
}
const bump = (db, d, k, n = 1) => db.prepare('INSERT INTO ntf_daily (day, k, n) VALUES (?1, ?2, ?3) ON CONFLICT (day, k) DO UPDATE SET n = n + ?3').bind(d, k, n);

/** Chọn dòng đến lượt (thuần – scripts/test/reminders.mjs). rows: kết quả truy vấn theo slot; → { web:[…], fcm:[…], final:[ids] }
 * Web Push: nhắc HẰNG NGÀY theo SEQ (máy khách đã lập nội dung 7 ngày). FCM (app gốc): lịch cục bộ lo nhắc hằng ngày →
 * máy chủ chỉ gửi kéo lại sau ≥ 3 ngày không mở app (3,5,7,10, ngày 14 = lời cuối). Ngày 0–2 (kể cả tiến bộ tuần Chủ nhật) do lịch CỤC BỘ lo
 * → không bao giờ 2 thông báo cùng ngày (trước 05/11 máy chủ gửi thêm "tiến bộ tuần" vào đúng ngày lịch cục bộ cũng nhắc). */
export function pickDue(rows, now = Date.now(), max = MAX_SEND) {
  const out = { web: [], fcm: [], final: [] };
  for (const r of rows) {
    if (out.web.length + out.fcm.length >= max) break;
    if (r.done || now - (+r.last || 0) < DAY_CAP) continue;              // tối đa 1/ngày
    const L = tzParts(now, r.tz || 'UTC'), today = L.day, d = today - (+r.act || 0);
    if ((L.min - (+r.lmin || 0) + 1440) % 1440 > 40) continue;          // đúng giờ ĐỊA PHƯƠNG (cron chạy tại/sau giờ đó ≤ 40 phút)
    if (inQuiet(L.min, r.q1, r.q2)) continue;                            // giờ yên lặng theo giờ địa phương
    if (d < 0 || d > FINAL) continue;
    if (r.k === 'fcm') {
      if (d >= REMOTE_FROM && SEQ.includes(d)) out.fcm.push({ id: r.id, token: r.ep, lang: r.lang || 'en', kind: d === FINAL ? 'miss' : 'back' });
      else continue;
    } else {
      if (!SEQ.includes(d) || +r.std === today) continue;               // đã học hôm nay → không nhắc
      out.web.push({ id: r.id, ep: r.ep });
    }
    if (d === FINAL) out.final.push(r.id);
  }
  return out;
}

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: { ...cors(request), ...adminCors(request), 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  if (u.searchParams.get('op') !== 'cfg') return json(request, 400, { error: 'op' });
  const on = pct(env) > 0 && !!env.VAPID_PUBLIC && d1bReady(env);
  let fcm = false; // chỉ báo app gốc dùng FCM khi Worker THẬT SỰ gửi được – nếu không, máy giữ lịch cục bộ đủ chu kỳ (không mất lời nhắc ngày ≥ 3)
  if (fcmOn(env) && d1bReady(env)) try { const db = coordDb(env); await setupPush(db); fcm = await fcmReady(db, Date.now()); } catch (e) { fcm = false; }
  return json(request, 200, { on, pct: pct(env), key: on ? env.VAPID_PUBLIC : '', fcm }, { 'Cache-Control': 'public, max-age=3600' });
}

export async function onRequestPost({ request, env }) {
  let text; try { text = await readText(request, 8192); } catch (e) { const f = bodyFail(e, 'big'); return json(request, f.status, { error: f.error }); }
  let b; try { b = JSON.parse(text); } catch (e) { return json(request, 400, { error: 'json' }); }
  if (!b || typeof b !== 'object') return json(request, 400, { error: 'json' });
  if (!d1bReady(env)) return b.op === 'ev' ? new Response(null, { status: 204 }) : json(request, 503, { error: 'internal-db-missing' }); // không có D1 nội bộ → tắt hẳn (không bao giờ dùng D1 người dùng)
  const db = coordDb(env), now = Date.now(), ip = request.headers.get('CF-Connecting-IP') || '?';
  try {
    await setupPush(db);
    const cron = request.headers.get('X-Push-Cron');
    if (b.op === 'due' || b.op === 'gone') {
      if (!env.PUSH_CRON_SECRET || cron !== env.PUSH_CRON_SECRET) return json(request, 401, { error: 'cron' });
      if (b.op === 'gone') {
        const ids = (Array.isArray(b.ids) ? b.ids : []).filter(x => /^[a-f0-9]{32}$/.test(x)).slice(0, MAX_SEND);
        if (ids.length) await db.batch([db.prepare(`DELETE FROM push_subs WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids), bump(db, day(now), 'gone', ids.length)]);
        return json(request, 200, { ok: true, n: ids.length });
      }
      const fcmSend = fcmOn(env) && !!b.fcm; // Worker có FCM_SA + cờ không tắt
      if (fcmOn(env)) await beat(db, !!b.fcm, now).catch(() => {});
      if (pct(env) <= 0 && !fcmSend) return json(request, 200, { web: [], fcm: [], skip: 'flag-off' });
      // Cầu dao + ngân sách điều phối: tỉ lệ dùng D1 nội bộ hôm nay ≥ trần của ưu tiên việc "push" → bỏ lượt (lượt 10 phút sau thử lại)
      const job = REG.jobs.find(j => j.id === 'push'), cap = (REG.budget_caps || {})[(job && job.priority) || 'publishing'] ?? 0.7;
      try { const u = await d1Usage(env, db, now, fetch, 'b'); if (u.ratio >= cap) return json(request, 200, { web: [], fcm: [], skip: `d1-internal ${Math.round(u.ratio * 100)}% >= ${Math.round(cap * 100)}%` }); } catch (e) { /* không đo được → vẫn chạy (≤ 40 dòng) */ }
      const m = Math.floor((now % DAY) / 60e3), a = m - 30, ranges = a >= 0 ? [[a, m]] : [[0, m], [1440 + a, 1439]];
      const where = ranges.map(() => '(slot BETWEEN ? AND ?)').join(' OR ');
      const rows = (await db.prepare(`SELECT id, k, ep, tz, lmin, q1, q2, act, std, last, n, done, lang FROM push_subs WHERE (${where}) AND last < ? AND done = 0 LIMIT 120`).bind(...ranges.flat(), now - 20 * 3600e3).all()).results || [];
      const p = pickDue(rows.filter(r => (r.k === 'fcm' ? fcmSend : pct(env) > 0)), now);
      const ids = [...p.web, ...p.fcm].map(x => x.id);
      // Báo "đã sửa" (≤ chỗ còn lại trong lượt): push rỗng như lời nhắc – SW hỏi trạng thái phiếu của máy rồi hiện "Lỗi LX-… đã được sửa"
      const fr = (await db.prepare('SELECT n.sid, n.rid, n.at, s.k, s.ep, s.tz, s.q1, s.q2, s.lang, s.last FROM push_now n LEFT JOIN push_subs s ON s.id = n.sid ORDER BY n.at LIMIT 60').all()).results || [];
      const fx = fr.length ? pickFixed(fr, env, now, MAX_SEND - ids.length, new Set(ids), fcmSend) : { web: [], fcm: [], drop: [] };
      // ≤ 1 push/ngày: "đã sửa" thay lời nhắc FCM cùng thiết bị; thiết bị mới nhận "đã sửa" → last = now (lời nhắc kế tiếp sau ≥ 20 giờ)
      const fxIds = new Set(fx.fcm.map(x => x.id)), fresh = [...new Set([...fx.web, ...fx.fcm].map(x => x.id))].filter(id => !ids.includes(id));
      if (fx.drop.length) await db.batch([...fx.drop.map(([sid, rid]) => db.prepare('DELETE FROM push_now WHERE sid = ? AND rid = ?').bind(sid, rid)), ...(fx.web.length + fx.fcm.length ? [bump(db, day(now), 'sent:fixed', fx.web.length + fx.fcm.length)] : []),
        ...(fresh.length ? [db.prepare(`UPDATE push_subs SET last = ? WHERE id IN (${fresh.map(() => '?').join(',')})`).bind(now, ...fresh)] : [])]);
      p.fcm = p.fcm.filter(x => !fxIds.has(x.id));
      p.web.push(...fx.web); p.fcm.push(...fx.fcm);
      if (ids.length) {
        const byId = new Map(rows.map(r => [r.id, r])), st = [bump(db, day(now), 'sent', ids.length)];
        for (const id of ids) { const r = byId.get(id); st.push(db.prepare('UPDATE push_subs SET last = ?, n = n + 1, slot = ? WHERE id = ?').bind(now, slotFor(+r.lmin || 0, r.tz || 'UTC', now + 3600e3), id)); } // tính lại khung UTC cho ngày mai (đổi giờ mùa hè)
        if (p.final.length) st.push(db.prepare(`UPDATE push_subs SET done = 1 WHERE id IN (${p.final.map(() => '?').join(',')})`).bind(...p.final));
        await db.batch(st);
      }
      return json(request, 200, { web: p.web, fcm: p.fcm });
    }
    if (b.op === 'stats') {
      const g = await adminGate(request, env, 'admpush'); if (!g.who) return json(request, g.status, { error: g.error });
      const rows = (await db.prepare('SELECT day, k, n FROM ntf_daily WHERE day >= ? LIMIT 5000').bind(day(now - 30 * DAY)).all()).results || [];
      return new Response(JSON.stringify({ rows, pct: pct(env), fcm: fcmOn(env) }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(request) } });
    }
    if (b.op === 'ev') {
      if (await limit('pev:' + await sha('ip|' + ip), 60, 3600)) return new Response(null, { status: 204 });
      const e = (Array.isArray(b.e) ? b.e : []).slice(0, 12).filter(x => Array.isArray(x) && EV.has(x[0]) && TPL.test(String(x[1] || '')));
      if (e.length) await db.batch(e.map(([k, tpl, n]) => bump(db, day(now), k + (tpl ? ':' + tpl : ''), Math.max(1, Math.min(20, Math.floor(+n || 1))))));
      if (env.HITS && typeof env.HITS.writeDataPoint === 'function') try { for (const [k, tpl, n] of e) env.HITS.writeDataPoint({ blobs: ['ntf', k, String(tpl || '')], doubles: [+n || 1], indexes: ['ntf'] }); } catch (x) { /* AE tùy chọn */ }
      return new Response(null, { status: 204, headers: cors(request) });
    }
    if (await limit('psub:' + await sha('ip|' + ip), 30, 3600)) return json(request, 429, { error: 'too-fast' });
    if (b.op === 'sub') {
      const k = b.k === 'fcm' ? 'fcm' : 'web', ep = String((k === 'fcm' ? b.token : b.ep) || '');
      if (k === 'web' ? (pct(env) <= 0 || !PUSH_HOST.test(ep) || ep.length > 700) : (!fcmOn(env) || !/^[\w:\-.]{20,400}$/.test(ep))) return json(request, 400, { error: 'bad-sub' });
      const lmin = minOk(b.lmin); if (lmin == null) return json(request, 400, { error: 'lmin' });
      const tz = tzOk(b.tz), id = await sha(k + '|' + ep), today = localDay(now, tz), lang = LANGS.includes(b.lang) ? b.lang : 'en', q = Array.isArray(b.q) ? b.q.map(minOk) : [1320, 480];
      // ro = "chỉ báo lỗi" (màn cảm ơn Báo lỗi): done = 1 → không bao giờ nhận lời nhắc học; thiết bị đã bật nhắc học → giữ nguyên lịch, chỉ đổi ngôn ngữ
      if (b.ro) { await db.batch([db.prepare('INSERT INTO push_subs (id, k, ep, slot, tz, lmin, q1, q2, act, std, last, n, done, lang, at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1320, 480, ?7, 0, 0, 0, 1, ?8, ?9) ON CONFLICT (id) DO UPDATE SET lang = ?8')
        .bind(id, k, ep, slotFor(lmin, tz, now), tz, lmin, today, lang, now), bump(db, day(now), 'subs:rep')]); return json(request, 200, { id }); }
      await db.batch([db.prepare('INSERT INTO push_subs (id, k, ep, slot, tz, lmin, q1, q2, act, std, last, n, done, lang, at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0, 0, 0, ?11, ?12) ON CONFLICT (id) DO UPDATE SET slot = ?4, tz = ?5, lmin = ?6, q1 = ?7, q2 = ?8, act = ?9, std = MAX(std, ?10), n = 0, done = 0, lang = ?11')
        .bind(id, k, ep, slotFor(lmin, tz, now), tz, lmin, q[0], q[1], today, b.st ? today : 0, lang, now), bump(db, day(now), 'subs:' + k)]);
      return json(request, 200, { id });
    }
    const id = /^[a-f0-9]{32}$/.test(b.id || '') ? b.id : ''; if (!id) return json(request, 400, { error: 'id' });
    if (b.op === 'touch') {
      const lmin = minOk(b.lmin), tz = tzOk(b.tz), today = localDay(now, tz), lang = LANGS.includes(b.lang) ? b.lang : null, q = Array.isArray(b.q) ? b.q.map(minOk) : [null, null];
      // tz/giờ/ngôn ngữ đổi (du lịch, đổi giao diện) → tính lại khung UTC ngay
      const r = await db.prepare('UPDATE push_subs SET act = ?2, std = CASE WHEN ?3 THEN ?2 ELSE std END, n = 0, done = 0, tz = ?4, lmin = COALESCE(?5, lmin), slot = COALESCE(?6, slot), lang = COALESCE(?7, lang), q1 = COALESCE(?8, q1), q2 = COALESCE(?9, q2) WHERE id = ?1')
        .bind(id, today, b.st ? 1 : 0, tz, lmin, lmin == null ? null : slotFor(lmin, tz, now), lang, q[0], q[1]).run();
      return json(request, 200, (r.meta && r.meta.changes === 0) ? { gone: 1 } : { ok: true });
    }
    if (b.op === 'unsub') { await db.batch([db.prepare('DELETE FROM push_subs WHERE id = ?').bind(id), bump(db, day(now), 'unsub')]); return json(request, 200, { ok: true }); }
    return json(request, 400, { error: 'op' });
  } catch (e) {
    return json(request, 502, { error: String(e && e.message || e).slice(0, 120) });
  }
}
