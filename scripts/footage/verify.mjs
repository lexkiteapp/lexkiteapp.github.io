// Kiểm kho footage trên Kho Drive theo manifest (footage-verify.yml, hằng tuần):
//  1) MỌI mục manifest: sổ Drive có sha, đủ ≥ 2 bản sao trên ≥ 2 Drive khác nhau, dung lượng khớp;
//  2) mẫu ngẫu nhiên N mục: tải về TẤT CẢ bản sao, so sha256 với manifest.
// Có lỗi → đặt cảnh báo 'footage' hiện ở Quản trị → Kho Drive (op footage_alert), thoát 1; sạch → gỡ cảnh báo.
// Dùng: node scripts/footage/verify.mjs [--manifest <file>] [--sample 40] [--no-alert] [--seed N]
import fs from 'fs';
import os from 'os';
import path from 'path';
import { driveApi } from '../video/library.mjs';
import { DEFAULT_ROOT, MANIFEST_NAME, WANT, loadManifest, downloadCopy, sleep, arg } from './lib.mjs';

const args = process.argv.slice(2), MAN = path.resolve(arg(args, 'manifest', path.join(DEFAULT_ROOT, MANIFEST_NAME)));
const SAMPLE = +arg(args, 'sample', 40), ALERT = !args.includes('--no-alert');
const m = loadManifest(MAN), paths = Object.keys(m.files), problems = [];
if (!paths.length) { console.error('✗ manifest rỗng: ' + MAN); process.exit(2); }
const bad = (p, why) => { problems.push(`${p}: ${why}`); console.error(`✗ ${p}: ${why}`); };

// 1) toàn bộ manifest ↔ sổ Drive (200 sha / lượt)
const shas = [...new Set(paths.map(p => m.files[p].sha256))], have = {};
for (let i = 0; i < shas.length; i += 200) Object.assign(have, (await driveApi('list', { sha256: shas.slice(i, i + 200) })).have || {});
for (const p of paths) {
  const e = m.files[p], h = have[e.sha256];
  if (!h) bad(p, 'sổ Kho Drive không có sha ' + e.sha256.slice(0, 12));
  else {
    const drives = new Set(h.drives || []).size;
    if (h.copies < WANT || drives < WANT) bad(p, `chỉ ${h.copies} bản / ${drives} Drive (cần ${WANT}/${WANT})`);
    if (h.size != null && +h.size !== e.size) bad(p, `dung lượng Drive ${h.size} ≠ manifest ${e.size}`);
  }
}
console.log(`sổ Drive: ${paths.length} mục · ${problems.length} lỗi`);

// 2) mẫu ngẫu nhiên: tải mọi bản sao, so sha256
let seed = +arg(args, 'seed', Date.now() % 2147483647) || 1; const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
const pick = paths.map(p => [rnd(), p]).sort((a, b) => a[0] - b[0]).slice(0, Math.min(SAMPLE, paths.length)).map(x => x[1]);
const tmp = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'fv-')); let checked = 0, bytes = 0;
for (const p of pick) {
  const e = m.files[p];
  for (const c of e.copies || []) {
    const dest = path.join(tmp, 'x'); 
    try { const r = await downloadCopy(c.fileId, dest); bytes += r.size; checked++; if (r.sha256 !== e.sha256) bad(p, `bản sao Drive ${c.driveId} sai sha256`); else if (r.size !== e.size) bad(p, `bản sao Drive ${c.driveId} sai dung lượng`); }
    catch (er) { bad(p, `không tải được bản sao Drive ${c.driveId}: ${er.message}`); }
    try { fs.unlinkSync(dest); } catch { /* */ }
    await sleep(300);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
const msg = `footage-verify: ${paths.length} mục sổ · mẫu ${pick.length} mục / ${checked} bản sao tải về (${(bytes / 1e6).toFixed(0)} MB) · ${problems.length} lỗi`;
console.log(msg);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ${msg}\n${problems.slice(0, 30).map(x => '- ' + x).join('\n')}\n`);
if (ALERT) { try { await driveApi('footage_alert', problems.length ? { ok: false, n: problems.length, msg: problems[0] } : { ok: true }); console.log(problems.length ? 'đã đặt cảnh báo Quản trị' : 'đã gỡ cảnh báo Quản trị'); } catch (e) { console.error('⚠ footage_alert: ' + e.message); } }
process.exit(problems.length ? 1 : 0);
