// URL CDN prod (media.lexkite.com / audio.lexkite.com) → các URL gốc GitHub tương ứng, đúng thứ tự dò của workers/media + workers/audio.
// Dùng trên CI để KHÔNG chạm Worker prod (trần 100k/ngày – sự cố 01/11, docs/CAPACITY.md): scripts/test/lib/no-prod.mjs.
// Bản Python cùng luật: scripts/media/origin.py. Kho lấy từ infra/media-repos.json (kho mới nhất trước).
import { loadRepos, servingRepos } from '../lib/media-repos.mjs';

const GH = 'https://lexkiteapp.github.io', RAW = 'https://raw.githubusercontent.com/lexkiteapp';
const VIDEO = 'https://github.com/lexkiteapp/lexkiteapp.github.io/releases/download/wv-';
const pagesOf = r => GH + '/' + r.repo.split('/')[1];
const newest = rs => [...rs].sort((a, b) => +b.id.slice(1) - +a.id.slice(1));

/** Trả mảng URL ứng viên (thử lần lượt, lấy bản 200 đầu tiên); [] = không phải URL CDN prod / Worker cũng trả 404. */
export function githubCandidates(u, cfg = loadRepos()) {
  const url = new URL(u), p = url.pathname;
  if (p.includes('..')) return [];
  if (url.hostname === 'audio.lexkite.com') {
    if (!/^\/audio\/[a-z0-9/_-]+\.mp3$/i.test(p)) return [];
    return [...newest(servingRepos(cfg, 'audio')).map(r => pagesOf(r) + p), GH + p]; // + gốc cũ đóng băng
  }
  if (url.hostname !== 'media.lexkite.com') return [];
  let m = p.match(/^\/(?:(m\d+)\/)?vimg\/([0-9a-f]{16}(?:@2x)?\.(?:webp|avif))$/);
  if (m) {
    const img = newest(servingRepos(cfg, 'img')), pick = m[1] ? img.filter(r => r.id === m[1]) : img;
    return pick.flatMap(r => [pagesOf(r) + '/vimg/' + m[2], `${RAW}/${r.repo.split('/')[1]}/main/vimg/${m[2]}`]);
  }
  m = p.match(/^\/video\/([a-z0-9_]{6,80})\/([a-z0-9_-]{1,40}-[0-9a-f]{8}\.(?:mp4|webp|vtt))$/);
  if (m) return [VIDEO + m[1] + '/' + m[2]];
  m = p.match(/^\/[a-z0-9/_.-]+\.(avif|webp|png|jpe?g|svg|mp4|json)$/i);
  if (!m || (/^(mp4|json)$/i.test(m[1]) && !p.startsWith('/library/'))) return [];
  return [GH + '/lexkite-media' + p];
}
export const TYPES = { avif: 'image/avif', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', mp4: 'video/mp4', json: 'application/json', mp3: 'audio/mpeg', vtt: 'text/vtt; charset=utf-8' };
export const typeOf = u => TYPES[new URL(u).pathname.split('.').pop().toLowerCase()] || 'application/octet-stream';
export const PROD_CDN = /^https:\/\/(media|audio)\.lexkite\.com\//;
export const PROD_API = /^https:\/\/(www\.)?lexkite\.(com|pages\.dev)\/api\//;
