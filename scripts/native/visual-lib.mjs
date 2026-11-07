// Native visual QC – thư viện không phụ thuộc gói ngoài (node:zlib): đọc/ghi PNG, ΔE2000, tương phản, cụm màu, mốc bố cục.
// Dùng bởi scripts/test/native-visual.mjs (docs/specs/native-apps.md §3 một nguồn, §6 CI). Ngưỡng nằm ở scripts/test/native-visual.mjs (THRESH).
import zlib from 'node:zlib';

// ---------------- PNG ----------------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
/** @returns {{w:number,h:number,data:Uint8Array}} RGBA 8-bit (alpha giữ nguyên, các phép đo bỏ qua alpha). Không hỗ trợ Adam7. */
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('không phải PNG');
  let p = 8, w = 0, h = 0, bd = 8, ct = 6, il = 0, pal = null; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len); p += 12 + len;
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; il = d[12]; }
    // màu so với token sRGB: ảnh mang hồ sơ khác (vd Display P3 khi chụp cửa sổ thật) lệch ΔE giả → chặn ngay ở gốc (#721)
    else if (type === 'iCCP') { const nm = d.toString('latin1', 0, d.indexOf(0)); if (!/srgb/i.test(nm)) throw new Error(`PNG mang hồ sơ màu "${nm}", cần sRGB (chụp ảnh ở dải màu chuẩn)`); }
    else if (type === 'PLTE') pal = d; else if (type === 'IDAT') idat.push(d); else if (type === 'IEND') break;
  }
  if (il) throw new Error('PNG xen kẽ (Adam7) chưa hỗ trợ');
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct]; if (!ch) throw new Error('kiểu PNG ' + ct);
  const bpp = Math.max(1, (ch * bd) >> 3), stride = Math.ceil((w * ch * bd) / 8), raw = zlib.inflateSync(Buffer.concat(idat)), out = new Uint8Array(w * h * 4);
  let prev = new Uint8Array(stride), cur = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0; let v = src[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4; let r, g, bl, al = 255;
      const px = i => bd === 16 ? cur[(x * ch + i) * 2] : bd === 8 ? cur[x * ch + i] : null;
      if (ct === 3 || (ct === 0 && bd < 8)) { const bit = x * bd, v = (cur[bit >> 3] >> (8 - bd - (bit & 7))) & ((1 << bd) - 1); if (ct === 3) { r = pal[v * 3]; g = pal[v * 3 + 1]; bl = pal[v * 3 + 2]; } else r = g = bl = Math.round(v * 255 / ((1 << bd) - 1)); }
      else if (ct === 0) r = g = bl = px(0); else if (ct === 4) { r = g = bl = px(0); al = px(1); }
      else { r = px(0); g = px(1); bl = px(2); if (ct === 6) al = px(3); }
      out[o] = r; out[o + 1] = g; out[o + 2] = bl; out[o + 3] = al;
    }
    [prev, cur] = [cur, prev];
  }
  return { w, h, data: out };
}
export function encodePng({ w, h, data }) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(data.buffer, data.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const chunk = (t, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(t, 4, 'latin1'); d.copy(b, 8); b.writeUInt32BE(crc32(b.subarray(4, 8 + d.length)), 8 + d.length); return b; };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
export const newImage = (w, h, rgb = [255, 255, 255]) => { const data = new Uint8Array(w * h * 4); for (let i = 0; i < w * h; i++) { data[i * 4] = rgb[0]; data[i * 4 + 1] = rgb[1]; data[i * 4 + 2] = rgb[2]; data[i * 4 + 3] = 255; } return { w, h, data }; };
/** Thu nhỏ trung bình vùng về bề rộng tw (để dựng tờ so sánh). */
export function resizeToWidth(img, tw) {
  if (img.w === tw) return img; const s = img.w / tw, th = Math.max(1, Math.round(img.h / s)), out = newImage(tw, th);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const x0 = Math.floor(x * s), x1 = Math.max(x0 + 1, Math.floor((x + 1) * s)), y0 = Math.floor(y * s), y1 = Math.max(y0 + 1, Math.floor((y + 1) * s)); let r = 0, g = 0, b = 0, n = 0;
    for (let yy = y0; yy < Math.min(y1, img.h); yy++) for (let xx = x0; xx < Math.min(x1, img.w); xx++) { const o = (yy * img.w + xx) * 4; r += img.data[o]; g += img.data[o + 1]; b += img.data[o + 2]; n++; }
    const o = (y * tw + x) * 4; n = n || 1; out.data[o] = r / n; out.data[o + 1] = g / n; out.data[o + 2] = b / n;
  }
  return out;
}
export function blit(dst, src, dx, dy, maxH = src.h) { for (let y = 0; y < Math.min(src.h, maxH); y++) for (let x = 0; x < src.w; x++) { const tx = dx + x, ty = dy + y; if (tx < 0 || ty < 0 || tx >= dst.w || ty >= dst.h) continue; const a = (y * src.w + x) * 4, b = (ty * dst.w + tx) * 4; dst.data[b] = src.data[a]; dst.data[b + 1] = src.data[a + 1]; dst.data[b + 2] = src.data[a + 2]; dst.data[b + 3] = 255; } }

