#!/usr/bin/env node
// Firebase Crashlytics cho app Capacitor (docs/STORE-READINESS.md › Crashlytics) – khoá cả chuỗi:
//  plugin @capacitor-firebase/crashlytics cùng bản với các plugin Firebase khác + lockfile · SPM symlink (tránh trùng định danh gói)
//  Android: classpath + apply plugin Gradle (build ID – thiếu thì SDK dừng app) · iOS: archive có dSYM + bước upload-symbols
//  PrivacyInfo khai Crash Data · JS: lỗi web → non-fatal ĐÃ LỌC dữ liệu cá nhân, uid chỉ ở dạng băm.
import fs from 'node:fs';
import vm from 'node:vm';

let fails = 0;
const ok = (c, m) => { if (c) return; fails++; console.error('✗ ' + m); };
const rd = p => fs.readFileSync(p, 'utf8');

// 1. Gói
const pkg = JSON.parse(rd('mobile/package.json')), dep = pkg.dependencies || {};
const v = dep['@capacitor-firebase/crashlytics'];
ok(!!v, 'mobile/package.json thiếu @capacitor-firebase/crashlytics');
for (const k of Object.keys(dep).filter(k => k.startsWith('@capacitor-firebase/'))) ok(dep[k] === v, `@capacitor-firebase/* phải cùng một bản (${k} ${dep[k]} ≠ crashlytics ${v}) – lệch bản kéo 2 firebase-ios-sdk/BoM`);
ok(/^\d+\.\d+\.\d+$/.test(v || ''), 'crashlytics ghim đúng bản (không ^/~) như các plugin Firebase khác');
const major = +String(dep['@capacitor/core'] || '').split('.')[0];
ok(+String(v || '').split('.')[0] === major, `crashlytics major ${v} phải khớp Capacitor ${dep['@capacitor/core']}`);
const lock = JSON.parse(rd('mobile/package-lock.json'));
ok(lock.packages && lock.packages['node_modules/@capacitor-firebase/crashlytics'] && lock.packages['node_modules/@capacitor-firebase/crashlytics'].version === v, 'mobile/package-lock.json chưa có @capacitor-firebase/crashlytics đúng bản (npm ci sẽ lỗi)');
const cap = JSON.parse(rd('mobile/capacitor.config.json'));
ok(!!(cap.experimental && cap.experimental.ios && cap.experimental.ios.spm && (cap.experimental.ios.spm.packageOptions || {})['@capacitor-firebase/crashlytics'] || {}).symlink, 'capacitor.config.json: spm.packageOptions["@capacitor-firebase/crashlytics"].symlink = true (trùng định danh gói SPM)');

// 2. Android
const root = rd('mobile/android/build.gradle'), app = rd('mobile/android/app/build.gradle');
ok(/classpath 'com\.google\.firebase:firebase-crashlytics-gradle:3\.\d+\.\d+'/.test(root), 'android/build.gradle thiếu classpath firebase-crashlytics-gradle 3.x');
ok(/apply plugin: 'com\.google\.gms\.google-services'\s*\n(?:\s*\/\/.*\n)*\s*apply plugin: 'com\.google\.firebase\.crashlytics'/.test(app), 'app/build.gradle: apply plugin com.google.firebase.crashlytics ngay sau google-services (cùng điều kiện có google-services.json)');
ok(fs.existsSync('mobile/android/app/google-services.json'), 'thiếu mobile/android/app/google-services.json → plugin Crashlytics không được áp');
if (/minifyEnabled true/.test(app)) ok(!/mappingFileUploadEnabled false/.test(app), 'đã bật minify → không được tắt tải mapping Crashlytics');

// 3. iOS
const tf = rd('.github/workflows/ios-testflight.yml');
ok(/DEBUG_INFORMATION_FORMAT=dwarf-with-dsym/.test(tf), 'ios-testflight: archive phải có DEBUG_INFORMATION_FORMAT=dwarf-with-dsym');
ok(/firebase-ios-sdk\/Crashlytics\/upload-symbols/.test(tf) && /-gsp mobile\/ios\/App\/App\/GoogleService-Info\.plist -p ios/.test(tf), 'ios-testflight: thiếu bước upload-symbols dSYM lên Crashlytics');
ok(fs.existsSync('mobile/ios/App/App/GoogleService-Info.plist'), 'thiếu GoogleService-Info.plist → Crashlytics iOS không cấu hình được');
const priv = rd('mobile/ios/App/App/PrivacyInfo.xcprivacy');
const crash = /<string>NSPrivacyCollectedDataTypeCrashData<\/string>[\s\S]*?<\/dict>/.exec(priv);
ok(!!crash && /<key>NSPrivacyCollectedDataTypeLinked<\/key>\s*<true\/>/.test(crash[0]) && /<key>NSPrivacyCollectedDataTypeTracking<\/key>\s*<false\/>/.test(crash[0]), 'PrivacyInfo: Crash Data phải khai linked (mã người dùng băm) + không tracking');

