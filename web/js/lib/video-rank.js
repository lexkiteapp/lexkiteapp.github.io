/* Xếp hạng video bài học (lesson-video.js, test: scripts/test/video-web.mjs).
 * điểm = khớp thẻ × hợp trình độ × chưa xem × đa dạng template/series (× hiệu quả đo được w).
 * Thứ tự kết quả: không có 2 clip liền nhau cùng template hoặc cùng series (khi còn lựa chọn khác). */
(function (g) {
  const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const inter = (a, b) => { if (!a || !b || !a.length || !b.length) return 0; const s = new Set(b); return a.filter(x => s.has(x)).length; };
  function tagMatch(it, c) {
    const t = it.tags || {};
    const m = 3 * inter(t.lex, c.lex) + 2 * inter(t.words, (c.words || []).map(w => String(w).toLowerCase())) + 3 * inter(t.grammar, c.grammar)
      + (c.situation && t.situation === c.situation ? 1.5 : 0) + (c.exam && t.exam === c.exam ? 1 : 0) + (c.skill && t.skill === c.skill ? 0.5 : 0);
    const asked = ['lex', 'words', 'grammar'].some(k => c[k] && c[k].length) || c.situation;
    return asked ? (m > 0 ? 1 + m : (c.strict ? 0 : 0.2)) : 1;
  }
  function levelFit(it, c) {
    const a = CEFR.indexOf((it.tags || {}).cefr), b = CEFR.indexOf(c.level || '');
    if (a < 0 || b < 0) return 0.8;
    return [1, 0.8, 0.5][Math.abs(a - b)] || 0.3;
  }
  function score(it, c, prev) {
    c = c || {};
    if (it.id === c.exclude) return 0;
    const seen = c.seen && c.seen[it.id] ? 0.25 : 1;
    const div = prev ? (prev.template === it.template ? 0.4 : 1) * (prev.series && prev.series === it.series ? 0.5 : 1) : 1;
    return tagMatch(it, c) * levelFit(it, c) * seen * div * (it.w > 0 ? it.w : 1);
  }
  /** rank(items, ctx) → [{ it, s }] tốt nhất trước; ctx.prev = clip vừa xem (đa dạng), ctx.strict = bắt buộc khớp thẻ. */
  function rank(items, c) {
    c = c || {};
    let pool = (items || []).map(it => ({ it, s: score(it, c, c.prev) })).filter(x => x.s > 0), out = [], prev = c.prev || null;
    while (pool.length) {
      pool.sort((a, b) => b.s - a.s || (a.it.id < b.it.id ? -1 : 1));
      let i = prev ? pool.findIndex(x => x.it.template !== prev.template && (!prev.series || x.it.series !== prev.series)) : 0;
      if (i < 0) i = 0;
      const [x] = pool.splice(i, 1); out.push(x); prev = x.it;
      pool = pool.map(y => ({ it: y.it, s: score(y.it, c, prev) })).filter(y => y.s > 0);
    }
    return out;
  }
  const api = { rank, score, tagMatch, levelFit, CEFR };
  if (typeof module === 'object' && module.exports) module.exports = api; else g.LkVideoRank = api;
})(typeof self !== 'undefined' ? self : this);
