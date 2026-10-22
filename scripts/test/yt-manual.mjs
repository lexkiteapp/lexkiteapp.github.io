// Manual YouTube path (docs/YOUTUBE-SETUP.md §0): marker parsing, link parsing, privacy/processing/length checks, reconcile, pack texts,
// read-only channel sync end-to-end through functions/api/youtube.js (node:sqlite D1 + mocked Google API), admin cards (jsdom). No network.
// Run: node scripts/test/yt-manual.mjs
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

const Y = await import('../../functions/api/youtube.js');
const P = await import('../video/yt-pack.mjs');
const { driveSign } = await import('../video/library.mjs');
const { encryptToken } = await import('../../functions/api/drive.js');

// ---------- 1. markers & links ----------
ok(JSON.stringify(Y.markersOf('Lesson\n\nlk:cafe-01-order\n#shorts')) === '["cafe-01-order"]', 'marker on its own line');
ok(JSON.stringify(Y.markersOf('see lk:a-b-c. and (lk:x-y-z) lk:a-b-c')) === '["a-b-c","x-y-z"]', 'markers inline, unique');
ok(Y.markersOf('blk:cafe-01 lk:AB lk:ab lk:').length === 0, 'no false markers (prefix, uppercase, too short, empty)');
ok(Y.markersOf('xlk:cafe-01-order').length === 0, 'marker must start a word');
for (const [u, id] of [['https://youtu.be/AbCdEfGhIj0?si=x', 'AbCdEfGhIj0'], ['https://www.youtube.com/watch?v=AbCdEfGhIj0&t=3', 'AbCdEfGhIj0'], ['youtube.com/shorts/AbCdEfGhIj0', 'AbCdEfGhIj0'],
  ['https://studio.youtube.com/video/AbCdEfGhIj0/edit', 'AbCdEfGhIj0'], ['https://m.youtube.com/embed/AbCdEfGhIj0', 'AbCdEfGhIj0'], ['AbCdEfGhIj0', 'AbCdEfGhIj0'],
  ['https://evil.com/watch?v=AbCdEfGhIj0', ''], ['https://youtu.be/short', ''], ['javascript:alert(1)', ''], ['', '']]) ok(Y.ytIdOf(u) === id, `ytIdOf ${u} → ${Y.ytIdOf(u)}`);
ok(Y.isoSecs('PT28.5S') === 28.5 && Y.isoSecs('PT1M2S') === 62 && Number.isNaN(Y.isoSecs('')) && Number.isNaN(Y.isoSecs('PT')), 'ISO durations');

// ---------- 2. privacy / processing / length ----------
const V = (o = {}) => ({ privacy: 'unlisted', upload: 'processed', processing: 'succeeded', secs: 30, ...o });
ok(Y.checkVideo(V(), 30.4).status === 'done', 'unlisted + processed + same length → live');
ok(Y.checkVideo(V({ privacy: 'public' }), 30).status === 'done', 'public also counts');
ok(Y.checkVideo(V({ privacy: 'private' }), 30).err === 'private', 'private flagged');
ok(Y.checkVideo(V({ processing: 'processing', upload: 'uploaded' }), 30).err === 'processing', 'still processing');
ok(Y.checkVideo(V({ processing: 'failed' }), 30).err === 'processing-failed' && Y.checkVideo(V({ upload: 'rejected' }), 30).err === 'processing-failed', 'processing failed/rejected');
ok(Y.checkVideo(V({ secs: 45 }), 30).err === 'wrong-file', 'wrong file (length)');
ok(Y.checkVideo(V(), 0).status === 'done', 'unknown clip length → not judged');
ok(Y.checkVideo(null, 30).err === 'missing', 'missing video');

