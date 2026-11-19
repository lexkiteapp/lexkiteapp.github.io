// Giám sát dung lượng các repo git (storage-watch.yml, hằng tuần): ước lượng kích thước đầu nhánh = tổng blob (ls-tree -r -l) qua clone blobless.
// Mục tiêu ≤ 1 GB mỗi repo; > 2 GB (--alert-gb) → cảnh báo 'gitsize' ở Quản trị → Kho Drive (op ext_alert). Với repo công khai lấy thêm "size" của API (cả lịch sử).
// Dùng: node scripts/footage/repo-size.mjs [--alert-gb 2] [--no-alert]   env: FOOTAGE_KEY_FILE, SHORTS_KEY_FILE (đường dẫn khoá deploy), GITHUB_TOKEN, LEXKITE_DRIVE_CLI_KEY
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { driveApi } from '../video/library.mjs';
import { arg } from './lib.mjs';

const args = process.argv.slice(2), LIM = +arg(args, 'alert-gb', 2) * 1e9, TARGET = 1e9;
const repos = [
  { name: 'lexkiteapp.github.io', url: 'https://github.com/lexkiteapp/lexkiteapp.github.io.git', api: true },
  { name: 'lexkite-footage', url: 'git@github.com:lexkiteapp/lexkite-footage.git', key: process.env.FOOTAGE_KEY_FILE },
  { name: 'lexkite-shorts', url: 'git@github.com:lexkiteapp/lexkite-shorts.git', key: process.env.SHORTS_KEY_FILE },
];
const rows = [];
for (const r of repos) {
  if (r.url.startsWith('git@') && !(r.key && fs.existsSync(r.key))) { console.error(`⚠ ${r.name}: không có khoá deploy → bỏ qua`); continue; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rs-')), env = { ...process.env, ...(r.key ? { GIT_SSH_COMMAND: `ssh -i ${r.key} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new` } : {}) };
  try {
    execFileSync('git', ['clone', '-q', '--bare', '--depth', '1', '--filter=blob:none', r.url, dir], { env, stdio: 'ignore' });
    let tip = 0; for (const ln of execFileSync('git', ['-C', dir, 'ls-tree', '-r', '-l', 'HEAD'], { maxBuffer: 1 << 29 }).toString().split('\n')) { const m = ln.match(/^\d+ blob \w+\s+(\d+)\t/); if (m) tip += +m[1]; }
    let api = null;
    if (r.api && process.env.GITHUB_TOKEN) { try { const j = await (await fetch('https://api.github.com/repos/lexkiteapp/' + r.name, { headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN } })).json(); api = (j.size || 0) * 1024; } catch { /* */ } }
    rows.push({ name: r.name, tip, api, size: Math.max(tip, api || 0) });
  } catch (e) { console.error(`⚠ ${r.name}: ${String(e.message).slice(0, 120)}`); }
  fs.rmSync(dir, { recursive: true, force: true });
}
const fmt = b => (b / 1e9).toFixed(2) + ' GB';
const lines = rows.map(r => `${r.size > LIM ? '⛔' : r.size > TARGET ? '⚠' : '✓'} ${r.name}: đầu nhánh ${fmt(r.tip)}${r.api != null ? ` · API (cả lịch sử) ${fmt(r.api)}` : ''}`);
console.log(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Dung lượng repo (mục tiêu ≤ 1 GB, cảnh báo > ${LIM / 1e9} GB)\n${lines.map(x => '- ' + x).join('\n')}\n`);
const over = rows.filter(r => r.size > LIM).sort((a, b) => b.size - a.size);
if (!args.includes('--no-alert')) {
  try { await driveApi('ext_alert', over.length ? { kind: 'gitsize', ok: false, n: over.length, repo: over[0].name, gb: +(over[0].size / 1e9).toFixed(1), msg: `${over[0].name} ${fmt(over[0].size)} > ${LIM / 1e9} GB` } : { kind: 'gitsize', ok: true }); }
  catch (e) { console.error('⚠ ext_alert: ' + e.message); }
}
process.exit(over.length ? 1 : 0);
