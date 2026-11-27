// Máy tính band IELTS (docs/specs/ielts-band-calculator.md): logic thuần, dùng cho test + build; web/js/tools/ielts-band.js lặp lại ĐÚNG công thức này (test so khớp).
import fs from 'node:fs';
export const BAND_DATA = JSON.parse(fs.readFileSync('content/tools/ielts-band.json', 'utf8'));
/** điểm thô (0–40) → band theo bảng [[minRaw, band], …] giảm dần; dưới mức thấp nhất → 2 (bảng chỉ liệt kê tới 2,5) */
export const rawToBand = (tbl, raw) => { raw = Math.max(0, Math.min(40, Math.floor(+raw) || 0)); for (const [m, b] of tbl) if (raw >= m) return b; return raw >= 1 ? 2 : 0; };
/** trung bình 4 kỹ năng, làm tròn tới 0,5 (x,25 → x,5; x,75 → x+1) – quy tắc công bố của IELTS */
export const overall = (l, r, w, s) => Math.round(((+l + +r + +w + +s) / 4) * 2) / 2;
