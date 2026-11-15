// 🔔 FCM app gốc (docs/REMINDERS.md §2/§5, docs/specs/notifications.md): bật mặc định qua mã nhưng chỉ có hiệu lực khi
//  (1) Worker THẬT SỰ gửi được (nhịp push_meta 'fcm' từ {op:'due', fcm:1}), (2) bản app có plugin FirebaseMessaging, (3) lấy được token ≤ 8 giây.
// Kiểm: ≤ 1 push/ngày/thiết bị (kể cả "đã sửa"), giờ yên lặng địa phương, không trùng ngày với lịch cục bộ, công tắc tắt dừng cả FCM,
// bản iOS 1.0 (không plugin) chỉ lịch cục bộ, getToken treo không chặn lịch, token đổi → 1 dòng, tin FCM gộp (tag/collapse), lỗi payload không xóa người dùng.
// Chạy: node scripts/test/fcm-push.mjs  (không mạng – D1 nội bộ giả bằng node:sqlite qua REST giả, như report.mjs)
import fs from 'node:fs';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';

let fail = 0, n = 0;
const ok = (c, m) => { n++; if (process.env.V) console.error('· ' + n + ' ' + m.slice(0, 60)); if (!c) { fail++; console.error('✗ ' + m); } };
const DAY = 864e5;

// ---------- Máy chủ: D1 nội bộ giả + Cache API giả ----------
const store = new Map();
globalThis.caches = { default: { async match(req) { const e = store.get(req.url); return e ? new Response(e) : undefined; }, async put(req, res) { store.set(req.url, await res.text()); } } };
const sql = new DatabaseSync(':memory:'), f0 = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (url.startsWith('https://api.cloudflare.com/client/v4/accounts/acc2/d1/')) {
    const b = JSON.parse(init.body), one = q => /^\s*(SELECT|WITH)/i.test(q.sql) ? { results: sql.prepare(q.sql).all(...(q.params || [])) } : { results: [], meta: { changes: Number(sql.prepare(q.sql).run(...(q.params || [])).changes) } };
    try { return new Response(JSON.stringify({ success: true, result: b.batch ? b.batch.map(one) : [one(b)] }), { status: 200 }); } catch (e) { return new Response(JSON.stringify({ success: false, errors: [{ code: 7500, message: String(e.message) }] }), { status: 400 }); } // lỗi SQL như D1 thật (không phải lỗi mạng → không thử lại)
  }
  if (url.includes('/graphql')) return new Response('{}', { status: 500 }); // đo D1 lỗi → vẫn chạy (≤ 40 dòng)
  throw new Error('mạng bị chặn trong test: ' + url);
};
const S = await import('../../functions/api/push.js');
const ENV = { DB: { prepare() { throw new Error('D1 người dùng – không bao giờ dùng'); } }, D1B_ACCOUNT_ID: 'acc2', D1B_TOKEN: 'tok2', PUSH_CRON_SECRET: 'cron-secret-x', PUSH_PCT: '0' };
let NOW = Date.UTC(2026, 10, 9, 11, 0); // Thứ Hai 09/11/2026 20:00 Asia/Tokyo
const realNow = Date.now; Date.now = () => NOW;
const post = (b, env = ENV, cron = false) => S.onRequestPost({ request: new Request('https://lexkite.com/api/push', { method: 'POST', headers: { 'CF-Connecting-IP': '10.1.1.' + (n % 200), ...(cron ? { 'X-Push-Cron': env.PUSH_CRON_SECRET } : {}) }, body: JSON.stringify(b) }), env }).then(async r => ({ s: r.status, j: await r.json().catch(() => ({})) }));
const cfg = (env = ENV) => S.onRequestGet({ request: new Request('https://lexkite.com/api/push?op=cfg'), env }).then(r => r.json());
const due = (fcm, env = ENV) => post({ op: 'due', fcm }, env, true);

// (1) cờ + nhịp – thuần
ok(S.fcmOn({}) && S.fcmOn({ FCM_ON: '1' }) && !S.fcmOn({ FCM_ON: '0' }) && !S.fcmOn({ FCM_ON: 'off' }), 'FCM_ON: mặc định bật (qua mã/OTA), "0"/"off" = tắt khẩn');
ok(S.fcmLive(NOW - 600e3, NOW) && !S.fcmLive(NOW - 3 * 3600e3, NOW) && !S.fcmLive(0, NOW), 'nhịp Worker: còn mới < 2 giờ; 0 = Worker không gửi được');
ok(!(await cfg({})).fcm, 'cfg: không có D1 nội bộ → fcm tắt');

