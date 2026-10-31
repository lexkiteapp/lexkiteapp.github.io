/* 🎙️ Play & Speak – Speak.score: MỘT chỗ chấm nói (docs/specs/play-and-speak.md §5). Bọc UI.recognize (Web Speech / Whisper trên máy),
 * không sửa file của #281/#286 (GOP: khi có window.Gop.score thì engine 'gop' cộng thêm điểm âm vị). Âm thanh không rời máy.
 *   Speak.score({target, mode:'drill'|'free'|'game', intents?, accent?, onStart?}) → Promise<{engine, text:0–1, gop?, words:[{w,ok}], fluency:{wpm,pauses}, intent?, conf, ms, heard, unclear?, error?}>
 *   Speak.align(target, heard) → words[{w,ok}] (thuần, test scripts/test/speak.mjs) · Speak.intentOf(heard, intents) · Speak.pass(r) · Speak.stop()
 * Ngưỡng đạt: CAL (hồi quy logistic trên tập hiệu chuẩn CI – §5). Chưa có số đo thì dùng mục tiêu tỉ lệ đạt 80% của LEARNING-PATH (calibrated:false). */
(function (g) {
  const CAL = { a: 12, b: -9.6, calibrated: false }; // P(đạt) = σ(a·text + b) ≥ 0,5 ⇔ text ≥ 0,8 – thay bằng hệ số CI khi có (§5)
  const norm = s => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').trim();
  const toks = s => norm(s).split(/\s+/).filter(Boolean);
  // Căn chữ theo LCS: từ của câu mẫu (giữ dấu câu để hiển thị) → ok khi khớp theo thứ tự trong câu nghe được
  function align(target, heard) {
    const shown = String(target || '').split(/\s+/).filter(Boolean), a = shown.map(w => norm(w).replace(/\s+/g, '')), b = toks(heard).map(w => w.replace(/\s+/g, ''));
    const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] && a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const ok = new Array(n).fill(false); for (let i = 0, j = 0; i < n && j < m;) { if (a[i] && a[i] === b[j]) { ok[i] = true; i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
    return shown.map((w, i) => ({ w, ok: ok[i] || !a[i] }));
  }
  // Ý định trên máy (không gọi LLM): intents = [{id, keywords:[…]}] → id đầu tiên có từ khoá trong câu nghe được
  const intentOf = (heard, intents) => { const h = ' ' + toks(heard).join(' ') + ' '; for (const it of intents || []) if ((it.keywords || []).some(k => h.includes(' ' + toks(k).join(' ') + ' '))) return it.id; return null; };
  const pass = r => !!r && !r.unclear && 1 / (1 + Math.exp(-(CAL.a * r.text + CAL.b))) >= 0.5;
  let cur = null;
  const stop = () => { if (cur) try { cur.stop(); } catch (e) { /* đã dừng */ } };
  function score(o) {
    o = o || {}; const target = String(o.target || ''), t0 = Date.now(); let tEnd = 0, began = 0;
    return new Promise(res => {
      const UI = g.UI; if (!UI || !UI.recognize) return res({ engine: 'webspeech', text: 0, words: align(target, ''), fluency: { wpm: 0, pauses: null }, conf: 0, ms: 0, heard: '', unclear: true, error: 'unsupported' });
      const done = (heard, conf, err) => {
        cur = null; const words = align(target, heard), okN = words.filter(w => w.ok).length, dur = Math.max(1, (tEnd || Date.now()) - (began || t0)) / 1000, n = toks(heard).length;
        const r = { engine: ctl && ctl._whisper ? 'whisper' : 'webspeech', text: words.length ? okN / words.length : 0, words, fluency: { wpm: n ? Math.round(n / dur * 60) : 0, pauses: null }, conf: conf || 0, ms: tEnd ? Date.now() - tEnd : 0, heard: heard || '' };
        if (!heard) { r.unclear = true; if (err) r.error = err; }
        if (o.intents) r.intent = intentOf(heard, o.intents);
        if (g.Gop && g.Gop.score && r.audio) try { const p = g.Gop.score(target, r.audio); if (p && p.gop != null) { r.engine = 'gop'; r.gop = p.gop; } } catch (e) { /* GOP chưa sẵn (#286) */ }
        res(r);
      };
      ctl = UI.recognize(target, o.accent || 'en-US', {
        start: () => { began = Date.now(); o.onStart && o.onStart(); },
        result: x => done(x && x.heard, x && x.score != null ? x.score / 100 : 0),
        error: c => done('', 0, c || 'error'),
        end: () => { tEnd = tEnd || Date.now(); },
      });
      cur = ctl; if (!ctl) done('', 0, 'unsupported');
    });
  }
  g.Speak = Object.assign(g.Speak || {}, { score, align, intentOf, pass, stop, CAL, toks });
})(typeof self !== 'undefined' ? self : globalThis);
