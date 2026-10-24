// AdMob cho app gốc (docs/ADS.md §5) – TẮT mặc định: app phát hành KHÔNG chứa SDK quảng cáo cho tới khi chủ bật.
// Bật (bản thử, mã quảng cáo THỬ của Google):   ADS_NATIVE=1 bash scripts/build-mobile.sh   (hoặc node scripts/mobile-ads.mjs --enable)
// Gỡ (về như cũ):                              node scripts/mobile-ads.mjs --disable
// Việc làm khi bật: thêm @capacitor-community/admob vào mobile/package.json; Android: meta-data APPLICATION_ID; iOS: GADApplicationIdentifier,
// SKAdNetworkItems (Google), NSUserTrackingUsageDescription (ATT). App ID lấy từ web/js/ads/config.js (hiện = app ID THỬ của Google).
// Trước khi phát hành bản có SDK: Play Console › App content › Ads = Yes + Data safety (Device ID, Advertising), App Store › App Privacy (Device ID,
// Advertising Data – Tracking nếu cá nhân hóa) + PrivacyInfo.xcprivacy – xem docs/STORE-READINESS.md mục "Khi bật AdMob".
import fs from 'node:fs'; import vm from 'node:vm';
const PLUGIN = '@capacitor-community/admob', VERSION = '^8.0.0'; // khớp Capacitor 8 (mobile/package.json) – kiểm lại bản mới nhất khi bật
const MAN = 'mobile/android/app/src/main/AndroidManifest.xml', PLIST = 'mobile/ios/App/App/Info.plist', PKG = 'mobile/package.json';
const ATT = 'Lexkite uses this to show ads that are more relevant to you. Your learning data is never used for ads.';
const SKAN = ['cstr6suwn9.skadnetwork']; // Google (developers.google.com/admob/ios/3p-skadnetworks – thêm danh sách đối tác khi bật mạng hòa giải)

function ids() {
  const c = { self: {} }; c.self = c; vm.createContext(c);
  vm.runInContext(fs.readFileSync('web/js/ads/config.js', 'utf8'), c);
  const n = (c.ADS_CONFIG || {}).native || {};
  return { android: (n.android || {}).appId, ios: (n.ios || {}).appId };
}
const MARK_A = '<!-- lexkite-admob -->', MARK_I = '<!-- lexkite-admob -->';
export function patchManifest(xml, appId, on) {
  const re = /\s*<!-- lexkite-admob -->[\s\S]*?<!-- \/lexkite-admob -->/;
  xml = xml.replace(re, '');
  if (!on) return xml;
  return xml.replace(/(<application\b[^>]*>)/, `$1\n        ${MARK_A}<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${appId}"/><!-- /lexkite-admob -->`);
}
export function patchPlist(xml, appId, on) {
  const re = /\s*<!-- lexkite-admob -->[\s\S]*?<!-- \/lexkite-admob -->/;
  xml = xml.replace(re, '');
  if (!on) return xml;
  const blk = `\n\t${MARK_I}\n\t<key>GADApplicationIdentifier</key>\n\t<string>${appId}</string>\n\t<key>NSUserTrackingUsageDescription</key>\n\t<string>${ATT}</string>\n\t<key>SKAdNetworkItems</key>\n\t<array>${SKAN.map(s => `\n\t\t<dict><key>SKAdNetworkIdentifier</key><string>${s}</string></dict>`).join('')}\n\t</array>\n\t<!-- /lexkite-admob -->`;
  return xml.replace(/(<plist[^>]*>\s*<dict>)/, `$1${blk}`);
}
if (process.argv[1] && process.argv[1].endsWith('mobile-ads.mjs')) {
  const on = process.argv.includes('--enable') || (process.env.ADS_NATIVE === '1' && !process.argv.includes('--disable'));
  if (!on && !process.argv.includes('--disable')) { console.log('· AdMob tắt (ADS_NATIVE≠1) – app không chứa SDK quảng cáo'); process.exit(0); }
  const id = ids();
  if (on && (!/^ca-app-pub-\d{16}~\d+$/.test(id.android || '') || !/^ca-app-pub-\d{16}~\d+$/.test(id.ios || ''))) { console.error('✗ web/js/ads/config.js: thiếu appId AdMob hợp lệ'); process.exit(1); }
  const pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
  if (on) pkg.dependencies[PLUGIN] = VERSION; else delete pkg.dependencies[PLUGIN];
  fs.writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n');
  if (fs.existsSync(MAN)) fs.writeFileSync(MAN, patchManifest(fs.readFileSync(MAN, 'utf8'), id.android, on));
  if (fs.existsSync(PLIST)) fs.writeFileSync(PLIST, patchPlist(fs.readFileSync(PLIST, 'utf8'), id.ios, on));
  console.log(on ? `✓ AdMob BẬT (mã ${/3940256099942544/.test(id.android) ? 'THỬ' : 'THẬT'}) – chạy npm i trong mobile/ rồi cap sync` : '✓ AdMob đã gỡ khỏi app gốc');
}
