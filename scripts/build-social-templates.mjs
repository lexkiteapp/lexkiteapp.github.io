#!/usr/bin/env node
// Bộ mẫu social có nhân vật (thumbnail YouTube/Shorts, ảnh bài đăng, end card có QR, lower-third, bảng nhận diện).
// Chạy: node scripts/build-social-templates.mjs   ·   sửa chữ hook ở brand/social/templates/templates.json
// Chữ hook là <text> thật (sửa được trong Figma/Inkscape/Illustrator, cần phông Google: Bricolage Grotesque, Be Vietnam Pro, Noto Sans).
// Nhân vật: cắt từ ảnh gốc trong brand/characters/_candidates (không commit) → brand/social/templates/assets/chars/*.jpg (commit).
import fs from 'node:fs';
import path from 'node:path';
import {
  C, measure, text, fit, wrap, id, markCentered, lockup, lockupWidth, kit, kitSvg, glow, sky, sparkles, pill, coralGrad, svgDoc, encode, req, sharp, ROOT, OUT,
} from './build-social-kit.mjs';

const QR = req('qrcode');
const TPL = path.join(OUT, 'templates');
const ASSETS = path.join(TPL, 'assets', 'chars');
const T = JSON.parse(fs.readFileSync(path.join(TPL, 'templates.json'), 'utf8'));
const CH = T.characters;

