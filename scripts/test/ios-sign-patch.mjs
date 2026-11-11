// Test scripts/native/ios-sign-patch.py (không mạng): ký Manual vào đúng khối Release dù Debug đứng trước; hồ sơ thiếu entitlement thì đỏ.
// Gác lỗi 08/11: regex nuốt khối Debug đứng trước → Release không được ký Manual → archive đỏ "requires a provisioning profile".
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const W = fs.mkdtempSync(path.join(os.tmpdir(), 'iossign-')), PBX = path.join(W, 'A.xcodeproj/project.pbxproj');
fs.mkdirSync(path.dirname(PBX));
const arr = a => `<array>${a.map(x => `<string>${x}</string>`).join('')}</array>`;
const plist = b => `<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict>${b}</dict></plist>`;
fs.writeFileSync(path.join(W, 'a.entitlements'), plist(`<key>com.apple.security.application-groups</key>${arr(['group.x'])}<key>com.apple.developer.associated-domains</key>${arr(['applinks:x.com'])}`));
const prof = (f, b) => { const p = path.join(W, f); fs.writeFileSync(p, plist(`<key>Entitlements</key><dict>${b}</dict>`)); return p; };
const full = prof('ok.plist', `<key>com.apple.security.application-groups</key>${arr(['group.x'])}<key>com.apple.developer.associated-domains</key><string>*</string>`);
const noDom = prof('nodom.plist', `<key>com.apple.security.application-groups</key>${arr(['group.x'])}`);
const noGroup = prof('nogroup.plist', `<key>com.apple.security.application-groups</key>${arr(['group.y'])}<key>com.apple.developer.associated-domains</key><string>*</string>`);
const block = (id, name, bundle, extra = '') => `\t\t${id} /* ${name} */ = {\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = {\n${extra}\t\t\t\tCODE_SIGN_ENTITLEMENTS = a.entitlements;\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = ${bundle};\n\t\t\t};\n\t\t\tname = ${name};\n\t\t};\n`;
const OLD = '\t\t\t\t"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "iPhone Developer";\n\t\t\t\tCODE_SIGN_STYLE = Automatic;\n';
const SRC = block('A1', 'Debug', 'com.a', OLD) + block('B1', 'Debug', 'com.other') + block('A2', 'Release', 'com.a', OLD) + block('B2', 'Release', 'com.other');
const run = p => { fs.writeFileSync(PBX, SRC); return spawnSync('python3', ['scripts/native/ios-sign-patch.py', PBX], { encoding: 'utf8', env: { ...process.env, TEAM: 'T1', DOC: 'doc', MAP: 'com.a=Prof A\n', PROF: `com.a=${p}\n` } }); };
const r = run(full), out = fs.readFileSync(PBX, 'utf8'), get = id => out.slice(out.indexOf(`${id} /*`)).split('\t\t};\n')[0];
ok(r.status === 0, `hồ sơ đủ → qua (${r.stderr})`);
ok(/CODE_SIGN_STYLE = Manual;/.test(get('A2')) && /PROVISIONING_PROFILE_SPECIFIER = "Prof A";/.test(get('A2')) && /CODE_SIGN_IDENTITY = "Apple Distribution";/.test(get('A2')) && /DEVELOPMENT_TEAM = T1;/.test(get('A2')), 'Release của bundle đã khai được ký Manual');
ok(!/Automatic|iPhone Developer/.test(get('A2')), 'Release không còn Automatic / CODE_SIGN_IDENTITY[sdk=…] cũ');
ok(/Automatic/.test(get('A1')) && !/Manual|PROVISIONING_PROFILE/.test(get('A1')), 'Debug giữ nguyên');
ok(!/Manual|PROVISIONING_PROFILE/.test(get('B1') + get('B2')), 'target khác giữ nguyên');
const a = run(noDom); ok(a.status !== 0 && /associated-domains/.test(a.stderr), 'hồ sơ thiếu key → đỏ, nêu tên');
const b = run(noGroup); ok(b.status !== 0 && /group\.x/.test(b.stderr), 'hồ sơ sai app group → đỏ, nêu tên');
fs.rmSync(W, { recursive: true, force: true });
console.log(fails ? `✗ ios-sign-patch: ${fails}/${n} lỗi` : `✓ ios-sign-patch: ${n} kiểm tra đạt (đúng khối Release, Debug nguyên, hồ sơ thiếu thì đỏ)`);
process.exit(fails ? 1 : 0);
