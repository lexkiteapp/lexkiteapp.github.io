// Hiệu chuẩn CPU theo từng runner (16/11): các bài đo fps/độ trễ chạy Chromium với CPU chậm N× (Emulation.setCPUThrottlingRate), nhưng runner GitHub dùng chung
// nhanh/chậm khác nhau ±30 % theo giờ → cùng mã lúc xanh lúc đỏ (call-rt barge-in ≈300 ms, story-stage fps 48, scroll-perf CLS 0,0537). Ở đây đo tốc độ THẬT của runner
// bằng 1 vòng lặp CPU cố định rồi chỉnh hệ số giảm tốc để máy giả lập luôn "chậm N× so với runner chuẩn" – NGƯỠNG KHÔNG ĐỔI.
// Chỉ NỚI khi runner chậm hơn chuẩn rõ rệt (factor > SLACK); runner nhanh KHÔNG bị siết thêm (không tự làm bài đo khó hơn).
export const REF_MS = 330;      // trung vị benchMs trên ubuntu-24.04 GitHub-hosted (đo 10 máy bằng workflow perf-baseline, xem docs/CI-RUNNERS.md)
export const SLACK = 1.15;      // chậm hơn chuẩn < 15 % = dao động bình thường, giữ nguyên hệ số
export const MIN_RATE = 2;      // không bao giờ giảm tốc dưới 2× (vẫn là máy yếu)

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
