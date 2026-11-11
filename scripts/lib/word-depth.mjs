// Đo độ dày trang từ /<lang>/words/<slug> – MỘT nguồn cho builder (quyết index/noindex) và cổng scripts/test/seo-pages.mjs (docs/specs/seo-words-depth.md §4).
// Khối nội dung = <section data-d="…">. Chữ = chữ trong các khối đó, trừ tiêu đề h2 và trừ khối WordNet (data-d="wn", chép được ở nhiều site) + FAQ (data-d="faq", lặp lại chữ trên trang).
// Đếm chữ: token chữ cái/số; chữ Hán/Kana/Hangul/Thái (không cách chữ) tính 1 chữ / 2 ký tự.
// Ngưỡng index – chỉ được TĂNG. Chốt 3/11/2026 theo số đo thật (spec §4): sau làm giàu, trang en trung vị 7 khối / 51 chữ riêng;
// 5/30 chỉ chặn trang chỉ có nghĩa + 1 câu (33/8.138 trang đang index). Nâng khi kho có thêm dữ liệu (ghi chú tiếng Anh theo L1, ví dụ).
export const DEPTH_MIN = { blocks: 5, words: 30 };
const NOT_OWN = new Set(['wn', 'faq']);
const DENSE = /[฀-๿぀-ヿ㐀-鿿가-힯]/g;
export const countWords = text => {
  const dense = (text.match(DENSE) || []).length;
  return (text.replace(DENSE, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length + Math.ceil(dense / 2);
};
const strip = h => h.replace(/<h2[^>]*>[\s\S]*?<\/h2>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
export function measure(html) {
  const own = [];
  let words = 0;
  for (const m of String(html).matchAll(/<section\b[^>]*\sdata-d="([\w-]+)"[^>]*>([\s\S]*?)<\/section>/g)) {
    if (NOT_OWN.has(m[1])) continue;
    own.push(m[1]); words += countWords(strip(m[2]));
  }
  return { blocks: own.length, words, kinds: own };
}
export const deep = r => r.blocks >= DEPTH_MIN.blocks && r.words >= DEPTH_MIN.words;
