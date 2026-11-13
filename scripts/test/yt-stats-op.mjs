// functions/api/youtube.js op `stats` (CLI, chỉ đọc): thống kê kênh + video, snapshot D1, tăng trưởng 7 ngày, video bị gỡ, cầu dao hạn mức. Google giả, sqlite trong bộ nhớ.
import { DatabaseSync } from 'node:sqlite';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const Y = await import('../../functions/api/youtube.js');
const { driveSign } = await import('../video/library.mjs');
const { encryptToken } = await import('../../functions/api/drive.js');
const sql = new DatabaseSync(':memory:');
const exec = (q, a) => /^\s*(SELECT|WITH)|RETURNING/i.test(q) ? { results: sql.prepare(q).all(...a) } : (sql.prepare(q).run(...a), { results: [] });
const DB = { prepare(q) { const st = { q, args: [], bind(...a) { return { ...st, args: a }; }, async run() { return exec(q, this.args); }, async all() { return exec(q, this.args); }, async first() { return exec(q, this.args).results[0] || null; } }; return st; },
  async batch(list) { for (const x of list) await x.run(); return []; } };
const KEY = 'k'.repeat(40);
const ENV = { DB, DRIVE_ENC_KEY: Buffer.alloc(32, 7).toString('base64'), GOOGLE_DRIVE_CLIENT_ID: 'cid', GOOGLE_DRIVE_CLIENT_SECRET: 'csec', LEXKITE_DRIVE_CLI_KEY: KEY };
const calls = []; let sent = 0;
globalThis.fetch = async (url) => {
  const u = String(url); calls.push(u);
  if (u.startsWith('https://oauth2.googleapis.com/token')) return new Response(JSON.stringify({ access_token: 'at', expires_in: 3600 }));
  if (u.includes('/youtube/v3/channels?')) return new Response(JSON.stringify({ items: [{ statistics: { subscriberCount: '12', viewCount: '300', videoCount: '2' } }] }));
  if (u.includes('/youtube/v3/videos?')) return new Response(JSON.stringify({ items: [{ id: 'AAAAAAAAAAA', status: { privacyStatus: 'public' }, contentDetails: { duration: 'PT28S' }, statistics: { viewCount: '250', likeCount: '9', commentCount: '2' } }] })); // BBBBBBBBBBB không có → bị gỡ
  throw new Error('unexpected ' + u);
};
const api = async (op, body = {}) => { const text = JSON.stringify({ op, ...body }); const r = await Y.onRequestPost({ request: new Request('https://lexkite.com/api/youtube', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.1.0.' + (sent++ % 200), ...driveSign(KEY, text) }, body: text }), env: ENV }); return { s: r.status, j: await r.json() }; };
await api('quota');
const e = await encryptToken(ENV, 'refresh-1', 'UCchan0000001', 'youtube');
sql.prepare("INSERT INTO yt_channel (channel_id, title, enc_token, iv, status, created) VALUES ('UCchan0000001', 'Lexkite', ?, ?, 'ok', 1)").run(e.enc_token, e.iv);
for (const [c, v] of [['a', 'AAAAAAAAAAA'], ['b', 'BBBBBBBBBBB']]) sql.prepare("INSERT INTO yt_queue (clip, status, privacy, video_id, channel_id, updated) VALUES (?, 'done', 'public', ?, 'UCchan0000001', 1)").run(c, v);
sql.prepare("INSERT INTO yt_meta (k, v) VALUES ('scope', 'https://www.googleapis.com/auth/youtube.readonly')").run();
sql.prepare('CREATE TABLE IF NOT EXISTS yt_stats (day TEXT, video_id TEXT, channel_id TEXT, views INTEGER, likes INTEGER, comments INTEGER, PRIMARY KEY (day, video_id))').run();
sql.prepare("INSERT INTO yt_stats VALUES (date('now','-7 day'), 'AAAAAAAAAAA', 'UCchan0000001', 200, 5, 1)").run();
let r = await api('stats');
ok(r.s === 200 && r.j.channels[0].subs === 12, 'kênh: subs');
const A = r.j.videos.find(v => v.video_id === 'AAAAAAAAAAA'), B = r.j.videos.find(v => v.video_id === 'BBBBBBBBBBB');
ok(A && A.views === 250 && A.likes === 9 && A.secs === 28 && A.clip === 'a', 'video: số liệu + clip');
ok(A.d7 === 50 && A.d30 === null, 'tăng trưởng 7 ngày = chênh snapshot; 30 ngày chưa có → null');
ok(B && B.missing === true, 'video không còn trên YouTube → missing (cảnh báo gỡ/hạn chế)');
ok(r.j.analytics === false, 'chưa có scope Analytics → analytics=false');
ok(sql.prepare("SELECT views FROM yt_stats WHERE day = date('now') AND video_id = 'AAAAAAAAAAA'").get().views === 250, 'snapshot ghi D1');
ok(calls.filter(u => u.includes('/youtube/v3/')).length === 2, 'hạn mức: 1 channels.list + 1 videos.list');
ok((await api('stats', { snapshot: false })).s === 200, 'snapshot:false vẫn chạy');
sql.prepare("INSERT OR REPLACE INTO yt_quota (day, units) VALUES (?, 50000)").run(Y.quotaDay ? Y.quotaDay(Date.now()) : new Date().toISOString().slice(0, 10));
r = await api('stats'); ok(r.s === 429 && r.j.error === 'quota-breaker', 'đã dùng ≥ 80 % hạn mức → cầu dao 429');
const forged = await Y.onRequestPost({ request: new Request('https://lexkite.com/api/youtube', { method: 'POST', body: '{"op":"stats"}', headers: { 'CF-Connecting-IP': '10.2.0.1' } }), env: ENV });
ok(forged.status !== 200, 'không chữ ký → không đọc được');
if (fails) process.exit(1); console.log('yt-stats-op ok', n);
