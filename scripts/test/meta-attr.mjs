// Đo cài/kích hoạt cho quảng cáo Meta (docs/META-ADS.md) – 0 mạng: đọc referrer, cổng đồng ý, công tắc khẩn, dạng gói CAPI, chống trùng,
// máy khách (vm), SKAdNetwork iOS, không lộ cờ ở /api/config. Chạy: node scripts/test/meta-attr.mjs
import fs from 'node:fs'; import vm from 'node:vm';
import { parseReferrer, consentOk, capiBody, handleMa, sendCapi, postCapi, GRAPH, EVENT_NAME } from '../../functions/api/_meta_capi.js';
import { patchSkan, patchPlist, SKAN_META } from '../mobile-ads.mjs';
import { PUBLIC_KEYS } from '../../functions/api/config.js';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.error('✗ ' + m); } };
const rd = f => fs.readFileSync(f, 'utf8');

// ---- 1) referrer ----
const META_REF = 'utm_source=apps.facebook.com&utm_campaign=fb4a&utm_content=%7B%22app%22%3A123%7D';
ok(parseReferrer(META_REF).meta && parseReferrer(META_REF).source === 'apps.facebook.com', 'referrer Meta (apps.facebook.com / fb4a) nhận ra');
ok(parseReferrer('utm_source=instagram&utm_medium=cpc').meta && parseReferrer('utm_campaign=ig4a').meta, 'referrer Instagram nhận ra');
ok(!parseReferrer('utm_source=google-play&utm_medium=organic').meta && !parseReferrer('').meta && !parseReferrer(null).meta && !parseReferrer('%%%').meta, 'tự nhiên/rỗng/hỏng → không phải Meta');
ok(parseReferrer('utm_source=facebook&' + 'x'.repeat(2000)).source === 'facebook' && parseReferrer('?utm_source=facebook').meta, 'chuỗi dài bị cắt, dấu ? đầu được bỏ');

// ---- 2) đồng ý ----
ok(consentOk('y', 'DE') && consentOk('y', ''), "c='y' (bật trong Cài đặt) luôn được");
ok(!consentOk('u', 'VN') && !consentOk('', 'VN') && !consentOk(undefined, 'VN') && !consentOk('n', 'VN'), 'mặc định: chưa chọn/tắt/lạ → KHÔNG gửi');
ok(consentOk('u', 'VN', { META_CONSENT_DEFAULT: 'row' }) && !consentOk('u', 'DE', { META_CONSENT_DEFAULT: 'row' }) && !consentOk('u', 'GB', { META_CONSENT_DEFAULT: 'row' }) && !consentOk('u', '', { META_CONSENT_DEFAULT: 'row' }) && !consentOk('', 'VN', { META_CONSENT_DEFAULT: 'row' }), 'META_CONSENT_DEFAULT=row: chưa chọn chỉ ngoài EEA/UK/CH và biết nước; tắt vẫn không gửi');

