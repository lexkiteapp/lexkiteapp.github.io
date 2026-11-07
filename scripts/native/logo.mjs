/* Native brand mark (C17, logo is owner-controlled: it must NOT change without his OK). The apps never redraw it: both platforms get the EXACT
 * brand/lexkite-mark.svg (geometry, gradients and colours untouched; the file has no dark variant, brand/lexkite-mark-mono.svg is a monochrome print mark).
 *   Android  design/src/main/res/drawable/lk_logo_mark.xml  VectorDrawable generated from the SVG (same path data, same colours, same gradient geometry)
 *   iOS      LKDesign/Resources/Assets.xcassets/LexkiteMark.imageset  the SVG itself (byte-identical copy) + Contents.json
 * scripts/test/native-one-source.mjs re-derives both from the SVG and fails on any difference, and rejects any other logo-coloured drawable. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const LOGO_SVG = 'brand/lexkite-mark.svg';
export const LOGO_ANDROID = 'native/android/design/src/main/res/drawable/lk_logo_mark.xml';
export const LOGO_IOS_DIR = 'native/ios/LexkiteKit/Sources/LKDesign/Resources/Assets.xcassets/LexkiteMark.imageset';

const num = s => parseFloat(s);
const argb = (hex, opacity = 1) => {
  let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error('logo: bad colour ' + hex);
  return '#' + Math.round(opacity * 255).toString(16).toUpperCase().padStart(2, '0') + h.toUpperCase();
};
const fmt = v => String(+v.toFixed(4));

/** Exact bounding box of an absolute/relative M C L l Z path (cubic extrema solved analytically). */
function bbox(d) {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g); let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0;
  const xs = [], ys = [], n = () => num(toks[i++]);
  const cubic = (p0, p1, p2, p3, arr) => { arr.push(p3);
    const a = -p0 + 3 * p1 - 3 * p2 + p3, b = 2 * (p0 - 2 * p1 + p2), c = p1 - p0, ts = [];
    if (Math.abs(a) < 1e-12) { if (Math.abs(b) > 1e-12) ts.push(-c / b); } else { const D = b * b - 4 * a * c; if (D >= 0) ts.push((-b + Math.sqrt(D)) / (2 * a), (-b - Math.sqrt(D)) / (2 * a)); }
    for (const t of ts) if (t > 0 && t < 1) { const u = 1 - t; arr.push(u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3); } };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    switch (cmd) {
      case 'M': case 'm': { const dx = cmd === 'm' ? x : 0, dy = cmd === 'm' ? y : 0; x = dx + n(); y = dy + n(); sx = x; sy = y; xs.push(x); ys.push(y); cmd = cmd === 'M' ? 'L' : 'l'; break; }
      case 'L': case 'l': { const rx = cmd === 'l' ? x : 0, ry = cmd === 'l' ? y : 0; x = rx + n(); y = ry + n(); xs.push(x); ys.push(y); break; }
      case 'C': case 'c': { const rx = cmd === 'c' ? x : 0, ry = cmd === 'c' ? y : 0; const x1 = rx + n(), y1 = ry + n(), x2 = rx + n(), y2 = ry + n(), x3 = rx + n(), y3 = ry + n();
        cubic(x, x1, x2, x3, xs); cubic(y, y1, y2, y3, ys); x = x3; y = y3; break; }
      case 'Z': case 'z': x = sx; y = sy; break;
      default: throw new Error('logo: unsupported path command ' + cmd);
    }
  }
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

