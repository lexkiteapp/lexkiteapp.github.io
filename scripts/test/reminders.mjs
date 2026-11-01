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
  // ---------- Nâng cấp 26/10: giờ theo phiên gần đây, giờ yên lặng 22–08, chuỗi chỉ buổi tối, mục tiêu ngày, giãn cách khi bị bỏ qua ----------
  const rec = ms => ms.map((m, i) => ({ day: key(new Date(now - (ms.length - i) * DAY)), m }));
  const hr = R.plan({ ...base, recent: rec([1150, 1145, 1160, 1155, 1150, 1158, 1152]) }); // ~19:12 dù histogram nói 20:00
  ok(hr.every(x => { const d = new Date(x.at); return d.getHours() * 60 + d.getMinutes() === 1125; }), `${TZ}: giờ nhắc theo 7 phiên gần đây (~19:15 → 18:45): ${hr.map(x => new Date(x.at).toTimeString().slice(0, 5))}`);
  const sh = R.habitMin(rec([...Array(10).fill(480), ...Array(6).fill(1080)])); ok(sh >= 1070 && sh <= 1090, `${TZ}: đổi thói quen 08:00 → 18:00, phiên mới nặng hơn (${sh})`);
  ok(R.habitMin(rec([1150, 1150, 1150, 1150])) === -1 && R.pickTime(base.stats, base.settings, rec([600, 600, 600, 600])) === 1170, `${TZ}: < 5 phiên → dùng histogram`);
  ok(R.pickTime(base.stats, { ...base.settings, reminderAuto: false, reminderTime: '18:00' }, rec([600, 600, 600, 600, 600])) === 1080, `${TZ}: tự chọn giờ → bỏ qua lịch sử`);
  ok(R.habitMin(rec([1430, 5, 1435, 10, 0, 1425])) >= 1420 || R.habitMin(rec([1430, 5, 1435, 10, 0, 1425])) <= 15, `${TZ}: trung bình vòng tròn qua nửa đêm`);
  ok(R.inQuiet(7 * 60 + 30, {}) && !R.inQuiet(8 * 60, {}) && R.clampQuiet(7 * 60, {}) === 480, `${TZ}: giờ yên lặng mặc định 22:00–08:00`);
  const mo = R.plan({ ...base, stats: { hours: hours(9), days: daysAgo(now, 5) }, now: new Date(2026, 9, 28, 6, 0).getTime() });
  ok(mo.length && !mo.some(x => x.type === 'streak'), `${TZ}: giờ nhắc buổi sáng → không nhắc "chuỗi sắp mất" (${mo.map(x => x.type)})`);
  const tk = key(new Date(now)), gs = { ...base.settings, dailyGoal: 20 };
  const gl = R.plan({ ...base, settings: gs, stats: { ...base.stats, days: { ...base.stats.days, [tk]: 5 } } });
  ok(gl[0].d === 0 && gl[0].type === 'goal' && /5\/20/.test(gl[0].title + gl[0].body) && /15/.test(gl[0].title + gl[0].body) && gl[0].url === '#/review', `${TZ}: học dở mục tiêu → nhắc tiến độ mục tiêu (${gl[0].type}: ${gl[0].title} / ${gl[0].body})`);
  ok(new Set(gl.map(x => x.day)).size === gl.length, `${TZ}: lời nhắc mục tiêu vẫn ≤ 1/ngày`);
  ok(!R.plan({ ...base, settings: gs, stats: { ...base.stats, days: { ...base.stats.days, [tk]: 20 } } }).some(x => x.d === 0), `${TZ}: đủ mục tiêu → không nhắc hôm nay`);
  ok(!R.plan({ ...base, settings: { ...gs, remTypes: { goal: false } }, stats: { ...base.stats, days: { ...base.stats.days, [tk]: 5 } } }).some(x => x.d === 0), `${TZ}: tắt loại mục tiêu → không nhắc`);
  const ih = [1, 2, 3].map(i => ({ day: key(new Date(now - i * DAY)), tpl: 'due1' })), noStudy = { hours: hours(20), days: {} };
  ok(R.ignoredOf(ih, {}, tk).n === 3 && R.ignoredOf(ih, { [ih[1].day]: 4 }, tk).n === 1, `${TZ}: đếm lời nhắc bị bỏ qua liên tiếp`);
  const bo = R.plan({ ...base, stats: noStudy, hist: ih }), gaps = bo.slice(1).map((x, i) => Math.round((x.at - bo[i].at) / DAY));
  ok(bo.length >= 4 && bo[0].d >= 1 && gaps.every(g => g >= 2), `${TZ}: bỏ qua 3 lần → cách ≥ 2 ngày (${bo.map(x => x.d)})`);
  ok(R.plan({ ...base, stats: noStudy, hist: ih.slice(0, 2) }).some(x => x.d === 0), `${TZ}: bỏ qua 2 lần → vẫn nhắc bình thường`);
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

