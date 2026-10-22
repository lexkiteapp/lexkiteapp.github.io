/* YouTube Data API v3 – upload ONLY owner-approved shorts (docs/YOUTUBE-SETUP.md, docs/VIDEO-STORAGE.md).
 * POST /api/youtube { op, ... }
 *   Admin (Firebase ID token, adminGate): status · connect (OAuth in the owner's own browser) · disconnect · approve {ids[], privacy, schedule}
 *     · unqueue {id} · queue · settings {privacy}
 *   CI (HMAC X-Drive-Ts/X-Drive-Sig with LEXKITE_DRIVE_CLI_KEY – same signing as /api/drive): ids · next {max} · session {id, meta} · done {id, video_id} · fail {id, error} · quota
 * GET /api/youtube/callback – Google returns here → refresh token encrypted AES-GCM with DRIVE_ENC_KEY (AAD 'youtube:<channel>') in D1 yt_channel.
 * Bytes never pass through the Worker: CI PUTs the master straight into the resumable session that `session` opens (like the Drive pool).
 * Privacy: only 'private' (optionally with publishAt from the calendar slot the owner approved) or 'unlisted' – never 'public'.
 * Quota: 10,000 units/day (resets midnight Pacific); videos.insert ≈ 1,600, thumbnails.set 50, videos.list 1 → ≤ 6 uploads/day, rest stays queued.
 * OAuth client: YOUTUBE_CLIENT_ID/SECRET if set, else the Drive pool's client (GOOGLE_DRIVE_CLIENT_ID/SECRET – same Google Cloud project). */
import { adminGate, adminAudit, adminCors } from './admin.js';
import { limit } from './sync.js';
import { signState, verifyState, encryptToken, decryptToken, cliVerify, driveMedia } from './drive.js';
import { manifest } from './admin-shorts.js';

export const REDIRECT = 'https://lexkite.com/api/youtube/callback';
export const SCOPE = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly';
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
const CLIP = /^[a-z0-9-]{3,120}$/;

async function setup(db) {
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS yt_channel (id INTEGER PRIMARY KEY, channel_id TEXT UNIQUE, title TEXT, email TEXT, enc_token TEXT, iv TEXT, status TEXT, created INTEGER, last_ok INTEGER, err TEXT, by_who TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS yt_queue (clip TEXT PRIMARY KEY, lesson TEXT, status TEXT, privacy TEXT, publish_at TEXT, approved_by TEXT, approved_at INTEGER, video_id TEXT, upload_url TEXT, session_at INTEGER, attempts INTEGER DEFAULT 0, err TEXT, updated INTEGER, thumb INTEGER, title TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS yt_quota (day TEXT PRIMARY KEY, units INTEGER)'),
    db.prepare('CREATE TABLE IF NOT EXISTS yt_meta (k TEXT PRIMARY KEY, v TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS yt_nonce (n TEXT PRIMARY KEY, at INTEGER)'),
  ]);
}

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

// ---------- Google ----------
let TOK = null; // {t, exp} – memory only
async function gfetch(url, init) { const r = await fetch(url, init).catch(() => null); if (!r) { const e = new Error('google-network'); e.code = 'google-network'; throw e; } return r; }
async function channelRow(db) { return one(db, "SELECT * FROM yt_channel WHERE status = 'ok' ORDER BY id DESC LIMIT 1"); }
async function accessToken(env, db, row) {
  if (TOK && TOK.exp > Date.now() && TOK.ch === row.channel_id) return TOK.t;
  const c = client(env), refresh = await decryptToken(env, { ...row, email: row.channel_id }, 'youtube');
  const r = await gfetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: c.id, client_secret: c.secret, refresh_token: refresh, grant_type: 'refresh_token' }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    if (j.error === 'invalid_grant') await run(db, "UPDATE yt_channel SET status = 'disconnected', err = ? WHERE id = ?", 'Google revoked access / token expired – click Connect YouTube again', row.id);
    const e = new Error('google-token'); e.code = j.error === 'invalid_grant' ? 'yt-revoked' : 'google-token'; e.status = 409; throw e;
  }
  TOK = { t: j.access_token, ch: row.channel_id, exp: Date.now() + Math.min((+j.expires_in || 3600) - 60, 50 * 60) * 1000 };
  return TOK.t;
}
async function spend(db, units, now = Date.now()) {
  const d = quotaDay(now);
  await run(db, 'INSERT INTO yt_quota (day, units) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET units = units + excluded.units', d, units);
}
async function used(db, now = Date.now()) { const r = await one(db, 'SELECT units FROM yt_quota WHERE day = ?', quotaDay(now)); return r ? +r.units : 0; }
async function quotaInfo(db) { const u = await used(db); return { day: quotaDay(), used: u, limit: QUOTA.day, left: Math.max(0, QUOTA.day - u), uploads_left: uploadsLeft(u), per_upload: QUOTA.insert + QUOTA.thumb }; }

