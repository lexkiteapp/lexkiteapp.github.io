// 🔻 Phễu kênh (functions/api/_funnel.js): UTM → máy mới (lượt đầu thắng) → bài đầu → D1/D7+; đếm go_* theo kênh; chặn giá trị lạ; câu đọc không quét bảng sessions.
// Chạy trong npm test: node scripts/test/funnel.mjs   (lược đồ thật từ hit.js setup, SQLite trong bộ nhớ)
import { sqliteD1 } from '../capacity/meter.mjs';
import { setup } from '../../functions/api/hit.js';
import { attrOf, attrStmts, funStmt, channelData } from '../../functions/api/_funnel.js';

const errs = []; let n = 0;
const ok = (c, m) => { n++; if (!c) errs.push(m); };
const be = sqliteD1(), db = be.raw; await setup(db);
const run = async st => { if (st && st.length) await db.batch(st); };
const NOW = Date.UTC(2026, 10, 12, 5, 0, 0), D = k => new Date(NOW + 7 * 3600e3 - k * 86400e3).toISOString().slice(0, 10);

// 1) Lọc giá trị: chỉ [A-Za-z0-9._~-]{1,40}; cần nguồn hoặc mã; khóa lạ bị bỏ (không PII)
ok(attrOf({ s: 'tiktok', c: 'reel_1', k: 'ab12', email: 'a@b.com' }).email === undefined, 'khóa lạ phải bị bỏ');
ok(attrOf({ s: 'a b' }) === null && attrOf({ s: 'x'.repeat(41) }) === null && attrOf({ m: 'cpc' }) === null && attrOf(null) === null && attrOf('s') === null, 'giá trị lạ/thiếu nguồn phải bị loại');
ok(attrOf({ s: 'tiktok' }).s === 'tiktok' && attrOf({ k: 'p1' }).k === 'p1', 'nguồn hoặc mã là đủ');

// 2) Máy mới: lượt đầu thắng; lượt sau (ret) không ghi đè; không UTM → không ghi
const A = { s: 'tiktok', m: 'social', c: 'reel_1', k: 'p1' };
await run(attrStmts(db, { vid: 'v1', day: D(8), ret: 0, at: A, plat: 'web', lang: 'es' }));
await run(attrStmts(db, { vid: 'v1', day: D(5), ret: 0, at: { s: 'fb' }, plat: 'web', lang: 'es' }));
ok(be.sql.prepare('SELECT src, code FROM vid_attr WHERE vid = ?').get('v1').src === 'tiktok', 'lượt đầu phải thắng (INSERT OR IGNORE)');
ok(attrStmts(db, { vid: 'x', day: D(1), ret: 0, at: undefined }).length === 0, 'không UTM + không fl → 0 lệnh ghi');
await run(attrStmts(db, { vid: 'v2', day: D(1), ret: 0, at: A }));
await run(attrStmts(db, { vid: 'v3', day: D(1), ret: 0, at: { s: 'yt', c: 'long' } }));

// 3) Bài đầu (chỉ lần đầu) + quay lại D1 (đúng ngày kế) và D7+ (từ ngày 7)
await run(attrStmts(db, { vid: 'v1', day: D(8), ret: 1, fl: 1 }));
await run(attrStmts(db, { vid: 'v1', day: D(2), ret: 1, fl: 1 }));
ok(be.sql.prepare('SELECT fl FROM vid_attr WHERE vid = ?').get('v1').fl === D(8), 'fl ghi 1 lần (ngày đầu)');
await run(attrStmts(db, { vid: 'v1', day: D(7), ret: 1, at: A })); // D1 của v1 (ngày D(8)+1)
await run(attrStmts(db, { vid: 'v1', day: D(1), ret: 1, at: A })); // D7+ (D(8)+7 = D(1))
const r1 = be.sql.prepare('SELECT d1, d7 FROM vid_attr WHERE vid = ?').get('v1');
ok(r1.d1 === D(7) && r1.d7 === D(1), `D1/D7+ sai: ${JSON.stringify(r1)}`);
await run(attrStmts(db, { vid: 'v2', day: D(1), ret: 1, at: A })); // cùng ngày → không phải D1
ok(be.sql.prepare('SELECT d1 FROM vid_attr WHERE vid = ?').get('v2').d1 === null, 'cùng ngày không tính D1');

