/* YouTube Data API v3 – upload ONLY owner-approved shorts (docs/YOUTUBE-SETUP.md, docs/VIDEO-STORAGE.md).
 * POST /api/youtube { op, ... }
 *   Admin (Firebase ID token, adminGate): status · connect (OAuth in the owner's own browser) · disconnect · approve {ids[], privacy, schedule}
 *     · unqueue {id} · queue · settings {privacy}
 *   CI (HMAC X-Drive-Ts/X-Drive-Sig with LEXKITE_DRIVE_CLI_KEY – same signing as /api/drive): ids · next {max} · session {id, meta} · done {id, video_id} · fail {id, error} · quota
 * Several channels: every channel the owner authorizes is kept (Google's consent covers ONE channel per grant; connect always asks prompt=select_account consent so
 *   the account/brand chooser shows again). yt_meta 'default_channel' = target of packs/Studio links/API uploads; sync reads ALL connected channels and stores the channel a video was found on (yt_queue.channel_id).
 *   Ops: setdefault {channel_id} · disconnect {channel_id} (DANGER: recent sign-in ≤ 15 min; revokes the token and deletes the row).
 * GET /api/youtube/callback – Google returns here → refresh token encrypted AES-GCM with DRIVE_ENC_KEY (AAD 'youtube:<channel>') in D1 yt_channel.
 * Bytes never pass through the Worker: CI PUTs the master straight into the resumable session that `session` opens (like the Drive pool).
 * Privacy: only 'private' (optionally with publishAt from the calendar slot the owner approved) or 'unlisted' – never 'public'.
 * Quota: 10,000 units/day (resets midnight Pacific); videos.insert ≈ 1,600, thumbnails.set 50, videos.list 1 → ≤ 6 uploads/day, rest stays queued.
 * OAuth client: YOUTUBE_CLIENT_ID/SECRET if set, else the Drive pool's client (GOOGLE_DRIVE_CLIENT_ID/SECRET – same Google Cloud project).
 * MODE (yt_meta 'mode', default env YOUTUBE_UPLOAD_MODE || 'manual'): until the API audit passes, uploads from an unverified project are locked
 *   private → 'manual': approve = "Ready to upload" + an upload pack (scripts/video/yt-pack.mjs, Drive pool shorts/_ytpack/<clip>.zip); the owner
 *   uploads in YouTube Studio as Unlisted; `sync` (admin button + youtube-manual.yml cron) reads the uploads playlist with youtube.readonly only,
 *   matches the description marker "lk:<clip>", checks unlisted/public + processing done + duration → status 'done' → op ids → web manifest
 *   embeds YouTube exactly like an API upload. 'api': the resumable upload path above (needs youtube.upload). Never browser bots / cookies. */
import { healthVerdict, localDate, localHM, normCfg } from './_distribution.js';
import { adminGate, adminAudit, adminCors } from './admin.js';
import { limit } from './sync.js';
import { signState, verifyState, encryptToken, decryptToken, cliVerify, driveMedia } from './drive.js';
import { manifest, signedPack } from './admin-shorts.js';

export const REDIRECT = 'https://lexkite.com/api/youtube/callback';
export const SCOPE_UP = 'https://www.googleapis.com/auth/youtube.upload', SCOPE_RO = 'https://www.googleapis.com/auth/youtube.readonly';
export const SCOPE = SCOPE_UP + ' ' + SCOPE_RO;
export const MODES = ['manual', 'api'];
export const scopeFor = mode => (mode === 'api' ? SCOPE : SCOPE_RO);
export const STUDIO = 'https://studio.youtube.com/';
export const QUOTA = { day: 10000, insert: 1600, thumb: 50, list: 1, reserve: 200 };
export const PRIVACY = ['private', 'unlisted'];
const STATE_TTL = 600, SESSION_TTL = 20 * 3600e3, MAX_TRIES = 3;
const json = (req, status, data, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(req), ...extra } });
const one = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).first()) || null;
const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];
const run = (db, sql, ...a) => db.prepare(sql).bind(...a).run();
const client = env => ({ id: env.YOUTUBE_CLIENT_ID || env.GOOGLE_DRIVE_CLIENT_ID, secret: env.YOUTUBE_CLIENT_SECRET || env.GOOGLE_DRIVE_CLIENT_SECRET });
const configured = env => { const c = client(env); return { client: !!c.id, secret: !!c.secret, key: !!env.DRIVE_ENC_KEY, db: !!env.DB }; };
const ready = env => Object.values(configured(env)).every(Boolean);
const CLIP = /^[a-z0-9-]{3,120}$/, CHID = /^[A-Za-z0-9_-]{8,64}$/;

export async function setup(db) {
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS yt_channel (id INTEGER PRIMARY KEY, channel_id TEXT UNIQUE, title TEXT, email TEXT, enc_token TEXT, iv TEXT, status TEXT, created INTEGER, last_ok INTEGER, err TEXT, by_who TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS yt_queue (clip TEXT PRIMARY KEY, lesson TEXT, status TEXT, privacy TEXT, publish_at TEXT, approved_by TEXT, approved_at INTEGER, video_id TEXT, upload_url TEXT, session_at INTEGER, attempts INTEGER DEFAULT 0, err TEXT, updated INTEGER, thumb INTEGER, title TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS yt_quota (day TEXT PRIMARY KEY, units INTEGER)'),
    db.prepare('CREATE TABLE IF NOT EXISTS yt_meta (k TEXT PRIMARY KEY, v TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS yt_nonce (n TEXT PRIMARY KEY, at INTEGER)'),
    db.prepare('CREATE TABLE IF NOT EXISTS clip_review (clip TEXT PRIMARY KEY, state TEXT, reason TEXT, web INTEGER, slot_date TEXT, slot_time TEXT, channel_id TEXT, deleted INTEGER DEFAULT 0, updated INTEGER, by_who TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS yt_chan_cfg (channel_id TEXT PRIMARY KEY, cfg TEXT, paused_reason TEXT, updated INTEGER)'),
    db.prepare('CREATE TABLE IF NOT EXISTS yt_rules (id INTEGER PRIMARY KEY AUTOINCREMENT, pos INTEGER, name TEXT, cond TEXT, channel_id TEXT, active INTEGER DEFAULT 1)'),
    db.prepare('CREATE TABLE IF NOT EXISTS yt_plan (clip TEXT PRIMARY KEY, channel_id TEXT, slot_ms INTEGER, source TEXT, rule INTEGER, why TEXT, updated INTEGER)'),
    db.prepare('CREATE TABLE IF NOT EXISTS yt_pack (clip TEXT PRIMARY KEY, file_id TEXT, drive_id TEXT, sha TEXT, bytes INTEGER, title TEXT, description TEXT, tags TEXT, at INTEGER, retired INTEGER DEFAULT 0, seen TEXT)'),
  ]);
  await addCols(db);
}

let COLS = false; // additive columns (idempotent: duplicate-column errors are expected after the first run)
async function addCols(db) { if (COLS) return; for (const q of ['ALTER TABLE yt_channel ADD COLUMN thumb TEXT', 'ALTER TABLE yt_queue ADD COLUMN channel_id TEXT']) { try { await db.prepare(q).run(); } catch (e) { /* exists */ } } COLS = true; }

