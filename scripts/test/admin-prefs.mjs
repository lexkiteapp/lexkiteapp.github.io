// Kiểm tra tính năng [N3] Cài đặt nâng cao tài khoản quản trị (API functions/api/admin-prefs.js)
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { webcrypto } from 'node:crypto';

console.log('--- Kiểm tra [N3] Cài đặt nâng cao tài khoản quản trị (API admin-prefs.js) ---');

// Mock in-memory SQLite D1 DB
const sql = new DatabaseSync(':memory:');
const exec = (q, a = []) => /^\s*(SELECT|WITH)|RETURNING/i.test(q) ? { results: sql.prepare(q).all(...a) } : (sql.prepare(q).run(...a), { results: [] });
const DB = {
  prepare(q) {
    const st = {
      q,
      args: [],
      bind(...a) { return { ...st, args: a }; },
      async run() { return exec(q, this.args); },
      async all() { return exec(q, this.args); },
      async first() { return sql.prepare(q).get(...this.args) || null; },
    };
    return st;
  },
  async batch(list) {
    const out = [];
    sql.exec('BEGIN');
    try {
      for (const x of list) out.push(await x.run());
      sql.exec('COMMIT');
    } catch (e) {
      sql.exec('ROLLBACK');
      throw e;
    }
    return out;
  },
};

// Khởi tạo bảng ban đầu
sql.exec(`
  CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT, at INTEGER, by TEXT) WITHOUT ROWID;
  CREATE TABLE IF NOT EXISTS admin_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, email TEXT, op TEXT, ok INTEGER, ip TEXT, country TEXT);
`);

// Mock Firebase ID token
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
globalThis.fetch = async () => ({ ok: true, json: async () => ({ keys: [jwk] }) });
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(Date.now() / 1000);
const tok = async (sub, extra = {}) => {
  const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' }));
  const p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, auth_time: sec - 60, sub, ...extra }));
  return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p)));
};

const adminToken = await tok('u_admin', { email: 'admin@lexkite.com', email_verified: true });
const strangerToken = await tok('u_stranger', { email: 'stranger@example.com', email_verified: true });

const env = {
  DB,
  ADMIN_EMAILS: 'admin@lexkite.com',
};

const { onRequestPost } = await import('../../functions/api/admin-prefs.js');

async function callPost(body, token = adminToken) {
  const req = new Request('https://lexkite.com/api/admin-prefs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://lexkite.com',
      'Authorization': 'Bearer ' + token,
      'CF-Connecting-IP': '1.2.3.4'
    },
    body: JSON.stringify(body)
  });
  const res = await onRequestPost({ request: req, env });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// 1. Kiểm tra phân quyền: người lạ bị chặn
{
  const res = await callPost({ op: 'get' }, strangerToken);
  assert.equal(res.status, 403, 'Người lạ bị chặn 403');
  assert.equal(res.data.error, 'forbidden');
  console.log('✓ 1. Cổng adminGate chặn người lạ');
}

// 2. Kiểm tra GET mặc định khi chưa có cấu hình
{
  const res = await callPost({ op: 'get' });
  assert.equal(res.status, 200);
  assert.equal(res.data.ok, true);
  assert.equal(res.data.pref.tab, 'overview');
  assert.equal(res.data.pref.lang, 'vi');
  assert.equal(res.data.pref.autoLogoutMin, 0);
  assert.equal(res.data.pref.jsErrorThreshold, 10);
  assert.equal(res.data.pref.quotaThresholdPct, 70);
  assert.equal(Array.isArray(res.data.pref.alertTypes), true);
  console.log('✓ 2. GET trả về giá trị mặc định hợp lệ');
}

// 3. Kiểm tra SET hợp lệ
{
  const newPref = {
    tab: 'settings',
    lang: 'en',
    theme: 'dark',
    autoLogoutMin: 30,
    alertTypes: ['js_error', 'workflow_fail', 'quota_warning'],
    jsErrorThreshold: 25,
    quotaThresholdPct: 80
  };
  const res = await callPost({ op: 'set', pref: newPref });
  assert.equal(res.status, 200);
  assert.equal(res.data.ok, true);
  assert.deepEqual(res.data.pref, newPref);

  // Đọc lại bằng GET để xác thực lưu DB
  const getRes = await callPost({ op: 'get' });
  assert.equal(getRes.status, 200);
  assert.deepEqual(getRes.data.pref, newPref);

  // Kiểm tra audit log đã ghi
  const row = sql.prepare("SELECT * FROM admin_log WHERE op = 'adminPrefSet' ORDER BY id DESC LIMIT 1").get();
  assert.ok(row, 'Có bản ghi audit log');
  assert.equal(row.email, 'admin@lexkite.com');
  assert.equal(row.ok, 1);
  console.log('✓ 3. SET lưu cấu hình và ghi audit log thành công');
}

// 4. Kiểm tra schema whitelist và từ chối trường lạ / kiểu sai
{
  // Trường lạ
  const badField = await callPost({ op: 'set', pref: { tab: 'overview', evil_field: 'hacked' } });
  assert.equal(badField.status, 400);
  assert.ok(badField.data.error.includes('unknown-key'));

  // Tab không hợp lệ
  const badTab = await callPost({ op: 'set', pref: { tab: 'malicious_tab' } });
  assert.equal(badTab.status, 400);
  assert.equal(badTab.data.error, 'invalid-tab');

  // autoLogoutMin sai (không thuộc [0, 15, 30, 60, 120])
  const badLogout = await callPost({ op: 'set', pref: { autoLogoutMin: 45 } });
  assert.equal(badLogout.status, 400);
  assert.equal(badLogout.data.error, 'invalid-autoLogoutMin');

  // jsErrorThreshold sai
  const badJs = await callPost({ op: 'set', pref: { jsErrorThreshold: -1 } });
  assert.equal(badJs.status, 400);
  assert.equal(badJs.data.error, 'invalid-jsErrorThreshold');

  // quotaThresholdPct sai
  const badQuota = await callPost({ op: 'set', pref: { quotaThresholdPct: 30 } });
  assert.equal(badQuota.status, 400);
  assert.equal(badQuota.data.error, 'invalid-quotaThresholdPct');

  // alertType không hợp lệ
  const badAlert = await callPost({ op: 'set', pref: { alertTypes: ['invalid_alert'] } });
  assert.equal(badAlert.status, 400);
  assert.ok(badAlert.data.error.includes('invalid-alertType'));

  console.log('✓ 4. Whitelist schema chặn chặt chẽ trường lạ và giá trị sai');
}

// 5. Kiểm tra truy vấn nhật ký (logs)
{
  const res = await callPost({ op: 'logs', mine: true, limit: 10 });
  assert.equal(res.status, 200);
  assert.equal(res.data.ok, true);
  assert.ok(Array.isArray(res.data.rows));
  assert.ok(res.data.rows.length >= 1);
  assert.equal(res.data.rows[0].email, 'admin@lexkite.com');
  console.log('✓ 5. Logs truy vấn lịch sử hoạt động chính xác');
}

console.log('🎉 TẤT CẢ BÀI KIỂM TRA [N3] API admin-prefs ĐỀU PASS 100%!');
