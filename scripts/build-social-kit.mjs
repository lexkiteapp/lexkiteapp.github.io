#!/usr/bin/env node
// Bộ nhận diện mạng xã hội Lexkite: dựng SVG (chữ đã chuyển thành đường vector) → PNG/JPG đúng kích thước từng nền tảng.
// Chạy: node scripts/build-social-kit.mjs   (lần đầu tự cài @resvg/resvg-js, sharp, opentype.js vào thư mục tạm)
// Đổi slogan/chữ: sửa brand/social/src/copy.json rồi chạy lại.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRAND = path.join(ROOT, 'brand');
const OUT = path.join(BRAND, 'social');
const SRC = path.join(OUT, 'src');
const FONT_DIR = path.join(SRC, 'fonts');

// ---------- phụ thuộc (không thêm vào repo) ----------
const DEPS = process.env.SOCIAL_KIT_DEPS || path.join(os.tmpdir(), 'lexkite-social-deps');
const need = ['@resvg/resvg-js', 'sharp', 'opentype.js', 'qrcode'];
if (!need.every((d) => fs.existsSync(path.join(DEPS, 'node_modules', d)))) {
  fs.mkdirSync(DEPS, { recursive: true });
  console.log('Cài công cụ dựng ảnh vào', DEPS);
  execSync(`npm i --no-audit --no-fund --prefix "${DEPS}" --cache "${path.join(DEPS, '.npm')}" ${need.join(' ')}`, { stdio: 'inherit' });
}
const req = createRequire(path.join(DEPS, 'package.json'));
const { Resvg } = req('@resvg/resvg-js');
const sharp = req('sharp');
const opentype = req('opentype.js');

const COPY = JSON.parse(fs.readFileSync(path.join(SRC, 'copy.json'), 'utf8'));

// ---------- bảng màu: nguồn duy nhất brand/tokens.json (docs/BRAND-RULES.md) ----------
const TOKENS = JSON.parse(fs.readFileSync(path.join(BRAND, 'tokens.json'), 'utf8'));
const C = TOKENS.brand;