// (2) chưa có nhịp (Worker cũ/thiếu FCM_SA) → app gốc giữ lịch cục bộ đủ chu kỳ
ok((await cfg()).fcm === false, 'cfg: chưa có nhịp Worker → fcm = false (máy giữ lịch cục bộ 14 ngày)');
const TOK = 'fcmtok_' + 'a'.repeat(40), TOK2 = 'fcmtok_' + 'b'.repeat(40);
const sub = await post({ op: 'sub', k: 'fcm', token: TOK, lmin: 1200, q: [1320, 480], tz: 'Asia/Tokyo', lang: 'ja', st: 0 });
ok(sub.s === 200 && /^[a-f0-9]{32}$/.test(sub.j.id), 'sub FCM nhận được khi cờ mặc định bật: ' + JSON.stringify(sub));
const ID = sub.j.id, back = d => sql.prepare('UPDATE push_subs SET act = ?, last = 0, done = 0 WHERE id = ?').run(S.localDay(NOW, 'Asia/Tokyo') - d, ID);
back(3);
let r = await due(0);
ok(r.s === 200 && !(r.j.fcm || []).length && sql.prepare('SELECT last FROM push_subs WHERE id = ?').get(ID).last === 0, 'Worker báo fcm:0 → không lấy dòng FCM, KHÔNG đánh dấu đã gửi: ' + JSON.stringify(r.j));
ok((await cfg()).fcm === false, 'cfg: nhịp fcm:0 → vẫn tắt');

// (3) Worker có FCM_SA → nhịp → cfg bật; đúng giờ địa phương → 1 lời nhắc kéo lại
r = await due(1);
ok(r.j.fcm && r.j.fcm.length === 1 && r.j.fcm[0].kind === 'back' && r.j.fcm[0].lang === 'ja' && r.j.fcm[0].token === TOK, 'ngày 3 không mở app, 20:00 Tokyo → 1 FCM "back" (ja): ' + JSON.stringify(r.j));
ok((await cfg()).fcm === true, 'cfg: Worker vừa báo gửi được → fcm = true');
NOW += 10 * 60e3; r = await due(1);
ok(!(r.j.fcm || []).length, '≤ 1/ngày: lượt cron kế tiếp không gửi lại');
NOW += 22 * 3600e3; r = await due(1); // 18:10 hôm sau – chưa tới giờ địa phương
ok(!(r.j.fcm || []).length, 'chỉ đúng giờ địa phương (cửa sổ 40 phút)');
ok((await cfg({ ...ENV, FCM_ON: '0' })).fcm === false && !((await due(1, { ...ENV, FCM_ON: '0' })).j.fcm || []).length, 'FCM_ON=0 → tắt khẩn cả cfg lẫn cron');

// (4) không trùng ngày với lịch cục bộ: ngày 0–2 (kể cả Chủ nhật) máy chủ KHÔNG gửi
NOW = Date.UTC(2026, 10, 8, 11, 0); // Chủ nhật 08/11 20:00 Tokyo
for (const d of [0, 1, 2]) { back(d); r = await due(1); ok(!(r.j.fcm || []).length, `ngày ${d} (CN) → lịch cục bộ lo, máy chủ không gửi thêm (trước 05/11: "tiến bộ tuần" trùng ngày)`); }
back(14); r = await due(1); ok(r.j.fcm && r.j.fcm[0].kind === 'miss' && sql.prepare('SELECT done FROM push_subs WHERE id = ?').get(ID).done === 1, 'ngày 14 → lời cuối rồi dừng (done = 1)');

// (5) giờ yên lặng địa phương: giờ nhắc lọt vào 22:00–08:00 → không bao giờ gửi
const subQ = await post({ op: 'sub', k: 'fcm', token: 'fcmtok_' + 'q'.repeat(40), lmin: 1350, q: [1320, 480], tz: 'America/New_York', lang: 'en' });
sql.prepare('UPDATE push_subs SET act = act - 3 WHERE id = ?').run(subQ.j.id);
let hit = 0; for (let t = 0; t < 24 * 6; t++) { NOW = Date.UTC(2026, 10, 10, 0, 0) + t * 600e3; const x = await due(1); hit += (x.j.fcm || []).filter(y => y.id === subQ.j.id).length; }
ok(hit === 0, 'giờ nhắc 22:30 trong giờ yên lặng New York → 0 push cả ngày');

