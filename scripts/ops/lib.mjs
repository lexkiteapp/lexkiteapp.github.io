// Dùng chung cho sao lưu/khôi phục (docs/ROLLBACK.md): sổ JSON, tải lên Kho Drive 2 bản, giữ N bản, cảnh báo Quản trị.
// Không in khoá/token. Mọi gọi D1 đi qua /api/drive (HMAC LEXKITE_DRIVE_CLI_KEY) → cầu dao D1 của máy chủ áp dụng.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { driveApi, driveUpload } from '../video/library.mjs';
import { distinctDrives } from '../footage/lib.mjs';
export { arg, sleep, distinctDrives, sha256File, downloadCopy } from '../footage/lib.mjs';
export const QUOTA = /quota-guard|d1-budget/;
export const loadJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
export function saveJson(f, o) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f + '.tmp', JSON.stringify(o, null, 1) + '\n'); fs.renameSync(f + '.tmp', f); }
export const summary = m => { console.log(m); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, m + '\n'); };
export const isoWeek = (d = new Date()) => { const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())), n = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - n); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return `${t.getUTCFullYear()}-W${String(Math.ceil(((t - y0) / 864e5 + 1) / 7)).padStart(2, '0')}`; };
export const stamp = (d = new Date()) => d.toISOString().slice(0, 10).replace(/-/g, '');
export const sha256Buf = b => crypto.createHash('sha256').update(b).digest('hex');
/** Chỗ trống pool (byte) hoặc null nếu không đọc được. */
export async function poolFree() { try { const p = await driveApi('list', {}); return { free: +p.free, drives: (p.drives || []).filter(d => d.status === 'ok' && d.weight > 0 && !d.auto_paused).length }; } catch (e) { if (QUOTA.test(String(e.code))) throw e; return null; } }
/** Cảnh báo Quản trị → Kho Drive: kind 'backup' | 'deploy'. ok:true → gỡ. Lỗi mạng không làm hỏng việc chính. */
export async function alert(kind, ok, msg) { try { await driveApi('ext_alert', { kind, ok, n: 1, msg: String(msg || '').slice(0, 280) }); } catch (e) { console.error('⚠ ext_alert ' + kind + ': ' + e.message); } }
/** Tải lên Kho Drive: 2 bản trên 2 Drive KHÁC NHAU, folder backups/<loại> | releases/<loại>, cls original. Ném lỗi nếu thiếu bản sao. */
export async function uploadTwoCopies(file, { name, folder, mimeType = 'application/octet-stream', sha, assetId }) {
  const free = await poolFree(), size = fs.statSync(file).size;
  if (free && free.free && free.free < size * 2 * 1.2) throw Object.assign(new Error(`Kho Drive chỉ còn ${(free.free / 1e9).toFixed(1)} GB, cần ≈ ${(size * 2.4 / 1e9).toFixed(1)} GB cho 2 bản`), { code: 'pool-low' });
  if (free && free.drives < 2) throw Object.assign(new Error(`cần ≥ 2 Drive nhận file, hiện ${free.drives}`), { code: 'few-drives' });
  const r = await driveUpload(file, { name, folder, sha, mimeType, replicas: 2, cls: 'original', assetId });
  const copies = (r.copies || []).map(c => ({ driveId: c.driveId, fileId: c.fileId }));
  if (distinctDrives({ copies }) < 2) throw Object.assign(new Error(`${name}: chỉ ${distinctDrives({ copies })}/2 Drive`), { code: 'short-copies' });
  return copies;
}
/** Giữ `keep` mục mới nhất (mảng đã xếp mới → cũ); phần cũ: retire bản Drive (vào thùng rác Drive, không xoá cứng). → mục bị bỏ. Chỉ retire sha không còn được mục giữ lại dùng. */
export async function pruneOld(items, keep, retire = true) {
  const kept = items.slice(0, keep), drop = items.slice(keep), live = new Set(kept.map(x => x.sha256));
  const shas = [...new Set(drop.map(x => x.sha256))].filter(s => s && !live.has(s));
  if (retire && shas.length) for (let i = 0; i < shas.length; i += 20) { try { await driveApi('retire', { sha256: shas.slice(i, i + 20), reason: 'backup retention' }); } catch (e) { console.error('⚠ retire: ' + e.message); } }
  return drop;
}
