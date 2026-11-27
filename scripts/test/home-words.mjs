// Từ nổi bật trên trang chủ (content/seo/home-words.json) phải khớp lựa chọn hiện tại: còn index được, còn trong tập trang từ.
// Lệch (kho từ đổi) → chạy node scripts/seo/home-words.mjs rồi node scripts/build-landing.mjs. Trang chủ có đủ 15 ngôn ngữ × 24 liên kết.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, ['scripts/seo/home-words.mjs', '--check'], { stdio: 'inherit' });
let bad = 0;
for (const l of ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr']) {
  const f = `web/${l}/index.html`, h = fs.readFileSync(f, 'utf8'), n = (h.match(new RegExp(`href="/${l}/words/[a-z0-9-]+"`, 'g')) || []).length;
  if (!h.includes('id="top-words"') || n < 24) { console.error(`✗ ${f}: thiếu khu từ nổi bật (${n} liên kết)`); bad++; }
}
if (bad) process.exit(1); console.log('✓ home-words: 15 trang chủ có liên kết sâu tới trang từ');
