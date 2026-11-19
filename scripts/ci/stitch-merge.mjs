// Gộp kết quả các shard của stitch-diff.yml (matrix chia theo màn, SHARD=i/n – scripts/test/stitch-screens.mjs) về MỘT thư mục như khi chạy một job:
//   node scripts/ci/stitch-merge.mjs <thư-mục-tải-về> <out/stitch-diff|out/final-qc>   (mỗi shard là thư mục con <tiền-tố>-<i>/)
// Ảnh/tệp tên khác nhau theo màn → chép thẳng; scores.json (khoá res/a11y/qc/contrast/ph theo màn, errs mảng) → hợp lại; SUMMARY.md/report.json → nối. Dùng cho job `diff` tổng
// (một kết quả cho required-gate + stitch-shots.mjs đọc đúng out/stitch-diff, out/final-qc như trước).
import fs from 'node:fs'; import path from 'node:path';
export function mergeShards(src, dst) {
  fs.mkdirSync(dst, { recursive: true }); const dirs = fs.readdirSync(src, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const scores = {}, summaries = [], reports = {};
  for (const d of dirs) for (const f of fs.readdirSync(path.join(src, d))) {
    const from = path.join(src, d, f);
    if (f === 'scores.json') { for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(from, 'utf8')))) scores[k] = Array.isArray(v) ? [...(scores[k] || []), ...v] : { ...(scores[k] || {}), ...v }; }
    else if (f === 'SUMMARY.md') summaries.push(fs.readFileSync(from, 'utf8'));
    else if (f === 'report.json') Object.assign(reports, JSON.parse(fs.readFileSync(from, 'utf8')));
    else if (fs.statSync(from).isFile()) fs.copyFileSync(from, path.join(dst, f));
  }
  if (Object.keys(scores).length) fs.writeFileSync(path.join(dst, 'scores.json'), JSON.stringify(scores, null, 1));
  if (Object.keys(reports).length) fs.writeFileSync(path.join(dst, 'report.json'), JSON.stringify(reports, null, 1));
  if (summaries.length) fs.writeFileSync(path.join(dst, 'SUMMARY.md'), summaries.join('\n'));
  return dirs.length;
}
if (process.argv[1] && process.argv[1].endsWith('stitch-merge.mjs')) {
  const [src, dst] = process.argv.slice(2); if (!src || !dst) { console.error('dùng: stitch-merge.mjs <nguồn> <đích>'); process.exit(2); }
  const n = mergeShards(src, dst); console.log(`stitch-merge: ${n} shard → ${dst}`); if (!n) process.exit(1);
}
