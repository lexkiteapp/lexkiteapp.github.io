// Tests for the scalable shorts storage (docs/VIDEO-STORAGE.md): recipe determinism, manifest schema (youtube_id), YouTube upload queue
// (mocked API, resumable PUT), archive policy (copies / 30-day retention), Drive capacity, web facade fallback (jsdom). No network.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom'; import { fileURLToPath, pathToFileURL } from 'node:url';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const root = fileURLToPath(new URL('../../', import.meta.url)), imp = rel => import(pathToFileURL(root + rel).href), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shorts-'));

// ---------- 1. recipe determinism (scripts/cine/recipe.py) ----------
const lid = fs.readdirSync(`${root}content/video/cine/news`).find(f => /^news_.+_[0-9a-f]{6}\.json$/.test(f)).slice(0, -5);
const base = 'cine-' + lid.replace(/_/g, '-') + '-en';
const py = (...a) => execFileSync('python3', [`${root}scripts/cine/recipe.py`, ...a], { cwd: root, encoding: 'utf8' });
py('build', lid, base, '/nonexistent', `${tmp}/a.json`, '--created', '2026-10-22T00:00:00Z');
py('build', lid, base, '/nonexistent', `${tmp}/b.json`, '--created', '2026-10-22T00:00:00Z');
const ra = fs.readFileSync(`${tmp}/a.json`), rb = fs.readFileSync(`${tmp}/b.json`), rec = JSON.parse(ra);
ok(ra.equals(rb), 'recipe: same inputs → byte-identical recipe');
ok(ra.length < 12000, `recipe: small (${ra.length} B < 12 KB)`);
ok(/^[0-9a-f]{64}$/.test(rec.recipe_id) && rec.inputs.seed === 0 && rec.inputs.script.spec.id === lid, 'recipe: id, seed, script');
ok(['clip', 'lesson', 'template', 'lesson_point', 'background', 'shot_plan', 'host_clips', 'tts', 'pipeline', 'footage'].every(k => k in rec.inputs), 'recipe: all required fields');
ok(rec.inputs.script.lines.length > 0 && rec.inputs.script.lines.every(l => l.id && l.text), 'recipe: TTS lines embedded');
ok(py('check', `${tmp}/a.json`).trim() === 'ok', 'recipe: schema check passes');
const bad = JSON.parse(ra); bad.inputs.background = 'tampered'; fs.writeFileSync(`${tmp}/c.json`, JSON.stringify(bad));
let rc = 0; try { py('check', `${tmp}/c.json`); } catch (e) { rc = e.status; } ok(rc === 1, 'recipe: tampered inputs → recipe_id mismatch');
const bg = JSON.parse(py('build', lid, base, '/nonexistent', `${tmp}/d.json`, '--bg-override', 'otherbg').trim().split(' ').length && fs.readFileSync(`${tmp}/d.json`));
ok(bg.recipe_id !== rec.recipe_id && bg.inputs.background === 'otherbg', 'recipe: background override changes the id');

// ---------- 2. manifest schema ----------
const { validateManifest } = await imp('scripts/lib/video-web.mjs');
const man = JSON.parse(fs.readFileSync(`${root}web/data/videos.json`, 'utf8'));
ok(validateManifest(man).length === 0, 'manifest: current web/data/videos.json valid');
const m2 = structuredClone(man); m2.items[0].youtube_id = 'dQw4w9WgXcQ'; m2.items[0].origin = 'r2';
ok(validateManifest(m2).length === 0, 'manifest: youtube_id (11 chars) + origin r2 accepted');
m2.items[0].youtube_id = 'bad id<>'; ok(validateManifest(m2).some(e => /youtube_id/.test(e)), 'manifest: malformed youtube_id rejected');

// ---------- 3. YouTube queue (functions/api/youtube.js pure helpers) ----------
const YT = await imp('functions/api/youtube.js');
ok(YT.uploadsLeft(0) === 5 || YT.uploadsLeft(0) === 6, `quota: ≈ 6 uploads/day (got ${YT.uploadsLeft(0)})`);
ok(YT.uploadsLeft(9000) === 0, 'quota: nothing left near 10,000 units');
const now = Date.parse('2026-10-22T12:00:00Z');
const rows = [{ clip: 'a', status: 'queued', approved_at: 3 }, { clip: 'b', status: 'done', approved_at: 1 }, { clip: 'c', status: 'failed', attempts: 3, approved_at: 1 },
  { clip: 'd', status: 'failed', attempts: 1, approved_at: 2 }, { clip: 'e', status: 'uploading', session_at: now - 3 * 3600e3, approved_at: 4 }, { clip: 'f', status: 'uploading', session_at: now - 60e3, approved_at: 0 }];
