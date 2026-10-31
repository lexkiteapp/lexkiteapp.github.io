// Chuẩn độ to giọng nói – MỘT nguồn cho mọi đường ống sinh âm thanh + cổng CI (scripts/audio/loudness.mjs).
// −16 LUFS tích hợp (EBU R128, giọng nói trên điện thoại), đỉnh thật ≤ −1 dBTP, dung sai ±1 LU.
// Cách làm (không dùng loudnorm 1 lượt: clip < 3 s bị chuyển sang chế độ động, lệch ±2 LU và nâng 192 kHz):
//   đo I/TP (ebur128, đệm im lặng để clip rất ngắn vẫn có khối đo) → khuếch đại tuyến tính về đích
//   → nếu đỉnh vượt trần thì giới hạn đỉnh ở 4× lấy mẫu (gần đỉnh thật) → mã hoá → ĐO LẠI tệp cuối; lệch thì chỉnh và làm lại (≤ 4 lượt).
import fs from 'node:fs';
import { execFile } from 'node:child_process';

export const TARGET_LUFS = -16, MAX_TP = -1, TOL_LU = 1;
export const MP3_24K = ['-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '40k'];

const ff = args => new Promise(res => execFile('ffmpeg', ['-hide_banner', '-nostats', '-y', ...args], { encoding: 'utf8', maxBuffer: 64 << 20 }, (e, _o, stderr) => res({ status: e ? (e.code || 1) : 0, stderr })));

export function parseSummary(stderr) {
  const s = stderr.slice(stderr.lastIndexOf('Summary:'));
  const num = re => { const m = s.match(re); return m ? (m[1] === '-inf' ? -Infinity : Number(m[1])) : null; };
  return { I: num(/I:\s*(-inf|-?[\d.]+)\s*LUFS/), TP: num(/Peak:\s*(-inf|-?[\d.]+)\s*dBFS/), LRA: num(/LRA:\s*(-?[\d.]+)\s*LU\b/) };
}

export const MEASURE_AF = 'apad=whole_dur=0.5,ebur128=peak=true';

export async function measureFile(f) {
  const r = await ff(['-i', f, '-af', MEASURE_AF, '-f', 'null', '-']);
  if (!/Summary:/.test(r.stderr || '')) throw new Error(`ebur128 lỗi ${f}: ${(r.stderr || '').slice(-200)}`);
  return parseSummary(r.stderr);
}

export const inSpec = m => Number.isFinite(m.I) && Math.abs(m.I - TARGET_LUFS) <= TOL_LU && (m.TP == null || m.TP <= MAX_TP + 0.05);

// Chuẩn hoá src → dst (định dạng theo enc, mặc định mp3 24 kHz 40 kbps như CDN). Trả số đo tệp cuối; ném lỗi nếu 4 lượt vẫn lệch.
export async function normalizeFile(src, dst, enc = MP3_24K) {
  const m0 = await measureFile(src);
  if (!Number.isFinite(m0.I)) throw new Error(`clip lặng ${src}`);
  const tmp = dst + '.norm.tmp' + (dst.match(/\.\w+$/) || [''])[0];
  let gain = TARGET_LUFS - m0.I, ceil = MAX_TP - 0.5, last = null;
  for (let k = 0; k < 4; k++) {
    const needLim = m0.TP == null || m0.TP + gain > ceil;
    const lim = Math.pow(10, ceil / 20).toFixed(4);
    const af = [`volume=${gain.toFixed(2)}dB`, ...(needLim ? ['aresample=96000', `alimiter=limit=${lim}:attack=1:release=40:level=false`, 'aresample=24000'] : [])].join(',');
    const r = await ff(['-i', src, '-af', af, ...enc, tmp]);
    if (r.status !== 0) throw new Error(`ffmpeg lỗi ${src}: ${(r.stderr || '').slice(-200)}`);
    last = await measureFile(tmp);
    if (inSpec(last) && Math.abs(last.I - TARGET_LUFS) <= TOL_LU / 2) break;
    if (last.TP > MAX_TP) ceil -= (last.TP - MAX_TP) + 0.3; // mp3 vượt đỉnh sau mã hoá → hạ trần
    gain += TARGET_LUFS - last.I; // giới hạn đỉnh làm nhỏ đi → bù lại
  }
  if (!inSpec(last)) { fs.rmSync(tmp, { force: true }); throw new Error(`không đạt chuẩn sau 4 lượt ${src}: I=${last.I} TP=${last.TP}`); }
  fs.renameSync(tmp, dst);
  return last;
}