// ---------- phông (Google Fonts, SIL OFL 1.1) ----------
const loadFont = (f) => opentype.parse(fs.readFileSync(path.join(FONT_DIR, f)).buffer);
const F = {
  display: loadFont('BricolageGrotesque-ExtraBold.ttf'),
  heavy: loadFont('BeVietnamPro-ExtraBold.ttf'),
  bold: loadFont('BeVietnamPro-Bold.ttf'),
  body: loadFont('BeVietnamPro-SemiBold.ttf'),
  ipa: loadFont('NotoSans-Medium.ttf'),
};
// Tự dàn chữ từng glyph (getPath cả chuỗi của opentype.js 2.0 sinh toạ độ NaN với vài cặp ký tự); ls tính bằng px
function layout(s, font, size, ls = 0) {
  const f = F[font]; const k = size / f.unitsPerEm;
  const glyphs = [...s.normalize('NFC')].map((c) => f.charToGlyph(c));
  const pos = []; let x = 0;
  glyphs.forEach((g, i) => {
    pos.push(x);
    x += g.advanceWidth * k;
    if (i < glyphs.length - 1) { const kv = f.getKerningValue(g, glyphs[i + 1]); x += (Number.isFinite(kv) ? kv : 0) * k + ls; }
  });
  return { glyphs, pos, width: x };
}
const measure = (s, font, size, ls = 0) => layout(s, font, size, ls).width;
// toPathData() của opentype.js 2.0 đôi khi in ra NaN → tự ghi lệnh path
const n1 = (v) => Math.round(v * 10) / 10;
const pathData = (p) => p.commands.map((c) => c.type === 'Z' ? 'Z' : c.type === 'Q' ? `Q${n1(c.x1)} ${n1(c.y1)} ${n1(c.x)} ${n1(c.y)}` : c.type === 'C' ? `C${n1(c.x1)} ${n1(c.y1)} ${n1(c.x2)} ${n1(c.y2)} ${n1(c.x)} ${n1(c.y)}` : `${c.type}${n1(c.x)} ${n1(c.y)}`).join('');
// Chữ → <path>; anchor: start | middle | end; y là đường chân chữ.
function text(s, { x = 0, y = 0, font = 'body', size = 32, fill = C.paper, anchor = 'start', ls = 0, opacity } = {}) {
  const L = layout(s, font, size, ls);
  const x0 = anchor === 'middle' ? x - L.width / 2 : anchor === 'end' ? x - L.width : x;
  const d = L.glyphs.map((g, i) => pathData(g.getPath(x0 + L.pos[i], y, size, {}, F[font]))).join('');
  return `<path d="${d}" fill="${fill}"${opacity != null ? ` opacity="${opacity}"` : ''}/>`;
}
// Cỡ chữ lớn nhất ≤ max sao cho vừa maxW
const fit = (s, font, max, maxW, lsEm = 0) => Math.min(max, (maxW / measure(s, font, 100, lsEm * 100)) * 100);
function wrap(s, font, size, maxW) {
  const out = []; let line = '';
  for (const w of s.split(/\s+/)) {
    const t = line ? `${line} ${w}` : w;
    if (line && measure(t, font, size) > maxW) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}

let uid = 0;
const id = (p) => `${p}${++uid}`;

// ---------- logo ----------
const MARK = `<path d="M58 54 C46 40 26 30 4 30 C6 44 9 58 12 70 C30 68 46 72 58 84 Z" fill="url(#pg)"/><path d="M62 54 C74 40 94 30 116 30 C114 44 111 58 108 70 C90 68 74 72 62 84 Z" fill="url(#pg2)"/><path d="M52 56 C42 47 29 41 14 40 M52 64 C42 56 30 51 16 51 M52 72 C42 66 31 62 18 62 M68 56 C78 47 91 41 106 40 M68 64 C78 56 90 51 104 51 M68 72 C78 66 89 62 102 62" stroke="#FFE7C2" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/><path d="M54 80 C52 92 46 102 34 113 C49 109 57 101 60 94 C63 101 71 109 86 113 C74 102 68 92 66 80 Z" fill="#FFC94A"/><circle cx="60" cy="42" r="11" fill="#FFC94A"/><path d="M61 33 l8 -5 l-2 8 Z" fill="#FFC94A"/><circle cx="63.5" cy="40" r="2.3" fill="#0F3D3E"/>`;
const MARK_MONO_D = 'M58 54 C46 40 26 30 4 30 C6 44 9 58 12 70 C30 68 46 72 58 84 Z M62 54 C74 40 94 30 116 30 C114 44 111 58 108 70 C90 68 74 72 62 84 Z M54 80 C52 92 46 102 34 113 C49 109 57 101 60 94 C63 101 71 109 86 113 C74 102 68 92 66 80 Z M60 31 a11 11 0 1 0 0.01 0 Z M61 33 l8 -5 l-2 8 Z';
// Vẽ từng mảng riêng để chỗ chồng nhau (đầu + mỏ) không bị thủng theo quy tắc nonzero
const monoPaths = (fill) => MARK_MONO_D.split(/ (?=M)/).map((d) => `<path d="${d}" fill="${fill}"/>`).join('');
const MARK_DEFS = `<linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB054"/><stop offset="1" stop-color="#F2553B"/></linearGradient><linearGradient id="pg2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB054"/><stop offset="1" stop-color="#F2553B"/></linearGradient>`;
// Vùng chứa thật của dấu hiệu trong hộp 120: x 4–116, y 28–113 → tâm (60, 70.5)
const MARK_BOX = { x: 4, y: 28, w: 112, h: 85 };
function mark(x, y, s, mono) {
  const inner = mono ? monoPaths(mono) : MARK;
  return `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 120 120">${inner}</svg>`;
}
// Đặt dấu hiệu theo vùng chứa thật: (cx, cy) là tâm, cw là bề rộng hiển thị
function markCentered(cx, cy, cw, mono) {
  const s = (cw * 120) / MARK_BOX.w;
  return mark(cx - (60 * s) / 120, cy - (70.5 * s) / 120, s, mono);
}
// Wordmark "lex" + "kite" (gradient như .wordmark b trong web/css/style.css)
function wordmark(x, y, size, { lex = C.paper, kite = 'grad', anchor = 'start' } = {}) {
  const ls = -0.035 * size;
  const wLex = measure('lex', 'display', size, ls) + ls;
  const wAll = measure('lexkite', 'display', size, ls);
  const x0 = anchor === 'middle' ? x - wAll / 2 : anchor === 'end' ? x - wAll : x;
  let fillK = kite;
  let defs = '';
  if (kite === 'grad') {
    const g = id('wm');
    defs = `<defs><linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="${x0 + wLex}" y1="0" x2="${x0 + wAll}" y2="0"><stop offset="0" stop-color="${C.coralUI}"/><stop offset="1" stop-color="${C.apricot}"/></linearGradient></defs>`;
    fillK = `url(#${g})`;
  }
  return { svg: defs + text('lex', { x: x0, y, font: 'display', size, fill: lex, ls }) + text('kite', { x: x0 + wLex, y, font: 'display', size, fill: fillK, ls }), w: wAll };
}
// Logo ngang: dấu hiệu cao h + wordmark (tỉ lệ giống brand/lexkite-logo-*.svg)
const lockupWidth = (h) => h * 1.1 + measure('lexkite', 'display', h * 0.733, -0.035 * h * 0.733);
function lockup(x, y, h, theme = 'dark') {
  const lex = theme === 'dark' ? C.paper : theme === 'light' ? C.teal : theme;
  const kite = theme === 'dark' || theme === 'light' ? 'grad' : theme;
  const m = theme === 'dark' || theme === 'light' ? mark(x, y, h) : mark(x, y, h, theme);
  return { svg: m + wordmark(x + h * 1.1, y + h * 0.733, h * 0.733, { lex, kite }).svg, w: lockupWidth(h) };
}

// ---------- linh vật Kit (nguồn thật: web/js/kit.js – bản trong app) ----------
const kitCtx = { self: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'web/js/kit.js'), 'utf8'), kitCtx);
const kitSvg = (m) => kitCtx.self.Kit.svg(m, 512, false).replace(/ class=""/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\n\s*/g, '');
// Đồng bộ brand/kit-*.svg với app để không ai dùng nhầm bản cũ
for (const m of ['happy', 'win', 'cheer', 'think', 'sad', 'sleep']) fs.writeFileSync(path.join(BRAND, `kit-${m}.svg`), kitSvg(m).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ') + '\n');
const KIT = {};
for (const k of ['happy', 'cheer', 'win', 'sad', 'think', 'sleep']) KIT[k] = kitSvg(k).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
// Kit thân teal đậm → viền sáng kiểu sticker để nổi trên nền teal
const HALO = `<filter id="kithalo" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="dilate" radius="2.6" result="d"/><feFlood flood-color="${C.paper}"/><feComposite in2="d" operator="in" result="o"/><feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
const kit = (x, y, s, k = 'happy', rot = 0) => `<g transform="rotate(${rot} ${x + s / 2} ${y + s / 2})"><svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="-4 -4 128 128" overflow="visible"><g filter="url(#kithalo)">${KIT[k]}</g></svg></g>`;
function glow(cx, cy, r, color = C.sun, a = 0.22) {
  const g = id('gl');
  return `<defs><radialGradient id="${g}"><stop offset="0" stop-color="${color}" stop-opacity="${a}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${g})"/>`;
}

// ---------- nền ----------
// Bầu trời teal (như hero của brand kit) + mây mờ + dấu hiệu chìm + dây diều nét đứt
function sky(w, h, { gx = 0.82, gy = 0.12, string = null, ghost = null, clouds = true } = {}) {
  const g = id('bg');
  const r = Math.hypot(w, h) * 0.85;
  let s = `<defs><radialGradient id="${g}" gradientUnits="userSpaceOnUse" cx="${w * gx}" cy="${h * gy}" r="${r}"><stop offset="0" stop-color="${C.tealGlow}"/><stop offset=".5" stop-color="${C.teal}"/><stop offset="1" stop-color="${C.tealDeep}"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#${g})"/>`;
  const u = Math.min(w, h);
  if (clouds) {
    const cl = [[0.08, 0.2, 0.22], [0.62, 0.08, 0.3], [0.74, 0.84, 0.26], [0.2, 0.9, 0.18]];
    for (const [cx, cy, cw] of cl) s += `<rect x="${w * cx}" y="${h * cy}" width="${u * cw * 1.6}" height="${u * cw * 0.34}" rx="${u * cw * 0.17}" fill="#fff" opacity=".045"/>`;
  }
  if (ghost) s += `<g opacity=".05" transform="rotate(-10 ${ghost.cx} ${ghost.cy})">${markCentered(ghost.cx, ghost.cy, ghost.w, '#FFFFFF')}</g>`;
  if (string) s += `<path d="${string}" fill="none" stroke="${C.sun}" stroke-width="${Math.max(2, u * 0.0045)}" stroke-dasharray="${u * 0.012} ${u * 0.016}" stroke-linecap="round" opacity=".45"/>`;
  return s;
}
function sparkles(list) {
  // ngôi sao 4 cánh nhỏ màu nắng
  return list.map(([x, y, r, o = 0.8]) => `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z" fill="${C.sun}" opacity="${o}"/>`).join('');
}
function pill(x, y, label, { size = 28, font = 'bold', fill = 'none', stroke = 'rgba(255,255,255,.28)', color = C.paper, padX = 0.8, h = 2.1, ls = 0.02, anchor = 'start' } = {}) {
  const tw = measure(label, font, size, ls * size);
  const w = tw + size * padX * 2;
  const hh = size * h;
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  const sw = Math.max(1.5, size * 0.07);
  const rect = `<rect x="${x0 + (stroke !== 'none' ? sw / 2 : 0)}" y="${y + (stroke !== 'none' ? sw / 2 : 0)}" width="${w - (stroke !== 'none' ? sw : 0)}" height="${hh - (stroke !== 'none' ? sw : 0)}" rx="${hh / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${stroke !== 'none' ? sw : 0}"/>`;
  return { svg: rect + text(label, { x: x0 + size * padX, y: y + hh / 2 + size * 0.36, font, size, fill: color, ls: ls * size }), w, h: hh };
}
const coralGrad = (x1, y1, x2, y2) => {
  const g = id('cg');
  return { id: g, def: `<defs><linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${C.apricot}"/><stop offset=".55" stop-color="${C.coralMid}"/><stop offset="1" stop-color="${C.coral}"/></linearGradient></defs>` };
};
const svgDoc = (w, h, body, bg = true) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${MARK_DEFS}${HALO}</defs>${body}</svg>`;

// ---------- bố cục ảnh bìa ngang (dùng chung FB/YT/X/LinkedIn/Zalo/sự kiện/link) ----------
function coverArt(w, h, safe, { lang = 'en', kitName = 'happy', ghostSide = 'left' } = {}) {
  const t = COPY[lang];
  const H = safe.h, W = safe.w;
  const kitS = Math.min(H * 0.98, W * 0.3);
  const gap = Math.max(W * 0.05, H * 0.12);
  const tw = W - kitS - gap;
  const kx = safe.x + W - kitS, ky = safe.y + (H - kitS) / 2;
  // cỡ chữ theo chiều cao vùng an toàn, co lại nếu không vừa bề ngang
  let lh = H * 0.19;
  lh = Math.min(lh, tw / (lockupWidth(100) / 100));
  const hs = fit(t.tagline, 'display', H * 0.15, tw, -0.02);
  const ss = fit(t.sub, 'body', H * 0.07, tw);
  const cs = Math.min(H * 0.046, ss * 0.72);
  const g1 = H * 0.1, g2 = H * 0.055, g3 = H * 0.085;
  const chipH = cs * 2.1;
  const total = lh + g1 + hs * 0.95 + g2 + ss * 1.05 + g3 + chipH;
  let y = safe.y + (H - total) / 2;
  let s = '';
  s += lockup(safe.x, y, lh).svg; y += lh + g1;
  s += text(t.tagline, { x: safe.x, y: y + hs * 0.76, font: 'display', size: hs, fill: C.paper, ls: -0.02 * hs }); y += hs * 0.95 + g2;
  s += text(t.sub, { x: safe.x, y: y + ss * 0.82, font: 'body', size: ss, fill: C.sky, opacity: 0.92 }); y += ss * 1.05 + g3;
  const cg = coralGrad(safe.x, 0, safe.x + tw * 0.5, 0);
  const url = pill(safe.x, y, COPY.url, { size: cs, font: 'heavy', fill: `url(#${cg.id})`, stroke: 'none', color: C.teal, ls: 0.01 });
  s += cg.def + url.svg;
  s += pill(safe.x + url.w + cs * 0.6, y, t.platforms, { size: cs, font: 'body', color: C.paper }).svg;
  // Kit + quầng sáng + dây diều
  const kcx = kx + kitS / 2, kcy = ky + kitS / 2;
  const bgS = sky(w, h, {
    gx: (kcx / w), gy: Math.max(0.05, (ky / h)),
    ghost: { cx: ghostSide === 'left' ? safe.x - H * 0.15 : w - H * 0.2, cy: h * 0.62, w: H * 1.5 },
    string: `M${kcx - kitS * 0.05} ${ky + kitS * 0.95} C ${kcx - kitS * 0.6} ${h * 1.02}, ${kcx + kitS * 0.4} ${h * 0.9}, ${kcx - kitS * 0.35} ${h + 40}`,
  });
  const sp = sparkles([[kx - kitS * 0.08, ky + kitS * 0.16, kitS * 0.05], [kx + kitS * 1.02, ky + kitS * 0.08, kitS * 0.035, 0.6], [kx + kitS * 0.92, ky + kitS * 0.9, kitS * 0.028, 0.5]]);
  return bgS + glow(kcx, kcy, kitS * 0.75) + sp + kit(kx, ky, kitS, kitName, -6) + s;
}

