// Kiểm chính tả tiếng Việt trong nội dung (web/js/**/*.js + bài blog content/blog/**/*.md): âm tiết gõ sai dấu thường gặp (bảng VI_TYPO) + kiểu bỏ dấu cũ (hoá → hóa).
// Dùng: node scripts/vi-lint.mjs → in lỗi, thoát mã 1 nếu có.
import fs from 'fs'; import path from 'path';
const ROOT = 'web/js', SKIP = /\/(i18n\/(?!en)|notes\/)|vi-check\.js$|dictionary\.js$/;
const dict = fs.readFileSync(path.join(ROOT, 'dictionary.js'), 'utf8');
const TYPO = JSON.parse(dict.match(/const VI_TYPO = (\{[^}]*\})/)[1]);
const OLD = /(?<![\p{L}q])(?:[bcdđghklmnprstvx]|ch|kh|ng|nh|ph|th|tr)?(oà|oá|oả|oã|oạ|oè|oé|oẻ|oẽ|oẹ|uỳ|uý|uỷ|uỹ|uỵ)(?!\p{L})/giu;
const files = []; const walk = (d, ext) => { if (!fs.statSync(d, { throwIfNoEntry: false })?.isDirectory()) return; for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p, ext); else if (p.endsWith(ext) && !SKIP.test(p)) files.push(p); } }; walk(ROOT, '.js'); if (fs.existsSync('content/blog')) for (const d of fs.readdirSync('content/blog')) walk(path.join('content/blog', d), '.md'); // chỉ thư mục bài (vi/, en/…), bỏ WRITING-GUIDE.md (có ví dụ sai cố ý)
let n = 0;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8').normalize('NFC');
  for (const m of s.matchAll(/[\p{L}]+/gu)) {
    const w = m[0].toLowerCase();
    if (Object.hasOwn(TYPO, w)) { n++; console.log(`${f}: "${m[0]}" → "${TYPO[w]}"  …${s.slice(Math.max(0, m.index - 30), m.index + 20).replace(/\n/g, ' ')}…`); }
  }
  const cc = s.search(/[\x00-\x08\x0B\x0C\x0E-\x1F]/); if (cc >= 0) { n++; console.log(`${f}: ký tự điều khiển ẩn (mã ${s.charCodeAt(cc)}) ở vị trí ${cc}`); }
  for (const m of s.matchAll(OLD)) { n++; console.log(`${f}: kiểu bỏ dấu cũ "${m[0]}"`); }
}
console.log(n ? `✗ vi-lint: ${n} lỗi` : `✓ vi-lint: ${files.length} file, không lỗi chính tả`);
process.exit(n ? 1 : 0);
