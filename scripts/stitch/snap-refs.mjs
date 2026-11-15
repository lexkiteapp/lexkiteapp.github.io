// 🎨 Đưa màu tự do dạng lớp Tailwind -[#HEX] trong mẫu Stitch về màu gần nhất (OKLab) của hệ Lexkite (brand/tokens.json + tokens.dtcg.json),
// để qua cổng stitch-theme-lint. Dùng: node scripts/stitch/snap-refs.mjs <tệp.html…>   (idempotent; chỉ đổi hex NGOÀI hệ thống)
import fs from 'node:fs'; import { loadTokens } from '../lib/st-theme-snap.mjs'; import { oklab } from '../lib/st-theme-snap.mjs';
const { retired, typography, ...rest } = loadTokens();
const set = [...new Set([...(JSON.stringify(rest) + fs.readFileSync('brand/stitch/tokens.dtcg.json', 'utf8')).matchAll(/#[0-9A-Fa-f]{6}\b/g)].map(m => m[0].toUpperCase()))];
const lab = Object.fromEntries(set.map(h => [h, oklab(h)])), d = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const near = h => { const l = oklab(h); return set.reduce((b, c) => d(lab[c], l) < d(lab[b], l) ? c : b); };
for (const f of process.argv.slice(2)) { const s = fs.readFileSync(f, 'utf8'); let n = 0;
  const o = s.replace(/-\[(#[0-9A-Fa-f]{6})\]/g, (m, h) => set.includes(h.toUpperCase()) ? m : (n++, `-[${near(h.toUpperCase())}]`));
  if (n) fs.writeFileSync(f, o); console.log(f, n); }
