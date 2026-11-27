// 27/11: + vi (trang chủ /) và en (/en/) = 2 trang mạnh nhất (76+9 bấm, hạng 4 và 1,7) trước đây KHÔNG có liên kết sâu; 77 % URL từ Google chưa biết → 24 liên kết/trang (N).
// Từ nổi bật cho trang chủ 15 ngôn ngữ (liên kết sâu / → /<lang>/words/<từ>): content/seo/home-words.json.
// Chọn 10 từ index được, ưu tiên cầu tìm kiếm GSC (xem pick) rồi thứ tự trang từ – indexable() = true (không mỏng, đạt độ dày). build-landing đọc file nhỏ này, không nạp kho từ.
//   node scripts/seo/home-words.mjs          ghi lại file      ·      --check   so với file đang có (test: scripts/test/home-words.mjs)
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const W = await import('../lib/seo-words.mjs');
export const LANGS = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'], N = 24, FILE = 'content/seo/home-words.json';
// 22/11: thứ tự = CẦU TÌM KIẾM THẬT trước (báo cáo GSC mới nhất: hiển thị trang /<lang>/words/<từ> + cầu theo từ dictQueue mọi ngôn ngữ), rồi thứ hạng
// kho. Trang chủ là trang mạnh nhất (đã index) → liên kết sâu tới đúng từ người ta đang tra (vd th/detect hạng 8–12) giúp crawl + hạng.
// seo-gsc.yml sinh lại file này + trang chủ cùng commit báo cáo tuần (không lệch → không đỏ).
const gscFile = () => { try { const f = fs.readdirSync('reports/seo').filter(x => /^gsc-\d{4}-\d\d-\d\d\.json$/.test(x)).sort().at(-1); return f ? JSON.parse(fs.readFileSync('reports/seo/' + f, 'utf8')) : null; } catch { return null; } };
export const demand = (R = gscFile()) => {
  const term = new Map((R?.dictQueue || []).map(q => [String(q.term).toLowerCase(), q.impressions || 0])), page = new Map();
  for (const p of R?.pages || []) { const m = /\/([a-z]{2})\/words\/([^/?#]+)/.exec(p.page); if (m) page.set(m[1] + '/' + m[2], p.impressions || 0); }
  return (l, e) => (page.get(l + '/' + W.slug.get(e)) || 0) + (term.get(e.word.toLowerCase()) || 0);
};
export const pick = (d = demand()) => Object.fromEntries(LANGS.map(l => [l, W.setOf[l].map((e, i) => [e, i, d(l, e)]).filter(([e]) => W.indexable(l, e)).sort((a, b) => b[2] - a[2] || a[1] - b[1]).slice(0, N)
  .map(([e]) => [W.slug.get(e), e.word, String((l === 'en' ? '' : l === 'vi' ? e.vi : (W.gloss(l, e) || [])[0]) || '').split(/[;,，、]/)[0].trim()])]));
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { // chỉ khi chạy trực tiếp (test/home-words.mjs trùng tên tệp, import không được ghi đè json)
  const out = JSON.stringify(pick(), null, 1) + '\n';
  if (process.argv.includes('--check')) { if (!fs.existsSync(FILE) || fs.readFileSync(FILE, 'utf8') !== out) { console.error(`✗ ${FILE} cũ – chạy node scripts/seo/home-words.mjs`); process.exit(1); } console.log('✓ home-words khớp'); }
  else { fs.writeFileSync(FILE, out); console.log(`✓ ${FILE}: ${LANGS.length} ngôn ngữ × ${N}`); }
}
