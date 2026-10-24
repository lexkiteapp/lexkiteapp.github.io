// ⏰ Nhắc học (docs/REMINDERS.md): bộ lập lịch (giờ, giới hạn 1/ngày, giờ yên lặng, giãn cách, lời cuối ngày 14, không lặp mẫu 7 ngày),
// múi giờ thật (Asia/Ho_Chi_Minh, America/New_York qua mốc đổi giờ, Asia/Kolkata +5:30, Pacific/Auckland) cho cả máy khách lẫn cron,
// service worker (push → thông báo từ kế hoạch đã dịch, bấm → 'open'), câu FCM 15 ngôn ngữ (thiếu → en, không bao giờ vi).
import fs from 'node:fs';
import vm from 'node:vm';
let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.error('✗ ' + m); } };
const load = () => { const g = { self: null }; g.self = g; vm.runInNewContext(fs.readFileSync('web/js/remind.js', 'utf8'), g); return g.Remind; };
const DAY = 864e5, key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const hours = h => { const a = Array(24).fill(0); a[h] = 20; a[(h + 5) % 24] = 3; return a; };
const daysAgo = (now, k) => Object.fromEntries(Array.from({ length: k }, (_, i) => [key(new Date(now - (i + 1) * DAY)), 5]));
const card = (w, due, ctx) => ({ word: w, ctx, srs: { reps: 2, last: 1, due } });

