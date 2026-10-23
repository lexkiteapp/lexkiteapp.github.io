// scripts/test/mail-prefs.mjs
// Kiểm tra [N4] Email cảnh báo đọc cài đặt quản trị (adm_pref) trong workers/mail/index.js
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

console.log('--- Kiểm tra [N4] workers/mail đọc cài đặt quản trị (adm_pref) ---');

// 1. Khởi tạo DB SQLite in-memory giả lập Cloudflare D1
const sql = new DatabaseSync(':memory:');
sql.exec(`
  CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT, at INTEGER, by TEXT) WITHOUT ROWID;
  CREATE TABLE IF NOT EXISTS errors (id INTEGER PRIMARY KEY, msg TEXT, last INTEGER, n INTEGER);
  CREATE TABLE IF NOT EXISTS contact_msgs (id INTEGER PRIMARY KEY, at INTEGER, handled INTEGER, sent INTEGER, msg TEXT);
  CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY, at INTEGER, status TEXT, spam INTEGER, sandbox INTEGER, cat TEXT, area TEXT, sev TEXT, msg TEXT, dup_of INTEGER, ai TEXT);
  CREATE TABLE IF NOT EXISTS yt_pack (clip TEXT PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS yt_queue (clip TEXT PRIMARY KEY, status TEXT, updated INTEGER, err TEXT);
`);

let queryCount = 0;
let lastPreparedSql = '';
const exec = (q, a = []) => /^\s*(SELECT|WITH)|RETURNING/i.test(q) ? { results: sql.prepare(q).all(...a) } : (sql.prepare(q).run(...a), { results: [] });
const DB = {
  prepare(q) {
    queryCount++;
    lastPreparedSql = q;
    const st = {
      q,
      args: [],
      bind(...a) { return { ...st, args: a }; },
      async run() {
        // Giả lập size_after cho câu SELECT 1
        if (q.trim() === 'SELECT 1') {
          return { meta: { size_after: DB._simulatedD1Size || (0.75 * 500 * 1048576) } };
        }
        return exec(q, this.args);
      },
      async all() { return exec(q, this.args); },
      async first() { return sql.prepare(q).get(...this.args) || null; },
    };
    return st;
  },
  _simulatedD1Size: 0.75 * 500 * 1048576 // Mặc định 75%
};

