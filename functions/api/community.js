/* Cộng đồng người học – Đợt 1: hồ sơ công khai, Quy tắc, nhóm tuổi, chặn 2 chiều, báo cáo (tự ẩn), kiểm tin, hàng duyệt Quản trị.
 * Spec: docs/specs/community.md. Luật an toàn thuần: ./_cm.js. Test: scripts/test/community-api.mjs.
 * CỜ: env.COMMUNITY !== '1' → 404 { error:'off' } (mặc định TẮT tới đợt 7).
 * POST /api/community (Authorization: Bearer <Firebase ID token>) – mọi phản hồi chỉ có pid/biệt danh, KHÔNG uid/email:
 *   { op:'me', studied? }                                   → { profile|null, rules }
 *   { op:'join', nick, color, birthYear, rules, level?, showLevel?, voice? } → { profile } · dưới 13 → 403 'age' (không lưu gì)
 *   { op:'settings', nick?, color?, level?, showLevel?, voice?, dm? }       → { profile }
 *   { op:'block'|'unblock', pid }  · { op:'blocks' } → { list:[{pid,nick,color}] }
 *   { op:'report', kind, target, pid?, reason, note? }      → { ok, hidden }
 *   { op:'check', text }                                    → { ok, why[], text }
 *   { op:'leave' }                                          → xoá hồ sơ + chặn + báo cáo của tôi
 * Quản trị (adminGate – ADMIN_EMAILS, ghi admin_log 'community:<op>'):
 *   { op:'adm-queue', status? } → { list }  ·  { op:'adm-act', id, action:'dismiss'|'hide'|'warn'|'mute'|'ban' } */
import { claims, limit } from './sync.js';
import { gate } from './_quota.js';
import { once } from './_schema.js';
import { cleanNick } from './league.js';
import { adminGate, adminAudit } from './admin.js';
import { RULES_V, COLORS, HIDE_AT, REPORTS_PER_DAY, BLOCK_MAX, REASONS, KINDS, ageBand, checkText, trust, penalty, muted } from './_cm.js';

const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)|https?:\/\/localhost(:\d+)?|capacitor:\/\/localhost|chrome-extension:\/\/[a-z]{32})$/;
const cors = req => { const o = req.headers.get('Origin') || ''; return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : {}; };
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });
export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });

const PID_ABC = 'abcdefghjkmnpqrstuvwxyz23456789';
export const newPid = () => { const b = crypto.getRandomValues(new Uint8Array(10)); return [...b].map(x => PID_ABC[x % PID_ABC.length]).join(''); };
const cleanPid = s => (/^[a-z2-9]{10}$/.test(String(s || '')) ? String(s) : '');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

let ready = false;
export async function setup(db) {
  if (ready) return;
  await once(db, 'community', 1, async () => { // lược đồ: sửa CREATE/ALTER ở đây thì TĂNG số 1
    await db.batch([
      db.prepare('CREATE TABLE IF NOT EXISTS cm_profile (uid TEXT PRIMARY KEY, pid TEXT NOT NULL UNIQUE, nick TEXT NOT NULL, color INTEGER NOT NULL DEFAULT 0, band TEXT NOT NULL, level TEXT, show_level INTEGER NOT NULL DEFAULT 1, voice INTEGER NOT NULL DEFAULT 1, dm INTEGER NOT NULL DEFAULT 0, rules_v INTEGER NOT NULL, trust INTEGER NOT NULL DEFAULT 0, strikes INTEGER NOT NULL DEFAULT 0, strike_at INTEGER NOT NULL DEFAULT 0, mute_until INTEGER NOT NULL DEFAULT 0, study_days INTEGER NOT NULL DEFAULT 0, study_last TEXT, created INTEGER NOT NULL) WITHOUT ROWID'),
      db.prepare('CREATE TABLE IF NOT EXISTS cm_block (uid TEXT NOT NULL, other TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (uid, other)) WITHOUT ROWID'),
      db.prepare('CREATE INDEX IF NOT EXISTS cm_block_other ON cm_block (other)'),
      db.prepare('CREATE TABLE IF NOT EXISTS cm_report (id TEXT PRIMARY KEY, kind TEXT NOT NULL, target TEXT NOT NULL, owner TEXT NOT NULL, by TEXT NOT NULL, reason TEXT NOT NULL, note TEXT, at INTEGER NOT NULL, status TEXT NOT NULL, action TEXT) WITHOUT ROWID'),
      db.prepare('CREATE INDEX IF NOT EXISTS cm_report_target ON cm_report (target, status)'),
      db.prepare('CREATE INDEX IF NOT EXISTS cm_report_status ON cm_report (status, at)'),
      db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS cm_report_once ON cm_report (target, by)'), // 1 người báo 1 mục 1 lần
    ]);
  });
  ready = true;
}