// ---------- 3. reconcile ----------
const rows = [
  { clip: 'cafe-a', status: 'manual', approved_at: 1000 }, { clip: 'cafe-b', status: 'manual', approved_at: 1000 }, { clip: 'cafe-c', status: 'manual', approved_at: 1000 },
  { clip: 'cafe-d', status: 'done', video_id: 'DDDDDDDDDDD', privacy: 'unlisted', approved_at: 1000 }, { clip: 'cafe-e', status: 'manual', approved_at: 1000 },
  { clip: 'api-x', status: 'done', video_id: 'XXXXXXXXXXX', privacy: 'unlisted', approved_at: 1000 }, { clip: 'cafe-f', status: 'done', video_id: 'FFFFFFFFFFF', err: 'unverified', approved_at: 1000 },
];
const manual = new Set(['cafe-a', 'cafe-b', 'cafe-c', 'cafe-d', 'cafe-e', 'cafe-f']);
const up = (id, desc, at = 2000, privacy = 'unlisted') => ({ video_id: id, title: 't ' + id, description: desc, privacy, at });
const uploads = [up('AAAAAAAAAAA', 'x\nlk:cafe-a'), up('BBBBBBBBBBB', 'lk:cafe-b', 2000, 'private'), up('CCCCCCCCCCC', 'lk:cafe-c'), up('ZZZZZZZZZZZ', 'no marker here'),
  up('OLDOLDOLDOL', 'older video', 500), up('E1E1E1E1E1E', 'lk:cafe-e', 2100), up('E2E2E2E2E2E', 'lk:cafe-e', 2200, 'private'), up('UUUUUUUUUUU', 'lk:ghost-clip'), up('XXXXXXXXXXX', 'lk:api-x')];
const videos = { AAAAAAAAAAA: V(), BBBBBBBBBBB: V({ privacy: 'private' }), CCCCCCCCCCC: V({ secs: 50 }), E1E1E1E1E1E: V(), E2E2E2E2E2E: V({ privacy: 'private' }), FFFFFFFFFFF: V() };
const rec = Y.reconcile({ rows, uploads, videos, secs: { 'cafe-a': 30, 'cafe-c': 30, 'cafe-e': 30 }, manual, complete: true, since: 1000 });
const U = Object.fromEntries(rec.updates.map(u => [u.clip, u])), I = k => rec.issues.filter(i => i.kind === k);
ok(U['cafe-a'] && U['cafe-a'].status === 'done' && U['cafe-a'].video_id === 'AAAAAAAAAAA', 'marker match → done');
ok(U['cafe-b'] && U['cafe-b'].status === 'detected' && U['cafe-b'].err === 'private', 'private → detected + flagged');
ok(U['cafe-c'] && U['cafe-c'].err === 'wrong-file', 'wrong file flagged');
ok(U['cafe-d'] && U['cafe-d'].status === 'detected' && U['cafe-d'].err === 'missing', 'live clip whose video vanished (full scan) → flagged');
ok(U['cafe-e'] && U['cafe-e'].video_id === 'E1E1E1E1E1E' && U['cafe-e'].status === 'done' && I('duplicate').length === 1, 'duplicate upload: the valid one wins + flagged');
ok(!U['api-x'], 'API-path rows untouched');
ok(U['cafe-f'] && U['cafe-f'].status === 'done' && U['cafe-f'].err === null, 'pasted link verified on sync → unverified cleared');
ok(I('no-marker').length === 1 && I('no-marker')[0].video_id === 'ZZZZZZZZZZZ', 'unmarked upload after the first approval flagged (older ones ignored)');
ok(I('unknown-clip').length === 1 && I('unknown-clip')[0].clip === 'ghost-clip', 'marker of an unknown clip flagged');
const rec2 = Y.reconcile({ rows: [{ clip: 'cafe-d', status: 'done', video_id: 'DDDDDDDDDDD', approved_at: 1 }], uploads: [], videos: {}, manual: new Set(['cafe-d']), complete: false });
ok(!rec2.updates.length, 'partial scan never downgrades a live clip');
ok(Y.stateOf({ clip: 'a', status: 'manual' }, {}) === 'packing' && Y.stateOf({ clip: 'a', status: 'manual' }, { file_id: 'f' }) === 'ready' && Y.stateOf({ clip: 'a', status: 'detected' }) === 'uploaded'
  && Y.stateOf({ clip: 'a', status: 'done', video_id: 'v' }, null, { a: 'v' }) === 'live' && Y.stateOf({ clip: 'a', status: 'done', video_id: 'v' }, null, {}) === 'uploaded', 'states ready → uploaded → live');
