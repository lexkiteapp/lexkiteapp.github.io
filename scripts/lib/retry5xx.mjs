// Thử lại khi GitHub trả 5xx tạm thời (dispatch workflow, API). 4xx / lỗi khác: ném ngay, không thử lại.
// Dùng: await retry5xx(() => fetch(...))  → fn trả Response; 5xx thì chờ 3s/9s/27s rồi gọi lại (tối đa 3 lần thử).
// Bản shell cùng luật: scripts/ci/gh-retry.sh (cùng bảng backoff, test: scripts/test/retry5xx.mjs).
export const BACKOFF_MS = [3000, 9000];   // 3 lần thử = 2 lần chờ giữa các lần
export const is5xx = s => Number(s) >= 500 && Number(s) <= 599;
export async function retry5xx(fn, { backoff = BACKOFF_MS, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  for (let i = 0; ; i++) {
    const r = await fn();
    if (!is5xx(r?.status) || i >= backoff.length) return r;
    await sleep(backoff[i]);
  }
}
