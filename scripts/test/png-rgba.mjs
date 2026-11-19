// Hồi quy: Play từ chối icon PNG bảng màu (play-shots 01/11: "icon-512.png … type 3 (cần type 6)").
// scripts/lib/png-rgba.mjs phải đổi mọi PNG 8-bit (bảng màu + tRNS, RGB, xám, RGBA) sang RGBA 32-bit mà không đổi điểm ảnh.
import fs from 'fs';
import zlib from 'zlib';
import { decodePng, encodeRgba, toRgbaPng } from '../lib/png-rgba.mjs';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('✗ ' + m); } };
const crcTab = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = b => { let c = -1; for (const x of b) c = crcTab[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const tb = Buffer.from(t), o = Buffer.alloc(12 + d.length); o.writeUInt32BE(d.length); tb.copy(o, 4); d.copy(o, 8); o.writeUInt32BE(crc(Buffer.concat([tb, d])), 8 + d.length); return o; };
// PNG thủ công: kiểu màu ct, mỗi hàng dùng lần lượt bộ lọc 0..4 để phủ cả 5 bộ lọc
function makePng(w, h, ct, ch, rows, extra = []) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = ct;
  const stride = w * ch, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    const f = y % 5; raw[y * (stride + 1)] = f;
    for (let x = 0; x < stride; x++) {
      const v = rows[y * stride + x], a = x >= ch ? rows[y * stride + x - ch] : 0, b = y ? rows[(y - 1) * stride + x] : 0, c = x >= ch && y ? rows[(y - 1) * stride + x - ch] : 0;
      const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
      raw[y * (stride + 1) + 1 + x] = (v - pred) & 255;
    }
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), ...extra, chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const W = 7, H = 6, N = W * H;
// 1) bảng màu + tRNS (đúng ca icon brand/ bị lỗi)
const plte = Buffer.from([0, 77, 64, 255, 127, 80, 250, 250, 250]), trns = Buffer.from([0, 128]);
const idx = Buffer.from(Array.from({ length: N }, (_, i) => (i * 7) % 3));
const pal = toRgbaPng(makePng(W, H, 3, 1, idx, [chunk('PLTE', plte), chunk('tRNS', trns)]));
const d = decodePng(pal);
ok(pal[25] === 6 && d.width === W && d.height === H, 'bảng màu → phải ra kiểu 6, đúng kích thước');
for (let i = 0; i < N; i++) {
  const k = idx[i], e = [plte[k * 3], plte[k * 3 + 1], plte[k * 3 + 2], k < trns.length ? trns[k] : 255];
  if (!e.every((v, j) => d.rgba[i * 4 + j] === v)) { ok(false, `bảng màu: điểm ${i} lệch`); break; }
}
// 2) RGB, xám, xám+alpha, RGBA – giữ nguyên điểm ảnh
const rnd = n => Buffer.from(Array.from({ length: n }, (_, i) => (i * 37 + (i >> 3) * 11) & 255));
for (const [ct, ch] of [[2, 3], [0, 1], [4, 2], [6, 4]]) {
  const px = rnd(N * ch), out = decodePng(toRgbaPng(makePng(W, H, ct, ch, px)));
  let same = out.colorType === 6;
  for (let i = 0; i < N && same; i++) {
    const s = px.subarray(i * ch, i * ch + ch);
    const e = ct === 2 ? [...s, 255] : ct === 0 ? [s[0], s[0], s[0], 255] : ct === 4 ? [s[0], s[0], s[0], s[1]] : [...s];
    same = e.every((v, j) => out.rgba[i * 4 + j] === v);
  }
  ok(same, `kiểu ${ct}: điểm ảnh phải giữ nguyên sau khi đổi RGBA`);
}
// 3) bit 16 / xen kẽ → báo lỗi rõ, không âm thầm ra ảnh sai
const ih = makePng(2, 2, 6, 4, rnd(16)); const bad = Buffer.from(ih); bad[24] = 16; bad.writeUInt32BE(crc(bad.subarray(12, 29)), 29);
let threw = false; try { decodePng(bad); } catch { threw = true; } ok(threw, 'PNG 16-bit phải báo lỗi');
ok(encodeRgba(1, 1, Buffer.from([1, 2, 3, 4]))[25] === 6, 'encodeRgba ra kiểu 6');
// 4) icon Play thật trong brand/ đổi được sang 32-bit RGBA 512×512
const icon = decodePng(toRgbaPng(fs.readFileSync('brand/lexkite-icon-512.png')));
ok(icon.width === 512 && icon.height === 512 && icon.colorType === 6, 'brand/lexkite-icon-512.png → RGBA 512×512');
if (fails) process.exit(1);
console.log('✓ png-rgba: bảng màu/RGB/xám/RGBA → PNG 32-bit RGBA không đổi điểm ảnh; icon Play 512×512 hợp lệ');
