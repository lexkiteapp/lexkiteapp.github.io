// Thử lại lỗi TẠM THỜI khi gọi mạng: HTTP 5xx và lỗi socket/DNS/timeout (fetch ném "fetch failed"/"terminated", UND_ERR_*, ECONNRESET…).
// 4xx / lỗi khác (lỗi code, JSON hỏng…): ném hoặc trả ngay, không thử lại.
//   await retry5xx(() => fetch(...))   → fn trả Response; 5xx hoặc lỗi mạng thì chờ 3s/9s rồi gọi lại (tối đa 3 lần thử)
//   await fetchRetry(url, opts)       → như trên NHƯNG đọc trọn body BÊN TRONG vòng thử (10/11 cdn-mirror đỏ: socket GitHub đóng giữa lúc
//                                       đọc body – "TypeError: terminated / SocketError: other side closed" – ngoài vòng retry5xx cũ)
// Bản shell cùng luật: scripts/ci/net-retry.sh (gh-retry.sh = tên cũ). Test: scripts/test/retry5xx.mjs.
export const BACKOFF_MS = [3000, 9000];   // 3 lần thử = 2 lần chờ giữa các lần
export const is5xx = s => Number(s) >= 500 && Number(s) <= 599;
const NET_CODES = /^(UND_ERR_|ECONNRESET|ECONNREFUSED|ECONNABORTED|ETIMEDOUT|EPIPE|EAI_AGAIN|ENOTFOUND|ENETUNREACH|EHOSTUNREACH)/;
export function isNetErr(e) {
  for (let x = e, d = 0; x && d < 4; x = x.cause, d++) {
    if (NET_CODES.test(String(x.code || ''))) return true;
    if (x.name === 'AbortError' || x.name === 'TimeoutError') return true;
    if (/^(fetch failed|terminated|other side closed|socket hang up)$/i.test(String(x.message || ''))) return true;
  }
  return false;
}
export async function retry5xx(fn, { backoff = BACKOFF_MS, sleep = ms => new Promise(r => setTimeout(r, ms)), log = m => console.warn(m) } = {}) {
  for (let i = 0; ; i++) {
    let r;
    try { r = await fn(); }
    catch (e) {
      if (!isNetErr(e) || i >= backoff.length) throw e;
      log(`⚠ lỗi mạng tạm thời (${e.cause?.code || e.code || e.message}) – thử lại ${i + 2}/${backoff.length + 1} sau ${backoff[i] / 1000}s`);
      await sleep(backoff[i]); continue;
    }
    if (!is5xx(r?.status) || i >= backoff.length) return r;
    await sleep(backoff[i]);
  }
}
export const fetchRetry = (url, opts = {}, ro) => retry5xx(async () => {
  const r = await fetch(url, opts);
  const body = await r.arrayBuffer();   // đọc trọn trong vòng thử: socket đứt giữa body cũng được thử lại
  return new Response([101, 204, 205, 304].includes(r.status) ? null : body, { status: r.status, statusText: r.statusText, headers: r.headers });
}, ro);
