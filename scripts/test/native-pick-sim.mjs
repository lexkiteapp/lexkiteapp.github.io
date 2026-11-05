// Test scripts/native/pick-sim.py (chọn đích iOS Simulator cho native-ios.yml) trên mẫu output thật của `xcodebuild -showdestinations`
// (Xcode 26.3, macos-15, 05/11): simctl có iPhone 15 runtime cũ không phải đích hợp lệ → exit 70. Đích phải nằm trong danh sách xcodebuild trả.
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const run = s => execFileSync('python3', ['scripts/native/pick-sim.py'], { input: s, encoding: 'utf8' }).trim();
const L = (os, name, id) => `\t\t{ platform:iOS Simulator, arch:arm64, id:${id}, OS:${os}, name:${name} }`;
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const sample = ['Available destinations for the "LexkiteKit" scheme:', '\t\t{ platform:macOS, arch:arm64, id:x, name:My Mac }',
  L('26.0.1', 'iPhone 16 Pro', id(1)), L('26.1', 'iPhone 17', id(2)), L('26.2', 'iPhone 17', id(3)), L('18.5', 'iPhone 16e', id(4)),
  L('26.2', 'iPhone 16', id(5)), L('26.2', 'iPhone 17 Pro Max', id(6)), L('26.2', 'iPhone SE (3rd generation)', id(7))].join('\n');
assert.equal(run(sample), `platform=iOS Simulator,id=${id(3)}`, 'iPhone 17, runtime cao nhất');
assert.equal(run([L('26.0', 'iPhone 16', id(8)), L('18.6', 'iPhone 16', id(9)), L('26.2', 'iPhone 15', id(10))].join('\n')), `platform=iOS Simulator,id=${id(8)}`, '17 vắng → 16 trước 15');
assert.equal(run(L('26.2', 'iPhone 16 Pro', id(11))), '', 'không có máy 390 pt → rỗng (workflow đỏ rõ ràng, không chọn bừa)');
assert.equal(run(''), '');
console.log('✓ native-pick-sim: 4 ca');