// ---------------- màu ----------------
export const hex2rgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
export const rgb2hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export function rgb2lab([r, g, b]) {
  const R = lin(r), G = lin(g), B = lin(b), X = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047, Y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B, Z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
  const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116, fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
/** CIEDE2000 (Sharma 2005). */
export function deltaE2000(l1, l2) {
  const [L1, a1, b1] = l1, [L2, a2, b2] = l2, rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2, G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const ap1 = (1 + G) * a1, ap2 = (1 + G) * a2, Cp1 = Math.hypot(ap1, b1), Cp2 = Math.hypot(ap2, b2);
  const hp = (b, a) => (b === 0 && a === 0) ? 0 : (deg(Math.atan2(b, a)) + 360) % 360, hp1 = hp(b1, ap1), hp2 = hp(b2, ap2);
  const dL = L2 - L1, dC = Cp2 - Cp1; let dh = 0;
  if (Cp1 * Cp2 !== 0) { dh = hp2 - hp1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(rad(dh / 2)), Lb = (L1 + L2) / 2, Cpb = (Cp1 + Cp2) / 2;
  let hb = hp1 + hp2; if (Cp1 * Cp2 === 0) hb = hp1 + hp2; else if (Math.abs(hp1 - hp2) <= 180) hb /= 2; else hb = (hb + (hb < 360 ? 360 : -360)) / 2;
  const T = 1 - 0.17 * Math.cos(rad(hb - 30)) + 0.24 * Math.cos(rad(2 * hb)) + 0.32 * Math.cos(rad(3 * hb + 6)) - 0.2 * Math.cos(rad(4 * hb - 63));
  const dth = 30 * Math.exp(-(((hb - 275) / 25) ** 2)), Rc = 2 * Math.sqrt(Cpb ** 7 / (Cpb ** 7 + 25 ** 7));
  const Sl = 1 + 0.015 * (Lb - 50) ** 2 / Math.sqrt(20 + (Lb - 50) ** 2), Sc = 1 + 0.045 * Cpb, Sh = 1 + 0.015 * Cpb * T, Rt = -Math.sin(rad(2 * dth)) * Rc;
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}
export const relLum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const contrast = (a, b) => { const x = relLum(a), y = relLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// ---------------- token ----------------
/** Bảng màu theo chế độ từ brand/stitch/tokens.dtcg.json: tối = $value (Option A), sáng = $extensions.com.lexkite.mode.light (Option B). */
export function palette(tokens, theme) {
  const out = []; for (const [name, t] of Object.entries(tokens.color)) { const v = theme === 'light' ? (t.$extensions?.['com.lexkite.mode']?.light ?? t.$value) : t.$value; if (/^#[0-9a-f]{6}/i.test(v)) { const rgb = hex2rgb(v.slice(0, 7)); out.push({ name, hex: rgb2hex(rgb), rgb, lab: rgb2lab(rgb) }); } }
  return out;
}
export const px = (tokenValue) => { const m = /^([\d.]+)(rem|px)$/.exec(tokenValue); return m ? (m[2] === 'rem' ? +m[1] * 16 : +m[1]) : NaN; };

// ---------------- phân tích ----------------
/** Điểm ảnh "đặc" = giống hệt cả 8 láng giềng (bỏ chống răng cưa, bóng đổ mờ, ảnh chụp). Trả về {solid:Uint8Array}. */
export function solidMask({ w, h, data }, ignore = () => false) {
  const solid = new Uint8Array(w * h), eq = (a, b) => data[a] === data[b] && data[a + 1] === data[b + 1] && data[a + 2] === data[b + 2];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = (y * w + x) * 4; if (ignore(x, y)) continue; let ok = true;
    for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !eq(i, i + (dy * w + dx) * 4)) { ok = false; break; }
    if (ok) solid[y * w + x] = 1;
  }
  return solid;
}
/** Gom màu: các giá trị RGB đặc, gộp khi ΔE2000 ≤ merge. Trả về {clusters (giảm dần theo diện tích), ids: Int16Array (-1 = không đặc)}. */
export function clusterColors(img, solid, merge = 1.5, maxDistinct = 6000) {
  const { w, h, data } = img, hist = new Map();
  for (let i = 0; i < w * h; i++) if (solid[i]) { const k = (data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2]; hist.set(k, (hist.get(k) || 0) + 1); }
  const keys = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxDistinct), clusters = [], key2c = new Map();
  for (const [k, n] of keys) {
    const rgb = [k >> 16, (k >> 8) & 255, k & 255], lab = rgb2lab(rgb); let best = -1, bd = merge;
    for (let c = 0; c < clusters.length; c++) { const d = deltaE2000(lab, clusters[c].lab); if (d <= bd) { bd = d; best = c; } }
    if (best < 0) { clusters.push({ rgb, lab, hex: rgb2hex(rgb), count: 0 }); best = clusters.length - 1; }
    clusters[best].count += n; key2c.set(k, best);
  }
  const ids = new Int16Array(w * h).fill(-1);
  for (let i = 0; i < w * h; i++) if (solid[i]) { const c = key2c.get((data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2]); if (c !== undefined) ids[i] = c; }
  return { clusters, ids };
}
export function nearest(lab, pal) { let b = null, bd = 1e9; for (const t of pal) { const d = deltaE2000(lab, t.lab); if (d < bd) { bd = d; b = t; } } return { token: b, de: bd }; }
/** Pha trộn 2 token (lớp phủ/độ mờ/gradient) – chỉ chấp nhận khi một đầu là nền/bề mặt hoặc cặp banner↔banner-2; ΔE ≤ tol. */
export function matchBlend(lab, pal, tol, maxT = 0.6) {
  const surf = pal.filter(t => /^(background|surface|inverse-surface)/.test(t.name)), by = n => pal.find(t => t.name === n);
  const pairs = []; for (const a of surf) for (const b of pal) if (a !== b) pairs.push([a, b, maxT]);
  if (by('banner') && by('banner-2')) pairs.push([by('banner'), by('banner-2'), 1]);
  let best = null;
  for (const [a, b, mt] of pairs) for (let t = 0.05; t <= mt + 1e-9; t += 0.05) {
    const c = a.rgb.map((v, i) => v + (b.rgb[i] - v) * t), d = deltaE2000(lab, rgb2lab(c)); if (d <= tol && (!best || d < best.de)) best = { de: d, a: a.name, b: b.name, t: +t.toFixed(2) };
  }
  return best;
}
/** Chuẩn: kiểm bảng màu + tương phản chữ. opts: {pal, scale (px ảnh / 390), thresh, ignore(x390,y390)}. */
export function paletteCheck(img, opts) {
  const { pal, scale, thresh } = opts, total = img.w * img.h, ign = opts.ignore ? (x, y) => opts.ignore(x / scale, y / scale) : undefined;
  const solid = solidMask(img, ign), { clusters, ids } = clusterColors(img, solid, thresh.mergeDE);
  const fail = [], warn = [], info = [];
  for (const c of clusters) {
    c.area = c.count / total * 100; const m = nearest(c.lab, pal); c.token = m.token; c.de = m.de;
    if (c.area < thresh.warnArea) continue;
    if (m.de <= thresh.paletteDE) continue;
    const bl = matchBlend(c.lab, pal, thresh.blendDE);
    const row = { hex: c.hex, area: +c.area.toFixed(2), nearest: m.token.name, nearestHex: m.token.hex, de: +m.de.toFixed(1) };
    if (bl) { info.push({ ...row, blend: `${bl.a}+${bl.b}@${bl.t}` }); continue; }
    (c.area >= thresh.failArea ? fail : warn).push(row);
  }
  // cặp chữ/nền: điểm không đặc nằm giữa 2 vùng đặc khác cụm, cách 3 px (chữ chống răng cưa)
  const { w, h } = img, d = Math.max(2, Math.round(scale)), pairs = new Map(), cnt = (a, b) => { const k = a < b ? a * 4096 + b : b * 4096 + a; pairs.set(k, (pairs.get(k) || 0) + 1); };
  for (let y = d; y < h - d; y++) for (let x = d; x < w - d; x++) {
    const i = y * w + x; if (solid[i]) continue;
    const a1 = ids[i - d], b1 = ids[i + d], a2 = ids[i - d * w], b2 = ids[i + d * w];
    if (a1 >= 0 && b1 >= 0 && a1 !== b1) cnt(a1, b1); else if (a2 >= 0 && b2 >= 0 && a2 !== b2) cnt(a2, b2);
  }
  const contrastBad = [];
  for (const [k, n] of pairs) {
    if (n < thresh.pairMinEdge * scale) continue; const A = clusters[Math.floor(k / 4096)], B = clusters[k % 4096];
    const isText = c => c.token && c.de <= thresh.paletteDE && /^(on-|inverse-on)/.test(c.token.name);
    const t = isText(A) && !isText(B) ? A : isText(B) && !isText(A) ? B : null; if (!t) continue;
    const o = t === A ? B : A; if (o.area < thresh.contrastMinArea || t.area < thresh.contrastMinArea || t.area > thresh.textMaxArea) continue;
    const cr = contrast(A.rgb, B.rgb); if (cr < thresh.contrast) contrastBad.push({ fg: t.hex, fgToken: t.token.name, bg: o.hex, bgToken: o.token?.name, ratio: +cr.toFixed(2), edgePx: n });
  }
  return { fail, warn, info, contrastBad, solid, clusters, ids };
}

// ---------------- mốc bố cục (đơn vị 390-px: toạ độ ảnh / scale) ----------------
const near = (data, i, c, t = 3) => Math.abs(data[i] - c[0]) <= t && Math.abs(data[i + 1] - c[1]) <= t && Math.abs(data[i + 2] - c[2]) <= t;
/** Thanh tab dưới: màu nền = màu phổ biến nhất ở hàng cuối; đi lên khi ≥ rowFrac điểm của hàng cùng màu (+ đường viền 1–3 px). Đếm icon ở dải trên (iconBand). */
export function tabBar(img, scale, t) {
  const { w, h, data } = img; const hist = new Map();
  for (let x = 0; x < w; x++) { const i = ((h - 1) * w + x) * 4, k = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]; hist.set(k, (hist.get(k) || 0) + 1); }
  const [k0] = [...hist.entries()].sort((a, b) => b[1] - a[1])[0], bg = [k0 >> 16, (k0 >> 8) & 255, k0 & 255];
  const frac = y => { let n = 0; for (let x = 0; x < w; x++) if (near(data, (y * w + x) * 4, bg)) n++; return n / w; };
  let y = h - 1; while (y > 0 && frac(y) >= t.barRowFrac) y--;
  let border = 0; while (border < t.barBorderMax * scale && y - border > 0) { const yy = y - border; let uni = 0; const r = (yy * w) * 4; for (let x = 0; x < w; x++) if (near(data, (yy * w + x) * 4, [data[r], data[r + 1], data[r + 2]], 2)) uni++; if (uni / w >= 0.9 && !near(data, r, bg, 2)) border++; else break; }
  const top = y + 1 - border, height = (h - top) / scale;
  if (height < t.barMin || height > t.barMax) return { found: false, height: +height.toFixed(1), bg: rgb2hex(bg) };
  // icon: cột có điểm khác nền trong dải [top+2, top+iconBand] ; nhóm cột liền nhau
  const y0 = top + Math.ceil((border ? 2 + border : 2) * scale / 1), y1 = Math.min(h, top + Math.round(t.iconBand * scale)); const cols = new Uint8Array(w);
  for (let yy = y0; yy < y1; yy++) for (let x = 0; x < w; x++) if (!cols[x] && !near(data, (yy * w + x) * 4, bg, 12)) cols[x] = 1;
  const groups = []; let s = -1, gap = 0; const mg = t.iconGap * scale;
  for (let x = 0; x <= w; x++) { if (x < w && cols[x]) { if (s < 0) s = x; gap = 0; } else if (s >= 0 && (++gap > mg || x === w)) { groups.push([s / scale, (x - gap) / scale]); s = -1; gap = 0; } }
  return { found: true, height: +height.toFixed(1), bg: rgb2hex(bg), tabs: groups.filter(g => g[1] - g[0] >= t.iconMin).length };
}
/** Hàng đầu tiên có nội dung khác nền góc trên trái (đơn vị 390). */
export function firstContentY(img, scale) {
  const { w, h, data } = img, c = [data[0], data[1], data[2]];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!near(data, (y * w + x) * 4, c, 6)) return +(y / scale).toFixed(1);
  return null;
}
/** Nút chính: thành phần liên thông lớn nhất của vùng đặc màu token `primary` có dạng nút (rộng ≥ btnMinW, cao btnH). Đo bán kính góc bằng đường chéo. */
export function primaryButton(img, solid, ids, clusters, pal, scale, t) {
  const prim = pal.find(p => p.name === 'primary'); if (!prim) return null;
  const okC = new Set(); clusters.forEach((c, i) => { if (deltaE2000(c.lab, prim.lab) <= t.paletteDE) okC.add(i); });
  const { w, h } = img, lab = new Int32Array(w * h), st = []; let best = null, id = 0;
  for (let s0 = 0; s0 < w * h; s0++) {
    if (lab[s0] || ids[s0] < 0 || !okC.has(ids[s0])) continue; id++; lab[s0] = id; st.length = 0; st.push(s0); let n = 0, x0 = w, x1 = 0, y0 = h, y1 = 0;
    while (st.length) { const p = st.pop(), x = p % w, y = (p - x) / w; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const q of [p - 1, p + 1, p - w, p + w]) if (q >= 0 && q < w * h && !lab[q] && ids[q] >= 0 && okC.has(ids[q]) && (Math.abs((q % w) - x) <= 1)) { lab[q] = id; st.push(q); } }
    const bw = (x1 - x0 + 1) / scale, bh = (y1 - y0 + 1) / scale;
    if (bw >= t.btnMinW && bh >= t.btnH[0] && bh <= t.btnH[1] && bw / bh >= 2 && (!best || n > best.n)) best = { n, id, x0, x1, y0, y1, bw, bh };
  }
  if (!best) return null;
  const corner = (cx, cy, sx, sy) => { for (let k = 0; k < Math.min(best.bw, best.bh) * scale / 2; k++) if (lab[(cy + sy * k) * w + (cx + sx * k)] === best.id) return k; return 0; };
  const k = Math.min(corner(best.x0, best.y0, 1, 1), corner(best.x1, best.y0, -1, 1), corner(best.x0, best.y1, 1, -1), corner(best.x1, best.y1, -1, -1)) + 1; // +1: viền chống răng cưa
  const rr = Math.min(best.bh / 2, (k / scale) * 3.414);
  return { x: +(best.x0 / scale).toFixed(1), y: +(best.y0 / scale).toFixed(1), w: +best.bw.toFixed(1), h: +best.bh.toFixed(1), radius: +rr.toFixed(1), pill: rr >= best.bh / 2 - 1 };
}