// 4) Đếm go_* theo kênh + trần tổ hợp
for (const ev of ['go_view', 'go_view', 'go_start', 'go_done', 'go_cta']) await run([funStmt(db, D(1), ev, A)]);
await run([funStmt(db, D(1), 'go_view', { s: 'yt', c: 'long' })]);
ok(funStmt(db, D(1), 'go_view', { m: 'x' }) === null && funStmt(db, D(1), 'bad_ev', A) === null, 'UTM thiếu / sự kiện lạ → bỏ');
for (let i = 0; i < 650; i++) await run([funStmt(db, D(1), 'go_view', { s: 's', k: 'c' + i })]);
const nk = be.sql.prepare("SELECT COUNT(*) AS n FROM ext_events WHERE day = ? AND kind LIKE 'fun:go_view:%'").get(D(1)).n;
ok(nk <= 600, `trần tổ hợp/ngày phải giữ ≤ 600 (có ${nk})`);
await run([funStmt(db, D(1), 'go_view', { s: 'tiktok', c: 'reel_1', k: 'p1', m: 'social' })]); // tổ hợp đã có vẫn đếm được khi đầy
ok(be.sql.prepare("SELECT n FROM ext_events WHERE day = ? AND kind = 'fun:go_view:tiktok|reel_1|p1'").get(D(1)).n === 3, 'tổ hợp đã có vẫn tăng khi bảng đầy');

// 5) Đọc: tổng hợp đúng
const d = await channelData(db, 30, NOW), t = d.rows.find(r => r.src === 'tiktok' && r.code === 'p1');
ok(t && t.go_start === 1 && t.go_done === 1 && t.go_cta === 1, 'đếm trang đích sai: ' + JSON.stringify(t));
ok(t.app === 2 && t.fl === 1, `vào app/bài đầu sai: ${JSON.stringify(t)}`);
ok(t.d1 === 1 && t.n1 >= 1 && t.d7 === 1 && t.n7 === 1 && t.d7Pct === 100, `D1/D7+ sai: ${JSON.stringify(t)}`);
ok(d.summary.day === D(1) && d.summary.views >= 3 && d.summary.app === 2, 'tóm tắt hôm qua sai: ' + JSON.stringify(d.summary));
ok(d.total.app >= 3 && d.rows.length <= 80, 'tổng/giới hạn dòng');

// 5b) Phễu cài app theo nền tảng
import { installData } from '../../functions/api/_funnel.js';
const ins = installData([{ kind: 'cta:inst_first_v_play', n: 10 }, { kind: 'cta:inst_words_c_play', n: 3 }, { kind: 'cta:inst_first_x_play', n: 2 }, { kind: 'cta:app_top_ios', n: 5 }, { kind: 'cta:ext_land', n: 4 }, { kind: 'cta:inst_first_v_desk', n: 1 }]);
const ip = ins.find(x => x.plat === 'play');
ok(ip && ip.seen === 10 && ip.click === 3 && ip.later === 2 && ip.clickPct === 30, 'installData play sai: ' + JSON.stringify(ins));
ok(ins.find(x => x.plat === 'ios').btn === 5 && ins.find(x => x.plat === 'ext').btn === 4, 'installData btn/ext sai');

// 6) Đường đọc không quét bảng người dùng lớn (sessions): kiểm kế hoạch các câu của channelData
const plan = be.sql.prepare("EXPLAIN QUERY PLAN SELECT src, COUNT(*) FROM vid_attr WHERE day >= ? GROUP BY src").all('2026-01-01').map(p => String(p.detail)).join(' ');
ok(/vid_attr_day/.test(plan), 'đọc vid_attr phải đi theo chỉ mục day: ' + plan);

if (errs.length) { console.error('✗ funnel:\n' + errs.map(e => ' - ' + e).join('\n')); process.exit(1); }
console.log(`✓ funnel: ${n} kiểm, 0 lỗi`);
