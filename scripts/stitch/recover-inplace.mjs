// Khôi phục việc 'edit' bị ghi "no screen" (Stitch đã sửa NGAY TRÊN màn gốc qua dom_operations, không trả màn mới):
// tải lại màn gốc bằng get_screen (không tốn lượt sinh) → ghi <out>/<id>/<mode>.{html,png}, đánh dấu done. Dùng: node scripts/stitch/recover-inplace.mjs <queue.json> <out>
import { spawnSync } from 'node:child_process';
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) process.exit(spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } }).status);
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import crypto from 'node:crypto';
const [QUEUE, OUT] = process.argv.slice(2), SF = path.join(OUT, 'state.json'), st = JSON.parse(fs.readFileSync(SF, 'utf8')), queue = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
const FILES = { key1: 'stitch-key', key2: 'stitch-key-2', key3: 'stitch-key-3', key4: 'stitch-key-4', key5: 'stitch-key-5' }, keyOf = n => fs.readFileSync(path.join(os.homedir(), '.config/lexkite', FILES[n]), 'utf8').trim();
const hash = j => crypto.createHash('sha1').update(JSON.stringify([j.kind || 'gen', j.from || '', j.device || 'MOBILE', j.count || 0, j.prompt])).digest('hex').slice(0, 12);
const tag = j => `${j.id}/${j.mode}`, latest = t => Object.values(st.jobs).filter(x => x.tag === t && x.status === 'done').sort((a, b) => String(b.at).localeCompare(String(a.at)))[0];
async function call(key, name, args) { const r = await fetch('https://stitch.googleapis.com/mcp', { method: 'POST', headers: { 'X-Goog-Api-Key': key, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) });
  let t = await r.text(); if (/^(event|data):/.test(t)) t = t.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5)).pop(); const j = JSON.parse(t); return j.result?.structuredContent || JSON.parse(j.result?.content?.[0]?.text || '{}'); }
async function grab(key, u, f) { if (!u) return; const r = await fetch(u, { headers: { 'X-Goog-Api-Key': key } }); const b = Buffer.from(await r.arrayBuffer()); let out = b;
  try { const o = JSON.parse(b.toString('utf8')); const d = o.dataString; if (typeof d === 'string') out = /^\s*</.test(d) ? Buffer.from(d, 'utf8') : Buffer.from(d, 'base64'); } catch {} fs.writeFileSync(f, out); }
let n = 0;
for (const job of queue) { const h = hash(job), s = st.jobs[h]; if (!s || s.status === 'done' || s.err !== 'no screen in response' || job.kind !== 'edit') continue;
  const base = latest(job.from); if (!base || base.key !== s.key) continue; const key = keyOf(base.key);
  const sc = await call(key, 'get_screen', { name: `projects/${base.project}/screens/${base.screenId}` }); if (!sc?.htmlCode) { console.log('skip', tag(job)); continue; }
  const dir = path.join(OUT, job.id); fs.mkdirSync(dir, { recursive: true });
  await grab(key, sc.htmlCode.downloadUrl, path.join(dir, job.mode + '.html')); await grab(key, sc.screenshot?.downloadUrl, path.join(dir, job.mode + '.png'));
  st.jobs[h] = { tag: tag(job), key: base.key, project: base.project, status: 'done', screenId: base.screenId, inplace: true, at: new Date().toISOString() }; n++;
  fs.writeFileSync(SF, JSON.stringify(st, null, 1)); console.log('ok', tag(job)); }
console.log('recovered', n);
