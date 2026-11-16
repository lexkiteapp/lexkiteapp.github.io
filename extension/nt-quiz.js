/* Câu đố 10 giây ở Tab mới: dựng 4 lựa chọn nghĩa từ 1 thẻ FSRS đến hạn (hàm thuần – test ở scripts/test/ext-newtab-quiz.mjs).
 * Không mạng, không quyền mới. Chữ giao diện: _locales ntQz*. */
(function (root) {
  'use strict';
  const COOLDOWN_MS = 30 * 60 * 1000; // tối đa 1 câu / 30 phút: không gây áp lực mỗi lần mở tab
  const SECONDS = 10;
  const clip = s => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > 90 ? s.slice(0, 87).replace(/\s\S*$/, '') + '…' : s; };
  // Nghĩa hiển thị: cùng quy tắc với thẻ (vi: nghĩa Việt, còn lại định nghĩa Anh)
  const meaning = (D, C, lang) => {
    const s = (D && D.s && D.s[0]) || null, vi = s ? s[1] : (C && C.vi) || '', def = s ? s[2] : (C && C.def) || '';
    return clip(lang === 'vi' ? vi || def : def || vi);
  };
  const shuffle = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // target {word, meaning}; pool [{word, meaning}] → {word, choices[4], answer(index)} hoặc null nếu thiếu mồi khác nghĩa
  function build(target, pool, rnd) {
    rnd = rnd || Math.random;
    if (!target || !target.meaning) return null;
    const seen = new Set([target.meaning.toLowerCase()]), mo = [];
    for (const p of shuffle(pool || [], rnd)) {
      const k = p.meaning && p.meaning.toLowerCase();
      if (!k || seen.has(k) || p.word === target.word) continue;
      seen.add(k); mo.push(p.meaning); if (mo.length === 3) break;
    }
    if (mo.length < 3) return null;
    const choices = shuffle([target.meaning, ...mo], rnd);
    return { word: target.word, choices, answer: choices.indexOf(target.meaning) };
  }
  const canShow = (last, now) => !last || now - last >= COOLDOWN_MS || now < last;
  const api = { build, meaning, canShow, COOLDOWN_MS, SECONDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.NtQuiz = api;
})(typeof self !== 'undefined' ? self : this);
