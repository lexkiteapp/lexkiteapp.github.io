// Shorts archive policy on the Drive pool (docs/VIDEO-STORAGE.md) – run daily by .github/workflows/drive-shorts.yml.
//   node scripts/video/shorts-archive.mjs --repo /tmp/shorts [--dry-run] [--max-retire 50] [--rebalance-calls 10]
// 1. Copies: approved / published / YouTube-queued masters (+ covers) → want 2 (set_want) → `repair` copies them to ANOTHER Drive chosen by
//    the pool placement (pickDrive: lowest usage first, ≥ 90 % stops receiving) – never a hard-coded Drive. Everything else stays at 1 copy.
// 2. Retention: masters of REJECTED clips neither approved nor published nor queued, older than 30 days → `retire` (Google trash, purged by Google
//    after 30 more days). Covers + recipe + manifest are kept; item.drive.video.retired = date → admin shows "rebuild from recipe".
// 3. Rebalance: pool plan (spread > 10 %, e.g. after a new Drive joins) → apply in small batches (≤ 10 files / ≤ 1 GB per call) with a pause
//    between calls; whatever is left continues on the next run (resume = the plan is recomputed from the ledger every call).
// env LEXKITE_DRIVE_CLI_KEY. Writes shorts/index.json (the workflow commits it).
import fs from 'node:fs';
import path from 'node:path';
import { driveApi, driveSign, driveCliKey } from './library.mjs';
import { pathToFileURL } from 'node:url';

export const RETAIN_DAYS = 30;
const DAY = 86400e3;

/** Approved/published ids: web approved.json + YouTube queue (approved, uploaded) + manifest flags. */
export function keepSet(items, { approved = [], youtube = {} } = {}) {
  const s = new Set(approved);
  for (const id of youtube.approved || []) s.add(id);
  for (const id of Object.keys(youtube.uploaded || {})) s.add(id);
  for (const it of items) if (it.youtube_id || it.published) { s.add(it.id); s.add(it.lesson); }
  return s;
}
const isKept = (it, keep) => keep.has(it.id) || keep.has(it.lesson);

/** Pure plan: which shas get 2 copies, which masters retire. */
export function planArchive(items, keep, now = Date.now(), { maxRetire = 50 } = {}) {
  const promote = [], retire = [];
  for (const it of items) {
    const d = it.drive || {}, v = d.video;
    if (!v || !v.sha256 || v.retired) continue;
    if (isKept(it, keep)) { promote.push(v.sha256); if (d.cover && d.cover.sha256) promote.push(d.cover.sha256); continue; }
    if (!it.rejected || it.paused) continue; // chưa duyệt / tạm dừng: còn chờ quyết định, không tự xóa (kho chỉ đầy ~33 %)
    const born = Date.parse(it.created || v.at || '') || now;
    if (now - born >= RETAIN_DAYS * DAY && retire.length < maxRetire) retire.push({ id: it.id, sha: v.sha256 });
  }
  return { promote: [...new Set(promote)], retire };
}

/** Cân bằng chuyển file sang Drive khác và cho bản cũ vào thùng rác → ghi fileId/driveId mới vào index, không thì URL ký vẫn trỏ file cũ. */
export const REBALANCE_MAX_BYTES = 256 * 1024 * 1024;   // 1 file ≤ 256 MB/lượt: chép chéo xong trong < 100 s (giới hạn phản hồi Cloudflare)
/** Lượt cân bằng bị cắt (524) có thể ĐÃ chuyển file: hỏi `where` theo sha, file cũ không còn 'ok' mà có bản 'ok' ở Drive khác → cập nhật index. */
export async function reconcileMove(api, items, x) {
  if (!x || !x.sha) return 0;
  let copies; try { copies = (await api('where', { q: x.sha })).copies || []; } catch { return 0; }
  if (copies.some(c => c.file_id === x.file_id && c.status === 'ok')) return 0;   // chưa chuyển: index vẫn đúng
  const nu = copies.find(c => c.status === 'ok' && c.drive_id === x.to) || copies.find(c => c.status === 'ok' && c.drive_id !== x.from);
  return nu ? applyMoves(items, [{ file_id: x.file_id, new_file_id: nu.file_id, to: nu.drive_id }]) : 0;
}
export function applyMoves(items, done) {
  let n = 0;
  for (const x of done) for (const it of items) for (const k of ['video', 'cover']) {
    const c = it.drive && it.drive[k];
    if (c && c.fileId === x.file_id && x.new_file_id) { c.fileId = x.new_file_id; c.driveId = x.to; n++; }
  }
  return n;
}

export async function ytLists({ fetcher = fetch, key = driveCliKey(), base = process.env.LEXKITE_API_BASE || 'https://lexkite.com', op = 'ids', body = {} } = {}) {
  if (!key) return {};
  const text = JSON.stringify({ op, ...body });
  try {
    const r = await fetcher(base.replace(/\/+$/, '') + '/api/youtube', { method: 'POST', headers: { 'Content-Type': 'application/json', ...driveSign(key, text) }, body: text });
    return r.ok ? await r.json() : { _failed: r.status };
  } catch (e) { return { _failed: e.name || 'fetch' }; } // phân biệt với "danh sách rỗng": không biết clip nào đã duyệt thì không được xóa gì
}

