// Sao lưu shorts ĐẠT (lexkite-shorts) lên Kho Drive riêng (functions/api/drive.js, docs/ASSET-LIBRARY.md §8.6).
// Dùng: node scripts/video/drive-shorts.mjs --repo /tmp/shorts [--limit N] [--dry-run] [--pause-ms 1500]
//       node scripts/video/drive-shorts.mjs --manifest <admin-shorts.json>  → chỉ tải manifest thư viện quản trị lên kho
//         (shorts/_admin/admin-shorts.json, 2 bản sao; admin-shorts.js đọc bản mới nhất theo sổ drive_files – không cần token GitHub)
//   env: LEXKITE_DRIVE_CLI_KEY (secret GitHub Actions / ~/.config/lexkite/drive-cli-key) – không bao giờ in ra.
// Mỗi short = mp4 + ảnh bìa → folder shorts/<cảnh>/<bài>, cls 'render' (luật kho: 1 bản sao, máy chủ chọn Drive theo tỉ lệ đã dùng).
// Chống trùng 2 lớp: index.json có item.drive.{video,cover} khớp sha → bỏ qua; máy chủ trả done khi sha đã có (chỉ ghi lại vị trí).
// Ghi index.json sau MỖI short (dừng giữa chừng → chạy lại tiếp tục). Sổ kho = bảng drive_files (op where/list).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { driveApi, driveUpload } from './library.mjs';

const args = process.argv.slice(2), opt = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const REPO = opt('repo') || '/tmp/shorts', LIMIT = +(opt('limit') || 1e9), DRY = args.includes('--dry-run'), PAUSE = +(opt('pause-ms') || 1500);
const MAN = opt('manifest');
if (MAN) {
  const m = JSON.parse(fs.readFileSync(MAN, 'utf8')), items = (m.index || {}).items || [];
  if (!items.length) { console.error('✗ manifest rỗng'); process.exit(1); }
  const r = await driveUpload(MAN, { name: 'admin-shorts.json', folder: 'shorts/_admin', sha: crypto.createHash('sha256').update(fs.readFileSync(MAN)).digest('hex'), mimeType: 'application/json', cls: 'render', replicas: 2, assetId: 'admin-shorts-manifest' });
  const onDrive = items.filter(i => (i.drive || {}).video).length;
  console.log(`manifest → Drive ${r.driveId} (${r.copies.length || 1} bản) · ${items.length} short · ${onDrive} có video trên kho`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Manifest thư viện quản trị: ${items.length} short, ${onDrive} có video trên Kho Drive\n`);
  process.exit(0);
}
const IDX = path.join(REPO, 'shorts', 'index.json');
const idx = JSON.parse(fs.readFileSync(IDX, 'utf8'));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const save = () => { idx.updated = new Date().toISOString().replace(/\.\d+Z$/, 'Z'); idx.count = idx.items.length; fs.writeFileSync(IDX, JSON.stringify(idx, null, 1)); };
const mimeOf = f => (/\.jpe?g$/i.test(f) ? 'image/jpeg' : /\.png$/i.test(f) ? 'image/png' : /\.webp$/i.test(f) ? 'image/webp' : 'video/mp4');

const pool = await driveApi('list', {});
const okDrives = (pool.drives || []).filter(d => d.status === 'ok' && d.weight > 0 && !d.auto_paused);
console.log(`Kho Drive: ${okDrives.length}/${(pool.drives || []).length} Drive nhận file · trống ${(pool.free / 1e9).toFixed(2)} GB`);
if (!okDrives.length) { console.error('✗ không có Drive nào đang nhận file'); process.exit(1); }

let up = 0, skip = 0, fail = 0, n = 0;
for (const it of idx.items) {
  if ((it.qa || {}).status !== 'pass') continue;
  if (n >= LIMIT) break;
  const parts = [['video', it.video], ['cover', it.cover]].filter(([, rel]) => rel);
  const todo = parts.filter(([k, rel]) => { const f = path.join(REPO, rel), c = (it.drive || {})[k]; return fs.existsSync(f) && !(c && c.sha256 === sha(f) && c.fileId); });
  if (!todo.length) { skip++; continue; }
  n++;
  if (DRY) { console.log('· sẽ tải', it.id, todo.map(t => t[0]).join('+')); continue; }
  try {
    for (const [k, rel] of todo) {
      const f = path.join(REPO, rel), h = sha(f);
      const r = await driveUpload(f, { name: path.basename(rel), folder: path.posix.dirname(rel), sha: h, mimeType: mimeOf(rel), cls: 'render', replicas: 1, assetId: it.id });
      it.drive = { ...(it.drive || {}), [k]: { driveId: r.driveId, fileId: r.fileId, sha256: h, copies: r.copies.length || 1, at: new Date().toISOString().slice(0, 10) } };
      console.log(`${r.existed ? '=' : '↑'} ${it.id} ${k} → Drive ${r.driveId}`);
      await sleep(PAUSE);
    }
    up++; save();
  } catch (e) { fail++; console.error(`✗ ${it.id}: ${e.message}`); if (/no-key|403|forbidden/.test(String(e.code || e.message))) break; await sleep(PAUSE * 4); }
}
const after = DRY ? pool : await driveApi('list', {});
console.log(`Xong: ${up} short đã lưu · ${skip} đã có · ${fail} lỗi · Kho còn ${(after.free / 1e9).toFixed(2)} GB`);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Shorts → Kho Drive\n${up} lưu mới · ${skip} đã có · ${fail} lỗi · còn ${(after.free / 1e9).toFixed(2)} GB\n`);
process.exit(fail ? 1 : 0);
