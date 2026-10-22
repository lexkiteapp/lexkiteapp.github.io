// Dựng lại kho footage cục bộ từ Kho Drive theo manifest (có thể tiếp tục; kiểm sha256 từng file).
// Dùng: node scripts/footage/restore.mjs --out <thư mục> [--manifest <file>] [--match <regex đường dẫn>] [--sample N] [--limit N]
// File đã có & đúng sha256 → bỏ qua. Bản sao lỗi → thử bản sao kia. Tải về .part rồi đổi tên (dừng giữa chừng không để file dở).
import fs from 'fs';
import path from 'path';
import { DEFAULT_ROOT, MANIFEST_NAME, loadManifest, downloadCopy, sha256File, sleep, arg } from './lib.mjs';

const args = process.argv.slice(2), OUT = arg(args, 'out'), MAN = path.resolve(arg(args, 'manifest', path.join(DEFAULT_ROOT, MANIFEST_NAME)));
if (!OUT) { console.error('Dùng: restore.mjs --out <thư mục> [--manifest f] [--match regex] [--sample N] [--limit N]'); process.exit(2); }
const m = loadManifest(MAN), re = arg(args, 'match') ? new RegExp(arg(args, 'match')) : null;
let paths = Object.keys(m.files).filter(p => !re || re.test(p));
const SAMPLE = +arg(args, 'sample', 0); if (SAMPLE) { let s = 12345; const r = () => (s = (s * 48271) % 2147483647); paths = paths.map(p => [r(), p]).sort((a, b) => a[0] - b[0]).slice(0, SAMPLE).map(x => x[1]); }
paths = paths.slice(0, +arg(args, 'limit', 1e9));
let got = 0, had = 0, fail = 0, bytes = 0;
for (const p of paths) {
  const e = m.files[p], dest = path.join(path.resolve(OUT), p), part = dest + '.part';
  if (!path.resolve(dest).startsWith(path.resolve(OUT) + path.sep)) { console.error('✗ đường dẫn lạ: ' + p); fail++; continue; }
  if (fs.existsSync(dest) && fs.statSync(dest).size === e.size && sha256File(dest) === e.sha256) { had++; continue; }
  let ok = false;
  for (const c of e.copies || []) {
    try {
      const r = await downloadCopy(c.fileId, part);
      if (r.sha256 !== e.sha256 || r.size !== e.size) throw new Error('sai sha256/dung lượng');
      fs.renameSync(part, dest); ok = true; got++; bytes += r.size; break;
    } catch (er) { console.error(`⚠ ${p} (Drive ${c.driveId}): ${er.message}`); try { fs.unlinkSync(part); } catch { /* */ } }
    await sleep(300);
  }
  if (!ok) { fail++; console.error('✗ không khôi phục được: ' + p); }
}
console.log(`restore: ${got} tải về (${(bytes / 1e6).toFixed(1)} MB) · ${had} đã đúng sẵn · ${fail} lỗi / ${paths.length} mục`);
process.exit(fail ? 1 : 0);
