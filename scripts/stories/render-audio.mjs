// Dựng audio Kokoro cho Truyện & podcast – CHỈ chạy trên CI (stories-audio.yml). Mỗi chương = 1 file mp3 (mọi câu nối nhau) + mốc [bắt đầu, kết thúc] từng câu.
//   NODE_PATH=<thư mục có kokoro-js> node scripts/stories/render-audio.mjs [--shard i/N] [--count] [--out .media-out/audio/l] [--res .st-res]
// Một giọng nhất quán: truyện = af_heart (giọng Ama), podcast Ama = af_heart, Carlos = am_michael (cùng bảng giọng với lời thoại bài nghe).
// Tốc độ theo cấp (A1 chậm → C1 gần tự nhiên); đo wpm = số từ / thời lượng cả file (kể cả quãng nghỉ) – quá 150 thì hạ tốc độ dựng lại.
// Khóa file = st-<id>-<chương>-<băm giọng+chữ>: đổi chữ là tự có file mới, CDN đệm lâu không phát nhầm bản cũ. Trạng thái: scripts/stories/audio-state.json.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';
import { loadKokoro, SR } from '../word-audio/kokoro.mjs';
import { isMain } from '../lib/is-main.mjs';
export const STATE = 'scripts/stories/audio-state.json', DIR = 'content/stories', MAX_WPM = 150;
export const SPEED = { A1: 0.8, A2: 0.85, B1: 0.9, B2: 0.95, C1: 1 }, VOICE = { ama: 'af_heart', carlos: 'am_michael', narrator: 'af_heart' };
export const voiceOf = (x, s) => VOICE[(x.kind === 'podcast' && x.speakers && x.speakers[s.who]) || 'narrator'] || VOICE.narrator;
const txt = s => (typeof s === 'string' ? s : s.text || s.t || '');
export const chapterKey = (x, ci) => { const c = x.chapters[ci], h = crypto.createHash('sha1').update(JSON.stringify([x.level, c.sentences.map(s => [voiceOf(x, s), txt(s)])])).digest('hex').slice(0, 8); return `st-${x.id}-${ci + 1}-${h}`; };
export const readState = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {});
export const loadAll = () => fs.readdirSync(DIR).filter(f => f.endsWith('.json') && !f.startsWith('_')).sort().map(f => JSON.parse(fs.readFileSync(`${DIR}/${f}`, 'utf8'))).filter(x => x.chapters);
export function todo(state = readState()) {
  const jobs = []; for (const x of loadAll()) x.chapters.forEach((_, ci) => { const key = chapterKey(x, ci); if (!(state[x.id] && state[x.id][ci] && state[x.id][ci].key === key)) jobs.push({ x, ci, key }); });
  return jobs;
}
if (isMain(import.meta.url)) {
  const A = process.argv, opt = (k, d) => { const i = A.indexOf('--' + k); return i > 0 ? A[i + 1] : d; };
  const [si, sn] = opt('shard', '0/1').split('/').map(Number), OUT = opt('out', '.media-out/audio/l'), RES = opt('res', '.st-res');
  const jobs = todo().filter((_, i) => i % sn === si);
  console.log(`cần dựng ${jobs.length} chương (shard ${si}/${sn})`);
  if (A.includes('--count')) process.exit(0);
  fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(RES, { recursive: true });
  const require = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH.split(':')[0] + '/' : import.meta.url);
  const k = jobs.length ? await loadKokoro(require) : null, res = {};
  const words = s => (txt(s).match(/[A-Za-z0-9’']+/g) || []).length;
  for (const { x, ci, key } of jobs) {
    const ch = x.chapters[ci], nw = ch.sentences.reduce((n, s) => n + words(s), 0);
    let speed = SPEED[x.level] || 0.9, out = null;
    for (let tries = 0; tries < 6; tries++) {
      const parts = [], marks = []; let t = 0, prev = null; const gapPcm = sec => new Float32Array(Math.round(SR * sec));
      for (const s of ch.sentences) {
        const v = voiceOf(x, s), ids = await k.ids(txt(s), v), { pcm } = await k.run(ids, v, speed);
        if (prev !== null) { const g = gapPcm(prev === v ? 0.35 : 0.5); parts.push(g); t += g.length / SR; }
        parts.push(pcm); marks.push([+t.toFixed(2), +(t + pcm.length / SR).toFixed(2)]); t += pcm.length / SR; prev = v;
      }
      const wpm = Math.round(nw / t * 60); out = { parts, marks, dur: t, wpm, speed };
      if (wpm <= MAX_WPM) break; speed = +(speed - 0.05).toFixed(2);
    }
    if (out.wpm > MAX_WPM) { console.error(`✗ ${x.id}/${ci + 1}: wpm ${out.wpm} > ${MAX_WPM}`); continue; }
    const all = new Float32Array(out.parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of out.parts) { all.set(p, o); o += p.length; }
    const wav = `${OUT}/${key}.wav`; k.wav(wav, all);
    execFileSync('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-ar', '24000', '-b:a', '64k', `${OUT}/${key}.mp3`]); fs.rmSync(wav);
    (res[x.id] = res[x.id] || {})[ci] = { key, marks: out.marks, wpm: out.wpm, dur: +out.dur.toFixed(1), speed: out.speed };
    console.log(`✓ ${x.id}/${ci + 1} · ${out.wpm} wpm · ${out.dur.toFixed(0)}s · speed ${out.speed}`);
  }
  fs.writeFileSync(`${RES}/res-${si}.json`, JSON.stringify(res));
  if (jobs.length && !Object.keys(res).length) { console.error('✗ không dựng được chương nào'); process.exit(1); }
}
