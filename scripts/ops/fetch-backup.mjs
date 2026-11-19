// Tải 1 bản sao lưu/bản phát hành từ Kho Drive về máy theo sổ infra/backups/*.json, kiểm sha256 (thử lần lượt các bản sao Drive).
//   node scripts/ops/fetch-backup.mjs d1 [--index 0] [--out out/restore]                 ← bản D1 (mới nhất = 0)
//   node scripts/ops/fetch-backup.mjs code [--index 0]                                    ← git bundle
//   node scripts/ops/fetch-backup.mjs android-aab|ios-ipa|addon-zip [--index 0]           ← bản phát hành đã ký (0 = mới nhất)
//   node scripts/ops/fetch-backup.mjs --list                                              ← liệt kê tất cả (tên, ngày, kích thước, sha256)
// Cần LEXKITE_DRIVE_CLI_KEY (hoặc ~/.config/lexkite/drive-cli-key) và Pages đang chạy (link tải ký 5 phút). Pages hỏng → tải tay file theo tên trong sổ từ Google Drive đã nối.
import path from 'path';
import { arg, loadJson, downloadCopy } from './lib.mjs';

export const SOURCES = { d1: ['infra/backups/d1-main.json', m => m.items], code: ['infra/backups/code-bundle.json', m => m.items] };
export const itemsOf = (kind, root = '.') => {
  if (SOURCES[kind]) return SOURCES[kind][1](loadJson(path.join(root, SOURCES[kind][0]), { items: [] }));
  return ((loadJson(path.join(root, 'infra/backups/releases.json'), { kinds: {} }).kinds || {})[kind]) || [];
};
async function main() {
  const A = process.argv.slice(2), kind = A.find(a => !a.startsWith('--'));
  if (A.includes('--list') || !kind) { for (const k of ['d1', 'code', 'android-aab', 'ios-ipa', 'addon-zip']) for (const [i, x] of itemsOf(k).entries()) console.log(`${k}[${i}]  ${x.name}  ${String(x.at || '').slice(0, 10)}  ${(x.size / 1e6).toFixed(1)} MB  sha256 ${x.sha256}`); return 0; }
  const it = itemsOf(kind)[+arg(A, 'index', 0)]; if (!it) { console.error(`✗ không có mục ${kind}[${arg(A, 'index', 0)}] trong sổ`); return 1; }
  const dest = path.join(path.resolve(arg(A, 'out', 'out/restore')), it.name);
  for (const c of it.copies || []) { try { const r = await downloadCopy(c.fileId, dest); if (r.sha256 === it.sha256 && r.size === it.size) { console.log(`✓ ${dest} (${(r.size / 1e6).toFixed(1)} MB, sha256 khớp)`); return 0; } console.error(`⚠ Drive ${c.driveId}: sai sha256`); } catch (e) { console.error(`⚠ Drive ${c.driveId}: ${e.message}`); } }
  console.error('✗ không bản sao nào tải được/khớp sha256'); return 1;
}
if (process.argv[1] && process.argv[1].endsWith('fetch-backup.mjs')) main().then(c => process.exit(c)).catch(e => { console.error('✗ ' + e.message); process.exit(1); });
