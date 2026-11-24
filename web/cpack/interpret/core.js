/* Phiên dịch (#/interpret) – lõi thuần (không DOM): ngôn ngữ ↔ mã giọng nói, chọn bên nói theo ngôn ngữ dò được, lịch sử trên máy, từ mới sau hội thoại.
 * MỘT nguồn với cổng scripts/test/interpret.mjs. Lịch sử chỉ ở localStorage của máy (không gửi đi, không đồng bộ). */
(function (g) {
  const LOC = { en: 'en-US', vi: 'vi-VN', es: 'es-ES', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE', id: 'id-ID', th: 'th-TH', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', hi: 'hi-IN', ar: 'ar-SA', ru: 'ru-RU', tr: 'tr-TR' };
  const CODES = Object.keys(LOC), RTL = new Set(['ar']), KEY = 'lk.interp.v1', MAX_CONV = 30, MAX_TURN = 200;
  const base = l => String(l || '').toLowerCase().split('-')[0];
  const ok = l => CODES.includes(base(l));
  const dirOf = l => (RTL.has(base(l)) ? 'rtl' : 'ltr');

  /** Ai vừa nói? `side` = bên bấm mic ('a'|'b'); dò ngôn ngữ chắc (≥ 0,6) và thuộc đúng 1 bên của cặp → bên đó mới là người nói (người kia lấy mic hộ). */
  function speaker(det, pair, side) {
    const d = det && base(det.lang), c = det ? +det.confidence || 0 : 0;
    if (d && c >= 0.6) { if (d === base(pair.a)) return 'a'; if (d === base(pair.b)) return 'b'; }
    return side;
  }

  const load = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); return o && Array.isArray(o.convs) ? o : { convs: [] }; } catch (e) { return { convs: [] }; } };
  const save = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch (e) { return false; } };
  /** Thêm 1 lượt vào hội thoại `id` (tạo mới nếu chưa có). turn = { from:'a'|'b', src, dst, tx, ts }. */
  function addTurn(id, pair, turn) {
    const d = load(); let c = d.convs.find(x => x.id === id);
    if (!c) { c = { id, t: turn.ts || Date.now(), a: base(pair.a), b: base(pair.b), turns: [] }; d.convs.unshift(c); }
    c.turns.push(turn); if (c.turns.length > MAX_TURN) c.turns.splice(0, c.turns.length - MAX_TURN);
    d.convs = d.convs.slice(0, MAX_CONV); save(d); return c;
  }
  const clear = () => { try { localStorage.removeItem(KEY); } catch (e) { /* riêng tư */ } };

  /** Từ đáng học trong 1 ngôn ngữ: ≥ 4 chữ (CJK/Thái: ≥ 2), bỏ trùng, ưu tiên từ lặp rồi từ dài; `known` = tập từ đã có. */
  function keyWords(texts, lang, n = 8, known = new Set()) {
    const l = base(lang), seg = /^(zh|ja|th)$/.test(l) && g.Intl && Intl.Segmenter ? new Intl.Segmenter(l, { granularity: 'word' }) : null, cnt = new Map();
    for (const tx of texts) {
      const ws = seg ? [...seg.segment(tx)].filter(s => s.isWordLike).map(s => s.segment) : (String(tx).toLowerCase().match(/[\p{L}\p{M}]+/gu) || []);
      for (const w of ws) { if ([...w].length < (seg ? 2 : 4) || known.has(w)) continue; cnt.set(w, (cnt.get(w) || 0) + 1); }
    }
    return [...cnt.entries()].sort((x, y) => y[1] - x[1] || [...y[0]].length - [...x[0]].length).slice(0, n).map(x => x[0]);
  }
  /** Những lượt cho thẻ ôn: cụm ở ngôn ngữ KHÁC ngôn ngữ của tôi (me) kèm nghĩa theo ngôn ngữ tôi. */
  function cards(conv, me) {
    const m = base(me), out = [], seen = new Set();
    for (const t of conv.turns) {
      const srcL = t.from === 'a' ? conv.a : conv.b, dstL = t.from === 'a' ? conv.b : conv.a;
      const [w, d, wl] = srcL === m ? [t.tx, t.src, dstL] : [t.src, t.tx, srcL]; // w = cụm tiếng nước ngoài, d = nghĩa theo ngôn ngữ của tôi
      if (wl === m || !w || seen.has(w)) continue; seen.add(w); out.push({ word: w, def: d, lang: wl });
    }
    return out;
  }
  g.InterpretCore = { LOC, CODES, base, ok, dirOf, speaker, load, save, addTurn, clear, keyWords, cards, KEY, MAX_CONV, MAX_TURN };
})(typeof self !== 'undefined' ? self : globalThis);
