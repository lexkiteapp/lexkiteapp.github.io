/* ✉️ Email nhắc học + tổng kết tuần cho người HỌC TỰ BẬT (opt-in, mặc định tắt) – docs/REMINDERS.md §Email. Dữ liệu ở D1 NỘI BỘ (coordDb) – KHÔNG ghi D1 người dùng.
 * Bảng mail_subs: 1 dòng/tài khoản, chỉ lưu uid + tuỳ chọn (KHÔNG lưu email: địa chỉ đọc từ `users` lúc gửi → xóa tài khoản = hết gửi, dòng mồ côi tự xóa).
 *   tz · lmin (giờ gửi = giờ hay học, theo GIỜ ĐỊA PHƯƠNG) · q1/q2 (giờ yên lặng) · lang (15, rơi về en) · rem (nhắc học) · wk (tổng kết tuần)
 *   act = ngày địa phương mở app gần nhất · seq = số email nhắc đã gửi kể từ lần mở app cuối · sent_day = ngày địa phương gửi gần nhất (≤ 1 email/ngày)
 *   recap = {w: Thứ 2 của tuần, nw, mins, ad} (máy khách tính, gửi 1 lần/tuần) · recap_sent = tuần đã gửi
 * Luật gửi (không phiền): nhắc chỉ khi KHÔNG mở app ≥ 2 ngày, theo bậc 2 · 5 · 10 · 21 ngày rồi DỪNG tới khi họ quay lại; tổng kết tuần sáng Thứ 2; ≤ 1 email/ngày;
 * trong cửa sổ 40 phút quanh giờ hay học; ngoài giờ yên lặng; trần ngày MAIL_DAY_CAP (mặc định 80 < hạn mức miễn phí Resend 100/ngày).
 * Nút:
 *   POST {op:'sub', rem, wk, lmin, q:[q1,q2], tz, lang, opened, recap} + Bearer Firebase (email đã xác minh) → { ok, rem, wk }  (cả hai = 0 → xóa dòng)
 *   POST {op:'status'} + Bearer → { rem, wk }
 *   GET|POST ?u=<uid>&t=<hmac> → hủy một chạm (liên kết trong email + List-Unsubscribe-Post), không cần đăng nhập
 *   POST {op:'tick'} + X-Push-Cron → gửi các email đến giờ (cron Worker lexkite-push mỗi 10 phút)
 * Nhà cung cấp: Resend (khóa trong kho khóa Quản trị hoặc env RESEND_API_KEY) → Brevo (env BREVO_API_KEY). Chưa có khóa/miền xác minh → KHÔNG gửi, KHÔNG đánh dấu đã gửi. */
import { coordDb, d1bReady } from './_d1b.js';
import { claims as verifyClaims, limit } from './sync.js';
import { tzParts, tzOk, slotFor, inQuiet } from './push.js';
import { copyOf, fill } from './_mail_copy.js';
import { pick, report as keyReport } from './_keys.js';

export const STEPS = [2, 5, 10, 21], WINDOW = 40, MAX_PER_TICK = 25;
const LANGS = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const dayStr = t => new Date(t).toISOString().slice(0, 10);
const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const minOk = v => { const n = Math.round(+v); return Number.isFinite(n) && n >= 0 && n < 1440 ? n : null; };
const int = (v, max) => { const n = Math.round(+v); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const secretOf = env => (env && (env.MAIL_SECRET || env.PUSH_CRON_SECRET)) || '';
/** Mã hủy một chạm = HMAC-SHA256(secret, 'unsub|' + uid)[0:32] – không thể đoán, không cần lưu */
export async function unsubToken(secret, uid) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode('unsub|' + uid))).slice(0, 32);
}
export const SQL = ['CREATE TABLE IF NOT EXISTS mail_subs (uid TEXT PRIMARY KEY, tz TEXT NOT NULL, lmin INTEGER NOT NULL, q1 INTEGER, q2 INTEGER, lang TEXT NOT NULL DEFAULT \'en\', rem INTEGER NOT NULL DEFAULT 0, wk INTEGER NOT NULL DEFAULT 0, act INTEGER NOT NULL DEFAULT 0, seq INTEGER NOT NULL DEFAULT 0, sent_day INTEGER NOT NULL DEFAULT 0, recap TEXT, recap_sent TEXT, slot INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL DEFAULT 0) WITHOUT ROWID',
  'CREATE INDEX IF NOT EXISTS mail_slot ON mail_subs (slot)', 'CREATE TABLE IF NOT EXISTS mail_daily (day TEXT NOT NULL, k TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, k)) WITHOUT ROWID'];
