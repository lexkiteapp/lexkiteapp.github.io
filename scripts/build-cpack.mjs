// Gói nội dung tải lười (web/cpack → dist/cpack): tên file theo MÃ BĂM nội dung + sửa tham chiếu trong dist/js → Cloudflare cache immutable 1 năm (web/_headers),
// service worker cache-first (offline mở lại bài đã học). Nguồn trong web/ giữ tên cố định (add-on/app di động nạp thẳng, không băm).
// Chạy sau minify trong scripts/build-web.sh:  node scripts/build-cpack.mjs dist
// Lỗi (exit 1): gói không được js nào tham chiếu (mồ côi), hoặc tham chiếu trỏ gói không tồn tại.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = process.argv[2] || 'dist', cdir = path.join(root, 'cpack');
if (!fs.existsSync(cdir)) { console.log('✓ cpack: không có gói'); process.exit(0); }
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const jsFiles = walk(path.join(root, 'js')).filter(f => f.endsWith('.js'));
const src = new Map(jsFiles.map(f => [f, fs.readFileSync(f, 'utf8')]));
const manifest = {}, errs = [];
for (const f of walk(cdir).filter(f => f.endsWith('.js'))) {
  const rel = path.relative(root, f).split(path.sep).join('/'), buf = fs.readFileSync(f);
  const h = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10), hashed = rel.replace(/\.js$/, `.${h}.js`);
  let used = 0;
  for (const [jf, t] of src) { const parts = t.split(rel); if (parts.length > 1) { used += parts.length - 1; src.set(jf, parts.join(hashed)); } }
  if (!used) errs.push(`gói ${rel} không được js/*.js nào tham chiếu (mồ côi – xoá hoặc thêm vào BUNDLES)`);
  fs.renameSync(f, path.join(root, hashed)); manifest[rel] = hashed;
}
for (const [jf, t] of src) fs.writeFileSync(jf, t);
for (const [jf, t] of src) for (const m of t.matchAll(/cpack\/[\w./-]+\.js/g)) if (!Object.values(manifest).includes(m[0])) errs.push(`${path.relative(root, jf)} trỏ tới ${m[0]} – không có trong web/cpack`);
fs.writeFileSync(path.join(cdir, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
if (errs.length) { console.error('✗ cpack:\n  - ' + errs.join('\n  - ')); process.exit(1); }
console.log(`✓ cpack: ${Object.keys(manifest).length} gói đặt tên theo mã băm (immutable)`);
