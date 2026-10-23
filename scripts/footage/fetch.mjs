// CI: lấy footage cho 1 job = bản gốc media từ Kho Drive (theo archive-manifest.json, có cache) + file nhỏ/không có trong manifest từ git lexkite-footage.
// Thay cho "git sparse-checkout + checkout" (kéo cả GB binary qua git). Cùng cú pháp mẫu với sparse-checkout.
// Dùng: node scripts/footage/fetch.mjs --repo footage [--cache .footage-cache] [--ref HEAD] [--manifest f] [mẫu...]   (repo đã clone --no-checkout)
// Thứ tự: 1) mục manifest khớp mẫu → cache ← Drive (sha256) → liên kết vào repo; 2) phần còn lại khớp mẫu (file nhỏ, hoặc binary Drive lỗi/chưa vào manifest) → git checkout.
import fs from 'fs';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { DEFAULT_ROOT, MANIFEST_NAME, loadManifest, matcher, restoreEntry, arg } from './lib.mjs';

const argv = process.argv.slice(2), val = new Set(['--repo', '--cache', '--ref', '--manifest', '--patterns-file']), pats = [];
for (let i = 0; i < argv.length; i++) { if (val.has(argv[i])) i++; else if (!argv[i].startsWith('--')) pats.push(argv[i]); }
const REPO = path.resolve(arg(argv, 'repo', 'footage')), CACHE = path.resolve(arg(argv, 'cache', '.footage-cache')), REF = arg(argv, 'ref', 'HEAD');
const MAN = path.resolve(arg(argv, 'manifest', path.join(DEFAULT_ROOT, MANIFEST_NAME)));
if (arg(argv, 'patterns-file')) pats.push(...fs.readFileSync(arg(argv, 'patterns-file'), 'utf8').split('\n').map(x => x.trim()));
const T0 = Date.now(), CAP = +(process.env.FOOTAGE_CACHE_GB || 6) * 1e9, MIN_FREE = +(process.env.FOOTAGE_MIN_FREE_GB || 20) * 1e9;
const freeBytes = () => { const st = fs.statfsSync(REPO.startsWith('/') ? path.dirname(REPO) : '.'); return st.bavail * st.bsize; };
if (process.env.CI && freeBytes() < MIN_FREE) { // chừa ≥ 20 GB đĩa cho bước dựng: gỡ bớt phần mềm sẵn có của runner (vô dụng cho ta)
  console.log(`đĩa trống ${(freeBytes() / 1e9).toFixed(1)} GB < ${MIN_FREE / 1e9} → dọn runner`);
  spawnSync('sudo', ['rm', '-rf', '/usr/share/dotnet', '/opt/ghc', '/usr/local/lib/android', '/opt/hostedtoolcache/CodeQL', '/usr/local/share/boost'], { stdio: 'ignore' });
}
let hot = () => false; try { hot = matcher(JSON.parse(fs.readFileSync(path.join(path.dirname(MAN), '../../../scripts/footage/hot.json'), 'utf8')).patterns); } catch { try { hot = matcher(JSON.parse(fs.readFileSync(new URL('./hot.json', import.meta.url), 'utf8')).patterns); } catch { /* */ } }
const match = matcher(pats), m = loadManifest(MAN);
const GIT_ONLY = argv.includes('--git-only'), want = GIT_ONLY ? [] : Object.keys(m.files).filter(match), ok = new Set(); let got = 0, had = 0, fail = 0, bytes = 0, guard = false;
if (GIT_ONLY) console.log('footage: --git-only (phiên bản cũ theo công thức) → chỉ git');
else if (want.length && !process.env.LEXKITE_DRIVE_CLI_KEY) console.error('⚠ không có LEXKITE_DRIVE_CLI_KEY → bỏ qua Kho Drive, lấy hết từ git');
else for (const p of want) {
  if (guard) { fail++; continue; } // cầu dao D1 chặn → phần còn lại lấy từ git (dự phòng)
  const r = await restoreEntry(p, m.files[p], CACHE).catch(e => { if (/quota-guard|d1-budget/.test(String(e.code || e.message))) { guard = true; console.error('⏸ cầu dao D1 (429): dùng git dự phòng'); } return 'fail'; });
  if (r === 'fail') { fail++; continue; }
  r === 'got' ? (got++, bytes += m.files[p].size) : had++; ok.add(p);
  const to = path.join(REPO, p); fs.mkdirSync(path.dirname(to), { recursive: true });
  try { fs.rmSync(to, { force: true }); fs.linkSync(path.join(CACHE, p), to); } catch { fs.copyFileSync(path.join(CACHE, p), to); }
}
const T1 = Date.now();
console.log(`footage/Drive: ${want.length} mục manifest khớp · ${got} tải (${(bytes / 1e6).toFixed(0)} MB) · ${had} có sẵn trong cache · ${fail} lỗi`);
// git: mọi file khớp mẫu mà chưa lấy từ Drive
const tree = execFileSync('git', ['-C', REPO, 'ls-tree', '-r', '-l', '--full-tree', REF], { maxBuffer: 1 << 28 }).toString().split('\n').filter(Boolean);
const fill = [], bin = []; 
for (const ln of tree) {
  const t = ln.indexOf('\t'), p = ln.slice(t + 1), size = +ln.slice(0, t).trim().split(/\s+/)[3];
  if (!match(p) || ok.has(p)) continue;
  fill.push(p); if (size >= 1 << 20) bin.push(p);
}
if (fill.length) {
  execFileSync('git', ['--literal-pathspecs', '-C', REPO, 'checkout', REF, '--pathspec-from-file=-', '--pathspec-file-nul'], { input: fill.join('\0'), stdio: ['pipe', 'inherit', 'inherit'] });
}
console.log(`footage/git: ${fill.length} file (${bin.length} binary dự phòng từ git, ${fill.length - bin.length} nhỏ)`);
if (!want.length && !fill.length) { console.error('✗ không có file nào khớp mẫu'); process.exit(1); }
if (fail && bin.length < fail) console.error(`⚠ ${fail} file Drive lỗi — chỉ ${bin.length} có bản dự phòng trong git`);

