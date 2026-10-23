// Lưu file footage lên Kho Drive: 2 bản sao / 2 Drive khác nhau, chống trùng theo sha256, tiếp tục được, có nhịp nghỉ.
// Dùng: node scripts/footage/archive.mjs [--root brand/library/cine] [--manifest <root>/archive-manifest.json] [--limit N] [--pause-ms 600] [--dry-run]
// env: LEXKITE_DRIVE_CLI_KEY (không bao giờ in). Ghi manifest sau mỗi 20 file → dừng giữa chừng chạy lại sẽ tiếp tục.
import fs from 'fs';
import path from 'path';
import { driveApi, driveWhere, putSession } from '../video/library.mjs';
import { DEFAULT_ROOT, MANIFEST_NAME, WANT, walk, isArchivable, sha256File, folderOf, mimeOf, loadManifest, saveManifest, distinctDrives, sleep, arg } from './lib.mjs';

const args = process.argv.slice(2), DRY = args.includes('--dry-run');
const ROOT = path.resolve(arg(args, 'root', DEFAULT_ROOT)), MAN = path.resolve(arg(args, 'manifest', path.join(ROOT, MANIFEST_NAME)));
const LIMIT = +arg(args, 'limit', 1e9), PAUSE = +arg(args, 'pause-ms', 600);
const m = loadManifest(MAN), files = walk(ROOT).filter(f => isArchivable(f.rel, f.size));
const bySha = new Map(Object.values(m.files).filter(e => distinctDrives(e) >= WANT).map(e => [e.sha256, e]));
const need = files.filter(f => { const e = m.files[f.rel]; return !(e && e.size === f.size && !args.includes('--rehash') && distinctDrives(e) >= WANT); }); // đã trong manifest cùng dung lượng → tin (dùng --rehash để băm lại tất cả)
const bytes = need.reduce((s, f) => s + f.size, 0);
console.log(`footage: ${files.length} file lưu Kho Drive (${(files.reduce((s, f) => s + f.size, 0) / 1e9).toFixed(2)} GB) · cần kiểm/tải ${need.length} (${(bytes / 1e9).toFixed(2)} GB) · manifest có ${Object.keys(m.files).length}`);
let pool; try { pool = await driveApi('list', {}); } catch (e) { if (/quota-guard|d1-budget/.test(String(e.code))) { console.log('⏸ cầu dao D1 đang chặn việc nền (429) – dừng, chạy tiếp ngày mai'); process.exit(0); } throw e; }
const okDrives = (pool.drives || []).filter(d => d.status === 'ok' && d.weight > 0 && !d.auto_paused);
console.log(`Kho Drive: ${okDrives.length} Drive nhận file · trống ${(pool.free / 1e9).toFixed(1)} GB (cần tối đa ${(bytes * WANT / 1e9).toFixed(1)} GB cho ${WANT} bản)`);
if (okDrives.length < WANT) { console.error(`✗ cần ≥ ${WANT} Drive nhận file, hiện ${okDrives.length}`); process.exit(2); }
if (!DRY && pool.free < bytes * WANT * 1.02) console.error('⚠ chỗ trống pool có thể không đủ 2 bản cho mọi file – chạy tiếp tới khi máy chủ trả pool_full');
if (DRY) process.exit(0);

