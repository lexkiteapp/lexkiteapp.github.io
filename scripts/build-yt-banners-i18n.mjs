#!/usr/bin/env node
// Banner YouTube 2560x1440 theo ngôn ngữ kênh (id th zh ja ko hi). Chữ khẩu hiệu/phụ đề dựng bằng resvg có shaping (Thái, Devanagari).
// Font CJK/Thái/Devanagari (Noto Sans, SIL OFL; Thái/Devanagari dùng bản tĩnh Bold+Medium vì resvg dàn sai bản variable) KHÔNG nằm trong repo: đặt vào YT_FONT_DIR (mặc định $TMPDIR/fonts), chỉ để dựng ảnh.
// Chạy: YT_FONT_DIR=/đường/dẫn node scripts/build-yt-banners-i18n.mjs [id th zh ja ko hi] → brand/social/channel-kit/youtube/i18n/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { C, COPY, DEPS, Resvg, sharp, svgDoc, lockup, lockupWidth, pill, coralGrad, sky, glow, sparkles, kit, FONT_DIR, OUT } from './build-social-kit.mjs';

const FD = process.env.YT_FONT_DIR || path.join(os.tmpdir(), 'fonts');
// head/sub: tệp font khẩu hiệu / phụ đề; bold = độ dày nét giả (tỷ lệ cỡ chữ) cho font variable chỉ có độ đậm mặc định
const BR = (f) => path.join(FONT_DIR, f);
const FONTS = {
  id: { head: BR('BricolageGrotesque-ExtraBold.ttf'), sub: BR('BeVietnamPro-SemiBold.ttf'), bold: 0 },
  th: { head: path.join(FD, 'NotoSansThai-Bold.ttf'), sub: path.join(FD, 'NotoSansThai-Medium.ttf'), bold: 0 },
  zh: { head: path.join(FD, 'NotoSansSC.ttf'), sub: path.join(FD, 'NotoSansSC.ttf'), bold: 0.035 },
  ja: { head: path.join(FD, 'NotoSansJP.ttf'), sub: path.join(FD, 'NotoSansJP.ttf'), bold: 0.035 },
  ko: { head: path.join(FD, 'NotoSansKR.ttf'), sub: path.join(FD, 'NotoSansKR.ttf'), bold: 0.035 },
  hi: { head: path.join(FD, 'NotoSansDevanagari-Bold.ttf'), sub: path.join(FD, 'NotoSansDevanagari-Medium.ttf'), bold: 0 },
};
// Dàn chữ bằng HarfBuzz (đúng dấu Thái, chữ ghép Devanagari) → đường vector
const hb = await import(pathToFileURL(path.join(DEPS, 'node_modules', 'harfbuzzjs', 'dist', 'index.mjs')).href); // cài: npm i harfbuzzjs --prefix $DEPS
const fontCache = new Map();
const FALLBACK = new Map();
for (const l of ['th', 'hi']) { FALLBACK.set(FONTS[l].head, BR('BeVietnamPro-Bold.ttf')); FALLBACK.set(FONTS[l].sub, BR('BeVietnamPro-SemiBold.ttf')); }
function hbFont(file) {
  if (!fontCache.has(file)) { const face = new hb.Face(new hb.Blob(fs.readFileSync(file))); fontCache.set(file, { font: new hb.Font(face), upem: face.upem }); }
  return fontCache.get(file);
}
// Chữ Latin/số trong câu Thái/Devanagari: font Noto của ngôn ngữ đó không có glyph → dùng Be Vietnam Pro (cắt theo đoạn)
function shape(str, file, size) {
  const parts = FALLBACK.has(file) ? str.normalize('NFC').split(/([A-Za-z0-9·—.-]+)/).filter(Boolean) : [str.normalize('NFC')];
  let x = 0; const d = [];
  for (const part of parts) {
    const f = FALLBACK.has(file) && /^[A-Za-z0-9·—.-]+$/.test(part) ? FALLBACK.get(file) : file;
    const { font, upem } = hbFont(f), buf = new hb.Buffer();
    buf.addText(part); buf.guessSegmentProperties(); hb.shape(font, buf);
    const infos = buf.getGlyphInfos(), pos = buf.getGlyphPositions(), k = size / upem;
    infos.forEach((g, i) => { const p = font.glyphToPath(g.codepoint); if (p) d.push(`<path transform="translate(${(x + pos[i].xOffset * k).toFixed(2)} ${(-pos[i].yOffset * k).toFixed(2)}) scale(${k} ${-k})" d="${p}"/>`); x += pos[i].xAdvance * k; });
  }
  return { width: x, body: d.join('') };
}
const fitSize = (str, file, max, w) => Math.min(max, (w / shape(str, file, 100).width) * 100);
const textPath = (str, file, size, x, y, fill, bold = 0, op = 1) => `<g transform="translate(${x} ${y})" fill="${fill}" fill-opacity="${op}"${bold ? ` stroke="${fill}" stroke-width="${(bold * size) / (size / hbFont(file).upem) / 1}" stroke-linejoin="round"` : ''}>${shape(str, file, size).body}</g>`;

