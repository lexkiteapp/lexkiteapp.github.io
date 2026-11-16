/* Lõi chấm bài trung gian (mediation, docs/specs/mediation.md) – MỘT nguồn cho màn #/mediate (js/mediate.js) và cổng nội dung
 * scripts/content-qa/mediation-check.mjs (nạp file này qua vm). Hàm thuần, không DOM, không t().
 *   words(s)          → mảng từ (giữ It's, 14:50, 15%)
 *   hit(text, checks) → ý đạt khi MỌI nhóm cụm khóa có ít nhất một cụm xuất hiện (không phân biệt hoa thường)
 *   sourceText(src)   → chữ của nguồn (đoạn / hội thoại / biểu đồ) để so chép nguyên văn
 *   copied(a, src, n) → cụm ≥ n từ liền nhau của a có nguyên văn trong src ('' nếu không)
 *   check(item, text) → { n, inRange, points:[{idea, ok}], extra:[idea], copied }
 *   voices(src)       → giọng Kokoro (Anh-Anh) cố định cho nguồn: { _narrator, <người nói>: voice } – màn phát và corpus mediation-source dùng chung */
(function (g) {
  'use strict';
  const COPY_RUN = 8;
  const words = s => (String(s || '').match(/[A-Za-z0-9][A-Za-z0-9'’:%.-]*/g) || []).map(w => w.replace(/[.]+$/, '')).filter(Boolean);
  const norm = s => ' ' + String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[–—]/g, '-').replace(/\s+/g, ' ') + ' ';
  const hit = (text, checks) => { const t = norm(text); return (checks || []).length > 0 && checks.every(c => (c || []).some(k => t.includes(String(k).toLowerCase()))); };
  function sourceText(src) {
    if (!src) return '';
    if (src.kind === 'chart') return [src.caption, ...(src.cols || []), ...(src.rows || []).flat(), src.note].filter(x => x != null).join(' ');
    if (src.kind === 'dialogue') return (src.lines || []).map(l => (l && l.t) || '').join(' ');
    return Array.isArray(src.text) ? src.text.join(' ') : String(src.text || '');
  }
  function copied(a, source, n = COPY_RUN) {
    const m = words(a).map(w => w.toLowerCase()), s = ' ' + words(source).map(w => w.toLowerCase()).join(' ') + ' ';
    for (let i = 0; i + n <= m.length; i++) { const run = m.slice(i, i + n).join(' '); if (s.includes(' ' + run + ' ')) return run; }
    return '';
  }
  function check(item, text) {
    const task = item.task || {}, n = words(text).length;
    return {
      n, inRange: n >= (task.min_words || 0) && n <= (task.max_words || Infinity),
      points: (item.points || []).map(p => ({ id: p.id, idea: p.idea, ok: hit(text, p.checks) })),
      extra: (item.leave_out || []).filter(p => hit(text, p.checks)).map(p => p.idea),
      copied: copied(text, sourceText(item.source)),
    };
  }
  // Hội thoại: Ms/Mrs/Miss hoặc tên kết thúc -a/-ei/-ie (Hana, Mei) → giọng nữ; Mr hoặc tên khác → giọng nam; danh xưng trung tính (Dr, Professor…) xen kẽ; mỗi người một giọng
  const POOL = { f: ['bf_isabella', 'bf_lily', 'bf_alice'], m: ['bm_lewis', 'bm_daniel', 'bm_fable'] }, NARRATOR = 'bf_emma';
  function voices(src) {
    const out = { _narrator: NARRATOR }, used = { f: 0, m: 0 };
    const who = [...new Set(((src && src.lines) || []).map(l => l.s))];
    who.forEach((s, i) => { const gd = /^(Ms|Mrs|Miss)\b/.test(s) ? 'f' : /^Mr\b/.test(s) ? 'm' : /^(Dr|Professor|Prof)\b|^(Customer|Shop|Speaker)/.test(s) ? (i % 2 ? 'f' : 'm') : /(a|ei|ie)$/i.test(s) ? 'f' : 'm'; out[s] = POOL[gd][used[gd]++ % POOL[gd].length]; });
    return out;
  }
  g.MediateCore = { COPY_RUN, words, norm, hit, sourceText, copied, check, voices };
})(typeof self !== 'undefined' ? self : globalThis);