export async function runArchive({ repo, dry = false, maxRetire = 50, rebalanceCalls = 10, pause = 4000, api = driveApi, yt = ytLists, purged = ids => ytLists({ op: 'purged', body: { ids } }), log = console.log, now = Date.now() }) {
  const IDX = path.join(repo, 'shorts', 'index.json'), idx = JSON.parse(fs.readFileSync(IDX, 'utf8'));
  const ap = (() => { try { return JSON.parse(fs.readFileSync('content/video/web/approved.json', 'utf8')).approved || []; } catch { return []; } })();
  const ytl = await yt(), keep = keepSet(idx.items, { approved: ap, youtube: ytl });
  // "Xóa hẳn" in the admin (clip_review.deleted = 2): master + cover → Google trash, recipe (index entry + shorts/<id>/ files) dropped, then reported back.
  const purge = new Set((ytl.purge || []).filter(x => /^[a-z0-9-]{3,120}$/.test(x))), gone = [];
  for (const id of purge) {
    const it = idx.items.find(e => e.id === id), shas = it && it.drive ? [it.drive.video, it.drive.cover].map(x => x && x.sha256).filter(Boolean) : [];
    if (dry) { log(`purge (dry): ${id} · ${shas.length} file`); continue; }
    if (shas.length) await api('retire', { sha256: shas, reason: 'owner hard delete' });
    for (const f of [path.join(repo, 'shorts', id), path.join(repo, 'shorts', 'recipes', id + '.json')]) fs.rmSync(f, { recursive: true, force: true });
    gone.push(id);
  }
  if (gone.length) { idx.items = idx.items.filter(e => !gone.includes(e.id)); fs.writeFileSync(IDX, JSON.stringify(idx, null, 1)); await purged(gone); log(`purge: ${gone.length} clip xoá hẳn (Drive → thùng rác, bỏ công thức)`); }
  const p = planArchive(idx.items, keep, now, { maxRetire });
  if (ytl._failed || !keep.size) { log(`::warning::giữ nguyên ${p.retire.length} master: ${ytl._failed ? 'không đọc được danh sách đã duyệt (' + ytl._failed + ')' : 'danh sách đã duyệt rỗng'}`); p.retire = []; }
  const sleep = ms => (ms ? new Promise(r => setTimeout(r, ms)) : Promise.resolve());
  const rep = { promote: p.promote.length, retire: p.retire.length, repaired: 0, retired: 0, rebalanced: 0, remaining: 0, dry };
  log(`archive: ${keep.size} approved/published · ${p.promote.length} file → 2 bản · ${p.retire.length} master quá ${RETAIN_DAYS} ngày chưa duyệt`);
  if (dry) return rep;
  for (let i = 0; i < p.promote.length; i += 200) await api('set_want', { sha256: p.promote.slice(i, i + 200), want: 2 });
  for (let k = 0; k < 20; k++) {   // repair = server-side copy across Drives (no bytes through CI), ≤ 5 files per call
    const r = await api('repair', { max_files: 5 }); rep.repaired += (r.done || []).length;
    if (!r.remaining || !(r.done || []).length) break; await sleep(pause);
  }
  for (let i = 0; i < p.retire.length; i += 20) {
    const part = p.retire.slice(i, i + 20), r = await api('retire', { sha256: part.map(x => x.sha), reason: `retention ${RETAIN_DAYS}d (not approved/published)` });
    const ok = new Set((r.done || []).map(x => x.sha)), day = new Date(now).toISOString().slice(0, 10);
    for (const x of part) if (ok.has(x.sha)) { const it = idx.items.find(e => e.id === x.id); it.drive.video = { ...it.drive.video, retired: day }; rep.retired++; }
    await sleep(pause);
  }
  let moved = 0;
  // Cân bằng: 1 file/lượt gọi (chép chéo tài khoản đi qua Worker; 10 file/lượt vượt 100 s của Cloudflare → 524, 09/11 drive-shorts đỏ và
  // các file đã chuyển trong lượt đó KHÔNG về được index). 5xx/524 → đối chiếu sự thật bằng `where` theo sha rồi dừng tới mai (không đỏ).
  for (let k = 0; k < rebalanceCalls; k++) {
    const plan = await api('rebalance', {}); rep.remaining = (plan.plan || []).length;
    if (!rep.remaining) break;
    let r;
    try { r = await api('rebalance', { apply: true, max_files: 1, max_bytes: REBALANCE_MAX_BYTES }); }
    catch (e) {
      if (!(e.status >= 500)) throw e;
      const x = plan.plan[0]; moved += await reconcileMove(api, idx.items, x);
      log(`::warning::cân bằng: Worker ${e.status} khi chuyển ${x && x.name} – đã đối chiếu index theo sha, dừng cân bằng tới lượt sau (còn ${rep.remaining})`);
      rep.interrupted = e.status; break;
    }
    rep.rebalanced += (r.done || []).length; rep.remaining = r.remaining || 0;
    moved += applyMoves(idx.items, r.done || []);
    if ((r.failed || []).length) { rep.failed = (rep.failed || 0) + r.failed.length; log(`::warning::cân bằng lỗi ${r.failed.length} file: ${[...new Set(r.failed.map(x => x.error))].join(', ')}`); }
    if (!(r.done || []).length) break; await sleep(pause);
  }
  if (rep.retired || moved) { idx.updated = new Date(now).toISOString().replace(/\.\d+Z$/, 'Z'); fs.writeFileSync(IDX, JSON.stringify(idx, null, 1)); }
  return rep;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), opt = n => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : undefined; };
  const rep = await runArchive({ repo: opt('repo') || '/tmp/shorts', dry: a.includes('--dry-run'), maxRetire: +(opt('max-retire') || 50), rebalanceCalls: +(opt('rebalance-calls') || 10) });
  const line = `2 bản: ${rep.promote} file (chép bù ${rep.repaired}) · giữ ${RETAIN_DAYS} ngày: ${rep.retired}/${rep.retire} master vào thùng rác · cân bằng: ${rep.rebalanced} file, còn ${rep.remaining}`;
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Shorts archive policy\n${line}\n`);
}