const pub = p => p && { pid: p.pid, nick: p.nick, color: p.color, ...(p.show_level && p.level ? { level: p.level } : {}) };
const mine = (p, now) => p && { ...pub(p), level: p.level || null, band: p.band, showLevel: !!p.show_level, voice: !!p.voice, dm: !!p.dm, trust: trust(p, now), muted: muted(p, now) ? p.mute_until : 0, banned: p.strikes >= 4, rulesOk: p.rules_v >= RULES_V };
const byPid = (db, pid) => db.prepare('SELECT * FROM cm_profile WHERE pid = ?').bind(pid).first();

/** Hai uid có chặn nhau theo BẤT KỲ chiều nào? (chat/gọi/kết bạn/mời đều phải hỏi hàm này) */
export async function blockedEither(db, a, b) {
  return !!(await db.prepare('SELECT 1 FROM cm_block WHERE (uid = ?1 AND other = ?2) OR (uid = ?2 AND other = ?1) LIMIT 1').bind(a, b).first());
}
/** Mục (tin/người/phòng) đang bị ẩn chờ duyệt? */
export async function isHidden(db, target) {
  return !!(await db.prepare("SELECT 1 FROM cm_report WHERE target = ?1 AND status IN ('hidden','actioned') LIMIT 1").bind(target).first());
}

