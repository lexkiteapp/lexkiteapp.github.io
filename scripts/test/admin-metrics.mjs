// R3 (docs/specs/admin-audit.md): MỘT bảng số liệu METRICS trong web/js/admin.js – mỗi số (lỗi JS, chất lượng, hạn mức %, hộp thư,
// CI, báo lỗi, gắn kết, khóa AI, Kho Drive) có đúng một hàm mức; mọi tab dùng chung. Cổng này:
//  1) chạy thật khối METRICS và khóa mức cho từng ca biên;  2) cấm tự so ngưỡng ngoài khối (admin.js, admin-storage.js);
//  3) ngưỡng hạn mức máy chủ (functions/api/admin.js) khớp máy khách;  4) các tab đều gọi METRICS.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const src = fs.readFileSync('web/js/admin.js', 'utf8');
const m = /\/\/ METRICS:start[\s\S]*?\n([\s\S]*?)\n\s*\/\/ METRICS:end/.exec(src);
assert.ok(m, 'admin.js thiếu khối // METRICS:start … // METRICS:end');
const block = m[1];
const LV = { crit: [0, 'bad', 'Nghiêm trọng'], warn: [1, 'warn', 'Cần xử lý'], info: [2, 'info', 'Theo dõi'], ok: [3, 'ok', 'Ổn'] };
const CRIT_WF = new RegExp(/const CRIT_WF = \/(.*)\/i;/.exec(src)[1], 'i');
const { METRICS: M, lvc, QUOTA_WARN, QUOTA_CRIT } = new Function('LV', 'CRIT_WF', block + '\nreturn { METRICS, lvc, QUOTA_WARN, QUOTA_CRIT };')(LV, CRIT_WF);

let fails = 0;
const t = (name, fn) => { try { fn(); console.log('✓', name); } catch (e) { fails++; console.error('✗', name, '\n ', e.message); } };

t('quota: biên 69/70/89/90, thiếu số → null', () => {
  assert.deepEqual([0, 69.9, 70, 89, 90, 100].map(M.quota), ['ok', 'ok', 'warn', 'warn', 'crit', 'crit']);
  for (const x of [null, undefined, '', 'abc']) assert.equal(M.quota(x), null);
});
t('errors: vượt ngưỡng (máy chủ ok=false) = crit; có lỗi dưới ngưỡng = info; 0 = ok; chưa có = null', () => {
  assert.equal(M.errors({ ok: false, n: 80 }), 'crit'); assert.equal(M.errors({ ok: true, n: 3 }), 'info');
  assert.equal(M.errors({ ok: true, n: 0 }), 'ok'); assert.equal(M.errors(null), null);
});
t('quality: đạt chuẩn = ok, dưới = warn, lỗi đọc/chưa chạy = null (không giả 0)', () => {
  assert.equal(M.quality({ score: 100, standard: 100 }), 'ok'); assert.equal(M.quality({ score: 80 }), 'warn');
  assert.equal(M.quality({ _err: 'GitHub HTTP 403' }), null); assert.equal(M.quality({ score: null }), null);
});
t('inbox: quá hạn (máy chủ ok=false) = warn; có tin = info; trống = ok', () => {
  assert.equal(M.inbox({ ok: false }, 3), 'warn'); assert.equal(M.inbox({ ok: true }, 2), 'info'); assert.equal(M.inbox({ ok: true }, 0), 'ok');
});
t('workflow/ci: deploy hỏng = crit, khác = warn, GitHub không đọc được → ci.bad = null (không hiện 0)', () => {
  assert.equal(M.workflow({ ok: false, name: 'Pages deploy' }), 'crit'); assert.equal(M.workflow({ ok: false, name: 'Blog images' }), 'warn');
  assert.equal(M.workflow({ ok: true }), 'ok');
  const ci = M.ci([{ kind: 'workflow', ok: false, name: 'Prod release' }, { kind: 'workflow', ok: false, name: 'x' }, { kind: 'workflow', ok: true, name: 'y' }, { kind: 'errors', ok: false }]);
  assert.deepEqual(ci, { total: 3, bad: 2, lv: 'crit' });
  assert.deepEqual(M.ci([{ kind: 'workflow', ok: true }]), { total: 1, bad: 0, lv: 'ok' });
  const un = M.ci([{ kind: 'workflow', name: 'GitHub API', ok: false, unreadable: true }]);
  assert.equal(un.bad, null); assert.equal(un.lv, null);
  assert.equal(M.workflow({ ok: false, unreadable: true, name: 'GitHub API health' }), 'warn');
});
t('row: hạn mức theo pct (một nguồn), hộp thư/backlink tối đa warn, bản sao = info', () => {
  assert.equal(M.row({ kind: 'capacity', pct: 95, ok: false }), 'crit'); assert.equal(M.row({ kind: 'capacity', pct: 75, ok: false, warn: true }), 'warn');
  assert.equal(M.row({ kind: 'inbox', ok: false }), 'warn'); assert.equal(M.row({ kind: 'backlink', ok: true, warn: true }), 'warn');
  assert.equal(M.row({ kind: 'copy', ok: false }), 'info'); assert.equal(M.row({ kind: 'mail', ok: true }), 'ok');
  assert.equal(M.row({ kind: 'errors', ok: false, n: 99 }), 'crit');
});
t('reports/stick/keys/drive', () => {
  assert.deepEqual([0, 1, 9, 10].map(M.reports), [null, 'info', 'info', 'warn']);
  assert.deepEqual([24, 25].map(M.stick), ['warn', 'ok']);
  assert.equal(M.keys({ set: false }), 'warn'); assert.equal(M.keys({ set: true, keys: [{ cooling: true }] }), 'crit'); assert.equal(M.keys({ set: true, keys: [{}] }), 'ok');
  assert.equal(M.drive([]), 'ok'); assert.equal(M.drive([{ level: 'warn' }]), 'warn'); assert.equal(M.drive([{ level: 'crit' }]), 'crit');
});
t('lvc: mức → class chip Kit', () => { assert.deepEqual(['crit', 'warn', 'info', 'ok', null].map(lvc), ['bad', 'warn', 'info', 'ok', '']); });

