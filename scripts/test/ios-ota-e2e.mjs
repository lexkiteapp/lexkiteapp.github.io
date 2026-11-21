#!/usr/bin/env node
// OTA ĐẦU-CUỐI trên iOS Simulator (21/11: chủ mở app iPhone thấy giao diện CŨ – icon trống, thanh trên cũ – dù bản sửa đã nằm trong gói OTA từ
// 20/11; iOS E2E CHẶN OTA (harness freezeOta) và scripts/test/ota.mjs chỉ thử phần JS → chưa máy nào kiểm "gói OTA có thật sự TỚI app" không).
// Bản app gốc build từ nhánh (KHÔNG harness) → mở nguội → ota.js tự kiểm /api/ota, tải gói ký, U.next → đưa app xuống nền (mở Settings) → mở lại
// → plugin phải đang chạy ĐÚNG bản OTA đang phát (latest.json). Sai/không tới trong hạn = đỏ, kèm nhật ký Capgo + ảnh màn trước/sau.
// Dùng: node scripts/test/ios-ota-e2e.mjs --app <App.app> [--device 'iPhone 1'] [--out ota-out] [--wait 240]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path';
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const APP = arg('app'), DEVQ = arg('device', 'iPhone 1'), OUT = path.resolve(arg('out', 'ota-out')), WAIT = +arg('wait', 240) * 1000, BUNDLE = 'com.lexkite.app';
const MANIFEST = process.env.OTA_MANIFEST_URL || 'https://lexkite.com/api/ota?p=ios&n=0&v=ci';
if (!APP) { console.error('thiếu --app <App.app>'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const sim = (...a) => execFileSync('xcrun', ['simctl', ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 300000 });
const simq = (...a) => { try { return sim(...a); } catch (e) { return 'ERR ' + String(e.stderr || e.message).slice(0, 300); } };
const log = (...a) => console.log(`[ota ${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STDOUT = path.join(OUT, 'app-stdout.txt'), out = () => { try { return fs.readFileSync(STDOUT, 'utf8'); } catch (e) { return ''; } };
const until = async (fn, ms, step = 3000) => { const t = Date.now(); while (Date.now() - t < ms) { const v = fn(); if (v) return v; await sleep(step); } return null; };

const want = await fetch(MANIFEST, { cache: 'no-store' }).then(r => r.json()).catch(e => ({ err: String(e) }));
if (!want.version) { console.error('✗ không đọc được manifest OTA đang phát: ' + JSON.stringify(want)); process.exit(1); }
log('bản OTA đang phát:', want.version);

const list = JSON.parse(sim('list', 'devices', 'available', '-j')).devices;
const rts = Object.keys(list).filter(k => /iOS/.test(k)).sort().reverse();
let U = null; for (const rt of rts) { const d = list[rt].find(x => x.name.includes(DEVQ) && !/mini|SE|Air/.test(x.name)) || list[rt].find(x => x.name.includes(DEVQ)); if (d) { U = d.udid; log('máy:', d.name, rt); break; } }
if (!U) { console.error('không có máy giả lập khớp ' + DEVQ); process.exit(2); }
simq('shutdown', U); simq('erase', U); sim('boot', U); sim('bootstatus', U, '-b');
simq('status_bar', U, 'override', '--time', '9:41', '--batteryState', 'charged', '--batteryLevel', '100');
sim('install', U, APP);
// SpringBoard vừa boot hay từ chối mở app ("denied by service delegate") → thử lại tới 6 lần, cách 10 s
const launch = async () => { for (let k = 1; k <= 6; k++) { const r = simq('launch', '--terminate-running-process', `--stdout=${STDOUT}`, `--stderr=${path.join(OUT, 'app-stderr.txt')}`, U, BUNDLE).trim(); log('mở app #' + k, r.slice(0, 500)); if (!r.startsWith('ERR')) return; await sleep(10000); } console.error('✗ Simulator không mở được app sau 6 lần'); process.exit(3); };
const shot = n => simq('io', U, 'screenshot', '--type=png', path.join(OUT, n + '.png'));

// 1) mở nguội: bản builtin; ota.js chạy sau load + 8 s → kiểm chữ ký → tải → next
await sleep(15000); await launch();
const queued = await until(() => /To Native ->\s+CapacitorUpdater next\b/.test(out()) || /CapacitorUpdater download[\s\S]*?(error|failed)/i.test(out()) && 'fail', WAIT);
await sleep(4000); shot('1-builtin');
const fails = (out().match(/^.*(downloadFailed|Download failed|checksum|signature|Error.*bundle|updateFailed).*$/gim) || []).slice(0, 8);
if (queued !== true) {
  console.error(`✗ OTA không xếp được bản kế trong ${WAIT / 1000} s (ota.js → download → next).`);
  console.error(out().split('\n').filter(l => /CapacitorUpdater|CapgoUpdater|AppUpdate|App getInfo/.test(l)).slice(-25).join('\n') || '(không có dòng Capgo)');
  if (fails.length) console.error('lỗi:\n' + fails.join('\n'));
  process.exit(1);
}
log('đã xếp bản kế (next) – đưa app xuống nền');
// 2) xuống nền (mở Cài đặt) → plugin installNext; 3) mở lại → phải chạy bản OTA
await sleep(3000); simq('launch', U, 'com.apple.Preferences'); await sleep(12000);
simq('launch', U, BUNDLE); await sleep(15000);
const applied = await until(() => out().includes('Updated to bundle') && out().includes(want.version), 60000);
// mở nguội lần nữa: bản OTA phải GIỮ (notifyAppReady trong 15 s, không bị plugin quay lại builtin)
await launch(); await sleep(25000); shot('2-ota');
const tail = out().split('\n').filter(l => /CapgoUpdater/.test(l));
const kept = tail.slice(-40).some(l => /Version successfully loaded|Current bundle loaded successfully/.test(l) && l.includes(want.version));
const rolled = tail.some(l => /rollback|reset to builtin|Resetting to/i.test(l));
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ want: want.version, queued: true, applied: !!applied, kept, rolled }, null, 1));
if (!applied || !kept || rolled) {
  console.error(`✗ OTA ${want.version}: áp=${!!applied} giữ sau mở nguội=${kept} quay-lại=${rolled}`);
  console.error(tail.slice(-25).join('\n'));
  process.exit(1);
}
console.log(`✓ OTA iOS đầu-cuối: app tải + áp + giữ đúng bản đang phát ${want.version}`);
