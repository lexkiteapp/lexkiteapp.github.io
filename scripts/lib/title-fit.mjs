// <title> ≤ 60 ký tự (docs/SEO-AUDIT-1511.md #4): Google cắt/viết lại tiêu đề dài. Bỏ dần các đoạn đuôi (sau " | ", " – ", ": ")
// cho tới khi vừa; đoạn đầu (chứa từ khoá/từ riêng của trang) luôn giữ nên tiêu đề vẫn duy nhất. Đầu > 60 → cắt ở ranh giới từ + "…".
export const TITLE_MAX = 60;
// segments:false = chỉ cắt theo từ. KHÔNG dùng cho trang mẫu/ielts-writing: chủ đề duy nhất nằm ở đuôi dài → cắt gây trùng tiêu đề (CI seo-pages đỏ 30 lỗi, PR #1397).
export function fitTitle(title, max = TITLE_MAX, { segments = true } = {}) {
  const s = String(title || '').trim();
  if ([...s].length <= max) return s;
  const parts = s.split(/( \| | – | — |: )/); // [đoạn, sep, đoạn, sep, …]
  while (segments && parts.length > 1 && [...parts.join('')].length > max) parts.splice(-2, 2);
  let out = parts.join('');
  if ([...out].length > max) {
    const cut = [...out].slice(0, max - 1).join(''), sp = cut.lastIndexOf(' ');
    out = (sp > max * 0.5 ? cut.slice(0, sp) : cut).replace(/[\s,;:–—|-]+$/, '') + '…';
  }
  return out;
}
