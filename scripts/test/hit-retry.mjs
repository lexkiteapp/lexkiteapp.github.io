// Test máy khách gửi bù thống kê (web/js/app.js khối "Thống kê ẩn danh"): 01/11 hạn mức Workers 100k/ngày cạn → /api/hit trả 429
// 16:22→00:00 UTC, mọi phiên trong khoảng đó mất → bảng Live traffic về 0. Máy khách web cùng nguồn phải giữ phiên lỗi (lk.hitq)
// và gửi lại với late:1 + t0 khi API sống lại (functions/api/hit.js lateAt). Không mạng: chạy đúng đoạn mã trong vm với trình duyệt giả.
// Chạy: node scripts/test/hit-retry.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

const src = readFileSync(new URL('../../web/js/app.js', import.meta.url), 'utf8');
const a = src.indexOf('/* Thống kê ẩn danh'), b = src.indexOf('  // Script nạp kiểu defer', a);
ok(a > 0 && b > a, 'tìm thấy khối thống kê trong app.js');
const block = src.slice(a, b);

function boot({ store, status, host = 'lexkite.com', vis = 'visible' }) {
  const timers = [], sent = [], beacons = [];
  const doc = { visibilityState: vis, referrer: '', addEventListener() {}, createElement: () => ({}), body: { prepend() {} } };
  const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const fetch = (url, o) => { if (String(url).includes('/api/config')) return Promise.resolve({ ok: true, json: async () => ({}) }); const body = JSON.parse(o.body); sent.push({ url, o, body }); const st = status(body); return st === 'net' ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve({ status: st, ok: st < 300 }); };
  const ctx = { location: { hostname: host, search: '', hash: '#/home', protocol: 'https:', origin: 'https://' + host }, navigator: { webdriver: false, sendBeacon: (u, d) => { beacons.push(JSON.parse(d)); return true; } },
    localStorage: ls, document: doc, innerWidth: 400, matchMedia: () => ({ matches: false }), performance: { now: () => 0 }, PerformanceObserver: class { observe() {} },
    addEventListener() {}, setTimeout: (f, t) => { timers.push({ f, t }); return timers.length; }, setInterval: () => 0, fetch, Date, JSON, Object, Math, String, Promise, parseInt, Infinity, esc: s => s, t: s => s };
  ctx.window = ctx;
  vm.runInNewContext('(() => {' + block + '})()', ctx);
  return { timers, sent, beacons, fire: async () => { for (const x of timers.filter(x => x.t === 15000)) x.f(); await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0)); } };
}

// 1) API chết (429): phiên được giữ lại
const store = { 'lk.vid': '00000abcdef' }; // vid bắt đầu bằng 0 → luôn trong mẫu
const down = boot({ store, status: () => 429 });
await down.fire();
ok(down.sent.length === 1 && down.sent[0].url === '/api/hit' && down.sent[0].o.mode === 'same-origin' && down.sent[0].o.keepalive, 'web cùng nguồn gửi phiên bằng fetch same-origin keepalive');
const q1 = JSON.parse(store['lk.hitq'] || '{}'), parked = Object.values(q1)[0];
ok(parked && parked.late === 1 && parked.t0 > 0 && parked.pv && parked.pv.home === 1 && !parked.hb, '429 → giữ phiên trong lk.hitq (late:1, t0, pv)');

// 2) API sống lại: lần mở sau gửi phiên mới rồi gửi bù phiên cũ, thành công → xoá hàng đợi
const up = boot({ store, status: () => 204 });
await up.fire();
const late = up.sent.filter(s => s.body.late);
ok(late.length === 1 && late[0].body.sid === parked.sid && late[0].body.t0 === parked.t0, 'API sống lại → gửi bù đúng phiên cũ với t0 gốc');
ok(!store['lk.hitq'], 'gửi bù thành công → xoá lk.hitq');

// 3) Mất mạng cũng giữ; gửi bù lỗi lần nữa không cộng đôi lượt xem
const s2 = { 'lk.vid': '00000abcdef' };
await boot({ store: s2, status: () => 'net' }).fire();
ok(Object.keys(JSON.parse(s2['lk.hitq'] || '{}')).length === 1, 'mất mạng (fetch lỗi) → giữ phiên');
await boot({ store: s2, status: x => (x.late ? 503 : 204) }).fire();
const pv2 = Object.values(JSON.parse(s2['lk.hitq'] || '{}'))[0];
ok(pv2 && pv2.pv.home === 1, 'gửi bù hỏng lần nữa (503) → giữ nguyên, không cộng đôi pv (' + JSON.stringify(pv2 && pv2.pv) + ')');

// 4) App/add-on khác nguồn (phản hồi opaque) vẫn dùng sendBeacon như cũ, không xếp hàng
const s3 = { 'lk.vid': '00000abcdef' }, app = boot({ store: s3, status: () => 429, host: 'localhost' });
await app.fire();
ok(app.sent.length === 0 && app.beacons.length === 1 && !s3['lk.hitq'], 'khác nguồn (app native) → sendBeacon, không lk.hitq');

console.log(fails ? `✗ hit-retry: ${fails}/${n} lỗi` : `✓ hit-retry: ${n} kiểm tra đạt (giữ phiên lúc /api chết, gửi bù late:1 + t0, không cộng đôi)`);
process.exit(fails ? 1 : 0);
