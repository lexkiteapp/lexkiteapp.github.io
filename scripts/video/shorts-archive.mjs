// Shorts archive policy on the Drive pool (docs/VIDEO-STORAGE.md) – run daily by .github/workflows/drive-shorts.yml.
//   node scripts/video/shorts-archive.mjs --repo /tmp/shorts [--dry-run] [--max-retire 50] [--rebalance-calls 10]
// 1. Copies: approved / published / YouTube-queued masters (+ covers) → want 2 (set_want) → `repair` copies them to ANOTHER Drive chosen by
//    the pool placement (pickDrive: lowest usage first, ≥ 90 % stops receiving) – never a hard-coded Drive. Everything else stays at 1 copy.
// 2. Retention: masters of clips neither approved nor published nor queued, older than 30 days → `retire` (Google trash, purged by Google
//    after 30 more days). Covers + recipe + manifest are kept; item.drive.video.retired = date → admin shows "rebuild from recipe".
// 3. Rebalance: pool plan (spread > 10 %, e.g. after a new Drive joins) → apply in small batches (≤ 10 files / ≤ 1 GB per call) with a pause
//    between calls; whatever is left continues on the next run (resume = the plan is recomputed from the ledger every call).
// env LEXKITE_DRIVE_CLI_KEY. Writes shorts/index.json (the workflow commits it).
import fs from 'node:fs';
import path from 'node:path';
import { driveApi, driveSign, driveCliKey } from './library.mjs';

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
    if (it.rejected && !it.paused) { /* rejected → same retention as unapproved */ }
    const born = Date.parse(it.created || v.at || '') || now;
    if (now - born >= RETAIN_DAYS * DAY && retire.length < maxRetire) retire.push({ id: it.id, sha: v.sha256 });
  }
  return { promote: [...new Set(promote)], retire };
}

export async function ytLists({ fetcher = fetch, key = driveCliKey(), base = process.env.LEXKITE_API_BASE || 'https://lexkite.com' } = {}) {
  if (!key) return {};
  const text = JSON.stringify({ op: 'ids' });
  try {
    const r = await fetcher(base.replace(/\/+$/, '') + '/api/youtube', { method: 'POST', headers: { 'Content-Type': 'application/json', ...driveSign(key, text) }, body: text });
    return r.ok ? await r.json() : {};
  } catch { return {}; }
}

export async function runArchive({ repo, dry = false, maxRetire = 50, rebalanceCalls = 10, pause = 4000, api = driveApi, yt = ytLists, log = console.log, now = Date.now() }) {
  const IDX = path.join(repo, 'shorts', 'index.json'), idx = JSON.parse(fs.readFileSync(IDX, 'utf8'));
  const ap = (() => { try { return JSON.parse(fs.readFileSync('content/video/web/approved.json', 'utf8')).approved || []; } catch { return []; } })();
  const keep = keepSet(idx.items, { approved: ap, youtube: await yt() });
  const p = planArchive(idx.items, keep, now, { maxRetire });
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
  for (let k = 0; k < rebalanceCalls; k++) {   // background rebalance with resume + rate limit
    const plan = await api('rebalance', {}); rep.remaining = (plan.plan || []).length;
    if (!rep.remaining) break;
    const r = await api('rebalance', { apply: true, max_files: 10 }); rep.rebalanced += (r.done || []).length; rep.remaining = r.remaining || 0;
    if (!(r.done || []).length) break; await sleep(pause);
  }
  if (rep.retired) { idx.updated = new Date(now).toISOString().replace(/\.\d+Z$/, 'Z'); fs.writeFileSync(IDX, JSON.stringify(idx, null, 1)); }
  return rep;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = process.argv.slice(2), opt = n => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : undefined; };
  const rep = await runArchive({ repo: opt('repo') || '/tmp/shorts', dry: a.includes('--dry-run'), maxRetire: +(opt('max-retire') || 50), rebalanceCalls: +(opt('rebalance-calls') || 10) });
  const line = `2 bản: ${rep.promote} file (chép bù ${rep.repaired}) · giữ ${RETAIN_DAYS} ngày: ${rep.retired}/${rep.retire} master vào thùng rác · cân bằng: ${rep.rebalanced} file, còn ${rep.remaining}`;
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Shorts archive policy\n${line}\n`);
}