// ---------- pure helpers (tested in scripts/test/shorts-scale.mjs) ----------
/** Quota day = calendar date in America/Los_Angeles (YouTube resets at midnight Pacific). */
export const quotaDay = (now = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
export const uploadsLeft = used => Math.max(0, Math.floor((QUOTA.day - QUOTA.reserve - (+used || 0)) / (QUOTA.insert + QUOTA.thumb + 2 * QUOTA.list)));
/** Calendar slot {date:'2026-10-25', time:'19:00', tz:'Asia/Ho_Chi_Minh'} → ISO UTC; null when invalid or not ≥ 15 min in the future. */
export function slotToIso(slot, now = Date.now()) {
  if (!slot || !/^\d{4}-\d{2}-\d{2}$/.test(slot.date || '') || !/^\d{2}:\d{2}$/.test(slot.time || '')) return null;
  const tz = slot.tz || 'Asia/Ho_Chi_Minh', guess = Date.parse(`${slot.date}T${slot.time}:00Z`);
  let off = 0;
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(guess)).map(x => [x.type, x.value]));
    off = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`) - guess;
  } catch (e) { return null; }
  const t = guess - off; if (!(t > now + 15 * 60e3)) return null;
  return new Date(t).toISOString().replace(/\.\d{3}Z$/, '.000Z');
}
const clean = (s, n) => String(s || '').replace(/[<>]/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
/** YouTube video resource for an approved queue row + CI metadata. Enforces: private|unlisted only, #shorts, Education, AI disclosure, not for kids. */
export function videoResource(row, meta = {}) {
  const privacy = PRIVACY.includes(row.privacy) ? row.privacy : 'private';
  let title = clean(meta.title, 100) || clean(row.title, 100) || 'English in 30 seconds';
  let desc = clean(meta.description, 4800);
  if (!/https:\/\/lexkite\.com\//.test(desc)) desc += '\n\nPractice it free: https://lexkite.com/';
  if (!/#shorts\b/i.test(desc)) desc += '\n#shorts';
  if (row.clip && !markersOf(desc).includes(row.clip)) desc += '\n' + markerLine(row.clip); // same marker as the manual pack → sync matches both paths
  let tags = (Array.isArray(meta.tags) ? meta.tags : []).map(t => clean(t, 30).replace(/[",]/g, '')).filter(Boolean), total = 0;
  tags = tags.filter(t => (total += t.length + 2) <= 450).slice(0, 30);
  const status = { privacyStatus: privacy, selfDeclaredMadeForKids: false, containsSyntheticMedia: true, embeddable: true, license: 'youtube' };
  if (privacy === 'private' && row.publish_at && Date.parse(row.publish_at) > Date.now()) status.publishAt = row.publish_at; // YouTube flips it public at that time (owner-approved schedule)
  return { snippet: { title, description: desc.slice(0, 5000), tags, categoryId: '27', defaultLanguage: 'en', defaultAudioLanguage: 'en' }, status };
}
/** Rows the CI may upload now (oldest approval first), within today's quota. */
export function pickNext(rows, used, now = Date.now(), max = 6) {
  const n = Math.min(max, uploadsLeft(used));
  const due = rows.filter(r => r.status === 'queued' || (r.status === 'failed' && (+r.attempts || 0) < MAX_TRIES) || (r.status === 'uploading' && now - (+r.session_at || 0) > 2 * 3600e3));
  return due.sort((a, b) => (+a.approved_at || 0) - (+b.approved_at || 0)).slice(0, n);
}

// ---------- manual path (Studio upload + read-only sync) – pure, tested in scripts/test/yt-manual.mjs ----------
export const markerLine = clip => 'lk:' + clip;
/** Clip ids from "lk:<clip>" marker lines/words in a description (unique, order kept). */
export function markersOf(desc) {
  const out = [], re = /(?:^|[\s(])lk:([a-z0-9-]{3,120})(?=$|[\s).,])/gm; let m;
  while ((m = re.exec(String(desc || '')))) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}
/** YouTube video id from a pasted link (watch, youtu.be, shorts, embed, live, Studio) or a bare 11-char id; '' when none. */
export function ytIdOf(s) {
  const t = String(s || '').trim(); if (/^[A-Za-z0-9_-]{11}$/.test(t)) return t;
  let u; try { u = new URL(/^https?:\/\//i.test(t) ? t : 'https://' + t); } catch (e) { return ''; }
  const h = u.hostname.replace(/^(www|m|music)\./, ''); let id = '';
  if (h === 'youtu.be') id = u.pathname.split('/')[1] || '';
  else if (h === 'youtube.com' || h === 'youtube-nocookie.com') id = u.searchParams.get('v') || ((/^\/(shorts|embed|live|v)\/([^/?#]+)/.exec(u.pathname) || [])[2]) || '';
  else if (h === 'studio.youtube.com') id = (/^\/video\/([^/?#]+)/.exec(u.pathname) || [])[1] || '';
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
}
/** ISO-8601 duration (PT1M5.5S) → seconds; NaN when unknown. */
export const isoSecs = d => { const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?$/.exec(String(d || '')); return m && d !== 'P' && d !== 'PT' ? ((+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0)) : NaN; };
export const DUR_TOL = 1.5;
/** Check one video against its clip → { status: 'done'|'detected', err }. Live = unlisted/public + processed + same length (±1.5 s). */
export function checkVideo(v, clipSecs) {
  if (!v) return { status: 'detected', err: 'missing' };
  if (v.privacy === 'private') return { status: 'detected', err: 'private' };
  if (!['unlisted', 'public'].includes(v.privacy)) return { status: 'detected', err: 'privacy-' + (v.privacy || 'unknown') };
  if (v.upload === 'rejected' || v.upload === 'failed' || v.processing === 'failed' || v.processing === 'terminated') return { status: 'detected', err: 'processing-failed' };
  if (v.processing !== 'succeeded' || (v.upload && v.upload !== 'processed')) return { status: 'detected', err: 'processing' };
  if (clipSecs > 0 && Number.isFinite(v.secs) && Math.abs(v.secs - clipSecs) > DUR_TOL) return { status: 'detected', err: 'wrong-file' };
  return { status: 'done', err: null };
}
/** Reconcile channel uploads with manual-path queue rows. uploads: [{video_id, title, description, privacy, at}] (uploads playlist);
 *  videos: {id: {privacy, processing, upload, secs}} (videos.list); secs: {clip: seconds}; manual: Set of clips on the manual path.
 *  complete: whole playlist scanned (→ a live clip whose video vanished is flagged). since: ms – older unmarked uploads are not flagged. */
export function reconcile({ rows = [], uploads = [], videos = {}, secs = {}, manual = new Set(), complete = false, since = 0 }) {
  const by = new Map(rows.map(r => [r.clip, r])), hits = new Map(), issues = [], updates = [], seen = new Set(uploads.map(u => u.video_id));
  for (const u of uploads) {
    const ids = markersOf(u.description);
    if (!ids.length) { if ((+u.at || 0) >= since && since) issues.push({ kind: 'no-marker', video_id: u.video_id, title: String(u.title || '').slice(0, 100) }); continue; }
    for (const c of ids) (hits.get(c) || hits.set(c, []).get(c)).push(u);
  }
  for (const [c, list] of hits) {
    const r = by.get(c);
    if (!r || !manual.has(c)) { if (!r) issues.push({ kind: 'unknown-clip', clip: c, video_id: list[0].video_id }); continue; }
    if (list.length > 1) issues.push({ kind: 'duplicate', clip: c, video_ids: list.map(u => u.video_id) });
  }
  for (const r of rows) {
    if (!manual.has(r.clip) || !['manual', 'detected', 'done'].includes(r.status)) continue;
    const list = hits.get(r.clip) || [];
    // several uploads with one marker → the one that passes the checks, else the newest
    let pick = list.find(u => checkVideo(videos[u.video_id], secs[r.clip]).status === 'done') || list.slice().sort((a, b) => (+b.at || 0) - (+a.at || 0))[0];
    let vid = pick ? pick.video_id : '';
    if (!vid && r.video_id && (videos[r.video_id] || (complete && !seen.has(r.video_id)))) vid = r.video_id; // pasted link / earlier match
    if (!vid) continue;
    const ck = checkVideo(videos[vid] || (pick ? { privacy: pick.privacy } : null), secs[r.clip]);
    if (ck.status !== r.status || ck.err !== (r.err || null) || vid !== r.video_id) updates.push({ clip: r.clip, status: ck.status, video_id: vid, privacy: (videos[vid] || pick || {}).privacy || r.privacy, err: ck.err, was: r.status });
    if (ck.err) issues.push({ kind: ck.err, clip: r.clip, video_id: vid });
  }
  return { updates, issues, matched: [...hits.keys()].filter(c => manual.has(c)).length };
}
/** Pipeline state shown per clip in the admin: ready (pack being made / ready) → uploaded (detected) → live (on the web). */
export function stateOf(row, pack, web = {}) {
  if (!row) return 'none';
  if (row.status === 'done' && row.video_id) return web[row.clip] === row.video_id ? 'live' : 'uploaded';
  if (row.status === 'detected') return 'uploaded';
  if (row.status === 'manual') return pack && pack.file_id ? 'ready' : 'packing';
  return row.status;
}

// ---------- Google ----------
const TOKS = new Map(); // channel_id → {t, exp} – memory only
async function gfetch(url, init) { const r = await fetch(url, init).catch(() => null); if (!r) { const e = new Error('google-network'); e.code = 'google-network'; throw e; } return r; }
/** Connected (ok) channels, default first. */
async function channelsOk(db) {
  const d = await getMeta(db, 'default_channel');
  return (await all(db, "SELECT * FROM yt_channel WHERE status = 'ok' ORDER BY id")).sort((a, b) => (b.channel_id === d) - (a.channel_id === d) || b.id - a.id);
}
/** The selected (default) channel, or a specific connected one by id. */
async function channelRow(db, id) { const l = await channelsOk(db); return id ? l.find(c => c.channel_id === id) || null : l[0] || null; }
async function accessToken(env, db, row) {
  const hit = TOKS.get(row.channel_id); if (hit && hit.exp > Date.now()) return hit.t;
  const c = client(env), refresh = await decryptToken(env, { ...row, email: row.channel_id }, 'youtube');
  const r = await gfetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: c.id, client_secret: c.secret, refresh_token: refresh, grant_type: 'refresh_token' }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    if (j.error === 'invalid_grant') await run(db, "UPDATE yt_channel SET status = 'disconnected', err = ? WHERE id = ?", 'Google revoked access / token expired – click Connect YouTube again', row.id);
    const e = new Error('google-token'); e.code = j.error === 'invalid_grant' ? 'yt-revoked' : 'google-token'; e.status = 409; throw e;
  }
  const t = { t: j.access_token, exp: Date.now() + Math.min((+j.expires_in || 3600) - 60, 50 * 60) * 1000 }; TOKS.set(row.channel_id, t);
  return t.t;
}
async function spend(db, units, now = Date.now()) {
  const d = quotaDay(now);
  await run(db, 'INSERT INTO yt_quota (day, units) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET units = units + excluded.units', d, units);
}
async function used(db, now = Date.now()) { const r = await one(db, 'SELECT units FROM yt_quota WHERE day = ?', quotaDay(now)); return r ? +r.units : 0; }
async function quotaInfo(db) { const u = await used(db); return { day: quotaDay(), used: u, limit: QUOTA.day, left: Math.max(0, QUOTA.day - u), uploads_left: uploadsLeft(u), per_upload: QUOTA.insert + QUOTA.thumb }; }

export async function modeOf(db, env = {}) {
  const r = await one(db, "SELECT v FROM yt_meta WHERE k = 'mode'").catch(() => null);
  return MODES.includes(r && r.v) ? r.v : MODES.includes(env.YOUTUBE_UPLOAD_MODE) ? env.YOUTUBE_UPLOAD_MODE : 'manual';
}
const setMeta = (db, k, v) => run(db, 'INSERT INTO yt_meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', k, v);
const getMeta = async (db, k) => { const r = await one(db, 'SELECT v FROM yt_meta WHERE k = ?', k); return r ? r.v : null; };
/** Kick a workflow now (pack builder) – best-effort with the existing GH_DISPATCH_TOKEN; the cron catches up otherwise. */
export async function kick(env, wf) {
  if (!env.GH_DISPATCH_TOKEN) return false;
  const r = await fetch(`https://api.github.com/repos/lexkiteapp/lexkiteapp.github.io/actions/workflows/${wf}/dispatches`, { method: 'POST', headers: { Authorization: 'Bearer ' + env.GH_DISPATCH_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'lexkite-youtube', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: 'main' }) }).catch(() => null);
  return !!(r && (r.status === 204 || r.ok));
}
async function clipSecs(env) { try { const m = await manifest(env); return Object.fromEntries((m.items || []).filter(x => +x.duration > 0).map(x => [x.id, +x.duration])); } catch (e) { return {}; } }
async function videosInfo(at, ids, db) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const part = ids.slice(i, i + 50);
    const r = await gfetch('https://www.googleapis.com/youtube/v3/videos?part=status,processingDetails,contentDetails,snippet&maxResults=50&id=' + part.map(encodeURIComponent).join(','), { headers: { Authorization: 'Bearer ' + at } });
    await spend(db, QUOTA.list); if (!r.ok) continue;
    for (const v of (await r.json().catch(() => ({}))).items || []) out[v.id] = { privacy: (v.status || {}).privacyStatus, upload: (v.status || {}).uploadStatus, processing: (v.processingDetails || {}).processingStatus || ((v.status || {}).uploadStatus === 'processed' ? 'succeeded' : ''), secs: isoSecs((v.contentDetails || {}).duration), channel: (v.snippet || {}).channelId };
  }
  return out;
}
/** Read-only sync of ALL connected channels (youtube.readonly): uploads playlists (1 unit/50 videos) → markers → videos.list (1 unit/50) → reconcile → queue rows (+ the channel each video was found on). */
export async function syncChannel(env, db, { pages = 4, only = '' } = {}) {
  const chs = (await channelsOk(db)).filter(c => !only || c.channel_id === only); if (!chs.length) return { status: 412, error: 'not-connected' };
  const uploads = [], onCh = new Map(), tokens = new Map(), per = []; let complete = !only; // one channel scanned → never flag other channels' videos as missing
  for (const ch of chs) {
    let at; try { at = await accessToken(env, db, ch); } catch (e) { if (chs.length === 1) throw e; complete = false; per.push({ channel_id: ch.channel_id, title: ch.title, error: e.code || 'error' }); continue; }
    tokens.set(ch.channel_id, at);
    const list = 'UU' + String(ch.channel_id).slice(2), mine = []; let token = '', done = false, err = '';
    for (let p = 0; p < Math.min(Math.max(1, +pages || 4), 40); p++) {
      const r = await gfetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,status,contentDetails&maxResults=50&playlistId=${encodeURIComponent(list)}${token ? '&pageToken=' + encodeURIComponent(token) : ''}`, { headers: { Authorization: 'Bearer ' + at } });
      await spend(db, QUOTA.list);
      if (r.status === 404) { done = true; break; } // channel without uploads yet
      if (!r.ok) { err = r.status === 403 ? 'yt-forbidden' : 'google-list'; if (chs.length === 1) { const e = new Error('google-list'); e.code = err; e.status = 502; throw e; } break; }
      const j = await r.json().catch(() => ({}));
      for (const it of j.items || []) { const sn = it.snippet || {}, vid = (it.contentDetails || {}).videoId || (sn.resourceId || {}).videoId; if (vid) mine.push({ video_id: vid, title: sn.title, description: sn.description, privacy: (it.status || {}).privacyStatus, at: Date.parse(sn.publishedAt || '') || 0 }); }
      token = j.nextPageToken || ''; if (!token) { done = true; break; }
    }
    if (!done) complete = false;
    for (const u of mine) if (!onCh.has(u.video_id)) { onCh.set(u.video_id, ch.channel_id); uploads.push(u); }
    per.push({ channel_id: ch.channel_id, title: ch.title, scanned: mine.length, ...(err ? { error: err } : {}) });
  }
  if (!tokens.size) return { status: 409, error: 'yt-revoked' };
  const rows = await all(db, 'SELECT clip, status, privacy, video_id, err, approved_at FROM yt_queue');
  const manual = new Set((await all(db, 'SELECT clip FROM yt_pack')).map(r => r.clip)), mrows = rows.filter(r => manual.has(r.clip));
  const want = new Set();
  for (const u of uploads) if (markersOf(u.description).some(c => manual.has(c))) want.add(u.video_id);
  for (const r of mrows) if (r.video_id) want.add(r.video_id);
  const videos = {};
  for (const [cid, at] of tokens) {
    const ids = [...want].filter(i => !videos[i]); if (!ids.length) break;
    for (const [id, v] of Object.entries(await videosInfo(at, ids, db))) if (!v.channel || v.channel === cid) { videos[id] = v; onCh.set(id, cid); } // only our own channels count
  }
  const since = Math.min(...mrows.map(r => +r.approved_at || Infinity));
  const rec = reconcile({ rows, uploads, videos, secs: await clipSecs(env), manual, complete, since: Number.isFinite(since) ? since : 0 }), now = Date.now();
  for (const u of rec.updates) await run(db, 'UPDATE yt_queue SET status = ?, video_id = ?, privacy = ?, err = ?, updated = ?, channel_id = COALESCE(?, channel_id) WHERE clip = ?', u.status, u.video_id, u.privacy || 'unlisted', u.err, now, onCh.get(u.video_id) || null, u.clip);
  const plan = await planInfo(db);
  for (const u of rec.updates) { const pl = plan.get(u.clip), found = onCh.get(u.video_id); if (pl && pl.channel_id && found && found !== pl.channel_id) rec.issues.push({ kind: 'wrong-channel', clip: u.clip, video_id: u.video_id, expected: pl.title || pl.channel_id }); }
  const live = rec.updates.filter(u => u.status === 'done' && u.was !== 'done').map(u => u.clip);
  const sum = { at: now, scanned: uploads.length, complete, matched: rec.matched, updated: rec.updates.length, live, issues: rec.issues.slice(0, 40), channels: per };
  sum.paused = await healthCheck(db, per);
  await setMeta(db, 'sync', JSON.stringify(sum)); for (const cid of tokens.keys()) await run(db, 'UPDATE yt_channel SET last_ok = ? WHERE channel_id = ?', now, cid);
  return { ok: true, ...sum, quota: await quotaInfo(db) };
}
/** "Post to channel X at HH:mm" for a pack card: slot shown in the channel's own time zone. */
async function planFor(db, p) { if (!p || !p.channel_id) return null; const { cfg } = await chanCfg(db, p.channel_id); return { channel_id: p.channel_id, channel: p.title || p.channel_id, at: p.slot_ms ? localDate(p.slot_ms, cfg.tz) + ' ' + localHM(p.slot_ms, cfg.tz) : '', tz: cfg.tz, studio: `https://studio.youtube.com/channel/${p.channel_id}/videos/upload?d=ud` }; }
async function counts(db) {
  const q = Object.fromEntries((await all(db, 'SELECT status, COUNT(*) AS n FROM yt_queue GROUP BY status')).map(r => [r.status, r.n]));
  const m = (await one(db, "SELECT SUM(q.status = 'manual' AND p.file_id IS NOT NULL) AS ready, SUM(q.status = 'manual' AND p.file_id IS NULL) AS packing, SUM(q.status = 'detected') AS uploaded, SUM(q.status = 'done') AS live, SUM(q.err IS NOT NULL AND q.status != 'done') AS issues FROM yt_pack p JOIN yt_queue q ON q.clip = p.clip")) || {};
  return { queue: q, manual: { ready: +m.ready || 0, packing: +m.packing || 0, uploaded: +m.uploaded || 0, live: +m.live || 0, issues: +m.issues || 0 } };
}

/** Approve clips (admin op + bulk). Review overlay (clip_review) wins over the manifest: rejected / paused / deleted clips are skipped; a bulk-set slot replaces the manifest slot. */
export async function approveClips(db, b, who, env) {
  const ids = (Array.isArray(b.ids) ? b.ids : []).map(String).filter(x => CLIP.test(x)).slice(0, 100);
  if (!ids.length) return { status: 400, error: 'bad-input' };
  const st = await one(db, "SELECT v FROM yt_meta WHERE k = 'privacy'");
  const manual = (await modeOf(db, env)) === 'manual';
  const privacy = manual ? 'unlisted' : PRIVACY.includes(b.privacy) ? b.privacy : (st && st.v) || 'private';
  const m = await manifest(env), by = new Map((m.items || []).map(x => [x.id, { ...x }])), now = Date.now(), out = { queued: [], skipped: [] };
  const rvs = new Map((await all(db, 'SELECT * FROM clip_review WHERE clip IN (' + ids.map(() => '?').join(',') + ')', ...ids)).map(r => [r.clip, r]));
  for (const id of ids) {
    const it = by.get(id), rv = rvs.get(id);
    if (it && rv && rv.slot_date) it.slot = { date: rv.slot_date, time: rv.slot_time || '19:00', tz: 'Asia/Ho_Chi_Minh' };
    if (rv && (rv.deleted || rv.state === 'rejected' || rv.state === 'paused')) { out.skipped.push({ id, why: rv.deleted ? 'deleted' : rv.state }); continue; }
    if (!it || !it.qa || it.qa.status !== 'pass' || it.rejected) { out.skipped.push({ id, why: !it ? 'unknown' : it.rejected ? 'rejected' : 'qa' }); continue; }
    if (!it.drive || !it.drive.video || it.drive.video.retired) { out.skipped.push({ id, why: 'no-master' }); continue; }
    const old = await one(db, 'SELECT status FROM yt_queue WHERE clip = ?', id);
    if (old && (old.status === 'done' || old.status === 'uploading' || (manual && old.status === 'detected'))) { out.skipped.push({ id, why: old.status }); continue; }
    if (manual) { // "Ready to upload": pack (yt-pack.mjs) + owner uploads in Studio as Unlisted; sync detects the marker
      await run(db, `INSERT INTO yt_queue (clip, lesson, status, privacy, approved_by, approved_at, attempts, updated, title) VALUES (?, ?, 'manual', 'unlisted', ?, ?, 0, ?, ?)
        ON CONFLICT(clip) DO UPDATE SET status = 'manual', privacy = 'unlisted', publish_at = NULL, approved_by = excluded.approved_by, approved_at = excluded.approved_at, err = NULL, upload_url = NULL, updated = excluded.updated`,
        id, it.lesson || '', who.email, now, now, String(it.title || '').slice(0, 100));
      await run(db, 'INSERT INTO yt_pack (clip, at) VALUES (?, ?) ON CONFLICT(clip) DO NOTHING', id, now);
      out.queued.push({ id, privacy, manual: true }); continue;
    }
    const pa = privacy === 'private' && b.schedule === 'calendar' ? slotToIso(it.slot, now) : null;
    await run(db, `INSERT INTO yt_queue (clip, lesson, status, privacy, publish_at, approved_by, approved_at, attempts, updated, title) VALUES (?, ?, 'queued', ?, ?, ?, ?, 0, ?, ?)
      ON CONFLICT(clip) DO UPDATE SET status = 'queued', privacy = excluded.privacy, publish_at = excluded.publish_at, approved_by = excluded.approved_by, approved_at = excluded.approved_at, attempts = 0, err = NULL, upload_url = NULL, updated = excluded.updated`,
      id, it.lesson || '', privacy, pa, who.email, now, now, String(it.title || '').slice(0, 100));
    out.queued.push({ id, privacy, publish_at: pa });
  }
  const kicked = manual && out.queued.length ? await kick(env, 'youtube-manual.yml') : false;
  return { ok: true, ...out, mode: manual ? 'manual' : 'api', kicked, quota: await quotaInfo(db) };
}
/** Drop a clip from the YouTube queue while it has not been uploaded yet. */
export async function unqueueClip(db, id) {
  await run(db, "DELETE FROM yt_queue WHERE clip = ? AND status IN ('queued', 'failed', 'manual')", id);
  await run(db, "DELETE FROM yt_pack WHERE clip = ? AND NOT EXISTS (SELECT 1 FROM yt_queue WHERE clip = ?)", id, id);
}

// ---------- distribution hooks (config lives in yt_chan_cfg; engine in _distribution.js, ops in distribution.js) ----------
export async function chanCfg(db, id) { const r = await one(db, 'SELECT cfg, paused_reason FROM yt_chan_cfg WHERE channel_id = ?', id); let c = {}; try { c = JSON.parse((r && r.cfg) || '{}'); } catch (e) { /* default */ } return { cfg: normCfg(c), paused_reason: (r && r.paused_reason) || '' }; }
/** Pause a channel (cfg.active = 0) and raise an admin alert (yt_meta 'alerts', newest first, ≤ 20). */
export async function pauseChannel(db, id, reason) {
  const { cfg } = await chanCfg(db, id), t = await one(db, 'SELECT title FROM yt_channel WHERE channel_id = ?', id);
  await run(db, 'INSERT INTO yt_chan_cfg (channel_id, cfg, paused_reason, updated) VALUES (?, ?, ?, ?) ON CONFLICT(channel_id) DO UPDATE SET cfg = excluded.cfg, paused_reason = excluded.paused_reason, updated = excluded.updated', id, JSON.stringify({ ...cfg, active: 0 }), reason, Date.now());
  let al = []; try { al = JSON.parse((await getMeta(db, 'alerts')) || '[]'); } catch (e) { /* reset */ }
  await setMeta(db, 'alerts', JSON.stringify([{ at: Date.now(), channel_id: id, title: (t && t.title) || id, reason }, ...al].slice(0, 20)));
}
/** After sync: pause channels that errored with forbidden / revoked or have many failed uploads. Returns the channels paused. */
export async function healthCheck(db, per = []) {
  const paused = [];
  for (const p of per) {
    const failed = (await one(db, "SELECT COUNT(*) AS n FROM yt_plan p JOIN yt_queue q ON q.clip = p.clip WHERE p.channel_id = ? AND q.status = 'failed' AND q.attempts >= 3", p.channel_id) || {}).n || 0, why = healthVerdict({ error: p.error, failed });
    if (why && (await chanCfg(db, p.channel_id)).cfg.active) { await pauseChannel(db, p.channel_id, why); paused.push(p.channel_id); }
  }
  return paused;
}
const planInfo = async db => { const m = new Map(); for (const r of await all(db, 'SELECT p.clip, p.channel_id, p.slot_ms, c.title FROM yt_plan p LEFT JOIN yt_channel c ON c.channel_id = p.channel_id')) m.set(r.clip, r); return m; };

// ---------- ops ----------
const ADMIN_OPS = {
  async status(db, b, who, env) {
    const def = await channelRow(db), nv = Object.fromEntries((await all(db, 'SELECT channel_id, COUNT(*) AS n FROM yt_queue WHERE channel_id IS NOT NULL GROUP BY channel_id')).map(r => [r.channel_id, r.n]));
    const channels = (await all(db, 'SELECT channel_id, title, status, thumb, created, last_ok, err FROM yt_channel ORDER BY id')).map(r => ({ ...r, is_default: !!def && r.channel_id === def.channel_id, videos: nv[r.channel_id] || 0 }));
    const ch = channels.find(r => r.is_default) || channels[channels.length - 1] || null; // legacy single-channel field = the selected one
    const c = await counts(db), st = await getMeta(db, 'privacy'), mode = await modeOf(db, env), scope = await getMeta(db, 'scope');
    let sync = null; try { sync = JSON.parse(await getMeta(db, 'sync') || 'null'); } catch (e) { /* bỏ qua */ }
    let alerts = []; try { alerts = JSON.parse((await getMeta(db, 'alerts')) || '[]'); } catch (e) { /* none */ }
    return { configured: configured(env), redirect: REDIRECT, channel: ch, channels, alerts, quota: await quotaInfo(db), queue: c.queue, manual: c.manual, sync, studio: STUDIO,
      settings: { privacy: st || 'private', mode }, scope: { granted: scope || '', needed: scopeFor(mode), ok: !!scope && scopeFor(mode).split(' ').every(x => scope.split(' ').includes(x)) } };
  },
  async connect(db, b, who, env) {
    if (!ready(env)) return { status: 412, error: 'not-configured', configured: configured(env) };
    const { state, nonce } = await signState(env, who.email);
    const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: client(env).id, redirect_uri: REDIRECT, response_type: 'code', scope: scopeFor(await modeOf(db, env)), access_type: 'offline', prompt: 'select_account consent', include_granted_scopes: 'false', state });
    return { url, _cookie: `lk_yt=${nonce}; Path=/api/youtube; Max-Age=${STATE_TTL}; HttpOnly; Secure; SameSite=Lax` };
  },
  /** DANGER (recent sign-in): revoke this channel's Google token and delete its row. */
  async disconnect(db, b, who, env) {
    const id = b.channel_id == null ? '' : String(b.channel_id);
    if (id && !CHID.test(id)) return { status: 400, error: 'bad-input' };
    const ch = id ? await one(db, 'SELECT * FROM yt_channel WHERE channel_id = ?', id) : await channelRow(db); if (!ch) return { ok: true };
    try { const t = await decryptToken(env, { ...ch, email: ch.channel_id }, 'youtube'); await gfetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(t), { method: 'POST' }); } catch (e) { /* revoke best-effort */ }
    await run(db, 'DELETE FROM yt_channel WHERE id = ?', ch.id); TOKS.delete(ch.channel_id);
    if ((await getMeta(db, 'default_channel')) === ch.channel_id) await run(db, "DELETE FROM yt_meta WHERE k = 'default_channel'"); // channelRow falls back to the newest connected one
    return { ok: true };
  },
  /** The channel used for packs, Studio links and API uploads. */
  async setdefault(db, b) {
    const id = String(b.channel_id || ''); if (!CHID.test(id)) return { status: 400, error: 'bad-input' };
    if (!(await channelRow(db, id))) return { status: 404, error: 'not-found' };
    await setMeta(db, 'default_channel', id); return { ok: true, channel_id: id };
  },
  async settings(db, b) {
    if (b.mode != null) { if (!MODES.includes(b.mode)) return { status: 400, error: 'bad-input' }; await setMeta(db, 'mode', b.mode); return { ok: true, mode: b.mode }; } // 'api' only once the audit passed (docs/YOUTUBE-SETUP.md §3)
    if (!PRIVACY.includes(b.privacy)) return { status: 400, error: 'bad-input' };
    await setMeta(db, 'privacy', b.privacy);
    return { ok: true, privacy: b.privacy };
  },
  /** "Duyệt & lên YouTube": owner approval → queue. privacy private|unlisted; schedule 'calendar' → publishAt = the clip's calendar slot (private until then). */
  async approve(db, b, who, env) { return approveClips(db, b, who, env); },
  async unqueue(db, b) { if (!CLIP.test(String(b.id || ''))) return { status: 400, error: 'bad-input' }; await unqueueClip(db, b.id); return { ok: true }; },
  /** Manual path cards: state, pack link (signed, 2 h), texts to copy, issues. */
  async packs(db, b, who, env) {
    const rows = await all(db, `SELECT q.clip, q.lesson, q.status, q.privacy, q.video_id, q.err, q.channel_id, q.approved_at, q.updated, q.title AS qtitle, p.file_id, p.drive_id, p.bytes, p.title, p.description, p.tags, p.at, p.retired
      FROM yt_pack p JOIN yt_queue q ON q.clip = p.clip ORDER BY (q.status = 'done'), q.approved_at DESC LIMIT 300`);
    const out = [], plan = await planInfo(db), only = CHID.test(String(b.channel_id || '')) ? b.channel_id : '';
    for (const r of rows) {
      const pc = (plan.get(r.clip) || {}).channel_id || r.channel_id || null; if (only && pc && pc !== only) continue;
      const url = r.file_id && !r.retired ? await signedPack(env, { fileId: r.file_id, driveId: r.drive_id }, r.clip) : null;
      let tags = []; try { tags = JSON.parse(r.tags || '[]'); } catch (e) { /* bỏ qua */ }
      out.push({ id: r.clip, lesson: r.lesson, status: r.status, video_id: r.video_id, err: r.err, approved_at: r.approved_at, updated: r.updated, pack: url, bytes: r.bytes, ready: !!r.file_id, retired: !!r.retired,
        title: r.title || r.qtitle || '', description: r.description || '', tags, marker: markerLine(r.clip), state: stateOf(r, r), plan: await planFor(db, plan.get(r.clip)) });
    }
    const ch = await channelRow(db, CHID.test(String(b.channel_id || '')) ? b.channel_id : '');
    return { rows: out, studio: ch ? `https://studio.youtube.com/channel/${ch.channel_id}/videos/upload?d=ud` : STUDIO, ...(await counts(db)) };
  },
  async sync(db, b, who, env) { return syncChannel(env, db, { pages: b.full ? 40 : 4, only: CHID.test(String(b.channel_id || '')) ? b.channel_id : '' }); }, // "Chọn kênh YouTube" → only that channel
  /** Fallback: paste the YouTube link for a clip (verified on our channel when connected; otherwise trusted as unlisted). */
  async link(db, b, who, env) {
    const id = String(b.id || ''), vid = ytIdOf(b.url);
    if (!CLIP.test(id) || !vid) return { status: 400, error: 'bad-input' };
    const row = await one(db, 'SELECT clip, status FROM yt_queue WHERE clip = ?', id); if (!row) return { status: 404, error: 'not-approved' };
    await run(db, 'INSERT INTO yt_pack (clip, at) VALUES (?, ?) ON CONFLICT(clip) DO NOTHING', id, Date.now());
    const chs = await channelsOk(db); let ck = { status: 'done', err: 'unverified' }, privacy = 'unlisted', found = null;
    if (chs.length) { // selected channel first; the video may live on any connected channel (private ones are only visible to their own token)
      let v = null;
      for (const ch of chs) {
        let x; try { x = (await videosInfo(await accessToken(env, db, ch), [vid], db))[vid]; } catch (e) { continue; }
        if (x && x.channel === ch.channel_id) { v = x; found = ch.channel_id; break; }
        if (x && !v) v = x;
      }
      if (v && v.channel && !found) return { status: 409, error: 'other-channel' };
      ck = checkVideo(v, (await clipSecs(env))[id]); privacy = (v && v.privacy) || 'unknown';
    }
    await run(db, 'UPDATE yt_queue SET status = ?, video_id = ?, privacy = ?, err = ?, updated = ?, channel_id = COALESCE(?, channel_id) WHERE clip = ?', ck.status, vid, PRIVACY.concat('public').includes(privacy) ? privacy : 'unlisted', ck.err, Date.now(), found, id);
    return { ok: true, id, video_id: vid, status: ck.status, err: ck.err, channel_id: found };
  },
  async queue(db) {
    const rows = await all(db, 'SELECT clip, lesson, status, privacy, publish_at, approved_by, approved_at, video_id, attempts, err, updated, thumb FROM yt_queue ORDER BY approved_at DESC LIMIT 500');
    return { rows, quota: await quotaInfo(db) };
  },
};

