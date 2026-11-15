// 🎨 Cổng Stitch: (1) brand/stitch/DESIGN.md khớp brand/tokens.json; (2) mẫu Stitch brand/stitch/**/*.html MỚI chỉ dùng họ chữ trong
// tokens.json typography.allowed và màu lớp -[#HEX] có trong tokens.json/dtcg. Mẫu cũ (brand/stitch/lint-legacy.txt, bỏ _old) được miễn,
// danh sách chỉ được rút ngắn (mẫu sửa sạch → xóa dòng; thêm dòng mới = đỏ). Cập nhật danh sách: node scripts/test/stitch-theme-lint.mjs --baseline (chỉ dùng khi RÚT gọn).
import fs from 'node:fs'; import path from 'node:path';
import { loadTokens } from '../lib/st-theme-snap.mjs';
import { designMd } from '../build-stitch-design-md.mjs';

const T = loadTokens(), errs = [], LEG = 'brand/stitch/lint-legacy.txt';
if (!fs.existsSync('brand/stitch/DESIGN.md') || fs.readFileSync('brand/stitch/DESIGN.md', 'utf8') !== designMd(T)) errs.push('brand/stitch/DESIGN.md lệch brand/tokens.json → node scripts/build-stitch-design-md.mjs');

const { retired, typography, ...rest } = T;
const hexes = new Set([...(JSON.stringify(rest) + fs.readFileSync('brand/stitch/tokens.dtcg.json', 'utf8')).matchAll(/#[0-9A-Fa-f]{6}\b/g)].map(m => m[0].toUpperCase()));
const fonts = new Set(typography.allowed.map(s => s.toLowerCase()));

function offenders(src) {   // họ chữ/màu ngoài hệ thống trong một mẫu HTML
  const fam = new Set();
  for (const m of src.matchAll(/family=([^:&"';)]+)/g)) fam.add(decodeURIComponent(m[1]).replace(/\+/g, ' '));
  for (const m of src.matchAll(/font-family:\s*([^;}"]+)/g)) for (const x of m[1].split(',')) fam.add(x.trim().replace(/^['"]|['"]$/g, '').replace(/\s*!important$/, '').replace(/['"]$/, ''));
  const out = [...fam].filter(f => f && !fonts.has(f.toLowerCase())).map(f => `font:${f}`);
  for (const h of new Set([...src.matchAll(/-\[(#[0-9A-Fa-f]{6})\]/g)].map(m => m[1].toUpperCase())))   // màu tự do dạng lớp Tailwind -[#HEX] (cấu hình màu M3 của Stitch do design system sinh nên không xét)
    if (!hexes.has(h)) out.push(`color:${h}`);
  return out;
}
const files = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== '_old') walk(p); } else if (p.endsWith('.html')) files.push(p); } })('brand/stitch');
files.sort();
const legacy = new Set(fs.existsSync(LEG) ? fs.readFileSync(LEG, 'utf8').split('\n').filter(Boolean) : []);
const bad = files.map(f => [f, offenders(fs.readFileSync(f, 'utf8'))]).filter(([, o]) => o.length);
if (process.argv.includes('--baseline')) { fs.writeFileSync(LEG, bad.map(([f]) => f).join('\n') + '\n'); console.log(`baseline: ${bad.length} mẫu cũ`); process.exit(0); }
for (const [f, o] of bad) if (!legacy.has(f)) errs.push(`${f}: ngoài hệ thống Lexkite (${o.slice(0, 4).join(', ')}) – chọn font/màu trong Stitch bị cấm, áp dụng design system Lexkite (docs/DESIGN-SYSTEM.md §2b)`);
const clean = [...legacy].filter(f => !fs.existsSync(f) || !bad.some(([g]) => g === f)); // dòng thừa = nhắc dọn (không đỏ)
if (errs.length) { console.error('✗ stitch-theme-lint:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log(`✓ stitch-theme-lint: DESIGN.md khớp tokens; ${files.length} mẫu Stitch, ${bad.length} cũ được miễn${clean.length ? ` (${clean.length} dòng baseline đã sạch → xóa)` : ''}`);
