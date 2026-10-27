/* POST /api/ads-report – nhận doanh thu THẬT từ GitHub Action ads-revenue.yml (scripts/ads/report.mjs: AdSense Management API v2 + AdMob API v1).
 * Xác thực: header X-Studio-Secret = STUDIO_CALLBACK_SECRET (secret CI sẵn có, so sánh băm thời gian không đổi). Không có đường người dùng.
 * D1 (docs/ADS.md §5, memory d1-quota-isolation): bảng nhỏ ads_rev PK (day, src, dim, key) WITHOUT ROWID – đọc khoảng ngày (SEARCH),
 * ghi đè khoảng đã lấy theo DIFF (chỉ dòng đổi/mới + xóa khóa mất) → ngày không đổi = 0 dòng ghi. Cầu dao _d1guard: việc nền dừng khi ≥ 50 % hạn mức.
 * Body: { from, to, mode: full|today, srcs: ['adsense'|'admob'], rows: [{ day, src, dim: total|unit|country, key, earn(micro-USD), imp, click, req, mreq, pv }], pay?: { balance, last: { amount, date } } }
 * Chỉ lưu số liệu báo cáo – KHÔNG bao giờ lưu token/secret (token chỉ ở secret GitHub). Lượt hằng giờ: 1 ngày → diff ~vài chục dòng. */
import { cleanRev, diffRev } from './_ads.js';
import { once } from './_schema.js';
import { guardBg } from './_d1guard.js';
import { limit } from './sync.js';

export const DDL = 'CREATE TABLE IF NOT EXISTS ads_rev (day TEXT NOT NULL, src TEXT NOT NULL, dim TEXT NOT NULL, key TEXT NOT NULL, earn INTEGER NOT NULL DEFAULT 0, imp INTEGER NOT NULL DEFAULT 0, click INTEGER NOT NULL DEFAULT 0, req INTEGER NOT NULL DEFAULT 0, mreq INTEGER NOT NULL DEFAULT 0, pv INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, src, dim, key)) WITHOUT ROWID';
export const SEL = 'SELECT day, src, dim, key, earn, imp, click, req, mreq, pv FROM ads_rev WHERE day >= ?1 AND day <= ?2';
const UPSERT = 'INSERT INTO ads_rev (day, src, dim, key, earn, imp, click, req, mreq, pv) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10) ON CONFLICT (day, src, dim, key) DO UPDATE SET earn = ?5, imp = ?6, click = ?7, req = ?8, mreq = ?9, pv = ?10';
const DEL = 'DELETE FROM ads_rev WHERE day = ?1 AND src = ?2 AND dim = ?3 AND key = ?4';
const MAX_BODY = 512 * 1024;
const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const hex = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(x => x.toString(16).padStart(2, '0')).join('');
async function secretOk(env, given) {
  const want = env.STUDIO_CALLBACK_SECRET; if (!want || !given) return false;
  const [a, b] = await Promise.all([hex('ads|' + want), hex('ads|' + given)]); let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0;
}
export const setup = (db, env) => once(db, 'ads_rev', 1, () => db.batch([db.prepare(DDL), db.prepare('CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT, at INTEGER, by TEXT) WITHOUT ROWID')]), { env });

/** Ghi gói đã kiểm vào D1. → { written, deleted, same } */
export async function store(db, pkt, now = Date.now()) {
  const old = (await db.prepare(SEL).bind(pkt.from, pkt.to).all()).results || [];
  const { up, del, same } = diffRev(old, pkt.rows, pkt.srcs);
  const st = [...up.map(r => db.prepare(UPSERT).bind(r.day, r.src, r.dim, r.key, r.earn, r.imp, r.click, r.req, r.mreq, r.pv)), ...del.map(r => db.prepare(DEL).bind(r.day, r.src, r.dim, r.key))];
  st.push(db.prepare("INSERT INTO config (k, v, at, by) VALUES ('ads_report', ?1, ?2, 'ci') ON CONFLICT (k) DO UPDATE SET v = ?1, at = ?2, by = 'ci'")
    .bind(JSON.stringify({ at: now, mode: pkt.mode, from: pkt.from, to: pkt.to, srcs: pkt.srcs, n: pkt.rows.length }), now));
  if (pkt.pay) st.push(db.prepare("INSERT INTO config (k, v, at, by) VALUES ('ads_pay', ?1, ?2, 'ci') ON CONFLICT (k) DO UPDATE SET v = ?1, at = ?2, by = 'ci'").bind(JSON.stringify({ ...pkt.pay, at: now }), now));
  for (let i = 0; i < st.length; i += 100) await db.batch(st.slice(i, i + 100));
  return { written: up.length, deleted: del.length, same };
}

export async function onRequestPost({ request, env }) {
  if (+(request.headers.get('Content-Length') || 0) > MAX_BODY) return json(413, { error: 'too-large' });
  const given = request.headers.get('X-Studio-Secret');
  if (!env.STUDIO_CALLBACK_SECRET) return json(503, { error: 'not-configured', need: 'STUDIO_CALLBACK_SECRET' });
  if (await limit('ads-report:' + (request.headers.get('CF-Connecting-IP') || '?'), 10, 600)) return json(429, { error: 'too-fast' });
  if (!(await secretOk(env, given))) return json(403, { error: 'forbidden' });
  let pkt; try { pkt = cleanRev(await request.json()); } catch (e) { return json(400, { error: String((e && e.message) || 'json').slice(0, 40) }); }
  { const gb = await guardBg(request, env, (r, s, d) => json(s, d)); if (gb) return gb; }
  try {
    await setup(env.DB, env);
    return json(200, { ok: true, rows: pkt.rows.length, ...(await store(env.DB, pkt)) });
  } catch (e) { return json(500, { error: 'server', message: String((e && e.message) || e).slice(0, 160) }); }
}
