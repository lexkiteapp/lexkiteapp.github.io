// 🎨 Mẫu Stitch v2 (brand/stitch/v2/<màn>-light|dark.html) theo MỘT bảng màu brand/tokens.json: các lớp màu tuỳ ý
// bg-/text-/border-[#HEX] có sắc TRUNG TÍNH (nền, chữ, viền) đổi sang hex của vai trò gần nhất – đúng hàm pick() mà
// st-theme-snap dùng cho CSS của app → ảnh mẫu Stitch (stitch-render, chuẩn SSIM của stitch-diff) và app cùng một thang màu.
// Màu brand/ngữ nghĩa giữ nguyên. Idempotent. Dùng: node scripts/stitch-sync-palette.mjs [--check]  (--check: còn lệch = đỏ)
import fs from 'node:fs'; import path from 'node:path';
import { pick, roleHex, loadTokens } from './lib/st-theme-snap.mjs';

const DIR = 'brand/stitch/v2', check = process.argv.includes('--check'), T = loadTokens();
const KIND = { bg: 'bg', text: 'text', border: 'border' };
let files = 0, swaps = 0; const stale = [];
for (const f of fs.readdirSync(DIR).filter(f => /-(light|dark)\.html$/.test(f)).sort()) {
  const mode = f.endsWith('-dark.html') ? 'dark' : 'light', p = path.join(DIR, f), src = fs.readFileSync(p, 'utf8');
  let n = 0;
  const out = src.replace(/\b(bg|text|border)-\[#([0-9A-Fa-f]{6})\]/g, (all, k, hex) => {
    const r = pick(T, KIND[k], mode, '#' + hex.toUpperCase()); if (!r) return all;
    const to = roleHex(T, r, mode).toUpperCase(); if (to === '#' + hex.toUpperCase()) return all;
    n++; return `${k}-[${to}]`;
  });
  if (n) { swaps += n; files++; if (check) stale.push(`${f} (${n})`); else fs.writeFileSync(p, out); }
}
// Bản đồ gắn dữ liệu (bind/<màn>.json) nhắc lớp đã ghép cặp lt:/dk: theo hex → đổi cùng hàm, theo chế độ của tiền tố
const BIND = path.join(DIR, 'bind');
for (const f of fs.existsSync(BIND) ? fs.readdirSync(BIND).filter(f => f.endsWith('.json')).sort() : []) {
  const p = path.join(BIND, f), src = fs.readFileSync(p, 'utf8'); let n = 0;
  const out = src.replace(/\b(lt|dk):(bg|text|border)-\[#([0-9A-Fa-f]{6})\]/g, (all, v, k, hex) => {
    const mode = v === 'dk' ? 'dark' : 'light', r = pick(T, KIND[k], mode, '#' + hex.toUpperCase()); if (!r) return all;
    const to = roleHex(T, r, mode).toUpperCase(); if (to === '#' + hex.toUpperCase()) return all;
    n++; return `${v}:${k}-[${to}]`;
  });
  if (n) { swaps += n; files++; if (check) stale.push(`bind/${f} (${n})`); else fs.writeFileSync(p, out); }
}
if (check && stale.length) { console.error(`✗ stitch-sync-palette: ${stale.length} mẫu còn màu trung tính lệch bảng: ${stale.slice(0, 6).join(', ')} → node scripts/stitch-sync-palette.mjs`); process.exit(1); }
console.log(check ? '✓ stitch-sync-palette: mẫu Stitch v2 cùng bảng màu brand/tokens.json' : `✓ stitch-sync-palette: ${swaps} lớp màu ở ${files} mẫu → vai trò bảng màu`);