const CLI_OPS = {
  /** approved/uploaded ids (shorts-archive.mjs keeps 2 copies of these; web-rendition.mjs adds youtube_id when the video is watchable). */
  async ids(db) {
    const rows = await all(db, 'SELECT clip, lesson, status, privacy, publish_at, video_id, channel_id FROM yt_queue'), now = Date.now();
    const web = {}, off = new Set((await all(db, 'SELECT clip FROM clip_review WHERE web = 0 OR deleted > 0')).map(r => r.clip));
    const embed = new Set(); for (const c of await all(db, 'SELECT channel_id, cfg FROM yt_chan_cfg')) { try { const x = JSON.parse(c.cfg || '{}'); if (x.role === 'embed' && x.active !== 0) embed.add(c.channel_id); } catch (e) { /* skip */ } }
    for (const r of rows) if (!off.has(r.clip) && embed.has(r.channel_id) && r.status === 'done' && r.video_id && (r.privacy === 'unlisted' || r.privacy === 'public' || (r.publish_at && Date.parse(r.publish_at) <= now))) { web[r.clip] = r.video_id; if (r.lesson) web[r.lesson] = r.video_id; }
    const purge = (await all(db, 'SELECT clip FROM clip_review WHERE deleted = 2')).map(r => r.clip); // "Xóa hẳn" → shorts-archive.mjs trashes Drive files + drops the recipe, then op purged
    return { purge, approved: rows.map(r => r.clip), uploaded: Object.fromEntries(rows.filter(r => r.video_id).map(r => [r.clip, r.video_id])), web };
  },
  async quota(db) { return { quota: await quotaInfo(db) }; },
  /** shorts-archive.mjs: Drive files of these hard-deleted clips are in the trash and the recipe is gone → deleted = 3 (purged, kept as a tombstone). */
  async purged(db, b) { const ids = (Array.isArray(b.ids) ? b.ids : []).map(String).filter(x => CLIP.test(x)).slice(0, 200); for (const id of ids) await run(db, 'UPDATE clip_review SET deleted = 3, updated = ? WHERE clip = ? AND deleted = 2', Date.now(), id); return { ok: true, count: ids.length }; },
  async next(db, b, who, env) {
    if ((await modeOf(db, env)) !== 'api') return { items: [], quota: await quotaInfo(db), channel: null, mode: 'manual' }; // manual mode: owner uploads in Studio
    const ch = await channelRow(db); if (!ch) return { items: [], quota: await quotaInfo(db), channel: null };
    const rows = await all(db, "SELECT * FROM yt_queue WHERE status IN ('queued', 'failed', 'uploading')");
    const pick = pickNext(rows, await used(db), Date.now(), Math.min(Math.max(1, +b.max || 6), 6));
    return { items: pick.map(r => ({ id: r.clip, lesson: r.lesson, privacy: r.privacy, publish_at: r.publish_at, resume: !!(r.upload_url && Date.now() - r.session_at < SESSION_TTL) })), quota: await quotaInfo(db), channel: { title: ch.title } };
  },
  /** Open (or resume) the resumable upload session → upload_url for CI. Quota is charged once per new session. */
  async session(db, b, who, env) {
    const row = await one(db, 'SELECT * FROM yt_queue WHERE clip = ?', String(b.id || ''));
    if (!row || !['queued', 'failed', 'uploading'].includes(row.status)) return { status: 409, error: 'not-approved' };
    if (row.upload_url && Date.now() - row.session_at < SESSION_TTL) return { upload_url: row.upload_url, resumed: true };
    if (uploadsLeft(await used(db)) < 1) return { status: 429, error: 'quota', quota: await quotaInfo(db) };
    const size = Math.floor(+((b.meta || {}).size) || 0); if (!(size > 0 && size < 256 * 1048576)) return { status: 400, error: 'bad-size' };
    const ch = await channelRow(db); if (!ch) return { status: 412, error: 'not-connected' };
    const at = await accessToken(env, db, ch), res = videoResource(row, b.meta || {});
    const r = await gfetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', { method: 'POST', headers: { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Length': String(size), 'X-Upload-Content-Type': 'video/mp4' }, body: JSON.stringify(res) });
    await spend(db, QUOTA.insert);
    const loc = r.headers.get('Location') || '';
    if (!r.ok || !/^https:\/\/www\.googleapis\.com\/upload\/youtube\/v3\/videos\?/.test(loc)) {
      const j = await r.json().catch(() => ({})), reason = ((((j.error || {}).errors) || [])[0] || {}).reason || String(r.status);
      await run(db, "UPDATE yt_queue SET status = 'failed', attempts = attempts + 1, err = ?, updated = ? WHERE clip = ?", 'session: ' + reason, Date.now(), row.clip);
      return { status: 502, error: 'session-failed', reason };
    }
    await run(db, "UPDATE yt_queue SET status = 'uploading', upload_url = ?, session_at = ?, updated = ?, title = ? WHERE clip = ?", loc, Date.now(), Date.now(), res.snippet.title, row.clip);
    return { upload_url: loc, privacy: res.status.privacyStatus, publish_at: res.status.publishAt || null };
  },
  /** CI finished the PUT: confirm the video on our channel, set the cover as custom thumbnail (if the channel allows), mark done. */
  async done(db, b, who, env) {
    const row = await one(db, 'SELECT * FROM yt_queue WHERE clip = ?', String(b.id || '')), vid = String(b.video_id || '');
    if (!row || !/^[A-Za-z0-9_-]{6,20}$/.test(vid)) return { status: 400, error: 'bad-input' };
    const ch = await channelRow(db); if (!ch) return { status: 412, error: 'not-connected' };
    const at = await accessToken(env, db, ch);
    const v = await gfetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${encodeURIComponent(vid)}`, { headers: { Authorization: 'Bearer ' + at } }); await spend(db, QUOTA.list);
    const it = ((await v.json().catch(() => ({}))).items || [])[0];
    if (!it || (it.snippet || {}).channelId !== ch.channel_id) return { status: 404, error: 'video-not-found' };
    let thumb = 0, note = null;
    const m = await manifest(env).catch(() => ({ items: [] })), c = ((m.items || []).find(x => x.id === row.clip) || {}).drive;
    if (c && c.cover && c.cover.fileId) {
      try {
        const img = await driveMedia(env, c.cover.driveId, c.cover.fileId);
        if (img.ok) {
          const t = await gfetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(vid)}&uploadType=media`, { method: 'POST', headers: { Authorization: 'Bearer ' + at, 'Content-Type': 'image/jpeg' }, body: await img.arrayBuffer() });
          await spend(db, QUOTA.thumb); thumb = t.ok ? 1 : 0; if (!t.ok) note = 'thumbnail ' + t.status + (t.status === 403 ? ' (verify the channel to allow custom thumbnails)' : '');
        }
      } catch (e) { note = 'thumbnail error'; }
    }
    await run(db, "UPDATE yt_queue SET status = 'done', video_id = ?, upload_url = NULL, updated = ?, thumb = ?, err = ? WHERE clip = ?", vid, Date.now(), thumb, note, row.clip);
    await run(db, 'UPDATE yt_channel SET last_ok = ? WHERE id = ?', Date.now(), ch.id);
    return { ok: true, video_id: vid, privacy: (it.status || {}).privacyStatus, thumb, note, quota: await quotaInfo(db) };
  },
  async sync(db, b, who, env) { return syncChannel(env, db, { pages: b.full ? 40 : 4 }); },
  /** Pack builder (scripts/video/yt-pack.mjs): clips waiting for a pack + packs of live clips to retire (Drive trash after 3 days on the web). */
  async packs(db, b, who, env) {
    const todo = await all(db, "SELECT p.clip AS id, q.lesson, pl.channel_id FROM yt_pack p JOIN yt_queue q ON q.clip = p.clip LEFT JOIN yt_plan pl ON pl.clip = p.clip WHERE q.status = 'manual' AND p.file_id IS NULL ORDER BY q.approved_at LIMIT 20");
    for (const t of todo) t.role = t.channel_id ? (await chanCfg(db, t.channel_id)).cfg.role : 'embed'; // manual path = unlisted → embed unless planned to a social channel
    const retire = await all(db, "SELECT p.clip AS id, p.sha FROM yt_pack p JOIN yt_queue q ON q.clip = p.clip WHERE q.status = 'done' AND q.err IS NULL AND p.retired = 0 AND p.sha IS NOT NULL AND q.updated < ? LIMIT 20", Date.now() - 3 * 864e5);
    return { todo, retire, mode: await modeOf(db, env) };
  },
  async pack(db, b) {
    const id = String(b.id || ''); if (!CLIP.test(id)) return { status: 400, error: 'bad-input' };
    if (!(await one(db, 'SELECT clip FROM yt_pack WHERE clip = ?', id))) return { status: 404, error: 'not-found' };
    if (b.retired) { await run(db, 'UPDATE yt_pack SET retired = 1 WHERE clip = ?', id); return { ok: true }; }
    const fid = String(b.file_id || ''), did = String(b.drive_id || ''), sha = String(b.sha || '').toLowerCase();
    if (!/^[A-Za-z0-9_-]{10,120}$/.test(fid) || !/^\d{1,6}$/.test(did) || !/^[0-9a-f]{64}$/.test(sha)) return { status: 400, error: 'bad-input' };
    const tags = (Array.isArray(b.tags) ? b.tags : []).map(t => clean(t, 30)).filter(Boolean).slice(0, 30);
    await run(db, 'UPDATE yt_pack SET file_id = ?, drive_id = ?, sha = ?, bytes = ?, title = ?, description = ?, tags = ?, at = ?, retired = 0 WHERE clip = ?',
      fid, did, sha, Math.floor(+b.bytes || 0), clean(b.title, 100), clean(b.description, 5000), JSON.stringify(tags), Date.now(), id);
    return { ok: true };
  },
  async fail(db, b) {
    const row = await one(db, 'SELECT clip FROM yt_queue WHERE clip = ?', String(b.id || '')); if (!row) return { status: 404, error: 'not-found' };
    const expired = /404|410|expired/i.test(String(b.error || ''));
    await run(db, `UPDATE yt_queue SET status = 'failed', attempts = attempts + 1, err = ?, updated = ?${expired ? ', upload_url = NULL' : ''} WHERE clip = ?`, String(b.error || 'error').slice(0, 200), Date.now(), row.clip);
    return { ok: true };
  },
};
const DANGER = new Set(['disconnect']); // revoke + delete a channel → sign-in ≤ 15 min old (same rule as drive.js)
const WRITE = new Set(['connect', 'disconnect', 'setdefault', 'settings', 'approve', 'unqueue', 'session', 'done', 'fail', 'sync', 'link', 'pack', 'purged']);

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: adminCors(request) });

