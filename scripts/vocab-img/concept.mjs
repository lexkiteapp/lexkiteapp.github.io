#!/usr/bin/env node
// Ô KHÁI NIỆM cho hư từ (the, of, although…) – SVG TẤT ĐỊNH, không AI, không giám khảo mô hình (luật = bảng tay dưới đây, kiểm mẫu tuần như mọi lô).
// Phong cách c1: nền vuông bo góc teal #0F3D3E (đẹp cả sáng lẫn tối – không bao giờ nền trắng trên nền tối), hình sơ đồ cam/vàng/kem (docs/BRAND-RULES.md).
// Mỗi hư từ → một HỌ sơ đồ (vị trí, thời gian, tương phản, nguyên nhân, lượng, đại từ…) + tham số → cùng một "gia đình" hình.
//   node scripts/vocab-img/concept.mjs --keys k1,k2|file.json --out <dir>   → <dir>/svg/<slug>.svg + <dir>/concept.json {key: {fam, h}}
//   (CI raster: rsvg-convert → qc.py enc → WebP+AVIF ≤ 6 KB; xem scene_qc.py --concept)
import fs from 'fs';
import path from 'path';
import { fnv } from './style.mjs';

export const CONCEPT_V = 'c1';
const C = { bg: '#0F3D3E', bg2: '#17595A', o: '#E5502F', a: '#FFB054', y: '#FFC94A', k: '#FFF7EA', p: '#FF8FA3' };
const S = 384;
const box = (x, y, w, h, f = C.bg2, s = C.k) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${f}" stroke="${s}" stroke-width="8"/>`;
const dot = (x, y, r = 30, f = C.o) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/>`;
const ring = (x, y, r = 26, s = C.k) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${s}" stroke-width="8"/>`;
const line = (x1, y1, x2, y2, s = C.k, w = 10) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${s}" stroke-width="${w}" stroke-linecap="round"/>`;
function arrow(x1, y1, x2, y2, s = C.a, w = 16) {
  const a = Math.atan2(y2 - y1, x2 - x1), L = 34, bx = x2 - Math.cos(a) * L * 0.8, by = y2 - Math.sin(a) * L * 0.8;
  const p = (t, d) => [x2 - Math.cos(a) * L + Math.cos(a + t) * d, y2 - Math.sin(a) * L + Math.sin(a + t) * d];
  const [lx, ly] = p(Math.PI / 2, 26), [rx, ry] = p(-Math.PI / 2, 26);
  return line(x1, y1, bx, by, s, w) + `<path d="M${x2},${y2} L${lx.toFixed(1)},${ly.toFixed(1)} L${rx.toFixed(1)},${ry.toFixed(1)} Z" fill="${s}"/>`;
}
const arc = (d, s = C.a) => `<path d="${d}" fill="none" stroke="${s}" stroke-width="16" stroke-linecap="round"/>`;
const person = (x, y, f = C.k, sc = 1) => `<g transform="translate(${x} ${y}) scale(${sc})"><circle cx="0" cy="-46" r="24" fill="${f}"/><path d="M-38,40 Q-38,-14 0,-14 Q38,-14 38,40 Z" fill="${f}"/></g>`;
const q = (x, y, f = C.y) => `<path d="M${x - 22},${y - 30} q0,-30 26,-30 q26,0 26,26 q0,18 -22,28 v14" fill="none" stroke="${f}" stroke-width="14" stroke-linecap="round"/>${dot(x + 4, y + 36, 9, f)}`;
const grid = (on, n = 9, hi = C.o) => { let s = ''; for (let i = 0; i < n; i++) { const x = 112 + (i % 3) * 80, y = 112 + Math.floor(i / 3) * 80; s += on(i) ? dot(x, y, 28, hi) : ring(x, y, 24); } return s; };
const BX = () => box(132, 172, 120, 110);