function banner(lang) {
  const f = FONTS[lang], t = COPY[lang];
  const w = 2560, h = 1440, safe = { x: 507, y: 508, w: 1546, h: 423 };
  const H = safe.h, W = safe.w;
  const kitS = Math.min(H * 0.98, W * 0.3), gap = Math.max(W * 0.05, H * 0.12), tw = W - kitS - gap;
  const kx = safe.x + W - kitS, ky = safe.y + (H - kitS) / 2;
  const lh = Math.min(H * 0.19, tw / (lockupWidth(100) / 100));
  const hs = fitSize(t.tagline, f.head, H * 0.15, tw), ss = fitSize(t.sub, f.sub, H * 0.07, tw);
  const cs = Math.min(H * 0.046, ss * 0.72), chipH = cs * 2.1;
  const g1 = H * 0.1, g2 = H * 0.055, g3 = H * 0.085;
  const total = lh + g1 + hs * 1.1 + g2 + ss * 1.1 + g3 + chipH;
  let y = safe.y + (H - total) / 2, s = '';
  s += lockup(safe.x, y, lh).svg; y += lh + g1;
  s += textPath(t.tagline, f.head, hs, safe.x, y + hs * 0.9, C.paper, f.bold); y += hs * 1.1 + g2;
  s += textPath(t.sub, f.sub, ss, safe.x, y + ss * 0.88, C.sky, 0, 0.92); y += ss * 1.1 + g3;
  const cg = coralGrad(safe.x, 0, safe.x + tw * 0.5, 0);
  const url = pill(safe.x, y, COPY.url, { size: cs, font: 'heavy', fill: `url(#${cg.id})`, stroke: 'none', color: C.teal, ls: 0.01 });
  s += cg.def + url.svg + pill(safe.x + url.w + cs * 0.6, y, t.platforms, { size: cs, font: 'body', color: C.paper }).svg;
  const kcx = kx + kitS / 2, kcy = ky + kitS / 2;
  const bgS = sky(w, h, { gx: kcx / w, gy: Math.max(0.05, ky / h), ghost: { cx: safe.x - H * 0.15, cy: h * 0.62, w: H * 1.5 }, string: `M${kcx - kitS * 0.05} ${ky + kitS * 0.95} C ${kcx - kitS * 0.6} ${h * 1.02}, ${kcx + kitS * 0.4} ${h * 0.9}, ${kcx - kitS * 0.35} ${h + 40}` });
  const sp = sparkles([[kx - kitS * 0.08, ky + kitS * 0.16, kitS * 0.05], [kx + kitS * 1.02, ky + kitS * 0.08, kitS * 0.035, 0.6], [kx + kitS * 0.92, ky + kitS * 0.9, kitS * 0.028, 0.5]]);
  return svgDoc(w, h, bgS + glow(kcx, kcy, kitS * 0.75) + sp + kit(kx, ky, kitS, 'happy', -6) + s);
}

const langs = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FONTS);
const outDir = path.join(OUT, 'channel-kit', 'youtube', 'i18n'); fs.mkdirSync(outDir, { recursive: true });
const brand = fs.readdirSync(FONT_DIR).filter((x) => x.endsWith('.ttf')).map((x) => path.join(FONT_DIR, x));
for (const l of langs) {
  
  const png = new Resvg(banner(l), { fitTo: { mode: 'width', value: 2560 }, font: { loadSystemFonts: false, fontFiles: brand, defaultFontFamily: 'Be Vietnam Pro' }, shapeRendering: 2, textRendering: 1 }).render().asPng();
  const out = path.join(outDir, `lexkite-youtube-banner-${l}-2560x1440.jpg`);
  fs.writeFileSync(out, await sharp(png).withIccProfile('srgb').flatten({ background: C.teal }).jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer());
  console.log(out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
}
