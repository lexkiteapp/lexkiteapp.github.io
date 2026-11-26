// Ảnh của bộ kênh social (brand/social/channel-kit) nằm ở kho media ngoài (m4, infra/media-repos.json), KHÔNG trong cây repo chính (26/11: size-guard cây > 600 MB).
// Repo chính giữ: README, manifest.json, *.md, download.html, stitch-ref/ và media-index.json (rel → bytes, sha256, w, h, url) – nguồn sự thật để kiểm khi không có ảnh trên đĩa.
// URL = <cdn của kho img>channel-kit/<rel> (pickRepo cùng hàm với scripts/media/push.mjs → luôn khớp nơi đã đẩy).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadRepos, pickRepo } from './media-repos.mjs';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const OUT = path.join(ROOT, 'brand/social/channel-kit'), INDEX = path.join(OUT, 'media-index.json');
export const KIT_PREFIX = 'channel-kit/';
export const IMG_RE = /\.(png|jpe?g)$/i, SKIP_DIRS = new Set(['stitch-ref']);   // stitch-ref: ảnh tham chiếu nhỏ, ở lại cây
export const urlOf = (rel, cfg = loadRepos()) => pickRepo(KIT_PREFIX + rel, 'img', cfg).cdn + KIT_PREFIX + rel;
/** { w, h } của PNG/JPEG từ buffer; null nếu không đọc được. */
export function imgSize(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = 2; i + 9 < buf.length;) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1]; if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { i += 2; continue; }
      const len = buf.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      i += 2 + len;
    }
  }
  return null;
}
export const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
/** Ảnh kit có trên đĩa (đường dẫn tương đối trong channel-kit/, bỏ stitch-ref). */
export function localImages(dir = OUT) {
  const out = [], walk = (d, rel) => { for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) {
    if (e.isDirectory()) { if (!(rel === '' && SKIP_DIRS.has(e.name))) walk(path.join(d, e.name), rel + e.name + '/'); } else if (IMG_RE.test(e.name)) out.push(rel + e.name); } };
  walk(dir, ''); return out.sort();
}
export const readIndex = (file = INDEX) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { files: {} }; } };
/** Chỉ mục mới: ảnh trên đĩa cập nhật; mục cũ của ảnh KHÔNG còn trên đĩa (chỉ ở CDN, vd youtube/i18n/*.jpg dựng tay) giữ nguyên. */
export function buildIndex({ dir = OUT, prev = readIndex(), cfg = loadRepos() } = {}) {
  const files = { ...(prev.files || {}) };
  for (const rel of localImages(dir)) { const buf = fs.readFileSync(path.join(dir, rel)), s = imgSize(buf) || {}; files[rel] = { bytes: buf.length, sha256: sha256(buf), w: s.w || 0, h: s.h || 0, url: urlOf(rel, cfg) }; }
  return { _doc: 'Chỉ mục ảnh kit ở kho media ngoài – SINH bởi scripts/social/channel-kit-media.mjs (đừng sửa tay). Kiểm khi ảnh không có trên đĩa: scripts/social/build-channel-kit.mjs --check.',
    files: Object.fromEntries(Object.keys(files).sort().map(k => [k, files[k]])) };
}
export const writeIndex = (idx, file = INDEX) => fs.writeFileSync(file, JSON.stringify(idx, null, 1) + '\n');