// ---------- ảnh đại diện ----------
function avatarSvg(n, { ring = false } = {}) {
  const g = id('av');
  let s = `<defs><radialGradient id="${g}" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="${C.tealGlow}"/><stop offset=".62" stop-color="${C.teal}"/><stop offset="1" stop-color="${C.tealDeep}"/></radialGradient></defs><rect width="${n}" height="${n}" fill="url(#${g})"/>`;
  if (ring) s += `<circle cx="${n / 2}" cy="${n / 2}" r="${n * 0.47}" fill="none" stroke="${C.sun}" stroke-opacity=".35" stroke-width="${n * 0.012}"/>`;
  s += markCentered(n / 2, n / 2 + n * 0.01, n * 0.62);
  return svgDoc(n, n, s);
}
// Watermark YouTube: dấu hiệu trên đĩa teal tròn, nền trong suốt
function ytWatermarkSvg(n) {
  return svgDoc(n, n, `<circle cx="${n / 2}" cy="${n / 2}" r="${n / 2 - 1}" fill="${C.teal}"/>` + markCentered(n / 2, n / 2 + n * 0.01, n * 0.64));
}

// ---------- mẫu bài đăng ----------
function header(w, pad, label, lh = 64) {
  const l = lockup(pad, pad, lh);
  const p = pill(w - pad, pad + (lh - lh * 0.3 * 2.1) / 2, label, { size: lh * 0.3, font: 'heavy', stroke: C.sun, color: C.sun, anchor: 'end', ls: 0.12 });
  return l.svg + p.svg;
}
function footer(w, h, pad, right) {
  const y = h - pad;
  return `<rect x="${pad}" y="${y - 58}" width="${w - pad * 2}" height="1.5" fill="#fff" opacity=".14"/>` +
    text(COPY.url, { x: pad, y: y - 6, font: 'heavy', size: 30, fill: C.paper }) +
    text(right, { x: w - pad, y: y - 6, font: 'body', size: 24, fill: C.sky, anchor: 'end', opacity: 0.85 });
}
function wordOfDaySvg(w, h, { top = 0, bottom = 0 } = {}) {
  const d = COPY.wordOfDay; const pad = 80;
  const y0 = top, H = h - top - bottom; // vùng nội dung (story: chừa thanh trên/dưới)
  let s = sky(w, h, { gx: 0.9, gy: 0.05, ghost: { cx: w * 0.86, cy: y0 + H * 0.5, w: w * 0.7 } });
  s += `<g transform="translate(0 ${y0})">` + header(w, pad, d.label) + '</g>';
  const tall = H > 1300;
  const ws = fit(d.word, 'display', tall ? 200 : 170, w - pad * 2, -0.03);
  let y = y0 + (tall ? 420 : 300);
  s += text(d.word, { x: pad, y, font: 'display', size: ws, fill: C.paper, ls: -0.03 * ws });
  y += tall ? 92 : 76;
  s += text(d.ipa, { x: pad, y, font: 'ipa', size: 44, fill: C.sky });
  const ipaW = measure(d.ipa, 'ipa', 44);
  const cg = coralGrad(0, 0, 400, 0);
  s += cg.def + pill(pad + ipaW + 24, y - 40, d.pos, { size: 26, font: 'heavy', fill: `url(#${cg.id})`, stroke: 'none', color: C.teal }).svg;
  y += tall ? 110 : 84;
  for (const ln of wrap(d.definition, 'bold', 46, w - pad * 2 - 40)) { s += text(ln, { x: pad, y, font: 'bold', size: 46, fill: C.paper }); y += 62; }
  y += 6;
  s += text(d.vi, { x: pad, y, font: 'bold', size: 38, fill: C.sun }); y += tall ? 96 : 72;
  const ex = wrap(`“${d.example}”`, 'body', 34, w - pad * 2 - 80);
  const bh = ex.length * 48 + 44;
  s += `<rect x="${pad}" y="${y - 44}" width="${w - pad * 2}" height="${bh}" rx="22" fill="#fff" opacity=".07"/><rect x="${pad}" y="${y - 44}" width="8" height="${bh}" rx="4" fill="${C.sun}"/>`;
  ex.forEach((ln, i) => { s += text(ln, { x: pad + 36, y: y + i * 48, font: 'body', size: 34, fill: C.paper, opacity: 0.92 }); });
  const kS = tall ? 260 : 190;
  s += glow(w - pad - kS / 2, y0 + H - 150 - kS / 2, kS * 0.8) + kit(w - pad - kS + 20, y0 + H - 130 - kS, kS, 'happy', 8);
  s += `<g transform="translate(0 ${y0 + H - h})">` + footer(w, h, pad, d.level) + '</g>';
  return svgDoc(w, h, s);
}
function quizSvg(w, h) {
  const q = COPY.quiz; const pad = 80;
  let s = sky(w, h, { gx: 0.15, gy: 0.05, ghost: { cx: w * 0.9, cy: h * 0.3, w: w * 0.6 } });
  s += header(w, pad, q.label);
  let y = 300;
  for (const ln of wrap(q.question, 'display', 68, w - pad * 2)) { s += text(ln, { x: pad, y, font: 'display', size: 68, fill: C.paper, ls: -1.2 }); y += 82; }
  y += 50;
  const cg = coralGrad(pad, 0, pad + 96, 96);
  s += cg.def;
  q.options.forEach((o, i) => {
    const bh = 128;
    s += `<rect x="${pad}" y="${y}" width="${w - pad * 2}" height="${bh}" rx="30" fill="#fff" fill-opacity=".07" stroke="#fff" stroke-opacity=".16" stroke-width="2"/>`;
    s += `<circle cx="${pad + 70}" cy="${y + bh / 2}" r="38" fill="url(#${cg.id})" transform="translate(0 ${0})"/>`;
    s += text('ABC'[i], { x: pad + 70, y: y + bh / 2 + 14, font: 'heavy', size: 38, fill: C.teal, anchor: 'middle' });
    s += text(o, { x: pad + 136, y: y + bh / 2 + 19, font: 'display', size: 54, fill: C.paper, ls: -0.5 });
    y += bh + 28;
  });
  const kS = 230;
  s += glow(w - pad - 90, h - 250, 200) + kit(w - pad - kS + 30, h - 140 - kS, kS, 'cheer', -6);
  s += text(q.answerHint, { x: pad, y: h - 200, font: 'heavy', size: 40, fill: C.sun });
  s += footer(w, h, pad, COPY.en.sub);
  return svgDoc(w, h, s);
}
function promoSvg(w, h) {
  const p = COPY.promo; const pad = 80;
  let s = sky(w, h, { gx: 0.78, gy: 0.55, string: `M${w * 0.72} ${h * 0.78} C ${w * 0.5} ${h * 0.95}, ${w * 0.9} ${h * 1.0}, ${w * 0.6} ${h + 30}` });
  s += header(w, pad, p.label);
  const ts = fit(p.title2, 'display', 92, w - pad * 2, -0.02);
  s += text(p.title, { x: pad, y: 330, font: 'display', size: ts, fill: C.paper, ls: -0.02 * ts });
  const g = coralGrad(pad, 0, pad + measure(p.title2, 'display', ts), 0);
  s += g.def + text(p.title2, { x: pad, y: 330 + ts * 1.08, font: 'display', size: ts, fill: `url(#${g.id})`, ls: -0.02 * ts });
  let y = 330 + ts * 1.08 + 80;
  for (const ln of wrap(p.body, 'body', 36, 560)) { s += text(ln, { x: pad, y, font: 'body', size: 36, fill: C.sky }); y += 50; }
  y += 40;
  let x = pad;
  for (const e of ['IELTS', 'TOEIC', 'TOEFL']) { const c = pill(x, y, e, { size: 28, font: 'heavy', stroke: C.sun, color: C.sun, ls: 0.08 }); s += c.svg; x += c.w + 16; }
  const kS = 400;
  s += glow(w - 270, h * 0.62, 300) + sparkles([[w - 90, h * 0.4, 20], [w - 440, h * 0.8, 14, 0.6]]) + kit(w - kS - 40, h * 0.62 - kS / 2, kS, 'win', -4);
  s += footer(w, h, pad, COPY.en.platforms);
  return svgDoc(w, h, s);
}