ok(YT.pickNext(rows, 0, now).map(r => r.clip).join() === 'd,a,e', 'queue: oldest approval first; skips done, exhausted retries, fresh uploads');
ok(YT.pickNext(rows, 8000, now).length === 1 && YT.pickNext(rows, 9900, now).length === 0, 'queue: limited by remaining quota');
const res = YT.videoResource({ privacy: 'public', title: 't' }, { title: 'Hook <b>', description: 'Lesson', tags: ['a', 'b'] });
ok(res.status.privacyStatus === 'private', 'privacy: "public" is never sent (forced private)');
ok(res.status.containsSyntheticMedia === true && res.status.selfDeclaredMadeForKids === false && res.snippet.categoryId === '27' && res.snippet.defaultLanguage === 'en', 'metadata: AI disclosure, not for kids, Education, en');
ok(/#shorts/.test(res.snippet.description) && /https:\/\/lexkite\.com\//.test(res.snippet.description) && !/[<>]/.test(res.snippet.title), 'metadata: #shorts + deep link added, < > stripped');
const fut = new Date(Date.now() + 3 * 86400e3).toISOString();
ok(YT.videoResource({ privacy: 'private', publish_at: fut }).status.publishAt === fut, 'schedule: private + approved publishAt');
ok(!('publishAt' in YT.videoResource({ privacy: 'unlisted', publish_at: fut }).status), 'schedule: no publishAt on unlisted');
const iso = YT.slotToIso({ date: '2026-12-01', time: '19:00', tz: 'Asia/Ho_Chi_Minh' }, now);
ok(iso === '2026-12-01T12:00:00.000Z', `calendar slot → UTC publishAt (${iso})`);
ok(YT.slotToIso({ date: '2026-10-01', time: '19:00' }, now) === null, 'calendar slot in the past → no publishAt');
ok(/^\d{4}-\d{2}-\d{2}$/.test(YT.quotaDay(now)), 'quota day (Pacific)');
// endpoint guards
const env = { DB: null, DRIVE_ENC_KEY: Buffer.alloc(32, 1).toString('base64'), LEXKITE_DRIVE_CLI_KEY: 'x'.repeat(40), ADMIN_EMAILS: 'a@b.c' };
const post = async (body, headers = {}) => (await YT.onRequestPost({ request: new Request('https://lexkite.com/api/youtube', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://lexkite.com', ...headers }, body: JSON.stringify(body) }), env })).status;
ok(await post({ op: 'status' }) === 403, 'api: no admin token → 403');
ok(await post({ op: 'next' }, { 'X-Drive-Ts': String(Math.floor(Date.now() / 1000)), 'X-Drive-Sig': 'f'.repeat(64) }) === 403, 'api: bad CLI signature → 403');
const { driveSign } = await imp('scripts/video/library.mjs');
const t = JSON.stringify({ op: 'approve', ids: ['x-y-z'] });
ok((await YT.onRequestPost({ request: new Request('https://lexkite.com/api/youtube', { method: 'POST', headers: driveSign(env.LEXKITE_DRIVE_CLI_KEY, t), body: t }), env })).status === 403, 'api: CLI cannot approve (admin-only op)');

// ---------- 4. upload runner (mocked API + Drive + resumable PUT) ----------
const UP = await imp('scripts/video/yt-upload.mjs');
const spec = JSON.parse(fs.readFileSync(`${root}content/video/cine/news/${lid}.json`, 'utf8')), lines = JSON.parse(fs.readFileSync(`${root}content/video/cine/news/lines.json`, 'utf8'));
const meta = UP.metaFor(spec, lines);
ok(meta.title.length <= 100 && meta.title.length > 5 && /#shorts/.test(meta.description) && meta.description.includes(meta.url) && /AI-generated/.test(meta.description), 'metadata: hook title, deep link, #shorts, AI note');
const calls = [], idx = { items: [{ id: base, lesson: lid, drive: { video: { fileId: 'FILE1234567', sha256: 'aa' } } }, { id: 'cine-x-en', lesson: lid, drive: {} }] };
let quotaHit = false;
const api = async (op, b = {}) => {
  calls.push(op);
  if (op === 'next') return { channel: { title: 'Lexkite' }, quota: { left: 10000, uploads_left: 6 }, items: [{ id: base, lesson: lid, privacy: 'private' }, { id: 'cine-x-en', lesson: lid, privacy: 'private' }, { id: 'cine-q-en', lesson: lid, privacy: 'private' }] };
  if (op === 'session') { if (b.id === 'cine-q-en') { quotaHit = true; const e = new Error('q'); e.code = 'quota'; e.body = { quota: { left: 100 } }; throw e; } return { upload_url: 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=1' }; }
  if (op === 'done') return { privacy: 'private', thumb: 1, quota: { left: 8350, uploads_left: 5 } };
  return { ok: true };
};
idx.items.push({ id: 'cine-q-en', lesson: lid, drive: { video: { fileId: 'FILE7654321', sha256: 'bb' } } });
const rep = await UP.runUploads({ index: idx, api, fetchMaster: async (id, f) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, Buffer.alloc(10)); }, put: async () => ({ id: 'vid12345678' }), log: () => {}, work: tmp });
ok(rep.uploaded.length === 1 && rep.uploaded[0].video_id === 'vid12345678', 'runner: approved clip uploaded + done');
ok(rep.failed.includes('cine-x-en') && calls.includes('fail'), 'runner: clip without Drive master → fail (stays visible in queue)');
ok(quotaHit && rep.quota.left === 100, 'runner: quota exhausted → stop, report remaining quota');
// resumable PUT: first attempt drops, server has 0-4 → resume from byte 5
const seq = []; const buf = Buffer.from('0123456789');
const fetcher = async (u, init) => {
  seq.push(init.headers['Content-Range'] || 'full');
  if (seq.length === 1) throw new Error('reset');
  if (init.headers['Content-Range'] === 'bytes */10') return { status: 308, headers: { get: () => 'bytes=0-4' } };
  return { status: 200, json: async () => ({ id: 'resumed1234' }) };
};
const v = await UP.putResumable('https://up', buf, { fetcher, wait: 1 });
ok(v.id === 'resumed1234' && seq.join('|') === 'full|bytes */10|bytes 5-9/10', `resumable: resumes from received range (${seq.join('|')})`);
let exp = ''; try { await UP.putResumable('https://up', buf, { fetcher: async () => ({ status: 404 }), wait: 1 }); } catch (e) { exp = e.code; } ok(exp === 'expired', 'resumable: 404 session → expired (server reopens)');

// ---------- 5. archive policy + capacity ----------
const AR = await imp('scripts/video/shorts-archive.mjs');
const old = '2026-09-01T00:00:00Z', items = [
  { id: 'a', lesson: 'la', created: old, drive: { video: { sha256: 'v1' }, cover: { sha256: 'c1' } } },
  { id: 'b', lesson: 'lb', created: old, drive: { video: { sha256: 'v2' } } },
  { id: 'c', lesson: 'lc', created: new Date(now - 5 * 86400e3).toISOString(), drive: { video: { sha256: 'v3' } } },
  { id: 'd', lesson: 'ld', created: old, drive: { video: { sha256: 'v4', retired: '2026-10-01' } } },
  { id: 'e', lesson: 'le', created: old, youtube_id: 'abc', drive: { video: { sha256: 'v5' } } }];
const keep = AR.keepSet(items, { approved: ['la'], youtube: { approved: [], uploaded: {} } }), plan = AR.planArchive(items, keep, now);
ok(plan.promote.sort().join() === 'c1,v1,v5', 'archive: approved + published masters/covers → 2 copies');
ok(plan.retire.map(x => x.id).join() === 'b', 'archive: only unapproved > 30 days retire (new, retired, kept skipped)');
const DR = await imp('functions/api/drive.js');
const cap = DR.shortsCapacity([{ status: 'ok', weight: 100, quota_total: 15e9, quota_used: 1.2e9 }, { status: 'ok', weight: 0, quota_total: 15e9, quota_used: 0 }, { status: 'ok', weight: 100, quota_total: 15e9, quota_used: 14e9 }]);
ok(cap.clips === Math.floor(12.3e9 / 10485760), `capacity: ≈ ${cap.clips} clips (paused / ≥ 90 % Drives excluded)`);
ok(DR.isShortsRow({ cls: 'render', folder: 'shorts/news/x' }) && !DR.isShortsRow({ cls: 'original', folder: 'shorts/x' }) && !DR.isShortsRow({ cls: 'render', folder: 'stacked/clips' }), 'drive: CLI retire/link limited to shorts renders');
const p2 = DR.planRebalance([{ id: 1, status: 'ok', weight: 100, quota_total: 100, quota_used: 60 }, { id: 2, status: 'ok', weight: 100, quota_total: 100e9, quota_used: 0 }], []);
ok(Array.isArray(p2.plan), 'drive: rebalance plan callable for CLI background job');

// ---------- 6. web facade fallback (web/js/lesson-video.js, jsdom) ----------
async function facade({ ytOk, blocked = false, items }) {
  const dom = new JSDOM(`<!doctype html><html lang="${blocked ? 'zh' : 'en'}"><body><div class="lv-slot" hidden data-lv='{}'></div></body></html>`, { url: 'https://lexkite.com/app/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window; const st = { yt: 0, created: null };
  w.fetch = async () => ({ ok: true, json: async () => ({ items }) });
  w.navigator.sendBeacon = () => true;
  w.LkVideoRank = { rank: (its) => its.map(it => ({ it, s: 1 })) };
  w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; w.HTMLMediaElement.prototype.load = () => {};
  w.Intl = { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: blocked ? 'Asia/Shanghai' : 'Europe/Paris' }) }) };
  const realAppend = w.document.head.appendChild.bind(w.document.head);
  w.document.head.appendChild = el => { if (el.tagName === 'SCRIPT' && /iframe_api/.test(el.src)) { st.yt++; if (ytOk) setTimeout(() => { w.YT = { Player: function (id, o) { st.created = o; setTimeout(() => o.events.onReady({ target: { playVideo() {} } }), 5); this.destroy = () => {}; } }; w.onYouTubeIframeAPIReady(); }, 5); return el; } return realAppend(el); };
  w.eval(fs.readFileSync(`${root}web/js/lesson-video.js`, 'utf8'));
  w.LessonVideo.YT_WAIT = 60;
  await w.LessonVideo.scan(); const slot = w.document.querySelector('.lv-slot');
  slot.querySelector('.lv-card').click();
  return { w, st, slot };
}
const it0 = { ...man.items[0], test: false }, ytItem = { ...it0, youtube_id: 'dQw4w9WgXcQ' };
let f = await facade({ ytOk: true, items: [ytItem] });
ok(f.st.yt === 1 && f.slot.querySelector('.lv-yt img') && !f.slot.querySelector('video'), 'facade: poster first, IFrame API loaded on click, no <video>');
await new Promise(r => setTimeout(r, 40));
ok(f.st.created && f.st.created.host === 'https://www.youtube-nocookie.com' && f.st.created.playerVars.rel === 0 && f.st.created.playerVars.playsinline === 1 && f.st.created.playerVars.modestbranding === 1, 'facade: youtube-nocookie + rel=0, playsinline, modestbranding');
f.st.created.events.onStateChange({ data: 0 });
ok(!!f.slot.querySelector('.lv-after').textContent.trim() || !!f.slot.querySelector('.lv-after button'), 'facade: ended → quiz / next shown');
f = await facade({ ytOk: false, items: [ytItem] }); f.w.LessonVideo.YT_WAIT = 30;
await new Promise(r => setTimeout(r, 4200));
ok(f.slot.querySelector('video source') && f.slot.querySelector('video source').getAttribute('src') === it0.src, 'facade: YouTube not ready in 4 s → self-hosted rendition');
f = await facade({ ytOk: true, blocked: true, items: [ytItem] });
ok(f.st.yt === 0 && f.slot.querySelector('video source'), 'facade: China region / zh → self-hosted directly, YouTube never loaded');
f = await facade({ ytOk: true, items: [it0] });
ok(f.st.yt === 0 && f.slot.querySelector('video source'), 'facade: no youtube_id → self-hosted');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `✗ shorts-scale: ${fails}/${n} FAIL` : `✓ shorts-scale: ${n} checks`);
process.exit(fails ? 1 : 0);
