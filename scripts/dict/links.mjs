// 🔗 Liên kết nội bộ blog → trang từ điển (docs/SEO-DICT-PAGES.md §3b). build-blog.mjs gọi blogDictBox(p) – chèn lúc dựng, không sửa nội dung bài.
// Từ nhấn *từ* trong bài (cách bài từ vựng đánh dấu từ đang bàn) + thẻ/từ khoá một chữ → trang /vi/tu-dien/<từ>/ | /en/dictionary/<từ>/ nếu từ có trang (pool).
// Trang ngoài N vẫn trả 200 (noindex,follow) → link không bao giờ hỏng; khi bậc mở rộng, link đã sẵn.
import { dictPool } from './build.mjs';
import { ENABLED, wordPath, slugOf } from '../../workers/dict/render.mjs';
const L = { vi: { h: 'Tra nhanh trong từ điển Anh–Việt' }, en: { h: 'Look these words up in the dictionary' } };
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let MAP = null;
const pool = () => (MAP ||= new Map(dictPool().map(e => [e.word, e])));
export function dictWords(p, max = 8) {
  if (!ENABLED.includes(p.lang)) return [];
  const m = pool(), seen = [];
  const add = w => { w = String(w || '').toLowerCase().trim(); if (m.has(w) && !seen.includes(w) && seen.length < max) seen.push(w); };
  for (const x of String(p.body || '').matchAll(/(?<![*\w])\*([A-Za-z]{3,})\*(?![*\w])/g)) add(x[1]);
  for (const t of [p.keyword, ...(p.tags || [])]) if (/^[a-z]{3,}$/i.test(String(t || '').trim())) add(t);
  return seen.map(w => m.get(w));
}
export const blogDictBox = p => {
  const ws = dictWords(p); if (!ws.length) return '';
  return `<aside class="tool-links dict-links" aria-label="${esc(L[p.lang].h)}"><p class="tl-h">📖 ${esc(L[p.lang].h)}</p><ul>${ws.map(e => `<li><a href="${wordPath(p.lang, slugOf(e.word))}" lang="en">${esc(e.word)}</a> <small>${esc(String(p.lang === 'vi' ? e.vi : e.def).split(/[;,]/)[0])}</small></li>`).join('')}</ul></aside>`;
};
