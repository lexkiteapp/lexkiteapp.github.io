#!/usr/bin/env node
// Chép (một chiều, tăng dần) các kho media GitHub → R2 để media.lexkite.com / audio.lexkite.com phục vụ tĩnh (scripts/cdn/hosts.mjs).
//   node scripts/cdn/mirror.mjs --host media|audio|all [--dry] [--verify N] [--max N]
// CHỈ chạy trên CI (.github/workflows/cdn-mirror.yml): clone thưa không blob, chỉ tải blob của tệp mới/đổi (sparse checkout),
// đẩy qua API S3 (SigV4 tự ký – scripts/lib/media-store.mjs). Sổ _mirror/manifest.json (khoá → sha blob | id:size tài sản) giữ trong
// chính bucket → chạy lại an toàn, tiếp tục được; không bao giờ xoá đối tượng. Thoát 1 khi có lỗi đẩy, khi tổng khoá = 0, hay mẫu kiểm lệch.
// Secret: R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY (S3 từ token có quyền Workers R2 Storage Edit). Không in khoá.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { execFileSync } from 'node:child_process';
import { hosts, merge, diff, typeFor, cacheFor, ACCOUNT } from './hosts.mjs';
import { signV4, sha256hex } from '../lib/media-store.mjs';
import { r2Frozen } from '../lib/r2-freeze.mjs'; import { retry5xx } from '../lib/retry5xx.mjs'; // GitHub API 5xx tạm (07/11: cây lexkite-media-2 → 500, cdn-mirror đỏ)

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const DRY = args.includes('--dry'), VERIFY = +opt('verify', 40), MAX = +opt('max', 0), CONC = +opt('concurrency', 24);
const MANIFEST = '_mirror/manifest.json';
if (!process.env.CI && !DRY) { console.error('cdn-mirror: chỉ chạy trên CI (hoặc --dry)'); process.exit(2); }
if (r2Frozen() && !DRY) { console.log('::notice::R2 đóng băng (chốt $0 – free-tier guard ≥ 90 %) → không ghi R2'); process.exit(0); }

const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
function s3(bucket) {
  const keyId = process.env.R2_ACCESS_KEY_ID, secret = process.env.R2_SECRET_ACCESS_KEY;
  if (!keyId || !secret) return null;
  const host = `${process.env.R2_ACCOUNT_ID || ACCOUNT}.r2.cloudflarestorage.com`;
  return async (method, key, { body, headers = {} } = {}) => {
    const p = `/${bucket}/${key}`, hs = signV4({ method, host, path: p, headers, payloadHash: body ? sha256hex(body) : sha256hex(''), keyId, secret });
    delete hs.host;
    for (let i = 0; ; i++) {
      try { const r = await fetch(`https://${host}${p.split('/').map(enc).join('/')}`, { method, headers: hs, body }); if (r.status >= 500 && i < 4) throw new Error('R2 ' + r.status); return r; }
      catch (e) { if (i >= 4) throw e; await new Promise(r => setTimeout(r, 1000 * 2 ** i)); }
    }
  };
}
const git = (dir, a, input) => execFileSync('git', ['-C', dir, ...a], { maxBuffer: 1 << 30, input, stdio: [input ? 'pipe' : 'ignore', 'pipe', 'inherit'] }).toString();

// Danh sách tệp: API cây git (sha + cỡ, 1 lượt gọi); clone thưa không blob CHỈ khi cần tải (ls-tree -l trên clone thưa sẽ tải từng blob – cấm).
const ghH = () => (process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {});
const trees = new Map(), clones = new Map();
async function listTree(repo) {
  if (trees.has(repo)) return trees.get(repo);
  const r = await retry5xx(() => fetch(`https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`, { headers: ghH() }));
  if (!r.ok) throw new Error(`cây ${repo}: ${r.status}`);
  const j = await r.json(); if (j.truncated) throw new Error(`cây ${repo} bị cắt (> 100k mục) – chia kho (docs/STORAGE.md §Mở kho mới)`);
  const files = j.tree.filter(t => t.type === 'blob').map(t => ({ sha: t.sha, size: t.size, path: t.path }));
  trees.set(repo, { commit: j.sha, files }); return trees.get(repo);
}
function cloneAt(repo) {
  if (clones.has(repo)) return clones.get(repo);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdnm-'));
  execFileSync('git', ['clone', '-q', '--depth', '1', '--filter=blob:none', '--no-checkout', `https://github.com/${repo}.git`, dir], { stdio: 'inherit' });
  clones.set(repo, dir); return dir;
}
async function releaseAssets(repo) {
  const out = [], H = ghH();
  for (let page = 1; page < 200; page++) {
    const r = await retry5xx(() => fetch(`https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`, { headers: H }));
    if (!r.ok) throw new Error(`GitHub releases ${r.status}`);
    const rs = await r.json(); if (!rs.length) break;
    for (const rel of rs) if (rel.tag_name.startsWith('wv-')) for (const a of rel.assets || []) out.push({ tag: rel.tag_name, name: a.name, id: a.id, size: a.size, url: a.browser_download_url });
  }
  return out;
}
async function listSource(src) {
  if (src.kind === 'repo') {
    const { files } = await listTree(src.repo);
    return files.map(f => ({ source: src, path: f.path, key: src.map(f.path), ver: f.sha, size: f.size })).filter(x => x.key);
  }
  return (await releaseAssets(src.repo)).map(a => ({ source: src, path: a.name, url: a.url, key: src.map(a.tag, a.name), ver: `${a.id}:${a.size}`, size: a.size })).filter(x => x.key);
}
// Tải blob cần dùng một lượt (sparse checkout theo đúng danh sách đường dẫn) rồi đọc từ đĩa.
function materialize(repo, paths) {
  const dir = cloneAt(repo);
  git(dir, ['sparse-checkout', 'set', '--no-cone', '--stdin'], paths.map(p => '/' + p).join('\n') + '\n');
  git(dir, ['checkout', '-q', 'HEAD']);
  return p => fs.readFileSync(path.join(dir, p));
}
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) await fn(items[i++]); })); }

