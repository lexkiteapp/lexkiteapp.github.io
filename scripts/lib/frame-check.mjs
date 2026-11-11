// 🧱 Khung app (docs/DESIGN-SYSTEM.md §5d): so thanh trên 56 px + thanh 5 tab 64 px của một ref với khung mẫu cùng biến thể + cùng theme.
// Ảnh vào = PNG RGBA (pngjs) chụp viewport 390 px. SSIM xám cửa sổ 8×8 bước 4; màu nền thanh so khoảng cách RGB.
export const TABS = ['Today', 'Vocab', 'Skills', 'Tests', 'Me'];
export const TOP_H = 56, TAB_H = 64, W = 390;

function gray(png, x0, y0, w, h) { const g = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((y0 + y) * png.width + (x0 + x)) * 4, a = png.data[i + 3] / 255;
    g[y * w + x] = (0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2]) * a + 255 * (1 - a); }
  return g; }

export function ssim(A, B, w, h) { const C1 = 6.5025, C2 = 58.5225, n = 8; let s = 0, k = 0;
  for (let y = 0; y + n <= h; y += 4) for (let x = 0; x + n <= w; x += 4) { let ma = 0, mb = 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { ma += A[(y + j) * w + x + i]; mb += B[(y + j) * w + x + i]; }
    ma /= 64; mb /= 64; let va = 0, vb = 0, cv = 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = A[(y + j) * w + x + i] - ma, b = B[(y + j) * w + x + i] - mb; va += a * a; vb += b * b; cv += a * b; }
    va /= 63; vb /= 63; cv /= 63; s += ((2 * ma * mb + C1) * (2 * cv + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2)); k++; }
  return k ? s / k : 1; }

// lệch vài px (Stitch canh thanh khác 1–6 px) không phải lệch thiết kế → lấy SSIM lớn nhất trong ô dò ±6 px dọc, ±4 px ngang
// lệch vài px (Stitch canh thanh khác 1–6 px) không phải lệch thiết kế → lấy SSIM lớn nhất trong ô dò ±6 px dọc, ±4 px ngang
function best(a, ax, ay, b, bx, by, w, h) { const B = gray(b, bx, by, w, h); let m = -1;
  for (let dy = -6; dy <= 6; dy += 2) for (let dx = -4; dx <= 4; dx += 2) { const x = ax + dx, y = ay + dy;
    if (x < 0 || y < 0 || x + w > a.width || y + h > a.height) continue; m = Math.max(m, ssim(gray(a, x, y, w, h), B, w, h)); }
  return m; }
const region = (a, b, x, y, w, h) => best(a, x, y, b, x, y, w, h);
// màu nền thanh = trung vị các điểm dọc mép phải/trái (ít chữ nhất)
function barBg(png, y0, h) { const v = [];
  for (const x of [2, 4, W - 3, W - 5]) for (let y = y0 + 4; y < y0 + h - 4; y += 6) { const i = (y * png.width + x) * 4; v.push([png.data[i], png.data[i + 1], png.data[i + 2]]); }
  v.sort((p, q) => p[0] + p[1] + p[2] - q[0] - q[1] - q[2]); return v[v.length >> 1]; }
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

// ref/tpl: PNG viewport 390×H. variant: hub|inner|modal|focus. refTab/tplTab: tên tab đang chọn (hoặc null).
export function frameScores(ref, tpl, variant, refTab, tplTab) {
  const out = {};
  // thanh trên: hub so cả thanh (logo + chip + streak + XP + avatar giống nhau); inner/modal/focus so ô nút trái 52 px (chỉ nút back / close, chưa tới tiêu đề)
  out.top = +(variant === 'hub' ? region(ref, tpl, 0, 0, W, TOP_H) : region(ref, tpl, 0, 0, 52, TOP_H)).toFixed(3);
  out.topBg = +dist(barBg(ref, 0, TOP_H), barBg(tpl, 0, TOP_H)).toFixed(1);
  if (variant === 'hub' || variant === 'inner') {
    const y = ref.height - TAB_H - 6, yt = tpl.height - TAB_H - 6, cw = Math.floor(W / 5), skip = new Set([TABS.indexOf(refTab), TABS.indexOf(tplTab)]);
    const cells = [];
    for (let c = 0; c < 5; c++) { if (skip.has(c)) continue;
      cells.push(best(ref, c * cw, y, tpl, c * cw, yt, cw, TAB_H)); }
    out.tabs = +(cells.reduce((s, v) => s + v, 0) / (cells.length || 1)).toFixed(3);
    if (refTab === tplTab) out.tabActive = +best(ref, TABS.indexOf(refTab) * cw, y, tpl, TABS.indexOf(tplTab) * cw, yt, cw, TAB_H).toFixed(3);
    out.tabBg = +dist(barBg(ref, y, TAB_H), barBg(tpl, yt, TAB_H)).toFixed(1);
  }
  return out;
}

// nút trái thanh trên (back / close) định vị bằng DOM (rect {x,y,w,h} ở 390 px): cắt đúng khung nút ở cả hai ảnh, lấy mẫu ref về cỡ nút mẫu → SSIM.
// Đo đúng chiếc nút, không lẫn tiêu đề/thanh tiến độ đứng cạnh (vùng cố định 52 px bị lẫn khi Stitch xê dịch vài px).
export function btnScore(ref, rb, tpl, tb) { const pad = 2, tw = Math.round(tb.w) + 2 * pad, th = Math.round(tb.h) + 2 * pad;
  const T = gray(tpl, Math.max(0, Math.round(tb.x) - pad), Math.max(0, Math.round(tb.y) - pad), tw, th), R = new Float32Array(tw * th);
  const sx = (rb.w + 2 * pad) / tw, sy = (rb.h + 2 * pad) / th, x0 = rb.x - pad, y0 = rb.y - pad;
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { const px = Math.min(ref.width - 1, Math.max(0, Math.round(x0 + x * sx))), py = Math.min(ref.height - 1, Math.max(0, Math.round(y0 + y * sy)));
    R[y * tw + x] = gray(ref, px, py, 1, 1)[0]; }
  return +ssim(R, T, tw, th).toFixed(3); }
