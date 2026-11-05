// Chờ điều kiện trong trang KHÔNG dùng page.waitForFunction: Playwright dựng predicate bằng eval/new Function trong trang → bị CSP chặn
// (web có CSP chặn thật từ 2/11 – meta hash, không 'unsafe-eval'; add-on MV3 cũng vậy) → EvalError giả trong test. evaluateHandle(hàm) đi qua
// CDP callFunctionOn nên không chịu CSP. Kiểm truthy NGAY TRONG TRANG (giá trị có thể là hàm/DOM – không tuần tự hoá được, vd UI.tts) và trả
// JSHandle như waitForFunction (nơi gọi dùng .jsonValue()). Test: scripts/test/csp.mjs (cấm waitForFunction) + scripts/test/pw-wait.mjs.
export async function waitFn(page, fn, arg, opts = {}) {
  const timeout = opts.timeout ?? 30000, every = typeof opts.polling === 'number' ? opts.polling : 100, t0 = Date.now();
  for (;;) {
    let h = null;
    try { h = await page.evaluateHandle(fn, arg); if (await h.evaluate(v => !!v)) return h; }
    catch (e) { if (!/context was destroyed|navigation|Cannot find context|Execution context|Target closed/i.test(String(e && e.message))) throw e; }
    if (h) await h.dispose().catch(() => {});
    if (Date.now() - t0 > timeout) { const e = new Error(`waitFn: Timeout ${timeout}ms exceeded`); e.name = 'TimeoutError'; throw e; }
    await new Promise(r => setTimeout(r, every));
  }
}
