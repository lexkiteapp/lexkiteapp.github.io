// Nhắc học trong service worker (web/sw.js) phải tính "hôm nay" theo ngày ĐỊA PHƯƠNG, không phải UTC (periodicsync + push):
// trước đây `new Date().toISOString().slice(0,10)` → người đã học buổi sáng ở UTC+7 / UTC−8 vẫn bị nhắc tối cùng ngày, hoặc bị nhắc 2 lần quanh nửa đêm UTC.
// Chạy sw.js thật trong vm, đồng hồ giả + TZ thật, Cache API giả; kiểm: đã học hôm nay → im lặng; chưa học → nhắc đúng 1 lần/ngày; meta cũ (chỉ `last`) vẫn chạy.
import fs from 'node:fs';
import vm from 'node:vm';

const SW = fs.readFileSync('web/sw.js', 'utf8');
let bad = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) bad++; };
const O = 'https://lexkite.com';

async function run(TZ, nowLocal, meta, fires = ['periodicsync']) {
  process.env.TZ = TZ;
  const NOW = nowLocal(); // tính SAU khi đặt TZ
  class FD extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } }
  const store = new Map([['lk-meta', new Map([[O + '/__meta', JSON.stringify(meta)]])]]);
  const open = name => { const m = store.get(name) || (store.set(name, new Map()), store.get(name)); return {
    match: async r => { const k = typeof r === 'string' ? new URL(r, O).href : r.url; return m.has(k) ? new Response(m.get(k)) : undefined; },
    put: async (r, res) => { m.set(typeof r === 'string' ? new URL(r, O).href : r.url, await res.text()); },
    add: async () => {}, delete: async () => true, keys: async () => [...m.keys()].map(url => ({ url })) }; };
  const caches = { open: async n => open(n), has: async n => store.has(n), delete: async n => store.delete(n), keys: async () => [...store.keys()], match: async () => undefined };
  const shown = [], h = {};
  const self = { registration: { scope: O + '/app/', periodicSync: null, showNotification: async (t, o) => { shown.push({ t, o }); } }, addEventListener: (t, f) => { h[t] = f; }, skipWaiting: async () => {}, clients: { claim: async () => {}, matchAll: async () => [] } };
  const fetch = async () => new Response('{}', { status: 200 });
  vm.runInNewContext(SW, { self, caches, fetch, Date: FD, location: new URL(O + '/app/'), URL, Request: class { constructor(u) { this.url = u; } }, Response, setTimeout, clearTimeout, console });
  for (const type of fires) { const ps = []; const ev = { tag: 'vb-daily', waitUntil: p => ps.push(p) }; h[type](ev); await Promise.all(ps); }
  return shown;
}
const base = { v: 2, on: true, time: '19:30', gen: { title: 'gen', body: 'b', tpl: 'gen1' }, plan: [] };

// Việt Nam (UTC+7): học 06:00 sáng 17/11 (= 23:00 UTC ngày 16) → 20:00 cùng ngày KHÔNG được nhắc; meta app ghi `last` kiểu UTC cũ ('16') + `lastDay` địa phương ('17')
{
  const s = await run('Asia/Ho_Chi_Minh', () => new Date(2026, 10, 17, 20, 0).getTime(), { ...base, last: '2026-11-16', lastDay: '2026-11-17' });
  ok(s.length === 0, `VN: đã học 06:00 hôm nay → 20:00 không nhắc (nhận ${s.length})`);
  const n = await run('Asia/Ho_Chi_Minh', () => new Date(2026, 10, 17, 20, 0).getTime(), { ...base, last: '', lastDay: '' });
  ok(n.length === 1, `VN: chưa học → 20:00 nhắc đúng 1 lần (nhận ${n.length})`);
  const early = await run('Asia/Ho_Chi_Minh', () => new Date(2026, 10, 17, 6, 30).getTime(), { ...base, last: '', lastDay: '' });
  ok(early.length === 0, 'VN: trước giờ nhắc 19:30 → chưa nhắc');
}
// Los Angeles (UTC−8): học 10:00 (= 18:00 UTC cùng ngày) → 20:00 (= 04:00 UTC hôm sau) không được nhắc dù UTC đã sang ngày
{
  const s = await run('America/Los_Angeles', () => new Date(2026, 10, 17, 20, 0).getTime(), { ...base, last: '2026-11-17', lastDay: '2026-11-17' });
  ok(s.length === 0, `LA: đã học 10:00 hôm nay → 20:00 không nhắc (nhận ${s.length})`);
  const n = await run('America/Los_Angeles', () => new Date(2026, 10, 17, 20, 0).getTime(), { ...base, last: '2026-11-16', lastDay: '2026-11-16' });
  ok(n.length === 1, `LA: học hôm qua, hôm nay chưa → nhắc 1 lần (nhận ${n.length})`);
  // đã nhắc hôm nay (ngày địa phương) rồi → không nhắc lại dù UTC vừa đổi ngày
  const again = await run('America/Los_Angeles', () => new Date(2026, 10, 17, 20, 0).getTime(), { ...base, last: '', lastDay: '', notified: '2026-11-17' });
  ok(again.length === 0, 'LA: đã nhắc hôm nay → không nhắc lại');
}
// Meta cũ (chưa có lastDay): quay về so `last` như trước, không vỡ
{
  const s = await run('UTC', () => new Date(2026, 10, 17, 20, 0).getTime(), { ...base, last: '2026-11-17' });
  ok(s.length === 0, 'meta cũ: last = hôm nay → im lặng');
  const n = await run('UTC', () => new Date(2026, 10, 17, 20, 0).getTime(), { ...base, last: '2026-11-16' });
  ok(n.length === 1, 'meta cũ: last = hôm qua → nhắc');
}
// Push rỗng từ máy chủ: ghi `notified` bằng ngày địa phương → periodicsync cùng ngày không nhắc đôi
{
  const s = await run('Asia/Ho_Chi_Minh', () => new Date(2026, 10, 17, 20, 0).getTime(), { ...base, last: '', lastDay: '' }, ['push', 'periodicsync']);
  ok(s.length === 1, `push rồi periodicsync cùng ngày → đúng 1 thông báo (nhận ${s.length})`);
}
console.log(bad ? `\n${bad} lỗi` : '\nOK');
process.exit(bad ? 1 : 0);
