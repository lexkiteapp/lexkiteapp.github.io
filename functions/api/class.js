/* Lớp học (Teacher / Classroom mode) – Cloudflare Pages Functions + D1 lexkite-sync. Tài liệu: docs/CLASSROOM.md
 * Giáo viên tạo lớp → mã tham gia 6 ký tự; học sinh nhập mã. Giáo viên giao bộ từ / đề luyện có sẵn, xem tiến độ từng em.
 * Dữ liệu tối thiểu (COPPA/FERPA): chỉ uid Firebase + TÊN HIỂN THỊ học sinh tự nhập (không email, không ảnh); không quảng cáo.
 * POST /api/class  (Authorization: Bearer <Firebase ID token>)
 *   { op: 'mine' }                              → { teach: [lớp], learn: [lớp + bài giao + tiến độ của tôi] }
 *   { op: 'create', name }                      → { cls }                 (giáo viên)
 *   { op: 'join', code, name }                  → { cls }                 (học sinh)
 *   { op: 'leave', cls }                        → { ok }
 *   { op: 'assign', cls, ref, due? }            → { task }                (chủ lớp) ref: topic:<id> | il:<n> | ir:<n> | toeic:<n>
 *   { op: 'unassign', cls, task }               → { ok }
 *   { op: 'report', cls }                       → { cls, members, tasks, prog } (chủ lớp)
 *   { op: 'kick', cls, uid }                    → { ok }                  (chủ lớp xóa 1 học sinh + tiến độ)
 *   { op: 'rename', cls, name } · { op: 'newcode', cls } · { op: 'delete', cls }   (chủ lớp)
 *   { op: 'progress', ref, r, t }               → { n }  học sinh xong 1 lượt: r/t câu đúng (bộ từ: r = %, t = 100)
 *   { op: 'ping' }                              → { ok }  cập nhật "hoạt động gần nhất" */
import { claims, limit } from './sync.js';
import { gate } from './_quota.js';
import { profaneName } from './_abuse.js';

const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)|https?:\/\/localhost(:\d+)?|capacitor:\/\/localhost|chrome-extension:\/\/[a-z]{32})$/;
export const MAX = { teach: 30, learn: 20, members: 300, tasks: 200 };
const cors = req => { const o = req.headers.get('Origin') || ''; return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : {}; };
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });

