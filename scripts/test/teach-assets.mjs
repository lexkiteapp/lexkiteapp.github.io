// 👩‍🏫 Cổng tài sản giáo viên (docs/TEACHER-IN-APP.md §5.5): nhân vật trong app PHẢI đã tách nền – không bao giờ hiện nền phòng/bảng trắng.
//  - mọi ảnh nhân vật (web/teach/<who>/poster.webp, web/img/teach/<who>.webp, drawable Android teach_<who>.webp) = WebP CÓ kênh alpha
//  - vòng lặp = loop-a.mp4 dạng stacked alpha (cao = 2 × rộng), không còn loop.mp4 / poster.jpg (bản có nền)
//  - mã app không tham chiếu ảnh/clip nhân vật .jpg/.png/.mp4 không-alpha
// (Mép thật sự trong suốt: scripts/teacher/cutout.py QA + new-ui-qa đọc điểm ảnh viền khi chạy.) Dùng: node scripts/test/teach-assets.mjs
import fs from 'node:fs';

const WHO = ['ama', 'carlos'], errs = [];
const webpAlpha = f => {
  const b = fs.readFileSync(f);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return 'không phải WebP';
  const k = b.toString('ascii', 12, 16);
  if (k === 'VP8X') return (b[20] & 0x10) ? '' : 'WebP VP8X không có cờ alpha';
  if (k === 'VP8L') return (b[24] & 0x10) ? '' : 'WebP lossless không có alpha';
  return 'WebP VP8 (lossy) không có alpha';
};
const mp4Size = f => { // tkhd: width/height 16.16 ở 8 byte cuối hộp
  const b = fs.readFileSync(f), i = b.indexOf('tkhd'); if (i < 0) return null;
  const end = i - 4 + b.readUInt32BE(i - 4);
  return [b.readUInt32BE(end - 8) / 65536, b.readUInt32BE(end - 4) / 65536];
};
for (const w of WHO) {
  for (const f of [`web/teach/${w}/poster.webp`, `web/img/teach/${w}.webp`, `mobile/android/app/src/main/res/drawable-nodpi/teach_${w}.webp`]) {
    if (!fs.existsSync(f)) { errs.push(`${f}: thiếu`); continue; }
    const e = webpAlpha(f); if (e) errs.push(`${f}: ${e} (nhân vật phải tách nền)`);
  }
  const lp = `web/teach/${w}/loop-a.mp4`;
  if (!fs.existsSync(lp)) errs.push(`${lp}: thiếu`); else { const s = mp4Size(lp); if (!s || Math.abs(s[1] - 2 * s[0]) > 2) errs.push(`${lp}: không phải stacked alpha (${s && s.join('×')})`); }
  for (const old of [`web/teach/${w}/poster.jpg`, `web/teach/${w}/loop.mp4`]) if (fs.existsSync(old)) errs.push(`${old}: bản CÒN NỀN – xóa, dùng bản tách nền`);
}
const SRC = ['web/js/lesson/teacher.js', 'web/js/lesson/ui.js', 'web/js/retention.js', 'web/js/share-card.js', 'web/js/streak-ui.js'];
for (const f of SRC) { const s = fs.readFileSync(f, 'utf8'); const m = s.match(/teach\/[^'"`\s)]*\.(jpe?g|png)|teach\/\$\{[^}]+\}\/(poster\.jpg|loop\.mp4)|['"`]\s*\+?\s*['"`]?loop\.mp4/g); if (m) errs.push(`${f}: tham chiếu tài sản nhân vật còn nền: ${[...new Set(m)].join(', ')}`); }
if (errs.length) { console.error('✗ teach-assets:\n  - ' + errs.join('\n  - ')); process.exit(1); }
console.log(`✓ teach-assets: ${WHO.length} giáo viên – poster/ảnh đại diện/widget đều WebP alpha, vòng lặp stacked alpha, không còn bản có nền`);
