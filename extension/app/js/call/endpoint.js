/* Call RT – biết người học nói xong / nói chen (logic thuần, không DOM; test: scripts/test/call-rt.mjs). docs/specs/call-realtime.md
 * Đầu vào: mỗi khung ~32 ms một xác suất có tiếng nói p ∈ [0,1] (Silero VAD) hoặc từ năng lượng RMS (energyProb, dự phòng).
 * create({ mode: 'turn'|'barge', long, minWords }) → { push(p, tMs) → 'start'|'end'|null, hint(interimText), state() }
 * turn: nói ≥ 3 khung > 0,5 → 'start'; im (< 0,35) kéo dài hangover → 'end'. hangover thích nghi theo chữ tạm (interim):
 *   câu dở ("and", "because", "the", "um"…) → 1000 ms · đã đủ minWords và câu trọn → 350 ms · mặc định 550 ms · Part 2 (long) 1200 ms.
 * barge (giáo viên đang nói): chặt hơn – 3 khung liền > 0,8 → 'start' (≈ 96 ms), không có 'end'. */
(function (g) {
  const POS = 0.5, NEG = 0.35, BARGE = 0.8, MIN_FR = 3;
  const HOLD = { base: 550, quick: 350, open: 1000, long: 1200 };
  // câu còn dở: kết thúc bằng liên từ, mạo từ, giới từ, từ đệm do dự
  const OPEN = /\b(and|but|or|so|because|cause|if|when|that|which|who|the|a|an|to|of|in|on|at|for|with|my|your|is|are|was|i|um+|uh+|er+|erm|hmm+|like|well)\s*$/i;
  const words = s => (String(s || '').match(/[a-z']+/gi) || []).length;

  function hangFor(text, o) {
    if (o.long) return HOLD.long;
    const s = String(text || '').trim();
    if (!s) return HOLD.base;
    if (OPEN.test(s)) return HOLD.open;
    if (words(s) >= (o.minWords || 3)) return HOLD.quick;
    return HOLD.base;
  }

  function create(o = {}) {
    let on = false, run = 0, lastVoice = -1, t0 = -1, hint = '', fired = false;
    const barge = o.mode === 'barge';
    return {
      push(p, t) {
        if (fired && barge) return null;
        if (!on) {
          run = p > (barge ? BARGE : POS) ? run + 1 : 0;
          if (run >= MIN_FR) { on = true; t0 = t; lastVoice = t; run = 0; if (barge) fired = true; return 'start'; }
          return null;
        }
        if (barge) return null;
        if (p >= NEG) { lastVoice = t; return null; }
        if (t - lastVoice >= hangFor(hint, o)) { on = false; fired = true; const e = 'end'; lastVoice = -1; return e; }
        return null;
      },
      hint(text) { hint = text || ''; },
      hang: () => hangFor(hint, o),
      state: () => ({ on, t0, lastVoice, hint }),
    };
  }

  // Dự phòng không có mô hình: RMS (0..1) → xác suất, so với nền ồn thích nghi (bám nhanh xuống, chậm lên)
  function energy() {
    let floor = 0.01;
    return rms => {
      floor = rms < floor ? floor * 0.7 + rms * 0.3 : floor * 0.995 + rms * 0.005;
      const snr = rms / Math.max(1e-4, floor);
      return Math.max(0, Math.min(1, (snr - 2) / 4)); // ≥ 6× nền ồn ≈ chắc chắn có tiếng
    };
  }

  g.CallEP = { create, energy, hangFor, HOLD, OPEN };
})(typeof self !== 'undefined' ? self : this);