ok(Y.videoResource({ clip: 'cafe-a', privacy: 'unlisted' }, { title: 't', description: 'd' }).snippet.description.includes('\nlk:cafe-a'), 'API upload carries the same marker');
ok(Y.scopeFor('manual') === Y.SCOPE_RO && Y.scopeFor('api').includes('youtube.upload'), 'manual mode asks youtube.readonly only');

// ---------- 4. pack texts ----------
const t = P.packTexts('cafe-a', { title: 'x'.repeat(140), description: 'Lesson\n▶ https://lexkite.com/video/cafe-a/', tags: ['learn english', 'a,b', 'x'.repeat(40), ...Array.from({ length: 40 }, (_, i) => 'tag number ' + i)] });
ok(t.title.length <= 100, 'title ≤ 100');
ok(/\nlk:cafe-a$/.test(t.description) && /#shorts/.test(t.description) && t.description.includes('https://lexkite.com/video/cafe-a/'), 'description: deep link + #shorts + marker last');
ok(t.tags.join(', ').length <= 500 && t.tags.length <= 30 && !t.tags.some(x => x.includes(',')), 'tags fit Studio (≤ 500 chars, no commas)');
ok(/UNLISTED/.test(t.settings) && /not made for kids/.test(t.settings) && /Altered content: "Yes"/.test(t.settings) && /Education/.test(t.settings), 'settings notes');
ok(P.packTexts('c-1', { description: 'old\nlk:c-1' }).description.match(/lk:c-1/g).length === 1, 'marker not duplicated');
ok(JSON.stringify(P.webPending({ a: 'v1', b: 'v2', zz: 'v3' }, { items: [{ id: 'a', youtube_id: 'v1' }, { id: 'b' }] })) === '["b"]', 'web pending = ids not yet in videos.json');

// ---------- 5. pack builder (mocked API / Drive) ----------
{
  const calls = [], idx = { items: [{ id: 'cafe-a', lesson: 'nope-lesson', title: 'Order coffee', description: 'Learn to order', hashtags: ['#shorts'], drive: { video: { fileId: 'f'.repeat(20), sha256: 's' }, cover: { fileId: 'c'.repeat(20) } } }, { id: 'cafe-z', drive: {} }] };
  const work = fs.mkdtempSync((process.env.TMPDIR || '/tmp') + '/ytpack-');
  const rep = await P.runPacks({ index: idx, work, log: () => {},
    api: async (op, b) => { calls.push([op, b]); return op === 'packs' ? { todo: [{ id: 'cafe-a', lesson: 'nope-lesson' }, { id: 'cafe-z' }], retire: [{ id: 'old', sha: 'a'.repeat(64) }] } : { ok: true }; },
    fetchFile: async (id, out) => fs.writeFileSync(out, 'bytes'), zip: (dir, out) => fs.writeFileSync(out, fs.readdirSync(dir).sort().join(',')),
    upload: async (f, o) => { calls.push(['upload', o]); return { fileId: 'z'.repeat(20), driveId: 1 }; }, drive: async (op, b) => { calls.push([op, b]); return { done: [], failed: [] }; } });
  const pk = calls.find(c => c[0] === 'pack' && c[1].file_id), upl = calls.find(c => c[0] === 'upload');
  ok(rep.made.join() === 'cafe-a' && rep.failed.join() === 'cafe-z', 'pack made / missing master reported');
  ok(fs.readFileSync(work + '/cafe-a.zip', 'utf8') === 'cafe-a.mp4,cover.jpg,description.txt,settings.txt,tags.txt,title.txt', 'zip holds mp4, cover and the 4 text files');
  ok(upl && upl[1].folder === 'shorts/_ytpack' && upl[1].mimeType === 'application/zip' && upl[1].cls === 'render', 'pack goes to the Drive pool shorts/_ytpack');
  ok(pk && /^[0-9a-f]{64}$/.test(pk[1].sha) && pk[1].description.endsWith('lk:cafe-a'), 'pack registered with sha + marker');
  ok(calls.some(c => c[0] === 'retire') && calls.some(c => c[0] === 'pack' && c[1].retired), 'live packs retired');
}

// ---------- 6. endpoint: CLI ops + read-only sync with a mocked Google API ----------
const sql = new DatabaseSync(':memory:');
const exec = (q, a) => /^\s*(SELECT|WITH)|RETURNING/i.test(q) ? { results: sql.prepare(q).all(...a) } : (sql.prepare(q).run(...a), { results: [] });
const DB = { prepare(q) { const st = { q, args: [], bind(...a) { return { ...st, args: a }; }, async run() { return exec(q, this.args); }, async all() { return exec(q, this.args); }, async first() { return exec(/^\s*SELECT/i.test(q) ? q : q, this.args).results?.[0] ?? null; } }; return st; },
  async batch(list) { for (const x of list) await x.run(); return []; } };
const KEY = 'k'.repeat(40);
const ENV = { DB, DRIVE_ENC_KEY: Buffer.alloc(32, 7).toString('base64'), GOOGLE_DRIVE_CLIENT_ID: 'cid', GOOGLE_DRIVE_CLIENT_SECRET: 'csec', LEXKITE_DRIVE_CLI_KEY: KEY, ADMIN_EMAILS: 'boss@lexkite.com' };
const google = { list: 0, videos: 0, privacy: 'unlisted' };
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith('https://oauth2.googleapis.com/token')) return new Response(JSON.stringify({ access_token: 'at', expires_in: 3600 }));
  if (u.includes('/youtube/v3/playlistItems')) { google.list++; ok(new URL(u).searchParams.get('playlistId') === 'UUchan0000001', 'uploads playlist derived from channel id'); return new Response(JSON.stringify({ items: [{ snippet: { title: 'Order coffee', description: 'Lesson\nlk:cafe-a', publishedAt: new Date().toISOString() }, contentDetails: { videoId: 'AAAAAAAAAAA' }, status: { privacyStatus: google.privacy } }] })); }
  if (u.includes('/youtube/v3/videos?')) { google.videos++; return new Response(JSON.stringify({ items: [{ id: 'AAAAAAAAAAA', snippet: { channelId: 'UCchan0000001' }, status: { privacyStatus: google.privacy, uploadStatus: 'processed' }, processingDetails: { processingStatus: 'succeeded' }, contentDetails: { duration: 'PT30S' } }] })); }
  if (u.includes('/upload/youtube/')) throw new Error('manual mode must never call the upload API');
  return new Response('{}', { status: 404 });
};
const api = async (op, body = {}) => {
  const text = JSON.stringify({ op, ...body });
  const r = await Y.onRequestPost({ request: new Request('https://lexkite.com/api/youtube', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.0.' + (n % 200), ...driveSign(KEY, text) }, body: text }), env: ENV });
  return { s: r.status, j: await r.json() };
};
await api('quota'); // creates tables
const e = await encryptToken(ENV, 'refresh-1', 'UCchan0000001', 'youtube');
sql.prepare("INSERT INTO yt_channel (channel_id, title, enc_token, iv, status, created) VALUES ('UCchan0000001', 'Lexkite', ?, ?, 'ok', 1)").run(e.enc_token, e.iv);
sql.prepare("INSERT INTO yt_queue (clip, lesson, status, privacy, approved_at, updated) VALUES ('cafe-a', 'cafe-a', 'manual', 'unlisted', ?, ?)").run(Date.now() - 6e4, Date.now());
sql.prepare("INSERT INTO yt_pack (clip, at) VALUES ('cafe-a', ?)").run(Date.now());
let r = await api('packs');
ok(r.s === 200 && r.j.todo.length === 1 && r.j.todo[0].id === 'cafe-a' && r.j.mode === 'manual', 'packs: approved clip waits for a pack (default mode manual)');
r = await api('pack', { id: 'cafe-a', file_id: 'z'.repeat(20), drive_id: '3', sha: 'b'.repeat(64), bytes: 9, title: 'T', description: 'D\nlk:cafe-a', tags: ['a'] });
ok(r.s === 200 && (await api('packs')).j.todo.length === 0, 'pack registered');
ok((await api('pack', { id: 'cafe-a', file_id: '../x', drive_id: '3', sha: 'b'.repeat(64) })).s === 400, 'pack: bad file id refused');
ok((await api('next')).j.items.length === 0, 'manual mode: API upload queue stays empty');
google.privacy = 'private'; r = await api('sync');
ok(r.s === 200 && r.j.matched === 1 && r.j.issues.some(i => i.kind === 'private'), 'sync: private upload flagged');
ok(!(await api('ids')).j.web['cafe-a'], 'private video never reaches the web manifest');
google.privacy = 'unlisted'; r = await api('sync');
ok(r.s === 200 && r.j.live.join() === 'cafe-a' && !r.j.issues.length, 'sync: unlisted + processed → live');
ok((await api('ids')).j.web['cafe-a'] === 'AAAAAAAAAAA', 'ids.web → youtube_id for the lesson (same as an API upload)');
ok(google.list === 2 && google.videos === 2, 'quota: 1 list + 1 videos call per sync');
ok((await api('approve', { ids: ['cafe-a'] })).s === 403, 'CLI cannot approve');
ok((await api('link', { id: 'cafe-a', url: 'AAAAAAAAAAA' })).s === 403, 'CLI cannot paste links');
const bad = await Y.onRequestPost({ request: new Request('https://lexkite.com/api/youtube', { method: 'POST', headers: { 'X-Drive-Ts': String(Math.floor(Date.now() / 1000)), 'X-Drive-Sig': 'a'.repeat(64) }, body: '{"op":"sync"}' }), env: ENV });
ok(bad.status === 403, 'unsigned sync refused');

// ---------- 6b. several connected channels: sync reads all, records which channel a video was found on ----------
{
  const saved = globalThis.fetch, OWN = { AAAAAAAAAAA: 'UCchan0000001', BBBBBBBBBBB: 'UCchan0000002' }, PL = { UUchan0000001: ['AAAAAAAAAAA', 'lk:cafe-a'], UUchan0000002: ['BBBBBBBBBBB', 'lk:cafe-b'] }, seen = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('https://oauth2.googleapis.com/token')) { const rt = new URLSearchParams(init.body).get('refresh_token'); return rt === 'refresh-3' ? new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }) : new Response(JSON.stringify({ access_token: 'at-' + rt, expires_in: 3600 })); }
    if (u.includes('/youtube/v3/playlistItems')) { const pl = new URL(u).searchParams.get('playlistId'), [vid, desc] = PL[pl] || []; seen.push(pl); return new Response(JSON.stringify({ items: vid ? [{ snippet: { title: 't ' + vid, description: desc, publishedAt: new Date().toISOString() }, contentDetails: { videoId: vid }, status: { privacyStatus: 'unlisted' } }] : [] })); }
    if (u.includes('/youtube/v3/videos?')) { // a video is visible only with its owner's token (private/unlisted), like the real API
      const ids = (new URL(u).searchParams.get('id') || '').split(','), tok = (init.headers || {}).Authorization || '';
      return new Response(JSON.stringify({ items: ids.filter(i => OWN[i] && (tok === 'Bearer at-refresh-' + OWN[i].slice(-1) || (OWN[i].endsWith('1') && tok === 'Bearer at'))).map(i => ({ id: i, snippet: { channelId: OWN[i] }, status: { privacyStatus: 'unlisted', uploadStatus: 'processed' }, processingDetails: { processingStatus: 'succeeded' }, contentDetails: { duration: 'PT30S' } })) }));
    }
    return new Response('{}', { status: 404 });
  };
  const e2 = await encryptToken(ENV, 'refresh-2', 'UCchan0000002', 'youtube');
  sql.prepare("INSERT INTO yt_channel (channel_id, title, enc_token, iv, status, created) VALUES ('UCchan0000002', 'Lexkite English', ?, ?, 'ok', 2)").run(e2.enc_token, e2.iv);
  sql.prepare("INSERT INTO yt_queue (clip, lesson, status, privacy, approved_at, updated) VALUES ('cafe-b', 'cafe-b', 'manual', 'unlisted', ?, ?)").run(Date.now() - 6e4, Date.now());
  sql.prepare("INSERT INTO yt_pack (clip, at) VALUES ('cafe-b', ?)").run(Date.now());
  sql.prepare("UPDATE yt_queue SET status = 'manual', video_id = NULL WHERE clip = 'cafe-a'").run();
  let r = await api('sync');
  const chOf = c => sql.prepare('SELECT status, video_id, channel_id FROM yt_queue WHERE clip = ?').get(c);
  ok(r.s === 200 && seen.includes('UUchan0000001') && seen.includes('UUchan0000002') && r.j.scanned === 2 && r.j.channels.length === 2, 'multi sync: both uploads playlists scanned');
  ok(r.j.live.slice().sort().join() === 'cafe-a,cafe-b', 'multi sync: clips found on either channel go live');
  ok(chOf('cafe-a').channel_id === 'UCchan0000001' && chOf('cafe-b').channel_id === 'UCchan0000002', 'queue rows record the channel each video was found on');
  ok(!r.j.issues.length && r.j.complete === true, 'multi sync: no false "other channel" / missing issues');
  sql.prepare("UPDATE yt_queue SET status = 'manual', video_id = NULL, channel_id = NULL").run();
  const e3 = await encryptToken(ENV, 'refresh-3', 'UCchan0000003', 'youtube');
  sql.prepare("INSERT INTO yt_channel (channel_id, title, enc_token, iv, status, created) VALUES ('UCchan0000003', 'Revoked', ?, ?, 'ok', 3)").run(e3.enc_token, e3.iv);
  r = await api('sync');
  ok(r.s === 200 && r.j.live.slice().sort().join() === 'cafe-a,cafe-b' && r.j.complete === false && r.j.channels.some(c => c.channel_id === 'UCchan0000003' && c.error), 'revoked channel is skipped and reported, others still sync (and nothing is flagged missing)');
  ok(sql.prepare("SELECT status FROM yt_channel WHERE channel_id = 'UCchan0000003'").get().status === 'disconnected', 'revoked channel row marked disconnected');
  globalThis.fetch = saved;
}

