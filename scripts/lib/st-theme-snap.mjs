// 🎨 Một bảng màu cho màn Stitch: mẫu Stitch vẽ mỗi màn một sắc nền/chữ/viền trung tính hơi khác (#0B171A, #0D1A1E, #142328…),
// nên cùng một vai trò lại lệch màu giữa các màn và lệch với app/native. Bước này (chạy trong build-stitch-css SAU Tailwind, và trong
// build-tokens khi đổi token) đổi các lớp lt:/dk: có màu TRUNG TÍNH (nền, chữ, viền) sang biến vai trò --st-* gần nhất của brand/tokens.json
// → mọi màn Stitch, web, iOS, Android cùng một thang màu sáng/tối. Màu brand/ngữ nghĩa (teal, cam, vàng, đỏ, nền ô màu nhạt) KHÔNG đổi.
// Thuần hàm, idempotent (quyết định theo hex trong TÊN lớp, không theo giá trị đã thay). Test: scripts/test/token-contrast.mjs.
import fs from 'node:fs';

const lin = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
export function oklab(h) {
  const [r, g, b] = [1, 3, 5].map(i => lin(parseInt(h.slice(i, i + 2), 16)));
  const [l, m, s] = [.4122214708 * r + .5363325363 * g + .0514459929 * b, .2119034982 * r + .6806995451 * g + .1073969566 * b, .0883024619 * r + .2817188376 * g + .6299787005 * b].map(Math.cbrt);
  return [.2104542553 * l + .7936177850 * m - .0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .8086757660 * s];
}
const dist = (a, b) => Math.hypot(...oklab(a).map((v, i) => v - oklab(b)[i]));
const lch = h => { const [, a, b] = oklab(h); return [Math.hypot(a, b), ((Math.atan2(b, a) * 180 / Math.PI) + 360) % 360]; };

// Vai trò ứng viên theo (thuộc tính, chế độ) – chỉ thang trung tính
const CAND = {
  'bg:dark': ['background', 'surface-container-lowest', 'surface-container-low', 'surface-container', 'surface-container-high', 'surface-container-highest', 'surface-bright'],
  'bg:light': ['background', 'surface-container-low', 'surface-container', 'surface-container-highest'],
  'text:dark': ['on-surface', 'on-surface-variant'], 'text:light': ['on-surface', 'on-surface-variant'],
  'border:dark': ['outline-variant', 'outline'], 'border:light': ['outline-variant', 'outline'],
};
// Màu được coi là "trung tính của Kit": xám thuần, hoặc teal/xanh lục lam rất nhạt (tối), hoặc kem ấm rất nhạt (sáng)
function neutral(hex, mode) {
  if (/^#FFFFFF$/i.test(hex)) return mode === 'light'; // chữ trắng trên ô màu (tối) giữ nguyên
  const [c, hue] = lch(hex);
  if (c <= .012) return true;
  if (mode === 'dark') return c <= .035 && hue >= 150 && hue <= 260;
  return c <= .026 && hue >= 50 && hue <= 110; // kem/giấy (ô vàng/cam nhạt có sắc rõ hơn → giữ)
}
// vai trò → hex theo chế độ ("--x" = mượn biến web)
export function roleHex(T, r, mode) { const v = T.roles[r]; const x = typeof v === 'string' ? v : v[mode]; return x.startsWith('--') ? T[mode][x] : x; }
export function pick(T, kind, mode, hex) {
  if (!neutral(hex, mode)) return null;
  let best = null;
  // Giữ BẬC nền: ô/viên/rãnh Stitch vẽ TỐI hơn nền trang (vd surface-container-low #f2f4f3 trên thanh/thẻ trắng) không được gộp vào nền
  // trang (sáng ngang/hơn nó) – gộp thì viên XP/chuỗi ngày, rãnh tiến độ biến mất trên nền trắng. Chỉ xét vai trò cùng phía hoặc tối hơn.
  const L = oklab(hex)[0], Lbg = oklab(roleHex(T, 'background', mode))[0], step = kind === 'bg' && mode === 'light' && L < Lbg - .008;
  for (const r of CAND[kind + ':' + mode]) { const rh = roleHex(T, r, mode); if (step && oklab(rh)[0] >= Lbg) continue; const d = dist(hex, rh); if (!best || d < best.d) best = { r, d }; }
  return best && best.d <= (kind === 'bg' ? .03 : .06) ? best.r : null;
}
const PROP = { bg: 'background-color', text: 'color', border: 'border-color' };
// css: chuỗi CSS đã biên dịch. Đổi khai báo màu trong các quy tắc .lt\:{bg,text,border}-\[\#HEX\] / .dk\:…
export function snapCss(css, T) {
  return css.replace(/([^{}]*\.(lt|dk)\\:(bg|text|border)-\\\[\\#([0-9A-Fa-f]{6})\\\][^{}]*)\{([^{}]*)\}/g, (all, sel, v, kind, hex, body) => {
    const r = pick(T, kind, v === 'dk' ? 'dark' : 'light', '#' + hex.toUpperCase()); if (!r) return all;
    const re = new RegExp(`(${PROP[kind]}:)rgb\\((?:\\d+ \\d+ \\d+|var\\(--st-[a-z-]+\\))(\\s*/[^)]*\\)|\\))`);
    return sel + '{' + body.replace(re, (m, p, tail) => `${p}rgb(var(--st-${r})${tail}`) + '}';
  });
}
export const loadTokens = () => JSON.parse(fs.readFileSync('brand/tokens.json', 'utf8'));
