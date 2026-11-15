#!/usr/bin/env node
// Font tự lưu trữ cho app (web/app/index.html): Be Vietnam Pro (chữ thân, font-display:swap) + Bricolage Grotesque (tiêu đề, optional).
// Trước: 2 CSS từ fonts.googleapis.com + file từ fonts.gstatic.com → 2 kết nối mới (DNS+TLS) trên 4G chậm trước khi có font.
// Cắt gọn theo 15 ngôn ngữ giao diện: chữ Latin của vi/en/es/fr/de/pt/id/tr cần đúng 3 mảnh latin · latin-ext · vietnamese
// (unicode-range → trình duyệt chỉ tải mảnh có ký tự trên trang); ar/hi/ja/ko/ru/th/zh dùng font hệ thống trong --font (css/style.css :lang).
// Preload đúng 1 font LCP do script đầu <head> chọn (ux1 → pjs-latin, mặc định → PRELOAD) – link tĩnh sẽ tải cả 2 ở ux1.
// Dùng: node scripts/build-fonts.mjs          → ghi lại khối <!--fonts--> từ web/fonts/fonts.json (không cần mạng)
//       node scripts/build-fonts.mjs --fetch  → tải lại từ Google Fonts (OFL), ghi web/fonts/{bvp,bri}-*.woff2 + fonts.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'web/fonts'), META = path.join(DIR, 'fonts.json'), HTML = path.join(ROOT, 'web/app/index.html');
export const SUBSETS = ['latin', 'latin-ext', 'vietnamese'];
export const PRELOAD = 'fonts/bvp-400-latin.woff2'; // phần tử LCP của Hôm nay/Ôn/Bài học là chữ thân 400 (route-vitals "LCP el"); mảnh latin dùng cho MỌI ngôn ngữ (số, Latin)
const FAMILIES = [
  { id: 'bvp', family: 'Be Vietnam Pro', display: 'swap', q: 'Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600' },
  { id: 'bri', family: 'Bricolage Grotesque', display: 'optional', q: 'Bricolage+Grotesque:wght@700;800' }, // font biến thiên: 700 & 800 chung 1 file/mảnh
];

async function fetchAll() {
  const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'; // UA mới → Google trả woff2
  const faces = [];
  for (const F of FAMILIES) {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${F.q}&display=${F.display}`, { headers: { 'User-Agent': UA } })).text();
    const got = new Map();
    for (const m of css.matchAll(/\/\* ([\w-]+) \*\/\s*@font-face \{([^}]*)\}/g)) {
      const [, sub, b] = m;
      if (!SUBSETS.includes(sub)) continue;
      const style = /font-style: (\w+)/.exec(b)[1], weight = /font-weight: (\d+)/.exec(b)[1], url = /url\((\S+?)\)/.exec(b)[1], range = /unicode-range: ([^;]+);/.exec(b)[1];
      let file = got.get(url);
      if (!file) {
        file = F.id === 'bri' ? `bri-${sub}.woff2` : `bvp-${weight}${style === 'italic' ? 'i' : ''}-${sub}.woff2`;
        const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
        if (buf.subarray(0, 4).toString() !== 'wOF2') throw new Error('không phải woff2: ' + url);
        fs.writeFileSync(path.join(DIR, file), buf); got.set(url, file);
      }
      const w = F.id === 'bri' ? '700 800' : weight, prev = faces.find(f => f.file === file);
      if (prev) continue; // bri: 700 & 800 cùng file → 1 @font-face dải độ đậm
      faces.push({ family: F.family, style, weight: w, display: F.display, file, range });
    }
  }
  fs.writeFileSync(META, JSON.stringify({ source: 'Google Fonts (SIL OFL 1.1)', faces }, null, 1) + '\n');
}

export function block(faces) {
  const css = faces.map(f => `@font-face{font-family:"${f.family}";font-style:${f.style};font-weight:${f.weight};font-display:${f.display};src:url(fonts/${f.file}) format("woff2");unicode-range:${f.range}}`).join('');
  return `<!--fonts--><style>${css}</style><!--/fonts-->`; // preload: script đầu <head> chọn ĐÚNG 1 font theo giao diện (ux1 → pjs, mặc định → PRELOAD)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--fetch')) await fetchAll();
  const { faces } = JSON.parse(fs.readFileSync(META, 'utf8'));
  const html = fs.readFileSync(HTML, 'utf8'), b = block(faces);
  if (!/<!--fonts-->[\s\S]*?<!--\/fonts-->/.test(html)) throw new Error('thiếu <!--fonts-->…<!--/fonts--> trong ' + HTML);
  const out = html.replace(/<!--fonts-->[\s\S]*?<!--\/fonts-->/, () => b);
  if (out !== html) fs.writeFileSync(HTML, out);
  const kb = faces.reduce((s, f) => s + fs.statSync(path.join(DIR, f.file)).size, 0) / 1024;
  console.log(`✓ fonts: ${faces.length} @font-face · ${kb.toFixed(0)} KB tổng (trình duyệt chỉ tải mảnh cần) · preload ${PRELOAD}`);
}