export function parseMark(svg) {
  const vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/); if (!vb) throw new Error('logo: viewBox');
  const grads = {};
  for (const m of svg.matchAll(/<linearGradient id="(\w+)" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)">([\s\S]*?)<\/linearGradient>/g))
    grads[m[1]] = { x1: num(m[2]), y1: num(m[3]), x2: num(m[4]), y2: num(m[5]), stops: [...m[6].matchAll(/<stop offset="([\d.]+)" stop-color="(#\w+)"\/>/g)].map(s => [num(s[1]), s[2]]) };
  const body = svg.slice(svg.indexOf('</defs>') + 7);
  const shapes = [];
  for (const m of body.matchAll(/<(path|circle)\b([^>]*)\/>/g)) {
    const a = Object.fromEntries([...m[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(x => [x[1], x[2]]));
    shapes.push({ tag: m[1], a });
  }
  const rest = body.replace(/<(path|circle)\b[^>]*\/>/g, '').replace(/<\/?svg>|\s+/g, '');
  if (rest) throw new Error('logo: unsupported SVG content: ' + rest.slice(0, 80));
  return { w: +vb[1], h: +vb[2], grads, shapes };
}

const circlePath = (cx, cy, r) => `M${fmt(cx - r)},${fmt(cy)} a${fmt(r)},${fmt(r)} 0 1,0 ${fmt(2 * r)},0 a${fmt(r)},${fmt(r)} 0 1,0 ${fmt(-2 * r)},0 Z`;

export function androidVector(svg) {
  const { w, h, grads, shapes } = parseMark(svg);
  const lines = [];
  for (const { tag, a } of shapes) {
    const d = tag === 'circle' ? circlePath(num(a.cx), num(a.cy), num(a.r)) : a.d;
    const attrs = [`android:pathData="${d}"`];
    let inner = '';
    const fill = a.fill, g = fill && fill.match(/^url\(#(\w+)\)$/);
    if (g) {
      const gr = grads[g[1]], bb = bbox(d), W = bb.x1 - bb.x0, H = bb.y1 - bb.y0;
      inner = `\n        <aapt:attr name="android:fillColor">\n            <gradient android:type="linear" android:startX="${fmt(bb.x0 + gr.x1 * W)}" android:startY="${fmt(bb.y0 + gr.y1 * H)}" android:endX="${fmt(bb.x0 + gr.x2 * W)}" android:endY="${fmt(bb.y0 + gr.y2 * H)}">\n${gr.stops.map(([o, c]) => `                <item android:offset="${o}" android:color="${argb(c)}" />`).join('\n')}\n            </gradient>\n        </aapt:attr>\n    `;
    } else if (fill && fill !== 'none') attrs.push(`android:fillColor="${argb(fill, a['fill-opacity'] ? num(a['fill-opacity']) : 1)}"`);
    if (a.stroke) {
      attrs.push(`android:strokeColor="${argb(a.stroke)}"`, `android:strokeWidth="${a['stroke-width']}"`);
      if (a['stroke-linecap']) attrs.push(`android:strokeLineCap="${a['stroke-linecap']}"`);
      if (a['stroke-linejoin']) attrs.push(`android:strokeLineJoin="${a['stroke-linejoin']}"`);
    }
    if (a.opacity) attrs.push(`android:${a.stroke ? 'strokeAlpha' : 'fillAlpha'}="${a.opacity.replace(/^\./, '0.')}"`);
    const known = new Set(['d', 'cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity']);
    for (const k of Object.keys(a)) if (!known.has(k)) throw new Error('logo: unsupported SVG attribute ' + k);
    lines.push(inner ? `    <path\n        ${attrs.join('\n        ')}>${inner}</path>` : `    <path\n        ${attrs.join('\n        ')} />`);
  }
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- GENERATED by scripts/native/gen.mjs from ${LOGO_SVG} – do not edit by hand. The brand mark is owner-controlled: geometry and colours are the SVG's, unchanged. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt"
    android:width="${w}dp"
    android:height="${h}dp"
    android:viewportWidth="${w}"
    android:viewportHeight="${h}">
${lines.join('\n')}
</vector>
`;
}

export const iosContents = () => JSON.stringify({ images: [{ filename: 'lexkite-mark.svg', idiom: 'universal' }], info: { author: 'xcode', version: 1 }, properties: { 'preserves-vector-representation': true } }, null, 2) + '\n';

export function logoFiles() {
  const svg = fs.readFileSync(path.join(ROOT, LOGO_SVG), 'utf8');
  return new Map([[LOGO_ANDROID, androidVector(svg)], [`${LOGO_IOS_DIR}/lexkite-mark.svg`, svg], [`${LOGO_IOS_DIR}/Contents.json`, iosContents()]]);
}