// ---------- ảnh bìa video dọc (TikTok / Reels) ----------
function verticalCoverSvg(w, h, area) {
  // area: vùng nội dung an toàn {x,y,w,h}
  const v = COPY.videoCover;
  let s = sky(w, h, { gx: 0.5, gy: 0.35, ghost: { cx: w * 0.2, cy: h * 0.82, w: w * 0.9 } });
  const cx = area.x + area.w / 2;
  let y = area.y;
  s += lockup(cx - lockupWidth(70) / 2, y, 70).svg; y += 70 + 70;
  s += pill(cx, y, v.kicker, { size: 30, font: 'heavy', stroke: C.sun, color: C.sun, ls: 0.14, anchor: 'middle' }).svg; y += 63 + 40;
  const kS = 340;
  s += glow(cx, y + kS / 2, kS * 0.85) + kit(cx - kS / 2, y, kS, 'win', -4); y += kS + 20;
  const g = coralGrad(cx - 200, y, cx + 200, y + 340);
  s += g.def + text(v.big, { x: cx, y: y + 300, font: 'display', size: 400, fill: `url(#${g.id})`, anchor: 'middle', ls: -12 }); y += 320 + 20;
  s += text(v.title, { x: cx, y: y + 80, font: 'display', size: 104, fill: C.paper, anchor: 'middle', ls: -2 }); y += 104;
  const ts = fit(v.title2, 'display', 170, area.w - 40, -0.025);
  s += text(v.title2, { x: cx, y: y + ts * 0.8, font: 'display', size: ts, fill: C.sun, anchor: 'middle', ls: -0.025 * ts }); y += ts * 0.95 + 40;
  s += pill(cx, y, v.foot, { size: 30, font: 'body', color: C.paper, anchor: 'middle' }).svg;
  return svgDoc(w, h, s);
}

// ---------- Story Highlights ----------
const ICONS = {
  aa: () => text('Aa', { x: 50, y: 66, font: 'display', size: 56, fill: C.paper, anchor: 'middle', ls: -1 }) + `<path d="M24 78 H76" stroke="${C.sun}" stroke-width="7" stroke-linecap="round"/>`,
  cap: () => `<path d="M50 24 L90 42 L50 60 L10 42 Z" fill="${C.paper}"/><path d="M28 51 V68 C28 76 72 76 72 68 V51 L50 61 Z" fill="${C.paper}" opacity=".85"/><path d="M84 45 V66" stroke="${C.sun}" stroke-width="5" stroke-linecap="round"/><circle cx="84" cy="70" r="5.5" fill="${C.sun}"/>`,
  case: () => `<rect x="14" y="34" width="72" height="48" rx="10" fill="${C.paper}"/><path d="M38 34 V27 C38 24 40 22 43 22 H57 C60 22 62 24 62 27 V34" fill="none" stroke="${C.paper}" stroke-width="7"/><rect x="14" y="52" width="72" height="6" fill="${C.teal}" opacity=".55"/><rect x="44" y="49" width="12" height="12" rx="3" fill="${C.sun}"/>`,
  bulb: () => `<path d="M50 14 C33 14 22 27 22 41 C22 52 28 58 34 64 C37 67 38 70 38 74 H62 C62 70 63 67 66 64 C72 58 78 52 78 41 C78 27 67 14 50 14 Z" fill="${C.paper}"/><rect x="38" y="78" width="24" height="6" rx="3" fill="${C.paper}"/><rect x="42" y="87" width="16" height="5" rx="2.5" fill="${C.paper}"/><path d="M42 44 L50 54 L58 44" fill="none" stroke="${C.sun}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  phone: () => `<rect x="28" y="10" width="44" height="80" rx="11" fill="${C.paper}"/><rect x="33" y="19" width="34" height="58" rx="5" fill="${C.teal}"/>${markCentered(50, 48, 28)}<rect x="44" y="82" width="12" height="3" rx="1.5" fill="${C.teal}" opacity=".5"/>`,
  star: () => `<path d="M50 12 L61 36 L87 39 L67 57 L73 83 L50 70 L27 83 L33 57 L13 39 L39 36 Z" fill="${C.paper}" stroke="${C.paper}" stroke-width="4" stroke-linejoin="round"/><path d="M50 30 L56 44 L71 46 L60 56 L63 71 L50 64" fill="${C.sun}"/>`,
};
function highlightSvg(icon) {
  const w = 1080, h = 1920, cx = w / 2, cy = h / 2;
  const g = id('hl');
  let s = `<defs><radialGradient id="${g}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy - 200}" r="1300"><stop offset="0" stop-color="${C.tealGlow}"/><stop offset=".5" stop-color="${C.teal}"/><stop offset="1" stop-color="${C.tealDeep}"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#${g})"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="400" fill="#fff" opacity=".05"/><circle cx="${cx}" cy="${cy}" r="400" fill="none" stroke="${C.sun}" stroke-opacity=".5" stroke-width="10"/>`;
  s += sparkles([[cx + 300, cy - 300, 26], [cx - 330, cy + 250, 16, 0.6]]);
  s += `<svg x="${cx - 240}" y="${cy - 240}" width="480" height="480" viewBox="0 0 100 100"><defs>${MARK_DEFS}</defs>${ICONS[icon]()}</svg>`;
  return svgDoc(w, h, s);
}

