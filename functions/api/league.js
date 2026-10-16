/* Bảng xếp hạng tuần (kiểu Duolingo) – Cloudflare Pages Functions + D1.
 * Chỉ người ĐÃ ĐĂNG NHẬP và TỰ BẬT tham gia (opt-in, hiển thị biệt danh – không lộ email/tên thật).
 * Mỗi tuần (thứ Hai 00:00 UTC) người chơi vào nhóm ≤ 30 người cùng hạng; cuối tuần top 7 lên hạng, 5 người cuối xuống hạng.
 * POST /api/league  (Authorization: Bearer <Firebase ID token>)
 *   { op: 'me' }                 → { member, board, last }   (member null = chưa tham gia)
 *   { op: 'join', nick }         → tham gia / đổi biệt danh
 *   { op: 'leave' }              → rời bảng xếp hạng (xóa dòng tuần này)
 *   { op: 'xp', xp }             → cập nhật XP tuần này (chỉ tăng, có trần) → { member, board, last }
 * Hạng: 0 Đồng · 1 Bạc · 2 Vàng · 3 Ngọc bích · 4 Hồng ngọc · 5 Kim cương (tên hiển thị dịch ở app). */
import { claims, limit } from './sync.js';

const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)|https?:\/\/localhost(:\d+)?|capacitor:\/\/localhost|chrome-extension:\/\/[a-z]{32})$/;
const GROUP = 30, UP = 7, DOWN = 5, MAX_TIER = 5, MAX_WEEK_XP = 20000;
const cors = req => { const o = req.headers.get('Origin') || ''; return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : {}; };
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });

// Tuần bắt đầu thứ Hai 00:00 UTC – chung cho mọi múi giờ (công bằng toàn cầu)
export function weekOf(ms = Date.now()) { const d = new Date(ms); const day = (d.getUTCDay() + 6) % 7; const mon = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day); return { key: new Date(mon).toISOString().slice(0, 10), start: mon, end: mon + 7 * 864e5 }; }
// Biệt danh: 2–20 ký tự chữ (mọi ngôn ngữ), số, khoảng trắng, . _ - ; chặn dạng email/link
export function cleanNick(s) { const n = String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim(); return /^[\p{L}\p{N} ._-]{2,20}$/u.test(n) && !/@|https?:|www\./i.test(n) ? n : ''; }

let ready = false;
async function setup(db) {
  if (ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS league_member (uid TEXT PRIMARY KEY, nick TEXT NOT NULL, tier INTEGER NOT NULL DEFAULT 0, joined INTEGER NOT NULL, last TEXT) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS league_week (week TEXT NOT NULL, uid TEXT NOT NULL, tier INTEGER NOT NULL, grp INTEGER NOT NULL, xp INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL, PRIMARY KEY (week, uid)) WITHOUT ROWID'),
    db.prepare('CREATE INDEX IF NOT EXISTS league_week_grp ON league_week (week, tier, grp, xp)'),
  ]);
  ready = true;
}

async function board(db, week, tier, grp, uid) {
  const { results } = await db.prepare('SELECT w.uid, m.nick, w.xp FROM league_week w JOIN league_member m ON m.uid = w.uid WHERE w.week = ?1 AND w.tier = ?2 AND w.grp = ?3 ORDER BY w.xp DESC, w.updated ASC LIMIT ?4').bind(week, tier, grp, GROUP).all();
  const n = (results || []).length;
  return (results || []).map((r, i) => ({ rank: i + 1, nick: r.nick, xp: r.xp, me: r.uid === uid, zone: i < UP && r.xp > 0 && tier < MAX_TIER ? 'up' : tier > 0 && n > UP + DOWN && i >= n - DOWN ? 'down' : '' }));
}

// Tuần mới: tính kết quả tuần trước của người này (lên/giữ/xuống hạng) – làm "lười" khi họ quay lại, không cần cron
async function settle(db, m, now) {
  const cur = weekOf(now).key;
  if (!m.last || m.last === cur) return null;
  const row = await db.prepare('SELECT tier, grp, xp FROM league_week WHERE week = ?1 AND uid = ?2').bind(m.last, m.uid).first();
  let result = null;
  if (row) {
    const b = await board(db, m.last, row.tier, row.grp, m.uid), me = b.find(x => x.me), n = b.length;
    const move = me && me.zone === 'up' ? 1 : me && me.zone === 'down' ? -1 : 0;
    m.tier = Math.max(0, Math.min(MAX_TIER, row.tier + move));
    result = { week: m.last, rank: me ? me.rank : n, of: n, xp: row.xp, move, tier: m.tier };
  }
  await db.prepare('UPDATE league_member SET tier = ?2, last = ?3 WHERE uid = ?1').bind(m.uid, m.tier, cur).run();
  m.last = cur;
  return result;
}