// Lõi (tách khỏi xác thực để test với SQLite) → [mã HTTP, dữ liệu]
export async function run(db, uid, req, now = Date.now()) {
  const op = req.op, ok = d => [200, d], bad = (e, s = 400) => [s, { error: e }];
  let p = await db.prepare('SELECT * FROM cm_profile WHERE uid = ?').bind(uid).first();
  const rules = { v: RULES_V };
  const bools = (o, src) => { for (const [k, col] of [['showLevel', 'show_level'], ['voice', 'voice'], ['dm', 'dm']]) if (k in src) o[col] = src[k] ? 1 : 0; return o; };
  const fields = src => { const o = bools({}, src);
    if ('color' in src) { const c = Math.floor(+src.color); if (!(c >= 0 && c < COLORS)) return null; o.color = c; }
    if ('level' in src) { if (src.level && !LEVELS.includes(src.level)) return null; o.level = src.level || null; }
    if ('nick' in src) { const n = cleanNick(src.nick); if (!n) return null; o.nick = n; }
    return o; };

  if (op === 'join') {
    if (+req.rules !== RULES_V) return bad('rules');
    const existing = p && p.band;
    const band = existing || ageBand(req.birthYear, now);
    if (!band) return bad('age');
    if (band === 'u13') return bad('age', 403);           // dưới 13: không vào, không lưu năm sinh/hồ sơ
    if (existing && req.birthYear != null && ageBand(req.birthYear, now) !== existing) return bad('band-locked', 409); // nhóm tuổi KHOÁ sau lần đầu (chống "đổi tuổi" vào phòng teen)
    const f = fields({ nick: req.nick, color: req.color ?? 0, ...('level' in req ? { level: req.level } : {}), ...('showLevel' in req ? { showLevel: req.showLevel } : {}), ...('voice' in req ? { voice: req.voice } : {}) });
    if (!f) return bad('fields');
    if (band === 'teen') f.dm = 0;
    if (p) {
      const cols = Object.keys(f); await db.prepare(`UPDATE cm_profile SET ${cols.map((c, i) => `${c} = ?${i + 2}`).join(', ')}, rules_v = ?${cols.length + 2} WHERE uid = ?1`).bind(uid, ...cols.map(c => f[c]), RULES_V).run();
    } else {
      await db.prepare('INSERT INTO cm_profile (uid, pid, nick, color, band, level, show_level, voice, dm, rules_v, created) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9, ?10)')
        .bind(uid, newPid(), f.nick, f.color, band, f.level ?? null, f.show_level ?? 1, f.voice ?? 1, RULES_V, now).run();
    }
    p = await db.prepare('SELECT * FROM cm_profile WHERE uid = ?').bind(uid).first();
    return ok({ profile: mine(p, now), rules });
  }
  if (op === 'me') {
    if (p && req.studied) { const d = new Date(now).toISOString().slice(0, 10); if (p.study_last !== d) { await db.prepare('UPDATE cm_profile SET study_days = study_days + 1, study_last = ?2 WHERE uid = ?1').bind(uid, d).run(); p.study_days++; p.study_last = d; } }
    return ok({ profile: mine(p, now), rules });
  }
  if (op === 'leave') {
    await db.batch(['DELETE FROM cm_block WHERE uid = ?1 OR other = ?1', 'DELETE FROM cm_report WHERE by = ?1', 'DELETE FROM cm_profile WHERE uid = ?1'].map(q => db.prepare(q).bind(uid)));
    return ok({ ok: true, profile: null });
  }
  if (!p) return bad('no-profile', 403);
  if (p.rules_v < RULES_V) return bad('rules', 403);

  if (op === 'settings') {
    const f = fields(req); if (!f) return bad('fields');
    if (p.band !== 'adult') f.dm = 0;                      // 13–17: không có tin riêng
    const cols = Object.keys(f);
    if (cols.length) await db.prepare(`UPDATE cm_profile SET ${cols.map((c, i) => `${c} = ?${i + 2}`).join(', ')} WHERE uid = ?1`).bind(uid, ...cols.map(c => f[c])).run();
    return ok({ profile: mine(await db.prepare('SELECT * FROM cm_profile WHERE uid = ?').bind(uid).first(), now) });
  }
  if (op === 'block' || op === 'unblock') {
    const o = cleanPid(req.pid) && await byPid(db, cleanPid(req.pid));
    if (!o || o.uid === uid) return bad('pid');
    if (op === 'unblock') { await db.prepare('DELETE FROM cm_block WHERE uid = ?1 AND other = ?2').bind(uid, o.uid).run(); return ok({ ok: true }); }
    const n = await db.prepare('SELECT COUNT(*) AS n FROM cm_block WHERE uid = ?').bind(uid).first();
    if ((n && n.n) >= BLOCK_MAX) return bad('block-max', 409);
    await db.prepare('INSERT OR IGNORE INTO cm_block (uid, other, at) VALUES (?1, ?2, ?3)').bind(uid, o.uid, now).run();
    return ok({ ok: true });
  }
  if (op === 'blocks') {
    const { results } = await db.prepare('SELECT p.pid, p.nick, p.color FROM cm_block b JOIN cm_profile p ON p.uid = b.other WHERE b.uid = ?1 ORDER BY b.at DESC LIMIT ?2').bind(uid, BLOCK_MAX).all();
    return ok({ list: results || [] });
  }
  if (op === 'report') {
    const kind = String(req.kind || ''), reason = String(req.reason || '');
    if (!KINDS.includes(kind) || !REASONS.includes(reason)) return bad('fields');
    const o = cleanPid(req.pid) && await byPid(db, cleanPid(req.pid));
    if (!o) return bad('pid');
    if (o.uid === uid) return bad('self');
    const target = kind === 'user' ? 'user:' + o.pid : `${kind}:${String(req.target || '').replace(/[^\w:-]/g, '').slice(0, 80)}`;
    if (target.length < kind.length + 2) return bad('target');
    const d0 = now - 864e5, c = await db.prepare('SELECT COUNT(*) AS n FROM cm_report WHERE by = ?1 AND at > ?2').bind(uid, d0).first();
    if ((c && c.n) >= REPORTS_PER_DAY) return bad('report-max', 429);
    const note = req.note ? checkText(req.note, { max: 300 }) : null;
    await db.prepare("INSERT OR IGNORE INTO cm_report (id, kind, target, owner, by, reason, note, at, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'open')")
      .bind(crypto.randomUUID(), kind, target, o.uid, uid, reason, note && note.ok ? note.text : null, now).run();
    const r = await db.prepare("SELECT COUNT(DISTINCT by) AS n FROM cm_report WHERE target = ?1 AND status IN ('open','hidden')").bind(target).first();
    let hidden = await isHidden(db, target);
    if (!hidden && ((r && r.n) >= HIDE_AT || reason === 'minor' || reason === 'selfharm')) { // an toàn trẻ em / tự hại: ẩn ngay chờ duyệt
      await db.prepare("UPDATE cm_report SET status = 'hidden' WHERE target = ?1 AND status = 'open'").bind(target).run(); hidden = true;
    }
    return ok({ ok: true, hidden });
  }
  if (op === 'check') {
    if (p.strikes >= 4) return bad('banned', 403);
    if (muted(p, now)) return [403, { error: 'muted', until: p.mute_until }];
    return ok(checkText(req.text));
  }
  return bad('op');
}

