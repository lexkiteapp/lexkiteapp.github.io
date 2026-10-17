// Sổ đăng ký nội dung (bằng chứng tác quyền): content/protection/registry.jsonl – CHỈ GHI THÊM, mỗi dòng 1 mục JSON,
// nối chuỗi băm: hash = sha256(prev + JSON chuẩn hóa của mục không có "hash"). Sửa/xóa 1 dòng cũ → verifyChain báo hỏng.
// Cùng lịch sử git (commit do CI ký thời gian) + bản lưu Wayback → chứng minh Lexkite đăng trước.
// API cho script khác (vd. scripts/wayback-snapshot.mjs của Antigravity):
//   import { recordArchive } from './lib/content-registry.mjs';
//   recordArchive({ url: 'https://lexkite.com/vi/blog/x/', archiveUrl: 'https://web.archive.org/web/20261017T010203Z/https://lexkite.com/vi/blog/x/' });
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';

export const REGISTRY = 'content/protection/registry.jsonl';
export const GENESIS = '0'.repeat(64);
export const sha256 = d => crypto.createHash('sha256').update(typeof d === 'string' ? Buffer.from(d, 'utf8') : d).digest('hex');
const canon = v => (Array.isArray(v) ? `[${v.map(canon).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}` : JSON.stringify(v));
export const entryHash = (prev, e) => { const { hash, ...rest } = e; return sha256(prev + canon(rest)); };

export function readRegistry(file = REGISTRY) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(l => l.trim()).map((l, i) => { try { return JSON.parse(l); } catch { throw new Error(`${file}:${i + 1}: dòng không phải JSON`); } });
}
// Kiểm toàn bộ chuỗi: seq liên tục, prev khớp hash mục trước, hash tính lại khớp
export function verifyChain(entries) {
  let prev = GENESIS;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.seq !== i + 1) return { ok: false, at: i + 1, why: `seq ${e.seq} ≠ ${i + 1}` };
    if (e.prev !== prev) return { ok: false, at: i + 1, why: 'prev không khớp hash mục trước' };
    if (entryHash(prev, e) !== e.hash) return { ok: false, at: i + 1, why: 'hash sai (nội dung mục bị sửa)' };
    prev = e.hash;
  }
  return { ok: true, count: entries.length, head: prev };
}
export function appendEntry(data, file = REGISTRY) {
  const all = readRegistry(file), v = verifyChain(all);
  if (!v.ok) throw new Error(`sổ đăng ký hỏng ở mục ${v.at}: ${v.why} – không ghi thêm`);
  const e = { seq: all.length + 1, ...data, at: data.at || new Date().toISOString(), prev: v.head };
  e.at = new Date(e.at).toISOString(); e.hash = entryHash(e.prev, e);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(e) + '\n');
  return e;
}
const hostOk = u => { try { return new URL(u).host === 'lexkite.com'; } catch { return false; } };

// Ghi 1 lần đăng bài: băm HTML phục vụ thật + băm nguồn Markdown. Bỏ qua nếu URL đã có mục cùng sourceSha256 (không ghi trùng).
export function recordPublish({ url, html, source, publishedAt, commit, lang, slug, at }, file = REGISTRY) {
  if (!hostOk(url)) throw new Error(`URL ngoài lexkite.com: ${url}`);
  if (!html) throw new Error(`thiếu HTML của ${url}`);
  const sourceSha256 = source != null ? sha256(source) : undefined;
  const dup = readRegistry(file).find(e => e.type === 'publish' && e.url === url && e.sourceSha256 && e.sourceSha256 === sourceSha256);
  if (dup) return { skipped: true, entry: dup };
  return { skipped: false, entry: appendEntry({ type: 'publish', at, url, lang, slug, publishedAt, htmlSha256: sha256(html), htmlBytes: Buffer.byteLength(html), sourceSha256, commit }, file) };
}
// Ghi URL bản lưu Wayback Machine (hoặc archive.today) cho 1 trang – gọi từ script snapshot sau khi lưu thành công
export function recordArchive({ url, archiveUrl, at, service }, file = REGISTRY) {
  if (!hostOk(url)) throw new Error(`URL ngoài lexkite.com: ${url}`);
  if (!/^https:\/\/(web\.archive\.org\/web\/\d{4,14}|archive\.(ph|today|is)\/)/.test(archiveUrl || '')) throw new Error(`archiveUrl không hợp lệ: ${archiveUrl}`);
  const dup = readRegistry(file).find(e => e.type === 'archive' && e.archiveUrl === archiveUrl);
  if (dup) return dup;
  return appendEntry({ type: 'archive', at, url, archiveUrl, service: service || (archiveUrl.includes('web.archive.org') ? 'wayback' : 'archive.today') }, file);
}
// Ảnh chụp kho nội dung học (đề, lời giải, từ vựng…): gốc băm của danh sách "mode blob path" từ git ls-files -s
export function datasetRoot(lsFilesOutput) {
  const lines = lsFilesOutput.split('\n').map(l => l.trim()).filter(Boolean).sort();
  return { root: sha256(lines.join('\n')), files: lines.length };
}
export function recordDataset({ name, root, files, commit, at }, file = REGISTRY) {
  const last = readRegistry(file).filter(e => e.type === 'dataset' && e.name === name).at(-1);
  if (last && last.root === root) return { skipped: true, entry: last };
  return { skipped: false, entry: appendEntry({ type: 'dataset', at, name, root, files, commit }, file) };
}
