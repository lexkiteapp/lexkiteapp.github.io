// FCM HTTP v1 dry-run (validate_only: true) – kiểm khóa service account + MỌI tin FCM thật (15 ngôn ngữ × back/miss/fixed) mà KHÔNG gửi cho ai.
// Gửi tới topic tổng hợp (không thiết bị nào đăng ký) bằng chính fcmMessage() của Worker workers/push → payload ở CI = payload ở máy chủ.
// Bí mật: FCM_SA = JSON service account dự án lexkite-app, vai trò "Firebase Cloud Messaging API Admin" (roles/firebasemessaging.admin).
// Thiếu FCM_SA → ::notice:: + thoát 0 (chưa cấu hình, không đỏ). Không bao giờ in khóa/token. Dùng: FCM_SA="$(cat sa.json)" node scripts/ci/fcm-dryrun.mjs
import fs from 'node:fs';

const raw = process.env.FCM_SA || '';
if (!raw.trim()) {
  console.log('::notice title=FCM dry-run bỏ qua::Chưa có secret FCM_SA (JSON service account lexkite-app, vai trò Firebase Cloud Messaging API Admin) – docs/REMINDERS.md §5');
  process.exit(0);
}
let sa; try { sa = JSON.parse(raw); } catch (e) { console.log('::error::FCM_SA không phải JSON hợp lệ (dán nguyên file .json của service account)'); process.exit(1); }
for (const k of ['client_email', 'private_key', 'project_id']) if (!sa[k]) { console.log(`::error::FCM_SA thiếu trường ${k}`); process.exit(1); }
if (sa.project_id !== 'lexkite-app') { console.log(`::error::FCM_SA thuộc dự án ${sa.project_id}, cần lexkite-app`); process.exit(1); }

const src = fs.readFileSync('workers/push/index.js', 'utf8').replace(/^import COPY from '\.\/copy\.json';$/m, 'const COPY = ' + fs.readFileSync('workers/push/copy.json', 'utf8') + ';');
const W = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const COPY = JSON.parse(fs.readFileSync('workers/push/copy.json', 'utf8'));

let auth;
try { auth = await W.fcmToken({ FCM_SA: raw }, Date.now()); } catch (e) {
  console.log('::error::Không lấy được token OAuth từ FCM_SA (khóa bị thu hồi/sai?) – ' + String(e && e.message || e).slice(0, 80)); process.exit(1);
}
const url = `https://fcm.googleapis.com/v1/projects/${auth.project}/messages:send`;
let okN = 0; const bad = [];
for (const lang of Object.keys(COPY)) for (const kind of ['back', 'miss', 'fixed']) {
  const body = { validate_only: true, ...W.fcmMessage({ topic: 'lk-ci-dryrun', lang, kind, rid: 'LX-1042' }) };
  const r = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + auth.tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const t = await r.text();
  if (r.ok && /fake_message_id|messages\//.test(t)) okN++;
  else bad.push(`${lang}.${kind} → ${r.status} ${t.replace(/\s+/g, ' ').slice(0, 160)}`);
}
if (bad.length) {
  console.log(`::error::FCM dry-run: ${bad.length} tin bị từ chối` + (bad.some(x => / 403 /.test(x)) ? ' (403: service account thiếu vai trò Firebase Cloud Messaging API Admin hoặc chưa bật Firebase Cloud Messaging API)' : ''));
  for (const b of bad.slice(0, 10)) console.log('  ' + b);
  process.exit(1);
}
console.log(`✓ fcm-dryrun: ${okN} tin hợp lệ (validate_only, không gửi) – dự án ${auth.project}`);