// Hàng duyệt Quản trị → [mã, dữ liệu]
export async function admin(db, req, now = Date.now()) {
  if (req.op === 'adm-queue') {
    const st = ['open', 'hidden', 'actioned', 'dismissed'].includes(req.status) ? req.status : null;
    const { results } = await db.prepare(`SELECT r.id, r.kind, r.target, r.reason, r.note, r.at, r.status, r.action, o.pid AS pid, o.nick AS nick, o.strikes AS strikes, (SELECT COUNT(DISTINCT by) FROM cm_report x WHERE x.target = r.target) AS reporters
      FROM cm_report r LEFT JOIN cm_profile o ON o.uid = r.owner WHERE ${st ? 'r.status = ?1' : "r.status IN ('hidden','open')"} ORDER BY CASE r.reason WHEN 'minor' THEN 0 WHEN 'selfharm' THEN 0 ELSE 1 END, CASE r.status WHEN 'hidden' THEN 0 ELSE 1 END, r.at ASC LIMIT 200`).bind(...(st ? [st] : [])).all();
    return [200, { list: results || [] }];
  }
  if (req.op === 'adm-act') {
    const r = await db.prepare('SELECT * FROM cm_report WHERE id = ?').bind(String(req.id || '')).first();
    if (!r) return [404, { error: 'id' }];
    const a = String(req.action || '');
    if (a === 'dismiss') { await db.prepare("UPDATE cm_report SET status = 'dismissed', action = 'dismiss' WHERE target = ?1 AND status IN ('open','hidden')").bind(r.target).run(); return [200, { ok: true }]; }
    if (!['hide', 'warn', 'mute', 'ban'].includes(a)) return [400, { error: 'action' }];
    const stmts = [db.prepare("UPDATE cm_report SET status = 'actioned', action = ?2 WHERE target = ?1 AND status IN ('open','hidden')").bind(r.target, a)];
    let pen = null;
    if (a !== 'hide') {
      const o = await db.prepare('SELECT strikes FROM cm_profile WHERE uid = ?').bind(r.owner).first();
      if (o) {
        const s = a === 'ban' ? 4 : a === 'mute' ? Math.max(2, o.strikes + 1) : o.strikes + 1;
        pen = penalty(s, now);
        stmts.push(db.prepare('UPDATE cm_profile SET strikes = ?2, strike_at = ?3, mute_until = ?4 WHERE uid = ?1').bind(r.owner, s, now, pen.until));
      }
    }
    await db.batch(stmts);
    return [200, { ok: true, penalty: pen }];
  }
  return [400, { error: 'op' }];
}

export async function onRequestPost({ request, env }) {
  if (env.COMMUNITY !== '1') return json(request, 404, { error: 'off' }); // cờ tính năng – mặc định TẮT
  if (!env.DB) return json(request, 500, { error: 'no-db' });
  let req; try { req = await request.json(); } catch (e) { return json(request, 400, { error: 'json' }); }
  if (String(req.op || '').startsWith('adm-')) {
    const g = await adminGate(request, env, 'admcm'); if (g.error) return json(request, g.status, { error: g.error });
    try { await setup(env.DB); const [s, d] = await admin(env.DB, req); await adminAudit(env, request, g.who.email, 'community:' + req.op, s === 200); return json(request, s, d); } catch (e) { return json(request, 500, { error: 'server' }); }
  }
  const who = await claims((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')).catch(() => null);
  const uid = who && who.sub;
  if (!uid) return json(request, 401, { error: 'auth' });
  { const wait = await limit(`cm:${uid}`, 30, 60); if (wait) return json(request, 429, { error: 'too-fast', wait }); }
  if (req.op === 'report') { const wait = await limit(`cmrep:${uid}`, 5, 60); if (wait) return json(request, 429, { error: 'too-fast', wait }); }
  { const q = await gate(request, env, 'community', { who, json }); if (q.res) return q.res; } // hạn mức ngày + IP + khóa (docs/QUOTAS.md)
  try { await setup(env.DB); const [s, d] = await run(env.DB, uid, req, Date.now()); return json(request, s, d); } catch (e) { return json(request, 500, { error: 'server' }); }
}
