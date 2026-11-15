// 🎁 Vòng giới thiệu (docs/specs/referral.md): máy chủ đếm bạn mới học xong bài đầu có trần; app thưởng 1 lần, không tự thưởng, không làm phiền.
// Chạy trong npm test: node scripts/test/referral.mjs   (SQLite thật + chạy share-card.js trong vm với Game/UI/fetch giả)
import fs from 'node:fs';
import vm from 'node:vm';
import { sqliteD1 } from '../capacity/meter.mjs';
import { setup } from '../../functions/api/hit.js';
import { attrStmts, refCount, REF_PER_DAY, REF_TOTAL } from '../../functions/api/_funnel.js';
import { onRequestGet } from '../../functions/api/ref.js';

const errs = []; let n = 0;
const ok = (c, m) => { n++; if (!c) errs.push(m); };
const be = sqliteD1(), db = be.raw; await setup(db);
const run = async st => { if (st.length) await db.batch(st); };
const CODE = 'abcd1234', day = i => `2026-11-${String(i).padStart(2, '0')}`;

// 1) Đếm phía máy chủ: chỉ nguồn 'ref' + đúng mã + đã xong bài đầu; trần 3/ngày, 10 tổng; mã sai → 0
let v = 0; const invite = async (d, fl, code = CODE, src = 'ref') => { const vid = 'v' + (++v); await run(attrStmts(db, { vid, day: d, ret: 0, at: { s: src, m: 'invite', k: code } })); if (fl) await run(attrStmts(db, { vid, day: d, ret: 1, fl: 1 })); };
await invite(day(1), false); await invite(day(1), true); await invite(day(1), true);
ok(await refCount(db, CODE) === 2, 'chỉ tính bạn đã học xong bài đầu (2)');
for (let i = 0; i < 5; i++) await invite(day(2), true);
ok(await refCount(db, CODE) === 2 + REF_PER_DAY, `trần ${REF_PER_DAY}/ngày (có ${await refCount(db, CODE)})`);
for (let d = 3; d < 12; d++) for (let i = 0; i < 3; i++) await invite(day(d), true);
ok(await refCount(db, CODE) === REF_TOTAL, `trần tổng ${REF_TOTAL}`);
await invite(day(20), true, 'zzzz9999'); await invite(day(20), true, CODE, 'tiktok');
ok(await refCount(db, 'zzzz9999') === 1 && await refCount(db, CODE) === REF_TOTAL, 'mã khác / nguồn khác không lẫn');
ok(await refCount(db, 'BAD CODE') === 0 && await refCount(db, '') === 0 && await refCount(db, "a'; DROP TABLE vid_attr;--") === 0, 'mã sai định dạng → 0');

// 2) Endpoint
const call = async (q, env = { DB: db }, ip = '1.1.1.1') => { const r = await onRequestGet({ request: new Request('https://lexkite.com/api/ref' + q, { headers: { 'CF-Connecting-IP': ip, Origin: 'https://lexkite.com' } }), env }); return { s: r.status, j: await r.json(), h: r.headers }; };
const r1 = await call('?c=' + CODE); ok(r1.s === 200 && r1.j.n === REF_TOTAL, 'endpoint trả n: ' + JSON.stringify(r1.j));
ok((await call('?c=nope')).j.n === 0 && (await call('')).j.n === 0 && (await call('?c=' + CODE, {})).j.n === 0, 'mã sai/không DB → n 0');
ok(!/(\bvid\b|v\d+)/.test(JSON.stringify(r1.j)), 'không lộ mã máy');

// 3) App: refSync trong vm
function app({ at, rc, paid, refIn, fetchN }) {
  const ls = {}; if (at) ls['lk.at'] = JSON.stringify(at); if (rc) ls['lk.rc'] = rc; if (paid) ls['lk.refPaid'] = String(paid); if (refIn) ls['lk.refIn'] = '1';
  const game = { xp: 0, freezes: 0 }, toasts = [], fetched = [];
  const g = { document: { getElementById() {}, head: {}, body: {}, documentElement: {} }, location: { hostname: 'lexkite.com' }, I18N: { lang: () => 'en' }, t: (k, v) => k.replace(/\{(\w+)\}/g, (m, x) => v && v[x] != null ? v[x] : m),
    Game: { mutate: async fn => { fn(game); } }, UI: { toast: m => toasts.push(m) }, navigator: {}, crypto: { getRandomValues: a => a.fill(7) },
    localStorage: { getItem: k => (k in ls ? ls[k] : null), setItem: (k, x) => { ls[k] = String(x); } }, fetch: async u => { fetched.push(u); return { ok: true, json: async () => ({ n: fetchN || 0 }) }; } };
  g.self = g; vm.createContext(g); vm.runInContext(fs.readFileSync('web/js/share-card.js', 'utf8'), g);
  return { SC: g.ShareCard, ls, game, toasts, fetched };
}
let a = app({ at: { s: 'ref', k: 'abcd1234' } }); await a.SC.refSync();
ok(a.game.xp === 50 && a.game.freezes === 1 && a.ls['lk.refIn'] === '1' && a.toasts.length === 1, 'người được mời nhận 50 XP + 1 đóng băng, 1 toast');
await a.SC.refSync(); ok(a.game.xp === 50 && a.toasts.length === 1, 'chỉ thưởng 1 lần/máy');
a = app({ at: { s: 'ref', k: 'abcd1234' }, rc: 'abcd1234' }); await a.SC.refSync(); ok(a.game.xp === 0, 'không tự thưởng bằng link của chính mình');
a = app({ at: { s: 'tiktok', k: 'abcd1234' } }); await a.SC.refSync(); ok(a.game.xp === 0 && a.fetched.length === 0, 'nguồn không phải ref → không thưởng, không gọi API');
a = app({ rc: 'qqqq1111', fetchN: 3 }); await a.SC.refSync();
ok(a.game.xp === 300 && a.game.freezes === 1 && a.ls['lk.refPaid'] === '3' && a.toasts.length === 1 && a.fetched[0] === '/api/ref?c=qqqq1111', 'người mời: 3 bạn → +300 XP, đóng băng ≤ 2, 1 toast gộp');
await a.SC.refSync(); ok(a.game.xp === 300 && a.toasts.length === 1, 'không thưởng lại khi n không tăng');
a = app({ rc: 'qqqq1111', paid: 3, fetchN: 5 }); await a.SC.refSync(); ok(a.game.xp === 200, 'chỉ thưởng phần mới (5 − 3)');
a = app({ rc: 'qqqq1111', fetchN: 99 }); await a.SC.refSync(); ok(a.game.xp === 1000, 'trần 10 bạn phía app');
a = app({ rc: 'qqqq1111' }); a.game.freezes = 2; await a.SC.refSync(); ok(a.game.freezes === 2 && a.fetched.length === 1 && a.game.xp === 0, 'đóng băng tối đa 2; n=0 → im lặng');
const il = app({}).SC.inviteLink(); const u = new URL(il);
ok(u.pathname === '/go/en/' && u.searchParams.get('utm_source') === 'ref' && /^[a-z0-9]{8}$/.test(u.searchParams.get('c')), 'link mời sai: ' + il);

if (errs.length) { console.error('✗ referral:\n' + errs.map(e => ' - ' + e).join('\n')); process.exit(1); }
console.log(`✓ referral: ${n} kiểm, 0 lỗi`);
