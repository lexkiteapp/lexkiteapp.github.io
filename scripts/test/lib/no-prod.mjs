// CI không chạm prod (docs/CAPACITY.md §A5, memory: "CI never hits prod media/audio/api"): gắn vào MỌI context Playwright của việc CI.
//   import { noProd } from './lib/no-prod.mjs';  const ctx = await browser.newContext(…); await noProd(ctx);
// - media.lexkite.com / audio.lexkite.com → lấy thẳng từ GitHub (scripts/media/origin.mjs, đúng thứ tự dò của Worker), thêm CORS *.
// - lexkite.com/api/* → 503 {"error":"ci_offline"} (app chạy nhánh offline như khi mạng lỗi) – trừ khi truyền opts.api(url, req) tự trả mock.
// Gắn NGAY sau newContext (trước route riêng của test): Playwright ưu tiên route đăng ký SAU → mock riêng của test vẫn thắng.
// Cờ PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS: không có thì fetch() TỪ service worker (sw.js âm thanh/vimg) lọt ra mạng thật.
// Đi kèm .github/actions/no-prod (chặn DNS ở /etc/hosts → lỡ sót cũng 0 lượt prod). Kiểm: scripts/test/no-prod-hosts.mjs.
import { githubCandidates, typeOf, PROD_CDN, PROD_API } from '../../media/origin.mjs';
if (process.env.LEXKITE_NO_PROD_SW !== 'off') process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS ||= '1'; // off: ext-e2e (SW add-on)

const memo = new Map(); // URL → {status, headers, body} trong một lượt chạy: ảnh/âm thanh lặp không tải lại GitHub
export const stats = { cdn: 0, github: 0, api: 0, miss: 0 };
export async function noProd(ctx, opts = {}) {
  if (opts.off) return ctx; // probe prod có chủ ý (vd. qa-bot --base https://lexkite.com sau Pages deploy) – phải nằm trong allowlist scripts/test/no-prod-hosts.mjs
  await ctx.route(PROD_CDN, async route => {
    stats.cdn++;
    const req = route.request(), url = req.url(), range = req.headers().range;
    const key = range ? '' : url;
    if (key && memo.has(key)) return route.fulfill(memo.get(key));
    for (const g of githubCandidates(url)) {
      try {
        stats.github++;
        const r = await route.fetch({ url: g, headers: range ? { range } : {}, maxRedirects: 5 });
        if (r.status() >= 400) continue;
        const body = await r.body(), src = r.headers(), headers = { 'content-type': typeOf(url), 'access-control-allow-origin': '*', 'x-origin': 'ci-github', 'cache-control': 'public, max-age=31536000, immutable' };
        // KHÔNG chép content-encoding/content-length/transfer-encoding: body() đã giải nén → header gốc làm hỏng ảnh/âm thanh (onerror → chữ cái thay ảnh)
        for (const k of ['etag', 'last-modified', 'accept-ranges', 'content-range']) if (src[k]) headers[k] = src[k];
        const res = { status: r.status(), headers, body };
        if (key && res.status === 200) memo.set(key, res);
        return route.fulfill(res);
      } catch (e) { /* thử gốc kế */ }
    }
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
