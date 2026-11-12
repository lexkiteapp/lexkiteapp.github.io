// Fetch an archived short master (reference for shorts-rebuild.yml / yt-upload.mjs) – docs/VIDEO-STORAGE.md.
//   node scripts/video/drive-fetch.mjs --index <shorts/index.json> --id <clip> --out <file.mp4> [--kind video|cover] [--git <lexkite-shorts clone>]
// Order: Drive pool (CLI op render_link → signed /api/drive/dl link, 5 min) → git history of lexkite-shorts (clips stored before recipe-first).
// env LEXKITE_DRIVE_CLI_KEY. Never prints keys or signed URLs.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { driveApi } from './library.mjs';
import { pathToFileURL } from 'node:url';

export const API_ORIGIN = 'https://lexkite.com';

export async function fetchFromDrive(fileId, out, { api = driveApi, fetcher = fetch, sha } = {}) {
  const r = await api('render_link', { file_id: fileId });
  if (!r || !/^\/api\/drive\/dl\?/.test(r.url || '')) throw new Error('no-link');
  const res = await fetcher(API_ORIGIN + r.url);
  if (!res.ok) throw new Error('download ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  if (sha && crypto.createHash('sha256').update(buf).digest('hex') !== sha) throw new Error('sha-mismatch');
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, buf);
  return buf.length;
}

export function fetchFromGit(repo, rel, out) {
  const g = (...a) => execFileSync('git', ['-C', repo, ...a], { maxBuffer: 1 << 30 });
  const c = String(g('log', '--all', '-1', '--format=%H', '--', rel)).trim(); if (!c) throw new Error('not in git history');
  let buf; try { buf = g('show', `${c}:${rel}`); } catch { buf = g('show', `${c}^:${rel}`); }   // last commit may be the one that removed it
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, buf);
  return buf.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), opt = n => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : undefined; };
  const kind = opt('kind') || 'video', idx = JSON.parse(fs.readFileSync(opt('index'), 'utf8'));
  const it = (idx.items || []).find(x => x.id === opt('id')); if (!it) { console.error('✗ unknown id'); process.exit(2); }
  const d = (it.drive || {})[kind];
  try {
    if (!d || !d.fileId) throw new Error('not on Drive');
    console.log(`Drive → ${opt('out')} (${await fetchFromDrive(d.fileId, opt('out'), { sha: d.sha256 })} B)`);
  } catch (e) {
    console.log(`Drive: ${e.message}${opt('git') ? ' → git history' : ''}`);
    if (!opt('git')) process.exit(1);
    try { console.log(`git → ${opt('out')} (${fetchFromGit(opt('git'), it[kind], opt('out'))} B)`); } catch (e2) { console.error('✗', e2.message); process.exit(1); }
  }
}
