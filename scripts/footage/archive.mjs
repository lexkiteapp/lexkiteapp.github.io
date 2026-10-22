// Lưu file footage lên Kho Drive: 2 bản sao / 2 Drive khác nhau, chống trùng theo sha256, tiếp tục được, có nhịp nghỉ.
// Dùng: node scripts/footage/archive.mjs [--root brand/library/cine] [--manifest <root>/archive-manifest.json] [--limit N] [--pause-ms 600] [--dry-run]
// env: LEXKITE_DRIVE_CLI_KEY (không bao giờ in). Ghi manifest sau mỗi 20 file → dừng giữa chừng chạy lại sẽ tiếp tục.
import fs from 'fs';
import path from 'path';
import { driveApi, driveUpload } from '../video/library.mjs';
import { DEFAULT_ROOT, MANIFEST_NAME, WANT, walk, isArchivable, sha256File, folderOf, mimeOf, loadManifest, saveManifest, distinctDrives, sleep, arg } from './lib.mjs';

const args = process.argv.slice(2), DRY = args.includes('--dry-run');
const ROOT = path.resolve(arg(args, 'root', DEFAULT_ROOT)), MAN = path.resolve(arg(args, 'manifest', path.join(ROOT, MANIFEST_NAME)));
const LIMIT = +arg(args, 'limit', 1e9), PAUSE = +arg(args, 'pause-ms', 600);
const m = loadManifest(MAN), files = walk(ROOT).filter(f => isArchivable(f.rel, f.size));
const bySha = new Map(Object.values(m.files).filter(e => distinctDrives(e) >= WANT).map(e => [e.sha256, e]));
const need = files.filter(f => { const e = m.files[f.rel]; return !(e && e.size === f.size && !args.includes('--rehash') && distinctDrives(e) >= WANT); }); // đã trong manifest cùng dung lượng → tin (dùng --rehash để băm lại tất cả)
const bytes = need.reduce((s, f) => s + f.size, 0);
console.log(`footage: ${files.length} file lưu Kho Drive (${(files.reduce((s, f) => s + f.size, 0) / 1e9).toFixed(2)} GB) · cần kiểm/tải ${need.length} (${(bytes / 1e9).toFixed(2)} GB) · manifest có ${Object.keys(m.files).length}`);
const pool = await driveApi('list', {});
const okDrives = (pool.drives || []).filter(d => d.status === 'ok' && d.weight > 0 && !d.auto_paused);
console.log(`Kho Drive: ${okDrives.length} Drive nhận file · trống ${(pool.free / 1e9).toFixed(1)} GB (cần tối đa ${(bytes * WANT / 1e9).toFixed(1)} GB cho ${WANT} bản)`);
if (okDrives.length < WANT) { console.error(`✗ cần ≥ ${WANT} Drive nhận file, hiện ${okDrives.length}`); process.exit(2); }
if (!DRY && pool.free < bytes * WANT * 1.02) console.error('⚠ chỗ trống pool có thể không đủ 2 bản cho mọi file – chạy tiếp tới khi máy chủ trả pool_full');
if (DRY) process.exit(0);

let up = 0, same = 0, fail = 0, short = 0, n = 0, dirty = 0;
const flush = () => { saveManifest(MAN, m); dirty = 0; };
let stop = false, next = 0;
const todo = need.slice(0, LIMIT), CONC = Math.max(1, +arg(args, 'conc', 3)); // vài luồng song song: mỗi file ≈ 10 s (2 phiên Google), giới hạn 120 lượt/phút/IP vẫn dư
const inflight = new Map(); // sha đang tải → file trùng nội dung chờ, không tải lần 2
const one = async f => {
  n++;
  try {
    const h = sha256File(f.abs);
    while (inflight.has(h)) await inflight.get(h);
    const prev = bySha.get(h);
    let done; inflight.set(h, new Promise(r => (done = r)));
    try {
    if (prev) { m.files[f.rel] = { sha256: prev.sha256, size: prev.size, copies: prev.copies, at: prev.at }; same++; dirty++; }
    else {
      const r = await driveUpload(f.abs, { name: path.posix.basename(f.rel), folder: folderOf(f.rel), sha: h, mimeType: mimeOf(f.rel), cls: 'original', replicas: WANT, assetId: 'footage:' + f.rel.slice(0, 180) });
      const copies = (r.copies.length ? r.copies : [{ driveId: r.driveId, email_masked: '', fileId: r.fileId }]).map(c => ({ driveId: c.driveId, email: c.email_masked || '', fileId: c.fileId }));
      const e = { sha256: h, size: f.size, copies, at: new Date().toISOString().slice(0, 10) };
      m.files[f.rel] = e; if (distinctDrives(e) >= WANT) bySha.set(h, e); else { short++; console.error(`⚠ ${f.rel}: chỉ ${distinctDrives(e)}/${WANT} Drive`); }
      up++; dirty++; await sleep(PAUSE);
    }
    } finally { inflight.delete(h); done(); }
    if (dirty >= 20) { flush(); console.log(`… ${n}/${todo.length} (↑${up} =${same} ✗${fail})`); }
  } catch (e) {
    fail++; console.error(`✗ ${f.rel}: ${e.message}`);
    if (/no-key|403|forbidden|pool_full|507/.test(String(e.code || e.message))) { stop = true; console.error('✗ dừng: ' + (e.code || e.message)); process.exitCode = 1; }
    else await sleep(PAUSE * 4);
  }
};
await Promise.all(Array.from({ length: CONC }, async () => { while (!stop && next < todo.length) await one(todo[next++]); }));
flush();
// Tham chiếu cho cleanup_scan: sha nào được footage dùng → không bị gắn "mồ côi" (nguồn 'footage', thay cả bộ mỗi lần).
try {
  const shas = [...new Set(Object.values(m.files).map(e => e.sha256))].slice(0, 5000);
  await driveApi('refs_sync', { source: 'footage', items: shas.map(s => ({ s, st: 'approved' })) });
} catch (e) { console.error('⚠ refs_sync footage: ' + e.message); }
const all = Object.values(m.files), ok2 = all.filter(e => distinctDrives(e) >= WANT).length;
const msg = `Footage → Kho Drive: ${up} tải mới · ${same} trùng sha · ${fail} lỗi · ${short} thiếu bản sao · manifest ${all.length} file (${(all.reduce((s, e) => s + e.size, 0) / 1e9).toFixed(2)} GB), ${ok2} đủ ${WANT} bản/${WANT} Drive`;
console.log(msg);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ${msg}\n`);
process.exit(fail || short || ok2 < Object.keys(m.files).length ? 1 : 0);
