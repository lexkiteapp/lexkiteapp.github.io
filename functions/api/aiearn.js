/* POST /api/aiearn – "Ôn thẻ để mở thêm lượt AI" (đợt 1 #10, docs/specs/upgrade-2026-11.md). Cần đăng nhập (bằng chứng ôn = tài liệu 'meta' đã đồng bộ của chính uid).
 * { feature: 'ai'|'chat', day?: 'YYYY-MM-DD' } → máy chủ đọc stats.days[day] trong meta đã đồng bộ; mỗi EARN.every thẻ ôn trong ngày = 1 lần nhận
 * (+EARN[feature].grant lượt, trừ bộ đếm quota_count như ads-reward), tối đa EARN.maxPerDay lần/tính năng/tài khoản/ngày. Nhận lại cùng mức = vô hiệu (idempotent).
 * Giao diện nhẹ nhàng: chỉ gợi ý khi hết lượt, không ép, không thông báo đẩy. Không PII mới. */
import { claims } from './sync.js';
import { gate, dayKey, setupQuota } from './_quota.js';
import { userDocs } from './sync.js';

export const EARN = { every: 10, maxPerDay: 3, ai: { grant: 2 }, chat: { grant: 5 } };
const UP = 'INSERT INTO quota_count (k, day, n) VALUES (?1, ?2, ?3) ON CONFLICT (k, day) DO UPDATE SET n = n + ?3 RETURNING n';
const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** Số lần nhận được phép (tổng) theo số thẻ đã ôn trong ngày; claimed = số lần đã nhận → { total, newly, grant } */
export function earnable(reviews, claimed, feature) {
  const g = EARN[feature]; if (!g) return { total: 0, newly: 0, grant: 0 };
  const total = Math.min(EARN.maxPerDay, Math.floor(Math.max(0, +reviews || 0) / EARN.every)), newly = Math.max(0, total - Math.max(0, claimed | 0));
  return { total, newly, grant: newly * g.grant };
}
const nearDay = (d, now = Date.now()) => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && Math.abs(Date.parse(d + 'T12:00:00Z') - now) < 36 * 3600e3;
export async function reviewsOf(db, uid, day) {
  for (const d of await userDocs(db, uid)) if (d.k === 'meta') {
    try {
      const o = JSON.parse(d.body); let m;
      if (o.z) { const bin = atob(o.z), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); m = JSON.parse(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text()); } else if (o.json) m = JSON.parse(o.json);
      const n = m && m.stats && m.stats.days && m.stats.days[day]; return typeof n === 'number' ? n : 0;
    } catch (e) { return 0; }
  }
  return 0;
}
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json(500, { error: 'no-db' });
  const who = await claims((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')).catch(() => null), uid = who && who.sub;
  if (!uid) return json(401, { error: 'auth' });
  let b; try { b = await request.json(); } catch (e) { return json(400, { error: 'json' }); }
  const feature = b && b.feature, day = b && b.day || dayKey();
  if (!EARN[feature] || !nearDay(day)) return json(400, { error: 'bad' });
  const q = await gate(request, env, 'sync', { who, json: (r, s, d) => json(s, d) }); if (q.res) return q.res; // cùng trần đồng bộ: chống dội
  const db = env.DB; await setupQuota(db);
  const reviews = await reviewsOf(db, uid, day), k = `rv|${feature}|u:${uid}`, cur = (await db.prepare('SELECT n FROM quota_count WHERE k = ? AND day = ?').bind(k, dayKey()).first()) || { n: 0 };
  const e = earnable(reviews, cur.n, feature);
  if (!e.newly) return json(200, { granted: 0, reviews, need: EARN.every * (Math.min(EARN.maxPerDay, cur.n) + 1), maxed: cur.n >= EARN.maxPerDay });
  await db.batch([db.prepare(UP).bind(k, dayKey(), e.newly), db.prepare(UP).bind(`${feature}|u:${uid}`, dayKey(), -e.grant)]);
  return json(200, { granted: e.grant, reviews });
}