let up = 0, same = 0, fail = 0, short = 0, n = 0, dirty = 0;
const flush = () => { saveManifest(MAN, m); dirty = 0; };
// Lô ≤ 50 file / lượt gọi API (upload_sessions → PUT thẳng lên Google song song → complete_batch). Máy chủ tự cắt lô theo giới hạn truy vấn/yêu cầu của gói miễn phí và trả processed.
let stop = false;
const todo = need.slice(0, LIMIT), CONC = Math.max(1, +arg(args, 'conc', 3)), BATCH = Math.min(50, +arg(args, 'batch', 50));
const QUOTA = /quota-guard|d1-budget/, FATAL = /no-key|403|forbidden|pool_full|507|quota-guard|d1-budget/;
const halt = (e) => { stop = true; process.exitCode = QUOTA.test(String(e.code || e.message)) ? 0 : 1; console.error(QUOTA.test(String(e.code || e.message)) ? '⏸ cầu dao D1 (429): dừng, chạy tiếp ngày mai (không thử lại)' : '✗ dừng: ' + (e.code || e.message)); };
const run = process.env.GITHUB_RUN_ID || undefined;
const par = async (list, fn) => { let i = 0; await Promise.all(Array.from({ length: CONC }, async () => { while (i < list.length) await fn(list[i++]); })); };
async function chunk(files) {
  const items = [], seen = new Map(), dups = [];
  for (const f of files) { // băm + tách file đã có / trùng nội dung trong lô
    const h = sha256File(f.abs), prev = bySha.get(h);
    if (prev) { m.files[f.rel] = { sha256: prev.sha256, size: prev.size, copies: prev.copies, at: prev.at }; same++; dirty++; continue; }
    if (seen.has(h)) { dups.push({ f, h }); continue; }
    seen.set(h, f); items.push({ f, h, it: { name: path.posix.basename(f.rel), mime: mimeOf(f.rel), size: f.size, sha256: h, folder: folderOf(f.rel), cls: 'original', replicas: WANT, asset_id: 'footage:' + f.rel.slice(0, 180) } });
  }
  const done = [];
  for (let pend = items.slice(); pend.length && !stop;) {
    let res; try { res = await driveApi('upload_sessions', { items: pend.map(x => x.it), run }); } catch (e) { fail += pend.length; halt(e); return; }
    const got = pend.splice(0, Math.max(1, res.processed || 0)), ups = [];
    got.forEach((x, i) => { const r = (res.items || [])[i] || {}; if (r.error || (r.status && r.status >= 400)) { fail++; console.error(`✗ ${x.f.rel}: ${r.error || r.status}`); if (FATAL.test(String(r.error || r.status))) halt({ code: r.error || r.status }); } else if (r.done) done.push(x); else for (const ss of r.sessions || [{ drive_id: r.drive_id, upload_url: r.upload_url }]) ups.push({ x, ss, chunk: r.chunk || 8 << 20 }); });
    const completed = [];
    await par(ups, async u => { try { const buf = fs.readFileSync(u.x.f.abs), fid = await putSession(fetch, u.ss.upload_url, buf, u.x.it.mime, u.chunk); completed.push({ drive_id: u.ss.drive_id, file_id: fid, sha256: u.x.h, x: u.x }); } catch (e) { fail++; console.error(`✗ ${u.x.f.rel}: ${e.message}`); } });
    for (let i = 0; i < completed.length && !stop;) {
      let r; try { r = await driveApi('complete_batch', { items: completed.slice(i, i + 50).map(c => ({ drive_id: c.drive_id, file_id: c.file_id, sha256: c.sha256 })) }); } catch (e) { fail += completed.length - i; halt(e); break; }
      const k = Math.max(1, r.processed || 0); (r.items || []).forEach((q, j) => { if (q.error || (q.status && q.status >= 400)) { fail++; console.error(`✗ ${completed[i + j].x.f.rel}: complete ${q.error || q.status}`); } }); i += k;
    }
    for (const x of new Set([...done, ...got.filter(x => ups.some(u => u.x === x))])) { // vị trí mọi bản sao: tra theo sha (có chỉ mục)
      if (stop) break;
      try {
        const copies = (await driveWhere(x.h)).map(c => ({ driveId: c.driveId, email: c.email_masked || '', fileId: c.fileId }));
        const e = { sha256: x.h, size: x.f.size, copies, at: new Date().toISOString().slice(0, 10) };
        m.files[x.f.rel] = e; if (distinctDrives(e) >= WANT) bySha.set(x.h, e); else { short++; console.error(`⚠ ${x.f.rel}: chỉ ${distinctDrives(e)}/${WANT} Drive`); }
        up++; dirty++;
      } catch (e) { fail++; if (FATAL.test(String(e.code || e.message))) halt(e); }
    }
    done.length = 0; await sleep(PAUSE);
  }
  for (const d of dups) { const prev = bySha.get(d.h); if (prev) { m.files[d.f.rel] = { sha256: prev.sha256, size: prev.size, copies: prev.copies, at: prev.at }; same++; dirty++; } else { fail++; console.error(`✗ ${d.f.rel}: bản trùng nhưng bản gốc chưa đủ`); } }
}
for (let i = 0; i < todo.length && !stop; i += BATCH) { await chunk(todo.slice(i, i + BATCH)); n = Math.min(todo.length, i + BATCH); flush(); console.log(`… ${n}/${todo.length} (↑${up} =${same} ✗${fail})`); }
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
