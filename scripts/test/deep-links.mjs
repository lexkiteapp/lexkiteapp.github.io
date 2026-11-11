#!/usr/bin/env node
// Universal Links (iOS) + App Links (Android) cho https://lexkite.com/app/… – khoá cả 4 đầu mối + router chung:
//  1. web/.well-known/apple-app-site-association (appID B285J68262.com.lexkite.app, /app + /app/*)
//  2. web/.well-known/assetlinks.json (com.lexkite.app + SHA-256 khoá ký)  3. _headers: application/json, không _redirects nào chạm /.well-known
//  4. App.entitlements applinks:lexkite.com + AndroidManifest intent-filter autoVerify https lexkite.com /app
//  5. web/js/native.js › deepRoute: lexkite:// và https://lexkite.com/app/#/… ra cùng hash router
// --live: kiểm thêm bản đang chạy trên lexkite.com (200, application/json, không chuyển hướng) – chạy tay sau deploy.
import fs from 'node:fs';
import vm from 'node:vm';

let fails = 0;
const ok = (c, m) => { if (c) return; fails++; console.error('✗ ' + m); };
const rd = p => fs.readFileSync(p, 'utf8');
const TEAM_APP = 'B285J68262.com.lexkite.app', PKG = 'com.lexkite.app';
// Vân tay công khai (không phải bí mật): App signing key = Play Console → Setup → App integrity → App signing (máy cài từ Play);
// upload key = log CI android.yml bước "keytool" (bản cài thử/sideload ký bằng upload key).
const PLAY_SIGNING_SHA256 = '6F:40:6A:7E:A2:0E:BA:D4:F8:18:FB:34:BC:72:AA:39:0B:26:3B:23:93:D4:04:30:53:A4:89:77:97:4A:66:F1';
const UPLOAD_KEY_SHA256 = '2A:F6:31:76:89:8E:63:BC:78:99:C9:50:4E:D8:C8:A3:1E:24:C3:57:14:F3:FD:D9:FA:BF:4F:C0:5A:A1:DD:41';

// 1. AASA
const aasaRaw = rd('web/.well-known/apple-app-site-association');
ok(Buffer.byteLength(aasaRaw) < 128 * 1024, 'AASA phải < 128 KB (giới hạn Apple)');
let aasa = {}; try { aasa = JSON.parse(aasaRaw); } catch (e) { ok(false, 'AASA không phải JSON hợp lệ: ' + e.message); }
const det = (aasa.applinks && aasa.applinks.details) || [];
ok(Array.isArray(det) && det.length >= 1, 'AASA thiếu applinks.details');
const mine = det.find(d => (d.appIDs || []).includes(TEAM_APP));
ok(!!mine, 'AASA thiếu appIDs ' + TEAM_APP);
const comps = (mine && mine.components) || [];
ok(comps.some(c => c['/'] === '/app') && comps.some(c => c['/'] === '/app/*'), 'AASA components phải có "/app" và "/app/*"');
ok(!comps.some(c => c.exclude && (c['/'] === '/app/*' || c['/'] === '/app')), 'AASA không được exclude chính /app');
ok(!comps.some(c => c['/'] === '*' || c['/'] === '/*'), 'AASA không được nhận cả site (trang giới thiệu/blog phải mở trình duyệt)');
ok(!fs.existsSync('web/.well-known/apple-app-site-association.json'), 'AASA phải KHÔNG có đuôi .json (Apple chỉ đọc đúng tên)');

// 2. assetlinks
let al = []; try { al = JSON.parse(rd('web/.well-known/assetlinks.json')); } catch (e) { ok(false, 'assetlinks.json không phải JSON hợp lệ: ' + e.message); }
ok(Array.isArray(al), 'assetlinks.json phải là mảng');
const st = (Array.isArray(al) ? al : []).find(s => s.target && s.target.namespace === 'android_app' && s.target.package_name === PKG);
ok(!!st, 'assetlinks.json thiếu android_app ' + PKG);
ok(!!st && (st.relation || []).includes('delegate_permission/common.handle_all_urls'), 'assetlinks.json thiếu relation handle_all_urls');
const fps = (st && st.target.sha256_cert_fingerprints) || [];
ok(fps.length >= 1 && fps.every(f => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f)), 'sha256_cert_fingerprints phải là SHA-256 dạng AA:BB:… (32 byte, chữ HOA)');
ok(new Set(fps).size === fps.length, 'sha256_cert_fingerprints trùng');
ok(fps.includes(UPLOAD_KEY_SHA256), 'assetlinks.json phải giữ SHA-256 upload key (bản cài từ CI/Internal sharing)');
ok(fps.includes(PLAY_SIGNING_SHA256), 'assetlinks.json phải có SHA-256 App signing key của Play (thiếu → App Links không xác minh trên máy cài từ Play)');

// 3. Phục vụ: _headers + _redirects + build-web
const headers = rd('web/_headers');
for (const p of ['/.well-known/apple-app-site-association', '/.well-known/assetlinks.json']) {
  const m = new RegExp('^' + p.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '\\n((?:[ \\t]+.*\\n?)+)', 'm').exec(headers);
  ok(!!m && /^\s+Content-Type:\s*application\/json\s*$/mi.test(m[1]), `_headers: ${p} phải có Content-Type: application/json`);
}
const redirects = rd('web/_redirects').split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
ok(!redirects.some(l => { const src = l.trim().split(/\s+/)[0]; return src.startsWith('/.well-known') || src === '/*' || src === '/.*'; }), '_redirects không được chuyển hướng /.well-known/* (Apple/Google không theo redirect)');
const routes = JSON.parse(rd('web/_routes.json'));
ok(!(routes.include || []).some(r => r === '/*' || r.startsWith('/.well-known')), '_routes.json: Functions không được chặn /.well-known');
const bw = rd('scripts/build-web.sh');
ok(/cp -R web dist/.test(bw) && !/rm -rf dist\/\.well-known/.test(bw), 'build-web.sh phải chép web/.well-known vào dist');

