/* Phát âm – "huấn luyện viên" thuần (không DOM, test: scripts/test/pron-coach.mjs): nhịp câu & dạng yếu (IPA Anh/Mỹ đã kiểm ở PR #178 – UI.WEAK),
 * so câu nói với câu mẫu (bỏ sót từ nội dung / hư từ), điểm tử tế 3 mức và gợi ý bài luyện kế tiếp (cặp âm yếu nhất → bài nhịp chưa làm).
 * Câu luyện nhịp: tự biên soạn 100 % (docs/CONTENT-RULES.md), nhiều hư từ để nghe rõ dạng yếu. */
(function (g) {
  // Câu luyện nhịp: w = từ nhấn tùy chỉnh (mặc định: mọi từ không phải hư từ/đại từ). lv = trình độ.
  const SENTENCES = [
    { s: 'I want to go to the shop.', lv: 'A2' },
    { s: 'Can you give me a cup of tea?', lv: 'A2' },
    { s: 'She was at home for the weekend.', lv: 'A2' },
    { s: 'What do you want for lunch?', lv: 'A2' },
    { s: 'We have been waiting for an hour.', lv: 'B1' },
    { s: 'I would like a loaf of bread and some milk.', lv: 'B1' },
    { s: 'He should have told us about the meeting.', lv: 'B1' },
    { s: 'They were tired, but they finished the project.', lv: 'B1' },
    { s: 'Could you send me the report by Friday?', lv: 'B1' },
    { s: 'It is one of the best places that I have visited.', lv: 'B2' },
    { s: 'There are more jobs in the city than in the countryside.', lv: 'B2' },
    { s: 'If I had more time, I would learn to play the guitar.', lv: 'B2' },
  ];
  // Từ không nhấn ngoài bảng hư từ (đại từ chủ ngữ, giới từ ngắn…) – vẫn đọc nhẹ nhưng không có dạng yếu /ə/ riêng
  const LIGHT = new Set('i me my we our it its he she they there is in on by if with about'.split(' '));
  const toks = s => String(s || '').match(/[A-Za-z][A-Za-z']*/g) || [];
  const low = s => String(s || '').toLowerCase().replace(/[’']/g, "'");

  /** plan(sentence, accent, WEAK) → [{ w, stress (bool), weak ('/tə/'|''), light }] – WEAK: { word: [UK, US, ví dụ, từ loại không yếu] } */
  function plan(x, accent, WEAK = {}) {
    const s = typeof x === 'string' ? x : x.s, forced = x && x.w ? new Set(x.w.map(low)) : null;
    const us = accent === 'en-US' || accent === 'US';
    return toks(s).map(w => {
      const k = low(w), wk = Object.prototype.hasOwnProperty.call(WEAK, k) ? WEAK[k] : null;
      const stress = forced ? forced.has(k) : !wk && !LIGHT.has(k);
      return { w, stress, weak: wk && !stress ? '/' + wk[us ? 1 : 0] + '/' : '', light: !stress };
    });
  }

  /** diff(heard, target) → { missing:[từ], missingContent:[từ], missingWeak:[từ], extra:[từ], cover 0–1 } – không phân biệt hoa thường/dấu câu */
  function diff(heard, target, WEAK = {}) {
    const h = toks(heard).map(low), want = toks(target).map(low), pool = h.slice(), missing = [];
    for (const w of want) { const i = pool.indexOf(w); if (i >= 0) pool.splice(i, 1); else missing.push(w); }
    const isFn = w => Object.prototype.hasOwnProperty.call(WEAK, w) || LIGHT.has(w);
    return { missing, missingContent: missing.filter(w => !isFn(w)), missingWeak: missing.filter(isFn), extra: pool, cover: want.length ? (want.length - missing.length) / want.length : 0 };
  }

  /** band(điểm 0–100) → 'great' (≥ 85) | 'close' (≥ 65) | 'again' – lời tử tế, không bao giờ "sai" */
  const band = s => (s >= 85 ? 'great' : s >= 65 ? 'close' : 'again');

  /** Điểm câu shadowing: độ giống chữ (similarity 0–1) × độ phủ từ nội dung; bỏ sót hư từ trừ nhẹ (nói nhanh quá có thể làm máy nghe sót – đúng bản chất dạng yếu) */
  function score(sim, d) {
    const content = d.missingContent.length, weak = d.missingWeak.length;
    return Math.max(0, Math.min(100, Math.round(sim * 100 - content * 12 - weak * 3)));
  }

  /** next({ pairs: PronPairs, stats, rhythm: {k: điểm}, skill }) → tối đa 3 gợi ý [{ kind:'pair', id, skill } | { kind:'rhythm', k } | { kind:'skill', id }] */
  function next(o = {}) {
    const out = [], P = o.pairs, st = o.stats || {};
    if (P && P.weak && P.CONTRASTS) {
      for (const id of P.weak(st, P.CONTRASTS.map(c => c.id)).slice(0, 2)) { const c = P.CONTRASTS.find(x => x.id === id); if (c) out.push({ kind: 'pair', id, skill: c.skills[0] }); }
    }
    const rh = o.rhythm || {};
    const k = SENTENCES.findIndex((x, i) => !(rh[i] >= 85));
    if (k >= 0) out.push({ kind: 'rhythm', k });
    if (out.length < 3) for (const id of ['weak-forms', 'connected-speech', 'word-stress']) if (id !== o.skill && out.length < 3) out.push({ kind: 'skill', id });
    return out.slice(0, 3);
  }

  g.PronCoach = { SENTENCES, plan, diff, band, score, next, toks };
})(typeof self !== 'undefined' ? self : this);
