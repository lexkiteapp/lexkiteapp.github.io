// audio.lexkite.com – Cloudflare đứng trước các kho media GitHub Pages (infra/media-repos.json, kind audio); ảnh dùng Worker riêng workers/media.
// Máy chủ gần người dùng (có VN), bộ nhớ đệm 1 năm ở Cloudflare & trình duyệt (tên file băm theo nội dung nên không bao giờ đổi), giảm băng thông GitHub.
// Từ 24/10/2026 mp3 không còn trong repo chính: dò lần lượt ORIGINS (kho mới nhất trước), trả bản 200 đầu tiên; 404 ở mọi gốc → 404 (đệm 60 s).
// Gốc cuối (lexkiteapp.github.io/audio – bản Pages cũ đóng băng) là dự phòng 1 bản phát hành – gỡ theo docs/STORAGE.md §Gỡ dự phòng.
// Thêm kho mới (m3…): thêm vào ĐẦU danh sách rồi `wrangler deploy` (thư mục workers/audio, token ~/.config/lexkite/cf-token).
export const ORIGINS = ['https://lexkiteapp.github.io/lexkite-media-2', 'https://lexkiteapp.github.io'];
const YEAR = 31536000; // 404 chỉ đệm 60 s: file mới lên Pages trễ vài phút sau commit, không được kẹt 404 cả giờ
export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD', 'Access-Control-Max-Age': '86400' } });
    if (!['GET', 'HEAD'].includes(req.method) || !/^\/audio\/[a-z0-9/_-]+\.mp3$/i.test(url.pathname) || url.pathname.includes('..')) return new Response('Not found', { status: 404 });
    let r = null, from = '';
    for (const o of ORIGINS) {
      const x = await fetch(o + url.pathname, { method: req.method, cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': YEAR, '404': 60, '500-599': 0 } } });
      if (x.ok) { r = x; from = o; break; }
      if (!r || (x.status >= 500 && r.status === 404)) r = x; // ưu tiên báo lỗi máy chủ hơn 404 (để không đệm nhầm)
    }
    const h = new Headers(r.headers);
    h.set('Access-Control-Allow-Origin', '*');
    h.set('Cache-Control', r.ok ? `public, max-age=${YEAR}, immutable` : 'public, max-age=60');
    if (from) h.set('X-Origin', from === ORIGINS[ORIGINS.length - 1] ? 'legacy' : from.split('/').pop());
    ['x-github-request-id', 'x-fastly-request-id', 'x-served-by', 'x-cache', 'x-cache-hits', 'x-timer', 'via'].forEach(k => h.delete(k));
    return new Response(r.body, { status: r.status, headers: h });
  },
};
