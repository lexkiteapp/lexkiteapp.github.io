/* Chẩn đoán "bấm micro mà không nghe thấy gì" (P0 23/11) – gói lười, UI.recognize nạp khi nhận dạng kết thúc không kết quả.
 * diag(lỗi getUserMedia, Promise<Blob bản ghi song song>) → 'not-allowed' | 'audio-capture' | 'silent' (micro thu im lặng) | 'sr-fail' (có giọng mà dịch vụ nhận dạng không trả lời) | 'no-speech' */
(function (g) {
  'use strict';
  const verdict = lv => (!lv ? 'no-speech' : lv.peak < 0.004 ? 'silent' : lv.loud >= 4 ? 'sr-fail' : 'no-speech'); // ≥ 4 khung 100 ms có RMS > 0,02 = giọng nói thật
  async function level(blob) {
    try {
      const ac = new (g.AudioContext || g.webkitAudioContext)(), buf = await ac.decodeAudioData(await blob.arrayBuffer()); ac.close && ac.close();
      const d = buf.getChannelData(0), w = Math.max(1, Math.round(buf.sampleRate * 0.1)); let peak = 0, loud = 0;
      for (let i = 0; i < d.length; i += w) { let q = 0, c = 0; for (let j = i; j < Math.min(d.length, i + w); j++) { const v = d[j]; q += v * v; c++; if (Math.abs(v) > peak) peak = Math.abs(v); } if (Math.sqrt(q / c) > 0.02) loud++; }
      return { peak, loud };
    } catch (e) { return null; }
  }
  let levelFn = level; // test thay được (jsdom không có AudioContext)
  const T = {
    silent: () => '🔇 ' + g.t('Micro không thu được tiếng – kiểm tra đã chọn đúng micro và không bị tắt tiếng.'),
    'sr-fail': () => '🔁 ' + g.t('Máy thu được giọng bạn nhưng dịch vụ nhận dạng của trình duyệt không trả lời – bấm micro lần nữa để dùng nhận dạng trên máy.'),
  };
  g.MicDiag = {
    verdict, level, setLevel: f => { levelFn = f || level; }, text: c => (T[c] ? T[c]() : ''),
    async diag(gumErr, blobP) {
      if (gumErr) return gumErr === 'NotAllowedError' || gumErr === 'SecurityError' ? 'not-allowed' : /^(NotFoundError|OverconstrainedError|NotReadableError|AbortError)$/.test(gumErr) ? 'audio-capture' : 'no-speech';
      const b = blobP ? await blobP : null; return b ? verdict(await levelFn(b)) : 'no-speech';
    },
  };
})(typeof self !== 'undefined' ? self : this);
