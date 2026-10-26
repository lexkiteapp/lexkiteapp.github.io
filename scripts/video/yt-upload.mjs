// Upload owner-approved shorts to YouTube (Data API v3, resumable) – .github/workflows/youtube-upload.yml, docs/YOUTUBE-SETUP.md.
//   node scripts/video/yt-upload.mjs --index /tmp/shorts/shorts/index.json [--max 6] [--dry-run]
// Flow per clip: /api/youtube next (approved queue, within today's quota) → master from the Drive pool (sha-checked) → `session`
// (server opens the resumable session with the refresh token – CI never sees Google tokens) → PUT bytes (resume on errors) → `done`
// (server checks the video, sets the cover as thumbnail). Quota exhausted → stop; the rest stays queued for tomorrow.
// env LEXKITE_DRIVE_CLI_KEY (HMAC, same as /api/drive). Never prints keys, tokens or upload URLs.
import fs from 'node:fs';
import path from 'node:path';
import { driveSign, driveCliKey } from './library.mjs';
import { fetchFromDrive } from './drive-fetch.mjs';
import { titleOf, slugOf, readJSON } from '../lib/video-web.mjs';
import { pathToFileURL } from 'node:url';

const BASE = String(process.env.LEXKITE_API_BASE || 'https://lexkite.com').replace(/\/+$/, '');
export async function ytApi(op, body = {}, { fetcher = fetch, key = driveCliKey() } = {}) {
  if (!key) { const e = new Error('no LEXKITE_DRIVE_CLI_KEY'); e.code = 'no-key'; throw e; }
  const text = JSON.stringify({ op, ...body });
  const r = await fetcher(BASE + '/api/youtube', { method: 'POST', headers: { 'Content-Type': 'application/json', ...driveSign(key, text) }, body: text });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(`youtube ${op} → ${r.status} ${j.error || ''}`); e.code = j.error || r.status; e.status = r.status; e.body = j; throw e; }
  return j;
}

