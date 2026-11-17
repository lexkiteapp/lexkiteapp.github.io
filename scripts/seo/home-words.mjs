// Từ nổi bật cho trang chủ 13 ngôn ngữ (liên kết sâu / → /<lang>/words/<từ>): content/seo/home-words.json.
// Chọn 12 từ đầu bảng xếp hạng (cùng thứ tự trang từ) mà indexable() = true (không mỏng, đạt độ dày). build-landing đọc file nhỏ này, không nạp kho từ.
//   node scripts/seo/home-words.mjs          ghi lại file      ·      --check   so với file đang có (test: scripts/test/home-words.mjs)
import fs from 'node:fs';
const W = await import('../lib/seo-words.mjs');
export const LANGS = ['es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'], N = 10, FILE = 'content/seo/home-words.json';
export const pick = () => Object.fromEntries(LANGS.map(l => [l, W.setOf[l].filter(e => W.indexable(l, e)).slice(0, N).map(e => [W.slug.get(e), e.word, String(W.gloss(l, e)[0] || '').split(/[;,，、]/)[0].trim()])]));
if (process.argv[1] && process.argv[1].endsWith('home-words.mjs')) {
  const out = JSON.stringify(pick(), null, 1) + '\n';
  if (process.argv.includes('--check')) { if (!fs.existsSync(FILE) || fs.readFileSync(FILE, 'utf8') !== out) { console.error(`✗ ${FILE} cũ – chạy node scripts/seo/home-words.mjs`); process.exit(1); } console.log('✓ home-words khớp'); }
  else { fs.writeFileSync(FILE, out); console.log(`✓ ${FILE}: ${LANGS.length} ngôn ngữ × ${N}`); }
}
