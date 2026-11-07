// Kiểm chính tả tiếng Việt trong nội dung (web/js/**/*.js + bài blog content/blog/**/*.md): âm tiết gõ sai dấu thường gặp (bảng VI_TYPO) + kiểu bỏ dấu cũ (hoá → hóa).
// Dùng: node scripts/vi-lint.mjs → in lỗi, thoát mã 1 nếu có. --fix: tự sửa kiểu bỏ dấu cũ + âm tiết gõ sai dấu (bảng VI_TYPO) rồi kiểm lại (Xưởng nội dung chạy trước npm test: AI hay sinh "hoá").
import fs from 'fs'; import path from 'path';
import { SCAN_ROOTS } from './lib/scan-roots.mjs';
const ROOT = 'web/js', SKIP = /\/(i18n\/(?!en)|notes\/)|vi-check\.js$|dictionary\.js$/;
const dict = fs.readFileSync(path.join(ROOT, 'dictionary.js'), 'utf8');
const TYPO = JSON.parse(dict.match(/const VI_TYPO = (\{[^}]*\})/)[1]);
const OLD = /(?<![\p{L}q])(?:[bcdđghklmnprstvx]|ch|kh|ng|nh|ph|th|tr)?(oà|oá|oả|oã|oạ|oè|oé|oẻ|oẽ|oẹ|uỳ|uý|uỷ|uỹ|uỵ)(?!\p{L})/giu;
const files = []; const walk = (d, ext) => { if (!fs.statSync(d, { throwIfNoEntry: false })?.isDirectory()) return; for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p, ext); else if (p.endsWith(ext) && !SKIP.test(p)) files.push(p); } }; SCAN_ROOTS.forEach(r => walk(r, '.js')); if (fs.existsSync('content/blog')) for (const d of fs.readdirSync('content/blog')) walk(path.join('content/blog', d), '.md'); // chỉ thư mục bài (vi/, en/…), bỏ WRITING-GUIDE.md (có ví dụ sai cố ý)
let n = 0;
const NEWSTYLE = { oà: 'òa', oá: 'óa', oả: 'ỏa', oã: 'õa', oạ: 'ọa', oè: 'òe', oé: 'óe', oẻ: 'ỏe', oẽ: 'õe', oẹ: 'ọe', uỳ: 'ùy', uý: 'úy', uỷ: 'ủy', uỹ: 'ũy', uỵ: 'ụy' };
const fixVi = s => s.replace(OLD, m => m.replace(/(oà|oá|oả|oã|oạ|oè|oé|oẻ|oẽ|oẹ|uỳ|uý|uỷ|uỹ|uỵ)$/iu, g => NEWSTYLE[g.toLowerCase()] || g)).replace(/[\p{L}]+/gu, w => { const t = Object.hasOwn(TYPO, w.toLowerCase()) ? TYPO[w.toLowerCase()] : undefined; return t === undefined ? w : (w[0] !== w[0].toLowerCase() ? t[0].toUpperCase() + t.slice(1) : t); });
if (process.argv.includes('--fix')) for (const f of files) { const a = fs.readFileSync(f, 'utf8').normalize('NFC'), b = fixVi(a); if (a !== b) { fs.writeFileSync(f, b); console.log('đã sửa', f); } }
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