// 4. Native
const ent = rd('mobile/ios/App/App/App.entitlements');
ok(/<key>com\.apple\.developer\.associated-domains<\/key>\s*<array>[\s\S]*?<string>applinks:lexkite\.com<\/string>[\s\S]*?<\/array>/.test(ent), 'App.entitlements thiếu associated-domains applinks:lexkite.com');
const tf = rd('.github/workflows/ios-testflight.yml');
ok(/applinks:lexkite\.com/.test(tf), 'ios-testflight.yml phải kiểm bản archive có applinks:lexkite.com');
const man = rd('mobile/android/app/src/main/AndroidManifest.xml');
const filters = man.match(/<intent-filter[^>]*>[\s\S]*?<\/intent-filter>/g) || [];
const appLink = filters.find(f => /android:autoVerify="true"/.test(f) && /android:scheme="https"/.test(f) && /android:host="lexkite\.com"/.test(f));
ok(!!appLink, 'AndroidManifest thiếu intent-filter autoVerify https://lexkite.com');
if (appLink) {
  ok(/android\.intent\.action\.VIEW/.test(appLink) && /category\.DEFAULT/.test(appLink) && /category\.BROWSABLE/.test(appLink), 'intent-filter App Links phải có VIEW + DEFAULT + BROWSABLE');
  ok(/android:path="\/app"/.test(appLink) && /android:pathPrefix="\/app\/"/.test(appLink), 'intent-filter App Links phải nhận /app và /app/… (không pathPrefix "/app" trần – dính /apple…)');
  ok(!/android:scheme="http"/.test(appLink), 'App Links chỉ https');
}
ok(/android:launchMode="singleTask"/.test(man), 'MainActivity phải singleTask (link mở lại app đang chạy → appUrlOpen, không tạo bản thứ hai)');

// 5. Router chung (native.js chạy trong vm như ngoài web: không Capacitor → chỉ xuất deepRoute)
const sb = { self: undefined };
sb.self = sb;
vm.runInNewContext(rd('web/js/native.js'), sb, { filename: 'native.js' });
const R = sb.VBNative && sb.VBNative.deepRoute;
ok(typeof R === 'function', 'native.js phải xuất VBNative.deepRoute (cả ngoài app – để test)');
if (typeof R === 'function') {
  const cases = [
    ['lexkite://review?w=sustainable', '#/review?w=sustainable'],
    ['lexkite://review', '#/review'],
    ['lexkite://word/caf%C3%A9', '#/dict/caf%C3%A9'],
    ['lexkite://word/hello?x=1', '#/dict/hello'],
    ['https://lexkite.com/app/#/dict/hello', '#/dict/hello'],
    ['https://lexkite.com/app/#/review?w=run', '#/review?w=run'],
    ['https://lexkite.com/app#/skills', '#/skills'],
    ['https://www.lexkite.com/app/?utm_source=x#/library?g=a&lv=b1', '#/library?g=a&lv=b1'],
    ['https://lexkite.com/app/', ''],
    ['https://lexkite.com/app', ''],
    ['https://lexkite.com/app/?ref=mail', ''],
    ['https://lexkite.com/app/#top', ''],
    ['https://lexkite.com/app/#/x"><img src=x onerror=alert(1)>', ''],
    ['https://lexkite.com/apple', null],
    ['https://lexkite.com/en/blog/', null],
    ['https://evil.com/app/#/dict/x', null],
    ['https://lexkite.com.evil.com/app/#/dict/x', null],
    ['http://lexkite.com/app/#/dict/x', null],
    ['', null], [undefined, null],
  ];
  for (const [u, want] of cases) { const got = R(u); ok(got === want, `deepRoute(${JSON.stringify(u)}) = ${JSON.stringify(got)}, cần ${JSON.stringify(want)}`); }
}
const nat = rd('web/js/native.js');
ok(/addListener\('appUrlOpen', e => openDeep\(/.test(nat) && /getLaunchUrl\(\)\.then\(r => openDeep\(/.test(nat), 'native.js: appUrlOpen + getLaunchUrl phải đi qua openDeep (router chung)');
ok(/const openDeep = url => \{ const h = deepRoute\(url\)/.test(nat), 'openDeep phải dùng deepRoute (một router cho lexkite:// và https)');

// --live
if (process.argv.includes('--live')) {
  for (const p of ['/.well-known/apple-app-site-association', '/.well-known/assetlinks.json']) {
    const r = await fetch('https://lexkite.com' + p, { redirect: 'manual' });
    ok(r.status === 200, `LIVE ${p}: HTTP ${r.status} (cần 200, không chuyển hướng)`);
    ok(/^application\/json/i.test(r.headers.get('content-type') || ''), `LIVE ${p}: Content-Type ${r.headers.get('content-type')}`);
    try { JSON.parse(await r.text()); } catch (e) { ok(false, `LIVE ${p}: không phải JSON`); }
  }
}

if (fails) { console.error(`deep-links: ${fails} lỗi`); process.exit(1); }
console.log(`✓ deep-links: AASA + assetlinks (${fps.length} vân tay) + _headers + entitlements + manifest + deepRoute`);
