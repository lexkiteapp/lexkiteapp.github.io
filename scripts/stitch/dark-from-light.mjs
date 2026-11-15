// 🌙 Bản tối CÙNG DOM với bản sáng của một ref Stitch: khi lượt "edit → dark" của Stitch vẽ lại khác cấu trúc (converter ghép sẽ nhân đôi
//   khối lt:hidden/dk:hidden), ta giữ DOM bản sáng và chỉ đổi màu theo bảng lấy từ CHÍNH ref tối Stitch đó (Tactile Night: nền/thẻ/viền/chữ).
//   Bảng màu theo màn ở scripts/stitch/dark-maps/<màn>.json: { config: {tên màu tailwind: hex}, cls: {class sáng: class tối}, hex: {hex: hex}, attr: {thuộc tính SVG sáng: thuộc tính tối} (tùy chọn) }.
//   Dùng: node scripts/stitch/dark-from-light.mjs <màn> [--check]   (nguồn brand/stitch/v2/<màn>-light.html → <màn>-dark.html)
import fs from 'node:fs';
const [k] = process.argv.slice(2).filter(a => !a.startsWith('--')), CHECK = process.argv.includes('--check');
if (!k) { console.error('cần tên màn'); process.exit(2); }
const map = JSON.parse(fs.readFileSync(`scripts/stitch/dark-maps/${k}.json`, 'utf8')), src = fs.readFileSync(`brand/stitch/v2/${k}-light.html`, 'utf8');
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let out = src.replace(/(tailwind\.config\s*=\s*)(\{[\s\S]*?\})(\s*<\/script>)/, (m, a, cfg, z) => {
  for (const [name, hex] of Object.entries(map.config || {})) cfg = cfg.replace(new RegExp(`(['"]?${esc(name)}['"]?\\s*:\\s*')#[0-9A-Fa-f]{3,8}'`), `$1${hex}'`);
  for (const [from, to] of Object.entries(map.hex || {})) cfg = cfg.split(from).join(to); // bóng tactile trong boxShadow
  return a + cfg + z; });
out = out.replace(/class="([^"]*)"/g, (m, c) => `class="${c.split(/\s+/).map(x => map.cls?.[x] ?? x).join(' ')}"`);
for (const [from, to] of Object.entries(map.attr || {})) out = out.split(from).join(to); // thuộc tính màu trực tiếp (SVG stroke="#…" / fill="#…"): khóa = cả chuỗi thuộc tính, vd 'stroke="#F4E6DC"'
out = out.replace(/(<style[\s\S]*?<\/style>)/, s => { for (const [from, to] of Object.entries(map.hex || {})) s = s.split(from).join(to); return s; });
out = out.replace(/<title>([^<]*)<\/title>/, (m, x) => `<title>${x} (dark – dark-from-light.mjs)</title>`);
const dst = `brand/stitch/v2/${k}-dark.html`;
if (CHECK) { if (!fs.existsSync(dst) || fs.readFileSync(dst, 'utf8') !== out) { console.error(`${dst} trôi – chạy lại node scripts/stitch/dark-from-light.mjs ${k}`); process.exit(1); } console.log(`✓ ${dst} khớp`); }
else { fs.writeFileSync(dst, out); console.log(`→ ${dst}`); }
