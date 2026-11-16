// Cổng ASR (qc_v9 asr_match, tl_gate, word-audio, qc_gate) phải ra CÙNG kết quả cho cùng một wav trên mọi runner.
// 02/11: wav y hệt byte, whisper nghe "growing, is" ở runner này và "growing is" ở runner khác → render (ready, short) đỏ/xanh ngẫu nhiên (#293, #430).
// Luật: mọi file Python dùng faster-whisper nạp mô hình qua scripts/cine/whisper_det.py (ghim backend CPU + luồng + seed) và giải mã ở nhiệt độ 0.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const R = fileURLToPath(new URL('../../', import.meta.url));
let fail = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} whisper-det: ${m}`); if (!c) fail++; };
const det = fs.readFileSync(path.join(R, 'scripts/cine/whisper_det.py'), 'utf8');
for (const k of ['CT2_USE_MKL', 'CT2_FORCE_CPU_ISA', 'MKL_CBWR']) ok(det.includes(`'${k}'`), `whisper_det.py ghim ${k}`);
ok(/set_random_seed\(0\)/.test(det) && /cpu_threads=THREADS/.test(det) && /DECODE = dict\(temperature=0\.0\)/.test(det), 'whisper_det.py: seed 0, số luồng cố định, DECODE nhiệt độ 0');
ok(det.indexOf('os.environ.setdefault') < det.indexOf('from faster_whisper'), 'biến môi trường đặt TRƯỚC khi nạp CTranslate2');
ok(/def snap_onsets\(/.test(det), 'whisper_det.py: snap_onsets (đầu từ sau quãng nghỉ → khung có tiếng đầu tiên) ở một nguồn');
for (const f of ['scripts/cine/news_voice.py', 'scripts/video/align.py']) ok(/snap_onsets\(/.test(fs.readFileSync(path.join(R, f), 'utf8')) && !/def snap_onsets/.test(fs.readFileSync(path.join(R, f), 'utf8')), `${f}: dùng snap_onsets chung (asr_match so mốc tiếng thật, không so mốc im lặng của whisper)`);
ok(/test_whisper_det\.py/.test(fs.readFileSync(path.join(R, '.github/workflows/video-motion.yml'), 'utf8')), 'video-motion chạy test đơn vị snap_onsets (scripts/cine/test_whisper_det.py)');
const py = execFileSync('git', ['ls-files', '*.py'], { cwd: R, encoding: 'utf8' }).split('\n').filter(Boolean)
  .filter(f => f !== 'scripts/cine/whisper_det.py' && /faster_whisper|WhisperModel|whisper_det/.test(fs.readFileSync(path.join(R, f), 'utf8')));
ok(py.length >= 5, `tìm thấy ${py.length} file dùng whisper`);
for (const f of py) {
  const s = fs.readFileSync(path.join(R, f), 'utf8');
  ok(!/WhisperModel\s*\(/.test(s), `${f}: không tự tạo WhisperModel (dùng whisper_det.load)`);
  const calls = [...s.matchAll(/\.transcribe\(((?:[^()]|\([^()]*\))*)\)/g)].map(m => m[1]);   // whole call, one level of nested parens, may span lines
  ok(calls.every(c => /\*\*DECODE|temperature=0(\.0)?\b/.test(c)), `${f}: ${calls.length} lần transcribe đều ở nhiệt độ 0`);
}
if (fail) { console.error(`✗ whisper-det: ${fail} lỗi`); process.exit(1); }
console.log('✓ whisper-det: mọi lượt whisper tất định');
