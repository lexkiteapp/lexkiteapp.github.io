/* Proxy cùng nguồn cho từ điển & dịch máy miễn phí: GET /api/dictlookup
 *   ?src=dapi&w=<word>                                  → api.dictionaryapi.dev/api/v2/entries/en/<word> (IPA, audio, định nghĩa)
 *   ?src=gtx&sl=..&tl=..[&hl=..][&dj=1]&dt=..&q=<text>  → translate.googleapis.com/translate_a/single?client=gtx… (nguyên định dạng gốc)
 * Vì sao: gọi thẳng từ trình duyệt thì khi nguồn lỗi (1/11: dictionaryapi 500, gtx 429) phản hồi KHÔNG có header CORS → console đỏ,
 * mất IPA/định nghĩa, post-deploy-check đỏ. Qua đây: lưu đệm ở biên Cloudflare dùng chung mọi người (từ điển 30 ngày, dịch 1 ngày)
 * → ít gọi nguồn hơn hẳn (ít bị 429); nguồn lỗi/hết hạn mức → LUÔN 200 + thân `null` (máy khách coi như "không có", tự sang
 * Wiktionary/MyMemory/quy tắc như cũ) – không bao giờ để trình duyệt ghi lỗi console.
 * Hạn mức: tính năng `translate` của _quota.js, chỉ tính lượt trượt bộ đệm (docs/QUOTAS.md). Lỗi bất ngờ → 200 null, không lưu đệm. */
import { gate } from './_quota.js';

const DAPI_TTL = 30 * 86400, DAPI_MISS_TTL = 86400, GTX_TTL = 86400, FAIL_TTL = 60; // FAIL_TTL: nguồn lỗi → che 60 s ở biên, không dội lại nguồn đang 429
const BROWSER_TTL = { dapi: 86400, gtx: 3600 };
const LANG = /^(auto|[a-z]{2,3}(-[A-Za-z]{2,4})?)$/, DT = /^(t|bd|md|ex|ss|at|rm|rw|qca|ld)$/;
const WORD = /^[\p{L}\p{M}][\p{L}\p{M}' .-]{0,63}$/u, MAX_Q = 5000, UPSTREAM_MS = 6000;
const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite(-preview)?\.pages\.dev)|https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?|capacitor:\/\/localhost|chrome-extension:\/\/[a-z]{32})$/;

// CORS gắn lúc trả (không nằm trong bản đệm dùng chung): app di động (capacitor/localhost) và add-on gọi https://lexkite.com/api/dictlookup
const withCors = (req, res) => { const o = req.headers.get('Origin') || ''; if (ORIGINS.test(o)) { res.headers.set('Access-Control-Allow-Origin', o); res.headers.set('Vary', 'Origin'); } return res; };
// Thân `null` = "không có dữ liệu" theo đúng hợp đồng fetchJSON phía máy khách (r.ok → r.json() → null → nhánh dự phòng)
const empty = (why, edgeTtl = 0) => new Response('null', {
  headers: { 'Content-Type': 'application/json', 'Cache-Control': edgeTtl ? `public, max-age=0, s-maxage=${edgeTtl}` : 'no-store', 'X-Dictlookup': why },
});

/** Kiểm tham số → { src, upstream, key } hoặc null (tham số lạ không bao giờ được chuyển tiếp nguyên văn tới nguồn). Xuất ra cho test. */
export function parse(url) {
  const p = url.searchParams, src = p.get('src');
  if (src === 'dapi') {
    const w = String(p.get('w') || '').normalize('NFC').trim().toLowerCase();
    if (!WORD.test(w)) return null;
    const upstream = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`;
    return { src, upstream, key: `https://lexkite.com/api/dictlookup?src=dapi&w=${encodeURIComponent(w)}&v=1` };
  }
  if (src === 'gtx') {
    const sl = p.get('sl') || 'auto', tl = p.get('tl') || '', hl = p.get('hl') || '', q = p.get('q') || '';
    const dt = [...new Set(p.getAll('dt'))].sort();
    if (!LANG.test(sl) || !LANG.test(tl) || tl === 'auto' || (hl && !LANG.test(hl)) || !q || q.length > MAX_Q || !dt.length || !dt.every(x => DT.test(x))) return null;
    const qs = new URLSearchParams({ client: 'gtx', sl, tl });
    if (hl) qs.set('hl', hl);
    if (p.get('dj') === '1') qs.set('dj', '1');
    for (const x of dt) qs.append('dt', x);
    qs.set('q', q);
    return { src, upstream: `https://translate.googleapis.com/translate_a/single?${qs}`, key: `https://lexkite.com/api/dictlookup?src=gtx&${qs}&v=1` };
  }
  return null;
}

async function handle({ request, env, waitUntil }) {
  // Trang web khác nhúng proxy này (Origin lạ, hoặc Sec-Fetch-Site cross-site không kèm Origin) → không phục vụ
  const o = request.headers.get('Origin'), site = request.headers.get('Sec-Fetch-Site');
  if ((o && !ORIGINS.test(o)) || (site === 'cross-site' && !o)) return empty('origin');
  const req = parse(new URL(request.url));
  if (!req) return empty('bad-params', 86400);
  const cache = caches.default, key = new Request(req.key);
  const hit = await cache.match(key);
  if (hit) return new Response(hit.body, hit);
  // Chỉ lượt trượt bộ đệm mới gọi nguồn → mới tính hạn mức (theo IP/thiết bị). Hết lượt → 200 null (máy khách dùng dự phòng), không 429.
  const q = await gate(request, env || {}, 'translate', { who: null });
  if (q.res) return empty('quota');
  const keep = res => { waitUntil(cache.put(key, res.clone())); return res; };
  let up;
  try { up = await fetch(req.upstream, { headers: { 'User-Agent': 'Lexkite/1.0 (https://lexkite.com; support@lexkite.com)', Accept: 'application/json' }, signal: AbortSignal.timeout(UPSTREAM_MS) }); }
  catch (e) { return empty('upstream-error'); } // mạng/hết giờ: không lưu đệm, lượt sau thử lại
  let body = null, ttl;
  if (up.ok) {
    try { body = await up.json(); } catch (e) { body = null; }
    if (body == null) return keep(empty('upstream-badjson', FAIL_TTL));
    ttl = req.src === 'dapi' ? DAPI_TTL : GTX_TTL;
  } else if (req.src === 'dapi' && up.status === 404) {
    ttl = DAPI_MISS_TTL; // từ không có trong dictionaryapi.dev – câu trả lời thật, nhớ 1 ngày
  } else return keep(empty('upstream-' + up.status, FAIL_TTL)); // 429/5xx: tạm lỗi – che 60 s ở biên, không dội lại nguồn
  return keep(new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${BROWSER_TTL[req.src]}, s-maxage=${ttl}`, 'X-Dictlookup': body == null ? 'miss' : 'ok' },
  }));
}

export async function onRequestGet(ctx) {
  let res; try { res = await handle(ctx); } catch (e) { res = empty('error'); }
  return withCors(ctx.request, new Response(res.body, res)); // bản sao: phản hồi lấy từ Cache API có header bất biến
}