// 4. JS: bộ lọc (web/js/crash.js chạy ngoài app – chỉ xuất LKCrash)
const sb = {}; sb.self = sb;
vm.runInNewContext(rd('web/js/crash.js'), sb, { filename: 'crash.js' });
const L = sb.LKCrash;
ok(!!(L && L.clean && L.frames && L.route), 'crash.js phải xuất LKCrash.clean/frames/route');
const shell = rd('web/sw.js') + rd('web/app/index.html');
ok(!/crash\.js/.test(shell), 'crash.js KHÔNG nằm trong khung app (SHELL/index.html) – native.js nạp sau load');
ok(/s\.src = 'js\/crash\.js'/.test(rd('web/js/native.js')), "native.js phải nạp js/crash.js khi có plugin FirebaseCrashlytics");
if (L) {
  const c = L.clean;
  const leak = (inp, bad, m) => { const o = c(inp); ok(!bad.some(b => o.includes(b)), `${m}: "${o}" còn lộ ${bad.find(b => o.includes(b))}`); return o; };
  leak('Failed to fetch https://api.dictionaryapi.dev/api/v2/entries/en/divorce?key=abc#x', ['divorce', 'key=abc', '/entries'], 'URL bỏ đường dẫn/query');
  ok(c('at https://localhost/js/app.js?v=3').includes('localhost/app.js'), 'URL file .js giữ host + tên file: ' + c('at https://localhost/js/app.js?v=3'));
  leak('user nguyen.van.a+lk@gmail.com not found', ['nguyen.van.a', 'gmail.com'], 'email');
  leak('bad token eyJhbGciOiJSUzI1NiJ9.eyJ1aWQiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJlMTIz', ['eyJhbGci', 'c2lnbmF0'], 'JWT');
  leak('uid Xq9vB2kLmN3pQr7sT1uVw5yZa8 missing', ['Xq9vB2kLmN3pQr7sT1uVw5yZa8'], 'mã dài (uid Firebase)');
  leak('phone 0912345678 card 4111111111111111', ['0912345678', '4111111111111111'], 'số dài');
  leak('Unexpected token in JSON: "my essay about my family and my private life"', ['my family', 'private life'], 'chuỗi trích dẫn dài (nội dung người dùng)');
  ok(c("Cannot read properties of undefined (reading 'foo')") === "Cannot read properties of undefined (reading 'foo')", 'thông điệp lỗi thường giữ nguyên');
  ok(c('x'.repeat(5000)).length <= 300 && c(null) === '' && c(undefined) === '', 'giới hạn 300 ký tự, null/undefined → rỗng');
  const fr = L.frames('TypeError: x\n    at render (https://localhost/js/dict-page.js?v=2:120:7)\n    at async go (capacitor://localhost/js/app.js:55:1)\n    at https://localhost/js/x.js:9:3\nfoo@capacitor://localhost/js/sync.js:77:12\n    at <anonymous>');
  ok(fr.length === 4, 'frames: đọc stack V8 + JSC (' + JSON.stringify(fr) + ')');
  ok(fr[0] && fr[0].functionName === 'render' && fr[0].fileName === 'localhost/dict-page.js' && fr[0].lineNumber === 120, 'frames[0] ' + JSON.stringify(fr[0]));
  ok(fr[1] && fr[1].functionName === 'go' && fr[3] && fr[3].functionName === 'foo' && fr[3].lineNumber === 77, 'frames async/JSC ' + JSON.stringify(fr.slice(1)));
  ok(fr.every(f => !/[?#]/.test(f.fileName)), 'frames bỏ query/hash');
  ok(L.frames('').length === 0 && L.frames(Array(40).fill('    at f (https://h/a.js:1:1)').join('\n')).length === 15, 'frames: rỗng → [], tối đa 15');
  ok(L.route('#/dict/divorce?x=1') === 'dict' && L.route('') === 'home' && L.route('#/review?w=secret') === 'review', 'route chỉ đoạn đầu hash (không lộ từ tra)');
}

// 5. JS: nối dây trong app gốc (giả Capacitor + plugin ghi lại lời gọi)
const calls = [], ls = {};
const evs = {};
const stub = () => new Proxy(function () {}, { get: (t, k) => (k === 'then' ? undefined : k === Symbol.toPrimitive ? () => '' : stub()), apply: () => stub() });
const plug = new Proxy({}, { get: (t, k) => (...a) => { calls.push([k, ...a]); return Promise.resolve({}); } });
const win = {
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios', Plugins: { FirebaseCrashlytics: plug } },
  document: { documentElement: { classList: { add() {} } }, addEventListener() {}, hidden: false },
  navigator: {}, location: { hash: '#/dict/divorce' }, localStorage: { getItem: k => ls[k] ?? null, setItem: (k, x) => { ls[k] = String(x); } },
  setTimeout: () => 0, clearTimeout() {}, console, Promise, Date, JSON, Math, Set, Map, Object, String, Array, Uint8Array, TextEncoder, Boolean, Number, RegExp, Error, setImmediate,
  crypto: globalThis.crypto, Sync: { user: { uid: 'Xq9vB2kLmN3pQr7sT1uVw5yZa8' } },
  addEventListener: (t, f) => { (evs[t] = evs[t] || []).push(f); },
};
win.self = win; win.window = win; win.open = () => null;
let wired = true;
const ctx = vm.createContext(new Proxy(win, { has: () => true, get: (t, k) => (k in t ? t[k] : k === Symbol.unscopables ? undefined : stub()) }));
try { vm.runInContext(rd('web/js/native.js'), ctx, { filename: 'native.js' }); } catch (e) { wired = false; ok(false, 'native.js lỗi khi chạy giả lập app gốc: ' + e.message); }
// lỗi xảy ra TRƯỚC khi crash.js nạp → vào hàng đợi, crash.js gửi bù
const early = evs.error || [];
ok(early.length === 1 && (evs.unhandledrejection || []).length === 1, 'native.js: nghe error + unhandledrejection ngay từ đầu');
for (const f of early) f({ message: 'early boom', error: { stack: '    at boot (capacitor://localhost/js/app.js:9:1)' } });
ok(calls.length === 0 && (win.__lkCrashQ || []).length === 1, 'trước khi crash.js nạp: lỗi vào hàng đợi, chưa gọi plugin');
if (wired) try { vm.runInContext(rd('web/js/crash.js'), ctx, { filename: 'crash.js' }); } catch (e) { wired = false; ok(false, 'crash.js lỗi trong app gốc giả lập: ' + e.message); }
if (wired) {
  await new Promise(r => setTimeout(r, 50));
  const e0 = calls.filter(c => c[0] === 'recordException');
  ok(e0.length === 1 && e0[0][1].message === '[js] early boom' && e0[0][1].stacktrace[0].functionName === 'boot', 'hàng đợi lỗi sớm được gửi bù: ' + JSON.stringify(e0));
  const u0 = calls.filter(c => c[0] === 'setUserId');
  ok(u0.length === 1 && /^[0-9a-f]{16}$/.test(u0[0][1].userId), 'setUserId: chỉ mã băm 16 hex: ' + JSON.stringify(u0));
  calls.length = 0;
  const fire = async (t, e) => { for (const f of evs[t] || []) f(e); await new Promise(r => setImmediate(r)); await new Promise(r => setTimeout(r, 30)); };
  await fire('error', { message: 'Boom at https://api.x.com/u/nguyen?token=1 for a@b.co', error: { stack: 'Error\n    at f (capacitor://localhost/js/app.js:1:2)' } });
  await fire('error', { message: 'Boom at https://api.x.com/u/nguyen?token=1 for a@b.co', error: { stack: '' } }); // trùng → không gửi lại
  await fire('unhandledrejection', { reason: { message: 'nope', stack: 'x@capacitor://localhost/js/sync.js:3:1' } });
  await fire('error', { message: 'ResizeObserver loop limit exceeded' });
  const rec = calls.filter(c => c[0] === 'recordException'), uid = calls.filter(c => c[0] === 'setUserId');
  ok(rec.length === 2, 'recordException: 1 lần/lỗi khác nhau, bỏ ResizeObserver (' + rec.length + ')');
  const all = JSON.stringify(calls);
  ok(!/nguyen|token=|a@b\.co|Xq9vB2kLmN3pQr7sT1uVw5yZa8|divorce/.test(all), 'không dữ liệu cá nhân trong lời gọi plugin: ' + all.slice(0, 300));
  ok(rec[0] && rec[0][1].message.startsWith('[js] ') && rec[0][1].stacktrace[0].fileName === 'localhost/app.js' && rec[0][1].keysAndValues[0].value === 'dict', 'recordException: [js] + stack đã lọc + route: ' + JSON.stringify(rec[0] && rec[0][1]));
  ok(rec[1] && rec[1][1].message === '[promise] nope', 'unhandledrejection → [promise]');
  ok(uid.length === 0, 'setUserId chỉ 1 lần cả phiên: ' + JSON.stringify(uid));
  for (let i = 0; i < 30; i++) await fire('error', { message: 'distinct error ' + 'abcdefghijklmnopqrstuvwxyz'[i % 26] + i });
  ok(calls.filter(c => c[0] === 'recordException').length === 19, 'tối đa 20 lỗi khác nhau mỗi phiên (1 lỗi sớm + 19)');
}

if (fails) { console.error(`crashlytics: ${fails} lỗi`); process.exit(1); }
console.log(`✓ crashlytics: plugin ${v} (Android Gradle + iOS dSYM + SPM), PrivacyInfo, bộ lọc lỗi JS không dữ liệu cá nhân, uid băm`);
