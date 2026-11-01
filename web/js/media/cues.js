/* 🎬 Học qua video/audio – LOGIC THUẦN (không DOM), dùng chung cho trình phát clip (media/player.js) và Truyện/Podcast (stories/*).
 * Cue = { i, who, start, end, text, tr: {<lang>: câu dịch}, words?: [{ w, s, e }] } – giây, cùng dạng Stories.timeline() trả về (+ text).
 * Có: tìm câu đang phát, vị trí cụm từ/thành ngữ trong câu, chấm chính tả theo từng từ, sinh câu điền từ, lặp câu. Spec: docs/MEDIA.md. */
(function (g) {
  const LANGS = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
  const STOP = new Set('a an the i you he she it we they me my your his her its our their is am are was were be been to of in on at for and or but so if as by with from this that these those do does did not no yes oh hi'.split(' '));

  // Câu đang phát tại giây sec (tìm nhị phân; giữa 2 câu → câu vừa qua). Có Stories.sentenceAt (stories/core.js) thì dùng đúng hàm đó.
  function at(cues, sec) {
    if (g.Stories && g.Stories.sentenceAt) return g.Stories.sentenceAt(cues, sec);
    let lo = 0, hi = cues.length - 1, r = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (cues[m].start <= sec) { r = m; lo = m + 1; } else hi = m - 1; }
    return r;
  }
  // Từ đang đọc trong câu (karaoke) – -1 nếu chưa tới/không có mốc từ
  function wordAt(cue, sec) {
    const w = cue && cue.words; if (!w || !w.length) return -1;
    let r = -1; for (let k = 0; k < w.length; k++) { if (w[k].s <= sec) r = k; else break; } return r;
  }

  // Tách từ giữ vị trí ký tự (chữ cái/số + nháy trong từ: don't, it's, 6)
  function tokens(text) {
    const out = [], re = /[A-Za-z0-9]+(?:['’][A-Za-z]+)*/g; let m;
    while ((m = re.exec(String(text || '')))) out.push({ w: m[0], s: m.index, e: m.index + m[0].length, k: norm(m[0]) });
    return out;
  }
  const norm = w => String(w || '').toLowerCase().replace(/’/g, "'").replace(/[^a-z0-9']/g, '');

  // Vị trí các cụm từ (khóa của clip.phrases) trong câu, khớp nguyên từ, không phân biệt hoa thường; cụm dài ưu tiên, không chồng nhau.
  function phraseSpans(text, phrases) {
    const tk = tokens(text), keys = Object.keys(phrases || {}).map(p => ({ p, ws: tokens(p).map(t => t.k) })).filter(x => x.ws.length).sort((a, b) => b.ws.length - a.ws.length);
    const used = new Array(tk.length).fill(false), out = [];
    for (const { p, ws } of keys) {
      for (let i = 0; i + ws.length <= tk.length; i++) {
        if (ws.every((w, j) => tk[i + j].k === w && !used[i + j])) { for (let j = 0; j < ws.length; j++) used[i + j] = true; out.push({ s: tk[i].s, e: tk[i + ws.length - 1].e, key: p }); }
      }
    }
    return out.sort((a, b) => a.s - b.s);
  }
  // Câu → các đoạn [{ t, key? }] để vẽ (đoạn có key = cụm gạch chân)
  function segments(text, phrases) {
    const sp = phraseSpans(text, phrases), out = []; let c = 0;
    for (const x of sp) { if (x.s > c) out.push({ t: text.slice(c, x.s) }); out.push({ t: text.slice(x.s, x.e), key: x.key }); c = x.e; }
    if (c < text.length) out.push({ t: text.slice(c) });
    return out;
  }

  // Chính tả: căn từ gõ với câu gốc (LCS theo từ) → [{ w, ok, typed }] + điểm 0..100 (từ đúng / số từ câu gốc; từ thừa trừ điểm)
  function dictation(target, typed) {
    const A = tokens(target), B = tokens(typed), n = A.length, m = B.length;
    const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i].k === B[j].k ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const words = []; let i = 0, j = 0, extra = 0;
    while (i < n) {
      if (j < m && A[i].k === B[j].k) { words.push({ w: A[i].w, ok: true, typed: B[j].w }); i++; j++; }
      else if (j < m && L[i][j + 1] > L[i + 1][j]) { extra++; j++; }
      else { // từ gốc bị thiếu/sai: nếu từ gõ kế tiếp không khớp gì phía sau thì coi là gõ sai từ này
        const sub = j < m && L[i + 1][j + 1] === L[i][j] ? B[j++].w : '';
        words.push({ w: A[i].w, ok: false, typed: sub }); i++;
      }
    }
    extra += m - j;
    const good = words.filter(x => x.ok).length;
    return { words, extra, score: n ? Math.max(0, Math.round(100 * (good - 0.5 * extra) / n)) : 0 };
  }

  // Điền từ: chọn chỗ trống (ưu tiên từ trong cụm gạch chân, rồi từ nội dung ≥ 4 chữ), tối đa max/câu; seed cố định → cùng clip cùng đề
  function cloze(text, phrases, o = {}) {
    const max = o.max || 2, tk = tokens(text), inP = new Set();
    for (const sp of phraseSpans(text, phrases)) tk.forEach((t, k) => { if (t.s >= sp.s && t.e <= sp.e && !STOP.has(t.k)) inP.add(k); });
    const cand = tk.map((t, k) => ({ k, sc: (inP.has(k) ? 10 : 0) + (STOP.has(t.k) || t.k.length < 4 || /^\d+$/.test(t.k) ? -20 : t.k.length) + rnd(o.seed || 1, k) }))
      .filter(c => c.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, max).map(c => c.k).sort((a, b) => a - b);
    const parts = []; let c = 0;
    for (const k of cand) { const t = tk[k]; if (t.s > c) parts.push({ t: text.slice(c, t.s) }); parts.push({ blank: true, answer: t.w }); c = t.e; }
    if (c < text.length) parts.push({ t: text.slice(c) });
    return parts;
  }
  const rnd = (seed, k) => { const x = Math.sin(seed * 9301 + k * 49297) * 233280; return x - Math.floor(x); };
  const sameWord = (a, b) => !!norm(a) && norm(a) === norm(b);

  // Lặp câu: hết câu đang lặp → trả mốc tua về (giây), không thì null
  function loopSeek(cue, sec) { return cue && sec >= cue.end - 0.02 ? cue.start : null; }
  // Bản dịch theo ngôn ngữ mẹ đẻ; tiếng Anh (= ngôn ngữ gốc) hoặc thiếu → ''
  const trOf = (x, lang) => (lang && lang !== 'en' && x && x.tr && x.tr[lang]) || '';
  // Shadowing: điểm UI.recognize (0..100) → mức
  const grade = s => (s >= 85 ? 'great' : s >= 65 ? 'good' : 'retry');
  const wpm = cues => { const w = cues.reduce((n, c) => n + tokens(c.text).length, 0), t = cues.length ? cues[cues.length - 1].end - cues[0].start : 0; return t > 0 ? Math.round(w / t * 60) : 0; }; // cả quãng nói (câu đầu → câu cuối, gồm nghỉ giữa câu)

  const Media = { LANGS, at, wordAt, tokens, norm, phraseSpans, segments, dictation, cloze, sameWord, loopSeek, trOf, grade, wpm };
  g.MediaCues = Media;
  if (typeof module === 'object' && module.exports) module.exports = Media;
})(typeof self !== 'undefined' ? self : globalThis);
