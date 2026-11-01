// Cổng chặn LOẠI lỗi "đường dẫn nội bộ ghép từ biến rỗng/undefined" (vd. /vi/blog/-lang, /vi/blog/undefined/, //).
// Dùng ở nơi dựng URL (build) và ở test quét liên kết (scripts/test/links-js.mjs, scripts/test/crawl.js).
const BAD_VAR = /(^|[^a-z])(undefined|null|nan)([^a-z]|$)|\[object/i;
/** Lý do nếu pathname nội bộ có dấu hiệu ghép hỏng, ngược lại null. */
export function badPath(p) {
  p = String(p); if (!p.startsWith('/') || p.startsWith('//')) return null;
  p = p.split(/[?#]/)[0];
  if (/\/\//.test(p)) return 'đoạn rỗng (//)';
  for (const raw of p.split('/').filter(Boolean)) {
    let s = raw; try { s = decodeURIComponent(raw); } catch { /* giữ nguyên */ }
    if (s === '.well-known') continue;
    if (/^[-_.]/.test(s)) return `đoạn bắt đầu bằng ký tự nối "${s}"`;
    if (/[-_]$/.test(s)) return `đoạn kết thúc bằng ký tự nối "${s}"`;
    if (BAD_VAR.test(s)) return `đoạn chứa biến rỗng "${s}"`;
  }
  return null;
}
/** Ghép đường dẫn; ném lỗi nếu có phần rỗng/undefined/null (thay cho nối chuỗi trần). */
export function joinPath(...parts) {
  parts.forEach((x, i) => { if (x === undefined || x === null || String(x).replace(/\//g, '').trim() === '') throw new Error(`joinPath: phần #${i} rỗng/undefined (${JSON.stringify(parts)})`); });
  const out = '/' + parts.map(x => String(x).replace(/^\/+|\/+$/g, '')).join('/') + (String(parts.at(-1)).endsWith('/') ? '/' : '');
  const why = badPath(out); if (why) throw new Error(`joinPath: ${out} hỏng (${why})`);
  return out;
}
