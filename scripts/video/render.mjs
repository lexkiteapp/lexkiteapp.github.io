// Dựng 1 video theo job của Video Studio (functions/api/studio.js) – chạy trong GitHub Actions video.yml (ubuntu-latest, miễn phí) hoặc trên máy.
// Dùng: node scripts/video/render.mjs --job <id> [--step all|fetch|tts|align|lipsync|karaoke|compose|qa|report] [--script script.json] [--bg ảnh.png] [--ok success|failure]
//   env: STUDIO_API (mặc định https://lexkite.com/api/studio) · STUDIO_CALLBACK_SECRET (secret, cần cho fetch/report) · OBJECT_ID, PREVIEW_URL, RUN_URL (bước report)
// Trạng thái giữa các bước: out/video/<id>/state.json – mỗi bước đọc/ghi file này nên workflow tách bước rõ ràng (thất bại ở bước nào thấy ngay).
// Kế hoạch đầy đủ (docs/VIDEO-PIPELINE.md §2): TTS Kokoro → căn mốc từ (whisper) → khẩu hình (Rhubarb) → phụ đề karaoke ASS → ghép → cổng QA → gọi lại Studio.
// Đã làm (rẻ, chạy ngay): mốc từ chia đều theo ước lượng thời lượng · ASS karaoke \k · ghép ffmpeg nền tạm/ảnh phòng + phụ đề burn-in · cổng QA đo được · gọi lại.
// TODO (nặng) – giao diện cố định bên dưới từng bước: tts, align (whisper), lipsync (rhubarb), dựng rig nhân vật. Không bao giờ in bí mật.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const args = process.argv.slice(2), opt = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const die = m => { console.error('✗ render: ' + m); process.exit(1); };
const ID = opt('job'), STEP = opt('step') || 'all';
if (!ID || !/^[A-Za-z0-9_-]{1,40}$/.test(ID)) die('cần --job <id>');
const API = process.env.STUDIO_API || 'https://lexkite.com/api/studio', SECRET = process.env.STUDIO_CALLBACK_SECRET || '';
const DIR = path.join('out/video', ID), STATE = path.join(DIR, 'state.json');
fs.mkdirSync(DIR, { recursive: true });
const load = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : { id: ID, steps: {} });
const store = s => fs.writeFileSync(STATE, JSON.stringify(s, null, 2));
const W = { short: [1080, 1920], lesson: [1920, 1080] }, WPS = 2.6;
const COMPETITORS = /\b(duolingo|babbel|busuu|memrise|rosetta\s*stone|cambly|preply|italki|elsa\s*speak|quizlet|cake\s*app|lingoda|mondly|praktika)\b/i;
const CAST = ['mia', 'leo', 'ama', 'kit', 'diane', 'carlos'];

async function studio(body) {
  if (!SECRET) die('thiếu env STUDIO_CALLBACK_SECRET');
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Secret': SECRET }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`studio ${body.op} → ${r.status} ${String(j.error || '')}`);
  return j;
}
const has = bin => { try { execFileSync(bin, ['-version'], { stdio: 'ignore' }); return true; } catch (e) { return false; } };
const ff = a => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: ['ignore', 'inherit', 'inherit'] });

