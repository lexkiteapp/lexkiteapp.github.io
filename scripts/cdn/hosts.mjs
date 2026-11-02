// media.lexkite.com + audio.lexkite.com phục vụ TĨNH từ R2 (bucket công khai gắn tên miền riêng + Cache Rule) thay cho Worker
// lexkite-media / lexkite-audio – lượt tới R2 không tính vào trần 100k/ngày Workers + Pages Functions (docs/CAPACITY.md §A4).
// Khoá R2 = đường dẫn URL (bỏ "/" đầu) → URL KHÔNG đổi. Luật lọc/kiểu/cache dưới đây chép đúng hành vi workers/media + workers/audio
// (scripts/test/cdn-r2.mjs đối chiếu). Nguồn theo thứ tự ưu tiên: khoá đã có ở nguồn trước thì nguồn sau bỏ qua (= Worker trả bản 200 đầu tiên).
import { loadRepos, servingRepos } from '../lib/media-repos.mjs';

export const ACCOUNT = 'e34e14b7ab35eaf2b3d9d84fcce011f7', ZONE = '286a2bb29e2c39622e44151cbebb2fad';
export const YEAR = 31536000, DAY = 86400;
export const IMMUTABLE = `public, max-age=${YEAR}, immutable`;
export const LIBRARY_CC = `public, max-age=${DAY}, stale-while-revalidate=${7 * DAY}`; // /library/: tên cố định có thể cập nhật (_vN)
export const TYPES = { avif: 'image/avif', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', mp4: 'video/mp4', json: 'application/json', mp3: 'audio/mpeg', vtt: 'text/vtt; charset=utf-8' };

// Thứ tự dò như Worker: kho mới nhất trước (m4 trước m1, m3 trước m2).
const newestFirst = rs => [...rs].sort((a, b) => (+b.id.slice(1)) - (+a.id.slice(1)));

const MEDIA_RE = /^([a-z0-9/_.-]+)\.(avif|webp|png|jpe?g|svg|mp4|json)$/i;
const VIMG_RE = /^vimg\/[0-9a-f]{16}(?:@2x)?\.(?:webp|avif)$/;
/** Tệp trong kho ảnh (lexkite-media) có được media.lexkite.com phục vụ không – y hệt nhánh mặc định workers/media. */
export function mediaPath(p) {
  const m = p.match(MEDIA_RE); if (!m || p.includes('..')) return false;
  const ext = m[2].toLowerCase();
  if ((ext === 'mp4' || ext === 'json') && !p.startsWith('library/')) return false;
  if (p.startsWith('video/') || p.startsWith('vimg/') || /^m\d+\//.test(p)) return false; // các nhánh riêng (dưới)
  return true;
}
export const audioPath = p => /^audio\/[a-z0-9/_-]+\.mp3$/i.test(p) && !p.includes('..');
export const vimgPath = p => VIMG_RE.test(p);
export const videoAsset = (tag, name) => /^wv-[a-z0-9_]{6,80}$/.test(tag) && /^[a-z0-9_-]{1,40}-[0-9a-f]{8}\.(mp4|webp|vtt)$/.test(name);

export const extOf = k => k.slice(k.lastIndexOf('.') + 1).toLowerCase();
export const typeFor = k => TYPES[extOf(k)] || 'application/octet-stream';
export const cacheFor = k => (k.startsWith('library/') ? LIBRARY_CC : IMMUTABLE);

/**
 * Nguồn của từng tên miền. kind 'repo': cây git một kho GitHub (map: đường dẫn trong kho → khoá R2, null = bỏ);
 * kind 'releases': tài sản GitHub Release wv-<bài> → video/<bài>/<tên>.
 */
export function hosts(cfg = loadRepos()) {
  const img = newestFirst(servingRepos(cfg, 'img')), audio = newestFirst(servingRepos(cfg, 'audio'));
  return {
    media: {
      hostname: 'media.lexkite.com', bucket: 'lexkite-media-cdn', worker: 'lexkite-media',
      sources: [
        // /vimg/<h> = bản đầu tiên theo thứ tự kho; /mN/vimg/<h> = trực tiếp kho N (cả hai như Worker)
        ...img.map(r => ({ kind: 'repo', id: r.id, repo: r.repo, map: p => (vimgPath(p) ? p : null) })),
        ...img.map(r => ({ kind: 'repo', id: r.id + '-direct', repo: r.repo, map: p => (vimgPath(p) ? `${r.id}/${p}` : null) })),
        { kind: 'repo', id: 'm1-files', repo: 'lexkiteapp/lexkite-media', map: p => (mediaPath(p) ? p : null) },
        { kind: 'releases', id: 'web-video', repo: 'lexkiteapp/lexkiteapp.github.io', map: (tag, name) => (videoAsset(tag, name) ? `video/${tag.slice(3)}/${name}` : null) },
      ],
    },
    audio: {
      hostname: 'audio.lexkite.com', bucket: 'lexkite-audio-cdn', worker: 'lexkite-audio',
      // gốc cũ lexkiteapp.github.io/audio (đóng băng) vẫn là dự phòng phía app/SW (web/js/ui.js AUDIO_BASES, web/sw.js) – không chép.
      sources: audio.map(r => ({ kind: 'repo', id: r.id, repo: r.repo, map: p => (audioPath(p) ? p : null) })),
    },
  };
}

/** Gộp danh sách {source, path, key, ver} theo ưu tiên: khoá thấy trước thắng. */
export function merge(lists) {
  const out = new Map();
  for (const items of lists) for (const it of items) if (it.key && !out.has(it.key)) out.set(it.key, it);
  return out;
}

/** So với sổ cũ (khoá → ver): cần đẩy = khoá mới hoặc ver đổi. Không bao giờ xoá (tên băm bất biến; như GitHub giữ lịch sử). */
export function diff(merged, manifest = {}) {
  const todo = [];
  for (const [key, it] of merged) if (manifest[key] !== it.ver) todo.push(it);
  return todo;
}
