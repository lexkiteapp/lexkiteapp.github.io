// Dựng 1 video theo job của Video Studio (functions/api/studio.js) – chạy trong GitHub Actions video.yml (ubuntu-latest, miễn phí) hoặc trên máy.
// Dùng: node scripts/video/render.mjs --job <id> [--step all|fetch|variant|cast|tts|align|lipsync|karaoke|compose|qa|report] [--script script.json] [--bg ảnh.png] [--ok success|failure]
//       node scripts/video/render.mjs --local --script content/video/samples/sample.json [--seed s]  (chạy thử trên máy: không cần bí mật, không gọi Studio)
//       node scripts/video/render.mjs --coverage   (báo cáo độ phủ tổ hợp + tài nguyên còn thiếu → out/video/coverage.json)
//   tùy chọn: --library <thư mục kho dựng> (mặc định brand/library) · env VIDEO_STRICT=1 (CI: thiếu Kokoro/whisper/Rhubarb → lỗi thay vì bỏ qua)
//   env: STUDIO_API (mặc định https://lexkite.com/api/studio) · STUDIO_CALLBACK_SECRET (secret, cần cho fetch/report) · OBJECT_ID, PREVIEW_URL, RUN_URL (bước report)
//        KOKORO_NODE_PATH/NODE_PATH (thư mục node_modules có kokoro-js) · PYTHON (mặc định python3) · RHUBARB (mặc định rhubarb) · WHISPER_MODEL (mặc định tiny.en)
// Trạng thái giữa các bước: out/video/<id>/state.json – mỗi bước đọc/ghi file này nên workflow tách bước rõ ràng (thất bại ở bước nào thấy ngay).
// Dây chuyền (docs/VIDEO-PIPELINE.md §2, §7, §8): kịch bản → cổng nhất quán (casting) → giọng Kokoro (-16 LUFS) → mốc từ (faster-whisper, dự phòng chia đều)
//   → khẩu hình (Rhubarb) → phụ đề karaoke ASS (từ đang đọc màu cam) + hook 2 s đầu + thẻ CTA → ghép ffmpeg (phòng theo bối cảnh, clip nhân vật đặt chân lên điểm đứng,
//   bóng tiếp xúc, đẩy máy câu "đắt", cắt cảnh 2–4 s) 1080×1920 30 fps → cổng QA (MEDIA-QA-RUBRIC C) → gọi lại Studio. Không bao giờ in bí mật. Không dùng nhạc nền.
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync, spawnSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import * as V from './lib.mjs';
import * as X from './variants.mjs';
import * as M from './motion.mjs';
import * as K from './keyclip.mjs';
import { music as synthMusic, wav16 } from './synth.mjs';
import vm from 'vm';

const args = process.argv.slice(2), opt = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const die = m => { console.error('✗ render: ' + m); process.exit(1); };
const LOCAL = args.includes('--local'), STRICT = process.env.VIDEO_STRICT === '1', COVERAGE = args.includes('--coverage');
const ID = opt('job') || (LOCAL ? 'local' : COVERAGE ? 'coverage' : ''), STEP = opt('step') || 'all';
if (!ID || !/^[A-Za-z0-9_-]{1,40}$/.test(ID)) die('cần --job <id> (hoặc --local)');
if (LOCAL && !COVERAGE && !opt('script') && ['all', 'fetch'].includes(STEP)) die('--local cần --script <file.json> (vd. content/video/samples/sample.json)');
const API = process.env.STUDIO_API || 'https://lexkite.com/api/studio', SECRET = process.env.STUDIO_CALLBACK_SECRET || '';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LIB = path.resolve(opt('library') || path.join(ROOT, 'brand/library'));
const DIR = path.join('out/video', ID), STATE = path.join(DIR, 'state.json'), P = f => path.join(DIR, f);
fs.mkdirSync(DIR, { recursive: true });
const load = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : { id: ID, steps: {} });
const store = s => fs.writeFileSync(STATE, JSON.stringify(s, null, 2));
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const W = { short: [1080, 1920], lesson: [1920, 1080] }, FPS = 30, GAP = V.LINE_GAP, END_CARD = V.END_CARD; // hằng số + cổng tĩnh dùng chung với template.mjs lint (lib.mjs)
const PY = process.env.PYTHON || 'python3', RHUBARB = process.env.RHUBARB || 'rhubarb';