async function run(name, h) {
  const put = s3(h.bucket);
  if (!put && !DRY) throw new Error('thiếu R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY');
  let manifest = {};
  if (put) { const r = await put('GET', MANIFEST); if (r.ok) manifest = await r.json(); else if (r.status !== 404) throw new Error(`đọc sổ ${r.status}`); }
  const lists = []; for (const s of h.sources) lists.push(await listSource(s));
  const merged = merge(lists); let todo = diff(merged, manifest);
  if (MAX) todo = todo.slice(0, MAX);
  const bytes = todo.reduce((s, x) => s + x.size, 0);
  console.log(`${name}: ${merged.size} khoá (${h.sources.map((s, i) => `${s.id} ${lists[i].length}`).join(' · ')}) · cần đẩy ${todo.length} (${(bytes / 1e6).toFixed(1)} MB) · sổ cũ ${Object.keys(manifest).length}`);
  if (!merged.size) throw new Error(`${name}: 0 khoá – nguồn rỗng?`);
  if (DRY) return { name, keys: merged.size, todo: todo.length };
  // Nhóm theo kho → tải blob 1 lượt/kho
  const readers = new Map();
  const byRepo = new Map(); for (const x of todo) if (x.source.kind === 'repo') (byRepo.get(x.source.repo) || byRepo.set(x.source.repo, new Set()).get(x.source.repo)).add(x.path);
  for (const [repo, ps] of byRepo) readers.set(repo, materialize(repo, [...ps]));
  let done = 0, fail = 0, since = 0;
  const save = () => put('PUT', MANIFEST, { body: JSON.stringify(manifest), headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  await pool(todo, CONC, async it => {
    try {
      let body;
      if (it.source.kind === 'repo') body = readers.get(it.source.repo)(it.path);
      else { const r = await fetch(it.url, { redirect: 'follow' }); if (!r.ok) throw new Error(`tải ${r.status}`); body = Buffer.from(await r.arrayBuffer()); }
      if (body.length !== it.size) throw new Error(`cỡ ${body.length} ≠ ${it.size}`);
      const r = await put('PUT', it.key, { body, headers: { 'content-type': typeFor(it.key), 'cache-control': cacheFor(it.key) } });
      if (!r.ok) throw new Error(`PUT ${r.status}`);
      manifest[it.key] = it.ver; done++;
      if (++since >= 2000) { since = 0; await save(); console.log(`  … ${done}/${todo.length}`); }
    } catch (e) { fail++; if (fail <= 20) console.error(`  ✗ ${it.key}: ${e.message}`); }
  });
  if (todo.length) { const r = await save(); if (!r.ok) throw new Error(`ghi sổ ${r.status}`); }
  // Mẫu kiểm: HEAD ngẫu nhiên N khoá → có thật, đúng cỡ + kiểu + cache
  const keys = [...merged.keys()], bad = [];
  for (let i = 0; i < Math.min(VERIFY, keys.length); i++) {
    const k = keys[Math.floor(Math.random() * keys.length)], it = merged.get(k), r = await put('HEAD', k);
    if (!manifest[k]) continue; // chưa đẩy được (đã đếm ở fail)
    if (!r.ok || +r.headers.get('content-length') !== it.size || r.headers.get('content-type') !== typeFor(k) || r.headers.get('cache-control') !== cacheFor(k)) bad.push(`${k} ${r.status}`);
  }
  // Trạng thái cho cổng chuyển tên miền (scripts/cdn/cutover.mjs switch/verify): mẫu = vài khoá mỗi đuôi (có mp4 để thử Range)
  const missing = merged.size - Object.keys(manifest).filter(k => merged.has(k)).length, sample = [];
  for (const ext of [...new Set(keys.map(k => k.slice(k.lastIndexOf('.') + 1)))]) sample.push(...keys.filter(k => k.endsWith('.' + ext) && manifest[k]).slice(-3));
  const st = await put('PUT', '_mirror/status.json', { body: JSON.stringify({ at: new Date().toISOString(), keys: merged.size, missing, fail, bad: bad.length, sample }), headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  if (!st.ok) throw new Error(`ghi status ${st.status}`);
  console.log(`${name}: đẩy ${done} · lỗi ${fail} · mẫu kiểm ${Math.min(VERIFY, keys.length)} lệch ${bad.length}${bad.length ? ' → ' + bad.slice(0, 5).join(', ') : ''} · sổ ${Object.keys(manifest).length}/${merged.size}`);
  return { name, keys: merged.size, pushed: done, fail, bad: bad.length, missing };
}

const which = opt('host', 'all'), H = hosts(), res = [];
try {
  for (const [name, h] of Object.entries(H)) if (which === 'all' || which === name) res.push(await run(name, h));
} finally { for (const dir of clones.values()) fs.rmSync(dir, { recursive: true, force: true }); }
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '| tên miền | khoá | đẩy | lỗi | lệch | còn thiếu |\n|---|---|---|---|---|---|\n' + res.map(r => `| ${r.name} | ${r.keys} | ${r.pushed ?? '–'} | ${r.fail ?? '–'} | ${r.bad ?? '–'} | ${r.missing ?? r.todo} |`).join('\n') + '\n');
if (res.some(r => r.fail || r.bad)) process.exit(1);