t('cấm tự so ngưỡng ngoài METRICS (admin.js)', () => {
  const outside = src.replace(m[0], '');
  const BAD = /\b(pct|score|stick|hits|open|liveKeys|wfBad)\s*(>=|<=|<|>)\s*[\d(+]|CRIT_WF\.test|m\.pct\s*>=|qStd|\? 'bad' : [^;]*\? 'warn' : 'ok'/;
  const hits = outside.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => BAD.test(l));
  assert.deepEqual(hits.map(([n, l]) => n + ': ' + l.trim().slice(0, 120)), []);
});
t('admin-storage dùng quotaLv (METRICS.quota), không tự so 70/90', () => {
  const s = fs.readFileSync('web/js/admin-storage.js', 'utf8');
  assert.ok(/quotaLv\(p\)/.test(s)); assert.ok(!/p >= (70|90)/.test(s));
  assert.ok(/AdminStorage\.render\(main[^\n]*quotaLv: METRICS\.quota/.test(src));
});
t('máy chủ: QUOTA_WARN/QUOTA_CRIT khớp máy khách, hàng capacity có pct, errors có n', () => {
  const api = fs.readFileSync('functions/api/admin.js', 'utf8');
  const sv = /const QUOTA_WARN = (\d+), QUOTA_CRIT = (\d+);/.exec(api);
  assert.ok(sv, 'functions/api/admin.js thiếu QUOTA_WARN/QUOTA_CRIT');
  assert.deepEqual([+sv[1], +sv[2]], [QUOTA_WARN, QUOTA_CRIT]);
  assert.ok(/kind: 'capacity', name: m\.name, pct: m\.pct/.test(api)); assert.ok(/kind: 'errors'[^\n]*n: \+e\.hits/.test(api));
  assert.ok(!/m\.pct (<|>=) (70|90)/.test(api), 'máy chủ còn số 70/90 viết tay');
});
t('mọi tab dùng METRICS: signals, Tổng quan, Sức khỏe, Dịch vụ', () => {
  for (const re of [/add\(METRICS\.row\(r\)/, /METRICS\.reports\(rc\.new\)/, /METRICS\.quality\(q\)/, /METRICS\.stick\(stick\)/, /METRICS\.inbox\(inRow/, /METRICS\.ci\(rows\)/, /METRICS\.drive\(dl\)/, /METRICS\.keys\(gk\)/, /meters\.filter\(m => [^\n]*METRICS\.quota/])
    assert.ok(re.test(src), 'thiếu ' + re);
});

if (fails) { console.error(`admin-metrics: ${fails} lỗi`); process.exit(1); }
console.log('admin-metrics: OK');
