#!/usr/bin/env node
/* Đăng nhập gốc trong app (Firebase Auth qua @capacitor-firebase/authentication) – chạy trong scripts/build-mobile.sh, trước `cap sync`.
 * Chỉ bật cho nền tảng đã có file cấu hình Firebase của dự án lexkite-app (tải từ Firebase Console, không phải bí mật):
 *   iOS     mobile/ios/App/App/GoogleService-Info.plist  (build phase "Firebase config" chép vào app nếu có)
 *   Android mobile/android/app/google-services.json      (app/build.gradle chỉ bật plugin google-services nếu có)
 * Việc làm:
 *   1. Ghi cờ self.LK_NATIVE_AUTH = { ios, android } vào cuối mobile/www/js/firebase-config.js → sync.js chỉ gọi plugin khi đã cấu hình
 *      (iOS: gọi Auth khi chưa FirebaseApp.configure() sẽ làm app văng → tuyệt đối không bật khi thiếu file).
 *   2. iOS: thêm URL scheme REVERSED_CLIENT_ID (Google Sign-In bắt buộc, thiếu là văng khi bấm "Tiếp tục với Google") vào Info.plist.
 * --check: chỉ in trạng thái, không ghi gì. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const M = p => path.join(ROOT, 'mobile', p);
const IOS_CFG = M('ios/App/App/GoogleService-Info.plist');
const AND_CFG = M('android/app/google-services.json');
const INFO = M('ios/App/App/Info.plist');
const WWW_CFG = M('www/js/firebase-config.js');
const PROJECT = 'lexkite-app';
const check = process.argv.includes('--check');

const plistStr = (xml, key) => { const m = new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`).exec(xml); return m ? m[1].trim() : ''; };
const fail = msg => { console.error('✗ ' + msg); process.exit(1); };

let ios = false, android = false, rid = '';
if (fs.existsSync(IOS_CFG)) {
  const x = fs.readFileSync(IOS_CFG, 'utf8');
  if (plistStr(x, 'PROJECT_ID') !== PROJECT) fail(`GoogleService-Info.plist không thuộc dự án ${PROJECT}`);
  if (plistStr(x, 'BUNDLE_ID') !== 'com.lexkite.app') fail('GoogleService-Info.plist phải có BUNDLE_ID com.lexkite.app');
  rid = plistStr(x, 'REVERSED_CLIENT_ID');
  if (!/^com\.googleusercontent\.apps\.[\w-]+$/.test(rid)) fail('GoogleService-Info.plist thiếu REVERSED_CLIENT_ID – bật Google trong Firebase Auth rồi tải lại file');
  ios = true;
}
if (fs.existsSync(AND_CFG)) {
  let j; try { j = JSON.parse(fs.readFileSync(AND_CFG, 'utf8')); } catch (e) { fail('google-services.json không phải JSON hợp lệ'); }
  if ((j.project_info || {}).project_id !== PROJECT) fail(`google-services.json không thuộc dự án ${PROJECT}`);
  const c = (j.client || []).find(x => ((x.client_info || {}).android_client_info || {}).package_name === 'com.lexkite.app');
  if (!c) fail('google-services.json chưa có app Android com.lexkite.app');
  // Google Sign-In trên Android cần OAuth client loại web (client_type 3) → sinh default_web_client_id
  if (!(c.oauth_client || []).some(o => o.client_type === 3)) fail('google-services.json thiếu OAuth web client – bật Google trong Firebase Auth rồi tải lại file');
  android = true;
}
console.log(`Đăng nhập gốc trong app: iOS ${ios ? 'BẬT' : 'tắt (thiếu GoogleService-Info.plist)'} · Android ${android ? 'BẬT' : 'tắt (thiếu google-services.json)'}`);
if (check) process.exit(0);

if (fs.existsSync(WWW_CFG)) fs.appendFileSync(WWW_CFG, `\nself.LK_NATIVE_AUTH={ios:${ios},android:${android}};\n`);
else fail('chưa có mobile/www/js/firebase-config.js – chạy sau bước rsync của build-mobile.sh');

if (rid) {
  let info = fs.readFileSync(INFO, 'utf8');
  if (!info.includes(`<string>${rid}</string>`)) {
    const entry = `\t\t<dict>\n\t\t\t<key>CFBundleURLName</key>\n\t\t\t<string>google</string>\n\t\t\t<key>CFBundleURLSchemes</key>\n\t\t\t<array>\n\t\t\t\t<string>${rid}</string>\n\t\t\t</array>\n\t\t</dict>\n`;
    const re = /(<key>CFBundleURLTypes<\/key>\s*<array>\s*)/;
    if (!re.test(info)) fail('Info.plist không có CFBundleURLTypes');
    info = info.replace(re, `$1${entry.trimStart()}\t\t`);
    fs.writeFileSync(INFO, info);
    console.log('✓ Info.plist: thêm URL scheme Google Sign-In (REVERSED_CLIENT_ID)');
  }
}
