// Ứng viên đọc động #1: kokoro-js CHẠY TRONG TRÌNH DUYỆT (Chromium headless, Web Worker) – đo như người dùng thật sẽ gặp (docs/TTS-AB.md).
//   node scripts/tts-ab/web.mjs <kokoro-js dir> [.tts-ab/texts.json] [.tts-ab/audio]   (cần playwright + chromium)
// Cấu hình: wasm q8 / wasm q4 (toàn tập) và webgpu fp32 (tập core; máy chủ CI không có GPU → SwiftShader mô phỏng, ghi lỗi nếu không chạy).
// Giọng = giọng video của giáo viên (cùng voice id với file Kokoro dựng sẵn → đồng nhất), tốc độ 0,8. Mỗi mục ghi:
//   ttfa_ms (thời gian ra tiếng – câu dài tính tới đoạn đầu của tts.stream), total_ms, rtf, cold (mục đầu sau khi tải model),
//   load_ms + model_bytes (byte tải về khi khởi động lạnh, đếm từ phản hồi mạng của worker) → meta.json của cấu hình.
import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const [KJS, inF = '.tts-ab/texts.json', OUT = '.tts-ab/audio'] = process.argv.slice(2);
const T = JSON.parse(fs.readFileSync(inF, 'utf8')), REG = JSON.parse(fs.readFileSync('web/teach/characters.json', 'utf8')).people;
const voices = { ama: REG.ama.voice.video, carlos: REG.carlos.voice.video };
const CFG = [
  { name: 'kokoro-web-wasm-q8', device: 'wasm', dtype: 'q8', items: T.items },
  { name: 'kokoro-web-wasm-q4', device: 'wasm', dtype: 'q4', items: T.items },
  { name: 'kokoro-web-webgpu-fp32', device: 'webgpu', dtype: 'fp32', items: T.items.filter(i => i.core && i.cat !== 'story') },
];
// máy chủ tĩnh: trang + worker (scripts/tts-ab/web/) + bản web của kokoro-js (dist/)
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.wasm': 'application/wasm', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]), f = u.startsWith('/kokoro/') ? path.join(KJS, 'dist', u.slice(8)) : path.join(HERE, 'web', u === '/' ? 'index.html' : u);
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });  // không cô lập cross-origin, như trang app thật → WASM 1 luồng (số đo thận trọng)
  fs.createReadStream(f).pipe(r);
}).listen(0); const PORT = srv.address().port;
const wav = (pcm, sr) => { const b = Buffer.alloc(44 + pcm.length * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + pcm.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(pcm.length * 2, 40); for (let i = 0; i < pcm.length; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(pcm[i] * 32767))), 44 + i * 2); return b; };
const browser = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader', '--ignore-gpu-blocklist'] });
const summary = {};
for (const c of CFG) {
  const ctx = await browser.newContext(), page = await ctx.newPage(), d = `${OUT}/${c.name}`; fs.mkdirSync(d, { recursive: true });
  let bytes = 0; ctx.on('response', async r => { if (/huggingface|hf\.co|\.onnx|\.bin/.test(r.url())) { const l = +(r.headers()['content-length'] || 0); bytes += l || (await r.body().catch(() => Buffer.alloc(0))).length; } });
  const info = { ok: 0, fail: 0 }; let done;
  const finished = new Promise(res => (done = res));
  await page.exposeFunction('report', (m) => {
    if (m.type === 'loaded') info.load_ms = m.load_ms;
    else if (m.type === 'fail') { info.error = m.error; done(); }
    else if (m.type === 'done') { info.total_ms = m.total_ms; done(); }
    else if (m.type === 'item') {
      if (m.error) { info.fail++; console.error(`${c.name} ${m.id}: ${m.error}`); return; }
      const it = T.items.find(i => i.id === m.id), pcm = new Float32Array(Buffer.from(m.b64, 'base64').buffer.slice(0));
      fs.writeFileSync(`${d}/${m.id}.wav`, wav(pcm, m.sr)); info.ok++;
      fs.writeFileSync(`${d}/${m.id}.json`, JSON.stringify({ ttfa_ms: m.ttfa_ms, ttfb_ms: m.ttfa_ms, total_ms: m.gen_ms, cold: m.cold, rtf: +(m.gen_ms / 1000 / (pcm.length / m.sr)).toFixed(3),
        voice: voices[it.who], speed: 0.8, device: c.device, dtype: c.dtype, ref_cfg: 'kokoro-video', text: it.text }));
    }
  });
  await page.goto(`http://127.0.0.1:${PORT}/`);
  page.on('console', m => m.type() === 'error' && console.error(`[${c.name}] ${m.text().slice(0, 200)}`));
  await page.evaluate(({ c, voices }) => {
    const w = new Worker('/worker.js', { type: 'module' });
    w.onerror = e => window.report({ type: 'fail', error: e.message || 'worker error' });
    w.onmessage = ({ data: m }) => {
      if (m.type === 'item' && m.pcm) { const u = new Uint8Array(m.pcm); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); m.b64 = btoa(s); delete m.pcm; }
      window.report(m);
    };
    w.postMessage({ dtype: c.dtype, device: c.device, voices, speed: 0.8, items: c.items.map(({ id, who, text }) => ({ id, who, text })) });
  }, { c: { dtype: c.dtype, device: c.device, items: c.items }, voices });
  await Promise.race([finished, new Promise(r => setTimeout(() => { info.error = info.error || 'hết giờ (20 phút)'; r(); }, 20 * 60000))]);
  info.model_bytes = bytes; summary[c.name] = info; fs.writeFileSync(`${d}/meta.json`, JSON.stringify(info));
  console.log(`${info.error ? '✗' : '✓'} ${c.name}: ${info.ok} file, ${info.fail} lỗi · tải model ${(bytes / 1e6).toFixed(1)} MB trong ${info.load_ms ?? '-'} ms${info.error ? ' · ' + info.error : ''}`);
  await ctx.close();
}
await browser.close(); srv.close();
fs.writeFileSync(`${OUT}/web-summary.json`, JSON.stringify(summary, null, 1));
