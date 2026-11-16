// Script CI dùng chung (scripts/ci/*.sh) chạy cả trên macos-latest (vd. job webkit của teacher-motion) → không gọi lệnh chỉ có ở GNU/Linux.
// 16/11: pw-install.sh gọi `timeout` (macOS không có) → webkit đỏ cho MỌI PR. Luật: dùng `timeout`/`flock`/`setsid`… chỉ khi tệp có nhánh dự phòng (`command -v <lệnh>`).
// Dùng: node scripts/test/ci-portable.mjs
import fs from 'fs';
const GNU = ['timeout', 'flock', 'setsid', 'xvfb-run'], bad = [];
for (const f of fs.readdirSync('scripts/ci').filter(f => f.endsWith('.sh'))) {
  const src = fs.readFileSync(`scripts/ci/${f}`, 'utf8');
  src.split('\n').forEach((line, i) => {
    const code = line.replace(/#.*$/, '').replace(/(["']).*?\1/g, '""');
    for (const c of GNU) {
      if (!new RegExp(`(^|[;&|(]\\s*|\\bif\\s+|\\bthen\\s+)${c}\\s`).test(code.replace(/^\s+/, ''))) continue;
      if (!new RegExp(`command -v ${c}\\b`).test(src)) bad.push(`scripts/ci/${f}:${i + 1} gọi \`${c}\` (không có trên macOS) mà không có nhánh dự phòng \`command -v ${c}\``);
    }
  });
}
if (bad.length) { console.error('✗ ci-portable:\n- ' + bad.join('\n- ')); process.exit(1); }
console.log('✓ ci-portable: script CI dùng chung không gọi lệnh GNU-only trần');
