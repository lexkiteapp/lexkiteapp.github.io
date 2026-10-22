// Manual YouTube path (until the API audit passes – docs/YOUTUBE-SETUP.md §0): build the upload pack for every clip the owner approved in
// Admin › Video, put it on the Drive pool (shorts/_ytpack/<clip>.zip) and link it in the admin (functions/api/youtube.js op pack).
//   node scripts/video/yt-pack.mjs --index /tmp/shorts/shorts/index.json [--dry-run]
// Pack = <clip>.mp4 (master) · cover.jpg · title.txt (hook, ≤ 100 chars, EN) · description.txt (lesson + lexkite.com deep link + #shorts + marker
// "lk:<clip>" that the read-only sync matches) · tags.txt · settings.txt (Unlisted · not made for kids · altered/synthetic = Yes · Education).
// Packs of clips that are live on the web for 3 days are moved to the Drive trash (op packs → retire). env LEXKITE_DRIVE_CLI_KEY; prints no secrets.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { driveApi, driveUpload } from './library.mjs';
import { fetchFromDrive } from './drive-fetch.mjs';
import { ytApi, metaFor } from './yt-upload.mjs';
import { readJSON } from '../lib/video-web.mjs';

export const SETTINGS = [
  'YouTube Studio – upload settings (Lexkite manual upload)',
  '',
  '1. Title: paste title.txt',
  '2. Description: paste description.txt EXACTLY (keep the last line "lk:<clip>" – the admin sync uses it to link the video)',
  '3. Thumbnail: cover.jpg (Shorts may ignore it – fine)',
  '4. Audience: "No, it\'s not made for kids"',
  '5. Show more → Altered content: "Yes" (AI-generated hosts and voices)',
  '6. Show more → Tags: paste tags.txt · Category: Education · Language: English',
  '7. Visibility: UNLISTED (not Private – private videos cannot be embedded on lexkite.com; not Public yet)',
  '8. Save. Then Admin › Video › "Đồng bộ" (or wait ≤ 30 min) – the lesson page embeds the video automatically.',
  '',
  'Do not re-upload the same clip twice. Wrong file? Delete it in Studio, upload the right mp4, sync again.',
].join('\n');

