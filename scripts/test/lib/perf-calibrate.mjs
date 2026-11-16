// Hiệu chuẩn CPU theo từng runner (16/11): các bài đo fps/độ trễ chạy Chromium với CPU chậm N× (Emulation.setCPUThrottlingRate), nhưng runner GitHub dùng chung
// nhanh/chậm khác nhau ±30 % theo giờ → cùng mã lúc xanh lúc đỏ (call-rt barge-in ≈300 ms, story-stage fps 48, scroll-perf CLS 0,0537). Ở đây đo tốc độ THẬT của runner
// bằng 1 vòng lặp CPU cố định rồi chỉnh hệ số giảm tốc để máy giả lập luôn "chậm N× so với runner chuẩn" – NGƯỠNG KHÔNG ĐỔI.
// Chỉ NỚI khi runner chậm hơn chuẩn rõ rệt (factor > SLACK); runner nhanh KHÔNG bị siết thêm (không tự làm bài đo khó hơn).
export const REF_MS = 445;      // benchMs của loại runner phổ biến nhất (Xeon 6975P). Đo 10 máy ubuntu-24.04 (16/11): Xeon 6975P ≈ 445 · EPYC 9V45 ≈ 720 · EPYC 9V74 ≈ 890 · EPYC 7763 ≈ 986 ms – ổn định ±1 % trong 1 máy, nhưng cùng "CPU 4×" máy chậm gánh nặng gấp tới 2,2×
export const SLACK = 1.15;      // chậm hơn chuẩn < 15 % = dao động bình thường, giữ nguyên hệ số
export const MIN_RATE = 1;      // 1 = không giảm tốc (runner chậm hơn chuẩn > 4× thì tự nó đã đủ chậm)

/** Hàm thuần: hệ số giảm tốc điều chỉnh. nominal = hệ số danh định (vd 4); benchMs = thời gian vòng chuẩn trên runner này. */
export function calibratedRate(nominal, benchMs, ref = REF_MS) {
  if (!Number.isFinite(benchMs) || benchMs <= 0 || !Number.isFinite(ref) || ref <= 0) return { rate: nominal, factor: 1, scaled: false };
  const factor = benchMs / ref;
  if (factor <= SLACK) return { rate: nominal, factor, scaled: false };
  return { rate: Math.max(MIN_RATE, Math.round((nominal / factor) * 100) / 100), factor, scaled: true };
}

/** Đo trong trang KHÔNG giảm tốc: vòng lặp số học cố định, lấy nhỏ nhất 5 lượt (loại nhiễu một lần). Trả ms. */
export async function benchMs(page) {
  return page.evaluate(() => { const t = []; for (let r = 0; r < 5; r++) { const s = performance.now(); let x = 0; for (let i = 0; i < 4e7; i++) x = (x + i * i) % 1000003; t.push(performance.now() - s); if (x < 0) console.log(x); } return Math.min(...t); });
}

/** Đặt giảm tốc CPU đã hiệu chuẩn qua CDP; trả { rate, factor, scaled, bench } để ghi vào báo cáo (xu hướng theo runner). Gọi TRƯỚC khi bật giảm tốc. */
export async function setCalibratedThrottle(cdp, page, nominal) {
  const bench = await benchMs(page), c = calibratedRate(nominal, bench);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: c.rate });
  return { ...c, bench: Math.round(bench), nominal };
}

let cache;   // đo 1 lần mỗi tiến trình (≈2 s): các bài đo gọi nhiều lần
/** Hệ số giảm tốc đã hiệu chuẩn cho `nominal`, dùng trực tiếp: await send('Emulation.setCPUThrottlingRate', { rate: (await rateFor(browser, 4)).rate }). Lỗi đo → giữ nguyên hệ số. */
export async function rateFor(browser, nominal) {
  if (cache === undefined) {
    const p = await browser.newPage();
    try { cache = await benchMs(p); } catch { cache = NaN; } finally { await p.close().catch(() => {}); }
    const c = calibratedRate(nominal, cache);
    console.log(`  ⚙ hiệu chuẩn CPU: benchMs ${Math.round(cache)} ms (chuẩn ${REF_MS}) → hệ số ${nominal}× ${c.scaled ? `giảm còn ${c.rate}× để tương đương ${nominal}× trên runner chuẩn` : 'giữ nguyên'}`);
  }
  return { ...calibratedRate(nominal, cache), bench: Math.round(cache), nominal };
}
