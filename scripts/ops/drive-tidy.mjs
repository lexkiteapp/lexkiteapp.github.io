// Tự dọn Kho Drive (docs/ASSET-LIBRARY.md §8.6.5) – chạy bởi .github/workflows/drive-tidy.yml. Máy chủ quyết định mọi thứ (op tidy_run, _drive_state.js); script chỉ lặp theo lô.
// Chỉ chuyển vào thùng rác. Cầu dao D1 (429) → dừng sạch, lượt sau làm tiếp. env: LEXKITE_DRIVE_CLI_KEY.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { driveApi } from '../video/library.mjs';

const MAX_CALLS = 60, PAUSE = 2000;
export async function runTidy({ api = driveApi, sleep = ms => new Promise(r => setTimeout(r, ms)), log = console.log } = {}) {
  const rep = { due: 0, trashed: 0, bytes: 0, stopped: [], remaining: 0 };
  try {
    const { due = [], off } = await api('tidy_run', {});
    if (off) { log('tự dọn đang tắt (Quản trị → Kho video)'); return { ...rep, off: true }; }
    rep.due = due.length;
    for (const id of due) {
      for (let k = 0; k < MAX_CALLS; k++) {
        const r = await api('tidy_run', { drive_id: id });
        rep.trashed += r.trashed || 0; rep.bytes += r.bytes || 0;
        if (r.stopped) { rep.stopped.push(`Drive #${id}: ${r.stopped}`); log(`::warning::tự dọn dừng ở Drive #${id}: ${r.stopped}`); break; }
        rep.remaining = r.remaining || 0;
        if (!r.remaining || !r.trashed) break;
        await sleep(PAUSE);
      }
    }
  } catch (e) { if (!/quota-guard|d1-budget/.test(String(e.code || e.message))) throw e; log('⏸ cầu dao D1 đang chặn việc nền – lượt sau làm tiếp'); rep.paused = true; }
  return rep;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await runTidy(), line = `Tự dọn: ${r.due} Drive tới hạn · ${r.trashed} file vào thùng rác (${(r.bytes / 1e9).toFixed(2)} GB)${r.stopped.length ? ' · dừng: ' + r.stopped.join('; ') : ''}${r.remaining ? ' · còn ' + r.remaining : ''}`;
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Tự dọn Kho Drive\n${line}\n`);
}