// ---------- Các bước ----------
const STEPS = {
  // 1) Lấy job (kịch bản đã duyệt) từ Studio – hoặc --script file.json khi chạy thử trên máy
  async fetch(s) {
    const f = opt('script');
    const job = f ? { id: ID, format: 'short', topic: 'local', ...JSON.parse(fs.readFileSync(f, 'utf8')) } : (await studio({ op: 'ciJob', id: ID })).job;
    if (f && !job.script) job.script = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!job.script || !Array.isArray(job.script.lines) || !job.script.lines.length) throw new Error('job chưa có kịch bản');
    s.job = job;
    s.plan = ['fetch', 'tts (TODO: Kokoro)', 'align (tạm: chia đều; TODO: whisper)', 'lipsync (TODO: Rhubarb)', 'karaoke ASS', 'compose (tạm: nền + phụ đề)', 'qa', 'report'];
  },
  // 2) TODO giọng đọc Kokoro (dùng lại cách cài của audio.yml: kokoro-js@1, giọng theo content/video/assets.json characters[who].voice)
  //    Vào: s.job.script.lines[i] { who, text } → Ra: out/video/<id>/line-NN.wav (24 kHz mono, ffmpeg loudnorm I=-16:TP=-1.5:LRA=11)
  //    và s.lines[i] = { wav: 'line-NN.wav', dur: giây đo bằng ffprobe }. Chưa có → dur ước lượng (từ / 2.6 + 0.3 s), không có wav.
  async tts(s) {
    s.lines = s.job.script.lines.map(l => ({ who: l.who, text: l.text, dur: +(String(l.text).trim().split(/\s+/).length / WPS + 0.3).toFixed(2), wav: null }));
    s.todo = [...new Set([...(s.todo || []), 'tts'])];
  },
  // 3) Mốc từng từ. TODO: whisper.cpp / stable-ts (CPU) forced alignment trên line-NN.wav
  //    Ra: out/video/<id>/words.json = [{ line, w, start, end }] (giây, tính từ đầu video). Tạm: chia đều thời lượng mỗi dòng cho các từ.
  async align(s) {
    let t = 0.2; const words = [];
    s.lines.forEach((l, i) => { const ws = String(l.text).trim().split(/\s+/), d = (l.dur - 0.3) / ws.length; l.start = +t.toFixed(2); ws.forEach(w => { words.push({ line: i, w, start: +t.toFixed(2), end: +(t + d).toFixed(2) }); t += d; }); l.end = +t.toFixed(2); t += 0.3; });
    s.duration = +(t + 0.5).toFixed(2); s.words = 'words.json';
    fs.writeFileSync(path.join(DIR, 'words.json'), JSON.stringify(words));
    if (!s.lines.some(l => l.wav)) s.todo = [...new Set([...(s.todo || []), 'align'])];
  },
  // 4) TODO khẩu hình: rhubarb -f json -r phonetic --dialogFile line-NN.txt line-NN.wav
  //    Ra: out/video/<id>/visemes.json = [{ line, start, end, v: 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'X' }] (9 khẩu hình chuẩn Rhubarb). Cần wav từ bước tts.
  async lipsync(s) { s.visemes = null; s.todo = [...new Set([...(s.todo || []), 'lipsync'])]; },
  // 5) Phụ đề karaoke ASS (\k theo words.json): chữ sáng dần từng từ, từ khóa tô cam; nằm 1/3 dưới (vùng an toàn)
  async karaoke(s) {
    const [w, h] = W[s.job.format] || W.short, words = JSON.parse(fs.readFileSync(path.join(DIR, 'words.json'), 'utf8'));
    const kw = new Set((s.job.script.keywords || []).flatMap(k => String(k).toLowerCase().split(/\s+/)));
    const ts = x => { const cs = Math.round(x * 100), hh = Math.floor(cs / 360000), mm = Math.floor(cs / 6000) % 60, ss = Math.floor(cs / 100) % 60; return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`; };
    const escA = t => String(t).replace(/[{}\\]/g, '');
    // Màu ASS dạng &HAABBGGRR: chữ đã đọc = trắng, chưa đọc = vàng kem nhạt; từ khóa = cam thương hiệu #E5502F; viền teal đậm #0F3D3E
    const fs1 = Math.round(h * 0.036), mv = Math.round(h * (s.job.format === 'lesson' ? 0.08 : 0.2));
    const head = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${w}\nPlayResY: ${h}\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: K,DejaVu Sans,${fs1},&H00FFFFFF,&H00C8E8FF,&H003E3D0F,&H80000000,1,0,0,0,100,100,0,0,1,6,0,2,80,80,${mv},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
    const ev = s.lines.map((l, i) => { const lw = words.filter(x => x.line === i); return `Dialogue: 0,${ts(l.start)},${ts(l.end + 0.25)},K,${l.who},0,0,0,,` + lw.map(x => `{\\k${Math.max(1, Math.round((x.end - x.start) * 100))}}${kw.has(x.w.toLowerCase().replace(/[^a-z']/g, '')) ? `{\\1c&H002F50E5&}${escA(x.w)}{\\1c&H00FFFFFF&}` : escA(x.w)}`).join(' '); });
    fs.writeFileSync(path.join(DIR, 'subs.ass'), head + ev.join('\n') + '\n');
    // Kèm .srt (đăng kèm/nhúng app)
    const srt = x => { const ms = Math.round(x * 1000), p2 = n => String(n).padStart(2, '0'); return `${p2(Math.floor(ms / 3600000))}:${p2(Math.floor(ms / 60000) % 60)}:${p2(Math.floor(ms / 1000) % 60)},${String(ms % 1000).padStart(3, '0')}`; };
    fs.writeFileSync(path.join(DIR, 'subs.srt'), s.lines.map((l, i) => `${i + 1}\n${srt(l.start)} --> ${srt(l.end + 0.25)}\n${l.text}\n`).join('\n'));
    s.subs = 'subs.ass';
  },
  // 6) Ghép (tạm): nền = --bg ảnh phòng nếu có, không thì màu kem thương hiệu; âm thanh = câm (chờ TTS); burn-in phụ đề ASS
  //    TODO dựng thật: Remotion hoặc ffmpeg overlay rig nhân vật (brand/characters/<who>/rig/*) theo expr/gesture + visemes, cắt cảnh 2–4 s.
  async compose(s) {
    if (!has('ffmpeg')) throw new Error('thiếu ffmpeg');
    const [w, h] = W[s.job.format] || W.short, d = String(s.duration), bg = opt('bg') || process.env.STUDIO_BG || '';
    const src = bg && fs.existsSync(bg) ? ['-loop', '1', '-t', d, '-i', bg] : ['-f', 'lavfi', '-i', `color=c=0xFFF7EA:s=${w}x${h}:d=${d}:r=30`];
    const assOk = /^\s*\S+\s+ass\s/m.test(execFileSync('ffmpeg', ['-hide_banner', '-filters'], { encoding: 'utf8' }));
    const vf = [`scale=${w}:${h}:force_original_aspect_ratio=increase`, `crop=${w}:${h}`, 'format=yuv420p', ...(assOk ? [`ass=${path.join(DIR, 'subs.ass')}`] : [])].join(',');
    const out = path.join(DIR, 'video.mp4');
    ff([...src, '-f', 'lavfi', '-t', d, '-i', 'anullsrc=r=48000:cl=stereo', '-vf', vf, '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out]);
    s.video = 'video.mp4'; s.burned = assOk; s.static = true; s.width = w; s.height = h;
    if (!assOk) console.log('⚠️ ffmpeg không có bộ lọc ass (libass) – chưa burn-in phụ đề');
  },
  // 7) Cổng QA (docs/MEDIA-QA-RUBRIC.md C) – chỉ chấm cái đo được; knowledge & share để người duyệt chấm (null)
  async qa(s) {
    const sc = s.job.script, gates = [], g = (k, ok, note) => gates.push({ k, ok, note });
    const v = path.join(DIR, 'video.mp4');
    const dur = fs.existsSync(v) ? +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', v], { encoding: 'utf8' }).trim() : 0;
    const max = s.job.format === 'lesson' ? 480 : 60; g('duration', dur > 0 && dur <= max, `${dur.toFixed(1)} s / ≤ ${max} s`);
    const assText = fs.readFileSync(path.join(DIR, 'subs.ass'), 'utf8').split('\n').filter(l => l.startsWith('Dialogue:')).map(l => l.split(',').slice(9).join(',').replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim());
    const subsMatch = assText.join('|') === s.lines.map(l => String(l.text).replace(/[{}\\]/g, '').replace(/\s+/g, ' ').trim()).join('|');
    g('subs-text', subsMatch, subsMatch ? 'phụ đề khớp kịch bản 100%' : 'phụ đề lệch kịch bản'); g('subs-burned', !!s.burned, s.burned ? 'đã burn-in' : 'chưa burn-in (thiếu libass)');
    const hookSec = s.lines[0].end - s.lines[0].start; g('hook', hookSec <= 2.05, `hook ${hookSec.toFixed(1)} s`);
    const allText = [sc.title, sc.caption, ...sc.lines.map(l => l.text)].join(' ');
    const brandOk = !COMPETITORS.test(allText) && sc.lines.every(l => CAST.includes(l.who)); g('brand', brandOk, brandOk ? 'không nhãn hiệu đối thủ, đúng dàn nhân vật' : 'có nhãn hiệu lạ/nhân vật lạ');
    const ctaOk = sc.lines.some(l => l.beat === 'cta' && /lexkite/i.test(l.text)) && /^https:\/\/lexkite\.com\//.test(sc.link || 'https://lexkite.com/'); g('cta', ctaOk, ctaOk ? 'CTA về lexkite.com' : 'thiếu CTA lexkite');
    const hasAudio = s.lines.some(l => l.wav); g('audio', hasAudio, hasAudio ? 'TODO đo LUFS (ffmpeg ebur128)' : 'chưa có giọng (bước tts TODO)');
    g('lipsync', !!s.visemes, s.visemes ? 'TODO đo lệch visemes vs mốc từ' : 'chưa có khẩu hình (bước lipsync TODO)');
    g('pacing', !s.static, s.static ? 'khung tĩnh (bản tạm, chưa dựng nhân vật)' : 'cắt cảnh 2–4 s');
    s.qa = { scores: { hook: hookSec <= 2.05 ? 15 : 5, knowledge: null, lipsync: s.visemes ? null : 0, audio: hasAudio ? null : 0, subs: subsMatch && s.burned ? 10 : 0, pacing: s.static ? 0 : null, brand: brandOk ? 10 : 0, cta: ctaOk ? 5 : 0, share: null }, gates };
    s.files = { duration: +dur.toFixed(2), size: fs.existsSync(v) ? fs.statSync(v).size : 0, width: s.width, height: s.height, todo: s.todo || [] };
    console.log(gates.map(x => `${x.ok ? '✓' : '✗'} ${x.k}: ${x.note}`).join('\n'));
  },
  // 8) Gọi lại Studio: files (object_id GrabCast từ bước tải kho, link xem trước) + điểm QA. --ok failure → báo lỗi để job quay về script_ok
  async report(s) {
    const ok = (opt('ok') || 'success') === 'success' && !!s.qa;
    const files = { ...(s.files || {}), object_id: process.env.OBJECT_ID || undefined, preview_url: process.env.PREVIEW_URL || undefined, run_url: process.env.RUN_URL || undefined, artifact: s.video ? `video-${ID}` : undefined };
    const r = await studio({ op: 'ciResult', id: ID, ok, files, qa: s.qa, error: ok ? undefined : (s.error || 'bước dựng thất bại – xem log Actions') });
    console.log(`✓ đã báo Studio: ${r.job ? r.job.status : '?'}${r.auto ? ' · tự đăng: ' + r.auto : ''}`);
  },
};
const ORDER = ['fetch', 'tts', 'align', 'lipsync', 'karaoke', 'compose', 'qa'];
const run = STEP === 'all' ? ORDER : [STEP];
if (!run.every(x => STEPS[x])) die('bước không hợp lệ: ' + STEP);
const s = load();
for (const k of run) {
  try { await STEPS[k](s); s.steps[k] = 'ok'; store(s); console.log(`✓ ${k}`); }
  catch (e) { s.steps[k] = 'fail'; s.error = `${k}: ${String(e.message || e).slice(0, 200)}`; store(s); die(s.error); }
}
if (process.env.GITHUB_OUTPUT && s.video) fs.appendFileSync(process.env.GITHUB_OUTPUT, `video=${path.join(DIR, s.video)}\n`);
