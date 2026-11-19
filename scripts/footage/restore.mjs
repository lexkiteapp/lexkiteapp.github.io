// Dựng lại kho footage cục bộ từ Kho Drive theo manifest (có thể tiếp tục; kiểm sha256 từng file).
// Dùng: node scripts/footage/restore.mjs --out <thư mục> [--manifest <file>] [--match <regex đường dẫn>] [--sample N] [--limit N]
// File đã có & đúng sha256 → bỏ qua. Bản sao lỗi → thử bản sao kia. Tải về .part rồi đổi tên (dừng giữa chừng không để file dở).
import fs from 'fs';
import path from 'path';
import { DEFAULT_ROOT, MANIFEST_NAME, loadManifest, restoreEntry, arg } from './lib.mjs';

const args = process.argv.slice(2), OUT = arg(args, 'out'), MAN = path.resolve(arg(args, 'manifest', path.join(DEFAULT_ROOT, MANIFEST_NAME)));
if (!OUT) { console.error('Dùng: restore.mjs --out <thư mục> [--manifest f] [--match regex] [--sample N] [--limit N]'); process.exit(2); }
const m = loadManifest(MAN), re = arg(args, 'match') ? new RegExp(arg(args, 'match')) : null;
let paths = Object.keys(m.files).filter(p => !re || re.test(p));
const SAMPLE = +arg(args, 'sample', 0); if (SAMPLE) { let s = 12345; const r = () => (s = (s * 48271) % 2147483647); paths = paths.map(p => [r(), p]).sort((a, b) => a[0] - b[0]).slice(0, SAMPLE).map(x => x[1]); }
paths = paths.slice(0, +arg(args, 'limit', 1e9));
let got = 0, had = 0, fail = 0, bytes = 0, stopped = false;
for (const p of paths) {
  const e = m.files[p];
  if (!path.resolve(OUT, p).startsWith(path.resolve(OUT) + path.sep)) { console.error('✗ đường dẫn lạ: ' + p); fail++; continue; }
  let r; try { r = await restoreEntry(p, e, OUT); } catch (er) { console.error('⏸ cầu dao D1 (429): dừng, chạy tiếp ngày mai'); stopped = true; break; }
  if (r === 'had') had++; else if (r === 'got') { got++; bytes += e.size; } else { fail++; console.error('✗ không khôi phục được: ' + p); }
}
console.log(`restore: ${got} tải về (${(bytes / 1e6).toFixed(1)} MB) · ${had} đã đúng sẵn · ${fail} lỗi / ${paths.length} mục${stopped ? ' · DỪNG do cầu dao D1' : ''}`);
process.exit(stopped ? 0 : fail ? 1 : 0);