// Vào nhóm tuần này: nhóm cùng hạng còn chỗ (lấp đầy nhóm cũ trước), hết chỗ thì mở nhóm mới
async function place(db, m, now) {
  const w = weekOf(now).key;
  const row = await db.prepare('SELECT tier, grp, xp FROM league_week WHERE week = ?1 AND uid = ?2').bind(w, m.uid).first();
  if (row) return row;
  const g = await db.prepare('SELECT grp, COUNT(*) AS n FROM league_week WHERE week = ?1 AND tier = ?2 GROUP BY grp HAVING n < ?3 ORDER BY grp LIMIT 1').bind(w, m.tier, GROUP).first();
  const grp = g ? g.grp : (((await db.prepare('SELECT MAX(grp) AS g FROM league_week WHERE week = ?1 AND tier = ?2').bind(w, m.tier).first()) || {}).g ?? -1) + 1;
  await db.prepare('INSERT OR IGNORE INTO league_week (week, uid, tier, grp, xp, updated) VALUES (?1, ?2, ?3, ?4, 0, ?5)').bind(w, m.uid, m.tier, grp, now).run();
  if (m.last !== w) await db.prepare('UPDATE league_member SET last = ?2 WHERE uid = ?1').bind(m.uid, w).run();
  return { tier: m.tier, grp, xp: 0 };
}

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json(request, 500, { error: 'no-db' });
  const who = await claims((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')).catch(() => null);
  const uid = who && who.sub;
  if (!uid) return json(request, 401, { error: 'auth' });
  let req; try { req = await request.json(); } catch (e) { return json(request, 400, { error: 'json' }); }
  { const wait = await limit(`league:${uid}`, 12, 60); if (wait) return json(request, 429, { error: 'too-fast', wait }); }
  const db = env.DB, now = Date.now(), wk = weekOf(now);
  try {
    await setup(db);
    let m = await db.prepare('SELECT * FROM league_member WHERE uid = ?').bind(uid).first();
    if (req.op === 'join') {
      const nick = cleanNick(req.nick); if (!nick) return json(request, 400, { error: 'nick' });
      if (m) await db.prepare('UPDATE league_member SET nick = ?2 WHERE uid = ?1').bind(uid, nick).run();
      else await db.prepare('INSERT INTO league_member (uid, nick, tier, joined, last) VALUES (?1, ?2, 0, ?3, NULL)').bind(uid, nick, now).run();
      m = await db.prepare('SELECT * FROM league_member WHERE uid = ?').bind(uid).first();
    } else if (req.op === 'leave') {
      if (m) await db.batch([db.prepare('DELETE FROM league_week WHERE week = ?1 AND uid = ?2').bind(wk.key, uid), db.prepare('DELETE FROM league_member WHERE uid = ?').bind(uid)]);
      return json(request, 200, { ok: true, member: null });
    } else if (req.op !== 'me' && req.op !== 'xp') return json(request, 400, { error: 'op' });
    if (!m) return json(request, 200, { member: null, week: wk });
    const last = await settle(db, m, now);
    const row = await place(db, m, now);
    if (req.op === 'xp') {
      const xp = Math.max(0, Math.min(MAX_WEEK_XP, Math.floor(+req.xp || 0)));
      if (xp > row.xp) { await db.prepare('UPDATE league_week SET xp = ?3, updated = ?4 WHERE week = ?1 AND uid = ?2').bind(wk.key, uid, xp, now).run(); row.xp = xp; }
    }
    return json(request, 200, { member: { nick: m.nick, tier: m.tier, xp: row.xp }, week: wk, board: await board(db, wk.key, row.tier, row.grp, uid), last, rules: { group: GROUP, up: UP, down: DOWN, maxTier: MAX_TIER } });
  } catch (e) { return json(request, 500, { error: 'server' }); }
}
