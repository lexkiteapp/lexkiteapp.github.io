/* D1 "nội bộ" ở tài khoản Cloudflare THỨ HAI (hạn mức đọc/ghi riêng, tách khỏi D1 của người dùng) — 23/10/2026.
 * Pages không bind được D1 của tài khoản khác → gọi REST: POST /accounts/{id}/d1/database/{uuid}/query ({sql, params} hoặc {batch:[…]}).
 * Cùng giao diện với D1 binding: db.prepare(sql).bind(...).first()/all()/run(), db.batch([...]) → các helper one/all/run của drive.js dùng được nguyên.
 * Cờ D1B (biến Pages): '' | '0' tắt · 'dual' ghi CẢ HAI (đọc từ D1 chính) để đối chiếu số dòng · '1' chỉ dùng D1 nội bộ.
 * Bí mật Pages: D1B_ACCOUNT_ID, D1B_TOKEN (quyền D1 Edit + Account Analytics Read). D1B_DATABASE_ID (không bí mật) mặc định lexkite-internal.
 * Chỉ truy vấn theo khoá + lô (REST có giới hạn tốc độ); lỗi 429/5xx thử lại tối đa 3 lần với giãn cách. */
export const D1B_DEFAULT_DB = '2cd585e3-f322-46d6-913e-9dd7139d583f';
export const d1bMode = env => { const v = String((env && env.D1B) || '').toLowerCase(); return v === '1' || v === 'on' ? '1' : v === 'dual' ? 'dual' : '0'; };
export const d1bReady = env => !!(env && env.D1B_ACCOUNT_ID && env.D1B_TOKEN);

export function restDb(env, fetcher = (...a) => fetch(...a)) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.D1B_ACCOUNT_ID)}/d1/database/${encodeURIComponent(env.D1B_DATABASE_ID || D1B_DEFAULT_DB)}/query`;
  const call = async body => {
    let last;
    for (let i = 0; i < 3; i++) {
      let r; try { r = await fetcher(url, { method: 'POST', headers: { Authorization: 'Bearer ' + env.D1B_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch (e) { last = new Error('d1b-network'); await new Promise(y => setTimeout(y, 250 * (i + 1))); continue; }
      if (r.status === 429 || r.status >= 500) { last = new Error('d1b-' + r.status); await new Promise(y => setTimeout(y, 400 * (i + 1))); continue; }
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.success === false) { const e = new Error('d1b-' + ((j.errors && j.errors[0] && j.errors[0].message) || r.status)); e.status = r.status; throw e; }
      return j.result || [];
    }
    throw last || new Error('d1b');
  };
  const out = r => ({ results: r.results || [], meta: r.meta || {}, success: true });
  const stmt = (sql, params = []) => ({
    _q: sql, _a: params,
    bind: (...a) => stmt(sql, a),
    all: async () => out((await call({ sql, params }))[0] || {}),
    first: async () => ((await call({ sql, params }))[0] || {}).results?.[0] ?? null,
    run: async () => out((await call({ sql, params }))[0] || {}),
  });
  return { prepare: sql => stmt(sql), batch: async sts => (await call({ batch: sts.map(s => ({ sql: s._q, params: s._a })) })).map(out), _rest: true };
}

const isRead = q => /^\s*(select|with|pragma|explain)\b/i.test(q);
/** Ghi cả hai, đọc từ D1 chính (chế độ 'dual'). Ghi vào D1 nội bộ lỗi → đếm (DUAL.fail) rồi bỏ qua, KHÔNG làm hỏng yêu cầu. */
export const DUAL = { fail: 0, ok: 0 };
export function dualDb(main, b) {
  const mk = (q, a) => ({
    _q: q, _a: a,
    bind: (...x) => mk(q, x),
    all: async () => { const r = await main.prepare(q).bind(...a).all(); if (!isRead(q)) await mirror(q, a); return r; },
    first: async () => { const r = await main.prepare(q).bind(...a).first(); if (!isRead(q)) await mirror(q, a); return r; },
    run: async () => { const r = await main.prepare(q).bind(...a).run(); if (!isRead(q)) await mirror(q, a); return r; },
  });
  const mirror = async (q, a) => { try { await b.prepare(q).bind(...a).run(); DUAL.ok++; } catch (e) { DUAL.fail++; } };
  return {
    prepare: q => mk(q, []),
    batch: async sts => {
      const r = await main.batch(sts.map(s => main.prepare(s._q).bind(...s._a)));
      const w = sts.filter(s => !isRead(s._q));
      if (w.length) try { await b.batch(w.map(s => b.prepare(s._q).bind(...s._a))); DUAL.ok += w.length; } catch (e) { DUAL.fail += w.length; }
      return r;
    },
  };
}
const CACHE = new WeakMap();
/** DB cho các bảng nội bộ (drive*, job_*): theo cờ D1B. Chưa cấu hình đủ bí mật → D1 chính (an toàn). */
export function internalDb(env, fetcher) {
  if (!env || !env.DB) return env && env.DB;
  const mode = d1bMode(env); if (mode === '0' || !d1bReady(env)) return env.DB;
  let c = CACHE.get(env); if (c && c.mode === mode && c.f === fetcher) return c.db;
  const b = restDb(env, fetcher), db = mode === '1' ? b : dualDb(env.DB, b);
  CACHE.set(env, { mode, f: fetcher, db });
  return db;
}
const COORD = new WeakMap();
/** DB của ĐIỀU PHỐI VIỆC NỀN (job_leases/job_runs): luôn ở D1 nội bộ (tài khoản 2) khi đã cấu hình D1B_ACCOUNT_ID + D1B_TOKEN — độc lập cờ D1B — để điều phối KHÔNG chết cùng D1 chính
 * khi D1 chính hết hạn mức. Chưa cấu hình bí mật → tạm dùng D1 chính (chế độ suy giảm). */
export function coordDb(env, fetcher) {
  if (!env || !env.DB || !d1bReady(env)) return env && env.DB;
  let c = COORD.get(env); if (c && c.f === fetcher) return c.db;
  const db = restDb(env, fetcher); COORD.set(env, { db, f: fetcher }); return db;
}
export const coordKey = env => (d1bReady(env) ? 'int:' + env.D1B_ACCOUNT_ID : 'main');