// ---------- 7. admin cards (jsdom) ----------
{
  const dom = new JSDOM('<!doctype html><div id="box"></div>', { url: 'https://lexkite.com/admin.html#video', runScripts: 'outside-only' }), w = dom.window, calls = [];
  w.fetch = async () => ({ json: async () => ({ items: [{ id: 'cafe-l', youtube_id: 'LLLLLLLLLLL' }] }) });
  w.confirm = () => true; w.navigator.clipboard = { writeText: async v => calls.push(['clip', v]) };
  w.eval(fs.readFileSync('web/js/admin-video.js', 'utf8'));
  const st = { channel: { status: 'ok', title: 'Lexkite', channel_id: 'UCx', is_default: true }, channels: [{ status: 'ok', title: 'Lexkite', channel_id: 'UCx', is_default: true, videos: 2, thumb: 'https://yt3.ggpht.com/a' }, { status: 'ok', title: 'Lexkite English', channel_id: 'UCy', videos: 0 }], quota: {}, queue: {}, settings: { mode: 'manual', privacy: 'private' }, manual: { ready: 1 }, scope: { ok: true }, sync: { at: Date.now(), scanned: 3, matched: 1, issues: [{ kind: 'no-marker', video_id: 'ZZZZZZZZZZZ', title: 'Mystery' }] } };
  const packs = { studio: 'https://studio.youtube.com/channel/UCx/videos/upload?d=ud', rows: [
    { id: 'cafe-r', state: 'ready', status: 'manual', pack: '/api/admin-shorts?f=x&k=z', title: 'Order <b>coffee</b>', description: 'Desc\nlk:cafe-r', tags: ['a', 'b'], marker: 'lk:cafe-r' },
    { id: 'cafe-p', state: 'uploaded', status: 'detected', err: 'private', video_id: 'PPPPPPPPPPP', title: 'P', marker: 'lk:cafe-p' },
    { id: 'cafe-l', state: 'uploaded', status: 'done', video_id: 'LLLLLLLLLLL', title: 'L', marker: 'lk:cafe-l', updated: Date.now() }] };
  const yapi = async (op, b) => { calls.push([op, b]); return op === 'status' ? st : op === 'queue' ? { rows: [] } : op === 'packs' ? packs : op === 'link' ? { ok: true, err: null } : { ok: true }; };
  const box = w.document.getElementById('box');
  w.AdminVideo.render(box, async () => ({ items: [], covers: {}, media: false }), (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => v[k]) : s), { esc: s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`), lang: () => 'vi', toast: m => calls.push(['toast', m]), yapi });
  for (let i = 0; i < 30 && !box.querySelector('.vid-ytc'); i++) await new Promise(res => setTimeout(res, 10));
  const card = id => box.querySelector(`.vid-ytc[data-id="${id}"]`), R = card('cafe-r');
  ok(R && R.querySelector('a[data-dl]').getAttribute('href').endsWith('&dl=1'), 'card: Tải gói link');
  ok(R && R.querySelectorAll('[data-cp]').length === 3 && R.querySelectorAll('.vid-ck input').length === 6, 'card: 3 copy buttons + 6-step checklist');
  ok(R && [...R.querySelectorAll('a')].some(a => a.textContent.includes('Mở YouTube Studio') && a.href.startsWith('https://studio.youtube.com/') && a.rel === 'noopener'), 'card: Open YouTube Studio');
  ok(R && !R.innerHTML.includes('<b>coffee</b>'), 'card: titles escaped');
  ok(/Sẵn sàng đăng/.test(R.textContent) && /Đã đăng \(dò thấy\)/.test(card('cafe-p').textContent) && /Trên web/.test(card('cafe-l').textContent), 'states: ready / uploaded / live (from videos.json)');
  ok(/Riêng tư/.test(card('cafe-p').textContent), 'private issue shown on the card');
  ok(/Mystery/.test(box.textContent) && /lk:…/.test(box.textContent), 'unmarked upload flagged in the admin');
  ok(box.querySelector('#yt-sync') && box.querySelector('#yt-mode').value === 'manual' && !box.querySelector('#yt-pv'), 'Đồng bộ button + mode switch; privacy picker hidden in manual mode');
  ok(box.querySelectorAll('.vid-ch').length === 2 && box.querySelector('.vid-ch.on').dataset.ch === 'UCx' && box.querySelector('.vid-ch img') && box.querySelectorAll('input[name=yt-ch]').length === 2, 'channel picker: avatar + title + radio per channel, default marked');
  ok(/Thêm kênh/.test(box.textContent) && /Chọn kênh ở màn hình Google; muốn thêm kênh khác thì bấm Thêm kênh và chọn kênh đó\./.test(box.textContent), 'Add channel button + Google-chooser hint');
  box.querySelector('input[value=UCy]').checked = true; box.querySelector('input[value=UCy]').dispatchEvent(new w.Event('change')); await new Promise(res => setTimeout(res, 5));
  ok(calls.some(c => c[0] === 'setdefault' && c[1].channel_id === 'UCy'), 'radio → op setdefault');
  box.querySelector('[data-off="UCy"]').click(); await new Promise(res => setTimeout(res, 5));
  ok(calls.some(c => c[0] === 'disconnect' && c[1].channel_id === 'UCy'), 'Ngắt kết nối → op disconnect {channel_id}');
  R.querySelector('[data-cp="tags"]').click(); await new Promise(res => setTimeout(res, 5));
  ok(calls.some(c => c[0] === 'clip' && c[1] === 'a, b'), 'copy tags');
  card('cafe-p').querySelector('[data-url]').value = 'https://youtu.be/PPPPPPPPPPP'; card('cafe-p').querySelector('[data-link]').click(); await new Promise(res => setTimeout(res, 5));
  ok(calls.some(c => c[0] === 'link' && c[1].id === 'cafe-p' && c[1].url === 'https://youtu.be/PPPPPPPPPPP'), 'paste-link fallback → op link');
  box.querySelector('#yt-sync').click(); await new Promise(res => setTimeout(res, 5));
  ok(calls.some(c => c[0] === 'sync'), 'Đồng bộ → op sync');
}

console.log(`yt-manual: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
