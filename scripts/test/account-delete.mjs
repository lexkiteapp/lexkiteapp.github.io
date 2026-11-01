// Xóa tài khoản (Google Play Account deletion + App Store 5.1.1(v)): API functions/api/account.js + giao diện web/js/account-delete.js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM, VirtualConsole } from 'jsdom';
import { handle, deleteUserData, DELETE_SQL, firebaseDelete } from '../../functions/api/account.js';

console.log('--- Kiểm tra xóa tài khoản (API & UI) ---');

// ---------- API ----------
const NOW = 1_800_000_000;
const mkDb = (missing = []) => {
  const ran = [];
  return { ran, prepare: sql => ({ bind: (...a) => ({ run: async () => { const tb = sql.match(/(?:FROM|UPDATE) (\w+)/)[1]; if (missing.includes(tb)) throw new Error('D1_ERROR: no such table: ' + tb); ran.push([sql, a]); return {}; } }) }) };
};
const req = (body, token = 'tok', origin = 'https://lexkite.com') => new Request('https://lexkite.com/api/account', { method: 'POST', headers: { Authorization: token ? 'Bearer ' + token : '', 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) });
const deps = (claims, extra = {}) => ({ claims: async () => claims, fbDelete: async () => 'deleted', rate: async () => 0, now: NOW, ...extra });
const body = async r => ({ status: r.status, ...(await r.json()) });

assert.equal((await body(await handle(req({ op: 'delete', confirm: 'DELETE' }, ''), { DB: mkDb() }, deps(null)))).status, 401, 'không token → 401');
assert.equal((await body(await handle(req({ op: 'pull' }), { DB: mkDb() }, deps({ sub: 'u1', auth_time: NOW })))).error, 'op');
assert.equal((await body(await handle(req({ op: 'delete' }), { DB: mkDb() }, deps({ sub: 'u1', auth_time: NOW })))).error, 'confirm', 'thiếu xác nhận → từ chối');
{ const db = mkDb(); const r = await body(await handle(req({ op: 'delete', confirm: 'DELETE' }), { DB: db }, deps({ sub: 'u1', auth_time: NOW - 3600 })));
  assert.equal(r.status, 401); assert.equal(r.error, 'reauth', 'đăng nhập quá 10 phút → buộc đăng nhập lại'); assert.equal(db.ran.length, 0, 'chưa xóa gì khi cần đăng nhập lại'); }
{ const db = mkDb(); const r = await body(await handle(req({ op: 'delete', confirm: 'DELETE' }), { DB: db }, deps({ sub: 'u1' })));
  assert.equal(r.error, 'reauth', 'token không có auth_time → buộc đăng nhập lại'); }
{ const r = await body(await handle(req({ op: 'delete', confirm: 'DELETE' }), { DB: mkDb() }, deps({ sub: 'u1', auth_time: NOW }, { rate: async () => 120 })));
  assert.equal(r.status, 429, 'giới hạn tốc độ'); }
{ const db = mkDb(['league_week', 'league_member']); const r = await body(await handle(req({ op: 'delete', confirm: 'DELETE' }), { DB: db }, deps({ sub: 'u1', auth_time: NOW - 60 })));
  assert.equal(r.status, 200); assert.equal(r.ok, true); assert.equal(r.firebase, 'deleted');
  const tables = db.ran.map(([s]) => s.match(/(?:FROM|UPDATE) (\w+)/)[1]);
  assert.deepEqual(tables, ['docs', 'vid_uid', 'user_backups', 'notice_reads', 'class_progress', 'class_member', 'class_task', 'classes', 'reports', 'users'], 'xóa đủ bảng, bỏ qua bảng chưa tạo');
  assert.ok(db.ran.every(([, a]) => a[0] === 'u1'), 'chỉ xóa đúng uid của token');
  assert.match(db.ran.find(([s]) => /reports/.test(s))[0], /SET uid = '', email = '', notify = 0/, 'báo lỗi: gỡ uid/email, không xóa nội dung'); }
{ const db = mkDb(); const r = await body(await handle(req({ op: 'delete', confirm: 'DELETE' }), { DB: db }, deps({ sub: 'u2', auth_time: NOW }, { fbDelete: async () => 'client' })));
  assert.equal(r.firebase, 'client', 'không xóa được Firebase phía máy chủ → máy khách tự xóa'); }
await assert.rejects(deleteUserData(mkDb(), ''), /uid/);
await assert.rejects(deleteUserData({ prepare: () => ({ bind: () => ({ run: async () => { throw new Error('D1 down'); } }) }) }, 'u1'), /D1 down/, 'lỗi thật không bị nuốt');
assert.ok(DELETE_SQL.every(s => /\?1/.test(s)), 'mọi câu lệnh có tham số uid');
{ let sent; const st = await firebaseDelete('ID', {}, async (u, o) => { sent = [u, o]; return { ok: true }; });
  assert.equal(st, 'deleted'); assert.match(sent[0], /identitytoolkit\.googleapis\.com\/v1\/accounts:delete\?key=/); assert.equal(JSON.parse(sent[1].body).idToken, 'ID'); }
