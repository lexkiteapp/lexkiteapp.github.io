// Tải media từ gốc GitHub cho CI (dùng bởi no-prod.mjs) – chịu được "đuôi chậm" của GitHub Release/Pages:
//  • memo theo PROMISE: nhiều context Playwright cùng xin một URL chỉ tải MỘT lần (trước: 4 worker × 6 cấu hình cùng đập GitHub, bản nào xong sau cùng thì LCP ảnh poster video 8-10 s → sweep đỏ /L/video/*/);
//  • hedge: sau hedgeMs chưa có trả lời thì bắn thêm 1 yêu cầu song song, lấy bản về trước (đuôi chậm hay do 1 kết nối redirect bị treo);
//  • lỗi (null) không được nhớ → lần sau thử lại.
export const HEDGE_MS = 1500;

/** Chạy get(g) ngay + 1 lần nữa sau ms nếu chưa xong; trả kết quả khác null đầu tiên (null nếu cả hai null). */
export function hedged(get, g, ms = HEDGE_MS) {
  return new Promise(resolve => {
    let live = 0, done = false, timer;
    const fin = v => { if (done) return; done = true; clearTimeout(timer); resolve(v); };
    const run = () => { live++; Promise.resolve().then(() => get(g)).catch(() => null).then(r => { live--; if (r) fin(r); else if (!live) fin(null); }); };
    run();
    timer = setTimeout(() => { if (!done) run(); }, ms);
  });
}

/** Cắt bản đầy đủ theo header Range (GitHub/Chrome đều dùng bytes=a-b, bytes=a-, bytes=-n) → 206; đích ngoài file → 416; header lạ → trả nguyên bản 200. */
export function sliceRange(res, range) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(range || '').trim()), body = res.body, size = body.length;
  if (!m || (m[1] === '' && m[2] === '')) return { ...res, headers: { ...res.headers, 'accept-ranges': 'bytes' } };
  const start = m[1] === '' ? Math.max(0, size - +m[2]) : +m[1], end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(+m[2], size - 1);
  if (start >= size || end < start) return { status: 416, headers: { ...res.headers, 'accept-ranges': 'bytes', 'content-range': `bytes */${size}` }, body: Buffer.alloc(0) };
  return { status: 206, headers: { ...res.headers, 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${size}` }, body: body.subarray(start, end + 1) };
}

export function makeOriginFetcher({ hedgeMs = HEDGE_MS } = {}) {
  const memo = new Map(), stats = { fetched: 0, shared: 0, failed: 0 };
  /** candidates: mảng URL gốc; get(g) → {status, headers, body} | null (null = thử gốc kế). key: URL CDN (không memo nếu falsy, vd. request Range). */
  async function load(key, candidates, get) {
    if (key && memo.has(key)) { stats.shared++; return memo.get(key); }
    const p = (async () => {
      for (const g of candidates) { stats.fetched++; const r = await hedged(get, g, hedgeMs); if (r) return r; }
      stats.failed++; return null;
    })();
    if (key) { memo.set(key, p); p.then(r => { if (!r) memo.delete(key); }); }
    return p;
  }
  return { load, memo, stats };
}