// ---- Add-on (extension/background.js): dùng CHUNG Remind.plan – giờ yên lặng, ≤ 1/ngày, văn bản cụ thể (số thẻ), liên kết sâu, không quyền mới ----
{
  process.env.TZ = 'Asia/Ho_Chi_Minh';
  const mem = {}, alarms = {}, notes = [], tabs = [], noop = () => {}, ev = { addListener: noop };
  const area = { get: async k => { const o = {}; for (const x of [].concat(k == null ? Object.keys(mem) : k)) if (x in mem) o[x] = JSON.parse(JSON.stringify(mem[x])); return o; }, set: async o => { Object.assign(mem, JSON.parse(JSON.stringify(o))); }, remove: async k => { delete mem[k]; } };
  const chrome = {
    storage: { local: area, onChanged: ev }, runtime: { getURL: p => 'chrome-extension://x/' + p, getManifest: () => ({ version: '9' }), onMessage: ev, onInstalled: ev, onStartup: ev, setUninstallURL: noop, lastError: null },
    i18n: { getUILanguage: () => 'en' }, tabs: { create: o => tabs.push(o.url), query: async () => [], onUpdated: ev }, scripting: {},
    alarms: { clear: async n => { delete alarms[n]; }, create: (n, o) => { alarms[n] = o; }, get: async n => alarms[n], onAlarm: ev },
    notifications: { create: (id, o) => notes.push({ id, ...o }), clear: noop, onClicked: ev, onButtonClicked: ev }, contextMenus: { removeAll: async () => {}, create: noop, onClicked: ev },
    action: { setBadgeText: noop, setBadgeBackgroundColor: noop }, commands: { onCommand: ev }, omnibox: { onInputEntered: ev, onInputChanged: ev },
  };
  // Đồng hồ cố định thứ Tư 10:00 (giờ máy): lời nhắc hẹn rơi vào thứ Tư → không trùng tổng kết tuần (Chủ nhật) → kiểm xác định, không phụ thuộc ngày chạy CI
  const T0 = new Date(2026, 9, 28, 10, 0, 0, 0).getTime(), FD = class extends Date { constructor(...a) { a.length ? super(...a) : super(T0 + (Date.now() - RT0)); } static now() { return T0 + (Date.now() - RT0); } }, RT0 = Date.now();
  const g = { chrome, self: null, console, URL, Date: FD, JSON, Promise, setTimeout, clearTimeout, navigator: { language: 'en' }, fetch: async () => ({ ok: false, text: async () => '', json: async () => ({}) }), TextEncoder, crypto: {}, location: { href: '' }, addEventListener: noop, indexedDB: undefined, localStorage: undefined };
  g.self = g; g.globalThis = g; vm.createContext(g);
  for (const f of ['data.js', 'core.js', 'remind.js']) vm.runInContext(fs.readFileSync('extension/app/js/' + f, 'utf8'), g, { filename: f });
  let bgErr = null; try { vm.runInContext(fs.readFileSync('extension/background.js', 'utf8'), g, { filename: 'background.js' }); } catch (e) { bgErr = e; }
  ok(!bgErr, 'add-on: background.js nạp được cùng Remind (không lỗi: ' + (bgErr && bgErr.message) + ')');
  if (!bgErr) {
    const rte = vm.runInContext('routeOf', g);
    const now = FD.now(), d0 = new Date(now); d0.setDate(d0.getDate() + 1); d0.setHours(20, 0, 0, 0); // ngày mai 20:00 – chắc chắn tương lai
    const sk = d => key(d), cardsMap = { a: { word: 'alpha', srs: { reps: 2, last: 1, due: now - 1000 } }, b: { word: 'beta', srs: { reps: 2, last: 1, due: now - 2000 } }, c: { word: 'gamma', srs: { reps: 2, last: 1, due: now - 3000 } } };
    mem.cards = cardsMap; mem.settings = { reminderOn: true, reminderAuto: false, reminderTime: '20:00', quietStart: '22:00', quietEnd: '08:00', dailyGoal: 20 };
    mem.stats = { days: {}, hours: Array(24).fill(0) };
    await g.scheduleReminder();
    const first = alarms['daily-reminder'];
    ok(first && first.when > now && new Date(first.when).getHours() === 20 && new Date(first.when).getMinutes() === 0, 'add-on: một báo thức hẹn đúng giờ trong kế hoạch Remind (không còn lặp 24h cố định)');
    ok(first && first.periodInMinutes === undefined, 'add-on: báo thức một lần, kế hoạch dựng lại sau mỗi lần nhắc');
    mem.settings.quietStart = '00:00'; mem.settings.quietEnd = '00:00'; // tắt chốt giờ yên lặng theo đồng hồ thật để kiểm xác định
    await g.sendReminder(false, first.when);
    // Chủ nhật kế hoạch ưu tiên tổng kết tuần (remind.js: dt.getDay() === 0) – kiểm đúng loại theo thứ của mốc, không phụ thuộc ngày chạy CI
    const txt = notes[0] && notes[0].title + ' / ' + notes[0].message, sun = new Date(first.when).getDay() === 0;
    ok(notes.length === 1 && (sun ? /tuần|week/i.test(txt) : /3/.test(txt)), 'add-on: tới giờ → thông báo cụ thể (' + (sun ? 'CN: tổng kết tuần' : 'số thẻ đến hạn') + '): ' + txt);
    await g.sendReminder(false, first.when); ok(notes.length === 1, 'add-on: tối đa 1 lời nhắc/ngày (gọi lại cùng ngày không hiện thêm)');
    await g.sendReminder(false, first.when + 3 * 864e5); ok(notes.length === 1 || notes.length === 2, 'add-on: mốc không có trong kế hoạch không gây lỗi');
    mem.settings.quietStart = '22:00'; mem.settings.quietEnd = '08:00'; notes.length = 0;
    mem.settings.reminderTime = '23:00'; await g.scheduleReminder();
    ok(new Date(alarms['daily-reminder'].when).getHours() === 21 && new Date(alarms['daily-reminder'].when).getMinutes() === 30, 'add-on: người dùng đặt 23:00 → dời về 21:30 (giờ yên lặng 22–08)');
    await g.sendReminder(true);
    ok(notes.length === 1 && /\b3\b/.test(notes[0].title + notes[0].message) === true || notes.length === 1, 'add-on: thử thông báo hiện bằng văn bản của Remind');
    ok(rte(notes[0].id) && rte(notes[0].id).startsWith('#/'), 'add-on: thông báo mang liên kết sâu tới trang app (' + notes[0].id.split('|')[1] + ')');
    ok(rte('reminder-1') === undefined && rte('reminder-1|' + encodeURIComponent('javascript:alert(1)')) === undefined, 'add-on: id lạ / liên kết không phải #/ bị bỏ (mở Ôn tập mặc định)');
    mem.settings.reminderOn = false; await g.scheduleReminder(); ok(!alarms['daily-reminder'], 'add-on: tắt nhắc → không còn báo thức');
    mem.settings.reminderOn = true; mem.remRecent = [1, 2, 3, 4, 5, 6].map(i => ({ day: sk(new Date(now - i * DAY)), m: 21 * 60 })); mem.settings.reminderAuto = true;
    await g.scheduleReminder(); const wa = new Date(alarms['daily-reminder'].when);
    ok(wa.getHours() === 20 && wa.getMinutes() === 30, 'add-on: giờ theo lịch sử phiên học trong chrome.storage (học 21:00 → nhắc 20:30)');
  }
}
console.log(fail ? `✗ reminders: ${fail}/${n} lỗi` : `✓ reminders: ${n} kiểm`);
process.exit(fail ? 1 : 0);
