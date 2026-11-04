// CI (media-clips.yml): giọng + mốc giờ cho clip học qua video/audio (docs/MEDIA.md §5). 0 credit: Kokoro + faster-whisper trên runner.
//   node scripts/media/voice-clips.mjs [id,id|all]
// Mỗi clip content/media/clips/<id>.json: Kokoro từng câu (scripts/cine/tts.mjs, giọng giáo viên = Chars.voice) → ghép 1 file
// (đệm đầu 0,3 s, nghỉ 0,7 s giữa câu) → web/media/clips/<id>.mp3. Mốc CÂU = vị trí thật của từng file trong bản ghép (đúng tuyệt đối);
// mốc TỪ = faster-whisper (scripts/video/align.py) trên từng câu, khớp ngược về từ kịch bản → content/media/timing/<id>.json.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module'; import crypto from 'node:crypto';
const M = createRequire(import.meta.url)('../../web/js/media/cues.js');
const VOICE = { ama: 'af_heart', carlos: 'am_michael' }; // = web/js/characters.js VOICE (cổng characters-gate)
const LEAD = 0.3, GAP = 0.7, TMP = process.env.RUNNER_TEMP || '/tmp';
const want = (process.argv[2] || 'all').split(',');
const ids = fs.readdirSync('content/media/clips').filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).filter(id => want.includes('all') || want.includes(id));
if (!ids.length) { console.error('no clips'); process.exit(1); }
const dur = f => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());
fs.mkdirSync('web/media/clips', { recursive: true }); fs.mkdirSync('content/media/timing', { recursive: true });

// Từ kịch bản ↔ từ whisper theo thứ tự (cửa sổ 3); không khớp → nội suy giữa 2 từ khớp kề → [{ w, s, e }] + tỉ lệ khớp
function matchWords(text, heard, d) {
  const tk = M.tokens(text), hw = heard.map(h => ({ ...h, k: M.norm(h.w) })), out = tk.map(t => ({ w: t.w, s: null, e: null }));
  let j = 0, hit = 0;
  tk.forEach((t, i) => { for (let q = j; q < Math.min(hw.length, j + 3); q++) if (hw[q].k === t.k) { out[i].s = hw[q].start; out[i].e = hw[q].end; j = q + 1; hit++; break; } });
  for (let i = 0; i < out.length; i++) if (out[i].s == null) {
    let a = i - 1; while (a >= 0 && out[a].s == null) a--; let b = i + 1; while (b < out.length && out[b].s == null) b++;
    const t0 = a >= 0 ? out[a].e : 0, t1 = b < out.length ? out[b].s : d, n = b - a - 1, k = i - a - 1;
    out[i].s = +(t0 + (t1 - t0) * k / n).toFixed(3); out[i].e = +(t0 + (t1 - t0) * (k + 1) / n).toFixed(3);
  }
  return { words: out, ratio: tk.length ? hit / tk.length : 0 };
}

for (const id of ids) {
  const clip = JSON.parse(fs.readFileSync(`content/media/clips/${id}.json`, 'utf8')), dir = path.join(TMP, 'mc-' + id);
  // Idempotent: kịch bản/giọng/tốc độ không đổi + đã có mp3 → giữ nguyên (TTS/whisper không tất định → dựng lại sẽ sinh commit bot mới mỗi lượt PR)
  const src = crypto.createHash('sha256').update(JSON.stringify([clip.speakers, clip.speed, clip.lines.map(l => [l.who, l.text]), LEAD, GAP])).digest('hex').slice(0, 16);
  const tp = `content/media/timing/${id}.json`;
  if (!want.includes(id) && fs.existsSync(tp) && fs.existsSync(`web/media/clips/${id}.mp3`)) { const old = JSON.parse(fs.readFileSync(tp, 'utf8')); if (old.src === src) { console.log(id, 'không đổi – bỏ qua'); continue; } }
  fs.mkdirSync(dir, { recursive: true });
  const lines = clip.lines.map((l, i) => ({ id: `l${String(i).padStart(2, '0')}`, who: l.who, text: l.text, voice: VOICE[clip.speakers[l.who]], speed: clip.speed || 0.75 }));
  fs.writeFileSync(path.join(dir, 'lines.json'), JSON.stringify({ voices: {}, lines }));
  execFileSync('node', ['scripts/cine/tts.mjs', path.join(dir, 'lines.json'), path.join(dir, 'wav')], { stdio: 'inherit' });
  const wavs = lines.map(l => path.join(dir, 'wav', l.id + '.wav')), ds = wavs.map(dur);
  // Ghép: im lặng đầu + (câu + nghỉ)…; mốc câu tính từ độ dài thật từng file
  const sil = s => { const f = path.join(dir, `sil${s}.wav`); if (!fs.existsSync(f)) execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', String(s), f]); return f; };
  const list = [sil(LEAD)]; let at = LEAD; const marks = [];
  wavs.forEach((f, i) => { marks.push([+at.toFixed(3), +(at + ds[i]).toFixed(3)]); list.push(f); at += ds[i]; if (i < wavs.length - 1) { list.push(sil(GAP)); at += GAP; } });
  list.push(sil(0.5)); at += 0.5;
  fs.writeFileSync(path.join(dir, 'concat.txt'), list.map(f => `file '${f}'`).join('\n'));
  const mp3 = `web/media/clips/${id}.mp3`;
  execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'concat.txt'), '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '64k', mp3]);
  const total = dur(mp3);
  // Mốc từ: whisper trên từng câu (file riêng → không trôi), cộng offset câu
  fs.writeFileSync(path.join(dir, 'jobs.json'), JSON.stringify(wavs.map((wav, i) => ({ wav, text: lines[i].text }))));
  const py = process.env.PYTHON || 'python3';
  const al = JSON.parse(execFileSync(py, ['scripts/video/align.py', path.join(dir, 'jobs.json'), '--model', process.env.WHISPER_MODEL || 'base.en'], { maxBuffer: 1 << 26 }).toString());
  const tl = marks.map(([s, e], i) => { const m = matchWords(lines[i].text, al[i].words, ds[i]); return { start: s, end: e, match: +m.ratio.toFixed(3), words: m.words.map(x => ({ w: x.w, s: +(s + x.s).toFixed(3), e: +(s + x.e).toFixed(3) })) }; });
  const out = { id, src, audio: `media/clips/${id}.mp3`, dur: +total.toFixed(3), aligner: `faster-whisper ${process.env.WHISPER_MODEL || 'base.en'} (per sentence) + Kokoro file offsets`, lines: tl };
  fs.writeFileSync(`content/media/timing/${id}.json`, JSON.stringify(out, null, 1) + '\n');
  console.log(id, 'dur', out.dur, 'wpm', M.wpm(tl.map((x, i) => ({ ...x, text: lines[i].text }))), 'match', tl.map(x => x.match).join(' '));
}
