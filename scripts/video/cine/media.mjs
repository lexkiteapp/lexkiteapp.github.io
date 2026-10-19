// Trợ giúp ffmpeg/ffprobe cho chế độ cine – chạy ngắn, 1 tiến trình/lần (máy chủ dự án nóng: không vòng lặp dựng dài).
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

export const sha256 = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
export const ffmpeg = a => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 });
const ffErr = a => spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...a], { encoding: 'utf8', maxBuffer: 64 << 20 }).stderr || '';

export function probe(f) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', f], { encoding: 'utf8' }));
  const v = (j.streams || []).find(s => s.codec_type === 'video') || {}, a = (j.streams || []).find(s => s.codec_type === 'audio');
  return { duration: +(+j.format.duration).toFixed(3), w: v.width || null, h: v.height || null, fps: v.r_frame_rate || null, audio: !!a };
}

/** Đoạn im lặng (silencedetect) → [{start, end|null}] */
export function silences(f, { noise = -35, d = 0.25 } = {}) {
  const out = ffErr(['-i', f, '-af', `silencedetect=n=${noise}dB:d=${d}`, '-f', 'null', '-']);
  const res = []; let cur = null;
  for (const l of out.split('\n')) {
    let m = l.match(/silence_start: ([\d.e+-]+)/); if (m) { cur = { start: Math.max(0, +m[1]), end: null }; res.push(cur); continue; }
    m = l.match(/silence_end: ([\d.e+-]+)/); if (m && cur) { cur.end = +m[1]; cur = null; }
  }
  return res;
}

/** RMS (dBFS) của [t0, t0+dur] – cổng mở đầu. −Infinity nếu im hẳn. */
export function rmsDb(f, t0 = 0, dur = 0.5) {
  const out = ffErr(['-ss', String(t0), '-t', String(dur), '-i', f, '-af', 'astats=metadata=0:reset=0', '-f', 'null', '-']);
  const m = [...out.matchAll(/RMS level dB: (-?[\d.]+|-inf)/g)].pop();
  return m ? (m[1] === '-inf' ? -Infinity : +m[1]) : null;
}

/** Độ to tích hợp (LUFS) – ebur128 trên file cuối. */
export function lufs(f) {
  const out = ffErr(['-i', f, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-']);
  const m = [...out.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop();
  return m ? +m[1] : null;
}

export function extractAudio(src, dst) { ffmpeg(['-i', src, '-vn', '-ac', '1', '-ar', '48000', dst]); return dst; }
export function frameAt(src, t, dst, h = 960) { ffmpeg(['-ss', String(t), '-i', src, '-frames:v', '1', '-vf', `scale=-2:${h}`, dst]); return dst; }