// ---- 3) dạng gói CAPI ----
const env = { META_CAPI_TOKEN: 'tok' };
const pi = capiBody('install', { iid: 'a'.repeat(32), ref: META_REF }, env, 1700000000999), pa = capiBody('activate', { iid: 'a'.repeat(32), ref: META_REF }, { ...env, META_TEST_CODE: 'TEST123' }, 1700000000999);
const di = pi.data[0], da = pa.data[0];
ok(di.event_name === 'MobileAppInstall' && di.action_source === 'app' && di.event_time === 1700000000 && di.event_id === 'install:' + 'a'.repeat(32) && di.app_data.install_referrer === META_REF && di.user_data.anon_id === 'XZ' + 'a'.repeat(32) && pi.access_token === 'tok' && !pi.test_event_code, 'gói install đúng trường (không có test code khi không đặt)');
ok(da.event_name === EVENT_NAME && da.event_id === 'activate:' + 'a'.repeat(32) && pa.test_event_code === 'TEST123', 'gói activate = ACTIVATE, event_id riêng, test_event_code khi đặt META_TEST_CODE');
ok(di.app_data.extinfo.length === 16 && di.app_data.extinfo[0] === 'a2' && Object.keys(di.user_data).join() === 'anon_id' && !/advertiser_id|madid|email|idfa|gaid|client_ip/i.test(JSON.stringify(pi)), 'extinfo 16 phần tử (Android); chỉ anon_id – không mã quảng cáo/IP/email');
{ let got; const f = async (u, o) => { got = { u, o }; return { ok: true, status: 200, json: async () => ({ events_received: 1 }) }; };
  ok(await sendCapi(env, 'install', { iid: 'b'.repeat(32), ref: META_REF }, f) && got.u === GRAPH + '902190262917017/events' && got.o.method === 'POST' && JSON.parse(got.o.body).data[0].event_name === 'MobileAppInstall', 'sendCapi POST /<dataset>/events (JSON)');
  { const r = await postCapi(env, 'install', { iid: 'b'.repeat(32), ref: META_REF }, f); ok(r.ok && r.status === 200 && r.received === 1 && !JSON.stringify(r).includes('tok'), 'postCapi trả {ok,status,received}, không lộ token'); }
  ok(!(await sendCapi(env, 'install', { iid: 'b'.repeat(32), ref: '' }, async () => ({ ok: false }))) && !(await sendCapi(env, 'install', { iid: 'b'.repeat(32), ref: '' }, async () => { throw new Error('net'); })), 'Meta lỗi/mạng lỗi → false, không ném'); }

// ---- 4) handleMa với D1 giả ----
function fakeDb(flag) {
  const rows = new Map(), ev = {};
  const prep = sql => ({ b: [], bind(...a) { this.b = a; return this; },
    async first() { if (/FROM config/.test(sql)) return flag == null ? null : { v: flag }; if (/FROM meta_attr/.test(sql)) return rows.get(this.b[0] + '|install') || null; return null; },
    async run() { if (/INSERT OR IGNORE INTO meta_attr/.test(sql)) { const k = this.b[0] + '|' + this.b[1]; if (rows.has(k)) return { meta: { changes: 0 } }; rows.set(k, { ref: this.b[3] }); return { meta: { changes: 1 } }; }
      if (/INSERT INTO ext_events/.test(sql)) ev[this.b[1]] = (ev[this.b[1]] || 0) + 1; return { meta: { changes: 1 } }; } });
  return { prepare: prep, rows, ev };
}
const iid = 'c'.repeat(32);
const run = async (b, o = {}) => { const db = o.db || fakeDb(o.flag === undefined ? '1' : o.flag), calls = []; const r = await handleMa(b, { env: o.env || env, db, country: o.country || 'VN', now: 1e12, day: '2026-11-23', limited: async () => !!o.limited, fetcher: async (u, x) => { calls.push(x.body); return { ok: o.metaOk !== false }; } }); return { r, db, calls }; };
const I = { ev: 'install', iid, ref: META_REF, c: 'y' }, A = { ev: 'activate', iid, ref: META_REF, c: 'y' };
ok((await run(I, { flag: undefined, db: fakeDb(null) })).r === 'off' && (await run(I, { flag: '0' })).r === 'off' && (await run(I, { flag: '' })).r === 'off', 'cờ ads_meta_capi trống/0 → TẮT (mặc định)');
{ const x = await run(I, { flag: '0' }); ok(x.calls.length === 0 && x.db.rows.size === 0 && Object.keys(x.db.ev).length === 0, 'cờ tắt → không gửi, không ghi bảng, không đếm'); }
ok((await run(I, { env: { META_APP_ID: '1' } })).r === 'skip' && (await run(I, { env: {} })).r === 'skip', 'thiếu bí mật META_CAPI_TOKEN → bỏ qua');
ok((await run({ ...I, c: 'u' })).r === 'noconsent' && (await run({ ...I, c: '' })).r === 'noconsent' && (await run({ ...I, c: 'u' }, { env: { ...env, META_CONSENT_DEFAULT: 'row' }, country: 'FR' })).r === 'noconsent', 'chưa đồng ý (kể cả EEA khi mặc định row) → không gửi');
ok((await run({ ...I, iid: 'xyz' })).r === 'skip' && (await run({ ...I, ev: 'purchase' })).r === 'skip' && (await run(null)).r === 'skip', 'iid sai / sự kiện lạ / thân rỗng → bỏ');
ok((await run(I, { limited: true })).r === 'limited', 'quá giới hạn tần suất → bỏ');
{ const x = await run({ ...I, ref: 'utm_source=google-play&utm_medium=organic' }); ok(x.r === 'other' && x.calls.length === 0 && x.db.rows.size === 0 && x.db.ev['ma:install:other'] === 1, 'cài tự nhiên: chỉ đếm, không lưu, không gửi'); }
{ const db = fakeDb('1'); const a = await run(I, { db }), b = await run(I, { db }); ok(a.r === 'sent' && a.calls.length === 1 && b.r === 'dup' && b.calls.length === 0 && db.ev['ma:install:sent'] === 1, 'install gửi đúng 1 lần, lần 2 = trùng');
  const c = await run(A, { db }), d = await run(A, { db }); ok(c.r === 'sent' && /"event_name":"ACTIVATE"/.test(c.calls[0]) && d.r === 'dup', 'activate gửi 1 lần theo referrer đã lưu của lượt cài, lần 2 = trùng');
  ok(decodeURIComponent(c.calls[0]).includes('utm_source=apps.facebook.com'), 'activate dùng referrer đã lưu'); }
