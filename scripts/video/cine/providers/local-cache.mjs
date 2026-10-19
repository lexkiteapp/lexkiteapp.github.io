// Driver "local-cache": cùng giao diện với driver Kling nhưng phục vụ file pilot đã sinh (content/video/cine/fixtures/<tên>.json) –
// chạy thử toàn bộ dây chuyền cine (plan → khung đầu → cổng → video → giọng → Lip Sync → ghép → QA) KHÔNG cần khoá, KHÔNG tốn credit.
// Credit vẫn được TÍNH như thật (ledger ghi simulated:true) để kiểm trần ngân sách. Thiếu file cho 1 lời gọi → CacheMiss (cần driver kling).
import fs from 'node:fs';
import path from 'node:path';
import { ffmpeg, probe } from '../media.mjs';

export class CacheMiss extends Error { constructor(m) { super(m); this.cacheMiss = true; } }

export function localCacheDriver({ fixture, root }) {
  const fx = JSON.parse(fs.readFileSync(fixture, 'utf8')), dir = path.resolve(root, fx.dir);
  const file = f => { const p = path.join(dir, f); if (!fs.existsSync(p)) throw new CacheMiss(`local-cache: thiếu ${path.relative(root, p)} (chép bộ pilot vào ${fx.dir})`); return p; };
  const copy = (src, dst) => { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); return dst; };
  return {
    name: 'local-cache', paid: false, fixture: fx,
    available: () => fs.existsSync(dir),
    /** frameId → lần sinh thứ attempt: 4 ảnh cùng lúc (n); lần 2+ = hết cache. */
    async image({ frameId, attempt = 0, n = 4, outDir }) {
      const list = fx.frames[frameId]; if (!list) throw new CacheMiss(`local-cache: không có khung ${frameId}`);
      if (attempt > 0) throw new CacheMiss(`local-cache: chỉ có 1 lượt sinh cho ${frameId} (sinh lại cần driver kling)`);
      return { files: list.slice(0, n).map((f, i) => copy(file(f), path.join(outDir, `img-${i}${path.extname(f)}`))), sources: list.slice(0, n) };
    },
    /** Video chỉ có cho đúng ảnh khung đầu pilot đã dùng – khác ảnh → CacheMiss + preferFrame (pipeline ghi chú rõ khi đổi). */
    async video({ shotId, imageSource, outDir }) {
      const v = fx.videos[shotId]; if (!v) throw new CacheMiss(`local-cache: không có video cho ${shotId}`);
      if (imageSource && imageSource !== v.frame) throw Object.assign(new CacheMiss(`local-cache: video ${shotId} được sinh từ ${v.frame}, cổng chọn ${imageSource}`), { preferFrame: v.frame });
      return { file: copy(file(v.file), path.join(outDir, 'shot.mp4')), videoId: `local:${shotId}`, raw: v.file };
    },
    /** TTS: rãnh tiếng của clip Lip Sync pilot (giọng Kling TTS, tiếng gốc đã tắt). */
    async tts({ shotId, outDir }) {
      const l = fx.lipsync[shotId]; if (!l) throw new CacheMiss(`local-cache: không có giọng cho ${shotId}`);
      fs.mkdirSync(outDir, { recursive: true }); const dst = path.join(outDir, 'tts.wav');
      ffmpeg(['-i', file(l), '-vn', '-ac', '1', '-ar', '48000', dst]);
      return { file: dst, audioId: `local:${shotId}`, duration: probe(dst).duration };
    },
    /** Mặt: 1 mặt (cận) hoặc theo fixtures.faces (cắt face_image từ khung 0 của clip). */
    async faces({ shotId, videoFile, outDir }) {
      const list = fx.faces[shotId] || [{ faceId: '0', box: null }], p = probe(videoFile), faces = [];
      fs.mkdirSync(outDir, { recursive: true });
      for (const f of list) {
        let img = null;
        if (f.box) { const [x0, y0, x1, y1] = f.box; img = path.join(outDir, `face-${f.faceId}.png`); ffmpeg(['-i', videoFile, '-frames:v', '1', '-vf', `crop=${Math.round((x1 - x0) * p.w)}:${Math.round((y1 - y0) * p.h)}:${Math.round(x0 * p.w)}:${Math.round(y0 * p.h)}`, img]); }
        faces.push({ faceId: f.faceId, start: 0, end: Math.round(p.duration * 1000), image: img });
      }
      return { sessionId: `local:${shotId}`, faces };
    },
    async lipsync({ shotId, outDir }) {
      const l = fx.lipsync[shotId]; if (!l) throw new CacheMiss(`local-cache: không có Lip Sync cho ${shotId}`);
      return { file: copy(file(l), path.join(outDir, 'lipsync.mp4')), raw: l };
    },
  };
}