// ---------- ops ----------
const ADMIN_OPS = {
  async status(db, b, who, env) {
    const ch = await one(db, 'SELECT channel_id, title, status, created, last_ok, err FROM yt_channel ORDER BY id DESC LIMIT 1');
    const counts = Object.fromEntries((await all(db, 'SELECT status, COUNT(*) AS n FROM yt_queue GROUP BY status')).map(r => [r.status, r.n]));
    const st = await one(db, "SELECT v FROM yt_meta WHERE k = 'privacy'");
    return { configured: configured(env), redirect: REDIRECT, channel: ch, quota: await quotaInfo(db), queue: counts, settings: { privacy: (st && st.v) || 'private' } };
  },
  async connect(db, b, who, env) {
    if (!ready(env)) return { status: 412, error: 'not-configured', configured: configured(env) };
    const { state, nonce } = await signState(env, who.email);
    const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: client(env).id, redirect_uri: REDIRECT, response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'false', state });
    return { url, _cookie: `lk_yt=${nonce}; Path=/api/youtube; Max-Age=${STATE_TTL}; HttpOnly; Secure; SameSite=Lax` };
  },
  async disconnect(db, b, who, env) {
    const ch = await channelRow(db); if (!ch) return { ok: true };
    try { const t = await decryptToken(env, { ...ch, email: ch.channel_id }, 'youtube'); await gfetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(t), { method: 'POST' }); } catch (e) { /* revoke best-effort */ }
    await run(db, 'DELETE FROM yt_channel WHERE id = ?', ch.id); TOK = null;
    return { ok: true };
  },
  async settings(db, b) {
    if (!PRIVACY.includes(b.privacy)) return { status: 400, error: 'bad-input' };
    await run(db, "INSERT INTO yt_meta (k, v) VALUES ('privacy', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", b.privacy);
    return { ok: true, privacy: b.privacy };
  },
  /** "Duyệt & lên YouTube": owner approval → queue. privacy private|unlisted; schedule 'calendar' → publishAt = the clip's calendar slot (private until then). */
  async approve(db, b, who, env) {
    const ids = (Array.isArray(b.ids) ? b.ids : []).map(String).filter(x => CLIP.test(x)).slice(0, 100);
    if (!ids.length) return { status: 400, error: 'bad-input' };
    const st = await one(db, "SELECT v FROM yt_meta WHERE k = 'privacy'");
    const privacy = PRIVACY.includes(b.privacy) ? b.privacy : (st && st.v) || 'private';
    const m = await manifest(env), by = new Map((m.items || []).map(x => [x.id, x])), now = Date.now(), out = { queued: [], skipped: [] };
    for (const id of ids) {
      const it = by.get(id);
      if (!it || !it.qa || it.qa.status !== 'pass' || it.rejected) { out.skipped.push({ id, why: !it ? 'unknown' : it.rejected ? 'rejected' : 'qa' }); continue; }
      if (!it.drive || !it.drive.video || it.drive.video.retired) { out.skipped.push({ id, why: 'no-master' }); continue; }
      const old = await one(db, 'SELECT status FROM yt_queue WHERE clip = ?', id);
      if (old && (old.status === 'done' || old.status === 'uploading')) { out.skipped.push({ id, why: old.status }); continue; }
      const pa = privacy === 'private' && b.schedule === 'calendar' ? slotToIso(it.slot, now) : null;
      await run(db, `INSERT INTO yt_queue (clip, lesson, status, privacy, publish_at, approved_by, approved_at, attempts, updated, title) VALUES (?, ?, 'queued', ?, ?, ?, ?, 0, ?, ?)
        ON CONFLICT(clip) DO UPDATE SET status = 'queued', privacy = excluded.privacy, publish_at = excluded.publish_at, approved_by = excluded.approved_by, approved_at = excluded.approved_at, attempts = 0, err = NULL, upload_url = NULL, updated = excluded.updated`,
        id, it.lesson || '', privacy, pa, who.email, now, now, String(it.title || '').slice(0, 100));
      out.queued.push({ id, privacy, publish_at: pa });
    }
    return { ok: true, ...out, quota: await quotaInfo(db) };
  },
  async unqueue(db, b) {
    if (!CLIP.test(String(b.id || ''))) return { status: 400, error: 'bad-input' };
    await run(db, "DELETE FROM yt_queue WHERE clip = ? AND status IN ('queued', 'failed')", b.id); return { ok: true };
  },
  async queue(db) {
    const rows = await all(db, 'SELECT clip, lesson, status, privacy, publish_at, approved_by, approved_at, video_id, attempts, err, updated, thumb FROM yt_queue ORDER BY approved_at DESC LIMIT 500');
    return { rows, quota: await quotaInfo(db) };
  },
};

