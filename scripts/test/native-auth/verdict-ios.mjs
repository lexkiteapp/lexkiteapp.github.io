// Kết luận kiểm đăng nhập gốc iOS (workflow native-auth-e2e.yml): đọc <dir>/results.json + syslog/app-std* của driver.mjs (chế độ E2E_MODE=auth).
// Đỏ khi: bước đăng nhập có lỗi, app crash, hoặc log có lỗi khởi tạo Firebase / thiếu CLIENT_ID.
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2] || 'e2e-out/auth';
const res = JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8'));
const bad = [];
const AUTH_STEPS = /^(launch|authui|authtap|usable|acctdel)/;
for (const e of res.events.filter(e => e.type === 'step')) {
  const iss = (e.issues || []).filter(i => !/^(http|fetch-fail|resource)$/.test(i.kind)); // mạng CI chập chờn không tính
  console.log(`${iss.length ? '✗' : '✓'} ${e.step}${iss.length ? ' – ' + iss.map(i => i.kind + ': ' + i.msg).join(' | ') : ''}`);
  if (iss.length && AUTH_STEPS.test(e.step)) bad.push(e.step);
}
for (const e of res.events.filter(e => e.type === 'info' && /^auth/.test(e.key))) console.log('ℹ', JSON.stringify(e).slice(0, 900));
if (res.crashes.length) bad.push('crash: ' + res.crashes.join(','));
if (!res.done) bad.push('kịch bản chưa chạy hết');
const FB = /GoogleService-Info\.plist|I-COR0000|CLIENT_ID|FirebaseApp|Firebase(Core|Auth)|GIDSignIn|GIDClientID|AuthorizationError/i;
const FB_ERR = /not found|could not|couldn.t|missing|not (yet )?been configured|not initialized|invalid|no client|exception|crash/i;
for (const f of ['syslog.txt', 'app-stdout.txt', 'app-stderr.txt']) {
  let t = ''; try { t = fs.readFileSync(path.join(dir, f), 'utf8'); } catch (e) { continue; }
  const hits = t.split('\n').filter(l => FB.test(l));
  for (const l of hits.slice(0, 15)) console.log(`[${f}] ${l.slice(0, 300)}`);
  // AuthorizationError 1000/1001: máy giả lập không có Apple Account (bảng "Sign in to your Apple Account" → Đóng) / hủy – đúng kịch bản
  // I-COR000003: FirebaseCore ghi khi FirebaseApp.app() được hỏi lúc chưa configure (plugin tự configure ngay sau) → chỉ cảnh báo
  hits.filter(l => /I-COR000003/.test(l)).forEach(l => console.log('::warning::' + l.slice(0, 200)));
  const errs = hits.filter(l => FB_ERR.test(l) && !/AuthorizationError.*100[01]|AuthorizationError error 100[01]|canceled|cancelled|I-COR000003/i.test(l));
  if (errs.length) bad.push(`${f}: ${errs.length} dòng lỗi Firebase/Google`);
}
console.log(bad.length ? '✗ FAIL: ' + bad.join(' · ') : '✓ PASS đăng nhập gốc iOS');
process.exit(bad.length ? 1 : 0);
