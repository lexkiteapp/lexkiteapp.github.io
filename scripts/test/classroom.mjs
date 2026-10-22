// Lớp học (functions/api/class.js): luồng tạo lớp → tham gia → giao bài → tiến độ → báo cáo → xóa, chạy trên SQLite trong bộ nhớ.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { run, setup, newCode, cleanCode, cleanName, cleanRef, ALPHABET, MAX } from '../../functions/api/class.js';
import { DELETE_SQL } from '../../functions/api/account.js';

const sql = new DatabaseSync(':memory:');
const exec = (q, a) => /^\s*(SELECT|WITH)|RETURNING/i.test(q) ? { results: sql.prepare(q).all(...a) } : (sql.prepare(q).run(...a), { results: [] });
const DB = {
  prepare(q) { const st = { args: [], bind(...a) { return { ...st, args: a }; }, async run() { return exec(q, this.args); }, async all() { return exec(q, this.args); }, async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; },
  async batch(list) { sql.exec('BEGIN'); try { const o = []; for (const x of list) o.push(await x.run()); sql.exec('COMMIT'); return o; } catch (e) { sql.exec('ROLLBACK'); throw e; } },
};
await setup(DB);
let T = 1.8e12;
const call = (uid, req) => run(DB, uid, req, T += 1000);
const okc = async (uid, req) => { const [s, d] = await call(uid, req); assert.equal(s, 200, `${req.op} → ${s} ${JSON.stringify(d)}`); return d; };

// 1. Hàm làm sạch
for (let i = 0; i < 200; i++) { const c = newCode(); assert.equal(c.length, 6); assert.equal(cleanCode(c), c); assert.ok([...c].every(x => ALPHABET.includes(x))); }
assert.equal(cleanCode('abc-dfg'), 'ABCDFG');
assert.equal(cleanCode('ABCD1O'), '', 'bỏ 1/O dễ nhầm');
assert.equal(cleanName('Nguyễn Văn An'), 'Nguyễn Văn An');
assert.equal(cleanName('O’Brien'), 'O’Brien');
assert.equal(cleanName('a@b.com'), '');
assert.equal(cleanName('x'.repeat(41)), '');
assert.equal(cleanRef('topic:education'), 'topic:education');
assert.equal(cleanRef('il:3'), 'il:3');
assert.equal(cleanRef('toeic:7'), 'toeic:7');
assert.equal(cleanRef('http://x'), '');
assert.equal(cleanRef('topic:../x'), '');
console.log('✓ mã lớp, tên, mã bài giao');

// 2. Luồng đầy đủ
const { cls } = await okc('teacher', { op: 'create', name: 'IELTS 10A1' });
assert.ok(cls.id && cleanCode(cls.code));
assert.deepEqual(await call('teacher', { op: 'join', code: cls.code, name: 'Me' }), [400, { error: 'own-class' }]);
assert.deepEqual(await call('s1', { op: 'join', code: 'ZZZZZZ', name: 'An' }), [404, { error: 'no-class' }]);
assert.deepEqual(await call('s1', { op: 'join', code: cls.code, name: 'a@b.com' }), [400, { error: 'name' }]);
await okc('s1', { op: 'join', code: cls.code.toLowerCase(), name: 'An' });
await okc('s2', { op: 'join', code: cls.code, name: 'Bình' });
await okc('s1', { op: 'join', code: cls.code, name: 'An Nguyễn' }); // tham gia lại = đổi tên, không nhân đôi
assert.deepEqual(await call('s1', { op: 'assign', cls: cls.id, ref: 'il:1' }), [404, { error: 'no-class' }], 'học sinh không giao bài được');
const t1 = (await okc('teacher', { op: 'assign', cls: cls.id, ref: 'topic:education' })).task;
const t2 = (await okc('teacher', { op: 'assign', cls: cls.id, ref: 'il:2', due: 1.9e12 })).task;
assert.deepEqual(await call('teacher', { op: 'assign', cls: cls.id, ref: 'il:2' }), [400, { error: 'dup' }]);
assert.deepEqual(await call('teacher', { op: 'assign', cls: cls.id, ref: 'evil' }), [400, { error: 'ref' }]);
assert.equal((await okc('s1', { op: 'progress', ref: 'il:2', r: 30, t: 40 })).n, 1);
await okc('s1', { op: 'progress', ref: 'il:2', r: 20, t: 40 }); // lần 2 thấp hơn: best giữ 75
await okc('s1', { op: 'progress', ref: 'topic:education', r: 90, t: 100 });
assert.equal((await okc('s2', { op: 'progress', ref: 'ir:9', r: 5, t: 10 })).n, 0, 'bài không được giao → không ghi');
assert.deepEqual(await call('s2', { op: 'progress', ref: 'il:2', r: 50, t: 40 }), [400, { error: 'score' }]);
assert.deepEqual(await call('s2', { op: 'report', cls: cls.id }), [404, { error: 'no-class' }], 'học sinh không xem báo cáo lớp');
let rep = await okc('teacher', { op: 'report', cls: cls.id });
assert.deepEqual(rep.members.map(m => m.name), ['An Nguyễn', 'Bình']);
assert.equal(rep.tasks.length, 2);
const p = rep.prog.find(x => x.task === t2.id && x.id === 's1');
assert.deepEqual([p.best, p.last, p.tries], [75, 50, 2]);
assert.ok(!JSON.stringify(rep).includes('@'), 'không có email trong báo cáo');
const mine = await okc('s1', { op: 'mine' });
assert.equal(mine.learn.length, 1); assert.equal(mine.learn[0].tasks.length, 2); assert.equal(mine.learn[0].prog.length, 2);
assert.equal((await okc('teacher', { op: 'mine' })).teach[0].n, 2);
console.log('✓ tạo lớp → tham gia → giao bài → tiến độ → báo cáo');

// 3. Quản lý lớp
const nc = (await okc('teacher', { op: 'newcode', cls: cls.id })).code;
assert.notEqual(nc, cls.code);
assert.deepEqual(await call('s3', { op: 'join', code: cls.code, name: 'Chi' }), [404, { error: 'no-class' }], 'mã cũ hết hiệu lực');
await okc('teacher', { op: 'kick', cls: cls.id, uid: 's2' });
await okc('teacher', { op: 'unassign', cls: cls.id, task: t1.id });
rep = await okc('teacher', { op: 'report', cls: cls.id });
assert.equal(rep.members.length, 1); assert.equal(rep.tasks.length, 1); assert.equal(rep.prog.length, 1);
await okc('s1', { op: 'leave', cls: cls.id });
assert.equal((await okc('s1', { op: 'mine' })).learn.length, 0);
for (let i = 1; i < MAX.teach; i++) await okc('t2', { op: 'create', name: 'C' + i });
await okc('t2', { op: 'create', name: 'Last' });
assert.deepEqual(await call('t2', { op: 'create', name: 'Over' }), [400, { error: 'max-classes' }]);
await okc('teacher', { op: 'delete', cls: cls.id });
assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM class_task WHERE cls = ?').get(cls.id).n, 0);
console.log('✓ đổi mã, xóa học sinh, gỡ bài, rời lớp, giới hạn, xóa lớp');

// 4. Xóa tài khoản (account.js DELETE_SQL) dọn dữ liệu lớp học của cả giáo viên lẫn học sinh
const c2 = (await okc('teacher', { op: 'create', name: 'B' })).cls;
await okc('s5', { op: 'join', code: c2.code, name: 'Em' });
const t5 = (await okc('teacher', { op: 'assign', cls: c2.id, ref: 'toeic:1' })).task;
await okc('s5', { op: 'progress', ref: 'toeic:1', r: 150, t: 200 });
const del = async uid => { for (const q of DELETE_SQL) { try { sql.prepare(q).run(uid); } catch (e) { if (!/no such table/i.test(e.message)) throw e; } } };
await del('s5');
assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM class_member WHERE uid = ?').get('s5').n, 0);
assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM class_progress WHERE uid = ?').get('s5').n, 0);
await okc('s6', { op: 'join', code: c2.code, name: 'Em 2' });
await okc('s6', { op: 'progress', ref: 'toeic:1', r: 1, t: 2 });
await del('teacher');
for (const tb of ['classes', 'class_member', 'class_task', 'class_progress']) assert.equal(sql.prepare(`SELECT COUNT(*) AS n FROM ${tb} WHERE ${tb === 'classes' ? 'owner' : 'cls'} = ?`).get(tb === 'classes' ? 'teacher' : c2.id).n, 0, tb);
assert.ok(t5.id);
console.log('✓ xóa tài khoản: dọn lớp học (học sinh + giáo viên)');

// 5. Giao diện (web/js/classroom.js) nối thẳng vào API thật trên SQLite: giáo viên tạo lớp → giao bài → học sinh vào bằng link → làm bài → giáo viên thấy điểm
{
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!doctype html><body><div id="view"></div><div id="modal" hidden><div id="modalBox"></div></div></body>', { url: 'https://lexkite.com/app/#/class', runScripts: 'outside-only' });
  const w = dom.window, d = w.document, $ = (s, el = d) => el.querySelector(s), toasts = [];
  w.t = (k, p) => { let x = String(k); for (const [a, b] of Object.entries(p || {})) x = x.replaceAll('{' + a + '}', b); return x; };
  w.I18N = { lang: () => 'en' };
  w.UI = { $, $$: (s, el = d) => [...el.querySelectorAll(s)], esc: x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), toast: m => toasts.push(m),
    modal: h => { const b = $('#modalBox'); b.innerHTML = h; $('#modal').hidden = false; return b; }, closeModal: () => { $('#modal').hidden = true; }, download: () => {} };
  w.App = { view: $('#view'), routes: {}, need: async () => {} };
  w.IELTS_DATA = { TOPICS: [{ id: 'education', name: 'Giáo dục', emoji: '🎓', group: 'topics', words: Array(12).fill({}) }], GROUPS: [{ id: 'topics', name: 'Topics', emoji: '🗂️' }] };
  const as = uid => ({ uid, displayName: uid === 'tch' ? 'Ms Lan' : 'Minh Anh', getIdToken: async () => uid });
  w.Sync = { user: as('tch'), can: true, signIn: () => {} };
  const calls = [];
  w.fetch = async (url, o) => { const body = JSON.parse(o.body), uid = o.headers.Authorization.slice(7); calls.push([uid, body.op]); assert.equal(url, '/api/class'); const [status, data] = await run(DB, uid, body, Date.now()); return { ok: status < 400, status, json: async () => data }; };
  w.confirm = () => true;
  w.eval(fs.readFileSync('web/js/classroom.js', 'utf8'));
  const until = async (f, ms = 4000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('timeout: ' + f); await new Promise(r => setTimeout(r, 20)); } };
  const go = async h => { w.location.hash = h; const [, name, ...rest] = h.split('?')[0].split('/'); await w.App.routes[name](rest.join('/'), new w.URLSearchParams(h.split('?')[1] || '')); };

  await go('#/class');
  assert.ok($('#crNew') && $('#crJoin'), 'trung tâm lớp học: form tạo lớp + tham gia');
  $('#crNewName').value = 'IELTS 10A2'; $('#crNew').requestSubmit();
  await until(() => /^#\/class\/[a-z0-9]+$/.test(w.location.hash));
  const id = w.location.hash.slice(8);
  await go('#/class/' + id);
  const code = $('.cr-code').textContent;
  assert.ok(cleanCode(code), 'hiện mã lớp');
  const gc = $('[data-gc]').getAttribute('href');
  assert.ok(gc.startsWith('https://classroom.google.com/share?url=' + encodeURIComponent('https://lexkite.com/app/#/class/join/' + code)), 'nút Google Classroom dùng link chia sẻ chính thức');
  $('#crAdd').click();
  await until(() => $('#crPick input[value="topic:education"]'));
  $('#crPick input[value="topic:education"]').checked = true; $('#crPick input[value="topic:education"]').dispatchEvent(new w.Event('change', { bubbles: true }));
  $('#crGo').click();
  await until(() => $('#modal').hidden && $('[data-un]'));
  assert.equal(w.localStorage.getItem('lk.edu'), '1', 'giáo viên: không quảng cáo');

  w.Sync.user = as('stu');
  await go('#/class/join/' + code.toLowerCase() + '?task=topic%3Aeducation');
  assert.equal($('#crCode').value, code, 'mã điền sẵn từ link');
  $('#crName').value = 'Minh Anh 10A2'; $('#crJoin').requestSubmit();
  await until(() => w.location.hash === '#/topic/education');
  assert.equal(w.localStorage.getItem('lk.cls'), '1');
  w.dispatchEvent(new w.CustomEvent('lexkite:practice-done', { detail: { src: 'topic:education', pct: 80, mode: 'test' } }));
  await until(() => calls.some(c => c[1] === 'progress'), 5000);
  await until(() => toasts.some(x => /giáo viên/.test(x)), 3000);
  await go('#/class/' + id);
  assert.ok($('.cr-pct') && /80%/.test($('#view').textContent), 'học sinh thấy điểm của mình');

  w.Sync.user = as('tch');
  await go('#/class/' + id);
  const row = $('.cr-tbl tbody tr');
  assert.ok(row && /Minh Anh 10A2/.test(row.textContent) && /1\/1/.test(row.textContent) && /80%/.test(row.textContent), 'giáo viên thấy tiến độ: tên, 1/1 bài, 80%');
  assert.ok(!/stu@|@/.test($('#view').textContent), 'không lộ email');
  console.log('✓ giao diện: tạo lớp → Google Classroom → giao bài → học sinh vào qua link → làm bài → giáo viên thấy 80%');
  w.close();
}
console.log('ERRORS none');