const CLI_OPS = {
  /** approved/uploaded ids (shorts-archive.mjs keeps 2 copies of these; web-rendition.mjs adds youtube_id when the video is watchable). */
  async ids(db) {
    const rows = await all(db, 'SELECT clip, lesson, status, privacy, publish_at, video_id FROM yt_queue'), now = Date.now();
    const web = {};
    for (const r of rows) if (r.status === 'done' && r.video_id && (r.privacy === 'unlisted' || (r.publish_at && Date.parse(r.publish_at) <= now))) { web[r.clip] = r.video_id; if (r.lesson) web[r.lesson] = r.video_id; }
    return { approved: rows.map(r => r.clip), uploaded: Object.fromEntries(rows.filter(r => r.video_id).map(r => [r.clip, r.video_id])), web };
  },
  async quota(db) { return { quota: await quotaInfo(db) }; },
  async next(db, b) {
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
  async fail(db, b) {
    const row = await one(db, 'SELECT clip FROM yt_queue WHERE clip = ?', String(b.id || '')); if (!row) return { status: 404, error: 'not-found' };
    const expired = /404|410|expired/i.test(String(b.error || ''));
    await run(db, `UPDATE yt_queue SET status = 'failed', attempts = attempts + 1, err = ?, updated = ?${expired ? ', upload_url = NULL' : ''} WHERE clip = ?`, String(b.error || 'error').slice(0, 200), Date.now(), row.clip);
    return { ok: true };
  },
};
const WRITE = new Set(['connect', 'disconnect', 'settings', 'approve', 'unqueue', 'session', 'done', 'fail']);

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
    if (!String(t.scope || '').split(' ').includes('https://www.googleapis.com/auth/youtube.upload')) return back('scope');
    if (!t.refresh_token) return back('no-refresh');
    const ch = await gfetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', { headers: { Authorization: 'Bearer ' + t.access_token } });
    const item = ((await ch.json().catch(() => ({}))).items || [])[0];
    if (!item || !item.id) return back('no-channel');
    const e = await encryptToken(env, t.refresh_token, item.id, 'youtube'), now = Date.now();
    await run(env.DB, 'DELETE FROM yt_channel WHERE channel_id != ?', item.id); // one channel at a time
    await run(env.DB, `INSERT INTO yt_channel (channel_id, title, email, enc_token, iv, status, created, last_ok, by_who) VALUES (?, ?, NULL, ?, ?, 'ok', ?, ?, ?)
      ON CONFLICT(channel_id) DO UPDATE SET title = excluded.title, enc_token = excluded.enc_token, iv = excluded.iv, status = 'ok', err = NULL, last_ok = excluded.last_ok, by_who = excluded.by_who`,
      item.id, String((item.snippet || {}).title || '').slice(0, 120), e.enc_token, e.iv, now, now, st.e);
    TOK = null;
    await adminAudit(env, request, st.e, 'youtube.callback', true);
    return back('ok');
  } catch (e) { await adminAudit(env, request, st.e, 'youtube.callback', false); return back('error'); }
}
