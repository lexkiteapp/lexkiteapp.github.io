// Kiểm content/lexicon/img.json (ảnh minh hoạ theo nghĩa; mục {h, url (= base+h+.webp, giữ tương thích), alt, sv, q, ph, at, fmt:[avif,webp], x2?}) – dùng bởi build-lexicon (dict-consistency) và scripts/test/vocab-img.mjs.
export function checkImg(img, senses) {
  const bad = [];
  if (!img.style || !/^s\d+$/.test(img.style.v || '')) bad.push('img.json: style.v thiếu/sai');
  if (!/^https:\/\/media\.lexkite\.com\/vimg\/$/.test(img.base || '')) bad.push('img.json: base phải là https://media.lexkite.com/vimg/ (không thêm file vào Pages)');
  for (const [k, e] of Object.entries(img.items || {})) {
    if (!senses.has(k)) bad.push(`img.json ${k}: không có nghĩa này trong kho`);
    if (!/^[0-9a-f]{16}$/.test(e.h || '')) bad.push(`img.json ${k}: h sai`);
    if (e.url !== img.base + e.h + '.webp') bad.push(`img.json ${k}: url ≠ base + h + .webp`);
    if (!e.alt || !String(k).startsWith(e.alt.toLowerCase() + '#') && e.alt !== k.split('#')[0]) bad.push(`img.json ${k}: alt phải là từ của nghĩa`);
    if (!Array.isArray(e.fmt) || !e.fmt.includes('webp') || e.fmt.some(f => f !== 'avif' && f !== 'webp')) bad.push(`img.json ${k}: fmt phải là mảng ⊂ [avif, webp] và có webp`);
    if ('x2' in e && typeof e.x2 !== 'boolean') bad.push(`img.json ${k}: x2 phải là boolean (có @2x 768 px)`);
    if (!/^s\d+$/.test(e.sv || '')) bad.push(`img.json ${k}: sv sai`);
    if (!e.q || typeof e.q.score !== 'number') bad.push(`img.json ${k}: thiếu điểm QC q.score`);
    if ((img.rejected || {})[k]) bad.push(`img.json ${k}: vừa có ảnh vừa bị gỡ (rejected)`);
  }
  return bad;
}