// Cache: trần FOOTAGE_CACHE_GB (6 GB) — dọn file cũ nhất (mtime) trước; không đụng file job này dùng + bộ nóng (hot.json). Chạy trước khi actions/cache lưu.
const files = []; const rec = d => { for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) { const a = path.join(d, e.name); e.isDirectory() ? rec(a) : files.push({ a, rel: path.relative(CACHE, a), st: fs.statSync(a) }); } }; rec(CACHE);
let total = files.reduce((s, f) => s + f.st.size, 0), dropped = 0;
for (const f of files.filter(f => ok.has(f.rel) || hot(f.rel))) fs.utimesSync(f.a, new Date(), new Date()); // làm tươi: LRU lần sau
for (const f of files.filter(f => !ok.has(f.rel) && !hot(f.rel)).sort((a, b) => a.st.mtimeMs - b.st.mtimeMs)) { if (total <= CAP) break; fs.rmSync(f.a); total -= f.st.size; dropped++; }
const free = freeBytes();
const msg = `footage: Drive ${((T1 - T0) / 1000).toFixed(1)} s · git ${((Date.now() - T1) / 1000).toFixed(1)} s · cache ${(total / 1e9).toFixed(2)}/${CAP / 1e9} GB (dọn ${dropped}) · đĩa trống ${(free / 1e9).toFixed(1)} GB`;
console.log(msg); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${msg}\n`);
if (process.env.CI && free < MIN_FREE) console.error(`⚠ đĩa trống ${(free / 1e9).toFixed(1)} GB < ${MIN_FREE / 1e9} GB chừa cho dựng`);