assert.equal(await firebaseDelete('ID', {}, async () => ({ ok: false })), 'client');
{ const r = await handle(req({ op: 'delete', confirm: 'DELETE' }, 'tok', 'https://evil.example'), { DB: mkDb() }, deps({ sub: 'u1', auth_time: NOW }));
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), null, 'không mở CORS cho nguồn lạ'); }
console.log('✓ API: xác thực, đăng nhập lại, xóa đúng bảng/uid, ẩn danh báo lỗi, xóa Firebase, CORS');

// ---------- UI ----------
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="modal" hidden></div><div id="toast"></div></body></html>', { url: 'https://lexkite.com/app/#/settings', runScripts: 'outside-only', virtualConsole: new VirtualConsole() });
const w = dom.window, d = w.document;
const toasts = [], calls = [];
let reauthN = 0, signedOut = 0, delN = 0;
w.t = (k, p) => { let s = String(k); if (p) for (const [a, b] of Object.entries(p)) s = s.replaceAll('{' + a + '}', b); return s; };
w.UI = { icon: (n, cls) => `<svg class="i${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`, addIcons: () => {}, glyph: e => e, esc: s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]), toast: m => toasts.push(m),
  modal: html => { const m = d.getElementById('modal'); m.innerHTML = html; m.hidden = false; }, closeModal: () => { d.getElementById('modal').hidden = true; } };
const store = {};
w.Core = { Store: { set: async (k, v) => { store[k] = v; }, get: async (k, def) => (k in store ? store[k] : def) } };
let replies = [];
w.fetch = async (url, o) => { calls.push([url, JSON.parse(o.body), o.headers.Authorization]); const r = replies.shift(); return { status: r.status || 200, json: async () => r }; };
w.Sync = { api: 'https://lexkite.com/api/sync', user: { email: 'a@b.co', getIdToken: async () => 'old', delete: async () => { delN++; } },
  reauth: async () => { reauthN++; return 'fresh'; }, afterDelete: async () => { signedOut++; } };
vm.runInContext(fs.readFileSync(new URL('../../web/js/account-delete.js', import.meta.url), 'utf8'), dom.getInternalVMContext());
await w.AccountDelete.open();
const go = d.getElementById('adGo'), sure = d.getElementById('adSure');
assert.ok(go && go.disabled, 'nút xóa bị khóa đến khi tick "không thể hoàn tác"');
assert.match(d.getElementById('modal').textContent, /a@b\.co/, 'hiện email tài khoản sắp xóa');
sure.checked = true; sure.dispatchEvent(new w.Event('change'));
assert.equal(go.disabled, false);
d.getElementById('adWipe').checked = true;
replies = [{ status: 401, error: 'reauth' }, { ok: true, firebase: 'client' }];
go.click();
for (let i = 0; i < 20 && !toasts.length; i++) await new Promise(r => setTimeout(r, 10));
assert.equal(calls.length, 2, 'gửi lại 1 lần sau khi đăng nhập lại');
assert.equal(calls[0][0], 'https://lexkite.com/api/account');
assert.deepEqual(calls[0][1], { op: 'delete', confirm: 'DELETE' });
assert.equal(calls[1][2], 'Bearer fresh', 'lần 2 dùng token mới');
assert.equal(reauthN, 1); assert.equal(delN, 1, 'máy chủ báo client → gọi user.delete()'); assert.equal(signedOut, 1);
assert.ok(store.cards && !Object.keys(store.cards).length && store.game === null, 'tùy chọn xóa dữ liệu trên máy');
assert.equal(w.Sync.deleting, false, 'mở lại đồng bộ sau khi xong');
assert.ok(toasts.includes('Đã xóa tài khoản của bạn.'));
// Lỗi máy chủ → báo lỗi, nút mở lại, không đăng xuất
signedOut = 0; toasts.length = 0; await w.AccountDelete.open();
const s2 = d.getElementById('adSure'); s2.checked = true; s2.dispatchEvent(new w.Event('change'));
replies = [{ status: 500, error: 'server' }];
d.getElementById('adGo').click();
for (let i = 0; i < 20 && !/Không xóa/.test(d.getElementById('adMsg').textContent); i++) await new Promise(r => setTimeout(r, 10));
assert.match(d.getElementById('adMsg').textContent, /Không xóa được/); assert.equal(signedOut, 0); assert.equal(d.getElementById('adGo').disabled, false);
// Chưa đăng nhập
w.Sync.user = null; await w.AccountDelete.open(); assert.ok(toasts.includes('Hãy đăng nhập để xóa tài khoản.'));
// sync.js: nút ở thẻ tài khoản + liên kết web + không đẩy dữ liệu khi đang xóa
const S = fs.readFileSync(new URL('../../web/js/sync.js', import.meta.url), 'utf8');
assert.match(S, /data-acct="del"/); assert.match(S, /delete=account/); assert.match(S, /Sync\.deleting\) return/);
console.log('✓ UI: xác nhận 2 bước, đăng nhập lại, xóa Firebase phía máy khách, xóa dữ liệu trên máy, báo lỗi');