// ---- họ sơ đồ: id → (tham số) → nội dung SVG ----
const FAM = {
  in: () => BX() + dot(192, 227, 26),
  on: () => BX() + dot(192, 140, 30),
  under: () => BX() + dot(192, 322, 28),
  above: () => BX() + dot(192, 92, 28),
  between: () => box(52, 172, 90, 110) + box(242, 172, 90, 110) + dot(192, 227, 26),
  among: () => grid(i => i === 4),
  behind: () => dot(220, 200, 34, C.o) + box(120, 172, 120, 110, C.bg2),
  beside: () => box(80, 172, 120, 110) + dot(260, 227, 30),
  across: () => `<rect x="40" y="170" width="304" height="70" rx="10" fill="${C.bg2}"/>` + arrow(192, 320, 192, 70),
  along: () => line(50, 250, 334, 250) + arrow(70, 200, 320, 200),
  through: () => box(142, 132, 100, 190) + arrow(40, 227, 344, 227, C.o),
  into: () => box(200, 150, 130, 150) + arrow(40, 227, 270, 227),
  out: () => box(54, 150, 130, 150) + arrow(120, 227, 344, 227),
  toward: () => box(250, 160, 90, 130) + arrow(40, 227, 220, 227),
  from: () => box(44, 160, 90, 130) + arrow(160, 227, 344, 227),
  around: () => box(152, 172, 80, 80) + arc('M192,96 A116,116 0 1 1 90,170') + arrow(98, 150, 86, 182),
  against: () => box(214, 120, 40, 220, C.bg2) + dot(170, 230, 40) + arrow(50, 230, 120, 230, C.a, 12),
  beyond: () => box(150, 110, 34, 240, C.bg2) + dot(280, 230, 30) + arrow(60, 230, 230, 230, C.a, 12),
  at: () => ring(192, 200, 110, C.bg2) + ring(192, 200, 70) + dot(192, 200, 30),
  near: () => box(80, 172, 120, 110) + dot(250, 227, 24),
  // thời gian: trục + mốc (dot vàng = mốc, cam = sự việc)
  before: () => line(40, 230, 344, 230) + dot(250, 230, 18, C.y) + dot(130, 230, 30),
  after: () => line(40, 230, 344, 230) + dot(134, 230, 18, C.y) + dot(254, 230, 30),
  during: () => line(40, 230, 344, 230) + `<rect x="110" y="196" width="164" height="68" rx="34" fill="none" stroke="${C.a}" stroke-width="10"/>` + dot(192, 230, 22),
  until: () => arrow(40, 230, 250, 230) + line(276, 150, 276, 310, C.o, 14),
  since: () => line(96, 150, 96, 310, C.o, 14) + arrow(120, 230, 344, 230),
  while: () => arrow(40, 170, 340, 170) + arrow(40, 290, 340, 290, C.o),
  when: () => line(40, 230, 344, 230) + dot(192, 230, 30) + line(192, 120, 192, 180, C.y, 10),
  // nối ý
  contrast: () => arrow(60, 150, 320, 150) + arrow(324, 260, 64, 260, C.o),
  and: () => dot(110, 192, 44, C.a) + dot(274, 192, 44, C.o) + line(192, 160, 192, 224, C.k, 14) + line(160, 192, 224, 192, C.k, 14),
  or: () => line(192, 320, 192, 230) + arc('M192,232 Q192,170 110,120', C.a) + arc('M192,232 Q192,170 274,120', C.o) + dot(110, 112, 26, C.a) + dot(274, 112, 26, C.o),
  nor: () => FAM.or() + line(80, 80, 304, 160, C.p, 12),
  because: () => dot(96, 192, 44, C.a) + arrow(150, 192, 250, 192, C.k) + dot(294, 192, 40, C.o),
  so: () => dot(96, 192, 40, C.o) + arrow(150, 192, 250, 192, C.k) + dot(294, 192, 44, C.a),
  if: () => `<path d="M192,72 L282,162 L192,252 L102,162 Z" fill="${C.bg2}" stroke="${C.y}" stroke-width="10"/>` + arrow(192, 252, 192, 330, C.o) + q(192, 172, C.y),
  unless: () => FAM.if() + line(150, 300, 234, 340, C.p, 12),
  compare: () => `<rect x="90" y="150" width="80" height="170" rx="10" fill="${C.a}"/><rect x="214" y="90" width="80" height="230" rx="10" fill="${C.o}"/>` + line(60, 330, 324, 330),
  same: () => `<rect x="90" y="120" width="80" height="200" rx="10" fill="${C.a}"/><rect x="214" y="120" width="80" height="200" rx="10" fill="${C.o}"/>` + line(70, 110, 314, 110, C.y, 8),
  of: () => `<circle cx="192" cy="200" r="110" fill="${C.bg2}" stroke="${C.k}" stroke-width="8"/><path d="M192,200 L192,90 A110,110 0 0 1 298,172 Z" fill="${C.o}"/>`,
  with: () => dot(130, 200, 46, C.a) + dot(254, 200, 46, C.o) + line(176, 200, 208, 200, C.k, 14),
  without: () => dot(110, 200, 46, C.a) + dot(274, 200, 46, C.o) + line(160, 200, 186, 200, C.k, 14) + line(198, 200, 224, 200, C.k, 14) + line(170, 150, 214, 250, C.p, 10),
  for: () => person(270, 250) + `<rect x="70" y="170" width="90" height="80" rx="10" fill="${C.o}"/>` + line(115, 170, 115, 250, C.y, 10) + arrow(170, 210, 220, 210, C.a, 12),
  by: () => person(110, 250) + arrow(160, 210, 240, 210) + `<rect x="250" y="170" width="90" height="80" rx="10" fill="${C.o}"/>`,
  about: () => dot(192, 200, 44, C.o) + `<ellipse cx="192" cy="200" rx="140" ry="64" fill="none" stroke="${C.a}" stroke-width="10" transform="rotate(-18 192 200)"/>`,
  except: () => grid(i => i !== 4, 9, C.a) + line(150, 150, 234, 234, C.p, 12),
  per: () => dot(120, 120, 34, C.o) + line(110, 300, 274, 84, C.k, 14) + `<rect x="230" y="230" width="90" height="70" rx="10" fill="${C.a}"/>`,
  // lượng / hạn định (lưới 9 chấm)
  the: () => grid(i => i === 4) + ring(192, 192, 44, C.y),
  a: () => grid(i => i === 4),
  all: () => grid(() => true),
  some: () => grid(i => [0, 4, 5].includes(i)),
  few: () => grid(i => [2, 6].includes(i)),
  many: () => grid(i => i !== 1 && i !== 8),
  no: () => grid(() => false) + line(80, 80, 304, 304, C.p, 14),
  any: () => grid(() => false) + q(192, 200),
  each: () => grid(() => true, 9, C.a) + ring(112, 112, 40, C.y),
  enough: () => grid(i => i >= 3) + line(66, 152, 318, 152, C.y, 8),
  another: () => grid(i => i === 3) + dot(272, 192, 28, C.a) + line(272, 160, 272, 224, C.bg, 6) + line(240, 192, 304, 192, C.bg, 6),
  both: () => dot(120, 192, 50) + dot(264, 192, 50) + `<rect x="50" y="122" width="284" height="140" rx="70" fill="none" stroke="${C.y}" stroke-width="8"/>`,
  either: () => dot(120, 192, 50) + ring(264, 192, 46, C.a) + line(192, 120, 192, 264, C.k, 6),
  this: () => person(100, 290, C.k, 0.9) + arrow(140, 230, 196, 230, C.y, 12) + dot(232, 230, 28),
  that: () => person(80, 290, C.k, 0.9) + arrow(120, 230, 270, 160, C.y, 10) + dot(306, 140, 26),
  these: () => person(90, 290, C.k, 0.9) + arrow(130, 230, 184, 230, C.y, 12) + dot(222, 206, 22) + dot(222, 258, 22) + dot(266, 232, 22),
  those: () => person(70, 290, C.k, 0.9) + arrow(110, 230, 236, 170, C.y, 10) + dot(276, 120, 20) + dot(320, 150, 20) + dot(280, 172, 20),
  // đại từ: người (kem) – người được nói tới tô cam
  i: () => person(192, 260, C.o, 1.4) + arrow(300, 110, 236, 160, C.y, 12),
  you: () => person(110, 260, C.k) + person(274, 260, C.o) + arrow(150, 150, 236, 150, C.y, 10),
  he: () => person(120, 260, C.k) + person(264, 260, C.o) + `<rect x="230" y="296" width="68" height="14" rx="7" fill="${C.a}"/>`,
  she: () => person(120, 260, C.k) + person(264, 260, C.p) + `<rect x="230" y="296" width="68" height="14" rx="7" fill="${C.a}"/>`,
  it: () => person(110, 260, C.k) + `<rect x="226" y="190" width="100" height="100" rx="16" fill="${C.o}"/>`,
  we: () => person(110, 266, C.o, 0.9) + person(192, 250, C.o, 1) + person(274, 266, C.o, 0.9),
  they: () => person(90, 270, C.k, 0.8) + person(210, 250, C.o, 0.9) + person(296, 266, C.o, 0.85),
  self: () => person(192, 270, C.o, 1.2) + arc('M260,120 A80,80 0 1 1 124,120', C.y) + arrow(140, 130, 124, 122, C.y, 10),
  who: () => person(192, 270, C.bg2, 1.3) + `<g>${q(192, 140)}</g>`,
  what: () => `<rect x="112" y="112" width="160" height="160" rx="22" fill="${C.bg2}" stroke="${C.k}" stroke-width="8"/>` + q(192, 198),
  which: () => `<rect x="56" y="150" width="110" height="110" rx="18" fill="${C.a}"/><rect x="218" y="150" width="110" height="110" rx="18" fill="${C.o}"/>` + q(192, 100),
  everyone: () => person(100, 200, C.o, 0.7) + person(192, 200, C.o, 0.7) + person(284, 200, C.o, 0.7) + person(146, 320, C.o, 0.7) + person(238, 320, C.o, 0.7),
  nobody: () => person(192, 260, C.bg2, 1.3) + line(90, 90, 294, 320, C.p, 14),
  someone: () => person(110, 260, C.k, 0.8) + person(192, 260, C.o, 0.8) + person(274, 260, C.k, 0.8),
  mine: () => person(120, 270, C.o) + `<rect x="220" y="190" width="100" height="100" rx="16" fill="${C.a}"/>` + line(160, 220, 216, 230, C.y, 8),
  not: () => ring(192, 192, 110, C.p) + line(114, 270, 270, 114, C.p, 16),
};
// ---- hư từ → họ (bảng tay; từ không có trong bảng → 'type' = ô chữ) ----
const MAP = {
  in: 'in', inside: 'in', within: 'in', on: 'on', upon: 'on', onto: 'on', under: 'under', below: 'under', beneath: 'under', underneath: 'under',
  above: 'above', over: 'above', between: 'between', among: 'among', amongst: 'among', amid: 'among', behind: 'behind', beside: 'beside', alongside: 'beside',
  near: 'near', across: 'across', along: 'along', through: 'through', throughout: 'through', via: 'through', into: 'into', out: 'out', toward: 'toward', to: 'toward',
  from: 'from', around: 'around', against: 'against', beyond: 'beyond', at: 'at', overlooking: 'above',
  before: 'before', after: 'after', during: 'during', until: 'until', till: 'until', since: 'since', while: 'while', whilst: 'while', when: 'when', whenever: 'when',
  although: 'contrast', though: 'contrast', but: 'contrast', whereas: 'contrast', despite: 'contrast', notwithstanding: 'contrast', albeit: 'contrast', unlike: 'contrast', versus: 'contrast', however: 'contrast', yet: 'contrast',
  and: 'and', plus: 'and', besides: 'and', also: 'and', too: 'and', or: 'or', whether: 'or', nor: 'nor', neither: 'nor', either: 'either',
  because: 'because', as: 'because', so: 'so', therefore: 'so', thus: 'so', if: 'if', unless: 'unless', than: 'compare', like: 'same',
  of: 'of', with: 'with', without: 'without', for: 'for', by: 'by', about: 'about', except: 'except', per: 'per',
  the: 'the', a: 'a', an: 'a', all: 'all', every: 'all', everything: 'all', some: 'some', several: 'some', something: 'what', few: 'few', many: 'many', plenty: 'many', much: 'many',
  no: 'no', none: 'no', nothing: 'no', any: 'any', anything: 'any', each: 'each', enough: 'enough', another: 'another', both: 'both', such: 'the',
  this: 'this', that: 'that', these: 'these', those: 'those',
  i: 'i', me: 'i', you: 'you', he: 'he', him: 'he', she: 'she', her: 'she', it: 'it', we: 'we', us: 'we', they: 'they', them: 'they',
  myself: 'self', yourself: 'self', himself: 'self', herself: 'self', itself: 'self', ourselves: 'self', themselves: 'self',
  who: 'who', whoever: 'who', what: 'what', whatever: 'what', which: 'which', someone: 'someone', somebody: 'someone', anyone: 'someone', anybody: 'someone',
  everyone: 'everyone', everybody: 'everyone', nobody: 'nobody', mine: 'mine', not: 'not', never: 'not', circa: 'near',
};
export const FUNCTION_POS = new Set(['det', 'conj', 'prep', 'pron', 'art', 'aux', 'modal']);
/** hư từ? (loại từ chức năng, hoặc trạng từ chức năng có trong bảng) */
export const isFunction = (k, e) => !!e && (FUNCTION_POS.has(e.pos) || (e.pos === 'adv' && !!MAP[e.w]));
export const familyOf = w => MAP[String(w).toLowerCase()] || 'type';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** SVG tất định cho một hư từ. Họ 'type' (chưa có sơ đồ) = ô chữ: chính từ đó, cỡ lớn, gạch chân cam – ô chữ CHỈ dành cho hư từ. */
export function conceptSvg(w) {
  const fam = familyOf(w);
  const body = fam === 'type'
    ? `<text x="192" y="${210}" text-anchor="middle" font-family="Be Vietnam Pro, DejaVu Sans, sans-serif" font-weight="700" font-size="${Math.min(120, Math.round(560 / Math.max(3, w.length)))}" fill="${C.k}">${esc(w)}</text>` + line(110, 262, 274, 262, C.o, 14)
    : FAM[fam]();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}"><rect width="${S}" height="${S}" rx="56" fill="${C.bg}"/>${body}</svg>`;
}
export const conceptHash = w => (fnv(CONCEPT_V + '|' + w).toString(16).padStart(8, '0') + fnv('c|' + w + '|' + CONCEPT_V).toString(16).padStart(8, '0'));

if (path.resolve(process.argv[1] || '') === path.resolve(new URL(import.meta.url).pathname)) {
  const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
  const ks = arg('keys') || ''; const keys = fs.existsSync(ks) ? (JSON.parse(fs.readFileSync(ks, 'utf8')).items || []) : ks.split(',').filter(Boolean);
  const out = arg('out') || 'out/vocab-img-scene'; fs.mkdirSync(path.join(out, 'svg'), { recursive: true });
  const res = {};
  for (const k of keys) { const w = k.split('#')[0]; const slug = k.replace(/#/g, '__').replace(/[^a-zA-Z0-9_-]+/g, '-'); fs.writeFileSync(path.join(out, 'svg', slug + '.svg'), conceptSvg(w)); res[k] = { fam: familyOf(w), h: conceptHash(w), slug }; }
  fs.writeFileSync(path.join(out, 'concept.json'), JSON.stringify(res, null, 1));
  console.log(`✓ ${keys.length} ô khái niệm · họ: ${JSON.stringify(Object.values(res).reduce((a, r) => ((a[r.fam] = (a[r.fam] || 0) + 1), a), {}))}`);
}
