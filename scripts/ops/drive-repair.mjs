// Chép bù mọi file thiếu bản sao / chỉ còn 1 bản trên Kho Drive (op `repair` = chép phía máy chủ giữa các Drive, KHÔNG qua byte của CI), rồi `health` để cờ
// "N file chỉ còn 1 bản sao" tự tắt. Trước 1/11 chỉ shorts-archive gọi repair (≤ 100 file/ngày, chỉ khi drive-shorts chạy) → file ngoài shorts kẹt 1 bản mãi.
//   node scripts/ops/drive-repair.mjs [--rounds 40] [--files 5]
// File lớn (bản sao lưu ~1 GB): Worker không chép nổi (copy-mismatch 8/8 lần, 2–4/11) → CI tải bản còn tốt, kiểm sha256 rồi tải lên Drive khác.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { driveApi, driveUpload } from '../video/library.mjs';
import { arg, summary, QUOTA, downloadCopy } from './lib.mjs';
export const LARGE = 100 * 1024 * 1024, CI_MAX_FILES = 3, CI_MAX_BYTES = 4 * 1024 ** 3;
/** Trong kế hoạch repair (dry_run, luôn số tươi): file lớn còn Drive nhận, trong giới hạn 1 lượt. */
export function largePlan(plan, { large = LARGE, maxFiles = CI_MAX_FILES, maxBytes = CI_MAX_BYTES } = {}) {
  const out = []; let bytes = 0;
  for (const g of plan || []) { if (+g.size <= large || !g.to || +g.copies >= +g.want || out.length >= maxFiles || bytes + +g.size > maxBytes) continue; out.push(g); bytes += +g.size; }
  return out;
}
/** Chép bù file lớn qua CI. Bản tải về sai sha256 thì không tải lên. → { done, failed } */
export async function ciRepair(deps = {}, opts = {}) {
  const api = deps.api || driveApi, download = deps.download || downloadCopy, upload = deps.upload || driveUpload, dir = deps.dir || fs.mkdtempSync(path.join(os.tmpdir(), 'drive-repair-'));
  let done = 0, failed = 0;
  for (const g of largePlan((await api('repair', { dry_run: true })).plan, opts)) {
    const file = path.join(dir, g.sha);
    try {
      const row = ((await api('where', { q: g.sha, gstate: 'ok' })).copies || []).find(c => c.sha256 === g.sha && c.file_id);
      if (!row) throw new Error('không có bản nguồn');
      const got = await download(row.file_id, file);
      if (got.sha256 !== g.sha || +got.size !== +g.size) throw new Error('bản tải về sai sha256/kích thước');
      await upload(file, { name: g.name, folder: row.folder, sha: g.sha, mimeType: row.mime, replicas: g.want, cls: row.cls, assetId: g.asset || row.asset_id });
      done++; summary(`- CI chép bù ${g.name}`);
    } catch (e) { if (QUOTA.test(String(e.code))) throw e; failed++; console.error(`⚠ ${g.name}: ${e.message}`); }
    finally { fs.rmSync(file, { force: true }); }
  }
  return { done, failed };
}
async function main() {
  const A = process.argv.slice(2), ROUNDS = +arg(A, 'rounds', 40), FILES = +arg(A, 'files', 5);
  let done = 0, failed = 0, left = null;
  try {
    for (let i = 0; i < ROUNDS; i++) {
      const r = await driveApi('repair', { max_files: FILES, max_file: LARGE }); done += (r.done || []).length; failed += (r.failed || []).length; left = r.remaining ?? 0;
      if (!left || !(r.done || []).length) break;
      await new Promise(res => setTimeout(res, 1500));
    }
    const ci = await ciRepair(); done += ci.done; failed += ci.failed;
    const h = await driveApi('health', {});
    summary(`### drive-repair\n- chép bù ${done} file (qua CI ${ci.done}) · lỗi ${failed} · còn thiếu ${left ?? 0}\n- sau health: thiếu ${h.under_replicated} · chỉ 1 bản ${h.single} · chỉ còn trên Drive mất kết nối ${h.lost_only}`);
    process.exit(h.single > 0 && failed > 0 ? 1 : 0);
  } catch (e) {
    if (QUOTA.test(String(e.code))) { summary('⏸ drive-repair: cầu dao D1 – mai chạy tiếp'); process.exit(0); }
    console.error('✗ drive-repair: ' + e.message); process.exit(1);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
