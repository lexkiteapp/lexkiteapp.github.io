// Web Worker: kokoro-js trong trình duyệt (như phần đọc động trong app sẽ chạy). Nhận {cfg, dtype, device, items, voices, speed}
// → gửi lại từng mục {id, wav (ArrayBuffer), ttfa_ms, gen_ms, dur}. Câu dài (story) đo thêm thời gian ra đoạn đầu bằng tts.stream().
import { KokoroTTS } from './kokoro/kokoro.web.js';
self.onmessage = async ({ data: d }) => {
  const t0 = performance.now();
  let tts;
  try { tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: d.dtype, device: d.device }); }
  catch (e) { self.postMessage({ type: 'fail', error: String(e && e.message || e) }); return; }
  self.postMessage({ type: 'loaded', load_ms: Math.round(performance.now() - t0) });
  let first = true;
  for (const it of d.items) {
    const voice = d.voices[it.who], t1 = performance.now();
    try {
      let ttfa = null;
      if (it.text.length > 200) {   // đọc dài: phát được ngay khi có câu đầu (stream)
        const chunks = [];
        for await (const { audio } of tts.stream(it.text, { voice, speed: d.speed })) { if (ttfa === null) ttfa = performance.now() - t1; chunks.push(audio.audio); }
        const n = chunks.reduce((s, c) => s + c.length, 0), pcm = new Float32Array(n); let o = 0; for (const c of chunks) { pcm.set(c, o); o += c.length; }
        var out = pcm, sr = 24000;
      } else {
        const a = await tts.generate(it.text, { voice, speed: d.speed }); ttfa = performance.now() - t1; var out = a.audio, sr = a.sampling_rate;
      }
      const gen = performance.now() - t1;
      self.postMessage({ type: 'item', id: it.id, pcm: out.buffer, sr, ttfa_ms: Math.round(ttfa), gen_ms: Math.round(gen), cold: first }, [out.buffer]);
    } catch (e) { self.postMessage({ type: 'item', id: it.id, error: String(e && e.message || e) }); }
    first = false;
  }
  self.postMessage({ type: 'done', total_ms: Math.round(performance.now() - t0) });
};