// ---------- ảnh nhân vật ----------
const SRC_DIRS = [process.env.CHAR_SRC, path.join(ROOT, 'brand/characters/_candidates'), path.resolve(ROOT, '../../..', 'brand/characters/_candidates')].filter(Boolean);
async function prepareChars() {
  fs.mkdirSync(ASSETS, { recursive: true });
  const dir = SRC_DIRS.find((d) => fs.existsSync(d));
  for (const [k, c] of Object.entries(CH)) {
    const bust = path.join(ASSETS, `${k}-bust.jpg`), face = path.join(ASSETS, `${k}-face.jpg`);
    const src = dir && path.join(dir, c.src);
    if (!src || !fs.existsSync(src)) {
      if (!fs.existsSync(bust)) throw new Error(`Thiếu ảnh nhân vật ${k}: đặt ảnh gốc vào brand/characters/_candidates/${c.src} hoặc CHAR_SRC=…`);
      continue; // dùng bản đã cắt sẵn trong repo
    }
    const [bx, by, bw, bh] = c.bust;
    await sharp(src).extract({ left: bx, top: by, width: bw, height: bh }).resize(900).jpeg({ quality: 86, mozjpeg: true }).toFile(bust);
    const [fx, fy, fs_] = c.face;
    await sharp(src).extract({ left: Math.round(fx - fs_ / 2), top: Math.round(fy - fs_ / 2), width: fs_, height: fs_ }).resize(600).jpeg({ quality: 86, mozjpeg: true }).toFile(face);
  }
}
// href tương đối khi lưu SVG; base64 khi dựng PNG
const href = (k, kind) => `__CHAR__/${k}-${kind}.jpg`;
const forFile = (svg) => svg.replace(/__CHAR__\//g, 'assets/chars/');
const forRender = (svg) => svg.replace(/__CHAR__\/([\w-]+\.jpg)/g, (_, f) => `data:image/jpeg;base64,${fs.readFileSync(path.join(ASSETS, f)).toString('base64')}`);

// ---------- chữ sống (live text) ----------
const FAM = { display: ['Bricolage Grotesque', 800], heavy: ['Be Vietnam Pro', 800], bold: ['Be Vietnam Pro', 700], body: ['Be Vietnam Pro', 600], ipa: ['Noto Sans', 500] };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
let BLANK = false; // bản trống: bỏ chữ hook để tự gõ trong Canva/CapCut
function live(s, { x, y, font = 'display', size, fill = C.paper, anchor = 'start', ls = 0, hook = true, cls = '' }) {
  if (BLANK && hook) return '';
  const [fam, w] = FAM[font];
  return `<text${hook ? ' class="hook"' : ''}${cls} x="${x}" y="${y}" font-family="${fam}" font-weight="${w}" font-size="${size.toFixed(1)}" fill="${fill}"${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}${ls ? ` letter-spacing="${ls.toFixed(1)}"` : ''}>${esc(s)}</text>`;
}
// vùng chữ hook (nét đứt mờ) – chỉ hiện ở bản trống
const hookBox = (x, y, w, h) => (BLANK ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#fff" fill-opacity=".06" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-dasharray="14 10"/>` : '');

// ---------- khung nhân vật ----------
// shape: arch (vòm) | circle | round (bo góc); offset = mảng màu lệch phía sau kiểu sticker
function frame(k, kind, shape, x, y, w, h, { offset = C.coral, dx = 16, dy = 16, ring = C.paper, rw = 8 } = {}) {
  const cid = id('clip');
  const d = shape === 'circle' ? `M${x + w / 2} ${y} a${w / 2} ${h / 2} 0 1 0 0.01 0 Z`
    : shape === 'arch' ? `M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} Z`
      : `M${x + 36} ${y} H${x + w - 36} Q${x + w} ${y} ${x + w} ${y + 36} V${y + h - 36} Q${x + w} ${y + h} ${x + w - 36} ${y + h} H${x + 36} Q${x} ${y + h} ${x} ${y + h - 36} V${y + 36} Q${x} ${y} ${x + 36} ${y} Z`;
  const back = offset ? `<path d="${d}" fill="${offset}" transform="translate(${dx} ${dy})"/>` : '';
  return `${back}<defs><clipPath id="${cid}"><path d="${d}"/></clipPath></defs><image href="${href(k, kind)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMin slice" clip-path="url(#${cid})"/><path d="${d}" fill="none" stroke="${ring}" stroke-width="${rw}"/>`;
}
function xIcon(cx, cy, r, color = C.coral) { return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/><path d="M${cx - r * 0.38} ${cy - r * 0.38} L${cx + r * 0.38} ${cy + r * 0.38} M${cx + r * 0.38} ${cy - r * 0.38} L${cx - r * 0.38} ${cy + r * 0.38}" stroke="#fff" stroke-width="${r * 0.26}" stroke-linecap="round"/>`; }
function vIcon(cx, cy, r, color = C.mint) { return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/><path d="M${cx - r * 0.42} ${cy + r * 0.02} L${cx - r * 0.1} ${cy + r * 0.34} L${cx + r * 0.44} ${cy - r * 0.32}" stroke="#fff" stroke-width="${r * 0.26}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; }
function kicker(x, y, label, { size = 30, anchor = 'start', color = C.sun } = {}) {
  if (BLANK) return '';
  return pill(x, y, label, { size, font: 'heavy', stroke: color, color, ls: 0.12, anchor }).svg;
}
const smallLockup = (x, y, h = 48) => lockup(x, y, h).svg;

// ---------- QR lexkite.com ----------
function qr(x, y, size, url = T.qrUrl) {
  const q = QR.create(url, { errorCorrectionLevel: 'Q' });
  const n = q.modules.size, data = q.modules.data;
  const quiet = 3, cell = size / (n + quiet * 2);
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!data[r * n + c]) continue;
    let run = 1; while (c + run < n && data[r * n + c + run]) run++;
    d += `M${(x + (c + quiet) * cell).toFixed(2)} ${(y + (r + quiet) * cell).toFixed(2)}h${(run * cell).toFixed(2)}v${cell.toFixed(2)}h${(-run * cell).toFixed(2)}Z`;
    c += run - 1;
  }
  const lg = size * 0.2; // dấu hiệu giữa ≈ 4% diện tích (mức Q chịu được 25%)
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.06}" fill="#fff"/><path d="${d}" fill="${C.teal}"/><rect x="${x + size / 2 - lg / 2}" y="${y + size / 2 - lg / 2}" width="${lg}" height="${lg}" rx="${lg * 0.22}" fill="#fff"/>${markCentered(x + size / 2, y + size / 2, lg * 0.86)}`;
}

// ---------- THUMBNAIL ----------
function ytDontSay(t) {
  const w = 1280, h = 720, pad = 64;
  let s = sky(w, h, { gx: 0.8, gy: 0.3, clouds: false });
  s += glow(1000, 360, 330, C.sun, 0.18) + frame(t.char, 'face', 'circle', 760, 110, 470, 470, { offset: C.coral, dx: 18, dy: 18 });
  s += kicker(pad, 70, t.kicker);
  const ws = fit(t.wrong, 'display', 92, 560, -0.02), rs = fit(t.right, 'display', 108, 560, -0.02);
  s += hookBox(pad + 90, 180, 590, 130) + hookBox(pad + 90, 380, 590, 150);
  s += xIcon(pad + 36, 250, 36);
  s += live(t.wrong, { x: pad + 96, y: 280, size: ws, fill: C.paper, ls: -0.02 * ws });
  if (!BLANK) s += `<path d="M${pad + 90} 252 H${pad + 102 + measure(t.wrong, 'display', ws, -0.02 * ws)}" stroke="${C.coral}" stroke-width="10" stroke-linecap="round"/>`;
  s += vIcon(pad + 36, 456, 36);
  s += live(t.right, { x: pad + 96, y: 494, size: rs, fill: C.sun, ls: -0.02 * rs });
  s += smallLockup(pad, h - pad - 48);
  return svgDoc(w, h, s);
}
function ytBigHook(t) {
  const w = 1280, h = 720, pad = 64;
  let s = sky(w, h, { gx: 0.85, gy: 0.2, clouds: false, ghost: { cx: 200, cy: 600, w: 500 } });
  s += frame(t.char, 'bust', 'arch', 800, 70, 420, 650, { offset: C.sun, dx: -18, dy: 0, rw: 0 });
  s += kicker(pad, 74, t.kicker, { color: C.sky });
  const size = Math.min(...t.lines.map((l) => fit(l, 'display', 168, 660, -0.03)));
  s += hookBox(pad, 160, 680, size * 2.1);
  t.lines.forEach((l, i) => {
    const y = 160 + size * 0.86 + i * size * 1.02;
    if (i === t.lines.length - 1 && !BLANK) { const lw = measure(l, 'display', size, -0.03 * size); s += `<rect x="${pad - 14}" y="${y - size * 0.8}" width="${lw + 28}" height="${size * 0.98}" rx="16" fill="${C.coral}"/>`; }
    s += live(l, { x: pad, y, size, fill: C.paper, ls: -0.03 * size });
  });
  s += live(t.tail, { x: pad, y: 160 + size * 2.1 + 48, font: 'heavy', size: 52, fill: C.sky });
  s += smallLockup(pad, h - pad - 48);
  return svgDoc(w, h, s);
}
function ytQuiz(t) {
  const w = 1280, h = 720;
  let s = sky(w, h, { gx: 0.5, gy: 0.9, clouds: false });
  s += kicker(w / 2, 46, t.kicker, { anchor: 'middle', size: 32 });
  s += frame(t.char, 'bust', 'arch', 470, 300, 340, 420, { offset: C.sun, dx: 0, dy: -16, rw: 0 });
  const card = (x, label, letter, col) => {
    const cw = 400, cy = 150, ch = 300;
    let c = `<rect x="${x}" y="${cy}" width="${cw}" height="${ch}" rx="34" fill="${C.paper}"/><rect x="${x}" y="${cy}" width="${cw}" height="${ch}" rx="34" fill="none" stroke="${col}" stroke-width="10"/>`;
    c += `<circle cx="${x + cw / 2}" cy="${cy}" r="40" fill="${col}"/>` + text(letter, { x: x + cw / 2, y: cy + 16, font: 'heavy', size: 44, fill: C.teal, anchor: 'middle' });
    const sz = fit(label, 'display', 110, cw - 50, -0.02);
    c += live(label, { x: x + cw / 2, y: cy + ch / 2 + sz * 0.36, size: sz, fill: C.teal, anchor: 'middle', ls: -0.02 * sz });
    return c;
  };
  s += card(50, t.a, 'A', C.sun) + card(830, t.b, 'B', C.coralMid);
  s += text('or', { x: w / 2, y: 260, font: 'display', size: 84, fill: C.paper, anchor: 'middle' });
  s += smallLockup(50, h - 48 - 40, 44);
  return svgDoc(w, h, s);
}
// Shorts: nội dung trong x 90–930, y 270–1600 (tránh thanh trên, cột nút phải, chú thích dưới)
function shortPov(t) {
  const w = 1080, h = 1920;
  let s = sky(w, h, { gx: 0.5, gy: 0.75 });
  s += smallLockup(90, 290, 56);
  s += kicker(90, 400, t.kicker, { size: 40 });
  const size = Math.min(...t.lines.map((l) => fit(l, 'display', 120, 820, -0.02)));
  s += hookBox(90, 500, 840, size * 3.25);
  t.lines.forEach((l, i) => { s += live(l, { x: 90, y: 500 + size * 0.85 + i * size * 1.06, size, fill: i ? C.sun : C.paper, ls: -0.02 * size }); });
  s += glow(540, 1360, 420, C.sun, 0.16) + frame(t.char, 'bust', 'arch', 250, 980, 580, 620, { offset: C.coral, dx: 22, dy: 0 });
  return svgDoc(w, h, s);
}
function shortNative(t) {
  const w = 1080, h = 1920;
  let s = sky(w, h, { gx: 0.3, gy: 0.2 });
  s += smallLockup(90, 290, 56);
  s += kicker(90, 400, t.kicker, { size: 34 });
  const bubble = (x, y, bw, label, quote, fill, ink, tail) => {
    let b = `<rect x="${x}" y="${y}" width="${bw}" height="230" rx="44" fill="${fill}"/><path d="M${tail} ${y + 228} l40 0 l-30 50 Z" fill="${fill}"/>`;
    b += text(label, { x: x + 44, y: y + 70, font: 'heavy', size: 32, fill: ink, ls: 3 });
    const sz = fit(quote, 'display', 96, bw - 88, -0.02);
    b += hookBox(x + 30, y + 92, bw - 60, 120) + live(quote, { x: x + 44, y: y + 180, size: sz, fill: ink, ls: -0.02 * sz });
    return b;
  };
  s += bubble(90, 520, 780, 'TEXTBOOK', t.textbook, C.paper, C.teal, 640);
  s += bubble(170, 820, 760, 'REAL LIFE', t.real, C.coral, '#fff', 420);
  s += frame(t.char, 'bust', 'arch', 260, 1130, 560, 470, { offset: C.sun, dx: -20, dy: 0 });
  return svgDoc(w, h, s);
}
function shortWhy(t) {
  const w = 1080, h = 1920;
  let s = sky(w, h, { gx: 0.7, gy: 0.3 });
  s += smallLockup(90, 290, 56);
  s += kicker(90, 400, t.kicker, { size: 38, color: C.sky });
  const size = Math.min(...t.lines.map((l) => fit(l, 'display', 140, 820, -0.02)));
  s += hookBox(90, 500, 840, size * 3.3);
  t.lines.forEach((l, i) => { const small = l.length <= 4; s += live(l, { x: 90, y: 500 + size * 0.85 + i * size * 1.08, size: small ? size * 0.62 : size, fill: small ? C.sky : i === 2 ? C.sun : C.paper, ls: -0.02 * size }); });
  s += frame(t.char, 'bust', 'arch', 170, 1060, 540, 540, { offset: C.coral, dx: 20, dy: 0 });
  s += glow(800, 1240, 200, C.sun, 0.2) + kit(690, 1080, 240, 'think', 8);
  return svgDoc(w, h, s);
}

// ---------- BÀI ĐĂNG ----------
function postHeader(w, pad, label) { return smallLockup(pad, pad, 58) + (BLANK ? '' : pill(w - pad, pad + 6, label, { size: 22, font: 'heavy', stroke: C.sun, color: C.sun, anchor: 'end', ls: 0.14 }).svg); }
function postFooter(w, h, pad) { return `<rect x="${pad}" y="${h - pad - 56}" width="${w - pad * 2}" height="1.5" fill="#fff" opacity=".14"/>` + text(T.url, { x: pad, y: h - pad - 6, font: 'heavy', size: 30, fill: C.paper }) + text('IELTS · TOEIC · TOEFL — free', { x: w - pad, y: h - pad - 6, font: 'body', size: 24, fill: C.sky, anchor: 'end', opacity: 0.85 }); }
function postWord(t) {
  const w = 1080, h = 1080, pad = 76;
  let s = sky(w, h, { gx: 0.9, gy: 0.6 }) + postHeader(w, pad, t.label);
  s += frame(t.char, 'bust', 'arch', 640, 420, 380, 500, { offset: C.sun, dx: -16, dy: 0 });
  const ws = fit(t.word, 'display', 150, w - pad * 2, -0.03);
  s += hookBox(pad, 190, w - pad * 2, 170) + live(t.word, { x: pad, y: 330, size: ws, ls: -0.03 * ws });
  s += live(t.ipa, { x: pad, y: 412, font: 'ipa', size: 42, fill: C.sky });
  const cg = coralGrad(0, 0, 300, 0);
  s += cg.def + (BLANK ? '' : pill(pad, 446, t.pos, { size: 26, font: 'heavy', fill: `url(#${cg.id})`, stroke: 'none', color: C.teal }).svg);
  wrap(t.meaning, 'bold', 42, 520).forEach((l, i) => { s += live(l, { x: pad, y: 580 + i * 58, font: 'bold', size: 42 }); });
  s += postFooter(w, h, pad);
  return svgDoc(w, h, s);
}
function postIdiom(t) {
  const w = 1080, h = 1080, pad = 76;
  let s = sky(w, h, { gx: 0.2, gy: 0.7 }) + postHeader(w, pad, t.label);
  s += frame(t.char, 'bust', 'arch', pad, 430, 380, 490, { offset: C.coral, dx: 16, dy: 0 });
  // bóng thoại từ Leo
  s += `<rect x="440" y="200" width="564" height="150" rx="40" fill="${C.paper}"/><path d="M470 345 l-40 70 l90 -70 Z" fill="${C.paper}"/>`;
  s += live(t.say, { x: 480, y: 296, size: fit(t.say, 'display', 60, 490, -0.02), fill: C.teal });
  const is = fit(t.idiom, 'display', 110, 540, -0.03);
  s += hookBox(490, 440, 520, 260);
  wrap(t.idiom, 'display', is, 520).forEach((l, i) => { s += live(l, { x: 500, y: 530 + i * is * 1.02, size: is, fill: C.sun, ls: -0.03 * is }); });
  wrap(t.meaning, 'bold', 34, 500).forEach((l, i) => { s += live(l, { x: 500, y: 760 + i * 48, font: 'bold', size: 34 }); });
  s += postFooter(w, h, pad);
  return svgDoc(w, h, s);
}
function postDontSay(t) {
  const w = 1080, h = 1350, pad = 76;
  let s = sky(w, h, { gx: 0.85, gy: 0.85 }) + postHeader(w, pad, t.label);
  s += frame(t.char, 'face', 'circle', 620, 790, 380, 380, { offset: C.coral, dx: 14, dy: 14 });
  const row = (y, icon, label, str, col) => {
    let r = icon + text(label, { x: pad + 96, y: y - 18, font: 'heavy', size: 28, fill: col, ls: 4 });
    wrap(str, 'display', 76, w - pad * 2 - 100).forEach((l, i) => { r += live(l, { x: pad + 96, y: y + 66 + i * 84, size: 76, fill: col === C.sun ? C.sun : C.paper, ls: -1.5 }); });
    return r;
  };
  s += hookBox(pad + 80, 240, w - pad * 2 - 80, 220) + hookBox(pad + 80, 530, w - pad * 2 - 80, 220);
  s += row(280, xIcon(pad + 36, 270, 34), "DON'T SAY", t.wrong, C.coral);
  if (!BLANK) wrap(t.wrong, 'display', 76, w - pad * 2 - 100).forEach((l, i) => { s += `<path d="M${pad + 92} ${320 + i * 84} H${pad + 102 + measure(l, 'display', 76, -1.5)}" stroke="${C.coral}" stroke-width="9" stroke-linecap="round"/>`; });
  s += row(570, vIcon(pad + 36, 560, 34), 'SAY', t.right, C.sun);
  s += live(t.note, { x: pad, y: 900, font: 'bold', size: 36, fill: C.sky });
  s += postFooter(w, h, pad);
  return svgDoc(w, h, s);
}
function postQuiz(t) {
  const w = 1080, h = 1350, pad = 76;
  let s = sky(w, h, { gx: 0.15, gy: 0.9 }) + postHeader(w, pad, t.label);
  s += frame(t.char, 'face', 'circle', pad, 190, 220, 220, { offset: C.sun, dx: 10, dy: 10, rw: 6 });
  s += hookBox(330, 190, w - pad - 330, 230);
  wrap(t.question, 'display', 62, w - pad - 340).forEach((l, i) => { s += live(l, { x: 340, y: 262 + i * 74, size: 62, ls: -1 }); });
  const cg = coralGrad(0, 0, 90, 90);
  s += cg.def;
  t.options.forEach((o, i) => {
    const y = 520 + i * 160;
    s += `<rect x="${pad}" y="${y}" width="${w - pad * 2}" height="132" rx="32" fill="#fff" fill-opacity=".07" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>`;
    s += `<circle cx="${pad + 72}" cy="${y + 66}" r="40" fill="url(#${cg.id})"/>` + text('ABC'[i], { x: pad + 72, y: y + 81, font: 'heavy', size: 40, fill: C.teal, anchor: 'middle' });
    s += live(o, { x: pad + 140, y: y + 86, size: 60, ls: -0.5 });
  });
  s += text('Comment your answer', { x: pad, y: 1050, font: 'heavy', size: 38, fill: C.sun });
  s += kit(w - pad - 210, 930, 210, 'think', -4);
  s += postFooter(w, h, pad);
  return svgDoc(w, h, s);
}

// ---------- END CARD (QR) ----------
function endcardV() {
  const w = 1080, h = 1920, e = T.endcard;
  let s = sky(w, h, { gx: 0.5, gy: 0.3 });
  s += glow(540, 470, 260, C.sun, 0.22) + kit(400, 290, 280, 'cheer', -4);
  s += text(e.title, { x: 540, y: 690, font: 'display', size: fit(e.title, 'display', 100, 860, -0.02), fill: C.paper, anchor: 'middle', ls: -2 });
  const g = coralGrad(300, 0, 780, 0);
  s += g.def + text(T.url, { x: 540, y: 800, font: 'display', size: 96, fill: `url(#${g.id})`, anchor: 'middle', ls: -2 });
  s += `<rect x="290" y="860" width="500" height="500" rx="40" fill="${C.sun}" transform="translate(14 14)"/>` + qr(290, 860, 500);
  s += text(e.sub, { x: 540, y: 1430, font: 'bold', size: 36, fill: C.sky, anchor: 'middle' });
  ['mia', 'leo', 'ama'].forEach((k, i) => { s += frame(k, 'face', 'circle', 300 + i * 170, 1470, 140, 140, { offset: null, rw: 6 }); });
  s += text(e.crew, { x: 540, y: 1660, font: 'body', size: 30, fill: C.paper, anchor: 'middle', opacity: 0.9 });
  s += lockup(540 - lockupWidth(54) / 2, 1700, 54).svg;
  return svgDoc(w, h, s);
}
function endcardH() {
  const w = 1920, h = 1080, e = T.endcard;
  let s = sky(w, h, { gx: 0.75, gy: 0.4 });
  s += lockup(110, 90, 72).svg;
  const ts = fit(e.title, 'display', 120, 760, -0.02);
  s += text(e.title, { x: 110, y: 380, font: 'display', size: ts, fill: C.paper, ls: -0.02 * ts });
  const g = coralGrad(110, 0, 800, 0);
  const us = fit(T.url, 'display', 120, 760, -0.02);
  s += g.def + text(T.url, { x: 110, y: 510, font: 'display', size: us, fill: `url(#${g.id})`, ls: -0.02 * us });
  s += text(e.sub, { x: 110, y: 600, font: 'bold', size: 40, fill: C.sky });
  s += `<rect x="110" y="660" width="330" height="330" rx="28" fill="${C.sun}" transform="translate(12 12)"/>` + qr(110, 660, 330);
  ['mia', 'leo', 'ama'].forEach((k, i) => { s += frame(k, 'bust', 'arch', 940 + i * 300, 360 - (i === 1 ? 60 : 0), 270, 380 + (i === 1 ? 60 : 0), { offset: [C.coral, C.sun, C.coralMid][i], dx: 0, dy: -14 }); });
  s += text(e.crew, { x: 1345, y: 830, font: 'heavy', size: 40, fill: C.paper, anchor: 'middle' });
  s += glow(1760, 930, 170, C.sun, 0.2) + kit(1660, 840, 200, 'win', 6);
  return svgDoc(w, h, s);
}

// ---------- LOWER-THIRD (nền trong suốt) ----------
function lowerThird(k, vertical) {
  const w = vertical ? 1080 : 1920, h = vertical ? 1920 : 1080;
  const c = k === 'kit' ? T.kit : CH[k];
  const x = vertical ? 90 : 110, y = vertical ? 1330 : 830, av = vertical ? 150 : 150;
  const ns = 64, rs = 30;
  const tw = Math.max(measure(c.name, 'display', ns, -1), measure(c.role, 'body', rs)) + 90;
  let s = `<rect x="${x + av / 2}" y="${y + 14}" width="${av / 2 + 40 + tw}" height="${av - 28}" rx="${(av - 28) / 2}" fill="${C.teal}" fill-opacity=".94"/>`;
  const cg = coralGrad(0, y, 0, y + av);
  s += cg.def + `<rect x="${x + av + 22}" y="${y + 40}" width="7" height="${av - 80}" rx="3.5" fill="url(#${cg.id})"/>`;
  s += k === 'kit' ? `<circle cx="${x + av / 2}" cy="${y + av / 2}" r="${av / 2}" fill="${C.paper}"/><circle cx="${x + av / 2}" cy="${y + av / 2}" r="${av / 2}" fill="none" stroke="${C.sun}" stroke-width="6"/>` + kit(x + 12, y + 14, av - 24, 'happy')
    : frame(k, 'face', 'circle', x, y, av, av, { offset: null, ring: C.sun, rw: 6 });
  s += live(c.name, { x: x + av + 52, y: y + 78, size: ns, ls: -1, hook: false, cls: ' id="name"' });
  s += live(c.role, { x: x + av + 54, y: y + 118, font: 'body', size: rs, fill: C.sky, hook: false, cls: ' id="role"' });
  return svgDoc(w, h, s);
}

// ---------- BẢNG NHẬN DIỆN ----------
function brandSheet() {
  const w = 1920, h = 1080;
  let s = `<rect width="${w}" height="${h}" fill="${C.paper}"/>`;
  s += lockup(90, 70, 80, 'light').svg + text('Social templates · brand sheet', { x: w - 90, y: 128, font: 'bold', size: 30, fill: C.teal, anchor: 'end', opacity: 0.7 });
  const pal = [['Deep Teal', '#0F3D3E'], ['Teal 2', '#17595A'], ['Coral', '#E5502F'], ['Swallow', '#F2553B'], ['Apricot', '#FFB054'], ['Sun', '#FFC94A'], ['Sun soft', '#FFD36A'], ['Blush', '#FF8FA3'], ['Cream', '#FFF7EA'], ['Cream 2', '#FFE7C2'], ['Correct', '#2FBF71']];
  pal.forEach(([n, hex], i) => {
    const x = 90 + i * 158, y = 200;
    s += `<rect x="${x}" y="${y}" width="140" height="140" rx="22" fill="${hex}" stroke="#0F3D3E" stroke-opacity=".12"/>`;
    s += text(n, { x, y: y + 176, font: 'bold', size: 22, fill: C.teal }) + text(hex, { x, y: y + 206, font: 'body', size: 20, fill: C.teal, opacity: 0.65 });
  });
  s += text('Aa Bricolage Grotesque', { x: 90, y: 530, font: 'display', size: 76, fill: C.teal, ls: -2 }) + text('ExtraBold 800 · hooks, titles, wordmark', { x: 90, y: 572, font: 'body', size: 24, fill: C.teal, opacity: 0.7 });
  s += text('Aa Be Vietnam Pro — Tiếng Việt', { x: 980, y: 530, font: 'heavy', size: 56, fill: C.teal }) + text('600–800 · body, labels, Vietnamese', { x: 980, y: 572, font: 'body', size: 24, fill: C.teal, opacity: 0.7 });
  ['mia', 'leo', 'ama', 'diane', 'carlos'].forEach((k, i) => {
    const x = 90 + i * 250;
    s += frame(k, 'face', 'circle', x, 640, 200, 200, { offset: null, ring: C.teal, rw: 5 });
    s += text(CH[k].name, { x: x + 100, y: 890, font: 'display', size: 36, fill: C.teal, anchor: 'middle' }) + text(CH[k].role, { x: x + 100, y: 924, font: 'body', size: 19, fill: C.teal, anchor: 'middle', opacity: 0.7 });
  });
  ['happy', 'cheer', 'win', 'think'].forEach((m, i) => { s += kit(1380 + (i % 2) * 230, 600 + Math.floor(i / 2) * 210, 190, m); });
  s += text('Kit — only from web/js/kit.js · characters only from locked Elements · rules: docs/BRAND-RULES.md', { x: 90, y: 1020, font: 'body', size: 22, fill: C.teal, opacity: 0.7 });
  return svgDoc(w, h, s);
}

// ---------- xuất ----------
const LIST = [];
const th = T.thumbs, po = T.posts;
const add = (name, w, h, fn, { blank = true, png = false, use } = {}) => LIST.push({ name, w, h, fn, blank, png, use });
add('yt-dont-say-1280x720', 1280, 720, () => ytDontSay(th['yt-dont-say']), { use: 'YouTube thumbnail · Don’t say / Say' });
add('yt-big-hook-1280x720', 1280, 720, () => ytBigHook(th['yt-big-hook']), { use: 'YouTube thumbnail · big hook' });
add('yt-quiz-1280x720', 1280, 720, () => ytQuiz(th['yt-quiz']), { use: 'YouTube thumbnail · A or B quiz' });
add('short-pov-1080x1920', 1080, 1920, () => shortPov(th['short-pov']), { use: 'Shorts/Reels/TikTok cover · POV' });
add('short-native-1080x1920', 1080, 1920, () => shortNative(th['short-native']), { use: 'Shorts cover · textbook vs real life' });
add('short-why-1080x1920', 1080, 1920, () => shortWhy(th['short-why']), { use: 'Shorts cover · Ama asks why' });
add('post-word-1080x1080', 1080, 1080, () => postWord(po['post-word']), { use: 'IG/FB post 1:1 · word of the day' });
add('post-idiom-1080x1080', 1080, 1080, () => postIdiom(po['post-idiom']), { use: 'IG/FB post 1:1 · idiom' });
add('post-dont-say-1080x1350', 1080, 1350, () => postDontSay(po['post-dont-say']), { use: 'IG/FB post 4:5 · Don’t say / Say' });
add('post-quiz-1080x1350', 1080, 1350, () => postQuiz(po['post-quiz']), { use: 'IG/FB post 4:5 · quiz' });
add('endcard-qr-1080x1920', 1080, 1920, endcardV, { blank: false, use: 'Video end card 9:16 · QR lexkite.com' });
add('endcard-qr-1920x1080', 1920, 1080, endcardH, { blank: false, use: 'Video end card 16:9 · QR lexkite.com' });
for (const k of [...Object.keys(CH), 'kit']) {
  add(`lower-third-${k}-1920x1080`, 1920, 1080, () => lowerThird(k, false), { blank: false, png: true, use: `Lower-third 16:9 · ${k === 'kit' ? 'Kit' : CH[k].name}` });
  add(`lower-third-${k}-1080x1920`, 1080, 1920, () => lowerThird(k, true), { blank: false, png: true, use: `Lower-third 9:16 · ${k === 'kit' ? 'Kit' : CH[k].name}` });
}
add('brand-sheet-1920x1080', 1920, 1080, brandSheet, { blank: false, use: 'Palette, fonts, characters, Kit' });

async function main() {
  await prepareChars();
  const svgDir = path.join(TPL, 'svg'), pngDir = path.join(TPL, 'png');
  for (const d of [svgDir, pngDir]) { fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); }
  const out = [];
  for (const it of LIST) {
    for (const blank of it.blank ? [false, true] : [false]) {
      BLANK = blank;
      const name = it.name.replace(/-(\d+x\d+)$/, blank ? '-blank-$1' : '-$1');
      const svg = it.fn();
      fs.writeFileSync(path.join(svgDir, `${name}.svg`), forFile(svg).replace(/assets\/chars\//g, '../assets/chars/'));
      const fmt = it.png ? 'png' : 'jpg';
      const buf = await encode(forRender(svg), it.w, fmt, 88);
      fs.writeFileSync(path.join(pngDir, `${name}.${fmt}`), buf);
      out.push({ name, file: `png/${name}.${fmt}`, svg: `svg/${name}.svg`, w: it.w, h: it.h, use: it.use + (blank ? ' (blank)' : ''), kb: Math.round(buf.length / 1024), blank });
      console.log(name.padEnd(40), `${it.w}×${it.h}`.padEnd(10), `${(buf.length / 1024).toFixed(0)} KB`);
    }
  }
  BLANK = false;
  fs.writeFileSync(path.join(TPL, 'index.html'), previewHtml(out));
  console.log(`\n${out.length} mẫu → brand/social/templates/  ·  xem: brand/social/templates/index.html`);
}
function previewHtml(items) {
  const groups = [['Thumbnails', /^(yt|short)-/], ['Posts', /^post-/], ['End cards', /^endcard/], ['Lower-thirds', /^lower-third/], ['Brand sheet', /^brand/]];
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lexkite Social Templates</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Be+Vietnam+Pro:wght@400;600;700&display=swap">
<style>:root{--bg:#eef6f4;--panel:#fff;--ink:#0f2a2b;--muted:#557070;--line:#d6e4e0;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0b1312;--panel:#13201f;--ink:#e8f2ef;--muted:#98b1ac;--line:#22332f;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0b1312;--panel:#13201f;--ink:#e8f2ef;--muted:#98b1ac;--line:#22332f;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 "Be Vietnam Pro",system-ui,sans-serif}.wrap{max-width:1240px;margin:0 auto;padding:28px 16px 80px;display:grid;gap:30px}
header{border-radius:26px;padding:clamp(20px,5vw,44px);color:#F4FBF8;background:radial-gradient(120% 90% at 85% 10%,#2a7d7a,#0F3D3E 55%,#0a2c2d)}h1,h2{font-family:"Bricolage Grotesque",sans-serif;letter-spacing:-.03em;margin:0 0 12px}h1 b{background:linear-gradient(90deg,#E5502F,#FFB054);-webkit-background-clip:text;background-clip:text;color:transparent}
header p{margin:0;opacity:.85;max-width:72ch}label{display:inline-flex;gap:8px;margin-top:14px;background:rgba(255,255,255,.12);padding:8px 14px;border-radius:99px;cursor:pointer;font-weight:600}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:16px;align-items:start}figure{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:18px;overflow:hidden}
figure img{display:block;width:100%;height:auto}.lt img{background:repeating-conic-gradient(#c9d6d3 0 25%,#eef3f2 0 50%) 0 0/18px 18px}figcaption{padding:10px 12px;font-size:.84rem;display:grid;gap:2px}figcaption span{color:var(--muted)}figcaption a{color:#E5502F;font-weight:700;text-decoration:none}
body:not(.blank) .is-blank{display:none}body.blank .not-blank{display:none}</style></head><body><div class="wrap">
<header><h1>lex<b>kite</b> social templates</h1><p>Thumbnail YouTube/Shorts, ảnh bài đăng IG/FB, end card có QR, lower-third. Chữ hook là chữ sống trong SVG – sửa ở <code>templates.json</code> rồi chạy <code>node scripts/build-social-templates.mjs</code>, hoặc dùng bản <i>blank</i> để gõ trong Canva/CapCut.</p>
<label><input type="checkbox" onchange="document.body.classList.toggle('blank',this.checked)"> Xem bản trống (blank)</label></header>
${groups.map(([g, re]) => `<section><h2>${g}</h2><div class="grid">${items.filter((i) => re.test(i.name)).map((i) => `<figure class="${i.blank ? 'is-blank' : (items.some((j) => j.name === i.name.replace(/-(\d+x\d+)$/, '-blank-$1')) ? 'not-blank' : '')}${/^lower/.test(i.name) ? ' lt' : ''}"><a href="${i.file}"><img loading="lazy" src="${i.file}" alt="${esc(i.use)}" width="${i.w}" height="${i.h}"></a><figcaption><b>${i.name}</b><span>${i.w}×${i.h} · ${i.kb} KB · ${esc(i.use)}</span><a href="${i.svg}">SVG ↗</a></figcaption></figure>`).join('')}</div></section>`).join('')}
</div></body></html>`;
}
main().catch((e) => { console.error(e); process.exit(1); });
