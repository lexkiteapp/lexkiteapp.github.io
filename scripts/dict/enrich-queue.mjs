// Danh sách từ cần làm giàu (ghi chú dùng từ + ví dụ có bản dịch) cho trang /<lang>/words/<từ>: từ có thể index nhưng chưa đủ DEPTH_MIN,
// xếp theo hiển thị Search Console gần nhất (reports/seo/gsc-*.json) rồi điểm giá trị. In JSON (stdout) làm đầu vào cho người/AI soạn → content/dict/enrich/<lang>.json.
// Dùng: node scripts/dict/enrich-queue.mjs <lang> [n=60]   (đã có trong enrich/<lang>.json thì bỏ qua)
import fs from 'node:fs';
import { setOf, idxW, gloss, indexable, ENR, J } from '../lib/seo-words.mjs';
const [lang, nArg] = process.argv.slice(2), N = +nArg || 60;
if (!setOf[lang]) { console.error('✗ ngôn ngữ không hợp lệ'); process.exit(1); }
const files = fs.readdirSync('reports/seo').filter(f => /^gsc-\d{4}-\d\d-\d\d\.json$/.test(f)).sort();
const imp = new Map();
if (files.length) for (const p of J('reports/seo/' + files.at(-1)).pages || []) { const m = p.page.match(new RegExp(`/${lang}/words/([^/?#]+)`)); if (m) imp.set(m[1], p.impressions || 0); }
const { slug } = await import('../lib/seo-words.mjs');
const rows = setOf[lang].filter(e => idxW[lang].has(e) && !indexable(lang, e) && !ENR[lang][e.word.toLowerCase()])
  .map((e, i) => ({ e, i, imp: imp.get(slug.get(e)) || 0 })).sort((a, b) => b.imp - a.imp || a.i - b.i).slice(0, N);
console.log(JSON.stringify(rows.map(({ e, imp: im }) => {
  const g = gloss(lang, e);
  return { word: e.word, pos: e.pos, level: e.level, def: e.def, gloss: lang === 'en' ? undefined : g && g[0], ex: [e.ex, e.ex2].filter(Boolean), col: (e.col || []).slice(0, 6), syn: (e.syn || []).slice(0, 5), gscImpressions: im };
}), null, 1));