const AREA_TAG = { toeic: 'toeic', ielts: 'ielts', travel: 'travelenglish', work: 'businessenglish', daily: 'dailyenglish', grammar: 'englishgrammar' };
/** English metadata from the lesson script: hook title, lesson + deep link, #shorts + topic hashtags, tags. */
export function metaFor(spec, lines = {}) {
  const text = Object.fromEntries((lines.lines || []).map(l => [l.id, l.text]));
  const hook = String(text[(spec.hook || {}).line] || '').trim(), t = titleOf(spec);
  const title = (hook && !t.toLowerCase().includes(hook.toLowerCase()) ? `${hook} ${t}` : t).replace(/\s+/g, ' ').slice(0, 100);
  const topic = String(AREA_TAG[spec.area] || spec.area || 'english').toLowerCase().replace(/[^a-z0-9]/g, '');
  const series = String((spec.series || [])[0] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const url = `https://lexkite.com/video/${slugOf(spec)}/`;
  const tags = ['learn english', 'english lesson', 'english shorts', spec.area, spec.cefr && `cefr ${spec.cefr}`, ...String(spec.point || '').split(/[:,;]/).map(s => s.trim()).filter(s => s && s.length <= 30)].filter(Boolean);
  const description = [
    `${t}${spec.cefr ? ` (CEFR ${spec.cefr})` : ''}`,
    '',
    `Today's lesson: ${String(spec.point || '').trim()}`,
    `▶ Full lesson + quick quiz: ${url}`,
    'Learn English free with Lexkite: https://lexkite.com/',
    '',
    'The hosts and voices in this video are AI-generated.',
    '',
    ['#shorts', '#learnenglish', `#${topic}`, series && `#${series}`].filter(Boolean).join(' '),
  ].join('\n');
  return { title, description, tags, url };
}

/** PUT the file into the resumable session; on failure query the received range and resume (≤ 5 tries). → video resource JSON. */
export async function putResumable(url, buf, { fetcher = fetch, tries = 5, wait = 3000 } = {}) {
  let off = 0;
  for (let k = 0; k < tries; k++) {
    let r = null;
    try {
      r = await fetcher(url, { method: 'PUT', headers: { 'Content-Length': String(buf.length - off), 'Content-Type': 'video/mp4', ...(off ? { 'Content-Range': `bytes ${off}-${buf.length - 1}/${buf.length}` } : {}) }, body: off ? buf.subarray(off) : buf });
    } catch { r = null; }
    if (r && (r.status === 200 || r.status === 201)) return r.json();
    if (r && (r.status === 404 || r.status === 410)) { const e = new Error('session expired ' + r.status); e.code = 'expired'; throw e; }
    if (r && r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429) { const e = new Error('upload ' + r.status); e.code = 'upload-' + r.status; throw e; }
    await new Promise(res => setTimeout(res, wait * (k + 1)));
    const q = await fetcher(url, { method: 'PUT', headers: { 'Content-Length': '0', 'Content-Range': `bytes */${buf.length}` } }).catch(() => null);
    if (q && (q.status === 200 || q.status === 201)) return q.json();
    if (q && q.status === 308) { const m = /bytes=0-(\d+)/.exec(q.headers.get('Range') || ''); off = m ? +m[1] + 1 : 0; }
  }
  const e = new Error('upload retries exhausted'); e.code = 'retries'; throw e;
}

export async function runUploads({ index, max = 6, dry = false, api = ytApi, fetchMaster = fetchFromDrive, put = putResumable, readFile = p => fs.readFileSync(p), log = console.log, work = '/tmp/yt' }) {
  const idx = typeof index === 'string' ? JSON.parse(fs.readFileSync(index, 'utf8')) : index, by = new Map((idx.items || []).map(x => [x.id, x]));
  const lines = readJSON('content/video/cine/news/lines.json', {});
  const nx = await api('next', { max }), rep = { uploaded: [], failed: [], quota: nx.quota, queued: (nx.items || []).length };
  if (!nx.channel) { log('YouTube chưa kết nối (Quản trị → Thư viện video → Kết nối YouTube)'); return rep; }
  for (const q of nx.items || []) {
    const it = by.get(q.id), v = it && it.drive && it.drive.video;
    const spec = readJSON(`content/video/cine/news/${q.lesson || (it || {}).lesson}.json`);
    if (!it || !v || !v.fileId || v.retired || !spec) { await api('fail', { id: q.id, error: !spec ? 'no lesson script' : 'master not on Drive' }); rep.failed.push(q.id); continue; }
    const meta = metaFor(spec, lines);
    if (dry) { log(`· ${q.id} [${q.privacy}${q.publish_at ? ' → ' + q.publish_at : ''}] ${meta.title}`); continue; }
    try {
      const f = path.join(work, q.id + '.mp4'); await fetchMaster(v.fileId, f, { sha: v.sha256 });
      const buf = readFile(f), s = await api('session', { id: q.id, meta: { title: meta.title, description: meta.description, tags: meta.tags, size: buf.length } });
      const video = await put(s.upload_url, buf);
      const d = await api('done', { id: q.id, video_id: video.id });
      rep.uploaded.push({ id: q.id, video_id: video.id, privacy: d.privacy, thumb: d.thumb }); rep.quota = d.quota || rep.quota;
      log(`↑ ${q.id} → ${d.privacy}${s.publish_at ? ' (lịch ' + s.publish_at + ')' : ''}${d.thumb ? ' · bìa ✓' : d.note ? ' · ' + d.note : ''}`);
    } catch (e) {
      if (e.code === 'quota') { log('Hết hạn mức hôm nay – phần còn lại chờ ngày mai'); rep.quota = (e.body || {}).quota || rep.quota; break; }
      await api('fail', { id: q.id, error: String(e.code || e.message).slice(0, 120) }).catch(() => {}); rep.failed.push(q.id); log(`✗ ${q.id}: ${e.code || e.message}`);
    }
  }
  return rep;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), opt = n => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : undefined; };
  const rep = await runUploads({ index: opt('index') || '/tmp/shorts/shorts/index.json', max: +(opt('max') || 6), dry: a.includes('--dry-run') });
  const q = rep.quota || {}, line = `YouTube: ${rep.uploaded.length} lên · ${rep.failed.length} lỗi · hạn mức còn ${q.left ?? '?'} / ${q.limit ?? 10000} đơn vị (≈ ${q.uploads_left ?? '?'} video) hôm nay (${q.day || ''} PT)`;
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### YouTube upload\n${line}\n`);
  process.exit(rep.failed.length && !rep.uploaded.length ? 1 : 0);
}