// Mã tham gia: 6 ký tự, bỏ chữ dễ nhầm (0/O, 1/I/L) – đọc to trong lớp được
export const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newCode(rand = n => crypto.getRandomValues(new Uint8Array(n))) { const b = rand(6); let s = ''; for (let i = 0; i < 6; i++) s += ALPHABET[b[i] % ALPHABET.length]; return s; }
export const cleanCode = s => { const c = String(s || '').toUpperCase().replace(/[\s-]/g, ''); return /^[A-HJKMNP-Z2-9]{6}$/.test(c) ? c : ''; };
const newId = () => [...crypto.getRandomValues(new Uint8Array(9))].map(x => (x % 36).toString(36)).join('');
// Tên lớp / tên học sinh: 1–40 ký tự chữ (mọi ngôn ngữ), số, khoảng trắng, . ' - ( ) ; chặn email/link/từ tục
export function cleanName(s, max = 40) { const n = String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim(); if (n.length < 1 || n.length > max || !/^[\p{L}\p{M}\p{N} .'’()_-]+$/u.test(n) || /@|https?:|www\./i.test(n)) return ''; return profaneName(n) ? '' : n; }
// Bài giao: chỉ nội dung có sẵn của Lexkite
export const cleanRef = s => { const r = String(s || ''); return /^(topic:[a-z0-9_-]{1,60}|(il|ir|toeic):\d{1,3})$/.test(r) ? r : ''; };

let ready = false;
export async function setup(db) {
  if (ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS classes (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, owner TEXT NOT NULL, name TEXT NOT NULL, created INTEGER NOT NULL) WITHOUT ROWID'),
    db.prepare('CREATE INDEX IF NOT EXISTS classes_owner ON classes (owner)'),
    db.prepare('CREATE TABLE IF NOT EXISTS class_member (cls TEXT NOT NULL, uid TEXT NOT NULL, name TEXT NOT NULL, joined INTEGER NOT NULL, last INTEGER NOT NULL, PRIMARY KEY (cls, uid)) WITHOUT ROWID'),
    db.prepare('CREATE INDEX IF NOT EXISTS class_member_uid ON class_member (uid)'),
    db.prepare('CREATE TABLE IF NOT EXISTS class_task (id TEXT PRIMARY KEY, cls TEXT NOT NULL, ref TEXT NOT NULL, due INTEGER, created INTEGER NOT NULL) WITHOUT ROWID'),
    db.prepare('CREATE INDEX IF NOT EXISTS class_task_cls ON class_task (cls, ref)'),
    db.prepare('CREATE TABLE IF NOT EXISTS class_progress (task TEXT NOT NULL, uid TEXT NOT NULL, cls TEXT NOT NULL, best INTEGER NOT NULL, last INTEGER NOT NULL, tries INTEGER NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (task, uid)) WITHOUT ROWID'),
    db.prepare('CREATE INDEX IF NOT EXISTS class_progress_cls ON class_progress (cls)'),
  ]);
  ready = true;
}

const pub = c => ({ id: c.id, code: c.code, name: c.name, created: c.created });
const tasksOf = async (db, cls) => ((await db.prepare('SELECT id, ref, due, created FROM class_task WHERE cls = ? ORDER BY created DESC').bind(cls).all()).results || []);
async function uniqueCode(db) { for (let i = 0; i < 8; i++) { const c = newCode(); if (!(await db.prepare('SELECT 1 FROM classes WHERE code = ?').bind(c).first())) return c; } throw new Error('code'); }

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json(request, 500, { error: 'no-db' });
  const who = await claims((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')).catch(() => null);
  const uid = who && who.sub;
  if (!uid) return json(request, 401, { error: 'auth' });
  let req; try { req = await request.json(); } catch (e) { return bad('json'); }
  { const wait = await limit(`class:${uid}`, 30, 60); if (wait) return json(request, 429, { error: 'too-fast', wait }); }
  { const q = await gate(request, env, 'classroom', { who, json }); if (q.res) return q.res; } // hạn mức ngày + IP + khóa (docs/QUOTAS.md)
  if (req.op === 'join') { const wait = await limit(`classjoin:${uid}`, 10, 600); if (wait) return json(request, 429, { error: 'too-fast', wait }); } // chống dò mã
  try { await setup(env.DB); const [status, data] = await run(env.DB, uid, req, Date.now()); return json(request, status, data); } catch (e) { return json(request, 500, { error: 'server' }); }
}

// Lõi xử lý (tách khỏi xác thực để kiểm thử với SQLite – scripts/test/classroom.mjs) → [mã HTTP, dữ liệu]
export async function run(db, uid, req, now) {
  const op = req.op, ok = d => [200, d], bad = (e, s = 400) => [s, { error: e }];
  {
    const own = () => db.prepare('SELECT * FROM classes WHERE id = ?1 AND owner = ?2').bind(String(req.cls || ''), uid).first();
    if (op === 'mine') {
      const teach = ((await db.prepare('SELECT c.*, (SELECT COUNT(*) FROM class_member m WHERE m.cls = c.id) AS n FROM classes c WHERE owner = ? ORDER BY created DESC').bind(uid).all()).results || []).map(c => ({ ...pub(c), n: c.n }));
      const rows = (await db.prepare('SELECT c.id, c.name, m.name AS me FROM class_member m JOIN classes c ON c.id = m.cls WHERE m.uid = ? ORDER BY m.joined DESC').bind(uid).all()).results || [];
      const learn = [];
      for (const c of rows) {
        const tasks = await tasksOf(db, c.id);
        const prog = (await db.prepare('SELECT task, best, last, tries, updated FROM class_progress WHERE cls = ?1 AND uid = ?2').bind(c.id, uid).all()).results || [];
        learn.push({ id: c.id, name: c.name, me: c.me, tasks, prog });
      }
      return ok({ teach, learn });
    }

    if (op === 'create') {
      const name = cleanName(req.name, 60); if (!name) return bad('name');
      const n = (await db.prepare('SELECT COUNT(*) AS n FROM classes WHERE owner = ?').bind(uid).first()).n;
      if (n >= MAX.teach) return bad('max-classes');
      const c = { id: newId(), code: await uniqueCode(db), owner: uid, name, created: now };
      await db.prepare('INSERT INTO classes (id, code, owner, name, created) VALUES (?1, ?2, ?3, ?4, ?5)').bind(c.id, c.code, uid, name, now).run();
      return ok({ cls: { ...pub(c), n: 0 } });
    }

    if (op === 'join') {
      const code = cleanCode(req.code); if (!code) return bad('code');
      const name = cleanName(req.name); if (!name) return bad('name');
      const c = await db.prepare('SELECT * FROM classes WHERE code = ?').bind(code).first();
      if (!c) return bad('no-class', 404);
      if (c.owner === uid) return bad('own-class');
      const m = await db.prepare('SELECT 1 FROM class_member WHERE cls = ?1 AND uid = ?2').bind(c.id, uid).first();
      if (m) await db.prepare('UPDATE class_member SET name = ?3, last = ?4 WHERE cls = ?1 AND uid = ?2').bind(c.id, uid, name, now).run();
      else {
        if ((await db.prepare('SELECT COUNT(*) AS n FROM class_member WHERE uid = ?').bind(uid).first()).n >= MAX.learn) return bad('max-joined');
        if ((await db.prepare('SELECT COUNT(*) AS n FROM class_member WHERE cls = ?').bind(c.id).first()).n >= MAX.members) return bad('class-full');
        await db.prepare('INSERT INTO class_member (cls, uid, name, joined, last) VALUES (?1, ?2, ?3, ?4, ?4)').bind(c.id, uid, name, now).run();
      }
      return ok({ cls: { id: c.id, name: c.name } });
    }

    if (op === 'leave') {
      const cls = String(req.cls || '');
      await db.batch([db.prepare('DELETE FROM class_progress WHERE cls = ?1 AND uid = ?2').bind(cls, uid), db.prepare('DELETE FROM class_member WHERE cls = ?1 AND uid = ?2').bind(cls, uid)]);
      return ok({ ok: true });
    }

    if (op === 'ping') { await db.prepare('UPDATE class_member SET last = ?2 WHERE uid = ?1').bind(uid, now).run(); return ok({ ok: true }); }

    if (op === 'progress') {
      const ref = cleanRef(req.ref); if (!ref) return bad('ref');
      const t = Math.floor(+req.t || 0), r = Math.floor(+req.r || 0);
      if (t < 1 || t > 500 || r < 0 || r > t) return bad('score');
      const pct = Math.round(r / t * 100);
      const { results } = await db.prepare('SELECT t.id, t.cls FROM class_task t JOIN class_member m ON m.cls = t.cls AND m.uid = ?1 WHERE t.ref = ?2').bind(uid, ref).all();
      const st = []; // "hoạt động gần nhất" = max(member.last, progress.updated) – không ghi thêm dòng (D1 free: 100k dòng ghi/ngày)
      for (const x of results || []) st.push(db.prepare('INSERT INTO class_progress (task, uid, cls, best, last, tries, updated) VALUES (?1, ?2, ?3, ?4, ?4, 1, ?5) ON CONFLICT (task, uid) DO UPDATE SET best = MAX(best, ?4), last = ?4, tries = tries + 1, updated = ?5').bind(x.id, uid, x.cls, pct, now));
      if (st.length) await db.batch(st);
      return ok({ n: (results || []).length });
    }

    // ---- Các thao tác của chủ lớp ----
    if (!['assign', 'unassign', 'report', 'kick', 'rename', 'newcode', 'delete'].includes(op)) return bad('op');
    const c = await own(); if (!c) return bad('no-class', 404);

    if (op === 'assign') {
      const ref = cleanRef(req.ref); if (!ref) return bad('ref');
      const due = req.due == null || req.due === '' ? null : Math.floor(+req.due);
      if (due !== null && !(due > 1.5e12 && due < 4.1e12)) return bad('due');
      if ((await db.prepare('SELECT COUNT(*) AS n FROM class_task WHERE cls = ?').bind(c.id).first()).n >= MAX.tasks) return bad('max-tasks');
      if (await db.prepare('SELECT 1 FROM class_task WHERE cls = ?1 AND ref = ?2').bind(c.id, ref).first()) return bad('dup');
      const task = { id: newId(), ref, due, created: now };
      await db.prepare('INSERT INTO class_task (id, cls, ref, due, created) VALUES (?1, ?2, ?3, ?4, ?5)').bind(task.id, c.id, ref, due, now).run();
      return ok({ task });
    }
    if (op === 'unassign') {
      const task = String(req.task || '');
      await db.batch([db.prepare('DELETE FROM class_progress WHERE task = ?1 AND cls = ?2').bind(task, c.id), db.prepare('DELETE FROM class_task WHERE id = ?1 AND cls = ?2').bind(task, c.id)]);
      return ok({ ok: true });
    }
    if (op === 'report') {
      const members = ((await db.prepare('SELECT uid, name, joined, last FROM class_member WHERE cls = ? ORDER BY name COLLATE NOCASE').bind(c.id).all()).results || []).map(m => ({ id: m.uid, name: m.name, joined: m.joined, last: m.last }));
      const prog = ((await db.prepare('SELECT task, uid, best, last, tries, updated FROM class_progress WHERE cls = ?').bind(c.id).all()).results || []).map(p => ({ task: p.task, id: p.uid, best: p.best, last: p.last, tries: p.tries, updated: p.updated }));
      return ok({ cls: pub(c), members, tasks: await tasksOf(db, c.id), prog });
    }
    if (op === 'kick') {
      const u = String(req.uid || '');
      await db.batch([db.prepare('DELETE FROM class_progress WHERE cls = ?1 AND uid = ?2').bind(c.id, u), db.prepare('DELETE FROM class_member WHERE cls = ?1 AND uid = ?2').bind(c.id, u)]);
      return ok({ ok: true });
    }
    if (op === 'rename') {
      const name = cleanName(req.name, 60); if (!name) return bad('name');
      await db.prepare('UPDATE classes SET name = ?2 WHERE id = ?1').bind(c.id, name).run();
      return ok({ ok: true, name });
    }
    if (op === 'newcode') {
      const code = await uniqueCode(db);
      await db.prepare('UPDATE classes SET code = ?2 WHERE id = ?1').bind(c.id, code).run();
      return ok({ ok: true, code });
    }
    // delete: xóa hẳn lớp + học sinh + bài giao + tiến độ
    await db.batch(['class_progress', 'class_member', 'class_task'].map(tb => db.prepare(`DELETE FROM ${tb} WHERE cls = ?`).bind(c.id)).concat(db.prepare('DELETE FROM classes WHERE id = ?').bind(c.id)));
    return ok({ ok: true });
  }
}