export async function onRequestPost({ request, env }) {
  const text = await request.text().catch(() => '');
  if (text.length > 32768) return json(request, 413, { error: 'too-large' });
  let b; try { b = JSON.parse(text || '{}'); } catch (e) { return json(request, 400, { error: 'json' }); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return json(request, 400, { error: 'json' });
  const ip = request.headers.get('CF-Connecting-IP') || '?';
  let who, ops;
  if (request.headers.get('X-Drive-Sig')) {
    if (await limit('ytcli:' + ip, 60, 60)) return json(request, 429, { error: 'too-fast' });
    if (!(await cliVerify(env, request, text)) || !Object.hasOwn(CLI_OPS, b.op)) { await adminAudit(env, request, 'cli', 'youtube.denied', false); return json(request, 403, { error: 'forbidden' }); }
    who = { email: 'cli' }; ops = CLI_OPS;
  } else {
    const g = await adminGate(request, env, 'yt'); if (!g.who) return json(request, g.status, { error: g.error });
    who = g.who; ops = ADMIN_OPS;
    if (DANGER.has(b.op) && Date.now() / 1000 - (+who.auth_time || 0) > 900) { await adminAudit(env, request, who.email, 'youtube.' + b.op, false); return json(request, 401, { error: 'reauth', message: 'Sensitive action: sign out and sign in again, then retry.' }); }
  }
  const fn = Object.hasOwn(ops, b.op) ? ops[b.op] : null; if (!fn) return json(request, 400, { error: 'op' });
  if (!env.DB) return json(request, 412, { error: 'not-configured' });
  try {
    await setup(env.DB);
    const out = await fn(env.DB, b, who, env, request);
    const status = out.status || 200, cookie = out._cookie; delete out.status; delete out._cookie;
    if (WRITE.has(b.op)) await adminAudit(env, request, who.email, 'youtube.' + b.op, status < 400);
    return json(request, status, out, cookie ? { 'Set-Cookie': cookie } : {});
  } catch (e) {
    if (WRITE.has(b.op)) await adminAudit(env, request, who.email, 'youtube.' + b.op, false);
    return json(request, e.status || 500, { error: e.code || 'error' }); // never forward raw Google errors
  }
}

// ---------- GET /api/youtube/callback ----------
/** Avatar URL from channels.list snippet – https on Google image hosts only. */
export const thumbOf = item => { const t = ((item.snippet || {}).thumbnails || {}), u = String((t.default || t.medium || {}).url || ''); return /^https:\/\/[a-z0-9.-]+\.(ggpht|googleusercontent|ytimg)\.com\//.test(u) ? u.slice(0, 300) : null; };
const back = q => new Response(null, { status: 302, headers: { Location: '/admin.html?yt=' + q + '#video', 'Cache-Control': 'no-store', 'Set-Cookie': 'lk_yt=; Path=/api/youtube; Max-Age=0; HttpOnly; Secure; SameSite=Lax' } });
const cookieOf = (req, k) => { const m = (req.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + k + '=([^;]+)')); return m ? m[1] : ''; };
export async function handleCallback(request, env) {
  const u = new URL(request.url), ip = request.headers.get('CF-Connecting-IP') || '?';
  if (await limit('ytcb:' + ip, 20, 600)) return back('rate');
  if (!ready(env)) return back('not-configured');
  await setup(env.DB);
  const st = await verifyState(env, u.searchParams.get('state') || '');
  const admins = String(env.ADMIN_EMAILS || '').toLowerCase().split(/[,\s]+/).filter(Boolean), ck = cookieOf(request, 'lk_yt');
  if (!st || !admins.includes(st.e) || !ck || ck !== st.n) { await adminAudit(env, request, st ? st.e : '?', 'youtube.callback', false); return back('bad-state'); }
  try { await run(env.DB, 'INSERT INTO yt_nonce (n, at) VALUES (?, ?)', st.n, Date.now()); } catch (e) { return back('replay'); }
  await run(env.DB, 'DELETE FROM yt_nonce WHERE at < ?', Date.now() - 86400e3).catch(() => {});
  if (u.searchParams.get('error') || !u.searchParams.get('code')) return back('denied');
  try {
    const c = client(env);
    const r = await gfetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: u.searchParams.get('code'), client_id: c.id, client_secret: c.secret, redirect_uri: REDIRECT, grant_type: 'authorization_code' }) });
    const t = await r.json().catch(() => ({}));
    if (!r.ok || !t.access_token) return back('error');
    const granted = String(t.scope || '').split(' '), mode = await modeOf(env.DB, env);
    if (!scopeFor(mode).split(' ').every(x => granted.includes(x))) return back('scope'); // manual mode: youtube.readonly only
    if (!t.refresh_token) return back('no-refresh');
    const ch = await gfetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', { headers: { Authorization: 'Bearer ' + t.access_token } });
    const item = ((await ch.json().catch(() => ({}))).items || [])[0];
    if (!item || !item.id) return back('no-channel');
    const e = await encryptToken(env, t.refresh_token, item.id, 'youtube'), now = Date.now();
    await run(env.DB, `INSERT INTO yt_channel (channel_id, title, email, enc_token, iv, status, created, last_ok, by_who, thumb) VALUES (?, ?, NULL, ?, ?, 'ok', ?, ?, ?, ?)
      ON CONFLICT(channel_id) DO UPDATE SET title = excluded.title, thumb = excluded.thumb, enc_token = excluded.enc_token, iv = excluded.iv, status = 'ok', err = NULL, last_ok = excluded.last_ok, by_who = excluded.by_who`,
      item.id, String((item.snippet || {}).title || '').slice(0, 120), e.enc_token, e.iv, now, now, st.e, thumbOf(item));
    const dflt = await getMeta(env.DB, 'default_channel'); if (!dflt || !(await channelRow(env.DB, dflt))) await setMeta(env.DB, 'default_channel', item.id); // first channel becomes the target; later ones are picked in the admin
    await setMeta(env.DB, 'scope', granted.filter(x => /^https:\/\/www\.googleapis\.com\/auth\/youtube/.test(x)).join(' '));
    TOKS.delete(item.id);
    await adminAudit(env, request, st.e, 'youtube.callback', true);
    return back('ok');
  } catch (e) { await adminAudit(env, request, st.e, 'youtube.callback', false); return back('error'); }
}
