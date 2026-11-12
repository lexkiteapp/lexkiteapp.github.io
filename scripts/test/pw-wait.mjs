// Test waitFn (scripts/lib/pw-wait.mjs) bằng trang giả (không cần trình duyệt): predicate trả hàm/chuỗi, JSHandle, hết giờ, điều hướng giữa chừng.
import { waitFn } from '../lib/pw-wait.mjs';
let n = 0; const ok = (c, m) => { if (!c) { console.error('✗ pw-wait: ' + m); process.exit(1); } n++; };
// Trang giả: evaluateHandle chạy fn trong "trang" (globalThis giả), handle.evaluate/jsonValue/dispose như Playwright
const fakePage = (win, { navErrOnce = false } = {}) => { let nav = navErrOnce; return {
  async evaluateHandle(fn, arg) { if (nav) { nav = false; throw new Error('Execution context was destroyed, most likely because of a navigation'); }
    const v = await fn.call(null, arg, win); return { evaluate: async g => g(v), jsonValue: async () => (typeof v === 'function' ? undefined : v), dispose: async () => {} }; } }; };
const win = { t: 0 };
globalThis.__w = win;
const p1 = fakePage(win); setTimeout(() => { win.tts = () => 1; }, 150);
const h1 = await waitFn(p1, () => globalThis.__w.tts, null, { timeout: 2000 });
ok(h1 && typeof h1.jsonValue === 'function', 'predicate trả HÀM (vd UI.tts) vẫn được coi là đúng, trả JSHandle (trước đây evaluate → undefined → treo 30 s)');
const h2 = await waitFn(fakePage(win), ([a]) => a === 'x' ? '#/review' : false, ['x'], { timeout: 500 });
ok(await h2.jsonValue() === '#/review', 'trả handle, .jsonValue() ra giá trị (review-taps dùng)');
let to = null; try { await waitFn(fakePage(win), () => false, null, { timeout: 250, polling: 50 }); } catch (e) { to = e; }
ok(to && to.name === 'TimeoutError', 'hết giờ → TimeoutError');
ok(await waitFn(fakePage(win, { navErrOnce: true }), () => 1, null, { timeout: 1000 }), 'lỗi "context destroyed" khi điều hướng → thử lại, không ném');
let thrown = null; try { await waitFn({ evaluateHandle: async () => { throw new Error('ReferenceError: boom'); } }, () => 1); } catch (e) { thrown = e; }
ok(thrown && /boom/.test(thrown.message), 'lỗi thật trong predicate → ném ra (không nuốt)');
console.log(`✓ pw-wait: ${n} kiểm tra`);