let READY = false;
export async function setupMail(db) { if (READY) return; await db.batch(SQL.map(s => db.prepare(s))); READY = true; }

/** Quyết định gửi gì cho 1 dòng lúc `now` (thuần – test): null | 'week' | 'rem'. */
export function decide(row, now) {
  if (!row || !(row.rem || row.wk)) return null;
  const t = tzParts(now, tzOk(row.tz)), lm = +row.lmin;
  if (row.sent_day === t.day) return null;                                          // ≤ 1 email/ngày
  const d = Math.abs(t.min - lm), dist = Math.min(d, 1440 - d);
  if (dist >= WINDOW || inQuiet(t.min, row.q1, row.q2)) return null;                // đúng giờ hay học, không ban đêm
  let rc = null; try { rc = row.recap ? JSON.parse(row.recap) : null; } catch (e) { rc = null; }
  if (row.wk && t.dow === 1 && rc && rc.w && rc.nw > 0 && row.recap_sent !== rc.w) return 'week';
  if (row.rem && row.act > 0) { const next = STEPS[row.seq | 0]; if (next != null && t.day - row.act >= next) return 'rem'; }
  return null;
}
/** Nội dung email (thuần – test): { subject, html, text, headers } */
export function build(row, kind, base, token) {
  const L = copyOf(row.lang), C = L[kind], v = {};
  if (kind === 'week') { let r = {}; try { r = JSON.parse(row.recap) || {}; } catch (e) { /* trống */ } Object.assign(v, { nw: int(r.nw, 9999), mins: int(r.mins, 9999), ad: int(r.ad, 7) }); }
  const subject = fill(C.s, v), body = fill(C.b, v), go = `${base}/app/?utm_source=email&utm_medium=${kind}#/home`, un = `${base}/api/mail?u=${encodeURIComponent(row.uid)}&t=${token}`;
  const dir = row.lang === 'ar' ? 'rtl' : 'ltr';
  const html = `<!doctype html><html lang="${esc(row.lang)}" dir="${dir}"><body style="margin:0;background:#f4f7f8;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif"><div style="max-width:480px;margin:0 auto;padding:24px 16px"><div style="background:#fff;border-radius:16px;padding:24px;border:1px solid #e3eaec"><h1 style="margin:0 0 12px;font-size:20px;color:#0f2a33">${esc(subject)}</h1><p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:#2b4650">${esc(body)}</p><a href="${esc(go)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px">${esc(L.cta)}</a></div><p style="font-size:12px;line-height:1.5;color:#5b727a;margin:16px 4px 0">${esc(L.why)} <a href="${esc(un)}" style="color:#0f766e">${esc(L.unsub)}</a></p></div></body></html>`;
  return { subject, html, text: `${body}\n\n${L.cta}: ${go}\n\n${L.why}\n${L.unsub}: ${un}`, headers: { 'List-Unsubscribe': `<${un}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } };
}
/** Trạng thái sau khi gửi (thuần – test) */
export function after(row, kind, now) {
  const t = tzParts(now, tzOk(row.tz)); let rc = null; try { rc = row.recap ? JSON.parse(row.recap) : null; } catch (e) { rc = null; }
  return { sent_day: t.day, seq: kind === 'rem' ? (row.seq | 0) + 1 : row.seq | 0, recap_sent: kind === 'week' && rc ? rc.w : row.recap_sent || null };
}

async function sendMail(env, to, m, from) {
  const body = { from, to: [to], subject: m.subject, html: m.html, text: m.text, headers: m.headers };
  const key = (await pick(env, 'resend').catch(() => null)) || (env.RESEND_API_KEY ? { id: '', key: env.RESEND_API_KEY } : null);
  if (key) {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + key.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (key.id) await keyReport(env, key.id, r.ok ? 'ok' : 'err', r.status).catch(() => {});
    return r.ok ? 'ok' : r.status === 422 ? 'bad' : 'fail';
  }
  if (env.BREVO_API_KEY) {
    const m2 = /^(.*)<(.+)>$/.exec(from) || [, 'Lexkite', from];
    const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ sender: { name: m2[1].trim() || 'Lexkite', email: m2[2].trim() }, to: [{ email: to }], subject: m.subject, htmlContent: m.html, textContent: m.text, headers: m.headers }) });
    return r.ok ? 'ok' : r.status === 400 ? 'bad' : 'fail';
  }
  return 'nokey';
}

/** Một lượt cron (tiêm `send` để test). → { sent, fail, skip } */
export async function tick(env, db, now = Date.now(), send = sendMail) {
  const base = env.MAIL_BASE || 'https://lexkite.com', from = env.MAIL_FROM || 'Lexkite <hello@lexkite.com>', secret = secretOf(env), today = dayStr(now);
  const cap = Math.max(0, +env.MAIL_DAY_CAP || 80), used = ((await db.prepare("SELECT n FROM mail_daily WHERE day = ?1 AND k = 'sent'").bind(today).first()) || {}).n || 0;
  if (used >= cap) return { sent: 0, fail: 0, skip: 'cap' };
  const um = Math.floor(now / 60e3) % 1440, s1 = Math.floor(um / 10) * 10, s0 = (s1 + 1430) % 1440;
  const rows = (await db.prepare('SELECT * FROM mail_subs WHERE slot IN (?1, ?2) LIMIT 200').bind(s1, s0).all()).results || [];
  const due = rows.map(r => ({ r, kind: decide(r, now) })).filter(x => x.kind).slice(0, Math.min(MAX_PER_TICK, cap - used));
  const out = { sent: 0, fail: 0, skip: '' }; if (!due.length) return out;
  const ids = due.map(x => x.r.uid), em = new Map(((await env.DB.prepare(`SELECT uid, email FROM users WHERE uid IN (${ids.map(() => '?').join(',')})`).bind(...ids).all()).results || []).map(u => [u.uid, u.email]));
  for (const { r, kind } of due) {
    const to = em.get(r.uid);
    if (!to || !/^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i.test(to)) { await db.prepare('DELETE FROM mail_subs WHERE uid = ?1').bind(r.uid).run(); continue; } // tài khoản đã xóa / không có email → xóa dòng
    const res = await send(env, to, build(r, kind, base, await unsubToken(secret, r.uid)), from);
    if (res === 'nokey') { out.skip = 'no-key'; break; }                                  // chưa cấu hình nhà cung cấp → không đánh dấu đã gửi
    if (res === 'bad') { await db.prepare('DELETE FROM mail_subs WHERE uid = ?1').bind(r.uid).run(); out.fail++; continue; }
    if (res !== 'ok') { out.fail++; continue; }
    const a = after(r, kind, now);
    await db.batch([db.prepare('UPDATE mail_subs SET sent_day = ?2, seq = ?3, recap_sent = ?4, slot = ?5 WHERE uid = ?1').bind(r.uid, a.sent_day, a.seq, a.recap_sent, slotFor(r.lmin, tzOk(r.tz), now)),
      db.prepare("INSERT INTO mail_daily (day, k, n) VALUES (?1, 'sent', 1) ON CONFLICT (day, k) DO UPDATE SET n = n + 1").bind(today)]);
    out.sent++;
  }
  return out;
}

const page = (lang, msg) => new Response(`<!doctype html><html lang="${esc(lang)}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Lexkite</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f4f7f8;color:#0f2a33"><p style="max-width:22rem;text-align:center;font-size:1.1rem;line-height:1.5;padding:1rem">${esc(msg)}</p></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });

async function unsubscribe(request, env, db) {
  const u = new URL(request.url), uid = u.searchParams.get('u') || '', tk = u.searchParams.get('t') || '', secret = secretOf(env);
  if (!uid || uid.length > 128 || !secret || tk !== await unsubToken(secret, uid)) return page('en', 'Invalid link.');
  const row = await db.prepare('SELECT lang FROM mail_subs WHERE uid = ?1').bind(uid).first(), lang = row && LANGS.includes(row.lang) ? row.lang : 'en';
  await db.prepare('DELETE FROM mail_subs WHERE uid = ?1').bind(uid).run();
  return request.method === 'POST' ? new Response(null, { status: 204 }) : page(lang, copyOf(lang).done);
}

export const onRequestGet = ctx => handle(ctx.request, ctx.env);
export const onRequestPost = ctx => handle(ctx.request, ctx.env);
export async function handle(request, env, deps = {}) {
  if (!d1bReady(env) && !deps.db) return json(503, { error: 'internal-db-missing' });
  const db = deps.db || coordDb(env), now = deps.now || Date.now(); await setupMail(db);
  const u = new URL(request.url);
  if (u.searchParams.has('u')) return unsubscribe(request, env, db);
  if (request.method !== 'POST') return json(405, { error: 'method' });
  let b; try { b = await request.json(); } catch (e) { return json(400, { error: 'json' }); }
  if (b && b.op === 'tick') {
    if (!env.PUSH_CRON_SECRET || request.headers.get('X-Push-Cron') !== env.PUSH_CRON_SECRET) return json(401, { error: 'cron' });
    return json(200, await tick(env, db, now, deps.send));
  }
  const who = await (deps.claims || verifyClaims)((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')).catch(() => null), uid = who && who.sub;
  if (!uid) return json(401, { error: 'auth' });
  if (!who.email || who.email_verified !== true) return json(403, { error: 'email-unverified' });
  if (await (deps.rate || limit)(`mail:${uid}`, 40, 3600)) return json(429, { error: 'too-fast' });
  const cur = await db.prepare('SELECT * FROM mail_subs WHERE uid = ?1').bind(uid).first();
  if (b.op === 'status') return json(200, { rem: cur ? cur.rem : 0, wk: cur ? cur.wk : 0 });
  if (b.op !== 'sub') return json(400, { error: 'op' });
  const rem = b.rem === undefined ? (cur ? cur.rem : 0) : b.rem ? 1 : 0, wk = b.wk === undefined ? (cur ? cur.wk : 0) : b.wk ? 1 : 0;
  if (!rem && !wk) { await db.prepare('DELETE FROM mail_subs WHERE uid = ?1').bind(uid).run(); return json(200, { ok: true, rem: 0, wk: 0 }); }
  const tz = tzOk(b.tz || (cur && cur.tz)), lmin = minOk(b.lmin) ?? (cur ? cur.lmin : 20 * 60), q = Array.isArray(b.q) ? b.q : [], q1 = minOk(q[0]) ?? (cur ? cur.q1 : 22 * 60), q2 = minOk(q[1]) ?? (cur ? cur.q2 : 8 * 60);
  const lang = LANGS.includes(b.lang) ? b.lang : cur ? cur.lang : 'en', t = tzParts(now, tz);
  const act = b.opened ? t.day : cur ? cur.act : t.day, seq = cur && b.opened && cur.act !== t.day ? 0 : cur ? cur.seq : 0;
  let recap = cur ? cur.recap : null; const r = b.recap;
  if (r && /^\d{4}-\d{2}-\d{2}$/.test(r.w || '')) recap = JSON.stringify({ w: r.w, nw: int(r.nw, 9999), mins: int(r.mins, 9999), ad: int(r.ad, 7) });
  await db.prepare('INSERT INTO mail_subs (uid, tz, lmin, q1, q2, lang, rem, wk, act, seq, sent_day, recap, recap_sent, slot, at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15) ON CONFLICT (uid) DO UPDATE SET tz=?2, lmin=?3, q1=?4, q2=?5, lang=?6, rem=?7, wk=?8, act=?9, seq=?10, recap=?12, slot=?14, at=?15')
    .bind(uid, tz, lmin, q1, q2, lang, rem, wk, act, seq, cur ? cur.sent_day : 0, recap, cur ? cur.recap_sent : null, slotFor(lmin, tz, now), now).run();
  return json(200, { ok: true, rem, wk });
}
