// Ví dụ tiếng Anh trong dấu ngoặc của câu giải thích ("I can swim", ‘an apple’) PHẢI giữ nguyên ở mọi ngôn ngữ đích:
// học viên cần thấy đúng chữ Anh đang được giải thích. Dịch máy hay dịch luôn cả ví dụ (apple→manzana, "can"→"können") → giải thích vô nghĩa.
// Thuần hàm, không mạng: dùng ở generator (khôi phục sau dịch), công cụ sửa kho cũ và cổng CI (scripts/test/quote-english.mjs).
const SPAN = /“([^“”]*)”|‘([^‘’]*)’|"([^"]*)"|„([^“”„]*)[“”]|«\s?([^«»]*?)\s?»|「([^「」]*)」|『([^『』]*)』/g;
export function findSpans(text) {
  const out = [];
  for (const m of String(text).matchAll(SPAN)) {
    const g = m.slice(1).findIndex(x => x !== undefined), inner = m[g + 1];
    const iStart = m.index + m[0].indexOf(inner, 1);
    out.push({ start: iStart, end: iStart + inner.length, inner });
  }
  return out;
}
// Mảnh "chữ Anh": chỉ ASCII, có chữ cái, không dấu tiếng Việt, không quá dài (câu mẫu dài vẫn ≤ 90).
export const isEnglishSpan = s => /^[A-Za-z0-9][A-Za-z0-9 ,.'’?!;:()\-\/…~+]*$/.test(s.trim()) && /[A-Za-z]/.test(s) && s.trim().length <= 90 && !/^[0-9\s.,]+$/.test(s);
export function violations(src, tr) {
  const low = String(tr).toLowerCase();
  return findSpans(src).filter(s => isEnglishSpan(s.inner) && !low.includes(s.inner.trim().toLowerCase())).map(s => s.inner.trim());
}
// Khôi phục: số mảnh ngoặc nguồn == bản dịch → thay nội dung mảnh dịch bằng mảnh Anh gốc (đúng thứ tự). Lệch số lượng → ok:false (cần dịch lại).
export function restore(src, tr) {
  if (!violations(src, tr).length) return { text: tr, ok: true, changed: false };
  const S = findSpans(src), T = findSpans(tr);
  if (S.length !== T.length) return { text: tr, ok: false, changed: false };
  let t = tr;
  for (let i = T.length - 1; i >= 0; i--) {
    if (!isEnglishSpan(S[i].inner)) continue;
    if (T[i].inner.trim().toLowerCase() === S[i].inner.trim().toLowerCase()) continue;
    t = t.slice(0, T[i].start) + S[i].inner.trim() + t.slice(T[i].end);
  }
  return { text: t, ok: violations(src, t).length === 0, changed: t !== tr };
}
