// Test giữ chân D1/D7/D30 theo nền tảng & quốc gia (functions/api/_retention.js): D1 giả bằng node:sqlite, không mạng.
// Chạy: node scripts/test/retention-admin.mjs
import { DatabaseSync } from 'node:sqlite';
import { retentionData, shape } from '../../functions/api/_retention.js';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const sql = new DatabaseSync(':memory:');
sql.exec('CREATE TABLE ext_events (day TEXT, kind TEXT, n INTEGER)'); sql.exec("INSERT INTO ext_events VALUES ('" + new Date(Date.UTC(2026, 10, 12, 5) + 7 * 36e5).toISOString().slice(0, 10) + "', 'hab:plan_seen', 7), ('2026-01-01', 'hab:plan_seen', 99)");
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
ok(r.hab.plan_seen === 7, 'đếm vòng thói quen 7 ngày (loại cũ) – ' + JSON.stringify(r.hab));
ok(r.spw > 0, 'phiên/người/tuần có số');
ok(!/vid|uid|email/i.test(Object.keys(r).join()), 'không trả định danh');
const sh = shape([{ plat: 'web', country: 'AA', n: 1, eng: 0, n1: 1, r1: 0, n7: 0, r7: 0, n30: 0, r30: 0 }, { plat: 'web', country: 'BB', n: 2, eng: 0, n1: 2, r1: 1, n7: 0, r7: 0, n30: 0, r30: 0 }], []);
ok(sh.countries.length === 1 && sh.countries[0].k === 'other' && sh.countries[0].n === 3, 'nước < 5 người gộp vào other');
// Hệ số K: 4 tuần trượt. Tuần 0 (7 ngày vừa qua): thêm 10 người mới thật, 2 trong số đó đến từ lời mời & xong bài đầu; 6 lượt bấm Mời.
sql.exec("CREATE TABLE vid_attr (vid TEXT PRIMARY KEY, day TEXT NOT NULL, src TEXT, med TEXT, camp TEXT, code TEXT, lang TEXT, plat TEXT, fl TEXT, d1 TEXT, d7 TEXT)");
for (let n = 0; n < 10; n++) { const v = 'knew' + String(n).padStart(8, '0'); S(v, VN(2), { p: 'web' }); if (n < 2) sql.prepare("INSERT INTO vid_attr (vid, day, src, code, fl) VALUES (?, ?, 'ref', 'abcd1234', ?)").run(v, VN(2), VN(1)); }
S('botbotbot2', VN(2), { bot: 'ua' }); sql.prepare("INSERT INTO vid_attr (vid, day, src, fl) VALUES ('botbotbot2', ?, 'ref', ?)").run(VN(2), VN(2)); // bot trong cửa sổ: không tính
sql.prepare("INSERT INTO ext_events VALUES (?, 'cta:share_inv_streak', 4), (?, 'cta:share_inv_day', 2), (?, 'cta:share_open_day', 9)").run(VN(3), VN(3), VN(3));
const r2 = await retentionData(DB, 90, ['adminvid01'], NOW), k0 = r2.k && r2.k[0];
ok(r2.k && r2.k.length === 4 && k0.w === 0, 'k: 4 tuần – ' + JSON.stringify(r2.k));
ok(k0.newReal === 15 && k0.refDone === 2 && k0.invites === 6, 'k tuần 0: người mới thật, bạn được mời xong bài đầu (bot loại), lượt Mời (không đếm lượt mở) – ' + JSON.stringify(k0));
ok(Math.abs(k0.k - 2 / (k0.newReal - 2)) < 0.001, 'K = refDone ÷ (người mới − refDone) – ' + k0.k);
ok(r2.k[3].newReal === 0 && r2.k[3].k === null, 'tuần không có ai: K null, không chia 0');

console.log(fails ? `FAIL ${fails}` : 'OK retention-admin'); process.exit(fails ? 1 : 0);
