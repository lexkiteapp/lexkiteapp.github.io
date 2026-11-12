// Cộng đồng – Đợt 1: mỗi dòng an toàn ở docs/specs/community.md §5 có khối kiểm riêng (nhóm tuổi, PII, lời tục, nhịp gửi/bậc tin cậy,
// báo cáo tự ẩn, chặn 2 chiều, thang gậy, riêng tư, cờ tắt, xoá tài khoản). D1 giả = SQLite thật trong bộ nhớ.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { run, admin, setup, blockedEither, isHidden, onRequestPost } from '../../functions/api/community.js';
import { ageBand, sameBand, canDM, pii, checkText, trust, pace, PACE, penalty, muted, canVoice, RULES_V, HIDE_AT, REPORTS_PER_DAY } from '../../functions/api/_cm.js';
import { DELETE_SQL } from '../../functions/api/account.js';
import { LIMITS, evaluate } from '../free-tier/limits.mjs';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; }; const eq = (a, b, m) => { assert.deepEqual(a, b, m); n++; };
const sql = new DatabaseSync(':memory:');
const exec = (q, a) => /^\s*(SELECT|WITH)|RETURNING/i.test(q) ? { results: sql.prepare(q).all(...a) } : (sql.prepare(q).run(...a), { results: [] });
const DB = {
  prepare(q) { const st = { args: [], bind(...a) { return { ...st, args: a }; }, async run() { return exec(q, this.args); }, async all() { return exec(q, this.args); }, async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; },
  async batch(list) { sql.exec('BEGIN'); try { const o = []; for (const x of list) o.push(await x.run()); sql.exec('COMMIT'); return o; } catch (e) { sql.exec('ROLLBACK'); throw e; } },
};
await setup(DB);
const NOW = Date.UTC(2026, 10, 3, 12), Y = new Date(NOW).getUTCFullYear();
let T = NOW; const call = (uid, req) => run(DB, uid, req, T += 1000);
const join = (uid, birthYear, extra = {}) => call(uid, { op: 'join', nick: 'Nick' + uid.slice(-3), color: 1, birthYear, rules: RULES_V, ...extra });
const raw = uid => sql.prepare('SELECT * FROM cm_profile WHERE uid = ?').get(uid);

// ── §5 Tuổi ──
eq(ageBand(Y - 12, NOW), 'u13', '12 tuổi → dưới 13'); eq(ageBand(Y - 13, NOW), 'u13', 'sinh năm Y-13: có thể chưa đủ 13 → phía an toàn');
eq(ageBand(Y - 14, NOW), 'teen'); eq(ageBand(Y - 18, NOW), 'teen', 'có thể chưa đủ 18 → teen'); eq(ageBand(Y - 19, NOW), 'adult');
eq(ageBand('abc', NOW), ''); eq(ageBand(Y + 1, NOW), ''); eq(ageBand(Y - 130, NOW), '');
{ const [s, d] = await join('kid-001', Y - 10); eq([s, d.error], [403, 'age'], 'dưới 13 bị chặn'); ok(!raw('kid-001'), 'dưới 13: KHÔNG lưu hồ sơ/năm sinh'); }
{ const [s] = await join('bad-001', 'x'); eq(s, 400, 'năm sinh sai → 400'); }
{ const [s, d] = await call('nor-001', { op: 'join', nick: 'Abc', birthYear: Y - 30, rules: 0 }); eq([s, d.error], [400, 'rules'], 'chưa đồng ý Quy tắc → không vào'); }
const [, A] = await join('adult-a01', Y - 30); const [, B] = await join('adult-b02', Y - 25); const [, C] = await join('adult-c03', Y - 40);
const [, K] = await join('teen-k01', Y - 15, { dm: true }); const [, K2] = await join('teen-k02', Y - 16);
eq(A.profile.band, 'adult'); eq(K.profile.band, 'teen'); eq(K.profile.dm, false, '13–17: tin riêng luôn tắt');
{ const [, d] = await call('teen-k01', { op: 'settings', dm: true }); eq(d.profile.dm, false, '13–17 không bật được tin riêng'); }
{ const [s, d] = await join('teen-k01', Y - 30); eq([s, d.error], [409, 'band-locked'], 'nhóm tuổi KHOÁ: teen không tự đổi thành người lớn'); eq(raw('teen-k01').band, 'teen'); }
{ const [s, d] = await join('adult-a01', Y - 15); eq([s, d.error], [409, 'band-locked'], 'người lớn không tự đổi thành teen'); }
ok(sameBand('teen', 'teen') && sameBand('adult', 'adult'), 'cùng nhóm gặp nhau'); ok(!sameBand('teen', 'adult') && !sameBand('adult', 'teen'), 'teen ↔ người lớn: không phòng/chat/gọi/kết bạn chung');
ok(!sameBand('u13', 'u13') && !sameBand('', ''), 'dưới 13 / chưa rõ: không gặp ai');
ok(!canDM({ band: 'teen', dm: 1 }, { band: 'teen', dm: 1 }, { friends: true }), 'teen không tin riêng');
ok(!canDM({ band: 'adult', dm: 1 }, { band: 'adult', dm: 0 }, { friends: true }), 'tin riêng cần CẢ HAI bật');
ok(!canDM({ band: 'adult', dm: 1 }, { band: 'adult', dm: 1 }, { friends: false }), 'tin riêng chỉ giữa bạn bè');
ok(!canDM({ band: 'adult', dm: 1 }, { band: 'adult', dm: 1 }, { friends: true, blocked: true }), 'chặn → không tin riêng');
ok(canDM({ band: 'adult', dm: 1 }, { band: 'adult', dm: 1 }, { friends: true }), 'người lớn, cả hai bật, là bạn → được');
eq(raw('adult-c03').dm, 0, 'tin riêng mặc định TẮT');

// ── §5 Kiểm duyệt: thông tin liên lạc (mọi người) ──
for (const [t, w] of [['mail me at an.nguyen@gmail.com', 'email'], ['an dot nguyen (at) gmail (dot) com', 'email'], ['call 0912 345 678', 'phone'], ['+84 (90) 123-4567', 'phone'],
  ['０９１２３４５６７８', 'phone'], ['zero nine one two three four five six seven', 'phone'], ['không chín một hai ba bốn năm sáu bảy', 'phone'], ['see https://evil.example/x', 'link'], ['go to www.site.io', 'link'],
  ['my site lexi-pro.net', 'link'], ['follow @linh_ielts', 'handle'], ['add me on zalo', 'social'], ['my telegram is linh', 'social'], ['ig: linhh', 'social'], ['WhatsApp me', 'social'], ['dis​cord pls', 'social']])
  ok(pii(t).includes(w), `PII "${t}" → ${w}`);
for (const t of ['I have studied English since 2019-2020.', 'There are 365 days in a year.', 'A strong signal of progress', 'I am a big fan of IELTS', 'Band 7.5 in May', 'resilient (adj): able to recover', 'Let\'s meet at 20:00 tonight in this room'])
  eq(pii(t), [], `không bắt nhầm: "${t}"`);
{ const r = checkText('text me 0912345678'); ok(!r.ok && r.why.includes('phone'), 'tin có SĐT bị chặn gửi'); }
// ── §5 Kiểm duyệt: lời tục / đe dọa / spam ──
{ const r = checkText('I will kill you'); ok(!r.ok && r.why.includes('threat'), 'đe dọa bị chặn'); }
{ const r = checkText('fuck you bitch'); ok(!r.ok && r.why.includes('abuse'), 'chửi bới (≥ 2 từ) bị chặn'); }
{ const r = checkText('this grammar is fucking hard'); ok(r.ok && !/fucking/.test(r.text), 'buột miệng 1 từ → gửi được nhưng che từ'); }
{ const r = checkText('aaaaaaaaaaaaaa'); ok(!r.ok && r.why.includes('spam'), 'ký tự lặp = spam'); }
{ const r = checkText('buy buy buy buy buy buy buy'); ok(!r.ok && r.why.includes('spam'), 'lặp từ = spam'); }
{ const r = checkText('x'.repeat(501)); eq(r.why, ['long'], '> 500 ký tự'); eq(checkText('   ').why, ['empty']); }
{ const r = checkText('I have been studying for two hours.'); eq([r.ok, r.text], [true, 'I have been studying for two hours.'], 'câu luyện bình thường đi qua'); }
{ const [, d] = await call('adult-a01', { op: 'check', text: 'my email a@b.co' }); ok(!d.ok && d.why.includes('email'), 'op check dùng cùng luật'); }

// ── §5 Chống spam/quấy rối: bậc tin cậy + nhịp gửi ──
const D = 864e5;
eq(trust({ created: NOW - D, study_days: 10 }, NOW), 0, 'tài khoản < 3 ngày → bậc 0'); eq(trust({ created: NOW - 5 * D, study_days: 1 }, NOW), 0, '< 3 ngày học → bậc 0');
eq(trust({ created: NOW - 5 * D, study_days: 3 }, NOW), 1); eq(trust({ created: NOW - 40 * D, study_days: 25 }, NOW), 2);
eq(trust({ created: NOW - 40 * D, study_days: 25, strikes: 1, strike_at: NOW - D }, NOW), 0, 'có gậy 30 ngày gần → về bậc 0'); eq(trust({ trust: 3 }, NOW), 3, 'điều hành');
ok(!canVoice(0) && canVoice(1), 'phòng nói chỉ từ bậc 1');
{ let st = null, t = NOW; let r = pace(st, 0, t); ok(r.ok); st = r.st; r = pace(st, 0, t + 5e3); ok(!r.ok && r.wait === 5e3, 'bậc 0: 1 tin/10 s'); r = pace(st, 0, t + 10e3); ok(r.ok, 'đủ 10 s → gửi được');
  st = { last: 0, day: new Date(t).toISOString().slice(0, 10), n: PACE[0].day }; r = pace(st, 0, t); ok(!r.ok && r.wait > 0, 'bậc 0: ≤ 50 tin/ngày');
  r = pace(st, 0, t + D); ok(r.ok, 'sang ngày mới (UTC) → đếm lại'); r = pace({ last: t, day: st.day, n: 1 }, 1, t + 3e3); ok(r.ok, 'bậc 1: 1 tin/3 s'); }
{ const p = raw('adult-a01'); const [, d1] = await call('adult-a01', { op: 'me', studied: true }); await call('adult-a01', { op: 'me', studied: true });
  eq(raw('adult-a01').study_days, p.study_days + 1, 'ngày học chỉ tăng 1 lần/ngày (chống bơm bậc tin cậy)'); ok(d1.profile.trust === 0, 'người mới = bậc 0'); }

// ── §5 Riêng tư: chỉ pid + biệt danh, không uid/email ──
{ const [, d] = await call('adult-a01', { op: 'me' }); const s = JSON.stringify(d); ok(!/adult-a01|@|email|uid/.test(s), 'phản hồi không chứa uid/email'); ok(/^[a-z2-9]{10}$/.test(d.profile.pid), 'pid công khai ngẫu nhiên'); }
{ const [s] = await call('adult-a01', { op: 'settings', nick: 'me@x.com' }); eq(s, 400, 'biệt danh dạng email bị chặn'); }
{ const [s] = await call('adult-a01', { op: 'settings', color: 99 }); eq(s, 400, 'màu avatar ngoài bảng'); }
ok(!('birth' in raw('adult-a01')) && !Object.keys(raw('adult-a01')).some(k => /birth|email|year/.test(k)), 'không lưu năm sinh/email – chỉ nhóm tuổi');
{ const [s, d] = await call('nobody-x', { op: 'report', kind: 'user', pid: A.profile.pid, reason: 'spam' }); eq([s, d.error], [403, 'no-profile'], 'chưa vào cộng đồng → không thao tác'); }

// ── §5 Chặn 2 chiều ──
{ const [s] = await call('adult-a01', { op: 'block', pid: B.profile.pid }); eq(s, 200);
  ok(await blockedEither(DB, 'adult-a01', 'adult-b02') && await blockedEither(DB, 'adult-b02', 'adult-a01'), 'A chặn B → chặn CẢ HAI chiều');
  ok(!(await blockedEither(DB, 'adult-a01', 'adult-c03')), 'người khác không bị ảnh hưởng');
  const [, l] = await call('adult-a01', { op: 'blocks' }); eq(l.list.map(x => x.pid), [B.profile.pid]); ok(!JSON.stringify(l).includes('adult-b02'), 'danh sách chặn không lộ uid');
  eq((await call('adult-a01', { op: 'block', pid: A.profile.pid }))[0], 400, 'không tự chặn mình'); eq((await call('adult-a01', { op: 'block', pid: 'zzzzzzzzzz' }))[0], 400, 'pid lạ');
  await call('adult-a01', { op: 'unblock', pid: B.profile.pid }); ok(!(await blockedEither(DB, 'adult-b02', 'adult-a01')), 'bỏ chặn'); }

// ── §5 Báo cáo: tự ẩn sau 2 người, ẩn ngay khi liên quan trẻ em/tự hại, chống lạm dụng ──
{ const r1 = (await call('adult-b02', { op: 'report', kind: 'msg', target: 'r1:m1', pid: A.profile.pid, reason: 'harass' }))[1]; eq(r1.hidden, false, '1 báo cáo: chưa ẩn');
  const r1b = (await call('adult-b02', { op: 'report', kind: 'msg', target: 'r1:m1', pid: A.profile.pid, reason: 'harass' }))[1]; eq(r1b.hidden, false, 'cùng người báo lại không tính thêm');
  const r2 = (await call('adult-c03', { op: 'report', kind: 'msg', target: 'r1:m1', pid: A.profile.pid, reason: 'spam' }))[1]; eq(r2.hidden, true, `${HIDE_AT} người khác nhau → tự ẩn`);
  ok(await isHidden(DB, 'msg:r1:m1')); }
{ const r = (await call('teen-k02', { op: 'report', kind: 'user', pid: K.profile.pid, reason: 'minor' }))[1]; eq(r.hidden, true, "lý do 'minor' → ẩn ngay chờ duyệt"); }
{ eq((await call('adult-a01', { op: 'report', kind: 'user', pid: A.profile.pid, reason: 'spam' }))[1].error, 'self', 'không tự báo cáo');
  eq((await call('adult-a01', { op: 'report', kind: 'user', pid: B.profile.pid, reason: 'nope' }))[0], 400, 'lý do lạ');
  eq((await call('adult-a01', { op: 'report', kind: 'weird', pid: B.profile.pid, reason: 'spam' }))[0], 400, 'loại lạ'); }
{ for (let i = 0; i < REPORTS_PER_DAY; i++) await call('adult-c03', { op: 'report', kind: 'msg', target: 'flood:' + i, pid: B.profile.pid, reason: 'spam' });
  eq((await call('adult-c03', { op: 'report', kind: 'msg', target: 'flood:x', pid: B.profile.pid, reason: 'spam' }))[0], 429, `≤ ${REPORTS_PER_DAY} báo cáo/ngày/người`); }
{ await call('adult-b02', { op: 'report', kind: 'user', pid: C.profile.pid, reason: 'other', note: 'he wrote 0912345678 to me' });
  const r = sql.prepare("SELECT note FROM cm_report WHERE target = ?").get('user:' + C.profile.pid); eq(r.note, null, 'ghi chú báo cáo có PII → không lưu'); }

// ── §5 Hàng duyệt + thang gậy ──
{ const [, q] = await admin(DB, { op: 'adm-queue' }, NOW); ok(q.list.length > 0 && q.list[0].reason === 'minor', "hàng duyệt: 'minor' lên đầu"); ok(!JSON.stringify(q).includes('adult-'), 'hàng duyệt không lộ uid');
  eq(penalty(1, NOW).kind, 'warn'); eq(penalty(2, NOW), { kind: 'mute', until: NOW + D }); eq(penalty(3, NOW), { kind: 'mute', until: NOW + 7 * D }); eq(penalty(4, NOW).kind, 'ban');
  const id = sql.prepare("SELECT id FROM cm_report WHERE target = 'msg:r1:m1' LIMIT 1").get().id;
  const [, a1] = await admin(DB, { op: 'adm-act', id, action: 'warn' }, NOW); eq(a1.penalty.kind, 'warn'); eq(raw('adult-a01').strikes, 1);
  await admin(DB, { op: 'adm-act', id, action: 'mute' }, NOW); ok(muted(raw('adult-a01'), NOW + 1000), 'gậy 2 → câm 24 h');
  const [s, d] = await run(DB, 'adult-a01', { op: 'check', text: 'hi' }, NOW + 1000); eq([s, d.error], [403, 'muted'], 'đang bị câm → không gửi');
  await admin(DB, { op: 'adm-act', id, action: 'ban' }, NOW); eq((await run(DB, 'adult-a01', { op: 'check', text: 'hi' }, NOW + 9 * D))[1].error, 'banned', 'khoá');
  eq((await admin(DB, { op: 'adm-act', id, action: 'explode' }, NOW))[0], 400); eq((await admin(DB, { op: 'adm-act', id: 'none', action: 'warn' }, NOW))[0], 404);
  const did = sql.prepare("SELECT id FROM cm_report WHERE target = ? LIMIT 1").get('user:' + K.profile.pid).id; await admin(DB, { op: 'adm-act', id: did, action: 'dismiss' }, NOW);
  ok(!(await isHidden(DB, 'user:' + K.profile.pid)), 'bỏ qua báo cáo → hiện lại'); }

// ── Cờ tắt mặc định ──
{ const r = await onRequestPost({ request: new Request('https://lexkite.com/api/community', { method: 'POST', body: '{"op":"me"}' }), env: { DB } }); eq(r.status, 404, 'cờ COMMUNITY tắt → 404'); eq((await r.json()).error, 'off'); }
// ── Rời cộng đồng / xoá tài khoản ──
{ await call('adult-c03', { op: 'block', pid: B.profile.pid }); await call('adult-c03', { op: 'leave' }); ok(!raw('adult-c03'), 'rời → xoá hồ sơ');
  ok(!(await blockedEither(DB, 'adult-c03', 'adult-b02')), 'rời → xoá chặn'); }
for (const t of ['cm_profile', 'cm_block', 'cm_report']) ok(DELETE_SQL.some(q => q.includes(t)), `xoá tài khoản xoá ${t}`);
{ for (const q of DELETE_SQL.filter(q => /cm_/.test(q))) sql.prepare(q).run('adult-b02'); ok(!raw('adult-b02') && !sql.prepare("SELECT 1 FROM cm_report WHERE by = 'adult-b02'").get(), 'DELETE_SQL chạy được trên lược đồ thật'); }
// ── Hạ tầng $0 (§4): trần free đã ghi + TURN tắt phòng nói ở 70 % ──
eq(LIMITS.do_requests.limit, 100000); eq(LIMITS.do_rows_written.limit, 100000); eq(LIMITS.turn_bytes.limit, 1000e9);
eq(evaluate([{ key: 'turn_bytes', value: 690e9 }]).voice, 'on'); eq(evaluate([{ key: 'turn_bytes', value: 700e9 }]).voice, 'off', 'TURN ≥ 70 % → tắt phòng nói trước trần');

console.log(`✓ community-api: ${n} kiểm (an toàn §5 · riêng tư · cờ tắt · xoá tài khoản · trần free)`);