// ---------- YouTube ----------
function thumbnailSvg(w = 1280, h = 720) {
  const t = COPY.thumbnail; const pad = 64;
  let s = sky(w, h, { gx: 0.78, gy: 0.4, clouds: false, ghost: { cx: w * 0.12, cy: h * 0.86, w: 520 } });
  // khung chéo san hô phía sau Kit
  const cg = coralGrad(w * 0.55, 0, w, h);
  s += cg.def + `<path d="M${w * 0.62} 0 H${w} V${h} H${w * 0.5} Z" fill="url(#${cg.id})" opacity=".95"/>`;
  s += `<path d="M${w * 0.6} 0 L${w * 0.48} ${h}" stroke="${C.sun}" stroke-width="10"/>`;
  const kS = 520;
  s += glow(w - 270, h / 2, 320, '#FFFFFF', 0.3) + kit(w - kS - 10, h / 2 - kS / 2 + 10, kS, 'cheer', -8);
  s += text(t.big, { x: pad - 6, y: 300, font: 'display', size: 300, fill: C.sun, ls: -10 });
  const bigW = measure(t.big, 'display', 300, -10);
  s += pill(pad + bigW + 20, 112, t.badge, { size: 34, font: 'heavy', fill: C.paper, stroke: 'none', color: C.teal }).svg;
  const l1 = fit(t.line1, 'display', 118, w * 0.47 - pad, -0.02);
  s += text(t.line1, { x: pad, y: 300 + l1 * 1.02, font: 'display', size: l1, fill: C.paper, ls: -0.02 * l1 });
  s += text(t.line2, { x: pad, y: 300 + l1 * 1.02 + 86, font: 'heavy', size: 64, fill: C.sky });
  s += lockup(pad, h - pad - 52, 52).svg;
  return svgDoc(w, h, s);
}
function endscreenSvg(w = 1920, h = 1080) {
  const pad = 110;
  let s = sky(w, h, { gx: 0.5, gy: 0.0, ghost: { cx: w * 0.5, cy: h * 0.62, w: 1300 } });
  s += lockup(pad, 78, 76).svg;
  s += text(COPY.en.watchNext, { x: w / 2, y: 260, font: 'display', size: 84, fill: C.paper, anchor: 'middle', ls: -1.5 });
  // khung đặt phần tử màn hình kết thúc (YouTube Studio phủ video/nút đăng ký lên đúng chỗ này)
  const vw = 720, vh = 405, vy = 340;
  for (const vx of [w / 2 - vw - 40, w / 2 + 40]) {
    s += `<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" rx="18" fill="#000" fill-opacity=".22" stroke="#fff" stroke-opacity=".28" stroke-width="3" stroke-dasharray="14 12"/>`;
    s += `<path d="M${vx + vw / 2 - 28} ${vy + vh / 2 - 36} L${vx + vw / 2 + 40} ${vy + vh / 2} L${vx + vw / 2 - 28} ${vy + vh / 2 + 36} Z" fill="#fff" opacity=".25"/>`;
  }
  const sy = 905, r = 105;
  s += `<circle cx="${w / 2}" cy="${sy}" r="${r + 14}" fill="none" stroke="${C.sun}" stroke-width="6" stroke-dasharray="10 10" opacity=".8"/>`;
  s += `<circle cx="${w / 2}" cy="${sy}" r="${r}" fill="${C.teal}"/>` + markCentered(w / 2, sy + 2, r * 1.3);
  const cg = coralGrad(0, 0, 400, 0);
  s += cg.def + pill(w / 2 + r + 50, sy - 42, COPY.en.subscribe, { size: 40, font: 'heavy', fill: `url(#${cg.id})`, stroke: 'none', color: C.teal }).svg;
  s += kit(w / 2 - r - 50 - 210, sy - 120, 210, 'happy', 6);
  return svgDoc(w, h, s);
}

// ---------- watermark ----------
function wmMarkSvg(n, tone) {
  // light: trắng (đặt trên video tối); dark: teal (video sáng); color: màu gốc có viền sáng mờ
  const mono = tone === 'light' ? '#FFFFFF' : tone === 'dark' ? C.teal : null;
  return svgDoc(n, n, markCentered(n / 2, n / 2, n * 0.9, mono));
}
function wmLockupSvg(w, h, tone) {
  const lh = h * 0.8;
  const lw = lockupWidth(lh);
  const x = (w - lw) / 2, y = (h - lh) / 2;
  const l = tone === 'light' ? lockup(x, y, lh, 'dark') : lockup(x, y, lh, 'light');
  return svgDoc(w, h, l.svg);
}

// ---------- logo master ----------
function logoMasters() {
  const H = 140; const w = Math.ceil(lockupWidth(120) + 28); // giống viewBox 560x140 của brand/lexkite-logo-*.svg
  const lk = (theme, bg) => svgDoc(w, H, (bg ? `<rect width="${w}" height="${H}" rx="24" fill="${bg}"/>` : '') + lockup(14, 10, 120, theme).svg);
  return {
    'lexkite-mark.svg': svgDoc(120, 120, MARK),
    'lexkite-mark-white.svg': svgDoc(120, 120, monoPaths('#FFFFFF')),
    'lexkite-mark-teal.svg': svgDoc(120, 120, monoPaths(C.teal)),
    'lexkite-app-icon.svg': avatarSvg(1024),
    'lexkite-logo-horizontal-on-dark.svg': lk('dark'),
    'lexkite-logo-horizontal-on-dark-bg.svg': lk('dark', C.teal),
    'lexkite-logo-horizontal-on-light.svg': lk('light'),
    'lexkite-logo-horizontal-white.svg': lk('#FFFFFF'),
    'lexkite-logo-horizontal-teal.svg': lk(C.teal),
    'lexkite-logo-stacked-on-dark-bg.svg': (() => {
      const n = 600; const ww = wordmark(n / 2, 470, 120, { anchor: 'middle' });
      return svgDoc(n, n, `<rect width="${n}" height="${n}" rx="60" fill="${C.teal}"/>` + markCentered(n / 2, 250, 300) + ww.svg);
    })(),
  };
}
function clearspaceSvg() {
  // khoảng trống tối thiểu = ½ chiều cao dấu hiệu (x) ở mọi cạnh
  const h = 120, x = h / 2, lw = lockupWidth(h);
  const W = lw + x * 2 + 160, Hh = h + x * 2 + 160, ox = 80 + x, oy = 80 + x;
  let s = `<rect width="${W}" height="${Hh}" fill="${C.paper}"/>`;
  s += `<rect x="80" y="80" width="${lw + x * 2}" height="${h + x * 2}" fill="${C.coral}" fill-opacity=".08" stroke="${C.coral}" stroke-dasharray="8 6" stroke-width="2"/>`;
  s += `<rect x="${ox}" y="${oy}" width="${lw}" height="${h}" fill="none" stroke="${C.teal}" stroke-opacity=".35" stroke-width="1.5"/>`;
  s += lockup(ox, oy, h, 'light').svg;
  for (const [cx, cy] of [[80 + x / 2, oy + h / 2], [ox + lw + x / 2, oy + h / 2], [ox + h / 2, 80 + x / 2], [ox + h / 2, oy + h + x / 2]]) s += text('x', { x: cx, y: cy + 10, font: 'heavy', size: 30, fill: C.coral, anchor: 'middle' });
  s += text('x = ½ mark height · min. 24 px (mark) · 96 px (horizontal logo)', { x: W / 2, y: Hh - 26, font: 'body', size: 22, fill: C.teal, anchor: 'middle' });
  return svgDoc(W, Hh, s);
}

// ---------- vùng an toàn để vẽ hướng dẫn ----------
// type: safe (vùng nội dung) | view (vùng hiển thị theo thiết bị) | block (bị giao diện che) | circle (cắt tròn)
const ASSETS = [];
function add(platform, file, w, h, svg, { fmt = 'jpg', use, zones = [], q = 88, guide = false, maxKB } = {}) {
  ASSETS.push({ platform, file, w, h, svg, fmt, use, zones, q, guide, maxKB });
}
const circle = (n) => [{ type: 'circle', x: 0, y: 0, w: n, h: n, label: 'Circle crop' }];

