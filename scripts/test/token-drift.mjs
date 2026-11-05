// 🎯 Token drift (docs/DESIGN-SYSTEM.md §2): đếm giá trị VIẾT CỨNG thay vì token trong CSS giao diện app/add-on/landing –
//   color  = mã màu/rgb()/hsl() trong thuộc tính màu (color, background, border, fill, stroke, shadow, outline) → dùng var(--text|--surface|…)
//   space  = padding/margin/gap/inset bằng px/rem/em (trừ 0–2 px / ≤ .125rem đường mảnh)                                        → var(--sp-1..6)
//   radius = border-radius bằng px (trừ 0, ≥ 99px = viên thuốc)                                                → var(--r-xs..xl|--r-pill)
//   font   = font-size bằng px/rem                                                                             → var(--fs-xs..2xl)
// Cổng chống tái phát kiểu "ratchet": số đếm mỗi file chỉ được GIẢM so với scripts/test/token-drift.budget.json; file mới = 0.
// Không chặn file nguồn của token (định nghĩa biến `--x:` luôn được phép) và file sinh tự động (st-*, home-*: từ Stitch/Tailwind, có cổng riêng).
// Phạm vi KHÔNG gồm admin*/social* (phiên khác sở hữu – docs/COORDINATION.md).
// Dùng: node scripts/test/token-drift.mjs            → kiểm (exit 1 khi vượt)
//       node scripts/test/token-drift.mjs --write    → ghi lại ngưỡng = min(cũ, hiện tại) (chỉ hạ; file mới thêm vào bằng số hiện tại chỉ khi --allow-new)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BUD = path.join(ROOT, 'scripts/test/token-drift.budget.json');
const SKIP = /(^|\/)(st-|home-|admin|adm\.|social)/;

/** Danh sách file CSS giao diện (tương đối ROOT). */
export function files() {
  const out = [];
  for (const d of ['web/css', 'extension']) for (const f of fs.readdirSync(path.join(ROOT, d))) if (f.endsWith('.css') && !SKIP.test(f)) out.push(`${d}/${f}`);
  return out.sort();
}

const COLOR_PROP = /^(color|background(-color)?|border(-(top|right|bottom|left|block|inline)(-start|-end)?)?(-color)?|outline(-color)?|fill|stroke|box-shadow|text-shadow|caret-color|accent-color|text-decoration-color|column-rule-color)$/;
const COLOR_LIT = /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?)\(\s*\d/gi;
const SPACE_PROP = /^(padding|margin|gap|row-gap|column-gap|inset)(-(top|right|bottom|left|block|inline)(-start|-end)?)?$/;
const PX = /(^|[\s(,])(\d*\.?\d+)px\b/g, LEN = /(^|[\s(,])(\d*\.?\d+)(px|r?em)\b/g;
const big = x => x[3] === 'px' ? +x[2] > 2 : +x[2] > 0.125;

/** Đếm giá trị viết cứng trong 1 chuỗi CSS (thuần, có test). */
export function count(css) {
  const c = { color: 0, space: 0, radius: 0, font: 0 };
  const src = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of src.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)/gi)) {
    const prop = m[1].toLowerCase(), val = m[2].trim();
    if (prop.startsWith('--')) continue; // định nghĩa token
    const bare = val.replace(/var\([^()]*(\([^()]*\)[^()]*)*\)/g, ''); // bỏ var(--x, fallback) – fallback trong var() không tính
    if (COLOR_PROP.test(prop) && (bare.match(COLOR_LIT) || []).length) c.color++;
    if (SPACE_PROP.test(prop) && [...bare.matchAll(LEN)].some(big)) c.space++;
    if (/^border(-(top|bottom|start|end)-(left|right|start|end))?-radius$/.test(prop) && [...bare.matchAll(PX)].some(x => +x[2] > 0 && +x[2] < 99)) c.radius++;
    if (prop === 'font-size' && /\d(px|rem)\b/.test(bare)) c.font++;
  }
  return c;
}

export function measure() { return Object.fromEntries(files().map(f => [f, count(fs.readFileSync(path.join(ROOT, f), 'utf8'))])); }

/** Luật đi kèm (gốc lỗi visual-qa 05/11): (1) CSS sinh từ Stitch không dùng text-align vật lý (RTL lệch – build-stitch-css logical());
 *  (2) mọi skip link `.skip{…}` trong bộ dựng trang có min-height 44px (build-landing từng chép bản thiếu → tap<40 ở landing). */
