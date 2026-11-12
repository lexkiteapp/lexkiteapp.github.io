#!/usr/bin/env node
// Kiểm OTA (docs/OTA.md): từ chối chữ ký sai/bị sửa/khóa trống, cổng minNative, rollback + bản xấu, lọc manifest máy chủ, khóa nằm ngoài repo, sync-up với canon().
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import vm from 'node:vm'; import { webcrypto } from 'node:crypto';
import { genKeys, sign, verify, canon, releaseUrl, decodeKey } from '../ota/lib.mjs';
import { makeManifest } from '../ota/release.mjs';
import { clean } from '../../functions/api/ota.js';
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { console.error('✗ ota: ' + m); fail = 1; } };
const store = {}; const listeners = {}; const calls = [];
const mk = (extra = {}) => {
  const g = { crypto: webcrypto, atob, TextEncoder, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } }, location: { hash: '#/', hostname: 'localhost' }, VBNative: { platform: 'android' }, document: { body: {} }, ...extra };
  g.self = g; vm.createContext(g);
  vm.runInContext(fs.readFileSync('web/js/ota.js', 'utf8'), g); return g;
};
const K = genKeys(), K2 = genKeys();
const base = { version: '1.0.0-ota.202610270900.abc1234', sha256: 'a'.repeat(64), minNative: '1.0.0' }; base.url = releaseUrl(base.version);
const man = (o = {}, key = K.privatePem) => { const m = { ...base, ...o }; if (o.url === undefined) m.url = releaseUrl(m.version); m.signature = sign(m, key); return m; };
// 1) ký ↔ kiểm: Node và WebCrypto của app cùng chuỗi, cùng định dạng chữ ký
const g = mk(), V = g.VBOta, m1 = man();
ok(verify(m1, K.publicB64), 'node verify');
ok(await V.verify(m1, K.publicB64), 'app verify khớp chữ ký Node (ieee-p1363)');
ok(V.canon(m1) === canon(m1), 'canon app = canon scripts');
// 2) từ chối
ok(!(await V.verify({ ...m1, sha256: 'b'.repeat(64) }, K.publicB64)), 'sha256 bị sửa phải bị từ chối');
ok(!(await V.verify({ ...m1, minNative: '0' }, K.publicB64)), 'minNative bị sửa phải bị từ chối');
ok(!(await V.verify({ ...m1, url: m1.url.replace('lexkiteapp.github.io', 'evil.example') }, K.publicB64)), 'url lạ bị từ chối');
ok(!(await V.verify(man({}, K2.privatePem), K.publicB64)), 'ký bằng khóa khác bị từ chối');
ok(!(await V.verify(m1, '')), 'khóa công khai trống → từ chối mọi bản');
ok(!(await V.verify({ ...m1, signature: 'AAAA' }, K.publicB64)), 'chữ ký rác bị từ chối');
ok(!(await V.verify(man({ url: 'https://evil.example/bundle.zip' }), K.publicB64)), 'url ngoài kho phát hành bị từ chối dù ký đúng');
// 3) cổng native / bản đang chạy / bản xấu
const cx = (o = {}) => ({ native: '1.2.0', current: 'builtin', ...o });
ok(V.decide(man({ minNative: '1.0.0' }), cx()) === 'ok', 'native đủ mới → ok');
ok(V.decide(man({ minNative: '1.3.0' }), cx()) === 'native', 'native < minNative → native (nhắc cập nhật cửa hàng)');
ok(V.decide(man({ minNative: '1.2.0' }), cx()) === 'ok', 'native = minNative → ok');
ok(V.decide(man({ minNative: '1.10.0' }), cx({ native: '1.9.0' })) === 'native', 'so sánh số, không so chuỗi (1.9 < 1.10)');
ok(V.decide(m1, cx({ current: m1.version })) === 'same', 'đã chạy đúng bản → same');
V.markBad(m1.version); ok(V.decide(m1, cx()) === 'bad', 'bản từng lỗi không tải lại');
// 4) luồng đầy đủ với plugin giả: tải → next; chữ ký sai → không tải; rollback
const run = async (manifest, { cur = 'builtin', native = '1.2.0', hash = '#/' } = {}) => {
  Object.keys(store).forEach(k => delete store[k]); calls.length = 0;
  const U = { current: async () => ({ bundle: { id: 'x', version: cur }, native }), download: async o => { calls.push(['download', o]); return { id: 'id-' + o.version }; }, next: async o => calls.push(['next', o]), set: async o => calls.push(['set', o]), addListener: () => {} };
  const gg = mk({ LK_OTA_KEY: K.publicB64, Capacitor: { Plugins: { CapacitorUpdater: U, App: { getInfo: async () => ({ version: native }) } } }, fetch: async () => ({ ok: true, json: async () => manifest }), location: { hash, hostname: 'localhost' } });
  const r = await gg.VBOta.checkWeb(await (async () => ({ platform: 'android', native, current: cur }))()); return { r, gg };
};
let x = await run(man()); ok(x.r === 'ok' && calls[0][0] === 'download' && calls[0][1].checksum === base.sha256 && calls[1][0] === 'next', 'bản hợp lệ: download(checksum) rồi next');
x = await run({ ...man(), sha256: 'c'.repeat(64) }); ok(x.r === 'badsig' && !calls.length, 'manifest bị sửa: không tải');
x = await run(man({ minNative: '9.0.0' })); ok(x.r === 'native' && !calls.length, 'minNative cao: không tải, báo native');
x = await run(man({ version: '1.0.0-ota.1' }), { cur: '1.0.0-ota.2' }); ok(x.r === 'ok', 'ROLLBACK: manifest trỏ bản cũ hơn bản đang chạy vẫn được áp (ký sẵn)');
x = await run(man(), { cur: base.version }); ok(x.r === 'same' && !calls.length, 'đã ở bản manifest: bỏ qua');
// busy: không áp giữa bài; áp được khi rảnh
x = await run(man(), { hash: '#/review' }); ok(x.r === 'ok' && (await x.gg.VBOta.applyIfIdle()) === false && !calls.some(c => c[0] === 'set'), 'giữa phiên ôn: không áp ngay');
x = await run(man(), { hash: '#/settings' }); ok((await x.gg.VBOta.applyIfIdle()) === true && calls.some(c => c[0] === 'set' && c[1].id === 'id-' + base.version), 'rảnh: set()');
// download lỗi → bản xấu
{ Object.keys(store).forEach(k => delete store[k]); const U = { current: async () => ({ bundle: { version: 'builtin' } }), download: async () => { throw new Error('x'); }, next: async () => {}, addListener: () => {} };
  const gg = mk({ LK_OTA_KEY: K.publicB64, Capacitor: { Plugins: { CapacitorUpdater: U } }, fetch: async () => ({ ok: true, json: async () => man() }) });
  ok(await gg.VBOta.checkWeb({ platform: 'android', native: '1.2.0', current: 'builtin' }) === 'fail' && gg.VBOta.decide(man(), { native: '1.2.0', current: 'builtin' }) === 'bad', 'tải lỗi → đánh dấu bản xấu'); }