for (const TZ of ['Asia/Ho_Chi_Minh', 'America/New_York', 'Asia/Kolkata', 'Pacific/Auckland']) {
  process.env.TZ = TZ;
  const R = load();
  // New York: kế hoạch bắc qua mốc đổi giờ 01/11/2026 – vẫn đúng 19:30 giờ địa phương mỗi ngày
  const now = new Date(2026, 9, 28, 9, 0).getTime();
  const base = { now, settings: { reminderOn: true, reminderAuto: true, quietStart: '22:00', quietEnd: '07:00' }, stats: { hours: hours(20), days: daysAgo(now, 5) }, streak: 4, cards: [card('resilient', now + 2 * DAY, 'She stayed resilient after the storm.'), card('cope', now - DAY, '')] };
  const p = R.plan(base);
  ok(p.length >= 7, `${TZ}: kế hoạch ${p.length} lời nhắc`);
  ok(p.every(x => { const d = new Date(x.at); return d.getHours() === 19 && d.getMinutes() === 30; }), `${TZ}: mọi lời nhắc lúc 19:30 giờ địa phương (30 phút trước giờ hay học 20:00) – ${p.map(x => new Date(x.at).toTimeString().slice(0, 5)).join(',')}`);
  ok(new Set(p.map(x => x.day)).size === p.length, `${TZ}: tối đa 1 lời nhắc/ngày`);
  ok(JSON.stringify(p.map(x => x.d)) === JSON.stringify([0, 1, 2, 3, 5, 7, 10, 14]), `${TZ}: giãn cách sau 3 lần bỏ qua + dừng sau ngày 14: ${p.map(x => x.d)}`);
  ok(p[p.length - 1].type === 'miss' && p.filter(x => x.type === 'miss').length === 1, `${TZ}: lời cuối "Kit nhớ bạn" đúng 1 lần ở ngày 14`);
  ok(p[0].type === 'streak', `${TZ}: chưa học hôm nay + có chuỗi → nhắc chuỗi sắp mất (${p[0].type})`);
  const win = p.filter(x => x.d <= 7).map(x => x.tpl); ok(new Set(win).size === win.length, `${TZ}: không lặp mẫu trong 7 ngày: ${win}`);
  ok(p.some(x => x.type === 'word' && /resilient/.test(x.title + x.body) && /storm/.test(x.body) && x.url === '#/review?w=resilient'), `${TZ}: có lời nhắc từ trong sổ kèm câu ngữ cảnh + liên kết sâu`);
  // giờ yên lặng: người hay học 23:00 → 22:30 rơi vào yên lặng → dời về 21:30
  const q = R.plan({ ...base, stats: { hours: hours(23), days: daysAgo(now, 5) } });
  ok(q.every(x => new Date(x.at).getHours() === 21 && new Date(x.at).getMinutes() === 30), `${TZ}: giờ yên lặng 22:00–07:00 → dời về 21:30`);
  ok(R.clampQuiet(6 * 60, { quietStart: '22:00', quietEnd: '07:00' }) === 7 * 60 && R.inQuiet(23 * 60, {}) && !R.inQuiet(20 * 60, {}), `${TZ}: clampQuiet/inQuiet`);
  // chưa đủ dữ liệu → 20:00; đã học hôm nay → bỏ ngày 0; tắt → rỗng; FCM (remote) → chỉ ngày < 3, không tiến bộ tuần
  const f = R.plan({ ...base, stats: { hours: Array(24).fill(0), days: {} } });
  ok(f.every(x => new Date(x.at).getHours() === 20 && new Date(x.at).getMinutes() === 0), `${TZ}: mặc định 20:00`);
  const st = R.plan({ ...base, stats: { ...base.stats, days: { ...base.stats.days, [key(new Date(now))]: 3 } } });
  ok(!st.some(x => x.d === 0) && st[0].type === 'streak' && st[0].d === 1, `${TZ}: đã học hôm nay → không nhắc hôm nay, mai nhắc giữ chuỗi`);
  ok(R.plan({ ...base, settings: { ...base.settings, reminderOn: false } }).length === 0, `${TZ}: tắt nhắc → không lên lịch`);
  const rm = R.plan({ ...base, remote: true }); ok(rm.every(x => x.d < 3 && x.type !== 'week'), `${TZ}: có FCM → lịch cục bộ chỉ 3 ngày đầu`);
  const ty = R.plan({ ...base, settings: { ...base.settings, remTypes: { streak: false, word: false, conf: false, week: false } } });
  ok(ty.filter(x => x.type !== 'miss').every(x => x.type === 'due'), `${TZ}: lọc theo loại người dùng chọn`);
  const late = R.plan({ ...base, now: new Date(2026, 9, 28, 21, 0).getTime() }); ok(late[0].d === 1, `${TZ}: giờ hôm nay đã qua → bắt đầu từ mai`);
}
process.env.TZ = 'UTC';
// ---------- Máy chủ: khung UTC theo múi giờ IANA, giờ địa phương, giờ yên lặng, đổi giờ mùa hè ----------
const S = await import('../../functions/api/push.js');
const C = load();
ok(JSON.stringify(S.SEQ) === JSON.stringify(C.SEQ) && S.FINAL === C.FINAL, 'SEQ máy chủ = máy khách');
const L = 19 * 60 + 30;
const cases = [['Asia/Ho_Chi_Minh', Date.UTC(2026, 9, 28, 12, 30), 750], ['America/New_York', Date.UTC(2026, 9, 28, 23, 30), 1410], ['America/New_York', Date.UTC(2026, 10, 2, 0, 30), 30], ['Asia/Kolkata', Date.UTC(2026, 9, 28, 14, 0), 840], ['Pacific/Auckland', Date.UTC(2026, 9, 28, 6, 30), 390]];
for (const [tz, at, slot] of cases) {
  ok(S.slotFor(L, tz, at - 3 * 3600e3) === slot, `${tz}: khung UTC ${S.slotFor(L, tz, at - 3 * 3600e3)} = ${slot}`);
  const row = { id: 'a'.repeat(32), k: 'web', ep: 'https://fcm.googleapis.com/fcm/send/x', tz, lmin: L, q1: 1320, q2: 420, act: S.localDay(at, tz) - 1, std: 0, last: 0, done: 0 };
  ok(S.pickDue([row], at + 5 * 60e3).web.length === 1, `${tz}: đến giờ địa phương 19:30 → gửi`);
  ok(S.pickDue([row], at - 3 * 3600e3).web.length === 0, `${tz}: chưa tới giờ địa phương → không gửi`);
  ok(S.pickDue([{ ...row, lmin: 22 * 60 + 30 }], at + 3 * 3600e3).web.length === 0, `${tz}: giờ yên lặng địa phương → không gửi`);
  ok(S.pickDue([{ ...row, std: S.localDay(at, tz) }], at + 60e3).web.length === 0, `${tz}: đã học hôm nay → không gửi`);
  ok(S.pickDue([{ ...row, last: at - 3600e3 }], at + 60e3).web.length === 0, `${tz}: tối đa 1/ngày`);
}
// New York: cùng 19:30 địa phương, trước/sau mốc đổi giờ → khung UTC đổi 23:30 → 00:30
ok(S.slotFor(L, 'America/New_York', Date.UTC(2026, 9, 31, 12)) === 1410 && S.slotFor(L, 'America/New_York', Date.UTC(2026, 10, 1, 12)) === 30, 'New York: khung UTC dời theo DST');
const r0 = { id: 'b'.repeat(32), tz: 'Asia/Kolkata', lmin: L, q1: 1320, q2: 420, std: 0, last: 0, done: 0, lang: 'ja' }, at0 = Date.UTC(2026, 9, 28, 14, 5);
const back = d => S.pickDue([{ ...r0, k: 'web', ep: 'https://x.push.apple.com/a', act: S.localDay(at0, 'Asia/Kolkata') - d }], at0).web.length;
ok([0, 1, 2, 3, 5, 7, 10, 14].every(d => back(d) === 1) && [4, 6, 8, 9, 11, 13, 15, 20].every(d => back(d) === 0), 'Web Push: giãn cách 1,2,3 → 5,7,10 → 14 rồi dừng');
const fc = d => S.pickDue([{ ...r0, k: 'fcm', ep: 'tok_'.repeat(8), act: S.localDay(at0, 'Asia/Kolkata') - d }], at0);
ok(fc(1).fcm.length === 0 && fc(3).fcm[0].kind === 'back' && fc(14).fcm[0].kind === 'miss' && fc(14).final.length === 1 && fc(3).fcm[0].lang === 'ja', 'FCM: chỉ kéo lại từ ngày 3, lời cuối ngày 14, giữ ngôn ngữ');
ok(S.tzOk('Asia/Kolkata') === 'Asia/Kolkata' && S.tzOk('Nope/Zone') === 'UTC' && S.tzOk('x"; DROP') === 'UTC', 'tzOk chỉ nhận múi IANA hợp lệ');
ok(S.PUSH_HOST.test('https://fcm.googleapis.com/fcm/send/abc') && S.PUSH_HOST.test('https://web.push.apple.com/QAB') && !S.PUSH_HOST.test('https://evil.com/fcm.googleapis.com/') && !S.PUSH_HOST.test('http://fcm.googleapis.com/x'), 'chống SSRF: chỉ máy chủ push thật');
// ---------- Worker: câu FCM theo ngôn ngữ, rơi về en ----------
const src = fs.readFileSync('workers/push/index.js', 'utf8').replace(/^import COPY from '\.\/copy\.json';$/m, 'const COPY = ' + fs.readFileSync('workers/push/copy.json', 'utf8') + ';');
const W = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
ok(W.copyOf('ja', 'miss')[0].includes('Kit') && !/[ạảấầậđ]/.test(W.copyOf('ja', 'back').join('')), 'FCM ja đúng ngôn ngữ');
ok(W.copyOf('xx', 'back')[0] === W.copyOf('en', 'back')[0] && W.copyOf('vi', 'back')[0] !== W.copyOf('en', 'back')[0], 'FCM: ngôn ngữ lạ → en (không bao giờ vi)');
const m = W.fcmMessage({ token: 't', lang: 'ar', kind: 'week' }).message; ok(m.token === 't' && m.data.route === '#/stats' && m.notification.title && m.apns && m.android, 'FCM v1 message');
// ---------- Service worker: push → lời nhắc hôm nay từ kế hoạch đã dịch; click → 'open' ----------
const shown = [], posts = [], store = {}, L2 = {};
const today = key(new Date());
store['/__meta'] = JSON.stringify({ v: 2, plan: [{ day: today, title: 'T-today', body: 'B', url: '/app/#/review?w=x', tpl: 'word2' }], gen: { title: 'G', body: 'g', tpl: 'gen1' }, miss: { title: 'M', body: 'm', tpl: 'ms1' }, act: today });
const caches = { open: async () => ({ match: async k => (store[k] ? { json: async () => JSON.parse(store[k]) } : null), put: async (k, r) => { store[k] = await r.text(); } }), keys: async () => [] };
const self = { registration: { scope: 'https://lexkite.com/app/', showNotification: async (t, o) => shown.push([t, o]) }, addEventListener: (t, f) => { L2[t] = f; }, clients: { matchAll: async () => [], openWindow: async () => {}, claim: async () => {} }, skipWaiting: () => {} };
class Resp { constructor(b) { this.b = b; } async text() { return String(this.b); } async json() { return JSON.parse(this.b); } }
vm.runInNewContext(fs.readFileSync('web/sw.js', 'utf8'), { self, caches, location: { origin: 'https://lexkite.com' }, URL, Response: Resp, Request: class {}, fetch: async (u, o) => { posts.push(JSON.parse(o.body)); return {}; }, console, setTimeout, clearTimeout, Date, JSON, Promise });
const run = async (t, ev) => { let p; ev.waitUntil = x => { p = x; }; L2[t](ev); await p; };
await run('push', {});
ok(shown.length === 1 && shown[0][0] === 'T-today' && shown[0][1].data.tpl === 'word2', 'SW push: thông báo = kế hoạch hôm nay');
ok(posts.some(b => b.op === 'ev' && b.e[0][0] === 'shown' && b.e[0][1] === 'word2'), 'SW push: đếm shown theo mẫu');
store['/__meta'] = JSON.stringify({ v: 2, plan: [], gen: { title: 'G', body: 'g', tpl: 'gen1' }, miss: { title: 'M', body: 'm', tpl: 'ms1' }, act: key(new Date(Date.now() - 15 * DAY)) });
await run('push', {}); ok(shown[1][0] === 'M', 'SW push: lâu không mở app → câu "Kit nhớ bạn" (đã dịch)');
delete store['/__meta']; await run('push', {}); ok(shown.length === 3, 'SW push: không có dữ liệu vẫn LUÔN hiện thông báo (iOS/Safari bắt buộc)');
await run('notificationclick', { notification: { close() {}, data: { url: '/app/#/review', tpl: 'due1' } } });
ok(posts.some(b => b.op === 'ev' && b.e[0][0] === 'open' && b.e[0][1] === 'due1'), 'SW click: đếm open theo mẫu');
console.log(fail ? `✗ reminders: ${fail}/${n} lỗi` : `✓ reminders: ${n} kiểm`);
process.exit(fail ? 1 : 0);
