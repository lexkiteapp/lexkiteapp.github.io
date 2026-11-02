// Chờ điều kiện trong trang KHÔNG dùng page.waitForFunction: Playwright dựng predicate bằng eval/new Function trong trang → bị CSP chặn
// (web có CSP chặn thật từ 2/11 – meta hash, không 'unsafe-eval'; add-on MV3 cũng vậy) → EvalError giả trong test. page.evaluate(hàm) đi qua
// CDP callFunctionOn nên không chịu CSP. Trả giá trị truthy đầu tiên (không phải JSHandle). Test: scripts/test/csp.mjs (cấm waitForFunction).
export async function waitFn(page, fn, arg, opts = {}) {
  const timeout = opts.timeout ?? 30000, every = typeof opts.polling === 'number' ? opts.polling : 100, t0 = Date.now();
  for (;;) {
    let v; try { v = await page.evaluate(fn, arg); } catch (e) { if (!/context was destroyed|navigation|Cannot find context|Execution context/i.test(String(e && e.message))) throw e; }
    if (v) return v;
    if (Date.now() - t0 > timeout) { const e = new Error(`waitFn: Timeout ${timeout}ms exceeded`); e.name = 'TimeoutError'; throw e; }
    await new Promise(r => setTimeout(r, every));
  }
}
