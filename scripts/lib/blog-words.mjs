// 🔗 Liên kết nội bộ blog → trang từ /<lang>/words/<slug> cho 13 ngôn ngữ chưa có trang từ điển (vi/en: scripts/dict/links.mjs › blogDictBox).
// build-blog.mjs gọi blogWordsBox(p) – chèn lúc dựng, không sửa nội dung bài (docs/specs/seo-words-depth.md §3).
// Từ nhấn *từ* trong bài + thẻ/từ khoá một chữ → trang từ cùng ngôn ngữ, ≤ 8. build-blog chạy TRƯỚC build-seo-pages nên tập trang lấy từ
// CHÍNH hàm chọn của scripts/lib/seo-words.mjs: chỉ link trang sẽ index được (indexable – không mỏng, đạt DEPTH_MIN) → không link trang noindex/không có.
// SEO_PAGES=0 (không sinh /words/) hoặc chưa gọi loadBlogWords() → không hộp. Cổng: scripts/test/seo-pages.mjs (link blog → /words/ phải tới trang có thật, index được).
const LANGS = ['es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
// Nhãn hộp – dịch tay
const H = {
  es: 'Consulta las palabras de este artículo',
  pt: 'Consulte as palavras deste artigo',
  fr: 'Les mots de cet article, expliqués',
  de: 'Wörter aus diesem Artikel nachschlagen',
  id: 'Cari arti kata-kata dalam artikel ini',
  th: 'ดูความหมายของคำศัพท์ในบทความนี้',
  zh: '查一查本文中的单词',
  ja: 'この記事の単語を調べる',
  ko: '이 글에 나온 단어 찾아보기',
  hi: 'इस लेख के शब्दों के अर्थ देखें',
  ar: 'ابحث عن معاني كلمات هذا المقال',
  ru: 'Слова из этой статьи: значение и примеры',
  tr: 'Bu yazıdaki kelimelerin anlamlarına bakın',
};
export const BLOG_WORDS_LANGS = LANGS, BLOG_WORDS_H = H;
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const STEM = [[/ies$/, 'y'], [/ied$/, 'y'], [/es$/, ''], [/s$/, ''], [/ed$/, ''], [/ed$/, 'e'], [/ing$/, ''], [/ing$/, 'e'], [/([b-df-hj-np-tv-z])\1(ed|ing)$/, '$1']];
let W = null; // scripts/lib/seo-words.mjs – nạp bằng loadBlogWords() (build-blog), để cổng/test chỉ cần hằng số không phải nạp kho từ
export async function loadBlogWords() { if (process.env.SEO_PAGES !== '0') W = await import('./seo-words.mjs'); }
export function blogWords(p, max = 8) {
  if (!W || !LANGS.includes(p.lang)) return [];
  const m = W.inSet[p.lang], seen = [];
  // dạng biến tố trong bài (*relies*, *enabled*, *eliminating*) → từ gốc có trang
  const find = w => { if (m.has(w)) return m.get(w); for (const [re, to] of STEM) if (re.test(w)) { const b = w.replace(re, to); if (b.length >= 3 && m.has(b)) return m.get(b); } return null; };
  const add = w => { const e = find(String(w || '').toLowerCase().trim()); if (e && !seen.includes(e) && seen.length < max && W.indexable(p.lang, e)) seen.push(e); };
  for (const x of String(p.body || '').matchAll(/(?<![*\w])\*([A-Za-z]{3,})\*(?![*\w])/g)) add(x[1]);
  for (const t of [p.keyword, ...(p.tags || [])]) if (/^[a-z]{3,}$/i.test(String(t || '').trim())) add(t);
  return seen;
}
export const blogWordsBox = p => {
  const ws = blogWords(p); if (!ws.length) return '';
  return `<aside class="tool-links dict-links" aria-label="${esc(H[p.lang])}"><p class="tl-h">📖 ${esc(H[p.lang])}</p><ul>${ws.map(e => `<li><a href="${W.wPath(p.lang, e)}" lang="en" dir="ltr">${esc(e.word)}</a> <small>${esc(String(W.gloss(p.lang, e)[0]).split(/[;,，、；]/)[0])}</small></li>`).join('')}</ul></aside>`;
};
