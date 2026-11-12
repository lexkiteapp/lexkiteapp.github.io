// Web Worker (module): Kokoro-82M chạy trên máy cho chữ chưa có file dựng sẵn (docs/specs/kokoro-on-device.md).
// Nhận { type:'load', hosts, sha } · { type:'gen', id, text, voice, speed } · { type:'cancel' } → trả { type:'loaded'|'fail'|'audio'|'err', … }.
// Mô hình + giọng tải từ host của Lexkite (R2 audio.lexkite.com/kokoro/…); lỗi hoặc sai sha256 thì về Hugging Face (đường gốc của kokoro-js).
const LIB = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js';
const HF = 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/';
const raw = self.fetch.bind(self);
let hosts = [], sha = {}, tts = null, queue = [], busy = false;
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
// Đổi đường Hugging Face sang host của mình; file có sha256 trong bảng thì kiểm trước khi đưa cho thư viện
self.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input && input.url;
  if (!url || !url.startsWith(HF)) return raw(input, init);
  const rel = url.slice(HF.length).split('?')[0];
  for (const h of hosts) {
    try {
      const r = await raw(h + rel, { mode: 'cors' });
      if (!r.ok) continue;
      if (!sha[rel]) return r;
      const buf = await r.arrayBuffer();
      if (hex(await crypto.subtle.digest('SHA-256', buf)) === sha[rel]) return new Response(buf, { status: 200, headers: r.headers });
      self.postMessage({ type: 'note', what: 'sha', rel });
    } catch (e) { /* host kế tiếp */ }
  }
  return raw(input, init); // Hugging Face
};
const pump = async () => {
  if (busy || !tts) return;
  const job = queue.shift(); if (!job) return;
  busy = true; const t0 = performance.now();
  try {
    const a = await tts.generate(job.text, { voice: job.voice, speed: job.speed || 1 });
    const pcm = a.audio;
    self.postMessage({ type: 'audio', id: job.id, pcm: pcm.buffer, sr: a.sampling_rate, ms: Math.round(performance.now() - t0) }, [pcm.buffer]);
  } catch (e) { self.postMessage({ type: 'err', id: job.id, error: String((e && e.message) || e) }); }
  busy = false; pump();
};
self.onmessage = async ({ data: d }) => {
  if (d.type === 'load') {
    hosts = d.hosts || []; sha = d.sha || {};
    const t0 = performance.now();
    try {
      const { KokoroTTS } = await import(LIB);
      tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'wasm',
        progress_callback: p => { if (p && p.status === 'progress' && /onnx/.test(p.file || '')) self.postMessage({ type: 'progress', pct: Math.round(p.progress || 0) }); } });
      self.postMessage({ type: 'loaded', ms: Math.round(performance.now() - t0) });
      pump();
    } catch (e) { self.postMessage({ type: 'fail', error: String((e && e.message) || e) }); }
  } else if (d.type === 'gen') { queue.push(d); pump(); }
  else if (d.type === 'cancel') { for (const j of queue.splice(0)) self.postMessage({ type: 'err', id: j.id, error: 'cancel' }); }
};