function defineAssets() {
  const L = 'en';
  // Facebook
  const fbSafe = { x: 385, y: 56, w: 990, h: 460 };
  const fbZones = [
    { type: 'view', x: 0, y: 0, w: 1640, h: 624, label: 'Desktop 1640×624' },
    { type: 'view', x: 265, y: 0, w: 1110, h: 624, label: 'Mobile ≈1110×624' },
    { type: 'block', x: 30, y: 440, w: 330, h: 184, label: 'Profile photo' },
    { type: 'safe', ...fbSafe, label: 'Safe 990×460' },
  ];
  add('facebook', 'facebook-avatar-720x720.png', 720, 720, avatarSvg(720), { fmt: 'png', use: 'Page profile picture', zones: circle(720) });
  add('facebook', 'facebook-cover-1640x624.jpg', 1640, 624, svgDoc(1640, 624, coverArt(1640, 624, fbSafe, { lang: L })), { use: 'Page cover photo (EN)', zones: fbZones, guide: true, maxKB: 1024 });
  add('facebook', 'facebook-cover-vi-1640x624.jpg', 1640, 624, svgDoc(1640, 624, coverArt(1640, 624, fbSafe, { lang: 'vi' })), { use: 'Page cover photo (VI)', zones: fbZones, maxKB: 1024 });
  add('facebook', 'facebook-post-1080x1080.jpg', 1080, 1080, promoSvg(1080, 1080), { use: 'Feed post template (promo)' });
  const lnSafe = { x: 72, y: 64, w: 1056, h: 502 };
  add('facebook', 'facebook-link-1200x630.jpg', 1200, 630, svgDoc(1200, 630, coverArt(1200, 630, lnSafe, { lang: L })), { use: 'Link share / Open Graph image', zones: [{ type: 'safe', ...lnSafe, label: 'Safe' }] });
  const evSafe = { x: 140, y: 120, w: 1640, h: 765 };
  add('facebook', 'facebook-event-1920x1005.jpg', 1920, 1005, svgDoc(1920, 1005, coverArt(1920, 1005, evSafe, { lang: L, kitName: 'cheer' })), { use: 'Event cover', zones: [{ type: 'safe', ...evSafe, label: 'Safe' }] });

  // Instagram
  add('instagram', 'instagram-avatar-1080x1080.png', 1080, 1080, avatarSvg(1080), { fmt: 'png', use: 'Profile picture', zones: circle(1080) });
  add('instagram', 'instagram-post-word-1080x1080.jpg', 1080, 1080, wordOfDaySvg(1080, 1080), { use: 'Feed post template · Word of the day' });
  add('instagram', 'instagram-post-quiz-1080x1350.jpg', 1080, 1350, quizSvg(1080, 1350), { use: 'Feed post template 4:5 · Quiz', zones: [{ type: 'view', x: 0, y: 0, w: 1080, h: 1350, label: 'Feed 4:5' }, { type: 'safe', x: 34, y: 0, w: 1012, h: 1350, label: 'Grid 1012×1350' }] });
  const stZones = [
    { type: 'block', x: 0, y: 0, w: 1080, h: 250, label: 'Profile & progress bar' },
    { type: 'block', x: 0, y: 1670, w: 1080, h: 250, label: 'Reply bar' },
    { type: 'safe', x: 0, y: 250, w: 1080, h: 1420, label: 'Safe 1080×1420' },
  ];
  add('instagram', 'instagram-story-1080x1920.jpg', 1080, 1920, wordOfDaySvg(1080, 1920, { top: 250, bottom: 250 }), { use: 'Story template · Word of the day', zones: stZones, guide: true });
  const vArea = { x: 90, y: 270, w: 840, h: 1330 };
  add('instagram', 'instagram-reel-cover-1080x1920.jpg', 1080, 1920, verticalCoverSvg(1080, 1920, vArea), {
    use: 'Reel cover template', guide: true, zones: [
      { type: 'view', x: 0, y: 240, w: 1080, h: 1440, label: 'Profile grid 3:4' },
      { type: 'view', x: 0, y: 420, w: 1080, h: 1080, label: '1:1 crop' },
      { type: 'block', x: 0, y: 1620, w: 1080, h: 300, label: 'Caption & audio' },
      { type: 'safe', ...vArea, label: 'Safe' },
    ],
  });
  for (const hl of COPY.highlights) add('instagram', `instagram-highlight-${hl.key}-1080x1920.jpg`, 1080, 1920, highlightSvg(hl.icon), { use: `Highlight cover · ${hl.label}`, q: 90, zones: [{ type: 'circle', x: 140, y: 560, w: 800, h: 800, label: 'Highlight circle' }] });

  // TikTok
  add('tiktok', 'tiktok-avatar-1080x1080.png', 1080, 1080, avatarSvg(1080), { fmt: 'png', use: 'Profile photo', zones: circle(1080) });
  add('tiktok', 'tiktok-cover-1080x1920.jpg', 1080, 1920, verticalCoverSvg(1080, 1920, vArea), {
    use: 'Video cover template', guide: true, zones: [
      { type: 'block', x: 0, y: 0, w: 1080, h: 160, label: 'Top bar' },
      { type: 'block', x: 930, y: 700, w: 150, h: 970, label: 'Action buttons' },
      { type: 'block', x: 0, y: 1620, w: 1080, h: 300, label: 'Caption & sound' },
      { type: 'view', x: 0, y: 240, w: 1080, h: 1440, label: 'Profile grid 3:4' },
      { type: 'safe', ...vArea, label: 'Safe' },
    ],
  });

  // YouTube
  const ytSafe = { x: 507, y: 508, w: 1546, h: 423 };
  add('youtube', 'youtube-avatar-800x800.png', 800, 800, avatarSvg(800), { fmt: 'png', use: 'Channel picture', zones: circle(800) });
  add('youtube', 'youtube-banner-2560x1440.jpg', 2560, 1440, svgDoc(2560, 1440, coverArt(2560, 1440, ytSafe, { lang: L })), {
    use: 'Channel banner', guide: true, maxKB: 6144, zones: [
      { type: 'view', x: 0, y: 0, w: 2560, h: 1440, label: 'TV 2560×1440' },
      { type: 'view', x: 0, y: 508, w: 2560, h: 423, label: 'Desktop max 2560×423' },
      { type: 'view', x: 352, y: 508, w: 1855, h: 423, label: 'Tablet 1855×423' },
      { type: 'safe', ...ytSafe, label: 'Safe (all devices) 1546×423' },
    ],
  });
  add('youtube', 'youtube-watermark-150x150.png', 150, 150, ytWatermarkSvg(150), { fmt: 'png', use: 'Video watermark (Branding)', maxKB: 1024 });
  add('youtube', 'youtube-thumbnail-1280x720.jpg', 1280, 720, thumbnailSvg(), { use: 'Thumbnail template', maxKB: 2048, zones: [{ type: 'block', x: 1090, y: 650, w: 170, h: 54, label: 'Timestamp' }] });
  add('youtube', 'youtube-endscreen-1920x1080.jpg', 1920, 1080, endscreenSvg(), {
    use: 'End screen background (last 5–20 s)', zones: [
      { type: 'safe', x: 200, y: 340, w: 720, h: 405, label: 'Video 1' },
      { type: 'safe', x: 1000, y: 340, w: 720, h: 405, label: 'Video 2' },
      { type: 'circle', x: 855, y: 800, w: 210, h: 210, label: 'Subscribe' },
    ],
  });

  // Watermark video chung
  for (const tone of ['light', 'dark', 'color']) add('watermark', `lexkite-watermark-mark-${tone}-300x300.png`, 300, 300, wmMarkSvg(300, tone), { fmt: 'png', use: `Mark watermark · ${tone}` });
  for (const tone of ['light', 'dark']) add('watermark', `lexkite-watermark-horizontal-${tone}-720x180.png`, 720, 180, wmLockupSvg(720, 180, tone), { fmt: 'png', use: `Horizontal watermark · ${tone === 'light' ? 'for dark footage' : 'for light footage'}` });

  // X / LinkedIn / Zalo
  const xSafe = { x: 380, y: 70, w: 1060, h: 340 };
  add('x', 'x-avatar-400x400.png', 400, 400, avatarSvg(400), { fmt: 'png', use: 'Profile photo', zones: circle(400) });
  add('x', 'x-header-1500x500.jpg', 1500, 500, svgDoc(1500, 500, coverArt(1500, 500, xSafe, { lang: L, ghostSide: 'right' })), { use: 'Header', guide: true, zones: [{ type: 'block', x: 20, y: 330, w: 320, h: 170, label: 'Profile photo' }, { type: 'safe', ...xSafe, label: 'Safe' }] });
  const liSafe = { x: 420, y: 56, w: 1110, h: 284 };
  add('linkedin', 'linkedin-avatar-400x400.png', 400, 400, avatarSvg(400), { fmt: 'png', use: 'Logo / profile photo', zones: circle(400) });
  add('linkedin', 'linkedin-cover-1584x396.jpg', 1584, 396, svgDoc(1584, 396, coverArt(1584, 396, liSafe, { lang: L, ghostSide: 'right' })), { use: 'Cover / banner', guide: true, zones: [{ type: 'block', x: 24, y: 150, w: 340, h: 246, label: 'Profile photo' }, { type: 'safe', ...liSafe, label: 'Safe' }] });
  const zlSafe = { x: 70, y: 380, w: 1140, h: 640 };
  add('zalo', 'zalo-avatar-720x720.png', 720, 720, avatarSvg(720), { fmt: 'png', use: 'OA avatar', zones: circle(720) });
  add('zalo', 'zalo-cover-1280x1400.jpg', 1280, 1400, svgDoc(1280, 1400, coverArt(1280, 1400, zlSafe, { lang: 'vi' })), { use: 'OA cover (VI) – 2× of 640×700', guide: true, maxKB: 1024, zones: [{ type: 'view', x: 0, y: 360, w: 1280, h: 680, label: 'Visible 1280×680' }, { type: 'safe', ...zlSafe, label: 'Safe' }] });
}

