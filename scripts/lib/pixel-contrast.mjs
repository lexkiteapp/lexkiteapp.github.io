// Tương phản chữ THẬT theo pixel (WCAG: chữ thường ≥ 4.5, chữ lớn ≥ 3) – dùng chung cho QC mẫu Stitch.
//   textBoxes(): chạy trong trang (page.evaluate) → hộp của mọi nút có chữ hiển thị + màu chữ + độ mờ.
//   contrastMiss(pngFile, boxes): nền thật lấy từ ảnh chụp (cụm màu ≥ 15 % hộp, trừ điểm gần màu chữ) → tương phản XẤU NHẤT
//   (bắt chữ trên gradient/ảnh). Cùng thuật toán với scripts/test/stitch-render.mjs (việc sau: file đó import từ đây).
import fs from 'node:fs'; import { PNG } from 'pngjs';
export const textBoxes = () => { const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  return [...document.querySelectorAll('body *')].filter(x => [...x.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && !/material-symbols|material-icons/.test(x.className) && vis(x)).map(x => { const r = x.getBoundingClientRect(), cs = getComputedStyle(x), fs = parseFloat(cs.fontSize), fw = +cs.fontWeight || 400;
    let op = 1; for (let q = x; q && q.nodeType === 1; q = q.parentElement) op *= +getComputedStyle(q).opacity;
    const hh = Math.min(r.height, fs * 1.2), cy = r.top + r.height / 2 + scrollY; return { t: x.textContent.trim().slice(0, 40), x: r.left, y: cy - hh / 2, w: r.width, h: hh, c: cs.color, op, large: fs >= 24 || (fs >= 18.66 && fw >= 700) }; }); };
const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
export const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
export function contrastMiss(png, boxes) { const p = PNG.sync.read(fs.readFileSync(png)), bad = [];
  for (const b of boxes) { const m = (b.c.match(/[\d.]+/g) || []).map(Number), a = (m[3] ?? 1) * b.op; if (m.length < 3 || a < 0.05) continue;
    const x0 = Math.max(0, Math.floor(b.x)), y0 = Math.max(0, Math.floor(b.y)), x1 = Math.min(p.width, Math.ceil(b.x + b.w)), y1 = Math.min(p.height, Math.ceil(b.y + b.h)); if (x1 - x0 < 3 || y1 - y0 < 3) continue;
    const H = new Map(); let far = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * p.width + x) * 4, R = p.data[i], G = p.data[i + 1], B = p.data[i + 2];
      if (Math.abs(R - m[0]) + Math.abs(G - m[1]) + Math.abs(B - m[2]) < 90) continue; far++; const q = ((R >> 3) << 10) | ((G >> 3) << 5) | (B >> 3); H.set(q, (H.get(q) || 0) + 1); }
    if (far < 6) continue; let w = 99;
    for (const [q, c] of H) { if (c < far * 0.15) continue; const bg = [(q >> 10) * 8 + 4, ((q >> 5) & 31) * 8 + 4, (q & 31) * 8 + 4]; w = Math.min(w, ratio([0, 1, 2].map(k => m[k] * a + bg[k] * (1 - a)), bg)); }
    const need = b.large ? 3 : 4.5; if (w < need - 0.05) bad.push({ t: b.t, r: +w.toFixed(2), need }); }
  return bad; }
// Tỉ lệ diện tích "sáng" (độ chói > 0.6) – bản tối không được có tấm/ thẻ trắng lớn (lỗi Stitch hay gặp: thẻ kem trong Tactile Night)
export function brightShare(png) { const p = PNG.sync.read(fs.readFileSync(png)); let n = 0, k = 0;
  for (let i = 0; i < p.data.length; i += 4 * 7) { n++; if (lum([p.data[i], p.data[i + 1], p.data[i + 2]]) > 0.6) k++; } return k / n; }