// (6) "đã sửa" + lời nhắc cùng thiết bị cùng lượt → 1 push (đã sửa thay lời nhắc); sau đó ≤ 1/ngày
NOW = Date.UTC(2026, 10, 12, 11, 0); back(3);
sql.exec(S.PUSH_NOW_SQL); sql.prepare('INSERT INTO push_now (sid, rid, at) VALUES (?, ?, ?), (?, ?, ?)').run(ID, 7, NOW - 3600e3, ID, 8, NOW - 1800e3);
r = await due(1);
const mine = (r.j.fcm || []).filter(x => x.id === ID);
ok(mine.length === 1 && mine[0].kind === 'fixed' && mine[0].rid === 'LX-1007', '1 thiết bị/lượt: "đã sửa" thay lời nhắc, không 2 thông báo: ' + JSON.stringify(mine));
ok(sql.prepare('SELECT COUNT(*) AS n FROM push_now WHERE sid = ?').get(ID).n === 1, 'phiếu thứ 2 của cùng thiết bị chờ lượt sau (không mất)');
NOW += 2 * 3600e3; r = await due(1);
ok(!(r.j.fcm || []).some(x => x.id === ID), '"đã sửa" thứ 2 trong 20 giờ → chờ (≤ 1 push/ngày)');
NOW += 19 * 3600e3; r = await due(1);
ok((r.j.fcm || []).some(x => x.id === ID && x.rid === 'LX-1008'), 'sau 20 giờ, ngoài giờ yên lặng → gửi phiếu còn lại');
{ const at = Date.UTC(2026, 10, 12, 3, 0), row = o => ({ sid: 'c'.repeat(32), rid: 1, at: at - 60e3, k: 'fcm', ep: 't'.repeat(30), tz: 'UTC', q1: 1320, q2: 420, lang: 'en', last: 0, ...o });
  ok(!S.pickFixed([row()], {}, at, 40, new Set(), false).fcm.length && S.pickFixed([row()], {}, at, 40, new Set(), false).drop.length === 1, 'pickFixed: Worker không gửi được FCM → bỏ (không giả vờ đã gửi)');
  ok(!S.pickFixed([row({ last: at - 3600e3 })], {}, at).fcm.length && !S.pickFixed([row({ last: at - 3600e3 })], {}, at).drop.length, 'pickFixed: đã nhận push 1 giờ trước → giữ hàng đợi, không gửi'); }

// (7) touch/unsub: công tắc tắt → máy chủ xóa dòng
ok((await post({ op: 'unsub', id: ID })).j.ok && !sql.prepare('SELECT id FROM push_subs WHERE id = ?').get(ID), 'unsub xóa thiết bị (công tắc tắt)');
Date.now = realNow; globalThis.fetch = f0;

