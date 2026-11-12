// Test giữ chân D1/D7/D30 theo nền tảng & quốc gia (functions/api/_retention.js): D1 giả bằng node:sqlite, không mạng.
// Chạy: node scripts/test/retention-admin.mjs
import { DatabaseSync } from 'node:sqlite';
import { retentionData, shape } from '../../functions/api/_retention.js';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const sql = new DatabaseSync(':memory:');
sql.exec('CREATE TABLE sessions (sid TEXT PRIMARY KEY, vid TEXT, day TEXT NOT NULL, at INTEGER, country TEXT, plat TEXT, dur INTEGER, pages INTEGER, ret INTEGER, bot TEXT)');
const DB = { prepare(q) { return { bind: (...a) => ({ async all() { return { results: sql.prepare(q).all(...a) }; } }) }; } };
const NOW = Date.UTC(2026, 10, 12, 5), VN = k => new Date(NOW + 7 * 36e5 - k * 864e5).toISOString().slice(0, 10);
let i = 0; const S = (vid, day, o = {}) => sql.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?,?,?,?,?)').run('s' + i++, vid, day, 0, o.c || 'VN', o.p || 'web', o.dur ?? 90, o.pg ?? 3, o.ret ?? 0, o.bot ?? null);
// 10 người web VN bắt đầu cách 40 ngày: 6 quay lại D1, 3 D7, 2 D30 · 1 máy bot không tính · 1 admin bị loại
for (let n = 0; n < 10; n++) { const v = 'vweb' + String(n).padStart(6, '0'); S(v, VN(40)); if (n < 6) S(v, VN(39), { ret: 1 }); if (n < 3) S(v, VN(33), { ret: 1 }); if (n < 2) S(v, VN(10), { ret: 1 }); }
S('botbotbot1', VN(40), { bot: 'ua' }); S('adminvid01', VN(40), { c: 'US' });
// 5 người iOS Mỹ bắt đầu hôm qua (chưa đủ tuổi D7/D30) · 1 quay lại hôm nay
for (let n = 0; n < 5; n++) { const v = 'vios' + String(n).padStart(6, '0'); S(v, VN(1), { p: 'ios', c: 'US', dur: 5, pg: 1 }); if (n === 0) S(v, VN(0), { p: 'ios', c: 'US', ret: 1 }); }
const r = await retentionData(DB, 90, ['adminvid01'], NOW);
const web = r.plats.find(x => x.k === 'web'), ios = r.plats.find(x => x.k === 'ios');
ok(web && web.n === 10 && web.n1 === 10 && web.r1 === 6, 'web D1 6/10 – ' + JSON.stringify(web));
ok(web.n7 === 10 && web.r7 === 3 && web.n30 === 10 && web.r30 === 2, 'web D7 3/10, D30 2/10 (đúng ngày +7/+30)');
ok(ios.n === 5 && ios.n1 === 5 && ios.r1 === 1 && ios.n7 === 0 && ios.n30 === 0, 'iOS: chỉ D1 đủ tuổi (1/5), D7/D30 chưa đủ tuổi – ' + JSON.stringify(ios));
ok(ios.eng === 0 && web.eng === 10, 'tỉ lệ chạm thật ngày đầu: iOS 0 (nảy), web 10');
ok(!r.plats.some(x => x.k === 'ua') && r.total.n === 15, 'bot + admin bị loại: tổng 15 – ' + r.total.n);
const us = r.countries.find(x => x.k === 'US'), vn = r.countries.find(x => x.k === 'VN');
ok(us && us.n === 5 && vn && vn.n === 10, 'tách theo quốc gia (admin Mỹ không tính)');
ok(r.spw > 0, 'phiên/người/tuần có số');
ok(!/vid|uid|email/i.test(Object.keys(r).join()), 'không trả định danh');
const sh = shape([{ plat: 'web', country: 'AA', n: 1, eng: 0, n1: 1, r1: 0, n7: 0, r7: 0, n30: 0, r30: 0 }, { plat: 'web', country: 'BB', n: 2, eng: 0, n1: 2, r1: 1, n7: 0, r7: 0, n30: 0, r30: 0 }], []);
ok(sh.countries.length === 1 && sh.countries[0].k === 'other' && sh.countries[0].n === 3, 'nước < 5 người gộp vào other');
console.log(fails ? `FAIL ${fails}` : 'OK retention-admin'); process.exit(fails ? 1 : 0);