// 2. Tải workers/mail/index.js dạng module động (thay thế cloudflare:email bằng mock)
let code = fs.readFileSync('workers/mail/index.js', 'utf8');
code = code.replace(
  /import\s*\{\s*EmailMessage\s*\}\s*from\s*['"]cloudflare:email['"];?/,
  'export class EmailMessage { constructor(from, to, raw) { this.from = from; this.to = to; this.raw = raw; } };'
);
// Giả lập judgeNightly trả về kết quả mẫu
code = code.replace(
  /import\s*\{\s*judgeNightly\s*\}\s*from\s*['"]\.\/judge\.js['"];?/,
  'export const judgeNightly = async () => ({ wrong: 2, langs: ["ja", "ko"] });'
);

const mailModule = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const { adminList, resolvePref, loadConfigAndKeys, digest, default: workerDefault } = mailModule;

// Ghi nhận thư gửi đi qua SEB
const sentEmails = [];
const env = {
  DB,
  ADMIN_EMAILS: 'admin1@lexkite.com, admin2@lexkite.com',
  SEB: {
    send: async msg => {
      sentEmails.push(msg);
    }
  }
};

// --- Test 1: adminList(env) ---
{
  assert.deepEqual(adminList({ ADMIN_EMAILS: 'boss@lexkite.com, ops@lexkite.com' }), ['boss@lexkite.com', 'ops@lexkite.com']);
  assert.deepEqual(adminList({ SEB_TO: 'single@lexkite.com' }), ['single@lexkite.com']);
  assert.deepEqual(adminList({}), ['vintagezulilyjewelry@gmail.com']);
  assert.deepEqual(adminList({ ADMIN_EMAILS: 'dup@lexkite.com, dup@lexkite.com' }), ['dup@lexkite.com']);
  console.log('✓ 1. adminList phân tách đúng danh sách email và fallback an toàn');
}

// --- Test 2: resolvePref ---
{
  // Mặc định khi null / rỗng
  const def = resolvePref(null, 50);
  assert.equal(def.jsErrorThreshold, 50);
  assert.equal(def.quotaThresholdPct, 70);
  assert.ok(def.alertTypes.has('js_error'));
  assert.ok(def.alertTypes.has('workflow_fail'));
  assert.ok(def.alertTypes.has('inbox_new'));
  assert.ok(def.alertTypes.has('quality_alert'));
  assert.ok(def.alertTypes.has('i18n_missing'));
  assert.ok(def.alertTypes.has('quota_warning'));

  // Cấu hình tùy chỉnh
  const custom = resolvePref({
    alertTypes: ['js_error', 'quota_warning'],
    jsErrorThreshold: 20,
    quotaThresholdPct: 85
  }, 50);
  assert.equal(custom.jsErrorThreshold, 20);
  assert.equal(custom.quotaThresholdPct, 85);
  assert.equal(custom.alertTypes.size, 2);
  assert.ok(custom.alertTypes.has('js_error'));
  assert.ok(custom.alertTypes.has('quota_warning'));
  assert.ok(!custom.alertTypes.has('inbox_new'));

  // Giá trị sai được fallback hợp lệ
  const fallback = resolvePref({
    alertTypes: 'not-an-array',
    jsErrorThreshold: -5,
    quotaThresholdPct: 30
  }, 40);
  assert.equal(fallback.jsErrorThreshold, 40);
  assert.equal(fallback.quotaThresholdPct, 70);
  assert.equal(fallback.alertTypes.size, 6);
  console.log('✓ 2. resolvePref chuẩn hóa cấu hình và xử lý fallback chính xác');
}

// --- Test 3: loadConfigAndKeys đọc hàng loạt 1 lần duy nhất theo khóa ---
{
  sql.exec(`
    INSERT OR REPLACE INTO config (k, v) VALUES
      ('alert_errors', '15'),
      ('adm_pref:admin1@lexkite.com', '{"alertTypes":["js_error","quota_warning"],"jsErrorThreshold":30,"quotaThresholdPct":80}'),
      ('adm_pref:admin2@lexkite.com', '{"alertTypes":["inbox_new"],"jsErrorThreshold":10,"quotaThresholdPct":70}');
  `);

  const keys = ['alert_errors', 'adm_pref:admin1@lexkite.com', 'adm_pref:admin2@lexkite.com'];
  const countBefore = queryCount;
  const cfgMap = await loadConfigAndKeys(DB, keys);

  assert.equal(queryCount, countBefore + 1, 'Chỉ thực hiện đúng 1 query');
  assert.ok(lastPreparedSql.includes('WHERE k IN (?,?,?)'), 'Truy vấn theo khóa IN, không quét bảng');
  assert.equal(cfgMap.get('alert_errors'), '15');
  assert.ok(cfgMap.has('adm_pref:admin1@lexkite.com'));
  assert.ok(cfgMap.has('adm_pref:admin2@lexkite.com'));
  console.log('✓ 3. loadConfigAndKeys batch đọc cấu hình theo khóa 1 lần duy nhất');
}

// --- Test 4: digest(env) tôn trọng adm_pref của từng quản trị viên ---
{
  sentEmails.length = 0;
  const now = Date.now();
  // Tạo dữ liệu:
  // - 25 lỗi JS trong 24h
  sql.exec(`INSERT INTO errors (id, msg, last, n) VALUES (1, 'TypeError: cannot read null', ${now - 1000}, 25);`);
  // - 1 tin nhắn liên hệ chưa xử lý
  sql.exec(`INSERT INTO contact_msgs (id, at, handled, sent, msg) VALUES (1, ${now - 1000}, 0, 1, 'Cần hỗ trợ');`);

  // Admin1 có ngưỡng jsErrorThreshold = 30 -> 25 lỗi không đủ kích hoạt cảnh báo JS của Admin1
  // Admin1 có alertTypes = ['js_error', 'quota_warning'], quotaThresholdPct = 80%. DB đang ở 75% -> không kích hoạt quota.
  // -> Admin1 không nhận cảnh báo nào (0 items, không gửi thư rác).

  // Admin2 có alertTypes = ['inbox_new']
  // -> Admin2 nhận được thông báo về tin nhắn liên hệ chưa xử lý.

  // Thêm Admin3 (chưa cài đặt adm_pref): dùng mặc định (ngưỡng jsError = 15 từ alert_errors, 70% quota, tất cả alertTypes bật)
  // -> Admin3 nhận được cả: Lỗi JS (25 >= 15), Tin nhắn liên hệ, Dung lượng D1 (75% >= 70%), Bản dịch AI.

  const testEnv = {
    DB,
    ADMIN_EMAILS: 'admin1@lexkite.com, admin2@lexkite.com, admin3@lexkite.com',
    SEB: {
      send: async msg => {
        sentEmails.push(msg);
      }
    }
  };

  const digestResult = await digest(testEnv);
  assert.ok(Array.isArray(digestResult));
  assert.ok(Array.isArray(digestResult.all));
  assert.equal(digestResult.all.length, 3);

  const res1 = digestResult.all.find(x => x.to === 'admin1@lexkite.com');
  const res2 = digestResult.all.find(x => x.to === 'admin2@lexkite.com');
  const res3 = digestResult.all.find(x => x.to === 'admin3@lexkite.com');

  // Admin1: 0 items vì 25 < 30 và 75% < 80%, inbox_new tắt
  assert.equal(res1.items.length, 0, 'Admin1 không có cảnh báo nào vượt ngưỡng');

  // Admin2: Chỉ nhận inbox_new
  assert.equal(res2.items.length, 1);
  assert.ok(res2.items[0].includes('Tin nhắn liên hệ chưa xử lý: 1'));

  // Admin3: Nhận đủ cảnh báo theo mặc định
  assert.ok(res3.items.some(it => it.includes('Lỗi JavaScript 24h: 25 lượt')));
  assert.ok(res3.items.some(it => it.includes('Tin nhắn liên hệ chưa xử lý')));
  assert.ok(res3.items.some(it => it.includes('Dung lượng D1')));
  assert.ok(res3.items.some(it => it.includes('AI phát hiện 2 câu dịch sai nghĩa')));

  // Xác nhận số thư gửi qua SEB: chỉ gửi cho Admin2 và Admin3, KHÔNG gửi cho Admin1 vì items rỗng
  assert.equal(sentEmails.length, 2, 'Chỉ 2 thư được gửi qua SEB');
  assert.equal(sentEmails[0].to, 'admin2@lexkite.com');
  assert.equal(sentEmails[1].to, 'admin3@lexkite.com');

  console.log('✓ 4. digest gửi email cá nhân hóa đúng bộ lọc & ngưỡng của từng admin');
}

// --- Test 5: worker fetch tôn trọng adm_pref khi có alertType ---
{
  sentEmails.length = 0;

  // Thử gửi alertType 'quota_warning' tới admin2 (admin2 chỉ bật inbox_new)
  const reqBlocked = new Request('https://mail/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: '[Lexkite] Cảnh báo dung lượng',
      text: 'Dung lượng sắp đầy',
      to: 'admin2@lexkite.com',
      alertType: 'quota_warning'
    })
  });
  const resBlocked = await workerDefault.fetch(reqBlocked, env);
  const dataBlocked = await resBlocked.json();
  assert.equal(resBlocked.status, 200);
  assert.equal(dataBlocked.skipped, 'alert-disabled', 'Thư bị bỏ qua do loại cảnh báo bị tắt');
  assert.equal(sentEmails.length, 0, 'Không gửi thư');

  // Thử gửi alertType 'inbox_new' tới admin2 (admin2 đã bật inbox_new)
  const reqAllowed = new Request('https://mail/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: '[Lexkite] Tin nhắn mới',
      text: 'Có liên hệ mới',
      to: 'admin2@lexkite.com',
      alertType: 'inbox_new'
    })
  });
  const resAllowed = await workerDefault.fetch(reqAllowed, env);
  const dataAllowed = await resAllowed.json();
  assert.equal(resAllowed.status, 200);
  assert.equal(dataAllowed.ok, true);
  assert.equal(sentEmails.length, 1, 'Thư được gửi thành công khi loại cảnh báo được bật');

  // Thử gửi không có alertType (ví dụ form liên hệ người dùng thường)
  const reqRegular = new Request('https://mail/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: '[Lexkite] Liên hệ người dùng',
      text: 'Chào bạn',
      to: 'admin2@lexkite.com'
    })
  });
  const resRegular = await workerDefault.fetch(reqRegular, env);
  const dataRegular = await resRegular.json();
  assert.equal(resRegular.status, 200);
  assert.equal(dataRegular.ok, true);
  assert.equal(sentEmails.length, 2, 'Thư thông thường không có alertType vẫn được gửi bình thường');

  console.log('✓ 5. worker fetch kiểm tra alertType và bỏ qua khi admin tắt loại đó');
}

console.log('🎉 TẤT CẢ PHÉP KIỂM [N4] mail-prefs ĐỀU PASS 100%!');