// ---------- Worker: tin FCM + phân loại lỗi ----------
const wsrc = fs.readFileSync('workers/push/index.js', 'utf8').replace(/^import COPY from '\.\/copy\.json';$/m, 'const COPY = ' + fs.readFileSync('workers/push/copy.json', 'utf8') + ';');
const W = await import('data:text/javascript;base64,' + Buffer.from(wsrc).toString('base64'));
const COPY = JSON.parse(fs.readFileSync('workers/push/copy.json', 'utf8'));
for (const lang of Object.keys(COPY)) for (const kind of ['back', 'miss', 'fixed']) {
  const m = W.fcmMessage({ token: 'tok', lang, kind, rid: 'LX-1042' }).message;
  ok([...m.notification.title].length <= 60 && [...m.notification.body].length <= 110 && !/\{\w+\}/.test(m.notification.title + m.notification.body), `FCM ${lang}.${kind}: tiêu đề ≤ 60, thân ≤ 110, không còn biến`);
  ok(m.android.notification.tag === m.apns.headers['apns-collapse-id'] && m.android.collapse_key === m.android.notification.tag && m.apns.payload.aps['thread-id'], `FCM ${lang}.${kind}: lời nhắc mới THAY lời cũ (tag/collapse), không chồng`);
}
const mt = W.fcmMessage({ topic: 'lk-ci-dryrun', lang: 'en', kind: 'back' }).message;
ok(mt.topic === 'lk-ci-dryrun' && !('token' in mt), 'fcmMessage topic (CI dry-run validate_only) không kèm token');
ok(W.fcmResult(200) === 'ok' && W.fcmResult(404, '') === 'gone' && W.fcmResult(400, '{"error":{"status":"INVALID_ARGUMENT","message":"The registration token is not a valid FCM registration token"}}') === 'gone'
  && W.fcmResult(400, '{"error":{"status":"INVALID_ARGUMENT","message":"Invalid JSON payload received. Unknown name \\"x\\""}}') === 'fail' && W.fcmResult(403, 'SENDER_ID_MISMATCH') === 'gone' && W.fcmResult(503, 'UNAVAILABLE') === 'fail',
'fcmResult: token chết → xóa; lỗi payload/tạm của ta → giữ người dùng (trước 05/11 mọi INVALID_ARGUMENT xóa đăng ký)');
{ const calls = []; const f1 = globalThis.fetch; globalThis.fetch = async (u, i) => { calls.push([String(u), i && i.body]); return new Response('{"web":[],"fcm":[]}', { status: 200 }); };
  await W.run({ API: 'https://x.test', PUSH_CRON_SECRET: 's' }); await W.run({ API: 'https://x.test', PUSH_CRON_SECRET: 's', FCM_SA: '{}' }); globalThis.fetch = f1;
  const pc = calls.filter(c => c[0].endsWith('/api/push'));
  ok(JSON.parse(pc[0][1]).fcm === 0 && JSON.parse(pc[1][1]).fcm === 1, 'Worker báo máy chủ có FCM_SA hay không (nhịp)');
  ok(calls.filter(c => c[0].endsWith('/api/mail') && JSON.parse(c[1]).op === 'tick').length === 2, 'mỗi lượt cron gọi thêm /api/mail tick (email opt-in)'); }

// ---------- Máy khách (web/js/remind.js phần app gốc, vm + giả lập Capacitor) ----------
const RSRC = fs.readFileSync('web/js/remind.js', 'utf8');
const pure = (() => { const g = { self: null, setTimeout, clearTimeout }; g.self = g; vm.runInNewContext(RSRC, g); return g.Remind; })();
ok(!pure.fcmCapable(undefined) && !pure.fcmCapable({ Plugins: {} }) && !pure.fcmCapable({ Plugins: { FirebaseMessaging: {} }, isPluginAvailable: () => false }) && pure.fcmCapable({ Plugins: { FirebaseMessaging: {} }, isPluginAvailable: k => k === 'FirebaseMessaging' }),
  'fcmCapable: bản app thiếu plugin (iOS 1.0) → không FCM');
ok(await pure.within(new Promise(() => {}), 20).then(() => false, e => /timeout/.test(e.message)), 'within: promise treo → hết giờ (không chặn lịch cục bộ)');