ok((await run(A)).r === 'nolink', 'activate không có lượt cài từ Meta → không gửi');
ok((await run({ ...A, ref: 'x' }, { db: (() => { const d = fakeDb('1'); return d; })() })).r === 'nolink', 'activate không tin referrer từ máy khách (dùng bản đã lưu)');
{ const x = await run(I, { metaOk: false }); ok(x.r === 'fail' && x.db.ev['ma:install:fail'] === 1, 'Meta từ chối → đếm fail, không ném'); }

// ---- 5) máy khách (vm) ----
function client({ ls = {}, ref = META_REF, cap = true }) {
  const beacons = [], store = { ...ls }; let calls = 0;
  const ctx = { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, location: { search: '' },
    navigator: { webdriver: false, sendBeacon: (u, d) => { beacons.push({ u, d: JSON.parse(d) }); return true; } }, crypto: { getRandomValues: a => { a.fill(171); return a; } }, JSON, Array, Uint8Array, String, RegExp,
    Capacitor: cap ? { Plugins: { InstallReferrer: { get: async () => { calls++; return { referrer: ref }; } } } } : { Plugins: {} } };
  ctx.window = ctx; vm.runInNewContext(rd('mobile/meta-attr.js'), ctx); return { M: ctx.MetaAttr, beacons, store, calls: () => calls };
}
{ const c = client({}); await c.M.install();
  ok(c.beacons.length === 1 && c.beacons[0].d.t === 'ma' && c.beacons[0].d.ev === 'install' && c.beacons[0].d.c === 'u' && /^[a-f0-9]{32}$/.test(c.beacons[0].d.iid) && c.beacons[0].u === 'https://lexkite.com/api/hit', 'client: install gửi {t:ma, iid, ref, c:u}');
  await c.M.install(); ok(c.beacons.length === 1 && c.calls() === 1, 'client: install 1 lần, referrer đọc 1 lần');
  c.store['lk.metaAds'] = '1'; await c.M.install(); ok(c.beacons.length === 2 && c.beacons[1].d.c === 'y', "client: bật đồng ý muộn → gửi lại install với c='y'");
  await c.M.activate(); await c.M.activate(); ok(c.beacons.filter(b => b.d.ev === 'activate').length === 1, 'client: activate đúng 1 lần'); }
{ const c = client({ ls: { 'lk.metaAds': '0' } }); await c.M.install(); await c.M.activate(); ok(c.beacons.length === 0 && c.calls() === 0, "client: công tắc '0' → không đọc referrer, không gửi gì"); }
{ const c = client({ ref: 'utm_source=google-play&utm_medium=organic' }); await c.M.install(); await c.M.activate(); ok(c.beacons.length === 0 && c.store['lk.ir'] === '-', 'client: cài tự nhiên → không gửi, nhớ "-" để lần sau khỏi nạp gói'); }
{ const c = client({ ls: { 'lk.noTrack': '1' } }); await c.M.install(); ok(c.beacons.length === 0, 'client: tôn trọng lk.noTrack'); }
{ const c = client({ cap: false }); await c.M.install(); ok(c.beacons.length === 0 && c.store['lk.ir'] == null, 'client: không có plugin (web/iOS) → không gửi, không đặt dấu'); }