// ---------- ảnh hướng dẫn vùng an toàn ----------
const ZC = { safe: C.mint, view: C.sky, block: '#FF5A5F', circle: C.sun };
function guideOverlay(a) {
  const u = Math.min(a.w, a.h);
  const fs1 = Math.max(16, u * 0.03);
  let s = '';
  const safe = a.zones.find((z) => z.type === 'safe');
  if (safe) s += `<path d="M0 0 H${a.w} V${a.h} H0 Z M${safe.x} ${safe.y} V${safe.y + safe.h} H${safe.x + safe.w} V${safe.y} Z" fill="#000" fill-opacity=".38" fill-rule="evenodd"/>`;
  a.zones.forEach((z, i) => {
    const col = ZC[z.type]; const sw = Math.max(2, u * 0.004);
    if (z.type === 'block') s += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="${col}" fill-opacity=".28" stroke="${col}" stroke-width="${sw}"/>`;
    else if (z.type === 'circle') s += `<circle cx="${z.x + z.w / 2}" cy="${z.y + z.h / 2}" r="${z.w / 2}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-dasharray="${sw * 4} ${sw * 3}"/>`;
    else s += `<rect x="${z.x + sw / 2}" y="${z.y + sw / 2}" width="${z.w - sw}" height="${z.h - sw}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-dasharray="${z.type === 'view' ? `${sw * 5} ${sw * 3}` : 'none'}"/>`;
    const lbl = z.label; const tw = measure(lbl, 'bold', fs1) + fs1;
    // nhãn: vùng an toàn ở góc dưới-trái, vùng hiển thị ở góc trên-phải, vùng bị che ở góc trên-trái
    const vi = a.zones.filter((q, k) => q.type === 'view' && k < i).length; // nhãn vùng hiển thị xếp so le
    const ly = z.type === 'safe' ? z.y + z.h - fs1 * 1.7 - sw * 2 : z.y + sw * 2 + (z.type === 'view' ? vi * fs1 * 1.8 : 0);
    const lx = z.type === 'view' ? z.x + z.w - tw - sw * 2 : z.x + sw * 2;
    s += `<rect x="${lx}" y="${ly}" width="${tw}" height="${fs1 * 1.6}" rx="${fs1 * 0.3}" fill="${col}"/>` + text(lbl, { x: lx + fs1 / 2, y: ly + fs1 * 1.15, font: 'bold', size: fs1, fill: C.tealDeep });
  });
  return a.svg.replace(/<\/svg>$/, `${s}</svg>`);
}

