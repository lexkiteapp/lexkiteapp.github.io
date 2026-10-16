// Kiểm tra add-on trước khi gửi Chrome Web Store (quy tắc: docs/CWS-RULES.md). Chạy trong npm test và workflow cws-publish.
// Dùng: node scripts/cws-check.mjs [--zip store/lexkite-extension.zip] [--store-version 2.6.300]
import fs from 'fs';
import { execFileSync } from 'child_process';

const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const EXT = 'extension', errs = [], warn = [];
const m = JSON.parse(fs.readFileSync(`${EXT}/manifest.json`, 'utf8'));
const lock = JSON.parse(fs.readFileSync('store/chrome/permissions.lock.json', 'utf8'));
const same = (a, b) => JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort());

// 1. Phiên bản: 1–4 số nguyên 0..65535, lớn hơn bản đang có trên cửa hàng
const ver = String(m.version || '');
if (!/^\d+(\.\d+){0,3}$/.test(ver) || ver.split('.').some(n => +n > 65535 || (n.length > 1 && n[0] === '0'))) errs.push(`version "${ver}" sai định dạng`);
const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 4; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
const sv = arg('--store-version');
if (sv && cmp(ver, sv) <= 0) errs.push(`version ${ver} phải lớn hơn bản trên cửa hàng ${sv}`);

// 2. Quyền khớp bản đã khai báo
if (m.manifest_version !== 3) errs.push('manifest_version phải là 3');
if (!same(m.permissions, lock.permissions)) errs.push(`permissions đổi: ${JSON.stringify(m.permissions)} ≠ lock ${JSON.stringify(lock.permissions)}`);
if (!same(m.optional_permissions, lock.optional_permissions)) errs.push('optional_permissions đổi');
if (!same(m.host_permissions, lock.host_permissions)) errs.push(`host_permissions đổi: ${JSON.stringify(m.host_permissions)}`);
const csm = [...new Set((m.content_scripts || []).flatMap(c => c.matches || []))];
if (!same(csm, lock.content_script_matches)) errs.push(`content_scripts.matches đổi: ${JSON.stringify(csm)}`);
if (!same(Object.keys(m.chrome_url_overrides || {}), lock.chrome_url_overrides)) errs.push('chrome_url_overrides đổi');
if (m.content_security_policy) errs.push('có content_security_policy riêng – CWS soi kỹ, không nới CSP (unsafe-eval / nguồn ngoài)');

// 3. Icon & _locales
for (const s of [16, 32, 48, 128]) { const p = `${EXT}/${(m.icons || {})[s] || ''}`; if (!(m.icons || {})[s] || !fs.existsSync(p)) errs.push(`thiếu icon ${s}px`); }
const locs = fs.readdirSync(`${EXT}/_locales`), base = JSON.parse(fs.readFileSync(`${EXT}/_locales/${m.default_locale}/messages.json`, 'utf8'));
for (const l of locs) {
  const msg = JSON.parse(fs.readFileSync(`${EXT}/_locales/${l}/messages.json`, 'utf8'));
  for (const k of Object.keys(base)) if (!msg[k] || !msg[k].message) errs.push(`_locales/${l} thiếu ${k}`);
  if (msg.appName && msg.appName.message.length > 75) errs.push(`_locales/${l} appName > 75 ký tự`);
  if (msg.appDesc && msg.appDesc.message.length > 132) errs.push(`_locales/${l} appDesc > 132 ký tự`);
}

// 4. Không mã tải từ xa, không eval trong mã của add-on
const files = [];
const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p); else files.push(p); });
walk(EXT);
const remote = /(import\(|importScripts\(|\.src\s*=)\s*['"`]https?:\/\/|<script[^>]+src=["']https?:\/\//;
for (const f of files.filter(f => /\.(js|html)$/.test(f))) {
  const s = fs.readFileSync(f, 'utf8');
  if (remote.test(s)) errs.push(`${f}: tải mã từ xa (CWS cấm)`);
  if (!f.includes('/app/') && /\beval\(|new Function\(/.test(s)) errs.push(`${f}: eval/new Function`);
}
const junk = files.filter(f => /\.(map|md|zip|pem|key|env)$|\/\.|\.local\./.test(f));
if (junk.length) errs.push('file thừa trong extension/: ' + junk.slice(0, 5).join(', '));

// 5. Gói zip (nếu có)
const zip = arg('--zip');
if (zip) {
  const size = fs.statSync(zip).size;
  if (size > 100 * 1024 * 1024) errs.push(`zip ${(size / 1048576).toFixed(1)} MB quá lớn`);
  else if (size > 20 * 1024 * 1024) warn.push(`zip ${(size / 1048576).toFixed(1)} MB – nên gọn lại`);
  const list = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).split('\n').filter(Boolean);
  if (!list.includes('manifest.json')) errs.push('zip: manifest.json phải nằm ở gốc');
  const bad = list.filter(f => /\.(map|md|pem|key|env|zip)$|(^|\/)\.|\.local\./.test(f));
  if (bad.length) errs.push('zip có file thừa: ' + bad.slice(0, 5).join(', '));
  const zm = JSON.parse(execFileSync('unzip', ['-p', zip, 'manifest.json'], { encoding: 'utf8' }));
  if (zm.version !== ver) errs.push(`zip version ${zm.version} ≠ manifest ${ver} – build lại`);
}

warn.forEach(w => console.log('⚠ ' + w));
if (errs.length) { errs.forEach(e => console.error('✗ ' + e)); console.error(`✗ cws-check: ${errs.length} lỗi (xem docs/CWS-RULES.md)`); process.exit(1); }
console.log(`✓ cws-check: add-on ${ver} đạt quy tắc Chrome Web Store`);
