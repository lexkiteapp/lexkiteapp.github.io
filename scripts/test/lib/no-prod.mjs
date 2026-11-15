// CI không chạm prod (docs/CAPACITY.md §A5, memory: "CI never hits prod media/audio/api"): gắn vào MỌI context Playwright của việc CI.
//   import { noProd } from './lib/no-prod.mjs';  const ctx = await browser.newContext(…); await noProd(ctx);
// - media.lexkite.com / audio.lexkite.com → lấy thẳng từ GitHub (scripts/media/origin.mjs, đúng thứ tự dò của Worker), thêm CORS *.
// - lexkite.com/api/* → 503 {"error":"ci_offline"} (app chạy nhánh offline như khi mạng lỗi) – trừ khi truyền opts.api(url, req) tự trả mock.
// Gắn NGAY sau newContext (trước route riêng của test): Playwright ưu tiên route đăng ký SAU → mock riêng của test vẫn thắng.
// Cờ PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS: không có thì fetch() TỪ service worker (sw.js âm thanh/vimg) lọt ra mạng thật.
// Đi kèm .github/actions/no-prod (chặn DNS ở /etc/hosts → lỡ sót cũng 0 lượt prod). Kiểm: scripts/test/no-prod-hosts.mjs.
import { githubCandidates, typeOf, PROD_CDN, PROD_API } from '../../media/origin.mjs';
if (process.env.LEXKITE_NO_PROD_SW !== 'off') process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS ||= '1'; // off: ext-e2e (SW add-on)

import { makeOriginFetcher, sliceRange } from './origin-fetch.mjs';
export const origin = makeOriginFetcher(); // memo theo promise + hedge (origin-fetch.mjs): một URL media chỉ tải 1 lần dù nhiều context cùng xin
export const stats = { cdn: 0, github: 0, api: 0, miss: 0 };
// KHÔNG chép content-encoding/content-length/transfer-encoding: body() đã giải nén → header gốc làm hỏng ảnh/âm thanh (onerror → chữ cái thay ảnh)
const toRes = async (r, url) => {
  if (r.status() >= 400) return null;
  const body = await r.body(), src = r.headers(), headers = { 'content-type': typeOf(url), 'access-control-allow-origin': '*', 'x-origin': 'ci-github', 'cache-control': 'public, max-age=31536000, immutable' };
  for (const k of ['etag', 'last-modified', 'accept-ranges', 'content-range']) if (src[k]) headers[k] = src[k];
  return { status: r.status(), headers, body };
};
/** Làm nóng memo trước khi đo (vd. poster video là phần tử LCP): tải sẵn từ GitHub, ngoài đồng hồ LCP của trang – giống CDN thật đã có ảnh ở edge. */
export async function warm(ctx, urls) {
  const list = [...new Set(urls)].filter(u => PROD_CDN.test(u));
  await Promise.all(list.map(u => origin.load(u, githubCandidates(u), g => ctx.request.get(g, { maxRedirects: 5, timeout: 30000 }).then(r => toRes(r, u))).catch(() => null)));
  return list.length;
}
export async function noProd(ctx, opts = {}) {
  if (opts.off) return ctx; // probe prod có chủ ý (vd. qa-bot --base https://lexkite.com sau Pages deploy) – phải nằm trong allowlist scripts/test/no-prod-hosts.mjs
  await ctx.route(PROD_CDN, async route => {
    stats.cdn++;
    const req = route.request(), url = req.url(), range = req.headers().range;
    // Range cũng lấy từ bản đầy đủ đã memo rồi tự cắt: trước đây mỗi lượt video tải lại GitHub riêng, gặp lúc GitHub chập chờn là 404 giả → "video không phát" (Visual QA 09/11: 8/18 lượt, cùng clip lúc đạt lúc hỏng)
    const get = g => { stats.github++; return route.fetch({ url: g, headers: {}, maxRedirects: 5 }).then(r => toRes(r, url)); };
    // lần 2: promise dùng chung có thể thuộc context đã đóng giữa chừng (lỗi → null, không được nhớ) → tự tải bằng route của mình
    const res = (await origin.load(url, githubCandidates(url), get)) || (await origin.load(url, githubCandidates(url), get));
    if (res) return route.fulfill(range ? sliceRange(res, range) : res);
    console.warn(`no-prod: không tải được từ GitHub: ${url}`); // máy đo không mù: log nêu đúng file, không để test chỉ thấy "video không phát"
    stats.miss++;
    return route.fulfill({ status: 404, headers: { 'access-control-allow-origin': '*' }, body: '' });
  });
  await ctx.route(PROD_API, async route => {
    stats.api++;
    const mock = opts.api && (await opts.api(new URL(route.request().url()), route.request()));
    if (mock) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: typeof mock === 'string' ? mock : JSON.stringify(mock) });
    return route.fulfill({ status: 503, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"error":"ci_offline"}' });
  });
  return ctx;
}
