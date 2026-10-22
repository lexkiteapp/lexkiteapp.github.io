// Kho footage → Kho Drive: phần dùng chung cho archive / verify / restore (docs/VIDEO.md §Kho footage).
// Luật: bản gốc media (mp4/mkv/png/wav/npz…) ở Kho Drive, folder footage/<cảnh>, cls 'original', 2 bản sao trên 2 Drive KHÁC NHAU;
// git chỉ giữ manifest + file nhỏ không-media. Sổ: brand/library/cine/archive-manifest.json (đường dẫn → sha256, size, copies[]).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { driveApi } from '../video/library.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DEFAULT_ROOT = path.join(ROOT, 'brand/library/cine');
export const MANIFEST_NAME = 'archive-manifest.json';
export const WANT = 2;
const MEDIA = new Set(['.mp4', '.mkv', '.mov', '.webm', '.png', '.jpg', '.jpeg', '.webp', '.wav', '.mp3', '.flac', '.m4a', '.npz', '.zip', '.safetensors', '.pt', '.onnx']);
const SKIP_DIR = /^(\.git|__pycache__|node_modules|render[^/]*)$/;
const SKIP_FILE = /^(\.DS_Store|archive-manifest\.json)$|\.(raw|part|tmp)$/;
const MIME = { '.mp4': 'video/mp4', '.mkv': 'video/x-matroska', '.mov': 'video/quicktime', '.webm': 'video/webm', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.flac': 'audio/flac', '.m4a': 'audio/mp4', '.zip': 'application/zip', '.json': 'application/json' };
export const mimeOf = f => MIME[path.extname(f).toLowerCase()] || 'application/octet-stream';
/** File nào lên Kho Drive: media (mọi cỡ ≥ 32 KB) hoặc bất kỳ file ≥ 1 MB. Còn lại (json/py/txt nhỏ, ảnh icon bé) ở lại git. */
export const isArchivable = (rel, size) => !SKIP_FILE.test(path.basename(rel)) && ((MEDIA.has(path.extname(rel).toLowerCase()) && size >= 32 * 1024) || size >= 1 << 20);
/** Duyệt cây, trả [{rel, abs, size}] (đường dẫn posix, đã sắp xếp). */
export function walk(root) {
  const out = [];
  const rec = (dir, rel) => {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      if (d.isSymbolicLink()) continue;
      if (d.isDirectory()) { if (!SKIP_DIR.test(d.name)) rec(path.join(dir, d.name), rel ? rel + '/' + d.name : d.name); }
      else if (d.isFile() && !SKIP_FILE.test(d.name)) { const abs = path.join(dir, d.name); out.push({ rel: rel ? rel + '/' + d.name : d.name, abs, size: fs.statSync(abs).size }); }
    }
  };
  rec(root, '');
  return out.sort((a, b) => (a.rel < b.rel ? -1 : 1));
}
export function sha256File(f) {
  const h = crypto.createHash('sha256'), fd = fs.openSync(f, 'r'), buf = Buffer.allocUnsafe(8 << 20);
  try { for (let n; (n = fs.readSync(fd, buf, 0, buf.length, null)) > 0;) h.update(buf.subarray(0, n)); } finally { fs.closeSync(fd); }
  return h.digest('hex');
}
/** Thư mục Drive: footage/<mục cấp 1> (≤ 3 đoạn, mỗi đoạn [A-Za-z0-9 _.-]) – file ở gốc → footage/_root. */
export const folderOf = rel => 'footage/' + (rel.includes('/') ? rel.split('/')[0].replace(/[^A-Za-z0-9 _.-]/g, '_').slice(0, 60) : '_root');
export function loadManifest(file) {
  try { const m = JSON.parse(fs.readFileSync(file, 'utf8')); if (m && m.files) return m; } catch { /* mới */ }
  return { version: 1, root: 'brand/library/cine', want: WANT, files: {} };
}
export function saveManifest(file, m) { // ghi nguyên tử + sắp khoá → diff git gọn
  const files = {}; for (const k of Object.keys(m.files).sort()) files[k] = m.files[k];
  m.files = files; m.count = Object.keys(files).length; m.bytes = Object.values(files).reduce((s, e) => s + e.size, 0); m.updated = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify(m, null, 0).replace(/"files":\{/, '"files":{\n').replace(/\},"/g, '},\n"')); fs.renameSync(file + '.tmp', file);
}
/** Số Drive khác nhau trong copies[]. */
export const distinctDrives = e => new Set((e.copies || []).filter(c => c.fileId).map(c => c.driveId)).size;
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const arg = (args, n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const BASE = String(process.env.LEXKITE_API_BASE || 'https://lexkite.com').replace(/\/+$/, '');
/** Tải 1 bản sao (file_id) về file đích qua link ký 5 phút; trả sha256 + size. Lỗi → ném. */
export async function downloadCopy(fileId, dest) {
  const j = await driveApi('render_link', { file_id: fileId });
  const r = await fetch(/^https?:/.test(j.url) ? j.url : BASE + j.url);
  if (!r.ok || !r.body) throw new Error('tải ' + r.status);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const h = crypto.createHash('sha256'); let size = 0; const ws = fs.createWriteStream(dest);
  try {
    for await (const ch of r.body) { h.update(ch); size += ch.length; if (!ws.write(ch)) await new Promise(res => ws.once('drain', res)); }
    await new Promise((res, rej) => ws.end(e => (e ? rej(e) : res())));
  } catch (e) { ws.destroy(); try { fs.unlinkSync(dest); } catch { /* */ } throw e; }
  return { sha256: h.digest('hex'), size };
}