async function app({ plugin = true, avail = true, fcm = true, token = TOK, hang = false, on = true, perm = 'granted', saved = null } = {}) {
  const ls = new Map(saved ? [['lk.fcm', JSON.stringify(saved)]] : []), posts = [], sched = [], asked = [];
  const FM = { getToken: () => (hang ? new Promise(() => {}) : Promise.resolve({ token })), addListener: () => ({}) };
  const g = {
    console, JSON, Math, Date, Promise, Object, Array, Set, Map, String, Number, RegExp, Error, Intl, URL, encodeURIComponent,
    setTimeout: (f, ms) => setTimeout(f, ms >= 8000 ? 5 : ms), clearTimeout, setInterval: () => 0,
    localStorage: { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
    location: { hostname: 'localhost', search: '', href: 'capacitor://localhost/', hash: '' }, navigator: { userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5 },
    document: { hidden: false, addEventListener() {}, getElementById: () => null, querySelector: () => null, body: {} }, addEventListener() {},
    MutationObserver: class { observe() {} disconnect() {} },
    fetch: async (u, i = {}) => { if (/op=cfg/.test(u)) return new Response(JSON.stringify({ on: false, fcm })); const b = JSON.parse(i.body); posts.push(b); return new Response(JSON.stringify(b.op === 'sub' ? { id: 'e'.repeat(32) } : { ok: true })); },
    Response, VBNative: { is: true },
    Capacitor: { isPluginAvailable: k => avail && k === 'FirebaseMessaging', Plugins: plugin ? { FirebaseMessaging: FM } : {} },
    Core: { Store: { isExtension: false }, Cards: {}, todayKey: () => pure.keyOf(new Date()) },
    App: { state: { settings: { reminderOn: on, reminderAuto: true, quietStart: '22:00', quietEnd: '08:00' }, stats: { hours: Array(24).fill(0), days: {} }, cards: {} }, view: {}, streak: () => 0 },
  };
  g.self = g; vm.runInNewContext(RSRC, g);
  const LN = { cancel: async () => {}, checkPermissions: async () => ({ display: perm }), requestPermissions: async () => { asked.push(1); return { display: 'granted' }; }, schedule: async o => { sched.push(...o.notifications); } };
  await g.Remind.native(LN, { ask: false });
  const days = sched.map(x => Math.round((x.schedule.at - Date.now()) / DAY));
  return { posts, sched, days, asked, fcm: ls.has('lk.fcm') ? JSON.parse(ls.get('lk.fcm')) : null };
}
let a = await app({ plugin: false });
ok(a.sched.length >= 7 && Math.max(...a.days) >= 13 && !a.posts.some(p => p.op === 'sub') && !a.asked.length, 'bản iOS 1.0 (không plugin): lịch cục bộ đủ 14 ngày, không đăng ký FCM, không hỏi quyền: ' + a.days);
a = await app({ avail: false });
ok(!a.posts.some(p => p.op === 'sub') && Math.max(...a.days) >= 13, 'plugin không khả dụng (isPluginAvailable) → chỉ lịch cục bộ');
a = await app();
ok(a.posts.some(p => p.op === 'sub' && p.k === 'fcm' && p.token === TOK && p.tz && p.q) && a.fcm && a.fcm.tok === TOK && a.sched.length && Math.max(...a.days) <= 3, 'đủ điều kiện → đăng ký FCM, lịch cục bộ chỉ 3 ngày đầu: ' + a.days);
a = await app({ fcm: false, saved: { id: 'd'.repeat(32), tok: TOK } });
ok(a.posts.some(p => p.op === 'unsub' && p.id === 'd'.repeat(32)) && !a.fcm && Math.max(...a.days) >= 13, 'máy chủ thôi FCM (Worker mất FCM_SA) → hủy dòng cũ + lịch cục bộ đủ chu kỳ (không mất, không trùng)');
a = await app({ hang: true });
ok(!a.posts.some(p => p.op === 'sub') && a.sched.length && Math.max(...a.days) >= 13, 'getToken treo (bản thiếu APNs) → hết giờ, lịch cục bộ vẫn lên đủ');
a = await app({ on: false, saved: { id: 'd'.repeat(32), tok: TOK } });
ok(a.posts.some(p => p.op === 'unsub' && p.id === 'd'.repeat(32)) && !a.fcm && !a.sched.length, 'tắt "Nhắc học" → hủy cả FCM máy chủ (một công tắc cho mọi kênh)');
a = await app({ perm: 'denied', saved: { id: 'd'.repeat(32), tok: TOK } });
ok(a.posts.some(p => p.op === 'unsub') && !a.asked.length && !a.sched.length, 'hệ điều hành chặn thông báo → không hỏi lại, máy chủ thôi gửi');
a = await app({ token: TOK2, saved: { id: 'd'.repeat(32), tok: TOK } });
ok(a.posts.findIndex(p => p.op === 'unsub' && p.id === 'd'.repeat(32)) >= 0 && a.posts.findIndex(p => p.op === 'unsub') < a.posts.findIndex(p => p.op === 'sub') && a.fcm.tok === TOK2, 'token đổi → hủy dòng cũ rồi mới đăng ký (1 thiết bị = 1 dòng, không 2 thông báo)');

console.log(fail ? `✗ fcm-push: ${fail}/${n} lỗi` : `✓ fcm-push: ${n} kiểm`);
process.exit(fail ? 1 : 0);