// ---- 6) iOS SKAdNetwork ----
const pl = '<?xml version="1.0"?>\n<plist version="1.0">\n<dict>\n\t<key>A</key>\n</dict>\n</plist>';
const s0 = patchSkan(pl, false), s1 = patchSkan(patchPlist(pl, 'ca-app-pub-3940256099942544~1458002511', true), true);
ok(SKAN_META.every(i => s0.includes(i)) && !s0.includes('cstr6suwn9') && !s0.includes('GADApplication'), 'SKAN: AdMob tắt vẫn có 2 mã Meta, không có Google/AdMob');
ok(patchSkan(s0, false) === s0 && patchSkan(patchSkan(s0, true), false) === s0, 'SKAN: chạy lại không nhân đôi, bật/tắt AdMob quay về đúng');
ok((s1.match(/<key>SKAdNetworkItems<\/key>/g) || []).length === 1 && s1.includes('cstr6suwn9') && SKAN_META.every(i => s1.includes(i)), 'SKAN: AdMob bật → MỘT khoá SKAdNetworkItems gồm Meta + Google');
ok(!/NSUserTrackingUsageDescription/.test(s0) && /v9wttpbfk9/.test(rd('native/ios/project.yml')) && /n38lu8286q/.test(rd('native/ios/project.yml')), 'iOS: không thêm ATT; native/ios/project.yml có cùng mã Meta');

// ---- 7) nối dây ----
const cfg = rd('functions/api/config.js'), hit = rd('functions/api/hit.js'), nat = rd('web/js/native.js'), bun = rd('web/js/bundles.js');
ok(!PUBLIC_KEYS.includes('ads_meta_capi') && !/ads_meta_capi/.test(cfg), 'cờ ads_meta_capi KHÔNG công khai ở /api/config');
ok(/ads_meta_capi/.test(rd('functions/api/admin.js')), 'quản trị đặt được cờ ads_meta_capi');
ok(/b\.t === 'ma'[^\n]*devOrigin/.test(hit) && /handleMa/.test(hit), 'hit.js: nhánh t:ma (bỏ qua bản dev) gọi handleMa');
ok(/js\/meta-attr\.js/.test(nat) && /P\.InstallReferrer/.test(nat) && /cp mobile\/meta-attr\.js mobile\/www\/js\/meta-attr\.js/.test(rd('scripts/build-mobile.sh')) && !fs.existsSync('web/js/meta-attr.js') && !/meta-attr/.test(bun), 'mã chỉ-app: native.js nạp khi có plugin InstallReferrer, build-mobile.sh chép vào app, KHÔNG nằm trong web/js');
ok(/lexkite:first-win/.test(rd('web/js/remind.js')) && /lexkite:first-win/.test(nat), 'xong bài đầu tiên → sự kiện first-win → activate');
ok(!/META_CAPI_TOKEN\s*[:=]\s*['"][^'"]+['"]/.test(rd('functions/api/_meta_capi.js')), 'không có token cứng trong mã');
ok(/InstallReferrerPlugin/.test(rd('mobile/android/app/src/main/java/com/vocaband/app/MainActivity.java')) && /installreferrer:installreferrer/.test(rd('mobile/android/app/build.gradle')), 'Android: plugin đăng ký + thư viện Play Install Referrer');
ok(!/facebook\.com\/tr|connect\.facebook\.net|fbevents|fbsdk|facebook-android-sdk|FBSDK/i.test([nat, rd('mobile/meta-attr.js'), rd('mobile/android/app/build.gradle')].join('\n')), 'KHÔNG có pixel/SDK Meta');

console.log(`meta-attr: ${n - fails}/${n}`); process.exit(fails ? 1 : 0);