export function rules() {
  const bad = [];
  for (const d of ['web/css', 'extension/app/css']) for (const f of fs.readdirSync(path.join(ROOT, d))) if (/^(st-|home-)/.test(f) && /text-align:(left|right)/.test(fs.readFileSync(path.join(ROOT, d, f), 'utf8'))) bad.push(`${d}/${f}: text-align:left/right vật lý – dựng lại: node scripts/build-stitch-css.mjs && node scripts/build-landing.mjs`);
  for (const d of ['scripts', 'scripts/lib']) for (const f of fs.readdirSync(path.join(ROOT, d))) if (f.endsWith('.mjs')) for (const m of fs.readFileSync(path.join(ROOT, d, f), 'utf8').matchAll(/\.skip\{[^}]*\}/g)) if (!/min-height:(44px|var\(--tap)/.test(m[0])) bad.push(`${d}/${f}: .skip thiếu min-height:44px`);
  return bad;
}
function self() {
  const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.error(`✗ token-drift --self: ${m}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); process.exit(1); } };
  eq(count(':root{--x:#fff;--sp:12px}.a{color:var(--text,#123)}'), { color: 0, space: 0, radius: 0, font: 0 }, 'token + fallback trong var() không tính');
  eq(count('.a{color:#fff;background:rgba(0,0,0,.5);border:1px solid #ddd}'), { color: 3, space: 0, radius: 0, font: 0 }, 'màu viết cứng');
  eq(count('.a{padding:12px 16px;margin:0 1px;gap:.5rem;border-radius:8px}.p{border-radius:999px;font-size:14px}'), { color: 0, space: 2, radius: 1, font: 1 }, 'khoảng cách/bo góc/cỡ chữ');
  eq(count('/* color:#fff */.a{padding:var(--sp-2) var(--sp-4);font-size:var(--fs-sm)}'), { color: 0, space: 0, radius: 0, font: 0 }, 'chú thích + token');
  console.log('✓ token-drift --self');
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) {
  if (process.argv.includes('--self')) { self(); process.exit(0); }
  const rb = rules(); if (rb.length) { console.error('✗ token-drift (luật RTL/skip):\n  - ' + rb.join('\n  - ')); process.exit(1); }
  const now = measure(), bud = fs.existsSync(BUD) ? JSON.parse(fs.readFileSync(BUD, 'utf8')) : {};
  const A = new Set(process.argv.slice(2));
  if (A.has('--write')) {
    const next = {};
    for (const [f, c] of Object.entries(now)) {
      if (!bud[f] && !A.has('--allow-new')) { if (Object.values(c).some(Boolean)) console.log(`! ${f}: file mới chưa có ngưỡng – sửa về token hoặc chạy --write --allow-new có lý do`); continue; }
      next[f] = Object.fromEntries(Object.keys(c).map(k => [k, bud[f] ? Math.min(bud[f][k] ?? c[k], c[k]) : c[k]]));
    }
    fs.writeFileSync(BUD, JSON.stringify(next, null, 1) + '\n');
    console.log('✓ token-drift: đã ghi ngưỡng (chỉ hạ)');
    process.exit(0);
  }
  const bad = [], down = [];
  for (const [f, c] of Object.entries(now)) for (const k of Object.keys(c)) {
    const max = bud[f] ? bud[f][k] ?? 0 : 0;
    if (c[k] > max) bad.push(`${f}: ${k} ${c[k]} > ${max}`); else if (c[k] < max) down.push(`${f}: ${k} ${max}→${c[k]}`);
  }
  const tot = k => Object.values(now).reduce((s, c) => s + c[k], 0);
  console.log(`token-drift: color ${tot('color')} · space ${tot('space')} · radius ${tot('radius')} · font ${tot('font')} (${Object.keys(now).length} file)`);
  if (down.length) console.log(`↓ đã giảm (chạy --write để khoá ngưỡng mới): ${down.slice(0, 8).join(' · ')}${down.length > 8 ? ' …' : ''}`);
  if (bad.length) { console.error('✗ token-drift: giá trị viết cứng TĂNG – dùng token (docs/DESIGN-SYSTEM.md §2):\n  - ' + bad.join('\n  - ')); process.exit(1); }
  console.log('✓ token-drift: không tăng');
}