// 5) nhắc native: iOS chỉ mở App Store; Android bắt buộc → immediate
{ const done = []; const AU = (info) => ({ getAppUpdateInfo: async () => info, openAppStore: async () => done.push('store'), performImmediateUpdate: async () => done.push('immediate'), startFlexibleUpdate: async () => done.push('flex'), addListener: () => {}, completeFlexibleUpdate: async () => {} });
  const fake = () => ({ style: {}, setAttribute() {}, append() {}, remove() {}, set onclick(f) { setTimeout(f, 0); } });
  const doc = { body: { append() {} }, createElement: fake };
  Object.keys(store).forEach(k => delete store[k]);
  let gg = mk({ Capacitor: { Plugins: { AppUpdate: AU({ updateAvailability: 2, immediateUpdateAllowed: true, flexibleUpdateAllowed: true }) } }, document: doc });
  ok(await gg.VBOta.nativePrompt({ platform: 'android', native: '1.0.0' }, true) === 'immediate' && done[0] === 'immediate', 'Android dưới mức tối thiểu → immediate update');
  gg = mk({ Capacitor: { Plugins: { AppUpdate: AU({ updateAvailability: 1 }) } } });
  ok(await gg.VBOta.nativePrompt({ platform: 'android', native: '1.0.0' }, true) === 'uptodate', 'không có bản mới → không nhắc');
  gg = mk({ Capacitor: { Plugins: { AppUpdate: AU({ updateAvailability: 1, availableVersionName: '1.5.0', currentVersionName: '1.2.0' }) } }, document: doc }); 
  ok(await gg.VBOta.nativePrompt({ platform: 'ios', native: '1.2.0' }, true) === 'store', 'iOS có bản mới trên App Store → nút Mở App Store'); }
// 6) manifest máy chủ
ok(clean(m1) && clean(m1).version === m1.version, 'API: manifest hợp lệ đi qua');
ok(!clean({ ...m1, url: 'https://evil.example/x.zip' }) && !clean(null) && !clean({ ...m1, version: '../x' }), 'API: manifest lạ bị loại');
ok(!('extra' in clean({ ...m1, extra: 1 })), 'API: chỉ trường đã định');
// 7) makeManifest + khóa PEM/base64
{ const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ota-')) + '/b.zip'; fs.writeFileSync(tmp, 'zip'); const pm = makeManifest({ zip: tmp, version: base.version, minNative: '1.0.0', privatePem: decodeKey(Buffer.from(K.privatePem).toString('base64')) });
  ok(verify(pm, K.publicB64) && /^[0-9a-f]{64}$/.test(pm.sha256), 'makeManifest ký được, secret base64 giải được'); }
// 8) khóa công khai trong repo là chuỗi SPKI hoặc trống; không lộ khóa riêng
const keyJs = fs.readFileSync('web/js/ota-key.js', 'utf8'); ok(!/PRIVATE KEY/.test(keyJs) && /LK_OTA_KEY = '[A-Za-z0-9+/=]*';/.test(keyJs), 'ota-key.js chỉ chứa khóa công khai');
if (!fail) console.log(`✓ ota: ${n} kiểm (chữ ký, minNative, rollback, bản xấu, nhắc native, API) đều đạt`);
process.exit(fail);
