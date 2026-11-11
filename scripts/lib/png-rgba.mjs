// Giải mã PNG 8-bit không xen kẽ (kiểu 0 xám, 2 RGB, 3 bảng màu + tRNS, 4 xám+alpha, 6 RGBA) → điểm ảnh RGBA,
// và mã hoá lại thành PNG 32-bit RGBA (kiểu 6). Không mất điểm ảnh – dùng cho icon Play (bắt buộc 32-bit có alpha)
// khi file nguồn trong brand/ được tối ưu thành PNG bảng màu. Chỉ dùng zlib của Node, không thư viện ngoài.
import zlib from 'zlib';

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = b => { let c = -1; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };

export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('không phải PNG');
  let p = 8, ihdr, plte, trns; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') ihdr = data; else if (type === 'PLTE') plte = data; else if (type === 'tRNS') trns = data; else if (type === 'IDAT') idat.push(data); else if (type === 'IEND') break;
    p += 12 + len;
  }
  const w = ihdr.readUInt32BE(0), h = ihdr.readUInt32BE(4), depth = ihdr[8], ct = ihdr[9], interlace = ihdr[12];
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct];
  if (depth !== 8 || !ch || interlace) throw new Error(`PNG chưa hỗ trợ: bit ${depth} kiểu ${ct} xen kẽ ${interlace}`);
  if (ct === 3 && !plte) throw new Error('PNG bảng màu thiếu PLTE');
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * ch, px = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), o = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? px[o + x - ch] : 0, b = y ? px[o - stride + x] : 0, c = x >= ch && y ? px[o - stride + x - ch] : 0;
      let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      else if (f !== 0) throw new Error('bộ lọc PNG lạ ' + f);
      px[o + x] = v & 255;
    }
  }
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const s = i * ch, d = i * 4;
    if (ct === 3) { const k = px[s]; if (k * 3 + 2 >= plte.length) throw new Error('chỉ số bảng màu vượt PLTE'); plte.copy(rgba, d, k * 3, k * 3 + 3); rgba[d + 3] = trns && k < trns.length ? trns[k] : 255; }
    else if (ct === 0 || ct === 4) { rgba.fill(px[s], d, d + 3); rgba[d + 3] = ct === 4 ? px[s + 1] : 255; }
    else { px.copy(rgba, d, s, s + 3); rgba[d + 3] = ct === 6 ? px[s + 3] : 255; }
  }
  return { width: w, height: h, colorType: ct, rgba };
}

function chunk(type, data) {
  const t = Buffer.from(type, 'latin1'), out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); t.copy(out, 4); data.copy(out, 8); out.writeUInt32BE(crc32(Buffer.concat([t, data])), 8 + data.length);
  return out;
}

export function encodeRgba(width, height, rgba) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const stride = width * 4, raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); // bộ lọc 0
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// PNG bất kỳ (8-bit) → PNG 32-bit RGBA, kiểm lại từng điểm ảnh trùng nguồn
export function toRgbaPng(buf) {
  const src = decodePng(buf), out = encodeRgba(src.width, src.height, src.rgba), back = decodePng(out);
  if (back.colorType !== 6 || !back.rgba.equals(src.rgba)) throw new Error('mã hoá lại RGBA lệch điểm ảnh');
  return out;
}