// ---------- xuất ----------
function rasterize(svg, w) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: w }, font: { loadSystemFonts: false, fontFiles: fs.readdirSync(FONT_DIR).filter((f) => f.endsWith('.ttf')).map((f) => path.join(FONT_DIR, f)), defaultFontFamily: 'Be Vietnam Pro' }, shapeRendering: 2, textRendering: 1, imageRendering: 0 }).render().asPng();
}
async function encode(svg, w, fmt, q) {
  const png = rasterize(svg, w);
  const img = sharp(png).withIccProfile('srgb');
  return fmt === 'png' ? img.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer() : img.flatten({ background: C.teal }).jpeg({ quality: q, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer();
}

async function main() {
  defineAssets();
  const svgDir = path.join(SRC, 'svg');
  fs.rmSync(svgDir, { recursive: true, force: true });
  fs.mkdirSync(svgDir, { recursive: true });
  const manifest = [];
  for (const a of ASSETS) {
    const dir = path.join(OUT, a.platform);
    fs.mkdirSync(dir, { recursive: true });
    const buf = await encode(a.svg, a.w, a.fmt, a.q);
    fs.writeFileSync(path.join(dir, a.file), buf);
    fs.writeFileSync(path.join(svgDir, a.file.replace(/\.(png|jpg)$/, '.svg')), a.svg);
    const kb = buf.length / 1024;
    if (a.maxKB && kb > a.maxKB) throw new Error(`${a.file} ${kb.toFixed(0)} KB > ${a.maxKB} KB`);
    let guide = null;
    if (a.guide) {
      fs.mkdirSync(path.join(OUT, 'guides'), { recursive: true });
      guide = `guides/${a.file.replace(/\.(png|jpg)$/, '-guide.jpg')}`;
      fs.writeFileSync(path.join(OUT, guide), await encode(guideOverlay(a), Math.min(a.w, 1600), 'jpg', 80));
    }
    manifest.push({ platform: a.platform, file: `${a.platform}/${a.file}`, w: a.w, h: a.h, fmt: a.fmt, use: a.use, kb: Math.round(kb), zones: a.zones, guide });
    console.log(`${a.platform}/${a.file}`.padEnd(58), `${a.w}×${a.h}`.padEnd(10), `${kb.toFixed(0)} KB`);
  }
  // logo master + PNG
  const logoDir = path.join(OUT, 'logo');
  fs.rmSync(logoDir, { recursive: true, force: true });
  fs.mkdirSync(logoDir, { recursive: true });
  const logos = { ...logoMasters(), 'lexkite-clearspace.svg': clearspaceSvg() };
  for (const [f, svg] of Object.entries(logos)) {
    fs.writeFileSync(path.join(logoDir, f), svg);
    const vw = Number(svg.match(/width="([\d.]+)"/)[1]);
    const target = f.includes('horizontal') ? 1600 : f.includes('clearspace') ? vw : 1024;
    fs.writeFileSync(path.join(logoDir, f.replace('.svg', '.png')), await encode(svg, target, 'png'));
  }
  // PNG icon app từ web/icons/icon.svg (scripts/build-tokens.mjs dựng SVG): vuông tràn viền (PWA/Apple/Play), bo góc (add-on), maskable (vùng an toàn 80 %), ô cửa hàng 128 (icon 96 + lề 16)
  const ICON = fs.readFileSync(path.join(ROOT, 'web/icons/icon.svg'), 'utf8');
  const square = ICON.replace(/ rx="230" ry="230"/, '');
  const maskable = square.replace('<svg x="112" y="112" width="800" height="800"', '<svg x="192" y="192" width="640" height="640"');
  const store = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><svg x="16" y="16" width="96" height="96" viewBox="0 0 1024 1024">${ICON.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</svg></svg>`;
  const ICONS_OUT = [
    ...[16, 32, 48, 128].flatMap((n) => [[`web/icons/icon-${n}.png`, ICON, n], [`extension/icons/icon-${n}.png`, ICON, n]]),
    ['web/icons/icon-192.png', square, 192], ['web/icons/icon-512.png', square, 512], ['web/icons/apple-touch-icon.png', square, 180],
    ['web/icons/icon-maskable-512.png', maskable, 512], ['brand/lexkite-icon-512.png', square, 512],
    ['web/icons/icon-128-store.png', store, 128], ['store/icon-128.png', store, 128],
    ['brand/social/logo/lexkite-app-icon-rounded.png', ICON, 1024], // end card video (scripts/video/tpl/render_v9.py)
  ];
  // PNG bảng màu có alpha: ≤ 192 px 64 màu (icon-192 nằm trong khung app – size-budget, ≈ cỡ cũ 2,8 KB), lớn hơn 256 màu; dither che dải gradient
  for (const [f, svg, n] of ICONS_OUT) fs.writeFileSync(path.join(ROOT, f), await sharp(rasterize(svg, n)).png({ palette: true, quality: 100, effort: 10, colours: n <= 192 ? 64 : 256, dither: 0.8, compressionLevel: 9 }).toBuffer());
  console.log(`icon PNG: ${ICONS_OUT.length} tệp từ web/icons/icon.svg`);
  manifest.push(...Object.keys(logos).map((f) => ({ platform: 'logo', file: `logo/${f.replace('.svg', '.png')}`, svg: `logo/${f}`, use: f.replace(/^lexkite-|\.svg$/g, '').replace(/-/g, ' '), fmt: 'png' })));
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), colors: C, assets: manifest }, null, 1));
  fs.writeFileSync(path.join(OUT, 'index.html'), previewHtml(manifest));
  console.log(`\n${manifest.length} tệp → brand/social/  ·  xem trước: brand/social/index.html`);
}

// ---------- trang xem trước ----------
function previewHtml(items) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const names = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', watermark: 'Video watermark', x: 'X / Twitter', linkedin: 'LinkedIn', zalo: 'Zalo OA', logo: 'Logo masters' };
  const zsvg = (it) => it.zones && it.zones.length ? `<svg class="ov" viewBox="0 0 ${it.w} ${it.h}" preserveAspectRatio="none">${it.zones.map((z) => z.type === 'circle'
    ? `<ellipse cx="${z.x + z.w / 2}" cy="${z.y + z.h / 2}" rx="${z.w / 2}" ry="${z.h / 2}" class="z-${z.type}"/>`
    : `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" class="z-${z.type}"/>`).join('')}</svg>` : '';
  const sec = Object.keys(names).map((p) => {
    const list = items.filter((i) => i.platform === p);
    if (!list.length) return '';
    return `<section><h2>${names[p]}</h2><div class="grid ${p}">${list.map((it) => `<figure class="${it.fmt === 'png' && /watermark|logo/.test(p) ? 'chk' : ''}${it.zones?.some((z) => z.type === 'circle' && z.w === it.w) ? ' round' : ''}">
<a class="pic" href="${it.file}" style="${it.w ? `aspect-ratio:${it.w}/${it.h}` : ''}"><img loading="lazy" src="${it.file}" alt="${esc(it.use)}">${zsvg(it)}</a>
<figcaption><b>${esc(it.file.split('/').pop())}</b><span>${it.w ? `${it.w}×${it.h} · ` : ''}${it.fmt.toUpperCase()}${it.kb != null ? ` · ${it.kb} KB` : ''}</span><span>${esc(it.use)}</span>${it.guide ? `<a href="${it.guide}">Safe-zone guide ↗</a>` : ''}${it.svg ? `<a href="${it.svg}">SVG ↗</a>` : ''}</figcaption></figure>`).join('')}</div></section>`;
  }).join('');
  const sw = [['Deep Teal', C.teal, 'background, text'], ['Teal Glow', C.tealGlow, 'sky highlight'], ['Swallow Coral', C.coral, 'logo, buttons'], ['Coral UI', C.coralUI, 'web primary'], ['Apricot', C.apricot, 'gradient end'], ['Sun', C.sun, 'tail, rewards'], ['Sky', C.sky, 'secondary text'], ['Paper', C.paper, 'light bg, text on dark'], ['Correct', C.mint, 'success']];
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lexkite Social Kit</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Be+Vietnam+Pro:wght@400;600;700&display=swap">
<style>
:root{--bg:#eef6f4;--panel:#fff;--ink:#0f2a2b;--muted:#557070;--line:#d6e4e0;--chip:#e7f1ee;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0b1312;--panel:#13201f;--ink:#e8f2ef;--muted:#98b1ac;--line:#22332f;--chip:#1a2a28;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0b1312;--panel:#13201f;--ink:#e8f2ef;--muted:#98b1ac;--line:#22332f;--chip:#1a2a28;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 "Be Vietnam Pro",system-ui,sans-serif}
.wrap{max-width:1240px;margin:0 auto;padding:28px 16px 80px;display:grid;gap:34px}
header.hero{border-radius:28px;padding:clamp(22px,5vw,48px);color:#F4FBF8;background:radial-gradient(120% 90% at 85% 10%,#2a7d7a,#0F3D3E 55%,#0a2c2d);display:grid;gap:10px}
h1,h2{font-family:"Bricolage Grotesque",system-ui,sans-serif;font-weight:800;letter-spacing:-.03em;margin:0;line-height:1.05}
h1{font-size:clamp(2rem,6vw,3.4rem)}h1 b{background:linear-gradient(90deg,#E5502F,#FFB054);-webkit-background-clip:text;background-clip:text;color:transparent}
h2{font-size:1.6rem;margin-bottom:14px}.hero p{margin:0;opacity:.85;max-width:70ch}
.bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.bar label{display:inline-flex;gap:8px;align-items:center;background:rgba(255,255,255,.12);padding:8px 14px;border-radius:99px;cursor:pointer;font-weight:600}
.legend span{display:inline-flex;align-items:center;gap:6px;font-size:.82rem;margin-right:12px}.legend i{width:14px;height:14px;border-radius:4px;display:inline-block}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:18px;align-items:start}
.grid.instagram,.grid.tiktok{grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr))}
figure{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:20px;overflow:hidden}
.pic{display:block;position:relative;background:var(--chip)}.pic img{display:block;width:100%;height:100%;object-fit:contain}
.chk .pic{background:repeating-conic-gradient(#c9d6d3 0 25%,#eef3f2 0 50%) 0 0/18px 18px}
.round .pic img{clip-path:circle(50%)}body.raw .round .pic img{clip-path:none}
.ov{position:absolute;inset:0;width:100%;height:100%;display:none;pointer-events:none}body.zones .ov{display:block}
.ov *{fill:none;stroke-width:3;vector-effect:non-scaling-stroke}.z-safe{stroke:#2FBF71}.z-view{stroke:#CFE9F2;stroke-dasharray:8 5}.z-block{stroke:#FF5A5F;fill:rgba(255,90,95,.25)!important}.z-circle{stroke:#FFC94A;stroke-dasharray:6 4}
figcaption{padding:12px 14px;display:grid;gap:2px;font-size:.85rem}figcaption b{font-size:.88rem;word-break:break-all}figcaption span{color:var(--muted)}figcaption a{color:#E5502F;font-weight:700;text-decoration:none}
.sw{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.sw div{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--panel)}.sw i{display:block;height:64px}.sw p{margin:0;padding:8px 10px;font-size:.78rem;color:var(--muted)}.sw b{display:block;color:var(--ink);font-size:.86rem}
.rules{background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:18px 20px}.rules ul{margin:0;padding-left:1.2em}
</style></head><body class="zones"><div class="wrap">
<header class="hero"><h1>lex<b>kite</b> social kit</h1><p>Bộ ảnh đại diện, ảnh bìa, mẫu bài đăng và watermark cho Facebook, Instagram, TikTok, YouTube, X, LinkedIn, Zalo. Tạo bằng <code>node scripts/build-social-kit.mjs</code> · ${new Date().toISOString().slice(0, 10)}.</p>
<div class="bar"><label><input type="checkbox" checked onchange="document.body.classList.toggle('zones',this.checked)"> Hiện vùng an toàn</label><label><input type="checkbox" onchange="document.body.classList.toggle('raw',this.checked)"> Ảnh đại diện: xem vuông</label></div>
<div class="legend"><span><i style="background:#2FBF71"></i>Vùng an toàn</span><span><i style="background:#CFE9F2"></i>Vùng hiển thị theo thiết bị</span><span><i style="background:#FF5A5F"></i>Bị giao diện che</span><span><i style="background:#FFC94A"></i>Cắt tròn</span></div></header>
<section><h2>Bảng màu</h2><div class="sw">${sw.map(([n, h, u]) => `<div><i style="background:${h}"></i><p><b>${n}</b>${h} · RGB ${rgb(h)}<br>${u}</p></div>`).join('')}<div><i style="background:linear-gradient(135deg,#FFB054,#FF7A4D,#F2553B)"></i><p><b>Kite gradient</b>#FFB054 → #F2553B<br>mark wings, CTA</p></div></div></section>
<section class="rules"><h2>Quy tắc logo</h2><ul><li>Khoảng trống quanh logo ≥ ½ chiều cao dấu hiệu (x).</li><li>Kích thước tối thiểu: dấu hiệu 24 px (16 px chỉ cho favicon), logo ngang 96 px chiều rộng.</li><li>Nền tối → bản <i>on-dark</i> / trắng; nền sáng → bản <i>on-light</i> / teal. Không đổi màu, xoay, kéo giãn, đổ bóng, thêm viền.</li><li>Phông: Bricolage Grotesque ExtraBold (tiêu đề, wordmark), Be Vietnam Pro (nội dung, tiếng Việt), Noto Sans (phiên âm IPA) — đều SIL OFL.</li></ul></section>
${sec}</div></body></html>`;
}

// Dùng lại trong scripts/build-social-templates.mjs
export { C, F, COPY, DEPS, req, Resvg, sharp, measure, text, fit, wrap, id, mark, markCentered, wordmark, lockup, lockupWidth, kit, KIT, kitSvg, glow, sky, sparkles, pill, coralGrad, svgDoc, encode, rasterize, FONT_DIR, OUT, ROOT };
if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); process.exit(1); });
