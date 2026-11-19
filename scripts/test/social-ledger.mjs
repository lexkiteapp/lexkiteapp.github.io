// Sổ cái đăng theo kênh (chủ 19/11: 3 video liên tiếp trong 3 giờ): claimLedger nguyên tử, ≥ 4 giờ giữa 2 bài cùng kênh, idempotent, kênh khác độc lập; postingViolations.
import { DatabaseSync } from 'node:sqlite';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const sql = new DatabaseSync(':memory:');
const DB = { prepare(q) { const st = { args: [], bind(...a) { return { ...st, args: a }; }, async run() { const i = sql.prepare(q).run(...this.args); return { meta: { changes: Number(i.changes) } }; }, async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; } };
sql.exec('CREATE TABLE soc_ledger (channel_id TEXT NOT NULL, clip TEXT NOT NULL, at_ms INTEGER NOT NULL, day TEXT, created INTEGER, PRIMARY KEY (channel_id, clip))');
const A = await import(new URL('../../functions/api/_social_auto.js', import.meta.url));
const H = 36e5, t = Date.UTC(2026, 10, 19, 3, 0, 0);
ok(await A.claimLedger(DB, 'ch1', 'a', t), 'bài đầu được ghi');
ok(!(await A.claimLedger(DB, 'ch1', 'b', t)), 'cùng giờ bị chặn (bài bù dồn một lúc)');
ok(!(await A.claimLedger(DB, 'ch1', 'c', t + 3 * H)), '3 giờ sau bị chặn');
ok(!(await A.claimLedger(DB, 'ch1', 'd', t - 2 * H)), 'trước 2 giờ cũng bị chặn (hai chiều)');
ok(await A.claimLedger(DB, 'ch1', 'e', t + 24 * H), 'ngày sau được');
ok(await A.claimLedger(DB, 'ch1', 'a', t), 'chạy lại cùng clip = idempotent');
ok(await A.claimLedger(DB, 'ch2', 'b', t), 'kênh khác độc lập');
await A.releaseLedger(DB, 'ch1', 'e'); ok(await A.claimLedger(DB, 'ch1', 'f', t + 24 * H), 'nhả sổ khi lên lịch lỗi → clip khác dùng được giờ đó');
ok(A.postingViolations([{ channel_id: 'x', at_ms: t }, { channel_id: 'x', at_ms: t + 3 * H }]).length === 1, 'máy gác: 2 bài < 4 giờ');
ok(A.postingViolations([{ channel_id: 'x', at_ms: t }, { channel_id: 'y', at_ms: t + H }, { channel_id: 'x', at_ms: t + 5 * H }]).length === 0, 'máy gác: sạch');
ok(A.postingViolations([{ channel_id: 'x', at_ms: t }, { channel_id: 'x', at_ms: t + 5 * H }], { perDay: 1 }).some(v => v.why === 'per-day'), 'máy gác: >1 bài/ngày khi bật perDay');
// 1 bài/kênh/ngày (giờ VN): bài thứ 2 cùng ngày bị hoãn sang ngày sau (không mất)
const d0 = Date.UTC(2026, 10, 20, 0, 0, 0); // 07:00 VN 20/11
ok(await A.claimLedger(DB, 'ch3', 'p', d0), 'ngày 20: bài đầu');
ok(!(await A.claimLedger(DB, 'ch3', 'q', d0 + 8 * H)), 'ngày 20: bài 2 cách 8 giờ vẫn bị chặn (1/ngày)');
ok(await A.claimLedger(DB, 'ch3', 'q', d0 + 24 * H), 'hoãn sang ngày 21 thì được (không bị bỏ)');
ok(await A.claimLedger(DB, 'ch4', 'p', d0), 'kênh khác cùng ngày độc lập');
console.log(fails ? `social-ledger: ${fails} lỗi` : 'social-ledger OK'); process.exit(fails ? 1 : 0);