async function studio(body) {
  if (!SECRET) die('thiếu env STUDIO_CALLBACK_SECRET');
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Secret': SECRET }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`studio ${body.op} → ${r.status} ${String(j.error || '')}`);
  return j;
}
const canRun = (bin, a) => { try { execFileSync(bin, a, { stdio: 'ignore', timeout: 30000 }); return true; } catch (e) { return false; } };
const ff = a => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: ['ignore', 'inherit', 'inherit'], maxBuffer: 64 << 20 });
const ffErr = a => spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...a], { encoding: 'utf8', maxBuffer: 64 << 20 }).stderr || '';
const probe = f => { const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height,pix_fmt:format=duration', '-of', 'json', f], { encoding: 'utf8' })); const st = (j.streams || [])[0] || {}; return { w: st.width, h: st.height, pix: st.pix_fmt || '', dur: +(j.format || {}).duration || 0 }; };
const todo = (s, k) => { s.todo = [...new Set([...(s.todo || []), k])]; };
// Thiếu công cụ nặng: trên máy → bỏ qua có thông báo; CI (VIDEO_STRICT=1) → lỗi để không lặng lẽ ra video kém
const skip = (s, k, why) => { if (STRICT) throw new Error(`${k}: ${why}`); console.log(`⚠️ bỏ qua ${k}: ${why}`); todo(s, k); };
const libFile = f => (f ? path.join(LIB, f) : '');
const exists = f => !!f && fs.existsSync(libFile(f));
const existsRepo = f => !!f && fs.existsSync(path.join(ROOT, f));
// ready:false = chưa approved/chưa lên media.lexkite.com (library.mjs) → bỏ qua cả khi máy có file, để chạy thử = CI (fetch-render chỉ tải mục ready)
const manifestOf = () => { const m = fs.existsSync(path.join(LIB, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(LIB, 'manifest.json'), 'utf8')) : {}; for (const k of ['rooms', 'clips', 'stills']) if (Array.isArray(m[k])) m[k] = m[k].filter(x => x.ready !== false); return m; };
const HIST = 'out/video/history.json';
// Lớp motion Remotion (docs/VIDEO-PIPELINE.md §10): scripts/video/remotion (npm ci riêng). VIDEO_ENGINE=ffmpeg → đường ffmpeg cũ (dự phòng).
const RM = path.join(ROOT, 'scripts/video/remotion'), RM_BIN = path.join(RM, 'node_modules/.bin/remotion');
const useRemotion = () => process.env.VIDEO_ENGINE !== 'ffmpeg' && fs.existsSync(RM_BIN);
// CI mẫu chưa có kho phòng/clip: cho phép nền gradient thương hiệu (VIDEO_ALLOW_STUDIO=1); production strict thiếu phòng → lỗi.
const ALLOW_STUDIO = process.env.VIDEO_ALLOW_STUDIO === '1' || !STRICT;
const SFX_DIR = path.join(ROOT, 'brand/library/sfx'); // lịch sử dấu vân tay khi chạy trên máy (CI lấy từ Studio: ciJob.recent)

// ---------- Các bước ----------
const STEPS = {
  // 1) Lấy job (kịch bản đã duyệt) từ Studio – hoặc --script file.json (chạy thử). File có thể là {topic, format, script} hoặc chỉ script {lines…}
  async fetch(s) {
    const f = opt('script');
    let job;
    if (f) { const raw = JSON.parse(fs.readFileSync(f, 'utf8')); job = raw.script ? { id: ID, format: 'short', topic: raw.topic || raw.script.title || 'local', ...raw } : { id: ID, format: 'short', topic: raw.title || 'local', script: raw }; }
    else job = (await studio({ op: 'ciJob', id: ID })).job;
    if (!job.script || !Array.isArray(job.script.lines) || !job.script.lines.length) throw new Error('job chưa có kịch bản');
    s.job = job; s.todo = []; s.local = LOCAL;
  },
  // 2) Biến thể có seed (variants.mjs): khuôn × bối cảnh × dàn × góc máy × hook × chuyển cảnh × nhạc × end card; chống lặp với 30 video gần nhất.
  //    Đổi vai (recast) chỉ khi lời thoại không gọi tên nhân vật. Lịch sử: Studio (job.recent) hoặc out/video/history.json khi chạy thử.
  async variant(s) {
    const formats = readJson('content/video/formats.json'), casting = readJson('content/video/casting.json');
    const hist = Array.isArray(s.job.recent) ? s.job.recent : (fs.existsSync(HIST) ? JSON.parse(fs.readFileSync(HIST, 'utf8')).filter(h => h.id !== ID) : []);
    const seed = opt('seed') || `${ID}|${s.job.seed || ''}`;
    const v = X.pickVariant({ job: s.job, formats, casting, manifest: manifestOf(), history: hist, seed, exists, existsRepo, date: new Date() });
    s.scriptOrig = s.scriptOrig || s.job.script;
    s.job.script = v.recast ? X.applyCast(s.scriptOrig, v.cast) : s.scriptOrig;
    s.variant = v; s.history = hist.slice(-formats.rules.recent);
    if (v.recast) console.log(`⚠️⚠️ ĐỔI VAI ${v.cast.from.join('+')} → ${v.cast.to.join('+')}: ${v.recastReason || 'không rõ lý do'}`);
    console.log(`  ${v.format.id} · ${v.setting.id} · ${v.cast.to.join('+') || '—'} · hook ${v.hookStyle.id} · ${v.transition.id} · nhạc ${v.music.id} · end ${v.endCard.id} · theme ${v.theme ? v.theme.id : '—'} · máy ${v.cameraSet.id}${v.relaxed ? ' · ⚠️ chưa đạt luật chống lặp' : ''}`);
  },
  // 3) CỔNG NHẤT QUÁN (VIDEO-PIPELINE §8): chủ đề → bối cảnh + dàn (content/video/casting.json), phòng theo tag (không ngẫu nhiên),
  //    clip người nói/nghe theo cảm xúc câu, hướng nhìn, liên tục trang phục/vị trí/ngày-đêm. Lỗi không dừng dựng (để xem trước) nhưng QA chấm 0 + chặn đăng.
  async cast(s) {
    const gap = readJson('content/video/formats.json').rules.clipSpacing || 3, avoidClips = (s.history || []).slice(-gap).flatMap(h => h.clips || []);
    const st = V.buildStage({ job: s.job, casting: readJson('content/video/casting.json'), manifest: manifestOf(), exists, variant: s.variant || null, avoidClips });
    // Bối cảnh không có phòng thật (phòng "ảo" virtual-*) → strict: dừng ngay (không lặng lẽ dựng nền gradient)
    for (const g of st.segs) if (g.room.virtual) {
      const have = (manifestOf().rooms || []).filter(r => r.tag === g.scene).map(r => `${r.id}${exists(r.file) ? '' : ' (chưa tải)'}`);
      const msg = `bối cảnh "${g.scene}" (${st.time}) không có phòng thật – phòng của tag: ${have.join(', ') || 'chưa có trong brand/library/manifest.json'} (CI: library.mjs fetch-render)`;
      if (!ALLOW_STUDIO) throw new Error(msg); console.log('⚠️ ' + msg + ' → nền gradient thương hiệu (chỉ chạy thử)');
    }
    V.placeMedium(st);
    s.stage = st; s.consistency = V.consistencyVerdict(st.fails);
    if (s.variant) s.variant.fp.clips = st.clips;
    console.log(`  chủ đề ${st.topic} · bối cảnh ${st.segs.map(g => `${g.scene}(${g.room.id})`).join(' → ')} · ${st.time}`);
    if (!s.consistency.ok) console.log(s.consistency.reasons.map(r => '  ✗ ' + r).join('\n'));
  },
  // 4) Giọng Kokoro (kokoro-js như audio.yml) – giọng theo content/video/assets.json characters[who].voice (+ casting.json voices cho vai chưa có)
  //    Ra: line-NN.wav (48 kHz mono, loudnorm I=-16 TP=-1.5) + s.lines[i].dur. Thiếu kokoro-js → ước lượng thời lượng (từ / 2,6 + 0,3 s), không có wav.
  async tts(s) {
    s.lines = s.job.script.lines.map(l => ({ who: l.who, text: l.text, beat: l.beat, punch: !!l.punch, dur: V.estLineSec(l.text), wav: null }));
    const voices = { ...Object.fromEntries(Object.entries(readJson('content/video/assets.json').characters || {}).map(([k, v]) => [k, v.voice])), ...(readJson('content/video/casting.json').voices || {}) };
    const np = process.env.KOKORO_NODE_PATH || process.env.NODE_PATH;
    let KokoroTTS; try { ({ KokoroTTS } = createRequire(np ? np.split(':')[0] + '/' : import.meta.url)('kokoro-js')); } catch (e) { return skip(s, 'tts', 'chưa cài kokoro-js (npm i --prefix /tmp/kk kokoro-js@1, rồi KOKORO_NODE_PATH=/tmp/kk/node_modules)'); }
    let tts = null;
    for (let k = 1; k <= 4 && !tts; k++) { try { tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' }); } catch (e) { console.error(`  tải mô hình Kokoro lỗi (lần ${k}): ${e && (e.cause && e.cause.code || e.message)}`); await new Promise(r => setTimeout(r, 10000 * k)); } }
    if (!tts) return skip(s, 'tts', 'không tải được mô hình Kokoro');
    for (const [i, l] of s.lines.entries()) {
      const nn = String(i).padStart(2, '0'), raw = P(`line-${nn}.raw.wav`), voice = voices[l.who] || 'af_heart';
      const a = await tts.generate(String(l.text).replace(/["“”]/g, ''), { voice, speed: 1 }); await a.save(raw);
      // Kokoro chèn ~0,4 s im lặng đầu câu → câu hook dài quá 2 s + nhịp chậm: cắt im lặng đầu, chừa 40 ms
      ff(['-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,adelay=40:all=1,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000', '-ac', '1', P(`line-${nn}.wav`)]);
      fs.rmSync(raw, { force: true });
      l.wav = `line-${nn}.wav`; l.voice = voice; l.dur = +probe(P(l.wav)).dur.toFixed(2);
    }
    console.log(`  ${s.lines.length} câu · ${s.lines.reduce((a, l) => a + l.dur, 0).toFixed(1)} s giọng`);
  },
  // 5) Mốc từng từ: faster-whisper tiny.en (word_timestamps, CPU) trên line-NN.wav → khớp ngược về từ kịch bản (lib.matchWords). Dự phòng: chia đều.
  //    Ra: words.json = [{ line, w, start, end }] (giây, tính từ đầu video) + s.lines[i].start/end + s.duration (gồm thẻ CTA cuối).
  async align(s) {
    const lay = V.layoutLines(s.lines.map(l => l.dur), { gap: GAP });
    s.lines.forEach((l, i) => Object.assign(l, lay[i]));
    let asr = null;
    const wavs = s.lines.filter(l => l.wav);
    if (wavs.length && canRun(PY, ['-c', 'import faster_whisper'])) {
      fs.writeFileSync(P('align-jobs.json'), JSON.stringify(wavs.map(l => ({ wav: P(l.wav), text: l.text }))));
      try { asr = Object.fromEntries(JSON.parse(execFileSync(PY, [path.join(ROOT, 'scripts/video/align.py'), P('align-jobs.json'), '--model', process.env.WHISPER_MODEL || 'tiny.en'], { encoding: 'utf8', maxBuffer: 32 << 20, stdio: ['ignore', 'pipe', 'inherit'] })).map(x => [x.wav, x.words])); }
      catch (e) { if (STRICT) throw new Error('faster-whisper lỗi: ' + String(e.message).slice(0, 120)); console.log('⚠️ faster-whisper lỗi → chia đều'); }
    } else if (wavs.length) skip(s, 'align', 'chưa cài faster-whisper (pip install faster-whisper)');
    else todo(s, 'align');
    const words = []; s.align = [];
    s.lines.forEach((l, i) => {
      const ws = V.tokens(l.text), rel = asr && l.wav && asr[P(l.wav)] ? V.matchWords(ws, asr[P(l.wav)], l.dur) : { words: V.evenTiming(ws, l.wav ? 0.05 : 0, l.dur - (l.wav ? 0.05 : 0.3)), matched: 0, method: 'even' };
      rel.words.forEach(x => words.push({ line: i, w: x.w, start: +(l.start + x.start).toFixed(2), end: +(l.start + x.end).toFixed(2) }));
      s.align.push({ method: rel.method, matched: +rel.matched.toFixed(2) });
    });
    const last = s.lines[s.lines.length - 1];
    s.endStart = +(last.end + 0.4).toFixed(2); s.duration = +(s.endStart + END_CARD).toFixed(2); s.words = 'words.json';
    fs.writeFileSync(P('words.json'), JSON.stringify(words));
    console.log(`  căn mốc: ${s.align.map(a => a.method).join(',')} · thời lượng ${s.duration} s`);
  },
  // 6) Khẩu hình Rhubarb Lip Sync (bản phát hành, CPU): rhubarb -f json -d line-NN.txt line-NN.wav
  //    Ra: visemes.json = [{ line, start, end, v: 'A'…'H'|'X' }] (giây từ đầu video) – để chấm lệch khẩu hình và cho rig miệng sau này.
  async lipsync(s) {
    s.visemes = null;
    if (!s.lines.some(l => l.wav)) return todo(s, 'lipsync');
    if (!canRun(RHUBARB, ['--version'])) return skip(s, 'lipsync', 'chưa có rhubarb (tải bản phát hành Rhubarb-Lip-Sync)');
    const all = [];
    for (const [i, l] of s.lines.entries()) {
      if (!l.wav) continue;
      const nn = String(i).padStart(2, '0'); fs.writeFileSync(P(`line-${nn}.txt`), l.text);
      execFileSync(RHUBARB, ['-q', '-f', 'json', '-d', P(`line-${nn}.txt`), '-o', P(`line-${nn}.vis.json`), P(l.wav)], { stdio: ['ignore', 'ignore', 'inherit'] });
      for (const c of JSON.parse(fs.readFileSync(P(`line-${nn}.vis.json`), 'utf8')).mouthCues || []) all.push({ line: i, start: +(l.start + c.start).toFixed(3), end: +(l.start + c.end).toFixed(3), v: c.value });
    }
    fs.writeFileSync(P('visemes.json'), JSON.stringify(all)); s.visemes = 'visemes.json';
    console.log(`  ${all.length} khẩu hình`);
  },
  // 7) Phụ đề karaoke ASS: từ đang đọc màu cam, từ khóa vàng, viền mực; vùng an toàn 1/3 dưới · hook chữ to 2 s đầu · thẻ CTA lexkite.com
  async karaoke(s) {
    const [w, h] = W[s.job.format] || W.short, words = JSON.parse(fs.readFileSync(P('words.json'), 'utf8')), sc = s.job.script;
    const v = s.variant, lb = v ? v.format.labels || {} : {}, seen = new Set();
    const labels = s.lines.flatMap((l, i) => (lb[l.beat] && !seen.has(l.beat) && seen.add(l.beat) ? [{ start: i ? l.start : 0, end: Math.min(l.end, (i ? l.start : 0) + 2.5), ...lb[l.beat] }] : [])); // nhãn khuôn (DON'T SAY / SAY…) ở câu đầu mỗi phần
    fs.writeFileSync(P('subs.ass'), V.buildAss({ w, h, format: s.job.format, lines: s.lines, words, keywords: sc.keywords || [], hook: sc.hook || s.lines[0].text, cta: { start: s.endStart + 0.15, end: s.duration }, hookStyle: v ? v.hookStyle.id : 'bold-top', labels, ctaText: !(v && v.endCard.textBaked) }));
    const srt = x => { const ms = Math.round(x * 1000), p2 = n => String(n).padStart(2, '0'); return `${p2(Math.floor(ms / 3600000))}:${p2(Math.floor(ms / 60000) % 60)}:${p2(Math.floor(ms / 1000) % 60)},${String(ms % 1000).padStart(3, '0')}`; };
    fs.writeFileSync(P('subs.srt'), s.lines.map((l, i) => `${i + 1}\n${srt(l.start)} --> ${srt(l.end + 0.25)}\n${l.text}\n`).join('\n'));
    s.subs = 'subs.ass';
  },
  // 8) Ghép: dải giọng (-16 LUFS, 2 lượt loudnorm) + từng cảnh (phòng + nhân vật + bóng + khung máy) → nối → burn-in ASS → video.mp4 1080×1920 30 fps
  async compose(s) {
    if (!canRun('ffmpeg', ['-version'])) throw new Error('thiếu ffmpeg');
    const [w, h] = W[s.job.format] || W.short, D = s.duration;
    const stage = s.stage || { lines: [], segs: [] };
    // góc máy từng câu theo khuôn/bộ góc máy; chuyển cảnh rõ ràng khi đổi bối cảnh và sau hook
    s.shots = V.planShots(s.lines.map((l, i) => ({ ...l, camera: s.variant ? X.cameraFor(s.variant, l, i) : null, transitionIn: !!(stage.lines[i] && stage.lines[i].transitionIn) || (i === 1 && !!s.variant) })), { endStart: s.endStart, duration: D });
    if (useRemotion()) {
      // máy kiểu phim (lib.planFilmShots): wide hook → two → single người nói → cận người NGHE ở nhịp phản ứng; không cận người đang nói
      s.shots = V.planFilmShots(s.lines.map((l, i) => { const sl = stage.lines[i] || { actors: [] }, ls = (sl.actors || []).find(a => a.role === 'listener' && l.who !== 'kit');
        return { ...l, emotion: sl.emotion, listener: ls ? ls.who : null, transitionIn: !!sl.transitionIn || (i === 1 && !!s.variant), sceneChange: !!sl.transitionIn && i > 0 }; }), { endStart: s.endStart, duration: D });
      return composeRemotion(s, [w, h], D);
    }
    if (STRICT) throw new Error('thiếu Remotion: cd scripts/video/remotion && npm ci (VIDEO_ENGINE=ffmpeg để dùng đường cũ)');
    console.log('⚠️ chưa cài Remotion (scripts/video/remotion) → đường ffmpeg cũ, không có motion graphics'); todo(s, 'remotion');
    buildVoice(s, D, null);
    const list = [];
    for (const [k, sh] of s.shots.entries()) {
      const f = `shot-${String(k).padStart(2, '0')}.mp4`;
      renderShot(s, sh, s.shots[k + 1], [w, h], P(f)); list.push(`file '${f}'`);
    }
    fs.writeFileSync(P('shots.txt'), list.join('\n') + '\n');
    ff(['-f', 'concat', '-safe', '0', '-i', P('shots.txt'), '-c', 'copy', P('silent.mp4')]);
    const assOk = /^\s*\S+\s+ass\s/m.test(execFileSync('ffmpeg', ['-hide_banner', '-filters'], { encoding: 'utf8' }));
    ff(['-i', P('silent.mp4'), '-i', P('voice.wav'), ...(assOk ? ['-vf', `ass=${P('subs.ass')}`] : []), '-map', '0:v', '-map', '1:a', '-r', String(FPS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-t', String(D), '-movflags', '+faststart', P('video.mp4')]);
    for (const x of fs.readdirSync(DIR)) if (/^shot-\d+\.mp4$|^silent\.mp4$|^voice-mix\.wav$/.test(x)) fs.rmSync(P(x), { force: true });
    s.video = 'video.mp4'; s.burned = assOk; s.engine = 'ffmpeg'; s.width = w; s.height = h;
    if (!assOk) console.log('⚠️ ffmpeg không có bộ lọc ass (libass) – chưa burn-in phụ đề (cài Remotion để có phụ đề động)');
  },
  // 9) Cổng QA (docs/MEDIA-QA-RUBRIC.md C) – chấm phần đo được; knowledge & share để người duyệt chấm (null). Lỗi nhất quán → mục tương ứng = 0 + blocked.
  async qa(s) {
    const sc = s.job.script, gates = [], g = (k, ok, note) => gates.push({ k, ok, note });
    const v = P('video.mp4'), [w, h] = W[s.job.format] || W.short;
    const dur = fs.existsSync(v) ? probe(v).dur : 0;
    const max = s.job.format === 'lesson' ? 480 : 60; g('duration', dur > 0 && dur <= max, `${dur.toFixed(1)} s / ≤ ${max} s`);
    // Âm thanh: đo lại trên video cuối bằng ebur128
    const hasAudio = s.lines.some(l => l.wav), lufs = fs.existsSync(v) ? V.parseEbur128(ffErr(['-i', v, '-map', '0:a', '-af', 'ebur128', '-f', 'null', '-'])) : null;
    g('audio', V.audioScore(lufs) === 10, hasAudio ? `${lufs == null ? '?' : isFinite(lufs) ? lufs.toFixed(1) : '-inf'} LUFS (mục tiêu -16 ±1)` : 'chưa có giọng (bước tts bị bỏ qua)');
    // Khẩu hình: lệch giữa lúc miệng mở (Rhubarb) và đầu cụm từ (whisper)
    const words = JSON.parse(fs.readFileSync(P('words.json'), 'utf8')), vis = s.visemes ? JSON.parse(fs.readFileSync(P(s.visemes), 'utf8')) : null;
    const lipMs = V.lipsyncOffset(words, vis); g('lipsync', lipMs != null && lipMs < 80, lipMs == null ? 'chưa đo được (thiếu khẩu hình/giọng)' : `lệch ~${lipMs} ms (< 80 ms)`);
    // Phụ đề: đúng chữ 100%, burn-in, vùng an toàn, tương phản ≥ 4.5
    const ass = fs.readFileSync(P('subs.ass'), 'utf8'), ex = V.subsExact(ass, s.lines);
    const safe = V.subsSafeArea({ w, h, format: s.job.format, maxChars: Math.max(...s.lines.map(l => String(l.text).length)) });
    const ctr = Math.min(...['white', 'orange', 'yellow'].map(c => V.contrast(V.BRAND[c], V.BRAND.ink)));
    g('subs-text', ex.ok, ex.ok ? 'phụ đề khớp kịch bản 100%' : `phụ đề lệch kịch bản ở câu ${ex.bad.map(i => i + 1).join(', ')}`);
    g('subs-safe', safe.ok, `khối phụ đề y ${safe.top}–${safe.bottom} (${safe.rows} dòng)`); g('subs-contrast', ctr >= 4.5, `tương phản tối thiểu ${ctr}:1`);
    g('subs-burned', !!s.burned, s.burned ? 'đã burn-in' : 'chưa burn-in (thiếu libass)');
    const hookSec = s.lines[0].end - s.lines[0].start, hookText = /,HOOK,/.test(ass); g('hook', hookSec <= V.HOOK_MAX && hookText, `câu hook ${hookSec.toFixed(1)} s · chữ hook 2 s đầu: ${hookText ? 'có' : 'không'}`);
    const pace = V.pacingScore(s.shots || []); g('pacing', pace.bad === 0, `${(s.shots || []).length} cảnh, TB ${pace.avg} s, dài nhất ${pace.max} s`);
    const bg = V.brandGate(sc), brandOk = bg.ok; g('brand', brandOk, bg.note);
    const cg = V.ctaGate(sc), ctaOk = cg.ok; g('cta', ctaOk, cg.note);
    const cons = s.consistency || { ok: true, zero: [], reasons: [] };
    const vr = s.variant; g('variety', !!vr && !vr.relaxed, vr ? `${vr.format.id} · không trùng ≥ 3 thành phần với ${(s.history || []).length} video gần nhất${vr.relaxed ? ' – CHƯA ĐẠT' : ''}` : 'không có biến thể');
    g('consistency', cons.ok, cons.ok ? 'bối cảnh – nhân vật – lời thoại khớp' : `${cons.reasons.length} lỗi: ${cons.reasons[0]}`);
    // Visual hook 2 s đầu (chữ + chuyển động + tương phản, cổng ≥ 90) và QA màu (cháy/bết < 1%, bão hòa trong biên, ΔE da↔phòng) – chỉ khi dựng bằng Remotion
    let vh = null, grade = null, lay = null, cadence = null;
    // Bố cục chữ (không OCR – đo từ props.json mà Remotion vẽ): không 2 lớp chữ giao nhau, trong vùng an toàn, chữ phụ đề hiện = kịch bản (đúng dấu cách)
    if (s.timeline && fs.existsSync(P(s.timeline))) {
      lay = M.layoutGate(JSON.parse(fs.readFileSync(P(s.timeline), 'utf8')), s.lines);
      g('layout', lay.ok, lay.ok ? 'chữ overlay không chồng nhau · trong vùng an toàn · phụ đề đúng dấu cách' : `${lay.bad.length} lỗi: ${lay.bad.slice(0, 2).join('; ')}`);
    }
    if (s.timeline && fs.existsSync(v)) {
      const tl = JSON.parse(fs.readFileSync(P(s.timeline), 'utf8'));
      vh = M.visualHookScore({ frames: framesAt(v, { dur: 2 }), tl });
      g('visual-hook', vh.score >= 90, `${vh.score}/100 (chữ ${vh.text} · chuyển động ${vh.motion} · tương phản ${vh.contrast}) – cổng ≥ 90`);
      // hộp nhân vật theo VỊ TRÍ TRÊN MÀN HÌNH (qua khung máy ở giữa cảnh – trước đây dùng toạ độ canvas nên cảnh đơn/cận đo lệch chỗ)
      const box = sh => { const a = (sh.actors || []).find(x => x.role === 'speaker') || (sh.actors || [])[0]; if (!a) return null;
        const c = sh.cam ? M.camAt(sh.cam, 0.5) : { cx: w / 2, cy: h / 2, z: 1 }, [x0, y0] = M.toScreen(c, a.x - a.h * 0.28, a.y - a.h, w, h), [x1, y1] = M.toScreen(c, a.x + a.h * 0.28, a.y, w, h), cl = x => Math.max(0, Math.min(1, x));
        return [cl(x0 / w), cl(y0 / h), cl(x1 / w), cl(y1 / h)]; };
      const ui = t => M.overlayBoxes(tl, t).map(b => [b.box[0] / w, b.box[1] / h, b.box[2] / w, b.box[3] / h]); // lớp chữ/thẻ không phải phòng/nhân vật
      const stats = tl.shots.filter(x => x.framing !== 'card').slice(0, 8).map(x => ({ ...M.gradeStats(framesAt(v, { from: (x.start + x.end) / 2, dur: 0.05, fps: 30, w: 270, h: 480 })[0] || { w: 1, h: 1, data: new Uint8Array(3) }, box(x), ui((x.start + x.end) / 2)), grade: x.grade }));
      const gv = M.gradeVerdict(stats); grade = { stats, ...gv };
      // nhịp chuyển động nhân vật (metric, không chặn): khung lặp kẹp giữa 2 bước có chuyển động trong hộp nhân vật của các cảnh đơn/đôi
      cadence = tl.shots.filter(x => x.cam && ['single', 'two'].includes(x.framing) && x.end - x.start >= 1).slice(0, 6).map(x => {
        const b = box(x); if (!b) return null; const fr = framesAt(v, { from: x.start + 0.15, dur: Math.min(2, x.end - x.start - 0.3), fps: 30, w: 270, h: 480 });
        return M.cadenceStats(fr, b);
      }).filter(Boolean);
      const dEs = stats.map(x => x.dE).filter(x => x != null);
      g('grade', gv.ok, gv.ok ? `cháy/bết < 1% · bão hòa TB ${(stats.reduce((a, x) => a + x.sat, 0) / Math.max(1, stats.length)).toFixed(2)} · ΔE da↔phòng ≤ ${dEs.length ? Math.max(...dEs) : '—'}` : gv.bad.slice(0, 2).join('; '));
    }
    const scores = { hook: hookText ? V.hookScore(hookSec) : 5, knowledge: null, lipsync: V.lipsyncScore(lipMs), audio: hasAudio ? V.audioScore(lufs) : 0, subs: ex.ok && s.burned && safe.ok && ctr >= 4.5 && (!lay || lay.ok) ? 10 : 0, pacing: pace.score, brand: brandOk ? 10 : 0, cta: ctaOk ? 5 : 0, share: null };
    for (const k of cons.zero) scores[k] = 0; // vi phạm nhất quán → 0 điểm mục tương ứng
    if (vr && vr.relaxed) scores.pacing = 0; // lặp tổ hợp = nhàm → không đạt nhịp/độ mới, chặn đăng
    const hookBad = !!vh && vh.score < 90, layBad = !!lay && !lay.ok; // chữ chồng chữ / dính chữ = lỗi nhìn thấy → subs 0 + chặn đăng
    s.qa = { scores, gates, blocked: !cons.ok || !!(vr && vr.relaxed) || hookBad || layBad, consistency: [...cons.reasons, ...(vr && vr.relaxed ? ['[pacing] tổ hợp trùng ≥ 3 thành phần với video gần đây'] : []), ...(hookBad ? [`[hook] visual hook ${vh.score}/100 < 90`] : []), ...(layBad ? lay.bad.slice(0, 5).map(x => `[subs] ${x}`.slice(0, 200)) : [])], variant: vr ? vr.fp : null, metrics: { lufs: lufs != null && isFinite(lufs) ? lufs : null, lipsyncMs: lipMs, shots: (s.shots || []).length, pace, align: s.align, engine: s.engine || null, visualHook: vh, grade, cadence: cadence && { shots: cadence, stutterRate: +(cadence.reduce((a, c) => a + c.stutters, 0) / Math.max(1, cadence.reduce((a, c) => a + c.moving, 0))).toFixed(3) }, layout: lay ? { ok: lay.ok, overlaps: lay.overlaps.length, unsafe: lay.unsafe.length, joins: lay.joins.length } : null } };
    s.files = { duration: +dur.toFixed(2), size: fs.existsSync(v) ? fs.statSync(v).size : 0, width: w, height: h, todo: s.todo || [] };
    console.log(gates.map(x => `${x.ok ? '✓' : '✗'} ${x.k}: ${x.note}`).join('\n'));
    if (LOCAL && vr) { const h = (fs.existsSync(HIST) ? JSON.parse(fs.readFileSync(HIST, 'utf8')) : []).filter(x => x.id !== ID); h.push({ id: ID, ...vr.fp }); fs.writeFileSync(HIST, JSON.stringify(h.slice(-200))); }
    const known = Object.values(scores).filter(x => x != null).reduce((a, b) => a + b, 0);
    console.log(`  điểm tự chấm ${known}/75 (+ knowledge 20, share 5 chấm tay)${s.qa.blocked ? ' · CHẶN ĐĂNG' : ''}`);
  },
  // 10) Gọi lại Studio: files (object_id GrabCast, link xem trước) + điểm QA (+ blocked/consistency). --ok failure → báo lỗi để job quay về script_ok. --local: chỉ in.
  async report(s) {
    if (LOCAL || s.local) { console.log(`  (chạy thử) không gọi Studio · video: ${s.video ? P(s.video) : '—'}`); return; }
    const ok = (opt('ok') || 'success') === 'success' && !!s.qa;
    const files = { ...(s.files || {}), variant: s.variant ? s.variant.fp : undefined, object_id: process.env.OBJECT_ID || undefined, preview_url: process.env.PREVIEW_URL || undefined, run_url: process.env.RUN_URL || undefined, artifact: s.video ? `video-${ID}` : undefined };
    const r = await studio({ op: 'ciResult', id: ID, ok, files, qa: s.qa, error: ok ? undefined : (s.error || 'bước dựng thất bại – xem log Actions') });
    console.log(`✓ đã báo Studio: ${r.job ? r.job.status : '?'}${r.auto ? ' · tự đăng: ' + r.auto : ''}`);
  },
};

// Dải âm cả video (ffmpeg chỉ lo tiếng): giọng từng câu đúng mốc + nhạc nền tự tổng hợp (synth.mjs, không bản quyền) NÉN SIDECHAIN dưới giọng
// + SFX tự đặt (motion.mjs placeSfx: whoosh ở chuyển cảnh, pop ở chữ/sticker, ding/buzz ở thẻ ✅/❌, riser trước đáp án, bass drop ở hook/sốc)
// → trộn → loudnorm 2 lượt về -16 LUFS (không có giọng: -20 LUFS để nhạc không bị đẩy lên) → voice.wav.
function buildVoice(s, D, tl) {
  const ls = s.lines.filter(l => l.wav), v = s.variant, inputs = [], parts = [], bus = [];
  let k = 0, voice = null;
  const vt = ls.map(l => { inputs.push('-i', P(l.wav)); parts.push(`[${k}:a]aresample=48000,adelay=${Math.round(l.start * 1000)}:all=1[a${k}]`); return `[a${k++}]`; });
  if (vt.length) { parts.push(`${vt.join('')}${vt.length > 1 ? `amix=inputs=${vt.length}:normalize=0:dropout_transition=0,` : ''}apad=whole_dur=${D}[vo]`); voice = 'vo'; }
  const mid = v && v.music && v.music.id && v.music.id !== 'none' ? v.music.id : null;
  if (mid) {
    fs.writeFileSync(P('music.wav'), wav16(synthMusic(mid, D))); inputs.push('-i', P('music.wav'));
    parts.push(`[${k++}:a]aresample=48000,volume=${voice ? 0.3 : 0.5}[mu0]`);
    if (voice) { parts.push('[vo]asplit=2[vo1][vsc]', '[mu0][vsc]sidechaincompress=threshold=0.025:ratio=10:attack=12:release=380:makeup=1[mu]'); voice = 'vo1'; } else parts.push('[mu0]anull[mu]');
    bus.push('[mu]');
  }
  if (voice) bus.push(`[${voice}]`);
  for (const c of (tl && tl.sfx) || []) {
    const f = path.join(SFX_DIR, c.id + '.wav'); if (!fs.existsSync(f)) continue;
    inputs.push('-i', f); parts.push(`[${k++}:a]aresample=48000,volume=${(c.gainDb + 4).toFixed(1)}dB,adelay=${Math.max(0, Math.round(c.t * 1000))}:all=1[x${k}]`); bus.push(`[x${k}]`);
  }
  if (!bus.length) { ff(['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', String(D), P('voice.wav')]); return; }
  const mix = bus.length > 1 ? `${bus.join('')}amix=inputs=${bus.length}:normalize=0:dropout_transition=0[m]` : `${bus[0]}anull[m]`;
  ff([...inputs, '-filter_complex', `${parts.join(';')};${mix};[m]apad=whole_dur=${D},atrim=0:${D}[o]`, '-map', '[o]', '-ar', '48000', '-ac', '1', P('voice-mix.wav')]);
  const I = vt.length ? -16 : -20;
  const m = (ffErr(['-i', P('voice-mix.wav'), '-af', `loudnorm=I=${I}:TP=-1.5:LRA=11:print_format=json`, '-f', 'null', '-']).match(/\{[\s\S]*?\}/g) || []).pop();
  const j = m ? JSON.parse(m) : null;
  const ln = j && isFinite(+j.input_i) ? `loudnorm=I=${I}:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true` : `loudnorm=I=${I}:TP=-1.5:LRA=11`;
  ff(['-i', P('voice-mix.wav'), '-af', `${ln},aresample=48000`, '-ac', '1', '-t', String(D), P('voice.wav')]);
}

// ---------- Remotion ----------
// Kit chỉ lấy từ web/js/kit.js (luật brand): chạy kit.js trong vm → SVG tĩnh cho từng cảm xúc
function kitSvgs(pub) {
  const ctx = { self: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'web/js/kit.js'), 'utf8'), ctx);
  const out = {}; for (const m of ['happy', 'win', 'cheer', 'think', 'sad']) { const f = `kit-${m}.svg`; fs.writeFileSync(path.join(pub, f), ctx.self.Kit.svg(m, 512, false).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')); out[m] = f; }
  return out;
}
const CACHE = 'out/video/cache';
// Phòng: file kho → (chạy thử) ảnh phòng tạm → gradient thương hiệu (chỉ khi ALLOW_STUDIO). Strict thiếu phòng = lỗi rõ ràng.
function prepRoom(s, g, pub) {
  const r = g.room, time = (s.stage && s.stage.time) || 'day';
  let f = !r.virtual && r.file && fs.existsSync(libFile(r.file)) ? libFile(r.file) : null;
  if (!f && opt('bg') && fs.existsSync(opt('bg'))) f = path.resolve(opt('bg'));
  if (!f && !STRICT) {
    const rd = path.join(LIB, 'rooms'), lib = fs.existsSync(rd) ? fs.readdirSync(rd).filter(x => x.startsWith(g.scene + '-') && x.includes(`-${time}-`) && /\.(png|jpe?g|webp)$/.test(x)).sort().map(x => path.join(rd, x)) : [];
    const cands = [...lib, g.scene === 'office' ? path.join(ROOT, 'brand/characters/_candidates/rooms/office-full-a.png') : null];
    f = cands.find(x => x && fs.existsSync(x)) || null;
    if (f) { todo(s, 'room-placeholder'); console.log(`⚠️ phòng ${r.id}: chưa có file kho → ảnh tạm ${path.relative(ROOT, f)}`); }
  }
  if (!f) {
    if (!ALLOW_STUDIO) throw new Error(`thiếu ảnh phòng ${r.file || r.id} (bối cảnh ${g.scene}) – strict không thay nền trơn`);
    console.log(`⚠️ phòng ${r.id}: không có ảnh → nền gradient thương hiệu`); todo(s, 'room'); return null;
  }
  const out = `room-${r.id}${path.extname(f)}`; fs.copyFileSync(f, path.join(pub, out));
  // khớp ánh sáng: màu trung bình của phòng (cân trắng nhân vật) + bề rộng ảnh gốc (giới hạn phóng máy ≤ 1,6×)
  let tint = null, srcW = null;
  try { const px = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-vf', 'scale=1:1:flags=area', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']); tint = [px[0], px[1], px[2]]; } catch {}
  try { srcW = probe(f).w || null; } catch {}
  return { src: out, tint, srcW, light: r.light || null, maskText: r.maskText || [], counter: r.counter || null };
}
// Nhân vật: clip stacked (kiểm định dạng – sai thì strict FAIL) → webm alpha; ảnh có alpha → png; nền trơn (chạy thử) → keyclip flood-fill
async function prepActor(s, a, pub) {
  let file = a.asset && a.asset.kind !== 'none' && a.asset.file ? libFile(a.asset.file) : null, kind = a.asset ? a.asset.kind : 'none';
  if (file && !fs.existsSync(file)) file = null;
  if (!file && !STRICT) {
    // KHÔNG lấp chỗ trống bằng ảnh nhân vật kiểu khác (chủ 28/10: 1 bộ 2D duy nhất, web/teach/characters.json) – chỉ ảnh kho của chính nhân vật đó
    const c = [path.join(LIB, `chars/${a.who}/neutral.png`)].find(x => fs.existsSync(x));
    if (c) { file = c; kind = 'still'; todo(s, 'actor-placeholder'); console.log(`⚠️ ${a.who}: chưa có tài nguyên kho → ảnh tạm ${path.relative(ROOT, c)}`); }
  }
  if (!file) { console.log(`⚠️ ${a.who}: không có tài nguyên – bỏ khỏi cảnh`); todo(s, 'actor'); return null; }
  fs.mkdirSync(CACHE, { recursive: true });
  const st = fs.statSync(file), still = /\.(png|jpe?g|webp)$/i.test(file), key = X.hash32(`${file}|${st.size}|${st.mtimeMs}|k4`).toString(36);
  const name = `actor-${a.who}-${key}.${still ? 'png' : 'webm'}`, out = path.join(CACHE, name), meta = out + '.json';
  if (!fs.existsSync(meta) || !fs.existsSync(out)) {
    let m;
    if (kind === 'clip' && a.asset.alpha === 'stacked') {
      try { m = await K.stackedToAlpha(file, out); } // 30 fps: bỏ khung lặp "on twos" + nội suy chuyển động (keyclip.mjs)
      catch (e) { if (STRICT) throw e; console.log(`⚠️ ${e.message} → cắt nền tạm bằng keyclip`); todo(s, 'clip-format'); m = await K.keyToAlpha(file, out); }
    } else if (still && K.hasAlpha(file)) m = K.stillWithAlpha(file, out);
    else { if (STRICT) throw new Error(`${a.who}: ${path.basename(file)} không có kênh alpha và không phải clip stacked`); m = await K.keyToAlpha(file, out); }
    fs.writeFileSync(meta, JSON.stringify(m));
  }
  const m = JSON.parse(fs.readFileSync(meta, 'utf8')); fs.copyFileSync(out, path.join(pub, name));
  // clip registry khung medium: chân ẢO dưới đáy clip (manifest foot/figH) – không đo từ mặt nạ (thân bị cắt ở hông, chạm đáy khung hình)
  const r = a.asset && a.asset.medium && a.asset.h ? m.h / a.asset.h : 0;
  if (r) { m.foot = [Math.round(m.w / 2), Math.round(a.asset.foot[1] * r)]; m.figH = Math.round(a.asset.figH * r); }
  return { src: name, kind: still ? 'img' : 'video', aw: m.w, ah: m.h, foot: m.foot, figH: m.figH, dur: m.dur || 5, fps: m.fps || 24 };
}
async function composeRemotion(s, [w, h], D) {
  const pub = P('public'); fs.rmSync(pub, { recursive: true, force: true }); fs.mkdirSync(path.join(pub, 'fonts'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'brand/social/src/fonts/BricolageGrotesque-ExtraBold.ttf'), path.join(pub, 'fonts/display.ttf'));
  fs.copyFileSync(path.join(ROOT, 'brand/social/src/fonts/BeVietnamPro-ExtraBold.ttf'), path.join(pub, 'fonts/body.ttf'));
  fs.copyFileSync(path.join(ROOT, 'brand/lexkite-logo-dark.svg'), path.join(pub, 'logo-dark.svg'));
  fs.writeFileSync(path.join(pub, 'mark-mono.svg'), fs.readFileSync(path.join(ROOT, 'brand/lexkite-mark-mono.svg'), 'utf8').replace(/#0F3D3E/gi, '#FFFFFF'));
  const kit = kitSvgs(pub), stage = s.stage || { lines: [], segs: [] }, rooms = {}, actors = {};
  const ak = a => `${a.who}|${(a.asset && a.asset.file) || 'none'}`;
  for (const g of stage.segs || []) rooms[`${g.scene}|${g.room.id}`] = prepRoom(s, g, pub);
  // clip nhân vật chuẩn bị SONG SONG (nội suy chuyển động ~30–60 s/clip, đơn luồng) – tối đa = số nhân CPU
  const todoA = []; for (const sl of stage.lines || []) for (const a of sl.actors || []) if (!todoA.some(x => ak(x) === ak(a))) todoA.push(a);
  const lim = Math.max(1, Math.min(6, os.cpus().length)); let qi = 0;
  await Promise.all(Array.from({ length: lim }, async () => { while (qi < todoA.length) { const a = todoA[qi++]; actors[ak(a)] = await prepActor(s, a, pub); } }));
  const words = JSON.parse(fs.readFileSync(P('words.json'), 'utf8')), sfxMan = JSON.parse(fs.readFileSync(path.join(SFX_DIR, 'manifest.json'), 'utf8'));
  const tl = M.buildTimeline({ s, words, w, h, fps: FPS, seed: (s.variant && s.variant.seed) || ID, sfxMap: sfxMan.placement, grain: process.env.VIDEO_GRAIN !== '0',
    assets: { roomOf: g => rooms[`${g.scene}|${g.room.id}`], actorOf: a => actors[ak(a)], kit } });
  fs.writeFileSync(P('props.json'), JSON.stringify(tl)); s.timeline = 'props.json';
  buildVoice(s, D, tl);
  const args = ['render', 'src/index.jsx', `fmt-${tl.format}`, path.resolve(P('silent.mp4')), `--props=${path.resolve(P('props.json'))}`, `--public-dir=${path.resolve(pub)}`, '--codec=h264', '--crf=18', '--log=error',
    ...(process.env.REMOTION_BROWSER ? [`--browser-executable=${process.env.REMOTION_BROWSER}`] : []), ...(process.env.REMOTION_CONCURRENCY ? [`--concurrency=${process.env.REMOTION_CONCURRENCY}`] : [])];
  console.log(`  Remotion fmt-${tl.format} · theme ${tl.theme.id} · ${tl.cuts.map(c => c.type).join(', ')} · ${tl.interrupts.length} ngắt nhịp · ${tl.sfx.length} SFX`);
  execFileSync(RM_BIN, args, { cwd: RM, stdio: ['ignore', 'inherit', 'inherit'], timeout: 40 * 60 * 1000 });
  ff(['-i', P('silent.mp4'), '-i', P('voice.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-t', String(D), '-movflags', '+faststart', P('video.mp4')]);
  for (const x of ['silent.mp4', 'voice-mix.wav']) fs.rmSync(P(x), { force: true });
  s.video = 'video.mp4'; s.burned = true; s.engine = 'remotion'; s.width = w; s.height = h;
}
// Khung RGB nhỏ từ video (QA visual hook / màu)
function framesAt(file, { from = 0, dur = 2, fps = 12, w = 216, h = 384 } = {}) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(from), '-t', String(dur), '-i', file, '-vf', `fps=${fps},scale=${w}:${h}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });
  const n = w * h * 3, out = []; for (let o = 0; o + n <= buf.length; o += n) out.push({ w, h, data: new Uint8Array(buf.buffer, buf.byteOffset + o, n) });
  return out;
}

// Lớp nhân vật: clip "stacked" (màu + mặt nạ) hoặc ảnh tĩnh trong suốt (đã cắt bóng sàn dính). Trả null nếu không dùng được (thiếu file / không có alpha).
const layerCache = {};
function actorLayer(a) {
  if (!a.asset || a.asset.kind === 'none') return null;
  const file = libFile(a.asset.file), key = file;
  if (layerCache[key] !== undefined) return layerCache[key];
  let L = null;
  if (a.asset.kind === 'clip') {
    const p = probe(file), stacked = a.asset.alpha === 'stacked', ph = stacked ? Math.floor(p.h / 2) : p.h;
    if (stacked || /a/.test(p.pix.replace('yuv', ''))) L = { kind: 'clip', file, stacked, w: p.w, h: ph, dur: p.dur || 1, foot: a.asset.foot || [p.w / 2, ph], figH: a.asset.figH || ph };
  } else {
    const out = P(`still-${a.who}-${path.basename(file)}`);
    const r = canRun(PY, ['-c', 'import numpy, PIL']) ? spawnSync(PY, [path.join(ROOT, 'scripts/video/layer_prep.py'), file, out], { encoding: 'utf8' }) : null;
    if (r && r.status === 0) { const m = JSON.parse(r.stdout); L = { kind: 'still', file: out, w: m.w, h: m.h, foot: m.foot, figH: m.figH }; }
    else if (!r) { const p = probe(file); if (/a/.test(p.pix.replace('yuv', ''))) L = { kind: 'still', file, w: p.w, h: p.h, foot: [p.w / 2, p.h], figH: p.h }; } // máy thiếu numpy: dùng nguyên ảnh, chân = giữa đáy
  }
  if (!L) console.log(`⚠️ ${a.who}: ${a.asset.file} không có kênh alpha – bỏ nhân vật khỏi cảnh`);
  return (layerCache[key] = L);
}

// 1 cảnh = phòng + bóng tiếp xúc + nhân vật (chân trên điểm đứng, lật theo hướng nhìn, chỉnh ấm theo ánh sáng phòng) + Kit (câu của Kit) + khung máy
function renderShot(s, sh, next, [W0, H0], out) {
  const f0 = Math.round(sh.start * FPS), f1 = Math.round(sh.end * FPS), n = Math.max(1, f1 - f0), D = n / FPS, Ds = D.toFixed(3);
  const st = s.stage || { lines: [], segs: [] }, li = sh.line >= 0 ? sh.line : s.lines.length - 1, sl = st.lines[li];
  const seg = (st.segs || []).find(g => li >= g.from && li <= g.to) || { room: { ...V.DEFAULT_ROOM, virtual: true, time: 'day' } }, room = seg.room;
  const inputs = [], fc = []; let k = 0, cur;
  const bgImg = opt('bg') || (!room.virtual && libFile(room.file));
  if (bgImg && fs.existsSync(bgImg)) { inputs.push('-loop', '1', '-framerate', String(FPS), '-t', Ds, '-i', bgImg); fc.push(`[${k++}:v]scale=${W0}:${H0}:force_original_aspect_ratio=increase,crop=${W0}:${H0},setsar=1,format=rgba[bg]`); }
  else { const night = room.time === 'night'; fc.push(`color=c=${night ? '0x17595A' : '0xFFF7EA'}:s=${W0}x${H0}:r=${FPS}:d=${Ds},drawbox=x=0:y=${room.floor.yFar}:w=iw:h=ih:color=${night ? '0x0F3D3E' : '0xFFE7C2'}:t=fill,format=rgba[bg]`); }
  cur = 'bg';
  const actors = sh.framing === 'card' ? [] : (sl ? sl.actors : []);
  const light = room.light || { dir: -1, warmth: 0 };
  actors.forEach((a, j) => {
    const L = actorLayer(a); if (!L) return;
    const kk = L.h ? a.h / L.figH : 1, sw = Math.max(2, Math.round(L.w * kk / 2) * 2), shh = Math.max(2, Math.round(L.h * kk / 2) * 2);
    const fx = a.flip ? L.w - L.foot[0] : L.foot[0], x = Math.round(a.x - fx * kk), y = Math.round(a.y - L.foot[1] * kk);
    if (L.kind === 'clip') inputs.push('-stream_loop', '-1', '-i', L.file) /* không -ss: tua + lặp làm khung đầu xám */; else inputs.push('-loop', '1', '-framerate', String(FPS), '-i', L.file);
    const src = `[${k++}:v]`;
    fc.push(L.stacked ? `${src}fps=${FPS},split=2[c${j}][m${j}];[c${j}]crop=iw:ih/2:0:0[rgb${j}];[m${j}]crop=iw:ih/2:0:ih/2,format=gray[al${j}];[rgb${j}][al${j}]alphamerge,format=rgba[raw${j}]` : `${src}fps=${FPS},format=rgba[raw${j}]`);
    const wm = +(light.warmth || 0) * 0.06;
    fc.push(`[raw${j}]scale=${sw}:${shh}${a.flip ? ',hflip' : ''}${wm ? `,colorchannelmixer=rr=${(1 + wm).toFixed(3)}:bb=${(1 - wm).toFixed(3)}` : ''}[act${j}]`);
    // bóng tiếp xúc dưới chân + bóng đổ mờ lệch theo hướng sáng (luật §0: thiếu bóng → chặn)
    const ew = Math.round(a.h * 0.34 / 2) * 2, eh = Math.max(8, Math.round(a.h * 0.045 / 2) * 2), ew2 = Math.round(ew * 1.6 / 2) * 2, dx = Math.round(-(light.dir || -1) * a.h * 0.07);
    const ell = (ww, hh, al) => `color=c=black@0.0:s=${ww}x${hh}:r=${FPS}:d=${Ds},format=rgba,geq=r='18':g='14':b='12':a='${al}*max(0,1-(pow((X-W/2)/(W/2),2)+pow((Y-H/2)/(H/2),2)))'`;
    fc.push(`${ell(ew2, eh, 55)},gblur=sigma=6[cs${j}]`, `${ell(ew, eh, 150)},gblur=sigma=3[sh${j}]`);
    fc.push(`[${cur}][cs${j}]overlay=x=${a.x - ew2 / 2 + dx}:y=${a.y - eh / 2}[b${j}a]`, `[b${j}a][sh${j}]overlay=x=${a.x - ew / 2}:y=${a.y - eh / 2}[b${j}b]`, `[b${j}b][act${j}]overlay=x=${x}:y=${y}:eof_action=repeat[b${j}]`);
    cur = `b${j}`;
  });
  const icon = path.join(ROOT, 'brand/lexkite-icon-512.png'), v = s.variant;
  // Lớp mùa (tiền cảnh cắt mép khung – luật §0, không đặt giữa sàn): overlays/<mùa>.png toàn khung, chỉ khi có file
  const season = v && v.setting.season !== 'none' ? (readJson('content/video/formats.json').seasons.find(x => x.id === v.setting.season) || {}).file : null;
  if (sh.framing !== 'card' && season && exists(season)) { inputs.push('-loop', '1', '-framerate', String(FPS), '-i', libFile(season)); fc.push(`[${k++}:v]scale=${W0}:${H0},format=rgba[ssn]`, `[${cur}][ssn]overlay=0:0[sso]`); cur = 'sso'; }
  if (sh.framing === 'card') { // end card theo biến thể: ảnh mẫu brand/social/templates (đã in chữ) · nền màu thương hiệu + biểu tượng · phòng tối mờ + biểu tượng
    const ec = (v && v.endCard) || { id: 'teal-icon', bg: '0x0F3D3E' };
    if (ec.file && existsRepo(ec.file)) { inputs.push('-loop', '1', '-framerate', String(FPS), '-i', path.join(ROOT, ec.file)); fc.push(`[${k++}:v]scale=${W0}:${H0}:force_original_aspect_ratio=increase,crop=${W0}:${H0},format=rgba[ecf]`, `[${cur}][ecf]overlay=0:0[cd]`); cur = 'cd'; }
    else {
      fc.push(ec.bg === 'room' ? `[${cur}]gblur=sigma=12,drawbox=x=0:y=0:w=iw:h=ih:color=black@0.55:t=fill[cd]` : `[${cur}]drawbox=x=0:y=0:w=iw:h=ih:color=${ec.bg || '0x0F3D3E'}@0.96:t=fill[cd]`); cur = 'cd';
      if (fs.existsSync(icon)) { inputs.push('-loop', '1', '-framerate', String(FPS), '-i', icon); fc.push(`[${k++}:v]scale=300:300,format=rgba[ic]`, `[${cur}][ic]overlay=x=${(W0 - 300) / 2}:y=${Math.round(H0 * 0.27)}[ce]`); cur = 'ce'; }
    }
  } else if (sl && sl.who === 'kit' && fs.existsSync(icon)) { // Kit nói: huy hiệu Kit nhún nhẹ (Kit chỉ từ tài nguyên thương hiệu, không vẽ AI)
    inputs.push('-loop', '1', '-framerate', String(FPS), '-i', icon); fc.push(`[${k++}:v]scale=240:240,format=rgba[kit]`, `[${cur}][kit]overlay=x=${W0 - 290}:y='${Math.round(H0 * 0.3)}+12*sin(2*PI*t*1.5)'[kb]`); cur = 'kb';
  }
  // Góc máy: wide · close (cận người nói) · push (đẩy vào) · dolly (lùi ra) · pan (lia ngang) · split (chia đôi trên/dưới: người nói | người nghe)
  const sp = actors.find(a => a.role === 'speaker'), ls = actors.find(a => a.role === 'listener');
  const win = (a, z) => { const cw = Math.round(W0 / z / 2) * 2, ch = Math.round(H0 / z / 2) * 2, cx0 = a ? a.x : W0 / 2, cy0 = a ? a.y - a.h * 0.55 : H0 / 2; return { cw, ch, cx: Math.max(0, Math.min(W0 - cw, Math.round(cx0 - cw / 2))), cy: Math.max(0, Math.min(H0 - ch, Math.round(cy0 - ch / 2))) }; };
  let fr = ({ two: 'push', single: 'push', wide: 'wide' })[sh.framing] || sh.framing; if (fr === 'split' && !(sp && ls)) fr = 'close';
  if (fr === 'close') { const c = win(sp, 1.3); fc.push(`[${cur}]crop=${c.cw}:${c.ch}:${c.cx}:${c.cy},scale=${W0}:${H0}[fr]`); cur = 'fr'; }
  else if (fr === 'push' || fr === 'dolly') {
    const z = fr === 'push' ? `1+0.12*on/${n}` : `1.14-0.12*on/${n}`;
    fc.push(`[${cur}]format=yuv420p,scale=${W0 * 1.5}:${H0 * 1.5},zoompan=z='${z}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)*0.42':d=1:s=${W0}x${H0}:fps=${FPS}[fr]`); cur = 'fr';
  } else if (fr === 'pan') {
    const cw = Math.round(W0 / 1.18 / 2) * 2, ch = Math.round(H0 / 1.18 / 2) * 2, dir = sp && sp.x > W0 / 2 ? 1 : -1, x0 = dir > 0 ? 0 : W0 - cw, x1 = dir > 0 ? W0 - cw : 0;
    fc.push(`[${cur}]crop=${cw}:${ch}:'${x0}+(${x1 - x0})*min(1,t/${D.toFixed(3)})':${Math.round((H0 - ch) * 0.6)},scale=${W0}:${H0}[fr]`); cur = 'fr';
  } else if (fr === 'split') {
    const half = H0 / 2, pane = a => { const cw = Math.round(W0 / 1.6 / 2) * 2, ch = Math.round(cw * half / W0 / 2) * 2, cx = Math.max(0, Math.min(W0 - cw, Math.round(a.x - cw / 2))), cy = Math.max(0, Math.min(H0 - ch, Math.round(a.y - a.h * 0.78 - ch / 2))); return `crop=${cw}:${ch}:${cx}:${cy},scale=${W0}:${half}`; };
    fc.push(`[${cur}]split=2[sa][sb]`, `[sa]${pane(sp)}[pa]`, `[sb]${pane(ls)}[pb]`, `[pa][pb]vstack,drawbox=x=0:y=${half - 4}:w=iw:h=8:color=0xFFF7EA:t=fill[fr]`); cur = 'fr';
  }
  const tr = (v && v.transition) || { color: '0x0F3D3E', d: 0.3 };
  const fades = [sh.transitionIn ? `fade=t=in:st=0:d=${tr.d}:color=${tr.color}` : '', next && next.transitionIn ? `fade=t=out:st=${Math.max(0, D - tr.d).toFixed(3)}:d=${tr.d}:color=${tr.color}` : ''].filter(Boolean);
  fc.push(`[${cur}]${fades.length ? fades.join(',') + ',' : ''}format=yuv420p,setsar=1[vo]`);
  if (process.env.VIDEO_DEBUG) console.log(fc.join(';\n'));
  ff([...inputs, '-filter_complex', fc.join(';'), '-map', '[vo]', '-frames:v', String(n), '-r', String(FPS), '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', out]);
}

if (COVERAGE) { // báo cáo độ phủ – không dựng
  const rep = X.coverage({ formats: readJson('content/video/formats.json'), casting: readJson('content/video/casting.json'), manifest: manifestOf(), exists, existsRepo, emotionTags: V.EMOTION_TAGS });
  fs.mkdirSync('out/video', { recursive: true }); fs.writeFileSync('out/video/coverage.json', JSON.stringify(rep, null, 2));
  console.log(`Tổ hợp khả dụng (tài nguyên hiện có, phòng thiếu file tính là nền màu thương hiệu): ${rep.total.toLocaleString('en-US')}`); for (const t of rep.topics) console.log(`  ${t.topic}: ${t.combos.toLocaleString('en-US')}`);
  console.log(`Tài nguyên còn thiếu (${rep.missing.length}):`); for (const m of rep.missing) console.log('  - ' + m);
  const full = X.coverage({ formats: readJson('content/video/formats.json'), casting: readJson('content/video/casting.json'), manifest: manifestOf(), exists: () => true, existsRepo, emotionTags: V.EMOTION_TAGS });
  console.log(`Khi đủ tài nguyên trong manifest: ${full.total.toLocaleString('en-US')} tổ hợp → out/video/coverage.json`);
  process.exit(0);
}
const ORDER = ['fetch', 'variant', 'cast', 'tts', 'align', 'lipsync', 'karaoke', 'compose', 'qa', ...(LOCAL ? ['report'] : [])];
const run = STEP === 'all' ? ORDER : [STEP];
if (!run.every(x => STEPS[x])) die('bước không hợp lệ: ' + STEP);
const s = load();
for (const k of run) {
  try { await STEPS[k](s); s.steps[k] = 'ok'; store(s); console.log(`✓ ${k}`); }
  catch (e) { s.steps[k] = 'fail'; s.error = `${k}: ${String(e.message || e).slice(0, 200)}`; store(s); die(s.error); }
}
if (process.env.GITHUB_OUTPUT && s.video) fs.appendFileSync(process.env.GITHUB_OUTPUT, `video=${path.join(DIR, s.video)}\n`);
