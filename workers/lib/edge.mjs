// Dùng chung cho Worker (media, dict – wrangler bundle theo import tương đối). docs/FREE-TIER.md §3.
// 1) edgeCached: Cache API + stale-while-revalidate tự làm (Cache API không hỗ trợ SWR): bản lưu sống lâu (STORE_TTL),
//    quá `fresh` giây → trả bản cũ ngay + làm mới nền (waitUntil). Trúng cache = 0 lượt đọc R2/gốc, CPU tối thiểu.
//    LƯU Ý: Worker trên route/tên miền vẫn tính 1 lượt cho mỗi yêu cầu tới biên – chỉ trình duyệt (max-age) hoặc Cache Rule
//    trước một gốc KHÔNG phải Worker mới làm lượt lặp = 0 lượt Worker (việc của chủ, §4).
// 2) mode(): đọc https://lexkite.com/free-tier-state.json (file tĩnh Pages – không tính lượt Functions; cache biên 5 phút,
//    nhớ trong isolate 60 s). "shed" (free-tier-guard khi lượt ≥ 80 %): KHÔNG làm mới nền, chỉ trả bản cache; trang thí điểm → noindex.
export const STATE_URL = 'https://lexkite.com/free-tier-state.json';
export const STORE_TTL = 30 * 86400;
const STORED = 'x-lexkite-stored';
let memo = { at: 0, mode: 'normal' };

export async function mode(fetcher = fetch, now = Date.now()) {
  if (now - memo.at < 60e3) return memo.mode;
  let m = 'normal';
  try {
    const r = await fetcher(STATE_URL, { cf: { cacheEverything: true, cacheTtl: 300 } });
    if (r.ok) { const j = await r.json(); if (j && j.mode === 'shed') m = 'shed'; }
  } catch (e) { /* lỗi đọc trạng thái → normal (không bao giờ chặn người dùng) */ }
  memo = { at: now, mode: m };
  return m;
}
export const _resetMode = () => { memo = { at: 0, mode: 'normal' }; };

/** Cache-Control cho trình duyệt + CDN: lượt lặp trong max-age không tới Worker. */
export const cacheControl = ({ maxAge, sMaxAge = maxAge, swr = 0 }) => `public, max-age=${maxAge}, s-maxage=${sMaxAge}${swr ? `, stale-while-revalidate=${swr}` : ''}`;

/**
 * produce() → Response (chỉ 200 mới lưu). opts: { fresh: giây, shed: bool, cache?: Cache, now?: ms }.
 * Trả Response kèm header x-lexkite-edge: hit | stale | miss | shed-hit.
 */
export async function edgeCached(req, ctx, produce, opts = {}) {
  const cache = opts.cache || (typeof caches !== 'undefined' ? caches.default : null);
  const now = opts.now || Date.now(), fresh = (opts.fresh || 86400) * 1000;
  const key = new Request(new URL(req.url).origin + new URL(req.url).pathname, { method: 'GET' });
  const tag = (r, v) => { const h = new Headers(r.headers); h.delete(STORED); h.set('x-lexkite-edge', v); return new Response(req.method === 'HEAD' ? null : r.body, { status: r.status, headers: h }); };
  const store = async r => {
    if (!cache || r.status !== 200) return;
    const h = new Headers(r.headers); h.set(STORED, String(now)); h.set('Cache-Control', `public, max-age=${STORE_TTL}`); // TTL của bản lưu biên (khác header gửi trình duyệt)
    await cache.put(key, new Response(r.body, { status: 200, headers: h }));
  };
  const hit = cache ? await cache.match(key) : null;
  if (hit) {
    const age = now - (+hit.headers.get(STORED) || 0);
    if (opts.shed) return tag(hit, 'shed-hit');
    if (age <= fresh) return tag(hit, 'hit');
    const refresh = (async () => { try { await store(await produce()); } catch (e) { /* giữ bản cũ */ } })();
    if (ctx && ctx.waitUntil) ctx.waitUntil(refresh); else await refresh;
    return tag(hit, 'stale');
  }
  const r = await produce();
  if (r.status === 200 && cache) { const [a, b] = r.body ? r.body.tee() : [null, null]; const keep = new Response(b, r); const p = store(keep); if (ctx && ctx.waitUntil) ctx.waitUntil(p); else await p; return tag(new Response(a, r), 'miss'); }
  return tag(r, 'miss');
}

/** Chế độ shed: trang thí điểm (chưa đạt cổng index ổn định) gắn noindex để bot không kéo thêm trang mới. */
export function shedRobots(headers, { shed, pilot }) {
  if (shed && pilot) headers.set('X-Robots-Tag', 'noindex, follow');
  return headers;
}
