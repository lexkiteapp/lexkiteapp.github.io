// Render bộ câu thử bằng Kokoro-82M (0 credit, chỉ CI – .github/workflows/tts-ab.yml, docs/TTS-AB.md). Cùng cách gọi với sản xuất:
//   kokoro-video = giọng video của giáo viên (web/teach/characters.json voice.video: Ama af_bella, Carlos am_fenrir), tốc độ 0,8 như teach2d
//   kokoro-app   = giọng app (voice.app: af_heart, am_michael), tốc độ 1,0 như audio câu (scripts/gen-audio.mjs)
//   NODE_PATH=/tmp/kk/node_modules KOKORO_DTYPE=q8 node scripts/tts-ab/kokoro.mjs .tts-ab/texts.json .tts-ab/audio
import fs from 'node:fs'; import { createRequire } from 'node:module';
import { loadKokoro, SR } from '../word-audio/kokoro.mjs';
const [inF = '.tts-ab/texts.json', OUT = '.tts-ab/audio'] = process.argv.slice(2);
const T = JSON.parse(fs.readFileSync(inF, 'utf8')), REG = JSON.parse(fs.readFileSync('web/teach/characters.json', 'utf8')).people;
const CFG = { 'kokoro-video': { kind: 'video', speed: 0.8 }, 'kokoro-app': { kind: 'app', speed: 1.0 } };
const require = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH.split(':')[0] + '/' : import.meta.url);
const t0 = Date.now(), k = await loadKokoro(require); console.log(`Kokoro (${process.env.KOKORO_DTYPE || 'fp32'}) tải trong ${((Date.now() - t0) / 1000).toFixed(1)} s`);
for (const [name, c] of Object.entries(CFG)) {
  const d = `${OUT}/${name}`; fs.mkdirSync(d, { recursive: true });
  for (const i of T.items) {
    const voice = REG[i.who].voice[c.kind], t1 = Date.now();
    const pcm = (await k.tts.generate(i.text, { voice, speed: c.speed })).audio, ms = Date.now() - t1;
    k.wav(`${d}/${i.id}.wav`, pcm);
    // độ trễ = thời gian tạo trên CPU máy chủ CI (2 nhân) – không cùng loại với API mạng của ElevenLabs, báo cáo ghi rõ
    fs.writeFileSync(`${d}/${i.id}.json`, JSON.stringify({ total_ms: ms, ttfb_ms: ms, rtf: +(ms / 1000 / (pcm.length / SR)).toFixed(3), voice, speed: c.speed, text: i.text }));
  }
  console.log(`✓ ${name}: ${T.items.length} file`);
}
