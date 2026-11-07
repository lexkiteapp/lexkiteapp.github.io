/* POST /api/aiearn – "Ôn thẻ để mở thêm lượt AI" (đợt 1 #10, docs/specs/upgrade-2026-11.md). Cần đăng nhập.
 * { feature: 'ai'|'chat', day?: 'YYYY-MM-DD' (ngày theo giờ máy) } → bằng chứng ôn lấy TỪ BẢN ĐỒNG BỘ TRÊN MÁY CHỦ (không tin số máy khách gửi kèm):
 *   số ôn = min(stats.days[day] trong tài liệu 'meta', số thẻ khác nhau có srs.last rơi vào ngày đó trong cards_*) – bơm bộ đếm mà không ôn thật
 *   thì không qua được, còn làm giả srs.last thì tự phá lịch ôn của chính mình.
 * Mỗi EARN.every thẻ = 1 lần nhận (+EARN[feature].grant lượt qua credit() của _quota.js, như quảng cáo có thưởng), tối đa EARN.maxPerDay lần/tính năng/tài khoản/ngày;
 * nhận lại cùng mức = vô hiệu (idempotent: sổ 'rv|feature|u:uid' trong quota_count). Giao diện chỉ gợi ý khi hết lượt, không ép, không thông báo đẩy. Không PII mới. */
import { gate, dayKey, setupQuota, credit, unmark, UP } from './_quota.js';
import { docsDb } from './_shard.js';
import { docJson } from './_ctx.js';
import { readJSON, bodyFail } from './_body.js';
import { claims, viewOf, json as cj, onRequestOptions } from './sync.js';
export { onRequestOptions }; // app gốc (capacitor://localhost) gọi khác nguồn – CORS như /api/sync

export const EARN = { every: 10, maxPerDay: 3, ai: { grant: 2 }, chat: { grant: 5 } };
const H = 3600e3;

/** Số lần nhận được phép theo số thẻ đã ôn trong ngày; claimed = số lần đã nhận → { total, newly, grant } */
export function earnable(reviews, claimed, feature) {
  const g = EARN[feature]; if (!g) return { total: 0, newly: 0, grant: 0 };
  const total = Math.min(EARN.maxPerDay, Math.floor(Math.max(0, +reviews || 0) / EARN.every)), newly = Math.max(0, total - Math.max(0, claimed | 0));
  return { total, newly, grant: newly * g.grant };
}
/** Ngày theo giờ máy (múi −12…+14) → khoảng thời gian UTC có thể thuộc ngày đó; chỉ nhận hôm qua/hôm nay/ngày mai so với máy chủ */
export const dayWindow = d => { const t = Date.parse(d + 'T00:00:00Z'); return [t - 14 * H, t + 36 * H]; };
export const nearDay = (d, now = Date.now()) => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && Math.abs(Date.parse(d + 'T12:00:00Z') - now) < 36 * H;

/** Bằng chứng ôn từ các tài liệu đồng bộ (Map k → { body }) → { counter, cards, reviews } */
export async function proofOf(view, day, now = Date.now()) {
  const [a, b] = dayWindow(day), hi = Math.min(b, now + 5 * 60e3); let counter = 0, cards = 0;
  for (const [k, x] of view) {
    if (k !== 'meta' && !/^cards_\d+$/.test(k)) continue;
    let o; try { o = JSON.parse(await docJson(x.body)); } catch (e) { continue; }
    if (k === 'meta') { const n = o && o.stats && o.stats.days && o.stats.days[day]; counter = typeof n === 'number' && n > 0 ? n : 0; continue; }
    for (const c of Object.values(o || {})) { const t = c && c.srs && +c.srs.last; if (t >= a && t < hi) cards++; }
  }
  return { counter, cards, reviews: Math.min(counter, cards) };
}
export async function onRequestPost({ request, env }) {
  const json = (s, d) => cj(request, s, d);
  if (!env.DB) return json(500, { error: 'no-db' });
  const who = await claims((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')).catch(() => null), uid = who && who.sub;
  if (!uid) return json(401, { error: 'auth' });
  let b; try { b = await readJSON(request, 2048); } catch (e) { const f = bodyFail(e); return json(f.status, { error: f.error }); }
  const feature = b && b.feature, day = (b && b.day) || dayKey();
  if (!EARN[feature] || !nearDay(day)) return json(400, { error: 'bad' });
  const q = await gate(request, env, 'sync', { who, json: (r, s, d) => json(s, d) }); if (q.res) return q.res; // cùng trần đồng bộ: chống dội
  const db = env.DB; await setupQuota(db);
  const u = await db.prepare('SELECT blocked, shard FROM users WHERE uid = ?').bind(uid).first().catch(() => null);
  if (u && +u.blocked) return json(403, { error: 'blocked' });
  const ddb = docsDb(env, u ? +u.shard || 0 : 0), rows = (await ddb.prepare('SELECT k, h, body, updated FROM docs WHERE uid = ?').bind(uid).all()).results || [];
  const { reviews } = await proofOf(viewOf(rows), day), today = dayKey(), k = `rv|${feature}|u:${uid}`;
  const cur = (await db.prepare('SELECT n FROM quota_count WHERE k = ? AND day = ?').bind(k, today).first()) || { n: 0 }, e = earnable(reviews, cur.n, feature);
  if (!e.newly) return json(200, { granted: 0, reviews, need: EARN.every * (Math.min(EARN.maxPerDay, cur.n) + 1), maxed: cur.n >= EARN.maxPerDay });
  // Ghi sổ trước (nguyên tử, RETURNING): 2 yêu cầu song song cùng thấy cur cũ → lượt sau thấy sổ vượt mức → hoàn sổ, không cộng lượt
  const lg = await db.prepare(UP).bind(k, today, e.newly).first();
  if (!lg || lg.n > e.total) { await db.prepare(UP).bind(k, today, -e.newly).run(); return json(200, { granted: 0, reviews, maxed: cur.n + e.newly >= EARN.maxPerDay }); }
  await db.batch(credit(db, feature, ['u:' + uid], e.grant, today));
  await unmark(feature, ['u:' + uid]);
  return json(200, { granted: e.grant, reviews });
}