const clean = (s, n) => String(s || '').replace(/[<>]/g, '').replace(/\s+\n/g, '\n').trim().slice(0, n);
/** Texts of the pack. meta = metaFor(spec) or the admin manifest fields. Description always carries #shorts, a lexkite.com link and the marker. */
export function packTexts(clip, meta = {}) {
  const title = clean(meta.title, 100).replace(/\s+/g, ' ') || 'English in 30 seconds';
  let desc = clean(meta.description, 4700).replace(/(^|\n)lk:[a-z0-9-]+\s*$/gm, '').trim();
  if (!/https:\/\/lexkite\.com\//.test(desc)) desc += `\n\nPractice it free: ${meta.url || 'https://lexkite.com/'}`;
  if (!/#shorts\b/i.test(desc)) desc += '\n#shorts';
  desc += `\n\nlk:${clip}`;
  let total = 0;
  const tags = (meta.tags || []).map(t => String(t).replace(/[",<>]/g, '').trim().slice(0, 30)).filter(Boolean).filter((t, i, a) => a.indexOf(t) === i).filter(t => (total += t.length + 2) <= 450).slice(0, 30);
  return { title, description: desc, tags, settings: SETTINGS };
}

/** Lesson metadata: lesson script (same as the API path) → else the admin manifest's title/description/hashtags. */
function metaOf(it, lessonId) {
  const spec = readJSON(`content/video/cine/news/${lessonId || it.lesson}.json`);
  if (spec) return metaFor(spec, readJSON('content/video/cine/news/lines.json', {}));
  return { title: it.title, description: [it.description, (it.hashtags || []).join(' ')].filter(Boolean).join('\n\n'), tags: ['learn english', 'english lesson', it.area, it.point].filter(Boolean) };
}

export async function runPacks({ index, dry = false, api = ytApi, drive = driveApi, upload = driveUpload, fetchFile = fetchFromDrive, zip = zipDir, log = console.log, work = '/tmp/ytpack' }) {
  const idx = typeof index === 'string' ? JSON.parse(fs.readFileSync(index, 'utf8')) : index, by = new Map((idx.items || []).map(x => [x.id, x]));
  const p = await api('packs'), rep = { made: [], failed: [], retired: [] };
  for (const q of p.todo || []) {
    const it = by.get(q.id), v = it && it.drive && it.drive.video, c = it && it.drive && it.drive.cover;
    if (!it || !v || !v.fileId || v.retired) { rep.failed.push(q.id); log(`✗ ${q.id}: master không có trên Kho Drive`); continue; }
    const t = packTexts(q.id, metaOf(it, q.lesson));
    if (dry) { log(`· ${q.id} → ${t.title}`); continue; }
    try {
      const dir = path.join(work, q.id); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
      await fetchFile(v.fileId, path.join(dir, q.id + '.mp4'), { sha: v.sha256 });
      if (c && c.fileId) await fetchFile(c.fileId, path.join(dir, 'cover.jpg'), { sha: c.sha256 }).catch(() => log(`  ${q.id}: không lấy được bìa – gói không có cover.jpg`));
      fs.writeFileSync(path.join(dir, 'title.txt'), t.title + '\n'); fs.writeFileSync(path.join(dir, 'description.txt'), t.description + '\n');
      fs.writeFileSync(path.join(dir, 'tags.txt'), t.tags.join(', ') + '\n'); fs.writeFileSync(path.join(dir, 'settings.txt'), t.settings + '\n');
      const z = path.join(work, q.id + '.zip'); zip(dir, z);
      const buf = fs.readFileSync(z), sha = crypto.createHash('sha256').update(buf).digest('hex');
      const r = await upload(z, { name: q.id + '.zip', folder: 'shorts/_ytpack', sha, mimeType: 'application/zip', cls: 'render', replicas: 1, assetId: 'ytpack-' + q.id });
      await api('pack', { id: q.id, file_id: r.fileId, drive_id: String(r.driveId), sha, bytes: buf.length, title: t.title, description: t.description, tags: t.tags });
      rep.made.push(q.id); log(`✓ ${q.id} · ${(buf.length / 1048576).toFixed(1)} MB · ${t.title}`);
    } catch (e) { rep.failed.push(q.id); log(`✗ ${q.id}: ${e.code || e.message}`); }
  }
  if (!dry && (p.retire || []).length) {
    const r = await drive('retire', { sha256: p.retire.map(x => x.sha), reason: 'ytpack live on web' }).catch(e => ({ failed: [{ error: e.message }] }));
    const bad = new Set((r.failed || []).map(x => x.sha));
    for (const x of p.retire) if (!bad.has(x.sha)) { await api('pack', { id: x.id, retired: true }).catch(() => {}); rep.retired.push(x.id); }
  }
  return rep;
}
/** Clips whose YouTube id (op ids → web) is not yet in web/data/videos.json → video-web must rebuild the manifest. */
export function webPending(web = {}, videos = { items: [] }) {
  const have = new Map((videos.items || []).map(x => [x.id, x.youtube_id || '']));
  return Object.entries(web).filter(([id, vid]) => have.has(id) && have.get(id) !== vid).map(([id]) => id);
}
/** Store-only zip (mp4 is already compressed) – `zip` ships with ubuntu-latest. */
export function zipDir(dir, out) { fs.rmSync(out, { force: true }); execFileSync('zip', ['-q', '-0', '-j', '-r', out, '.'], { cwd: dir }); }

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = process.argv.slice(2), opt = n => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : undefined; };
  if (a.includes('--sync')) { // youtube-manual.yml: read-only channel sync → newly live clips → video-web rebuilds web/data/videos.json
    const r = await ytApi('sync').catch(e => ({ error: e.code || e.message }));
    const pend = webPending((await ytApi('ids')).web || {}, readJSON('web/data/videos.json', { items: [] }));
    const line = r.error ? `Đồng bộ YouTube: ${r.error}` : `Đồng bộ YouTube: quét ${r.scanned} video · khớp ${r.matched} · mới lên ${r.live.length} · vấn đề ${r.issues.length} · chờ web ${pend.length}`;
    console.log(line); for (const i of r.issues || []) console.log(`  ! ${i.kind} ${i.clip || ''} ${i.video_id || (i.video_ids || []).join(',')}`);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `pending=${pend.length}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ${line}\n`);
    process.exit(r.error && r.error !== 'not-connected' ? 1 : 0);
  }
  const rep = await runPacks({ index: opt('index') || '/tmp/shorts/shorts/index.json', dry: a.includes('--dry-run') });
  const line = `Gói đăng tay YouTube: ${rep.made.length} tạo · ${rep.failed.length} lỗi · ${rep.retired.length} dọn`;
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ${line}\n`);
  process.exit(rep.failed.length && !rep.made.length ? 1 : 0);
}
